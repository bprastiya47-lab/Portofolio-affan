import React, { useEffect, useId, useRef } from 'react';

/** Posisi gambar Belial di dalam kotak figur, dalam persen terhadap kotak figur (1061x1889). */
export interface BelialLayout {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

export interface MorphOrigin {
  x: number;
  y: number;
}

export interface BoxPx {
  w: number;
  h: number;
}

interface BackEffectsProps {
  progress: number;
  reducedMotion: boolean;
}

/**
 * Lapisan di BELAKANG figur: cahaya inti merah bara dan kabut energi gelap
 * (feTurbulence + feDisplacementMap) yang bergolak di sekitar siluet.
 */
export const BelialBackEffects: React.FC<BackEffectsProps> = ({ progress, reducedMotion }) => {
  const uid = useId().replace(/:/g, '');
  const fogFilterId = `belial-fog-${uid}`;

  if (progress <= 0.01) return null;

  const opacity = Math.min(1, progress * 1.15);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      style={{ opacity }}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: '50%',
          top: '52%',
          width: `${70 + progress * 50}%`,
          height: `${40 + progress * 22}%`,
          background:
            'radial-gradient(circle, rgba(239, 35, 60, 0.38) 0%, rgba(120, 8, 22, 0.24) 45%, transparent 74%)',
          filter: 'blur(20px)',
        }}
      />

      <svg
        viewBox="0 0 100 178"
        className="absolute -inset-x-[40%] -inset-y-[6%] w-[180%] h-[112%] overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={fogFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.026 0.055"
              numOctaves="3"
              seed="11"
              result="noise"
            >
              {!reducedMotion && (
                <animate
                  attributeName="baseFrequency"
                  dur="5.2s"
                  values="0.024 0.050;0.038 0.078;0.024 0.050"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={4 + progress * 9}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="0.9" />
          </filter>
          <radialGradient id={`${fogFilterId}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2A0510" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#12030A" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#080507" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Kabut energi gelap bertepi merah di belakang tubuh */}
        <g filter={`url(#${fogFilterId})`}>
          <ellipse
            cx="50"
            cy="104"
            rx={26 + progress * 20}
            ry={60 + progress * 10}
            fill={`url(#${fogFilterId}-core)`}
          />
          <ellipse
            cx="50"
            cy="132"
            rx={34 + progress * 20}
            ry="18"
            fill="#EF233C"
            fillOpacity="0.2"
          />
          <ellipse cx="50" cy="64" rx={18 + progress * 12} ry="26" fill="#EF233C" fillOpacity="0.1" />
        </g>
      </svg>
    </div>
  );
};

interface MorphStageProps {
  progress: number;
  origin: MorphOrigin;
  boxPx: BoxPx;
  humanUrl: string;
  humanAlt: string;
  belialUrl: string;
  layout: BelialLayout | null;
  reducedMotion: boolean;
}

/**
 * Spring Morph: sosok manusia (figure-cutout) meluruh dari titik kursor,
 * wujud penuh Belial (berial2-removebg-preview) muncul lewat radial mask
 * yang sama, dengan cincin kejut crimson dan distorsi energi di tepi sapuan.
 */
export const BelialMorphStage: React.FC<MorphStageProps> = ({
  progress,
  origin,
  boxPx,
  humanUrl,
  humanAlt,
  belialUrl,
  layout,
  reducedMotion,
}) => {
  const uid = useId().replace(/:/g, '');
  const warpFilterId = `belial-warp-${uid}`;

  const W = Math.max(1, boxPx.w);
  const H = Math.max(1, boxPx.h);
  const mx = W * 0.9;
  const my = H * 0.25;
  const ox = mx + origin.x * W;
  const oy = my + origin.y * H;

  const morphing = progress > 0.003 && progress < 0.997;
  const full = progress >= 0.997;

  const maxR = Math.hypot(W * 1.9, H * 1.3);
  const feather = Math.max(40, W * 0.16);
  const radius = progress * (maxR + feather) - feather;
  const inner = Math.max(0, radius);
  const outer = Math.max(inner + 1, radius + feather);

  const humanMask = morphing
    ? `radial-gradient(circle at ${ox.toFixed(1)}px ${oy.toFixed(1)}px, transparent ${inner.toFixed(1)}px, #000 ${outer.toFixed(1)}px)`
    : undefined;
  const belialMask = morphing
    ? `radial-gradient(circle at ${ox.toFixed(1)}px ${oy.toFixed(1)}px, #000 ${inner.toFixed(1)}px, transparent ${outer.toFixed(1)}px)`
    : undefined;

  const ringCenter = radius + feather * 0.5;
  const ringVisible = morphing && ringCenter > 2;
  const ringStrength = Math.pow(Math.sin(Math.PI * Math.min(1, progress)), 0.55);
  const ringBackground = ringVisible
    ? `radial-gradient(circle at ${ox.toFixed(1)}px ${oy.toFixed(1)}px, transparent ${Math.max(
        0,
        ringCenter - 26
      ).toFixed(1)}px, rgba(120, 9, 24, 0.75) ${Math.max(0, ringCenter - 10).toFixed(
        1
      )}px, rgba(255, 90, 110, 0.98) ${ringCenter.toFixed(1)}px, rgba(239, 35, 60, 0.6) ${(
        ringCenter + 10
      ).toFixed(1)}px, transparent ${(ringCenter + 30).toFixed(1)}px)`
    : undefined;

  const flashStrength = Math.max(0, 1 - Math.abs(progress - 0.3) / 0.24);
  const flashRadius = Math.max(60, W * 0.7);

  const warpScale = !reducedMotion && morphing ? 44 * Math.sin(Math.PI * progress) : 0;
  const useWarp = warpScale > 0.8;

  const wrapperStyle: React.CSSProperties = {
    left: -mx,
    top: -my,
    width: W + mx * 2,
    height: H + my * 2,
  };

  const innerStyle: React.CSSProperties = {
    left: mx,
    top: my,
    width: W,
    height: H,
  };

  return (
    <>
      {/* Filter distorsi energi untuk tepi sapuan */}
      <svg aria-hidden="true" width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id={warpFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.03"
              numOctaves="2"
              seed="5"
              result="warpNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="warpNoise"
              scale={warpScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* LAPISAN MANUSIA: meluruh dari titik kursor */}
      {!full && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            ...wrapperStyle,
            maskImage: humanMask,
            WebkitMaskImage: humanMask,
          }}
        >
          <div className="absolute" style={innerStyle}>
            <img
              src={humanUrl}
              alt={humanAlt}
              draggable={false}
              className="w-full h-full object-contain select-none"
              style={{
                filter:
                  progress > 0.01
                    ? `brightness(${(1 - progress * 0.35).toFixed(2)}) saturate(${(1 - progress * 0.4).toFixed(2)})`
                    : undefined,
              }}
            />
          </div>
        </div>
      )}

      {/* LAPISAN BELIAL: muncul di dalam lingkaran sapuan, rim-light crimson */}
      {progress > 0.003 && layout && (
        <div
          className="absolute z-[32] pointer-events-none"
          style={{
            ...wrapperStyle,
            maskImage: belialMask,
            WebkitMaskImage: belialMask,
          }}
        >
          <div className="absolute" style={innerStyle}>
            <div
              className="absolute"
              style={{
                left: `${layout.leftPct}%`,
                top: `${layout.topPct}%`,
                width: `${layout.widthPct}%`,
                height: `${layout.heightPct}%`,
                filter: useWarp ? `url(#${warpFilterId})` : undefined,
              }}
            >
              <img
                src={belialUrl}
                alt="Wujud Belial, Dark Galactic Emperor"
                draggable={false}
                className="w-full h-full object-contain select-none"
                style={{
                  filter:
                    'drop-shadow(0 0 5px rgba(239, 35, 60, 0.85)) drop-shadow(0 0 22px rgba(239, 35, 60, 0.45)) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.8))',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CINCIN KEJUT CRIMSON + KILATAN di titik asal sapuan */}
      {ringVisible && (
        <div
          className="absolute z-[34] pointer-events-none"
          style={{
            ...wrapperStyle,
            background: ringBackground,
            opacity: ringStrength,
            mixBlendMode: 'screen',
          }}
        />
      )}
      {morphing && flashStrength > 0.01 && (
        <div
          className="absolute z-[34] pointer-events-none"
          style={{
            ...wrapperStyle,
            background: `radial-gradient(circle ${flashRadius.toFixed(0)}px at ${ox.toFixed(1)}px ${oy.toFixed(
              1
            )}px, rgba(255, 90, 110, 0.85) 0%, rgba(239, 35, 60, 0.38) 38%, transparent 100%)`,
            opacity: flashStrength * 0.8,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </>
  );
};

/**
 * Retakan energi merah di trotoar sekitar kaki saat wujud Belial aktif
 */
export const BelialCityCracks: React.FC<{ progress: number }> = ({ progress }) => {
  if (progress <= 0.05) return null;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 240 60"
      className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[18%] z-[18]"
      style={{ opacity: Math.min(1, progress * 1.1) }}
    >
      <defs>
        <radialGradient id="crackFloorGlow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#EF233C" stopOpacity="0.45" />
          <stop offset="65%" stopColor="#7A0918" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#080507" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="36" rx="98" ry="20" fill="url(#crackFloorGlow)" />
      <g fill="none" stroke="#FF5A6E" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 120 34 L 94 38 L 76 46 L 52 49" strokeWidth="1.2" opacity="0.88" />
        <path d="M 120 34 L 148 37 L 172 45 L 196 48" strokeWidth="1.2" opacity="0.88" />
        <path d="M 118 35 L 105 49 L 92 56" strokeWidth="0.95" opacity="0.72" />
        <path d="M 124 35 L 138 48 L 154 55" strokeWidth="0.95" opacity="0.72" />
        <path d="M 94 38 L 84 31 L 68 29" strokeWidth="0.8" opacity="0.6" />
        <path d="M 148 37 L 160 30 L 178 28" strokeWidth="0.8" opacity="0.6" />
      </g>
    </svg>
  );
};

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

/**
 * Kanvas 2D partikel bara api yang naik dari lantai di sekitar kaki figur,
 * plus kilat energi merah-hitam (maksimum 120 partikel).
 * Berhenti otomatis ketika fase bukan hero, tab tersembunyi, atau reducedMotion aktif.
 */
export const BelialEmberCanvas: React.FC<{
  active: boolean;
  progress: number;
  tabVisible: boolean;
  reducedMotion: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
}> = ({ active, progress, tabVisible, reducedMotion, anchorRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const wakeLoopRef = useRef<(() => void) | null>(null);
  progressRef.current = progress;

  useEffect(() => {
    if (progress > 0.01) {
      wakeLoopRef.current?.();
    }
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

    // Area figur dalam piksel kanvas (kanvas menutupi seluruh viewport)
    const readAnchor = () => {
      const el = anchorRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { left: r.left, top: r.top, w: r.width, h: r.height };
        }
      }
      return { left: width * 0.3, top: height * 0.1, w: width * 0.4, h: height * 0.8 };
    };
    let anchor = readAnchor();

    const particles: EmberParticle[] = [];
    const MAX_PARTICLES = 120;
    let rafId = 0;
    let boltCooldown = 0;
    let frameCount = 0;

    const spawnEmber = (pScale: number) => {
      if (particles.length >= MAX_PARTICLES) return;
      const palette = ['#EF233C', '#FF5A6E', '#FDBA74'];
      // Bara naik dari lantai/trotoar tepat di sekitar kaki
      const footY = anchor.top + anchor.h * (0.93 + Math.random() * 0.06);
      particles.push({
        x: anchor.left + anchor.w * (0.5 + (Math.random() - 0.5) * 1.0),
        y: footY,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(0.9 + Math.random() * 2.2 * (0.5 + pScale)),
        size: 1.2 + Math.random() * 2.4,
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0.004 + Math.random() * 0.008,
        hue: palette[Math.floor(Math.random() * palette.length)],
      });
    };

    const drawLightningArc = (pScale: number) => {
      const startX = anchor.left + anchor.w * (0.1 + Math.random() * 0.8);
      const startY = anchor.top + anchor.h * (0.5 + Math.random() * 0.4);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX;
      let cy = startY;
      const segments = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < segments; i++) {
        cx += (Math.random() - 0.5) * 34;
        cy -= 12 + Math.random() * 22;
        ctx.lineTo(cx, cy);
      }
      ctx.strokeStyle = `rgba(255, 90, 110, ${(0.42 * pScale).toFixed(2)})`;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#EF233C';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.strokeStyle = `rgba(8, 8, 12, ${(0.65 * pScale).toFixed(2)})`;
      ctx.lineWidth = 0.7;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    };

    const tick = () => {
      const p = progressRef.current;
      ctx.clearRect(0, 0, width, height);

      frameCount++;
      if (frameCount % 20 === 0) anchor = readAnchor();

      if (p > 0.06) {
        const spawnCount = Math.min(4, Math.ceil(p * 3));
        for (let i = 0; i < spawnCount; i++) {
          if (Math.random() < 0.72) spawnEmber(p);
        }

        boltCooldown--;
        if (p > 0.45 && boltCooldown <= 0 && Math.random() < 0.14) {
          drawLightningArc(p);
          boltCooldown = 14 + Math.floor(Math.random() * 18);
        }
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

      if (p > 0.01 || particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const ensureRunning = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };
    wakeLoopRef.current = ensureRunning;

    if (progressRef.current > 0.01) {
      ensureRunning();
    }

    const onResize = () => {
      resize();
      anchor = readAnchor();
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(canvas);

    return () => {
      wakeLoopRef.current = null;
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [active, tabVisible, reducedMotion, anchorRef]);

  if (!active || reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full z-40"
    />
  );
};
