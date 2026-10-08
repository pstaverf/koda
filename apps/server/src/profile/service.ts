import { PRESENCE_TTL_SECONDS } from "@koda/shared/constants";
import type { ContentAudience, LastSeenAudience } from "@koda/shared/privacy";
import type {
  CurrentUser,
  FriendState,
  ProfileView,
  PublicUser,
  UpdateProfileInput
} from "@koda/shared/profile";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { blocks, friendships, presence, privacySettings, users, type PrivacySettingsRow, type User } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { formatExactLastSeen, formatRecentLastSeen, lastSeenLongAgoText, onlineText } from "../lib/time.js";
import { presentCurrentUser } from "../auth/session.js";
import { deleteObject, presignedGetUrlOrNull } from "../media/storage.js";

type Relation = {
  state: FriendState;
  friends: boolean;
};

const orderedPair = (left: string, right: string): [string, string] => (left < right ? [left, right] : [right, left]);

export const removeStoredObject = async (key: string | null): Promise<void> => {
  if (key === null) {
    return;
  }
  await deleteObject(key).catch(() => undefined);
};

const findActiveUserBy = async (condition: ReturnType<typeof eq>): Promise<User | null> => {
  const rows = await db.select().from(users).where(and(condition, isNull(users.deletedAt))).limit(1);
  return rows[0] ?? null;
};

export const requireActiveUser = async (userId: string): Promise<User> => {
  const user = await findActiveUserBy(eq(users.id, userId));
  if (user === null) {
    throw new AppError("UNAUTHORIZED");
  }
  return user;
};

const readPrivacy = async (userId: string): Promise<PrivacySettingsRow> => {
  const rows = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId)).limit(1);
  const row = rows[0];
  if (row === undefined) {
    throw new AppError("INTERNAL_ERROR");
  }
  return row;
};

const readRelation = async (viewerId: string, targetId: string): Promise<Relation> => {
  if (viewerId === targetId) {
    return { state: "none", friends: true };
  }
  const [userA, userB] = orderedPair(viewerId, targetId);
  const rows = await db
    .select({ status: friendships.status, requestedBy: friendships.requestedBy })
    .from(friendships)
    .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    return { state: "none", friends: false };
  }
  if (row.status === "accepted") {
    return { state: "friends", friends: true };
  }
  return { state: row.requestedBy === viewerId ? "outgoing" : "incoming", friends: false };
};

const readBlocks = async (viewerId: string, targetId: string): Promise<{ byMe: boolean; byTarget: boolean }> => {
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, targetId)),
        and(eq(blocks.blockerId, targetId), eq(blocks.blockedId, viewerId))
      )
    );
  return {
    byMe: rows.some((row) => row.blockerId === viewerId),
    byTarget: rows.some((row) => row.blockerId === targetId)
  };
};

const readLastSeenAt = async (userId: string): Promise<Date | null> => {
  const rows = await db.select({ lastSeenAt: presence.lastSeenAt }).from(presence).where(eq(presence.userId, userId)).limit(1);
  return rows[0]?.lastSeenAt ?? null;
};

const audienceAllows = (audience: ContentAudience | LastSeenAudience, isSelf: boolean, friends: boolean): boolean =>
  isSelf || audience === "all" || (audience === "friends" && friends);

const hiddenPresence: ProfileView["presence"] = { status: "hidden", lastSeen: { hidden: true, text: null } };

const longAgoPresence: ProfileView["presence"] = {
  status: "offline",
  lastSeen: { hidden: false, text: lastSeenLongAgoText }
};

