import { wsEnvelopeSchema, wsFriendEventPayloadSchema, wsPresenceUpdatePayloadSchema } from "@koda/shared/ws";
import { useFriendsStore } from "../store/friends.js";
import { usePresenceStore } from "../store/presence.js";

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

export const handleServerMessage = (raw: string): void => {
  const envelope = wsEnvelopeSchema.safeParse(parseJson(raw));
  if (!envelope.success) {
    return;
  }
  const { type, payload } = envelope.data;
  switch (type) {
    case "presence:update": {
      const update = wsPresenceUpdatePayloadSchema.safeParse(payload);
      if (update.success) {
        usePresenceStore.getState().apply(update.data);
      }
      return;
    }
    case "friends:request_received": {
      const event = wsFriendEventPayloadSchema.safeParse(payload);
      if (event.success) {
        useFriendsStore.getState().requestReceived(event.data.user);
      }
      return;
    }
    case "friends:request_cancelled": {
      const event = wsFriendEventPayloadSchema.safeParse(payload);
      if (event.success) {
        useFriendsStore.getState().requestCancelled(event.data.user);
      }
      return;
    }
    case "friends:accepted": {
      const event = wsFriendEventPayloadSchema.safeParse(payload);
      if (event.success) {
        useFriendsStore.getState().accepted(event.data.user);
      }
      return;
    }
    case "friends:removed": {
      const event = wsFriendEventPayloadSchema.safeParse(payload);
      if (event.success) {
        useFriendsStore.getState().removed(event.data.user);
      }
      return;
    }
    default:
      return;
  }
};
