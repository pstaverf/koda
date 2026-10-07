import { PUBLIC_ID_ATTEMPTS, PUBLIC_ID_LENGTH } from "@koda/shared/constants";
import { randomBytes } from "node:crypto";
import { AppError } from "./errors.js";

export const createPublicId = (): string => {
  const bytes = randomBytes(PUBLIC_ID_LENGTH);
  let digits = "";
  for (const byte of bytes) {
    digits += (byte % 16).toString(16).toUpperCase();
  }
  return `#${digits}`;
};

export const createUniquePublicId = async (isTaken: (publicId: string) => Promise<boolean>): Promise<string> => {
  for (let attempt = 0; attempt < PUBLIC_ID_ATTEMPTS; attempt += 1) {
    const publicId = createPublicId();
    if (!(await isTaken(publicId))) {
      return publicId;
    }
  }
  throw new AppError("ID_GENERATION_FAILED");
};
