import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FeaturedRail } from "@/components/FeaturedRail";
import type { Event } from "@/lib/types";

// jsdom has no matchMedia, and GSAP calls it as soon as ScrollTrigger is
// imported, so this has to run before the imports. It reports a visitor with
// reduced motion turned on: reveal animations are skipped (so nothing starts
// hidden) and the rail stays the plain swipeable row.
vi.hoisted(() => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

function makeEvent(slug: string, overrides: Partial<Event> = {}): Event {
  return {
    slug,
    title: `Title ${slug}`,
    group: "JKT48",
    tateText: "",
    location: "Jakarta",
    date: "August 2026",
    gear: "",
    subtitle: "",
    description: "",
    featured: true,
    photos: [{ title: "p", story: "", src: `/gallery/${slug}/first.webp` }],
    ...overrides,
  };
}

function renderRail(events: Event[]) {
  return render(
    <MemoryRouter>
      <FeaturedRail events={events} />
    </MemoryRouter>,
  );
}

describe("FeaturedRail", () => {
  it("links each event to its page, in the order given", () => {
    renderRail([makeEvent("a"), makeEvent("b", { group: "KLP48" })]);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/events/a", "/events/b"]);
    expect(links[0]).toHaveAccessibleName("Title a — Jakarta, August 2026");
    expect(screen.getByRole("heading", { name: "Featured" })).toBeInTheDocument();
    expect(screen.getByText("01 / 02")).toBeInTheDocument();
    expect(screen.getByText("KLP48")).toBeInTheDocument();
  });

  it("shows the cover photo, falling back to the first photo", () => {
    const { container } = renderRail([
      makeEvent("a", { cover: "/gallery/a/cover.webp" }),
      makeEvent("b"),
    ]);
    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(srcs).toEqual(["/gallery/a/cover.webp", "/gallery/b/first.webp"]);
  });

  it("draws a placeholder instead of an image for an event with no photos", () => {
    const { container } = renderRail([makeEvent("a", { photos: [] })]);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/events/a");
  });
});
