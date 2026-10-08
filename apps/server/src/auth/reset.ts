import type { ResetPasswordConfirmInput } from "@koda/shared/auth";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword } from "../lib/password.js";
import { sendMail } from "../mail/mailer.js";
import { checkCode, codeMail, consumeCodeLimits, cooldownActive, issueCode, startCodeCooldown } from "./codes.js";
import { clearLoginFailures } from "./login.js";
import { revokeAllUserSessions } from "./session.js";

const resetRequestMinimumMs = 300;

const holdMinimumLatency = async (startedAt: number, minimumMs: number): Promise<void> => {
  const remaining = minimumMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await new Promise((resolve) => {
      setTimeout(resolve, remaining);
    });
  }
};

const findActiveUserIdByEmail = async (email: string): Promise<string | null> => {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  return rows[0]?.id ?? null;
};

const issueResetCode = async (email: string, ip: string): Promise<void> => {
  const emailHash = hashEmail(email);
  if (await cooldownActive(emailHash)) {
    return;
  }
  if (!(await consumeCodeLimits(emailHash, ip))) {
    return;
  }
  const userId = await findActiveUserIdByEmail(email);
  if (userId === null) {
    return;
  }
  const code = await issueCode(emailHash, "reset");
  await startCodeCooldown(emailHash);
  void sendMail({ to: email, ...codeMail("reset", code) }).catch(() => undefined);
};

export const requestPasswordReset = async (email: string, ip: string): Promise<void> => {
  const startedAt = Date.now();
  try {
    await issueResetCode(email, ip);
  } finally {
    await holdMinimumLatency(startedAt, resetRequestMinimumMs);
  }
};

export const confirmPasswordReset = async (input: ResetPasswordConfirmInput): Promise<void> => {
  const emailHash = hashEmail(input.email);
  const result = await checkCode(emailHash, input.code, "reset");
  if (result !== "valid") {
    throw new AppError("CODE_INVALID");
  }
  const userId = await findActiveUserIdByEmail(input.email);
  if (userId === null) {
    throw new AppError("CODE_INVALID");
  }
  const passwordHash = await hashPassword(input.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  await revokeAllUserSessions(userId);
  await clearLoginFailures(emailHash);
};
