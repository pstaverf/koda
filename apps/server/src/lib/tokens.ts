import { REFRESH_TOKEN_BYTES } from "@koda/shared/constants";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.js";
import { randomToken } from "./hash.js";

const accessTokenSecret = new TextEncoder().encode(env.accessTokenSecret);

export const createAccessToken = (userId: string): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.accessTokenTtlSeconds}s`)
    .sign(accessTokenSecret);

export const verifyAccessToken = async (token: string): Promise<string | null> => {
  try {
    const { payload } = await jwtVerify(token, accessTokenSecret, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
};

export const createRefreshToken = (): string => randomToken(REFRESH_TOKEN_BYTES);
