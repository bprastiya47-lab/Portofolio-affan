import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PORTFOLIO_ITEMS, PortfolioItem } from './data/portfolioData';
import { SceneCanvas } from './components/three/SceneCanvas';
import { GalleryLoadProgress } from './components/three/GalleryCylinder';
import { HeaderHud, NavTab } from './components/ui/HeaderHud';
import { DockTriggerOrigin, NavigationDock } from './components/ui/NavigationDock';
import { InspectionDock } from './components/ui/InspectionDock';
import { SplitFlapHero } from './components/ui/SplitFlapHero';
import { CockpitCursor } from './components/ui/CockpitCursor';
import { ApertureMode, ApertureTransition } from './components/ui/ApertureTransition';
import { HeroProfile } from './components/hero/HeroProfile';
import {
  ContactPrefill,
  ContactSheetModal,
  LightboxModal,
  SectionOverlays,
} from './components/ui/SectionOverlays';
import { audioEngine } from './audio/audioEngine';

function parseFrameHash(hash: string, items: PortfolioItem[]): string | null {
  const match = /^#frame-(\d{1,2})$/i.exec(hash.trim());
  if (!match) return null;
  const label = match[1].padStart(2, '0');
  const found = items.find((item) => item.indexLabel === label);
  return found ? found.id : null;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

function useTabVisibility(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return visible;
}

export default function App() {
  const reducedMotion = usePrefersReducedMotion();
  const tabVisible = useTabVisibility();
  const items = PORTFOLIO_ITEMS;

  const initialFrameId = useMemo(
    () =>
      typeof window !== 'undefined'
        ? parseFrameHash(window.location.hash, PORTFOLIO_ITEMS)
        : null,
    []
  );

  // Intro SELALU diputar saat halaman dimuat (kecuali tautan langsung #frame-XX)
  const [phase, setPhase] = useState<'intro' | 'hero' | 'gallery'>(() =>
    initialFrameId ? 'gallery' : 'intro'
  );
  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    initialFrameId ? 'gallery' : 'hero'
  );
  const [belialState, setBelialState] = useState({
    progress: 0,
    belialMood: false,
    overSilhouette: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialFrameId);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<PortfolioItem | null>(null);
  const [triggerOrigin, setTriggerOrigin] = useState<DockTriggerOrigin | null>(null);
  const [contactPrefill, setContactPrefill] = useState<ContactPrefill | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxReturnEl, setLightboxReturnEl] = useState<HTMLElement | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [indexReturnEl, setIndexReturnEl] = useState<HTMLElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => audioEngine.getEnabled());
  const [masterVolume, setMasterVolume] = useState<number>(() => audioEngine.getMasterVolume());

  const [sceneReady, setSceneReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState<GalleryLoadProgress>({
    loaded: 0,
    total: 1,
    loading: true,
  });
  const [progressVisible, setProgressVisible] = useState(true);

  const [aperture, setAperture] = useState<{ mode: ApertureMode; key: number }>({ mode: 'idle', key: 0 });
  const [heroEntry, setHeroEntry] = useState<'fresh' | 'return'>('fresh');
  const [heroEnterSignal, setHeroEnterSignal] = useState(0);

  const headingFloatRef = useRef(0);
  const prevModalOpenRef = useRef(false);
  const apertureBusyRef = useRef(false);

  const selectedIndex = useMemo(
    () => (selectedId ? items.findIndex((i) => i.id === selectedId) : -1),
    [items, selectedId]
  );

  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;
  const isModalTab = activeTab === 'gear' || activeTab === 'specs' || activeTab === 'contact';
  const isBelialMood = phase === 'hero' && belialState.belialMood;

  // Sinkronkan tema aksen global data-mood="belial" (merah bara <-> cyan radar)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isBelialMood) {
      document.documentElement.setAttribute('data-mood', 'belial');
    } else {
      document.documentElement.removeAttribute('data-mood');
    }
    return () => {
      document.documentElement.removeAttribute('data-mood');
    };
  }, [isBelialMood]);

  // Judul tab browser dinamis
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (selectedItem) {
      document.title = `Dikut Affan Aryansyah · FANZ FIGHTERS · ${selectedItem.indexLabel} ${selectedItem.operator} ${selectedItem.aircraft}`;
    } else if (isBelialMood) {
      document.title = 'BELIAL · Dark Galactic Emperor · FANZ FIGHTERS';
    } else {
      document.title = 'Dikut Affan Aryansyah · FANZ FIGHTERS';
    }
  }, [selectedItem, isBelialMood]);

  // Sinkronisasi pengaturan reduced-motion, visibilitas tab, mode adegan, dan ducking 60% ke audioEngine
  useEffect(() => {
    audioEngine.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    audioEngine.setTabVisible(tabVisible);
  }, [tabVisible]);

  useEffect(() => {
    audioEngine.setSceneMode(phase);
  }, [phase]);

  useEffect(() => {
    const isModalOrDetail =
      selectedId !== null || isModalTab || lightboxOpen || indexOpen;
    audioEngine.setDucked(isModalOrDetail);
  }, [selectedId, isModalTab, lightboxOpen, indexOpen]);

  // Whoosh buka/tutup modal saat status modal berubah
  useEffect(() => {
    const modalOpenNow = isModalTab || indexOpen;
    if (modalOpenNow && !prevModalOpenRef.current) {
      audioEngine.playModalOpen();
    } else if (!modalOpenNow && prevModalOpenRef.current) {
      audioEngine.playModalClose();
    }
    prevModalOpenRef.current = modalOpenNow;
  }, [isModalTab, indexOpen]);

  // Gestur pertama pengguna membuka AudioContext sesuai kebijakan autoplay browser
  useEffect(() => {
    const onFirstGesture = () => {
      audioEngine.markUserGesture();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', onFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, []);

  useEffect(() => {
    return () => audioEngine.dispose();
  }, []);

  const normalizedProgress = useMemo(() => {
    const scenePart = sceneReady ? 0.25 : 0.08;
    const texRatio =
      loadProgress.total > 0 ? Math.min(1, loadProgress.loaded / loadProgress.total) : 0;
    return Math.min(1, scenePart + texRatio * 0.75);
  }, [sceneReady, loadProgress]);

  useEffect(() => {
    const isBusy = !sceneReady || loadProgress.loading || loadProgress.loaded < loadProgress.total;
    if (isBusy) {
      setProgressVisible(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setProgressVisible(false);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [sceneReady, loadProgress]);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const handleLoadProgress = useCallback((progress: GalleryLoadProgress) => {
    setLoadProgress(progress);
  }, []);

  const syncHashForFrame = useCallback(
    (id: string | null, mode: 'push' | 'replace') => {
      if (typeof window === 'undefined') return;
      if (!id) {
        if (window.location.hash) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );
        }
        return;
      }
      const found = items.find((i) => i.id === id);
      if (!found) return;
      const nextHash = `#frame-${found.indexLabel}`;
      if (window.location.hash === nextHash) return;
      if (mode === 'push') {
        window.history.pushState({ frameId: id }, '', nextHash);
      } else {
        window.history.replaceState({ frameId: id }, '', nextHash);
      }
    },
    [items]
  );

  useEffect(() => {
    const onHashOrPop = () => {
      const parsedId = parseFrameHash(window.location.hash, items);
      if (parsedId) {
        setPhase('gallery');
        setActiveTab('gallery');
        setIndexOpen(false);
        setSelectedId(parsedId);
      } else {
        setLightboxOpen(false);
        setSelectedId(null);
      }
    };
    window.addEventListener('popstate', onHashOrPop);
    window.addEventListener('hashchange', onHashOrPop);
    return () => {
      window.removeEventListener('popstate', onHashOrPop);
      window.removeEventListener('hashchange', onHashOrPop);
    };
  }, [items]);

  const handleIntroComplete = useCallback(() => {
    setHeroEntry('fresh');
    setActiveTab('hero');
    setPhase('hero');
  }, []);

  // Hero -> Galeri: hero sendiri sudah menggulir sampai gelap (scrub); di sini hanya pergantian fase,
  // lalu diafragma membuka dari tertutup untuk mengungkap galeri.
  const commitEnterGallery = useCallback(() => {
    setHoveredItem(null);
    setBelialState({ progress: 0, belialMood: false, overSilhouette: false });
    setActiveTab('gallery');
    setPhase('gallery');
    setAperture((a) => ({ mode: reducedMotion ? 'idle' : 'open', key: a.key + 1 }));
  }, [reducedMotion]);

  const handleEnterGallery = commitEnterGallery;

  // Galeri -> Hero: diafragma menutup, ganti fase, hero muncul dari posisi tergulir lalu mundur ke awal
  const startReturnToHero = useCallback(() => {
    if (apertureBusyRef.current) return;
    setHoveredItem(null);
    setActiveTab('hero');
    if (reducedMotion) {
      setHeroEntry('fresh');
      setPhase('hero');
      return;
    }
    apertureBusyRef.current = true;
    setAperture((a) => ({ mode: 'close', key: a.key + 1 }));
  }, [reducedMotion]);

  const handleApertureClosed = useCallback(() => {
    setHeroEntry('return');
    setActiveTab('hero');
    setPhase('hero');
    setAperture((a) => ({ mode: 'open', key: a.key + 1 }));
  }, []);

  const handleApertureOpened = useCallback(() => {
    apertureBusyRef.current = false;
    setAperture((a) => ({ mode: 'idle', key: a.key }));
  }, []);

  // Failsafe 8.0s agar intro tetap masuk hero profil bila perangkat sangat lambat, tanpa memotong animasi 3.6s
  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = window.setTimeout(() => {
      setActiveTab('hero');
      setPhase('hero');
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const handleReplayIntro = useCallback(() => {
    apertureBusyRef.current = false;
    setAperture((a) => ({ mode: 'idle', key: a.key }));
    setHeroEntry('fresh');
    setLightboxOpen(false);
    setIndexOpen(false);
    setSelectedId(null);
    setHoveredItem(null);
    setBelialState({ progress: 0, belialMood: false, overSilhouette: false });
    setActiveTab('hero');
    syncHashForFrame(null, 'replace');
    setPhase('intro');
  }, [syncHashForFrame]);

  const handleSelectItem = useCallback(
    (id: string) => {
      setHoveredItem(null);
      setIndexOpen(false);
      setPhase('gallery');
      setSelectedId(id);
      setActiveTab('gallery');
      syncHashForFrame(id, 'push');
      audioEngine.playDetailShutter();
    },
    [syncHashForFrame]
  );

  const handleExitDetail = useCallback(() => {
    setLightboxOpen(false);
    setSelectedId(null);
    syncHashForFrame(null, 'replace');
  }, [syncHashForFrame]);

  const handleHeadingFrame = useCallback((degFloat: number) => {
    headingFloatRef.current = degFloat;
  }, []);

  const handleActiveIndexChange = useCallback((idx: number, degInt: number) => {
    setActiveFrameIndex(idx);
    setHeadingDeg(degInt);
  }, []);

  const handleCycle = useCallback(
    (dir: -1 | 1) => {
      if (!selectedId) return;
      const idx = items.findIndex((i) => i.id === selectedId);
      if (idx < 0) return;
      const nextIdx = (idx + dir + items.length) % items.length;
      const nextId = items[nextIdx].id;
      setSelectedId(nextId);
      syncHashForFrame(nextId, 'replace');
      audioEngine.playCarouselTick();
    },
    [items, selectedId, syncHashForFrame]
  );

  const handleSelectDockTab = useCallback(
    (tab: NavTab, origin?: DockTriggerOrigin) => {
      if (apertureBusyRef.current) return;
      setIndexOpen(false);
      if (tab === 'hero') {
        // Dari Galeri murni (tanpa modal/inspeksi): diafragma menutup lalu hero muncul kembali
        if (phase === 'gallery' && !selectedId && !isModalTab && !lightboxOpen) {
          startReturnToHero();
          return;
        }
        setLightboxOpen(false);
        setSelectedId(null);
        setHoveredItem(null);
        syncHashForFrame(null, 'replace');
        setHeroEntry('fresh');
        setActiveTab('hero');
        setPhase('hero');
        return;
      }
      if (tab === 'gallery') {
        if (phase === 'hero' && !isModalTab) {
          // Hero menggulir sendiri sampai gelap, lalu memanggil handleEnterGallery
          setHeroEnterSignal((n) => n + 1);
          return;
        }
        setPhase('gallery');
        setActiveTab('gallery');
        setLightboxOpen(false);
        setSelectedId(null);
        syncHashForFrame(null, 'replace');
        return;
      }
      if (origin) setTriggerOrigin(origin);
      setHoveredItem(null);
      setActiveTab(tab);
    },
    [syncHashForFrame, phase, selectedId, isModalTab, lightboxOpen, startReturnToHero]
  );

  const handleCloseModal = useCallback(() => {
    setActiveTab(phase === 'hero' ? 'hero' : 'gallery');
  }, [phase]);

  const handleRequestLicense = useCallback(
    (item: PortfolioItem, origin: DockTriggerOrigin) => {
      setTriggerOrigin(origin);
      setContactPrefill({
        aircraft: item.aircraft,
        operator: item.operator,
        registration: item.registration,
        indexLabel: item.indexLabel,
        key: Date.now(),
      });
      setActiveTab('contact');
    },
    []
  );

  const handleRequestLicenseFromDock = useCallback(
    (origin: DockTriggerOrigin) => {
      if (!selectedItem) return;
      handleRequestLicense(selectedItem, origin);
    },
    [selectedItem, handleRequestLicense]
  );

  const handleOpenLightbox = useCallback((triggerEl: HTMLButtonElement) => {
    setLightboxReturnEl(triggerEl);
    setLightboxOpen(true);
  }, []);

  const handleOpenIndex = useCallback((triggerEl: HTMLButtonElement) => {
    setIndexReturnEl(triggerEl);
    setHoveredItem(null);
    setActiveTab((prev) => (prev === 'gear' || prev === 'specs' || prev === 'contact' ? (phase === 'hero' ? 'hero' : 'gallery') : prev));
    setIndexOpen(true);
  }, [phase]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      audioEngine.setEnabled(next);
      if (next) {
        audioEngine.playTabClick();
      }
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
  }, []);

  // Pintasan keyboard: Esc untuk kembali & Panah kiri/kanan di mode detail
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen || indexOpen) return;
      if (e.key === 'Escape') {
        if (isModalTab) {
          handleCloseModal();
        } else if (selectedId) {
          audioEngine.playBackClick();
          handleExitDetail();
        }
      } else if (selectedId && !isModalTab) {
        if (e.key === 'ArrowLeft') handleCycle(-1);
        if (e.key === 'ArrowRight') handleCycle(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalTab, selectedId, lightboxOpen, indexOpen, handleCycle, handleExitDetail, handleCloseModal]);

  const over3dFrame =
    phase === 'gallery' &&
    !selectedId &&
    !isModalTab &&
    !lightboxOpen &&
    !indexOpen &&
    hoveredItem !== null;

  const overBelialSilhouette =
    phase === 'hero' && !isModalTab && !indexOpen && belialState.overSilhouette;

  return (
    <main
      data-mood={isBelialMood ? 'belial' : 'cockpit'}
      className={`relative w-screen h-screen overflow-hidden bg-[#080507] select-none ${
        over3dFrame || overBelialSilhouette ? 'cursor-pointer' : ''
      }`}
    >
      {/* Garis Progress Pemuatan Tipis di Puncak Layar (Instrumen Kokpit) */}
      <div
        role="progressbar"
        aria-label="Memuat frame fotografi dan model 3D"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(normalizedProgress * 100)}
        aria-hidden={!progressVisible}
        className={`pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[2px] bg-[#2B1218]/60 transition-opacity duration-300 ${
          progressVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="h-full bg-[#EF233C] origin-left transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ transform: `scaleX(${normalizedProgress.toFixed(3)})` }}
        />
      </div>

      {/* Kanvas WebGL Stratosfer & Karusel Galeri 3D */}
      <SceneCanvas
        items={items}
        phase={phase}
        selectedId={selectedId}
        overlayOpen={isModalTab || lightboxOpen || indexOpen}
        reducedMotion={reducedMotion}
        tabVisible={tabVisible}
        onIntroComplete={handleIntroComplete}
        onSelectItem={handleSelectItem}
        onHoverItem={setHoveredItem}
        onHeadingFrame={handleHeadingFrame}
        onActiveIndexChange={handleActiveIndexChange}
        onLoadProgress={handleLoadProgress}
        onSceneReady={handleSceneReady}
      />

      {/* Adegan Hero Profil + Transformasi Interaktif Belial (Setelah Intro, Sebelum Galeri) */}
      <HeroProfile
        active={phase === 'hero'}
        tabVisible={tabVisible}
        reducedMotion={reducedMotion}
        entry={heroEntry}
        enterSignal={heroEnterSignal}
        inputLocked={isModalTab || lightboxOpen || indexOpen}
        onEnterGallery={handleEnterGallery}
        onBelialStateChange={setBelialState}
      />

      {/* Diafragma kamera: pembuka galeri dan penutup saat kembali ke beranda */}
      <ApertureTransition
        mode={aperture.mode}
        runKey={aperture.key}
        reducedMotion={reducedMotion}
        onClosed={handleApertureClosed}
        onOpened={handleApertureOpened}
      />

      {/* Vignette Kokpit Gelap & Grain Sensor Tipis */}
      <div className="pointer-events-none fixed inset-0 z-10 cockpit-vignette" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 z-10 sensor-grain" aria-hidden="true" />

      {/* Kursor Khusus Desktop: Lingkaran Kecil -> "BUKA 3D", "LIHAT", atau Cincin Energi "BELIAL" */}
      <CockpitCursor
        overFrame={over3dFrame}
        overSilhouette={overBelialSilhouette}
        belialMood={isBelialMood}
        frameRegistration={hoveredItem?.registration}
        disabled={phase === 'intro'}
        reducedMotion={reducedMotion}
      />

      {/* HUD Intro Touchdown + Tombol Lewati Intro (menuju Hero Profil) */}
      {phase === 'intro' && (
        <>
          <div className="fixed top-6 left-4 sm:left-6 md:left-10 z-30 pointer-events-none bg-[#120A0D]/90 border border-[#2B1218] rounded-[4px] px-3.5 py-2.5 max-w-[calc(100vw-32px)]">
            <p className="font-mono text-xs tracking-[0.14em] text-[#EF233C] uppercase tabular-nums">
              ALT 2,400 FT · HDG 250° · APPROACH
            </p>
            <p className="font-display text-2xl md:text-3xl font-bold tracking-wider text-[#F6EEF0] uppercase mt-1 leading-none">
              Boeing 777-300ER — Korean Air
            </p>
            <p className="font-mono text-xs tracking-[0.12em] text-[#A8969B] uppercase mt-1 tabular-nums">
              REG HL8209 · RWY 25R FINAL TOUCHDOWN
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              audioEngine.playBackClick();
              handleIntroComplete();
            }}
            className="min-h-[44px] inline-flex items-center fixed bottom-6 right-4 sm:right-6 md:bottom-8 md:right-10 z-30 px-4 py-2 bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] font-mono text-xs tracking-[0.14em] text-[#F6EEF0] hover:text-[#EF233C] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
          >
            Lewati Intro
          </button>
        </>
      )}

      {/* Header HUD 3 Kelompok Tanpa Tombol (Monogram · Jam WIB/UTC & Kompas · Status Statis) */}
      <HeaderHud
        headingFloatRef={headingFloatRef}
        headingDeg={headingDeg}
        activeIndex={activeFrameIndex}
        totalItems={items.length}
        reducedMotion={reducedMotion}
        visible={phase === 'hero' || phase === 'gallery'}
        belialMood={isBelialMood}
      />

      {/* Scrim Gradien Gelap Tipis di Belakang Blok Judul Hero Galeri */}
      {phase === 'gallery' && !selectedItem && !isModalTab && !indexOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-0 inset-x-0 h-[210px] sm:h-[230px] z-[15] bg-gradient-to-b from-[#080507]/94 via-[#080507]/72 to-transparent"
        />
      )}

      {/* Judul Hero Papan Flip Bandara di Galeri ("FANZ FIGHTERS" + "@fanzfighters_pict") */}
      {phase === 'gallery' && !selectedItem && !isModalTab && !indexOpen && (
        <SplitFlapHero reducedMotion={reducedMotion} />
      )}

      {/* Panduan Interaksi Ringkas di Atas Dock */}
      {phase === 'gallery' && !selectedItem && !isModalTab && !indexOpen && (
        <p className="fixed bottom-[82px] sm:bottom-[86px] left-1/2 -translate-x-1/2 z-20 pointer-events-none font-sans text-[13px] text-[#B4A3A8] text-center max-w-[calc(100vw-24px)] px-3">
          <span className="hidden sm:inline">
            Seret atau gulir untuk memutar karusel. Klik sebuah frame untuk inspeksi 3D.
          </span>
          <span className="sm:hidden">Geser untuk memutar. Ketuk frame untuk detail.</span>
        </p>
      )}

      {/* Panel Telemetri EXIF + Aksi Lisensi & Lightbox di Mode Detail */}
      {phase === 'gallery' && selectedItem && !isModalTab && !lightboxOpen && !indexOpen && (
        <InspectionDock
          item={selectedItem}
          onRequestLicense={handleRequestLicense}
          onOpenLightbox={handleOpenLightbox}
        />
      )}

      {/* Satu Dock Island Pusat Kendali Kontekstual (Beranda · Galeri · Peralatan · Spesifikasi · Kontak) */}
      <NavigationDock
        activeTab={activeTab}
        inDetailMode={selectedItem !== null}
        detailIndex={selectedIndex >= 0 ? selectedIndex : activeFrameIndex}
        detailTotal={items.length}
        reducedMotion={reducedMotion}
        hidden={phase === 'intro' || lightboxOpen || indexOpen}
        soundEnabled={soundEnabled}
        masterVolume={masterVolume}
        indexOpen={indexOpen}
        onSelectTab={handleSelectDockTab}
        onCloseModal={handleCloseModal}
        onPrevFrame={() => handleCycle(-1)}
        onNextFrame={() => handleCycle(1)}
        onExitDetail={handleExitDetail}
        onRequestLicense={handleRequestLicenseFromDock}
        onOpenLightbox={handleOpenLightbox}
        onOpenIndex={handleOpenIndex}
        onToggleSound={handleToggleSound}
        onVolumeChange={handleVolumeChange}
        onReplayIntro={handleReplayIntro}
      />

      {/* Modal Kontekstual (Peralatan, Spesifikasi, Kontak) */}
      <SectionOverlays
        activeTab={activeTab}
        reducedMotion={reducedMotion}
        triggerOrigin={triggerOrigin}
        contactPrefill={contactPrefill}
        onClose={handleCloseModal}
      />

      {/* Tampilan Indeks Lembar Kontak 10 Frame */}
      <ContactSheetModal
        open={indexOpen}
        items={items}
        activeId={selectedId ?? items[activeFrameIndex]?.id ?? null}
        reducedMotion={reducedMotion}
        returnFocusEl={indexReturnEl}
        onClose={() => setIndexOpen(false)}
        onSelectFrame={handleSelectItem}
      />

      {/* Lightbox Layar Penuh Tanpa Efek Miring 3D */}
      <LightboxModal
        item={lightboxOpen ? selectedItem : null}
        totalItems={items.length}
        reducedMotion={reducedMotion}
        returnFocusEl={lightboxReturnEl}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => handleCycle(-1)}
        onNext={() => handleCycle(1)}
      />
    </main>
  );
}
