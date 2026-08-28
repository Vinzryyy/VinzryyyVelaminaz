import { useState } from "react";
import { getPageContent, savePageContent, resetPageContent, defaultContent, type PageContent } from "@/lib/pageContent";

/* ── Page Editor ─────────────────────────────────────────────────── */

export function PageEditor({ onNotify }: { onNotify: (msg: string) => void }) {
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
