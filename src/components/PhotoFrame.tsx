import { useState, useRef, useEffect } from "react";
import { toKanji, placeholder } from "@/lib/data";
import type { Photo } from "@/lib/types";

/**
 * A single photo in the grid.
 * Shows a kanji frame number, hover veil with title + EXIF summary.
 * Uses IntersectionObserver to defer image loading until near-viewport.
 */
export function PhotoFrame({
  photo,
  index,
  aspectClass,
  onClick,
}: {
  photo: Photo;
  index: number;
  aspectClass: string;
  onClick: () => void;
}) {
  const hasSrc = !!photo.src;
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [inView, setInView] = useState(false);
  const frameRef = useRef<HTMLButtonElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle cached images that load before onLoad attaches
  useEffect(() => {
    if (inView && imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [inView]);

  useEffect(() => {
    if (!hasSrc) return;
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasSrc]);

  return (
    <button
      ref={frameRef}
      className={`photo-frame group relative w-full cursor-pointer overflow-hidden border border-hairline bg-card p-0 text-left ${aspectClass}`}
      onClick={onClick}
      aria-label={`View ${photo.title}`}
    >
      {hasSrc ? (
        <>
          {/* Shimmer placeholder — removed once the photo decodes */}
          {!loaded && !errored && <div className="skeleton absolute inset-0 overflow-hidden bg-card" aria-hidden="true" />}
          {/* Error state with retry */}
          {errored && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card">
              <svg className="mb-2 h-5 w-5 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <button
                onClick={(e) => { e.stopPropagation(); setErrored(false); setLoaded(false); }}
                className="font-mono text-[9px] text-muted transition-colors hover:text-crimson"
              >
                Retry
              </button>
            </div>
          )}
          {inView && !errored && (
            <img
              ref={imgRef}
              src={photo.src}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => { setErrored(true); setLoaded(true); }}
              className={`img-blur-up absolute inset-0 h-full w-full object-cover transition-transform duration-300 ${loaded ? "img-loaded" : ""}`}
              sizes="(min-width: 640px) 33vw, 100vw"
            />
          )}
        </>
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ background: placeholder(index) }}
        />
      )}

      {/* Kanji frame number */}
      <span className="absolute left-2.5 top-2.5 z-10 font-jp text-xs text-gold/60" aria-hidden="true" lang="ja">
        {toKanji(index + 1)}
      </span>

      {/* Hover veil — visual only, button's aria-label provides the accessible name */}
      <div className="frame-veil pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-sumi/85 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300" aria-hidden="true">
        <h4 className="font-display text-sm font-semibold text-ink">
          {photo.title}
        </h4>
        <p className="mt-0.5 font-mono text-[10px] text-sakura/70">
          {[photo.lens, photo.aperture, photo.shutter, photo.iso != null ? `ISO ${photo.iso}` : null]
            .filter((v): v is string => v != null)
            .join(" · ")}
        </p>
      </div>
    </button>
  );
}
