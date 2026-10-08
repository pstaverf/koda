import { targetUserInput } from "@koda/shared/friends";
import { publicIdParamsSchema } from "@koda/shared/profile";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateInput } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import { blockUser, listBlocks, unblockUser } from "./service.js";

const readBlocks = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const overview = await listBlocks(requireUserId(request));
  await reply.send({ data: overview });
};

const createBlock = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(targetUserInput, request.body);
  await blockUser(userId, input.publicId);
  await reply.send({ data: null });
};

const deleteBlock = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  await unblockUser(userId, params.publicId);
  await reply.send({ data: null });
};

export const registerBlockRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/blocks", { preHandler: authGuard }, readBlocks);
  app.post("/blocks", { preHandler: authGuard }, createBlock);
  app.delete("/blocks/:publicId", { preHandler: authGuard }, deleteBlock);
};
