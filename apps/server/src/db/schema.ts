import type { BannerStyle } from "@koda/shared/profile";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const audienceEnum = pgEnum("audience", ["all", "friends", "nobody"]);
export const friendRequestsAudienceEnum = pgEnum("friend_requests_audience", ["all", "nobody"]);
export const lastSeenFormatEnum = pgEnum("last_seen_format", ["exact", "recent"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: varchar("public_id", { length: 10 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 32 }),
    bio: varchar("bio", { length: 200 }),
    avatarKey: text("avatar_key"),
    bannerKey: text("banner_key"),
    bannerStyle: jsonb("banner_style").$type<BannerStyle>(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("users_public_id_unique").on(table.publicId),
    uniqueIndex("users_email_unique").on(table.email)
  ]
);

export const privacySettings = pgTable("privacy_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastSeenAudience: audienceEnum("last_seen_audience").notNull().default("friends"),
  lastSeenFormat: lastSeenFormatEnum("last_seen_format").notNull().default("recent"),
  lastSeenReciprocal: boolean("last_seen_reciprocal").notNull().default(true),
  friendRequestsAudience: friendRequestsAudienceEnum("friend_requests_audience").notNull().default("all"),
  bioAudience: audienceEnum("bio_audience").notNull().default("all"),
  bannerAudience: audienceEnum("banner_audience").notNull().default("all")
});

export const friendships = pgTable(
  "friendships",
  {
    userA: uuid("user_a")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userB: uuid("user_b")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("friendships_pair_unique").on(table.userA, table.userB),
    index("friendships_user_b_index").on(table.userB),
    check("friendships_pair_order_check", sql`${table.userA} < ${table.userB}`),
    check("friendships_requested_by_check", sql`${table.requestedBy} in (${table.userA}, ${table.userB})`)
  ]
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("blocks_pair_unique").on(table.blockerId, table.blockedId),
    check("blocks_not_self_check", sql`${table.blockerId} <> ${table.blockedId}`)
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshHash: varchar("refresh_hash", { length: 64 }).notNull(),
    familyId: uuid("family_id").notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("sessions_refresh_hash_unique").on(table.refreshHash),
    index("sessions_user_id_index").on(table.userId),
    index("sessions_family_id_index").on(table.familyId)
  ]
);

export const presence = pgTable("presence", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PrivacySettingsRow = typeof privacySettings.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PresenceRow = typeof presence.$inferSelect;
