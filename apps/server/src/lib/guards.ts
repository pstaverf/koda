import { CLIENT_HEADER } from "@koda/shared/constants";
import type { FastifyRequest } from "fastify";
import { isSessionRevoked } from "../auth/session.js";
import { env } from "../env.js";
import { AppError } from "./errors.js";
import { verifyAccessToken } from "./tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    sessionId?: string;
  }
}

const bearerToken = (header: string | undefined): string | null => {
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
};

export const assertClient = (request: FastifyRequest): void => {
  const value = request.headers[CLIENT_HEADER.toLowerCase()];
  if (typeof value !== "string" || !env.allowedClients.includes(value)) {
    throw new AppError("INVALID_CLIENT");
  }
};

export const assertOrigin = (request: FastifyRequest): void => {
  const origin = request.headers.origin;
  if (typeof origin !== "string" || !env.allowedOrigins.includes(origin)) {
    throw new AppError("INVALID_ORIGIN");
  }
};

export const requireUserId = (request: FastifyRequest): string => {
  const userId = request.userId;
  if (userId === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  return userId;
};

export const requireSessionId = (request: FastifyRequest): string => {
  const sessionId = request.sessionId;
  if (sessionId === undefined) {
    throw new AppError("UNAUTHORIZED");
  }
  return sessionId;
};

export const apiGuard = async (request: FastifyRequest): Promise<void> => {
  assertClient(request);
};

export const cookieRouteGuard = async (request: FastifyRequest): Promise<void> => {
  assertClient(request);
  assertOrigin(request);
};

export const authGuard = async (request: FastifyRequest): Promise<void> => {
  assertClient(request);
  const token = bearerToken(request.headers.authorization);
  const claims = token === null ? null : await verifyAccessToken(token);
  if (claims === null || (await isSessionRevoked(claims.sessionId))) {
    throw new AppError("UNAUTHORIZED");
  }
  request.userId = claims.userId;
  request.sessionId = claims.sessionId;
};
