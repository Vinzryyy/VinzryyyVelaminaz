import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { getAllEvents, ALL_GROUPS } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { EventCard } from "@/components/EventCard";
import { GroupFilter } from "@/components/GroupFilter";
import { ScrollReveal } from "@/components/ScrollReveal";

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

type HeroSet = { hero: string; left: string; right: string };

/**
 * Crossfade hook: keeps current + next image layered.
 * Fades next in over `duration` ms, then promotes it to current.
 */
function useCrossfade(allPhotos: string[], interval: number, duration: number) {
  const pick = useCallback((): HeroSet => {
    const p = pickRandom(allPhotos, 3);
    return { hero: p[0], left: p[1], right: p[2] };
  }, [allPhotos]);

  const [current, setCurrent] = useState<HeroSet>(() => pick());
  const [next, setNext] = useState<HeroSet | null>(null);
  const [fading, setFading] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const id = setInterval(() => {
      const incoming = pick();
      setNext(incoming);
      // Trigger fade on next frame so the new img element is in DOM at opacity 0
      requestAnimationFrame(() => setFading(true));
      // After transition completes, promote next → current
      timeoutRef.current = window.setTimeout(() => {
        setCurrent(incoming);
        setNext(null);
        setFading(false);
      }, duration);
    }, interval);

    return () => {
      clearInterval(id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pick, interval, duration]);

  return { current, next, fading };
}

