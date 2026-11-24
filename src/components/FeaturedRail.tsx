import { useRef, useState } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Event } from "@/lib/types";
import { placeholder, toKanji } from "@/lib/data";
import { ResponsiveImg } from "./ResponsiveImg";
import { ScrollReveal } from "./ScrollReveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Home page row of the events ticked "Featured event" in the admin.
 *
 * On desktop the section pins and the row slides sideways as you scroll down,
 * so scrolling walks through the cards one by one. On phones, and for anyone
 * with reduced motion turned on, it stays a plain swipeable row.
 */
export function FeaturedRail({ events }: { events: Event[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  // The photos load lazily, but browsers don't fetch the ones sitting off to
  // the side of the row until they slide into view, so cards would arrive
  // blank mid-scroll. Once the section gets close, load them all.
  const [eager, setEager] = useState(false);
  const slugs = events.map((e) => e.slug).join(",");

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top bottom+=800",
        once: true,
        onEnter: () => setEager(true),
      });

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const section = sectionRef.current!;
        const track = trackRef.current!;

        // How far the row slides so that its last card ends fully in view.
        const distance = () => {
          const last = track.lastElementChild as HTMLElement | null;
          if (!last) return 0;
          const padRight = parseFloat(getComputedStyle(track).paddingRight) || 0;
          return Math.max(0, last.offsetLeft + last.offsetWidth + padRight - track.clientWidth);
        };

        // GSAP moves the row from here on, so it stops being a swipe scroller.
        gsap.set(track, { overflow: "visible", scrollSnapType: "none" });

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Pinning adds scroll length that the reveal animations further
            // down have to include. Setting a refreshPriority makes
            // ScrollTrigger measure every trigger top to bottom, this one first.
            refreshPriority: 1,
          },
        });

        // Tabbing to a card that is still off to the side: scroll the page to
        // the point where that card sits in the middle of the screen.
        const onFocus = (e: FocusEvent) => {
          const target = e.target as HTMLElement;
          const card = target.closest("li");
          const st = tween.scrollTrigger;
          if (!card || !st || !target.matches(":focus-visible")) return;
          const centred = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
          window.scrollTo({
            top: st.start + Math.min(distance(), Math.max(0, centred)),
            behavior: "smooth",
          });
        };
        track.addEventListener("focusin", onFocus);
        return () => track.removeEventListener("focusin", onFocus);
      });
    },
    { scope: sectionRef, dependencies: [slugs], revertOnUpdate: true },
  );

  const scrollToEvents = () =>
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      ref={sectionRef}
      aria-labelledby="featured-heading"
      className="relative overflow-x-clip py-16 sm:py-20 md:flex md:min-h-[100svh] md:flex-col md:justify-center"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[24rem] w-[24rem] rounded-full bg-bloom/[0.05] blur-[180px]" />

      <ScrollReveal className="relative mx-auto mb-8 w-full max-w-[1400px] px-4 sm:px-6 md:mb-10 md:px-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-jp text-lg text-gold/50" lang="ja" aria-hidden="true">厳選</span>
              <span className="font-display text-sm tracking-widest text-ink/40" aria-hidden="true">──</span>
              <h2 id="featured-heading" className="font-display text-2xl font-bold text-ink">Featured</h2>
            </div>
            <p className="mt-2 text-[13px] tracking-wider text-ink/40">
              <span className="font-jp text-gold/60" lang="ja">{toKanji(events.length)}</span> handpicked events
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToEvents}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-hairline px-4 py-2 font-mono text-xs text-muted transition-colors duration-300 hover:border-bloom/40 hover:text-ink active:scale-95"
          >
            All events
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-0.5">&darr;</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Left padding lines the first card up with the heading on wide screens */}
      <ul
        ref={trackRef}
        className="filmstrip relative flex items-start gap-4 overflow-x-auto px-4 pb-3 sm:gap-5 sm:px-6 md:pl-[max(2.5rem,calc((100%_-_1400px)/2_+_2.5rem))] md:pr-10"
      >
        {events.map((event, i) => (
          <FeaturedCard key={event.slug} event={event} index={i} total={events.length} eager={eager} />
        ))}
      </ul>
    </section>
  );
}

function FeaturedCard({
  event,
  index,
  total,
  eager,
}: {
  event: Event;
  index: number;
  total: number;
  eager: boolean;
}) {
  const cover = event.cover ?? event.photos[0]?.src;
  const [loaded, setLoaded] = useState(false);

  return (
    <li className="aspect-[4/3] w-[85vw] shrink-0 sm:w-[70vw] md:aspect-[3/2] md:h-[min(58svh,560px)] md:w-auto">
      <Link
        to={`/events/${event.slug}`}
        aria-label={`${event.title} — ${event.location}, ${event.date}`}
        className="group relative block h-full w-full overflow-hidden rounded-2xl border border-hairline/60 transition-colors duration-500 hover:border-bloom/30"
        style={{ background: placeholder(index) }}
      >
        {cover && (
          <ResponsiveImg
            src={cover}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            // Cards are 85vw wide on phones and at most 840px wide on desktop.
            sizes="(min-width: 768px) 840px, 85vw"
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Dark gradients keep the text readable on bright photos */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Top: position in the row, group, photo count */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4 sm:p-5">
          <span className="font-mono text-[11px] tracking-[0.2em] text-white/60">
            {pad(index + 1)} / {pad(total)}
          </span>
          {event.group && (
            <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm">
              {event.group}
            </span>
          )}
          <span className="ml-auto font-jp text-sm text-gold/70" lang="ja">
            {toKanji(event.photos.length)}
          </span>
        </div>

        {/* Bottom: where and when, title */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-[0.04em] text-white/70">
              {event.location} &middot; {event.date}
            </p>
            <h3 className="mt-1 font-display text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
              {event.title}
            </h3>
            {event.subtitle && (
              <p className="mt-1 line-clamp-1 text-[13px] text-white/60">{event.subtitle}</p>
            )}
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 font-mono text-[11px] tracking-wider text-bloom transition-transform duration-300 group-hover:translate-x-1"
          >
            View &rarr;
          </span>
        </div>
      </Link>
    </li>
  );
}
