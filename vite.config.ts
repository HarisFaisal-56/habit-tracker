import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app shows its own "update available" prompt (src/app/UpdatePrompt.tsx)
      // and registers the service worker itself.
      registerType: "prompt",
      injectRegister: false,
      // workbox.globPatterns below already precaches every icon; the plugin adds the manifest.
      includeManifestIcons: false,
      manifest: {
        name: "Habit Tracker",
        short_name: "Habits",
        description: "A calm, offline-first habit tracker. Your data stays on your device.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fafaf9",
        theme_color: "#fafaf9",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the whole app so it works fully offline after the first visit.
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
