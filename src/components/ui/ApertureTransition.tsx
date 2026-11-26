import React, { useLayoutEffect, useRef } from 'react';

export type ApertureMode = 'idle' | 'close' | 'open';

interface ApertureTransitionProps {
  mode: ApertureMode;
  /** Berubah setiap kali transisi baru dimulai agar animasi diulang */
  runKey: number;
  reducedMotion: boolean;
  onClosed?: () => void;
  onOpened?: () => void;
}

const SIDES = 6;
const CLOSE_MS = 460;
const OPEN_MS = 780;

/** Heksagon (bilah diafragma) berjari-jari r di tengah layar, diputar sedikit */
function hexPath(cx: number, cy: number, r: number, rot: number): string {
  let d = '';
  for (let i = 0; i < SIDES; i++) {
    const a = rot + (i * Math.PI * 2) / SIDES;
    d += `${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return `${d}Z`;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

/**
 * Transisi diafragma kamera: layar ditutup bilah segi enam yang menyempit (close),
 * lalu membuka kembali (open) untuk mengungkap adegan berikutnya.
 * Dipilih karena subjeknya fotografi; tidak memakai kilatan atau garis radial.
 */
export const ApertureTransition: React.FC<ApertureTransitionProps> = ({
  mode,
  runKey,
  reducedMotion,
  onClosed,
  onOpened,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const rimRef = useRef<SVGPathElement>(null);
  const onClosedRef = useRef(onClosed);
  const onOpenedRef = useRef(onOpened);
  onClosedRef.current = onClosed;
  onOpenedRef.current = onOpened;

  useLayoutEffect(() => {
    if (mode === 'idle') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) * 0.62;

    const draw = (r: number, rot: number) => {
      // Persegi penuh dikurangi heksagon (evenodd) = layar tertutup kecuali lubang diafragma
      const hole = r > 0.5 ? hexPath(cx, cy, r, rot) : '';
      pathRef.current?.setAttribute('d', `M 0 0 H ${w} V ${h} H 0 Z ${hole}`);
      rimRef.current?.setAttribute('d', hole);
      rimRef.current?.setAttribute('opacity', r > 0.5 && r < maxR * 0.98 ? '1' : '0');
    };

    if (reducedMotion) {
      draw(mode === 'close' ? 0 : maxR, 0);
      const t = window.setTimeout(() => {
        if (mode === 'close') onClosedRef.current?.();
        else onOpenedRef.current?.();
      }, 30);
      return () => window.clearTimeout(t);
    }

    const duration = mode === 'close' ? CLOSE_MS : OPEN_MS;
    const start = performance.now();
    let raf = 0;
    draw(mode === 'close' ? maxR : 0, 0);

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = mode === 'close' ? 1 - easeIn(t) : easeOut(t);
      const rot = (mode === 'close' ? t : 1 - t) * 0.5;
      draw(maxR * k, rot);
      if (t < 1) {
        raf = window.requestAnimationFrame(frame);
      } else if (mode === 'close') {
        onClosedRef.current?.();
      } else {
        onOpenedRef.current?.();
      }
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [mode, runKey, reducedMotion]);

  if (mode === 'idle') return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[65] w-full h-full"
      width="100%"
      height="100%"
    >
      <path ref={pathRef} fill="#07060A" fillRule="evenodd" />
      <path ref={rimRef} fill="none" stroke="#EF233C" strokeWidth="1.5" strokeLinejoin="miter" opacity="0" />
    </svg>
  );
};
