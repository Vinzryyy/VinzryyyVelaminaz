import { describe, it, expect } from "vitest";
import { toKanji, placeholder, getAllEvents, getEvent, getNextEvent, getPrevEvent, getGroupNames, countForGroup, ALL_GROUPS } from "@/lib/data";

describe("toKanji", () => {
  it("converts single digits", () => {
    expect(toKanji(0)).toBe("〇");
    expect(toKanji(1)).toBe("一");
    expect(toKanji(9)).toBe("九");
  });

  it("converts multi-digit numbers", () => {
    expect(toKanji(10)).toBe("一〇");
    expect(toKanji(42)).toBe("四二");
    expect(toKanji(108)).toBe("一〇八");
  });

  it("handles edge cases", () => {
    expect(toKanji(-1)).toBe("?");
    expect(toKanji(1.5)).toBe("?");
    expect(toKanji(NaN)).toBe("?");
    expect(toKanji(Infinity)).toBe("?");
  });
});

describe("placeholder", () => {
  it("returns a CSS gradient string", () => {
    const result = placeholder(0);
    expect(result).toContain("linear-gradient");
    expect(result).toContain("hsl");
  });

  it("returns different gradients for different indices", () => {
    expect(placeholder(0)).not.toBe(placeholder(1));
  });
});

describe("event navigation", () => {
  const events = getAllEvents();

  it("getAllEvents returns non-empty array", () => {
    expect(events.length).toBeGreaterThan(0);
  });

  it("getEvent finds by slug", () => {
    const first = events[0];
    expect(getEvent(first.slug)).toBeDefined();
    expect(getEvent(first.slug)?.title).toBe(first.title);
  });

  it("getEvent returns undefined for unknown slug", () => {
    expect(getEvent("nonexistent-event")).toBeUndefined();
  });

  it("getNextEvent wraps around", () => {
    const last = events[events.length - 1];
    const next = getNextEvent(last.slug);
    expect(next.slug).toBe(events[0].slug);
  });

  it("getPrevEvent wraps around", () => {
    const first = events[0];
    const prev = getPrevEvent(first.slug);
    expect(prev.slug).toBe(events[events.length - 1].slug);
  });

  it("next and prev are inverses", () => {
    const event = events[Math.floor(events.length / 2)];
    const next = getNextEvent(event.slug);
    const backToPrev = getPrevEvent(next.slug);
    expect(backToPrev.slug).toBe(event.slug);
  });
});

describe("group helpers", () => {
  const events = getAllEvents();

  it("getGroupNames starts with ALL_GROUPS", () => {
    const names = getGroupNames(events);
    expect(names[0]).toBe(ALL_GROUPS);
  });

  it("getGroupNames has no duplicates", () => {
    const names = getGroupNames(events);
    expect(new Set(names).size).toBe(names.length);
  });

  it("countForGroup ALL_GROUPS counts everything", () => {
    expect(countForGroup(events, ALL_GROUPS)).toBe(events.length);
  });

  it("countForGroup for specific group is less than total", () => {
    const names = getGroupNames(events);
    const specific = names.find((n) => n !== ALL_GROUPS);
    if (specific) {
      const count = countForGroup(events, specific);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(events.length);
    }
  });
});
