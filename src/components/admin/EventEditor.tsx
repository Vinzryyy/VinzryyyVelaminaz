import { useEffect, useRef, useState } from "react";
import { uploadPhoto, uploadBatch } from "@/lib/ghUpload";
import { formatSize } from "@/lib/imageUtils";
import type { Event, Photo } from "@/lib/types";
import { deepClone, useDrop } from "@/components/admin/adminHelpers";
import { LayoutPreview } from "@/components/admin/LayoutPreview";
import { generateDescription, generateTateText, generateSEO, slugify, translateContent, getProvider, type TranslationLang } from "@/lib/aiGenerate";

/* ── Event Editor ────────────────────────────────────────────────── */

export function EventEditor({
  event,
  eventIndex = 0,
  onChange,
  onPhotosChange,
  onAutoPublish,
}: {
  event: Event;
  eventIndex?: number;
  onChange: (patch: Partial<Event>) => void;
  onPhotosChange: (photos: Photo[]) => void;
  onAutoPublish?: () => void;
}) {
  const [form, setForm] = useState<Event>(deepClone(event));

  // Sync when switching events or photos change externally
  useEffect(() => { setForm(deepClone(event)); }, [event.slug, event.photos.length]); // eslint-disable-line

  const set = <K extends keyof Event>(key: K, value: Event[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Auto-save text fields when form changes (debounced)
  const formRef = useRef(form);
  formRef.current = form;
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    saveTimer.current = setTimeout(() => {
      const { photos, ...rest } = formRef.current;
      void photos;
      onChange(rest);
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [form.title, form.slug, form.group, form.date, form.location, form.gear, form.tateText, form.cover, form.subtitle, form.description, form.featured, form.seoTitle, form.seoDescription, onChange]);

  const save = () => {
    clearTimeout(saveTimer.current);
    const { photos, ...rest } = form;
    void photos;
    onChange(rest);
  };

  const field = (label: string, key: keyof Event, opts?: { textarea?: boolean; half?: boolean }) => (
    <label className={`block ${opts?.half ? "flex-1" : ""}`}>
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {opts?.textarea ? (
        <textarea
          value={(form[key] as string) ?? ""}
          onChange={(e) => set(key, e.target.value as Event[typeof key])}
          rows={4}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none transition-colors focus:border-crimson/50"
        />
      ) : (
        <input
          type="text"
          value={(form[key] as string) ?? ""}
          onChange={(e) => set(key, e.target.value as Event[typeof key])}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none transition-colors focus:border-crimson/50"
        />
      )}
    </label>
  );

  // AI generation
  const [aiLoading, setAiLoading] = useState<string | null>(null); // tracks which action is loading
  const [aiError, setAiError] = useState<string | null>(null);

  const eventCtx = {
    title: form.title,
    group: form.group || "",
    date: form.date || "",
    location: form.location || "",
    gear: form.gear || "",
    photoCount: event.photos.length,
  };

  const runAI = async <T,>(label: string, fn: () => Promise<T>, apply: (r: T) => void) => {
    setAiLoading(label);
    setAiError(null);
    try {
      apply(await fn());
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setAiLoading(null);
    }
  };

  const handleGenerateDesc = () => runAI("description", () => generateDescription({
    ...eventCtx,
    existingSubtitle: form.subtitle || undefined,
    existingDescription: form.description || undefined,
  }), (r) => { set("subtitle", r.subtitle); set("description", r.description); });

  const handleGenerateTate = () => runAI("tate", () => generateTateText({
    ...eventCtx,
    eventIndex,
    existingTateText: form.tateText || undefined,
  }), (r) => set("tateText", r));

  const handleGenerateSEO = () => runAI("seo", () => generateSEO({
    ...eventCtx,
    subtitle: form.subtitle || undefined,
    description: form.description || undefined,
  }), (r) => { set("seoTitle", r.seoTitle); set("seoDescription", r.seoDescription); });

  const handleSlugify = () => {
    const slug = slugify(form.title);
    if (slug) set("slug", slug);
  };

  const handleTranslate = (lang: TranslationLang) => runAI(`translate-${lang}`, () => translateContent({
    subtitle: form.subtitle,
    description: form.description,
    lang,
  }), (r) => { set("subtitle", r.subtitle); set("description", r.description); });

  const coverSrc = form.cover ?? event.photos[0]?.src;

  const [converting, setConverting] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cover upload handler (shared by drag-drop and file picker)
  const uploadCover = async (files: File[]) => {
    try {
      setConverting("Converting & uploading cover...");
      const result = await uploadPhoto(files[0], `gallery/${form.slug}`);
      set("cover", result.url);
      onAutoPublish?.();
      setConverting(`Cover uploaded: ${formatSize(result.originalSize)} → ${formatSize(result.newSize)} WebP`);
    } catch (err) {
      setConverting(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setTimeout(() => setConverting(null), 3000);
  };

  const coverDrop = useDrop((files) => uploadCover(files));

  // Drop handler for photo grid — converts to WebP & uploads to Firebase
  const gridDrop = useDrop(async (files) => {
    try {
      setConverting(`Converting & uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);
      const { successful, failed } = await uploadBatch(
        files,
        `gallery/${form.slug}`,
        (done, total, name) => setConverting(`Uploading ${done}/${total} — ${name}`),
      );
      if (successful.length > 0) {
        const newPhotos = successful.map((r) => ({
          title: r.fileName.replace(/\.[^.]+$/, ""),
          story: "",
          src: r.url,
          width: r.width,
          height: r.height,
        }));
        onPhotosChange([...event.photos, ...newPhotos]);
        onAutoPublish?.();
      }
      const totalSaved = successful.reduce((n, r) => n + (r.originalSize - r.newSize), 0);
      const msg = `Added ${successful.length} photos (saved ${formatSize(totalSaved)})`;
      setConverting(failed.length > 0 ? `${msg} · ${failed.length} failed: ${failed[0].error}` : msg);
    } catch (err) {
      setConverting(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setTimeout(() => setConverting(null), 8000);
  });

  // File picker for photo grid (works on iPad unlike drag-drop)
  const gridFileRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const dragIdx = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const onReorderDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };

  const onReorderDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      setDropTarget(idx);
    }
  };

  const onReorderDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const photos = [...event.photos];
    const [moved] = photos.splice(dragIdx.current, 1);
    photos.splice(idx, 0, moved);
    dragIdx.current = null;
    onPhotosChange(photos);
  };

  const onReorderDragEnd = () => {
    dragIdx.current = null;
    setDropTarget(null);
  };

  // Editable text helper — contentEditable span that syncs back
  // Key includes slug to force React to remount when switching events
  const editable = (key: keyof Event, className: string) => (
    <span
      key={`${form.slug}-${key}`}
      contentEditable
      suppressContentEditableWarning
      className={`${className} outline-none ring-crimson/30 focus:ring-1 focus:ring-offset-1 focus:ring-offset-sumi`}
      onBlur={(e) => set(key, (e.target.textContent ?? "") as Event[typeof key])}
      dangerouslySetInnerHTML={{ __html: (form[key] as string) || "" }}
    />
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      {/* Left: Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Edit: {event.title}</h2>
          <button
            onClick={save}
            className="rounded-lg bg-crimson px-6 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80"
          >
            Save Changes
          </button>
        </div>

        <div className="rounded-lg border border-hairline bg-card/40 p-6">
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              {field("Title", "title", { half: true })}
              <div className="flex flex-1 items-end gap-1.5">
                <div className="flex-1">{field("Slug", "slug")}</div>
                <button
                  onClick={handleSlugify}
                  className="mb-0.5 shrink-0 rounded border border-violet-400/30 bg-violet-400/10 px-2.5 py-2 font-mono text-[9px] text-violet-400 transition-colors hover:bg-violet-400/20"
                  title="Auto-generate slug from title"
                >
                  Auto
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              {field("Group", "group", { half: true })}
              {field("Date", "date", { half: true })}
            </div>
            <div className="flex gap-4">
              {field("Location", "location", { half: true })}
              {field("Gear", "gear", { half: true })}
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">{field("Tate Text", "tateText")}</div>
              <button
                onClick={handleGenerateTate}
                disabled={!!aiLoading}
                className="mb-0.5 shrink-0 rounded border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 font-mono text-[9px] text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {aiLoading === "tate" ? "..." : "AI"}
              </button>
              {field("Cover URL", "cover", { half: true })}
            </div>
            {field("Subtitle", "subtitle")}
            {field("Description", "description", { textarea: true })}

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGenerateDesc}
                disabled={!!aiLoading}
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
              >
                {aiLoading === "description" ? "Generating..." : "AI Subtitle + Description"}
              </button>
              <button
                onClick={handleGenerateSEO}
                disabled={!!aiLoading}
                className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-400 transition-colors hover:bg-sky-400/20 disabled:opacity-50"
              >
                {aiLoading === "seo" ? "Generating..." : "AI SEO Meta"}
              </button>
              <div className="h-5 w-px bg-hairline" />
              <button
                onClick={() => handleTranslate("ja")}
                disabled={!!aiLoading || (!form.subtitle && !form.description)}
                className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 font-mono text-[10px] font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
              >
                {aiLoading === "translate-ja" ? "..." : "JA"}
              </button>
              <button
                onClick={() => handleTranslate("ms")}
                disabled={!!aiLoading || (!form.subtitle && !form.description)}
                className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 font-mono text-[10px] font-semibold text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
              >
                {aiLoading === "translate-ms" ? "..." : "MS"}
              </button>
              <span className="font-mono text-[9px] text-faint">via {getProvider()}</span>
              {aiError && (
                <span className="font-mono text-[10px] text-crimson">{aiError}</span>
              )}
            </div>

            {/* SEO fields */}
            <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-4 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-sky-400/60">SEO Overrides <span className="normal-case tracking-normal text-faint">(optional — falls back to title & subtitle)</span></p>
              {field("SEO Title", "seoTitle")}
              {field("SEO Description", "seoDescription")}
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="h-4 w-4 rounded border-hairline accent-crimson"
              />
              <span className="font-mono text-xs text-muted">Featured event</span>
            </label>

            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">Page Layout</span>
              <select
                value={form.layout ?? "classic"}
                onChange={(e) => set("layout", (e.target.value || undefined) as Event["layout"])}
                className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
              >
                <option value="classic">Classic — 3-col grid with breathers</option>
                <option value="magazine">Magazine — hero image + 4-col grid</option>
                <option value="filmstrip">Filmstrip — horizontal scroll</option>
                <option value="masonry">Masonry — staggered heights</option>
                <option value="spotlight">Spotlight — one photo + thumbnail strip</option>
                <option value="fullbleed">Full-bleed — each photo full width</option>
                <option value="timeline">Timeline — vertical story with photos</option>
                <option value="polaroid">Polaroid — scattered cards at angles</option>
                <option value="honeycomb">Honeycomb — hexagonal grid</option>
                <option value="diagonal">Diagonal — parallelogram slices</option>
                <option value="splitscroll">Split Screen — photo + scrolling text</option>
                <option value="carousel">Carousel — slideshow with arrows</option>
                <option value="stacked">Stacked Cards — 3D card deck</option>
                <option value="mosaic">Mosaic — mixed size tiles</option>
                <option value="infinite">Infinite Scroll — lazy-load parallax grid</option>
              </select>
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.disableGrouping ?? false}
                  onChange={(e) => set("disableGrouping", e.target.checked)}
                  className="h-4 w-4 rounded border-hairline accent-crimson"
                />
                <div>
                  <span className="font-mono text-xs text-muted">Disable all grouping</span>
                  <p className="font-mono text-[9px] text-faint">Show every photo in the layout, ignore sequences</p>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.groupedInLayout ?? false}
                  onChange={(e) => set("groupedInLayout", e.target.checked)}
                  disabled={form.disableGrouping}
                  className="h-4 w-4 rounded border-hairline accent-crimson disabled:opacity-30"
                />
                <div>
                  <span className={`font-mono text-xs ${form.disableGrouping ? "text-faint" : "text-muted"}`}>Show grouped photos in layout too</span>
                  <p className="font-mono text-[9px] text-faint">Duplicate sequence photos into the main grid</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Interactive Event Page Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Event Page Preview</h2>
          <span className="font-mono text-[9px] text-muted">
            {converting ? (
              <span className="text-crimson">{converting}</span>
            ) : (
              "Click text to edit · drag images to upload to Cloudinary"
            )}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-hairline">
          {/* Cover hero — drag & drop + tap to upload */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={(e) => { if (e.target.files?.length) uploadCover([...e.target.files]); e.target.value = ""; }}
          />
          <div
            {...coverDrop.props}
            onClick={() => coverInputRef.current?.click()}
            className={`relative h-48 cursor-pointer overflow-hidden transition-all ${coverDrop.over ? "ring-2 ring-inset ring-crimson" : ""}`}
          >
            {coverSrc ? (
              <img src={coverSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-card/60">
                <div className="text-center">
                  <svg className="mx-auto mb-2 h-8 w-8 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="font-mono text-xs text-muted">Tap or drop cover image</p>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sumi via-sumi/40 to-transparent" />
            {coverDrop.over && (
              <div className="absolute inset-0 flex items-center justify-center bg-crimson/20 backdrop-blur-sm">
                <p className="font-mono text-sm font-semibold text-white">Drop to set cover</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 z-10 p-4">
              <span className="mb-2 inline-block rounded-full border border-white/20 bg-white/5 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-ink/80">
                ← All events
              </span>
              {form.group && (
                <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.35em] text-sakura/60">
                  {form.group}
                </p>
              )}
              {editable("title", "block font-display text-xl font-bold text-ink")}
            </div>
          </div>

          {/* Header section — editable */}
          <div className="border-b border-hairline p-5">
            <div className="flex gap-4">
              {form.tateText && (
                <div className="hidden shrink-0 sm:block">
                  {editable("tateText", "tate font-jp text-[10px] tracking-[0.5em] text-gold/30")}
                </div>
              )}
              <div className="space-y-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-sakura/60">
                  {editable("location", "text-sakura/60")} &middot; {editable("date", "text-sakura/60")}
                </p>
                {editable("description", "block text-sm leading-6 text-muted")}
                <div className="h-0.5 w-16 bg-gradient-to-r from-crimson to-gold" />
              </div>
            </div>
          </div>

          {/* Facts panel */}
          <div className="grid grid-cols-2 gap-px border-b border-hairline bg-hairline">
            <div className="bg-sumi px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest text-faint">Location</p>
              <p className="mt-0.5 text-xs text-ink/70">{form.location || "—"}</p>
            </div>
            <div className="bg-sumi px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest text-faint">Date</p>
              <p className="mt-0.5 text-xs text-ink/70">{form.date || "—"}</p>
            </div>
            <div className="bg-sumi px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest text-faint">Frames</p>
              <p className="mt-0.5 text-xs text-ink/70">{event.photos.length}</p>
            </div>
            <div className="bg-sumi px-4 py-3">
              <p className="font-mono text-[8px] uppercase tracking-widest text-faint">Gear</p>
              <p className="mt-0.5 text-xs text-ink/70">{form.gear || "—"}</p>
            </div>
          </div>

          {/* Photo grid — drag & drop zone with layout preview */}
          <input
            ref={gridFileRef}
            type="file"
            accept="image/*"
            multiple
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={(e) => {
              if (e.target.files?.length) {
                const files = [...e.target.files];
                (async () => {
                  try {
                    setConverting(`Converting & uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);
                    const { successful, failed } = await uploadBatch(
                      files,
                      `gallery/${form.slug}`,
                      (done, total, name) => setConverting(`Uploading ${done}/${total} — ${name}`),
                    );
                    if (successful.length > 0) {
                      const newPhotos = successful.map((r) => ({
                        title: r.fileName.replace(/\.[^.]+$/, ""),
                        story: "",
                        src: r.url,
                        width: r.width,
                        height: r.height,
                      }));
                      onPhotosChange([...event.photos, ...newPhotos]);
                      onAutoPublish?.();
                    }
                    const msg = `Added ${successful.length} photos`;
                    setConverting(failed.length > 0 ? `${msg} · ${failed.length} failed: ${failed[0].error}` : msg);
                  } catch (err) {
                    setConverting(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
                  }
                  setTimeout(() => setConverting(null), 10000);
                })();
              }
              e.target.value = "";
            }}
          />
          <div
            {...gridDrop.props}
            className={`p-4 transition-all ${gridDrop.over ? "ring-2 ring-inset ring-crimson" : ""}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="font-jp text-xs text-gold/40" lang="ja">枠</span>
              <span className="font-display text-sm font-bold text-ink">All frames</span>
              <span className="rounded bg-crimson/10 px-2 py-0.5 font-mono text-[9px] text-crimson">
                {form.layout ?? "classic"}
              </span>
              <div className="h-px flex-1 bg-hairline" />
              <button
                onClick={() => gridFileRef.current?.click()}
                className="rounded bg-crimson/10 px-2 py-0.5 font-mono text-[9px] text-crimson transition-colors hover:bg-crimson/20"
              >
                + Add Photos
              </button>
              <span className="font-mono text-[9px] text-faint">{event.photos.length} photographs</span>
            </div>

            {gridDrop.over && (
              <div className="mb-3 flex items-center justify-center rounded-lg border-2 border-dashed border-crimson/40 bg-crimson/5 py-6">
                <p className="font-mono text-sm text-crimson">Drop photos to add</p>
              </div>
            )}

            {/* Layout-specific mini preview */}
            <LayoutPreview
              layout={form.layout ?? "classic"}
              photos={event.photos}
              dropTarget={dropTarget}
              onReorderDragStart={onReorderDragStart}
              onReorderDragOver={onReorderDragOver}
              onReorderDrop={onReorderDrop}
              onReorderDragEnd={onReorderDragEnd}
              onDeletePhoto={(i) => onPhotosChange(event.photos.filter((_, j) => j !== i))}
            />

            {event.photos.length === 0 && !gridDrop.over && (
              <div
                onClick={() => gridFileRef.current?.click()}
                className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-hairline py-8 transition-colors hover:border-crimson/40"
              >
                <p className="font-mono text-xs text-muted">Tap to add photos or drag & drop</p>
              </div>
            )}
          </div>

          {/* Card preview */}
          <div className="border-t border-hairline p-4">
            <p className="mb-2 font-mono text-[8px] uppercase tracking-widest text-faint">Home Card Preview</p>
            <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-lg border border-hairline">
              {coverSrc ? (
                <img src={coverSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-faint/20" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                {form.group && (
                  <span className="rounded-full border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[7px] text-white/80">
                    {form.group}
                  </span>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="font-mono text-[7px] text-white/50">
                  {form.location} &middot; {form.date}
                </p>
                <p className="font-display text-[10px] font-bold text-white">{form.title}</p>
                <p className="line-clamp-1 text-[8px] text-white/50">{form.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
