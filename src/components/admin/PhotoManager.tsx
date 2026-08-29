import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadBatch } from "@/lib/ghUpload";
import type { Event, Photo } from "@/lib/types";
import { deepClone, emptyPhoto } from "@/components/admin/adminHelpers";
import { batchDescribePhotos, autoTagPhotos, suggestCover, autoGroupSequences, arrangePhotos, getProvider } from "@/lib/aiGenerate";

/* ── Sequence Colors ─────────────────────────────────────────────── */

const SEQ_COLORS: Record<string, string> = {};
const PALETTE = ["bg-crimson/20 text-crimson", "bg-sakura/20 text-sakura", "bg-gold/20 text-gold", "bg-sky-500/20 text-sky-400", "bg-emerald-500/20 text-emerald-400", "bg-violet-500/20 text-violet-400"];
function seqColor(name: string): string {
  if (!SEQ_COLORS[name]) SEQ_COLORS[name] = PALETTE[Object.keys(SEQ_COLORS).length % PALETTE.length];
  return SEQ_COLORS[name];
}

/* ── PhotoField ──────────────────────────────────────────────────── */

function PhotoField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
        />
      )}
    </label>
  );
}

/* ── Photo Manager ───────────────────────────────────────────────── */

export function PhotoManager({
  event,
  onChange,
  onCoverChange,
  onAutoPublish,
}: {
  event: Event;
  onChange: (photos: Photo[]) => void;
  onCoverChange: (cover: string) => void;
  onAutoPublish?: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() => deepClone(event.photos));
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupDisplay, setGroupDisplay] = useState<Photo["sequenceDisplay"]>("filmstrip");

  // Reset when switching events
  const slugRef = useRef(event.slug);
  useEffect(() => {
    if (event.slug !== slugRef.current) {
      slugRef.current = event.slug;
      setPhotos(deepClone(event.photos));
      setEditIdx(null);
      setSelected(new Set());
    }
  }, [event.slug]); // eslint-disable-line -- only reset on slug change

  // Commit helper — updates local state, then notifies parent after render
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pendingPhotos = useRef<Photo[] | null>(null);

  const commit = useCallback((next: Photo[] | ((prev: Photo[]) => Photo[])) => {
    setPhotos((prev) => {
      const result = typeof next === "function" ? next(prev) : next;
      pendingPhotos.current = result;
      return result;
    });
    setFlushTick((t) => t + 1);
  }, []);

  // Flush to parent after commit — runs once per commit cycle
  const [flushTick, setFlushTick] = useState(0);
  useEffect(() => {
    if (pendingPhotos.current !== null) {
      onChangeRef.current(pendingPhotos.current);
      pendingPhotos.current = null;
    }
  }, [flushTick]);

  const save = () => onChange(photos);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  // AI batch describe
  const [aiDescribing, setAiDescribing] = useState(false);

  const handleBatchDescribe = async () => {
    if (photos.length === 0) return;
    setAiDescribing(true);
    try {
      const results = await batchDescribePhotos({
        title: event.title,
        group: event.group || "",
        date: event.date || "",
        location: event.location || "",
        gear: event.gear || "",
        photoCount: photos.length,
        photos: photos.map((p) => ({ title: p.title, sequence: p.sequence, src: p.src })),
      });
      commit((prev) => {
        const next = [...prev];
        for (const r of results) {
          if (r.index >= 0 && r.index < next.length) {
            next[r.index] = { ...next[r.index], title: r.title, story: r.story };
          }
        }
        return next;
      });
      setUploading(`Generated stories for ${results.length} photos`);
      setTimeout(() => setUploading(null), 4000);
    } catch (err) {
      setUploading(`AI failed: ${err instanceof Error ? err.message : "unknown error"}`);
      setTimeout(() => setUploading(null), 6000);
    } finally {
      setAiDescribing(false);
    }
  };

  // AI Vision: Auto-tag
  const [aiVision, setAiVision] = useState<string | null>(null);

  const handleAutoTag = async () => {
    const withSrc = photos.map((p, i) => ({ src: p.src || "", title: p.title, index: i })).filter((p) => p.src);
    if (withSrc.length === 0) return;
    setAiVision("Analyzing photos...");
    try {
      const tags = await autoTagPhotos({
        title: event.title, group: event.group || "", date: event.date || "",
        location: event.location || "", gear: event.gear || "", photoCount: photos.length,
        photos: withSrc,
      });
      commit((prev) => {
        const next = [...prev];
        for (const t of tags) {
          if (t.index >= 0 && t.index < next.length) {
            const existing = next[t.index].story || "";
            const tagLine = `[${t.tags.join(", ")}]`;
            next[t.index] = { ...next[t.index], story: existing ? `${existing}\n${tagLine}` : tagLine };
          }
        }
        return next;
      });
      setAiVision(`Tagged ${tags.length} photos`);
    } catch (err) {
      setAiVision(`Tag failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setTimeout(() => setAiVision(null), 5000);
  };

  // AI Vision: Suggest cover
  const handleSuggestCover = async () => {
    const withSrc = photos.map((p, i) => ({ src: p.src || "", title: p.title, index: i })).filter((p) => p.src);
    if (withSrc.length === 0) return;
    setAiVision("Picking best cover...");
    try {
      const pick = await suggestCover({
        title: event.title, group: event.group || "", date: event.date || "",
        location: event.location || "", gear: event.gear || "", photoCount: photos.length,
        photos: withSrc,
      });
      const photo = photos[pick];
      if (photo?.src) {
        onCoverChange(photo.src);
        setAiVision(`Cover set: #${pick + 1} "${photo.title}"`);
      } else {
        setAiVision("AI picked an invalid photo — try again");
      }
    } catch (err) {
      setAiVision(`Cover suggest failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setTimeout(() => setAiVision(null), 5000);
  };

  // AI Vision: Auto-group sequences
  const handleAutoGroup = async () => {
    const withSrc = photos.map((p, i) => ({ src: p.src || "", title: p.title, index: i })).filter((p) => p.src);
    if (withSrc.length < 3) return;
    setAiVision("Detecting sequences...");
    try {
      const groups = await autoGroupSequences({
        title: event.title, group: event.group || "", date: event.date || "",
        location: event.location || "", gear: event.gear || "", photoCount: photos.length,
        photos: withSrc,
      });
      if (groups.length === 0) {
        setAiVision("No sequences detected");
      } else {
        commit((prev) => {
          const next = [...prev];
          for (const g of groups) {
            for (const idx of g.indices) {
              if (idx >= 0 && idx < next.length) {
                next[idx] = { ...next[idx], sequence: g.name, sequenceDisplay: "filmstrip" };
              }
            }
          }
          return next;
        });
        setAiVision(`Created ${groups.length} sequence(s): ${groups.map((g) => g.name).join(", ")}`);
      }
    } catch (err) {
      setAiVision(`Grouping failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
    setTimeout(() => setAiVision(null), 6000);
  };

  // Arrange: sequences first, then regular photos
  const handleArrange = () => {
    const order = arrangePhotos(photos);
    commit(order.map((i) => photos[i]));
    setUploading("Arranged: sequences first, then regular photos");
    setTimeout(() => setUploading(null), 3000);
  };

  const addEmpty = () => {
    const newIdx = photos.length;
    commit((p) => [...p, emptyPhoto()]);
    setEditIdx(newIdx);
  };

  const addFromFiles = async (files: FileList | File[]) => {
    // Accept files with image MIME type OR common image extensions (iOS may not set MIME type)
    const imageExts = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp|svg)$/i;
    const imageFiles = [...files].filter((f) => f.type.startsWith("image/") || imageExts.test(f.name) || !f.type);
    if (imageFiles.length === 0) return;

    setUploading(`Converting & uploading ${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""}...`);
    try {
      const { successful, failed } = await uploadBatch(
        imageFiles,
        `gallery/${event.slug}`,
        (done, total, name) => setUploading(`Uploading ${done}/${total} — ${name}`),
      );
      if (successful.length > 0) {
        const existingCount = photos.length;
        const newPhotos = successful.map((r, i) => ({
          title: `${event.title} (${existingCount + i + 1})`,
          story: "",
          src: r.url,
          width: r.width,
          height: r.height,
        }));
        commit((p) => [...p, ...newPhotos]);
        onAutoPublish?.();
      }
      const msg = `Added ${successful.length} photo${successful.length !== 1 ? "s" : ""}`;
      setUploading(failed.length > 0 ? `${msg} · ${failed.length} failed: ${failed[0].error}` : msg);
    } catch (err) {
      setUploading(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setTimeout(() => setUploading(null), 10000);
  };

  const remove = (idx: number) => {
    commit((p) => p.filter((_, i) => i !== idx));
    // Fix selected indices — shift down indices above deleted
    setSelected((s) => {
      const next = new Set<number>();
      for (const i of s) {
        if (i < idx) next.add(i);
        else if (i > idx) next.add(i - 1);
      }
      return next;
    });
    setEditIdx((prev) => {
      if (prev === null) return null;
      if (prev === idx) return null;
      return prev > idx ? prev - 1 : prev;
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    commit((p) => {
      const next = [...p];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setEditIdx(target);
  };

  const updatePhoto = (idx: number, patch: Partial<Photo>) => {
    commit((p) => p.map((ph, i) => (i === idx ? { ...ph, ...patch } : ph)));
  };

  const toggleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(photos.map((_, i) => i)));
  const clearSelection = () => setSelected(new Set());

  const groupSelected = () => {
    if (!groupName.trim() || selected.size === 0) return;
    const name = groupName.trim();
    // Count how many photos already have this sequence name
    let counter = photos.filter((p) => p.sequence === name).length;
    commit((p) => p.map((ph, i) => {
      if (!selected.has(i)) return ph;
      counter++;
      return { ...ph, title: `${name} (${counter})`, sequence: name, sequenceDisplay: groupDisplay };
    }));
    setSelected(new Set());
    setGroupName("");
  };

  const ungroupSelected = () => {
    commit((p) => p.map((ph, i) =>
      selected.has(i) ? { ...ph, sequence: undefined, sequenceDisplay: undefined } : ph
    ));
    setSelected(new Set());
  };

  // Existing sequences
  const sequences = useMemo(() => {
    const map = new Map<string, { display: Photo["sequenceDisplay"]; indices: number[] }>();
    photos.forEach((p, i) => {
      if (p.sequence) {
        const existing = map.get(p.sequence);
        if (existing) existing.indices.push(i);
        else map.set(p.sequence, { display: p.sequenceDisplay, indices: [i] });
      }
    });
    return map;
  }, [photos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          Photos: {event.title}
          <span className="ml-3 font-mono text-sm font-normal text-muted">{photos.length} photos</span>
        </h2>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="font-mono text-xs text-crimson">{uploading}</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={(e) => { if (e.target.files?.length) addFromFiles(e.target.files); e.target.value = ""; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploading}
            className="rounded-lg bg-crimson px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80 disabled:opacity-50"
          >
            + Add Photo
          </button>
          <button onClick={addEmpty} className="rounded-lg border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-crimson/30 hover:text-crimson">
            + Empty
          </button>
          <button
            onClick={handleBatchDescribe}
            disabled={aiDescribing || photos.length === 0}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
            title={`Generate titles & stories for all photos via ${getProvider()}`}
          >
            {aiDescribing ? "Describing..." : "AI Describe"}
          </button>
          <button onClick={save} className="rounded-lg border border-crimson bg-transparent px-4 py-2 font-mono text-xs font-semibold text-crimson transition-colors hover:bg-crimson/10">
            Save All
          </button>
        </div>
      </div>

      {/* AI Vision toolbar */}
      {photos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-400/20 bg-violet-400/5 p-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-violet-400/60">AI Vision</span>
          <div className="h-4 w-px bg-hairline" />
          <button
            onClick={handleAutoTag}
            disabled={!!aiVision}
            className="rounded border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 font-mono text-[10px] text-violet-400 transition-colors hover:bg-violet-400/20 disabled:opacity-50"
          >
            {aiVision?.startsWith("Analyzing") ? "Tagging..." : "Auto-tag"}
          </button>
          <button
            onClick={handleSuggestCover}
            disabled={!!aiVision}
            className="rounded border border-gold/30 bg-gold/10 px-3 py-1.5 font-mono text-[10px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
          >
            {aiVision?.startsWith("Picking") ? "Picking..." : "Suggest Cover"}
          </button>
          <button
            onClick={handleAutoGroup}
            disabled={!!aiVision || photos.length < 3}
            className="rounded border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 font-mono text-[10px] text-sky-400 transition-colors hover:bg-sky-400/20 disabled:opacity-50"
          >
            {aiVision?.startsWith("Detecting") ? "Grouping..." : "Auto-group"}
          </button>
          <div className="h-4 w-px bg-hairline" />
          <button
            onClick={handleArrange}
            className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-crimson/30 hover:text-crimson"
          >
            Arrange (strips first)
          </button>
          {aiVision && (
            <span className="font-mono text-[10px] text-violet-400">{aiVision}</span>
          )}
          <span className="ml-auto font-mono text-[9px] text-faint">via {getProvider()}</span>
        </div>
      )}

      {/* Existing sequences overview */}
      {sequences.size > 0 && (
        <div className="rounded-lg border border-hairline bg-card/40 p-4">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">Sequences</h3>
          <div className="space-y-2">
            {[...sequences.entries()].map(([name, { display, indices }]) => (
              <div key={name} className={`flex items-center gap-2 rounded-lg border border-hairline bg-sumi/50 px-3 py-2`}>
                {/* Select all in group */}
                <button
                  onClick={() => setSelected(new Set(indices))}
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs ${seqColor(name)}`}
                  title="Select all photos in this group"
                >
                  {name}
                  <span className="ml-1.5 opacity-60">{indices.length}</span>
                </button>

                {/* Rename */}
                <input
                  type="text"
                  defaultValue={name}
                  onBlur={(e) => {
                    const newName = e.target.value.trim();
                    if (newName && newName !== name) {
                      commit((p) => p.map((ph) =>
                        ph.sequence === name ? { ...ph, sequence: newName } : ph
                      ));
                    }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="min-w-0 flex-1 rounded border border-hairline bg-transparent px-2 py-1 font-mono text-xs text-ink outline-none focus:border-crimson/50"
                  title="Rename sequence"
                />

                {/* Display mode */}
                <select
                  value={display ?? "filmstrip"}
                  onChange={(e) => {
                    const newDisplay = e.target.value as Photo["sequenceDisplay"];
                    commit((p) => p.map((ph) =>
                      ph.sequence === name ? { ...ph, sequenceDisplay: newDisplay } : ph
                    ));
                  }}
                  className="rounded border border-hairline bg-transparent px-2 py-1 font-mono text-[10px] text-ink outline-none focus:border-crimson/50"
                  title="Change display mode"
                >
                  <option value="filmstrip">═ Filmstrip</option>
                  <option value="stack">⊞ Stack</option>
                  <option value="slideshow">▶ Slideshow</option>
                  <option value="collage">⊟ Collage</option>
                </select>

                {/* Delete sequence (ungroup all) */}
                <button
                  onClick={() => {
                    if (confirm(`Remove sequence "${name}"? Photos will be ungrouped.`)) {
                      commit((p) => p.map((ph) =>
                        ph.sequence === name ? { ...ph, sequence: undefined, sequenceDisplay: undefined } : ph
                      ));
                    }
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-crimson/10 hover:text-crimson"
                  title="Delete sequence"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 rounded-lg border border-crimson/30 bg-card p-4 shadow-lg">
          <span className="font-mono text-xs text-ink">
            <span className="font-semibold text-crimson">{selected.size}</span> selected
          </span>
          <div className="h-5 w-px bg-hairline" />

          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name..."
            className="w-36 rounded border border-hairline bg-sumi px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-crimson/50"
          />
          <select
            value={groupDisplay ?? "filmstrip"}
            onChange={(e) => setGroupDisplay(e.target.value as Photo["sequenceDisplay"])}
            className="rounded border border-hairline bg-sumi px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-crimson/50"
          >
            <option value="filmstrip">═ Filmstrip</option>
            <option value="stack">⊞ Stack</option>
            <option value="slideshow">▶ Slideshow</option>
            <option value="collage">⊟ Collage</option>
          </select>
          <button
            onClick={groupSelected}
            disabled={!groupName.trim() || selected.size === 0}
            className="rounded bg-crimson px-3 py-1.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80 disabled:opacity-30"
          >
            Group
          </button>
          <button
            onClick={ungroupSelected}
            className="rounded border border-hairline px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-crimson/30 hover:text-crimson"
          >
            Ungroup
          </button>
          <div className="flex-1" />
          <button onClick={selectAll} className="font-mono text-[10px] text-muted hover:text-ink">Select all</button>
          <button onClick={clearSelection} className="font-mono text-[10px] text-muted hover:text-ink">Clear</button>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className={`group relative cursor-pointer rounded-lg border bg-card/50 p-2 transition-all ${
              selected.has(idx)
                ? "border-crimson ring-2 ring-crimson/30"
                : editIdx === idx
                  ? "border-crimson/50 ring-1 ring-crimson/20"
                  : "border-hairline hover:border-hairline/80"
            }`}
            onClick={() => setEditIdx(editIdx === idx ? null : idx)}
          >
            {/* Selection checkbox */}
            <button
              onClick={(e) => toggleSelect(idx, e)}
              className={`absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded border backdrop-blur-sm transition-all ${
                selected.has(idx)
                  ? "border-crimson bg-crimson text-white"
                  : "border-white/30 bg-sumi/60 text-transparent hover:border-white/50"
              }`}
            >
              {selected.has(idx) && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {photo.src ? (
              <img src={photo.src} alt={photo.title} className="aspect-[3/2] w-full rounded object-cover" />
            ) : (
              <div className="flex aspect-[3/2] w-full items-center justify-center rounded bg-faint/20 font-mono text-xs text-muted">
                No image
              </div>
            )}
            <div className="mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{photo.title || "Untitled"}</p>
                {photo.sequence && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] ${seqColor(photo.sequence)}`}>
                    {photo.sequence}
                    <span className="ml-1 text-[7px] opacity-60">
                      {photo.sequenceDisplay === "stack" ? "⊞" : photo.sequenceDisplay === "slideshow" ? "▶" : photo.sequenceDisplay === "collage" ? "⊟" : "═"}
                    </span>
                  </span>
                )}
              </div>
              <p className="truncate font-mono text-[9px] text-muted">
                {[photo.lens, photo.aperture].filter(Boolean).join(" · ") || "No EXIF"}
              </p>
            </div>

            {/* Cover badge */}
            {photo.src && (event.cover === photo.src || (!event.cover && idx === 0)) && (
              <div className="absolute right-1 bottom-1 rounded bg-gold/90 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase text-sumi">
                Cover
              </div>
            )}

            {/* Quick actions */}
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {photo.src && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCoverChange(photo.src!); }}
                  className="flex h-6 w-6 items-center justify-center rounded bg-sumi/80 text-xs text-ink backdrop-blur-sm hover:bg-gold hover:text-sumi"
                  title="Set as cover"
                >
                  ★
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); move(idx, -1); }}
                className="flex h-6 w-6 items-center justify-center rounded bg-sumi/80 text-xs text-ink backdrop-blur-sm hover:bg-crimson hover:text-white"
                title="Move left"
              >
                &larr;
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); move(idx, 1); }}
                className="flex h-6 w-6 items-center justify-center rounded bg-sumi/80 text-xs text-ink backdrop-blur-sm hover:bg-crimson hover:text-white"
                title="Move right"
              >
                &rarr;
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${photo.title}"?`)) remove(idx);
                }}
                className="flex h-6 w-6 items-center justify-center rounded bg-sumi/80 text-xs text-ink backdrop-blur-sm hover:bg-crimson hover:text-white"
                title="Delete"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline photo editor */}
      {editIdx !== null && photos[editIdx] && (
        <div className="rounded-lg border border-crimson/20 bg-card/40 p-6">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">
            Edit Photo #{editIdx + 1}: {photos[editIdx].title || "Untitled"}
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <PhotoField label="Title" value={photos[editIdx].title} onChange={(v) => updatePhoto(editIdx, { title: v })} />
              <PhotoField label="Src" value={photos[editIdx].src ?? ""} onChange={(v) => updatePhoto(editIdx, { src: v })} />
            </div>
            <PhotoField label="Story" value={photos[editIdx].story} onChange={(v) => updatePhoto(editIdx, { story: v })} textarea />
            <div className="flex gap-3">
              <PhotoField label="Sequence Group" value={photos[editIdx].sequence ?? ""} onChange={(v) => updatePhoto(editIdx, { sequence: v || undefined })} />
              <label className="block flex-1">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Display Mode</span>
                <select
                  value={photos[editIdx].sequenceDisplay ?? "filmstrip"}
                  onChange={(e) => updatePhoto(editIdx, { sequenceDisplay: (e.target.value as Photo["sequenceDisplay"]) || undefined })}
                  className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
                >
                  <option value="filmstrip">Filmstrip (horizontal scroll)</option>
                  <option value="stack">Stack (best shot + badge)</option>
                  <option value="slideshow">Slideshow (auto-crossfade)</option>
                  <option value="collage">Collage (mosaic grid)</option>
                </select>
              </label>
            </div>
            <div className="flex gap-3">
              <PhotoField label="Lens" value={photos[editIdx].lens ?? ""} onChange={(v) => updatePhoto(editIdx, { lens: v })} />
              <PhotoField label="Aperture" value={photos[editIdx].aperture ?? ""} onChange={(v) => updatePhoto(editIdx, { aperture: v })} />
              <PhotoField label="Shutter" value={photos[editIdx].shutter ?? ""} onChange={(v) => updatePhoto(editIdx, { shutter: v })} />
              <PhotoField label="ISO" value={String(photos[editIdx].iso ?? "")} onChange={(v) => updatePhoto(editIdx, { iso: v ? Number(v) : undefined })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
