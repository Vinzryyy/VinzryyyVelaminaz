import { useState } from "react";
import { getAllEvents } from "@/lib/data";
import { commitBatchToGitHub } from "@/lib/ghUpload";
import type { Event, Photo } from "@/lib/types";

/* ── Helpers ─────────────────────────────────────────────────────── */

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const STORAGE_KEY = "vinzryyy-admin-events";

export function loadEvents(): Event[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return deepClone(getAllEvents());
}

export function saveEvents(events: Event[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function emptyPhoto(): Photo {
  return { title: "", story: "", src: "", lens: "", aperture: "", shutter: "" };
}

export function emptyEvent(): Event {
  return {
    slug: "",
    title: "",
    group: "",
    tateText: "",
    location: "",
    date: "",
    gear: "",
    subtitle: "",
    description: "",
    featured: false,
    photos: [],
  };
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/* ── Tab type ────────────────────────────────────────────────────── */

export type Tab = "dashboard" | "events" | "editor" | "photos" | "page" | "export";

/* ── GitHub Publish ──────────────────────────────────────────────── */

export const GH_TOKEN_KEY = "vinzryyy-gh-token";
export const GH_REPO = "Vinzryyy/VinzryyyVelaminaz";
export const GH_FILE_PATH = "src/content/events.ts";

export function eventsToCode(events: Event[]): string {
  return [
    `import type { Event } from "@/lib/types";`,
    ``,
    `export const events: Event[] = ${JSON.stringify(events, null, 2)};`,
  ].join("\n");
}

export async function publishToGitHub(events: Event[]): Promise<void> {
  const code = eventsToCode(events);
  await commitBatchToGitHub(
    [{ path: GH_FILE_PATH, content: code }],
    "update events data from admin panel",
  );
}

/* ── useDrop hook ────────────────────────────────────────────────── */

export function useDrop(onDrop: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  const props = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const imageExts = /\.(jpe?g|png|gif|webp|heic|heif|avif|tiff?|bmp|svg)$/i;
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/") || imageExts.test(f.name) || !f.type);
      if (files.length) onDrop(files);
    },
  };
  return { over, props };
}
