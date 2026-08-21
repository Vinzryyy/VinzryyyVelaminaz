import { useEffect } from "react";
import { useLocation } from "react-router";
import { getAllEvents } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { KatanaDivider } from "@/components/KatanaDivider";

export default function Home() {
  const location = useLocation();
  const events = getAllEvents();
  const totalFrames = events.reduce((n, e) => n + e.photos.length, 0);

  // Handle deferred scroll from Nav links on other pages
  useEffect(() => {
    const id = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (id) {
      // Small delay so the DOM is painted before scrolling
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      });
      // Clear the state so back-navigation doesn't re-scroll
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-end px-6 pb-16 pt-24 md:pb-24 md:pt-40 md:px-10">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-32 top-0 h-[30rem] w-[30rem] rounded-full bg-crimson/[0.06] blur-[160px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gold/[0.04] blur-[120px]" />

        <div className="mx-auto w-full max-w-[1400px]">
          <div className="flex gap-8">
            {/* Vertical decorative text */}
            <div className="hidden shrink-0 items-start md:flex">
              <span className="tate font-jp text-xs tracking-[0.5em] text-gold/30" lang="ja" aria-hidden="true">
                写真集 · 記録
              </span>
            </div>

            <div className="space-y-6">
              <ScrollReveal>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                  Event Photography
                </p>
              </ScrollReveal>

              <ScrollReveal>
                <h1 className="font-display text-5xl font-bold leading-[1.05] text-ink md:text-7xl">
                  Moments caught<br />
                  in <em className="text-sakura">available light</em>
                </h1>
              </ScrollReveal>

              <ScrollReveal>
                <p className="max-w-lg text-base leading-7 text-muted">
                  Live performance, documentary travel, and quiet portrait work —
                  photographed on location across Indonesia with natural and
                  stage light.
                </p>
              </ScrollReveal>

              <ScrollReveal>
                <KatanaDivider active className="w-32" />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Events section ────────────────────────────────────── */}
      <section id="events" className="px-6 pb-24 pt-8 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mb-10 flex items-center gap-4">
              <span className="font-jp text-sm text-gold/40" lang="ja" aria-hidden="true">巻</span>
              <h2 className="font-display text-2xl font-bold text-ink">Events</h2>
              <div className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-faint">
                {events.length} events &middot; {totalFrames} frames
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal stagger>
            <div className="grid gap-5 md:grid-cols-2">
              {events.map((event, i) => (
                <div key={event.slug} className="reveal-child">
                  <EventCard event={event} index={i} />
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Contact section ───────────────────────────────────── */}
      <section id="contact" className="border-t border-hairline px-6 py-24 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mx-auto max-w-lg text-center">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                Get in Touch
              </p>
              <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">Contact</h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Available for commissions, event coverage, and collaborative
                projects. Drop a line and let's make something together.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <a
                  href="mailto:hello@mal.photo"
                  className="font-mono text-sm text-sakura transition-colors duration-200 hover:text-ink"
                >
                  hello@mal.photo
                </a>
                <a
                  href="https://instagram.com/mal.photo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-muted transition-colors duration-200 hover:text-ink"
                >
                  @mal.photo
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
