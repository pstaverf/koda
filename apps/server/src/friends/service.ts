import { FRIEND_REQUESTS_PER_DAY } from "@koda/shared/constants";
import type { FriendRequestItem, FriendsOverview, FriendStateResult } from "@koda/shared/friends";
import type { PublicUser } from "@koda/shared/profile";
import type { WsServerEvent } from "@koda/shared/ws";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { blocks, friendships, privacySettings, users, type User } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { consumeLimit } from "../lib/rateLimit.js";
import { presignedGetUrlOrNull } from "../media/storage.js";
import { publishToUser } from "../ws/hub.js";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PendingEvent = {
  userId: string;
  event: WsServerEvent;
};

const friendRequestWindowSeconds = 86400;

export const orderedPair = (left: string, right: string): [string, string] => (left < right ? [left, right] : [right, left]);

export const lockPair = async (tx: Tx, left: string, right: string): Promise<void> => {
  const [userA, userB] = orderedPair(left, right);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`pair:${userA}:${userB}`}, 0))`);
};

export const presentListUser = async (user: User): Promise<PublicUser> => ({
  id: user.id,
  publicId: user.publicId,
  displayName: user.displayName ?? user.publicId,
  avatarUrl: await presignedGetUrlOrNull(user.avatarKey),
  bio: null,
  bannerUrl: null,
  bannerStyle: null
});

export const publishAll = (events: readonly PendingEvent[]): void => {
  for (const item of events) {
    try {
      publishToUser(item.userId, item.event);
    } catch {
      continue;
    }
  }
};

export const findActiveUser = async (userId: string): Promise<User> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  return row;
};

export const findTargetUser = async (publicId: string): Promise<User> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.publicId, publicId), isNull(users.deletedAt), isNotNull(users.displayName)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    throw new AppError("NOT_FOUND");
  }
  return row;
};

const readBlockState = async (tx: Tx, viewerId: string, targetId: string): Promise<{ byMe: boolean; byTarget: boolean }> => {
  const rows = await tx
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

const assertNotBlocked = async (tx: Tx, viewerId: string, targetId: string): Promise<void> => {
  const state = await readBlockState(tx, viewerId, targetId);
  if (state.byTarget) {
    throw new AppError("NOT_FOUND");
  }
  if (state.byMe) {
    throw new AppError("BLOCKED");
  }
};

const readPairForUpdate = async (tx: Tx, left: string, right: string) => {
  const [userA, userB] = orderedPair(left, right);
  const rows = await tx
    .select()
    .from(friendships)
    .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)))
    .for("update")
    .limit(1);
  return rows[0] ?? null;
};

const deletePair = async (tx: Tx, left: string, right: string): Promise<void> => {
  const [userA, userB] = orderedPair(left, right);
  await tx.delete(friendships).where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)));
};

const friendEvent = (
  type: "friends:request_received" | "friends:request_cancelled" | "friends:accepted" | "friends:removed",
  user: PublicUser
): WsServerEvent => ({ type, payload: { user } });

const readRequestsAudience = async (tx: Tx, userId: string): Promise<"all" | "nobody"> => {
  const rows = await tx
    .select({ audience: privacySettings.friendRequestsAudience })
    .from(privacySettings)
    .where(eq(privacySettings.userId, userId))
    .limit(1);
  return rows[0]?.audience ?? "all";
};

export const sendFriendRequest = async (userId: string, publicId: string): Promise<FriendStateResult> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("FRIEND_SELF");
  }
  if (!(await consumeLimit(`rl:friend_req:${me.id}`, FRIEND_REQUESTS_PER_DAY, friendRequestWindowSeconds))) {
    throw new AppError("FRIEND_REQUEST_LIMIT");
  }
  const outcome = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    await assertNotBlocked(tx, me.id, target.id);
    const existing = await readPairForUpdate(tx, me.id, target.id);
    if (existing !== null) {
      if (existing.status === "accepted" || existing.requestedBy === me.id) {
        throw new AppError("FRIEND_REQUEST_EXISTS");
      }
      const [userA, userB] = orderedPair(me.id, target.id);
      await tx
        .update(friendships)
        .set({ status: "accepted" })
        .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB), eq(friendships.status, "pending")));
      return "friends" as const;
    }
    if ((await readRequestsAudience(tx, target.id)) === "nobody") {
      throw new AppError("FRIEND_REQUESTS_DISABLED");
    }
    const [userA, userB] = orderedPair(me.id, target.id);
    const inserted = await tx
      .insert(friendships)
      .values({ userA, userB, status: "pending", requestedBy: me.id })
      .onConflictDoNothing({ target: [friendships.userA, friendships.userB] })
      .returning({ userA: friendships.userA });
    if (inserted.length === 0) {
      throw new AppError("FRIEND_REQUEST_EXISTS");
    }
    return "outgoing" as const;
  });
  const meView = await presentListUser(me);
  if (outcome === "friends") {
    publishAll([
      { userId: target.id, event: friendEvent("friends:accepted", meView) },
      { userId: me.id, event: friendEvent("friends:accepted", await presentListUser(target)) }
    ]);
  } else {
    publishAll([{ userId: target.id, event: friendEvent("friends:request_received", meView) }]);
  }
  return { state: outcome };
};

export const cancelFriendRequest = async (userId: string, publicId: string): Promise<void> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("FRIEND_SELF");
  }
  const [userA, userB] = orderedPair(me.id, target.id);
  const removed = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    return tx
      .delete(friendships)
      .where(
        and(
          eq(friendships.userA, userA),
          eq(friendships.userB, userB),
          eq(friendships.status, "pending"),
          eq(friendships.requestedBy, me.id)
        )
      )
      .returning({ userA: friendships.userA });
  });
  if (removed.length === 0) {
    throw new AppError("FRIEND_REQUEST_NOT_FOUND");
  }
  publishAll([{ userId: target.id, event: friendEvent("friends:request_cancelled", await presentListUser(me)) }]);
};

export const acceptFriendRequest = async (userId: string, publicId: string): Promise<FriendStateResult> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("FRIEND_SELF");
  }
  const [userA, userB] = orderedPair(me.id, target.id);
  await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    const blockState = await readBlockState(tx, me.id, target.id);
    if (blockState.byMe || blockState.byTarget) {
      throw new AppError("FRIEND_REQUEST_NOT_FOUND");
    }
    const updated = await tx
      .update(friendships)
      .set({ status: "accepted" })
      .where(
        and(
          eq(friendships.userA, userA),
          eq(friendships.userB, userB),
          eq(friendships.status, "pending"),
          eq(friendships.requestedBy, target.id)
        )
      )
      .returning({ userA: friendships.userA });
    if (updated.length === 0) {
      throw new AppError("FRIEND_REQUEST_NOT_FOUND");
    }
  });
  publishAll([{ userId: target.id, event: friendEvent("friends:accepted", await presentListUser(me)) }]);
  return { state: "friends" };
};

export const declineFriendRequest = async (userId: string, publicId: string): Promise<void> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("FRIEND_SELF");
  }
  const [userA, userB] = orderedPair(me.id, target.id);
  const removed = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    return tx
      .delete(friendships)
      .where(
        and(
          eq(friendships.userA, userA),
          eq(friendships.userB, userB),
          eq(friendships.status, "pending"),
          eq(friendships.requestedBy, target.id)
        )
      )
      .returning({ userA: friendships.userA });
  });
  if (removed.length === 0) {
    throw new AppError("FRIEND_REQUEST_NOT_FOUND");
  }
};

export const removeFriend = async (userId: string, publicId: string): Promise<void> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("FRIEND_SELF");
  }
  const [userA, userB] = orderedPair(me.id, target.id);
  const removed = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    return tx
      .delete(friendships)
      .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB), eq(friendships.status, "accepted")))
      .returning({ userA: friendships.userA });
  });
  if (removed.length === 0) {
    throw new AppError("NOT_FRIENDS");
  }
  publishAll([{ userId: target.id, event: friendEvent("friends:removed", await presentListUser(me)) }]);
};

export const breakRelationsForBlock = async (tx: Tx, blockerId: string, blockedId: string): Promise<"accepted" | "outgoing" | "incoming" | null> => {
  const existing = await readPairForUpdate(tx, blockerId, blockedId);
  if (existing === null) {
    return null;
  }
  await deletePair(tx, blockerId, blockedId);
  if (existing.status === "accepted") {
    return "accepted";
  }
  return existing.requestedBy === blockerId ? "outgoing" : "incoming";
};

export const listFriends = async (userId: string): Promise<FriendsOverview> => {
  await findActiveUser(userId);
  const rows = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userA, userId), eq(friendships.userB, userId)))
    .orderBy(sql`${friendships.createdAt} desc`);
  const otherIds = rows.map((row) => (row.userA === userId ? row.userB : row.userA));
  const people =
    otherIds.length === 0
      ? []
      : await db
          .select()
          .from(users)
          .where(and(inArray(users.id, otherIds), isNull(users.deletedAt), isNotNull(users.displayName)));
  const byId = new Map<string, PublicUser>();
  await Promise.all(
    people.map(async (person) => {
      byId.set(person.id, await presentListUser(person));
    })
  );
  const overview: FriendsOverview = { friends: [], incoming: [], outgoing: [], incomingCount: 0 };
  for (const row of rows) {
    const otherId = row.userA === userId ? row.userB : row.userA;
    const user = byId.get(otherId);
    if (user === undefined) {
      continue;
    }
    const createdAt = row.createdAt.toISOString();
    if (row.status === "accepted") {
      overview.friends.push({ user, friendsSince: createdAt });
      continue;
    }
    const item: FriendRequestItem = { user, createdAt };
    if (row.requestedBy === userId) {
      overview.outgoing.push(item);
    } else {
      overview.incoming.push(item);
    }
  }
  overview.friends.sort((left, right) => left.user.displayName.localeCompare(right.user.displayName, "ru"));
  overview.incomingCount = overview.incoming.length;
  return overview;
};
