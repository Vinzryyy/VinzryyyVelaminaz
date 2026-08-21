export function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="font-mono text-xs text-faint">
          &copy; {new Date().getFullYear()} mal.photo &mdash; All rights reserved.
        </p>
        <p className="font-jp text-xs text-faint/60" lang="ja" aria-hidden="true">
          侍 · 桜
        </p>
      </div>
    </footer>
  );
}
