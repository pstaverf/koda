import { updatePrivacyInput } from "@koda/shared/privacy";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateInput } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import { getPrivacy, updatePrivacy } from "./service.js";

const readPrivacy = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const settings = await getPrivacy(requireUserId(request));
  await reply.send({ data: settings });
};

const patchPrivacy = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(updatePrivacyInput, request.body);
  const settings = await updatePrivacy(userId, input);
  await reply.send({ data: settings });
};

export const registerPrivacyRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/privacy", { preHandler: authGuard }, readPrivacy);
  app.patch("/privacy", { preHandler: authGuard }, patchPrivacy);
};
