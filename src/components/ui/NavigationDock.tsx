import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IconAudioOff,
  IconAudioOn,
  IconBack,
  IconClose,
  IconContact,
  IconContactSheet,
  IconExpand,
  IconGallery,
  IconGear,
  IconHome,
  IconLicense,
  IconNext,
  IconPrev,
  IconReplay,
  IconSpecs,
} from './CockpitIcons';
import { NavTab } from './HeaderHud';
import { audioEngine } from '../../audio/audioEngine';

export interface DockTriggerOrigin {
  x: number;
  y: number;
  buttonEl: HTMLButtonElement | null;
}

type DockHighlightId = NavTab | 'index' | 'sound' | 'replay';
type UtilityId = 'index' | 'sound' | 'replay';

interface NavigationDockProps {
  activeTab: NavTab;
  inDetailMode: boolean;
  detailIndex: number;
  detailTotal: number;
  reducedMotion: boolean;
  hidden: boolean;
  soundEnabled: boolean;
  masterVolume: number;
  indexOpen: boolean;
  onSelectTab: (tab: NavTab, origin?: DockTriggerOrigin) => void;
  onCloseModal: () => void;
  onPrevFrame: () => void;
  onNextFrame: () => void;
  onExitDetail: () => void;
  onRequestLicense: (origin: DockTriggerOrigin) => void;
  onOpenLightbox: (triggerEl: HTMLButtonElement) => void;
  onOpenIndex: (triggerEl: HTMLButtonElement) => void;
  onToggleSound: () => void;
  onVolumeChange: (volume: number) => void;
  onReplayIntro: () => void;
}

const DOCK_TABS: Array<{
  id: NavTab;
  label: string;
  Icon: React.FC<{ className?: string }>;
}> = [
  { id: 'hero', label: 'Beranda', Icon: IconHome },
  { id: 'gallery', label: 'Galeri', Icon: IconGallery },
  { id: 'gear', label: 'Peralatan', Icon: IconGear },
  { id: 'specs', label: 'Spesifikasi', Icon: IconSpecs },
  { id: 'contact', label: 'Kontak', Icon: IconContact },
];

const MODAL_LABELS: Record<'gear' | 'specs' | 'contact', string> = {
  gear: 'Peralatan Lapangan',
  specs: 'Spesifikasi & Arsip',
  contact: 'Kontak & Lisensi',
};

