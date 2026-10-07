import type { CurrentUser } from "@koda/shared/profile";
import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { sessions, type User } from "../db/schema.js";
import { env } from "../env.js";
import { AppError } from "../lib/errors.js";
import { sha256Hex } from "../lib/hash.js";
import { createAccessToken, createRefreshToken } from "../lib/tokens.js";

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
