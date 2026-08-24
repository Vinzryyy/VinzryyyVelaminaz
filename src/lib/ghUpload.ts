/**
 * Upload images to GitHub repo as WebP files.
 * Converts to WebP in-browser, then commits via GitHub API.
 */
import { convertToWebP } from "./imageUtils";

const GH_REPO = "Vinzryyy/VinzryyyVelaminaz";
const GH_TOKEN_KEY = "vinzryyy-gh-token";

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
}

function getToken(): string {
  const token = localStorage.getItem(GH_TOKEN_KEY);
  if (!token) throw new Error("No GitHub token configured — set it in the Export tab");
  return token;
}

/**
 * Converts image to WebP, commits to GitHub repo, returns the served URL.
 */
export async function uploadPhoto(
  file: File,
  folder: string,
): Promise<UploadResult> {
  const token = getToken();

  // Convert to WebP
  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file);

  // Extract base64 content (remove data:image/webp;base64, prefix)
  const base64 = dataUrl.split(",")[1];

  // Generate unique filename
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const timestamp = Date.now();
  const filePath = `public/${folder}/${name}-${timestamp}.webp`;

  // Commit file to GitHub
  const res = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `upload: ${folder}/${name}.webp`,
        content: base64,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub upload failed (${res.status})`);
  }

  // The file will be served from the site root (public/ is the static dir)
  const url = `/${folder}/${name}-${timestamp}.webp`;

  return { url, width, height, originalSize, newSize };
}

/**
 * Uploads multiple files with progress tracking.
 */
export async function uploadBatch(
  files: File[],
  folder: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ successful: UploadResult[]; failed: { name: string; error: string }[] }> {
  const successful: UploadResult[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadPhoto(files[i], folder);
      successful.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ name: files[i].name, error });
    }
    onProgress?.(i + 1, files.length);
  }

  return { successful, failed };
}
