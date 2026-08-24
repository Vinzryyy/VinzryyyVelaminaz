/**
 * Download all external images (imgBB + Cloudinary) to public/gallery/
 * and update events.ts to use local paths.
 *
 * Usage: npx tsx scripts/download-to-local.ts
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_PATH = path.resolve(__dirname, "../src/content/events.ts");
const PUBLIC_DIR = path.resolve(__dirname, "../public");

// Real IP for i.ibb.co (bypasses DNS block)
const IMGBB_RESOLVE = "i.ibb.co:443:45.43.142.5";

function downloadFile(url: string, destPath: string): boolean {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  try {
    if (url.includes("i.ibb.co")) {
      execSync(`curl -s --resolve "${IMGBB_RESOLVE}" -o "${destPath}" "${url}"`, { timeout: 30000 });
    } else {
      execSync(`curl -s -o "${destPath}" "${url}"`, { timeout: 30000 });
    }
    const stat = fs.statSync(destPath);
    if (stat.size < 1000) {
      fs.unlinkSync(destPath);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractSlugAndName(url: string): { slug: string; filename: string } {
  if (url.includes("i.ibb.co")) {
    // e.g. https://i.ibb.co/xS9Rn4qj/gallery-quadlips-performance-day2-IMG-7410.png
    const parts = url.split("/");
    const rawName = parts[parts.length - 1]; // gallery-quadlips-performance-day2-IMG-7410.png
    // Extract slug and filename from the naming pattern
    const match = rawName.match(/^gallery-(.+?)-(IMG[-_].+)$/i);
    if (match) {
      return { slug: match[1], filename: match[2].replace(/-/g, "_") };
    }
    // Fallback: use the full name
    return { slug: "misc", filename: rawName };
  }

  if (url.includes("cloudinary.com")) {
    // e.g. https://res.cloudinary.com/.../gallery/quadlips-performance-day2/lwisl1zl62ke3h2fadxz.jpg
    const match = url.match(/gallery\/([^/]+)\/([^/]+)$/);
    if (match) {
      return { slug: match[1], filename: match[2] };
    }
    return { slug: "misc", filename: url.split("/").pop() || "unknown.jpg" };
  }

  return { slug: "misc", filename: url.split("/").pop() || "unknown" };
}

async function main() {
  let content = fs.readFileSync(EVENTS_PATH, "utf-8");

  // Find all external URLs (imgBB + Cloudinary)
  const externalUrls = new Map<string, string>(); // url -> local path
  const urlRegex = /"(?:src|cover)":\s*"(https:\/\/(?:i\.ibb\.co|res\.cloudinary\.com)\/[^"]+)"/g;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[1];
    if (!externalUrls.has(url)) {
      const { slug, filename } = extractSlugAndName(url);
      const localPath = `/gallery/${slug}/${filename}`;
      externalUrls.set(url, localPath);
    }
  }

  console.log(`Found ${externalUrls.size} external images to download\n`);

  let done = 0;
  let failed = 0;
  const total = externalUrls.size;

  for (const [url, localPath] of externalUrls) {
    const destPath = path.join(PUBLIC_DIR, localPath);

    // Skip if already exists locally
    if (fs.existsSync(destPath)) {
      console.log(`  [${++done}/${total}] SKIP (exists): ${localPath}`);
      // Still replace in content
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(new RegExp(escaped, "g"), localPath);
      continue;
    }

    const ok = downloadFile(url, destPath);
    if (ok) {
      done++;
      console.log(`  [${done}/${total}] ${url.substring(0, 60)}... → ${localPath}`);
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      content = content.replace(new RegExp(escaped, "g"), localPath);
    } else {
      failed++;
      console.log(`  FAIL: ${url}`);
    }
  }

  fs.writeFileSync(EVENTS_PATH, content, "utf-8");
  console.log(`\nDone! Downloaded ${done}, failed ${failed}.`);
  console.log("events.ts updated with local paths.");
}

main().catch(console.error);
