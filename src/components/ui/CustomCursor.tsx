import React, { useEffect, useRef, useState } from 'react';

export const CustomCursor: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') {
      setEnabled(false);
      return;
    }
    const isFine = window.matchMedia('(pointer: fine)').matches;
    if (!isFine) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    document.body.classList.add('has-custom-cursor');
    return () => {
      document.body.classList.remove('has-custom-cursor');
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!enabled) return;
    let tx = -100;
    let ty = -100;
    let rx = -100;
    let ry = -100;
    let interactive = false;
    let visible = false;
    let rafId = 0;

    const isInteractive = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest('a, button, [role="button"], [data-cursor="interactive"], input, textarea')
      );
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
      visible = true;
      interactive = isInteractive(e.target);
    };

    const onLeave = () => {
      visible = false;
    };

    const tick = () => {
      rx += (tx - rx) * 0.22;
      ry += (ty - ry) * 0.22;

      if (dotRef.current) {
        dotRef.current.style.opacity = visible ? '1' : '0';
        dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%) scale(${
          interactive ? 0.55 : 1
        })`;
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = visible ? (interactive ? '0.95' : '0.55') : '0';
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${
          interactive ? 1.65 : 1
        })`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
      <div
        ref={ringRef}
        className="fixed left-0 top-0 w-7 h-7 rounded-full border border-[#F5F7FF]/75 transition-[border-color] duration-150 will-change-transform opacity-0"
      />
      <div
        ref={dotRef}
        className="fixed left-0 top-0 w-1.5 h-1.5 rounded-full bg-[#2F5BEA] will-change-transform opacity-0"
      />
    </div>
  );
};
