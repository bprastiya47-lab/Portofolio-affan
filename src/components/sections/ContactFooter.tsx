import React from 'react';
import { ArrowUpRight, Instagram, Plane, TrainFront } from 'lucide-react';
import { OWNER_IDENTITY } from '../hero/heroAnchors';

export const ContactFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <section
      id="kontak"
      aria-label="Kontak dan media sosial"
      className="relative w-full bg-[#0A0F1F] border-t border-[#F5F7FF]/10 pt-24 pb-12 px-5 sm:px-8 lg:px-14"
    >
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[#2F5BEA] tracking-wide">
            Terhubung &amp; Kolaborasi
          </p>
          <h2 className="font-display text-5xl sm:text-7xl font-extrabold uppercase text-[#F5F7FF] leading-[0.94] mt-2 text-balance">
            Ayo terbang bareng
          </h2>
          <p className="text-sm sm:text-base text-[#98A5C8] mt-4 leading-relaxed">
            Terbuka untuk liputan aviasi, dokumentasi armada, permintaan cetak resolusi tinggi, maupun kolaborasi pemotretan kereta api.
          </p>
        </div>

        {/* 2 Kartu Instagram (Aviasi & Kereta) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <a
            href={OWNER_IDENTITY.aviationUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="interactive"
            className="group relative rounded-2xl bg-[#121A33] border border-[#F5F7FF]/12 hover:border-[#2F5BEA] p-6 sm:p-8 flex items-start justify-between gap-4 transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2F5BEA]">
                <Plane className="w-4 h-4" aria-hidden="true" />
                <span>Fotografi Aviasi</span>
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F7FF] mt-3">
                {OWNER_IDENTITY.aviationHandle}
              </h3>
              <p className="text-sm text-[#98A5C8] mt-2">
                Bidikan pendekatan akhir, lepas landas, dan livery khusus di CGK, HLP, serta DPS.
              </p>
            </div>

            <span className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F1F] border border-[#F5F7FF]/12 group-hover:bg-[#2F5BEA] group-hover:border-[#2F5BEA] flex items-center justify-center text-[#F5F7FF] transition-colors">
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </a>

          <a
            href={OWNER_IDENTITY.railUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="interactive"
            className="group relative rounded-2xl bg-[#121A33] border border-[#F5F7FF]/12 hover:border-[#2F5BEA] p-6 sm:p-8 flex items-start justify-between gap-4 transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-[#2F5BEA]">
                <TrainFront className="w-4 h-4" aria-hidden="true" />
                <span>Fotografi Kereta Api</span>
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F7FF] mt-3">
                {OWNER_IDENTITY.railHandle}
              </h3>
              <p className="text-sm text-[#98A5C8] mt-2">
                Liputan lokomotif CC 206 dan perjalanan kereta api koridor utama bersama AffanzRailspotter.
              </p>
            </div>

            <span className="shrink-0 w-10 h-10 rounded-full bg-[#0A0F1F] border border-[#F5F7FF]/12 group-hover:bg-[#2F5BEA] group-hover:border-[#2F5BEA] flex items-center justify-center text-[#F5F7FF] transition-colors">
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </a>
        </div>

        {/* Footer sederhana dengan nama dan tahun */}
        <footer className="mt-16 pt-8 border-t border-[#F5F7FF]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#98A5C8]">
          <p>
            {OWNER_IDENTITY.fullName} · {OWNER_IDENTITY.brand}
          </p>
          <div className="flex items-center gap-4">
            <a
              href={OWNER_IDENTITY.aviationUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram FANZ FIGHTERS"
              className="inline-flex items-center gap-1.5 hover:text-[#F5F7FF] transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Instagram</span>
            </a>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">© {year}</span>
          </div>
        </footer>
      </div>
    </section>
  );
};
