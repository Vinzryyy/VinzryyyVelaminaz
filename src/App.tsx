import { Routes, Route } from "react-router";
import { SakuraPetals } from "@/components/SakuraPetals";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import EventPage from "@/pages/EventPage";

export default function App() {
  return (
    <div className="min-h-screen bg-sumi font-sans text-ink antialiased">
      <SakuraPetals />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events/:slug" element={<EventPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
