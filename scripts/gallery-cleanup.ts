/**
 * Gallery Cleanup & Upload Helper
 *
 * Commands:
 *   npx tsx scripts/gallery-cleanup.ts cleanup          — delete files not referenced in events.ts
 *   npx tsx scripts/gallery-cleanup.ts cleanup --dry-run — preview what would be deleted
 *   npx tsx scripts/gallery-cleanup.ts upload <folder> <files...>  — copy files to gallery, convert to webp, add to events.ts
 *     e.g. npx tsx scripts/gallery-cleanup.ts upload quadlips-performance-day1 ~/photos/IMG_001.jpg ~/photos/IMG_002.png
 *   npx tsx scripts/gallery-cleanup.ts upload <folder> --dir <directory>  — upload all images from a directory
 *     e.g. npx tsx scripts/gallery-cleanup.ts upload quadlips-performance-day1 --dir ~/photos/batch
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

let sharp: typeof import("sharp") | undefined;
try {
  sharp = (await import("sharp")).default;
} catch {
  // sharp not available, will skip conversion
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_PATH = path.resolve(__dirname, "../src/content/events.ts");
const GALLERY_DIR = path.resolve(__dirname, "../public/gallery");
const QUALITY = 85;
const MAX_DIMENSION = 1920;
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".heic", ".tiff"]);

/* ── Helpers ─────────────────────────────────────────────────── */

function getReferencedPaths(): Set<string> {
  const content = fs.readFileSync(EVENTS_PATH, "utf-8");
  const paths = new Set<string>();
  const regex = /"src":\s*"(\/gallery\/[^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    // Convert /gallery/... to absolute path
    paths.add(path.resolve(__dirname, "../public" + match[1]));
  }
  // Also grab cover images
  const coverRegex = /"cover":\s*"(\/gallery\/[^"]+)"/g;
  while ((match = coverRegex.exec(content)) !== null) {
    paths.add(path.resolve(__dirname, "../public" + match[1]));
  }
  return paths;
}

