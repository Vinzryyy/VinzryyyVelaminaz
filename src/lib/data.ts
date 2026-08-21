import { events } from "@/content/events";
import type { Event } from "@/lib/types";

/** Returns all events in display order. */
export function getAllEvents(): Event[] {
  return events;
}

/** Returns a single event by slug, or undefined if not found. */
export function getEvent(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

/** Returns the next event after the given slug (wraps around). */
export function getNextEvent(slug: string): Event {
  const idx = events.findIndex((e) => e.slug === slug);
  return events[(idx + 1) % events.length];
}

/** Returns the previous event before the given slug (wraps around). */
export function getPrevEvent(slug: string): Event {
  const idx = events.findIndex((e) => e.slug === slug);
  return events[(idx - 1 + events.length) % events.length];
}

/**
 * Generates a dark, moody CSS gradient placeholder for photos
 * that don't have a real `src` yet.
 */
export function placeholder(index: number): string {
  const hues = [280, 320, 340, 200, 260, 300, 220, 250];
  const h = hues[index % hues.length];
  return `linear-gradient(135deg, hsl(${h}, 30%, 12%) 0%, hsl(${(h + 40) % 360}, 25%, 18%) 100%)`;
}

/** Converts a non-negative integer to kanji numerals. */
export function toKanji(n: number): string {
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "?";
  const digits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  return String(n)
    .split("")
    .map((d) => digits[parseInt(d)])
    .join("");
}
