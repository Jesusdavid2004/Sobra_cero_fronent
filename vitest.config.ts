import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.ts", "theme/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
