import { useEffect, useRef } from "react";

export type RevealDirection = "up" | "left" | "right" | "scale";

/**
 * Wraps children in an element that fades+rises into view when scrolled
 * into the viewport. Uses IntersectionObserver, no JS animation library.
 *
 * `stagger` — if true, children should have className="reveal-child"
 *             and will animate in sequence.
 * `direction` — animation direction: "up" (default), "left", "right", or "scale".
 */
export function ScrollReveal({
  children,
  className = "",
  stagger = false,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
  direction?: RevealDirection;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "40px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dirClass = direction !== "up" ? `reveal-${direction}` : "";
  const baseClass = stagger ? "reveal-stagger" : "reveal";

  return (
    <div
      ref={ref}
      className={`${baseClass} ${dirClass} ${className}`}
    >
      {children}
    </div>
  );
}
