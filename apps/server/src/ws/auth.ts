import { wsAuthPayloadSchema, wsEnvelopeSchema } from "@koda/shared/ws";
import { findActiveUser, isSessionRevoked } from "../auth/session.js";
import { verifyAccessToken } from "../lib/tokens.js";

export type WsIdentity = {
  userId: string;
  sessionId: string;
  timeZone: string;
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const authenticateMessage = async (raw: string): Promise<WsIdentity | null> => {
  const envelope = wsEnvelopeSchema.safeParse(parseJson(raw));
  if (!envelope.success || envelope.data.type !== "auth") {
    return null;
  }
  const payload = wsAuthPayloadSchema.safeParse(envelope.data.payload);
  if (!payload.success) {
    return null;
  }
  const claims = await verifyAccessToken(payload.data.accessToken);
  if (claims === null || (await isSessionRevoked(claims.sessionId))) {
    return null;
  }
  const user = await findActiveUser(claims.userId);
  if (user === null || user.displayName === null) {
    return null;
  }
  return { userId: claims.userId, sessionId: claims.sessionId, timeZone: payload.data.timezone };
};
