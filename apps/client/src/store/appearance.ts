import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppearancePreference = "system" | "on" | "off";

type AppearanceState = {
  transparency: AppearancePreference;
  motion: AppearancePreference;
  setTransparency: (value: AppearancePreference) => void;
  setMotion: (value: AppearancePreference) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      transparency: "system",
      motion: "system",
      setTransparency: (transparency) => set({ transparency }),
      setMotion: (motion) => set({ motion })
    }),
    {
      name: "koda-appearance",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ transparency: state.transparency, motion: state.motion })
    }
  )
);

const mediaMatches = (query: string): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia(query).matches;

export const applyAppearance = (transparency: AppearancePreference, motion: AppearancePreference): void => {
  const root = document.documentElement;
  const reducedTransparency =
    transparency === "on" || (transparency === "system" && mediaMatches("(prefers-reduced-transparency: reduce)"));
  const reducedMotion = motion === "on" || (motion === "system" && mediaMatches("(prefers-reduced-motion: reduce)"));
  root.dataset["reducedTransparency"] = reducedTransparency ? "true" : "false";
  root.dataset["reducedMotion"] = reducedMotion ? "true" : "false";
};
