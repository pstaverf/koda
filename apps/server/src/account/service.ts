import type { ChangePasswordInput, ConfirmEmailInput, DeleteAccountInput } from "@koda/shared/auth";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type User } from "../db/schema.js";
import { checkCode, codeMail, consumeCodeLimits, cooldownActive, issueCode, startCodeCooldown } from "../auth/codes.js";
import { clearLoginFailures } from "../auth/login.js";
import { findUserIdByEmail } from "../auth/register.js";
import { revokeAllUserSessions, revokeOtherUserSessions } from "../auth/session.js";
import { AppError } from "../lib/errors.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { consumeLimit } from "../lib/rateLimit.js";
import { holdMinimumLatency } from "../lib/time.js";
import { sendMailQuietly } from "../mail/mailer.js";
import { requireActiveUser } from "../profile/service.js";
import { redis } from "../redis/client.js";

const passwordCheckLimit = 10;
const passwordCheckWindowSeconds = 3600;
const emailRequestMinimumMs = 300;
const emailChangeTtlSeconds = 600;

const emailChangeKey = (userId: string): string => `email_change:${userId}`;

const assertPassword = async (user: User, password: string, field: string): Promise<void> => {
  if (!(await consumeLimit(`rl:account_password:${user.id}`, passwordCheckLimit, passwordCheckWindowSeconds))) {
    throw new AppError("RATE_LIMITED");
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("PASSWORD_INVALID", { [field]: "PASSWORD_INVALID" });
  }
};

export const changePassword = async (userId: string, sessionId: string, input: ChangePasswordInput): Promise<void> => {
  const user = await requireActiveUser(userId);
  await assertPassword(user, input.currentPassword, "currentPassword");
  const passwordHash = await hashPassword(input.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  await revokeOtherUserSessions(userId, sessionId);
  await clearLoginFailures(hashEmail(user.email));
};

export const requestEmailChange = async (userId: string, email: string, ip: string): Promise<void> => {
  const latencyFloor = holdMinimumLatency(Date.now(), emailRequestMinimumMs);
  try {
    const user = await requireActiveUser(userId);
    if (email === user.email) {
      throw new AppError("EMAIL_UNCHANGED");
    }
    const emailHash = hashEmail(email);
    if (await cooldownActive(emailHash)) {
      throw new AppError("CODE_COOLDOWN");
    }
    if (!(await consumeCodeLimits(emailHash, ip))) {
      throw new AppError("CODE_LIMIT_EXCEEDED");
    }
    await startCodeCooldown(emailHash);
    await redis.set(emailChangeKey(userId), emailHash, "EX", emailChangeTtlSeconds);
    if ((await findUserIdByEmail(email)) !== null) {
      return;
    }
    const code = await issueCode(emailHash, "change_email");
    sendMailQuietly({ to: email, ...codeMail("change_email", code) });
  } finally {
    await latencyFloor;
  }
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "23505";

export const confirmEmailChange = async (userId: string, input: ConfirmEmailInput): Promise<User> => {
  const user = await requireActiveUser(userId);
  if (input.email === user.email) {
    throw new AppError("EMAIL_UNCHANGED");
  }
  const emailHash = hashEmail(input.email);
  if ((await redis.get(emailChangeKey(userId))) !== emailHash) {
    throw new AppError("CODE_INVALID");
  }
  const result = await checkCode(emailHash, input.code, "change_email");
  if (result !== "valid") {
    throw new AppError(result === "exceeded" ? "CODE_ATTEMPTS_EXCEEDED" : "CODE_INVALID");
  }
  await redis.del(emailChangeKey(userId));
  try {
    const updated = await db
      .update(users)
      .set({ email: input.email, emailVerifiedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning();
    const row = updated[0];
    if (row === undefined) {
      throw new AppError("UNAUTHORIZED");
    }
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CODE_INVALID");
    }
    throw error;
  }
};

export const deleteAccount = async (userId: string, input: DeleteAccountInput): Promise<void> => {
  const user = await requireActiveUser(userId);
  await assertPassword(user, input.password, "password");
  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  await revokeAllUserSessions(userId);
  await redis.del(emailChangeKey(userId));
};
