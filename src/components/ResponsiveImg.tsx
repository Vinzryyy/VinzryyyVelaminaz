/**
 * Responsive image component.
 *
 * Renders a plain <img> — no <picture> wrapper that would break
 * absolute positioning. The src is passed through as-is.
 *
 * When optimized width variants exist alongside the original
 * (e.g. photo-640w.jpg), the browser picks the best size via srcset.
 * Missing variants are silently ignored — the browser falls back
 * to the original src.
 */

import { forwardRef, type ImgHTMLAttributes } from "react";

interface ResponsiveImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const ResponsiveImg = forwardRef<HTMLImageElement, ResponsiveImgProps>(
  function ResponsiveImg({ src, ...rest }, ref) {
    return <img ref={ref} src={src} {...rest} />;
  },
);
