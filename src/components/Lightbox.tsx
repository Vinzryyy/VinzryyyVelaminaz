import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Photo, Event } from "@/lib/types";
import { toKanji } from "@/lib/data";
import { KatanaDivider } from "./KatanaDivider";

/**
 * Fullscreen photo viewer with info panel, EXIF data, filmstrip,
 * and keyboard/swipe navigation.
 */
export function Lightbox({
  event,
  photos,
  startIndex,
  onClose,
}: {
  event: Event;
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();

  const photo = photos[idx];
  const hasSrc = !!photo.src;

  /* ── Navigation ─────────────────────────────────────────────── */

  const prev = useCallback(() => {
    setLoaded(false);
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setLoaded(false);
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  /* ── URL sync ───────────────────────────────────────────────── */

  useEffect(() => {
    setSearchParams({ photo: String(idx + 1) }, { replace: true });
    return () => setSearchParams({}, { replace: true });
  }, [idx, setSearchParams]);

  /* ── Focus trap & return focus ───────────────────────────────── */

  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    containerRef.current?.focus();
    return () => {
      triggerRef.current?.focus();
    };
  }, []);

  /* ── Keyboard ───────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  /* ── Body scroll lock ───────────────────────────────────────── */

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* ── Preload neighbors ──────────────────────────────────────── */

  useEffect(() => {
    [-1, 1].forEach((offset) => {
      const p = photos[(idx + offset + photos.length) % photos.length];
      if (p.src) {
        const img = new Image();
        img.src = p.src;
      }
    });
  }, [idx, photos]);

  /* ── EXIF ───────────────────────────────────────────────────── */

  const exifItems = [
    { label: "Lens",     value: photo.lens },
    { label: "Aperture", value: photo.aperture },
    { label: "Shutter",  value: photo.shutter },
    { label: "ISO",      value: String(photo.iso) },
  ];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-sumi/98 outline-none backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
        touchStartX.current = null;
      }}
    >
      {/* ── Main area: image + info panel ───────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Photo */}
        <div className="relative flex flex-1 items-center justify-center p-4 md:p-10" onClick={onClose}>
          {/* Close */}
          <button
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Close lightbox"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Spinner */}
          {hasSrc && !loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson/30 border-t-crimson" />
            </div>
          )}

          {/* Image or placeholder */}
          {hasSrc ? (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.title}
              onLoad={() => setLoaded(true)}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
              className={`max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div
              className="flex aspect-[3/2] w-full max-w-2xl items-center justify-center rounded"
              style={{
                background: `linear-gradient(135deg, hsl(${280 + idx * 30}, 30%, 14%) 0%, hsl(${320 + idx * 20}, 25%, 20%) 100%)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-jp text-2xl text-gold/30">{toKanji(idx + 1)}</span>
            </div>
          )}

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous photo"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-14 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink md:right-4"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next photo"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* ── Info panel ──────────────────────────────────────── */}
        <aside
          className="shrink-0 overflow-y-auto border-t border-hairline bg-card/60 md:w-80 md:border-l md:border-t-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-hairline px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/70">
              Frame {toKanji(idx + 1)} &middot; {event.location}
            </p>
          </div>

          <div className="border-b border-hairline px-5 py-4">
            <h2 className="font-display text-lg font-bold text-ink/90">{photo.title}</h2>
            <KatanaDivider active className="my-3 w-16" />
            {photo.story && <p className="text-sm leading-7 text-muted">{photo.story}</p>}
          </div>

          <div className="px-5 py-4">
            <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.3em] text-faint">EXIF Data</p>
            <div className="grid grid-cols-2 gap-px border border-hairline">
              {exifItems.map(({ label, value }) => (
                <div key={label} className="bg-sumi/50 px-3 py-2.5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">{label}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink/70">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 pb-4">
            <p className="font-mono text-[9px] text-faint/60">← → navigate · Esc close</p>
          </div>
        </aside>
      </div>

      {/* ── Filmstrip ─────────────────────────────────────────── */}
      {photos.length > 1 && (
        <div
          className="flex shrink-0 gap-1 overflow-x-auto border-t border-hairline bg-sumi/80 p-2 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => { setLoaded(false); setIdx(i); }}
              className={`h-14 w-14 shrink-0 overflow-hidden transition-all duration-200 ${
                i === idx
                  ? "scale-110 opacity-100 ring-2 ring-crimson ring-offset-1 ring-offset-sumi"
                  : "opacity-40 hover:opacity-70"
              }`}
              aria-label={`Go to ${p.title}`}
            >
              {p.src ? (
                <img src={p.src} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${280 + i * 30}, 30%, 14%), hsl(${320 + i * 20}, 25%, 20%))`,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
