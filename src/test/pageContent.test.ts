import { describe, it, expect } from "vitest";
import { getPageContent, savePageContent, resetPageContent, defaultContent } from "@/lib/pageContent";

describe("pageContent", () => {
  it("returns defaults when nothing saved", () => {
    const content = getPageContent();
    expect(content.hero.tagline).toBe(defaultContent.hero.tagline);
    expect(content.profile.bio).toBe(defaultContent.profile.bio);
    expect(content.contact.email).toBe(defaultContent.contact.email);
  });

  it("saves and retrieves custom content", () => {
    const custom = { ...defaultContent, hero: { ...defaultContent.hero, tagline: "Custom tagline" } };
    savePageContent(custom);
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe("Custom tagline");
    // Other fields preserved
    expect(loaded.profile.bio).toBe(defaultContent.profile.bio);
  });

  it("resets to defaults", () => {
    savePageContent({ ...defaultContent, hero: { ...defaultContent.hero, tagline: "Changed" } });
    resetPageContent();
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe(defaultContent.hero.tagline);
  });

  it("merges with defaults when saved content is partial", () => {
    // Simulate older saved data missing new fields
    localStorage.setItem("vinzryyy-page-content", JSON.stringify({
      hero: { tagline: "Old tagline" },
      profile: {},
      contact: {},
    }));
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe("Old tagline");
    // New fields filled from defaults
    expect(loaded.hero.verticalKanji).toBe(defaultContent.hero.verticalKanji);
    expect(loaded.profile.bio).toBe(defaultContent.profile.bio);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("vinzryyy-page-content", "not valid json{{{");
    const loaded = getPageContent();
    expect(loaded.hero.tagline).toBe(defaultContent.hero.tagline);
  });
});
