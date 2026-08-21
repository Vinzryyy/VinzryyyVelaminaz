import { Link } from "react-router";
import type { Event } from "@/lib/types";
import { toKanji, placeholder } from "@/lib/data";
import { KatanaDivider } from "./KatanaDivider";

/**
 * Card component for the home page event grid.
 * `featured` events span the full grid width and are taller.
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
      className={`group relative flex flex-col overflow-hidden rounded-lg border border-hairline bg-card transition-all duration-300 hover:-translate-y-1 hover:border-hairline/80 hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] ${
        event.featured ? "col-span-1 md:col-span-2" : ""
      }`}
    >
      {/* Cover image */}
      <div
        className={`relative w-full shrink-0 overflow-hidden ${
          event.featured ? "h-72 md:h-96" : "h-56 md:h-64"
        }`}
      >
        {hasCover ? (
          <img
            src={coverSrc}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : undefined}
            decoding="async"
            sizes={event.featured ? "(min-width: 768px) 1400px, 100vw" : "(min-width: 768px) 700px, 100vw"}
          />
        ) : (
          <div
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            style={{ background: placeholder(index) }}
          />
        )}

        {/* Kanji frame-count badge */}
        <div
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded border border-ink/10 bg-sumi/80 font-jp text-sm text-gold backdrop-blur-sm"
          aria-label={`${photoCount} photos`}
          role="img"
          lang="ja"
        >
          {toKanji(photoCount)}
        </div>

        {/* Hover overlay with CTA */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
          <span className="translate-y-4 rounded-full border border-white/40 bg-white/10 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            View gallery &rarr;
          </span>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Info strip */}
      <div className="relative flex flex-col gap-2 px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {event.group && (
            <span className="inline-block rounded border border-crimson/30 bg-crimson/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-crimson/80">
              {event.group}
            </span>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/70">
            {event.location} &middot; {event.date}
          </p>
        </div>

        <h3 className="font-display text-xl font-bold leading-snug text-ink/85 transition-colors duration-200 group-hover:text-ink">
          {event.title}
        </h3>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {event.subtitle}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 font-mono text-[10px] text-faint transition-colors duration-200 group-hover:border-crimson/30 group-hover:text-muted">
            {photoCount} frames
          </span>
          <span className="font-mono text-[10px] text-faint opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            View &rarr;
          </span>
        </div>

        <KatanaDivider className="mt-3" />
      </div>
    </Link>
  );
}
