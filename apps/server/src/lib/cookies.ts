import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REGISTRATION_COOKIE_NAME,
  REGISTRATION_COOKIE_PATH,
  REGISTRATION_TTL_SECONDS
} from "@koda/shared/constants";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

const refreshOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "strict" as const,
  path: REFRESH_COOKIE_PATH
};

const registrationOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "strict" as const,
  path: REGISTRATION_COOKIE_PATH
};

export const setRefreshCookie = (reply: FastifyReply, token: string, maxAgeSeconds: number): void => {
  reply.setCookie(REFRESH_COOKIE_NAME, token, { ...refreshOptions, maxAge: maxAgeSeconds });
};

export const clearRefreshCookie = (reply: FastifyReply): void => {
  reply.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
};

export const setRegistrationCookie = (reply: FastifyReply, token: string): void => {
  reply.setCookie(REGISTRATION_COOKIE_NAME, token, { ...registrationOptions, maxAge: REGISTRATION_TTL_SECONDS });
};

export const clearRegistrationCookie = (reply: FastifyReply): void => {
  reply.clearCookie(REGISTRATION_COOKIE_NAME, registrationOptions);
};

export const registrationCookie = (request: FastifyRequest): string | null => {
  const value = request.cookies[REGISTRATION_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const refreshCookie = (request: FastifyRequest): string | null => {
  const value = request.cookies[REFRESH_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
};
