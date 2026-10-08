import { targetUserInput } from "@koda/shared/friends";
import { publicIdParamsSchema } from "@koda/shared/profile";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateInput } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  removeFriend,
  sendFriendRequest
} from "./service.js";

const readFriends = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const overview = await listFriends(requireUserId(request));
  await reply.send({ data: overview });
};

const createRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(targetUserInput, request.body);
  const result = await sendFriendRequest(userId, input.publicId);
  await reply.send({ data: result });
};

const cancelRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  await cancelFriendRequest(userId, params.publicId);
  await reply.send({ data: null });
};

const acceptRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  const result = await acceptFriendRequest(userId, params.publicId);
  await reply.send({ data: result });
};

const declineRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  await declineFriendRequest(userId, params.publicId);
  await reply.send({ data: null });
};

const deleteFriend = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  await removeFriend(userId, params.publicId);
  await reply.send({ data: null });
};

export const registerFriendRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/friends", { preHandler: authGuard }, readFriends);
  app.post("/friends/requests", { preHandler: authGuard }, createRequest);
  app.delete("/friends/requests/:publicId", { preHandler: authGuard }, cancelRequest);
  app.post("/friends/requests/:publicId/accept", { preHandler: authGuard }, acceptRequest);
  app.post("/friends/requests/:publicId/decline", { preHandler: authGuard }, declineRequest);
  app.delete("/friends/:publicId", { preHandler: authGuard }, deleteFriend);
};
