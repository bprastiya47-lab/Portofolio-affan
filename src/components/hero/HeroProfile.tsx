import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';
import belialFormImg from '../../assets/hero/berial2-removebg-preview.png';
import { IconInstagram, IconNext, IconTransform } from '../ui/CockpitIcons';
import {
  BelialAura,
  BelialEmberCanvas,
  BelialMorphStage,
  BoxSize,
  EmberZone,
  computeBelialPlacement,
} from './BelialLayers';
import {
  AlphaBounds,
  BELIAL_FALLBACK_BOUNDS,
  HERO_ANCHORS,
  HERO_ASSETS,
  HUMAN_FALLBACK_BOUNDS,
  OWNER_IDENTITY,
} from './heroAnchors';

interface HeroProfileProps {
  active: boolean;
  tabVisible: boolean;
  reducedMotion: boolean;
  /** 'return': datang dari galeri, mulai dari posisi tergulir penuh lalu mundur ke awal */
  entry: 'fresh' | 'return';
  /** Naik 1 setiap ada permintaan masuk galeri dari luar (tab Galeri di dock) */
  enterSignal: number;
  /** True saat modal atau indeks terbuka: gulir dan papan ketik diabaikan */
  inputLocked: boolean;
  onEnterGallery: () => void;
  onBelialStateChange: (state: {
    progress: number;
    belialMood: boolean;
    overSilhouette: boolean;
  }) => void;
}

