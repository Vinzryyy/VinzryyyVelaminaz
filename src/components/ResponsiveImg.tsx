/**
 * Responsive image component.
 *
 * - Generates `srcset` width descriptors so the browser picks the
 *   best resolution for the current viewport / DPR.
 * - Wraps in `<picture>` when WebP/AVIF sources are available.
 * - Falls back to the original src for browsers that ignore srcset.
 *
 * Convention: place optimized variants next to the original:
 *   /gallery/event/photo.jpg          ← original
 *   /gallery/event/photo-640w.webp    ← 640px wide WebP
 *   /gallery/event/photo-960w.webp    ← 960px wide WebP
 *   /gallery/event/photo-1280w.webp   ← …
 *
 * If the variants don't exist the browser silently falls back
 * to the original — no 404 errors are thrown because srcset
 * sources are optional hints, not required resources.
 */

import { forwardRef, type ImgHTMLAttributes } from "react";

const WIDTHS = [640, 960, 1280, 1920] as const;

function basePath(src: string): { base: string; ext: string } {
  const dot = src.lastIndexOf(".");
  return { base: src.slice(0, dot), ext: src.slice(dot) };
}

function buildSrcSet(base: string, ext: string, widths: readonly number[]): string {
  return widths.map((w) => `${base}-${w}w${ext} ${w}w`).join(", ");
}

interface ResponsiveImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet"> {
  src: string;
  sizes?: string;
  /** Skip responsive hints — render a plain img. Useful for tiny thumbnails. */
  plain?: boolean;
}

export const ResponsiveImg = forwardRef<HTMLImageElement, ResponsiveImgProps>(
  function ResponsiveImg({ src, sizes, plain, ...rest }, ref) {
    if (plain || !src) {
      return <img ref={ref} src={src} sizes={sizes} {...rest} />;
    }

    const { base, ext } = basePath(src);

    const webpSrcSet = buildSrcSet(base, ".webp", WIDTHS);
    const avifSrcSet = buildSrcSet(base, ".avif", WIDTHS);
    const fallbackSrcSet = buildSrcSet(base, ext, WIDTHS);

    return (
      <picture>
        <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
        <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
        <img
          ref={ref}
          src={src}
          srcSet={fallbackSrcSet}
          sizes={sizes}
          {...rest}
        />
      </picture>
    );
  },
);
