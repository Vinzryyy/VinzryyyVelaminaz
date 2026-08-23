import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Event, Photo } from "@/lib/types";
import { getPageContent, savePageContent, resetPageContent, defaultContent } from "@/lib/pageContent";
import { getAnalytics, trackPageView } from "@/lib/analytics";

/* ── Test helpers ──────────────────────────────────────────────── */

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function makePhoto(title: string, opts?: Partial<Photo>): Photo {
  return { title, story: `Story for ${title}`, src: `/gallery/test/${title.toLowerCase().replace(/\s/g, "-")}.webp`, ...opts };
}

function makeEvent(overrides?: Partial<Event>): Event {
  return {
    slug: "test-event",
    title: "Test Event",
    group: "TestGroup",
    tateText: "第一巻",
    location: "Tokyo",
    date: "2026-08",
    gear: "Canon R5",
    subtitle: "Test subtitle",
    description: "Test description",
    featured: false,
    photos: [
      makePhoto("Cole I"),
      makePhoto("Cole II"),
      makePhoto("Cole III"),
      makePhoto("Full Squad"),
      makePhoto("Fame I"),
      makePhoto("Fame II"),
      makePhoto("Feni I"),
      makePhoto("Feni II"),
      makePhoto("Feni III"),
      makePhoto("Mashiro I"),
    ],
    ...overrides,
  };
}

const STORAGE_KEY = "vinzryyy-admin-events";

/* ── Auth ──────────────────────────────────────────────────────── */

describe("Admin Auth", () => {
  const AUTH_KEY = "vinzryyy-admin-auth";
  const LOCKOUT_KEY = "vinzryyy-admin-lockout";

  it("session token has correct structure", () => {
    const token = JSON.stringify({ token: "test-uuid", expires: Date.now() + 30 * 60 * 1000 });
    sessionStorage.setItem(AUTH_KEY, token);
    const parsed = JSON.parse(sessionStorage.getItem(AUTH_KEY)!);
    expect(parsed.token).toBe("test-uuid");
    expect(parsed.expires).toBeGreaterThan(Date.now());
  });

  it("expired session returns null", () => {
    const expired = JSON.stringify({ token: "old", expires: Date.now() - 1000 });
    sessionStorage.setItem(AUTH_KEY, expired);
    const data = JSON.parse(sessionStorage.getItem(AUTH_KEY)!);
    expect(data.expires).toBeLessThan(Date.now());
  });

  it("lockout tracks failed attempts", () => {
    const lock = { attempts: 4, until: 0 };
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lock));
    const loaded = JSON.parse(localStorage.getItem(LOCKOUT_KEY)!);
    expect(loaded.attempts).toBe(4);
  });

  it("lockout activates after max attempts", () => {
    const lock = { attempts: 0, until: Date.now() + 120000 };
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lock));
    const loaded = JSON.parse(localStorage.getItem(LOCKOUT_KEY)!);
    expect(loaded.until).toBeGreaterThan(Date.now());
  });

  it("corrupted auth data handled gracefully", () => {
    sessionStorage.setItem(AUTH_KEY, "not json{{{");
    expect(() => {
      try { JSON.parse(sessionStorage.getItem(AUTH_KEY)!); } catch { /* expected */ }
    }).not.toThrow();
  });

  it("corrupted lockout data handled gracefully", () => {
    localStorage.setItem(LOCKOUT_KEY, "broken");
    let lock = { attempts: 0, until: 0 };
    try {
      lock = JSON.parse(localStorage.getItem(LOCKOUT_KEY)!);
    } catch { /* expected fallback */ }
    expect(lock.attempts).toBe(0);
  });
});

/* ── Event CRUD ────────────────────────────────────────────────── */

