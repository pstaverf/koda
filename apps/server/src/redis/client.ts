import { Redis } from "ioredis";
import { env } from "../env.js";

export const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: 3 });

export const pingRedis = async (): Promise<void> => {
  const response = await redis.ping();
  if (response !== "PONG") {
    throw new Error("Redis ping failed");
  }
};

export const closeRedis = async (): Promise<void> => {
  await redis.quit();
};
