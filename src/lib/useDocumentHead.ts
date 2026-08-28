import { useEffect } from "react";

const TAG_ATTR = "data-dynamic-head";

interface JsonLd {
  [key: string]: unknown;
}

interface HeadOptions {
  title: string;
  description?: string;
  ogImage?: string;
  jsonLd?: JsonLd;
}

/**
 * Sets document title, canonical URL, and Open Graph / Twitter meta tags.
 * Uses a data attribute to find and remove all previous dynamic tags
 * before inserting new ones, avoiding leaks on fast navigations.
 */
export function useDocumentHead({ title, description, ogImage, jsonLd }: HeadOptions) {
  useEffect(() => {
    // Remove any previously injected dynamic tags
    document.head.querySelectorAll(`[${TAG_ATTR}]`).forEach((el) => el.remove());

    // Title
    document.title = title;

    const addTag = (tag: HTMLElement) => {
      tag.setAttribute(TAG_ATTR, "");
      document.head.appendChild(tag);
    };

    const setMeta = (property: string, content: string) => {
      const meta = document.createElement("meta");
      if (property.startsWith("twitter:")) {
        meta.setAttribute("name", property);
      } else {
        meta.setAttribute("property", property);
      }
      meta.setAttribute("content", content);
      addTag(meta);
    };

    // Canonical
    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.origin + window.location.pathname);
    addTag(canonical);

    // Open Graph
    setMeta("og:title", title);
    setMeta("og:url", window.location.origin + window.location.pathname);
    setMeta("og:type", "website");
    if (description) {
      setMeta("og:description", description);
      setMeta("twitter:description", description);
    }
    if (ogImage) {
      setMeta("og:image", ogImage);
      setMeta("twitter:image", ogImage);
    }

    // Twitter card
    setMeta("twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);

    // JSON-LD structured data
    if (jsonLd) {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.textContent = JSON.stringify(jsonLd);
      addTag(script);
    }

    return () => {
      document.head.querySelectorAll(`[${TAG_ATTR}]`).forEach((el) => el.remove());
    };
  }, [title, description, ogImage, jsonLd]);
}
