import { describe, it, expect } from "vitest";
import { trackPageView, getAnalytics } from "@/lib/analytics";

describe("analytics", () => {
  it("tracks a page view", () => {
    trackPageView("/");
    const stats = getAnalytics();
    expect(stats.totalViews).toBe(1);
    expect(stats.todayViews).toBe(1);
    expect(stats.topPages).toContainEqual({ path: "/", views: 1 });
  });

  it("increments on repeated views", () => {
    trackPageView("/events/test");
    trackPageView("/events/test");
    trackPageView("/events/test");
    const stats = getAnalytics();
    expect(stats.topPages.find((p) => p.path === "/events/test")?.views).toBe(3);
  });

  it("tracks multiple pages separately", () => {
    trackPageView("/");
    trackPageView("/events/a");
    trackPageView("/events/b");
    const stats = getAnalytics();
    expect(stats.totalViews).toBe(3);
    expect(stats.topPages.length).toBe(3);
  });

  it("returns daily views for today", () => {
    trackPageView("/");
    trackPageView("/about");
    const stats = getAnalytics();
    expect(stats.todayViews).toBe(2);
    expect(stats.dailyViews.length).toBeGreaterThan(0);
  });

  it("returns empty stats when no views", () => {
    const stats = getAnalytics();
    expect(stats.totalViews).toBe(0);
    expect(stats.todayViews).toBe(0);
    expect(stats.topPages).toEqual([]);
    expect(stats.dailyViews).toEqual([]);
  });
});