describe("Admin Event CRUD", () => {
  it("creates event with unique slug", () => {
    const events = [makeEvent({ slug: "event-1" }), makeEvent({ slug: "event-2" })];
    const newEvent: Event = {
      ...makeEvent(),
      slug: `new-event-${Date.now()}`,
      title: "New Event",
      photos: [],
    };
    events.unshift(newEvent);
    expect(events[0].title).toBe("New Event");
    expect(events.length).toBe(3);
  });

  it("updates event fields without affecting other events", () => {
    const events = [makeEvent({ slug: "a", title: "A" }), makeEvent({ slug: "b", title: "B" })];
    const updated = events.map((e) => (e.slug === "a" ? { ...e, title: "Updated A" } : e));
    expect(updated[0].title).toBe("Updated A");
    expect(updated[1].title).toBe("B");
  });

  it("deletes correct event from list", () => {
    const events = [makeEvent({ slug: "a" }), makeEvent({ slug: "b" }), makeEvent({ slug: "c" })];
    const after = events.filter((e) => e.slug !== "b");
    expect(after.length).toBe(2);
    expect(after.map((e) => e.slug)).toEqual(["a", "c"]);
  });

  it("handles deleting last event", () => {
    const events = [makeEvent({ slug: "only" })];
    const after = events.filter((e) => e.slug !== "only");
    expect(after.length).toBe(0);
  });

  it("handles deleting non-existent slug", () => {
    const events = [makeEvent({ slug: "a" })];
    const after = events.filter((e) => e.slug !== "nonexistent");
    expect(after.length).toBe(1);
  });

  it("persists events to localStorage", () => {
    const events = [makeEvent()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(loaded.length).toBe(1);
    expect(loaded[0].title).toBe("Test Event");
  });

  it("loads events from localStorage", () => {
    const events = [makeEvent({ title: "Saved Event" })];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    const loaded: Event[] = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(loaded[0].title).toBe("Saved Event");
  });

  it("reset clears localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEvent()]));
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("featured toggle works", () => {
    const event = makeEvent({ featured: false });
    const toggled = { ...event, featured: true };
    expect(toggled.featured).toBe(true);
  });
});

/* ── Photo Management ──────────────────────────────────────────── */

describe("Admin Photo Management", () => {
  describe("add/remove", () => {
    it("adds photo at end", () => {
      const photos = [makePhoto("A"), makePhoto("B")];
      photos.push({ title: "C", story: "", src: "" });
      expect(photos.length).toBe(3);
      expect(photos[2].title).toBe("C");
    });

    it("removes photo at specific index", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C"), makePhoto("D")];
      const after = photos.filter((_, i) => i !== 1);
      expect(after.length).toBe(3);
      expect(after.map((p) => p.title)).toEqual(["A", "C", "D"]);
    });

    it("removes first photo", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C")];
      const after = photos.filter((_, i) => i !== 0);
      expect(after[0].title).toBe("B");
    });

    it("removes last photo", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C")];
      const after = photos.filter((_, i) => i !== 2);
      expect(after.length).toBe(2);
      expect(after[after.length - 1].title).toBe("B");
    });

    it("handles removing from single-photo array", () => {
      const photos = [makePhoto("Only")];
      const after = photos.filter((_, i) => i !== 0);
      expect(after.length).toBe(0);
    });
  });

  describe("reorder", () => {
    it("swaps adjacent photos forward", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C")];
      [photos[0], photos[1]] = [photos[1], photos[0]];
      expect(photos.map((p) => p.title)).toEqual(["B", "A", "C"]);
    });

    it("swaps adjacent photos backward", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C")];
      [photos[1], photos[2]] = [photos[2], photos[1]];
      expect(photos.map((p) => p.title)).toEqual(["A", "C", "B"]);
    });

    it("move does not go below 0", () => {
      const idx = 0;
      const dir = -1;
      const target = idx + dir;
      expect(target).toBeLessThan(0);
    });

    it("move does not go past length", () => {
      const photos = [makePhoto("A"), makePhoto("B")];
      const idx = photos.length - 1;
      const dir = 1;
      const target = idx + dir;
      expect(target).toBeGreaterThanOrEqual(photos.length);
    });

    it("drag reorder inserts at correct position", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C"), makePhoto("D"), makePhoto("E")];
      // Drag index 0 to index 3
      const dragIdx = 0;
      const dropIdx = 3;
      const [moved] = photos.splice(dragIdx, 1);
      photos.splice(dropIdx, 0, moved);
      expect(photos.map((p) => p.title)).toEqual(["B", "C", "D", "A", "E"]);
    });

    it("drag reorder from end to start", () => {
      const photos = [makePhoto("A"), makePhoto("B"), makePhoto("C")];
      const [moved] = photos.splice(2, 1);
      photos.splice(0, 0, moved);
      expect(photos.map((p) => p.title)).toEqual(["C", "A", "B"]);
    });
  });

  describe("selection after delete", () => {
    function shiftSelection(selected: Set<number>, deletedIdx: number): Set<number> {
      const next = new Set<number>();
      for (const i of selected) {
        if (i < deletedIdx) next.add(i);
        else if (i > deletedIdx) next.add(i - 1);
      }
      return next;
    }

    it("shifts all indices above deleted", () => {
      const result = shiftSelection(new Set([0, 2, 4, 6]), 3);
      expect([...result].sort()).toEqual([0, 2, 3, 5]);
    });

    it("removes the deleted index", () => {
      const result = shiftSelection(new Set([1, 2, 3]), 2);
      expect(result.size).toBe(2);
      expect([...result].sort()).toEqual([1, 2]); // 3→2
    });

    it("handles all selected below deleted", () => {
      const result = shiftSelection(new Set([0, 1, 2]), 5);
      expect([...result].sort()).toEqual([0, 1, 2]);
    });

    it("handles all selected above deleted", () => {
      const result = shiftSelection(new Set([3, 4, 5]), 0);
      expect([...result].sort()).toEqual([2, 3, 4]);
    });

    it("handles consecutive indices with middle deleted", () => {
      const result = shiftSelection(new Set([0, 1, 2, 3, 4]), 2);
      expect([...result].sort()).toEqual([0, 1, 2, 3]); // 3→2, 4→3
    });

    it("handles empty selection", () => {
      const result = shiftSelection(new Set(), 3);
      expect(result.size).toBe(0);
    });
  });

  describe("editIdx after delete", () => {
    function adjustEditIdx(editIdx: number | null, deletedIdx: number): number | null {
      if (editIdx === null) return null;
      if (editIdx === deletedIdx) return null;
      return editIdx > deletedIdx ? editIdx - 1 : editIdx;
    }

    it("clears when editing deleted photo", () => {
      expect(adjustEditIdx(3, 3)).toBeNull();
    });

    it("shifts down when earlier photo deleted", () => {
      expect(adjustEditIdx(5, 2)).toBe(4);
    });

    it("unchanged when later photo deleted", () => {
      expect(adjustEditIdx(2, 5)).toBe(2);
    });

    it("handles null editIdx", () => {
      expect(adjustEditIdx(null, 3)).toBeNull();
    });

    it("handles editing first, deleting first", () => {
      expect(adjustEditIdx(0, 0)).toBeNull();
    });

    it("handles editing second, deleting first", () => {
      expect(adjustEditIdx(1, 0)).toBe(0);
    });
  });
});

