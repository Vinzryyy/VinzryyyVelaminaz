/**
 * Browser-side image conversion utilities.
 * Converts uploaded images to WebP using Canvas API.
 * Handles HEIC/HEIF (iPad), iOS canvas quirks, and large images.
 */

import heic2any from "heic2any";

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.85;
// iOS Safari caps total canvas pixel budget (~16MP on older devices)
const IOS_MAX_PIXELS = 4096 * 4096;

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif") ||
    file.type === "image/heic" || file.type === "image/heif";
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * If the file is HEIC/HEIF, convert it to a JPEG Blob first
 * so the browser Image element can decode it.
 */
async function ensureBrowserDecodable(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(blob) ? blob[0] : blob;
}

/**
 * Loads a blob into an Image element with a timeout.
 */
function loadImage(blob: Blob, timeoutMs = 30_000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load timed out"));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error("Image decoded with 0 dimensions"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("Browser cannot decode this image format"));
    };
    img.src = url;
  });
}

/**
 * Converts a File (PNG/JPG/HEIC/etc.) to a WebP data URL.
 * Handles HEIC conversion, iOS canvas limits, and WebP encoding fallback.
 */
export async function convertToWebP(file: File): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; newSize: number }> {
  // Step 1: Convert HEIC/HEIF to JPEG if needed
  let decodable: Blob;
  try {
    decodable = await ensureBrowserDecodable(file);
  } catch {
    throw new Error(`Cannot convert ${file.name} — unsupported format`);
  }

  // Step 2: Load into Image element
  const img = await loadImage(decodable);
  let { naturalWidth: w, naturalHeight: h } = img;

  // Step 3: Calculate target size (respect MAX_DIMENSION)
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // Step 4: On iOS, further reduce if total pixels exceed budget
  if (isIOS() && w * h > IOS_MAX_PIXELS) {
    const scale = Math.sqrt(IOS_MAX_PIXELS / (w * h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // Step 5: Draw to canvas
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");
  ctx.drawImage(img, 0, 0, w, h);

  // Step 6: Export — try WebP first, fall back to JPEG if browser doesn't support WebP encoding
  let dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
  if (!dataUrl.startsWith("data:image/webp")) {
    // iOS Safari <17 can't encode WebP — fall back to JPEG
    dataUrl = canvas.toDataURL("image/jpeg", WEBP_QUALITY);
  }

  // Step 7: Validate output isn't blank/corrupt (a blank canvas produces a tiny data URL)
  const base64Len = dataUrl.length - dataUrl.indexOf(",") - 1;
  if (base64Len < 200) {
    throw new Error(`Conversion produced empty image for ${file.name}`);
  }

  // Clean up canvas memory (important on iOS)
  canvas.width = 0;
  canvas.height = 0;

  const originalSize = file.size;
  const newSize = Math.round(base64Len * 0.75);

  return { dataUrl, width: w, height: h, originalSize, newSize };
}

/**
 * Converts a File to WebP and returns just the data URL.
 */
export async function fileToWebP(file: File): Promise<string> {
  const { dataUrl } = await convertToWebP(file);
  return dataUrl;
}

/**
 * Formats byte size to human readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
