import { WS_SUBSCRIBE_MAX_USERS } from "@koda/shared/constants";
import { create } from "zustand";

export type WsStatus = "idle" | "connecting" | "open" | "closed";

type WsState = {
  status: WsStatus;
  watchedUserIds: readonly string[];
  setStatus: (status: WsStatus) => void;
  watch: (userIds: readonly string[]) => void;
};

const sameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export const useWsStore = create<WsState>()((set, get) => ({
  status: "idle",
  watchedUserIds: [],
  setStatus: (status) => set({ status }),
  watch: (userIds) => {
    const next = Array.from(new Set(userIds)).slice(0, WS_SUBSCRIBE_MAX_USERS);
    if (sameIds(next, get().watchedUserIds)) {
      return;
    }
    set({ watchedUserIds: next });
  }
}));
