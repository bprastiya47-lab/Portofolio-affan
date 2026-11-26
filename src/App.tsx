import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { IntroFlyby } from './components/intro/IntroFlyby';
import { HeroSection } from './components/hero/HeroSection';
import { AboutSection } from './components/sections/AboutSection';
import { GallerySection } from './components/sections/GallerySection';
import { ContactFooter } from './components/sections/ContactFooter';
import { Navbar, SectionId } from './components/ui/Navbar';
import { CustomCursor } from './components/ui/CustomCursor';
import { audioEngine } from './audio/audioEngine';
import { supportsWebGL } from './utils/webglDetect';

gsap.registerPlugin(ScrollTrigger);

const INTRO_SESSION_KEY = 'fanz_intro_seen_v1';

function readIntroSeen(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function writeIntroSeen(): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    }
  } catch {
    // Abaikan jika sessionStorage dibatasi
  }
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

export default function App() {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(() => supportsWebGL(), []);

  const shouldSkipIntroInitially = reducedMotion || !webglAvailable || readIntroSeen();

  const [showIntro, setShowIntro] = useState(!shouldSkipIntroInitially);
  const [introDone, setIntroDone] = useState(shouldSkipIntroInitially);
  const [activeSection, setActiveSection] = useState<SectionId>('beranda');
  const [soundEnabled, setSoundEnabled] = useState(() => audioEngine.getEnabled());

  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    audioEngine.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const onVis = () => audioEngine.setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      audioEngine.dispose();
    };
  }, []);

  // Inisialisasi Lenis smooth scroll & sinkronisasi dengan GSAP ScrollTrigger
  useEffect(() => {
    if (reducedMotion || showIntro) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const refreshId = window.setTimeout(() => {
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      window.clearTimeout(refreshId);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion, showIntro]);

  // Pelacakan section aktif berdasarkan posisi scroll
  useEffect(() => {
    if (showIntro) return;

    const sections: SectionId[] = ['beranda', 'tentang', 'galeri', 'kontak'];
    const triggers: ScrollTrigger[] = [];

    const setupTimer = window.setTimeout(() => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const st = ScrollTrigger.create({
          trigger: el,
          start: 'top 45%',
          end: 'bottom 45%',
          onEnter: () => setActiveSection(id),
          onEnterBack: () => setActiveSection(id),
        });
        triggers.push(st);
      });
    }, 160);

    return () => {
      window.clearTimeout(setupTimer);
      triggers.forEach((t) => t.kill());
    };
  }, [showIntro]);

  const handleIntroComplete = useCallback(() => {
    writeIntroSeen();
    setShowIntro(false);
    setIntroDone(true);
  }, []);

  const navigateToSection = useCallback(
    (id: SectionId) => {
      setActiveSection(id);
      const target = document.getElementById(id);
      if (!target) return;

      if (lenisRef.current && !reducedMotion) {
        lenisRef.current.scrollTo(target, { offset: 0, duration: 1.15 });
      } else {
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [reducedMotion]
  );

  const toggleSound = useCallback(() => {
    const next = !audioEngine.getEnabled();
    audioEngine.setEnabled(next);
    setSoundEnabled(next);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0A0F1F] text-[#F5F7FF]">
      <CustomCursor reducedMotion={reducedMotion} />

      {showIntro && (
        <IntroFlyby onComplete={handleIntroComplete} reducedMotion={reducedMotion} />
      )}

      {!showIntro && (
        <Navbar
          activeSection={activeSection}
          soundEnabled={soundEnabled}
          onNavigate={navigateToSection}
          onToggleSound={toggleSound}
        />
      )}

      <main>
        <HeroSection introDone={introDone} reducedMotion={reducedMotion} />
        <AboutSection
          reducedMotion={reducedMotion}
          onGoToGallery={() => navigateToSection('galeri')}
        />
        <GallerySection reducedMotion={reducedMotion} />
        <ContactFooter />
      </main>
    </div>
  );
}
