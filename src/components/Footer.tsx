import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-6 sm:flex-row sm:justify-between">
        {/* Left: copyright */}
        <p className="font-mono text-xs text-faint">
          &copy; {new Date().getFullYear()} mal.photo &mdash; All rights reserved.
        </p>

        {/* Center: nav links */}
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

        {/* Right: kanji decoration */}
        <p className="font-jp text-xs text-faint/60" lang="ja" aria-hidden="true">
          侍 · 桜
        </p>
      </div>
    </footer>
  );
}
