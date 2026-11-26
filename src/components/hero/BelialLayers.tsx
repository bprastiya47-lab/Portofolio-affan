import React, { useEffect, useId, useRef } from 'react';
import {
  AlphaBounds,
  BELIAL_EYES,
  BELIAL_IMAGE_ASPECT,
  BELIAL_ORB,
} from './heroAnchors';

/* ------------------------------------------------------------------ */
/* Tata letak                                                          */
/* ------------------------------------------------------------------ */

export interface BoxSize {
  w: number;
  h: number;
}

export interface BelialPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  feetY: number;
  centerX: number;
}

/** Belial berdiri sedikit lebih tinggi dari tubuh sosok asli */
const BELIAL_HEIGHT_RATIO = 1.04;

/** Kaki Belial menapak di garis sepatu sosok asli; tengah tubuh keduanya sejajar. */
export function computeBelialPlacement(
  box: BoxSize,
  human: AlphaBounds,
  belial: AlphaBounds
): BelialPlacement {
  const humanBodyH = (human.maxY - human.minY) * box.h;
  const feetY = human.maxY * box.h;
  const centerX = ((human.minX + human.maxX) / 2) * box.w;

  const belialBodyNorm = Math.max(0.2, belial.maxY - belial.minY);
  const height = (humanBodyH * BELIAL_HEIGHT_RATIO) / belialBodyNorm;
  const width = height * BELIAL_IMAGE_ASPECT;
  const belialCenterX = (belial.minX + belial.maxX) / 2;

  return {
    left: centerX - width * belialCenterX,
    top: feetY - height * belial.maxY,
    width,
    height,
    feetY,
    centerX,
  };
}

/** Jarak dari titik asal ke sudut terjauh gabungan kotak figur dan gambar Belial */
function maxRevealRadius(
  origin: { x: number; y: number },
  box: BoxSize,
  p: BelialPlacement
): number {
  const pts: Array<[number, number]> = [
    [0, 0],
    [box.w, 0],
    [0, box.h],
    [box.w, box.h],
    [p.left, p.top],
    [p.left + p.width, p.top],
    [p.left, p.top + p.height],
    [p.left + p.width, p.top + p.height],
  ];
  let max = 0;
  for (const [x, y] of pts) max = Math.max(max, Math.hypot(x - origin.x, y - origin.y));
  return max;
}

/* ------------------------------------------------------------------ */
/* Lensa transformasi                                                  */
/* ------------------------------------------------------------------ */

interface BelialMorphStageProps {
  progress: number;
  /** Pusat lensa (piksel di kotak figur); mengikuti kursor saat hover */
  origin: { x: number; y: number };
  box: BoxSize;
  placement: BelialPlacement;
  humanUrl: string;
  humanAlt: string;
  belialUrl: string;
  reducedMotion: boolean;
}

/**
 * Sosok manusia dan Belial saling melarutkan lewat satu radial mask yang bergerak mengikuti kursor.
 * Tepi lensa hanya menyala di atas tubuh (dimask ke alpha cutout), bukan lingkaran melayang di latar,
 * dan bagian tepinya diguncang gelombang panas (feTurbulence) selama transformasi.
 */
