import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllEvents } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import type { Event, Photo } from "@/lib/types";

/* ── Auth ────────────────────────────────────────────────────────── */

const ADMIN_HASH = "a252c44d";
const AUTH_KEY = "vinzryyy-admin-auth";

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const STORAGE_KEY = "vinzryyy-admin-events";

function loadEvents(): Event[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return deepClone(getAllEvents());
}

function saveEvents(events: Event[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function emptyPhoto(): Photo {
  return { title: "", story: "", src: "", lens: "", aperture: "", shutter: "" };
}

function emptyEvent(): Event {
  return {
    slug: "",
    title: "",
    group: "",
    tateText: "",
    location: "",
    date: "",
    gear: "",
    subtitle: "",
    description: "",
    featured: false,
    photos: [],
  };
}

/* ── Tab type ────────────────────────────────────────────────────── */

type Tab = "dashboard" | "events" | "editor" | "photos" | "export";

/* ── Component ───────────────────────────────────────────────────── */

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  useDocumentHead({ title: "Admin — VinzryyySaga" });

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sumi">
        <div className="w-full max-w-sm rounded-xl border border-hairline bg-card p-8">
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">Admin</h1>
          <p className="mb-6 font-mono text-xs text-muted">Enter password to continue</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (simpleHash(pw) === ADMIN_HASH) {
                sessionStorage.setItem(AUTH_KEY, "1");
                setAuthed(true);
              } else {
                setPwError(true);
                setTimeout(() => setPwError(false), 2000);
              }
            }}
          >
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              autoFocus
              className={`w-full rounded-lg border bg-sumi px-4 py-3 font-mono text-sm text-ink outline-none transition-colors focus:border-crimson/50 ${
                pwError ? "border-crimson" : "border-hairline"
              }`}
            />
            {pwError && (
              <p className="mt-2 font-mono text-xs text-crimson">Wrong password</p>
            )}
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-crimson py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-crimson/80"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const [events, setEvents] = useState<Event[]>(loadEvents);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Persist on every change
  useEffect(() => { saveEvents(events); }, [events]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.slug === selectedSlug) ?? null,
    [events, selectedSlug],
  );

  const notify = (msg: string) => setToast(msg);

  const updateEvent = useCallback(
    (slug: string, patch: Partial<Event>) => {
      setEvents((prev) =>
        prev.map((e) => (e.slug === slug ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const deleteEvent = useCallback((slug: string) => {
    setEvents((prev) => prev.filter((e) => e.slug !== slug));
    if (selectedSlug === slug) setSelectedSlug(null);
    notify("Event deleted");
  }, [selectedSlug]);

  const addEvent = useCallback(() => {
    const ev = emptyEvent();
    ev.slug = `new-event-${Date.now()}`;
    ev.title = "New Event";
    setEvents((prev) => [ev, ...prev]);
    setSelectedSlug(ev.slug);
    setTab("editor");
    notify("Event created");
  }, []);

  const resetToSource = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEvents(deepClone(getAllEvents()));
    setSelectedSlug(null);
    notify("Reset to source data");
  }, []);

  /* ── Stats ─────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const totalPhotos = events.reduce((n, e) => n + e.photos.length, 0);
    const groups = [...new Set(events.map((e) => e.group).filter(Boolean))];
    const featured = events.filter((e) => e.featured).length;
    const noPhotos = events.filter((e) => e.photos.length === 0).length;
    const noSrc = events.reduce(
      (n, e) => n + e.photos.filter((p) => !p.src).length,
      0,
    );
    return { totalPhotos, groups, featured, noPhotos, noSrc };
  }, [events]);

  /* ── Render ────────────────────────────────────────────────────── */

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`rounded-md px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
        tab === t
          ? "bg-crimson text-white"
          : "text-ink/60 hover:bg-card hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-sumi pt-20">
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-24 z-50 animate-pulse rounded-lg border border-crimson/30 bg-card px-5 py-3 font-mono text-sm text-crimson shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 md:px-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Admin</h1>
            <p className="mt-1 font-mono text-xs text-muted">
              Client-side event manager &middot; changes saved to localStorage
            </p>
          </div>
          <button
            onClick={resetToSource}
            className="rounded-lg border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-crimson/40 hover:text-crimson"
          >
            Reset to source
          </button>
        </div>

        {/* Tab bar */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-hairline pb-4">
          {tabBtn("dashboard", "Dashboard")}
          {tabBtn("events", "Events")}
          {tabBtn("editor", "Editor")}
          {tabBtn("photos", "Photos")}
          {tabBtn("export", "Export")}
        </div>

        {/* ── Dashboard ──────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <StatCard label="Events" value={events.length} />
              <StatCard label="Total Photos" value={stats.totalPhotos} />
              <StatCard label="Groups" value={stats.groups.length} />
              <StatCard label="Featured" value={stats.featured} />
            </div>

            {(stats.noPhotos > 0 || stats.noSrc > 0) && (
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-5">
                <h3 className="mb-2 font-display text-sm font-bold text-gold">Warnings</h3>
                {stats.noPhotos > 0 && (
                  <p className="font-mono text-xs text-gold/80">
                    {stats.noPhotos} event(s) have no photos
                  </p>
                )}
                {stats.noSrc > 0 && (
                  <p className="font-mono text-xs text-gold/80">
                    {stats.noSrc} photo(s) are missing src paths
                  </p>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-3 font-display text-lg font-bold text-ink">Groups</h3>
              <div className="flex flex-wrap gap-2">
                {stats.groups.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-crimson/30 bg-crimson/10 px-3 py-1 font-mono text-xs text-crimson/80"
                  >
                    {g} &middot; {events.filter((e) => e.group === g).length}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-display text-lg font-bold text-ink">Recent Events</h3>
              <div className="space-y-2">
                {events.slice(0, 5).map((e) => (
                  <button
                    key={e.slug}
                    onClick={() => { setSelectedSlug(e.slug); setTab("editor"); }}
                    className="flex w-full items-center gap-4 rounded-lg border border-hairline bg-card/50 p-3 text-left transition-colors hover:border-hairline/80 hover:bg-card"
                  >
                    {e.photos[0]?.src && (
                      <img src={e.photos[0].src} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold text-ink">{e.title}</p>
                      <p className="font-mono text-[10px] text-muted">{e.location} &middot; {e.date} &middot; {e.photos.length} photos</p>
                    </div>
                    {e.group && (
                      <span className="rounded border border-crimson/20 bg-crimson/10 px-2 py-0.5 font-mono text-[9px] text-crimson/70">
                        {e.group}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Events list ────────────────────────────────────────── */}
        {tab === "events" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">All Events ({events.length})</h2>
              <button
                onClick={addEvent}
                className="rounded-lg bg-crimson px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80"
              >
                + New Event
              </button>
            </div>

            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.slug}
                  className="flex items-center gap-4 rounded-lg border border-hairline bg-card/50 p-4 transition-colors hover:bg-card"
                >
                  {e.photos[0]?.src ? (
                    <img src={e.photos[0].src} alt="" className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-faint/30 font-mono text-xs text-muted">
                      --
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-sm font-bold text-ink">{e.title}</p>
                      {e.featured && (
                        <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[8px] uppercase text-gold">
                          featured
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-muted">
                      {e.slug} &middot; {e.group || "no group"} &middot; {e.photos.length} photos
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedSlug(e.slug); setTab("editor"); }}
                      className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-crimson/30 hover:text-crimson"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { setSelectedSlug(e.slug); setTab("photos"); }}
                      className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-sakura/30 hover:text-sakura"
                    >
                      Photos
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${e.title}"?`)) deleteEvent(e.slug);
                      }}
                      className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-crimson hover:bg-crimson/10 hover:text-crimson"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Editor ─────────────────────────────────────────────── */}
        {tab === "editor" && (
          <div>
            {!selectedEvent ? (
              <div className="py-20 text-center">
                <p className="font-mono text-sm text-muted">Select an event from the Events tab to edit</p>
              </div>
            ) : (
              <EventEditor
                event={selectedEvent}
                onChange={(patch) => { updateEvent(selectedEvent.slug, patch); notify("Saved"); }}
              />
            )}
          </div>
        )}

        {/* ── Photos ─────────────────────────────────────────────── */}
        {tab === "photos" && (
          <div>
            {!selectedEvent ? (
              <div className="py-20 text-center">
                <p className="font-mono text-sm text-muted">Select an event from the Events tab to manage photos</p>
              </div>
            ) : (
              <PhotoManager
                event={selectedEvent}
                onChange={(photos) => { updateEvent(selectedEvent.slug, { photos }); notify("Photos updated"); }}
              />
            )}
          </div>
        )}

        {/* ── Export ──────────────────────────────────────────────── */}
        {tab === "export" && (
          <ExportPanel events={events} onNotify={notify} />
        )}
      </div>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────── */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-hairline bg-card/60 p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

