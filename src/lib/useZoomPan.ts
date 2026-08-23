import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
const TOGGLE_ZOOM = 1.8;
const DRAG_SLOP = 3;

interface Point { x: number; y: number; }
interface Anchor { clientX: number; clientY: number; }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Zoom + pan for a single image inside a container.
 *
 * The image keeps its natural layout size (object-contain); only a CSS
 * transform changes, so zooming never triggers reflow.
 *
 * Pan is clamped to the scaled image's overflow, so the photo can't be
 * dragged off screen — at zoom 1 it stays perfectly centred.
 *
 * `resetKey` returns the view to fit-and-centred whenever it changes.
 */
export function useZoomPan(resetKey: unknown) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const movedRef = useRef(false);

  /* Reset on photo change — adjusted during render rather than in an effect,
     so the new photo never paints one frame at the old zoom. */
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    // Gesture refs are intentionally left alone: pointerup / touchend clear
    // them, and at zoom 1 the pan limits collapse to 0 so a stale drag is inert.
  }

  /** How far the image may travel before its edge enters the frame. */
  const limits = useCallback((z: number): Point => {
    const el = imgRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (el.offsetWidth * z - parent.clientWidth) / 2),
      y: Math.max(0, (el.offsetHeight * z - parent.clientHeight) / 2),
    };
  }, []);

  const clampOffset = useCallback(
    (o: Point, z: number): Point => {
      const lim = limits(z);
      return { x: clamp(o.x, -lim.x, lim.x), y: clamp(o.y, -lim.y, lim.y) };
    },
    [limits]
  );

  /**
   * Change zoom while keeping the point under `anchor` stationary.
   * Without an anchor it zooms about the centre.
   */
  const zoomTo = useCallback(
    (nextZoom: number, anchor?: Anchor) => {
      const z2 = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      if (z2 === zoom) return;

      let next: Point;
      const el = imgRef.current;

      if (z2 === MIN_ZOOM) {
        next = { x: 0, y: 0 };
      } else if (!el || !anchor) {
        next = clampOffset(offset, z2);
      } else {
        // rect already includes the current transform, so dividing by the
        // current zoom converts the anchor into unscaled image space.
        const rect = el.getBoundingClientRect();
        const ux = (anchor.clientX - (rect.left + rect.width / 2)) / zoom;
        const uy = (anchor.clientY - (rect.top + rect.height / 2)) / zoom;
        // Hold that point still: o2 = o1 + u * (z1 - z2)
        next = clampOffset(
          { x: offset.x + ux * (zoom - z2), y: offset.y + uy * (zoom - z2) },
          z2
        );
      }

      setZoom(z2);
      setOffset(next);
    },
    [zoom, offset, clampOffset]
  );

  const toggleZoom = useCallback(
    (anchor?: Anchor) => zoomTo(zoom > MIN_ZOOM ? MIN_ZOOM : TOGGLE_ZOOM, anchor),
    [zoom, zoomTo]
  );

  const reset = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  /* ── Pointer drag (mouse + single touch) ──────────────────────── */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Cleared on every press, including at zoom 1 — otherwise a flag left
      // over from an earlier pan would swallow the next click-to-zoom.
      movedRef.current = false;
      if (zoom <= MIN_ZOOM || pinchRef.current) return;
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
      setDragging(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [zoom, offset]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || pinchRef.current) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) movedRef.current = true;
      setOffset(clampOffset({ x: d.originX + dx, y: d.originY + dy }, zoom));
    },
    [zoom, clampOffset]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  /* ── Pinch (two touches) ──────────────────────────────────────── */

  const touchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinchRef.current = { dist: touchDist(e.touches), zoom };
      dragRef.current = null;
      setDragging(false);
    },
    [zoom]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const p = pinchRef.current;
      if (!p || e.touches.length !== 2) return;
      const ratio = touchDist(e.touches) / (p.dist || 1);
      zoomTo(p.zoom * ratio, {
        clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      });
    },
    [zoomTo]
  );

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
  }, []);

  /* ── Wheel / trackpad ─────────────────────────────────────────────
   * Bound manually because React registers wheel listeners as passive,
   * where preventDefault() is a no-op — without it the scroll container
   * behind the photo would scroll while zooming. */

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(zoom * Math.exp(-e.deltaY * 0.0015), { clientX: e.clientX, clientY: e.clientY });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, zoomTo]);

  return {
    zoom,
    offset,
    dragging,
    imgRef,
    isZoomed: zoom > MIN_ZOOM,
    /** True when the last pointer sequence was a drag rather than a tap. */
    didDrag: () => movedRef.current,
    zoomTo,
    toggleZoom,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
