import { changeEmailInput, changePasswordInput, confirmEmailInput, deleteAccountInput } from "@koda/shared/auth";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { presentCurrentUser } from "../auth/session.js";
import { clearRefreshCookie } from "../lib/cookies.js";
import { validateInput } from "../lib/errors.js";
import { authGuard, requireSessionId, requireUserId } from "../lib/guards.js";
import { changePassword, confirmEmailChange, deleteAccount, requestEmailChange } from "./service.js";

const postPassword = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const sessionId = requireSessionId(request);
  const input = validateInput(changePasswordInput, request.body);
  await changePassword(userId, sessionId, input);
  await reply.send({ data: null });
};

const postEmailRequest = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(changeEmailInput, request.body);
  await requestEmailChange(userId, input.email, request.ip);
  await reply.send({ data: null });
};

const postEmailConfirm = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(confirmEmailInput, request.body);
  const user = await confirmEmailChange(userId, input);
  await reply.send({ data: await presentCurrentUser(user) });
};

const removeAccount = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const userId = requireUserId(request);
  const input = validateInput(deleteAccountInput, request.body);
  await deleteAccount(userId, input);
  clearRefreshCookie(reply);
  await reply.send({ data: null });
};

export const registerAccountRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/account/password", { preHandler: authGuard }, postPassword);
  app.post("/account/email/request", { preHandler: authGuard }, postEmailRequest);
  app.post("/account/email/confirm", { preHandler: authGuard }, postEmailConfirm);
  app.delete("/account", { preHandler: authGuard }, removeAccount);
};
