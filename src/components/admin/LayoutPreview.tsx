import type { Photo } from "@/lib/types";
import { PhotoThumb } from "@/components/admin/PhotoThumb";

/* ── Layout Preview (mini version of each layout for editor) ──────── */

export function LayoutPreview({
  layout, photos, dropTarget,
  onReorderDragStart, onReorderDragOver, onReorderDrop, onReorderDragEnd, onDeletePhoto,
}: {
  layout: string;
  photos: Photo[];
  dropTarget: number | null;
  onReorderDragStart: (i: number) => (e: React.DragEvent) => void;
  onReorderDragOver: (i: number) => (e: React.DragEvent) => void;
  onReorderDrop: (i: number) => (e: React.DragEvent) => void;
  onReorderDragEnd: () => void;
  onDeletePhoto: (i: number) => void;
}) {
  if (photos.length === 0) return null;

  const thumbProps = { dropTarget, onDragStart: onReorderDragStart, onDragOver: onReorderDragOver, onDrop: onReorderDrop, onDragEnd: onReorderDragEnd, onDelete: onDeletePhoto };

  switch (layout) {
    case "magazine":
      return (
        <div className="space-y-1">
          <div className="grid gap-1 grid-cols-2">
            {photos[0] && <PhotoThumb photo={photos[0]} index={0} {...thumbProps} className="aspect-[4/3] col-span-1 row-span-2" />}
            {photos.slice(1, 3).map((p, i) => (
              <PhotoThumb key={i + 1} photo={p} index={i + 1} {...thumbProps} className="aspect-[3/2]" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {photos.slice(3).map((p, i) => (
              <PhotoThumb key={i + 3} photo={p} index={i + 3} {...thumbProps} className="aspect-square" />
            ))}
          </div>
        </div>
      );

    case "filmstrip":
      return (
        <div className="filmstrip flex gap-1 overflow-x-auto pb-2">
          {photos.map((p, i) => (
            <PhotoThumb key={i} photo={p} index={i} {...thumbProps} className="aspect-[2/3] w-20 flex-none" />
          ))}
        </div>
      );

    case "masonry": {
      const cols: { photo: Photo; idx: number }[][] = [[], [], []];
      photos.forEach((p, i) => cols[i % 3].push({ photo: p, idx: i }));
      return (
        <div className="grid grid-cols-3 gap-1">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map(({ photo, idx }) => (
                <PhotoThumb key={idx} photo={photo} index={idx} {...thumbProps}
                  className={idx % 3 === 0 ? "aspect-[3/4]" : idx % 3 === 1 ? "aspect-square" : "aspect-[4/3]"} />
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "spotlight":
      return (
        <div className="space-y-2">
          {photos[0] && <PhotoThumb photo={photos[0]} index={0} {...thumbProps} className="aspect-[3/2] w-full" />}
          <div className="flex gap-1 overflow-x-auto">
            {photos.map((p, i) => (
              <PhotoThumb key={i} photo={p} index={i} {...thumbProps} className="h-12 w-12 flex-none" />
            ))}
          </div>
        </div>
      );

    case "fullbleed":
      return (
        <div className="space-y-1">
          {photos.map((p, i) => (
            <PhotoThumb key={i} photo={p} index={i} {...thumbProps} className="aspect-[21/9] w-full" />
          ))}
        </div>
      );

    case "timeline":
      return (
        <div className="relative ml-4 border-l-2 border-hairline pl-4">
          {photos.map((p, i) => (
            <div key={i} className="relative mb-2 last:mb-0">
              <div className="absolute -left-[calc(1rem+5px)] top-2 h-2 w-2 rounded-full border-2 border-crimson bg-sumi" />
              <PhotoThumb photo={p} index={i} {...thumbProps} className="aspect-[16/9] w-full" />
            </div>
          ))}
        </div>
      );

    case "polaroid":
      return (
        <div className="flex flex-wrap justify-center gap-3 py-4">
          {photos.map((p, i) => (
            <div key={i} style={{ transform: `rotate(${((i * 37 + 13) % 25) - 12}deg)` }} className="rounded bg-white p-1 pb-4 shadow-md">
              <PhotoThumb photo={p} index={i} {...thumbProps} className="h-16 w-14" />
            </div>
          ))}
        </div>
      );

    case "honeycomb":
      return (
        <div className="flex flex-wrap justify-center gap-1 py-4">
          {photos.map((p, i) => (
            <div key={i} style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
              <PhotoThumb photo={p} index={i} {...thumbProps} className="h-16 w-14" />
            </div>
          ))}
        </div>
      );

    case "diagonal":
      return (
        <div className="flex h-32 overflow-hidden">
          {photos.map((p, i) => (
            <div key={i} className="flex-1" style={{ clipPath: "polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)", marginLeft: i > 0 ? "-4%" : undefined }}>
              <PhotoThumb photo={p} index={i} {...thumbProps} className="h-full w-full" />
            </div>
          ))}
        </div>
      );

    case "splitscroll":
      return (
        <div className="grid grid-cols-2 gap-1">
          {photos[0] && <PhotoThumb photo={photos[0]} index={0} {...thumbProps} className="aspect-square row-span-3" />}
          {photos.slice(1, 4).map((p, i) => (
            <PhotoThumb key={i + 1} photo={p} index={i + 1} {...thumbProps} className="aspect-[3/1]" />
          ))}
        </div>
      );

    case "carousel":
      return (
        <div className="space-y-1">
          {photos[0] && <PhotoThumb photo={photos[0]} index={0} {...thumbProps} className="aspect-[16/9] w-full" />}
          <div className="flex justify-center gap-1">
            {photos.slice(0, 8).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-crimson" : "w-1.5 bg-faint"}`} />
            ))}
          </div>
        </div>
      );

    case "stacked":
      return (
        <div className="relative mx-auto h-32 w-24">
          {photos.slice(0, 3).map((p, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `translateY(${(2 - i) * -6}px) scale(${1 - (2 - i) * 0.05})`, zIndex: i, opacity: i === 2 ? 1 : i === 1 ? 0.6 : 0.3 }}>
              <PhotoThumb photo={p} index={i} {...thumbProps} className="h-full w-full rounded-lg" />
            </div>
          ))}
        </div>
      );

    case "mosaic": {
      const mPatterns = ["col-span-2 row-span-2", "", "", "row-span-2", "col-span-2", ""];
      return (
        <div className="grid auto-rows-[40px] grid-cols-4 gap-1">
          {photos.slice(0, 6).map((p, i) => (
            <div key={i} className={mPatterns[i % 6]}>
              <PhotoThumb photo={p} index={i} {...thumbProps} className="h-full w-full" />
            </div>
          ))}
        </div>
      );
    }

    case "infinite":
      return (
        <div className="grid grid-cols-3 gap-1">
          {photos.slice(0, 9).map((p, i) => (
            <PhotoThumb key={i} photo={p} index={i} {...thumbProps} className="aspect-[4/5]" />
          ))}
          {photos.length > 9 && (
            <div className="col-span-3 py-2 text-center font-mono text-[8px] text-faint">+{photos.length - 9} more (lazy loaded)</div>
          )}
        </div>
      );

    default: // classic
      return (
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 md:grid-cols-6">
          {photos.map((p, i) => (
            <PhotoThumb key={i} photo={p} index={i} {...thumbProps} className="aspect-square" />
          ))}
        </div>
      );
  }
}
