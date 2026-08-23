export interface Photo {
  title: string;
  story: string;
  src?: string;        // "/photos/{event-slug}/001.jpg" — optional,
                       // falls back to a generated placeholder gradient
  sequence?: string;   // manual filmstrip group name — photos with the same
                       // sequence are rendered as a horizontal scrollable strip
  lens?: string;
  aperture?: string;
  shutter?: string;
  iso?: number;
  width?: number;
  height?: number;
}

export interface Event {
  slug: string;         // URL segment, e.g. "onstage-jul"
  title: string;
  group?: string;       // e.g. "JKT48", "KLP48", "Quadlips" — shown as tag on card
  tateText: string;     // short vertical decorative label, e.g. "第七巻 · 舞台"
  location: string;
  date: string;
  gear: string;
  subtitle: string;     // one-line teaser on the home card
  description: string;  // full story on the event page
  featured: boolean;    // full-width card on home
  cover?: string;       // card image; falls back to first photo
  photos: Photo[];
}
