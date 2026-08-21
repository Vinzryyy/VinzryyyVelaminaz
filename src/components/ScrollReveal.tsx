import { useEffect, useRef } from "react";

/**
 * Wraps children in an element that fades+rises into view when scrolled
 * into the viewport. Uses IntersectionObserver, no JS animation library.
 *
 * `stagger` — if true, children should have className="reveal-child"
 *             and will animate in sequence.
 */
export function ScrollReveal({
  children,
  className = "",
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: boolean;
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

  return (
    <div
      ref={ref}
      className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`}
    >
      {children}
    </div>
  );
}
