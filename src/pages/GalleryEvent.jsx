import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams, Navigate } from "react-router";
import { ArrowLeft, ArrowRight, X, MapPin, Calendar, Camera, Aperture } from "lucide-react";
import { EVENTS, normalizePhotos } from "@/data/galleryEvents";
import { SakuraPetals } from "@/components/SakuraPetals";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

// ── JP x Indo warm accent per group ──────────────────────────────────────────
const WARM = {
  JKT48:    { dot: "#cc2b2b", pill: "text-red-300   border-red-400/30   bg-red-400/10"   },
  KLP48:    { dot: "#16a34a", pill: "text-green-300  border-green-400/30  bg-green-400/10"  },
  Quadlips: { dot: "#db2777", pill: "text-pink-300   border-pink-400/30   bg-pink-400/10"  },
};

// ── Size → grid-span map ──────────────────────────────────────────────────────

const SIZE_CLASS = {
  "":   "col-span-1 row-span-1",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
  big:  "col-span-2 row-span-2",
};

// ── EXIF table ────────────────────────────────────────────────────────────────

function ExifTable({ exif }) {
  if (!exif) return null;
  const rows = [
    exif.camera   && ["Camera",   exif.camera],
    exif.lens     && ["Lens",     exif.lens],
    exif.aperture && ["Aperture", exif.aperture],
    exif.shutter  && ["Shutter",  exif.shutter],
    exif.iso      && ["ISO",      exif.iso],
  ].filter(Boolean);
  if (!rows.length) return null;

  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-white/6 last:border-0">
            <td className="py-1.5 pr-3 font-mono uppercase tracking-widest text-white/25 whitespace-nowrap">
              {label}
            </td>
            <td className="py-1.5 font-mono text-white/65">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Facts panel ───────────────────────────────────────────────────────────────

function FactsPanel({ event, photoCount, dot }) {
  const facts = [
    event.location && { icon: <MapPin className="h-3.5 w-3.5" />,  label: "Lokasi",  value: event.location },
    event.date     && { icon: <Calendar className="h-3.5 w-3.5" />, label: "Tanggal", value: event.date },
    photoCount > 0 && { icon: <Camera className="h-3.5 w-3.5" />,   label: "Bingkai", value: `${photoCount} foto` },
    event.gear     && { icon: <Aperture className="h-3.5 w-3.5" />, label: "Kamera",  value: event.gear },
  ].filter(Boolean);

  if (!facts.length) return null;

  return (
    <div className="space-y-4 p-5" style={{ border: "1px solid rgba(255,200,150,0.09)", background: "rgba(255,255,255,0.025)" }}>
      {facts.map(({ icon, label, value }, i) => (
        <div key={label} data-fact>
          {i > 0 && <div className="mb-4 h-px" style={{ background: "rgba(255,200,150,0.06)" }} />}
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0" style={{ color: dot }}>{icon}</span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/22">{label}</p>
              <p className="mt-0.5 text-sm leading-snug text-white/70">{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ event, photos, startIndex, onClose, warm }) {
  const [idx, setIdx] = useState(startIndex);
  const [imgLoaded, setImgLoaded] = useState(false);
  const touchStartX = useRef(null);
  const [, setSearchParams] = useSearchParams();

  const photo = photos[idx];
  const src   = `/gallery/${event.id}/${photo.filename}`;
  const progress = ((idx + 1) / photos.length) * 100;

  const prev = useCallback(() => {
    setImgLoaded(false);
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const next = useCallback(() => {
    setImgLoaded(false);
    setIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    setSearchParams({ photo: photo.frameNum }, { replace: true });
    return () => setSearchParams({}, { replace: true });
  }, [photo.frameNum, setSearchParams]);

  useEffect(() => {
    const preload = (i) => {
      const p = photos[(i + photos.length) % photos.length];
      new Image().src = `/gallery/${event.id}/${p.filename}`;
    };
    preload(idx - 1);
    preload(idx + 1);
  }, [idx, event.id, photos]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex backdrop-blur-sm"
      style={{ background: "rgba(7,4,2,0.97)" }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
        touchStartX.current = null;
      }}
    >
      {/* Progress bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px]" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, background: warm.dot }}
        />
      </div>

      {/* Close */}
      <button
        className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center border border-white/12 bg-white/8 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
        onClick={onClose}
        aria-label="Tutup"
      >
        <X className="h-4 w-4" />
      </button>

      {/* ── Photo area ── */}
      <div
        className="relative flex flex-1 items-center justify-center p-4 md:p-12"
        onClick={onClose}
      >
        {/* Film sprocket strip */}
        <div className="pointer-events-none absolute left-0 top-0 hidden h-full w-6 flex-col items-center overflow-hidden opacity-[0.08] md:flex">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="my-[5px] h-3 w-3.5 shrink-0 border border-white/60" />
          ))}
        </div>

        {/* Spinner */}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-8 w-8 animate-spin border-2 border-t-transparent"
              style={{ borderColor: `${warm.dot}40`, borderTopColor: warm.dot }}
            />
          </div>
        )}

        {/* Photo */}
        <img
          key={src}
          src={src}
          alt={photo.title || photo.filename}
          onLoad={() => setImgLoaded(true)}
          className={`max-h-full max-w-full object-contain shadow-[0_16px_80px_rgba(0,0,0,0.7)] transition-opacity duration-200 ${imgLoaded ? "opacity-100 animate-photo-fade" : "opacity-0"}`}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Counter */}
        <div
          className="absolute left-1/2 top-4 z-10 -translate-x-1/2 select-none border px-4 py-1 font-mono text-xs text-white/40 backdrop-blur"
          style={{ borderColor: "rgba(255,200,150,0.10)", background: "rgba(7,4,2,0.75)" }}
        >
          <span style={{ color: warm.dot }}>{idx + 1}</span>
          <span className="text-white/20"> / {photos.length}</span>
        </div>

        {/* Prev */}
        {photos.length > 1 && (
          <button
            className="absolute left-8 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-white/12 bg-white/8 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Sebelumnya"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {/* Next */}
        {photos.length > 1 && (
          <button
            className="absolute right-8 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center border border-white/12 bg-white/8 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Berikutnya"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Info panel (desktop) ── */}
      <aside
        className="hidden shrink-0 flex-col gap-0 overflow-y-auto md:flex"
        style={{ width: 288, borderLeft: "1px solid rgba(255,200,150,0.08)", background: "rgba(10,6,3,0.65)" }}
      >
        {/* Top block */}
        <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,200,150,0.07)" }}>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${warm.pill}`}>
              {event.group}
            </span>
            <span className="font-mono text-[11px] text-white/22">#{photo.frameNum}</span>
          </div>
        </div>

        {/* Photo info */}
        <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,200,150,0.07)" }}>
          <h2 className="font-display text-base font-bold leading-snug text-white/90">
            {photo.title || event.title}
          </h2>
          {photo.story && (
            <p className="mt-2 text-xs leading-6 text-white/45">{photo.story}</p>
          )}
          {event.location && (
            <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-white/25">
              <MapPin className="h-3 w-3 shrink-0" />
              {event.location}
            </p>
          )}
        </div>

        {/* EXIF */}
        {photo.exif && (
          <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,200,150,0.07)" }}>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-white/20">EXIF</p>
            <ExifTable exif={photo.exif} />
          </div>
        )}

        {/* Tags */}
        {photo.tags?.length > 0 && (
          <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,200,150,0.07)" }}>
            <div className="flex flex-wrap gap-1.5">
              {photo.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-white/10 bg-white/4 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-white/35"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filmstrip */}
        {photos.length > 1 && (
          <div className="mt-auto px-5 py-4">
            <p className="mb-2.5 font-mono text-[9px] uppercase tracking-widest text-white/20">
              Semua Bingkai
            </p>
            <div className="grid max-h-60 grid-cols-4 gap-1 overflow-y-auto">
              {photos.map((p, i) => (
                <button
                  key={p.filename}
                  onClick={() => { setImgLoaded(false); setIdx(i); }}
                  className={`aspect-square overflow-hidden transition-all duration-200 ${
                    i === idx ? "opacity-100" : "opacity-35 hover:opacity-70"
                  }`}
                  style={i === idx ? { outline: `2px solid ${warm.dot}`, outlineOffset: "1px" } : undefined}
                >
                  <img
                    src={`/gallery/${event.id}/${p.filename}`}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Mobile filmstrip ── */}
      {photos.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 gap-1 overflow-x-auto border p-1.5 backdrop-blur md:hidden"
          style={{ borderColor: "rgba(255,200,150,0.10)", background: "rgba(7,4,2,0.80)" }}
        >
          {photos.map((p, i) => (
            <button
              key={p.filename}
              onClick={(e) => { e.stopPropagation(); setImgLoaded(false); setIdx(i); }}
              className={`h-11 w-11 shrink-0 overflow-hidden transition-all duration-200 ${i === idx ? "scale-110 opacity-100" : "opacity-30 hover:opacity-65"}`}
              style={i === idx ? { outline: `2px solid ${warm.dot}`, outlineOffset: "1px" } : undefined}
            >
              <img src={`/gallery/${event.id}/${p.filename}`} alt=""
                className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hover Veil ────────────────────────────────────────────────────────────────

function HoverVeil({ photo }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-black/80 via-black/10 to-transparent">
      <span className="self-start bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white/60 backdrop-blur-sm">
        #{photo.frameNum}
      </span>
      {(photo.title || photo.exif) && (
        <div className="space-y-0.5">
          {photo.title && (
            <p className="text-xs font-semibold leading-tight text-white line-clamp-2">
              {photo.title}
            </p>
          )}
          {photo.exif && (
            <p className="font-mono text-[9px] text-white/45">
              {[
                photo.exif.lens,
                photo.exif.aperture,
                photo.exif.shutter,
                photo.exif.iso && `ISO ${photo.exif.iso}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({ event, photos, onOpen }) {
  const hasSizeVariants = photos.some((p) => p.size && p.size !== "");

  if (hasSizeVariants) {
    return (
      <div className="grid auto-rows-[160px] grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, i) => (
          <button
            key={photo.filename}
            className={`ge-photo group relative overflow-hidden border border-white/5 bg-black/20 transition duration-300 hover:border-white/15 hover:brightness-105 ${SIZE_CLASS[photo.size] ?? SIZE_CLASS[""]}`}
            onClick={() => onOpen(i)}
            aria-label={photo.title || `Foto ${i + 1}`}
          >
            <img
              src={`/gallery/${event.id}/${photo.filename}`}
              alt={photo.title || ""}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <HoverVeil photo={photo} />
          </button>
        ))}
      </div>
    );
  }

  // Masonry
  return (
    <div className="columns-2 gap-1 sm:columns-3 md:columns-4 lg:columns-5">
      {photos.map((photo, i) => (
        <button
          key={photo.filename}
          className="ge-photo group relative mb-1 block w-full overflow-hidden border border-white/5 bg-black/20 transition duration-300 hover:border-white/15 hover:brightness-105"
          onClick={() => onOpen(i)}
          aria-label={photo.title || `Foto ${i + 1}`}
        >
          <img
            src={`/gallery/${event.id}/${photo.filename}`}
            alt={photo.title || ""}
            className="block w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <HoverVeil photo={photo} />
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const GalleryEvent = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const rootRef      = useRef(null);
  const titleRef     = useRef(null);
  const pillRef      = useRef(null);
  const metaRef      = useRef(null);
  const factsWrapRef = useRef(null);
  const initialFrameHandled = useRef(false);

  const event = EVENTS.find((e) => e.id === eventId);
  const photos  = useMemo(() => event ? normalizePhotos(event.photos) : [], [event]);
  const warm    = event ? (WARM[event.group] ?? WARM.JKT48) : WARM.JKT48;
  const isEmpty = photos.length === 0;

  useEffect(() => {
    if (!event) return;
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: "chars" });
        gsap.from(split.chars, {
          y: 80, autoAlpha: 0, rotationX: -65,
          transformOrigin: "0% 50% -30px", duration: 1.0,
          ease: "expo.out", stagger: 0.045, delay: 0.15,
        });
      }
      if (pillRef.current) {
        gsap.from(pillRef.current, { y: 14, autoAlpha: 0, duration: 0.7, ease: "expo.out", delay: 0.1 });
      }
      if (metaRef.current) {
        gsap.from(metaRef.current, { y: 12, autoAlpha: 0, duration: 0.7, ease: "expo.out", delay: 0.55 });
      }
      if (factsWrapRef.current) {
        const rows = factsWrapRef.current.querySelectorAll("[data-fact]");
        if (rows.length) {
          gsap.from(rows, { x: 20, autoAlpha: 0, duration: 0.65, ease: "expo.out", stagger: 0.1, delay: 0.4 });
        }
      }
      ScrollTrigger.batch(".ge-photo", {
        onEnter: (batch) =>
          gsap.from(batch, { y: 50, autoAlpha: 0, duration: 0.85, ease: "expo.out", stagger: 0.07 }),
        once: true,
        start: "top 92%",
      });
    }, rootRef);
    return () => ctx.revert();
  }, [event]);

  useEffect(() => {
    if (initialFrameHandled.current || !event) return;
    initialFrameHandled.current = true;
    const frameParam = searchParams.get("photo");
    if (frameParam && photos.length > 0) {
      const i = photos.findIndex((p) => p.frameNum === frameParam);
      if (i !== -1) requestAnimationFrame(() => setLightboxIdx(i));
    }
  }, [event, searchParams, photos]);

  if (!event) return <Navigate to="/gallery" replace />;

  return (
    <div
      ref={rootRef}
      className="min-h-screen overflow-hidden text-white"
      style={{ background: "linear-gradient(180deg, #0a0604 0%, #0d0806 60%, #080503 100%)" }}
    >
      <SakuraPetals opacity={0.45} />

      {/* Batik pattern */}
      <svg className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="batik-ev" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
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
        <rect width="100%" height="100%" fill="url(#batik-ev)" />
      </svg>

      {/* Film grain */}
      <svg className="pointer-events-none fixed inset-0 z-10 h-full w-full opacity-[0.055]"
        xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <filter id="grain-ev">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-ev)" />
      </svg>

      {/* Vignette */}
      <div className="pointer-events-none fixed inset-0 z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.75) 100%)" }} />

      {/* Warm light leaks */}
      <div className="pointer-events-none fixed -left-24 top-0 h-[28rem] w-[28rem] rounded-full blur-[150px] opacity-12"
        style={{ background: warm.dot }} />
      <div className="pointer-events-none fixed bottom-0 right-[-6rem] h-64 w-64 rounded-full blur-[130px] opacity-8"
        style={{ background: warm.dot }} />

      {/* Group accent top rule */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[1px]" style={{ background: warm.dot }} />

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
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-4 w-[2px] shrink-0" style={{ background: warm.dot }} />
            <span className={`inline-flex shrink-0 items-center border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${warm.pill}`}>
              {event.group}
            </span>
            <span className="truncate font-mono text-[10px] uppercase tracking-widest text-white/35">
              {event.title}
            </span>
          </div>
          <Link
            to="/gallery"
            className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/28 transition hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            <span className="hidden md:inline">Galeri</span>
          </Link>
        </div>
      </header>

      <main className="relative z-20 px-4 pb-20 pt-20">
        <div className="container space-y-8">

          {/* ── Page header ── */}
          <section className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
            <div className="space-y-3 border-t pt-5" style={{ borderColor: `${warm.dot}40` }}>
              <span ref={pillRef} className={`inline-flex items-center border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${warm.pill}`}>
                {event.group}
              </span>
              <h1 ref={titleRef} className="font-display text-3xl font-bold leading-[0.95] md:text-4xl">
                {event.title}
              </h1>
              {event.description ? (
                <p ref={metaRef} className="max-w-xl text-sm leading-6 text-white/45">{event.description}</p>
              ) : (
                <p ref={metaRef} className="font-mono text-[11px] uppercase tracking-widest text-white/22">
                  {event.date}{!isEmpty && ` · ${photos.length} bingkai`}
                </p>
              )}
            </div>
            <div ref={factsWrapRef}>
              <FactsPanel event={event} photoCount={photos.length} dot={warm.dot} />
            </div>
          </section>

          {/* ── Content ── */}
          {isEmpty ? (
            <div
              className="relative flex flex-col items-center justify-center gap-6 overflow-hidden border py-32 text-center"
              style={{ borderColor: "rgba(255,200,150,0.07)", background: "rgba(255,255,255,0.012)" }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${warm.dot}55, transparent)` }}
              />
              <div
                className="flex h-14 w-14 items-center justify-center border"
                style={{ borderColor: `${warm.dot}40`, boxShadow: `0 0 32px ${warm.dot}28` }}
              >
                <Camera className="h-6 w-6 text-white/25" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold text-white/45">Segera Hadir</p>
                <p className="font-mono text-[10px] text-white/20">{event.date}</p>
              </div>
            </div>
          ) : (
            <PhotoGrid event={event} photos={photos} onOpen={setLightboxIdx} />
          )}
        </div>
      </main>

      {lightboxIdx !== null && (
        <Lightbox
          event={event}
          photos={photos}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          warm={warm}
        />
      )}
    </div>
  );
};

export default GalleryEvent;
