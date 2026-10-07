import { z } from "zod";
import {
  AVATAR_MAX_BYTES,
  BIO_MAX_LENGTH,
  BANNER_MAX_BYTES,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  PUBLIC_ID_LENGTH
} from "./constants.js";

const publicIdPattern = new RegExp(`^#[0-9A-F]{${PUBLIC_ID_LENGTH}}$`);
const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

export const publicIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => (value.startsWith("#") ? value : `#${value}`))
  .pipe(z.string().regex(publicIdPattern, { error: "PROFILE_ID_INVALID" }));

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH, { error: "DISPLAY_NAME_INVALID" })
  .max(DISPLAY_NAME_MAX_LENGTH, { error: "DISPLAY_NAME_INVALID" });

export const bioSchema = z.string().trim().max(BIO_MAX_LENGTH, { error: "BIO_TOO_LONG" });

const hexColorSchema = z
  .string()
  .regex(hexColorPattern, { error: "BANNER_INVALID" })
  .transform((value) => value.toUpperCase());

export const bannerColorSchema = z.object({
  type: z.literal("color"),
  value: hexColorSchema
});

export const bannerGradientSchema = z.object({
  type: z.literal("gradient"),
  from: hexColorSchema,
  to: hexColorSchema,
  angle: z.number().int({ error: "BANNER_INVALID" }).min(0, { error: "BANNER_INVALID" }).max(360, { error: "BANNER_INVALID" })
});

export const bannerImageSchema = z.object({
  type: z.literal("image")
});

export const bannerStyleValueSchema = z.discriminatedUnion("type", [bannerColorSchema, bannerGradientSchema, bannerImageSchema]);

export const bannerStyleSchema = bannerStyleValueSchema.nullable();

export type BannerStyleValue = z.infer<typeof bannerStyleValueSchema>;
export type BannerStyle = z.infer<typeof bannerStyleSchema>;

export const presenceStatusSchema = z.enum(["online", "offline", "hidden"]);
export type PresenceStatus = z.infer<typeof presenceStatusSchema>;

export const lastSeenViewSchema = z.object({
  hidden: z.boolean(),
  text: z.string().nullable()
});
export type LastSeenView = z.infer<typeof lastSeenViewSchema>;

export const friendStateSchema = z.enum(["none", "outgoing", "incoming", "friends"]);
export type FriendState = z.infer<typeof friendStateSchema>;

export const publicUserSchema = z.object({
  id: z.uuid(),
  publicId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  bannerStyle: bannerStyleSchema
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const currentUserSchema = publicUserSchema.extend({
  email: z.string(),
  createdAt: z.string()
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const profileViewSchema = z.object({
  user: publicUserSchema,
  presence: z.object({
    status: presenceStatusSchema,
    lastSeen: lastSeenViewSchema
  }),
  relation: friendStateSchema,
  blockedByMe: z.boolean(),
  bioVisible: z.boolean(),
  bannerVisible: z.boolean()
});
export type ProfileView = z.infer<typeof profileViewSchema>;

export const updateProfileInput = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema.nullable().optional(),
    bannerStyle: bannerStyleSchema.optional()
  })
  .refine((value) => value.displayName !== undefined || value.bio !== undefined || value.bannerStyle !== undefined, {
    error: "VALIDATION_FAILED"
  });
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const mediaKindSchema = z.enum(["avatar", "banner"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const mediaMaxBytes: Record<MediaKind, number> = {
  avatar: AVATAR_MAX_BYTES,
  banner: BANNER_MAX_BYTES
};

export const mediaKindParamsSchema = z.object({
  kind: mediaKindSchema
});
export type MediaKindParams = z.infer<typeof mediaKindParamsSchema>;

export const publicIdParamsSchema = z.object({
  publicId: publicIdSchema
});
export type PublicIdParams = z.infer<typeof publicIdParamsSchema>;

export const bannerKeyInput = z.object({
  bannerKey: z.string().min(1, { error: "BANNER_INVALID" })
});
export type BannerKeyInput = z.infer<typeof bannerKeyInput>;

export type AvatarResult = {
  avatarUrl: string | null;
};

export type BannerResult = {
  bannerUrl: string | null;
  bannerStyle: BannerStyle;
};
