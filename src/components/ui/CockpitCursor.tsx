import React, { useEffect, useRef, useState } from 'react';

interface CockpitCursorProps {
  overFrame: boolean;
  overSilhouette?: boolean;
  belialMood?: boolean;
  frameRegistration?: string;
  disabled?: boolean;
  reducedMotion: boolean;
}

export const CockpitCursor: React.FC<CockpitCursorProps> = ({
  overFrame,
  overSilhouette = false,
  belialMood = false,
  frameRegistration,
  disabled = false,
  reducedMotion,
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [visible, setVisible] = useState(false);
  const [overButton, setOverButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setIsFinePointer(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!isFinePointer || disabled) {
      setVisible(false);
      return;
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setVisible(false);
        return;
      }
      setVisible(true);
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('button, a, [role="button"]');
      setOverButton(Boolean(interactive));
    };

    const onPointerLeave = () => setVisible(false);
    const onTouchStart = () => setVisible(false);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, [isFinePointer, disabled]);

  if (!isFinePointer || disabled || !visible) return null;

  const mode: 'circle' | 'frame' | 'button' | 'belial' = overButton
    ? 'button'
    : overSilhouette
      ? 'belial'
      : overFrame
        ? 'frame'
        : 'circle';

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="hidden md:block pointer-events-none fixed top-0 left-0 z-[110] will-change-transform"
      style={{ transform: 'translate3d(-999px, -999px, 0)' }}
    >
      {mode === 'belial' ? (
        <div className="relative -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          {/* Cincin target energi merah saat kursor di atas siluet */}
          <div className="w-11 h-11 rounded-full border border-[#EF233C] bg-[#EF233C]/12 shadow-[0_0_20px_rgba(239,35,60,0.45)] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A6E]" />
          </div>
          <span className="absolute left-full ml-2.5 px-2.5 py-0.5 bg-[#120A0D] border border-[#EF233C] rounded-[4px] font-mono text-xs font-semibold text-[#FF5A6E] tracking-[0.14em] uppercase whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.85)]">
            BELIAL
          </span>
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-full border transition-all ${
            reducedMotion ? 'duration-0' : 'duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)]'
          } ${
            mode === 'circle'
              ? `-translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                  belialMood
                    ? 'border-[#EF233C]/90 bg-[#EF233C]/20'
                    : 'border-[#EF233C]/80 bg-[#EF233C]/15'
                }`
              : mode === 'frame'
                ? 'translate-x-3 translate-y-3 px-3 py-1 bg-[#120A0D] border-[#EF233C] shadow-[0_8px_20px_rgba(0,0,0,0.7)]'
                : 'translate-x-3 translate-y-3 px-2.5 py-1 bg-[#120A0D] border-[#EF233C]/80 shadow-[0_8px_20px_rgba(0,0,0,0.7)]'
          }`}
        >
          {mode === 'frame' && (
            <span className="font-mono text-xs font-semibold text-[#EF233C] tracking-[0.1em] uppercase whitespace-nowrap">
              BUKA 3D{frameRegistration ? ` · ${frameRegistration}` : ''}
            </span>
          )}
          {mode === 'button' && (
            <span className="font-mono text-xs font-semibold text-[#F6EEF0] tracking-[0.1em] uppercase whitespace-nowrap">
              LIHAT
            </span>
          )}
        </div>
      )}
    </div>
  );
};
