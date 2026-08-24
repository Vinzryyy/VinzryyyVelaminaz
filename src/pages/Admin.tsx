import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAllEvents } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { getAnalytics } from "@/lib/analytics";
import { getPageContent, savePageContent, resetPageContent, defaultContent, type PageContent } from "@/lib/pageContent";
import { formatSize } from "@/lib/imageUtils";
import { uploadToCloudinary, uploadBatch } from "@/lib/cloudinary";
import type { Event, Photo } from "@/lib/types";

/* ── Auth ────────────────────────────────────────────────────────── */

// Day-rotating password hashes (Mon=0 … Sat=5); Sunday accepts all
const DAILY_HASHES: string[] = [
  "c250b12c3b4c2a4229f5232d6590ad40b4a6d9957269ddb67eb94c4bffb01465", // Mon
  "2be1c838055405910e10bbb1191186eb52911f0a76b5022c7ac34e8c904b2643", // Tue
  "8ecf7dcf000e21ccd9dd76aee0c7d4d825a5350d7c1fb5e2a779b924337a0621", // Wed
  "f3b3d81590bf5f89ba1dd431b5d5b5c95ba235da2a1ad7ad23efa3a3ff0dddc9", // Thu
  "ee754fe93cd7ad96a42ef936645fd7402030f408c0d173bfa8098337188e6163", // Fri
  "f1cf1e3acc057506d55de1e2e3010f61184737de4a4a2dd827b8f99cd1dd40ab", // Sat
];

function getValidHashes(): string[] {
  const day = new Date().getDay(); // 0=Sun,1=Mon…6=Sat
  if (day === 0) return DAILY_HASHES; // Sunday: all valid
  return [DAILY_HASHES[day - 1]];
}

const AUTH_KEY = "vinzryyy-admin-auth";
const LOCKOUT_KEY = "vinzryyy-admin-lockout";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 2 * 60 * 1000; // 2 minutes

async function sha256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSessionToken(): string | null {
  const data = sessionStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    const { token, expires } = JSON.parse(data);
    if (Date.now() > expires) {
      sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    return token;
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    return null;
  }
}

function setSessionToken() {
  const token = crypto.randomUUID();
  sessionStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ token, expires: Date.now() + SESSION_TIMEOUT }),
  );
}

function refreshSession() {
  const data = sessionStorage.getItem(AUTH_KEY);
  if (!data) return;
  try {
    const parsed = JSON.parse(data);
    parsed.expires = Date.now() + SESSION_TIMEOUT;
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
  } catch { /* ignore */ }
}

function getLockout(): { attempts: number; until: number } {
  try {
    const data = localStorage.getItem(LOCKOUT_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { attempts: 0, until: 0 };
}

function recordFailedAttempt() {
  const lock = getLockout();
  lock.attempts += 1;
  if (lock.attempts >= MAX_ATTEMPTS) {
    lock.until = Date.now() + LOCKOUT_DURATION;
    lock.attempts = 0;
  }
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lock));
}

function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
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

type Tab = "dashboard" | "events" | "editor" | "photos" | "page" | "export";

