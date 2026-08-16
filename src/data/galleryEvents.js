export const GROUP_ORDER = ['JKT48', 'KLP48', 'Quadlips']

/**
 * Event entry shape:
 *   id       — used as /gallery/<id> route and /public/gallery/<id>/ folder
 *   title    — display name
 *   group    — must match a key in GROUP_ORDER
 *   location — venue string
 *   date     — display date string
 *   photos   — filenames inside /public/gallery/<id>/  (empty = "Segera Hadir")
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
