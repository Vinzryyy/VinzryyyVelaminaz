/**
 * Upload images to gallery.
 * - Dev: saves to public/gallery/ via Vite dev server endpoint
 * - Production: batches all files into a SINGLE Git commit via the Trees API,
 *   so only one Vercel deploy is triggered per upload session.
 */
import { convertToWebP, extractExif, getWatermarkEnabled, getWatermarkText, type ExifData } from "./imageUtils";

export interface UploadResult {
  url: string;
  fileName: string;       // original file name (for correct title mapping)
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
  exif?: ExifData;
}

const GH_API = "https://api.github.com";
const REPO = "Vinzryyy/VinzryyyVelaminaz";
const BRANCH = "main";
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function getGhToken(): string {
  try { return localStorage.getItem("vinzryyy-gh-token") || ""; }
  catch { return ""; }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function ghHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const is4xx = lastError.message.includes("HTTP 4");
      if (is4xx || attempt === retries) throw lastError;
      await sleep(RETRY_DELAY * (attempt + 1));
    }
  }
  throw lastError;
}

/* ── Git Trees API: single commit for all files ───────────────── */

interface TreeEntry {
  path: string;
  content?: string;     // for text files
  base64?: string;      // for binary files
}

/**
 * Mutex to serialize all GitHub commits so concurrent uploads don't
 * race on the branch ref and produce empty commits.
 */
let commitQueue: Promise<void> = Promise.resolve();

/**
 * Commits multiple files in a SINGLE commit using the Git Trees API.
 * This triggers only ONE Vercel deploy, no matter how many files.
 * Serialized via commitQueue to prevent race conditions.
 */
async function commitBatchToGitHub(entries: TreeEntry[], message: string): Promise<void> {
  // Chain onto the queue so only one commit runs at a time
  const result = commitQueue.then(() => doCommitBatch(entries, message));
  commitQueue = result.catch(() => {});   // swallow so queue continues after failures
  return result;
}