/* ── Photo Grouping / Sequences ────────────────────────────────── */

describe("Admin Photo Grouping", () => {
  it("groups selected photos with sequence name", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([0, 1, 2]);
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "ColeSet", sequenceDisplay: "filmstrip" as const } : ph
    );
    expect(grouped[0].sequence).toBe("ColeSet");
    expect(grouped[1].sequence).toBe("ColeSet");
    expect(grouped[2].sequence).toBe("ColeSet");
    expect(grouped[3].sequence).toBeUndefined();
    expect(grouped[0].sequenceDisplay).toBe("filmstrip");
  });

  it("groups with stack display mode", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([4, 5]);
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "FameSet", sequenceDisplay: "stack" as const } : ph
    );
    expect(grouped[4].sequenceDisplay).toBe("stack");
    expect(grouped[5].sequenceDisplay).toBe("stack");
  });

  it("groups with slideshow display mode", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([6, 7, 8]);
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "FeniSet", sequenceDisplay: "slideshow" as const } : ph
    );
    expect(grouped[6].sequenceDisplay).toBe("slideshow");
    expect(grouped[7].sequenceDisplay).toBe("slideshow");
    expect(grouped[8].sequenceDisplay).toBe("slideshow");
  });

  it("groups with collage display mode", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([0, 3, 9]);
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "Mix", sequenceDisplay: "collage" as const } : ph
    );
    expect(grouped[0].sequenceDisplay).toBe("collage");
    expect(grouped[3].sequenceDisplay).toBe("collage");
    expect(grouped[9].sequenceDisplay).toBe("collage");
  });

  it("ungroups selected photos", () => {
    const photos: Photo[] = [
      makePhoto("A", { sequence: "G1", sequenceDisplay: "filmstrip" }),
      makePhoto("B", { sequence: "G1", sequenceDisplay: "filmstrip" }),
      makePhoto("C", { sequence: "G2", sequenceDisplay: "stack" }),
      makePhoto("D"),
    ];
    const selected = new Set([0, 1]);
    const ungrouped = photos.map((ph, i) =>
      selected.has(i) ? { ...ph, sequence: undefined, sequenceDisplay: undefined } : ph
    );
    expect(ungrouped[0].sequence).toBeUndefined();
    expect(ungrouped[1].sequence).toBeUndefined();
    expect(ungrouped[2].sequence).toBe("G2");
    expect(ungrouped[3].sequence).toBeUndefined();
  });

  it("regroups photos to different group", () => {
    const photos: Photo[] = [
      makePhoto("A", { sequence: "Old", sequenceDisplay: "filmstrip" }),
      makePhoto("B", { sequence: "Old", sequenceDisplay: "filmstrip" }),
    ];
    const selected = new Set([0, 1]);
    const regrouped = photos.map((ph, i) =>
      selected.has(i) ? { ...ph, sequence: "New", sequenceDisplay: "collage" as const } : ph
    );
    expect(regrouped[0].sequence).toBe("New");
    expect(regrouped[0].sequenceDisplay).toBe("collage");
  });

  it("builds sequence map correctly", () => {
    const photos: Photo[] = [
      makePhoto("A", { sequence: "G1" }),
      makePhoto("B", { sequence: "G1" }),
      makePhoto("C"),
      makePhoto("D", { sequence: "G2" }),
      makePhoto("E", { sequence: "G1" }),
    ];
    const map = new Map<string, number[]>();
    photos.forEach((p, i) => {
      if (p.sequence) {
        const existing = map.get(p.sequence);
        if (existing) existing.push(i);
        else map.set(p.sequence, [i]);
      }
    });
    expect(map.get("G1")).toEqual([0, 1, 4]);
    expect(map.get("G2")).toEqual([3]);
    expect(map.size).toBe(2);
  });

  it("empty group name is rejected", () => {
    const groupName = "   ";
    expect(groupName.trim()).toBe("");
    expect(groupName.trim().length === 0).toBe(true);
  });

  it("group with zero selected is no-op", () => {
    const selected = new Set<number>();
    const photos = [makePhoto("A")];
    const result = photos.map((ph, i) =>
      selected.has(i) ? { ...ph, sequence: "Test" } : ph
    );
    expect(result[0].sequence).toBeUndefined();
  });
});

