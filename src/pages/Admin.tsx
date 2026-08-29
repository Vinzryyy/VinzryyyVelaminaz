import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAllEvents } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { getAnalytics } from "@/lib/analytics";
import type { Event } from "@/lib/types";

import {
  AUTH_KEY,
  MAX_ATTEMPTS,
  sha256,
  getValidHashes,
  getSessionToken,
  setSessionToken,
  refreshSession,
  getLockout,
  recordFailedAttempt,
  clearLockout,
} from "@/components/admin/adminAuth";

import {
  deepClone,
  STORAGE_KEY,
  loadEvents,
  saveEvents,
  emptyEvent,
  GH_TOKEN_KEY,
  publishToGitHub,
  type Tab,
} from "@/components/admin/adminHelpers";

import { StatCard } from "@/components/admin/StatCard";
import { EventEditor } from "@/components/admin/EventEditor";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { PageEditor } from "@/components/admin/PageEditor";
import { ExportPanel } from "@/components/admin/ExportPanel";

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

  // When true, the next events state change will auto-publish events.ts to GitHub
  const pendingAutoPublish = useRef(false);

  // Persist locally on every change (fast, 300ms debounce)
  // Also auto-publish to GitHub if a photo upload just completed
  useEffect(() => {
    const t = setTimeout(() => saveEvents(events), 300);

    if (pendingAutoPublish.current && localStorage.getItem(GH_TOKEN_KEY)) {
      pendingAutoPublish.current = false;
      setPublishState("publishing");
      publishToGitHub(events)
        .then(() => { setPublishState("done"); notify("Auto-published — site will redeploy"); })
        .catch((err) => { setPublishState("error"); notify(`Auto-publish failed: ${err instanceof Error ? err.message : "unknown error"}`); });
    }

    return () => clearTimeout(t);
  }, [events]);

  // Called by upload handlers to trigger auto-publish after state updates
  const scheduleAutoPublish = useCallback(() => { pendingAutoPublish.current = true; }, []);

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

  const copyEvent = useCallback((source: Event) => {
    const copy = deepClone(source);
    copy.slug = `${source.slug}-copy-${Date.now()}`;
    copy.title = `${source.title} (Copy)`;
    copy.photos = [];
    copy.cover = undefined;
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.slug === source.slug);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedSlug(copy.slug);
    setTab("editor");
    notify("Event copied — update title, slug & add photos");
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
                      onClick={() => copyEvent(e)}
                      className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-emerald-400/30 hover:text-emerald-400"
                    >
                      Copy
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
                onAutoPublish={scheduleAutoPublish}
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
                onAutoPublish={scheduleAutoPublish}
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
