import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDownRight, Instagram } from 'lucide-react';
import { HERO_PATHS, OWNER_IDENTITY } from '../hero/heroAnchors';
import { TransformPortrait } from '../hero/TransformPortrait';

gsap.registerPlugin(ScrollTrigger);

interface AboutSectionProps {
  reducedMotion: boolean;
  onGoToGallery: () => void;
}

const TopographicBackground: React.FC = () => (
  <div
    aria-hidden="true"
    className="topo-drift pointer-events-none absolute -inset-12 opacity-60 overflow-hidden"
  >
    <svg
      viewBox="0 0 1440 900"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full"
    >
      <g stroke="rgba(152, 165, 200, 0.1)" strokeWidth="1">
        <path d="M-80 180 C 190 90, 420 260, 710 170 C 980 86, 1210 210, 1520 130" />
        <path d="M-80 245 C 210 155, 440 315, 730 225 C 1010 138, 1230 270, 1520 185" />
        <path d="M-80 315 C 235 225, 470 375, 755 290 C 1030 205, 1255 335, 1520 245" />
        <path d="M-80 390 C 260 300, 500 445, 780 360 C 1050 275, 1275 405, 1520 315" />
        <path d="M-80 470 C 285 385, 520 520, 800 440 C 1065 360, 1295 480, 1520 395" />
        <path d="M-80 560 C 300 475, 535 610, 825 530 C 1085 455, 1310 565, 1520 485" />
        <path d="M-80 655 C 310 570, 560 700, 845 625 C 1105 550, 1330 660, 1520 580" />
        <path d="M-80 750 C 325 670, 585 795, 865 720 C 1125 645, 1345 755, 1520 675" />
        <ellipse cx="1090" cy="390" rx="220" ry="110" transform="rotate(-12 1090 390)" />
        <ellipse cx="1090" cy="390" rx="155" ry="74" transform="rotate(-12 1090 390)" />
        <ellipse cx="290" cy="610" rx="210" ry="96" transform="rotate(8 290 610)" />
        <ellipse cx="290" cy="610" rx="138" ry="60" transform="rotate(8 290 610)" />
      </g>
    </svg>
  </div>
);

export const AboutSection: React.FC<AboutSectionProps> = ({ reducedMotion, onGoToGallery }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;

    const ctx = gsap.context(() => {
      const lines = sec.querySelectorAll<HTMLElement>('[data-reveal-line]');
      gsap.fromTo(
        lines,
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 72%',
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const triggerShake = () => {
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
    window.setTimeout(() => setShaking(false), 450);
  };

  return (
    <section
      id="tentang"
      ref={sectionRef}
      aria-label="Tentang Dikut Affan Aryansyah"
      className={`relative min-h-[100svh] w-full bg-[#0A0F1F] py-24 md:py-28 px-5 sm:px-8 lg:px-14 flex items-center overflow-hidden ${
        shaking ? 'transform-shake' : ''
      }`}
    >
      <TopographicBackground />

      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8">
        {/* Kolom Kiri: Identitas + tombol Lihat Instagram */}
        <div className="lg:col-span-4 flex flex-col items-start text-left">
          <div className="overflow-hidden">
            <p data-reveal-line className="text-base sm:text-lg font-semibold text-[#2F5BEA] tracking-wide">
              Hai, saya
            </p>
          </div>
          <div className="overflow-hidden mt-2">
            <h2
              data-reveal-line
              className="font-display font-extrabold uppercase text-[#F5F7FF] text-[clamp(44px,5.2vw,72px)] leading-[0.94] tracking-[0.01em] text-balance"
            >
              {OWNER_IDENTITY.fullName}
            </h2>
          </div>
          <div className="overflow-hidden mt-4">
            <p data-reveal-line className="text-sm text-[#98A5C8]">
              {OWNER_IDENTITY.brand} · Spotter Aviasi &amp; Kereta Api
            </p>
          </div>

          <div data-reveal-line className="mt-7">
            <a
              href={OWNER_IDENTITY.aviationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 min-h-[44px] px-5 py-2.5 rounded-full bg-[#2F5BEA] hover:bg-[#3B68F5] text-sm font-semibold text-[#F5F7FF] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FF]"
            >
              <Instagram className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Lihat Instagram</span>
            </a>
          </div>
        </div>

        {/* Kolom Tengah: Foto dengan fitur transformasi lingkaran */}
        <div className="lg:col-span-4 flex justify-center">
          <TransformPortrait
            primarySrc={HERO_PATHS.personFront}
            alt={`Potret ${OWNER_IDENTITY.fullName}`}
            reducedMotion={reducedMotion}
            onShake={triggerShake}
            className="h-[46svh] sm:h-[54svh] lg:h-[62svh] max-h-[560px]"
          />
        </div>

        {/* Kolom Kanan: Paragraf spotter CGK, HLP, DPS + tombol Lihat Galeri */}
        <div className="lg:col-span-4 flex flex-col items-start text-left">
          <div className="space-y-4 text-[#F5F7FF]/90 text-sm sm:text-base leading-relaxed">
            <p data-reveal-line>
              Saya adalah fotografer dan spotter aviasi sekaligus kereta api yang aktif berburu momen di sekitar bandara CGK, HLP, dan DPS.
            </p>
            <p data-reveal-line className="text-[#98A5C8]">
              Dari pesawat widebody komersial dan angkut militer TNI AU hingga lokomotif diesel-elektrik KAI di jalur utama DAOP 1, setiap frame dibekukan pada kecepatan rana tinggi agar detail livery, pusaran udara, dan cahaya senja tetap tajam.
            </p>
          </div>

          <div data-reveal-line className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onGoToGallery}
              className="inline-flex items-center gap-2.5 min-h-[44px] px-5 py-2.5 rounded-full bg-[#121A33] hover:bg-[#1B274B] border border-[#F5F7FF]/18 hover:border-[#2F5BEA] text-sm font-semibold text-[#F5F7FF] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
            >
              <span>Lihat Galeri</span>
              <ArrowDownRight className="w-4 h-4 text-[#2F5BEA]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
