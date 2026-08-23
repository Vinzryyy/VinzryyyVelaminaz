import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getEvent, getNextEvent, getPrevEvent } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { FactsPanel } from "@/components/FactsPanel";
import { KatanaDivider } from "@/components/KatanaDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ResponsiveImg } from "@/components/ResponsiveImg";
import { PhotoGrid } from "@/components/PhotoGrid";
import { MagazineLayout, FilmstripLayout, MasonryLayout, SpotlightLayout, FullbleedLayout, TimelineLayout, PolaroidLayout, HoneycombLayout, DiagonalLayout, SplitScrollLayout, CarouselLayout, StackedLayout, MosaicLayout, InfiniteLayout } from "@/components/EventLayouts";
import NotFound from "@/pages/NotFound";

const Lightbox = lazy(() =>
  import("@/components/Lightbox").then((m) => ({ default: m.Lightbox })),
);

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const event = slug ? getEvent(slug) : undefined;

  useDocumentHead({
    title: event ? `${event.title} — VinzryyySaga` : "Not Found — VinzryyySaga",
    description: event?.subtitle,
    ogImage: event?.cover ?? event?.photos[0]?.src,
  });

  const coverSrc = event?.cover ?? event?.photos[0]?.src;

  // Preload cover image
  useEffect(() => {
    if (!coverSrc) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = coverSrc;
    document.head.appendChild(link);
    return () => link.remove();
  }, [coverSrc]);

  if (!event) return <NotFound />;

  const prevEvent = getPrevEvent(event.slug);
  const nextEvent = getNextEvent(event.slug);

  return (
    <div>
      {/* ── Cover hero ─────────────────────────────────────────── */}
      {coverSrc && (
        <section className="relative flex h-[40vh] min-h-[260px] items-end overflow-hidden sm:h-[50vh] sm:min-h-[320px]">
          <ResponsiveImg
            src={coverSrc}
            alt={event.title}
            width={1920}
            height={1080}
            decoding="async"
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            sizes="100vw"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sumi via-sumi/40 to-transparent" />
          <div className="relative z-10 w-full px-4 pb-6 sm:px-6 sm:pb-8 md:px-10">
            <div className="mx-auto max-w-[1400px]">
              <Link
                to="/"
                state={{ scrollTo: "events" }}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/80 backdrop-blur-sm transition-colors duration-200 hover:bg-white/10 hover:text-ink"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All events
              </Link>
              {event.group && (
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                  {event.group}
                </p>
              )}
              <h1 className="font-display text-2xl font-bold leading-[1.05] text-ink sm:text-4xl md:text-5xl lg:text-6xl">
                {event.title}
              </h1>
            </div>
          </div>
        </section>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="flex gap-6">
              {/* Vertical tate text */}
              <div className="hidden shrink-0 items-start md:flex">
                <span className="tate font-jp text-xs tracking-[0.5em] text-gold/30" lang="ja" aria-hidden="true">
                  {event.tateText}
                </span>
              </div>

              <div className="space-y-4">
                <ScrollReveal>
                  <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                    {event.location} &middot; {event.date}
                  </p>
                </ScrollReveal>

                {!coverSrc && (
                  <ScrollReveal>
                    <h1 className="font-display text-4xl font-bold leading-[1.05] text-ink md:text-5xl">
                      {event.title}
                    </h1>
                  </ScrollReveal>
                )}

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
      <section className="px-4 pb-6 sm:px-6 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="flex items-center gap-4">
              <span className="font-jp text-sm text-gold/40" lang="ja" aria-hidden="true">枠</span>
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
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          {(!event.layout || event.layout === "classic") && (
            <PhotoGrid photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "magazine" && (
            <MagazineLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "filmstrip" && (
            <FilmstripLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "masonry" && (
            <MasonryLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "spotlight" && (
            <SpotlightLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "fullbleed" && (
            <FullbleedLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "timeline" && (
            <TimelineLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "polaroid" && (
            <PolaroidLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "honeycomb" && (
            <HoneycombLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "diagonal" && (
            <DiagonalLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "splitscroll" && (
            <SplitScrollLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "carousel" && (
            <CarouselLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "stacked" && (
            <StackedLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "mosaic" && (
            <MosaicLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
          {event.layout === "infinite" && (
            <InfiniteLayout photos={event.photos} onOpen={setLightboxIdx} />
          )}
        </div>
      </section>

      {/* ── Prev / Next event navigation ─────────────────────── */}
      <section className="border-t border-hairline px-4 py-10 sm:px-6 sm:py-16 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Previous */}
              <Link
                to={`/events/${prevEvent.slug}`}
                className="group flex items-center gap-4 rounded-lg border border-hairline bg-card/40 p-4 transition-all duration-300 hover:border-hairline/80 hover:bg-card/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors duration-200 group-hover:border-crimson group-hover:text-crimson sm:h-10 sm:w-10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/60">
                    Previous
                  </p>
                  <h3 className="truncate font-display text-base font-bold text-ink/80 transition-colors duration-200 group-hover:text-ink sm:text-lg">
                    {prevEvent.title}
                  </h3>
                </div>
                {prevEvent.photos[0]?.src && (
                  <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded border border-hairline md:block">
                    <img src={prevEvent.photos[0].src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </div>
                )}
              </Link>

              {/* Next */}
              <Link
                to={`/events/${nextEvent.slug}`}
                className="group flex items-center justify-end gap-4 rounded-lg border border-hairline bg-card/40 p-4 text-right transition-all duration-300 hover:border-hairline/80 hover:bg-card/70"
              >
                {nextEvent.photos[0]?.src && (
                  <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded border border-hairline md:block">
                    <img src={nextEvent.photos[0].src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/60">
                    Next
                  </p>
                  <h3 className="truncate font-display text-base font-bold text-ink/80 transition-colors duration-200 group-hover:text-ink sm:text-lg">
                    {nextEvent.title}
                  </h3>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors duration-200 group-hover:border-crimson group-hover:text-crimson sm:h-10 sm:w-10">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Lightbox (code-split) ─────────────────────────────── */}
      {lightboxIdx !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sumi/98">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson/30 border-t-crimson" />
          </div>
        }>
          <Lightbox
            event={event}
            photos={event.photos}
            startIndex={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
