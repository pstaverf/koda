import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { restoreSession } from "./api/http.js";
import { BackgroundGlow } from "./components/BackgroundGlow.js";
import { GlassDefs } from "./components/GlassDefs.js";
import { Toasts } from "./components/Toasts.js";
import { queryClient } from "./lib/queryClient.js";
import { router } from "./router.js";
import { applyAppearance, useAppearanceStore } from "./store/appearance.js";

export const App = () => {
  const transparency = useAppearanceStore((state) => state.transparency);
  const motion = useAppearanceStore((state) => state.motion);

  useEffect(() => {
    applyAppearance(transparency, motion);
  }, [transparency, motion]);

  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GlassDefs />
      <BackgroundGlow />
      <RouterProvider router={router} />
      <Toasts />
    </QueryClientProvider>
  );
};
