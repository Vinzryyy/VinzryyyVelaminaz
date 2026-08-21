import { useState } from "react";
import { Link, useParams } from "react-router";
import { getEvent, getNextEvent } from "@/lib/data";
import { FactsPanel } from "@/components/FactsPanel";
import { KatanaDivider } from "@/components/KatanaDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { PhotoGrid } from "@/components/PhotoGrid";
import { Lightbox } from "@/components/Lightbox";
import NotFound from "@/pages/NotFound";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const event = slug ? getEvent(slug) : undefined;
  if (!event) return <NotFound />;

  const nextEvent = getNextEvent(event.slug);

  return (
    <div className="pt-20">
      {/* ── Back link ──────────────────────────────────────────── */}
      <div className="px-6 pb-6 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <Link
            to="/#events"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted transition-colors duration-200 hover:text-ink"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All events
          </Link>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="px-6 pb-12 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="flex gap-6">
              {/* Vertical tate text */}
              <div className="hidden shrink-0 items-start md:flex">
                <span className="tate font-jp text-xs tracking-[0.5em] text-gold/30">
                  {event.tateText}
                </span>
              </div>

              <div className="space-y-4">
                <ScrollReveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                    {event.location} &middot; {event.date}
                  </p>
                </ScrollReveal>

                <ScrollReveal>
                  <h1 className="font-display text-4xl font-bold leading-[1.05] text-ink md:text-5xl">
                    {event.title}
                  </h1>
                </ScrollReveal>

                <ScrollReveal>
                  <p className="max-w-xl text-sm leading-7 text-muted">{event.description}</p>
                </ScrollReveal>

                <ScrollReveal>
                  <KatanaDivider active className="w-24" />
                </ScrollReveal>
              </div>
            </div>

            <ScrollReveal>
              <FactsPanel event={event} />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Photo grid section header ──────────────────────────── */}
      <section className="px-6 pb-6 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="flex items-center gap-4">
              <span className="font-jp text-sm text-gold/40">枠</span>
              <h2 className="font-display text-xl font-bold text-ink">All frames</h2>
              <div className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-faint">
                {event.photos.length} photographs
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Photo grid ─────────────────────────────────────────── */}
      <section className="px-6 pb-20 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <PhotoGrid photos={event.photos} onOpen={setLightboxIdx} />
        </div>
      </section>

      {/* ── Next event card ────────────────────────────────────── */}
      <section className="border-t border-hairline px-6 py-16 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <Link
              to={`/events/${nextEvent.slug}`}
              className="group flex items-center justify-between gap-6"
            >
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/60">
                  Next event
                </p>
                <h3 className="font-display text-2xl font-bold text-ink/80 transition-colors duration-200 group-hover:text-ink">
                  {nextEvent.title}
                </h3>
                <p className="text-sm text-muted">{nextEvent.subtitle}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors duration-200 group-hover:border-crimson group-hover:text-crimson">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Lightbox ───────────────────────────────────────────── */}
      {lightboxIdx !== null && (
        <Lightbox
          event={event}
          photos={event.photos}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
