import { events as sourceEvents } from "@/content/events";
import type { Event } from "@/lib/types";

const STORAGE_KEY = "vinzryyy-admin-events";

/** Reads admin-edited events from localStorage, falls back to source file. */
function liveEvents(): Event[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return sourceEvents;
}

/** Returns all events in display order. */
export function getAllEvents(): Event[] {
  return liveEvents();
}

/** Returns a single event by slug, or undefined if not found. */
export function getEvent(slug: string): Event | undefined {
  return liveEvents().find((e) => e.slug === slug);
}

/** Returns the next event after the given slug (wraps around). */
export function getNextEvent(slug: string): Event {
  const all = liveEvents();
  const idx = Math.max(0, all.findIndex((e) => e.slug === slug));
  return all[(idx + 1) % all.length];
}

/** Returns the previous event before the given slug (wraps around). */
export function getPrevEvent(slug: string): Event {
  const all = liveEvents();
  const idx = Math.max(0, all.findIndex((e) => e.slug === slug));
  return all[(idx - 1 + all.length) % all.length];
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
    .map((d) => digits[parseInt(d, 10)])
    .join("");
}

/** Sentinel for "no group filter applied". */
export const ALL_GROUPS = "All";

/** Distinct group names in first-appearance order, prefixed with ALL_GROUPS. */
export function getGroupNames(list: Event[]): string[] {
  const seen: string[] = [];
  for (const e of list) {
    if (e.group && !seen.includes(e.group)) seen.push(e.group);
  }
  return [ALL_GROUPS, ...seen];
}

/** Counts events in a group; ALL_GROUPS counts everything. */
export function countForGroup(list: Event[], group: string): number {
  return group === ALL_GROUPS ? list.length : list.filter((e) => e.group === group).length;
}
