import type { RegistrationStep } from "@koda/shared/auth";
import { REGISTRATION_TOKEN_BYTES, REGISTRATION_TTL_SECONDS } from "@koda/shared/constants";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { privacySettings, users, type User } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { randomToken } from "../lib/hash.js";
import { createUniquePublicId } from "../lib/ids.js";
import { redis } from "../redis/client.js";

export type RegistrationRecord = {
  email: string;
  step: RegistrationStep;
};

type PgFailure = {
  code?: string;
  constraint?: string;
};

const registrationLockSeconds = 30;

const registrationKey = (token: string): string => `reg:${token}`;
const registrationLockKey = (token: string): string => `reg-lock:${token}`;

const pgFailure = (error: unknown): PgFailure | null => {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  return error as PgFailure;
};

export const randomRegistrationToken = (): string => randomToken(REGISTRATION_TOKEN_BYTES);

export const readRegistration = async (token: string): Promise<RegistrationRecord | null> => {
  const raw = await redis.get(registrationKey(token));
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as RegistrationRecord;
};

export const lockRegistration = async (token: string): Promise<boolean> =>
  (await redis.set(registrationLockKey(token), "1", "EX", registrationLockSeconds, "NX")) === "OK";

export const unlockRegistration = async (token: string): Promise<void> => {
  await redis.del(registrationLockKey(token));
};

export const createRegistration = async (email: string, step: RegistrationStep): Promise<string> => {
  const token = randomRegistrationToken();
  const record: RegistrationRecord = { email, step };
  await redis.set(registrationKey(token), JSON.stringify(record), "EX", REGISTRATION_TTL_SECONDS);
  return token;
};

export const deleteRegistration = async (token: string): Promise<void> => {
  await redis.del(registrationKey(token));
};

export const findUserIdByEmail = async (email: string): Promise<string | null> => {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const row = rows[0];
  return row === undefined ? null : row.id;
};

export const createAccount = async (email: string, passwordHash: string): Promise<User> => {
  try {
    return await db.transaction(async (tx) => {
      const publicId = await createUniquePublicId(async (candidate) => {
        const rows = await tx.select({ id: users.id }).from(users).where(eq(users.publicId, candidate)).limit(1);
        return rows.length > 0;
      });
      const inserted = await tx
        .insert(users)
        .values({ publicId, email, passwordHash, emailVerifiedAt: new Date() })
        .returning();
      const created = inserted[0];
      if (created === undefined) {
        throw new AppError("INTERNAL_ERROR");
      }
      await tx.insert(privacySettings).values({ userId: created.id });
      return created;
    });
  } catch (error) {
    const failure = pgFailure(error);
    if (failure?.code === "23505") {
      if (failure.constraint === "users_public_id_unique") {
        throw new AppError("ID_GENERATION_FAILED");
      }
      throw new AppError("EMAIL_ALREADY_USED");
    }
    throw error;
  }
};

export const updateDisplayName = async (userId: string, displayName: string): Promise<User> => {
  const updated = await db.update(users).set({ displayName }).where(eq(users.id, userId)).returning();
  const row = updated[0];
  if (row === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  return row;
};
