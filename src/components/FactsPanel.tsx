import type { Event } from "@/lib/types";

/**
 * A bordered grid of event metadata: location, date, frames, gear.
 */
export function FactsPanel({ event }: { event: Event }) {
  const facts = [
    { label: "Location", value: event.location },
    { label: "Date",     value: event.date },
    { label: "Frames",   value: `${event.photos.length} photographs` },
    { label: "Shot on",  value: event.gear },
  ];

  return (
    <div className="grid max-w-sm grid-cols-2 border border-hairline lg:max-w-none">
      {facts.map(({ label, value }, i) => (
        <div
          key={label}
          className={`space-y-1 px-4 py-3.5 ${
            i < 2 ? "border-b border-hairline" : ""
          } ${i % 2 === 0 ? "border-r border-hairline" : ""}`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sakura/60">
            {label}
          </p>
          <p className="font-mono text-sm text-ink/80">{value}</p>
        </div>
      ))}
    </div>
  );
}
