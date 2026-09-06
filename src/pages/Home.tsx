import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getAllEvents, ALL_GROUPS, toKanji } from "@/lib/data";
import { getPageContent } from "@/lib/pageContent";
import { useDocumentHead } from "@/lib/useDocumentHead";
import { EventCard } from "@/components/EventCard";
import { GroupFilter } from "@/components/GroupFilter";
import { ScrollReveal } from "@/components/ScrollReveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
  const content = useMemo(() => getPageContent(), []);

  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUPS);
  const [filterTransition, setFilterTransition] = useState(false);
  const visibleEvents = useMemo(
    () => (activeGroup === ALL_GROUPS ? events : events.filter((e) => e.group === activeGroup)),
    [events, activeGroup]
  );

  const handleGroupChange = useCallback((group: string) => {
    if (group === activeGroup) return;
    setFilterTransition(true);
    setTimeout(() => {
      setActiveGroup(group);
      setFilterTransition(false);
    }, 200);
  }, [activeGroup]);

  useDocumentHead({
    title: "VinzryyySaga — Event Photography",
    description: "Live performance, documentary travel, and quiet portrait work — photographed on location at LaLaport BBCC, Kuala Lumpur.",
    ogImage: "/og-cover.jpg",
  });

  // Preload critical images: hero bg + first 3 event covers
  useEffect(() => {
    const srcs = [
      current.hero,
      ...events.slice(0, 3).map((e) => e.cover ?? e.photos[0]?.src).filter(Boolean),
    ] as string[];

    const links = srcs.map((src) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);
      return link;
    });

    return () => links.forEach((l) => l.remove());
  }, []); // eslint-disable-line -- only on mount

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

  /* ── GSAP refs ──────────────────────────────────────────────── */
  const heroRef = useRef<HTMLElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const cardGridRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  /* ── Hero parallax (GSAP ScrollTrigger scrub) ──────────────── */
  useGSAP(
    () => {
      if (prefersReducedMotion) return;

      // Parallax: shift hero bg images on scroll
      const bgImages = gsap.utils.toArray<HTMLElement>(".hero-bg", heroRef.current!);
      if (bgImages.length > 0) {
        gsap.to(bgImages, {
          y: "-20%",
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current!,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      // Ken Burns replacement: randomised scale/position per image
      bgImages.forEach((img) => {
        const randomX = gsap.utils.random(-3, 3);
        const randomY = gsap.utils.random(-2, 2);
        const randomScale = gsap.utils.random(1.0, 1.08);

        gsap.to(img, {
          scale: randomScale,
          x: `${randomX}%`,
          y: `${randomY}%`,
          duration: 28,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });

      // Hero entrance timeline
      const tl = gsap.timeline({ defaults: { ease: "back.out(1.7)" } });

      tl.from(".hero-tagline", {
        autoAlpha: 0,
        y: 30,
        duration: 0.7,
      })
        .from(
          ".hero-name-line",
          {
            autoAlpha: 0,
            scale: 0.85,
            clipPath: "inset(0 100% 0 0)",
            duration: 0.8,
            stagger: 0.12,
            ease: "power3.out",
          },
          "-=0.35",
        )
        .from(
          ".hero-kanji",
          {
            autoAlpha: 0,
            x: 20,
            duration: 0.6,
          },
          "-=0.4",
        )
        .from(
          ".hero-scroll-indicator",
          {
            autoAlpha: 0,
            y: -10,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.2",
        );

      // Scroll indicator pulse (replaces CSS bounce)
      gsap.to(".hero-scroll-indicator", {
        y: 8,
        autoAlpha: 0.6,
        duration: 1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope: heroRef },
  );

  /* ── Marquee (GSAP horizontal loop) ────────────────────────── */
  useGSAP(
    () => {
      if (prefersReducedMotion) return;
      const track = marqueeRef.current;
      if (!track) return;

      // The track contains two duplicate <p> elements so the content
      // appears seamless. We translate the whole track by -50% and repeat.
      const anim = gsap.to(track, {
        x: "-50%",
        duration: 40,
        ease: "none",
        repeat: -1,
      });

      const pause = () => anim.pause();
      const play = () => anim.play();

      track.addEventListener("mouseenter", pause);
      track.addEventListener("mouseleave", play);

      return () => {
        track.removeEventListener("mouseenter", pause);
        track.removeEventListener("mouseleave", play);
      };
    },
    { scope: marqueeRef },
  );

  /* ── Card entrance stagger (GSAP ScrollTrigger.batch) ──────── */
  useGSAP(
    () => {
      if (prefersReducedMotion) return;
      if (!cardGridRef.current) return;

      const cards = gsap.utils.toArray<HTMLElement>(".gsap-card", cardGridRef.current);
      if (cards.length === 0) return;

      // Set initial state
      gsap.set(cards, { autoAlpha: 0, y: 30, scale: 0.97 });

      ScrollTrigger.batch(cards, {
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            ease: "back.out(1.4)",
            stagger: 0.06,
          });
        },
        start: "top 90%",
      });
    },
    { scope: cardGridRef, dependencies: [activeGroup, visibleEvents] },
  );

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex h-[100svh] min-h-[480px] flex-col overflow-hidden sm:min-h-[600px]">
        {/* Hero background — smooth crossfade + GSAP Ken Burns + parallax */}
        <img
          key={`bg-cur-${current.hero}`}
          src={current.hero}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          className="hero-bg pointer-events-none absolute inset-0 h-[120%] w-full object-cover"
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
            className={`hero-bg pointer-events-none absolute inset-0 h-[120%] w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
          />
        )}

        {/* Layered overlays — vignette + gradient with warm tint */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141210]/90 via-black/30 to-black/20" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(20,18,16,0.5)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#d4945a]/[0.04] via-transparent to-transparent" />

        {/* Bio text — top-left, below nav */}
        <div className="relative z-10 mt-20 px-4 sm:mt-28 sm:px-6 md:mt-32 md:px-10">
          <p className="hero-tagline max-w-[240px] font-display text-xs italic leading-5 text-ink/70 sm:max-w-[280px] sm:text-sm sm:leading-6 md:max-w-sm md:text-base md:leading-7">
            {content.hero.tagline}
          </p>
        </div>

        {/* Vertical kanji — right side */}
        <div className="pointer-events-none absolute right-4 top-1/2 z-10 -translate-y-1/2 sm:right-6 md:right-10">
          <p className="hero-kanji tate font-jp text-sm tracking-[0.5em] text-ink/20 md:text-base" lang="ja" aria-hidden="true">
            {content.hero.verticalKanji}
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom layer: giant name + floating thumbnails */}
        <div className="relative z-10 px-4 pb-14 sm:px-6 sm:pb-16 md:px-10 md:pb-14">
          {/* Giant name text — outlined */}
          <h1 className="hero-name select-none text-center font-display font-bold uppercase leading-[0.85]">
            <span className="hero-name-line block text-[15vw] sm:text-[13vw] md:text-[10vw]">{content.hero.nameLine1}</span>
            <span className="hero-name-line block text-[15vw] sm:text-[13vw] md:text-[10vw]">{content.hero.nameLine2}</span>
          </h1>
        </div>

        {/* Scroll indicator */}
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
          <div className="hero-scroll-indicator flex flex-col items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.3em] text-ink/40">Scroll</span>
            <svg className="h-4 w-4 text-ink/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Profile section ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-sumi">
        {/* Subtle noise texture overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-bloom/[0.06] blur-[180px]" />
        <div className="pointer-events-none absolute -left-32 bottom-40 h-[20rem] w-[20rem] rounded-full bg-sakura/[0.03] blur-[160px]" />

        {/* Top: full-width photo band with 3 images */}
        <div className="relative">
          <ScrollReveal>
            <div className="flex h-[280px] gap-1 overflow-hidden sm:h-[340px] md:h-[420px]">
              <div className="relative flex-[2] overflow-hidden">
                <img
                  src={current.hero}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sumi via-transparent to-transparent" />
              </div>
              <div className="relative hidden flex-1 overflow-hidden sm:block">
                <img
                  src={current.left}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sumi via-transparent to-transparent" />
              </div>
              <div className="relative hidden flex-1 overflow-hidden md:block">
                <img
                  src={current.right}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sumi via-transparent to-transparent" />
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Bottom: text content overlapping the photo band */}
        <div className="relative -mt-16 px-4 pb-16 sm:-mt-20 sm:px-6 sm:pb-24 md:-mt-24 md:px-10 md:pb-36">
          <div className="mx-auto max-w-[1400px]">
            {/* Section label */}
            <ScrollReveal>
              <div className="mb-8 flex items-end gap-4 sm:mb-12 md:mb-16">
                <p className="font-display text-3xl font-bold text-ink md:text-5xl">
                  {content.profile.sectionLabel}
                </p>
                <div className="mb-2 h-px flex-1 bg-gradient-to-r from-hairline to-transparent" />
                <span className="mb-1 font-jp text-sm text-gold/40" lang="ja" aria-hidden="true">侍</span>
              </div>
            </ScrollReveal>

            {/* Two-column: bio left, stats/quote right */}
            <div className="grid gap-10 md:grid-cols-[1fr_1px_320px] md:gap-12">
              {/* Bio */}
              <ScrollReveal>
                <div className="space-y-5">
                  <p className="max-w-[60ch] text-[15px] leading-[1.85] text-ink/75 md:text-base md:leading-8" style={{ hyphens: "auto" }}>
                    {content.profile.bio}
                  </p>
                </div>
              </ScrollReveal>

              {/* Vertical divider — desktop only */}
              <div className="hidden bg-gradient-to-b from-transparent via-hairline to-transparent md:block" />

              {/* Quote + stats */}
              <ScrollReveal>
                <div className="flex flex-col gap-8">
                  {/* Quote */}
                  <blockquote className="relative border-l-2 border-bloom/40 py-1 pl-5">
                    <p className="font-display text-[15px] italic leading-relaxed text-ink/60">
                      {content.profile.quote}
                    </p>
                  </blockquote>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-ink md:text-3xl">{events.length}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">Events</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-ink md:text-3xl">{totalFrames}</p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">Frames</p>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-2xl font-bold text-bloom md:text-3xl">
                        {new Set(events.map(e => e.group).filter(Boolean)).size}
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted">Groups</p>
                    </div>
                  </div>

                  {/* Gear tag */}
                  <div className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="font-mono text-[12px] text-muted">Canon EOS R8</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Giant name marquee */}
        <div className="h-[8vw] overflow-hidden">
          <div ref={marqueeRef} className="marquee-track flex w-max">
            <p className="hero-name-solid select-none whitespace-nowrap font-display font-bold uppercase leading-[0.85] text-[14vw] md:text-[11vw]" aria-hidden="true">
              VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;
            </p>
            <p className="hero-name-solid select-none whitespace-nowrap font-display font-bold uppercase leading-[0.85] text-[14vw] md:text-[11vw]" aria-hidden="true">
              VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;VinzryyySaga&nbsp;&nbsp;&middot;&nbsp;&nbsp;
            </p>
          </div>
        </div>
      </section>

      {/* ── Events section ────────────────────────────────────── */}
      <section id="events" className="relative px-4 pb-16 pt-8 sm:px-6 sm:pb-24 md:px-10">
        {/* Sakura ambient glow */}
        <div className="pointer-events-none absolute right-0 top-1/3 h-[25rem] w-[25rem] rounded-full bg-bloom/[0.03] blur-[200px]" />
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="font-jp text-lg text-gold/50" lang="ja" aria-hidden="true">第巻</span>
                <span className="font-display text-sm tracking-widest text-ink/40">──</span>
                <h2 className="font-display text-2xl font-bold text-ink">Events</h2>
              </div>
              <p className="mt-2 font-jp text-[13px] tracking-wider text-muted" lang="ja" aria-live="polite">
                <span className="text-gold/60">{toKanji(visibleEvents.length)}</span>
                <span className="text-ink/40"> events · </span>
                <span className="text-gold/60">{toKanji(totalFrames)}</span>
                <span className="text-ink/40"> frames</span>
              </p>
              <div className="mt-3 h-px bg-gradient-to-r from-hairline to-transparent" />
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mb-10">
              <GroupFilter events={events} active={activeGroup} onChange={handleGroupChange} />
            </div>
          </ScrollReveal>

          {/* 3-column masonry grid, last row centered */}
          {(() => {
            const tail = visibleEvents.length % 3;
            const full = visibleEvents.slice(0, visibleEvents.length - tail);
            const remainder = visibleEvents.slice(visibleEvents.length - tail);
            return (
              <div
                ref={cardGridRef}
                key={activeGroup}
                className={`space-y-4 sm:space-y-5 transition-opacity duration-200 ${filterTransition ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
                style={{ transition: "opacity 0.2s ease, transform 0.2s ease" }}
              >
                {full.length > 0 && (
                  <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
                    {full.map((event, i) => (
                      <div key={event.slug} className="gsap-card">
                        <EventCard event={event} index={i} />
                      </div>
                    ))}
                  </div>
                )}
                {tail > 0 && (
                  <div className="flex justify-center gap-4 sm:gap-5">
                    {remainder.map((event, i) => (
                      <div key={event.slug} className="gsap-card w-full md:w-[calc(33.333%-0.875rem)]">
                        <EventCard event={event} index={full.length + i} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {visibleEvents.length === 0 && (
            <p className="py-16 text-center font-mono text-sm text-faint">
              No events in this group yet.
            </p>
          )}
        </div>
      </section>

      {/* ── Contact section ───────────────────────────────────── */}
      <section id="contact" className="relative border-t border-hairline px-4 py-16 sm:px-6 sm:py-24 md:px-10 md:py-32">
        {/* Sakura ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[20rem] w-[30rem] -translate-x-1/2 rounded-full bg-bloom/[0.05] blur-[160px]" />
        <div className="mx-auto max-w-[1400px]">
          <ScrollReveal>
            <div className="mx-auto max-w-xl text-center">
              <a
                href={content.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-full border border-hairline px-6 py-3 font-mono text-sm text-muted transition-all duration-300 hover:border-bloom/40 hover:text-ink active:scale-95"
              >
                <svg className="h-5 w-5 text-muted transition-colors duration-300 group-hover:text-bloom" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                {content.contact.instagramHandle}
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
