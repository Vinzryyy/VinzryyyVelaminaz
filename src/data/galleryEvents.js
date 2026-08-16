export const GROUP_ORDER = ['JKT48', 'KLP48', 'Quadlips']

/**
 * Accepts a photos array of either:
 *   - plain strings:  "file.jpg"
 *   - objects:        { filename, frameNum?, title?, story?, size?, exif?, tags? }
 * Returns a normalized array of objects.
 */
export function normalizePhotos(photos) {
  return photos.map((p, i) => {
    if (typeof p === 'string') {
      return {
        filename: p,
        frameNum: String(i + 1).padStart(3, '0'),
        title: null,
        story: null,
        size: '',
        exif: null,
        tags: [],
      }
    }
    return {
      filename: p.filename,
      frameNum: p.frameNum ?? String(i + 1).padStart(3, '0'),
      title:    p.title    ?? null,
      story:    p.story    ?? null,
      size:     p.size     ?? '',
      exif:     p.exif     ?? null,
      tags:     p.tags     ?? [],
    }
  })
}

/**
 * Event entry shape:
 *   id          — used as /gallery/<id> route and /public/gallery/<id>/ folder
 *   title       — display name
 *   group       — must match a key in GROUP_ORDER
 *   location    — venue string
 *   date        — display date string
 *   description — optional long text shown on event page
 *   gear        — optional camera/lens summary for FactsPanel
 *   photos      — filenames or photo objects (empty = "Segera Hadir")
 */
export const EVENTS = [
  // ── JKT48 ──────────────────────────────────────────────────────────────────
  {
    id: 'jkt48-konser-jakarta-2024',
    title: 'Konser Jakarta 2024',
    group: 'JKT48',
    location: 'Jakarta Convention Center',
    date: 'Agustus 2024',
    photos: [],
  },
  {
    id: 'jkt48-saikou-kayo-2024',
    title: 'Saikou kayo Single Launch',
    group: 'JKT48',
    location: 'Istora Senayan, Jakarta',
    date: 'Oktober 2024',
    photos: [],
  },

  // ── KLP48 ──────────────────────────────────────────────────────────────────
  {
    id: 'klp48-performance-day1',
    title: 'KLP48 Performance Day 1',
    group: 'KLP48',
    location: 'Axiata Arena, Kuala Lumpur',
    date: 'Agustus 2025',
    photos: [],
  },
  {
    id: 'klp48-performance-day2',
    title: 'KLP48 Performance Day 2',
    group: 'KLP48',
    location: 'Axiata Arena, Kuala Lumpur',
    date: 'Agustus 2025',
    photos: [],
  },

  // ── Quadlips ───────────────────────────────────────────────────────────────
  {
    id: 'quadlips-debut-showcase',
    title: 'Debut Showcase',
    group: 'Quadlips',
    location: 'TBA',
    date: '2026',
    photos: [],
  },
]
