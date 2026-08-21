import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

const Home = lazy(() => import("@/pages/Home"));
const EventPage = lazy(() => import("@/pages/EventPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson/30 border-t-crimson" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

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
        <Suspense fallback={<PageLoader />}>
          {/* key on pathname triggers page-enter animation on route change */}
          <div key={location.pathname} className="page-enter">
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/events/:slug" element={<EventPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
