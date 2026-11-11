import React, { useCallback, useRef } from 'react';

interface MetroPanoramaProps {
  children: React.ReactNode;
  onNavigate: (direction: 'left' | 'right') => void;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Small, dependency-free Panorama gesture surface. It writes motion to CSS
 * variables so pointer moves do not cause a React render on every frame.
 */
export const MetroPanorama: React.FC<MetroPanoramaProps> = ({ children, onNavigate, className = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const axisRef = useRef<'horizontal' | 'vertical' | null>(null);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<number | null>(null);

  const writeMotion = useCallback((offset: number, state: 'idle' | 'dragging' | 'settling') => {
    offsetRef.current = offset;
    const root = rootRef.current;
    if (!root) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      root.style.setProperty('--metro-pan-x', `${offset}px`);
      root.style.setProperty('--metro-pan-progress', `${clamp(offset / Math.max(root.clientWidth, 1), -1, 1)}`);
      root.dataset.panState = state;
      rafRef.current = null;
    });
  }, []);

  const settle = useCallback((direction: 'left' | 'right' | null) => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);

    if (!direction) {
      writeMotion(0, reducedMotion ? 'idle' : 'settling');
      settleTimerRef.current = window.setTimeout(() => writeMotion(0, 'idle'), reducedMotion ? 0 : 220);
      return;
    }

    const travel = Math.min(Math.max(root.clientWidth * 0.28, 96), 180);
    writeMotion(direction === 'right' ? -travel : travel, reducedMotion ? 'idle' : 'settling');
    settleTimerRef.current = window.setTimeout(() => {
      writeMotion(0, 'idle');
      onNavigate(direction);
    }, reducedMotion ? 0 : 180);
  }, [onNavigate, writeMotion]);

  const endGesture = useCallback(() => {
    const offset = offsetRef.current;
    const velocity = velocityRef.current;
    const intent = Math.abs(offset) > 44 || Math.abs(velocity) > 0.42;
    const direction = intent ? (offset < 0 || velocity < 0 ? 'right' : 'left') : null;
    if (pointerIdRef.current !== null) {
      try { rootRef.current?.releasePointerCapture(pointerIdRef.current); } catch { /* already released */ }
    }
    pointerIdRef.current = null;
    axisRef.current = null;
    velocityRef.current = 0;
    settle(direction);
  }, [settle]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('input, textarea, select, button, [data-no-swipe]')) return;
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    lastXRef.current = event.clientX;
    lastTimeRef.current = performance.now();
    axisRef.current = null;
    velocityRef.current = 0;
    writeMotion(0, 'dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const dx = event.clientX - startXRef.current;
    const dy = event.clientY - startYRef.current;
    if (!axisRef.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (axisRef.current !== 'horizontal') return;
    event.preventDefault();
    const now = performance.now();
    const dt = Math.max(8, now - lastTimeRef.current);
    velocityRef.current = (event.clientX - lastXRef.current) / dt;
    lastXRef.current = event.clientX;
    lastTimeRef.current = now;
    const resistance = Math.abs(dx) > 150 ? 0.35 : 0.62;
    writeMotion(clamp(dx * resistance, -190, 190), 'dragging');
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 1) return;
    event.preventDefault();
    const delta = clamp(event.deltaX, -80, 80);
    velocityRef.current = delta / 16;
    writeMotion(clamp(offsetRef.current - delta * 0.72, -190, 190), 'dragging');
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(endGesture, 95);
  };

  return (
    <div
      ref={rootRef}
      className={`metro-panorama-shell ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onWheel={handleWheel}
    >
      {children}
    </div>
  );
};
