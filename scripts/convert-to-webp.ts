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
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

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

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Converted: ${converted}  Skipped: ${skipped}`);
  if (!dryRun && converted > 0) {
    console.log(`Original total:  ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`WebP total:      ${(totalWebp / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved:           ${((totalOriginal - totalWebp) / 1024 / 1024).toFixed(2)} MB (${((1 - totalWebp / totalOriginal) * 100).toFixed(1)}%)`);
  }
}

main().catch(console.error);
