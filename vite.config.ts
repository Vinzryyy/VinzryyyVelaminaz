import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
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

/** Dev-only API: saves uploaded WebP images to public/gallery/ */
function localUploadPlugin() {
  const galleryDir = resolve(__dirname, "public/gallery");
  return {
    name: "local-gallery-upload",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/upload", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString());

        const { base64, folder, name } = body as { base64: string; folder: string; name: string };
        if (!base64 || !folder || !name) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Missing base64, folder, or name" }));
          return;
        }

        // Sanitize folder — only allow gallery subdirectories
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeFolder = folder.replace(/\.\./g, "").replace(/[^a-zA-Z0-9_/-]/g, "_");
        const dir = join(galleryDir, safeFolder);
        if (!dir.startsWith(galleryDir)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid folder" }));
          return;
        }

        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        const filePath = join(dir, `${safeName}.webp`);
        const buffer = Buffer.from(base64, "base64");
        writeFileSync(filePath, buffer);

        const publicPath = `/gallery/${safeFolder}/${safeName}.webp`;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ url: publicPath, size: buffer.length }));
      });
    },
  };
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react(), tailwindcss(), swBuildIdPlugin(), localUploadPlugin()],
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
