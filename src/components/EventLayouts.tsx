import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

/* ── Polaroid Scatter ────────────────────────────────────────────── */

export function PolaroidLayout({ photos, onOpen }: LayoutProps) {
  const angles = useMemo(
    () => photos.map((_, i) => ((i * 37 + 13) % 25) - 12),
    [photos.length], // eslint-disable-line
  );
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap justify-center gap-6 px-4 py-8">
      {photos.map((p, i) => (
        <button
          key={i}
          className={`group relative transition-transform duration-300 hover:!rotate-0 hover:scale-110 hover:z-10 ${active === i ? "!rotate-0 scale-110 z-10" : ""}`}
          style={{ transform: active === i ? "rotate(0deg) scale(1.1)" : `rotate(${angles[i]}deg)` }}
          onClick={() => { if (active === i) onOpen(i); else setActive(i); }}
        >
          <div className="rounded bg-white p-2 pb-10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="h-40 w-36 overflow-hidden sm:h-48 sm:w-44">
              {p.src ? (
                <img src={p.src} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full" style={{ background: placeholder(i) }} />
              )}
            </div>
          </div>
          <p className="absolute bottom-2 left-0 w-full text-center font-display text-[10px] italic text-sumi/60">
            {p.title}
          </p>
        </button>
      ))}
    </div>
  );
}

/* ── Honeycomb / Hexagon ─────────────────────────────────────────── */