export const NavigationDock: React.FC<NavigationDockProps> = ({
  activeTab,
  inDetailMode,
  detailIndex,
  detailTotal,
  reducedMotion,
  hidden,
  soundEnabled,
  masterVolume,
  indexOpen,
  onSelectTab,
  onCloseModal,
  onPrevFrame,
  onNextFrame,
  onExitDetail,
  onRequestLicense,
  onOpenLightbox,
  onOpenIndex,
  onToggleSound,
  onVolumeChange,
  onReplayIntro,
}) => {
  const isModalTab = activeTab === 'gear' || activeTab === 'specs' || activeTab === 'contact';
  const dockContext: 'gallery' | 'detail' | 'modal' = isModalTab
    ? 'modal'
    : inDetailMode
      ? 'detail'
      : 'gallery';

  const navRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRowRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const soundBtnRef = useRef<HTMLButtonElement | null>(null);
  const volumeSliderRef = useRef<HTMLInputElement>(null);

  const buttonRefs = useRef<Record<DockHighlightId, HTMLButtonElement | null>>({
    hero: null,
    gallery: null,
    gear: null,
    specs: null,
    contact: null,
    index: null,
    sound: null,
    replay: null,
  });

  const [hoveredId, setHoveredId] = useState<DockHighlightId | null>(null);
  const [focusedId, setFocusedId] = useState<DockHighlightId | null>(null);
  const [hoveredUtility, setHoveredUtility] = useState<{
    id: UtilityId;
    label: string;
    centerX: number;
  } | null>(null);
  const [isDockHovered, setIsDockHovered] = useState(false);

  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volumeCenterX, setVolumeCenterX] = useState<number | null>(null);
  const volumeLeaveTimerRef = useRef<number>(0);
  const longPressTimerRef = useRef<number>(0);
  const longPressTriggeredRef = useRef(false);

  const animStateRef = useRef({
    initialized: false,
    pillX: 0,
    pillW: 0,
    targetPillX: 0,
    targetPillW: 0,
    glowX: 0,
    glowY: 0,
    targetGlowX: 0,
    targetGlowY: 0,
    pullOffset: 0,
    rafId: 0,
    running: false,
  });

  const applyInstantPill = useCallback((x: number, w: number) => {
    const pill = pillRef.current;
    if (!pill) return;
    pill.style.width = `${w.toFixed(2)}px`;
    pill.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  }, []);

  const stepAnimation = useCallback(() => {
    const state = animStateRef.current;
    const pill = pillRef.current;
    const container = containerRef.current;

    if (!pill || !container) {
      state.running = false;
      state.rafId = 0;
      return;
    }

    const desiredX = state.targetPillX + state.pullOffset;
    const desiredW = state.targetPillW;

    if (reducedMotion || !state.initialized) {
      state.pillX = desiredX;
      state.pillW = desiredW;
      state.glowX = state.targetGlowX;
      state.glowY = state.targetGlowY;
      state.initialized = true;

      pill.style.width = `${state.pillW.toFixed(2)}px`;
      pill.style.transform = `translate3d(${state.pillX.toFixed(2)}px, 0, 0)`;
      container.style.setProperty('--glow-x', `${state.glowX.toFixed(1)}px`);
      container.style.setProperty('--glow-y', `${state.glowY.toFixed(1)}px`);
      state.running = false;
      state.rafId = 0;
      return;
    }

    const deltaX = desiredX - state.pillX;
    state.pillX += deltaX * 0.18;
    state.pillW += (desiredW - state.pillW) * 0.18;
    state.glowX += (state.targetGlowX - state.glowX) * 0.25;
    state.glowY += (state.targetGlowY - state.glowY) * 0.25;

    if (Math.abs(deltaX) > 22) {
      audioEngine.playPillSlide(Math.min(1, Math.abs(deltaX) / 160));
    }

    pill.style.width = `${state.pillW.toFixed(2)}px`;
    pill.style.transform = `translate3d(${state.pillX.toFixed(2)}px, 0, 0)`;
    container.style.setProperty('--glow-x', `${state.glowX.toFixed(1)}px`);
    container.style.setProperty('--glow-y', `${state.glowY.toFixed(1)}px`);

    const settled =
      Math.abs(desiredX - state.pillX) < 0.08 &&
      Math.abs(desiredW - state.pillW) < 0.08 &&
      Math.abs(state.targetGlowX - state.glowX) < 0.15 &&
      Math.abs(state.targetGlowY - state.glowY) < 0.15;

    if (settled) {
      state.pillX = desiredX;
      state.pillW = desiredW;
      state.glowX = state.targetGlowX;
      state.glowY = state.targetGlowY;
      pill.style.width = `${state.pillW.toFixed(2)}px`;
      pill.style.transform = `translate3d(${state.pillX.toFixed(2)}px, 0, 0)`;
      container.style.setProperty('--glow-x', `${state.glowX.toFixed(1)}px`);
      container.style.setProperty('--glow-y', `${state.glowY.toFixed(1)}px`);
      state.running = false;
      state.rafId = 0;
    } else {
      state.rafId = window.requestAnimationFrame(stepAnimation);
    }
  }, [reducedMotion]);

  const scheduleLoop = useCallback(() => {
    const state = animStateRef.current;
    if (!state.running) {
      state.running = true;
      state.rafId = window.requestAnimationFrame(stepAnimation);
    }
  }, [stepAnimation]);

  const syncTargetPill = useCallback(
    (targetId: DockHighlightId, immediate = false) => {
      const btn = buttonRefs.current[targetId];
      if (!btn) return;

      const x = btn.offsetLeft;
      const w = btn.offsetWidth;
      const state = animStateRef.current;
      state.targetPillX = x;
      state.targetPillW = w;

      if (immediate || reducedMotion) {
        state.pillX = x + state.pullOffset;
        state.pillW = w;
        state.initialized = true;
        applyInstantPill(state.pillX, state.pillW);
      } else {
        scheduleLoop();
      }
    },
    [reducedMotion, applyInstantPill, scheduleLoop]
  );

  // Sinkronkan posisi pil ke tab/utilitas yang disorot di semua 7 item
  useEffect(() => {
    if (dockContext !== 'gallery') {
      animStateRef.current.initialized = false;
      setVolumeOpen(false);
      setHoveredUtility(null);
      return;
    }

    const targetId: DockHighlightId = hoveredId ?? focusedId ?? activeTab;
    const raf = window.requestAnimationFrame(() => {
      syncTargetPill(targetId, !animStateRef.current.initialized);
    });

    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        syncTargetPill(hoveredId ?? focusedId ?? activeTab, true);
      });
      ro.observe(container);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [dockContext, activeTab, hoveredId, focusedId, syncTargetPill]);

  useEffect(() => {
    if (hidden) {
      setVolumeOpen(false);
      setHoveredUtility(null);
    }
  }, [hidden]);

  useEffect(() => {
    const state = animStateRef.current;
    return () => {
      if (state.rafId) window.cancelAnimationFrame(state.rafId);
      if (volumeLeaveTimerRef.current) window.clearTimeout(volumeLeaveTimerRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const getRelativeCenterX = (el: HTMLElement | null): number | null => {
    const nav = navRef.current;
    if (!el || !nav) return null;
    const elRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return elRect.left - navRect.left + elRect.width * 0.5;
  };

  const openVolumePopover = useCallback(() => {
    if (volumeLeaveTimerRef.current) {
      window.clearTimeout(volumeLeaveTimerRef.current);
      volumeLeaveTimerRef.current = 0;
    }
    setHoveredUtility(null);
    setVolumeCenterX(getRelativeCenterX(soundBtnRef.current));
    setVolumeOpen(true);
  }, []);

  const scheduleCloseVolumePopover = useCallback(() => {
    if (volumeLeaveTimerRef.current) {
      window.clearTimeout(volumeLeaveTimerRef.current);
    }
    volumeLeaveTimerRef.current = window.setTimeout(() => {
      setVolumeOpen(false);
    }, 180);
  }, []);

  // Tutup popover volume jika klik di luar
  useEffect(() => {
    if (!volumeOpen) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setVolumeOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDownOutside);
    return () => window.removeEventListener('pointerdown', onPointerDownOutside);
  }, [volumeOpen]);

  const handleDockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const state = animStateRef.current;
    state.targetGlowX = localX;
    state.targetGlowY = localY;

    if (dockContext === 'gallery') {
      const targetId: DockHighlightId = hoveredId ?? focusedId ?? activeTab;
      const btn = buttonRefs.current[targetId];
      const scrollRow = scrollRowRef.current;
      if (btn && scrollRow) {
        const scrollX = e.clientX - scrollRow.getBoundingClientRect().left + scrollRow.scrollLeft;
        const btnCenter = btn.offsetLeft + btn.offsetWidth * 0.5;
        const delta = scrollX - btnCenter;
        state.pullOffset = Math.max(-6, Math.min(6, delta * 0.14));
      }
    } else {
      state.pullOffset = 0;
    }

    if (reducedMotion) {
      container.style.setProperty('--glow-x', `${localX.toFixed(1)}px`);
      container.style.setProperty('--glow-y', `${localY.toFixed(1)}px`);
    } else {
      scheduleLoop();
    }
  };

  const handleDockPointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDockHovered(true);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const state = animStateRef.current;
    state.targetGlowX = e.clientX - rect.left;
    state.targetGlowY = e.clientY - rect.top;
    if (!state.initialized) {
      state.glowX = state.targetGlowX;
      state.glowY = state.targetGlowY;
    }
    scheduleLoop();
  };

  const handleDockPointerLeave = () => {
    setIsDockHovered(false);
    setHoveredId(null);
    setHoveredUtility(null);
    animStateRef.current.pullOffset = 0;
    if (dockContext === 'gallery') {
      syncTargetPill(focusedId ?? activeTab);
    }
  };

  const makeOrigin = (el: HTMLButtonElement): DockTriggerOrigin => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
      buttonEl: el,
    };
  };

  const handleItemEnter = (id: DockHighlightId, utilityMeta?: { id: UtilityId; label: string }) => {
    setHoveredId(id);
    audioEngine.playDockHover();
    if (utilityMeta) {
      if (utilityMeta.id === 'sound') {
        openVolumePopover();
      } else {
        const cx = getRelativeCenterX(buttonRefs.current[id]);
        if (cx !== null) {
          setHoveredUtility({ id: utilityMeta.id, label: utilityMeta.label, centerX: cx });
        }
      }
    } else {
      setHoveredUtility(null);
    }
  };

  const handleSoundPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    const targetBtn = e.currentTarget;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setVolumeCenterX(getRelativeCenterX(targetBtn));
      setVolumeOpen(true);
      window.requestAnimationFrame(() => volumeSliderRef.current?.focus());
    }, 420);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = 0;
    }
  };

  const handleSoundClick = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onToggleSound();
  };

  const handleSoundKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      openVolumePopover();
      window.requestAnimationFrame(() => volumeSliderRef.current?.focus());
    } else if (e.key === 'Escape' && volumeOpen) {
      e.preventDefault();
      setVolumeOpen(false);
    }
  };

  const formattedCounter = `${String(detailIndex + 1).padStart(2, '0')} / ${String(detailTotal).padStart(2, '0')}`;
  const volPercent = Math.round(masterVolume * 100);

  return (
    <motion.nav
      ref={navRef}
      aria-label="Navigasi Utama Portofolio"
      initial={false}
      animate={hidden ? { y: 96, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={
        reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 28 }
      }
      className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[105] max-w-[calc(100vw-16px)] ${
        hidden ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      {/* Tooltip Label Utilitas (tidak terpotong oleh overflow-hidden) */}
      {dockContext === 'gallery' && hoveredUtility && !volumeOpen && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 bg-[#120A0D] border border-[#2B1218] rounded-[4px] font-mono text-xs text-[#F6EEF0] tracking-[0.06em] uppercase whitespace-nowrap shadow-[0_8px_20px_rgba(0,0,0,0.7)] z-30"
          style={{ left: `${hoveredUtility.centerX}px` }}
        >
          {hoveredUtility.label}
        </div>
      )}

      {/* Popover Slider Volume Master di Atas Tombol Suara */}
      {dockContext === 'gallery' && volumeOpen && (
        <div
          role="region"
          aria-label="Pengatur Volume Master"
          onPointerEnter={() => {
            if (volumeLeaveTimerRef.current) {
              window.clearTimeout(volumeLeaveTimerRef.current);
              volumeLeaveTimerRef.current = 0;
            }
          }}
          onPointerLeave={scheduleCloseVolumePopover}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setVolumeOpen(false);
              soundBtnRef.current?.focus();
            }
          }}
          className="absolute bottom-full mb-2.5 -translate-x-1/2 w-52 bg-[#120A0D] border border-[#2B1218] rounded-[4px] p-3 shadow-[0_14px_34px_rgba(0,0,0,0.82)] z-30"
          style={{
            left:
              volumeCenterX !== null
                ? `clamp(108px, ${volumeCenterX}px, calc(100% - 108px))`
                : '80%',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-xs tracking-[0.08em] text-[#A8969B] uppercase">
              Volume Master
            </span>
            <span className="font-mono text-xs font-semibold text-[#EF233C] tabular-nums">
              {soundEnabled ? `${volPercent}%` : 'MATI'}
            </span>
          </div>

          <input
            ref={volumeSliderRef}
            type="range"
            min={0}
            max={100}
            step={5}
            value={volPercent}
            aria-label="Volume master audio"
            aria-valuetext={`${volPercent} persen`}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="w-full h-2 bg-[#080507] border border-[#2B1218] rounded-full accent-[#EF233C] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          />

          <div className="flex items-center justify-between mt-1.5 font-mono text-xs text-[#A8969B]">
            <span>{soundEnabled ? 'Aktif' : 'Klik ikon untuk nyalakan'}</span>
          </div>
        </div>
      )}

      {/* Satu-satunya elemen glassmorphism: kapsul Dock Island kontekstual */}
      <motion.div
        ref={containerRef}
        layout={!reducedMotion}
        transition={
          reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }
        }
        onPointerEnter={handleDockPointerEnter}
        onPointerMove={handleDockPointerMove}
        onPointerLeave={handleDockPointerLeave}
        className="relative bg-[#090507]/90 backdrop-blur-2xl border border-[#EFE7E1]/12 shadow-[0_14px_40px_rgba(0,0,0,0.85)] rounded-[12px] px-1.5 sm:px-2 py-1.5"
        style={
          {
            '--glow-x': '50%',
            '--glow-y': '50%',
          } as React.CSSProperties
        }
      >
        {/* Cahaya radial aksen terklip di lapisan latar kapsul */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[10px] overflow-hidden"
        >
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              opacity: isDockHovered ? 1 : 0,
              background:
                'radial-gradient(160px circle at var(--glow-x) var(--glow-y), rgba(239, 35, 60, 0.26), transparent 72%)',
            }}
          />
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {dockContext === 'gallery' && (
            <motion.div
              key="dock-gallery"
              ref={scrollRowRef}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="relative z-10 flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar max-w-[calc(100vw-28px)]"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setFocusedId(null);
                  setHoveredUtility(null);
                }
              }}
            >
              {/* Pil magnetik aktif meliputi tab navigasi DAN utilitas */}
              <div
                ref={pillRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-0 -skew-x-12 bg-[#EF233C] shadow-[0_8px_20px_rgba(239,35,60,0.32)]"
                style={{ willChange: 'transform, width' }}
              />

              {/* 4 Tab Navigasi Utama */}
              {DOCK_TABS.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                const isHighlighted = (hoveredId ?? focusedId ?? activeTab) === id;
                return (
                  <button
                    key={id}
                    ref={(el) => {
                      buttonRefs.current[id] = el;
                    }}
                    type="button"
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => {
                      audioEngine.playTabClick();
                      onSelectTab(id, makeOrigin(e.currentTarget));
                    }}
                    onPointerEnter={() => handleItemEnter(id)}
                    onFocus={() => {
                      setFocusedId(id);
                      setHoveredUtility(null);
                    }}
                    className={`relative z-10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center sm:gap-2 px-2 sm:px-3.5 py-2 rounded-[8px] font-sans text-[13px] tracking-normal transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                      isHighlighted
                        ? 'text-[#FFF6F2] font-semibold'
                        : isActive
                          ? 'text-[#F6EEF0]'
                          : 'text-[#A8969B] hover:text-[#F6EEF0]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive || isHighlighted ? 'text-[#EF233C]' : 'text-[#A8969B]'
                      }`}
                    />
                    <span className="hidden sm:inline">{label}</span>

                    {/* Penanda persisten tab aktif meski pil sedang meluncur ke tombol lain */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-[#EF233C]"
                      />
                    )}
                  </button>
                );
              })}

              {/* Pemisah Tipis Antara Navigasi & Utilitas */}
              <div
                className="w-px h-5 bg-[#2B1218] mx-0.5 sm:mx-1 shrink-0"
                aria-hidden="true"
              />

              {/* Kelompok Utilitas: Indeks, Suara (+ Popover Volume), Ulang Intro */}
              <button
                ref={(el) => {
                  buttonRefs.current.index = el;
                }}
                type="button"
                aria-expanded={indexOpen}
                aria-label="Indeks lembar kontak 10 frame"
                onClick={(e) => {
                  audioEngine.playTabClick();
                  onOpenIndex(e.currentTarget);
                }}
                onPointerEnter={() =>
                  handleItemEnter('index', { id: 'index', label: 'Indeks 10 Frame' })
                }
                onFocus={() => {
                  setFocusedId('index');
                  const cx = getRelativeCenterX(buttonRefs.current.index);
                  if (cx !== null) {
                    setHoveredUtility({ id: 'index', label: 'Indeks 10 Frame', centerX: cx });
                  }
                }}
                className={`relative z-10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-colors duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                  hoveredId === 'index' || focusedId === 'index' || indexOpen
                    ? 'text-[#EF233C]'
                    : 'text-[#A8969B] hover:text-[#F6EEF0]'
                }`}
              >
                <IconContactSheet className="w-4 h-4 shrink-0" />
              </button>

              <button
                ref={(el) => {
                  buttonRefs.current.sound = el;
                  soundBtnRef.current = el;
                }}
                type="button"
                aria-pressed={soundEnabled}
                aria-label={
                  soundEnabled
                    ? `Matikan suara (volume ${volPercent}%, tekan panah atas untuk atur volume)`
                    : 'Aktifkan suara rana dan ambience bandara'
                }
                onPointerDown={handleSoundPointerDown}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
                onPointerLeave={() => {
                  clearLongPress();
                  scheduleCloseVolumePopover();
                }}
                onClick={handleSoundClick}
                onKeyDown={handleSoundKeyDown}
                onPointerEnter={() =>
                  handleItemEnter('sound', {
                    id: 'sound',
                    label: soundEnabled ? 'Suara Aktif' : 'Suara Mati',
                  })
                }
                onFocus={() => {
                  setFocusedId('sound');
                  setHoveredUtility(null);
                }}
                className={`relative z-10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-colors duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                  soundEnabled || hoveredId === 'sound' || focusedId === 'sound'
                    ? 'text-[#EF233C]'
                    : 'text-[#A8969B] hover:text-[#F6EEF0]'
                }`}
              >
                {soundEnabled ? (
                  <IconAudioOn className="w-4 h-4 shrink-0" />
                ) : (
                  <IconAudioOff className="w-4 h-4 shrink-0" />
                )}
                {soundEnabled && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] rounded-full bg-[#EF233C]"
                  />
                )}
              </button>

              <button
                ref={(el) => {
                  buttonRefs.current.replay = el;
                }}
                type="button"
                aria-label="Ulang intro pendekatan pesawat"
                onClick={() => {
                  audioEngine.playTabClick();
                  onReplayIntro();
                }}
                onPointerEnter={() =>
                  handleItemEnter('replay', { id: 'replay', label: 'Ulang Intro' })
                }
                onFocus={() => {
                  setFocusedId('replay');
                  const cx = getRelativeCenterX(buttonRefs.current.replay);
                  if (cx !== null) {
                    setHoveredUtility({ id: 'replay', label: 'Ulang Intro', centerX: cx });
                  }
                }}
                className={`relative z-10 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition-colors duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                  hoveredId === 'replay' || focusedId === 'replay'
                    ? 'text-[#EF233C]'
                    : 'text-[#A8969B] hover:text-[#F6EEF0]'
                }`}
              >
                <IconReplay className="w-4 h-4 shrink-0" />
              </button>
            </motion.div>
          )}

          {dockContext === 'detail' && (
            <motion.div
              key="dock-detail"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="relative z-10 flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(100vw-28px)]"
            >
              <button
                type="button"
                onClick={onPrevFrame}
                onPointerEnter={() => audioEngine.playDockHover()}
                aria-label="Frame sebelumnya"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-[8px] font-sans text-[13px] tracking-normal text-[#F6EEF0] hover:bg-[#EF233C]/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <IconPrev className="w-4 h-4 text-[#EF233C] shrink-0" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <div
                className="px-1.5 sm:px-2.5 py-2 font-mono text-xs font-medium tracking-wider text-[#EF233C] tabular-nums whitespace-nowrap shrink-0 select-none"
                aria-live="polite"
              >
                {formattedCounter}
              </div>

              <button
                type="button"
                onClick={onNextFrame}
                onPointerEnter={() => audioEngine.playDockHover()}
                aria-label="Frame berikutnya"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-[8px] font-sans text-[13px] tracking-normal text-[#F6EEF0] hover:bg-[#EF233C]/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <IconNext className="w-4 h-4 text-[#EF233C] shrink-0" />
              </button>

              <div className="w-px h-5 bg-[#2B1218] mx-0.5 shrink-0" aria-hidden="true" />

              <button
                type="button"
                onClick={(e) => {
                  audioEngine.playTabClick();
                  onRequestLicense(makeOrigin(e.currentTarget));
                }}
                onPointerEnter={() => audioEngine.playDockHover()}
                aria-label="Minta lisensi frame ini"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-[8px] font-sans text-[13px] tracking-normal text-[#F6EEF0] hover:bg-[#EF233C]/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <IconLicense className="w-4 h-4 text-[#EF233C] shrink-0" />
                <span className="hidden sm:inline">Lisensi</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  audioEngine.playTabClick();
                  onOpenLightbox(e.currentTarget);
                }}
                onPointerEnter={() => audioEngine.playDockHover()}
                aria-label="Buka foto utuh di lightbox"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-[8px] font-sans text-[13px] tracking-normal text-[#F6EEF0] hover:bg-[#EF233C]/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <IconExpand className="w-4 h-4 text-[#EF233C] shrink-0" />
                <span className="hidden sm:inline">Lightbox</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playBackClick();
                  onExitDetail();
                }}
                onPointerEnter={() => audioEngine.playDockHover()}
                aria-label="Kembali ke galeri"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-[8px] font-sans text-[13px] font-semibold tracking-normal text-[#080507] bg-[#EF233C] hover:bg-[#FF5A6E] active:bg-[#D90429] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IconBack className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Kembali</span>
              </button>
            </motion.div>
          )}

          {dockContext === 'modal' && (activeTab === 'gear' || activeTab === 'specs' || activeTab === 'contact') && (
            <motion.div
              key="dock-modal"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="relative z-10 flex items-center gap-2 pl-3 pr-1 max-w-[calc(100vw-28px)]"
            >
              <span className="font-mono text-xs font-medium tracking-[0.1em] text-[#EF233C] uppercase whitespace-nowrap truncate">
                {MODAL_LABELS[activeTab]}
              </span>

              <div className="w-px h-5 bg-[#2B1218] shrink-0" aria-hidden="true" />

              <button
                type="button"
                onClick={() => {
                  audioEngine.playBackClick();
                  onCloseModal();
                }}
                aria-label="Tutup panel"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-sans text-[13px] font-semibold tracking-normal text-[#080507] bg-[#EF233C] hover:bg-[#FF5A6E] active:bg-[#D90429] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <IconClose className="w-4 h-4 shrink-0" />
                <span>Tutup</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
};
