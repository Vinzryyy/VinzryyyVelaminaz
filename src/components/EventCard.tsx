import { Link } from "react-router";
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

  return (
    <Link
      to={`/events/${event.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-lg border border-hairline transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_16px_56px_rgba(0,0,0,0.5)]"
    >
      {/* Full-bleed cover image */}
      {hasCover ? (
        <img
          src={coverSrc}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          loading={index < 3 ? "eager" : "lazy"}
          fetchPriority={index < 3 ? "high" : undefined}
          decoding="async"
          sizes="(min-width: 768px) 33vw, 100vw"
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

        {/* Bottom accent line + view prompt */}
        <div className="mt-1 flex items-center gap-3">
          <div className="h-px flex-1 origin-left scale-x-75 bg-gradient-to-r from-crimson/60 to-transparent transition-transform duration-500 delay-[150ms] group-hover:scale-x-100" />
          <span className="translate-x-2 font-mono text-[10px] tracking-wider text-white/40 opacity-0 transition-all duration-300 delay-[200ms] group-hover:translate-x-0 group-hover:opacity-100">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
