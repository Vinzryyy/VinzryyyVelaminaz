/**
 * Every gallery photo also exists as copies, written next to the original by
 * scripts/generate-image-variants.ts during `npm run build`:
 *
 *   /gallery/jkt48-klia/fiony2.webp         original (only the lightbox uses it)
 *   /gallery/jkt48-klia/fiony2-480w.webp    plus -960w, -1440w and -1920w
 *
 * Grids and cards list them in `srcset`, so a phone downloads a ~40 KB copy
 * instead of the ~350 KB original. Even the 1920px copy is a third of the
 * original's size: the originals were saved by the browser's less efficient
 * encoder. This file is the one place that defines the widths and the
 * naming; the build script imports it too.
 */

export const VARIANT_WIDTHS = [480, 960, 1440, 1920] as const;

/**
 * On screens denser than 2x, pick files as if the screen were 2x: the extra
 * sharpness of 3x is invisible in photos but costs over twice the bytes.
 * Listing every file as proportionally wider has exactly that effect.
 */
const DENSITY_CAP = 2;
const widthScale =
  typeof window === "undefined" ? 1 : Math.max(1, (window.devicePixelRatio || 1) / DENSITY_CAP);

export function variantPath(src: string, width: number): string {
  return `${src.replace(/\.[^./]+$/, "")}-${width}w.webp`;
}

function hasCopies(src: string | undefined): src is string {
  // The dev server has no copies: only the production build makes them.
  return !!src?.startsWith("/gallery/") && !import.meta.env.DEV;
}

/** `srcset` for a /gallery/ photo; undefined for anything without copies. */
export function gallerySrcSet(src: string | undefined): string | undefined {
  if (!hasCopies(src)) return undefined;
  // A space or comma inside a URL would break srcset parsing.
  return VARIANT_WIDTHS.map(
    (w) => `${variantPath(src, w).replace(/ /g, "%20").replace(/,/g, "%2C")} ${Math.round(w * widthScale)}w`,
  ).join(", ");
}

/** The 1920px copy, for photos always drawn large (the home hero). */
export function largestCopy(src: string): string {
  return hasCopies(src) ? variantPath(src, VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]) : src;
}
