import React, { useEffect, useMemo, useRef } from 'react';
import { IconFlightMark } from './CockpitIcons';
import { AirportClock } from './AirportClock';

export type NavTab = 'hero' | 'gallery' | 'gear' | 'specs' | 'contact';

interface HeaderHudProps {
  headingFloatRef: React.MutableRefObject<number>;
  headingDeg: number;
  activeIndex: number;
  totalItems: number;
  reducedMotion: boolean;
  visible: boolean;
  belialMood?: boolean;
}

const PX_PER_DEG = 2.0;
const START_DEG = -90;
const END_DEG = 450;

function formatCardinal(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  if (norm === 0) return 'N';
  if (norm === 90) return 'E';
  if (norm === 180) return 'S';
  if (norm === 270) return 'W';
  return String(norm).padStart(3, '0');
}

export const HeaderHud: React.FC<HeaderHudProps> = ({
  headingFloatRef,
  headingDeg,
  activeIndex,
  totalItems,
  reducedMotion,
  visible,
  belialMood = false,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const ticks = useMemo(() => {
    const arr: Array<{ deg: number; label: string; isCardinal: boolean; isMajor: boolean }> = [];
    for (let d = START_DEG; d <= END_DEG; d += 15) {
      const norm = ((d % 360) + 360) % 360;
      const isCardinal = norm % 90 === 0;
      const isMajor = norm % 30 === 0;
      arr.push({
        deg: d,
        label: formatCardinal(d),
        isCardinal,
        isMajor,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!visible) return;
    let rafId = 0;
    let lastDrawn = -999;

    const updateTape = () => {
      const vp = viewportRef.current;
      const track = trackRef.current;
      if (vp && track) {
        const current = headingFloatRef.current;
        if (Math.abs(current - lastDrawn) > 0.015) {
          lastDrawn = current;
          const halfW = vp.clientWidth * 0.5;
          const x = halfW - (current - START_DEG) * PX_PER_DEG;
          track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
        }
      }
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(updateTape);
      }
    };

    updateTape();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [visible, reducedMotion, headingFloatRef, headingDeg]);

  const formattedHeading = String(headingDeg).padStart(3, '0');
  const formattedIndex = String(activeIndex + 1).padStart(2, '0');
  const formattedTotal = String(totalItems).padStart(2, '0');

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 min-[700px]:gap-4 px-3 sm:px-6 md:px-8 py-2 border-b border-[#2B1218] bg-[#080507]/92 overflow-hidden transition-opacity duration-500 pointer-events-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* (a) Kiri: Monogram ringkas saja, tanpa mengulang nama hero */}
      <div className="min-w-0 min-[700px]:flex-1 flex items-center">
        <div
          className="inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          aria-label="Monogram Fanz Fighters"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 bg-[#120A0D] border border-[#2B1218] rounded-[4px] shrink-0">
            <IconFlightMark className="w-4 h-4 text-[#EF233C]" />
          </span>
          <span className="font-display text-base sm:text-lg font-bold tracking-[0.14em] text-[#F6EEF0] uppercase leading-none">
            FF
          </span>
        </div>
      </div>

      {/* (b) Tengah: Satu strip instrumen (WIB/UTC + pita kompas + HDG & penghitung frame) */}
      <div className="min-w-0 shrink flex items-center justify-center">
        <div
          className="flex items-center gap-2 min-[700px]:gap-2.5 bg-[#120A0D] border border-[#2B1218] rounded-[4px] px-2 sm:px-2.5 py-1 min-w-0 max-w-full"
          aria-label={`Kompas arah ${formattedHeading} derajat, frame ${formattedIndex} dari ${formattedTotal}`}
        >
          {/* Jam WIB (>=700px) & UTC (>=1100px) */}
          <AirportClock reducedMotion={reducedMotion} />

          <div
            className="hidden min-[700px]:block w-px h-5 bg-[#2B1218] shrink-0"
            aria-hidden="true"
          />

          {/* Pita Kompas Geser + HDG + Penghitung Frame */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              ref={viewportRef}
              className="relative w-14 min-[420px]:w-20 min-[700px]:w-28 min-[1100px]:w-36 h-6 overflow-hidden shrink-0"
              aria-hidden="true"
            >
              <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#EF233C]" />
              <div className="absolute left-1/2 top-1 bottom-0 -translate-x-1/2 w-px bg-[#EF233C]/50 z-10" />

              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#120A0D] to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#120A0D] to-transparent z-10" />

              <div
                ref={trackRef}
                className="absolute top-0 left-0 h-full will-change-transform"
                style={{ width: `${(END_DEG - START_DEG) * PX_PER_DEG}px` }}
              >
                {ticks.map((tick) => {
                  const leftPx = (tick.deg - START_DEG) * PX_PER_DEG;
                  return (
                    <div
                      key={tick.deg}
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                      style={{ left: `${leftPx}px` }}
                    >
                      <span
                        className={`block w-px ${
                          tick.isCardinal
                            ? 'h-2 bg-[#EF233C]'
                            : tick.isMajor
                              ? 'h-1.5 bg-[#A8969B]'
                              : 'h-1 bg-[#A8969B]/55'
                        }`}
                      />
                      {tick.isMajor && (
                        <span
                          className={`font-mono text-xs leading-none mt-0.5 tabular-nums ${
                            tick.isCardinal ? 'text-[#EF233C] font-semibold' : 'text-[#A8969B]'
                          }`}
                        >
                          {tick.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-px h-4 bg-[#2B1218] shrink-0" aria-hidden="true" />

            <div className="font-mono text-xs tracking-wider text-[#F6EEF0] tabular-nums whitespace-nowrap shrink-0">
              <span className="text-[#EF233C] font-medium">HDG {formattedHeading}°</span>
              <span className="text-[#A8969B] mx-1" aria-hidden="true">
                ·
              </span>
              <span>
                {formattedIndex}/{formattedTotal}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* (c) Kanan: Penyeimbang fleksibel & status wilayah statis (tanpa tombol apa pun) */}
      <div className="hidden min-[700px]:flex min-[700px]:flex-1 min-w-0 items-center justify-end">
        <span
          className={`hidden min-[1200px]:inline font-mono text-xs tracking-[0.14em] uppercase whitespace-nowrap truncate ${
            belialMood ? 'text-[#EF233C]' : 'text-[#A8969B]'
          }`}
        >
          {belialMood ? 'MODE · BELIAL' : 'CGK · HLP · DPS'}
        </span>
      </div>
    </header>
  );
};
