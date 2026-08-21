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
  ].filter((f) => f.value);

  const cols = 2;
  const lastRowStart = Math.floor((facts.length - 1) / cols) * cols;

  return (
    <div className="grid max-w-sm grid-cols-2 border border-hairline lg:max-w-none">
      {facts.map(({ label, value }, i) => (
        <div
          key={label}
          className={`space-y-1 px-4 py-3.5 ${
            i < lastRowStart ? "border-b border-hairline" : ""
          } ${i % cols < cols - 1 && i < facts.length - 1 ? "border-r border-hairline" : ""}`}
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
