import { AVATAR_SIZE, BANNER_HEIGHT, BANNER_WIDTH } from "@koda/shared/constants";
import type { MediaKind } from "@koda/shared/profile";
import sharp from "sharp";
import { AppError } from "../lib/errors.js";
import { randomHex } from "../lib/hash.js";

export const processedImageType = "image/webp";

const maxInputPixels = 40_000_000;

const startsWith = (buffer: Buffer, signature: number[], offset = 0): boolean =>
  buffer.length >= offset + signature.length && signature.every((byte, index) => buffer[offset + index] === byte);

const isJpeg = (buffer: Buffer): boolean => startsWith(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer: Buffer): boolean => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isWebp = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8);

export const assertSupportedImage = (buffer: Buffer): void => {
  if (!isJpeg(buffer) && !isPng(buffer) && !isWebp(buffer)) {
    throw new AppError("MEDIA_TYPE_UNSUPPORTED");
  }
};

const targetSize: Record<MediaKind, { width: number; height: number }> = {
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  banner: { width: BANNER_WIDTH, height: BANNER_HEIGHT }
};

export const processImage = async (buffer: Buffer, kind: MediaKind): Promise<Buffer> => {
  assertSupportedImage(buffer);
  const size = targetSize[kind];
  try {
    return await sharp(buffer, { failOn: "error", limitInputPixels: maxInputPixels, animated: false })
      .rotate()
      .resize(size.width, size.height, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError("MEDIA_TYPE_UNSUPPORTED");
  }
};

export const mediaObjectKey = (kind: MediaKind, userId: string): string =>
  `${kind}s/${userId}/${randomHex(16)}.webp`;