export function HoneycombLayout({ photos, onOpen }: LayoutProps) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex flex-wrap justify-center gap-2 px-4 py-6">
      {photos.map((p, i) => {
        const isOddRow = Math.floor(i / 4) % 2 === 1;
        return (
          <button
            key={i}
            className={`group relative overflow-hidden transition-transform duration-300 hover:scale-110 hover:z-10 ${active === i ? "scale-110 z-10" : ""}`}
            style={{
              width: "130px",
              height: "150px",
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              marginLeft: isOddRow && i % 4 === 0 ? "68px" : undefined,
              marginTop: i >= 4 ? "-20px" : undefined,
            }}
            onClick={() => { if (active === i) onOpen(i); else setActive(i); }}
          >
            {p.src ? (
              <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            ) : (
              <div className="h-full w-full" style={{ background: placeholder(i) }} />
            )}
            <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-colors ${active === i ? "bg-black/40" : "bg-black/0 group-hover:bg-black/40"}`}>
              <span className={`font-display text-xs font-bold text-white transition-opacity ${active === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>{p.title}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Diagonal Slices ─────────────────────────────────────────────── */

export function DiagonalLayout({ photos, onOpen }: LayoutProps) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="flex h-[500px] overflow-hidden">
      {photos.map((p, i) => (
        <button
          key={i}
          className={`group relative overflow-hidden transition-all duration-500 ${active === i ? "flex-[3]" : "flex-1 hover:flex-[3]"}`}
          style={{
            clipPath: "polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)",
            marginLeft: i > 0 ? "-4%" : undefined,
          }}
          onClick={() => { if (active === i) onOpen(i); else setActive(i); }}
        >
          {p.src ? (
            <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="h-full w-full" style={{ background: placeholder(i) }} />
          )}
          <div className="pointer-events-none absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/10" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center opacity-0 transition-opacity group-hover:opacity-100">
            <p className="whitespace-nowrap font-display text-sm font-bold text-white">{p.title}</p>
            <p className="font-jp text-xs text-gold/60" lang="ja">{toKanji(i + 1)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Split Screen Scroll ─────────────────────────────────────────── */

export function SplitScrollLayout({ photos, onOpen }: LayoutProps) {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const panels = container.querySelectorAll<HTMLElement>("[data-panel]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-panel"));
            if (!isNaN(idx)) setActive(idx);
          }
        });
      },
      { root: container, threshold: 0.6 },
    );
    panels.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [photos.length]);

  const photo = photos[active];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 md:h-[600px]">
      {/* Left: sticky photo */}
      <div className="sticky top-0 flex h-[300px] items-center justify-center bg-sumi md:h-full">
        <button className="relative h-full w-full overflow-hidden" onClick={() => onOpen(active)}>
          {photo?.src ? (
            <img src={photo.src} alt={photo.title} className="h-full w-full object-cover transition-opacity duration-500" />
          ) : (
            <div className="h-full w-full" style={{ background: placeholder(active) }} />
          )}
          <span className="absolute left-4 top-4 font-jp text-sm text-gold/50" lang="ja">{toKanji(active + 1)}</span>
        </button>
      </div>

      {/* Right: scrollable panels */}
      <div ref={containerRef} className="h-[400px] overflow-y-auto md:h-full">
        {photos.map((p, i) => (
          <div
            key={i}
            data-panel={i}
            className={`cursor-pointer border-b border-hairline p-6 transition-colors ${
              i === active ? "bg-card/60" : "bg-transparent hover:bg-card/30"
            }`}
            onClick={() => setActive(i)}
          >
            <p className="font-mono text-[9px] uppercase tracking-widest text-sakura/60">Frame {i + 1}</p>
            <h4 className="mt-1 font-display text-base font-bold text-ink">{p.title}</h4>
            {p.story && <p className="mt-2 text-sm leading-6 text-muted">{p.story}</p>}
            <p className="mt-2 font-mono text-[9px] text-faint">
              {[p.lens, p.aperture, p.shutter, p.iso ? `ISO ${p.iso}` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Carousel / Slider ───────────────────────────────────────────── */

export function CarouselLayout({ photos, onOpen }: LayoutProps) {
  const [idx, setIdx] = useState(0);
  const photo = photos[idx];
  const timerRef = useRef<number>();

  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    timerRef.current = window.setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [next]);

  const pause = () => clearInterval(timerRef.current);
  const resume = () => { timerRef.current = window.setInterval(next, 5000); };

  if (!photo) return null;

  return (
    <div className="space-y-4" onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={resume}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-hairline bg-card">
        <button className="h-full w-full" onClick={() => onOpen(idx)}>
          {photo.src ? (
            <img key={photo.src} src={photo.src} alt={photo.title} className="h-full w-full object-cover animate-[hero-fade_0.5s_ease-in-out]" />
          ) : (
            <div className="h-full w-full" style={{ background: placeholder(idx) }} />
          )}
        </button>

        <button onClick={prev} className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-sumi/60 text-ink backdrop-blur-sm hover:bg-sumi/90">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={next} className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-sumi/60 text-ink backdrop-blur-sm hover:bg-sumi/90">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
        </button>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
          <p className="font-display text-base font-bold text-white">{photo.title}</p>
          <p className="font-mono text-[10px] text-white/50">{[photo.lens, photo.aperture].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {photos.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-crimson" : "w-2 bg-faint hover:bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}

/* ── Stacked Cards ───────────────────────────────────────────────── */

export function StackedLayout({ photos, onOpen }: LayoutProps) {
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative h-[400px] w-[300px] sm:h-[480px] sm:w-[360px]">
        {[2, 1, 0].map((offset) => {
          const i = (idx + offset) % photos.length;
          const p = photos[i];
          const isTop = offset === 0;
          return (
            <button
              key={`${idx}-${offset}`}
              className="absolute inset-0 overflow-hidden rounded-xl border border-hairline bg-card shadow-[0_8px_40px_rgba(0,0,0,0.4)] transition-all duration-500"
              style={{
                transform: `translateY(${offset * -12}px) scale(${1 - offset * 0.05})`,
                zIndex: 3 - offset,
                opacity: offset === 2 ? 0.3 : offset === 1 ? 0.6 : 1,
              }}
              onClick={() => { if (isTop) onOpen(i); else next(); }}
            >
              {p.src ? (
                <img src={p.src} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-full w-full" style={{ background: placeholder(i) }} />
              )}
              {isTop && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                  <p className="font-display text-lg font-bold text-white">{p.title}</p>
                  {p.story && <p className="mt-1 text-sm text-white/50 line-clamp-2">{p.story}</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)} className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted hover:text-ink">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-mono text-sm text-muted">{idx + 1} / {photos.length}</span>
        <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted hover:text-ink">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Mosaic ───────────────────────────────────────────────────────── */

export function MosaicLayout({ photos, onOpen }: LayoutProps) {
  const patterns = [
    "col-span-2 row-span-2",
    "col-span-1 row-span-1",
    "col-span-1 row-span-1",
    "col-span-1 row-span-2",
    "col-span-2 row-span-1",
    "col-span-1 row-span-1",
  ];

  return (
    <div className="grid auto-rows-[140px] grid-cols-4 gap-1 sm:auto-rows-[180px]">
      {photos.map((p, i) => {
        const pattern = patterns[i % patterns.length];
        return (
          <button key={i} className={`group relative overflow-hidden border border-hairline bg-card ${pattern}`} onClick={() => onOpen(i)}>
            {p.src ? (
              <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
            ) : (
              <div className="h-full w-full" style={{ background: placeholder(i) }} />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <span className="absolute left-2 top-2 font-jp text-xs text-gold/40" lang="ja">{toKanji(i + 1)}</span>
            <span className="absolute bottom-2 left-2 font-display text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">{p.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Infinite Scroll (parallax grid) ─────────────────────────────── */

export function InfiniteLayout({ photos, onOpen }: LayoutProps) {
  const [visible, setVisible] = useState(6);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible((v) => Math.min(v + 6, photos.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [photos.length]);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
        {photos.slice(0, visible).map((p, i) => {
          const speed = i % 3 === 0 ? "translate-y-0" : i % 3 === 1 ? "-translate-y-2" : "translate-y-2";
          return (
            <button key={i} className={`group relative overflow-hidden border border-hairline bg-card transition-transform duration-700 ${speed}`} onClick={() => onOpen(i)}>
              <div className="aspect-[4/5]">
                {p.src ? (
                  <img src={p.src} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" loading="lazy" />
                ) : (
                  <div className="h-full w-full" style={{ background: placeholder(i) }} />
                )}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-3 left-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="font-display text-sm font-bold text-white">{p.title}</p>
                <p className="font-mono text-[9px] text-white/40">{[p.lens, p.aperture].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="absolute left-2 top-2 font-jp text-xs text-gold/30" lang="ja">{toKanji(i + 1)}</span>
            </button>
          );
        })}
      </div>

      {visible < photos.length && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-crimson/30 border-t-crimson" />
        </div>
      )}

      {visible >= photos.length && photos.length > 6 && (
        <p className="py-4 text-center font-mono text-[10px] text-faint">All {photos.length} frames loaded</p>
      )}
    </div>
  );
}
