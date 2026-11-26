import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PortfolioItem } from '../../data/portfolioData';

export interface LightboxSelection {
  item: PortfolioItem;
  sourceRect: DOMRect | null;
}

interface LightboxModalProps {
  selection: LightboxSelection | null;
  items: PortfolioItem[];
  reducedMotion: boolean;
  onClose: () => void;
  onSelect: (item: PortfolioItem) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  selection,
  items,
  reducedMotion,
  onClose,
  onSelect,
}) => {
  const activeItem = selection?.item ?? null;
  const activeIndex = activeItem ? items.findIndex((i) => i.id === activeItem.id) : -1;

  useEffect(() => {
    if (!activeItem) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        e.preventDefault();
        const next = items[(activeIndex + 1) % items.length];
        onSelect(next);
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        e.preventDefault();
        const prev = items[(activeIndex - 1 + items.length) % items.length];
        onSelect(prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeItem, activeIndex, items, onClose, onSelect]);

  if (!activeItem) return null;

  // Hitung offset shared-element sederhana dari posisi kartu asal ke tengah layar
  const rect = selection?.sourceRect;
  const initialDelta =
    rect && !reducedMotion
      ? {
          x: rect.left + rect.width / 2 - window.innerWidth / 2,
          y: rect.top + rect.height / 2 - window.innerHeight / 2,
          scale: Math.max(0.28, Math.min(0.85, rect.width / Math.min(window.innerWidth * 0.86, 1020))),
          opacity: 0.6,
        }
      : { opacity: 0, scale: reducedMotion ? 1 : 0.96, x: 0, y: 0 };

  const handlePrev = () => {
    if (items.length < 2) return;
    onSelect(items[(activeIndex - 1 + items.length) % items.length]);
  };

  const handleNext = () => {
    if (items.length < 2) return;
    onSelect(items[(activeIndex + 1) % items.length]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail foto ${activeItem.aircraft} ${activeItem.registration}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      {/* Latar gelap pekat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.25 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#050814]/92 backdrop-blur-md"
      />

      {/* Tombol tutup (X) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup pratinjau foto"
        className="fixed right-4 top-4 sm:right-7 sm:top-7 z-30 min-w-[44px] min-h-[44px] rounded-full bg-[#121A33]/90 hover:bg-[#2F5BEA] border border-[#F5F7FF]/18 flex items-center justify-center text-[#F5F7FF] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FF]"
      >
        <X className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Tombol navigasi kiri / kanan */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto sebelumnya"
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] rounded-full bg-[#121A33]/90 hover:bg-[#2F5BEA] border border-[#F5F7FF]/18 flex items-center justify-center text-[#F5F7FF] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FF]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Foto berikutnya"
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] rounded-full bg-[#121A33]/90 hover:bg-[#2F5BEA] border border-[#F5F7FF]/18 flex items-center justify-center text-[#F5F7FF] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FF]"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Panel Lightbox dengan transisi membesar dari posisi kartu */}
      <motion.div
        key={activeItem.id}
        initial={initialDelta}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 w-full max-w-5xl max-h-[90svh] overflow-y-auto rounded-2xl bg-[#121A33] border border-[#F5F7FF]/14 shadow-[0_28px_90px_rgba(0,0,0,0.75)]"
      >
        {/* Foto resolusi tinggi 2000w */}
        <div
          className="relative w-full aspect-[16/10] bg-[#0A0F1F] overflow-hidden"
          style={{
            backgroundImage: `url(${activeItem.blurDataUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <img
            src={activeItem.imageUrl}
            srcSet={activeItem.srcSet}
            sizes="(max-width: 1024px) 95vw, 1024px"
            alt={`${activeItem.aircraft} — ${activeItem.operator} (${activeItem.registration}) di ${activeItem.location}`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain bg-[#0A0F1F]/55"
          />
        </div>

        {/* Info lengkap & telemetri kamera */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-[#F5F7FF]/10">
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#98A5C8] font-mono tabular-nums">
              <span className="text-[#2F5BEA] font-semibold">#{activeItem.indexLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{activeItem.registration}</span>
              <span aria-hidden="true">·</span>
              <span>{activeItem.year}</span>
              {activeItem.specialBadge && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F5F7FF]">{activeItem.specialBadge}</span>
                </>
              )}
            </div>

            <h3 className="font-display text-3xl sm:text-4xl font-extrabold uppercase text-[#F5F7FF] leading-none">
              {activeItem.aircraft}
            </h3>
            <p className="text-sm sm:text-base font-medium text-[#F5F7FF]/90">
              {activeItem.operator} <span className="text-[#98A5C8]">· {activeItem.location}</span>
            </p>
            <p className="text-sm text-[#98A5C8] leading-relaxed pt-1">{activeItem.notes}</p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3 bg-[#0A0F1F]/70 rounded-xl p-4 border border-[#F5F7FF]/10 self-start">
            <div>
              <div className="text-[11px] text-[#98A5C8]">Kecepatan Rana</div>
              <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#F5F7FF] mt-0.5">
                {activeItem.shutter}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#98A5C8]">Bukaan (Aperture)</div>
              <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#F5F7FF] mt-0.5">
                {activeItem.aperture}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#98A5C8]">Sensitivitas ISO</div>
              <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#F5F7FF] mt-0.5">
                ISO {activeItem.iso}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[#98A5C8]">Panjang Fokus</div>
              <div className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#F5F7FF] mt-0.5">
                {activeItem.focalLength}
              </div>
            </div>
            <div className="col-span-2 pt-2 border-t border-[#F5F7FF]/10">
              <div className="text-[11px] text-[#98A5C8]">Livery</div>
              <div className="text-xs sm:text-sm text-[#F5F7FF] mt-0.5">{activeItem.liveryDesc}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
