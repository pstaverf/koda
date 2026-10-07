import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

export const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

export const hashEmail = (email: string): string => createHmac("sha256", env.emailHashSecret).update(email).digest("hex");

export const hashCode = (code: string, salt: string): string =>
  createHmac("sha256", env.codeHashSecret).update(`${salt}:${code}`).digest("hex");

export const randomToken = (bytes: number): string => randomBytes(bytes).toString("base64url");

export const randomHex = (bytes: number): string => randomBytes(bytes).toString("hex");

export const safeEqualHex = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};
