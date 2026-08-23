/**
 * Cloudinary unsigned upload integration.
 * Uploads images directly from the browser — no backend needed.
 */

const CLOUD_NAME = "ycgduhsb";
const UPLOAD_PRESET = "vinzryyy";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Uploads an image file to Cloudinary.
 * Returns the permanent URL and metadata.
 *
 * @param file - The image file to upload
 * @param folder - Optional folder path (e.g. "gallery/quadlips-day1")
 */
export async function uploadToCloudinary(
  file: File,
  folder?: string,
): Promise<CloudinaryResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Cloudinary upload failed: invalid response");
  }

  if (!data.secure_url || !data.public_id) {
    throw new Error("Cloudinary upload failed: missing required fields");
  }

  return {
    url: data.url || "",
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width || 0,
    height: data.height || 0,
    format: data.format || "",
    bytes: data.bytes || 0,
  };
}

/**
 * Uploads multiple files with progress tracking.
 * Calls onProgress after each file completes.
 */
export async function uploadBatch(
  files: File[],
  folder?: string,
  onProgress?: (done: number, total: number, result: CloudinaryResult | null, error?: string) => void,
): Promise<{ successful: CloudinaryResult[]; failed: { name: string; error: string }[] }> {
  const successful: CloudinaryResult[] = [];
  const failed: { name: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadToCloudinary(files[i], folder);
      successful.push(result);
      onProgress?.(i + 1, files.length, result);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      failed.push({ name: files[i].name, error });
      onProgress?.(i + 1, files.length, null, error);
    }
  }

  return { successful, failed };
}

/**
 * Generates a Cloudinary URL with transformations.
 * Useful for requesting optimized versions on the fly.
 *
 * Example: cloudinaryUrl(publicId, { width: 640, format: "webp" })
 * → https://res.cloudinary.com/ycgduhsb/image/upload/w_640,f_webp/publicId
 */
export function cloudinaryUrl(
  publicId: string,
  opts?: { width?: number; height?: number; format?: string; quality?: number },
): string {
  const transforms: string[] = [];
  if (opts?.width) transforms.push(`w_${opts.width}`);
  if (opts?.height) transforms.push(`h_${opts.height}`);
  if (opts?.format) transforms.push(`f_${opts.format}`);
  if (opts?.quality) transforms.push(`q_${opts.quality}`);

  const t = transforms.length > 0 ? transforms.join(",") + "/" : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}${publicId}`;
}