const buildPresence = (
  lastSeenAt: Date | null,
  targetPrivacy: PrivacySettingsRow,
  viewerPrivacy: PrivacySettingsRow,
  isSelf: boolean,
  friends: boolean,
  timeZone: string
): ProfileView["presence"] => {
  const viewerHidesSelf = !audienceAllows(viewerPrivacy.lastSeenAudience, isSelf, friends);
  if (!isSelf && viewerPrivacy.lastSeenReciprocal && viewerHidesSelf) {
    return hiddenPresence;
  }
  if (!audienceAllows(targetPrivacy.lastSeenAudience, isSelf, friends)) {
    return longAgoPresence;
  }
  if (lastSeenAt === null) {
    return longAgoPresence;
  }
  const now = new Date();
  if (now.getTime() - lastSeenAt.getTime() <= PRESENCE_TTL_SECONDS * 1000) {
    return { status: "online", lastSeen: { hidden: false, text: onlineText } };
  }
  const text =
    targetPrivacy.lastSeenFormat === "exact"
      ? formatExactLastSeen(lastSeenAt, now, timeZone)
      : formatRecentLastSeen(lastSeenAt, now);
  return { status: "offline", lastSeen: { hidden: false, text } };
};

const buildPublicUser = async (user: User, bioVisible: boolean, bannerVisible: boolean): Promise<PublicUser> => ({
  id: user.id,
  publicId: user.publicId,
  displayName: user.displayName ?? user.publicId,
  avatarUrl: await presignedGetUrlOrNull(user.avatarKey),
  bio: bioVisible ? user.bio : null,
  bannerUrl: bannerVisible ? await presignedGetUrlOrNull(user.bannerKey) : null,
  bannerStyle: bannerVisible ? (user.bannerStyle ?? null) : null
});

export const getOwnProfile = async (userId: string): Promise<CurrentUser> => presentCurrentUser(await requireActiveUser(userId));

export const updateOwnProfile = async (userId: string, input: UpdateProfileInput): Promise<CurrentUser> => {
  const user = await requireActiveUser(userId);
  const changes: Partial<Pick<User, "displayName" | "bio" | "bannerStyle" | "bannerKey">> = {};
  if (input.displayName !== undefined) {
    changes.displayName = input.displayName;
  }
  if (input.bio !== undefined) {
    changes.bio = input.bio === null || input.bio.length === 0 ? null : input.bio;
  }
  let obsoleteBannerKey: string | null = null;
  if (input.bannerStyle !== undefined) {
    if (input.bannerStyle !== null && input.bannerStyle.type === "image") {
      if (user.bannerKey === null) {
        throw new AppError("BANNER_INVALID");
      }
      changes.bannerStyle = input.bannerStyle;
    } else {
      changes.bannerStyle = input.bannerStyle;
      changes.bannerKey = null;
      obsoleteBannerKey = user.bannerKey;
    }
  }
  const updated = await db.update(users).set(changes).where(eq(users.id, userId)).returning();
  const row = updated[0];
  if (row === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  await removeStoredObject(obsoleteBannerKey);
  return presentCurrentUser(row);
};

export const getProfileView = async (viewerId: string, publicId: string, timeZone: string): Promise<ProfileView> => {
  const target = await findActiveUserBy(eq(users.publicId, publicId));
  if (target === null || target.displayName === null) {
    throw new AppError("NOT_FOUND");
  }
  const isSelf = target.id === viewerId;
  const blockState = isSelf ? { byMe: false, byTarget: false } : await readBlocks(viewerId, target.id);
  if (blockState.byTarget) {
    throw new AppError("NOT_FOUND");
  }
  const [relation, targetPrivacy, viewerPrivacy, lastSeenAt] = await Promise.all([
    readRelation(viewerId, target.id),
    readPrivacy(target.id),
    readPrivacy(viewerId),
    readLastSeenAt(target.id)
  ]);
  const restricted = blockState.byMe;
  const bioVisible = !restricted && audienceAllows(targetPrivacy.bioAudience, isSelf, relation.friends);
  const bannerVisible = !restricted && audienceAllows(targetPrivacy.bannerAudience, isSelf, relation.friends);
  const presenceView = restricted
    ? hiddenPresence
    : buildPresence(lastSeenAt, targetPrivacy, viewerPrivacy, isSelf, relation.friends, timeZone);
  return {
    user: await buildPublicUser(target, bioVisible, bannerVisible),
    presence: presenceView,
    relation: relation.state,
    blockedByMe: blockState.byMe,
    bioVisible,
    bannerVisible
  };
};
