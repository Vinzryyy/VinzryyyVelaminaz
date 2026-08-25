/**
 * Upload images to gallery.
 * - Dev: saves to public/gallery/ via Vite dev server endpoint
 * - Production: commits to GitHub repo via Contents API
 *
 * Handles retries, deduplication, and per-file error tracking.
 */
import { convertToWebP } from "./imageUtils";

export interface UploadResult {
  url: string;
  fileName: string;       // original file name (for correct title mapping)
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
}

const GH_API = "https://api.github.com";
const REPO = "Vinzryyy/VinzryyyVelaminaz";
const BRANCH = "main";
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // ms
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB raw — after conversion usually <3MB
const COMMIT_DELAY = 800; // ms between GitHub commits to avoid 409 conflicts

function getGhToken(): string {
  try { return localStorage.getItem("vinzryyy-gh-token") || ""; }
  catch { return ""; }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Retry wrapper — retries on network/5xx errors, not on 4xx.
 */
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

/**
 * Commits a base64 file to the GitHub repo via the Contents API.
 */
async function uploadToGitHub(base64: string, filePath: string): Promise<string> {
  const token = getGhToken();
  if (!token) throw new Error("GitHub token not configured — enter it in admin settings");

  // Check if file already exists (need its SHA to overwrite)
  let sha: string | undefined;
  try {
    const getRes = await fetch(`${GH_API}/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet, that's fine
  }

  const body: Record<string, string> = {
    message: `gallery: add ${filePath.split("/").pop()}`,
    content: base64,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(`${GH_API}/repos/${REPO}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || `HTTP ${putRes.status}`;
    throw new Error(`GitHub upload failed: ${msg}`);
  }

  return "/" + filePath.replace(/^public\//, "");
}

/**
 * Saves a file via the Vite dev server endpoint (dev only).
 */
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

/**
 * Generates a unique file name by appending a short timestamp suffix.
 * Prevents overwrites when iPad sends multiple files with the same name.
 */
function uniqueName(baseName: string, usedNames: Set<string>): string {
  let name = baseName;
  if (usedNames.has(name)) {
    name = `${baseName}-${Date.now()}`;
  }
  usedNames.add(name);
  return name;
}

/**
 * Converts image to WebP and uploads via GitHub API (prod) or local server (dev).
 */
export async function uploadPhoto(
  file: File,
  folder?: string,
  photoName?: string,
  usedNames?: Set<string>,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB, max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file);
  const base64 = dataUrl.split(",")[1];

  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  let name = photoName
    ? photoName.replace(/[^a-zA-Z0-9_-]/g, "_")
    : baseName;

  // Deduplicate within batch
  if (usedNames) name = uniqueName(name, usedNames);

  const subFolder = (folder ?? "").replace(/^gallery\//, "");
  // Always use .webp extension for consistency — browsers detect format by content, not extension
  const filePath = `public/gallery/${subFolder}/${name}.webp`;

  let url: string;
  if (import.meta.env.DEV) {
    url = await uploadToLocal(base64, subFolder, name);
  } else {
    url = await withRetry(() => uploadToGitHub(base64, filePath));
  }

  return { url, fileName: file.name, width, height, originalSize, newSize };
}

/**
 * Uploads multiple files with progress tracking, retries, and deduplication.
 */
export async function uploadBatch(
  files: File[],
  folder?: string,
  onProgress?: (done: number, total: number, currentFile: string) => void,
): Promise<{ successful: UploadResult[]; failed: { name: string; error: string }[] }> {
  const successful: UploadResult[] = [];
  const failed: { name: string; error: string }[] = [];
  const usedNames = new Set<string>();

  const isProd = !import.meta.env.DEV;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i, files.length, file.name);
    try {
      const result = await uploadPhoto(file, folder, undefined, usedNames);
      successful.push(result);
      // Space out GitHub commits to avoid 409 conflicts from rapid sequential commits
      if (isProd && i < files.length - 1) await sleep(COMMIT_DELAY);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ name: file.name, error });
    }
    onProgress?.(i + 1, files.length, file.name);
  }

  return { successful, failed };
}
