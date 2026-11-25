import React, { useState } from 'react';
import { PortfolioItem } from '../../data/portfolioData';
import { IconChevronDown, IconExpand, IconLicense } from './CockpitIcons';
import { DockTriggerOrigin } from './NavigationDock';

interface InspectionDockProps {
  item: PortfolioItem;
  onRequestLicense: (item: PortfolioItem, origin: DockTriggerOrigin) => void;
  onOpenLightbox: (triggerEl: HTMLButtonElement) => void;
}

export const InspectionDock: React.FC<InspectionDockProps> = ({
  item,
  onRequestLicense,
  onOpenLightbox,
}) => {
  const [expanded, setExpanded] = useState(true);

  const telemetryRows: Array<{ term: string; value: string }> = [
    { term: 'Registrasi', value: item.registration },
    { term: 'Operator', value: item.operator },
    { term: 'Lokasi', value: item.location },
    { term: 'Shutter', value: item.shutter },
    { term: 'Aperture', value: item.aperture },
    { term: 'ISO', value: item.iso },
    { term: 'Focal Length', value: item.focalLength },
    { term: 'Tahun', value: item.year },
    { term: 'Livery', value: item.liveryDesc },
  ];

  const handleLicenseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onRequestLicense(item, {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
      buttonEl: e.currentTarget,
    });
  };

  return (
    <aside
      aria-label="Panel Telemetri EXIF"
      className="fixed bottom-[82px] sm:bottom-[88px] left-3 right-3 sm:left-8 sm:right-auto md:left-10 z-40 sm:w-[min(470px,calc(100vw-48px))] max-h-[calc(100vh-164px)] overflow-y-auto pointer-events-auto"
    >
      <div className="relative bg-[#090507]/94 border border-[#EF233C]/30 border-l-2 border-l-[#EF233C] rounded-[4px] shadow-[0_14px_36px_rgba(0,0,0,0.8),0_0_24px_rgba(239,35,60,0.12)]">
        {/* Garis aksen merah tipis di tepi atas kartu obsidian */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#EF233C] via-[#EF233C]/40 to-transparent"
        />
        {/* Header & Tombol Buka-Tutup Telemetri */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-[#EF233C]/20">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-[#EF233C] tabular-nums uppercase">
              <span>{item.indexLabel}</span>
              <span className="text-[#A8969B]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#F6EEF0] truncate">{item.registration}</span>
              {item.specialBadge && (
                <>
                  <span className="text-[#A8969B]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#EF233C] truncate">{item.specialBadge}</span>
                </>
              )}
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-wide text-[#F6EEF0] uppercase leading-tight mt-0.5 truncate">
              {item.aircraft}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 bg-[#080507] border border-[#2B1218] hover:border-[#EF233C]/70 rounded-[4px] font-mono text-xs text-[#F6EEF0] hover:text-[#EF233C] uppercase transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          >
            <span>{expanded ? 'Tutup Data' : 'Buka EXIF'}</span>
            <IconChevronDown
              className={`w-4 h-4 text-[#EF233C] transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Definition List Telemetri EXIF */}
        {expanded && (
          <div className="px-3.5 sm:px-4 py-3 space-y-3 border-b border-[#EF233C]/20">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              {telemetryRows.map((row) => (
                <div key={row.term} className="min-w-0">
                  <dt className="font-mono text-xs text-[#A8969B] uppercase">
                    {row.term}
                  </dt>
                  <dd className="font-mono text-xs font-medium text-[#F6EEF0] tabular-nums truncate mt-0.5">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="text-xs text-[#A8969B] leading-relaxed pt-2 border-t border-[#EF233C]/20">
              {item.notes}
            </p>

            <p className="hidden sm:block font-mono text-xs text-[#A8969B]">
              Seret 3D untuk putar · Shift+seret untuk pan · Scroll untuk zoom
            </p>
          </div>
        )}

        {/* Bar Aksi Frame: Minta Lisensi & Lightbox Foto Utuh */}
        <div className="px-3.5 sm:px-4 py-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLicenseClick}
            className="flex-1 min-w-[200px] min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#EF233C] hover:bg-[#FF5A6E] active:bg-[#D90429] text-[#080507] rounded-[4px] font-mono text-xs font-semibold tracking-[0.06em] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconLicense className="w-4 h-4 shrink-0" />
            <span>Minta Lisensi Frame Ini</span>
          </button>

          <button
            type="button"
            onClick={(e) => onOpenLightbox(e.currentTarget)}
            aria-label={`Lihat foto utuh ${item.aircraft} dalam layar penuh`}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#080507] border border-[#2B1218] hover:border-[#EF233C] text-[#F6EEF0] hover:text-[#EF233C] rounded-[4px] font-mono text-xs tracking-[0.06em] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          >
            <IconExpand className="w-4 h-4 text-[#EF233C] shrink-0" />
            <span>Foto Utuh</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

