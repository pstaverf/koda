import type { CurrentUser } from "@koda/shared/profile";
import { create } from "zustand";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionState = {
  status: SessionStatus;
  accessToken: string | null;
  user: CurrentUser | null;
  setSession: (accessToken: string, user: CurrentUser) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: CurrentUser) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  status: "loading",
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: "authenticated", accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ status: "anonymous", accessToken: null, user: null })
}));
