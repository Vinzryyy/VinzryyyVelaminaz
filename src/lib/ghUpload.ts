/**
 * Upload images to local gallery.
 * Converts to WebP in-browser, then saves to public/gallery/ via dev server.
 */
import { convertToWebP } from "./imageUtils";

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
}

/**
 * Converts image to WebP and saves to public/gallery/{folder}/{name}.webp.
 */
export async function uploadPhoto(
  file: File,
  folder?: string,
  photoName?: string,
): Promise<UploadResult> {
  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file);

  // Extract base64 content (remove data:image/webp;base64, prefix)
  const base64 = dataUrl.split(",")[1];

  // Build a clean filename
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const name = photoName
    ? photoName.replace(/[^a-zA-Z0-9_-]/g, "_")
    : baseName;

  // Strip leading "gallery/" from folder if present — the server adds it
  const subFolder = (folder ?? "").replace(/^gallery\//, "");

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, folder: subFolder, name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  const { url } = await res.json();

  return {
    url,
    width,
    height,
    originalSize,
    newSize,
  };
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