interface AlphaCache {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  bounds: AlphaBounds | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Memuat gambar, menyimpan kanal alpha (maks 640px) untuk hit-test, dan mengukur kotak tubuhnya */
function loadAlphaCache(url: string): Promise<AlphaCache | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return resolve(null);
      const scale = Math.min(1, 640 / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      try {
        ctx.drawImage(img, 0, 0, cw, ch);
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let minX = cw;
        let maxX = -1;
        let minY = ch;
        let maxY = -1;
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            if (data[(y * cw + x) * 4 + 3] > 24) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        resolve({
          width: cw,
          height: ch,
          data,
          bounds:
            maxX < 0
              ? null
              : { minX: minX / cw, maxX: (maxX + 1) / cw, minY: minY / ch, maxY: (maxY + 1) / ch },
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function alphaAt(cache: AlphaCache | null, u: number, v: number): boolean {
  if (!cache || u < 0 || u > 1 || v < 0 || v > 1) return false;
  const px = Math.min(cache.width - 1, Math.floor(u * cache.width));
  const py = Math.min(cache.height - 1, Math.floor(v * cache.height));
  return cache.data[(py * cache.width + px) * 4 + 3] > 24;
}

/* ------------------------------------------------------------------ */
/* Lapisan depan: tiang dan kawat listrik atas (LAA) jalur kereta       */
/* ------------------------------------------------------------------ */

const MastLattice: React.FC<{ className: string }> = ({ className }) => (
  <svg aria-hidden="true" viewBox="0 0 40 900" preserveAspectRatio="none" className={className}>
    <g fill="none" stroke="#040205" strokeLinejoin="round">
      <path d="M 7 0 L 7 900 M 33 0 L 33 900" strokeWidth="5" />
      <path
        d="M 7 20 L 33 70 L 7 120 L 33 170 L 7 220 L 33 270 L 7 320 L 33 370 L 7 420 L 33 470 L 7 520 L 33 570 L 7 620 L 33 670 L 7 720 L 33 770 L 7 820 L 33 870"
        strokeWidth="2.4"
      />
    </g>
    <path d="M 7 0 L 7 900" fill="none" stroke="rgba(239,35,60,0.28)" strokeWidth="1" />
  </svg>
);

/**
 * Dua tiang kisi di tepi layar dan kawat pembawa + kawat kontak yang melengkung di antaranya.
 * Hanya menempati pita tipis di bagian atas agar judul dan sosok tetap bersih.
 */
const ForegroundRig: React.FC = () => {
  const droppers: string[] = [];
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    const x = 60 + t * 1480;
    const sag = 4 * t * (1 - t);
    const y1 = 84 + sag * 86;
    droppers.push(`M ${x.toFixed(1)} ${y1.toFixed(1)} L ${x.toFixed(1)} ${(y1 + 20 + sag * 6).toFixed(1)}`);
  }
  return (
    <>
      <MastLattice className="absolute left-[1.2%] top-0 h-full w-8 md:w-10" />
      <MastLattice className="absolute right-[1.2%] top-0 h-full w-8 md:w-10" />
      <svg
        aria-hidden="true"
        viewBox="0 0 1600 300"
        preserveAspectRatio="none"
        className="absolute left-0 top-0 w-full h-[26%]"
      >
        <g fill="none" stroke="#040205" strokeLinecap="round">
          <path d="M 18 78 L 150 78 M 1450 78 L 1582 78" strokeWidth="6" />
          <path d="M 60 78 L 60 98 M 110 78 L 110 98 M 1490 78 L 1490 98 M 1540 78 L 1540 98" strokeWidth="4" />
          <path d="M 60 84 Q 800 170 1540 84" strokeWidth="3.2" />
          <path d="M 60 104 Q 800 194 1540 104" strokeWidth="2.4" />
          <path d={droppers.join(' ')} strokeWidth="1.4" />
        </g>
        <path d="M 60 82 Q 800 168 1540 82" fill="none" stroke="rgba(239,35,60,0.3)" strokeWidth="1" />
      </svg>
    </>
  );
};

/* ------------------------------------------------------------------ */

const CITY_LIGHTS = [
  { x: '9%', y: '47%', size: 14, delay: 0 },
  { x: '16%', y: '53%', size: 10, delay: 1 },
  { x: '23%', y: '49%', size: 18, delay: 2 },
  { x: '33%', y: '55%', size: 11, delay: 3 },
  { x: '44%', y: '50%', size: 13, delay: 4 },
  { x: '56%', y: '52%', size: 9, delay: 5 },
  { x: '86%', y: '51%', size: 14, delay: 6 },
] as const;

export const HeroProfile: React.FC<HeroProfileProps> = ({
  active,
  tabVisible,
  reducedMotion,
  entry,
  enterSignal,
  inputLocked,
  onEnterGallery,
  onBelialStateChange,
}) => {
  const figureBoxRef = useRef<HTMLDivElement>(null);
  const humanCacheRef = useRef<AlphaCache | null>(null);
  const belialCacheRef = useRef<AlphaCache | null>(null);

  const [box, setBox] = useState<BoxSize>({ w: 0, h: 0 });
  const [emberZone, setEmberZone] = useState<EmberZone | null>(null);
  const [humanBounds, setHumanBounds] = useState<AlphaBounds>(HUMAN_FALLBACK_BOUNDS);
  const [belialBounds, setBelialBounds] = useState<AlphaBounds>(BELIAL_FALLBACK_BOUNDS);

  const [hovering, setHovering] = useState(false);
  const [locked, setLocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);

  // --- refs untuk loop animasi (hindari closure basi)
  const progressRef = useRef(0);
  const velocityRef = useRef(0);
  const prevMoodRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const lensRef = useRef<{ x: number; y: number } | null>(null);
  const targetProgressRef = useRef(0);
  const progressRafRef = useRef(0);

  const scrollRef = useRef(0);
  const scrollTargetRef = useRef(0);
  const scrollRafRef = useRef(0);
  const committedRef = useRef(false);
  const lastInputRef = useRef(0);
  const snapTimerRef = useRef(0);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const targetProgress = hovering || locked ? 1 : 0;
  targetProgressRef.current = targetProgress;

  /* ---- memuat alpha sosok & Belial sekali ---- */
  useEffect(() => {
    let cancelled = false;
    void loadAlphaCache(HERO_ASSETS.figureCutoutUrl).then((c) => {
      if (cancelled || !c) return;
      humanCacheRef.current = c;
      if (c.bounds) setHumanBounds(c.bounds);
    });
    void loadAlphaCache(belialFormImg).then((c) => {
      if (cancelled || !c) return;
      belialCacheRef.current = c;
      if (c.bounds) setBelialBounds(c.bounds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- ukuran kotak figur & zona bara api ---- */
  useEffect(() => {
    if (!active) return;
    const el = figureBoxRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      setBox({ w: r.width, h: r.height });
      setEmberZone({
        cx: r.left + r.width / 2,
        halfWidth: r.width * 0.3,
        floorY: r.bottom - r.height * 0.05,
        bodyHeight: r.height * 0.8,
      });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [active]);

  /* ---- reset saat hero tidak aktif ---- */
  useEffect(() => {
    if (!active) {
      setHovering(false);
      setLocked(false);
      setProgress(0);
      setLens(null);
      progressRef.current = 0;
      velocityRef.current = 0;
      prevMoodRef.current = false;
      pointerRef.current = null;
      lensRef.current = null;
      committedRef.current = false;
      onBelialStateChange({ progress: 0, belialMood: false, overSilhouette: false });
    }
  }, [active, onBelialStateChange]);

  /* ---- loop spring transformasi (lensa mengikuti kursor) ---- */
  const kickProgress = useCallback(() => {
    if (progressRafRef.current || !active) return;
    let last = performance.now();

    const step = (now: number) => {
      progressRafRef.current = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const target = targetProgressRef.current;
      const current = progressRef.current;

      if (reducedMotion) {
        progressRef.current = target;
        velocityRef.current = 0;
      } else {
        const rising = target > current;
        const stiffness = rising ? 26 : 62;
        const damping = rising ? 10.5 : 15.2;
        const force = (target - current) * stiffness;
        velocityRef.current = (velocityRef.current + force * dt) * Math.exp(-damping * dt);
        progressRef.current = clamp01(current + velocityRef.current * dt);
      }
      setProgress(progressRef.current);

      // Lensa menyusul kursor dengan sedikit kelembaman
      let lensMoving = false;
      const ptr = pointerRef.current;
      if (ptr) {
        const cur = lensRef.current ?? ptr;
        const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 13);
        const nx = cur.x + (ptr.x - cur.x) * k;
        const ny = cur.y + (ptr.y - cur.y) * k;
        lensRef.current = { x: nx, y: ny };
        setLens(lensRef.current);
        lensMoving = Math.hypot(ptr.x - nx, ptr.y - ny) > 0.6;
      }

      const settled =
        Math.abs(target - progressRef.current) < 0.004 && Math.abs(velocityRef.current) < 0.004;
      if (!settled || (lensMoving && progressRef.current < 0.995)) {
        progressRafRef.current = window.requestAnimationFrame(step);
      } else {
        progressRef.current = target;
        velocityRef.current = 0;
        setProgress(target);
      }
    };
    progressRafRef.current = window.requestAnimationFrame(step);
  }, [active, reducedMotion]);

  useEffect(() => {
    if (active) kickProgress();
    return () => {
      if (progressRafRef.current) {
        window.cancelAnimationFrame(progressRafRef.current);
        progressRafRef.current = 0;
      }
    };
  }, [active, targetProgress, kickProgress]);

  /* ---- audio & status mood ---- */
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
    onBelialStateChange({ progress, belialMood, overSilhouette: hovering });
  }, [active, progress, hovering, onBelialStateChange]);

  /* ---- gulir: virtual scroll yang mengikuti gerakan (scrub) ---- */
  const kickScroll = useCallback(() => {
    if (scrollRafRef.current || !active) return;
    let last = performance.now();

    const step = (now: number) => {
      scrollRafRef.current = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const target = scrollTargetRef.current;
      const cur = scrollRef.current;
      const next = reducedMotion ? target : cur + (target - cur) * (1 - Math.exp(-dt * 7.5));
      scrollRef.current = Math.abs(target - next) < 0.0008 ? target : next;
      setScroll(scrollRef.current);

      if (scrollRef.current >= 0.996 && target >= 1 && !committedRef.current) {
        committedRef.current = true;
        onEnterGallery();
        return;
      }
      if (scrollRef.current !== target) {
        scrollRafRef.current = window.requestAnimationFrame(step);
      }
    };
    scrollRafRef.current = window.requestAnimationFrame(step);
  }, [active, reducedMotion, onEnterGallery]);

  const kickScrollRef = useRef(kickScroll);
  kickScrollRef.current = kickScroll;

  const armSnap = useCallback(() => {
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => {
      const t = scrollTargetRef.current;
      if (t > 0 && t < 1) {
        scrollTargetRef.current = t > 0.3 ? 1 : 0;
        kickScroll();
      }
    }, 520);
  }, [kickScroll]);

  const goTo = useCallback(
    (value: 0 | 1) => {
      scrollTargetRef.current = value;
      kickScroll();
    },
    [kickScroll]
  );

  // Inisialisasi tiap kali hero aktif
  useEffect(() => {
    if (!active) {
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      return;
    }
    committedRef.current = false;
    const start = entry === 'return' && !reducedMotion ? 1 : 0;
    scrollRef.current = start;
    scrollTargetRef.current = 0;
    setScroll(start);
    kickScrollRef.current();
  }, [active, entry, reducedMotion]);

  // Permintaan masuk galeri dari dock
  const lastSignalRef = useRef(enterSignal);
  useEffect(() => {
    if (enterSignal === lastSignalRef.current) return;
    lastSignalRef.current = enterSignal;
    if (!active || committedRef.current) return;
    if (reducedMotion) {
      committedRef.current = true;
      onEnterGallery();
      return;
    }
    goTo(1);
  }, [enterSignal, active, reducedMotion, goTo, onEnterGallery]);

  useEffect(() => {
    if (!active || inputLocked) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || committedRef.current) return;
      const next = clamp01(scrollTargetRef.current + e.deltaY / (window.innerHeight * 0.85));
      scrollTargetRef.current = next;
      lastInputRef.current = performance.now();
      kickScroll();
      armSnap();
    };

    let startY: number | null = null;
    let startTarget = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? null;
      startTarget = scrollTargetRef.current;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY === null || committedRef.current) return;
      const y = e.touches[0]?.clientY ?? startY;
      scrollTargetRef.current = clamp01(startTarget + (startY - y) / (window.innerHeight * 0.7));
      kickScroll();
    };
    const onTouchEnd = () => {
      startY = null;
      armSnap();
    };

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End') goTo(1);
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') goTo(0);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [active, inputLocked, kickScroll, armSnap, goTo]);

  /* ---- hit-test: sosok asli atau (saat sudah berubah) tubuh Belial ---- */
  const placement = computeBelialPlacement(box, humanBounds, belialBounds);

  const hitTest = useCallback(
    (clientX: number, clientY: number) => {
      const el = figureBoxRef.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return null;
      const x = clientX - r.left;
      const y = clientY - r.top;
      const onHuman = alphaAt(humanCacheRef.current, x / r.width, y / r.height);
      let onBelial = false;
      if (progressRef.current > 0.3) {
        const pl = computeBelialPlacement({ w: r.width, h: r.height }, humanBounds, belialBounds);
        onBelial = alphaAt(belialCacheRef.current, (x - pl.left) / pl.width, (y - pl.top) / pl.height);
      }
      return { hit: onHuman || onBelial, x, y };
    },
    [humanBounds, belialBounds]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!active) return;
    if (!reducedMotion && e.pointerType !== 'touch' && scrollRef.current < 0.05) {
      setParallax({
        x: (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
        y: (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
      });
    }
    if (e.pointerType === 'touch' || inputLocked) return;
    const res = hitTest(e.clientX, e.clientY);
    const hit = Boolean(res?.hit);
    if (hit && res) {
      pointerRef.current = { x: res.x, y: res.y };
      if (!lensRef.current) lensRef.current = { x: res.x, y: res.y };
    }
    if (hit !== hovering) setHovering(hit);
    kickProgress();
  };

  const handlePointerLeave = () => {
    setHovering(false);
    setParallax({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const down = downRef.current;
    downRef.current = null;
    if (e.pointerType !== 'touch' || !down || inputLocked) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return;
    const res = hitTest(e.clientX, e.clientY);
    if (res?.hit) {
      pointerRef.current = { x: res.x, y: res.y };
      lensRef.current = { x: res.x, y: res.y };
      setLocked((prev) => !prev);
      kickProgress();
    }
  };

  const toggleLockFromButton = () => {
    audioEngine.playTabClick();
    const b = humanBounds;
    const origin = {
      x: ((b.minX + b.maxX) / 2) * box.w,
      y: (b.minY + (b.maxY - b.minY) * HERO_ANCHORS.chest.y) * box.h,
    };
    pointerRef.current = origin;
    lensRef.current = origin;
    setLens(origin);
    setLocked((prev) => !prev);
    kickProgress();
  };

  if (!active) return null;

  /* ---- turunan visual ---- */
  const belialMood = progress > 0.5;
  const s = scroll;
  const px = reducedMotion ? 0 : parallax.x;
  const py = reducedMotion ? 0 : parallax.y;

  const lensOrigin = lens ?? {
    x: ((humanBounds.minX + humanBounds.maxX) / 2) * box.w,
    y: (humanBounds.minY + (humanBounds.maxY - humanBounds.minY) * HERO_ANCHORS.chest.y) * box.h,
  };

  const bgStyle: React.CSSProperties = {
    transform: `translate3d(${(-px * 10).toFixed(1)}px, ${(-py * 6 - s * 30).toFixed(1)}px, 0) scale(${(1 + s * 0.16).toFixed(3)})`,
    filter: `brightness(${(1 - s * 0.55).toFixed(2)})`,
  };
  const titleStyle: React.CSSProperties = {
    transform: `translate3d(${(-px * 7).toFixed(1)}px, ${(-py * 4 - s * 22).toFixed(2)}vh, 0) scale(${(1 + s * 0.5).toFixed(3)})`,
    opacity: 1 - smooth(0.4, 0.82, s),
  };
  const figureStyle: React.CSSProperties = {
    transform: `translate3d(${(-px * 5).toFixed(1)}px, ${(-py * 3 + s * 6).toFixed(2)}vh, 0) scale(${(1 + s * 0.55).toFixed(3)})`,
    transformOrigin: '50% 100%',
    opacity: 1 - smooth(0.68, 0.98, s),
  };
  const uiStyle: React.CSSProperties = {
    opacity: 1 - smooth(0, 0.22, s),
    transform: `translate3d(0, ${(s * 28).toFixed(1)}px, 0)`,
    pointerEvents: s > 0.08 ? 'none' : undefined,
  };
  const rigStyle: React.CSSProperties = {
    transform: `translate3d(${(px * 6).toFixed(1)}px, 0, 0) scale(${(1 + s * 1.5).toFixed(3)})`,
    transformOrigin: '50% 0%',
    opacity: 1 - smooth(0.55, 0.9, s),
  };

  const titleNormalOpacity = 1 - smooth(0.32, 0.6, progress);
  const titleBelialOpacity = smooth(0.42, 0.72, progress);

  return (
    <section
      aria-label="Profil fotografer Dikut Affan Aryansyah"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="fixed inset-0 z-20 overflow-hidden bg-[#07060A] select-none"
    >
      {/* Lapisan 1: malam kota dan semburat senja yang berubah merah saat Belial bangkit */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 will-change-transform"
        style={bgStyle}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 55% at 72% 44%, rgba(96, 16, 36, 0.42) 0%, rgba(14, 8, 16, 0.96) 62%, #07060A 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: progress,
            background:
              'radial-gradient(ellipse 62% 58% at 72% 46%, rgba(160, 14, 36, 0.5) 0%, rgba(40, 6, 14, 0.7) 55%, transparent 100%)',
          }}
        />

        {HERO_ASSETS.photoOriginalUrl && (
          <div className="absolute inset-0 flex justify-center md:justify-end md:pr-[6%] lg:pr-[10%] items-end">
            <img
              src={HERO_ASSETS.photoOriginalUrl}
              alt=""
              className="h-[calc(100vh-44px)] w-auto max-w-none object-cover opacity-80"
              style={{
                maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
                filter: `brightness(${(1 - progress * 0.3).toFixed(2)}) saturate(${(1 - progress * 0.25).toFixed(2)})`,
              }}
            />
          </div>
        )}

        {/* Bokeh lampu kota: kuning sodium, memerah saat Belial bangkit */}
        <div className="absolute inset-0">
          {CITY_LIGHTS.map((l, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: l.x,
                top: l.y,
                width: l.size,
                height: l.size,
                background: `radial-gradient(circle, ${
                  progress > 0.4 ? 'rgba(239, 35, 60, 0.85)' : 'rgba(255, 176, 32, 0.6)'
                } 0%, transparent 72%)`,
                opacity: 0.34 + progress * 0.4,
                filter: 'blur(2px)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Lapisan 3: judul besar di belakang sosok */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[16%] md:top-[15%] z-[15] px-5 md:pl-[6%] lg:pl-[7%] will-change-transform"
        style={titleStyle}
      >
        <h1 aria-label={belialMood ? 'Belial' : 'Fanz Fighters'} className="grid">
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 font-display font-extrabold uppercase text-[#EFE7E1] leading-[0.82] tracking-[0.01em] md:whitespace-nowrap text-[length:clamp(64px,min(14vw,26vh),250px)] -skew-x-6 origin-bottom-left"
            style={{ opacity: titleNormalOpacity }}
          >
            Fanz Fighters
          </span>
          <span
            aria-hidden="true"
            className="col-start-1 row-start-1 font-display font-extrabold uppercase text-[#E0243B] leading-[0.82] tracking-[0.01em] md:whitespace-nowrap text-[length:clamp(64px,min(14vw,26vh),250px)] -skew-x-6 origin-bottom-left"
            style={{ opacity: titleBelialOpacity }}
          >
            Belial
          </span>
        </h1>

        <div className="relative mt-4 md:mt-6 min-h-[48px]">
          <div style={{ opacity: titleNormalOpacity }} className="absolute inset-0">
            <p className="font-sans text-lg md:text-xl font-semibold text-[#EFE7E1]">{OWNER_IDENTITY.fullName}</p>
            <p className="font-sans text-sm text-[#B4A3A8] mt-0.5">Fotografer pesawat dan kereta api · CGK, HLP, DPS</p>
          </div>
          <div style={{ opacity: titleBelialOpacity }} className="absolute inset-0">
            <p className="font-sans text-lg md:text-xl font-semibold text-[#FFB020]">Dark Galactic Emperor</p>
            <p className="font-sans text-sm text-[#B4A3A8] mt-0.5">{OWNER_IDENTITY.aviationHandle}</p>
          </div>
        </div>
      </div>

      {/* Lapisan 4: Belial + sosok (satu kotak, rasio terkunci 1061x1889) */}
      <div className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center md:justify-end md:pr-[6%] lg:pr-[10%]">
        <div
          ref={figureBoxRef}
          className="relative aspect-[1061/1889] h-[78dvh] sm:h-[84dvh] md:h-[calc(100vh-52px)] max-h-[960px] will-change-transform"
          style={figureStyle}
        >
          {box.w > 0 && (
            <>
              <BelialAura progress={progress} placement={placement} reducedMotion={reducedMotion} />
              <BelialMorphStage
                progress={progress}
                origin={lensOrigin}
                box={box}
                placement={placement}
                humanUrl={HERO_ASSETS.figureCutoutUrl}
                humanAlt="Dikut Affan Aryansyah berdiri membelakangi kamera di malam hari"
                belialUrl={belialFormImg}
                reducedMotion={reducedMotion}
              />
            </>
          )}
          {box.w === 0 && (
            <img
              src={HERO_ASSETS.figureCutoutUrl}
              alt="Dikut Affan Aryansyah berdiri membelakangi kamera di malam hari"
              draggable={false}
              className="absolute inset-0 z-30 w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      <BelialEmberCanvas
        active={active}
        progress={progress}
        tabVisible={tabVisible}
        reducedMotion={reducedMotion}
        zone={emberZone}
      />

      {/* Lapisan 5: tiang dan kawat dekat; kamera "maju" sehingga rig membesar dan menyapu keluar layar saat digulir */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[41] will-change-transform" style={rigStyle}>
        <ForegroundRig />
      </div>

      {/* Scrim bawah agar teks tetap terbaca */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[220px] z-[18] bg-gradient-to-t from-[#07060A] via-[#07060A]/75 to-transparent"
      />

      {/* UI: tombol, tautan, petunjuk */}
      <div
        className="fixed inset-x-0 bottom-[84px] sm:bottom-[94px] md:bottom-[104px] z-50 px-5 sm:px-6 md:px-10 lg:pl-[7%] flex flex-col items-center md:items-start gap-4 pointer-events-none"
        style={uiStyle}
      >
        <div className="pointer-events-auto flex flex-wrap items-center justify-center md:justify-start gap-3">
          <button
            type="button"
            onClick={() => {
              audioEngine.playTabClick();
              if (reducedMotion) {
                if (!committedRef.current) {
                  committedRef.current = true;
                  onEnterGallery();
                }
              } else {
                goTo(1);
              }
            }}
            className="group -skew-x-12 min-h-[48px] inline-flex items-center bg-[#EFE7E1] hover:bg-[#EF233C] text-[#07060A] hover:text-[#EFE7E1] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07060A]"
          >
            <span className="skew-x-12 inline-flex items-center gap-2.5 px-6 py-3 font-sans text-[15px] font-bold">
              Masuk galeri
              <IconNext className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            aria-pressed={locked}
            onClick={toggleLockFromButton}
            className={`-skew-x-12 min-h-[48px] inline-flex items-center border transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07060A] ${
              locked || belialMood
                ? 'border-[#EF233C] bg-[#EF233C]/15 text-[#EFE7E1]'
                : 'border-[#EFE7E1]/35 text-[#EFE7E1] hover:border-[#FFB020] hover:text-[#FFB020]'
            }`}
          >
            <span className="skew-x-12 inline-flex items-center gap-2.5 px-5 py-3 font-sans text-[15px] font-semibold">
              <IconTransform className="w-4 h-4 shrink-0" />
              {locked ? 'Wujud normal' : 'Ubah wujud'}
            </span>
          </button>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-1">
          <a
            href={OWNER_IDENTITY.aviationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 font-sans text-sm text-[#EFE7E1] hover:text-[#FFB020] transition-colors underline decoration-[#EF233C] decoration-2 underline-offset-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020]"
          >
            <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
            <span>Pesawat {OWNER_IDENTITY.aviationHandle}</span>
          </a>
          <a
            href={OWNER_IDENTITY.railUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-2 font-sans text-sm text-[#EFE7E1] hover:text-[#FFB020] transition-colors underline decoration-[#EF233C] decoration-2 underline-offset-[7px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020]"
          >
            <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
            <span>Kereta {OWNER_IDENTITY.railHandle}</span>
          </a>
        </div>

        <p className="font-sans text-[13px] text-[#B4A3A8] max-w-[46ch] text-center md:text-left">
          <span className="hidden md:inline">Dekatkan kursor ke sosok untuk memanggil Belial. Gulir untuk masuk galeri.</span>
          <span className="md:hidden">Ketuk sosok untuk memanggil Belial. Geser ke atas untuk masuk galeri.</span>
        </p>
      </div>

      {/* Petunjuk gulir: rel vertikal dengan penanda yang meluncur turun */}
      <button
        type="button"
        onClick={() => {
          audioEngine.playTabClick();
          if (reducedMotion) {
            if (!committedRef.current) {
              committedRef.current = true;
              onEnterGallery();
            }
          } else {
            goTo(1);
          }
        }}
        aria-label="Gulir untuk masuk galeri"
        className="fixed right-3 md:right-6 bottom-[112px] md:bottom-[120px] z-50 hidden sm:flex flex-col items-center gap-3 text-[#B4A3A8] hover:text-[#FFB020] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB020] p-2"
        style={{ opacity: 1 - smooth(0, 0.15, s), pointerEvents: s > 0.1 ? 'none' : undefined }}
      >
        <span className="font-sans text-[12px] [writing-mode:vertical-rl]">Gulir untuk masuk galeri</span>
        <span className="relative block w-px h-14 bg-[#EFE7E1]/20 overflow-hidden">
          <span className="scroll-tick absolute left-0 top-0 block w-px h-4 bg-[#EF233C]" />
        </span>
      </button>

      {/* Tirai gelap: menutup layar tepat sebelum galeri dibuka */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[44]"
        style={{
          opacity: smooth(0.7, 1, s),
          background: 'radial-gradient(ellipse at 50% 55%, #14070B 0%, #07060A 70%)',
        }}
      />
    </section>
  );
};
