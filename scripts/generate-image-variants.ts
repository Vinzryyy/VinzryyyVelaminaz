/**
 * Writes lighter copies of every gallery photo into dist/ after `vite build`:
 *
 *   public/gallery/<event>/<name>.webp  →  dist/gallery/<event>/<name>-480w.webp
 *                                                                 <name>-960w.webp
 *                                                                 <name>-1440w.webp
 *                                                                 <name>-1920w.webp
 *
 * The site lists them in srcset (src/lib/imageVariants.ts) so grids and cards
 * don't download full originals for thumbnails. Originals stay untouched for
 * the lightbox, and nothing is written to public/ or committed.
 *
 * Copies are cached in node_modules/.cache/gallery-variants by the photo's
 * content, so a rebuild only processes new or changed photos.
 *
 * Run: npx tsx scripts/generate-image-variants.ts   (part of `npm run build`)
 */

import sharp from "sharp";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { VARIANT_WIDTHS, variantPath } from "../src/lib/imageVariants.ts";

const ROOT = resolve(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");
const CACHE = join(ROOT, "node_modules", ".cache", "gallery-variants");
/** Visually identical to the originals at these sizes, at a fraction of the bytes. */
const QUALITY = 80;
const IMAGE = /\.(webp|jpe?g|png)$/i;

async function listImages(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const path = join(dir, e.name);
      if (e.isDirectory()) return listImages(path);
      return IMAGE.test(e.name) ? [path] : [];
    }),
  );
  return nested.flat();
}

let made = 0;
let reused = 0;
let failed = 0;
const usedCacheFiles = new Set<string>();

async function writeVariants(file: string) {
  const src = "/" + relative(PUBLIC, file).split(sep).join("/"); // "/gallery/<event>/<name>.webp"
  const input = await readFile(file);
  const hash = createHash("sha1").update(input).digest("hex");

  for (const width of VARIANT_WIDTHS) {
    const out = join(DIST, ...variantPath(src, width).split("/"));
    const cached = join(CACHE, `${hash}-${width}.webp`);
    usedCacheFiles.add(cached);
    await mkdir(dirname(out), { recursive: true });

    if (existsSync(cached)) {
      reused++;
    } else {
      try {
        const copy = await sharp(input)
          .autoOrient()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer();
        // Write-then-rename, so two identical photos processed at once never read a half-written file.
        const tmp = `${cached}.${process.pid}-${made}-${Math.random().toString(36).slice(2)}.tmp`;
        // A copy that isn't resized could come out bigger than an efficiently saved original.
        await writeFile(tmp, copy.length < input.length ? copy : input);
        await rename(tmp, cached);
        made++;
      } catch (err) {
        // Never leave a srcset entry pointing at a missing file: serve the original under that name.
        console.warn(`  ! ${src}: ${(err as Error).message} (using the original as its ${width}w copy)`);
        await writeFile(out, input);
        failed++;
        continue;
      }
    }
    await copyFile(cached, out);
  }
}

async function main() {
  const started = Date.now();
  const files = await listImages(join(PUBLIC, "gallery"));
  await mkdir(CACHE, { recursive: true });

  // A few photos at a time; sharp already spreads each one over several threads.
  const queue = [...files];
  const workers = Array.from({ length: Math.min(8, availableParallelism()) }, async () => {
    for (let file = queue.shift(); file; file = queue.shift()) await writeVariants(file);
  });
  await Promise.all(workers);

  // Drop cached copies of photos that were deleted or replaced.
  for (const name of await readdir(CACHE)) {
    const path = join(CACHE, name);
    if (!usedCacheFiles.has(path)) await rm(path);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `gallery variants: ${files.length} photos → ${made} new + ${reused} cached copies` +
      `${failed ? `, ${failed} fell back to the original` : ""} (${seconds}s)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
