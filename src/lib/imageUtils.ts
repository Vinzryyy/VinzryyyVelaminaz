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
export async function convertToWebP(file: File, watermarkText?: string): Promise<{ dataUrl: string; width: number; height: number; originalSize: number; newSize: number }> {
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

  // Step 5.5: Apply watermark if requested
  if (watermarkText) {
    applyWatermark(ctx, w, h, watermarkText);
  }

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

/* ── EXIF extraction ────────────────────────────────────────────── */

export interface ExifData {
  lens?: string;
  aperture?: string;
  shutter?: string;
  iso?: number;
}

/**
 * Reads basic EXIF data from a JPEG/TIFF file.
 * Parses the raw binary EXIF APP1 segment — no external library needed.
 */
export async function extractExif(file: File): Promise<ExifData> {
  try {
    const buf = await file.slice(0, 128 * 1024).arrayBuffer(); // first 128KB is enough for EXIF
    const view = new DataView(buf);

    // Find APP1 marker (0xFFE1)
    let offset = 2; // skip SOI (0xFFD8)
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) break;
      if ((marker & 0xFF00) !== 0xFF00) return {};
      const len = view.getUint16(offset + 2);
      offset += 2 + len;
    }

    offset += 4; // skip marker + length
    // Check "Exif\0\0"
    const exifHeader = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    if (exifHeader !== "Exif") return {};
    offset += 6; // skip "Exif\0\0"

    const tiffStart = offset;
    const byteOrder = view.getUint16(offset);
    const le = byteOrder === 0x4949; // little-endian

    const getU16 = (o: number) => view.getUint16(o, le);
    const getU32 = (o: number) => view.getUint32(o, le);

    // Read IFD entries
    const readIFD = (ifdOffset: number): Map<number, { type: number; count: number; valueOffset: number }> => {
      const entries = new Map<number, { type: number; count: number; valueOffset: number }>();
      const abs = tiffStart + ifdOffset;
      if (abs + 2 > view.byteLength) return entries;
      const count = getU16(abs);
      for (let i = 0; i < count; i++) {
        const entryOff = abs + 2 + i * 12;
        if (entryOff + 12 > view.byteLength) break;
        const tag = getU16(entryOff);
        const type = getU16(entryOff + 2);
        const cnt = getU32(entryOff + 4);
        const valOff = getU32(entryOff + 8);
        entries.set(tag, { type, count: cnt, valueOffset: valOff });
      }
      return entries;
    };

    const getRational = (absOffset: number): number => {
      if (absOffset + 8 > view.byteLength) return 0;
      const num = getU32(absOffset);
      const den = getU32(absOffset + 4);
      return den ? num / den : 0;
    };

    const getString = (absOffset: number, length: number): string => {
      let s = "";
      for (let i = 0; i < length && absOffset + i < view.byteLength; i++) {
        const c = view.getUint8(absOffset + i);
        if (c === 0) break;
        s += String.fromCharCode(c);
      }
      return s.trim();
    };

    // IFD0
    const ifd0Offset = getU32(tiffStart + 4);
    const ifd0 = readIFD(ifd0Offset);

    // Find ExifIFD pointer (tag 0x8769)
    const exifPointer = ifd0.get(0x8769);
    if (!exifPointer) return {};

    const exifIFD = readIFD(exifPointer.valueOffset);

    const result: ExifData = {};

    // FNumber (0x829D) — rational
    const fnumber = exifIFD.get(0x829D);
    if (fnumber) {
      const f = getRational(tiffStart + fnumber.valueOffset);
      if (f) result.aperture = `f/${f % 1 === 0 ? f.toFixed(0) : f.toFixed(1)}`;
    }

    // ExposureTime (0x829A) — rational
    const exposure = exifIFD.get(0x829A);
    if (exposure) {
      const num = getU32(tiffStart + exposure.valueOffset);
      const den = getU32(tiffStart + exposure.valueOffset + 4);
      if (num && den) {
        result.shutter = num >= den ? `${(num / den).toFixed(1)}s` : `1/${Math.round(den / num)}`;
      }
    }

    // ISO (0x8827) — short
    const isoTag = exifIFD.get(0x8827);
    if (isoTag) {
      // If count=1 and type=short(3), value is in the valueOffset field directly
      if (isoTag.type === 3 && isoTag.count === 1) {
        result.iso = isoTag.valueOffset & 0xFFFF;
      } else {
        result.iso = getU16(tiffStart + isoTag.valueOffset);
      }
    }

    // LensModel (0xA434) — string
    const lensTag = exifIFD.get(0xA434);
    if (lensTag && lensTag.count > 4) {
      result.lens = getString(tiffStart + lensTag.valueOffset, lensTag.count);
    } else if (lensTag && lensTag.count <= 4) {
      // Short string stored inline in value offset
      result.lens = getString(tiffStart + ifd0Offset + 2 + 12 * ifd0.size + 4, lensTag.count); // fallback
    }

    // If no LensModel, try LensMake (0xA433)
    if (!result.lens) {
      const lensMake = exifIFD.get(0xA433);
      if (lensMake && lensMake.count > 4) {
        result.lens = getString(tiffStart + lensMake.valueOffset, lensMake.count);
      }
    }

    return result;
  } catch {
    return {};
  }
}

/* ── Watermark ──────────────────────────────────────────────────── */

export const WATERMARK_KEY = "vinzryyy-watermark-enabled";
export const WATERMARK_TEXT_KEY = "vinzryyy-watermark-text";

export function getWatermarkEnabled(): boolean {
  return localStorage.getItem(WATERMARK_KEY) === "true";
}

export function getWatermarkText(): string {
  return localStorage.getItem(WATERMARK_TEXT_KEY) || "VinzryyySaga";
}

export function applyWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const fontSize = Math.max(12, Math.round(Math.min(w, h) * 0.025));
  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, w - fontSize * 0.8, h - fontSize * 0.6);
  ctx.restore();
}
