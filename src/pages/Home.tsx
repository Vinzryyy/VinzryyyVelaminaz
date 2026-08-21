import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { getAllEvents } from "@/lib/data";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { EventCard } from "@/components/EventCard";
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

  const [current, setCurrent] = useState<HeroSet>(pick);
  const [next, setNext] = useState<HeroSet | null>(null);
  const [fading, setFading] = useState(false);
  const timeoutRef = useRef<number>();

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
    () => events.flatMap((e) => e.photos.map((p) => p.src)),
    [events]
  );

  const { current, next, fading } = useCrossfade(allPhotos, 15_000, 1500);

  useDocumentHead({
    title: "VinzryyySaga — Event Photography",
    description: "Live performance, documentary travel, and quiet portrait work — photographed on location across Indonesia.",
  });
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
      <section className="relative flex h-screen min-h-[600px] flex-col overflow-hidden">
        {/* Hero background — smooth crossfade */}
        <img
          src={current.hero}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {next && (
          <img
            src={next.hero}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            decoding="async"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

        {/* Bio text — top-left, below nav */}
        <div className="relative z-10 mt-28 px-6 md:mt-32 md:px-10">
          <ScrollReveal>
            <p className="max-w-xs text-sm leading-6 text-ink/70 md:max-w-sm">
              Vinzryyy, an event photographer and visual storyteller,
              captures the beauty of live performance with a unique
              perspective and storytelling.
            </p>
          </ScrollReveal>
        </div>

        {/* Spacer to push bottom content down */}
        <div className="flex-1" />

        {/* Bottom layer: giant name + floating thumbnails */}
        <div className="relative z-10 px-6 pb-6 md:px-10 md:pb-10">
          {/* Floating portrait thumbnails */}
          <div className="pointer-events-none absolute inset-x-6 bottom-12 md:inset-x-10 md:bottom-16">
            {/* Left thumbnail */}
            <div className="absolute bottom-8 left-0 md:bottom-4 md:left-[8%]">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-ink/60">
                Event Coverage
              </p>
              <div className="relative h-28 w-24 overflow-hidden border border-ink/20 shadow-2xl md:h-40 md:w-32">
                <img
                  src={current.left}
                  alt=""
                  width={128}
                  height={160}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {next && (
                  <img
                    src={next.left}
                    alt=""
                    width={128}
                    height={160}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
                  />
                )}
              </div>
            </div>

            {/* Right thumbnail */}
            <div className="absolute bottom-8 right-0 md:bottom-4 md:right-[12%]">
              <p className="mb-2 text-right text-[10px] font-medium uppercase tracking-[0.2em] text-ink/60">
                Visual Storyteller
              </p>
              <div className="relative h-28 w-24 overflow-hidden border border-ink/20 shadow-2xl md:h-40 md:w-32">
                <img
                  src={current.right}
                  alt=""
                  width={128}
                  height={160}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {next && (
                  <img
                    src={next.right}
                    alt=""
                    width={128}
                    height={160}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Giant name text */}
          <h1 className="hero-name select-none text-center font-display font-bold uppercase leading-[0.85] text-white">
            <span className="block text-[12vw] md:text-[10vw]">Vinzryyy</span>
            <span className="block text-[12vw] md:text-[10vw]">Saga</span>
          </h1>
        </div>
      </section>

      {/* ── Profile section ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-sumi px-6 py-20 md:px-10 md:py-32">
        {/* Subtle noise texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

        <div className="mx-auto max-w-[1400px]">
          {/* Section label */}
          <ScrollReveal>
            <p className="mb-16 font-display text-2xl italic text-ink/80 md:mb-24 md:text-3xl">
              Profile
            </p>
          </ScrollReveal>

          {/* Content: text left, photo right */}
          <div className="grid items-end gap-12 md:grid-cols-[1fr_auto]">
            <ScrollReveal>
              <p className="max-w-2xl text-sm leading-7 text-ink/70 md:text-base md:leading-8" style={{ textAlign: "justify" }}>
                Vinzryyy is a fan who fell in love with taking photos at live
                events. What started as snapping memories from the crowd grew
                into a passion for capturing the energy, emotion, and
                fleeting moments that make every show unique. Armed with a
                camera and a front-row spirit, Vinzryyy documents performances,
                fan meetings, and behind-the-scenes glimpses — turning the
                experience of being a fan into visual stories that preserve
                those moments long after the lights go down. No studio, no
                assignments — just a fan with a lens and a love for the
                stage.
              </p>
            </ScrollReveal>

            {/* Tilted stacked photo */}
            <ScrollReveal>
              <div className="relative mx-auto h-72 w-56 md:mx-0 md:h-80 md:w-64">
                {/* Back photo — tilted */}
                <div className="absolute inset-0 rotate-6 overflow-hidden border border-ink/10 shadow-2xl">
                  <img
                    src={current.left}
                    alt=""
                    width={256}
                    height={320}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Front photo — slight opposite tilt */}
                <div className="absolute inset-0 -rotate-2 overflow-hidden border border-ink/10 shadow-2xl">
                  <img
                    src={current.right}
                    alt=""
                    width={256}
                    height={320}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Giant name at bottom, clipped */}
          <div className="mt-16 overflow-hidden md:mt-24">
            <ScrollReveal>
              <p className="hero-name select-none whitespace-nowrap font-display font-bold uppercase leading-[0.85] text-white text-[14vw] md:text-[11vw]" aria-hidden="true">
                Vinzryyy Saga
              </p>
            </ScrollReveal>
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
                <CopyEmail />
                <a
                  href="https://instagram.com/VinzryyySaga"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-muted transition-colors duration-200 hover:text-ink"
                >
                  @VinzryyySaga
                </a>
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
