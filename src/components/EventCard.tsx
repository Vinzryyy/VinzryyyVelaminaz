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
      className={`group relative flex flex-col overflow-hidden border border-hairline bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_color-mix(in_srgb,var(--color-crimson)_15%,transparent)] ${
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
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading={index < 2 ? "eager" : "lazy"}
            fetchPriority={index < 2 ? "high" : undefined}
            decoding="async"
            sizes={event.featured ? "(min-width: 768px) 1400px, 100vw" : "(min-width: 768px) 700px, 100vw"}
          />
        ) : (
          <div
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ background: placeholder(index) }}
          />
        )}

        {/* Kanji frame-count badge */}
        <div
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-ink/10 bg-sumi/80 font-jp text-sm text-gold backdrop-blur-sm"
          aria-label={`${photoCount} photos`}
          role="img"
          lang="ja"
        >
          {toKanji(photoCount)}
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Info strip */}
      <div className="relative flex flex-col gap-2 px-5 pb-5 pt-4">
        <div className="flex items-center gap-2">
          {event.group && (
            <span className="inline-block border border-crimson/30 bg-crimson/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-crimson/80">
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

        <p className="text-sm leading-relaxed text-muted">
          {event.subtitle}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 font-mono text-[10px] text-faint">
            {photoCount} frames
          </span>
        </div>

        <KatanaDivider className="mt-3" />
      </div>
    </Link>
  );
}
