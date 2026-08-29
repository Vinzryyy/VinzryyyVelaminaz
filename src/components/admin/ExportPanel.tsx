import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Event } from "@/lib/types";
import { getAllEvents } from "@/lib/data";
import { deepClone, eventsToCode, GH_TOKEN_KEY, publishToGitHub } from "@/components/admin/adminHelpers";
import {
  AI_OPENAI_KEY,
  AI_DEEPSEEK_KEY,
  AI_PROVIDER_KEY,
  type AIProvider,
  getProvider,
  setProvider,
} from "@/lib/aiGenerate";

/* ── Export Panel ─────────────────────────────────────────────────── */

export function ExportPanel({
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

  // AI API keys
  const [aiProvider, setAiProvider] = useState<AIProvider>(getProvider);
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem(AI_OPENAI_KEY) ?? "");
  const [deepseekKey, setDeepseekKey] = useState(() => localStorage.getItem(AI_DEEPSEEK_KEY) ?? "");
  const [showAiKeys, setShowAiKeys] = useState(false);

  const saveAiKey = (provider: "openai" | "deepseek", key: string) => {
    const storageKey = provider === "openai" ? AI_OPENAI_KEY : AI_DEEPSEEK_KEY;
    if (provider === "openai") setOpenaiKey(key);
    else setDeepseekKey(key);
    if (key) localStorage.setItem(storageKey, key);
    else localStorage.removeItem(storageKey);
  };

  const switchProvider = (p: AIProvider) => {
    setAiProvider(p);
    setProvider(p);
  };

  const code = useMemo(() => eventsToCode(events), [events]);
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  /* ── Publish diff ─────────────────────────────────────────────── */
  const [showDiff, setShowDiff] = useState(false);

  const diff = useMemo(() => {
    const source = deepClone(getAllEvents());
    const sourceMap = new Map(source.map((e) => [e.slug, e]));
    const currentMap = new Map(events.map((e) => [e.slug, e]));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: { slug: string; changes: string[] }[] = [];

    // Find added and modified
    for (const ev of events) {
      const src = sourceMap.get(ev.slug);
      if (!src) {
        added.push(ev.title || ev.slug);
        continue;
      }
      const changes: string[] = [];
      if (ev.title !== src.title) changes.push(`title: "${src.title}" → "${ev.title}"`);
      if (ev.subtitle !== src.subtitle) changes.push("subtitle changed");
      if (ev.description !== src.description) changes.push("description changed");
      if (ev.group !== src.group) changes.push(`group: "${src.group || "—"}" → "${ev.group || "—"}"`);
      if (ev.featured !== src.featured) changes.push(ev.featured ? "featured" : "unfeatured");
      if (ev.cover !== src.cover) changes.push("cover changed");
      if (ev.layout !== src.layout) changes.push(`layout: ${src.layout || "classic"} → ${ev.layout || "classic"}`);
      if (ev.tateText !== src.tateText) changes.push("tateText changed");
      if (ev.seoTitle !== src.seoTitle) changes.push("seoTitle changed");
      if (ev.seoDescription !== src.seoDescription) changes.push("seoDescription changed");
      if (ev.photos.length !== src.photos.length) changes.push(`photos: ${src.photos.length} → ${ev.photos.length}`);
      else if (JSON.stringify(ev.photos) !== JSON.stringify(src.photos)) changes.push("photo data changed");
      if (changes.length > 0) modified.push({ slug: ev.slug, changes });
    }

    // Find removed
    for (const src of source) {
      if (!currentMap.has(src.slug)) removed.push(src.title || src.slug);
    }

    // Check reorder
    const sourceOrder = source.map((e) => e.slug).join(",");
    const currentOrder = events.filter((e) => sourceMap.has(e.slug)).map((e) => e.slug).join(",");
    const reordered = sourceOrder !== currentOrder && modified.length === 0 && added.length === 0 && removed.length === 0 ? false : sourceOrder !== currentOrder;

    const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0 || reordered;
    return { added, removed, modified, reordered, hasChanges };
  }, [events]);

  /* ── Preview URL ──────────────────────────────────────────────── */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const openPreview = useCallback(() => {
    // Vercel preview deploys are on the same domain with a commit hash
    // After publishing, the latest deploy URL follows this pattern
    const url = `https://vinzryyy-velaminaz.vercel.app`;
    setPreviewUrl(url);
    window.open(url, "_blank", "noopener");
  }, []);

  /* ── Scheduled publish ────────────────────────────────────────── */
  const SCHEDULE_KEY = "vinzryyy-scheduled-publish";

  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    return localStorage.getItem(SCHEDULE_KEY) || "";
  });
  const [scheduleActive, setScheduleActive] = useState(() => !!localStorage.getItem(SCHEDULE_KEY));
  const scheduleTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const setSchedule = (datetime: string) => {
    setScheduleTime(datetime);
    if (datetime) {
      localStorage.setItem(SCHEDULE_KEY, datetime);
      setScheduleActive(true);
    } else {
      localStorage.removeItem(SCHEDULE_KEY);
      setScheduleActive(false);
    }
  };

  const clearSchedule = () => {
    setScheduleTime("");
    localStorage.removeItem(SCHEDULE_KEY);
    setScheduleActive(false);
  };

  // Check scheduled publish every 30s
  useEffect(() => {
    if (!scheduleActive || !scheduleTime || !ghToken) return;
    const check = () => {
      const target = new Date(scheduleTime).getTime();
      if (Date.now() >= target) {
        clearSchedule();
        // Auto-publish
        setPublishing(true);
        setPublishStatus("Scheduled publish running...");
        publishToGitHub(events)
          .then(() => { setPublishStatus("Scheduled publish complete!"); onNotify("Scheduled publish done — site will redeploy"); onPublished(); })
          .catch((err: unknown) => { setPublishStatus(`Scheduled publish failed: ${err instanceof Error ? err.message : "unknown"}`); });
        setPublishing(false);
      }
    };
    check(); // run immediately
    scheduleTimerRef.current = setInterval(check, 30_000);
    return () => clearInterval(scheduleTimerRef.current);
  }, [scheduleActive, scheduleTime, ghToken, events]); // eslint-disable-line

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

          <div className="flex items-center gap-3">
            <button
              onClick={publish}
              disabled={publishing || !ghToken}
              className="rounded-lg bg-crimson px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-crimson/80 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish to GitHub"}
            </button>
            <button
              onClick={openPreview}
              className="rounded-lg border border-hairline px-4 py-3 font-mono text-xs text-muted transition-colors hover:border-crimson/30 hover:text-crimson"
            >
              Open Live Site
            </button>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className={`rounded-lg border px-4 py-3 font-mono text-xs transition-colors ${
                diff.hasChanges
                  ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                  : "border-hairline text-muted hover:text-ink"
              }`}
            >
              {diff.hasChanges ? `${diff.added.length + diff.modified.length + diff.removed.length} change(s)` : "No changes"}
            </button>
          </div>

          {publishStatus && (
            <p className={`font-mono text-xs ${publishStatus.startsWith("Error") ? "text-crimson" : publishStatus.startsWith("Published") || publishStatus.startsWith("Scheduled") ? "text-emerald-400" : "text-muted"}`}>
              {publishStatus}
            </p>
          )}

          {previewUrl && (
            <p className="font-mono text-[10px] text-muted">
              Preview: <a href={previewUrl} target="_blank" rel="noopener" className="text-crimson underline">{previewUrl}</a>
            </p>
          )}
        </div>
      </div>

      {/* ── Publish Diff ── */}
      {showDiff && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-5 space-y-3">
          <h3 className="font-display text-sm font-bold text-ink">Changes since last publish</h3>
          {!diff.hasChanges ? (
            <p className="font-mono text-xs text-muted">No changes — local data matches source.</p>
          ) : (
            <div className="space-y-2">
              {diff.added.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">Added ({diff.added.length})</p>
                  {diff.added.map((t) => (
                    <p key={t} className="font-mono text-xs text-emerald-400/80 pl-3">+ {t}</p>
                  ))}
                </div>
              )}
              {diff.removed.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-crimson">Removed ({diff.removed.length})</p>
                  {diff.removed.map((t) => (
                    <p key={t} className="font-mono text-xs text-crimson/80 pl-3">- {t}</p>
                  ))}
                </div>
              )}
              {diff.modified.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-gold">Modified ({diff.modified.length})</p>
                  {diff.modified.map((m) => (
                    <div key={m.slug} className="pl-3 mb-1">
                      <p className="font-mono text-xs text-gold/80">{m.slug}</p>
                      {m.changes.map((c, i) => (
                        <p key={i} className="font-mono text-[10px] text-muted pl-3">{c}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {diff.reordered && (
                <p className="font-mono text-xs text-sky-400">Event order changed</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Scheduled Publish ── */}
      <div className="rounded-lg border border-sky-400/30 bg-sky-400/5 p-5 space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Scheduled Publish</h3>
        <p className="font-mono text-xs text-muted">
          Set a date and time to auto-publish. The tab must stay open — publishes when the time arrives.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setSchedule(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="rounded-lg border border-hairline bg-sumi px-3 py-2 font-mono text-xs text-ink outline-none focus:border-sky-400/50"
          />
          {scheduleActive && (
            <>
              <span className="font-mono text-xs text-sky-400">
                Scheduled: {new Date(scheduleTime).toLocaleString()}
              </span>
              <button
                onClick={clearSchedule}
                className="rounded border border-hairline px-3 py-1.5 font-mono text-[10px] text-muted hover:text-crimson"
              >
                Cancel
              </button>
            </>
          )}
          {!ghToken && scheduleActive && (
            <span className="font-mono text-[10px] text-crimson">Needs GitHub token</span>
          )}
        </div>
      </div>

      {/* ── AI API Keys ── */}
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-5 space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">AI Description Generator</h3>
        <p className="font-mono text-xs text-muted">
          Add your API keys to enable AI-generated subtitles and descriptions in the Editor.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
              Active Provider
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => switchProvider("deepseek")}
                className={`rounded-lg px-4 py-2 font-mono text-[10px] font-semibold transition-colors ${
                  aiProvider === "deepseek"
                    ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/40"
                    : "border border-hairline text-muted hover:text-ink"
                }`}
              >
                DeepSeek
              </button>
              <button
                onClick={() => switchProvider("openai")}
                className={`rounded-lg px-4 py-2 font-mono text-[10px] font-semibold transition-colors ${
                  aiProvider === "openai"
                    ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/40"
                    : "border border-hairline text-muted hover:text-ink"
                }`}
              >
                OpenAI
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
              DeepSeek API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showAiKeys ? "text" : "password"}
                value={deepseekKey}
                onChange={(e) => saveAiKey("deepseek", e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 rounded-lg border border-hairline bg-sumi px-3 py-2 font-mono text-xs text-ink outline-none transition-colors focus:border-emerald-400/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <input
                type={showAiKeys ? "text" : "password"}
                value={openaiKey}
                onChange={(e) => saveAiKey("openai", e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 rounded-lg border border-hairline bg-sumi px-3 py-2 font-mono text-xs text-ink outline-none transition-colors focus:border-emerald-400/50"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAiKeys(!showAiKeys)}
            className="rounded-lg border border-hairline px-3 py-2 font-mono text-[10px] text-muted hover:text-ink"
          >
            {showAiKeys ? "Hide keys" : "Show keys"}
          </button>

          <p className="font-mono text-[10px] text-muted/60">
            Keys are saved locally in this browser. Use the <span className="text-emerald-400">Generate with AI</span> button in the Editor tab.
          </p>
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
