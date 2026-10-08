import {
  AVATAR_MAX_BYTES,
  BANNER_MAX_BYTES
} from "@koda/shared/constants";
import { type AvatarResult, type BannerResult, type MediaKind, mediaMaxBytes } from "@koda/shared/profile";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users, type User } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import { removeStoredObject, requireActiveUser } from "../profile/service.js";
import { mediaObjectKey, processImage, processedImageType } from "./images.js";
import { presignedGetUrlOrNull, putObject } from "./storage.js";

const multipartOverheadBytes = 64 * 1024;

const readUpload = async (request: FastifyRequest, kind: MediaKind): Promise<Buffer> => {
  if (!request.isMultipart()) {
    throw new AppError("MEDIA_TYPE_UNSUPPORTED");
  }
  const file = await request.file({ limits: { fileSize: mediaMaxBytes[kind], files: 1, fields: 0 } });
  if (file === undefined) {
    throw new AppError("FIELD_REQUIRED");
  }
  const buffer = await file.toBuffer();
  if (file.file.truncated || buffer.length > mediaMaxBytes[kind]) {
    throw new AppError("MEDIA_TOO_LARGE");
  }
  if (buffer.length === 0) {
    throw new AppError("FIELD_REQUIRED");
  }
  return buffer;
};

const saveUser = async (userId: string, changes: Partial<Pick<User, "avatarKey" | "bannerKey" | "bannerStyle">>): Promise<User> => {
  const updated = await db.update(users).set(changes).where(eq(users.id, userId)).returning();
  const row = updated[0];
  if (row === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  return row;
};

const avatarResult = async (user: User): Promise<AvatarResult> => ({
  avatarUrl: await presignedGetUrlOrNull(user.avatarKey)
});

const bannerResult = async (user: User): Promise<BannerResult> => ({
  bannerUrl: await presignedGetUrlOrNull(user.bannerKey),
  bannerStyle: user.bannerStyle ?? null
});

const uploadAvatar = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const current = await requireActiveUser(userId);
  const image = await processImage(await readUpload(request, "avatar"), "avatar");
  const key = mediaObjectKey("avatar", userId);
  await putObject(key, image, processedImageType);
  const user = await saveUser(userId, { avatarKey: key });
  await removeStoredObject(current.avatarKey);
  await reply.send({ data: await avatarResult(user) });
};

const deleteAvatar = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const current = await requireActiveUser(userId);
  const user = await saveUser(userId, { avatarKey: null });
  await removeStoredObject(current.avatarKey);
  await reply.send({ data: await avatarResult(user) });
};

const uploadBanner = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const current = await requireActiveUser(userId);
  const image = await processImage(await readUpload(request, "banner"), "banner");
  const key = mediaObjectKey("banner", userId);
  await putObject(key, image, processedImageType);
  const user = await saveUser(userId, { bannerKey: key, bannerStyle: { type: "image" } });
  await removeStoredObject(current.bannerKey);
  await reply.send({ data: await bannerResult(user) });
};

const deleteBanner = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const current = await requireActiveUser(userId);
  const user = await saveUser(userId, { bannerKey: null, bannerStyle: null });
  await removeStoredObject(current.bannerKey);
  await reply.send({ data: await bannerResult(user) });
};

export const registerMediaRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    "/media/avatar",
    { preHandler: authGuard, bodyLimit: AVATAR_MAX_BYTES + multipartOverheadBytes },
    uploadAvatar
  );
  app.delete("/media/avatar", { preHandler: authGuard }, deleteAvatar);
  app.post(
    "/media/banner",
    { preHandler: authGuard, bodyLimit: BANNER_MAX_BYTES + multipartOverheadBytes },
    uploadBanner
  );
  app.delete("/media/banner", { preHandler: authGuard }, deleteBanner);
};
