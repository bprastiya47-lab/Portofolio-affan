import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HERO_PATHS, SILHOUETTE_ALIGNMENT } from './heroAnchors';
import { audioEngine } from '../../audio/audioEngine';

interface TransformPortraitProps {
  primarySrc?: string;
  alt: string;
  reducedMotion: boolean;
  onUseOnce?: () => void;
  onShake?: () => void;
  showHint?: boolean;
  className?: string;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export const TransformPortrait: React.FC<TransformPortraitProps> = ({
  primarySrc = HERO_PATHS.personBack,
  alt,
  reducedMotion,
  onUseOnce,
  onShake,
  showHint = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const maskLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imgSrc, setImgSrc] = useState(primarySrc);
  const [transformed, setTransformed] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Refs animasi halus (rAF + CSS variables tanpa re-render React saat menggerakkan kursor)
  const hoverRef = useRef(false);
  const transformedRef = useRef(false);
  const targetPosRef = useRef({ x: 180, y: 240 });
  const currentPosRef = useRef({ x: 180, y: 240 });
  const targetRadiusRef = useRef(0);
  const currentRadiusRef = useRef(0);
  const rafRef = useRef(0);
  const holdTimerRef = useRef(0);
  const holdTriggeredRef = useRef(false);

  useEffect(() => {
    setImgSrc(primarySrc);
  }, [primarySrc]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    }
  }, []);

  const triggerFullTransform = useCallback(
    (nextState: boolean) => {
      transformedRef.current = nextState;
      setTransformed(nextState);

      if (!hintDismissed) {
        setHintDismissed(true);
        onUseOnce?.();
      }

      if (nextState) {
        audioEngine.playTransformBurst();
        if (!reducedMotion) {
          setFlashActive(true);
          window.setTimeout(() => setFlashActive(false), 260);
          onShake?.();
        }
        const rect = containerRef.current?.getBoundingClientRect();
        targetRadiusRef.current = rect ? Math.max(rect.width, rect.height) * 1.45 : 950;
      } else {
        audioEngine.playTransformRevert();
        targetRadiusRef.current = hoverRef.current ? 92 : 0;
      }
    },
    [hintDismissed, onShake, onUseOnce, reducedMotion]
  );

  // Loop rAF untuk lerp posisi dan radius lingkaran CSS mask-image
  useEffect(() => {
    const startLoop = () => {
      const tick = () => {
        const maskEl = maskLayerRef.current;
        if (maskEl) {
          const lerpPos = reducedMotion ? 1 : 0.2;
          const lerpRad = reducedMotion ? 1 : transformedRef.current ? 0.16 : 0.14;

          currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * lerpPos;
          currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * lerpPos;
          currentRadiusRef.current += (targetRadiusRef.current - currentRadiusRef.current) * lerpRad;

          maskEl.style.setProperty('--lens-x', `${currentPosRef.current.x.toFixed(1)}px`);
          maskEl.style.setProperty('--lens-y', `${currentPosRef.current.y.toFixed(1)}px`);
          maskEl.style.setProperty('--lens-r', `${Math.max(0, currentRadiusRef.current).toFixed(1)}px`);
        }
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
    };

    startLoop();
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  // Partikel percikan cahaya ungu (#A855F7) dan kuning (#FFD23F) saat transformasi penuh
  useEffect(() => {
    if (!transformed || reducedMotion) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const particles: SparkParticle[] = [];

    const resize = () => {
      const r = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width));
      canvas.height = Math.max(1, Math.floor(r.height));
    };
    resize();

    const spawnBurst = (count: number) => {
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < count; i++) {
        const isYellow = Math.random() > 0.55;
        particles.push({
          x: w * (0.28 + Math.random() * 0.44),
          y: h * (0.22 + Math.random() * 0.68),
          vx: (Math.random() - 0.5) * 0.75,
          vy: -(0.7 + Math.random() * 1.9),
          size: 1.6 + Math.random() * 2.8,
          life: 0,
          maxLife: 45 + Math.random() * 50,
          color: isYellow ? '255, 210, 63' : '168, 85, 247',
        });
      }
    };

    spawnBurst(24);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (particles.length < 28 && Math.random() < 0.35) {
        spawnBurst(1);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx + Math.sin(p.life * 0.08) * 0.25;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const alpha = Math.sin(progress * Math.PI) * 0.92;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.color}, ${alpha.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = window.requestAnimationFrame(draw);
    };
    animId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [transformed, reducedMotion]);

  const updatePointerTarget = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    targetPosRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    hoverRef.current = true;
    updatePointerTarget(e.clientX, e.clientY);
    currentPosRef.current = { ...targetPosRef.current };
    if (!transformedRef.current) {
      targetRadiusRef.current = 92;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    hoverRef.current = true;
    updatePointerTarget(e.clientX, e.clientY);
    if (!transformedRef.current) {
      targetRadiusRef.current = 92;
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    hoverRef.current = false;
    if (!transformedRef.current) {
      targetRadiusRef.current = 0;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePointerTarget(e.clientX, e.clientY);
    currentPosRef.current = { ...targetPosRef.current };
    holdTriggeredRef.current = false;

    if (e.pointerType === 'touch') {
      // Di HP: tap-tahan 600ms atau ketuk saat sudah berubah untuk kembali normal
      if (transformedRef.current) {
        triggerFullTransform(false);
        holdTriggeredRef.current = true;
        return;
      }
      holdTimerRef.current = window.setTimeout(() => {
        holdTriggeredRef.current = true;
        triggerFullTransform(true);
      }, 600);
    } else {
      // Desktop: klik atau tahan memicu transformasi penuh / kembali normal
      holdTimerRef.current = window.setTimeout(() => {
        if (!transformedRef.current) {
          holdTriggeredRef.current = true;
          triggerFullTransform(true);
        }
      }, 280);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
    if (e.pointerType !== 'touch' && !holdTriggeredRef.current) {
      triggerFullTransform(!transformedRef.current);
    }
  };

  const handlePointerCancel = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = 0;
    }
  };

  // Penyelarasan posisi transform.png tepat di atas siluet badan person-back.png
  const transformWidthPct =
    ((SILHOUETTE_ALIGNMENT.humanHeightRatio * SILHOUETTE_ALIGNMENT.transformAspect) /
      SILHOUETTE_ALIGNMENT.humanCanvasAspect) *
    100;
  const transformLeftPct =
    (SILHOUETTE_ALIGNMENT.humanCenterX -
      SILHOUETTE_ALIGNMENT.transformCenterX * (transformWidthPct / 100)) *
    100;
  const transformTopPct = SILHOUETTE_ALIGNMENT.humanTopY * 100;
  const transformHeightPct = SILHOUETTE_ALIGNMENT.humanHeightRatio * 100;

  return (
    <div className={`relative aspect-[374/667] select-none ${className}`}>
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-pressed={transformed}
        aria-label={transformed ? 'Kembali ke wujud manusia' : 'Aktifkan wujud transformasi'}
        data-cursor="interactive"
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFullTransform(!transformedRef.current);
          }
        }}
        className="relative w-full h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA] rounded-sm"
      >
        {/* Lapisan 1 (Bawah): Foto asli manusia */}
        <img
          src={imgSrc}
          alt={alt}
          draggable={false}
          onError={() => {
            if (imgSrc !== HERO_PATHS.personBack) {
              setImgSrc(HERO_PATHS.personBack);
            }
          }}
          className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
            transformed ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Lapisan 2 (Atas): Sosok transform.png dengan CSS radial mask mengikuti kursor */}
        <div
          ref={maskLayerRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={
            {
              '--lens-x': '50%',
              '--lens-y': '40%',
              '--lens-r': '0px',
              maskImage:
                'radial-gradient(circle var(--lens-r) at var(--lens-x) var(--lens-y), #000 58%, rgba(0,0,0,0.45) 80%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(circle var(--lens-r) at var(--lens-x) var(--lens-y), #000 58%, rgba(0,0,0,0.45) 80%, transparent 100%)',
            } as React.CSSProperties
          }
        >
          <div
            className="relative"
            style={{
              position: 'absolute',
              left: `${transformLeftPct.toFixed(2)}%`,
              top: `${transformTopPct.toFixed(2)}%`,
              width: `${transformWidthPct.toFixed(2)}%`,
              height: `${transformHeightPct.toFixed(2)}%`,
            }}
          >
            <img
              src={HERO_PATHS.transform}
              alt=""
              draggable={false}
              className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]"
            />

            {/* Cahaya mata kuning menyala (#FFD23F) & inti dada ungu berdenyut (#A855F7) saat transformasi penuh */}
            {transformed && (
              <>
                <span
                  className="transform-eye-glow absolute rounded-full pointer-events-none"
                  style={{
                    left: `${SILHOUETTE_ALIGNMENT.eyeCenter.x * 100}%`,
                    top: `${SILHOUETTE_ALIGNMENT.eyeCenter.y * 100}%`,
                    width: '34%',
                    height: '12%',
                    background:
                      'radial-gradient(ellipse at center, rgba(255, 210, 63, 0.72) 0%, rgba(255, 210, 63, 0.16) 55%, transparent 78%)',
                    filter: 'blur(6px)',
                    mixBlendMode: 'screen',
                  }}
                />
                <span
                  className="transform-core-pulse absolute rounded-full pointer-events-none"
                  style={{
                    left: `${SILHOUETTE_ALIGNMENT.chestCore.x * 100}%`,
                    top: `${SILHOUETTE_ALIGNMENT.chestCore.y * 100}%`,
                    width: '26%',
                    height: '16%',
                    background:
                      'radial-gradient(circle at center, rgba(168, 85, 247, 0.92) 0%, rgba(168, 85, 247, 0.35) 50%, transparent 78%)',
                    filter: 'blur(7px)',
                    mixBlendMode: 'screen',
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* Kanvas partikel percikan ungu-kuning */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full z-20"
        />

        {/* Kilat putih singkat saat transformasi penuh dipicu */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-8 z-30 rounded-full transition-opacity duration-200 ${
            flashActive ? 'opacity-85' : 'opacity-0'
          }`}
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.95) 0%, rgba(168,85,247,0.4) 45%, transparent 75%)',
          }}
        />
      </div>

      {/* Hint kecil di bawah foto — hilang setelah digunakan sekali */}
      {showHint && !hintDismissed && (
        <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-xs font-medium tracking-wide text-[#F5F7FF]/85 bg-[#0A0F1F]/75 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#F5F7FF]/12 pointer-events-none whitespace-nowrap">
          {isTouchDevice ? 'Tahan untuk berubah' : 'Arahkan kursor ke saya'}
        </p>
      )}
    </div>
  );
};
