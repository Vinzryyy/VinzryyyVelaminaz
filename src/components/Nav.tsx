import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

/**
 * Sticky navigation bar with crest/seal + wordmark.
 * Shrinks and adds backdrop blur on scroll.
 * Hamburger menu on mobile, inline links on md+.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Navigate to home then scroll to a section by id. */
  const scrollTo = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setMenuOpen(false);
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/", { state: { scrollTo: id } });
      }
    },
    [location.pathname, navigate]
  );

  const linkClass =
    "text-[13px] font-medium uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:text-ink";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? "bg-sumi/95 shadow-lg shadow-black/30 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      {/* Top bar */}
      <div
        className={`flex items-center justify-between px-6 transition-all duration-300 md:px-10 ${
          scrolled ? "h-14" : "h-20"
        }`}
      >
        {/* Left: crest + wordmark */}
        <Link to="/" className="flex items-center gap-3 group">
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

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#events" onClick={scrollTo("events")} className={linkClass}>
            Events
          </a>
          <a href="/#contact" onClick={scrollTo("contact")} className={linkClass}>
            Contact
          </a>
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          className="flex h-9 w-9 items-center justify-center text-muted transition-colors duration-200 hover:text-ink md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`overflow-hidden border-t border-hairline/50 transition-all duration-300 md:hidden ${
          menuOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0 border-t-transparent"
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 py-4">
          <a
            href="/#events"
            onClick={scrollTo("events")}
            className="py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:text-ink"
          >
            Events
          </a>
          <a
            href="/#contact"
            onClick={scrollTo("contact")}
            className="py-2 text-[13px] font-medium uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:text-ink"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}