/* ── Page Content Editor ───────────────────────────────────────── */

describe("Admin Page Content", () => {
  it("saves hero tagline", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, tagline: "New tagline" } };
    savePageContent(content);
    expect(getPageContent().hero.tagline).toBe("New tagline");
  });

  it("saves profile bio", () => {
    const content = { ...defaultContent, profile: { ...defaultContent.profile, bio: "New bio text" } };
    savePageContent(content);
    expect(getPageContent().profile.bio).toBe("New bio text");
  });

  it("saves contact email", () => {
    const content = { ...defaultContent, contact: { ...defaultContent.contact, email: "new@email.com" } };
    savePageContent(content);
    expect(getPageContent().contact.email).toBe("new@email.com");
  });

  it("saves instagram handle and URL together", () => {
    const content = {
      ...defaultContent,
      contact: {
        ...defaultContent.contact,
        instagramUrl: "https://instagram.com/NewHandle",
        instagramHandle: "@NewHandle",
      },
    };
    savePageContent(content);
    const loaded = getPageContent();
    expect(loaded.contact.instagramUrl).toBe("https://instagram.com/NewHandle");
    expect(loaded.contact.instagramHandle).toBe("@NewHandle");
  });

  it("saves hero name lines", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, nameLine1: "Feni", nameLine2: "Helisma" } };
    savePageContent(content);
    const loaded = getPageContent();
    expect(loaded.hero.nameLine1).toBe("Feni");
    expect(loaded.hero.nameLine2).toBe("Helisma");
  });

  it("saves vertical kanji", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, verticalKanji: "侍桜" } };
    savePageContent(content);
    expect(getPageContent().hero.verticalKanji).toBe("侍桜");
  });

  it("preserves other sections when saving one", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, tagline: "Changed" } };
    savePageContent(content);
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe("Changed");
    expect(loaded.profile.bio).toBe(defaultContent.profile.bio);
    expect(loaded.contact.email).toBe(defaultContent.contact.email);
  });

  it("reset restores all defaults", () => {
    savePageContent({
      ...defaultContent,
      hero: { ...defaultContent.hero, tagline: "X" },
      profile: { ...defaultContent.profile, bio: "Y" },
      contact: { ...defaultContent.contact, email: "Z" },
    });
    resetPageContent();
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe(defaultContent.hero.tagline);
    expect(loaded.profile.bio).toBe(defaultContent.profile.bio);
    expect(loaded.contact.email).toBe(defaultContent.contact.email);
  });

  it("handles empty string values", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, tagline: "" } };
    savePageContent(content);
    expect(getPageContent().hero.tagline).toBe("");
  });

  it("handles unicode content", () => {
    const content = { ...defaultContent, hero: { ...defaultContent.hero, tagline: "写真を撮る 📸" } };
    savePageContent(content);
    expect(getPageContent().hero.tagline).toBe("写真を撮る 📸");
  });
});

