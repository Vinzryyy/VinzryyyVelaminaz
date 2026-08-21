import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

/**
 * Top navigation — editorial style matching the reference:
 * "Menu" (italic) left · logo center · "Let's talk / Contact me" right
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

  const italicLink =
    "font-display italic text-sm text-ink/80 underline decoration-ink/30 underline-offset-4 transition-colors duration-200 hover:text-ink hover:decoration-ink/60";

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
        {/* Left: Menu (mobile) / Wordmark (desktop) */}
        <button
          className={`${italicLink} md:hidden`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
        <Link
          to="/"
          className="hidden items-center gap-2 md:flex"
          onClick={() => setMenuOpen(false)}
        >
          <span
            className={`font-display font-bold tracking-wide text-ink/90 transition-all duration-300 ${
              scrolled ? "text-base" : "text-lg"
            }`}
          >
            Vinzryyy<span className="text-crimson">Saga</span>
          </span>
        </Link>

        {/* Center: Logo kanji (mobile only) */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <span className="font-display text-xl font-bold tracking-wide text-crimson">
            標識
          </span>
        </Link>

        {/* Right: Links */}
        <nav className="hidden items-center gap-8 md:flex">
          <a href="/#events" onClick={scrollTo("events")} className={italicLink}>
            Events
          </a>
          <a href="/#contact" onClick={scrollTo("contact")} className={italicLink}>
            Contact me
          </a>
        </nav>
        {/* Mobile: single contact link */}
        <a
          href="/#contact"
          onClick={scrollTo("contact")}
          className={`${italicLink} md:hidden`}
        >
          Contact
        </a>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`overflow-hidden border-t border-hairline/50 transition-all duration-300 md:hidden ${
          menuOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0 border-t-transparent"
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 py-4">
          <a href="/#events" onClick={scrollTo("events")} className={`py-2 ${italicLink}`}>
            Events
          </a>
          <a href="/#contact" onClick={scrollTo("contact")} className={`py-2 ${italicLink}`}>
            Contact me
          </a>
        </nav>
      </div>
    </header>
  );
}