function getAllGalleryFiles(): string[] {
  const files: string[] = [];
  if (!fs.existsSync(GALLERY_DIR)) return files;

  const entries = fs.readdirSync(GALLERY_DIR, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(GALLERY_DIR, entry.name);
    if (entry.isDirectory()) {
      const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isFile()) {
          files.push(path.join(fullPath, sub.name));
        }
      }
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/* ── Cleanup Command ─────────────────────────────────────────── */

function cleanup(dryRun: boolean) {
  const referenced = getReferencedPaths();
  const allFiles = getAllGalleryFiles();

  const orphaned = allFiles.filter((f) => !referenced.has(f));

  if (orphaned.length === 0) {
    console.log("No orphaned files found. Gallery is clean!");
    return;
  }

  console.log(`Found ${orphaned.length} orphaned file(s):\n`);

  let totalSize = 0;
  for (const file of orphaned) {
    const stat = fs.statSync(file);
    totalSize += stat.size;
    const rel = path.relative(GALLERY_DIR, file);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);

    if (dryRun) {
      console.log(`  WOULD DELETE: ${rel} (${sizeMB} MB)`);
    } else {
      fs.unlinkSync(file);
      console.log(`  DELETED: ${rel} (${sizeMB} MB)`);
    }
  }

  console.log(`\n${dryRun ? "Would free" : "Freed"}: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`${dryRun ? "Would delete" : "Deleted"}: ${orphaned.length} file(s)`);

  if (dryRun) {
    console.log("\nRun without --dry-run to actually delete.");
  }
}

/* ── Upload Command ──────────────────────────────────────────── */

async function upload(folder: string, filePaths: string[]) {
  if (!folder) {
    console.error("Error: specify a gallery folder name (e.g. quadlips-performance-day1)");
    process.exit(1);
  }
  if (filePaths.length === 0) {
    console.error("Error: no files specified. Provide file paths or use --dir <directory>");
    process.exit(1);
  }

  const destDir = path.join(GALLERY_DIR, folder);
  fs.mkdirSync(destDir, { recursive: true });

  // Read events.ts to find the event and append photos
  const eventsContent = fs.readFileSync(EVENTS_PATH, "utf-8");

  // Check the event exists
  const slugPattern = `"slug": "${folder}"`;
  if (!eventsContent.includes(slugPattern)) {
    console.error(`Error: event with slug "${folder}" not found in events.ts`);
    console.error("Available slugs:");
    const slugRegex = /"slug":\s*"([^"]+)"/g;
    let m;
    while ((m = slugRegex.exec(eventsContent)) !== null) {
      console.error(`  - ${m[1]}`);
    }
    process.exit(1);
  }

  const results: { name: string; webpPath: string; src: string }[] = [];
  let converted = 0;
  let failed = 0;

  for (const filePath of filePaths) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      console.error(`  SKIP: ${filePath} (file not found)`);
      failed++;
      continue;
    }

    const ext = path.extname(absPath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      console.error(`  SKIP: ${filePath} (unsupported format: ${ext})`);
      failed++;
      continue;
    }

    const baseName = path.basename(absPath, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const webpName = `${baseName}.webp`;
    const destPath = path.join(destDir, webpName);
    const galleryPath = `/gallery/${folder}/${webpName}`;

    // Check if already exists
    if (fs.existsSync(destPath)) {
      console.log(`  SKIP: ${webpName} (already exists)`);
      continue;
    }

    try {
      if (ext === ".webp") {
        // Already webp — just copy, optionally re-compress if large
        const stat = fs.statSync(absPath);
        if (sharp && stat.size > 500 * 1024) {
          const result = await sharp(absPath)
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(destPath);
          const savings = ((1 - result.size / stat.size) * 100).toFixed(1);
          console.log(`  OK: ${baseName}${ext} → ${webpName} (${savings}% smaller)`);
        } else {
          fs.copyFileSync(absPath, destPath);
          console.log(`  OK: ${baseName}${ext} → ${webpName} (copied)`);
        }
      } else if (sharp) {
        const stat = fs.statSync(absPath);
        const result = await sharp(absPath)
          .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(destPath);
        const savings = ((1 - result.size / stat.size) * 100).toFixed(1);
        console.log(`  OK: ${baseName}${ext} → ${webpName} (${savings}% smaller)`);
      } else {
        // No sharp — just copy the file as-is
        fs.copyFileSync(absPath, destPath);
        console.log(`  OK: ${baseName}${ext} → copied (install sharp for webp conversion)`);
      }

      results.push({ name: baseName, webpPath: destPath, src: galleryPath });
      converted++;
    } catch (err) {
      console.error(`  FAIL: ${filePath}: ${err}`);
      failed++;
    }
  }

  if (results.length === 0) {
    console.log("\nNo files uploaded.");
    return;
  }

  // Add photo entries to events.ts
  const newPhotos = results.map((r) => `      {
        "title": "${r.name}",
        "story": "",
        "src": "${r.src}",
        "lens": "",
        "aperture": "",
        "shutter": "",
        "iso": 0
      }`).join(",\n");

  // Find the last photo entry of this event's photos array and append
  let updated = eventsContent;
  // Strategy: find the photos array closing bracket for this event
  const eventIdx = updated.indexOf(slugPattern);
  const photosStart = updated.indexOf('"photos": [', eventIdx);
  if (photosStart === -1) {
    console.error("Error: could not find photos array for this event");
    return;
  }

  // Find the matching closing bracket
  let depth = 0;
  let photosEnd = -1;
  for (let i = photosStart; i < updated.length; i++) {
    if (updated[i] === "[") depth++;
    if (updated[i] === "]") {
      depth--;
      if (depth === 0) {
        photosEnd = i;
        break;
      }
    }
  }

  if (photosEnd === -1) {
    console.error("Error: could not find end of photos array");
    return;
  }

  // Find the last } before the closing ]
  const beforeClose = updated.lastIndexOf("}", photosEnd);
  if (beforeClose > photosStart) {
    // Insert after the last photo entry
    updated = updated.slice(0, beforeClose + 1) + ",\n" + newPhotos + updated.slice(beforeClose + 1);
  } else {
    // Empty photos array — insert directly
    updated = updated.slice(0, photosEnd) + "\n" + newPhotos + "\n    " + updated.slice(photosEnd);
  }

  fs.writeFileSync(EVENTS_PATH, updated, "utf-8");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Uploaded: ${converted}  Failed: ${failed}`);
  console.log(`events.ts updated with ${results.length} new photo(s)`);
  console.log("\nNote: edit events.ts to fill in title, story, lens, etc. for the new photos.");
}

/* ── Main ────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "cleanup": {
      const dryRun = args.includes("--dry-run");
      cleanup(dryRun);
      break;
    }
    case "upload": {
      const folder = args[1];
      const dirIdx = args.indexOf("--dir");
      let filePaths: string[];

      if (dirIdx !== -1) {
        const dir = args[dirIdx + 1];
        if (!dir || !fs.existsSync(dir)) {
          console.error(`Error: directory "${dir}" not found`);
          process.exit(1);
        }
        filePaths = fs.readdirSync(dir)
          .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
          .map((f) => path.join(dir, f));
        console.log(`Found ${filePaths.length} images in ${dir}\n`);
      } else {
        filePaths = args.slice(2);
      }

      await upload(folder, filePaths);
      break;
    }
    default:
      console.log(`Gallery Cleanup & Upload Helper

Commands:
  npx tsx scripts/gallery-cleanup.ts cleanup              — delete orphaned files
  npx tsx scripts/gallery-cleanup.ts cleanup --dry-run     — preview deletions
  npx tsx scripts/gallery-cleanup.ts upload <slug> <files> — upload & register photos
  npx tsx scripts/gallery-cleanup.ts upload <slug> --dir <path> — upload all images from dir
`);
  }
}

main().catch(console.error);
