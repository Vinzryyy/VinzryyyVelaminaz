/**
 * Falling sakura petals — purely decorative CSS animation.
 * Respects `prefers-reduced-motion: reduce` (hidden via CSS).
 * Mounted once in the root layout.
 */

const PETAL_COUNT = 14;
const PETAL_PATH = "M10 1 C12 5, 18 8, 10 18 C2 8, 8 5, 10 1Z";

function makePetal(i: number) {
  return {
    id: i,
    left: `${(i * 7.3 + Math.sin(i * 1.7) * 10 + 50) % 100}%`,
    delay: `${(i * 0.65) % 12}s`,
    duration: `${8 + (i % 6)}s`,
    scale: 0.55 + (i % 5) * 0.15,
    rotate: (i * 41) % 360,
    drift: ((i % 5) - 2) * 55,
    opacity: 0.25 + (i % 4) * 0.08,
  };
}

const petals = Array.from({ length: PETAL_COUNT }, (_, i) => makePetal(i));

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
          } as React.CSSProperties}
        >
          <svg
            width="20"
            height="22"
            viewBox="0 0 20 22"
            style={{ transform: `scale(${p.scale})` }}
          >
            <path d={PETAL_PATH} fill="rgba(242,184,198,0.5)" />
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
