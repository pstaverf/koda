import { z } from "zod";
import { isValidTimeZone, WS_SUBSCRIBE_MAX_USERS } from "./constants.js";
import { presenceStatusSchema } from "./profile.js";

export const wsClientMessageTypes = ["auth", "presence:subscribe"] as const;

export const wsServerEventTypes = [
  "presence:update",
  "friends:request_received",
  "friends:request_cancelled",
  "friends:accepted",
  "friends:removed"
] as const;

export const wsEnvelopeSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  id: z.string().min(1).optional()
});

export const wsAuthPayloadSchema = z.object({
  accessToken: z.string().min(1),
  timezone: z.string().min(1).max(64).refine(isValidTimeZone, { error: "VALIDATION_FAILED" })
});
export type WsAuthPayload = z.infer<typeof wsAuthPayloadSchema>;

export const wsPresenceSubscribePayloadSchema = z.object({
  userIds: z.array(z.uuid()).max(WS_SUBSCRIBE_MAX_USERS)
});
export type WsPresenceSubscribePayload = z.infer<typeof wsPresenceSubscribePayloadSchema>;

export const wsPresenceUpdatePayloadSchema = z.object({
  userId: z.uuid(),
  status: presenceStatusSchema,
  lastSeenText: z.string().optional()
});
export type WsPresenceUpdatePayload = z.infer<typeof wsPresenceUpdatePayloadSchema>;

export const wsFriendEventPayloadSchema = z.object({
  userId: z.uuid(),
  publicId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable()
});
export type WsFriendEventPayload = z.infer<typeof wsFriendEventPayloadSchema>;

export type WsEnvelope<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
  id?: string;
};

export type WsClientMessage =
  | WsEnvelope<"auth", WsAuthPayload>
  | WsEnvelope<"presence:subscribe", WsPresenceSubscribePayload>;

export type WsServerEvent =
  | WsEnvelope<"presence:update", WsPresenceUpdatePayload>
  | WsEnvelope<"friends:request_received", WsFriendEventPayload>
  | WsEnvelope<"friends:request_cancelled", WsFriendEventPayload>
  | WsEnvelope<"friends:accepted", WsFriendEventPayload>
  | WsEnvelope<"friends:removed", WsFriendEventPayload>;
