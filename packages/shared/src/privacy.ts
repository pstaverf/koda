import { z } from "zod";

export const lastSeenAudienceSchema = z.enum(["all", "friends", "nobody"]);
export type LastSeenAudience = z.infer<typeof lastSeenAudienceSchema>;

export const lastSeenFormatSchema = z.enum(["exact", "recent"]);
export type LastSeenFormat = z.infer<typeof lastSeenFormatSchema>;

export const friendRequestsAudienceSchema = z.enum(["all", "nobody"]);
export type FriendRequestsAudience = z.infer<typeof friendRequestsAudienceSchema>;

export const contentAudienceSchema = z.enum(["all", "friends", "nobody"]);
export type ContentAudience = z.infer<typeof contentAudienceSchema>;

export const privacySettingsSchema = z.object({
  lastSeenAudience: lastSeenAudienceSchema,
  lastSeenFormat: lastSeenFormatSchema,
  lastSeenReciprocal: z.boolean(),
  friendRequestsAudience: friendRequestsAudienceSchema,
  bioAudience: contentAudienceSchema,
  bannerAudience: contentAudienceSchema
});
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export const defaultPrivacySettings: PrivacySettings = {
  lastSeenAudience: "friends",
  lastSeenFormat: "recent",
  lastSeenReciprocal: true,
  friendRequestsAudience: "all",
  bioAudience: "all",
  bannerAudience: "all"
};

export const updatePrivacyInput = privacySettingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { error: "PRIVACY_INVALID" });
export type UpdatePrivacyInput = z.infer<typeof updatePrivacyInput>;
