import type { WsServerEvent } from "@koda/shared/ws";
import type { WsClient } from "./hub.js";
import { sendPresence } from "./presence.js";

export const handleUserEvent = async (client: WsClient, event: WsServerEvent): Promise<void> => {
  if (event.type !== "friends:accepted" && event.type !== "friends:removed") {
    return;
  }
  const friendId = event.payload.user.id;
  if (client.subscriptions.has(friendId)) {
    await sendPresence(client, [friendId]);
  }
};