export default function Home() {
  const location = useLocation();
  const events = getAllEvents();

  const allPhotos = useMemo(
    () => events.flatMap((e) => e.photos.map((p) => p.src).filter((s): s is string => !!s)),
    [events]
  );

  const { current, next, fading } = useCrossfade(allPhotos, 25_000, 2000);

  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUPS);
  const visibleEvents = useMemo(
    () => (activeGroup === ALL_GROUPS ? events : events.filter((e) => e.group === activeGroup)),
    [events, activeGroup]
  );

  useDocumentHead({
    title: "VinzryyySaga — Event Photography",
    description: "Live performance, documentary travel, and quiet portrait work — photographed on location at LaLaport BBCC, Kuala Lumpur.",
  });
  const totalFrames = visibleEvents.reduce((n, e) => n + e.photos.length, 0);

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
      <section className="relative flex h-screen min-h-[600px] flex-col overflow-hidden">
        {/* Hero background — smooth crossfade + Ken Burns zoom */}
        <img
          key={`bg-cur-${current.hero}`}
          src={current.hero}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          className="hero-bg pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {next && (
          <img
            key={`bg-nxt-${next.hero}`}
            src={next.hero}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            decoding="async"
            className={`hero-bg pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Layered overlays — vignette + gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)]" />

        {/* Bio text — top-left, below nav */}
        <div className="relative z-10 mt-28 px-6 md:mt-32 md:px-10">
          <ScrollReveal>
            <p className="max-w-[280px] font-display text-sm italic leading-6 text-ink/70 md:max-w-sm md:text-base md:leading-7">
              A fan with a camera, capturing the
              energy and emotion of live events
              — one frame at a time.
            </p>
          </ScrollReveal>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom layer: giant name + floating thumbnails */}
        <div className="relative z-10 px-6 pb-16 md:px-10 md:pb-14">
          {/* Floating portrait thumbnails */}
          <div className="pointer-events-none absolute inset-x-6 bottom-20 md:inset-x-10 md:bottom-20">
            {/* Left thumbnail — slightly tilted */}
            <div className="absolute bottom-8 left-0 md:bottom-4 md:left-[6%]">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/50">
                Event Coverage
              </p>
              <div className="relative h-32 w-[104px] -rotate-3 overflow-hidden border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.5)] md:h-44 md:w-36">
                <img
                  src={current.left}
                  alt=""
                  width={144}
                  height={176}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {next && (
                  <img
                    src={next.left}
                    alt=""
                    width={144}
                    height={176}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
                  />
                )}
              </div>
            </div>

            {/* Right thumbnail — slightly tilted opposite */}
            <div className="absolute bottom-8 right-0 md:bottom-4 md:right-[10%]">
              <p className="mb-2 text-right text-[10px] font-medium uppercase tracking-[0.2em] text-ink/50">
                Visual Storyteller
              </p>
              <div className="relative h-32 w-[104px] rotate-2 overflow-hidden border border-white/15 shadow-[0_8px_40px_rgba(0,0,0,0.5)] md:h-44 md:w-36">
                <img
                  src={current.right}
                  alt=""
                  width={144}
                  height={176}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {next && (
                  <img
                    src={next.right}
                    alt=""
                    width={144}
                    height={176}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Giant name text — outlined */}
          <h1 className="hero-name select-none text-center font-display font-bold uppercase leading-[0.85]">
            <span className="block text-[13vw] md:text-[10vw]">Vinzryyy</span>
            <span className="block text-[13vw] md:text-[10vw]">Saga</span>
          </h1>
        </div>

        {/* Scroll indicator */}
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
          <div className="scroll-hint flex flex-col items-center gap-1">
            <span className="text-[9px] uppercase tracking-[0.3em] text-ink/40">Scroll</span>
            <svg className="h-4 w-4 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Profile section ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-sumi px-6 py-24 md:px-10 md:py-36">
        {/* Subtle noise texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-crimson/[0.04] blur-[180px]" />

        <div className="mx-auto max-w-[1400px]">
          {/* Section label with decorative line */}
          <ScrollReveal>
            <div className="mb-20 flex items-center gap-6 md:mb-28">
              <p className="font-display text-3xl italic text-ink/80 md:text-4xl">
                Profile
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-hairline to-transparent" />
            </div>
          </ScrollReveal>

          {/* Content: text left, photo right */}
          <div className="grid items-center gap-16 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_380px]">
            <ScrollReveal>
              <div className="space-y-6">
                <p className="max-w-2xl text-sm leading-7 text-ink/70 md:text-[15px] md:leading-8" style={{ textAlign: "justify" }}>
                  Vinzryyy is a fan who fell in love with taking photos at live
                  events. What started as snapping memories from the crowd grew
                  into a passion for capturing the energy, emotion, and
                  fleeting moments that make every show unique. Armed with a
                  camera and a front-row spirit, Vinzryyy documents performances,
                  fan meetings, and behind-the-scenes glimpses — turning the
                  experience of being a fan into visual stories that preserve
                  those moments long after the lights go down.
                </p>
                <p className="font-display text-sm italic text-sakura/50">
                  No studio, no assignments — just a fan with a lens and a love for the stage.
                </p>
              </div>
            </ScrollReveal>

            {/* Tilted stacked photo with hover interaction */}
            <ScrollReveal>
              <div className="photo-stack relative mx-auto h-80 w-60 md:mx-0 md:h-[360px] md:w-72">
                {/* Back photo — tilted */}
                <div className="photo-back absolute inset-0 rotate-6 overflow-hidden border border-white/10 shadow-[0_12px_50px_rgba(0,0,0,0.4)] transition-transform duration-500">
                  <img
                    src={current.left}
                    alt=""
                    width={288}
                    height={360}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Front photo — slight opposite tilt */}
                <div className="photo-front absolute inset-0 -rotate-2 overflow-hidden border border-white/10 shadow-[0_12px_50px_rgba(0,0,0,0.4)] transition-transform duration-500">
                  <img
                    src={current.right}
                    alt=""
                    width={288}
                    height={360}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Giant name at bottom — infinite marquee, half-clipped */}
          <div className="mt-20 h-[8vw] overflow-hidden md:mt-28">
            <div className="marquee-track flex w-max">
              <p className="hero-name-solid select-none whitespace-nowrap font-display font-bold uppercase leading-[0.85] text-[14vw] md:text-[11vw]" aria-hidden="true">
                VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;
              </p>
              <p className="hero-name-solid select-none whitespace-nowrap font-display font-bold uppercase leading-[0.85] text-[14vw] md:text-[11vw]" aria-hidden="true">
                VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Events section ────────────────────────────────────── */}
      <section id="events" className="px-6 pb-24 pt-8 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mb-6 flex items-center gap-4">
              <span className="font-jp text-sm text-gold/40" lang="ja" aria-hidden="true">巻</span>
              <h2 className="font-display text-2xl font-bold text-ink">Events</h2>
              <div className="h-px flex-1 bg-hairline" />
              <span className="font-mono text-[11px] text-faint" aria-live="polite">
                {visibleEvents.length} events &middot; {totalFrames} frames
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mb-10">
              <GroupFilter events={events} active={activeGroup} onChange={setActiveGroup} />
            </div>
          </ScrollReveal>

          {/* Keyed on the filter so cards re-run their entrance animation */}
          <div key={activeGroup} className="grid gap-5 md:grid-cols-2">
            {visibleEvents.map((event, i) => (
              <div
                key={event.slug}
                className="card-pop"
                style={{ animationDelay: `${Math.min(i, 7) * 60}ms` }}
              >
                <EventCard event={event} index={i} />
              </div>
            ))}
          </div>

          {visibleEvents.length === 0 && (
            <p className="py-16 text-center font-mono text-sm text-faint">
              No events in this group yet.
            </p>
          )}
        </div>
      </section>

      {/* ── Contact section ───────────────────────────────────── */}
      <section id="contact" className="relative border-t border-hairline px-6 py-24 md:px-10 md:py-32">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[20rem] w-[30rem] -translate-x-1/2 rounded-full bg-crimson/[0.03] blur-[160px]" />
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mx-auto max-w-xl text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.35em] text-sakura/60">
                Get in Touch
              </p>
              <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
                Let's create something together
              </h2>
              <p className="mt-5 text-sm leading-7 text-muted">
                Interested in event coverage or collaborative projects?
                Reach out and let's make it happen.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4">
                <CopyEmail />
                <div className="flex items-center gap-6">
                  <a
                    href="https://instagram.com/VinzryyySaga"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 font-mono text-sm text-muted transition-colors duration-200 hover:text-ink"
                  >
                    <svg className="h-4 w-4 text-faint transition-colors duration-200 group-hover:text-sakura" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    @VinzryyySaga
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

const EMAIL = "hello@vinzryyysaga.com";

function CopyEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(EMAIL);
      } else {
        // Fallback for HTTP / older browsers
        const ta = document.createElement("textarea");
        ta.value = EMAIL;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — the mailto link still works
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={`mailto:${EMAIL}`}
        className="font-mono text-sm text-sakura transition-colors duration-200 hover:text-ink"
      >
        {EMAIL}
      </a>
      <button
        onClick={copy}
        className="flex h-7 w-7 items-center justify-center rounded border border-hairline text-faint transition-colors duration-200 hover:border-sakura/40 hover:text-sakura"
        aria-label="Copy email address"
      >
        {copied ? (
          <svg className="h-3.5 w-3.5 text-sakura" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
}
