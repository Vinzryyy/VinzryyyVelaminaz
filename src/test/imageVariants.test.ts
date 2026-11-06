import { describe, it, expect, vi, afterEach } from "vitest";
import { gallerySrcSet, largestCopy, variantPath } from "@/lib/imageVariants";

// The build script writes copies at variantPath(); the page requests them via
// gallerySrcSet(). If these drift apart, every gallery photo breaks.

describe("variantPath", () => {
  it("adds the width before the extension and always uses .webp", () => {
    expect(variantPath("/gallery/jkt48-klia/fiony2.webp", 480)).toBe("/gallery/jkt48-klia/fiony2-480w.webp");
    expect(variantPath("/gallery/a/IMG_1.jpg", 960)).toBe("/gallery/a/IMG_1-960w.webp");
  });
});

describe("gallerySrcSet", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lists each copy, escaping spaces", () => {
    vi.stubEnv("DEV", false);
    expect(gallerySrcSet("/gallery/q/Full Squad.webp")).toBe(
      "/gallery/q/Full%20Squad-480w.webp 480w, " +
        "/gallery/q/Full%20Squad-960w.webp 960w, " +
        "/gallery/q/Full%20Squad-1440w.webp 1440w, " +
        "/gallery/q/Full%20Squad-1920w.webp 1920w",
    );
  });

  it("returns undefined for non-gallery images and on the dev server", () => {
    vi.stubEnv("DEV", false);
    expect(gallerySrcSet(undefined)).toBeUndefined();
    expect(gallerySrcSet("/og-cover.jpg")).toBeUndefined();
    vi.stubEnv("DEV", true);
    expect(gallerySrcSet("/gallery/a/b.webp")).toBeUndefined();
  });
});

describe("largestCopy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("points at the 1920px copy, or the original where there are no copies", () => {
    vi.stubEnv("DEV", false);
    expect(largestCopy("/gallery/a/b.webp")).toBe("/gallery/a/b-1920w.webp");
    expect(largestCopy("/og-cover.jpg")).toBe("/og-cover.jpg");
    vi.stubEnv("DEV", true);
    expect(largestCopy("/gallery/a/b.webp")).toBe("/gallery/a/b.webp");
  });
});
