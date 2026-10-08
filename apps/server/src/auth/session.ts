import type { AuthSession } from "@koda/shared/auth";
import type { CurrentUser } from "@koda/shared/profile";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { sessions, users, type User } from "../db/schema.js";
import { env } from "../env.js";
import { AppError } from "../lib/errors.js";
import { sha256Hex } from "../lib/hash.js";
import { createAccessToken, createRefreshToken } from "../lib/tokens.js";
import { presignedGetUrlOrNull } from "../media/storage.js";
import { redis } from "../redis/client.js";

export type CreatedSession = {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  maxAgeSeconds: number;
};

export type SessionContext = {
  userId: string;
  userAgent: string | null;
  ip: string | null;
  familyId?: string;
};

export type RequestContext = {
  userAgent: string | null;
  ip: string | null;
};

export type RotatedSession = CreatedSession & {
  user: User;
};

type RotationRecord = {
  familyId: string;
  rotatedAt: number;
};

const reuseGraceMs = 10000;

const rotatedKey = (refreshHash: string): string => `refresh:rotated:${refreshHash}`;

export const refreshMaxAgeSeconds = (): number => env.refreshTokenTtlDays * 24 * 60 * 60;

export const createSession = async (context: SessionContext): Promise<CreatedSession> => {
  const refreshToken = createRefreshToken();
  const maxAgeSeconds = refreshMaxAgeSeconds();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  const inserted = await db
    .insert(sessions)
    .values({
      userId: context.userId,
      refreshHash: sha256Hex(refreshToken),
      familyId: context.familyId ?? randomUUID(),
      userAgent: context.userAgent,
      ip: context.ip,
      expiresAt
    })
    .returning({ id: sessions.id });
  const created = inserted[0];
  if (created === undefined) {
    throw new AppError("INTERNAL_ERROR");
  }
  const accessToken = await createAccessToken(context.userId);
  return { sessionId: created.id, accessToken, refreshToken, maxAgeSeconds };
};

export const buildCurrentUser = (user: User, avatarUrl: string | null, bannerUrl: string | null): CurrentUser => ({
  id: user.id,
  publicId: user.publicId,
  email: user.email,
  displayName: user.displayName,
  bio: user.bio,
  avatarUrl,
  bannerUrl,
  bannerStyle: user.bannerStyle ?? null,
  createdAt: user.createdAt.toISOString()
});

export const presentCurrentUser = async (user: User): Promise<CurrentUser> => {
  const avatarUrl = await presignedGetUrlOrNull(user.avatarKey);
  const bannerUrl = await presignedGetUrlOrNull(user.bannerKey);
  return buildCurrentUser(user, avatarUrl, bannerUrl);
};

export const buildAuthSession = async (user: User, accessToken: string): Promise<AuthSession> => ({
  accessToken,
  user: await presentCurrentUser(user)
});

export const findActiveUser = async (userId: string): Promise<User | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
};

export const revokeFamily = async (familyId: string): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.familyId, familyId), isNull(sessions.revokedAt)));
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
};

const handleFailedRotation = async (refreshHash: string): Promise<never> => {
  const raw = await redis.get(rotatedKey(refreshHash));
  if (raw !== null) {
    const record = JSON.parse(raw) as RotationRecord;
    if (Date.now() - record.rotatedAt > reuseGraceMs) {
      await revokeFamily(record.familyId);
    }
  }
  throw new AppError("REFRESH_TOKEN_INVALID");
};

export const rotateSession = async (refreshToken: string, context: RequestContext): Promise<RotatedSession> => {
  const refreshHash = sha256Hex(refreshToken);
  const nextToken = createRefreshToken();
  const now = new Date();
  const updated = await db
    .update(sessions)
    .set({
      refreshHash: sha256Hex(nextToken),
      lastUsedAt: now,
      userAgent: context.userAgent,
      ip: context.ip
    })
    .where(and(eq(sessions.refreshHash, refreshHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .returning({
      id: sessions.id,
      userId: sessions.userId,
      familyId: sessions.familyId,
      expiresAt: sessions.expiresAt
    });
  const row = updated[0];
  if (row === undefined) {
    return handleFailedRotation(refreshHash);
  }
  const maxAgeSeconds = Math.max(1, Math.floor((row.expiresAt.getTime() - now.getTime()) / 1000));
  const record: RotationRecord = { familyId: row.familyId, rotatedAt: now.getTime() };
  await redis.set(rotatedKey(refreshHash), JSON.stringify(record), "EX", maxAgeSeconds);
  const user = await findActiveUser(row.userId);
  if (user === null) {
    await revokeFamily(row.familyId);
    throw new AppError("REFRESH_TOKEN_INVALID");
  }
  const accessToken = await createAccessToken(row.userId);
  return { sessionId: row.id, user, accessToken, refreshToken: nextToken, maxAgeSeconds };
};

export const findActiveSessionByToken = async (
  refreshToken: string
): Promise<{ id: string; userId: string } | null> => {
  const rows = await db
    .select({ id: sessions.id, userId: sessions.userId })
    .from(sessions)
    .where(
      and(eq(sessions.refreshHash, sha256Hex(refreshToken)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))
    )
    .limit(1);
  return rows[0] ?? null;
};

export const revokeSessionByToken = async (refreshToken: string): Promise<void> => {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.refreshHash, sha256Hex(refreshToken)), isNull(sessions.revokedAt)));
};
