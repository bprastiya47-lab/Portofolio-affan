import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence } from 'motion/react';
import { Maximize2 } from 'lucide-react';
import { PORTFOLIO_ITEMS, PortfolioCategory, PortfolioItem } from '../../data/portfolioData';
import { LightboxModal, LightboxSelection } from './LightboxModal';

gsap.registerPlugin(ScrollTrigger);

type FilterValue = 'semua' | PortfolioCategory;

interface GallerySectionProps {
  reducedMotion: boolean;
}

const FILTERS: Array<{ value: FilterValue; label: string }> = [
  { value: 'semua', label: 'Semua' },
  { value: 'pesawat', label: 'Pesawat' },
  { value: 'kereta', label: 'Kereta' },
];

const GalleryCard: React.FC<{
  item: PortfolioItem;
  onOpen: (item: PortfolioItem, rect: DOMRect) => void;
}> = ({ item, onOpen }) => {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => {
        const rect = cardRef.current?.getBoundingClientRect() ?? null;
        if (rect) onOpen(item, rect);
        else onOpen(item, new DOMRect());
      }}
      data-cursor="interactive"
      className="gallery-card group relative shrink-0 w-[84vw] sm:w-[68vw] md:w-[540px] lg:w-[600px] snap-center text-left rounded-2xl bg-[#121A33] border border-[#F5F7FF]/12 hover:border-[#2F5BEA]/80 overflow-hidden transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
    >
      {/* Frame foto dengan blur placeholder LQIP + parallax internal */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden bg-[#0D142A]"
        style={{
          backgroundImage: `url(${item.blurDataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <img
          src={item.thumbUrl}
          srcSet={item.srcSet}
          sizes="(max-width: 768px) 84vw, 600px"
          alt={`${item.aircraft} — ${item.operator} (${item.registration})`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          className={`gallery-parallax-img w-[114%] max-w-none h-full -ml-[7%] object-cover transition-all duration-500 group-hover:scale-[1.03] ${
            loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'
          }`}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0F1F]/80 via-transparent to-transparent"
        />

        <span
          aria-hidden="true"
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-[#0A0F1F]/70 border border-[#F5F7FF]/15 flex items-center justify-center text-[#F5F7FF] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <Maximize2 className="w-4 h-4" />
        </span>
      </div>

      {/* Info kartu bersih tanpa badge pill */}
      <div className="p-5 sm:p-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#98A5C8] font-mono tabular-nums">
            <span className="text-[#2F5BEA] font-semibold">{item.indexLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{item.registration}</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-[#F5F7FF] mt-1 truncate">
            {item.operator} — {item.aircraft}
          </h3>
          <p className="text-xs sm:text-sm text-[#98A5C8] mt-1 truncate">{item.location}</p>
        </div>

        <span className="shrink-0 font-mono tabular-nums text-xs text-[#98A5C8] hidden sm:inline">
          {item.focalLength}
        </span>
      </div>
    </button>
  );
};

export const GallerySection: React.FC<GallerySectionProps> = ({ reducedMotion }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [filter, setFilter] = useState<FilterValue>('semua');
  const [selection, setSelection] = useState<LightboxSelection | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'semua') return PORTFOLIO_ITEMS;
    return PORTFOLIO_ITEMS.filter((item) => item.category === filter);
  }, [filter]);

  // GSAP ScrollTrigger horizontal pin + scrub di desktop
  useEffect(() => {
    const sec = sectionRef.current;
    const track = trackRef.current;
    if (!sec || !track) return;

    if (reducedMotion || !isDesktop) {
      gsap.set(track, { clearProps: 'transform' });
      return;
    }

    const ctx = gsap.context(() => {
      const getScrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
      const scrollDist = getScrollAmount();
      if (scrollDist <= 20) return;

      const tween = gsap.to(track, {
        x: () => -getScrollAmount(),
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          pin: true,
          scrub: 0.9,
          start: 'top top',
          end: () => `+=${getScrollAmount()}`,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      // Parallax horizontal halus di dalam setiap foto kartu
      const imgs = track.querySelectorAll<HTMLElement>('.gallery-parallax-img');
      imgs.forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -5 },
          {
            xPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: img.closest('.gallery-card') || sec,
              containerAnimation: tween,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          }
        );
      });
    }, sectionRef);

    const rafId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, [filteredItems, isDesktop, reducedMotion]);

  const openLightbox = (item: PortfolioItem, rect: DOMRect) => {
    setSelection({ item, sourceRect: rect.width > 0 ? rect : null });
  };

  return (
    <section
      id="galeri"
      ref={sectionRef}
      aria-label="Galeri fotografi aviasi dan kereta api"
      className="relative w-full min-h-[100svh] bg-[#0A0F1F] py-20 md:py-24 flex flex-col justify-center overflow-hidden"
    >
      {/* Header Galeri + Filter */}
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-14 mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-[#2F5BEA] tracking-wide">
            Arsip Pilihan 2025 — 2026
          </p>
          <h2 className="font-display text-4xl sm:text-6xl font-extrabold uppercase text-[#F5F7FF] leading-[0.95] mt-1">
            Galeri Bidikan
          </h2>
        </div>

        {/* Filter kecil: Semua · Pesawat · Kereta */}
        <div
          role="group"
          aria-label="Filter kategori galeri"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-[#121A33] border border-[#F5F7FF]/12 self-start sm:self-auto"
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`min-h-[38px] px-4 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA] ${
                  active
                    ? 'bg-[#2F5BEA] text-[#F5F7FF]'
                    : 'text-[#98A5C8] hover:text-[#F5F7FF]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Track horizontal (pin scrub di desktop, swipe horizontal biasa di HP) */}
      <div
        className={
          isDesktop && !reducedMotion
            ? 'w-full overflow-hidden'
            : 'w-full overflow-x-auto snap-x snap-mandatory no-scrollbar'
        }
      >
        <div
          ref={trackRef}
          className="flex items-stretch gap-5 sm:gap-7 px-5 sm:px-8 lg:px-14 w-max"
        >
          {filteredItems.map((item) => (
            <GalleryCard key={item.id} item={item} onOpen={openLightbox} />
          ))}
        </div>
      </div>

      {/* Petunjuk singkat */}
      <div className="max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-14 mt-6 flex items-center justify-between text-xs text-[#98A5C8]">
        <span>
          {isDesktop && !reducedMotion
            ? 'Gulir ke bawah untuk menelusuri kartu foto'
            : 'Geser ke samping untuk melihat foto lainnya'}
        </span>
        <span className="font-mono tabular-nums">{filteredItems.length} karya</span>
      </div>

      {/* Lightbox Layar Penuh */}
      <AnimatePresence>
        {selection && (
          <LightboxModal
            selection={selection}
            items={filteredItems}
            reducedMotion={reducedMotion}
            onClose={() => setSelection(null)}
            onSelect={(nextItem) => setSelection({ item: nextItem, sourceRect: null })}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
