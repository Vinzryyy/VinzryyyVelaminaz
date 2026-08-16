import { useMemo } from 'react'

const PETAL_PATH =
  'M10 1 C12 5, 18 8, 10 18 C2 8, 8 5, 10 1Z'

const COUNT = 18

export function SakuraPetals({ opacity = 0.5 }) {
  const petals = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left:     `${(i * 5.8 + Math.sin(i * 1.3) * 8 + 50) % 100}%`,
        delay:    `${(i * 0.43) % 9}s`,
        duration: `${7 + (i % 5)}s`,
        scale:    0.6 + (i % 4) * 0.18,
        rotate:   (i * 37) % 360,
        drift:    ((i % 5) - 2) * 60,
      })),
    []
  )

  return (
    <>
      <style>{`
        @keyframes sakura-fall {
          0%   { transform: translateY(-60px) rotate(var(--rot)) translateX(0);    opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(105vh) rotate(calc(var(--rot) + 240deg)) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0 z-[5] overflow-hidden"
        style={{ opacity }}
        aria-hidden="true"
      >
        {petals.map((p) => (
          <div
            key={p.id}
            className="absolute top-0"
            style={{
              left: p.left,
              '--rot':   `${p.rotate}deg`,
              '--drift': `${p.drift}px`,
              animation: `sakura-fall ${p.duration} ${p.delay} infinite ease-in`,
            }}
          >
            <svg
              width="20"
              height="22"
              viewBox="0 0 20 22"
              style={{ transform: `scale(${p.scale})` }}
            >
              <path d={PETAL_PATH} fill="rgba(255,192,203,0.55)" />
              <path d={PETAL_PATH} fill="none" stroke="rgba(255,160,180,0.3)" strokeWidth="0.4" />
            </svg>
          </div>
        ))}
      </div>
    </>
  )
}
