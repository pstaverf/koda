import type { SessionList } from "@koda/shared/sessions";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions } from "../db/schema.js";
import { markSessionsRevoked } from "../auth/session.js";
import { AppError } from "../lib/errors.js";

export const listSessions = async (userId: string, currentSessionId: string): Promise<SessionList> => {
  const rows = await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.lastUsedAt));
  const items = rows.map((row) => ({
    id: row.id,
    userAgent: row.userAgent,
    ip: row.ip,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt.toISOString(),
    current: row.id === currentSessionId
  }));
  items.sort((left, right) => Number(right.current) - Number(left.current));
  return { sessions: items };
};

export const revokeOwnSession = async (userId: string, currentSessionId: string, sessionId: string): Promise<void> => {
  if (sessionId === currentSessionId) {
    throw new AppError("FORBIDDEN");
  }
  const updated = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  if (updated.length === 0) {
    throw new AppError("SESSION_NOT_FOUND");
  }
  await markSessionsRevoked(updated);
};
