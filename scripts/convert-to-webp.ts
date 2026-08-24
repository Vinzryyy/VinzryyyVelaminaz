/**
 * Converts all PNG/JPG images in public/gallery/ to WebP.
 * - Creates .webp versions alongside originals
 * - Optionally deletes originals with --replace flag
 * - Preserves quality at 85% (good balance for photography)
 *
 * Usage:
 *   npx tsx scripts/convert-to-webp.ts          # create .webp copies
 *   npx tsx scripts/convert-to-webp.ts --replace # convert and delete originals
 *   npx tsx scripts/convert-to-webp.ts --dry-run # preview what would happen
 */

import sharp from "sharp";
import { readdir, stat, unlink } from "fs/promises";
import { resolve, extname, basename, join } from "path";

const GALLERY_DIR = resolve(import.meta.dirname, "../public/gallery");
const QUALITY = 85;
const MAX_DIMENSION = 1920;
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
/** WebP files larger than this are re-compressed with resize */
const WEBP_SIZE_THRESHOLD = 500 * 1024; // 500 KB

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const dryRun = args.includes("--dry-run");

async function findImages(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findImages(fullPath));
    } else if (EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

async function findOversizedWebp(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findOversizedWebp(fullPath));
    } else if (extname(entry.name).toLowerCase() === ".webp") {
      const s = await stat(fullPath);
      if (s.size > WEBP_SIZE_THRESHOLD) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

async function main() {
  const images = await findImages(GALLERY_DIR);
  console.log(`Found ${images.length} images to convert\n`);

  let totalOriginal = 0;
  let totalWebp = 0;
  let converted = 0;
  let skipped = 0;

  for (const imgPath of images) {
    const ext = extname(imgPath);
    const webpPath = imgPath.slice(0, -ext.length) + ".webp";
    const name = imgPath.replace(GALLERY_DIR, "");

    // Check if webp already exists
    try {
      await stat(webpPath);
      console.log(`  SKIP ${name} (webp exists)`);
      skipped++;
      continue;
    } catch { /* doesn't exist, proceed */ }

    const originalStat = await stat(imgPath);
    const originalSize = originalStat.size;
    totalOriginal += originalSize;

    if (dryRun) {
      console.log(`  WOULD convert ${name} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);
      converted++;
      continue;
    }

    try {
      const result = await sharp(imgPath)
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(webpPath);

      const webpSize = result.size;
      totalWebp += webpSize;
      const savings = ((1 - webpSize / originalSize) * 100).toFixed(1);

      console.log(
        `  ✓ ${name} → ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(webpSize / 1024 / 1024).toFixed(2)} MB (${savings}% smaller)`
      );

      if (replace) {
        await unlink(imgPath);
        console.log(`    deleted original`);
      }

      converted++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err}`);
    }
  }

  // Re-compress oversized WebP files
  const oversized = await findOversizedWebp(GALLERY_DIR);
  if (oversized.length > 0) {
    console.log(`\nFound ${oversized.length} oversized WebP files (>${(WEBP_SIZE_THRESHOLD / 1024).toFixed(0)} KB) to re-compress\n`);
    for (const webpPath of oversized) {
      const name = webpPath.replace(GALLERY_DIR, "");
      const originalStat = await stat(webpPath);
      const originalSize = originalStat.size;

      if (dryRun) {
        console.log(`  WOULD re-compress ${name} (${(originalSize / 1024 / 1024).toFixed(2)} MB)`);
        continue;
      }

      try {
        const tmpPath = webpPath + ".tmp";
        const result = await sharp(webpPath)
          .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(tmpPath);

        if (result.size < originalSize) {
          const { rename } = await import("fs/promises");
          await rename(tmpPath, webpPath);
          const savings = ((1 - result.size / originalSize) * 100).toFixed(1);
          console.log(
            `  ✓ ${name} → ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(result.size / 1024 / 1024).toFixed(2)} MB (${savings}% smaller)`
          );
          totalOriginal += originalSize;
          totalWebp += result.size;
        } else {
          await unlink(tmpPath);
          console.log(`  SKIP ${name} (already optimal)`);
        }
      } catch (err) {
        console.error(`  ✗ ${name}: ${err}`);
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Converted: ${converted}  Skipped: ${skipped}`);
  if (!dryRun && (converted > 0 || oversized.length > 0)) {
    console.log(`Original total:  ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`WebP total:      ${(totalWebp / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved:           ${((totalOriginal - totalWebp) / 1024 / 1024).toFixed(2)} MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(1)}%)`);
  }
}

main().catch(console.error);
