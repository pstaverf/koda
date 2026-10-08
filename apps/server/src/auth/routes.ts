import {
  type AuthSession,
  type CodeVerified,
  finishRegistrationInput,
  loginInput,
  registerEmailInput,
  registerPasswordInput,
  resendCodeInput,
  resetPasswordConfirmInput,
  resetPasswordRequestInput,
  verifyCodeInput
} from "@koda/shared/auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, validateInput } from "../lib/errors.js";
import {
  clearRefreshCookie,
  clearRegistrationCookie,
  refreshCookie,
  registrationCookie,
  setRefreshCookie,
  setRegistrationCookie
} from "../lib/cookies.js";
import { apiGuard, authGuard, cookieRouteGuard, requireUserId } from "../lib/guards.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword } from "../lib/password.js";
import { holdMinimumLatency } from "../lib/time.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { occupiedEmailMail, registrationCodeMail, type MailContent } from "../mail/templates.js";
import { sendMailQuietly } from "../mail/mailer.js";
import { checkCode, codeMail, consumeCodeLimits, cooldownActive, issueCode, startCodeCooldown } from "./codes.js";
import {
  createAccount,
  createRegistration,
  deleteRegistration,
  findUserIdByEmail,
  randomRegistrationToken,
  readRegistration,
  lockRegistration,
  unlockRegistration,
  updateDisplayName
} from "./register.js";
import { authenticate } from "./login.js";
import { confirmPasswordReset, requestPasswordReset } from "./reset.js";
import {
  buildAuthSession,
  buildCurrentUser,
  createSession,
  findActiveSessionByToken,
  presentCurrentUser,
  revokeAllUserSessions,
  revokeSessionByToken,
  rotateSession
} from "./session.js";

const emailStepMinimumMs = 300;

const sendQuietly = (to: string, content: MailContent): void => {
  sendMailQuietly({ to, ...content });
};

const registerEmail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const latencyFloor = holdMinimumLatency(Date.now(), emailStepMinimumMs);
  const input = validateInput(registerEmailInput, request.body);
  const previousToken = registrationCookie(request);
  if (previousToken !== null) {
    await deleteRegistration(previousToken);
  }
  const emailHash = hashEmail(input.email);
  const allowed = await consumeCodeLimits(emailHash, request.ip);
  const existingUserId = allowed ? await findUserIdByEmail(input.email) : null;
  if (allowed && existingUserId === null) {
    const code = await issueCode(emailHash, "register");
    await startCodeCooldown(emailHash);
    const token = await createRegistration(input.email, "code");
    setRegistrationCookie(reply, token);
    sendQuietly(input.email, registrationCodeMail(code));
  } else {
    if (allowed) {
      sendQuietly(input.email, occupiedEmailMail());
    }
    setRegistrationCookie(reply, randomRegistrationToken());
  }
  await latencyFloor;
  await reply.send({ ok: true });
};

const verifyRegistrationCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(verifyCodeInput, request.body);
  const token = registrationCookie(request);
  const record = token === null ? null : await readRegistration(token);
  if (token === null || record === null || record.step !== "code") {
    throw new AppError("CODE_INVALID");
  }
  const result = await checkCode(hashEmail(record.email), input.code, "register");
  if (result === "exceeded") {
    await deleteRegistration(token);
  }
  if (result !== "valid") {
    throw new AppError("CODE_INVALID");
  }
  const nextToken = await createRegistration(record.email, "password");
  await deleteRegistration(token);
  clearRegistrationCookie(reply);
  const payload: CodeVerified = { registrationToken: nextToken };
  await reply.send({ data: payload });
};

const resendRegistrationCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  validateInput(resendCodeInput, request.body);
  const token = registrationCookie(request);
  const record = token === null ? null : await readRegistration(token);
  if (record !== null && record.step === "code") {
    const emailHash = hashEmail(record.email);
    if (!(await cooldownActive(emailHash)) && (await consumeCodeLimits(emailHash, request.ip))) {
      const code = await issueCode(emailHash, "register");
      await startCodeCooldown(emailHash);
      sendQuietly(record.email, codeMail("register", code));
    }
  }
  await reply.send({ data: null });
};

