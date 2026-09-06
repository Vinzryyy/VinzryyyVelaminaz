import { Link } from "react-router";
import { useRef, useState } from "react";
import type { Event } from "@/lib/types";
import { toKanji, placeholder } from "@/lib/data";

/**
 * Full-bleed magazine-cover card for the home page event grid.
 * Image fills the entire card; text overlaid at the bottom.
 * Hover: image zooms, bottom panel slides up, accent line sweeps.
 */
export function EventCard({
  event,
  index,
}: {
  event: Event;
  index: number;
}) {
  const photoCount = event.photos.length;
  const coverSrc = event.cover ?? event.photos[0]?.src;
  const hasCover = !!coverSrc;

  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border border-hairline/60 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-500 active:scale-[0.98] md:shadow-none md:hover:-translate-y-1.5 md:hover:border-bloom/30 md:hover:shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_50px_rgba(124,92,191,0.12)]"
    >
      {/* Full-bleed cover image with blur-up */}
      {hasCover ? (
        <img
          ref={imgRef}
          src={coverSrc}
          alt={event.title}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.08] ${
            loaded ? "blur-0 scale-100" : "blur-md scale-105"
          }`}
          loading={index < 3 ? "eager" : "lazy"}
          fetchPriority={index < 3 ? "high" : undefined}
          decoding="async"
          sizes="(min-width: 768px) 33vw, 100vw"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.08]"
          style={{ background: placeholder(index) }}
        />
      )}

      {/* Gradient overlays — stronger on mobile for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent md:via-black/30 md:transition-opacity md:duration-500 md:group-hover:opacity-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/5 opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />

      {/* Subtle bloom glow on hover — desktop only */}
      <div className="pointer-events-none absolute -left-20 -top-20 hidden h-40 w-40 rounded-full bg-bloom/20 blur-[60px] transition-opacity duration-700 md:block md:opacity-0 md:group-hover:opacity-100" />

      {/* Featured badge */}
      {event.featured && (
        <div className="absolute right-4 top-12 z-10">
          <span className="rounded-full border border-bloom/30 bg-black/60 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bloom backdrop-blur-sm">
            Featured
          </span>
        </div>
      )}

      {/* Top bar — group tag + kanji count */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        {event.group && (
          <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm transition-colors duration-300 group-hover:border-bloom/20 group-hover:text-white">
            {event.group}
          </span>
        )}
        <span
          className="ml-auto font-jp text-sm text-gold/60 transition-colors duration-300 group-hover:text-gold"
          aria-label={`${photoCount} photos`}
          role="img"
          lang="ja"
        >
          {toKanji(photoCount)}
        </span>
      </div>

      {/* Bottom text overlay — always visible on mobile, slides up on desktop hover */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 rounded-b-xl px-5 pb-5 pt-10 md:translate-y-3 md:transition-transform md:duration-500 md:ease-out md:group-hover:translate-y-0">
        {/* Location / date */}
        <p className="font-mono text-[11px] tracking-[0.04em] text-white/70 md:text-white/60 md:transition-colors md:duration-300 md:group-hover:text-white/80">
          {event.location} &middot; {event.date}
        </p>

        {/* Title */}
        <h3 className="font-display text-lg font-bold leading-tight text-white md:text-white/90 md:transition-colors md:duration-300 md:group-hover:text-white">
          {event.title}
        </h3>

        {/* Subtitle — always visible on mobile, revealed on hover on desktop */}
        <p className="line-clamp-2 text-[13px] leading-relaxed text-white/60 md:max-h-0 md:opacity-0 md:transition-all md:duration-400 md:group-hover:max-h-12 md:group-hover:opacity-100">
          {event.subtitle}
        </p>

        {/* Accent line + view CTA */}
        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-px flex-1 origin-left bg-gradient-to-r from-bloom/50 via-bloom/20 to-transparent md:scale-x-0 md:transition-transform md:duration-600 md:group-hover:scale-x-100" />
          <span className="font-mono text-[11px] tracking-wider text-bloom md:translate-x-4 md:opacity-0 md:transition-all md:duration-300 md:group-hover:translate-x-0 md:group-hover:opacity-100">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
