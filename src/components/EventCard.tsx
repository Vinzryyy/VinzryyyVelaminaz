import { Link } from "react-router";
import { useRef, useState } from "react";
import type { Event } from "@/lib/types";
import { toKanji, placeholder } from "@/lib/data";

/**
 * Full-bleed magazine-cover card for the home page event grid.
 * Image fills the entire card; text overlaid at the bottom.
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

  // Blur-up: image starts blurred and sharpens when loaded
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-lg border border-hairline transition-all duration-300 hover:-translate-y-1 hover:border-crimson/25 hover:shadow-[0_16px_56px_rgba(0,0,0,0.5),0_0_40px_rgba(196,41,59,0.08)]"
    >
      {/* Full-bleed cover image with blur-up */}
      {hasCover ? (
        <img
          ref={imgRef}
          src={coverSrc}
          alt={event.title}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.06] ${
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
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          style={{ background: placeholder(index) }}
        />
      )}

      {/* Gradient overlays — bottom darkens more on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500 group-hover:opacity-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* Featured badge */}
      {event.featured && (
        <div className="absolute right-4 top-12 z-10">
          <span className="rounded-full border border-gold/30 bg-black/50 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-gold backdrop-blur-sm">
            Featured
          </span>
        </div>
      )}

      {/* Top bar — group tag + kanji count */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        {event.group && (
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm">
            {event.group}
          </span>
        )}
        <span
          className="ml-auto font-jp text-sm text-gold/70"
          aria-label={`${photoCount} photos`}
          role="img"
          lang="ja"
        >
          {toKanji(photoCount)}
        </span>
      </div>

      {/* Bottom text overlay — staggered reveal on hover */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-5">
        <p className="translate-y-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/50 opacity-70 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {event.location} &middot; {event.date}
        </p>

        <h3 className="translate-y-2 font-display text-lg font-bold leading-tight text-white transition-all duration-300 delay-[50ms] group-hover:translate-y-0">
          {event.title}
        </h3>

        <p className="translate-y-2 line-clamp-2 text-[13px] leading-relaxed text-white/50 opacity-70 transition-all duration-300 delay-[100ms] group-hover:translate-y-0 group-hover:opacity-100">
          {event.subtitle}
        </p>

        {/* Bottom accent line + view prompt — always visible on mobile, hover-reveal on desktop */}
        <div className="mt-1 flex items-center gap-3">
          <div className="h-px flex-1 origin-left bg-gradient-to-r from-crimson/60 to-transparent transition-transform duration-500 delay-[150ms] md:scale-x-75 md:group-hover:scale-x-100" />
          <span className="font-mono text-[10px] tracking-wider text-white/40 transition-all duration-300 delay-[200ms] md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