const createAccountFromRegistration = async (
  request: FastifyRequest,
  reply: FastifyReply,
  token: string,
  password: string,
  turnstileToken: string
): Promise<void> => {
  const record = await readRegistration(token);
  if (record === null) {
    throw new AppError("REGISTRATION_TOKEN_INVALID");
  }
  if (record.step !== "password") {
    throw new AppError("REGISTRATION_STEP_INVALID");
  }
  await verifyTurnstile(turnstileToken, request.ip);
  const existingUserId = await findUserIdByEmail(record.email);
  if (existingUserId !== null) {
    throw new AppError("EMAIL_ALREADY_USED");
  }
  const passwordHash = await hashPassword(password);
  const user = await createAccount(record.email, passwordHash);
  await deleteRegistration(token);
  const session = await createSession({
    userId: user.id,
    userAgent: request.headers["user-agent"] ?? null,
    ip: request.ip
  });
  setRefreshCookie(reply, session.refreshToken, session.maxAgeSeconds);
  clearRegistrationCookie(reply);
  const payload: AuthSession = { accessToken: session.accessToken, user: buildCurrentUser(user, null, null) };
  await reply.send({ data: payload });
};

const registerPassword = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(registerPasswordInput, request.body);
  if (!(await lockRegistration(input.registrationToken))) {
    throw new AppError("REGISTRATION_TOKEN_INVALID");
  }
  try {
    await createAccountFromRegistration(request, reply, input.registrationToken, input.password, input.turnstileToken);
  } finally {
    await unlockRegistration(input.registrationToken);
  }
};

const finishRegistration = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(finishRegistrationInput, request.body);
  const user = await updateDisplayName(userId, input.displayName);
  await reply.send({ data: { user: await presentCurrentUser(user) } });
};

const requestContext = (request: FastifyRequest): { userAgent: string | null; ip: string } => ({
  userAgent: request.headers["user-agent"] ?? null,
  ip: request.ip
});

const login = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(loginInput, request.body);
  const user = await authenticate(input, request.ip);
  const session = await createSession({ userId: user.id, ...requestContext(request) });
  setRefreshCookie(reply, session.refreshToken, session.maxAgeSeconds);
  const payload: AuthSession = await buildAuthSession(user, session.accessToken);
  await reply.send({ data: payload });
};

const refresh = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = refreshCookie(request);
  if (token === null) {
    clearRefreshCookie(reply);
    throw new AppError("REFRESH_TOKEN_INVALID");
  }
  try {
    const rotated = await rotateSession(token, requestContext(request));
    setRefreshCookie(reply, rotated.refreshToken, rotated.maxAgeSeconds);
    const payload: AuthSession = await buildAuthSession(rotated.user, rotated.accessToken);
    await reply.send({ data: payload });
  } catch (error) {
    clearRefreshCookie(reply);
    throw error;
  }
};

const logout = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = refreshCookie(request);
  if (token !== null) {
    await revokeSessionByToken(token);
  }
  clearRefreshCookie(reply);
  await reply.send({ data: null });
};

const logoutAll = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const token = refreshCookie(request);
  const session = token === null ? null : await findActiveSessionByToken(token);
  clearRefreshCookie(reply);
  if (session === null) {
    throw new AppError("REFRESH_TOKEN_INVALID");
  }
  await revokeAllUserSessions(session.userId);
  await reply.send({ data: null });
};

const resetRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(resetPasswordRequestInput, request.body);
  await requestPasswordReset(input.email, request.ip);
  await reply.send({ data: null });
};

const resetConfirm = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(resetPasswordConfirmInput, request.body);
  await confirmPasswordReset(input);
  clearRefreshCookie(reply);
  await reply.send({ data: null });
};

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/auth/register/email", { preHandler: cookieRouteGuard }, registerEmail);
  app.post("/auth/register/code/verify", { preHandler: cookieRouteGuard }, verifyRegistrationCode);
  app.post("/auth/register/code/resend", { preHandler: cookieRouteGuard }, resendRegistrationCode);
  app.post("/auth/register/password", { preHandler: apiGuard }, registerPassword);
  app.post("/auth/register/name", { preHandler: authGuard }, finishRegistration);
  app.post("/auth/login", { preHandler: cookieRouteGuard }, login);
  app.post("/auth/refresh", { preHandler: cookieRouteGuard }, refresh);
  app.post("/auth/logout", { preHandler: cookieRouteGuard }, logout);
  app.post("/auth/logout-all", { preHandler: cookieRouteGuard }, logoutAll);
  app.post("/auth/reset/request", { preHandler: apiGuard }, resetRequest);
  app.post("/auth/reset/confirm", { preHandler: cookieRouteGuard }, resetConfirm);
};
