import type { Event } from "@/lib/types";
import { getGroupNames, countForGroup } from "@/lib/data";

/**
 * Horizontal filter chips for the events grid.
 * Scrolls sideways on narrow screens rather than wrapping into a tall block.
 * The row runs edge to edge: its negative margin cancels the events section's
 * padding (px-4, sm:px-6), so the two must match or the page scrolls sideways.
 * Renders nothing when there is only one group to choose from.
 */
export function GroupFilter({
  events,
  active,
  onChange,
}: {
  events: Event[];
  active: string;
  onChange: (group: string) => void;
}) {
  const groups = getGroupNames(events);
  if (groups.length <= 2) return null;

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      role="group"
      aria-label="Filter events by group"
    >
      {groups.map((g) => {
        const isActive = g === active;
        return (
          <button
            key={g}
            onClick={() => onChange(g)}
            aria-pressed={isActive}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] transition-all duration-300 md:py-2 ${
              isActive
                ? "border-bloom/50 bg-bloom/10 text-bloom"
                : "border-hairline text-muted hover:border-bloom/30 hover:text-ink"
            }`}
          >
            {g}
            <span className={`ml-2 ${isActive ? "text-bloom/70" : "text-muted/70"}`}>
              {countForGroup(events, g)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
