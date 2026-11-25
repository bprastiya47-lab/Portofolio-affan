import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../../audio/audioEngine';

interface SplitFlapHeroProps {
  reducedMotion: boolean;
  titleText?: string;
  subtitleText?: string;
  belialMood?: boolean;
  mode?: 'gallery' | 'hero';
  className?: string;
  style?: React.CSSProperties;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const FLIP_COOLDOWN_MS = 600;

interface CharEntry {
  char: string;
  index: number;
  isSpace: boolean;
}

export const SplitFlapHero: React.FC<SplitFlapHeroProps> = ({
  reducedMotion,
  titleText = 'FANZ FIGHTERS',
  subtitleText = '@fanzfighters_pict',
  belialMood = false,
  mode = 'gallery',
  className = '',
  style,
}) => {
  const chars = useMemo<CharEntry[]>(
    () =>
      titleText.split('').map((char, index) => ({
        char,
        index,
        isSpace: char === ' ',
      })),
    [titleText]
  );

  const containerRef = useRef<HTMLHeadingElement>(null);
  const lastFlipAtRef = useRef<Record<number, number>>({});
  const timersRef = useRef<number[]>([]);
  const touchSweepPlayedRef = useRef(false);
  const prevTitleRef = useRef(titleText);

  const [displayChars, setDisplayChars] = useState<string[]>(() => titleText.split(''));
  const [flipTicks, setFlipTicks] = useState<Record<number, number>>({});
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [glowVisible, setGlowVisible] = useState(false);

  const clearScheduledTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearScheduledTimers();
  }, [clearScheduledTimers]);

  const triggerFlip = useCallback(
    (idx: number, bypassCooldown = false, withSound = true, targetTitle = titleText) => {
      const targetChar = targetTitle[idx];
      if (!targetChar || targetChar === ' ' || reducedMotion) return;

      const now = performance.now();
      const last = lastFlipAtRef.current[idx] ?? 0;
      if (!bypassCooldown && now - last < FLIP_COOLDOWN_MS) {
        return;
      }
      lastFlipAtRef.current[idx] = now;

      // 4 sampai 6 karakter acak A-Z sebelum berhenti di huruf asli
      const stepCount = 4 + Math.floor(Math.random() * 3);
      const stepMs = 42;

      for (let step = 0; step <= stepCount; step++) {
        const timerId = window.setTimeout(() => {
          const isFinal = step === stepCount;
          const nextChar = isFinal
            ? targetChar
            : ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

          if (withSound) {
            audioEngine.playFlipClack();
          }

          setDisplayChars((prev) => {
            const copy = [...prev];
            copy[idx] = nextChar;
            return copy;
          });
          setFlipTicks((prev) => ({
            ...prev,
            [idx]: (prev[idx] ?? 0) + 1,
          }));
        }, step * stepMs);

        timersRef.current.push(timerId);
      }
    },
    [reducedMotion, titleText]
  );

  // Balik huruf secara mekanis saat judul berubah (mis. FANZ FIGHTERS <-> BELIAL)
  useEffect(() => {
    if (prevTitleRef.current === titleText) return;
    prevTitleRef.current = titleText;
    clearScheduledTimers();
    setHoveredIdx(null);

    if (reducedMotion) {
      setDisplayChars(titleText.split(''));
      return;
    }

    setDisplayChars((prev) =>
      titleText.split('').map((ch, idx) => (ch === ' ' ? ' ' : prev[idx] ?? ch))
    );

    let order = 0;
    titleText.split('').forEach((ch, idx) => {
      if (ch === ' ') return;
      const delay = order * 38;
      order++;
      const tId = window.setTimeout(() => {
        triggerFlip(idx, true, idx % 2 === 0, titleText);
      }, delay);
      timersRef.current.push(tId);
    });
  }, [titleText, reducedMotion, clearScheduledTimers, triggerFlip]);

  // Di layar sentuh, jalankan gelombang split-flap kiri ke kanan sekali saat judul pertama muncul
  useEffect(() => {
    if (reducedMotion || touchSweepPlayedRef.current || typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!isTouch) return;

    touchSweepPlayedRef.current = true;
    let letterOrder = 0;
    chars.forEach((entry) => {
      if (entry.isSpace) return;
      const delay = 140 + letterOrder * 55;
      letterOrder++;
      const tId = window.setTimeout(() => {
        triggerFlip(entry.index, true, false, titleText);
      }, delay);
      timersRef.current.push(tId);
    });
  }, [chars, reducedMotion, triggerFlip, titleText]);

  const handlePointerMove = (e: React.PointerEvent<HTMLHeadingElement>) => {
    const el = containerRef.current;
    if (!el || e.pointerType === 'touch') return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--title-glow-x', `${x.toFixed(1)}px`);
    el.style.setProperty('--title-glow-y', `${y.toFixed(1)}px`);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLHeadingElement>) => {
    if (e.pointerType === 'touch') return;
    setGlowVisible(true);
    handlePointerMove(e);
  };

  const handlePointerLeave = () => {
    setGlowVisible(false);
    setHoveredIdx(null);
  };

  const wrapperClass =
    mode === 'hero'
      ? `pointer-events-none select-none ${className}`
      : `fixed top-[58px] sm:top-[64px] md:top-[70px] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none px-4 w-full max-w-4xl ${className}`;

  const headingSizeClass =
    mode === 'hero'
      ? 'text-[52px] min-[420px]:text-[64px] sm:text-[84px] md:text-[116px] lg:text-[148px] leading-[0.88]'
      : 'text-[40px] min-[480px]:text-[52px] sm:text-[62px] md:text-[72px] leading-[0.94]';

  const glowColor = belialMood
    ? 'rgba(239, 35, 60, 0.28)'
    : 'rgba(239, 35, 60, 0.2)';

  return (
    <section aria-label="Tajuk Portofolio" className={wrapperClass} style={style}>
      <div className={mode === 'hero' ? 'inline-block pointer-events-none' : 'inline-block pointer-events-auto'}>
        <h1
          ref={containerRef}
          aria-label={titleText}
          onPointerEnter={mode === 'gallery' ? handlePointerEnter : undefined}
          onPointerMove={mode === 'gallery' ? handlePointerMove : undefined}
          onPointerLeave={mode === 'gallery' ? handlePointerLeave : undefined}
          className={`relative inline-flex items-center justify-center font-display font-extrabold tracking-[0.06em] uppercase select-none ${headingSizeClass} ${
            mode === 'gallery' ? 'px-4 py-1' : ''
          }`}
          style={
            {
              '--title-glow-x': '50%',
              '--title-glow-y': '50%',
            } as React.CSSProperties
          }
        >
          {/* Cahaya aksen lembut mengikuti kursor di belakang huruf lewat CSS variable */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-[4px] transition-opacity duration-200"
            style={{
              opacity: glowVisible ? 1 : 0,
              background: `radial-gradient(170px circle at var(--title-glow-x) var(--title-glow-y), ${glowColor}, transparent 72%)`,
            }}
          />

          {chars.map((entry) => {
            if (entry.isSpace) {
              return (
                <span
                  key={entry.index}
                  aria-hidden="true"
                  className="inline-block w-[0.26em]"
                />
              );
            }

            const dist = hoveredIdx === null ? 99 : Math.abs(entry.index - hoveredIdx);
            const liftPx =
              reducedMotion || dist > 2 ? 0 : dist === 0 ? -4 : dist === 1 ? -3 : -2;
            const colorHex = belialMood
              ? dist === 0
                ? '#FF5A6E'
                : '#EF233C'
              : dist === 0
                ? '#EF233C'
                : dist === 1
                  ? '#FF5A6E'
                  : dist === 2
                    ? '#F6EEF0'
                    : '#F6EEF0';

            const tick = flipTicks[entry.index] ?? 0;
            const flipDeg = reducedMotion || tick === 0 ? 0 : tick % 2 === 1 ? -14 : 10;

            return (
              <span
                key={entry.index}
                aria-hidden="true"
                onPointerEnter={
                  mode === 'gallery'
                    ? (e) => {
                        setHoveredIdx(entry.index);
                        if (e.pointerType !== 'touch') {
                          triggerFlip(entry.index);
                        }
                      }
                    : undefined
                }
                className="relative inline-block cursor-default will-change-transform transition-[transform,color] duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] drop-shadow-[0_6px_24px_rgba(8,5,7,0.92)]"
                style={{
                  color: colorHex,
                  transform: `translate3d(0, ${liftPx}px, 0) perspective(280px) rotateX(${flipDeg}deg)`,
                }}
              >
                {displayChars[entry.index] ?? entry.char}
              </span>
            );
          })}
        </h1>
      </div>

      <p
        className={`font-mono text-xs sm:text-sm tracking-[0.18em] mt-1 drop-shadow-[0_2px_10px_rgba(8,5,7,0.95)] ${
          belialMood ? 'text-[#FF5A6E]' : 'text-[#A8969B]'
        }`}
      >
        {subtitleText}
      </p>
    </section>
  );
};
