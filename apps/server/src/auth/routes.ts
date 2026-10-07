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
import { authGuard, cookieRouteGuard, requireUserId } from "../lib/guards.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword } from "../lib/password.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { occupiedEmailMail, registrationCodeMail } from "../mail/templates.js";
import { sendMail } from "../mail/mailer.js";
import { presignedGetUrlOrNull } from "../media/storage.js";
import { assertCooldownPassed, codeMail, consumeCodeLimits, issueCode, startCodeCooldown, verifyCode } from "./codes.js";
import {
  createAccount,
  createRegistration,
  deleteRegistration,
  findUserIdByEmail,
  randomRegistrationToken,
  readRegistration,
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

const registerEmail = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const startedAt = Date.now();
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
    await sendMail({ to: input.email, ...registrationCodeMail(code) });
  } else {
    if (allowed) {
      await sendMail({ to: input.email, ...occupiedEmailMail() });
    }
    setRegistrationCookie(reply, randomRegistrationToken());
  }
  await holdEmailStepLatency(startedAt);
  await reply.send({ ok: true });
};

const verifyRegistrationCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(verifyCodeInput, request.body);
  const token = registrationCookie(request);
  const record = token === null ? null : await readRegistration(token);
  if (record === null) {
    throw new AppError("CODE_INVALID");
  }
  if (record.step !== "code") {
    throw new AppError("REGISTRATION_STEP_INVALID");
  }
  await verifyCode(hashEmail(record.email), input.code, "register");
  const nextToken = await createRegistration(record.email, "password");
  if (token !== null) {
    await deleteRegistration(token);
  }
  clearRegistrationCookie(reply);
  const payload: CodeVerified = { registrationToken: nextToken };
  await reply.send({ data: payload });
};

const resendRegistrationCode = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  validateInput(resendCodeInput, request.body);
  const token = registrationCookie(request);
  const record = token === null ? null : await readRegistration(token);
  if (record === null || record.step !== "code") {
    await reply.send({ data: null });
    return;
  }
  const emailHash = hashEmail(record.email);
  await assertCooldownPassed(emailHash);
  const allowed = await consumeCodeLimits(emailHash, request.ip);
  if (!allowed) {
    throw new AppError("CODE_LIMIT_EXCEEDED");
  }
  const code = await issueCode(emailHash, "register");
  await startCodeCooldown(emailHash);
  await sendMail({ to: record.email, ...codeMail("register", code) });
  await reply.send({ data: null });
};

const registerPassword = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const input = validateInput(registerPasswordInput, request.body);
  const record = await readRegistration(input.registrationToken);
  if (record === null) {
    throw new AppError("REGISTRATION_TOKEN_INVALID");
  }
  if (record.step !== "password") {
    throw new AppError("REGISTRATION_STEP_INVALID");
  }
  await verifyTurnstile(input.turnstileToken, request.ip);
  const existingUserId = await findUserIdByEmail(record.email);
  if (existingUserId !== null) {
    throw new AppError("EMAIL_ALREADY_USED");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createAccount(record.email, passwordHash);
  await deleteRegistration(input.registrationToken);
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
  app.post("/auth/register/password", { preHandler: cookieRouteGuard }, registerPassword);
  app.post("/auth/register/name", { preHandler: authGuard }, finishRegistration);
};
