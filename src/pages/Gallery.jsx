import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowLeft, Images, MapPin } from "lucide-react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EVENTS, GROUP_ORDER } from "../data/galleryEvents";
import { SakuraPetals } from "../components/SakuraPetals";

gsap.registerPlugin(SplitText, ScrollTrigger);

// ── Palette ───────────────────────────────────────────────────────────────────

const GROUP_ACCENT = {
  JKT48:    { dot: "#cc2b2b", glowRgb: "204,43,43",  label: "JKT48",    sub: "Jakarta · 48G" },
  KLP48:    { dot: "#16a34a", glowRgb: "22,163,74",   label: "KLP48",    sub: "Kuala Lumpur · 48G" },
  Quadlips: { dot: "#db2777", glowRgb: "219,39,119",  label: "Quadlips", sub: "Kolaborasi" },
};

const GROUP_STATS = GROUP_ORDER.map((g) => ({
  group: g,
  events: EVENTS.filter((e) => e.group === g).length,
  photos: EVENTS.filter((e) => e.group === g).reduce((n, e) => n + e.photos.length, 0),
}));

const totalPhotos = EVENTS.reduce((n, e) => n + e.photos.length, 0);

// ── Batik pattern — diagonal parang motif ─────────────────────────────────────

function BatikPattern() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.035]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="batik" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
          <line x1="0" y1="56" x2="56" y2="0" stroke="white" strokeWidth="0.6" />
          <line x1="-14" y1="56" x2="42" y2="0" stroke="white" strokeWidth="0.3" opacity="0.5" />
          <line x1="14" y1="56" x2="70" y2="0" stroke="white" strokeWidth="0.3" opacity="0.5" />
          <circle cx="28" cy="28" r="2.5" fill="none" stroke="white" strokeWidth="0.5" />
          <circle cx="0"  cy="0"  r="1.5" fill="white" opacity="0.4" />
          <circle cx="56" cy="0"  r="1.5" fill="white" opacity="0.4" />
          <circle cx="0"  cy="56" r="1.5" fill="white" opacity="0.4" />
          <circle cx="56" cy="56" r="1.5" fill="white" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batik)" />
    </svg>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────────

