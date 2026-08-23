import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Photo, SequenceDisplay } from "@/lib/types";
import { toKanji } from "@/lib/data";
import { PhotoFrame } from "./PhotoFrame";

/* ── Sequence detection ──────────────────────────────────────────
 *
 * A photo's sequence group is determined by:
 *   1. An explicit `sequence` field (set via admin), OR
 *   2. Auto-detection from the title prefix before a trailing
 *      roman numeral / number (e.g. "Cole I" → "Cole").
 * ──────────────────────────────────────────────────────────────── */

const ROMAN = /\s+(?:[IVXLCDM]+|\d+)$/;

function sequenceKey(photo: Photo): string | null {
  if (photo.sequence) return photo.sequence;
  const m = photo.title.match(ROMAN);
  return m ? photo.title.slice(0, m.index!).trim() : null;
}

/* ── Segment types ───────────────────────────────────────────────
 *
 * The photo list is split into segments:
 *   "grid"      — normal grid rows (triple / breather / double)
 *   "sequence"  — a group rendered as filmstrip / stack / slideshow / collage
 * ──────────────────────────────────────────────────────────────── */

type IndexedPhoto = { photo: Photo; globalIdx: number };

type Segment =
  | { type: "grid"; photos: IndexedPhoto[] }
  | { type: "sequence"; display: SequenceDisplay; label: string; photos: IndexedPhoto[] };

