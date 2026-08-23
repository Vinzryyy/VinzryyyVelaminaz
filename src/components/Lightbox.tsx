import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { Photo, Event } from "@/lib/types";
import { toKanji } from "@/lib/data";
import { KatanaDivider } from "./KatanaDivider";
import { ResponsiveImg } from "./ResponsiveImg";
import { useZoomPan, MIN_ZOOM, MAX_ZOOM } from "@/lib/useZoomPan";

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
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();

  const photo = photos[idx];
  const hasSrc = !!photo.src;

  const { zoom, offset, dragging, imgRef, isZoomed, didDrag, zoomTo, toggleZoom, reset, handlers } =
    useZoomPan(idx);

  /* ── Navigation ─────────────────────────────────────────────── */

  const prev = useCallback(() => {
    setLoaded(false);
    reset();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length, reset]);

  const next = useCallback(() => {
    setLoaded(false);
    reset();
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length, reset]);

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
      // Esc backs out of zoom before it closes the whole lightbox
      if (e.key === "Escape") { if (isZoomed) reset(); else onClose(); }
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Home") setIdx(0);
      if (e.key === "End") setIdx(photos.length - 1);
      if (e.key === "+" || e.key === "=") zoomTo(zoom + 0.5);
      if (e.key === "-" || e.key === "_") zoomTo(zoom - 0.5);
      if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next, isZoomed, reset, zoom, zoomTo, photos.length]);

  /* ── Focus trap ──────────────────────────────────────────────── */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onTab);
    return () => container.removeEventListener("keydown", onTab);
  }, [idx]);

  /* ── Body scroll lock ───────────────────────────────────────── */

  useEffect(() => {
    // iOS Safari needs position:fixed to truly prevent background scroll
    const scrollY = window.scrollY;
    document.body.classList.add("body-locked");
    document.body.style.top = `-${scrollY}px`;
    return () => {
      document.body.classList.remove("body-locked");
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
    };
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

  /* ── Auto-scroll filmstrip to active thumbnail ──────────────── */

  useEffect(() => {
    const active = filmstripRef.current?.querySelector('[aria-current="true"]');
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [idx]);

  /* ── EXIF ───────────────────────────────────────────────────── */

  const exifItems = [
    photo.lens     != null ? { label: "Lens",     value: photo.lens }            : null,
    photo.aperture != null ? { label: "Aperture", value: photo.aperture }        : null,
    photo.shutter  != null ? { label: "Shutter",  value: photo.shutter }         : null,
    photo.iso      != null ? { label: "ISO",      value: String(photo.iso) }     : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-sumi/98 outline-none backdrop-blur-sm"
      onClick={() => { if (!didDrag()) onClose(); }}
      onTouchStart={(e) => {
        // While zoomed the same gesture means "pan", so don't arm a swipe
        touchStartX.current = isZoomed || e.touches.length > 1 ? null : e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || isZoomed) { touchStartX.current = null; return; }
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
        touchStartX.current = null;
      }}
    >
      {/* ── Progress bar ───────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-30 h-0.5 bg-ink/10" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-crimson to-gold transition-[width] duration-300 ease-out"
          style={{ width: `${((idx + 1) / photos.length) * 100}%` }}
        />
      </div>

      {/* ── Main area: image + info panel ───────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Photo */}
        <div
          className="relative flex min-h-[50vh] flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 md:p-10"
          onClick={() => { if (!didDrag()) onClose(); }}
        >
          {/* Frame counter */}
          <p
            className="absolute left-4 top-4 z-20 font-mono text-[11px] tracking-[0.2em] text-muted md:left-10 md:top-8"
            aria-live="polite"
          >
            {String(idx + 1).padStart(2, "0")}
            <span className="text-faint"> / {String(photos.length).padStart(2, "0")}</span>
          </p>

          {/* Zoom controls */}
          <div
            className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-ink/10 bg-sumi/80 px-1 py-1 backdrop-blur-sm md:bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => zoomTo(zoom - 0.5)}
              disabled={zoom <= MIN_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              aria-label="Zoom out"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M5 12h14" />
              </svg>
            </button>
            <button
              onClick={reset}
              className="min-w-[3.25rem] rounded-full px-2 font-mono text-[10px] text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => zoomTo(zoom + 0.5)}
              disabled={zoom >= MAX_ZOOM}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
              aria-label="Zoom in"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

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
            <ResponsiveImg
              ref={imgRef}
              key={photo.src}
              src={photo.src!}
              alt={photo.title}
              width={photo.width}
              height={photo.height}
              onLoad={() => setLoaded(true)}
              onClick={(e) => {
                e.stopPropagation();
                if (!didDrag()) toggleZoom({ clientX: e.clientX, clientY: e.clientY });
              }}
              onDoubleClick={(e) => e.preventDefault()}
              decoding="async"
              draggable={false}
              sizes="100vw"
              {...handlers}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
                transition: dragging
                  ? "opacity 0.2s ease"
                  : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease",
                cursor: isZoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
                touchAction: "none",
                willChange: "transform",
              }}
              className={`max-h-full max-w-full select-none object-contain shadow-2xl ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div
              className="flex aspect-[3/2] w-full max-w-2xl items-center justify-center rounded"
              style={{
                background: `linear-gradient(135deg, hsl(${280 + idx * 30}, 30%, 14%) 0%, hsl(${320 + idx * 20}, 25%, 20%) 100%)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-jp text-2xl text-gold/30" lang="ja" aria-hidden="true">{toKanji(idx + 1)}</span>
            </div>
          )}

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink sm:left-4 sm:h-10 sm:w-10"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous photo"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-muted transition-colors duration-200 hover:bg-ink/10 hover:text-ink sm:right-14 sm:h-10 sm:w-10 md:right-4"
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
          className="shrink-0 border-t border-hairline bg-card/60 md:w-80 md:overflow-y-auto md:border-l md:border-t-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-hairline px-4 py-2.5 sm:px-5 sm:py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/70">
              Frame <span lang="ja">{toKanji(idx + 1)}</span> &middot; {event.location}
            </p>
          </div>

          <div className="border-b border-hairline px-4 py-2.5 sm:px-5 sm:py-4">
            <h2 className="font-display text-base font-bold text-ink/90 sm:text-lg">{photo.title}</h2>
            <KatanaDivider active className="my-2 w-16 sm:my-3" />
            {photo.story && <p className="text-sm leading-6 text-muted sm:leading-7">{photo.story}</p>}
          </div>

          {exifItems.length > 0 && (
            <div className="px-4 py-2.5 sm:px-5 sm:py-4">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.3em] text-faint sm:mb-3">EXIF Data</p>
              <div className="grid grid-cols-2 gap-px border border-hairline sm:grid-cols-2">
                {exifItems.map(({ label, value }) => (
                  <div key={label} className="bg-sumi/50 px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint">{label}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink/70">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 pb-2.5 sm:px-5 sm:pb-4">
            <p className="hidden font-mono text-[9px] leading-5 text-faint/60 md:block">
              ← → navigate · click or scroll to zoom · drag to pan<br />
              + − 0 zoom · Home / End jump · Esc close
            </p>
            <p className="font-mono text-[9px] leading-5 text-faint/60 md:hidden">
              Swipe to navigate · tap to zoom · pinch to scale · drag to pan
            </p>
          </div>
        </aside>
      </div>

      {/* ── Filmstrip ─────────────────────────────────────────── */}
      {photos.length > 1 && (
        <div
          ref={filmstripRef}
          className="flex shrink-0 gap-1 overflow-x-auto border-t border-hairline bg-sumi/80 p-1.5 backdrop-blur-sm sm:p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => { setLoaded(false); setIdx(i); }}
              className={`h-11 w-11 shrink-0 overflow-hidden transition-all duration-200 sm:h-14 sm:w-14 ${
                i === idx
                  ? "scale-110 opacity-100 ring-2 ring-crimson ring-offset-1 ring-offset-sumi"
                  : "opacity-40 hover:opacity-70"
              }`}
              aria-label={`Go to ${p.title}`}
              aria-current={i === idx ? "true" : undefined}
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
