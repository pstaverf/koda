import type { WsServerEvent } from "@koda/shared/ws";

export type PublishToUser = (userId: string, event: WsServerEvent) => void;

export const publishToUser: PublishToUser = () => undefined;
