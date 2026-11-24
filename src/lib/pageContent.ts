/**
 * Editable page content — stored in localStorage, editable from admin.
 * Home.tsx reads from here instead of hardcoding text.
 */

const STORAGE_KEY = "vinzryyy-page-content";

export interface PageContent {
  hero: {
    tagline: string;
    verticalKanji: string;
    nameLine1: string;
    nameLine2: string;
  };
  profile: {
    sectionLabel: string;
    bio: string;
    quote: string;
  };
  contact: {
    label: string;
    heading: string;
    description: string;
    email: string;
    instagramUrl: string;
    instagramHandle: string;
  };
  // NOTE: email is kept in the type for backwards compatibility with saved
  // localStorage data, but is not rendered on the public site.
}

export const defaultContent: PageContent = {
  hero: {
    tagline: "A fan with a camera, capturing the energy and emotion of live events — one frame at a time.",
    verticalKanji: "写真記録",
    nameLine1: "Vinzryyy",
    nameLine2: "Saga",
  },
  profile: {
    sectionLabel: "Profile",
    // Words wrapped in **double asterisks** are drawn brighter on the page.
    bio: "Vinzryyy is a fan who fell in love with taking photos at **live events**. What started as snapping memories from the crowd grew into a passion for capturing the energy, emotion, and fleeting moments that make every show unique. Armed with a camera and a front-row spirit, Vinzryyy documents **performances**, **fan meetings**, and **behind-the-scenes glimpses** — turning the experience of being a fan into **visual stories** that preserve those moments long after the lights go down.",
    quote: "No studio, no assignments — just a fan with a lens and a love for the stage.",
  },
  contact: {
    label: "Get in Touch",
    heading: "Say hello",
    description: "Found your oshi in one of these frames, or just want to talk about the last show? Send me a DM on Instagram.",
    email: "hello@vinzryyysaga.com",
    instagramUrl: "https://instagram.com/VinzryyySaga",
    instagramHandle: "@VinzryyySaga",
  },
};

export function getPageContent(): PageContent {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults — filter out null/undefined so defaults survive
      const strip = (obj: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
      return {
        hero: { ...defaultContent.hero, ...strip(parsed.hero ?? {}) },
        profile: { ...defaultContent.profile, ...strip(parsed.profile ?? {}) },
        contact: { ...defaultContent.contact, ...strip(parsed.contact ?? {}) },
      };
    }
  } catch { /* ignore */ }
  return { ...defaultContent };
}

export function savePageContent(content: PageContent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}

export function resetPageContent() {
  localStorage.removeItem(STORAGE_KEY);
}
