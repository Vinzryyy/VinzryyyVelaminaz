import { Link } from "react-router";

export function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="border-t border-hairline px-4 py-8 sm:px-6 sm:py-12 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        {/* Top row: brand + back to top */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-bold text-ink/60 transition-colors duration-200 hover:text-ink/80">
            Vinzryyy<span className="text-crimson/60">Saga</span>
          </Link>
          <button
            onClick={scrollToTop}
            className="group flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-faint transition-colors duration-200 hover:text-muted"
          >
            Back to top
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline transition-all duration-200 group-hover:border-crimson/40 group-hover:-translate-y-0.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="mb-8 h-px bg-hairline" />

        {/* Bottom row */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <p className="font-mono text-xs text-faint">
            &copy; {new Date().getFullYear()} VinzryyySaga &mdash; All rights reserved.
          </p>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-faint transition-colors duration-200 hover:text-muted"
            >
              Home
            </Link>
            <a
              href="/#events"
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-faint transition-colors duration-200 hover:text-muted"
            >
              Events
            </a>
            <a
              href="/#contact"
              className="font-mono text-[11px] uppercase tracking-[0.15em] text-faint transition-colors duration-200 hover:text-muted"
            >
              Contact
            </a>
          </nav>

          <p className="font-jp text-xs text-faint/60" lang="ja" aria-hidden="true">
            侍 · 桜
          </p>
        </div>
      </div>
    </footer>
  );
}
