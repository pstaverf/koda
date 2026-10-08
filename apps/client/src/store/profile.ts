import type { PublicUser, ProfileView } from "@koda/shared/profile";
import { create } from "zustand";
import { onSignOut } from "../api/http.js";

type ProfileState = {
  viewed: Record<string, ProfileView>;
  setViewed: (view: ProfileView) => void;
  patchViewed: (user: PublicUser) => void;
  clear: () => void;
};

export const useProfileStore = create<ProfileState>()((set, get) => ({
  viewed: {},
  setViewed: (view) =>
    set({ viewed: { ...get().viewed, [view.user.publicId]: view } }),
  patchViewed: (user) => {
    const current = get().viewed[user.publicId];
    if (current === undefined) {
      return;
    }
    set({ viewed: { ...get().viewed, [user.publicId]: { ...current, user } } });
  },
  clear: () => set({ viewed: {} })
}));

onSignOut(() => {
  useProfileStore.getState().clear();
});
