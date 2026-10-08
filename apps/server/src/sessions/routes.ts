import { sessionParamsSchema } from "@koda/shared/sessions";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { clearRefreshCookie } from "../lib/cookies.js";
import { validateInput } from "../lib/errors.js";
import { authGuard, cookieRouteGuard, requireSessionId, requireUserId } from "../lib/guards.js";
import { listSessions, revokeOwnSession } from "./service.js";

const readSessions = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const list = await listSessions(requireUserId(request), requireSessionId(request));
  await reply.send({ data: list });
};

const deleteSession = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const currentSessionId = requireSessionId(request);
  const params = validateInput(sessionParamsSchema, request.params);
  await revokeOwnSession(userId, params.sessionId);
  if (params.sessionId === currentSessionId) {
    clearRefreshCookie(reply);
  }
  await reply.send({ data: null });
};

export const registerSessionRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/sessions", { preHandler: authGuard }, readSessions);
  app.delete("/sessions/:sessionId", { preHandler: [cookieRouteGuard, authGuard] }, deleteSession);
};
