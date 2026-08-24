/**
 * Upload images to gallery.
 * - Dev: saves to public/gallery/ via Vite dev server endpoint
 * - Production: commits to GitHub repo via Contents API
 */
import { convertToWebP } from "./imageUtils";

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
}

const GH_API = "https://api.github.com";
const REPO = "Vinzryyy/VinzryyyVelaminaz";
const BRANCH = "main";

// Token stored in localStorage by admin login — see Admin.tsx
function getGhToken(): string {
  try { return localStorage.getItem("vinzryyy-gh-token") || ""; }
  catch { return ""; }
}

/**
 * Commits a base64 file to the GitHub repo via the Contents API.
 * Returns the public URL path (e.g. /gallery/slug/name.webp).
 */
async function uploadToGitHub(base64: string, filePath: string): Promise<string> {
  const token = getGhToken();
  if (!token) {
    throw new Error("GitHub token not configured — enter it in admin settings");
  }

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

  // public/gallery/slug/name.webp -> /gallery/slug/name.webp
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
 * Converts image to WebP and uploads via GitHub API (prod) or local server (dev).
 */
export async function uploadPhoto(
  file: File,
  folder?: string,
  photoName?: string,
): Promise<UploadResult> {
  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file);
  const base64 = dataUrl.split(",")[1];

  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const name = photoName
    ? photoName.replace(/[^a-zA-Z0-9_-]/g, "_")
    : baseName;

  const subFolder = (folder ?? "").replace(/^gallery\//, "");

  let url: string;
  if (import.meta.env.DEV) {
    url = await uploadToLocal(base64, subFolder, name);
  } else {
    const filePath = `public/gallery/${subFolder}/${name}.webp`;
    url = await uploadToGitHub(base64, filePath);
  }

  return { url, width, height, originalSize, newSize };
}

/**
 * Uploads multiple files with progress tracking.
 */
export async function uploadBatch(
  files: File[],
  folder?: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ successful: UploadResult[]; failed: { name: string; error: string }[] }> {
  const successful: UploadResult[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadPhoto(files[i], folder, undefined);
      successful.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ name: files[i].name, error });
    }
    onProgress?.(i + 1, files.length);
  }

  return { successful, failed };
}
