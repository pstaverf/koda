import { WS_PING_INTERVAL_MS, WS_PONG_TIMEOUT_MS } from "@koda/shared/constants";
import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { assertOrigin } from "../lib/guards.js";
import { createConnection } from "./connection.js";

const originGuard = async (request: FastifyRequest): Promise<void> => {
  assertOrigin(request);
};

const handleSocket = (socket: WebSocket, request: FastifyRequest): void => {
  const connection = createConnection(socket, request.log);
  let lastPongAt = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - lastPongAt > WS_PONG_TIMEOUT_MS) {
      socket.terminate();
      return;
    }
    if (socket.readyState === socket.OPEN) {
      socket.ping();
    }
    connection.onTick();
  }, WS_PING_INTERVAL_MS);
  socket.on("pong", () => {
    lastPongAt = Date.now();
    connection.onPong();
  });
  socket.on("close", () => {
    clearInterval(timer);
  });
};

export const registerWsRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/ws", { websocket: true, preValidation: originGuard }, handleSocket);
};
