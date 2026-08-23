import { useEffect, useMemo, useRef } from "react";
import type { Photo } from "@/lib/types";
import { PhotoFrame } from "./PhotoFrame";

/* ── Sequence detection ──────────────────────────────────────────
 *
 * Photos whose titles share a name prefix followed by a roman
 * numeral or number (e.g. "Cole I", "Cole II", "Feni IX") are
 * grouped into a filmstrip row.  Mixed titles like "Mashiro & Cole"
 * or "Full Squad" stay in the normal grid.
 * ──────────────────────────────────────────────────────────────── */

const ROMAN = /\s+(?:[IVXLCDM]+|\d+)$/;

function sequenceKey(title: string): string | null {
  const m = title.match(ROMAN);
  return m ? title.slice(0, m.index!).trim() : null;
}

/* ── Segment types ───────────────────────────────────────────────
 *
 * The photo list is split into segments:
 *   "grid"     — normal grid rows (triple / breather / double)
 *   "filmstrip" — horizontally scrollable sequence
 * ──────────────────────────────────────────────────────────────── */

type Segment =
  | { type: "grid"; photos: { photo: Photo; globalIdx: number }[] }
  | { type: "filmstrip"; label: string; photos: { photo: Photo; globalIdx: number }[] };

function buildSegments(photos: Photo[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < photos.length) {
    const key = sequenceKey(photos[i].title);

    if (key) {
      // Collect consecutive photos with the same sequence key
      const strip: { photo: Photo; globalIdx: number }[] = [];
      while (i < photos.length && sequenceKey(photos[i].title) === key) {
        strip.push({ photo: photos[i], globalIdx: i });
        i++;
      }
      if (strip.length >= 2) {
        segments.push({ type: "filmstrip", label: key, photos: strip });
      } else {
        // Single photo — just put it in the grid
        const last = segments[segments.length - 1];
        if (last?.type === "grid") {
          last.photos.push(...strip);
        } else {
          segments.push({ type: "grid", photos: strip });
        }
      }
    } else {
      const item = { photo: photos[i], globalIdx: i };
      const last = segments[segments.length - 1];
      if (last?.type === "grid") {
        last.photos.push(item);
      } else {
        segments.push({ type: "grid", photos: [item] });
      }
      i++;
    }
  }

  return segments;
}

/* ── Row-planning logic (for grid segments) ──────────────────────
 *
 * Calm, deliberate rhythm: mostly rows of 3, with an occasional
 * full-width "breather" every ~4 rows. Last row evened out.
 * ──────────────────────────────────────────────────────────────── */

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

/* Mobile gets friendlier ratios; multi-column keeps the designed rhythm */
const ASPECT: Record<RowType, string> = {
  triple:   "aspect-[4/3] sm:aspect-[3/2]",
  double:   "aspect-[4/3] sm:aspect-[3/2]",
  breather: "aspect-video sm:aspect-[21/9]",
};

const GRID: Record<RowType, string> = {
  triple:   "grid-cols-1 sm:grid-cols-3",
  double:   "grid-cols-1 sm:grid-cols-2",
  breather: "grid-cols-1",
};

function GridRows({
  items,
  onOpen,
}: {
  items: { photo: Photo; globalIdx: number }[];
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
          <div key={ri} className={`grid gap-1 ${GRID[row.type]}`}>
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
      { threshold: 0.08, rootMargin: "40px" }
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [photos]);

  return (
    <div ref={ref} className="space-y-1">
      {segments.map((seg, si) =>
        seg.type === "grid" ? (
          <GridRows key={si} items={seg.photos} onOpen={onOpen} />
        ) : (
          <div key={si} className="reveal space-y-2 py-3">
            {/* Filmstrip label */}
            <div className="flex items-center gap-3 px-1">
              <span className="font-jp text-xs text-gold/50" lang="ja" aria-hidden="true">連</span>
              <span className="font-display text-sm font-semibold text-ink/70">{seg.label}</span>
              <div className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[10px] text-faint">{seg.photos.length} frames</span>
            </div>

            {/* Horizontal scrollable filmstrip */}
            <div className="filmstrip -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:-mx-10 md:px-10">
              {seg.photos.map(({ photo, globalIdx }) => (
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
        )
      )}
    </div>
  );
}
