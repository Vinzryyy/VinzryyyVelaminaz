import { useMemo, useState } from "react";
import type { Event } from "@/lib/types";
import { eventsToCode, GH_TOKEN_KEY, publishToGitHub } from "@/components/admin/adminHelpers";

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
