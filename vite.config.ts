import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Libraries change less often than app code, so they get their own cacheable chunks.
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: "dexie", test: /[\\/]node_modules[\\/](dexie|dexie-react-hooks)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    // A zone with daylight saving time, so date tests exercise DST transitions.
    env: { TZ: "America/New_York" },
    setupFiles: ["./src/test/setup.ts"],
    // Rendering IndexedDB-backed screens can be slow on a busy machine.
    testTimeout: 15_000,
    projects: [
      {
        // Pure logic (*.test.ts) needs no DOM, which keeps it fast.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
        },
      },
      {
        // Component and screen tests (*.test.tsx).
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx", "tests/**/*.test.tsx"],
        },
      },
    ],
  },
});
