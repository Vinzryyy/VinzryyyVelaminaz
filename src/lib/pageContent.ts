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
    bio: "Vinzryyy is a fan who fell in love with taking photos at live events. What started as snapping memories from the crowd grew into a passion for capturing the energy, emotion, and fleeting moments that make every show unique. Armed with a camera and a front-row spirit, Vinzryyy documents performances, fan meetings, and behind-the-scenes glimpses — turning the experience of being a fan into visual stories that preserve those moments long after the lights go down.",
    quote: "No studio, no assignments — just a fan with a lens and a love for the stage.",
  },
  contact: {
    label: "Get in Touch",
    heading: "Let's create something together",
    description: "Interested in event coverage or collaborative projects? Reach out and let's make it happen.",
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
      // Merge with defaults so new fields are always present
      return {
        hero: { ...defaultContent.hero, ...parsed.hero },
        profile: { ...defaultContent.profile, ...parsed.profile },
        contact: { ...defaultContent.contact, ...parsed.contact },
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