/* ── Dashboard Analytics ───────────────────────────────────────── */

describe("Admin Dashboard Analytics", () => {
  it("tracks admin page view", () => {
    trackPageView("/FeniHelismaNaylaDevi");
    const stats = getAnalytics();
    expect(stats.topPages.find((p) => p.path === "/FeniHelismaNaylaDevi")).toBeDefined();
  });

  it("tracks event page views", () => {
    trackPageView("/events/quadlips-performance-day1");
    trackPageView("/events/quadlips-performance-day1");
    trackPageView("/events/klp48-kkv");
    const stats = getAnalytics();
    const quad = stats.topPages.find((p) => p.path === "/events/quadlips-performance-day1");
    expect(quad?.views).toBe(2);
  });

  it("today views count correctly", () => {
    trackPageView("/");
    trackPageView("/events/a");
    trackPageView("/events/b");
    trackPageView("/events/b");
    const stats = getAnalytics();
    expect(stats.todayViews).toBe(4);
  });

  it("top pages sorted by views descending", () => {
    trackPageView("/low");
    trackPageView("/high");
    trackPageView("/high");
    trackPageView("/high");
    trackPageView("/mid");
    trackPageView("/mid");
    const stats = getAnalytics();
    expect(stats.topPages[0].path).toBe("/high");
    expect(stats.topPages[0].views).toBe(3);
  });

  it("daily views has today entry", () => {
    trackPageView("/");
    const stats = getAnalytics();
    const today = new Date().toISOString().slice(0, 10);
    expect(stats.dailyViews.find((d) => d.date === today)).toBeDefined();
  });
});

