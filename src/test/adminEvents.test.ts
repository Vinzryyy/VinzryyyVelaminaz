import { describe, it, expect } from "vitest";
import type { Event, Photo } from "@/lib/types";

// Test the admin event/photo management logic in isolation
// (these mirror the operations in Admin.tsx)

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function makeEvent(overrides?: Partial<Event>): Event {
  return {
    slug: "test-event",
    title: "Test Event",
    group: "TestGroup",
    tateText: "第一巻",
    location: "Tokyo",
    date: "2026-01",
    gear: "Canon R5",
    subtitle: "Test subtitle",
    description: "Test description",
    featured: false,
    photos: [
      { title: "Cole I", story: "s1", src: "/photos/1.jpg" },
      { title: "Cole II", story: "s2", src: "/photos/2.jpg" },
      { title: "Cole III", story: "s3", src: "/photos/3.jpg" },
      { title: "Full Squad", story: "s4", src: "/photos/4.jpg" },
      { title: "Fame I", story: "s5", src: "/photos/5.jpg" },
      { title: "Fame II", story: "s6", src: "/photos/6.jpg" },
    ],
    ...overrides,
  };
}

describe("admin event operations", () => {
  it("updates event fields without touching photos", () => {
    const event = makeEvent();
    const { photos, ...rest } = { ...event, title: "Updated Title" };
    void photos;
    expect(rest.title).toBe("Updated Title");
    expect(event.photos.length).toBe(6);
  });

  it("deletes event from list", () => {
    const events = [makeEvent({ slug: "a" }), makeEvent({ slug: "b" }), makeEvent({ slug: "c" })];
    const filtered = events.filter((e) => e.slug !== "b");
    expect(filtered.length).toBe(2);
    expect(filtered.map((e) => e.slug)).toEqual(["a", "c"]);
  });
});

describe("admin photo operations", () => {
  it("adds a photo", () => {
    const photos = deepClone(makeEvent().photos);
    photos.push({ title: "New Photo", story: "", src: "/photos/new.jpg" });
    expect(photos.length).toBe(7);
  });

  it("removes a photo and preserves order", () => {
    const photos = deepClone(makeEvent().photos);
    const removed = photos.filter((_, i) => i !== 2);
    expect(removed.length).toBe(5);
    expect(removed[0].title).toBe("Cole I");
    expect(removed[1].title).toBe("Cole II");
    expect(removed[2].title).toBe("Full Squad"); // was index 3, now 2
  });

  it("moves photo forward", () => {
    const photos = deepClone(makeEvent().photos);
    const idx = 1, target = 2;
    [photos[idx], photos[target]] = [photos[target], photos[idx]];
    expect(photos[1].title).toBe("Cole III");
    expect(photos[2].title).toBe("Cole II");
  });

  it("moves photo backward", () => {
    const photos = deepClone(makeEvent().photos);
    const idx = 2, target = 1;
    [photos[idx], photos[target]] = [photos[target], photos[idx]];
    expect(photos[1].title).toBe("Cole III");
    expect(photos[2].title).toBe("Cole II");
  });

  it("updates a single photo field", () => {
    const photos = deepClone(makeEvent().photos);
    const updated = photos.map((ph, i) => (i === 0 ? { ...ph, title: "Updated Cole" } : ph));
    expect(updated[0].title).toBe("Updated Cole");
    expect(updated[1].title).toBe("Cole II"); // unchanged
  });
});

describe("photo selection index management", () => {
  it("shifts selected indices after delete", () => {
    const selected = new Set([1, 3, 5]);
    const deletedIdx = 2;
    const newSelected = new Set<number>();
    for (const i of selected) {
      if (i < deletedIdx) newSelected.add(i);
      else if (i > deletedIdx) newSelected.add(i - 1);
      // i === deletedIdx is skipped
    }
    expect([...newSelected].sort()).toEqual([1, 2, 4]);
  });

  it("removes deleted index from selection", () => {
    const selected = new Set([1, 2, 3]);
    const deletedIdx = 2;
    const newSelected = new Set<number>();
    for (const i of selected) {
      if (i < deletedIdx) newSelected.add(i);
      else if (i > deletedIdx) newSelected.add(i - 1);
    }
    // Index 2 was deleted (removed), index 3 shifted down to 2
    expect(newSelected.size).toBe(2);
    expect([...newSelected].sort()).toEqual([1, 2]); // 1 stays, 3→2
  });

  it("handles deleting first item", () => {
    const selected = new Set([0, 2, 4]);
    const deletedIdx = 0;
    const newSelected = new Set<number>();
    for (const i of selected) {
      if (i < deletedIdx) newSelected.add(i);
      else if (i > deletedIdx) newSelected.add(i - 1);
    }
    expect([...newSelected].sort()).toEqual([1, 3]);
  });

  it("handles deleting last item", () => {
    const selected = new Set([0, 2, 5]);
    const deletedIdx = 5;
    const newSelected = new Set<number>();
    for (const i of selected) {
      if (i < deletedIdx) newSelected.add(i);
      else if (i > deletedIdx) newSelected.add(i - 1);
    }
    expect([...newSelected].sort()).toEqual([0, 2]);
  });

  it("handles empty selection", () => {
    const selected = new Set<number>();
    const deletedIdx = 3;
    const newSelected = new Set<number>();
    for (const i of selected) {
      if (i < deletedIdx) newSelected.add(i);
      else if (i > deletedIdx) newSelected.add(i - 1);
    }
    expect(newSelected.size).toBe(0);
  });
});

