import { TIMEZONE_HEADER, isValidTimeZone } from "@koda/shared/constants";
import { publicIdParamsSchema, updateProfileInput } from "@koda/shared/profile";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, validateInput } from "../lib/errors.js";
import { authGuard, requireUserId } from "../lib/guards.js";
import { consumeLimit } from "../lib/rateLimit.js";
import { getOwnProfile, getProfileView, updateOwnProfile } from "./service.js";

const userLookupLimit = 60;
const userLookupWindowSeconds = 60;

const viewerTimeZone = (request: FastifyRequest): string => {
  const value = request.headers[TIMEZONE_HEADER.toLowerCase()];
  return typeof value === "string" && isValidTimeZone(value) ? value : "UTC";
};

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
  if (!(await consumeLimit(`rl:user_lookup:${viewerId}`, userLookupLimit, userLookupWindowSeconds))) {
    throw new AppError("RATE_LIMITED");
  }
  const params = validateInput(publicIdParamsSchema, request.params);
  const view = await getProfileView(viewerId, params.publicId, viewerTimeZone(request));
  await reply.send({ data: view });
};

export const registerProfileRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/profile", { preHandler: authGuard }, readProfile);
  app.patch("/profile", { preHandler: authGuard }, patchProfile);
  app.get("/users/:publicId", { preHandler: authGuard }, readUser);
};
