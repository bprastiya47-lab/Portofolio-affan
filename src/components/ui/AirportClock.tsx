import React, { useEffect, useState } from 'react';

interface AirportClockProps {
  reducedMotion: boolean;
}

interface TimeReadout {
  wib: string;
  utc: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function readAirportTimes(): TimeReadout {
  const now = new Date();
  const utcStr = `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(
    now.getUTCSeconds()
  )}`;
  const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const wibStr = `${pad2(wibDate.getUTCHours())}:${pad2(wibDate.getUTCMinutes())}:${pad2(
    wibDate.getUTCSeconds()
  )}`;
  return { wib: wibStr, utc: utcStr };
}

const FlipDigitCell: React.FC<{ char: string; reducedMotion: boolean }> = ({
  char,
  reducedMotion,
}) => {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (reducedMotion || char === ':') return;
    const raf = window.requestAnimationFrame(() => setFlipping(true));
    const timer = window.setTimeout(() => setFlipping(false), 140);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [char, reducedMotion]);

  if (char === ':') {
    return (
      <span className="font-mono text-xs text-[#A8969B] px-[1px]" aria-hidden="true">
        :
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center w-[14px] h-[20px] bg-[#080507] border border-[#2B1218] rounded-[4px] font-mono text-xs font-medium text-[#F6EEF0] tabular-nums transition-transform duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
        flipping ? '-translate-y-[1px] text-[#EF233C]' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#2B1218]/80"
      />
      <span className="relative z-10 leading-none">{char}</span>
    </span>
  );
};

const ClockBoardGroup: React.FC<{
  zone: string;
  timeStr: string;
  reducedMotion: boolean;
  className?: string;
}> = ({ zone, timeStr, reducedMotion, className = '' }) => (
  <div
    className={`items-center gap-1.5 whitespace-nowrap shrink-0 ${className}`}
    aria-label={`Waktu ${zone} ${timeStr}`}
  >
    <span className="font-mono text-xs font-semibold text-[#EF233C] tracking-[0.06em]">
      {zone}
    </span>
    <div className="flex items-center gap-[2px]" aria-hidden="true">
      {timeStr.split('').map((ch, idx) => (
        <FlipDigitCell key={idx} char={ch} reducedMotion={reducedMotion} />
      ))}
    </div>
  </div>
);

export const AirportClock: React.FC<AirportClockProps> = ({ reducedMotion }) => {
  const [times, setTimes] = useState<TimeReadout>(() => readAirportTimes());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimes(readAirportTimes());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div
      className="hidden min-[700px]:flex items-center gap-2 shrink-0"
      role="timer"
      aria-live="off"
    >
      <ClockBoardGroup
        zone="WIB"
        timeStr={times.wib}
        reducedMotion={reducedMotion}
        className="flex"
      />
      <div className="hidden min-[1100px]:block w-px h-4 bg-[#2B1218]" aria-hidden="true" />
      <ClockBoardGroup
        zone="UTC"
        timeStr={times.utc}
        reducedMotion={reducedMotion}
        className="hidden min-[1100px]:flex"
      />
    </div>
  );
};
