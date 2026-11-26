import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export type SectionId = 'beranda' | 'tentang' | 'galeri' | 'kontak';

interface NavbarProps {
  activeSection: SectionId;
  soundEnabled: boolean;
  onNavigate: (id: SectionId) => void;
  onToggleSound: () => void;
}

const NAV_ITEMS: Array<{ id: SectionId; label: string }> = [
  { id: 'beranda', label: 'Beranda' },
  { id: 'tentang', label: 'Tentang' },
  { id: 'galeri', label: 'Galeri' },
  { id: 'kontak', label: 'Kontak' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeSection,
  soundEnabled,
  onNavigate,
  onToggleSound,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<SectionId, HTMLButtonElement | null>>({
    beranda: null,
    tentang: null,
    galeri: null,
    kontak: null,
  });

  const [pill, setPill] = useState({ left: 4, width: 72, ready: false });
  const [planeTilt, setPlaneTilt] = useState(0);
  const prevLeftRef = useRef(4);
  const tiltTimerRef = useRef(0);

  const updateIndicator = () => {
    const container = navRef.current;
    const activeBtn = btnRefs.current[activeSection];
    if (!container || !activeBtn) return;

    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    const nextLeft = bRect.left - cRect.left;
    const nextWidth = bRect.width;

    const delta = nextLeft - prevLeftRef.current;
    if (Math.abs(delta) > 4) {
      setPlaneTilt(delta > 0 ? 16 : -16);
      if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
      tiltTimerRef.current = window.setTimeout(() => setPlaneTilt(0), 340);
    }
    prevLeftRef.current = nextLeft;

    setPill({ left: nextLeft, width: nextWidth, ready: true });
  };

  useLayoutEffect(() => {
    updateIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => {
      window.removeEventListener('resize', updateIndicator);
      if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-center px-4 pt-4 sm:pt-5">
      {/* Navbar pill di tengah atas */}
      <nav
        aria-label="Navigasi utama"
        className="pointer-events-auto relative rounded-full bg-[#0A0F1F]/78 backdrop-blur-md border border-[#F5F7FF]/12 px-1.5 py-1.5 shadow-[0_12px_36px_rgba(4,7,18,0.55)]"
      >
        <div ref={navRef} className="relative flex items-center gap-1">
          {/* Indikator aktif biru #2F5BEA + maskot pesawat mini di atasnya */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 rounded-full bg-[#2F5BEA] transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: `${pill.left}px`,
              width: `${pill.width}px`,
              opacity: pill.ready ? 1 : 0,
            }}
          >
            {/* Maskot pesawat mini mengikuti dan miring saat bergerak */}
            <span
              className="absolute left-1/2 -top-3.5 -translate-x-1/2 transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-50%) rotate(${planeTilt}deg)`,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#F5F7FF] drop-shadow-[0_2px_6px_rgba(47,91,234,0.85)]"
              >
                <path
                  d="M12 2L14.2 9.2L21 12.6L21 14.8L14.2 12.8L14 18.2L17 20.4V22L12 20.6L7 22V20.4L10 18.2L9.8 12.8L3 14.8V12.6L9.8 9.2L12 2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  btnRefs.current[item.id] = el;
                }}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative z-10 min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FF] ${
                  isActive ? 'text-[#F5F7FF]' : 'text-[#98A5C8] hover:text-[#F5F7FF]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tombol suara on/off kecil di kanan atas */}
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? 'Matikan suara latar' : 'Nyalakan suara latar'}
        title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
        className="pointer-events-auto fixed right-4 sm:right-6 top-4 sm:top-5 min-w-[44px] min-h-[44px] px-3 rounded-full bg-[#0A0F1F]/78 hover:bg-[#121A33] backdrop-blur-md border border-[#F5F7FF]/12 flex items-center justify-center gap-2 text-xs font-medium text-[#F5F7FF] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
      >
        {soundEnabled ? (
          <Volume2 className="w-4 h-4 text-[#2F5BEA]" aria-hidden="true" />
        ) : (
          <VolumeX className="w-4 h-4 text-[#98A5C8]" aria-hidden="true" />
        )}
        <span className="hidden sm:inline whitespace-nowrap">
          {soundEnabled ? 'Suara Nyala' : 'Suara Mati'}
        </span>
      </button>
    </header>
  );
};
