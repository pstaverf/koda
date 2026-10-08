import type { PrivacySettings, UpdatePrivacyInput } from "@koda/shared/privacy";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { privacySettings, type PrivacySettingsRow } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { requireActiveUser } from "../profile/service.js";

const presentPrivacy = (row: PrivacySettingsRow): PrivacySettings => ({
  lastSeenAudience: row.lastSeenAudience,
  lastSeenFormat: row.lastSeenFormat,
  lastSeenReciprocal: row.lastSeenReciprocal,
  friendRequestsAudience: row.friendRequestsAudience,
  bioAudience: row.bioAudience,
  bannerAudience: row.bannerAudience
});

const ensurePrivacyRow = async (userId: string): Promise<PrivacySettingsRow> => {
  await db.insert(privacySettings).values({ userId }).onConflictDoNothing({ target: privacySettings.userId });
  const rows = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId)).limit(1);
  const row = rows[0];
  if (row === undefined) {
    throw new AppError("INTERNAL_ERROR");
  }
  return row;
};

export const getPrivacy = async (userId: string): Promise<PrivacySettings> => {
  await requireActiveUser(userId);
  return presentPrivacy(await ensurePrivacyRow(userId));
};

export const updatePrivacy = async (userId: string, input: UpdatePrivacyInput): Promise<PrivacySettings> => {
  await requireActiveUser(userId);
  await ensurePrivacyRow(userId);
  const changes: Partial<PrivacySettings> = {};
  if (input.lastSeenAudience !== undefined) {
    changes.lastSeenAudience = input.lastSeenAudience;
  }
  if (input.lastSeenFormat !== undefined) {
    changes.lastSeenFormat = input.lastSeenFormat;
  }
  if (input.lastSeenReciprocal !== undefined) {
    changes.lastSeenReciprocal = input.lastSeenReciprocal;
  }
  if (input.friendRequestsAudience !== undefined) {
    changes.friendRequestsAudience = input.friendRequestsAudience;
  }
  if (input.bioAudience !== undefined) {
    changes.bioAudience = input.bioAudience;
  }
  if (input.bannerAudience !== undefined) {
    changes.bannerAudience = input.bannerAudience;
  }
  const updated = await db.update(privacySettings).set(changes).where(eq(privacySettings.userId, userId)).returning();
  const row = updated[0];
  if (row === undefined) {
    throw new AppError("INTERNAL_ERROR");
  }
  return presentPrivacy(row);
};
