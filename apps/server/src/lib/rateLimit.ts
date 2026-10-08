import { redis } from "../redis/client.js";

const consumeScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
return count
`;

export const consumeLimit = async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  const count = Number(await redis.eval(consumeScript, 1, key, String(windowSeconds)));
  return count <= limit;
};

export const limitTtl = async (key: string): Promise<number> => redis.ttl(key);
