import { WS_PATH, WS_RECONNECT_MAX_MS, WS_RECONNECT_MIN_MS } from "@koda/shared/constants";
import type { WsClientMessage, WsPresenceSubscribePayload } from "@koda/shared/ws";
import { onSignOut, refreshSession, signOutLocally } from "../api/http.js";
import { getTimeZone } from "../lib/timezone.js";
import { useSessionStore } from "../store/session.js";
import { handleServerMessage } from "./handlers.js";
import { useWsStore } from "./store.js";

const policyViolationCode = 1008;
const normalClosureCode = 1000;
const jitterMin = 0.8;
const jitterSpan = 0.4;

type Timer = ReturnType<typeof setTimeout>;

let socket: WebSocket | null = null;
let started = false;
let attempt = 0;
let reconnectTimer: Timer | null = null;
let stableTimer: Timer | null = null;

const clearTimer = (timer: Timer | null): null => {
  if (timer !== null) {
    clearTimeout(timer);
  }
  return null;
};

const socketUrl = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${WS_PATH}`;
};

const send = (ws: WebSocket, message: WsClientMessage): void => {
  ws.send(JSON.stringify(message));
};

const sendWatchList = (ws: WebSocket): void => {
  const payload: WsPresenceSubscribePayload = { userIds: [...useWsStore.getState().watchedUserIds] };
  send(ws, { type: "presence:subscribe", payload });
};

const nextDelay = (): number => {
  const base = Math.min(WS_RECONNECT_MAX_MS, WS_RECONNECT_MIN_MS * 2 ** attempt);
  const jittered = base * (jitterMin + Math.random() * jitterSpan);
  return Math.min(WS_RECONNECT_MAX_MS, Math.max(WS_RECONNECT_MIN_MS, jittered));
};

const scheduleReconnect = (): void => {
  if (!started || socket !== null || reconnectTimer !== null) {
    return;
  }
  const delay = nextDelay();
  attempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, delay);
};

const recover = async (): Promise<void> => {
  const restored = await refreshSession();
  if (!restored) {
    signOutLocally(true);
    return;
  }
  scheduleReconnect();
};

const open = (): void => {
  const session = useSessionStore.getState();
  const token = session.accessToken;
  if (!started || socket !== null || token === null || session.status !== "authenticated") {
    return;
  }
  const ws = new WebSocket(socketUrl());
  socket = ws;
  useWsStore.getState().setStatus("connecting");

  ws.addEventListener("open", () => {
    send(ws, { type: "auth", payload: { accessToken: token, timezone: getTimeZone() } });
    sendWatchList(ws);
    useWsStore.getState().setStatus("open");
    stableTimer = clearTimer(stableTimer);
    stableTimer = setTimeout(() => {
      stableTimer = null;
      attempt = 0;
    }, WS_RECONNECT_MAX_MS);
  });

  ws.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (typeof event.data === "string") {
      handleServerMessage(event.data);
    }
  });

  ws.addEventListener("close", (event: CloseEvent) => {
    if (socket === ws) {
      socket = null;
    }
    stableTimer = clearTimer(stableTimer);
    useWsStore.getState().setStatus("closed");
    if (!started) {
      return;
    }
    if (event.code === policyViolationCode) {
      void recover();
      return;
    }
    scheduleReconnect();
  });
};

const stop = (): void => {
  started = false;
  attempt = 0;
  reconnectTimer = clearTimer(reconnectTimer);
  stableTimer = clearTimer(stableTimer);
  const current = socket;
  socket = null;
  if (current !== null) {
    current.close(normalClosureCode, "stopped");
  }
  useWsStore.getState().watch([]);
  useWsStore.getState().setStatus("idle");
};

export const startRealtime = (): void => {
  if (started) {
    return;
  }
  started = true;
  attempt = 0;
  open();
};

export const stopRealtime = (): void => {
  stop();
};

useWsStore.subscribe((state, previous) => {
  if (state.watchedUserIds === previous.watchedUserIds) {
    return;
  }
  const current = socket;
  if (current !== null && current.readyState === WebSocket.OPEN) {
    sendWatchList(current);
  }
});

onSignOut(() => {
  stop();
});
