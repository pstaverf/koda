import { REFRESH_TOKEN_BYTES } from "@koda/shared/constants";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";
import { randomToken } from "./hash.js";

const accessTokenSecret = new TextEncoder().encode(env.accessTokenSecret);

export type AccessClaims = {
  userId: string;
  sessionId: string;
};

export const createAccessToken = (userId: string, sessionId: string): Promise<string> =>
  new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.accessTokenTtlSeconds}s`)
    .sign(accessTokenSecret);

export const verifyAccessToken = async (token: string): Promise<AccessClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, accessTokenSecret, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
};

export const createRefreshToken = (): string => randomToken(REFRESH_TOKEN_BYTES);
