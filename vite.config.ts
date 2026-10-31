import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const soundtrack = fileURLToPath(new URL("./public/audio/soundtrack.mp3", import.meta.url));

// BASE_PATH is only needed when serving from a sub-path. The production site is a GitHub user site
// (if hosted as a user site), served from the root, so it is normally unset.
// __HAS_AUDIO__ is decided at build/dev-start time so a missing soundtrack never causes a 404 probe.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  define: {
    __HAS_AUDIO__: JSON.stringify(existsSync(soundtrack)),
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