export const BelialMorphStage: React.FC<BelialMorphStageProps> = ({
  progress,
  origin,
  box,
  placement,
  humanUrl,
  humanAlt,
  belialUrl,
  reducedMotion,
}) => {
  const uid = useId().replace(/:/g, '');
  const warpId = `belial-warp-${uid}`;

  const feather = Math.max(34, box.h * 0.075);
  const full = maxRevealRadius(origin, box, placement) + feather;
  // Radius dasar kecil agar lensa langsung terlihat di bawah kursor saat hover baru dimulai
  const radius = progress <= 0.002 ? 0 : box.h * 0.05 + progress * (full - box.h * 0.05);
  const inner = Math.max(0, radius - feather);

  const ox = origin.x.toFixed(1);
  const oy = origin.y.toFixed(1);

  const humanMask = `radial-gradient(circle at ${ox}px ${oy}px, transparent ${inner.toFixed(1)}px, #000 ${radius.toFixed(1)}px)`;
  const belialMask = `radial-gradient(circle at ${(origin.x - placement.left).toFixed(1)}px ${(
    origin.y - placement.top
  ).toFixed(1)}px, #000 ${inner.toFixed(1)}px, transparent ${radius.toFixed(1)}px)`;

  const bell = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
  const warping = !reducedMotion && progress > 0.01 && progress < 0.985;
  const warpScale = bell * box.h * 0.035;
  const edgeStrength = Math.pow(bell, 0.55);

  // Tepi lensa: amber (warna mata Belial) di garis terluar, merah di dalamnya
  const edgeGradient = `radial-gradient(circle at ${ox}px ${oy}px,
    transparent ${Math.max(0, radius - 40).toFixed(1)}px,
    rgba(217, 4, 41, 0.55) ${Math.max(0, radius - 12).toFixed(1)}px,
    rgba(255, 176, 32, 0.95) ${radius.toFixed(1)}px,
    rgba(239, 35, 60, 0) ${(radius + 14).toFixed(1)}px)`;

  const settled = Math.pow(Math.max(0, (progress - 0.85) / 0.15), 2);
  const eyeX = placement.left + placement.width * BELIAL_EYES.x;
  const eyeY = placement.top + placement.height * BELIAL_EYES.y;
  const orbX = placement.left + placement.width * BELIAL_ORB.x;
  const orbY = placement.top + placement.height * BELIAL_ORB.y;
  const glowSize = placement.width * 0.34;

  return (
    <>
      {warping && (
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
          <defs>
            <filter id={warpId} x="-40%" y="-20%" width="180%" height="140%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="11" result="n">
                <animate
                  attributeName="baseFrequency"
                  dur="1s"
                  values="0.012 0.02;0.018 0.028;0.012 0.02"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={warpScale.toFixed(1)} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="absolute inset-0 z-30 pointer-events-none"
        style={{ filter: warping ? `url(#${warpId})` : undefined }}
      >
        {progress > 0.004 && (
          <img
            src={belialUrl}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
              left: `${placement.left.toFixed(1)}px`,
              top: `${placement.top.toFixed(1)}px`,
              width: `${placement.width.toFixed(1)}px`,
              height: `${placement.height.toFixed(1)}px`,
              maskImage: belialMask,
              WebkitMaskImage: belialMask,
              filter:
                'drop-shadow(0 0 1.5px rgba(255, 150, 90, 0.85)) drop-shadow(0 0 20px rgba(217, 4, 41, 0.5)) drop-shadow(0 10px 26px rgba(0, 0, 0, 0.9))',
            }}
          />
        )}

        <img
          src={humanUrl}
          alt={humanAlt}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain select-none"
          style={{
            maskImage: humanMask,
            WebkitMaskImage: humanMask,
            filter:
              progress > 0.01
                ? `brightness(${(1 - progress * 0.32).toFixed(2)}) saturate(${(1 + progress * 0.4).toFixed(2)})`
                : undefined,
          }}
        />

        {/* Mata amber dan batu dada ungu: baru menyala setelah wujud selesai */}
        {settled > 0.01 && (
          <>
            <div
              className={reducedMotion ? '' : 'belial-eye-pulse'}
              style={{
                position: 'absolute',
                left: `${(eyeX - glowSize / 2).toFixed(1)}px`,
                top: `${(eyeY - glowSize / 2).toFixed(1)}px`,
                width: `${glowSize.toFixed(1)}px`,
                height: `${glowSize.toFixed(1)}px`,
                background: 'radial-gradient(circle, rgba(255, 176, 32, 0.55) 0%, rgba(255, 120, 20, 0.18) 40%, transparent 70%)',
                mixBlendMode: 'screen',
                opacity: settled,
              }}
            />
            <div
              className={reducedMotion ? '' : 'belial-orb-pulse'}
              style={{
                position: 'absolute',
                left: `${(orbX - glowSize * 0.4).toFixed(1)}px`,
                top: `${(orbY - glowSize * 0.4).toFixed(1)}px`,
                width: `${(glowSize * 0.8).toFixed(1)}px`,
                height: `${(glowSize * 0.8).toFixed(1)}px`,
                background: 'radial-gradient(circle, rgba(181, 92, 255, 0.6) 0%, rgba(120, 40, 200, 0.2) 45%, transparent 70%)',
                mixBlendMode: 'screen',
                opacity: settled,
              }}
            />
          </>
        )}
      </div>

      {/* Tepi lensa hanya menyala di atas tubuh sosok */}
      {progress > 0.004 && progress < 0.99 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[36]"
          style={{
            backgroundImage: edgeGradient,
            opacity: edgeStrength,
            maskImage: `url("${humanUrl}")`,
            WebkitMaskImage: `url("${humanUrl}")`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            mixBlendMode: 'screen',
          }}
        />
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Kabut energi di belakang Belial                                      */
/* ------------------------------------------------------------------ */

export const BelialAura: React.FC<{
  progress: number;
  placement: BelialPlacement;
  reducedMotion: boolean;
}> = ({ progress, placement, reducedMotion }) => {
  const uid = useId().replace(/:/g, '');
  const fogId = `belial-fog-${uid}`;
  if (progress <= 0.01) return null;

  const { left, top, width, height } = placement;
  const cx = left + width / 2;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      style={{ opacity: Math.min(1, progress * 1.1) }}
    >
      {!reducedMotion && (
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <filter id={fogId} x="-40%" y="-30%" width="180%" height="160%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="3" seed="7" result="fn">
                <animate attributeName="baseFrequency" dur="8s" values="0.008 0.014;0.012 0.02;0.008 0.014" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="fn" scale={(24 + progress * 50).toFixed(1)} xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="absolute"
        style={{
          left: `${(cx - width * 0.9).toFixed(1)}px`,
          top: `${(top + height * 0.02).toFixed(1)}px`,
          width: `${(width * 1.8).toFixed(1)}px`,
          height: `${height.toFixed(1)}px`,
          filter: reducedMotion ? undefined : `url(#${fogId})`,
          background: [
            'radial-gradient(ellipse 30% 30% at 30% 40%, rgba(7, 4, 8, 0.95) 0%, transparent 100%)',
            'radial-gradient(ellipse 30% 32% at 70% 44%, rgba(7, 4, 8, 0.95) 0%, transparent 100%)',
            'radial-gradient(ellipse 42% 26% at 50% 72%, rgba(80, 6, 18, 0.9) 0%, transparent 100%)',
            'radial-gradient(ellipse 34% 24% at 50% 16%, rgba(120, 10, 26, 0.65) 0%, transparent 100%)',
          ].join(', '),
        }}
      />

      {/* Genangan cahaya merah di bawah kaki */}
      <div
        className="absolute rounded-full"
        style={{
          left: `${(cx - width * 0.6).toFixed(1)}px`,
          top: `${(placement.feetY - height * 0.04).toFixed(1)}px`,
          width: `${(width * 1.2).toFixed(1)}px`,
          height: `${(height * 0.08).toFixed(1)}px`,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(217, 4, 41, 0.6) 0%, rgba(120, 8, 22, 0.25) 50%, transparent 76%)',
          filter: 'blur(6px)',
        }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Bara api yang naik dari trotoar                                      */
/* ------------------------------------------------------------------ */

export interface EmberZone {
  cx: number;
  halfWidth: number;
  floorY: number;
  bodyHeight: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  hue: string;
}

export const BelialEmberCanvas: React.FC<{
  active: boolean;
  progress: number;
  tabVisible: boolean;
  reducedMotion: boolean;
  zone: EmberZone | null;
}> = ({ active, progress, tabVisible, reducedMotion, zone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const zoneRef = useRef<EmberZone | null>(zone);
  const wakeRef = useRef<(() => void) | null>(null);
  progressRef.current = progress;
  zoneRef.current = zone;

  useEffect(() => {
    if (progress > 0.01) wakeRef.current?.();
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active || !tabVisible || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: EmberParticle[] = [];
    const MAX = 110;
    let raf = 0;

    const zoneNow = (): EmberZone =>
      zoneRef.current ?? { cx: width * 0.7, halfWidth: width * 0.14, floorY: height * 0.92, bodyHeight: height * 0.7 };

    const spawn = (pScale: number) => {
      if (particles.length >= MAX) return;
      const z = zoneNow();
      const palette = ['#EF233C', '#FF7A3D', '#FFB020'];
      particles.push({
        x: z.cx + (Math.random() - 0.5) * z.halfWidth * 2.2,
        y: z.floorY - Math.random() * z.bodyHeight * 0.08,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(0.8 + Math.random() * 2.0 * (0.5 + pScale)),
        size: 1 + Math.random() * 2.2,
        alpha: 0.55 + Math.random() * 0.45,
        decay: 0.006 + Math.random() * 0.011,
        hue: palette[Math.floor(Math.random() * palette.length)],
      });
    };

    const tick = () => {
      const p = progressRef.current;
      ctx.clearRect(0, 0, width, height);

      if (p > 0.06) {
        const n = Math.min(4, Math.ceil(p * 3));
        for (let i = 0; i < n; i++) if (Math.random() < 0.7) spawn(p);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx + Math.sin(pt.y * 0.03) * 0.25;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0.02 || pt.y < -12) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, pt.alpha * Math.max(0.25, p));
        ctx.fillStyle = pt.hue;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = p > 0.01 || particles.length > 0 ? window.requestAnimationFrame(tick) : 0;
    };

    wakeRef.current = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    if (progressRef.current > 0.01) wakeRef.current();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(canvas);

    return () => {
      wakeRef.current = null;
      if (raf) window.cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [active, tabVisible, reducedMotion]);

  if (!active || reducedMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full z-40"
    />
  );
};
