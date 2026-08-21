import { useEffect, useMemo, useRef } from "react";
import type { Photo } from "@/lib/types";
import { PhotoFrame } from "./PhotoFrame";

/* ── Row-planning logic ───────────────────────────────────────────
 *
 * Calm, deliberate rhythm: mostly rows of 3, with an occasional
 * full-width "breather" every ~4 rows. Last row evened out.
 *
 * Row types:
 *   triple   — 3 photos at 3:2
 *   breather — 1 full-width photo at 21:9
 *   double   — 2 photos at 3:2 (tail only)
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

const ASPECT: Record<RowType, string> = {
  triple:   "aspect-[3/2]",
  double:   "aspect-[3/2]",
  breather: "aspect-[21/9]",
};

const GRID: Record<RowType, string> = {
  triple:   "grid-cols-1 sm:grid-cols-3",
  double:   "grid-cols-1 sm:grid-cols-2",
  breather: "grid-cols-1",
};

export function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: Photo[];
  onOpen: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

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

  const layoutRows = useMemo(() => {
    const planned = planRows(photos.length);
    return planned.reduce<Array<PlannedRow & { startIdx: number }>>((acc, row) => {
      const prevEnd = acc.length > 0 ? acc[acc.length - 1].startIdx + acc[acc.length - 1].count : 0;
      acc.push({ ...row, startIdx: prevEnd });
      return acc;
    }, []);
  }, [photos]);

  return (
    <div ref={ref} className="space-y-1">
      {layoutRows.map((row, ri) => (
        <div key={ri} className={`grid gap-1 ${GRID[row.type]}`}>
          {photos.slice(row.startIdx, row.startIdx + row.count).map((photo, i) => {
            const globalIdx = row.startIdx + i;
            return (
              <div key={globalIdx} className="reveal">
                <PhotoFrame
                  photo={photo}
                  index={globalIdx}
                  aspectClass={ASPECT[row.type]}
                  onClick={() => onOpen(globalIdx)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
