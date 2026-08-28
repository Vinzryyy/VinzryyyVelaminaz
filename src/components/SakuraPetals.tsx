/**
 * Falling sakura petals — purely decorative CSS animation.
 * Respects `prefers-reduced-motion: reduce` (hidden via CSS).
 * Mounted once in the root layout.
 */

const PETAL_COUNT_DESKTOP = 14;
const PETAL_COUNT_MOBILE = 6;
const PETAL_PATH = "M10 1 C12 5, 18 8, 10 18 C2 8, 8 5, 10 1Z";

// Depth layers: far petals are smaller, blurred, and slower
type Depth = "far" | "mid" | "near";
const DEPTH_CONFIG: Record<Depth, { scaleRange: [number, number]; blur: number; speedMul: number; opacityRange: [number, number] }> = {
  far:  { scaleRange: [0.3, 0.45], blur: 3,   speedMul: 1.4, opacityRange: [0.12, 0.18] },
  mid:  { scaleRange: [0.5, 0.75], blur: 1,   speedMul: 1.0, opacityRange: [0.2, 0.3] },
  near: { scaleRange: [0.8, 1.1],  blur: 0,   speedMul: 0.7, opacityRange: [0.3, 0.45] },
};
const DEPTHS: Depth[] = ["far", "mid", "near"];

function makePetal(i: number) {
  const depth = DEPTHS[i % 3];
  const cfg = DEPTH_CONFIG[depth];
  const t = (i * 0.618) % 1; // golden ratio spread
  return {
    id: i,
    left: `${(i * 7.3 + Math.sin(i * 1.7) * 10 + 50) % 100}%`,
    delay: `${(i * 0.65) % 12}s`,
    duration: `${(8 + (i % 6)) * cfg.speedMul}s`,
    scale: cfg.scaleRange[0] + t * (cfg.scaleRange[1] - cfg.scaleRange[0]),
    rotate: (i * 41) % 360,
    drift: ((i % 5) - 2) * 55,
    opacity: cfg.opacityRange[0] + t * (cfg.opacityRange[1] - cfg.opacityRange[0]),
    blur: cfg.blur,
    depth,
  };
}

const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
const petalCount = isMobile ? PETAL_COUNT_MOBILE : PETAL_COUNT_DESKTOP;
const petals = Array.from({ length: petalCount }, (_, i) => makePetal(i));

export function SakuraPetals() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
    >
      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-petal absolute top-0"
          style={{
            left: p.left,
            "--petal-rot": `${p.rotate}deg`,
            "--petal-drift": `${p.drift}px`,
            "--petal-opacity": String(p.opacity),
            animation: `sakura-drift ${p.duration} ${p.delay} infinite ease-in`,
            filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
            zIndex: p.depth === "near" ? 6 : p.depth === "mid" ? 5 : 4,
          } as React.CSSProperties}
        >
          <svg
            width="20"
            height="22"
            viewBox="0 0 20 22"
            style={{ transform: `scale(${p.scale})` }}
          >
            <path d={PETAL_PATH} fill={`rgba(242,184,198,${p.depth === "far" ? 0.35 : 0.5})`} />
            <path
              d={PETAL_PATH}
              fill="none"
              stroke="rgba(242,184,198,0.25)"
              strokeWidth="0.4"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