/* ── Event Editor ────────────────────────────────────────────────── */

function EventEditor({
  event,
  onChange,
}: {
  event: Event;
  onChange: (patch: Partial<Event>) => void;
}) {
  const [form, setForm] = useState<Event>(deepClone(event));

  // Sync when switching events
  useEffect(() => { setForm(deepClone(event)); }, [event.slug]); // eslint-disable-line

  const set = <K extends keyof Event>(key: K, value: Event[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = () => {
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

  return (
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
          <div className="flex gap-4">
            {field("Title", "title", { half: true })}
            {field("Slug", "slug", { half: true })}
          </div>
          <div className="flex gap-4">
            {field("Group", "group", { half: true })}
            {field("Date", "date", { half: true })}
          </div>
          <div className="flex gap-4">
            {field("Location", "location", { half: true })}
            {field("Gear", "gear", { half: true })}
          </div>
          <div className="flex gap-4">
            {field("Tate Text", "tateText", { half: true })}
            {field("Cover URL", "cover", { half: true })}
          </div>
          {field("Subtitle", "subtitle")}
          {field("Description", "description", { textarea: true })}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 rounded border-hairline accent-crimson"
            />
            <span className="font-mono text-xs text-muted">Featured event</span>
          </label>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-lg border border-hairline bg-card/40 p-6">
        <h3 className="mb-4 font-mono text-[10px] uppercase tracking-wider text-muted">Preview</h3>
        <div className="space-y-2">
          {form.group && (
            <span className="inline-block rounded-full border border-crimson/30 bg-crimson/10 px-2.5 py-1 font-mono text-[9px] uppercase text-crimson/80">
              {form.group}
            </span>
          )}
          <h3 className="font-display text-2xl font-bold text-ink">{form.title || "Untitled"}</h3>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sakura/60">
            {form.location || "Location"} &middot; {form.date || "Date"}
          </p>
          <p className="text-sm text-muted">{form.subtitle || "No subtitle"}</p>
          <p className="text-sm leading-7 text-ink/70">{form.description || "No description"}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Photo Manager ───────────────────────────────────────────────── */

function PhotoManager({
  event,
  onChange,
}: {
  event: Event;
  onChange: (photos: Photo[]) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(deepClone(event.photos));
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => { setPhotos(deepClone(event.photos)); setEditIdx(null); }, [event.slug]); // eslint-disable-line

  const save = () => onChange(photos);

  const add = () => {
    setPhotos((p) => [...p, emptyPhoto()]);
    setEditIdx(photos.length);
  };

  const remove = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
    setEditIdx(null);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    setPhotos((p) => {
      const next = [...p];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setEditIdx(target);
  };

  const updatePhoto = (idx: number, patch: Partial<Photo>) => {
    setPhotos((p) => p.map((ph, i) => (i === idx ? { ...ph, ...patch } : ph)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">
          Photos: {event.title}
          <span className="ml-3 font-mono text-sm font-normal text-muted">{photos.length} photos</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={add}
            className="rounded-lg bg-crimson px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80"
          >
            + Add Photo
          </button>
          <button
            onClick={save}
            className="rounded-lg border border-crimson bg-transparent px-4 py-2 font-mono text-xs font-semibold text-crimson transition-colors hover:bg-crimson/10"
          >
            Save All
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className={`group relative cursor-pointer rounded-lg border bg-card/50 p-2 transition-all ${
              editIdx === idx ? "border-crimson/50 ring-1 ring-crimson/20" : "border-hairline hover:border-hairline/80"
            }`}
            onClick={() => setEditIdx(editIdx === idx ? null : idx)}
          >
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
                  <span className="shrink-0 rounded bg-sakura/15 px-1.5 py-0.5 font-mono text-[8px] text-sakura">
                    {photo.sequence}
                  </span>
                )}
              </div>
              <p className="truncate font-mono text-[9px] text-muted">
                {[photo.lens, photo.aperture].filter(Boolean).join(" · ") || "No EXIF"}
              </p>
            </div>

            {/* Quick actions */}
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
            <div className="flex gap-3">
              <PhotoField label="Story" value={photos[editIdx].story} onChange={(v) => updatePhoto(editIdx, { story: v })} />
              <PhotoField label="Filmstrip Group" value={photos[editIdx].sequence ?? ""} onChange={(v) => updatePhoto(editIdx, { sequence: v || undefined })} />
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

/* ── Export Panel ─────────────────────────────────────────────────── */

function ExportPanel({
  events,
  onNotify,
}: {
  events: Event[];
  onNotify: (msg: string) => void;
}) {
  const code = useMemo(() => {
    const lines = [
      `import type { Event } from "@/lib/types";`,
      ``,
      `export const events: Event[] = ${JSON.stringify(events, null, 2)};`,
    ];
    return lines.join("\n");
  }, [events]);

  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => onNotify(`${label} copied to clipboard`));
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-ink">Export</h2>
      <p className="font-mono text-xs text-muted">
        Copy the generated code and paste it into <code className="text-sakura">src/content/events.ts</code> to apply your changes.
      </p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => copy(code, "TypeScript")}
            className="rounded-lg bg-crimson px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80"
          >
            Copy as TypeScript
          </button>
          <button
            onClick={() => copy(json, "JSON")}
            className="rounded-lg border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-crimson/30 hover:text-crimson"
          >
            Copy as JSON
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-lg border border-hairline bg-sumi p-4">
          <pre className="font-mono text-xs leading-5 text-ink/70">{code}</pre>
        </div>
      </div>
    </div>
  );
}