function buildSegments(photos: Photo[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  const pushGrid = (item: IndexedPhoto) => {
    const last = segments[segments.length - 1];
    if (last?.type === "grid") last.photos.push(item);
    else segments.push({ type: "grid", photos: [item] });
  };

  while (i < photos.length) {
    const key = sequenceKey(photos[i]);

    if (key) {
      const strip: IndexedPhoto[] = [];
      while (i < photos.length && sequenceKey(photos[i]) === key) {
        strip.push({ photo: photos[i], globalIdx: i });
        i++;
      }
      if (strip.length >= 2) {
        const display = strip[0].photo.sequenceDisplay ?? "filmstrip";
        segments.push({ type: "sequence", display, label: key, photos: strip });
      } else {
        pushGrid(strip[0]);
      }
    } else {
      pushGrid({ photo: photos[i], globalIdx: i });
      i++;
    }
  }

  return segments;
}

/* ── Row-planning logic (for grid segments) ────────────────────── */

type RowType = "triple" | "breather" | "double";
interface PlannedRow { type: RowType; count: number; }

function planRows(totalPhotos: number): PlannedRow[] {
  const rows: PlannedRow[] = [];
  let remaining = totalPhotos;
  let rowNum = 0;

  while (remaining > 0) {
    if (remaining <= 2) {
      rows.push(remaining === 1 ? { type: "breather", count: 1 } : { type: "double", count: 2 });
      remaining = 0;
    } else if (rowNum > 0 && rowNum % 4 === 3 && remaining > 3) {
      rows.push({ type: "breather", count: 1 });
      remaining -= 1;
    } else {
      rows.push({ type: "triple", count: 3 });
      remaining -= 3;
    }
    rowNum++;
  }

  return rows;
}

const ASPECT: Record<RowType, string> = {
  triple:   "aspect-[4/3] sm:aspect-[3/2]",
  double:   "aspect-[4/3] sm:aspect-[3/2]",
  breather: "aspect-video sm:aspect-[21/9]",
};

const GRID_CLS: Record<RowType, string> = {
  triple:   "grid-cols-1 sm:grid-cols-3",
  double:   "grid-cols-1 sm:grid-cols-2",
  breather: "grid-cols-1",
};

/* ── Grid rows renderer ──────────────────────────────────────────── */

function GridRows({
  items,
  onOpen,
}: {
  items: IndexedPhoto[];
  onOpen: (index: number) => void;
}) {
  const planned = planRows(items.length);
  let offset = 0;

  return (
    <>
      {planned.map((row, ri) => {
        const slice = items.slice(offset, offset + row.count);
        offset += row.count;
        return (
          <div key={ri} className={`grid gap-1 ${GRID_CLS[row.type]}`}>
            {slice.map(({ photo, globalIdx }) => (
              <div key={globalIdx} className="reveal">
                <PhotoFrame
                  photo={photo}
                  index={globalIdx}
                  aspectClass={ASPECT[row.type]}
                  onClick={() => onOpen(globalIdx)}
                />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

/* ── Sequence label ──────────────────────────────────────────────── */

function SequenceLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="font-jp text-xs text-gold/50" lang="ja" aria-hidden="true">連</span>
      <span className="font-display text-sm font-semibold text-ink/70">{label}</span>
      <div className="h-px flex-1 bg-hairline" />
      <span className="font-mono text-[10px] text-faint">{count} frames</span>
    </div>
  );
}

/* ── 1. Stack — best shot with "1/6" badge ───────────────────────── */

function StackView({
  items,
  label,
  onOpen,
}: {
  items: IndexedPhoto[];
  label: string;
  onOpen: (index: number) => void;
}) {
  const best = items[0];
  return (
    <div className="reveal space-y-2 py-3">
      <SequenceLabel label={label} count={items.length} />
      <div className="grid gap-1 grid-cols-1 sm:grid-cols-3">
        <div className="relative">
          <PhotoFrame
            photo={best.photo}
            index={best.globalIdx}
            aspectClass="aspect-[4/3] sm:aspect-[3/2]"
            onClick={() => onOpen(best.globalIdx)}
          />
          {/* Stack badge */}
          <div className="absolute left-2.5 bottom-2.5 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-sumi/80 px-2.5 py-1 backdrop-blur-sm">
            <svg className="h-3 w-3 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="font-mono text-[10px] font-semibold text-ink/80">
              1/{items.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Filmstrip — horizontal scroll ────────────────────────────── */

function FilmstripView({
  items,
  label,
  onOpen,
}: {
  items: IndexedPhoto[];
  label: string;
  onOpen: (index: number) => void;
}) {
  return (
    <div className="reveal space-y-2 py-3">
      <SequenceLabel label={label} count={items.length} />
      <div className="filmstrip -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
        {items.map(({ photo, globalIdx }) => (
          <div key={globalIdx} className="w-56 flex-none sm:w-64 md:w-72">
            <PhotoFrame
              photo={photo}
              index={globalIdx}
              aspectClass="aspect-[3/4]"
              onClick={() => onOpen(globalIdx)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 3. Auto-slideshow — crossfading single cell ─────────────────── */

function SlideshowView({
  items,
  label,
  onOpen,
}: {
  items: IndexedPhoto[];
  label: string;
  onOpen: (index: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  const advance = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    timerRef.current = window.setInterval(advance, 3000);
    return () => clearInterval(timerRef.current);
  }, [advance]);

  const cur = items[current];

  return (
    <div className="reveal space-y-2 py-3">
      <SequenceLabel label={label} count={items.length} />
      <div className="grid gap-1 grid-cols-1 sm:grid-cols-3">
        <button
          className="photo-frame group relative w-full cursor-pointer overflow-hidden border border-hairline bg-card p-0 text-left aspect-[4/3] sm:aspect-[3/2]"
          onClick={() => onOpen(cur.globalIdx)}
          aria-label={`View ${label} sequence`}
        >
          {/* All images stacked, current visible */}
          {items.map(({ photo, globalIdx }, idx) => (
            photo.src && (
              <img
                key={globalIdx}
                src={photo.src}
                alt={photo.title}
                decoding="async"
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
                  idx === current ? "opacity-100" : "opacity-0"
                }`}
              />
            )
          ))}

          {/* Kanji frame number */}
          <span className="absolute left-2.5 top-2.5 z-10 font-jp text-xs text-gold/60" aria-hidden="true" lang="ja">
            {toKanji(cur.globalIdx + 1)}
          </span>

          {/* Counter + progress dots */}
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-2">
            <span className="rounded-full border border-white/20 bg-sumi/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-ink/80 backdrop-blur-sm">
              {current + 1}/{items.length}
            </span>
            <div className="flex gap-1">
              {items.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 w-1 rounded-full transition-colors duration-300 ${
                    idx === current ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Hover veil */}
          <div className="frame-veil pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-sumi/85 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300" aria-hidden="true">
            <h4 className="font-display text-sm font-semibold text-ink">{cur.photo.title}</h4>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ── 4. Collage — mosaic of up to 6 shots ────────────────────────── */

function CollageView({
  items,
  label,
  onOpen,
}: {
  items: IndexedPhoto[];
  label: string;
  onOpen: (index: number) => void;
}) {
  // Layout: first image large, rest smaller in a grid beside/below it
  const hero = items[0];
  const rest = items.slice(1, 5); // max 4 supporting images
  const overflow = items.length > 5 ? items.length - 5 : 0;

  return (
    <div className="reveal space-y-2 py-3">
      <SequenceLabel label={label} count={items.length} />
      <div className="grid gap-1 grid-cols-2 sm:grid-cols-4 sm:grid-rows-2" style={{ gridAutoRows: "1fr" }}>
        {/* Hero — spans 2 cols and 2 rows */}
        <div className="relative col-span-2 row-span-2">
          <PhotoFrame
            photo={hero.photo}
            index={hero.globalIdx}
            aspectClass="aspect-square"
            onClick={() => onOpen(hero.globalIdx)}
          />
        </div>

        {/* Supporting images */}
        {rest.map(({ photo, globalIdx }, idx) => (
          <div key={globalIdx} className="relative">
            <PhotoFrame
              photo={photo}
              index={globalIdx}
              aspectClass="aspect-square"
              onClick={() => onOpen(globalIdx)}
            />
            {/* Overflow badge on last visible tile */}
            {idx === rest.length - 1 && overflow > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="font-display text-2xl font-bold text-white">
                  +{overflow}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main PhotoGrid ──────────────────────────────────────────────── */

export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => buildSegments(photos), [photos]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "40px" },
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [photos]);

  return (
    <div ref={ref} className="space-y-1">
      {segments.map((seg, si) => {
        if (seg.type === "grid") {
          return <GridRows key={si} items={seg.photos} onOpen={onOpen} />;
        }

        switch (seg.display) {
          case "stack":
            return <StackView key={si} items={seg.photos} label={seg.label} onOpen={onOpen} />;
          case "slideshow":
            return <SlideshowView key={si} items={seg.photos} label={seg.label} onOpen={onOpen} />;
          case "collage":
            return <CollageView key={si} items={seg.photos} label={seg.label} onOpen={onOpen} />;
          case "filmstrip":
          default:
            return <FilmstripView key={si} items={seg.photos} label={seg.label} onOpen={onOpen} />;
        }
      })}
    </div>
  );
}
