import { useEffect, useState } from "react";
import { Link } from "react-router";

/**
 * Sticky navigation bar with crest/seal + wordmark.
 * Shrinks and adds backdrop blur on scroll.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 transition-all duration-300 md:px-10 ${
        scrolled
          ? "h-14 bg-sumi/95 shadow-lg shadow-black/30 backdrop-blur-md"
          : "h-20 bg-transparent"
      }`}
    >
      {/* Left: crest + wordmark */}
      <Link to="/" className="flex items-center gap-3 group">
        {/* Mon (crest) — stylised aperture circle */}
        <svg
          className={`text-crimson transition-all duration-300 ${scrolled ? "h-7 w-7" : "h-8 w-8"}`}
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="16" cy="16" r="14" />
          <circle cx="16" cy="16" r="5" />
          <line x1="16" y1="2" x2="16" y2="11" />
          <line x1="16" y1="21" x2="16" y2="30" />
          <line x1="2" y1="16" x2="11" y2="16" />
          <line x1="21" y1="16" x2="30" y2="16" />
        </svg>

        <span
          className={`font-display font-bold tracking-wide text-ink/90 transition-all duration-300 ${
            scrolled ? "text-lg" : "text-xl"
          }`}
        >
          mal<span className="text-crimson">.</span>photo
        </span>
      </Link>

      {/* Right: nav links */}
      <nav className="flex items-center gap-8">
        <a
          href="/#events"
          className="text-[13px] font-medium uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:text-ink"
        >
          Events
        </a>
        <a
          href="/#contact"
          className="text-[13px] font-medium uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:text-ink"
        >
          Contact
        </a>
      </nav>
    </header>
  );
}