describe("photo grouping", () => {
  it("assigns sequence to selected photos", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([0, 1, 2]);
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "ColeGroup", sequenceDisplay: "filmstrip" as const } : ph
    );
    expect(grouped[0].sequence).toBe("ColeGroup");
    expect(grouped[1].sequence).toBe("ColeGroup");
    expect(grouped[2].sequence).toBe("ColeGroup");
    expect(grouped[3].sequence).toBeUndefined();
  });

  it("ungroups selected photos", () => {
    const photos: Photo[] = [
      { title: "A", story: "", sequence: "Group1", sequenceDisplay: "filmstrip" },
      { title: "B", story: "", sequence: "Group1", sequenceDisplay: "filmstrip" },
      { title: "C", story: "", sequence: "Group2", sequenceDisplay: "stack" },
    ];
    const selected = new Set([0, 1]);
    const ungrouped = photos.map((ph, i) =>
      selected.has(i) ? { ...ph, sequence: undefined, sequenceDisplay: undefined } : ph
    );
    expect(ungrouped[0].sequence).toBeUndefined();
    expect(ungrouped[1].sequence).toBeUndefined();
    expect(ungrouped[2].sequence).toBe("Group2"); // untouched
  });

  it("changes display mode for grouped photos", () => {
    const photos: Photo[] = [
      { title: "A", story: "", sequence: "G1", sequenceDisplay: "filmstrip" },
      { title: "B", story: "", sequence: "G1", sequenceDisplay: "filmstrip" },
    ];
    const selected = new Set([0, 1]);
    const updated = photos.map((ph, i) =>
      selected.has(i) ? { ...ph, sequenceDisplay: "collage" as const } : ph
    );
    expect(updated[0].sequenceDisplay).toBe("collage");
    expect(updated[1].sequenceDisplay).toBe("collage");
  });

  it("groups non-consecutive photos", () => {
    const photos = deepClone(makeEvent().photos);
    const selected = new Set([0, 3, 5]); // Cole I, Full Squad, Fame II
    const grouped = photos.map((ph: Photo, i: number) =>
      selected.has(i) ? { ...ph, sequence: "MixedGroup" } : ph
    );
    expect(grouped[0].sequence).toBe("MixedGroup");
    expect(grouped[1].sequence).toBeUndefined(); // index 1 not selected
    expect(grouped[3].sequence).toBe("MixedGroup");
    expect(grouped[5].sequence).toBe("MixedGroup");
  });
});

describe("editIdx management", () => {
  it("clears editIdx when edited photo is deleted", () => {
    let editIdx: number | null = 3;
    const deletedIdx = 3;
    if (editIdx === deletedIdx) editIdx = null;
    else if (editIdx !== null && editIdx > deletedIdx) editIdx -= 1;
    expect(editIdx).toBeNull();
  });

  it("shifts editIdx when earlier photo deleted", () => {
    let editIdx: number | null = 5;
    const deletedIdx = 2;
    if (editIdx === deletedIdx) editIdx = null;
    else if (editIdx !== null && editIdx > deletedIdx) editIdx -= 1;
    expect(editIdx).toBe(4);
  });

  it("preserves editIdx when later photo deleted", () => {
    let editIdx: number | null = 2;
    const deletedIdx = 5;
    if (editIdx === deletedIdx) editIdx = null;
    else if (editIdx !== null && editIdx > deletedIdx) editIdx -= 1;
    expect(editIdx).toBe(2);
  });
});
