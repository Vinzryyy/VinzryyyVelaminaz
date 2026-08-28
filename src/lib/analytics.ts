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

/* ── Web Vitals (Core Web Vitals via PerformanceObserver) ──────── */

const VITALS_KEY = "vinzryyy-vitals";

export interface VitalEntry {
  name: string;
  value: number;
  date: string;
}

function loadVitals(): VitalEntry[] {
  try {
    const data = localStorage.getItem(VITALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveVital(name: string, value: number) {
  const vitals = loadVitals();
  vitals.push({ name, value: Math.round(value), date: today() });
  // Keep last 90 entries per metric
  const counts: Record<string, number> = {};
  const trimmed = vitals.filter((v) => {
    counts[v.name] = (counts[v.name] ?? 0) + 1;
    return counts[v.name] <= 90;
  });
  localStorage.setItem(VITALS_KEY, JSON.stringify(trimmed));
}

export function getVitalsSummary(): Record<string, { avg: number; latest: number; count: number }> {
  const vitals = loadVitals();
  const grouped: Record<string, number[]> = {};
  for (const v of vitals) {
    (grouped[v.name] ??= []).push(v.value);
  }
  const summary: Record<string, { avg: number; latest: number; count: number }> = {};
  for (const [name, values] of Object.entries(grouped)) {
    summary[name] = {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      latest: values[values.length - 1],
      count: values.length,
    };
  }
  return summary;
}

/**
 * Observes Core Web Vitals (LCP, CLS, INP) using PerformanceObserver.
 * Call once at app startup.
 */
export function observeWebVitals() {
  if (typeof PerformanceObserver === "undefined") return;

  // LCP (Largest Contentful Paint)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) saveVital("LCP", last.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch { /* unsupported */ }

  // CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
          clsValue += (entry as PerformanceEntry & { value: number }).value;
        }
      }
      saveVital("CLS", clsValue * 1000); // store as ms-scale for readability
    }).observe({ type: "layout-shift", buffered: true });
  } catch { /* unsupported */ }

  // FCP (First Contentful Paint)
  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) saveVital("FCP", entry.startTime);
    }).observe({ type: "paint", buffered: true });
  } catch { /* unsupported */ }
}
