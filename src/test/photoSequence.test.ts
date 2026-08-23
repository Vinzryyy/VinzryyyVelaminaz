import { describe, it, expect } from "vitest";
import type { Photo } from "@/lib/types";

// Re-implement the sequence detection logic to test it directly
const ROMAN = /\s+(?:[IVXLCDM]+|\d+)$/;

function sequenceKey(photo: Photo): string | null {
  if (photo.sequence) return photo.sequence;
  const m = photo.title.match(ROMAN);
  return m ? photo.title.slice(0, m.index!).trim() : null;
}

function makePhoto(title: string, opts?: Partial<Photo>): Photo {
  return { title, story: "", ...opts };
}

describe("sequence detection", () => {
  describe("auto-detection from title", () => {
    it("detects roman numeral sequences", () => {
      expect(sequenceKey(makePhoto("Cole I"))).toBe("Cole");
      expect(sequenceKey(makePhoto("Cole II"))).toBe("Cole");
      expect(sequenceKey(makePhoto("Cole IX"))).toBe("Cole");
    });

    it("detects numeric sequences", () => {
      expect(sequenceKey(makePhoto("Feni 1"))).toBe("Feni");
      expect(sequenceKey(makePhoto("Feni 10"))).toBe("Feni");
    });

    it("returns null for non-sequence titles", () => {
      expect(sequenceKey(makePhoto("Full Squad"))).toBeNull();
      expect(sequenceKey(makePhoto("Mashiro & Cole"))).toBeNull();
      expect(sequenceKey(makePhoto("Group Photo"))).toBeNull();
    });

    it("handles multi-word names", () => {
      expect(sequenceKey(makePhoto("Mashiro & Feni I"))).toBe("Mashiro & Feni");
    });

    it("handles edge case — title is just a numeral", () => {
      // "I" alone — the prefix would be empty
      const key = sequenceKey(makePhoto("I"));
      // Should be empty string or null depending on implementation
      expect(key === "" || key === null).toBe(true);
    });
  });

  describe("manual sequence override", () => {
    it("uses sequence field over title detection", () => {
      const photo = makePhoto("Cole I", { sequence: "CustomGroup" });
      expect(sequenceKey(photo)).toBe("CustomGroup");
    });

    it("manual sequence works on non-sequential titles", () => {
      const photo = makePhoto("Full Squad", { sequence: "AllTogether" });
      expect(sequenceKey(photo)).toBe("AllTogether");
    });
  });

  describe("grouping consecutive photos", () => {
    it("groups consecutive same-key photos", () => {
      const photos = [
        makePhoto("Cole I"),
        makePhoto("Cole II"),
        makePhoto("Cole III"),
        makePhoto("Full Squad"),
        makePhoto("Fame I"),
        makePhoto("Fame II"),
      ];

      // Simulate buildSegments logic
      const groups: { key: string; count: number }[] = [];
      let i = 0;
      while (i < photos.length) {
        const key = sequenceKey(photos[i]);
        if (key) {
          let count = 0;
          while (i < photos.length && sequenceKey(photos[i]) === key) {
            count++;
            i++;
          }
          groups.push({ key, count });
        } else {
          i++;
        }
      }

      expect(groups).toEqual([
        { key: "Cole", count: 3 },
        { key: "Fame", count: 2 },
      ]);
    });

    it("does not group non-consecutive same-key photos", () => {
      const photos = [
        makePhoto("Cole I"),
        makePhoto("Full Squad"),
        makePhoto("Cole II"),
      ];

      const groups: { key: string; indices: number[] }[] = [];
      let i = 0;
      while (i < photos.length) {
        const key = sequenceKey(photos[i]);
        if (key) {
          const indices: number[] = [];
          while (i < photos.length && sequenceKey(photos[i]) === key) {
            indices.push(i);
            i++;
          }
          groups.push({ key, indices });
        } else {
          i++;
        }
      }

      // Cole appears in two separate runs
      expect(groups.length).toBe(2);
      expect(groups[0]).toEqual({ key: "Cole", indices: [0] });
      expect(groups[1]).toEqual({ key: "Cole", indices: [2] });
    });
  });
});
