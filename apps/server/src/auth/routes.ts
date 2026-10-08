import {
  type AuthSession,
  type CodeVerified,
  finishRegistrationInput,
  registerEmailInput,
  registerPasswordInput,
  resendCodeInput,
  verifyCodeInput
} from "@koda/shared/auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, validateInput } from "../lib/errors.js";
import { clearRegistrationCookie, registrationCookie, setRefreshCookie, setRegistrationCookie } from "../lib/cookies.js";
import { apiGuard, authGuard, cookieRouteGuard, requireUserId } from "../lib/guards.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword } from "../lib/password.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { occupiedEmailMail, registrationCodeMail, type MailContent } from "../mail/templates.js";
import { sendMail } from "../mail/mailer.js";
import { presignedGetUrlOrNull } from "../media/storage.js";
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
import { buildCurrentUser, createSession } from "./session.js";

const emailStepMinimumMs = 300;

const holdEmailStepLatency = async (startedAt: number): Promise<void> => {
  const remaining = emailStepMinimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remaining);
    });
  }
};

const sendQuietly = (to: string, content: MailContent): void => {
  void sendMail({ to, ...content }).catch(() => undefined);
};

const registerEmail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const latencyFloor = holdEmailStepLatency(Date.now());
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
  const avatarUrl = await presignedGetUrlOrNull(user.avatarKey);
  const bannerUrl = await presignedGetUrlOrNull(user.bannerKey);
  await reply.send({ data: { user: buildCurrentUser(user, avatarUrl, bannerUrl) } });
};

export const registerAuthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/auth/register/email", { preHandler: cookieRouteGuard }, registerEmail);
  app.post("/auth/register/code/verify", { preHandler: cookieRouteGuard }, verifyRegistrationCode);
  app.post("/auth/register/code/resend", { preHandler: cookieRouteGuard }, resendRegistrationCode);
  app.post("/auth/register/password", { preHandler: apiGuard }, registerPassword);
  app.post("/auth/register/name", { preHandler: authGuard }, finishRegistration);
};
