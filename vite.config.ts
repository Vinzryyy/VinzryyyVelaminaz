import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BUILD_ID = Date.now().toString(36);

/** Stamps %%BUILD_ID%% in public/sw.js after build so the SW cache busts on each deploy. */
function swBuildIdPlugin() {
  return {
    name: "sw-build-id",
    closeBundle() {
      const swPath = resolve(__dirname, "dist/sw.js");
      try {
        const src = readFileSync(swPath, "utf-8");
        writeFileSync(swPath, src.replace("%%BUILD_ID%%", BUILD_ID));
      } catch { /* sw.js may not exist in dev */ }
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react(), tailwindcss(), swBuildIdPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: false,
  },
});
