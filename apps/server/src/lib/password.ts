import argon2, { type HashOptions } from "argon2";
import { env } from "../env.js";

const argonOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: env.argon2.memoryKib,
  timeCost: env.argon2.timeCost,
  parallelism: env.argon2.parallelism
};

export const hashPassword = (password: string): Promise<string> => argon2.hash(password, argonOptions);

export const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
};