function EventCard({ event, index }) {
  const accent = GROUP_ACCENT[event.group];
  const isEmpty = event.photos.length === 0;
  const padded  = String(index + 1).padStart(2, "0");

  const previews = event.photos.slice(0, 4).map((p) =>
    typeof p === "string" ? p : p.filename
  );

  return (
    <Link
      to={`/gallery/${event.id}`}
      className="gs-card group relative flex flex-col overflow-hidden transition-[transform,box-shadow] duration-500 hover:-translate-y-2"
      style={{
        background: "linear-gradient(160deg, #130b07 0%, #0e0704 100%)",
        border: "1px solid rgba(255,200,150,0.07)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.55)",
      }}
    >
      {/* hover border glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          boxShadow: `inset 0 0 0 1px rgba(${accent.glowRgb},0.35), inset 0 0 60px rgba(${accent.glowRgb},0.10)`,
        }}
      />

      {/* ── Photo ── */}
      <div className="relative z-10 h-52 shrink-0 overflow-hidden" style={{ background: "#0a0604" }}>
        {isEmpty ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-3"
            style={{ background: `radial-gradient(ellipse at center, rgba(${accent.glowRgb},0.06) 0%, transparent 70%)` }}
          >
            <div className="flex items-center gap-3">
              <div className="h-px w-10" style={{ background: `${accent.dot}35` }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: `${accent.dot}60` }}>
                Segera Hadir
              </span>
              <div className="h-px w-10" style={{ background: `${accent.dot}35` }} />
            </div>
          </div>
        ) : previews.length === 1 ? (
          <img src={`/gallery/${event.id}/${previews[0]}`} alt=""
            className="h-full w-full object-cover grayscale-[12%] transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
            loading="lazy" />
        ) : previews.length === 2 ? (
          <div className="grid h-full grid-cols-2 gap-px" style={{ background: "#0a0604" }}>
            {previews.map((f) => (
              <img key={f} src={`/gallery/${event.id}/${f}`} alt=""
                className="h-full w-full object-cover grayscale-[12%] transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                loading="lazy" />
            ))}
          </div>
        ) : (
          <div className="grid h-full grid-cols-[2fr_1fr] gap-px" style={{ background: "#0a0604" }}>
            <img src={`/gallery/${event.id}/${previews[0]}`} alt=""
              className="h-full w-full object-cover grayscale-[12%] transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
              loading="lazy" />
            <div className="grid grid-rows-2 gap-px">
              {previews.slice(1, 3).map((f, i) => (
                <div key={f} className="relative overflow-hidden">
                  <img src={`/gallery/${event.id}/${f}`} alt=""
                    className="h-full w-full object-cover grayscale-[12%] transition duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                    loading="lazy" />
                  {i === 1 && event.photos.length > 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 font-mono text-xs text-white/70">
                      +{event.photos.length - 3}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isEmpty && (
          <div
            className="absolute left-0 top-0 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white"
            style={{ background: `${accent.dot}e0` }}
          >
            {accent.label}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0704] to-transparent" />
      </div>

      {/* ── Info strip ── */}
      <div className="relative z-10 flex flex-col gap-1.5 px-4 pb-4 pt-3">
        <div
          className="absolute inset-x-0 top-0 h-[1px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
          style={{ background: `linear-gradient(90deg, ${accent.dot}, transparent)` }}
        />
        <div className="absolute inset-x-0 top-0 h-[1px]" style={{ background: "rgba(255,200,150,0.07)" }} />

        {isEmpty && (
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: `${accent.dot}80` }}>
            {accent.label}
          </span>
        )}

        <h2 className="font-display text-[0.9rem] font-bold leading-snug text-white/75 transition duration-300 group-hover:text-white">
          {event.title}
        </h2>

        {event.location && (
          <p className="flex items-center gap-1.5 truncate font-mono text-[9px] uppercase tracking-widest text-white/20">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {event.location}
          </p>
        )}

        <div className="flex items-center justify-between pt-1.5">
          <span className="font-mono text-[9px] text-white/18">{event.date}</span>
          <div className="flex items-center gap-3">
            {!isEmpty && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-white/22">
                <Images className="h-2.5 w-2.5" />
                {event.photos.length}
              </span>
            )}
            <span className="font-mono text-[9px] tabular-nums text-white/20">{padded}</span>
          </div>
        </div>
      </div>

      <div
        className="relative z-10 h-[2px] w-0 shrink-0 transition-all duration-500 group-hover:w-full"
        style={{ background: accent.dot }}
      />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const Gallery = () => {
  const rootRef     = useRef(null);
  const titleRef    = useRef(null);
  const eyebrowRef  = useRef(null);
  const descRef     = useRef(null);
  const dividerRef  = useRef(null);
  const statsRef    = useRef(null);
  const stripRef    = useRef(null);

  const grouped = GROUP_ORDER.map((g, gi) => ({
    group: g,
    events: EVENTS.filter((e) => e.group === g),
    accent: GROUP_ACCENT[g],
    startIndex: GROUP_ORDER.slice(0, gi).reduce(
      (n, prev) => n + EVENTS.filter((e) => e.group === prev).length,
      0
    ),
  }));

  const stripImages = EVENTS
    .filter((e) => e.photos.length > 0)
    .flatMap((e) =>
      e.photos.slice(0, 2).map((p) => ({
        src: `/gallery/${e.id}/${typeof p === "string" ? p : p.filename}`,
        id: e.id,
      }))
    )
    .slice(0, 14);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // ── 1. Hero title — char-level SplitText ──────────────────────────
      const split = new SplitText(titleRef.current, { type: "chars" });
      gsap.from(split.chars, {
        y: 100,
        autoAlpha: 0,
        rotationX: -70,
        transformOrigin: "0% 50% -40px",
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.055,
        delay: 0.1,
      });

      // ── 2. Eyebrow line ───────────────────────────────────────────────
      gsap.from(eyebrowRef.current, {
        y: 16,
        autoAlpha: 0,
        duration: 0.8,
        ease: "expo.out",
        delay: 0.15,
      });

      // ── 3. Description ────────────────────────────────────────────────
      gsap.from(descRef.current, {
        y: 16,
        autoAlpha: 0,
        duration: 0.8,
        ease: "expo.out",
        delay: 0.55,
      });

      // ── 4. Merah-putih divider — scaleX wipe ─────────────────────────
      gsap.from(dividerRef.current, {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.4,
        ease: "expo.out",
        delay: 0.6,
      });

      // ── 5. Group stat cards — stagger from right ──────────────────────
      if (statsRef.current) {
        gsap.from(Array.from(statsRef.current.children), {
          x: 30,
          autoAlpha: 0,
          duration: 0.75,
          ease: "expo.out",
          stagger: 0.12,
          delay: 0.45,
        });
      }

      // ── 6. Photo strip ────────────────────────────────────────────────
      if (stripRef.current) {
        gsap.from(stripRef.current, {
          autoAlpha: 0,
          y: 20,
          duration: 1,
          ease: "expo.out",
          delay: 0.8,
        });
      }

      // ── 7. Cards — ScrollTrigger batch ───────────────────────────────
      ScrollTrigger.batch(".gs-card", {
        onEnter: (batch) =>
          gsap.from(batch, {
            y: 60,
            autoAlpha: 0,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.09,
          }),
        once: true,
        start: "top 90%",
      });

      // ── 8. Section headers — scroll reveal ───────────────────────────
      document.querySelectorAll(".gs-section-hdr").forEach((el) => {
        gsap.from(el, {
          x: -20,
          autoAlpha: 0,
          duration: 0.75,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-hidden text-white"
      style={{ background: "linear-gradient(180deg, #0a0604 0%, #0d0806 60%, #080503 100%)" }}
    >
      <BatikPattern />
      <SakuraPetals opacity={0.55} />

      {/* Film grain */}
      <svg className="pointer-events-none fixed inset-0 z-10 h-full w-full opacity-[0.055]"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.75) 100%)" }} />

      {/* Warm ambient blobs */}
      <div className="pointer-events-none fixed -left-32 -top-24 h-[30rem] w-[30rem] rounded-full blur-[140px]"
        style={{ background: "rgba(204,43,43,0.08)" }} />
      <div className="pointer-events-none fixed bottom-0 right-0 h-72 w-96 rounded-full blur-[120px]"
        style={{ background: "rgba(180,100,30,0.06)" }} />

      {/* Top merah rule */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[1px] bg-[#cc2b2b]/60" />

      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div
          className="flex h-12 items-center justify-between px-6 md:px-10"
          style={{
            background: "rgba(10,6,4,0.90)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,200,150,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-[2px] bg-[#cc2b2b]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
              Galeri Foto
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.28em] text-white/18 sm:block">
              Agustus 2026 · Kuala Lumpur
            </span>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/30 transition hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Kembali
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-20 px-6 pb-24 pt-24 md:px-10">
        <div className="mx-auto max-w-[1200px] space-y-16">

          {/* ── Hero ── */}
          <section className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-6">
              <div className="space-y-2">
                <div
                  ref={eyebrowRef}
                  className="font-mono text-[9px] uppercase tracking-[0.36em] text-white/22"
                >
                  Liputan Akhir Pekan
                </div>
                <h1
                  ref={titleRef}
                  className="font-display font-black leading-[0.88] text-white"
                  style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", letterSpacing: "-0.04em" }}
                >
                  GALERI
                </h1>
              </div>

              <p
                ref={descRef}
                className="max-w-xs font-mono text-[11px] leading-6 text-white/28"
              >
                {totalPhotos > 0
                  ? `${totalPhotos} bingkai · ${EVENTS.length} acara`
                  : `${EVENTS.length} acara — mengunggah…`}
              </p>

              {/* Merah-putih divider */}
              <div ref={dividerRef} className="flex items-center">
                <div className="h-[3px] w-10 bg-[#cc2b2b]" />
                <div className="h-[3px] w-10" style={{ background: "rgba(255,255,255,0.75)" }} />
                <div className="h-[1px] flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>
            </div>

            {/* Group stat mini-cards */}
            <div ref={statsRef} className="flex flex-col gap-5 md:items-end">
              {GROUP_STATS.map(({ group, events, photos }) => {
                const acc = GROUP_ACCENT[group];
                return (
                  <div key={group} className="flex items-stretch gap-3">
                    <div className="w-[2px] shrink-0 self-stretch" style={{ background: acc.dot }} />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] leading-none"
                        style={{ color: acc.dot }}
                      >
                        {group}
                      </span>
                      <span className="font-mono text-[9px] leading-snug text-white/30">
                        {events} acara{photos > 0 ? ` · ${photos} foto` : ""}
                      </span>
                      <span className="font-mono text-[9px] italic text-white/15">{acc.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Ambient photo strip ── */}
          {stripImages.length > 0 && (
            <div
              ref={stripRef}
              className="pointer-events-none select-none overflow-hidden"
              style={{
                maskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%)",
              }}
            >
              <div className="flex gap-1">
                {stripImages.map((img, i) => (
                  <img
                    key={`${img.id}-${i}`}
                    src={img.src}
                    alt=""
                    className="h-24 w-24 shrink-0 object-cover opacity-35 grayscale-[25%]"
                    loading="lazy"
                    draggable={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Event groups ── */}
          {grouped.map(({ group, events, accent, startIndex }, gi) => (
            <section key={group} className="space-y-5">
              <div className="gs-section-hdr flex items-center gap-4">
                <span
                  className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: accent.dot }}
                >
                  {String(gi + 1).padStart(2, "0")} — {group}
                </span>
                <span className="font-mono text-[9px] italic text-white/18">{accent.sub}</span>
                <div className="h-px flex-1" style={{ background: `rgba(${accent.glowRgb},0.18)` }} />
                <span className="font-mono text-[9px] tracking-widest text-white/18">
                  {events.length} acara
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event, i) => (
                  <EventCard key={event.id} event={event} index={startIndex + i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Gallery;
