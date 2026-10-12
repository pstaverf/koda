import type { WsPresenceUpdatePayload } from "@koda/shared/ws";
import { create } from "zustand";
import { onSignOut } from "../api/http.js";

export type PresenceEntry = {
  status: WsPresenceUpdatePayload["status"];
  lastSeenText: string | null;
};

type PresenceState = {
  byUserId: Record<string, PresenceEntry>;
  apply: (update: WsPresenceUpdatePayload) => void;
  clear: () => void;
};

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  byUserId: {},
  apply: (update) =>
    set({
      byUserId: {
        ...get().byUserId,
        [update.userId]: { status: update.status, lastSeenText: update.lastSeenText ?? null }
      }
    }),
  clear: () => set({ byUserId: {} })
}));

onSignOut(() => {
  usePresenceStore.getState().clear();
});
