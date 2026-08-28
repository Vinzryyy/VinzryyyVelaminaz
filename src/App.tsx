import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { trackPageView } from "@/lib/analytics";

const Home = lazy(() => import("@/pages/Home"));
const EventPage = lazy(() => import("@/pages/EventPage"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// SHA-256 hash of the admin path (without leading slash) so the URL isn't visible in source
const ADMIN_PATH_HASH = "967d2fa83ac1a3eb2e824fe723b21ce38581d0db7f9fe80a657af2c2e70fc022";

async function checkAdminPath(path: string): Promise<boolean> {
  const segment = path.replace(/^\//, "");
  if (!segment) return false;
  const data = new TextEncoder().encode(segment);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === ADMIN_PATH_HASH;
}

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson/30 border-t-crimson" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"enter" | "exit">("enter");
  const pageRef = useRef<HTMLDivElement>(null);

  // Check if current path is the admin route (hash-verified)
  useEffect(() => {
    checkAdminPath(location.pathname).then(setIsAdminPath);
  }, [location.pathname]);

  // Page transition: exit old page, then enter new page
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage("exit");
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("enter");
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation.pathname]);

  // Scroll to top on route change (unless Home handles deferred scroll)
  useEffect(() => {
    const state = displayLocation.state as { scrollTo?: string } | null;
    if (!state?.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, [displayLocation.pathname, displayLocation.state]);

  // Track page views
  useEffect(() => {
    trackPageView(displayLocation.pathname);
  }, [displayLocation.pathname]);

  const transitionClass = transitionStage === "enter" ? "page-enter" : "page-exit";

  return (
    <div className="min-h-screen bg-sumi font-sans text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-crimson focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <SakuraPetals />
      <Nav />
      <main id="main-content">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <div ref={pageRef} key={displayLocation.pathname} className={transitionClass}>
              <Routes location={displayLocation}>
                <Route path="/" element={<Home />} />
                <Route path="/events/:slug" element={<EventPage />} />
                {isAdminPath && <Route path={displayLocation.pathname} element={<Admin />} />}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <InstallPrompt />
    </div>
  );
}
