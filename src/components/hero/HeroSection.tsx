import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_PATHS, OWNER_IDENTITY } from './heroAnchors';
import { TransformPortrait } from './TransformPortrait';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  introDone: boolean;
  reducedMotion: boolean;
}

const TreesLeftSvgFallback: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 360 900" className={className} preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M0 0 L150 0 L132 140 L235 168 L146 218 L242 290 L138 355 L198 430 L128 510 L170 640 L215 900 L0 900 Z"
      fill="#071312"
    />
  </svg>
);

const TreesRightSvgFallback: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 360 900" className={className} preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M360 0 L210 0 L228 140 L125 168 L214 218 L118 290 L222 355 L162 430 L232 510 L190 640 L145 900 L360 900 Z"
      fill="#071312"
    />
  </svg>
);

const FoliageBottomSvgFallback: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 1600 320" className={className} preserveAspectRatio="none" aria-hidden="true">
    <path
      d="M0 320 L0 190 Q120 120 260 195 Q420 105 580 190 Q780 135 980 200 Q1210 110 1390 185 Q1500 135 1600 175 L1600 320 Z"
      fill="#050D0E"
    />
  </svg>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ introDone, reducedMotion }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const mountainWrapRef = useRef<HTMLDivElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const personWrapRef = useRef<HTMLDivElement>(null);
  const treesLeftRef = useRef<HTMLDivElement>(null);
  const treesRightRef = useRef<HTMLDivElement>(null);
  const foliageRef = useRef<HTMLDivElement>(null);
  const darkVeilRef = useRef<HTMLDivElement>(null);

  // Wrapper terpisah untuk parallax mouse agar tidak bentrok dengan GSAP scroll transform
  const mouseMountainRef = useRef<HTMLDivElement>(null);
  const mouseTitleRef = useRef<HTMLDivElement>(null);
  const mousePersonRef = useRef<HTMLDivElement>(null);
  const mouseTreesLeftRef = useRef<HTMLDivElement>(null);
  const mouseTreesRightRef = useRef<HTMLDivElement>(null);
  const mouseFoliageRef = useRef<HTMLDivElement>(null);

  const [shaking, setShaking] = useState(false);
  const [treeLeftErr, setTreeLeftErr] = useState(false);
  const [treeRightErr, setTreeRightErr] = useState(false);
  const [foliageErr, setFoliageErr] = useState(false);
  const [mountainErr, setMountainErr] = useState(false);

  // Animasi masuk bingkai pohon & semak setelah intro selesai (~1.8 detik)
  useEffect(() => {
    if (!introDone) return;
    const leftEl = treesLeftRef.current;
    const rightEl = treesRightRef.current;
    const folEl = foliageRef.current;
    if (!leftEl || !rightEl || !folEl) return;

    if (reducedMotion) {
      gsap.set([leftEl, rightEl, folEl], { clearProps: 'transform,filter,opacity' });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        leftEl,
        { xPercent: -26, scale: 1.28, filter: 'blur(7px)', opacity: 0.7 },
        { xPercent: 0, scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.8, ease: 'power3.out' }
      );
      gsap.fromTo(
        rightEl,
        { xPercent: 26, scale: 1.28, filter: 'blur(7px)', opacity: 0.7 },
        { xPercent: 0, scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.8, ease: 'power3.out' }
      );
      gsap.fromTo(
        folEl,
        { yPercent: 28, scale: 1.22, filter: 'blur(6px)', opacity: 0.7 },
        { yPercent: 0, scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.8, ease: 'power3.out' }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [introDone, reducedMotion]);

  // GSAP ScrollTrigger pin + scrub animasi parallax berlapis ke section Tentang
  useEffect(() => {
    if (reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: '+=155%',
          pin: true,
          scrub: 0.85,
          anticipatePin: 1,
        },
      });

      // Fase 1: Pohon membuka ke samping & semak turun, teks raksasa naik dari balik gunung (tetap di belakang orang)
      tl.to(treesLeftRef.current, { x: '-36vw', scale: 1.18, opacity: 0, ease: 'power1.inOut' }, 0)
        .to(treesRightRef.current, { x: '36vw', scale: 1.18, opacity: 0, ease: 'power1.inOut' }, 0)
        .to(foliageRef.current, { y: '34vh', scale: 1.12, opacity: 0, ease: 'power1.inOut' }, 0)
        .fromTo(
          titleWrapRef.current,
          { y: '18vh', scale: 0.96 },
          { y: '-22vh', scale: 1.05, ease: 'none' },
          0
        )
        // Fase 2: Lanjut scroll -> gunung dan orang turun perlahan, layar gelap menjadi navy #0A0F1F
        .to(mountainWrapRef.current, { y: '14vh', scale: 1.06, ease: 'none' }, 0.35)
        .to(personWrapRef.current, { y: '20vh', ease: 'none' }, 0.42)
        .to(titleWrapRef.current, { opacity: 0, ease: 'none' }, 0.65)
        .to(darkVeilRef.current, { opacity: 1, ease: 'none' }, 0.48);
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  // Parallax mouse halus (hanya desktop pointer halus, non-reduced-motion)
  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    const isFine = window.matchMedia('(pointer: fine)').matches;
    if (!isFine) return;

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let rafId = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;

      if (mouseMountainRef.current) {
        mouseMountainRef.current.style.transform = `translate3d(${(-curX * 8).toFixed(1)}px, ${(-curY * 6).toFixed(1)}px, 0)`;
      }
      if (mouseTitleRef.current) {
        mouseTitleRef.current.style.transform = `translate3d(${(-curX * 14).toFixed(1)}px, ${(-curY * 9).toFixed(1)}px, 0)`;
      }
      if (mousePersonRef.current) {
        mousePersonRef.current.style.transform = `translate3d(${(-curX * 22).toFixed(1)}px, ${(-curY * 12).toFixed(1)}px, 0)`;
      }
      if (mouseTreesLeftRef.current) {
        mouseTreesLeftRef.current.style.transform = `translate3d(${(-curX * 38).toFixed(1)}px, ${(-curY * 18).toFixed(1)}px, 0)`;
      }
      if (mouseTreesRightRef.current) {
        mouseTreesRightRef.current.style.transform = `translate3d(${(-curX * 38).toFixed(1)}px, ${(-curY * 18).toFixed(1)}px, 0)`;
      }
      if (mouseFoliageRef.current) {
        mouseFoliageRef.current.style.transform = `translate3d(${(-curX * 42).toFixed(1)}px, ${(-curY * 22).toFixed(1)}px, 0)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  const triggerShake = () => {
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
    window.setTimeout(() => setShaking(false), 450);
  };

  return (
    <section
      id="beranda"
      ref={sectionRef}
      aria-label="Beranda portofolio Dikut Affan Aryansyah"
      className={`relative w-full h-[100svh] overflow-hidden bg-[#0A0F1F] ${
        shaking ? 'transform-shake' : ''
      }`}
    >
      {/* LAYER 1: Langit senja + gunung bersalju + matahari terbit di balik puncak */}
      <div ref={mountainWrapRef} className="absolute -inset-6 z-10 will-change-transform">
        <div ref={mouseMountainRef} className="relative w-full h-full will-change-transform">
          {!mountainErr ? (
            <img
              src={HERO_PATHS.mountain}
              alt="Pemandangan pegunungan bersalju saat fajar biru-teal"
              onError={() => setMountainErr(true)}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  'linear-gradient(180deg, #092038 0%, #164463 45%, #0D1E36 75%, #0A0F1F 100%)',
              }}
            />
          )}

          {/* Cahaya matahari terbit berdenyut pelan tepat di balik puncak tengah */}
          <div
            aria-hidden="true"
            className="sunrise-glow pointer-events-none absolute w-[42vw] max-w-[540px] aspect-square rounded-full"
            style={{
              left: '56%',
              top: '35%',
              background:
                'radial-gradient(circle, rgba(255, 244, 214, 0.58) 0%, rgba(255, 210, 128, 0.25) 34%, rgba(96, 165, 250, 0.08) 62%, transparent 78%)',
              mixBlendMode: 'screen',
            }}
          />
        </div>
      </div>

      {/* LAYER 2: Teks Raksasa "WELCOME TO MY PORTFOLIO" (naik dari balik gunung, tetap di belakang badan orang) */}
      <div
        ref={titleWrapRef}
        className="pointer-events-none absolute inset-x-0 top-[24vh] sm:top-[22vh] md:top-[21vh] z-20 flex flex-col items-center text-center px-4 will-change-transform"
      >
        <div ref={mouseTitleRef} className="will-change-transform">
          <h1 className="font-display font-extrabold uppercase text-[#F5F7FF] leading-[0.86] tracking-[0.02em] text-[clamp(48px,9.6vw,152px)] drop-shadow-[0_10px_36px_rgba(10,15,31,0.58)]">
            <span className="block">WELCOME TO</span>
            <span className="block">MY PORTFOLIO</span>
          </h1>
        </div>
      </div>

      {/* LAYER 2B: Topeng puncak gunung tengah tipis agar efek "naik dari balik gunung" terlihat alami */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[44vh] z-[24]"
        style={{
          background:
            'linear-gradient(to top, rgba(10, 15, 31, 0.72) 0%, rgba(10, 15, 31, 0.22) 55%, transparent 100%)',
        }}
      />

      {/* LAYER 3: Sosok menghadap ke belakang (tengah bawah) dengan fitur transformasi */}
      <div
        ref={personWrapRef}
        className="pointer-events-none absolute inset-x-0 bottom-[3vh] sm:bottom-[4vh] z-30 flex justify-center will-change-transform"
      >
        <div ref={mousePersonRef} className="pointer-events-auto will-change-transform">
          <TransformPortrait
            primarySrc={HERO_PATHS.personBack}
            alt={`${OWNER_IDENTITY.fullName} berdiri menghadap pegunungan`}
            reducedMotion={reducedMotion}
            onShake={triggerShake}
            className="h-[58svh] sm:h-[64svh] md:h-[70svh] max-h-[680px]"
          />
        </div>
      </div>

      {/* LAYER 4: Bingkai pohon kiri, kanan & semak bawah */}
      <div
        ref={treesLeftRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 bottom-0 z-40 w-[34vw] sm:w-[29vw] md:w-[26vw] max-w-[440px] will-change-transform"
      >
        <div ref={mouseTreesLeftRef} className="w-full h-full -ml-[6%] will-change-transform">
          {!treeLeftErr ? (
            <img
              src={HERO_PATHS.treesLeft}
              alt=""
              onError={() => setTreeLeftErr(true)}
              className="w-full h-full object-cover object-left"
            />
          ) : (
            <TreesLeftSvgFallback className="w-full h-full" />
          )}
        </div>
      </div>

      <div
        ref={treesRightRef}
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 bottom-0 z-40 w-[34vw] sm:w-[29vw] md:w-[26vw] max-w-[440px] will-change-transform"
      >
        <div ref={mouseTreesRightRef} className="w-full h-full -mr-[6%] ml-auto will-change-transform">
          {!treeRightErr ? (
            <img
              src={HERO_PATHS.treesRight}
              alt=""
              onError={() => setTreeRightErr(true)}
              className="w-full h-full object-cover object-right"
            />
          ) : (
            <TreesRightSvgFallback className="w-full h-full" />
          )}
        </div>
      </div>

      <div
        ref={foliageRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[20vh] sm:h-[23vh] md:h-[26vh] will-change-transform"
      >
        <div ref={mouseFoliageRef} className="w-full h-full translate-y-[4%] will-change-transform">
          {!foliageErr ? (
            <img
              src={HERO_PATHS.foliageBottom}
              alt=""
              onError={() => setFoliageErr(true)}
              className="w-full h-full object-cover object-bottom"
            />
          ) : (
            <FoliageBottomSvgFallback className="w-full h-full" />
          )}
        </div>
      </div>

      {/* Tirai gelap menuju Navy #0A0F1F saat scroll berlanjut ke Tentang */}
      <div
        ref={darkVeilRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[45] bg-[#0A0F1F] opacity-0 will-change-opacity"
      />
    </section>
  );
};
