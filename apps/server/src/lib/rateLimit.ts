import { redis } from "../redis/client.js";

export const consumeLimit = async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count <= limit;
};

export const limitTtl = async (key: string): Promise<number> => redis.ttl(key);
