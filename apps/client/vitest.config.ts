import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  envDir: "../..",
  resolve: {
    conditions: ["development", "browser", "module", "import", "default"]
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    passWithNoTests: true,
    css: false,
    restoreMocks: true
  }
});
