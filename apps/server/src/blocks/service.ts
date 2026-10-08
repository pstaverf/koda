import type { BlocksOverview } from "@koda/shared/friends";
import type { PublicUser } from "@koda/shared/profile";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { blocks, users } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import {
  breakRelationsForBlock,
  findActiveUser,
  findTargetUser,
  lockPair,
  presentListUser,
  publishAll,
  type PendingEvent
} from "../friends/service.js";

export const blockUser = async (userId: string, publicId: string): Promise<void> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("BLOCK_SELF");
  }
  const broken = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    const inserted = await tx
      .insert(blocks)
      .values({ blockerId: me.id, blockedId: target.id })
      .onConflictDoNothing({ target: [blocks.blockerId, blocks.blockedId] })
      .returning({ blockerId: blocks.blockerId });
    if (inserted.length === 0) {
      throw new AppError("BLOCK_EXISTS");
    }
    return breakRelationsForBlock(tx, me.id, target.id);
  });
  if (broken === "accepted" || broken === "outgoing") {
    const meView: PublicUser = await presentListUser(me);
    const events: PendingEvent[] = [
      {
        userId: target.id,
        event: { type: broken === "accepted" ? "friends:removed" : "friends:request_cancelled", payload: { user: meView } }
      }
    ];
    publishAll(events);
  }
};

export const unblockUser = async (userId: string, publicId: string): Promise<void> => {
  const me = await findActiveUser(userId);
  const target = await findTargetUser(publicId);
  if (target.id === me.id) {
    throw new AppError("BLOCK_SELF");
  }
  const removed = await db.transaction(async (tx) => {
    await lockPair(tx, me.id, target.id);
    return tx
      .delete(blocks)
      .where(and(eq(blocks.blockerId, me.id), eq(blocks.blockedId, target.id)))
      .returning({ blockerId: blocks.blockerId });
  });
  if (removed.length === 0) {
    throw new AppError("BLOCK_NOT_FOUND");
  }
};

export const listBlocks = async (userId: string): Promise<BlocksOverview> => {
  await findActiveUser(userId);
  const rows = await db
    .select({ user: users, blockedAt: blocks.createdAt })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(and(eq(blocks.blockerId, userId), isNull(users.deletedAt)))
    .orderBy(desc(blocks.createdAt));
  const items = await Promise.all(
    rows.map(async (row) => ({ user: await presentListUser(row.user), blockedAt: row.blockedAt.toISOString() }))
  );
  return { blocks: items };
};
