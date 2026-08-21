import { useEffect } from "react";

interface HeadOptions {
  title: string;
  description?: string;
  ogImage?: string;
}

/**
 * Sets document title, canonical URL, and Open Graph / Twitter meta tags.
 * Cleans up dynamic tags on unmount so they don't leak between routes.
 */
export function useDocumentHead({ title, description, ogImage }: HeadOptions) {
  useEffect(() => {
    // Title
    document.title = title;

    const tags: HTMLElement[] = [];

    const setMeta = (property: string, content: string) => {
      const meta = document.createElement("meta");
      // OG uses property, Twitter uses name
      if (property.startsWith("twitter:")) {
        meta.setAttribute("name", property);
      } else {
        meta.setAttribute("property", property);
      }
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
      tags.push(meta);
    };

    // Canonical
    const canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.origin + window.location.pathname);
    document.head.appendChild(canonical);
    tags.push(canonical);

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

    return () => {
      tags.forEach((tag) => tag.remove());
    };
  }, [title, description, ogImage]);
}
