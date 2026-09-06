import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type RevealDirection = "up" | "left" | "right" | "scale";

const DIRECTION_FROM: Record<RevealDirection, gsap.TweenVars> = {
  up:    { y: 40 },
  left:  { x: -40 },
  right: { x: 40 },
  scale: { scale: 0.88 },
};

/**
 * Wraps children in an element that animates into view on scroll
 * using GSAP ScrollTrigger.
 *
 * `stagger` — if true, direct children animate in sequence (0.08s apart).
 * `direction` — animation axis: "up" (default), "left", "right", or "scale".
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
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const targets = stagger
        ? gsap.utils.toArray<HTMLElement>(container.current!.children)
        : [container.current!];

      if (targets.length === 0) return;

      gsap.from(targets, {
        autoAlpha: 0,
        ...DIRECTION_FROM[direction],
        duration: 0.7,
        ease: "back.out(1.7)",
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: {
          trigger: container.current!,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
}
