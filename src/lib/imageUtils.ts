/**
 * Browser-side image conversion utilities.
 * Converts uploaded images to WebP using Canvas API.
 */

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.85;

/**
 * Converts a File (PNG/JPG/etc.) to a WebP data URL.
 * Also resizes if larger than MAX_DIMENSION on either side.
 */
export function convertToWebP(file: File): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; newSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if too large
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);

      // Estimate sizes
      const originalSize = file.size;
      const newSize = Math.round((dataUrl.length - "data:image/webp;base64,".length) * 0.75);

      resolve({ dataUrl, width, height, originalSize, newSize });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Converts a File to WebP and returns just the data URL.
 * Simpler version for quick use.
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
