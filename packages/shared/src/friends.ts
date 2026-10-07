import { z } from "zod";
import { friendStateSchema, publicIdSchema, publicUserSchema } from "./profile.js";

export const targetUserInput = z.object({
  publicId: publicIdSchema
});
export type TargetUserInput = z.infer<typeof targetUserInput>;

export const friendListItemSchema = z.object({
  user: publicUserSchema,
  friendsSince: z.string()
});
export type FriendListItem = z.infer<typeof friendListItemSchema>;

export const friendRequestItemSchema = z.object({
  user: publicUserSchema,
  createdAt: z.string()
});
export type FriendRequestItem = z.infer<typeof friendRequestItemSchema>;

export const friendsOverviewSchema = z.object({
  friends: z.array(friendListItemSchema),
  incoming: z.array(friendRequestItemSchema),
  outgoing: z.array(friendRequestItemSchema),
  incomingCount: z.number().int()
});
export type FriendsOverview = z.infer<typeof friendsOverviewSchema>;

export const friendStateResultSchema = z.object({
  state: friendStateSchema
});
export type FriendStateResult = z.infer<typeof friendStateResultSchema>;

export const blockedUserItemSchema = z.object({
  user: publicUserSchema,
  blockedAt: z.string()
});
export type BlockedUserItem = z.infer<typeof blockedUserItemSchema>;

export const blocksOverviewSchema = z.object({
  blocks: z.array(blockedUserItemSchema)
});
export type BlocksOverview = z.infer<typeof blocksOverviewSchema>;
