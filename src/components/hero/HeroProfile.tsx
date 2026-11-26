import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import { IconInstagram, IconNext, IconTransform } from '../ui/CockpitIcons';
import { SplitFlapHero } from '../ui/SplitFlapHero';
import {
  BelialBackEffects,
  BelialCityCracks,
  BelialEmberCanvas,
  BelialLayout,
  BelialMorphStage,
  BoxPx,
  MorphOrigin,
} from './BelialLayers';
import { HERO_ASSETS, OWNER_IDENTITY } from './heroAnchors';

// Rasio kanvas figur asli (foto 1061x1889)
const FIG_W = 1061;
const FIG_H = 1889;
// Tinggi Belial relatif terhadap tinggi sosok asli (kaki sejajar trotoar)
const BELIAL_HEIGHT_RATIO = 1.04;
const DEFAULT_ORIGIN: MorphOrigin = { x: 0.5, y: 0.4 };

interface HeroProfileProps {
  active: boolean;
  tabVisible: boolean;
  reducedMotion: boolean;
  warp?: 'idle' | 'out' | 'in';
  onEnterGallery: () => void;
  onBelialStateChange: (state: {
    progress: number;
    belialMood: boolean;
    overSilhouette: boolean;
  }) => void;
}

interface AlphaBitmapCache {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

interface AlphaBounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface BelialMap {
  leftU: number;
  topU: number;
  scale: number;
  cache: AlphaBitmapCache;
}

function loadAlphaCache(url: string): Promise<AlphaBitmapCache | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        resolve(null);
        return;
      }
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth;
      offscreen.height = img.naturalHeight;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        resolve({ width: offscreen.width, height: offscreen.height, data: imgData.data });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function alphaBounds(cache: AlphaBitmapCache, threshold = 24): AlphaBounds | null {
  let x0 = cache.width;
  let y0 = cache.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < cache.height; y++) {
    const row = y * cache.width;
    for (let x = 0; x < cache.width; x++) {
      if (cache.data[(row + x) * 4 + 3] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || y1 < 0) return null;
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}

const CITY_BOKEH_LIGHTS = [
  { x: '11%', y: '44%', size: 12, delay: '0s' },
  { x: '18%', y: '51%', size: 16, delay: '0.2s' },
  { x: '27%', y: '47%', size: 10, delay: '0.4s' },
  { x: '36%', y: '53%', size: 14, delay: '0.1s' },
  { x: '45%', y: '46%', size: 11, delay: '0.35s' },
  { x: '82%', y: '48%', size: 14, delay: '0.25s' },
  { x: '91%', y: '43%', size: 11, delay: '0.5s' },
] as const;

export const HeroProfile: React.FC<HeroProfileProps> = ({
  active,
  tabVisible,
  reducedMotion,
  warp = 'idle',
  onEnterGallery,
  onBelialStateChange,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const figureBoxRef = useRef<HTMLDivElement>(null);
  const alphaCacheRef = useRef<AlphaBitmapCache | null>(null);
  const belialMapRef = useRef<BelialMap | null>(null);
  const hoveredRef = useRef(false);

  const [hoveredSilhouette, setHoveredSilhouette] = useState(false);
  const [lockedBelial, setLockedBelial] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<MorphOrigin>(DEFAULT_ORIGIN);
  const [boxPx, setBoxPx] = useState<BoxPx>({ w: 0, h: 0 });
  const [belialLayout, setBelialLayout] = useState<BelialLayout | null>(null);

  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const prevMoodRef = useRef(false);

  const targetProgress = hoveredSilhouette || lockedBelial ? 1 : 0;

  // Muat alpha channel cutout sosok & gambar Belial ke kanvas offscreen sekali saja,
  // lalu hitung penempatan Belial agar kakinya sejajar dengan kaki sosok asli
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadAlphaCache(HERO_ASSETS.figureCutoutUrl),
      loadAlphaCache(HERO_ASSETS.belialFormUrl),
    ]).then(([human, belial]) => {
      if (cancelled) return;
      alphaCacheRef.current = human;
      if (!human || !belial) return;

      const fb = alphaBounds(human);
      const bb = alphaBounds(belial);
      if (!fb || !bb) return;

      const figHeightU = ((fb.y1 - fb.y0) / human.height) * FIG_H;
      const scale = (BELIAL_HEIGHT_RATIO * figHeightU) / (bb.y1 - bb.y0);
      const feetXU = (((fb.x0 + fb.x1) / 2) / human.width) * FIG_W;
      const feetYU = (fb.y1 / human.height) * FIG_H;
      const leftU = feetXU - ((bb.x0 + bb.x1) / 2) * scale;
      const topU = feetYU - bb.y1 * scale;

      belialMapRef.current = { leftU, topU, scale, cache: belial };
      setBelialLayout({
        leftPct: (leftU / FIG_W) * 100,
        topPct: (topU / FIG_H) * 100,
        widthPct: ((belial.width * scale) / FIG_W) * 100,
        heightPct: ((belial.height * scale) / FIG_H) * 100,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Ukur kotak figur agar radial mask morph memakai piksel yang tepat
  useEffect(() => {
    if (!active) return;
    const box = figureBoxRef.current;
    if (!box) return;
    const measure = () => {
      setBoxPx({ w: box.offsetWidth, h: box.offsetHeight });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(box);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [active]);

  // Reset saat keluar dari fase hero
  useEffect(() => {
    if (!active) {
      hoveredRef.current = false;
      setHoveredSilhouette(false);
      setLockedBelial(false);
      setOrigin(DEFAULT_ORIGIN);
      setProgress(0);
      progressRef.current = 0;
      velocityRef.current = 0;
      prevMoodRef.current = false;
      onBelialStateChange({ progress: 0, belialMood: false, overSilhouette: false });
    }
  }, [active, onBelialStateChange]);

  // Animasi pegas progress (0 -> 1 ~650ms masuk, 1 -> 0 ~500ms keluar)
  useEffect(() => {
    if (!active) return;

    if (reducedMotion) {
      progressRef.current = targetProgress;
      velocityRef.current = 0;
      setProgress(targetProgress);
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const current = progressRef.current;
      const stiffness = targetProgress > current ? 64 : 80; // ~650ms naik, ~500ms turun
      const damping = targetProgress > current ? 14.8 : 16.8;

      const force = (targetProgress - current) * stiffness;
      velocityRef.current = (velocityRef.current + force * dt) * Math.exp(-damping * dt);
      let next = current + velocityRef.current * dt;
      next = Math.max(0, Math.min(1, next));

      progressRef.current = next;
      setProgress(next);

      if (Math.abs(targetProgress - next) > 0.004 || Math.abs(velocityRef.current) > 0.004) {
        rafId = window.requestAnimationFrame(step);
      } else {
        progressRef.current = targetProgress;
        velocityRef.current = 0;
        setProgress(targetProgress);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [active, targetProgress, reducedMotion]);

  // Sinkronkan audio, tema mood, dan kursor ketika progress melintasi 0.5
  useEffect(() => {
    if (!active) return;
    const belialMood = progress > 0.5;
    if (belialMood && !prevMoodRef.current) {
      audioEngine.playBelialTransformUp();
    } else if (!belialMood && prevMoodRef.current) {
      audioEngine.playBelialTransformDown();
    }
    prevMoodRef.current = belialMood;

    audioEngine.setHeroBelialProgress(progress);
    onBelialStateChange({
      progress,
      belialMood,
      overSilhouette: hoveredSilhouette,
    });
  }, [active, progress, hoveredSilhouette, onBelialStateChange]);

  // Hit-test piksel terhadap kanal alpha siluet (bukan kotak bounding box).
  // Saat wujud Belial sudah muncul, silhouette Belial ikut dihitung agar tidak berkedip kembali.
  const hitTestSilhouette = useCallback(
    (clientX: number, clientY: number): { hit: boolean; nx: number; ny: number } => {
      const box = figureBoxRef.current;
      if (!box) return { hit: false, nx: 0.5, ny: 0.5 };
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return { hit: false, nx: 0.5, ny: 0.5 };

      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;

      const cache = alphaCacheRef.current;
      if (cache && nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        const px = Math.min(cache.width - 1, Math.max(0, Math.floor(nx * cache.width)));
        const py = Math.min(cache.height - 1, Math.max(0, Math.floor(ny * cache.height)));
        if (cache.data[(py * cache.width + px) * 4 + 3] > 24) {
          return { hit: true, nx, ny };
        }
      }

      const bm = belialMapRef.current;
      if (bm && progressRef.current > 0.5) {
        const bx = Math.floor((nx * FIG_W - bm.leftU) / bm.scale);
        const by = Math.floor((ny * FIG_H - bm.topU) / bm.scale);
        if (bx >= 0 && by >= 0 && bx < bm.cache.width && by < bm.cache.height) {
          if (bm.cache.data[(by * bm.cache.width + bx) * 4 + 3] > 24) {
            return { hit: true, nx: Math.min(1, Math.max(0, nx)), ny: Math.min(1, Math.max(0, ny)) };
          }
        }
      }

      return { hit: false, nx, ny };
    },
    []
  );

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;

    // Parallax ringan desktop (maks 12px latar, 6px figur)
    if (!reducedMotion && e.pointerType !== 'touch') {
      const normX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const normY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      setParallax({ x: normX, y: normY });
    }

    if (e.pointerType === 'touch') return;
    const { hit, nx, ny } = hitTestSilhouette(e.clientX, e.clientY);
    if (hit && !hoveredRef.current && progressRef.current < 0.05) {
      // Titik kursor saat menyentuh sosok menjadi pusat sapuan energi
      setOrigin({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
    }
    hoveredRef.current = hit;
    setHoveredSilhouette(hit);
  };

  const handleStagePointerLeave = () => {
    hoveredRef.current = false;
    setHoveredSilhouette(false);
    setParallax({ x: 0, y: 0 });
  };

  const handleFigureTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    const { hit, nx, ny } = hitTestSilhouette(e.clientX, e.clientY);
    if (hit) {
      if (!lockedBelial) {
        setOrigin({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
      }
      setLockedBelial((prev) => !prev);
    }
  };

  // Dukungan giroskop opsional di perangkat seluler jika tersedia & diizinkan tanpa memaksa prompt
  useEffect(() => {
    if (!active || reducedMotion || typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) return;
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    // Jangan memicu prompt izin otomatis jika Safari iOS mewajibkan requestPermission dari klik eksplisit
    if (typeof DOE?.requestPermission === 'function') return;

    const onOrient = (ev: DeviceOrientationEvent) => {
      if (ev.gamma === null || ev.beta === null) return;
      const gx = Math.max(-1, Math.min(1, ev.gamma / 28));
      const gy = Math.max(-1, Math.min(1, (ev.beta - 45) / 28));
      setParallax({ x: gx, y: gy });
    };

    window.addEventListener('deviceorientation', onOrient, { passive: true });
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [active, reducedMotion]);

  if (!active) return null;

  const belialMood = progress > 0.5;
  const warpOut = warp === 'out';
  const bgTx = reducedMotion ? 0 : -parallax.x * 12;
  const bgTy = reducedMotion ? 0 : -parallax.y * 8;
  const titleTx = reducedMotion ? 0 : -parallax.x * 8;
  const titleTy = reducedMotion ? 0 : -parallax.y * 5;
  const figTx = reducedMotion ? 0 : -parallax.x * 6;
  const figTy = reducedMotion ? 0 : -parallax.y * 4;

  const warpEase = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
  const bgWarp = warpOut ? ' scale(1.16)' : '';
  const titleWarp = warpOut ? ' scale(1.55)' : '';
  const figWarp = warpOut ? ' translateY(4%) scale(1.42)' : '';

  const instructionDesktop =
    'Arahkan kursor ke sosok untuk memanggil wujud Belial • Gulir ke bawah untuk masuk galeri';
  const instructionMobile =
    'Ketuk sosok atau Ubah Wujud untuk memanggil Belial • Geser ke atas untuk masuk galeri';

  return (
    <section
      ref={stageRef}
      aria-label="Profil Fotografer Dikut Affan Aryansyah"
      onPointerMove={handleStagePointerMove}
      onPointerLeave={handleStagePointerLeave}
      onPointerDown={handleFigureTap}
      className={`fixed inset-0 z-20 overflow-hidden bg-[#080507] select-none ${
        warp === 'in' ? 'hero-warp-in' : ''
      }`}
      style={{
        opacity: warpOut ? 0 : 1,
        transition: warpOut ? `opacity 620ms ${warpEase}` : undefined,
      }}
    >
      {/* LAPISAN 1: Suasana malam kota & perpanjangan landscape yang mulus (parallax maks 12px) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-4 will-change-transform"
        style={{
          transform: `translate3d(${bgTx.toFixed(1)}px, ${bgTy.toFixed(1)}px, 0)${bgWarp}`,
          transition: warpOut
            ? `transform 620ms ${warpEase}`
            : 'transform 150ms cubic-bezier(0, 0, 0.2, 1)',
        }}
      >
        {/* Langit malam kota + semburat merah senja yang menguat saat Belial bangkit */}
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{
            background: belialMood
              ? 'radial-gradient(circle at 68% 45%, rgba(128, 12, 26, 0.46) 0%, rgba(16, 7, 13, 0.94) 55%, #080507 100%)'
              : 'radial-gradient(circle at 68% 45%, rgba(74, 14, 26, 0.3) 0%, rgba(14, 7, 11, 0.96) 58%, #080507 100%)',
          }}
        />

        {/* Foto asli 1061x1889 (jika disediakan di src/assets/hero/photo-original.jpg) dengan tepi feathered */}
        {HERO_ASSETS.photoOriginalUrl && (
          <div className="absolute inset-0 flex justify-center md:justify-end md:pr-[6%] lg:pr-[9%] items-end">
            <img
              src={HERO_ASSETS.photoOriginalUrl}
              alt=""
              className="h-[calc(100vh-44px)] w-auto max-w-none object-cover opacity-85"
              style={{
                maskImage:
                  'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)',
                filter:
                  progress > 0.02
                    ? `brightness(${(1 - progress * 0.34).toFixed(2)}) contrast(${(1 + progress * 0.14).toFixed(2)}) saturate(${(1 + progress * 0.1).toFixed(2)})`
                    : undefined,
              }}
            />
          </div>
        )}

        {/* Lampu kota bokeh prosedural (berkedip merah saat transformasi) */}
        <div className="absolute inset-0">
          {CITY_BOKEH_LIGHTS.map((light, idx) => {
            const flickerColor =
              progress > 0.35 ? 'rgba(239, 35, 60, 0.85)' : 'rgba(251, 191, 36, 0.55)';
            return (
              <span
                key={idx}
                className="absolute rounded-full"
                style={{
                  left: light.x,
                  top: light.y,
                  width: `${light.size}px`,
                  height: `${light.size}px`,
                  background: `radial-gradient(circle, ${flickerColor} 0%, transparent 72%)`,
                  opacity: 0.38 + progress * 0.45,
                  filter: 'blur(2px)',
                }}
              />
            );
          })}
        </div>

        {/* Garis cakrawala jembatan / parapet & garis kuning trotoar malam */}
        <div
          className="absolute inset-x-0 bottom-[16%] h-px"
          style={{
            background:
              progress > 0.4
                ? 'linear-gradient(to right, transparent, rgba(239,35,60,0.45), transparent)'
                : 'linear-gradient(to right, transparent, rgba(168,150,155,0.22), transparent)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-[9%] h-[2px] opacity-35"
          style={{
            background:
              progress > 0.4
                ? 'linear-gradient(to right, transparent 10%, rgba(239,35,60,0.5) 55%, transparent 92%)'
                : 'linear-gradient(to right, transparent 10%, rgba(250,204,21,0.35) 55%, transparent 92%)',
          }}
        />
      </div>

      {/* LAPISAN 2: Judul Besar di BELAKANG figur (z-15 < figur z-30) */}
      <div
        className="pointer-events-none fixed inset-x-0 top-[74px] sm:top-[82px] md:top-1/2 md:-translate-y-[66%] z-[15] flex justify-center md:justify-start md:pl-[7%] lg:pl-[9%] px-4 text-center md:text-left will-change-transform"
        style={{
          transform: `translate3d(${titleTx.toFixed(1)}px, ${titleTy.toFixed(1)}px, 0)${titleWarp}`,
          transformOrigin: '30% 50%',
          transition: warpOut ? `transform 620ms ${warpEase}` : undefined,
        }}
      >
        <SplitFlapHero
          mode="hero"
          reducedMotion={reducedMotion}
          titleText={belialMood ? 'BELIAL' : 'FANZ FIGHTERS'}
          subtitleText={
            belialMood
              ? 'DARK GALACTIC EMPEROR · @fanzfighters_pict'
              : OWNER_IDENTITY.fullName
          }
          belialMood={belialMood}
        />
      </div>

      {/* Panggung Figur (Aspek rasio terkunci 1061x1889 agar seluruh jangkar & efek presisi) */}
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center md:justify-end md:pr-[6%] lg:pr-[10%]">
        <div
          ref={figureBoxRef}
          className="relative aspect-[1061/1889] h-[78dvh] sm:h-[84dvh] md:h-[calc(100vh-52px)] max-h-[960px] will-change-transform"
          style={{
            transform: `translate3d(${figTx.toFixed(1)}px, ${figTy.toFixed(1)}px, 0)${figWarp}`,
            transformOrigin: '50% 80%',
            transition: warpOut ? `transform 620ms ${warpEase}` : undefined,
          }}
        >
          {/* Retakan energi merah di trotoar sekitar kaki */}
          <BelialCityCracks progress={progress} />

          {/* LAPISAN 3: Aura merah & kabut energi gelap di BELAKANG sosok */}
          <BelialBackEffects progress={progress} reducedMotion={reducedMotion} />

          {/* LAPISAN 4-5: Spring Morph manusia -> Belial dengan Cursor Energy Reveal */}
          <BelialMorphStage
            progress={progress}
            origin={origin}
            boxPx={boxPx}
            humanUrl={HERO_ASSETS.figureCutoutUrl}
            humanAlt="Sosok pemilik situs dari belakang berdiri di trotoar malam hari"
            belialUrl={HERO_ASSETS.belialFormUrl}
            layout={belialLayout}
            reducedMotion={reducedMotion}
          />
        </div>
      </div>

      {/* LAPISAN 6: Kanvas 2D partikel bara api yang naik dari lantai & kilat energi */}
      <BelialEmberCanvas
        active={active}
        progress={progress}
        tabVisible={tabVisible}
        reducedMotion={reducedMotion}
        anchorRef={figureBoxRef}
      />

      {/* Scrim bawah agar CTA & teks tetap kontras >= 4.5:1 di atas foto pada layar ponsel */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[260px] md:h-[220px] z-[42] bg-gradient-to-t from-[#080507] via-[#080507]/75 to-transparent"
      />

      {/* LAPISAN 7: Identitas, tombol Masuk Galeri, Ubah Wujud aksesibel, & 2 tautan Instagram flight-strip */}
      <div className="fixed inset-x-0 bottom-[78px] sm:bottom-[88px] md:bottom-[98px] z-50 px-4 sm:px-6 md:px-10 lg:pl-[9%] flex flex-col items-center md:items-start gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playTabClick();
              onEnterGallery();
            }}
            className={`min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] font-mono text-xs font-semibold tracking-[0.1em] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              belialMood
                ? 'bg-[#EF233C] hover:bg-[#FF5A6E] text-[#F6EEF0]'
                : 'bg-[#EF233C] hover:bg-[#FF5A6E] text-[#080507]'
            }`}
          >
            <span>Masuk Galeri</span>
            <IconNext className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            aria-pressed={lockedBelial || hoveredSilhouette}
            onClick={() => {
              audioEngine.playTabClick();
              if (!lockedBelial) setOrigin(DEFAULT_ORIGIN);
              setLockedBelial((prev) => !prev);
            }}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 bg-[#120A0D] border rounded-[4px] font-mono text-xs tracking-[0.1em] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
              belialMood || lockedBelial
                ? 'border-[#EF233C] text-[#FF5A6E] hover:bg-[#EF233C]/15'
                : 'border-[#2B1218] text-[#F6EEF0] hover:border-[#EF233C] hover:text-[#EF233C]'
            }`}
          >
            <IconTransform className="w-4 h-4 shrink-0" />
            <span>{belialMood ? 'Wujud Normal' : 'Ubah Wujud'}</span>
          </button>
        </div>

        {/* Tautan Instagram Aviation & Rail bergaya flight-strip ATC */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center md:justify-start gap-2">
          <a
            href={OWNER_IDENTITY.aviationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] font-mono text-xs tracking-[0.08em] text-[#F6EEF0] hover:text-[#EF233C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          >
            <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
            <span>AVIATION {OWNER_IDENTITY.aviationHandle}</span>
          </a>

          <a
            href={OWNER_IDENTITY.railUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] font-mono text-xs tracking-[0.08em] text-[#F6EEF0] hover:text-[#EF233C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          >
            <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
            <span>RAIL {OWNER_IDENTITY.railHandle}</span>
          </a>
        </div>

        <p className="font-mono text-xs tracking-[0.1em] text-[#A8969B] uppercase text-center md:text-left max-w-[min(620px,92vw)]">
          <span className="hidden md:inline">{instructionDesktop}</span>
          <span className="md:hidden">{instructionMobile}</span>
        </p>
        <p
          aria-hidden="true"
          className="md:hidden font-mono text-xs tracking-[0.16em] text-[#EF233C] uppercase"
        >
          SCROLL DOWN // ENTER ARCHIVE
        </p>
      </div>

      {/* Indikator scroll bergaya instrumen kokpit */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 bottom-[34px] right-10 hidden md:flex flex-col items-end gap-1.5 whitespace-nowrap"
      >
        <span className="font-mono text-xs tracking-[0.16em] text-[#F6EEF0] uppercase tabular-nums">
          SCROLL DOWN // ENTER ARCHIVE
        </span>
        <span className="relative block w-px h-10 bg-[#2B1218] overflow-hidden">
          <span
            className={`absolute left-0 top-0 w-px h-4 bg-[#EF233C] ${
              reducedMotion ? '' : 'hero-scroll-tick'
            }`}
          />
        </span>
      </div>
    </section>
  );
};
