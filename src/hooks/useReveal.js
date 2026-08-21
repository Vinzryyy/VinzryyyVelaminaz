import { useEffect, useRef } from 'react'
import { revealOnScroll } from '@/lib/gsap'

/** Attach to a section ref to animate it in on scroll. */
export function useReveal(vars = {}) {
  const ref = useRef(null)
  const varsRef = useRef(vars)
  useEffect(() => {
    if (!ref.current) return
    const anim = revealOnScroll(ref.current, varsRef.current)
    return () => anim.scrollTrigger?.kill()
  }, [])
  return ref
}
