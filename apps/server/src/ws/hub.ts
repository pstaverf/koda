import { wsServerEventTypes, type WsServerEvent } from "@koda/shared/ws";
import type { Redis } from "ioredis";
import { redis } from "../redis/client.js";

export type WsClient = {
  userId: string;
  sessionId: string;
  timeZone: string;
  subscriptions: Set<string>;
  send: (event: WsServerEvent) => void;
  close: (code: number, reason: string) => void;
};

export type PublishToUser = (userId: string, event: WsServerEvent) => void;

export type HubHandlers = {
  onUserEvent: (client: WsClient, event: WsServerEvent) => Promise<void>;
  onPresenceChanged: (userId: string) => Promise<void>;
};

const userChannelPrefix = "ws:user:";
export const presenceChannel = "ws:presence";

const userChannel = (userId: string): string => `${userChannelPrefix}${userId}`;

const clientsByUser = new Map<string, Set<WsClient>>();
let subscriber: Redis | null = null;
let handlers: HubHandlers | null = null;

const ignore = (): undefined => undefined;

const isServerEvent = (value: unknown): value is WsServerEvent => {
  if (typeof value !== "object" || value === null || !("type" in value) || !("payload" in value)) {
    return false;
  }
  const type = (value as { type: unknown }).type;
  return typeof type === "string" && (wsServerEventTypes as readonly string[]).includes(type);
};

const parseJson = (message: string): unknown => {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return null;
  }
};

const deliverUserEvent = (userId: string, message: string): void => {
  const clients = clientsByUser.get(userId);
  const event = parseJson(message);
  if (clients === undefined || !isServerEvent(event)) {
    return;
  }
  for (const client of clients) {
    client.send(event);
    if (handlers !== null) {
      handlers.onUserEvent(client, event).catch(ignore);
    }
  }
};

const deliverPresenceChange = (message: string): void => {
  const payload = parseJson(message);
  if (typeof payload !== "object" || payload === null || !("userId" in payload)) {
    return;
  }
  const userId = (payload as { userId: unknown }).userId;
  if (typeof userId === "string" && handlers !== null) {
    handlers.onPresenceChanged(userId).catch(ignore);
  }
};

const onMessage = (channel: string, message: string): void => {
  if (channel === presenceChannel) {
    deliverPresenceChange(message);
    return;
  }
  if (channel.startsWith(userChannelPrefix)) {
    deliverUserEvent(channel.slice(userChannelPrefix.length), message);
  }
};

export const startHub = async (hubHandlers: HubHandlers): Promise<void> => {
  if (subscriber !== null) {
    return;
  }
  handlers = hubHandlers;
  const connection = redis.duplicate();
  connection.on("error", ignore);
  connection.on("message", onMessage);
  subscriber = connection;
  await connection.subscribe(presenceChannel);
};

export const registerClient = (client: WsClient): void => {
  const existing = clientsByUser.get(client.userId);
  if (existing !== undefined) {
    existing.add(client);
    return;
  }
  clientsByUser.set(client.userId, new Set([client]));
  subscriber?.subscribe(userChannel(client.userId)).catch(ignore);
};

export const unregisterClient = (client: WsClient): void => {
  const existing = clientsByUser.get(client.userId);
  if (existing === undefined) {
    return;
  }
  existing.delete(client);
  if (existing.size === 0) {
    clientsByUser.delete(client.userId);
    subscriber?.unsubscribe(userChannel(client.userId)).catch(ignore);
  }
};

export const localClients = function* (): Generator<WsClient> {
  for (const clients of clientsByUser.values()) {
    yield* clients;
  }
};

export const publishToUser: PublishToUser = (userId, event) => {
  let message: string;
  try {
    message = JSON.stringify(event);
  } catch {
    return;
  }
  redis.publish(userChannel(userId), message).catch(ignore);
};

export const publishPresenceChanged = (userId: string): void => {
  redis.publish(presenceChannel, JSON.stringify({ userId })).catch(ignore);
};

export const closeHub = async (): Promise<void> => {
  for (const client of [...localClients()]) {
    client.close(1001, "server shutdown");
  }
  clientsByUser.clear();
  const connection = subscriber;
  subscriber = null;
  handlers = null;
  if (connection !== null) {
    await connection.quit().catch(ignore);
  }
};
