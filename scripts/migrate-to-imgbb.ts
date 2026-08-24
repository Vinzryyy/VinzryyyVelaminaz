/**
 * Migration script: Upload all local gallery images AND Cloudinary images
 * to imgBB and update events.ts with permanent imgBB URLs.
 *
 * Usage: npx tsx scripts/migrate-to-imgbb.ts
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IMGBB_API_KEY = "9b818f8b919df959fe54a04e31e73311";
const IMGBB_URL = "https://api.imgbb.com/1/upload";
const EVENTS_PATH = path.resolve(__dirname, "../src/content/events.ts");
const PUBLIC_DIR = path.resolve(__dirname, "../public");

async function uploadToImgBB(base64: string, name: string): Promise<string> {
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", base64);
  formData.append("name", name);

  const res = await fetch(IMGBB_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`imgBB upload failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "imgBB upload failed");
  }

  return json.data.url;
}

async function uploadLocalFile(filePath: string, name: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString("base64");
  return uploadToImgBB(base64, name);
}

async function uploadFromUrl(url: string, name: string): Promise<string> {
  // imgBB also accepts a URL directly
  const formData = new URLSearchParams();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", url);
  formData.append("name", name);

  const res = await fetch(IMGBB_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`imgBB upload failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || "imgBB upload failed");
  }

  return json.data.url;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Read events.ts
  let content = fs.readFileSync(EVENTS_PATH, "utf-8");

  // ── Collect all URLs that need migration ──

  // 1. Local /gallery/ paths (src and cover)
  const localPaths = new Set<string>();
  const localRegex = /"(?:src|cover)":\s*"(\/gallery\/[^"]+)"/g;
  let match;
  while ((match = localRegex.exec(content)) !== null) {
    localPaths.add(match[1]);
  }

  // 2. Cloudinary URLs
  const cloudinaryUrls = new Set<string>();
  const cloudRegex = /"(?:src|cover)":\s*"(https:\/\/res\.cloudinary\.com\/[^"]+)"/g;
  while ((match = cloudRegex.exec(content)) !== null) {
    cloudinaryUrls.add(match[1]);
  }

  const totalLocal = localPaths.size;
  const totalCloud = cloudinaryUrls.size;
  const total = totalLocal + totalCloud;

  console.log(`Found ${totalLocal} local images + ${totalCloud} Cloudinary images = ${total} to migrate\n`);

  if (total === 0) {
    console.log("Nothing to migrate!");
    return;
  }

  const urlMap = new Map<string, string>();
  let done = 0;
  let failed = 0;

  // ── Upload local files ──
  for (const localPath of localPaths) {
    const filePath = path.join(PUBLIC_DIR, localPath);
    // Extract event slug from path for naming: /gallery/event-slug/file.webp
    const parts = localPath.split("/");
    const slug = parts[2] || "";
    const basename = path.basename(localPath, path.extname(localPath));
    const name = `${slug}_${basename}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP (not found): ${localPath}`);
      failed++;
      continue;
    }

    try {
      const imgbbUrl = await uploadLocalFile(filePath, name);
      urlMap.set(localPath, imgbbUrl);
      done++;
      console.log(`  [${done}/${total}] ${localPath} → ${imgbbUrl}`);
      await delay(500);
    } catch (err) {
      console.log(`  FAIL: ${localPath} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  // ── Upload Cloudinary URLs ──
  for (const cloudUrl of cloudinaryUrls) {
    // Extract a name from the Cloudinary URL
    const urlParts = cloudUrl.split("/");
    const filename = urlParts[urlParts.length - 1].split(".")[0];
    const folderPart = urlParts[urlParts.length - 2] || "";
    const name = `${folderPart}_${filename}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    try {
      const imgbbUrl = await uploadFromUrl(cloudUrl, name);
      urlMap.set(cloudUrl, imgbbUrl);
      done++;
      console.log(`  [${done}/${total}] Cloudinary → ${imgbbUrl}`);
      await delay(500);
    } catch (err) {
      console.log(`  FAIL: ${cloudUrl} — ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  // ── Replace all old URLs with imgBB URLs in events.ts ──
  for (const [oldUrl, imgbbUrl] of urlMap) {
    const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp(escaped, "g"), imgbbUrl);
  }

  fs.writeFileSync(EVENTS_PATH, content, "utf-8");

  console.log(`\nDone! Migrated ${done} images, ${failed} failed.`);
  console.log("events.ts has been updated with imgBB URLs.");
}

main().catch(console.error);
