/**
 * <img> for gallery photos: lets the browser download a smaller copy
 * (see lib/imageVariants.ts) instead of the full-size original.
 *
 * Pass `sizes` — the width the photo is drawn at — or the browser assumes
 * the full viewport width and may pick a bigger copy than needed.
 */

import { forwardRef, type ImgHTMLAttributes } from "react";
import { gallerySrcSet } from "@/lib/imageVariants";

export const ResponsiveImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  function ResponsiveImg({ src, ...rest }, ref) {
    return <img ref={ref} src={src} srcSet={gallerySrcSet(src)} {...rest} />;
  },
);
