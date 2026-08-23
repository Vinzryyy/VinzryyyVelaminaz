import type { Event } from "@/lib/types";
import { getGroupNames, countForGroup } from "@/lib/data";

/**
 * Horizontal filter chips for the events grid.
 * Scrolls sideways on narrow screens rather than wrapping into a tall block.
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
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
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
            className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
              isActive
                ? "border-crimson/50 bg-crimson/10 text-crimson"
                : "border-hairline text-faint hover:border-crimson/30 hover:text-muted"
            }`}
          >
            {g}
            <span className={`ml-2 ${isActive ? "text-crimson/60" : "text-faint/60"}`}>
              {countForGroup(events, g)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
