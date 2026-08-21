import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <span className="font-jp text-6xl text-crimson/30" lang="ja" aria-hidden="true">四〇四</span>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:border-crimson hover:text-ink"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to home
      </Link>
    </div>
  );
}
