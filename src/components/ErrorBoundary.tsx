import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Link } from "react-router";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <span className="font-jp text-6xl text-crimson/30" lang="ja" aria-hidden="true">
          錯誤
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink md:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:border-crimson hover:text-ink"
          >
            Refresh
          </button>
          <Link
            to="/"
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-muted transition-colors duration-200 hover:border-crimson hover:text-ink"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </div>
    );
  }
}