/* ── Component ───────────────────────────────────────────────────── */

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!getSessionToken());
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState<number | null>(null);

  useDocumentHead({ title: "Admin — VinzryyySaga" });

  // Live countdown for lockout timer
  useEffect(() => {
    if (lockoutSecs === null || lockoutSecs <= 0) return;
    const t = setTimeout(() => {
      const remaining = lockoutSecs - 1;
      if (remaining <= 0) {
        setLockoutSecs(null);
        setPwError(null);
      } else {
        setLockoutSecs(remaining);
        setPwError(`Too many attempts. Try again in ${remaining}s`);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [lockoutSecs]);

  // Auto-logout on session timeout
  useEffect(() => {
    if (!authed) return;
    const check = setInterval(() => {
      if (!getSessionToken()) setAuthed(false);
    }, 30_000);
    return () => clearInterval(check);
  }, [authed]);

  // Refresh session on user activity
  useEffect(() => {
    if (!authed) return;
    const onActivity = () => refreshSession();
    window.addEventListener("click", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const lock = getLockout();
    if (lock.until > Date.now()) {
      const secs = Math.ceil((lock.until - Date.now()) / 1000);
      setPwError(`Too many attempts. Try again in ${secs}s`);
      setLockoutSecs(secs);
      return;
    }

    setSubmitting(true);
    const hash = await sha256(pw);

    if (getValidHashes().includes(hash)) {
      setSessionToken();
      clearLockout();
      setPw("");
      setLockoutSecs(null);
      setAuthed(true);
    } else {
      recordFailedAttempt();
      const newLock = getLockout();
      if (newLock.until > Date.now()) {
        const secs = Math.ceil((newLock.until - Date.now()) / 1000);
        setPwError(`Too many attempts. Try again in ${secs}s`);
        setLockoutSecs(secs);
      } else {
        const remaining = MAX_ATTEMPTS - newLock.attempts;
        setPwError(`Wrong password (${remaining} attempt${remaining === 1 ? "" : "s"} left)`);
      }
    }
    setSubmitting(false);
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sumi">
        <div className="w-full max-w-sm rounded-xl border border-hairline bg-card p-8">
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">Admin</h1>
          <p className="mb-6 font-mono text-xs text-muted">Enter password to continue</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(null); }}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              className={`w-full rounded-lg border bg-sumi px-4 py-3 font-mono text-sm text-ink outline-none transition-colors focus:border-crimson/50 ${
                pwError ? "border-crimson" : "border-hairline"
              }`}
            />
            {pwError && (
              <p className="mt-2 font-mono text-xs text-crimson">{pwError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-crimson py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-crimson/80 disabled:opacity-50"
            >
              {submitting ? "Verifying..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminPanel onLogout={() => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [events, setEvents] = useState<Event[]>(loadEvents);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [publishState, setPublishState] = useState<"idle" | "publishing" | "done" | "error">("idle");

  // Persist locally on every change (fast, 300ms debounce)
  useEffect(() => {
    const t = setTimeout(() => saveEvents(events), 300);
    return () => clearTimeout(t);
  }, [events]);

  const handlePublish = useCallback(() => {
    if (!localStorage.getItem(GH_TOKEN_KEY)) {
      notify("Add your GitHub token in the Export tab first");
      return;
    }
    setPublishState("publishing");
    publishToGitHub(events)
      .then(() => { setPublishState("done"); notify("Published — site will redeploy"); })
      .catch((err) => { setPublishState("error"); notify(`Publish failed: ${err instanceof Error ? err.message : "unknown error"}`); });
  }, [events]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.startsWith("Publish failed") ? 8000 : 2500);
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
    setSelectedSlug((prev) => (prev === slug ? null : prev));
    notify("Event deleted");
  }, []);

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

  const analytics = useMemo(() => getAnalytics(), [tab]); // refresh when switching to dashboard

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
              Client-side event manager
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetToSource}
              className="rounded-lg border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-crimson/40 hover:text-crimson"
            >
              Reset to source
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg border border-crimson/30 px-4 py-2 font-mono text-xs text-crimson transition-colors hover:bg-crimson/10"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-8 flex flex-wrap gap-2 border-b border-hairline pb-4">
          {tabBtn("dashboard", "Dashboard")}
          {tabBtn("events", "Events")}
          {tabBtn("editor", "Editor")}
          {tabBtn("photos", "Photos")}
          {tabBtn("page", "Page")}
          {tabBtn("export", "Export")}
        </div>

        {/* ── Dashboard ──────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            {/* Publish */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePublish}
                disabled={publishState === "publishing"}
                className="rounded-lg bg-crimson px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-crimson/80 disabled:opacity-50"
              >
                {publishState === "publishing" ? "Publishing..." : "Save & Publish"}
              </button>
              <span className="font-mono text-xs text-muted">
                {publishState === "done" ? (
                  <span className="text-emerald-400">Published — site will redeploy</span>
                ) : publishState === "error" ? (
                  <span className="text-crimson">Publish failed — check token in Export tab</span>
                ) : (
                  "Push all changes live"
                )}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
              <StatCard label="Events" value={events.length} />
              <StatCard label="Total Photos" value={stats.totalPhotos} />
              <StatCard label="Groups" value={stats.groups.length} />
              <StatCard label="Featured" value={stats.featured} />
              <StatCard label="Page Views" value={analytics.totalViews} />
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

            {/* Analytics */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-display text-lg font-bold text-ink">Top Pages</h3>
                <div className="space-y-1.5">
                  {analytics.topPages.length === 0 && (
                    <p className="font-mono text-xs text-muted">No page views yet</p>
                  )}
                  {analytics.topPages.map((p) => (
                    <div key={p.path} className="flex items-center gap-3 rounded-lg bg-card/50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink/70">{p.path}</span>
                      <span className="font-mono text-xs font-semibold text-crimson">{p.views}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-display text-lg font-bold text-ink">
                  Daily Views
                  <span className="ml-2 font-mono text-sm font-normal text-muted">today: {analytics.todayViews}</span>
                </h3>
                <div className="flex h-32 items-end gap-px">
                  {analytics.dailyViews.length === 0 && (
                    <p className="font-mono text-xs text-muted">No data yet</p>
                  )}
                  {(() => {
                    const max = Math.max(...analytics.dailyViews.map((d) => d.views), 1);
                    return analytics.dailyViews.map((d) => (
                      <div
                        key={d.date}
                        className="flex-1 rounded-t bg-crimson/60 transition-all hover:bg-crimson"
                        style={{ height: `${(d.views / max) * 100}%`, minHeight: "2px" }}
                        title={`${d.date}: ${d.views} views`}
                      />
                    ));
                  })()}
                </div>
                <div className="mt-1 flex justify-between">
                  {analytics.dailyViews.length > 0 && (
                    <>
                      <span className="font-mono text-[9px] text-muted">{analytics.dailyViews[0].date}</span>
                      <span className="font-mono text-[9px] text-muted">{analytics.dailyViews[analytics.dailyViews.length - 1].date}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

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
                onPhotosChange={(photos) => { updateEvent(selectedEvent.slug, { photos }); notify("Photos updated"); }}
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
                onCoverChange={(cover) => { updateEvent(selectedEvent.slug, { cover }); notify("Cover updated"); }}
              />
            )}
          </div>
        )}

        {/* ── Page editor ─────────────────────────────────────────── */}
        {tab === "page" && (
          <PageEditor onNotify={notify} />
        )}

        {/* ── Export ──────────────────────────────────────────────── */}
        {tab === "export" && (
          <ExportPanel events={events} onNotify={notify} onPublished={() => {
            localStorage.removeItem(STORAGE_KEY);
            setEvents(deepClone(getAllEvents()));
            setSelectedSlug(null);
          }} />
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

/* ── Layout Preview (mini version of each layout for editor) ──────── */

function PhotoThumb({
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

function LayoutPreview({
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

function useDrop(onDrop: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const props = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      if (files.length) onDrop(files);
    },
  };
  return { over, props };
}

function EventEditor({
  event,
  onChange,
  onPhotosChange,
}: {
  event: Event;
  onChange: (patch: Partial<Event>) => void;
  onPhotosChange: (photos: Photo[]) => void;
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
  }, [form.title, form.slug, form.group, form.date, form.location, form.gear, form.tateText, form.cover, form.subtitle, form.description, form.featured, onChange]);

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

  const coverSrc = form.cover ?? event.photos[0]?.src;

  const [converting, setConverting] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Cover upload handler (shared by drag-drop and file picker)
  const uploadCover = async (files: File[]) => {
    try {
      setConverting("Uploading cover...");
      const result = await uploadToCloudinary(files[0], `gallery/${form.slug}`);
      set("cover", result.secureUrl);
      setConverting(`Cover uploaded: ${formatSize(result.bytes)}`);
    } catch (err) {
      setConverting(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setTimeout(() => setConverting(null), 3000);
  };

  const coverDrop = useDrop((files) => uploadCover(files));

  // Drop handler for photo grid — uploads all to Cloudinary
  const gridDrop = useDrop(async (files) => {
    try {
      setConverting(`Uploading ${files.length} image${files.length > 1 ? "s" : ""} to Cloudinary...`);
      const { successful, failed } = await uploadBatch(
        files,
        `gallery/${form.slug}`,
        (done, total) => setConverting(`Uploading ${done}/${total}...`),
      );
      if (successful.length > 0) {
        const newPhotos = successful.map((r) => ({
          title: r.publicId.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "",
          story: "",
          src: r.secureUrl,
          width: r.width,
          height: r.height,
        }));
        onPhotosChange([...event.photos, ...newPhotos]);
      }
      const totalBytes = successful.reduce((n, r) => n + r.bytes, 0);
      const msg = `Added ${successful.length} photos (${formatSize(totalBytes)})`;
      setConverting(failed.length > 0 ? `${msg} · ${failed.length} failed` : msg);
    } catch (err) {
      setConverting(`Upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setTimeout(() => setConverting(null), 3000);
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
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
            className="hidden"
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
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                const files = [...e.target.files];
                (async () => {
                  try {
                    setConverting(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);
                    const { successful, failed } = await uploadBatch(
                      files,
                      `gallery/${form.slug}`,
                      (done, total) => setConverting(`Uploading ${done}/${total}...`),
                    );
                    if (successful.length > 0) {
                      const newPhotos = successful.map((r) => ({
                        title: r.publicId.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "",
                        story: "",
                        src: r.secureUrl,
                        width: r.width,
                        height: r.height,
                      }));
                      onPhotosChange([...event.photos, ...newPhotos]);
                    }
                    const totalBytes = successful.reduce((n, r) => n + r.bytes, 0);
                    const msg = `Added ${successful.length} photos (${formatSize(totalBytes)})`;
                    setConverting(failed.length > 0 ? `${msg} · ${failed.length} failed` : msg);
                  } catch {
                    setConverting("Upload failed");
                  }
                  setTimeout(() => setConverting(null), 3000);
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

/* ── Photo Manager ───────────────────────────────────────────────── */

const SEQ_COLORS: Record<string, string> = {};
const PALETTE = ["bg-crimson/20 text-crimson", "bg-sakura/20 text-sakura", "bg-gold/20 text-gold", "bg-sky-500/20 text-sky-400", "bg-emerald-500/20 text-emerald-400", "bg-violet-500/20 text-violet-400"];
function seqColor(name: string): string {
  if (!SEQ_COLORS[name]) SEQ_COLORS[name] = PALETTE[Object.keys(SEQ_COLORS).length % PALETTE.length];
  return SEQ_COLORS[name];
}

function PhotoManager({
  event,
  onChange,
  onCoverChange,
}: {
  event: Event;
  onChange: (photos: Photo[]) => void;
  onCoverChange: (cover: string) => void;
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

  const addEmpty = () => {
    const newIdx = photos.length;
    commit((p) => [...p, emptyPhoto()]);
    setEditIdx(newIdx);
  };

  const addFromFiles = async (files: FileList | File[]) => {
    const imageFiles = [...files].filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    setUploading(`Uploading ${imageFiles.length} photo${imageFiles.length > 1 ? "s" : ""}...`);
    try {
      const { successful, failed } = await uploadBatch(
        imageFiles,
        `gallery/${event.slug}`,
        (done, total) => setUploading(`Uploading ${done}/${total}...`),
      );
      if (successful.length > 0) {
        const newPhotos = successful.map((r) => ({
          title: r.publicId.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "",
          story: "",
          src: r.secureUrl,
          width: r.width,
          height: r.height,
        }));
        commit((p) => [...p, ...newPhotos]);
      }
      const msg = `Added ${successful.length} photo${successful.length !== 1 ? "s" : ""}`;
      setUploading(failed.length > 0 ? `${msg} · ${failed.length} failed` : msg);
    } catch {
      setUploading("Upload failed");
    }
    setTimeout(() => setUploading(null), 3000);
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
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
            multiple
            className="hidden"
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
          <button onClick={save} className="rounded-lg border border-crimson bg-transparent px-4 py-2 font-mono text-xs font-semibold text-crimson transition-colors hover:bg-crimson/10">
            Save All
          </button>
        </div>
      </div>

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

/* ── Page Editor ─────────────────────────────────────────────────── */

function PageEditor({ onNotify }: { onNotify: (msg: string) => void }) {
  const [content, setContent] = useState<PageContent>(getPageContent);

  const set = (section: keyof PageContent, key: string, value: string) => {
    setContent((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const save = () => {
    savePageContent(content);
    onNotify("Page content saved — refresh main site to see changes");
  };

  const reset = () => {
    resetPageContent();
    setContent({ ...defaultContent });
    onNotify("Page content reset to defaults");
  };

  const field = (
    section: keyof PageContent,
    key: string,
    label: string,
    opts?: { textarea?: boolean },
  ) => (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {opts?.textarea ? (
        <textarea
          value={(content[section] as Record<string, string>)[key] ?? ""}
          onChange={(e) => set(section, key, e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
        />
      ) : (
        <input
          type="text"
          value={(content[section] as Record<string, string>)[key] ?? ""}
          onChange={(e) => set(section, key, e.target.value)}
          className="w-full rounded-lg border border-hairline bg-sumi px-3 py-2 font-sans text-sm text-ink outline-none focus:border-crimson/50"
        />
      )}
    </label>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      {/* Left: Editor */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Edit Page Content</h2>
          <div className="flex gap-2">
            <button onClick={reset} className="rounded-lg border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors hover:border-crimson/40 hover:text-crimson">
              Reset
            </button>
            <button onClick={save} className="rounded-lg bg-crimson px-6 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-crimson/80">
              Save
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="rounded-lg border border-hairline bg-card/40 p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">Hero Section</h3>
          <div className="space-y-3">
            {field("hero", "tagline", "Tagline", { textarea: true })}
            {field("hero", "verticalKanji", "Vertical Kanji")}
            <div className="flex gap-3">
              {field("hero", "nameLine1", "Name Line 1")}
              {field("hero", "nameLine2", "Name Line 2")}
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="rounded-lg border border-hairline bg-card/40 p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">Profile Section</h3>
          <div className="space-y-3">
            {field("profile", "sectionLabel", "Section Label")}
            {field("profile", "bio", "Bio", { textarea: true })}
            {field("profile", "quote", "Quote")}
          </div>
        </div>

        {/* Contact */}
        <div className="rounded-lg border border-hairline bg-card/40 p-5">
          <h3 className="mb-4 font-display text-sm font-bold text-ink">Contact Section</h3>
          <div className="space-y-3">
            {field("contact", "label", "Label")}
            {field("contact", "heading", "Heading")}
            {field("contact", "description", "Description", { textarea: true })}
            {field("contact", "email", "Email")}
            <div className="flex gap-3">
              {field("contact", "instagramUrl", "Instagram URL")}
              {field("contact", "instagramHandle", "Instagram Handle")}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-ink">Preview</h2>

        {/* Hero preview */}
        <div className="relative overflow-hidden rounded-lg border border-hairline bg-sumi p-6" style={{ minHeight: "200px" }}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
          <div className="relative z-10 space-y-4">
            <p className="max-w-[280px] font-display text-sm italic leading-6 text-ink/70">
              {content.hero.tagline}
            </p>
            <div className="flex-1" />
            <div className="text-center">
              <p className="hero-name select-none font-display text-4xl font-bold uppercase leading-[0.85]">
                {content.hero.nameLine1}
              </p>
              <p className="hero-name select-none font-display text-4xl font-bold uppercase leading-[0.85]">
                {content.hero.nameLine2}
              </p>
            </div>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <p className="tate font-jp text-sm tracking-[0.5em] text-ink/20" lang="ja">
              {content.hero.verticalKanji}
            </p>
          </div>
        </div>

        {/* Profile preview */}
        <div className="rounded-lg border border-hairline bg-card/40 p-6">
          <p className="mb-4 font-display text-2xl italic text-ink/80">
            {content.profile.sectionLabel}
          </p>
          <p className="text-sm leading-7 text-ink/70" style={{ textAlign: "justify" }}>
            {content.profile.bio}
          </p>
          <p className="mt-3 font-display text-sm italic text-sakura/50">
            {content.profile.quote}
          </p>
        </div>

        {/* Contact preview */}
        <div className="rounded-lg border border-hairline bg-card/40 p-6 text-center">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-sakura/60">
            {content.contact.label}
          </p>
          <h3 className="font-display text-2xl font-bold text-ink">
            {content.contact.heading}
          </h3>
          <p className="mt-3 text-sm text-muted">
            {content.contact.description}
          </p>
          <div className="mt-4 space-y-1">
            <p className="font-mono text-sm text-sakura">{content.contact.email}</p>
            <p className="font-mono text-sm text-muted">{content.contact.instagramHandle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── GitHub Publish ──────────────────────────────────────────────── */

const GH_TOKEN_KEY = "vinzryyy-gh-token";
const GH_REPO = "Vinzryyy/VinzryyyVelaminaz";
const GH_FILE_PATH = "src/content/events.ts";

function eventsToCode(events: Event[]): string {
  return [
    `import type { Event } from "@/lib/types";`,
    ``,
    `export const events: Event[] = ${JSON.stringify(events, null, 2)};`,
  ].join("\n");
}

async function publishToGitHub(events: Event[]): Promise<void> {
  const token = localStorage.getItem(GH_TOKEN_KEY);
  if (!token) throw new Error("No GitHub token configured");

  const code = eventsToCode(events);

  // 1. Get current file SHA
  const getRes = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE_PATH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } },
  );
  if (!getRes.ok) {
    const err = await getRes.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error ${getRes.status}`);
  }
  const { sha } = await getRes.json();

  // 2. Commit updated file (use TextEncoder for safe UTF-8 → base64)
  const bytes = new TextEncoder().encode(code);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const content = btoa(binary);
  const putRes = await fetch(
    `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE_PATH}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "update events data from admin panel", content, sha }),
    },
  );
  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || `GitHub API error ${putRes.status}`);
  }
}

/* ── Export Panel ─────────────────────────────────────────────────── */

function ExportPanel({
  events,
  onNotify,
  onPublished,
}: {
  events: Event[];
  onNotify: (msg: string) => void;
  onPublished: () => void;
}) {
  const [ghToken, setGhToken] = useState(() => localStorage.getItem(GH_TOKEN_KEY) ?? "");
  const [showToken, setShowToken] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const code = useMemo(() => eventsToCode(events), [events]);
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => onNotify(`${label} copied to clipboard`));
  };

  const saveToken = (token: string) => {
    setGhToken(token);
    if (token) localStorage.setItem(GH_TOKEN_KEY, token);
    else localStorage.removeItem(GH_TOKEN_KEY);
  };

  const publish = async () => {
    if (!ghToken) {
      setPublishStatus("Enter your GitHub token first");
      return;
    }
    setPublishing(true);
    setPublishStatus("Publishing to GitHub...");

    try {
      await publishToGitHub(events);
      setPublishStatus("Published! Vercel will redeploy automatically.");
      onNotify("Published to GitHub — site will redeploy");
      onPublished();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPublishStatus(`Error: ${msg}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-ink">Export &amp; Publish</h2>

      {/* ── Publish to GitHub ── */}
      <div className="rounded-lg border border-crimson/30 bg-crimson/5 p-5 space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Publish to GitHub</h3>
        <p className="font-mono text-xs text-muted">
          Commits your changes directly to the repo. Vercel will redeploy automatically so every device sees the update.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
              GitHub Personal Access Token
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={ghToken}
                onChange={(e) => saveToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 rounded-lg border border-hairline bg-sumi px-3 py-2 font-mono text-xs text-ink outline-none transition-colors focus:border-crimson/50"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="rounded-lg border border-hairline px-3 py-2 font-mono text-[10px] text-muted hover:text-ink"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted/60">
              Needs <code className="text-sakura">repo</code> scope. Saved locally in this browser.
            </p>
          </div>

          <button
            onClick={publish}
            disabled={publishing || !ghToken}
            className="rounded-lg bg-crimson px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-crimson/80 disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish to GitHub"}
          </button>

          {publishStatus && (
            <p className={`font-mono text-xs ${publishStatus.startsWith("Error") ? "text-crimson" : publishStatus.startsWith("Published") ? "text-emerald-400" : "text-muted"}`}>
              {publishStatus}
            </p>
          )}
        </div>
      </div>

      {/* ── Manual export ── */}
      <div className="space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Manual Export</h3>
        <p className="font-mono text-xs text-muted">
          Or copy the code manually and paste into <code className="text-sakura">src/content/events.ts</code>.
        </p>
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
