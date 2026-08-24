/**
 * Upload images via imgBB (free image hosting).
 * Converts to WebP in-browser, then uploads to imgBB for a permanent URL.
 */
import { convertToWebP } from "./imageUtils";

const IMGBB_API_KEY = "9b818f8b919df959fe54a04e31e73311";
const IMGBB_URL = "https://api.imgbb.com/1/upload";

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  originalSize: number;
  newSize: number;
}

/**
 * Converts image to WebP, uploads to imgBB, returns the permanent URL.
 */
export async function uploadPhoto(
  file: File,
  folder?: string,
  photoName?: string,
): Promise<UploadResult> {
  // Convert to WebP first
  const { dataUrl, width, height, originalSize, newSize } = await convertToWebP(file);

  // Extract base64 content (remove data:image/webp;base64, prefix)
  const base64 = dataUrl.split(",")[1];

  // Use provided name, or fall back to event-slug + original filename
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const prefix = folder ? folder.replace(/[^a-zA-Z0-9_-]/g, "_") : "";
  const name = photoName
    ? photoName.replace(/[^a-zA-Z0-9_-]/g, "_")
    : prefix ? `${prefix}_${baseName}` : baseName;

  // Upload to imgBB
  const formData = new FormData();
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

  return {
    url: json.data.url,
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
