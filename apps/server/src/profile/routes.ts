import { publicIdParamsSchema, updateProfileInput } from "@koda/shared/profile";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateInput } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import { getOwnProfile, getProfileView, updateOwnProfile } from "./service.js";

const readProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const user = await getOwnProfile(requireUserId(request));
  await reply.send({ data: user });
};

const patchProfile = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(updateProfileInput, request.body);
  const user = await updateOwnProfile(userId, input);
  await reply.send({ data: user });
};

const readUser = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const viewerId = requireUserId(request);
  const params = validateInput(publicIdParamsSchema, request.params);
  const view = await getProfileView(viewerId, params.publicId);
  await reply.send({ data: view });
};

export const registerProfileRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/profile", { preHandler: authGuard }, readProfile);
  app.patch("/profile", { preHandler: authGuard }, patchProfile);
  app.get("/users/:publicId", { preHandler: authGuard }, readUser);
};
