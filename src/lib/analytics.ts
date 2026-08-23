/**
 * Privacy-friendly analytics — no cookies, no external services.
 * Stores page view counts in localStorage keyed by path and date.
 */

const STORAGE_KEY = "vinzryyy-analytics";

export interface PageView {
  path: string;
  date: string; // YYYY-MM-DD
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): PageView[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save(views: PageView[]) {
  // Keep only last 90 days to avoid unbounded growth
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const trimmed = views.filter((v) => v.date >= cutoffStr);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function trackPageView(path: string) {
  const views = load();
  const d = today();
  const existing = views.find((v) => v.path === path && v.date === d);
  if (existing) {
    existing.count += 1;
  } else {
    views.push({ path, date: d, count: 1 });
  }
  save(views);
}

export interface AnalyticsSummary {
  totalViews: number;
  todayViews: number;
  topPages: { path: string; views: number }[];
  dailyViews: { date: string; views: number }[];
}

export function getAnalytics(): AnalyticsSummary {
  const views = load();
  const d = today();

  const totalViews = views.reduce((n, v) => n + v.count, 0);
  const todayViews = views.filter((v) => v.date === d).reduce((n, v) => n + v.count, 0);

  // Top pages
  const byPage = new Map<string, number>();
  for (const v of views) {
    byPage.set(v.path, (byPage.get(v.path) ?? 0) + v.count);
  }
  const topPages = [...byPage.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Daily views (last 30 days)
  const dailyMap = new Map<string, number>();
  for (const v of views) {
    dailyMap.set(v.date, (dailyMap.get(v.date) ?? 0) + v.count);
  }
  const dailyViews = [...dailyMap.entries()]
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return { totalViews, todayViews, topPages, dailyViews };
}
