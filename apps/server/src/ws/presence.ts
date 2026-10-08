import { PRESENCE_LAST_SEEN_WRITE_SECONDS, PRESENCE_TTL_SECONDS } from "@koda/shared/constants";
import { wsPresenceSubscribePayloadSchema, type WsPresenceUpdatePayload } from "@koda/shared/ws";
import { db } from "../db/client.js";
import { presence } from "../db/schema.js";
import { getPresenceView, presenceKey } from "../profile/service.js";
import { redis } from "../redis/client.js";
import { localClients, publishPresenceChanged, type WsClient } from "./hub.js";

const connectScript = `
local count = redis.call("HINCRBY", KEYS[1], "connections", 1)
redis.call("HSET", KEYS[1], "lastSeenAt", ARGV[1])
redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
return count
`;

const disconnectScript = `
local count = redis.call("HINCRBY", KEYS[1], "connections", -1)
if count <= 0 then
  redis.call("DEL", KEYS[1])
  return 0
end
redis.call("HSET", KEYS[1], "lastSeenAt", ARGV[1])
redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
return count
`;

const heartbeatScript = `
if redis.call("EXISTS", KEYS[1]) == 0 then
  redis.call("HSET", KEYS[1], "connections", 1)
end
redis.call("HSET", KEYS[1], "lastSeenAt", ARGV[1])
redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
return 1
`;

const lastSeenWriteKey = (userId: string): string => `presence:pg_write:${userId}`;

const writeLastSeen = async (userId: string, force: boolean): Promise<void> => {
  if (!force) {
    const acquired = await redis.set(lastSeenWriteKey(userId), "1", "EX", PRESENCE_LAST_SEEN_WRITE_SECONDS, "NX");
    if (acquired === null) {
      return;
    }
  }
  const now = new Date();
  await db
    .insert(presence)
    .values({ userId, lastSeenAt: now })
    .onConflictDoUpdate({ target: presence.userId, set: { lastSeenAt: now } });
};

export const markConnected = async (userId: string): Promise<void> => {
  const count = Number(await redis.eval(connectScript, 1, presenceKey(userId), String(Date.now()), String(PRESENCE_TTL_SECONDS)));
  await writeLastSeen(userId, false);
  if (count === 1) {
    publishPresenceChanged(userId);
  }
};

export const markHeartbeat = async (userId: string): Promise<void> => {
  await redis.eval(heartbeatScript, 1, presenceKey(userId), String(Date.now()), String(PRESENCE_TTL_SECONDS));
};

export const markDisconnected = async (userId: string): Promise<void> => {
  const count = Number(
    await redis.eval(disconnectScript, 1, presenceKey(userId), String(Date.now()), String(PRESENCE_TTL_SECONDS))
  );
  if (count === 0) {
    await writeLastSeen(userId, true);
    publishPresenceChanged(userId);
  }
};

const presencePayload = async (client: WsClient, targetId: string): Promise<WsPresenceUpdatePayload | null> => {
  const view = await getPresenceView(client.userId, targetId, client.timeZone);
  if (view === null) {
    return null;
  }
  if (view.lastSeen.text === null) {
    return { userId: targetId, status: view.status };
  }
  return { userId: targetId, status: view.status, lastSeenText: view.lastSeen.text };
};

export const sendPresence = async (client: WsClient, targetIds: readonly string[]): Promise<void> => {
  const payloads = await Promise.all(targetIds.map((targetId) => presencePayload(client, targetId)));
  for (const payload of payloads) {
    if (payload !== null) {
      client.send({ type: "presence:update", payload });
    }
  }
};

export const handlePresenceSubscribe = async (client: WsClient, payload: unknown): Promise<boolean> => {
  const parsed = wsPresenceSubscribePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return false;
  }
  const targetIds = [...new Set(parsed.data.userIds)];
  client.subscriptions = new Set(targetIds);
  await sendPresence(client, targetIds);
  return true;
};

export const broadcastPresenceChange = async (userId: string): Promise<void> => {
  const watchers = [...localClients()].filter((client) => client.subscriptions.has(userId));
  await Promise.all(watchers.map((client) => sendPresence(client, [userId]).catch(() => undefined)));
};