async function doCommitBatch(entries: TreeEntry[], message: string): Promise<void> {
  if (entries.length === 0) throw new Error("Nothing to commit — entries array is empty");

  const token = getGhToken();
  if (!token) throw new Error("GitHub token not configured — enter it in admin settings");
  const headers = ghHeaders(token);

  // 1. Get latest commit SHA on the branch
  const refRes = await fetch(`${GH_API}/repos/${REPO}/git/ref/heads/${BRANCH}`, { headers });
  if (!refRes.ok) throw new Error(`Failed to get branch ref: HTTP ${refRes.status}`);
  const refData = await refRes.json();
  const latestCommitSha: string = refData.object.sha;

  // 2. Get the tree SHA of that commit
  const commitRes = await fetch(`${GH_API}/repos/${REPO}/git/commits/${latestCommitSha}`, { headers });
  if (!commitRes.ok) throw new Error(`Failed to get commit: HTTP ${commitRes.status}`);
  const commitData = await commitRes.json();
  const baseTreeSha: string = commitData.tree.sha;

  // 3. Create blobs for binary files, build tree entries
  const treeItems: { path: string; mode: string; type: string; sha?: string; content?: string }[] = [];

  for (const entry of entries) {
    if (entry.base64) {
      // Binary file — create a blob first
      const blobRes = await fetch(`${GH_API}/repos/${REPO}/git/blobs`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: entry.base64, encoding: "base64" }),
      });
      if (!blobRes.ok) throw new Error(`Failed to create blob for ${entry.path}: HTTP ${blobRes.status}`);
      const blobData = await blobRes.json();
      treeItems.push({ path: entry.path, mode: "100644", type: "blob", sha: blobData.sha });
    } else if (entry.content != null) {
      // Text file — can be inlined
      treeItems.push({ path: entry.path, mode: "100644", type: "blob", content: entry.content });
    }
  }

  // Guard: never create an empty commit
  if (treeItems.length === 0) {
    throw new Error("No valid tree entries — all files were skipped (missing base64/content)");
  }

  // 4. Create a new tree
  const treeRes = await fetch(`${GH_API}/repos/${REPO}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: HTTP ${treeRes.status}`);
  const treeData = await treeRes.json();

  // Guard: if the new tree SHA equals the base, nothing actually changed
  if (treeData.sha === baseTreeSha) {
    throw new Error("Tree unchanged — files may already exist at the same paths with identical content");
  }

  // 5. Create the commit
  const newCommitRes = await fetch(`${GH_API}/repos/${REPO}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit: HTTP ${newCommitRes.status}`);
  const newCommitData = await newCommitRes.json();

  // 6. Update the branch ref to point to new commit
  const updateRes = await fetch(`${GH_API}/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: newCommitData.sha }),
  });
  if (!updateRes.ok) throw new Error(`Failed to update branch: HTTP ${updateRes.status}`);
}

/* ── Local dev upload ─────────────────────────────────────────── */

async function uploadToLocal(base64: string, folder: string, name: string): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, folder, name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url;
}

/* ── Name deduplication ───────────────────────────────────────── */

function uniqueName(baseName: string, usedNames: Set<string>): string {
  let name = baseName;
  if (usedNames.has(name)) {
    name = `${baseName}-${Date.now()}`;
  }
  usedNames.add(name);
  return name;
}

/* ── Convert a single file (shared by dev & prod) ─────────────── */

interface ConvertedFile {
  base64: string;
  filePath: string;
  url: string;
  fileName: string;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
  exif?: ExifData;
}

async function convertFile(
  file: File,
  folder: string,
  usedNames: Set<string>,
  photoName?: string,
): Promise<ConvertedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  // Extract EXIF before conversion (conversion strips it)
  const exif = await extractExif(file);

  // Apply watermark if enabled
  const watermark = getWatermarkEnabled() ? getWatermarkText() : undefined;
  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file, watermark);
  const base64 = dataUrl.split(",")[1];

  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  let name = photoName
    ? photoName.replace(/[^a-zA-Z0-9_-]/g, "_")
    : baseName;
  name = uniqueName(name, usedNames);

  const subFolder = folder.replace(/^gallery\//, "");
  const filePath = `public/gallery/${subFolder}/${name}.webp`;
  const url = "/" + filePath.replace(/^public\//, "");

  return { base64, filePath, url, fileName: file.name, width, height, originalSize, newSize, exif };
}

/* ── Single photo upload (dev only, prod uses batch) ──────────── */

export async function uploadPhoto(
  file: File,
  folder?: string,
  photoName?: string,
): Promise<UploadResult> {
  const usedNames = new Set<string>();
  const subFolder = folder ?? "";

  if (import.meta.env.DEV) {
    const converted = await convertFile(file, subFolder, usedNames, photoName);
    const folderName = subFolder.replace(/^gallery\//, "");
    const name = converted.filePath.split("/").pop()!.replace(/\.webp$/, "");
    const url = await uploadToLocal(converted.base64, folderName, name);
    return { url, fileName: converted.fileName, width: converted.width, height: converted.height, originalSize: converted.originalSize, newSize: converted.newSize, exif: converted.exif };
  }

  // Prod: single-file commit
  const converted = await convertFile(file, subFolder, usedNames, photoName);
  await withRetry(() => commitBatchToGitHub(
    [{ path: converted.filePath, base64: converted.base64 }],
    `gallery: add ${converted.filePath.split("/").pop()}`,
  ));
  return { url: converted.url, fileName: converted.fileName, width: converted.width, height: converted.height, originalSize: converted.originalSize, newSize: converted.newSize, exif: converted.exif };
}

/* ── Batch upload: converts all, then ONE commit ──────────────── */

export async function uploadBatch(
  files: File[],
  folder?: string,
  onProgress?: (done: number, total: number, currentFile: string) => void,
): Promise<{ successful: UploadResult[]; failed: { name: string; error: string }[] }> {
  const successful: UploadResult[] = [];
  const failed: { name: string; error: string }[] = [];
  const usedNames = new Set<string>();
  const subFolder = folder ?? "";

  // Phase 1: Convert all files locally (no network yet for prod)
  const converted: ConvertedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, `Converting ${file.name}...`);
    try {
      const result = await convertFile(file, subFolder, usedNames);
      converted.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ name: file.name, error });
    }
  }

  if (converted.length === 0) {
    onProgress?.(files.length, files.length, "Done");
    return { successful, failed };
  }

  // Phase 2: Upload
  if (import.meta.env.DEV) {
    // Dev: upload one by one to local server
    for (let i = 0; i < converted.length; i++) {
      const c = converted[i];
      onProgress?.(i, converted.length, `Uploading ${c.fileName}...`);
      try {
        const folderName = subFolder.replace(/^gallery\//, "");
        const name = c.filePath.split("/").pop()!.replace(/\.webp$/, "");
        const url = await uploadToLocal(c.base64, folderName, name);
        successful.push({ url, fileName: c.fileName, width: c.width, height: c.height, originalSize: c.originalSize, newSize: c.newSize, exif: c.exif });
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        failed.push({ name: c.fileName, error });
      }
    }
  } else {
    // Prod: ONE single commit with all images
    onProgress?.(converted.length, files.length, "Committing to GitHub...");
    try {
      const entries: TreeEntry[] = converted.map((c) => ({
        path: c.filePath,
        base64: c.base64,
      }));
      const count = converted.length;
      const message = count === 1
        ? `gallery: add ${converted[0].filePath.split("/").pop()}`
        : `gallery: add ${count} photos`;

      await withRetry(() => commitBatchToGitHub(entries, message));

      // All succeeded
      for (const c of converted) {
        successful.push({ url: c.url, fileName: c.fileName, width: c.width, height: c.height, originalSize: c.originalSize, newSize: c.newSize, exif: c.exif });
      }
    } catch (err) {
      // Entire batch failed
      const error = err instanceof Error ? err.message : "Unknown error";
      for (const c of converted) {
        failed.push({ name: c.fileName, error });
      }
    }
  }

  onProgress?.(files.length, files.length, "Done");
  return { successful, failed };
}

/* ── Batch commit helper (used by publishToGitHub) ────────────── */

export { commitBatchToGitHub };
export type { TreeEntry };