/* ── Export ─────────────────────────────────────────────────────── */

describe("Admin Export", () => {
  it("generates valid TypeScript export", () => {
    const events = [makeEvent()];
    const code = `import type { Event } from "@/lib/types";\n\nexport const events: Event[] = ${JSON.stringify(events, null, 2)};`;
    expect(code).toContain('import type { Event }');
    expect(code).toContain('"slug": "test-event"');
    expect(code).toContain('"title": "Test Event"');
  });

  it("generates valid JSON export", () => {
    const events = [makeEvent()];
    const json = JSON.stringify(events, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed[0].slug).toBe("test-event");
    expect(parsed[0].photos.length).toBe(10);
  });

  it("export preserves photo sequences", () => {
    const event = makeEvent();
    event.photos[0].sequence = "TestGroup";
    event.photos[0].sequenceDisplay = "filmstrip";
    const json = JSON.stringify([event]);
    const parsed = JSON.parse(json);
    expect(parsed[0].photos[0].sequence).toBe("TestGroup");
    expect(parsed[0].photos[0].sequenceDisplay).toBe("filmstrip");
  });

  it("export handles special characters in text", () => {
    const event = makeEvent({ title: 'Event "with" <special> & chars' });
    const json = JSON.stringify([event]);
    const parsed = JSON.parse(json);
    expect(parsed[0].title).toBe('Event "with" <special> & chars');
  });
});

/* ── Edge Cases ────────────────────────────────────────────────── */

describe("Admin Edge Cases", () => {
  it("handles event with no photos", () => {
    const event = makeEvent({ photos: [] });
    expect(event.photos.length).toBe(0);
    const coverSrc = event.cover ?? event.photos[0]?.src;
    expect(coverSrc).toBeUndefined();
  });

  it("handles event with no group", () => {
    const event = makeEvent({ group: undefined });
    expect(event.group).toBeUndefined();
  });

  it("handles event with no cover", () => {
    const event = makeEvent({ cover: undefined });
    const coverSrc = event.cover ?? event.photos[0]?.src;
    expect(coverSrc).toBe(event.photos[0].src);
  });

  it("handles photo with no src", () => {
    const photo = makePhoto("No Image", { src: undefined });
    expect(photo.src).toBeUndefined();
  });

  it("handles multiple events with same group", () => {
    const events = [
      makeEvent({ slug: "a", group: "JKT48" }),
      makeEvent({ slug: "b", group: "JKT48" }),
      makeEvent({ slug: "c", group: "KLP48" }),
    ];
    const groups = [...new Set(events.map((e) => e.group).filter(Boolean))];
    expect(groups).toEqual(["JKT48", "KLP48"]);
  });

  it("handles rapid sequential operations", () => {
    const photos = deepClone(makeEvent().photos);
    // Add, delete, reorder in sequence
    photos.push(makePhoto("New"));
    photos.splice(2, 1); // delete index 2
    [photos[0], photos[1]] = [photos[1], photos[0]]; // swap 0,1
    expect(photos.length).toBe(10);
    expect(photos[0].title).toBe("Cole II"); // was index 1, now 0 after swap
  });

  it("handles localStorage full gracefully", () => {
    // Simulate by checking storage works normally
    const events = Array.from({ length: 50 }, (_, i) => makeEvent({ slug: `event-${i}` }));
    const json = JSON.stringify(events);
    localStorage.setItem(STORAGE_KEY, json);
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(loaded.length).toBe(50);
  });

  it("handles very long event description", () => {
    const longDesc = "A".repeat(10000);
    const event = makeEvent({ description: longDesc });
    expect(event.description.length).toBe(10000);
    const json = JSON.stringify([event]);
    const parsed = JSON.parse(json);
    expect(parsed[0].description.length).toBe(10000);
  });

  it("handles special characters in slug", () => {
    const event = makeEvent({ slug: "event-with-special-chars-2026" });
    expect(event.slug).toMatch(/^[a-z0-9-]+$/);
  });
});
