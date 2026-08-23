import { useState, useEffect, useRef, useCallback } from "react";
import type { Photo } from "@/lib/types";
import { toKanji, placeholder } from "@/lib/data";

/**
 * Alternate event page photo layouts.
 * Each accepts the same props so EventPage can swap them based on event.layout.
 */

export interface LayoutProps {
  photos: Photo[];
  onOpen: (index: number) => void;
}

/* ── Magazine: 4-col grid, first photo large ─────────────────────── */

export function MagazineLayout({ photos, onOpen }: LayoutProps) {
  if (photos.length === 0) return null;
  const hero = photos[0];
  const rest = photos.slice(1);

  return (
    <div className="space-y-1">
      {/* Hero row */}
      <div className="grid gap-1 md:grid-cols-[1.5fr_1fr] md:grid-rows-2">
        <button
          className="group relative aspect-[4/3] overflow-hidden border border-hairline bg-card md:row-span-2 md:aspect-auto"
          onClick={() => onOpen(0)}
        >
          {hero.src ? (
            <img src={hero.src} alt={hero.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="eager" />
          ) : (
            <div className="h-full w-full" style={{ background: placeholder(0) }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="absolute bottom-3 left-3 font-display text-sm font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">{hero.title}</span>
        </button>
        {rest.slice(0, 2).map((p, i) => (
          <button
            key={i + 1}
            className="group relative aspect-[3/2] overflow-hidden border border-hairline bg-card"
            onClick={() => onOpen(i + 1)}
          >
            {p.src ? (
              <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="eager" />
            ) : (
              <div className="h-full w-full" style={{ background: placeholder(i + 1) }} />
            )}
          </button>
        ))}
      </div>
      {/* 4-col grid for rest */}
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
        {rest.slice(2).map((p, i) => {
          const idx = i + 3;
          return (
            <button
              key={idx}
              className="group relative aspect-square overflow-hidden border border-hairline bg-card"
              onClick={() => onOpen(idx)}
            >
              {p.src ? (
                <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
              ) : (
                <div className="h-full w-full" style={{ background: placeholder(idx) }} />
              )}
              <span className="absolute left-2 top-2 font-jp text-xs text-gold/50" lang="ja">{toKanji(idx + 1)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Filmstrip: horizontal scrollable ────────────────────────────── */

export function FilmstripLayout({ photos, onOpen }: LayoutProps) {
  return (
    <div className="space-y-4">
      <div className="filmstrip -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
        {photos.map((p, i) => (
          <button
            key={i}
            className="group relative w-72 flex-none overflow-hidden rounded border border-hairline bg-card sm:w-80 md:w-96"
            onClick={() => onOpen(i)}
          >
            <div className="aspect-[2/3]">
              {p.src ? (
                <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
              ) : (
                <div className="h-full w-full" style={{ background: placeholder(i) }} />
              )}
            </div>
            <div className="p-3">
              <p className="font-display text-sm font-semibold text-ink">{p.title}</p>
              <p className="mt-1 font-mono text-[9px] text-muted">
                {[p.lens, p.aperture, p.shutter].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className="absolute left-2 top-2 rounded bg-sumi/70 px-1.5 py-0.5 font-jp text-xs text-gold/60 backdrop-blur-sm" lang="ja">{toKanji(i + 1)}</span>
          </button>
        ))}
      </div>
      <p className="text-center font-mono text-[10px] text-faint">← scroll to browse {photos.length} frames →</p>
    </div>
  );
}

/* ── Masonry: staggered heights ──────────────────────────────────── */

export function MasonryLayout({ photos, onOpen }: LayoutProps) {
  // Distribute into 3 columns
  const cols: { photo: Photo; idx: number }[][] = [[], [], []];
  photos.forEach((photo, idx) => {
    cols[idx % 3].push({ photo, idx });
  });

  return (
    <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map(({ photo, idx }) => {
            // Alternate aspect ratios for masonry effect
            const aspect = idx % 3 === 0 ? "aspect-[3/4]" : idx % 3 === 1 ? "aspect-square" : "aspect-[4/3]";
            return (
              <button
                key={idx}
                className={`group relative overflow-hidden border border-hairline bg-card ${aspect}`}
                onClick={() => onOpen(idx)}
              >
                {photo.src ? (
                  <img src={photo.src} alt={photo.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                ) : (
                  <div className="h-full w-full" style={{ background: placeholder(idx) }} />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="absolute bottom-2 left-2 font-display text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">{photo.title}</span>
                <span className="absolute left-2 top-2 font-jp text-xs text-gold/40" lang="ja">{toKanji(idx + 1)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Spotlight: one large photo + thumbnail strip ────────────────── */

export function SpotlightLayout({ photos, onOpen }: LayoutProps) {
  const [active, setActive] = useState(0);
  const photo = photos[active];
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stripRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  if (!photo) return null;

  return (
    <div className="space-y-4">
      {/* Main photo */}
      <button
        className="group relative mx-auto block aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-lg border border-hairline bg-card"
        onClick={() => onOpen(active)}
      >
        {photo.src ? (
          <img src={photo.src} alt={photo.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: placeholder(active) }} />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
          <h4 className="font-display text-lg font-bold text-white">{photo.title}</h4>
          {photo.story && <p className="mt-1 max-w-lg text-sm text-white/60">{photo.story}</p>}
          <p className="mt-2 font-mono text-[10px] text-white/40">
            {[photo.lens, photo.aperture, photo.shutter, photo.iso ? `ISO ${photo.iso}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>

      {/* Thumbnail strip */}
      <div ref={stripRef} className="filmstrip flex gap-1 overflow-x-auto px-4 pb-2">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-16 w-16 flex-none overflow-hidden rounded transition-all sm:h-20 sm:w-20 ${
              i === active ? "ring-2 ring-crimson scale-110" : "opacity-50 hover:opacity-80"
            }`}
          >
            {p.src ? (
              <img src={p.src} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full" style={{ background: placeholder(i) }} />
            )}
          </button>
        ))}
      </div>

      <p className="text-center font-mono text-[10px] text-faint">
        {active + 1} / {photos.length}
      </p>
    </div>
  );
}

/* ── Full-bleed: each photo takes full width ─────────────────────── */

export function FullbleedLayout({ photos, onOpen }: LayoutProps) {
  return (
    <div className="space-y-1">
      {photos.map((p, i) => (
        <button
          key={i}
          className="group relative block w-full overflow-hidden border border-hairline bg-card"
          onClick={() => onOpen(i)}
        >
          <div className="aspect-[21/9]">
            {p.src ? (
              <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" loading="lazy" />
            ) : (
              <div className="h-full w-full" style={{ background: placeholder(i) }} />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-4 left-5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="font-jp text-xs text-gold/60 mr-3" lang="ja">{toKanji(i + 1)}</span>
            <span className="font-display text-sm font-bold text-white">{p.title}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Timeline: vertical line with photos + stories ───────────────── */

export function TimelineLayout({ photos, onOpen }: LayoutProps) {
  return (
    <div className="relative ml-6 border-l-2 border-hairline pl-8 md:ml-12 md:pl-12">
      {photos.map((p, i) => (
        <div key={i} className="relative mb-10 last:mb-0">
          {/* Dot on timeline */}
          <div className="absolute -left-[calc(2rem+5px)] top-4 h-2.5 w-2.5 rounded-full border-2 border-crimson bg-sumi md:-left-[calc(3rem+5px)]" />

          {/* Kanji number */}
          <span className="absolute -left-[calc(2rem+28px)] top-3 font-jp text-xs text-gold/40 md:-left-[calc(3rem+28px)]" lang="ja">{toKanji(i + 1)}</span>

          {/* Photo + info */}
          <button
            className="group relative w-full overflow-hidden rounded-lg border border-hairline bg-card text-left"
            onClick={() => onOpen(i)}
          >
            <div className="aspect-[16/9]">
              {p.src ? (
                <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
              ) : (
                <div className="h-full w-full" style={{ background: placeholder(i) }} />
              )}
            </div>
            <div className="p-4">
              <h4 className="font-display text-sm font-bold text-ink">{p.title}</h4>
              {p.story && <p className="mt-1 text-sm leading-6 text-muted">{p.story}</p>}
              <p className="mt-2 font-mono text-[9px] text-faint">
                {[p.lens, p.aperture, p.shutter, p.iso ? `ISO ${p.iso}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
