import { redis } from "../redis/client.js";

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
return count
`;

export const incrementCounter = async (key: string, windowSeconds: number): Promise<number> =>
  Number(await redis.eval(incrementScript, 1, key, String(windowSeconds)));

export const readCounter = async (key: string): Promise<number> => {
  const value = await redis.get(key);
  return value === null ? 0 : Number(value);
};

export const consumeLimit = async (key: string, limit: number, windowSeconds: number): Promise<boolean> =>
  (await incrementCounter(key, windowSeconds)) <= limit;

export const limitTtl = async (key: string): Promise<number> => redis.ttl(key);
