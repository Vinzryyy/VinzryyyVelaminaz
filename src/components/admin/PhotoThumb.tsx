import type { Photo } from "@/lib/types";

/* ── PhotoThumb ──────────────────────────────────────────────────── */

export function PhotoThumb({
  photo, index, dropTarget,
  onDragStart, onDragOver, onDrop, onDragEnd, onDelete,
  className,
}: {
  photo: Photo; index: number; dropTarget: number | null;
  onDragStart: (i: number) => (e: React.DragEvent) => void;
  onDragOver: (i: number) => (e: React.DragEvent) => void;
  onDrop: (i: number) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDelete: (i: number) => void;
  className: string;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart(index)}
      onDragOver={onDragOver(index)}
      onDrop={onDrop(index)}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab overflow-hidden rounded-sm bg-card transition-all active:cursor-grabbing ${className} ${
        dropTarget === index ? "ring-2 ring-crimson scale-105" : ""
      }`}
      title={`${photo.title || `Photo ${index + 1}`} — drag to reorder`}
    >
      {photo.src ? (
        <img src={photo.src} alt="" className="h-full w-full object-cover pointer-events-none" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-faint/20 font-mono text-[8px] text-muted">{index + 1}</div>
      )}
      <span className="absolute left-0.5 top-0.5 rounded bg-sumi/70 px-1 py-0.5 font-mono text-[7px] text-ink/60 backdrop-blur-sm">{index + 1}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(index); }}
        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded bg-sumi/70 text-[8px] text-ink/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-crimson hover:text-white"
      >&times;</button>
    </div>
  );
}
