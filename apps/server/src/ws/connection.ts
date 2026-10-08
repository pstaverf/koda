import { WS_AUTH_TIMEOUT_MS } from "@koda/shared/constants";
import { wsEnvelopeSchema, type WsServerEvent } from "@koda/shared/ws";
import type { WebSocket } from "@fastify/websocket";
import type { FastifyBaseLogger } from "fastify";
import { isSessionRevoked } from "../auth/session.js";
import { loggableError } from "../lib/errors.js";
import { authenticateMessage } from "./auth.js";
import { registerClient, unregisterClient, type WsClient } from "./hub.js";
import { handlePresenceSubscribe, markConnected, markDisconnected, markHeartbeat } from "./presence.js";

const policyViolation = 1008;
const unsupportedData = 1003;

export type WsConnection = {
  onPong: () => void;
  onTick: () => void;
};

type RawMessage = Buffer | ArrayBuffer | Buffer[];

const messageText = (data: RawMessage): string => {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString("utf8");
  }
  return data.toString("utf8");
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const createConnection = (socket: WebSocket, log: FastifyBaseLogger): WsConnection => {
  let client: WsClient | null = null;
  let closed = false;
  let queue: Promise<void> = Promise.resolve();

  const close = (code: number, reason: string): void => {
    if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
      socket.close(code, reason);
    }
  };

  const send = (event: WsServerEvent): void => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  };

  const authTimer = setTimeout(() => {
    if (client === null) {
      close(policyViolation, "auth timeout");
    }
  }, WS_AUTH_TIMEOUT_MS);

  const authenticate = async (raw: string): Promise<void> => {
    const identity = await authenticateMessage(raw);
    if (closed) {
      return;
    }
    if (identity === null) {
      close(policyViolation, "unauthorized");
      return;
    }
    clearTimeout(authTimer);
    const created: WsClient = { ...identity, subscriptions: new Set(), send, close };
    client = created;
    registerClient(created);
    await markConnected(created.userId);
  };

  const route = async (current: WsClient, raw: string): Promise<void> => {
    const envelope = wsEnvelopeSchema.safeParse(parseJson(raw));
    if (!envelope.success) {
      close(unsupportedData, "invalid message");
      return;
    }
    if (envelope.data.type === "presence:subscribe") {
      if (!(await handlePresenceSubscribe(current, envelope.data.payload))) {
        close(unsupportedData, "invalid message");
      }
    }
  };

  const handle = async (raw: string): Promise<void> => {
    if (closed) {
      return;
    }
    if (client === null) {
      await authenticate(raw);
      return;
    }
    await route(client, raw);
  };

  const enqueue = (task: () => Promise<void>): void => {
    queue = queue.then(task).catch((error: unknown) => {
      log.warn({ err: loggableError(error) }, "websocket message failed");
    });
  };

  socket.on("message", (data: RawMessage, isBinary: boolean) => {
    if (isBinary) {
      close(unsupportedData, "binary not supported");
      return;
    }
    const raw = messageText(data);
    enqueue(() => handle(raw));
  });

  socket.on("error", () => {
    close(policyViolation, "socket error");
  });

  socket.on("close", () => {
    closed = true;
    clearTimeout(authTimer);
    enqueue(async () => {
      const current = client;
      client = null;
      if (current === null) {
        return;
      }
      unregisterClient(current);
      await markDisconnected(current.userId);
    });
  });

  return {
    onPong: () => {
      const current = client;
      if (current !== null) {
        markHeartbeat(current.userId).catch(() => undefined);
      }
    },
    onTick: () => {
      const current = client;
      if (current === null) {
        return;
      }
      isSessionRevoked(current.sessionId)
        .then((revoked) => {
          if (revoked) {
            close(policyViolation, "session revoked");
          }
        })
        .catch(() => undefined);
    }
  };
};
