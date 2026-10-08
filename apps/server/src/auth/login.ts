import { LOGIN_FAILURES_BEFORE_CAPTCHA, LOGIN_FAILURE_TTL_SECONDS, LOGIN_IP_HOURLY_LIMIT } from "@koda/shared/constants";
import type { LoginInput } from "@koda/shared/auth";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type User } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { hashEmail } from "../lib/hash.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { consumeLimit, incrementCounter, readCounter } from "../lib/rateLimit.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { redis } from "../redis/client.js";

const hourSeconds = 3600;

const emailFailureKey = (emailHash: string): string => `fail:login:${emailHash}`;
const ipFailureKey = (ip: string): string => `fail:login:ip:${ip}`;
const ipLimitKey = (ip: string): string => `rl:login:${ip}`;

let dummyHash: Promise<string> | null = null;

const dummyPasswordHash = (): Promise<string> => {
  if (dummyHash === null) {
    dummyHash = hashPassword("koda-dummy-password-for-timing");
  }
  return dummyHash;
};

const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
};

const captchaRequired = async (emailHash: string, ip: string): Promise<boolean> => {
  const [emailFailures, ipFailures] = await Promise.all([
    readCounter(emailFailureKey(emailHash)),
    readCounter(ipFailureKey(ip))
  ]);
  return emailFailures >= LOGIN_FAILURES_BEFORE_CAPTCHA || ipFailures >= LOGIN_FAILURES_BEFORE_CAPTCHA;
};

const recordFailure = async (emailHash: string, ip: string): Promise<void> => {
  await Promise.all([
    incrementCounter(emailFailureKey(emailHash), LOGIN_FAILURE_TTL_SECONDS),
    incrementCounter(ipFailureKey(ip), LOGIN_FAILURE_TTL_SECONDS)
  ]);
};

export const clearLoginFailures = async (emailHash: string): Promise<void> => {
  await redis.del(emailFailureKey(emailHash));
};

export const authenticate = async (input: LoginInput, ip: string): Promise<User> => {
  if (!(await consumeLimit(ipLimitKey(ip), LOGIN_IP_HOURLY_LIMIT, hourSeconds))) {
    throw new AppError("RATE_LIMITED");
  }
  const emailHash = hashEmail(input.email);
  if (await captchaRequired(emailHash, ip)) {
    if (input.turnstileToken === undefined) {
      throw new AppError("CAPTCHA_REQUIRED");
    }
    await verifyTurnstile(input.turnstileToken, ip);
  }
  const user = await findUserByEmail(input.email);
  const passwordHash = user === null ? await dummyPasswordHash() : user.passwordHash;
  const passwordValid = await verifyPassword(passwordHash, input.password);
  if (user === null || user.deletedAt !== null || !passwordValid) {
    await recordFailure(emailHash, ip);
    throw new AppError("INVALID_CREDENTIALS");
  }
  await clearLoginFailures(emailHash);
  return user;
};
