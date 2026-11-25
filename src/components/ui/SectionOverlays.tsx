import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GEAR_ITEMS, PortfolioItem, SPOTTER_SPECS } from '../../data/portfolioData';
import {
  IconCheck,
  IconClose,
  IconInstagram,
  IconLocation,
  IconNext,
  IconPrev,
  IconSend,
} from './CockpitIcons';
import { NavTab } from './HeaderHud';
import { DockTriggerOrigin } from './NavigationDock';
import { audioEngine } from '../../audio/audioEngine';

// Transisi buka-tutup modal bergaya tactical shutter / diagonal slice (280ms)
const SHUTTER_EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];
const SHUTTER_CLOSED_LEFT = 'polygon(0% 0%, 0% 0%, -25% 100%, -25% 100%)';
const SHUTTER_OPEN = 'polygon(0% 0%, 125% 0%, 100% 100%, -25% 100%)';
const SHUTTER_CLOSED_RIGHT = 'polygon(125% 0%, 125% 0%, 100% 100%, 100% 100%)';

export interface ContactPrefill {
  aircraft: string;
  operator: string;
  registration: string;
  indexLabel: string;
  key: number;
}

interface SectionOverlaysProps {
  activeTab: NavTab;
  reducedMotion: boolean;
  triggerOrigin: DockTriggerOrigin | null;
  contactPrefill: ContactPrefill | null;
  onClose: () => void;
}

const INQUIRY_CHIPS = [
  'Lisensi cetak dan editorial',
  'Dokumentasi Maskapai',
  'Liputan Bersama AffanzRailspotter',
  'Permintaan File RAW',
] as const;

const LENS_RANGES = [
  { label: 'RF 24-70mm f/2.8L', min: 24, max: 70, role: 'Apron & Malam' },
  { label: 'RF 100-500mm f/4.5-7.1L', min: 100, max: 500, role: 'Telefoto Utama' },
  { label: 'Sigma 150-600mm OS', min: 150, max: 600, role: 'Super Telefoto' },
] as const;

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Approach & Ramp',
    desc: 'Baseline shutter 1/1600s–1/2000s membekukan bilah kipas turbofan dan kepulan asap ban saat touchdown sambil menjaga gradasi cahaya.',
  },
  {
    step: '02',
    title: 'Livery Militer & Khusus',
    desc: 'Pelacakan terdedikasi untuk pesawat angkut taktis TNI AU Skadron Udara 2 serta livery khusus Formula 1 dan edisi retro.',
  },
  {
    step: '03',
    title: 'Kolaborasi Railspotter',
    desc: 'Liputan jalur utama bersama AffanzRailspotter mendokumentasikan lokomotif diesel-elektrik KAI CC 206 pada koridor DAOP 1.',
  },
] as const;

const ICAO_AIRPORTS = [
  { icao: 'WIII', iata: 'CGK', name: 'Soekarno-Hatta, Tangerang' },
  { icao: 'WIHH', iata: 'HLP', name: 'Halim Perdanakusuma AFB, Jakarta' },
  { icao: 'WADD', iata: 'DPS', name: 'I Gusti Ngurah Rai, Bali' },
] as const;

const CountUpDisplay: React.FC<{
  target: number;
  prefix?: string;
  suffix?: string;
  reducedMotion: boolean;
}> = ({ target, prefix = '', suffix = '', reducedMotion }) => {
  const [val, setVal] = useState(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      setVal(target);
      return;
    }
    let rafId = 0;
    const start = performance.now();
    const duration = 680;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, reducedMotion]);

  return (
    <span className="tabular-nums">
      {prefix}
      {val}
      {suffix}
    </span>
  );
};

export const SectionOverlays: React.FC<SectionOverlaysProps> = ({
  activeTab,
  reducedMotion,
  triggerOrigin,
  contactPrefill,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [inquiryType, setInquiryType] = useState<string>(INQUIRY_CHIPS[0]);
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; message?: boolean }>(
    {}
  );
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const isOpen = activeTab === 'gear' || activeTab === 'specs' || activeTab === 'contact';

  // Terapkan prefill otomatis saat tombol "Minta Lisensi Frame Ini" diklik
  useEffect(() => {
    if (!contactPrefill) return;
    setInquiryType('Lisensi cetak dan editorial');
    setMessage(
      `Permohonan lisensi frame #${contactPrefill.indexLabel}: ${contactPrefill.aircraft} — ${contactPrefill.operator} (Registrasi ${contactPrefill.registration}).\nKebutuhan cetak / editorial: `
    );
    setSubmitStatus('idle');
    setTouched((prev) => ({ ...prev, message: false }));
  }, [contactPrefill]);

  const nameError = useMemo(() => {
    if (!touched.name) return '';
    if (senderName.trim().length < 2) return 'Masukkan nama atau instansi minimal 2 karakter.';
    return '';
  }, [senderName, touched.name]);

  const emailError = useMemo(() => {
    if (!touched.email) return '';
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim());
    if (!ok) return 'Format alamat email belum valid.';
    return '';
  }, [senderEmail, touched.email]);

  const messageError = useMemo(() => {
    if (!touched.message) return '';
    if (message.trim().length < 10) return 'Tuliskan rincian singkat minimal 10 karakter.';
    return '';
  }, [message, touched.message]);

  const isFormValid =
    senderName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim()) &&
    message.trim().length >= 10;

  // Focus trap & pengembalian fokus ke tombol dock pemicu saat modal ditutup
  useEffect(() => {
    if (!isOpen) return;

    const previousButton = triggerOrigin?.buttonEl ?? (document.activeElement as HTMLElement | null);
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialog.focus();
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousButton && typeof previousButton.focus === 'function') {
        window.requestAnimationFrame(() => previousButton.focus());
      }
    };
  }, [isOpen, onClose, triggerOrigin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (!isFormValid || submitStatus === 'submitting') {
      if (!isFormValid) {
        audioEngine.playFormError();
      }
      return;
    }

    setSubmitStatus('submitting');
    window.setTimeout(() => {
      setSubmitStatus('success');
      audioEngine.playFormSuccess();
    }, 650);
  };

  const resetForm = () => {
    setSubmitStatus('idle');
    setSenderName('');
    setSenderEmail('');
    setMessage('');
    setTouched({});
  };

  const originStyle = triggerOrigin
    ? `${Math.round(triggerOrigin.x)}px ${Math.round(triggerOrigin.y)}px`
    : '50% 92%';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: SHUTTER_EASE }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 md:p-8 md:pb-24 bg-[#080507]/92"
        >
          {/* Panel Modal Solid (tanpa glassmorphism pada permukaan konten) */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-heading"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={reducedMotion ? false : { clipPath: SHUTTER_CLOSED_LEFT, opacity: 0.4 }}
            animate={{ clipPath: SHUTTER_OPEN, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { clipPath: SHUTTER_CLOSED_RIGHT, opacity: 0.4 }}
            transition={
              reducedMotion ? { duration: 0 } : { duration: 0.28, ease: SHUTTER_EASE }
            }
            style={{ transformOrigin: originStyle }}
            className="relative w-full max-w-4xl max-h-[calc(100vh-132px)] overflow-y-auto bg-[#120A0D] border border-[#2B1218] rounded-[4px] p-6 md:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.85)] focus:outline-none"
          >
            {/* Bilah merah tipis mengikuti sayatan diagonal saat shutter terbuka */}
            {!reducedMotion && (
              <motion.span
                aria-hidden="true"
                initial={{ x: '-30%', opacity: 1 }}
                animate={{ x: '130%', opacity: 0 }}
                transition={{ duration: 0.28, ease: SHUTTER_EASE }}
                className="pointer-events-none absolute inset-y-0 left-0 w-[3px] -skew-x-[14deg] bg-[#EF233C] shadow-[0_0_18px_rgba(239,35,60,0.9)] z-10"
              />
            )}

            {/* Header Modal */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#2B1218]">
              <div>
                <p className="font-mono text-xs tracking-[0.16em] text-[#EF233C] uppercase">
                  FANZ_FIGHTERS · @fanzfighters_pict
                </p>
                <h2
                  id="modal-heading"
                  className="font-display text-3xl md:text-4xl font-bold tracking-wide text-[#F6EEF0] uppercase mt-1 leading-none"
                >
                  {activeTab === 'gear' && 'Peralatan Optik & Lapangan'}
                  {activeTab === 'specs' && 'Spesifikasi Telemetri & Arsip'}
                  {activeTab === 'contact' && 'Kolaborasi & Lisensi Foto'}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup jendela"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5 text-[#A8969B] hover:text-[#F6EEF0] bg-[#080507] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* 1. PERALATAN: Daftar gaya panel instrumen dengan dotted leader + grafik batang focal length */}
            {activeTab === 'gear' && (
              <div className="mt-6 space-y-8">
                <p className="text-sm text-[#A8969B] max-w-2xl leading-relaxed">
                  Konfigurasi kamera full-frame, APS-C reach, dan lensa super-telefoto teruji lapangan untuk pelacakan cepat di tepi landasan maupun liputan malam di apron.
                </p>

                {/* Grafik Batang Rentang Focal Length (24–600mm) */}
                <section aria-label="Grafik Rentang Focal Length" className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="font-mono text-xs tracking-[0.14em] text-[#EF233C] uppercase">
                      Peta Jangkauan Focal Length (24mm — 600mm)
                    </h3>
                    <span className="font-mono text-xs text-[#A8969B] tabular-nums">
                      Skala Optik 0–600mm
                    </span>
                  </div>

                  <div className="space-y-3">
                    {LENS_RANGES.map((lens) => {
                      const leftPct = (lens.min / 600) * 100;
                      const widthPct = ((lens.max - lens.min) / 600) * 100;
                      return (
                        <div key={lens.label} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                          <div className="sm:col-span-4 flex items-baseline justify-between sm:block">
                            <span className="font-mono text-xs font-medium text-[#F6EEF0] block">
                              {lens.label}
                            </span>
                            <span className="font-mono text-xs text-[#A8969B]">
                              {lens.role}
                            </span>
                          </div>
                          <div className="sm:col-span-6 relative h-5 bg-[#120A0D] border border-[#2B1218] rounded-[4px] overflow-hidden">
                            <div
                              className="absolute top-1 bottom-1 bg-[#EF233C]/80 rounded-[4px]"
                              style={{
                                left: `${leftPct.toFixed(2)}%`,
                                width: `${Math.max(widthPct, 4).toFixed(2)}%`,
                              }}
                            />
                          </div>
                          <div className="sm:col-span-2 text-right font-mono text-xs text-[#EF233C] tabular-nums">
                            {lens.min}–{lens.max}mm
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden sm:grid grid-cols-12 gap-4 mt-3 pt-2 border-t border-[#2B1218]">
                    <div className="col-span-4" />
                    <div className="col-span-6 flex justify-between font-mono text-xs text-[#A8969B] tabular-nums">
                      <span>0</span>
                      <span>150</span>
                      <span>300</span>
                      <span>450</span>
                      <span>600mm</span>
                    </div>
                    <div className="col-span-2" />
                  </div>
                </section>

                {/* Baris Panel Instrumen dengan Dotted Leader Lines */}
                <section aria-label="Daftar Perangkat">
                  <ul className="divide-y divide-[#2B1218]">
                    {GEAR_ITEMS.map((gear) => (
                      <li key={gear.name} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                          <div className="flex items-baseline gap-2.5 shrink-0">
                            <span className="font-mono text-xs text-[#EF233C] uppercase">
                              {gear.category}
                            </span>
                            <span className="font-display text-xl font-bold text-[#F6EEF0] tracking-wide uppercase">
                              {gear.name}
                            </span>
                          </div>

                          <span
                            aria-hidden="true"
                            className="hidden sm:block flex-1 border-b border-dotted border-[#A8969B]/35 translate-y-[-3px]"
                          />

                          <span className="font-mono text-xs text-[#F6EEF0] tabular-nums shrink-0">
                            {gear.spec}
                          </span>
                        </div>
                        <p className="text-sm text-[#A8969B] mt-1">{gear.role}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}

            {/* 2. SPESIFIKASI: Angka besar count-up 1x + Kode ICAO & IATA + Alur kerja 3 langkah bernomor */}
            {activeTab === 'specs' && (
              <div className="mt-6 space-y-8">
                {/* Baris Telemetri Utama dengan Count-Up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-[#2B1218] pb-6">
                  <div className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4">
                    <div className="font-mono text-xs text-[#A8969B] uppercase">
                      {SPOTTER_SPECS[0].label}
                    </div>
                    <div className="font-display text-4xl font-bold text-[#EF233C] mt-1 leading-none">
                      <CountUpDisplay target={10} reducedMotion={reducedMotion} />
                    </div>
                    <p className="text-xs text-[#A8969B] mt-2 leading-relaxed">
                      {SPOTTER_SPECS[0].detail}
                    </p>
                  </div>

                  <div className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4">
                    <div className="font-mono text-xs text-[#A8969B] uppercase">
                      {SPOTTER_SPECS[1].label}
                    </div>
                    <div className="font-display text-3xl font-bold text-[#F6EEF0] mt-1 leading-none">
                      {SPOTTER_SPECS[1].value}
                    </div>
                    <p className="text-xs text-[#A8969B] mt-2 leading-relaxed">
                      {SPOTTER_SPECS[1].detail}
                    </p>
                  </div>

                  <div className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4">
                    <div className="font-mono text-xs text-[#A8969B] uppercase">
                      {SPOTTER_SPECS[2].label}
                    </div>
                    <div className="font-display text-4xl font-bold text-[#EF233C] mt-1 leading-none">
                      <CountUpDisplay
                        target={2000}
                        prefix="1/"
                        suffix="s"
                        reducedMotion={reducedMotion}
                      />
                    </div>
                    <p className="text-xs text-[#A8969B] mt-2 leading-relaxed">
                      {SPOTTER_SPECS[2].detail}
                    </p>
                  </div>

                  <div className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4">
                    <div className="font-mono text-xs text-[#A8969B] uppercase">
                      {SPOTTER_SPECS[3].label}
                    </div>
                    <div className="font-display text-3xl font-bold text-[#F6EEF0] mt-1 leading-none tabular-nums">
                      2025 — <CountUpDisplay target={2026} reducedMotion={reducedMotion} />
                    </div>
                    <p className="text-xs text-[#A8969B] mt-2 leading-relaxed">
                      {SPOTTER_SPECS[3].detail}
                    </p>
                  </div>
                </div>

                {/* Dua Kolom Asimetris: Kode ICAO/IATA Bandara & Alur Kerja Bernomor */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <section className="lg:col-span-5 bg-[#080507] border border-[#2B1218] rounded-[4px] p-5">
                    <h3 className="font-mono text-xs tracking-[0.14em] text-[#EF233C] uppercase mb-4">
                      Bandara Aktif (ICAO / IATA)
                    </h3>
                    <ul className="space-y-3.5">
                      {ICAO_AIRPORTS.map((ap) => (
                        <li
                          key={ap.icao}
                          className="flex items-start justify-between gap-3 pb-3 border-b border-[#2B1218] last:border-b-0 last:pb-0"
                        >
                          <div>
                            <div className="font-mono text-sm font-semibold text-[#F6EEF0] tabular-nums">
                              {ap.icao} <span className="text-[#A8969B]">/</span>{' '}
                              <span className="text-[#EF233C]">{ap.iata}</span>
                            </div>
                            <div className="text-xs text-[#A8969B] mt-0.5">{ap.name}</div>
                          </div>
                          <span className="font-mono text-xs text-[#A8969B] uppercase">
                            AKTIF
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="lg:col-span-7">
                    <h3 className="font-mono text-xs tracking-[0.14em] text-[#EF233C] uppercase mb-4">
                      Disiplin Lapangan &amp; Alur Kerja
                    </h3>
                    <ol className="relative space-y-5 border-l border-[#2B1218] pl-5 ml-2">
                      {WORKFLOW_STEPS.map((item) => (
                        <li key={item.step} className="relative">
                          <span
                            aria-hidden="true"
                            className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-[#EF233C] border-2 border-[#120A0D]"
                          />
                          <div className="flex items-baseline gap-2.5">
                            <span className="font-mono text-xs font-semibold text-[#EF233C] tabular-nums">
                              {item.step}
                            </span>
                            <h4 className="font-display text-xl font-bold text-[#F6EEF0] uppercase tracking-wide">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-sm text-[#A8969B] mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>
            )}

            {/* 3. KONTAK: 2 kolom, floating labels, chip pilihan topik, validasi langsung, status kirim, & fallback Instagram/WhatsApp */}
            {activeTab === 'contact' && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Kolom Kiri: Info & Tautan Fallback Langsung */}
                <div className="md:col-span-2 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm text-[#A8969B] leading-relaxed">
                      Tersedia untuk dokumentasi livery maskapai, lisensi editorial aviasi, liputan airshow, serta kolaborasi railspotting.
                    </p>

                    <div className="space-y-2.5 text-xs text-[#F6EEF0]">
                      <div className="flex items-center gap-2.5">
                        <IconLocation className="w-4 h-4 text-[#EF233C] shrink-0" />
                        <span>Jakarta (CGK / HLP) &amp; Bali (DPS), Indonesia</span>
                      </div>
                      <div className="font-mono text-[#A8969B]">
                        Kolaborasi Kereta: @affanzrailspotter
                      </div>
                    </div>
                  </div>

                  {/* Tautan Fallback Langsung */}
                  <div className="bg-[#080507] border border-[#2B1218] rounded-[4px] p-4 space-y-2.5">
                    <div className="font-mono text-xs text-[#A8969B] uppercase">
                      Saluran Langsung
                    </div>
                    <a
                      href="https://www.instagram.com/fanzfighters_pict/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-between gap-2 px-3 py-2.5 bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] text-xs font-mono text-[#F6EEF0] hover:text-[#EF233C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
                        <span>AVIATION · @fanzfighters_pict</span>
                      </span>
                      <span className="text-[#A8969B]">IG</span>
                    </a>

                    <a
                      href="https://www.instagram.com/affanzrailspotter/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex items-center justify-between gap-2 px-3 py-2.5 bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] text-xs font-mono text-[#F6EEF0] hover:text-[#EF233C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <IconInstagram className="w-4 h-4 text-[#EF233C] shrink-0" />
                        <span>RAIL · @affanzrailspotter</span>
                      </span>
                      <span className="text-[#A8969B]">IG</span>
                    </a>

                  </div>
                </div>

                {/* Kolom Kanan: Formulir dengan Floating Labels & Chip Topik */}
                <div className="md:col-span-3">
                  {submitStatus === 'success' ? (
                    <div className="p-6 bg-[#080507] border border-[#EF233C]/50 rounded-[4px] text-left space-y-3">
                      <div className="inline-flex items-center gap-2 text-[#EF233C] font-mono text-xs uppercase">
                        <IconCheck className="w-5 h-5" />
                        <span>Terkirim</span>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-[#F6EEF0] uppercase">
                        Pesan Pengiriman Tercatat
                      </h3>
                      <p className="text-sm text-[#A8969B] leading-relaxed">
                        Terima kasih, {senderName}. Permintaan <span className="text-[#F6EEF0]">{inquiryType}</span> telah dicatat untuk @fanzfighters_pict.
                      </p>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="mt-2 min-h-[44px] inline-flex items-center px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#EF233C] border border-[#EF233C]/50 hover:bg-[#EF233C]/10 rounded-[4px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
                      >
                        Kirim Pesan Baru
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Floating Label: Nama / Instansi */}
                        <div>
                          <div className="relative">
                            <input
                              id="contact-name"
                              type="text"
                              value={senderName}
                              onChange={(e) => {
                                setSenderName(e.target.value);
                                setTouched((t) => ({ ...t, name: true }));
                              }}
                              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                              placeholder=" "
                              aria-invalid={Boolean(nameError)}
                              aria-describedby={nameError ? 'err-name' : undefined}
                              className={`peer w-full px-3 pt-5 pb-2 text-sm bg-[#080507] border rounded-[4px] text-[#F6EEF0] focus:outline-none transition-colors ${
                                nameError
                                  ? 'border-rose-400 focus:border-rose-400'
                                  : 'border-[#2B1218] focus:border-[#EF233C]'
                              }`}
                            />
                            <label
                              htmlFor="contact-name"
                              className="pointer-events-none absolute left-3 top-1.5 font-mono text-xs text-[#A8969B] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#EF233C]"
                            >
                              Nama / Instansi
                            </label>
                          </div>
                          {nameError && (
                            <p id="err-name" className="text-xs text-rose-400 mt-1">
                              {nameError}
                            </p>
                          )}
                        </div>

                        {/* Floating Label: Alamat Email */}
                        <div>
                          <div className="relative">
                            <input
                              id="contact-email"
                              type="email"
                              value={senderEmail}
                              onChange={(e) => {
                                setSenderEmail(e.target.value);
                                setTouched((t) => ({ ...t, email: true }));
                              }}
                              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                              placeholder=" "
                              aria-invalid={Boolean(emailError)}
                              aria-describedby={emailError ? 'err-email' : undefined}
                              className={`peer w-full px-3 pt-5 pb-2 text-sm bg-[#080507] border rounded-[4px] text-[#F6EEF0] focus:outline-none transition-colors ${
                                emailError
                                  ? 'border-rose-400 focus:border-rose-400'
                                  : 'border-[#2B1218] focus:border-[#EF233C]'
                              }`}
                            />
                            <label
                              htmlFor="contact-email"
                              className="pointer-events-none absolute left-3 top-1.5 font-mono text-xs text-[#A8969B] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#EF233C]"
                            >
                              Alamat Email
                            </label>
                          </div>
                          {emailError && (
                            <p id="err-email" className="text-xs text-rose-400 mt-1">
                              {emailError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Jenis Permintaan sebagai Chip Pilihan */}
                      <div>
                        <span className="block font-mono text-xs text-[#A8969B] uppercase mb-2">
                          Jenis Kebutuhan
                        </span>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="Jenis Kebutuhan">
                          {INQUIRY_CHIPS.map((chip) => {
                            const selected = inquiryType === chip;
                            return (
                              <button
                                key={chip}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setInquiryType(chip)}
                                className={`min-h-[44px] px-3 py-2 rounded-[4px] font-mono text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                                  selected
                                    ? 'bg-[#EF233C] text-[#080507] font-semibold border border-[#EF233C]'
                                    : 'bg-[#080507] text-[#A8969B] hover:text-[#F6EEF0] border border-[#2B1218]'
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Floating Label: Ringkasan / Nomor Registrasi */}
                      <div>
                        <div className="relative">
                          <textarea
                            id="contact-message"
                            rows={3}
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value);
                              setTouched((t) => ({ ...t, message: true }));
                            }}
                            onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                            placeholder=" "
                            aria-invalid={Boolean(messageError)}
                            aria-describedby={messageError ? 'err-message' : undefined}
                            className={`peer w-full px-3 pt-6 pb-2 text-sm bg-[#080507] border rounded-[4px] text-[#F6EEF0] focus:outline-none resize-none transition-colors ${
                              messageError
                                ? 'border-rose-400 focus:border-rose-400'
                                : 'border-[#2B1218] focus:border-[#EF233C]'
                            }`}
                          />
                          <label
                            htmlFor="contact-message"
                            className="pointer-events-none absolute left-3 top-1.5 font-mono text-xs text-[#A8969B] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-[#EF233C]"
                          >
                            Ringkasan Kebutuhan / Registrasi Pesawat
                          </label>
                        </div>
                        {messageError && (
                          <p id="err-message" className="text-xs text-rose-400 mt-1">
                            {messageError}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="font-mono text-xs text-[#A8969B]">
                          Respon standar 1×24 jam
                        </span>

                        <button
                          type="submit"
                          disabled={submitStatus === 'submitting'}
                          className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] font-mono text-xs font-semibold uppercase tracking-wider text-[#080507] bg-[#EF233C] hover:bg-[#FF5A6E] active:bg-[#D90429] disabled:opacity-55 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <IconSend className="w-4 h-4" />
                          <span>
                            {submitStatus === 'submitting' ? 'Mengirim...' : 'Kirim Pesan'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LightboxModalProps {
  item: PortfolioItem | null;
  totalItems: number;
  reducedMotion: boolean;
  returnFocusEl: HTMLElement | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  item,
  totalItems,
  reducedMotion,
  returnFocusEl,
  onClose,
  onPrev,
  onNext,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
  }, [item?.id]);

  // Kunci fokus di dalam Lightbox, tangani Esc & Panah kiri-kanan, kembalikan fokus saat tutup
  useEffect(() => {
    if (!item) return;
    const restoreEl = returnFocusEl ?? (document.activeElement as HTMLElement | null);

    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 20);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        audioEngine.playBackClick();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key === 'Tab' && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !containerRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      if (restoreEl && typeof restoreEl.focus === 'function') {
        window.requestAnimationFrame(() => restoreEl.focus());
      }
    };
  }, [item, onClose, onPrev, onNext, returnFocusEl]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Tampilan foto layar penuh: ${item.aircraft} (${item.registration})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex flex-col justify-between bg-[#080507]/94 p-3 sm:p-6 md:p-8"
        >
          {/* Bar Atas Lightbox (Solid Kokpit, Tanpa Efek Miring 3D) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-3 bg-[#120A0D] border border-[#2B1218] rounded-[4px] px-3.5 sm:px-4 py-2"
          >
            <div className="min-w-0">
              <div className="font-mono text-xs text-[#EF233C] tabular-nums uppercase truncate">
                {item.indexLabel} / {String(totalItems).padStart(2, '0')} · {item.registration} ·{' '}
                {item.operator}
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-[#F6EEF0] uppercase truncate">
                {item.aircraft}
              </div>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup foto layar penuh"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#080507] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] font-mono text-xs text-[#F6EEF0] hover:text-[#EF233C] uppercase transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
            >
              <IconClose className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>

          {/* Area Foto Utuh + Panah Kiri-Kanan */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center my-3 sm:my-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Frame sebelumnya"
              className="z-10 min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] text-[#F6EEF0] hover:text-[#EF233C] rounded-[4px] transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
            >
              <IconPrev className="w-5 h-5" />
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex-1 h-full flex items-center justify-center mx-2 sm:mx-4 overflow-hidden"
            >
              {/* Placeholder blur selama gambar asli dimuat, lalu cross-fade */}
              {!imgLoaded && (
                <div
                  aria-hidden="true"
                  className="absolute inset-4 max-w-4xl mx-auto rounded-[4px] border border-[#2B1218] flex items-center justify-center"
                  style={{
                    background: `linear-gradient(155deg, ${item.livery.fuselage}24 0%, #120A0D 55%, ${item.livery.tail}24 100%)`,
                  }}
                >
                  <div className="w-44 space-y-2 text-center">
                    <div className="h-[2px] w-full bg-[#2B1218] overflow-hidden rounded-[4px]">
                      <div className="h-full w-2/3 bg-[#EF233C]" />
                    </div>
                    <p className="font-mono text-xs text-[#A8969B] uppercase">
                      Memuat Resolusi Penuh...
                    </p>
                  </div>
                </div>
              )}

              <img
                key={item.id}
                src={item.imageUrl}
                alt={`${item.aircraft} — ${item.operator} (${item.registration}), ${item.location}, ${item.year}`}
                onLoad={() => setImgLoaded(true)}
                className={`max-w-full max-h-full w-auto h-auto object-contain rounded-[4px] border border-[#2B1218] shadow-[0_24px_64px_rgba(0,0,0,0.9)] transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Frame berikutnya"
              className="z-10 min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-[#120A0D] border border-[#2B1218] hover:border-[#EF233C] text-[#F6EEF0] hover:text-[#EF233C] rounded-[4px] transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
            >
              <IconNext className="w-5 h-5" />
            </button>
          </div>

          {/* Strip Telemetri Bawah Lightbox */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center justify-between gap-2 bg-[#120A0D] border border-[#2B1218] rounded-[4px] px-3.5 sm:px-4 py-2.5 font-mono text-xs text-[#A8969B] tabular-nums"
          >
            <span className="text-[#F6EEF0]">
              {item.shutter} · {item.aperture} · ISO {item.iso} · {item.focalLength}
            </span>
            <span>{item.location}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface ContactSheetModalProps {
  open: boolean;
  items: PortfolioItem[];
  activeId: string | null;
  reducedMotion: boolean;
  returnFocusEl: HTMLElement | null;
  onClose: () => void;
  onSelectFrame: (id: string) => void;
}

export const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  open,
  items,
  activeId,
  reducedMotion,
  returnFocusEl,
  onClose,
  onSelectFrame,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const restoreEl = returnFocusEl ?? (document.activeElement as HTMLElement | null);

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 20);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        audioEngine.playBackClick();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !dialogRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      if (restoreEl && typeof restoreEl.focus === 'function') {
        window.requestAnimationFrame(() => restoreEl.focus());
      }
    };
  }, [open, onClose, returnFocusEl]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-sheet-backdrop"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#080507]/92"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-sheet-heading"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 360, damping: 32 }
            }
            className="relative w-full max-w-6xl max-h-[calc(100vh-48px)] overflow-y-auto bg-[#120A0D] border border-[#2B1218] rounded-[4px] p-4 sm:p-6 md:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.9)] focus:outline-none"
          >
            {/* Header Lembar Kontak Film */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2B1218]">
              <div>
                <p className="font-mono text-xs tracking-[0.16em] text-[#EF233C] uppercase">
                  LEMBAR KONTAK FILM · 10 FRAME UTAMA
                </p>
                <h2
                  id="contact-sheet-heading"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-[#F6EEF0] uppercase mt-1 leading-none"
                >
                  Indeks Arsip FANZ FIGHTERS
                </h2>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Tutup lembar kontak"
                className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[#A8969B] hover:text-[#F6EEF0] bg-[#080507] border border-[#2B1218] hover:border-[#EF233C] rounded-[4px] font-mono text-xs uppercase transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <IconClose className="w-4 h-4" />
                <span className="hidden sm:inline">Tutup</span>
              </button>
            </div>

            {/* Grid 10 Frame Lembar Kontak */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {items.map((frame) => {
                const isActive = frame.id === activeId;
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => onSelectFrame(frame.id)}
                    aria-label={`Buka detail frame ${frame.indexLabel}: ${frame.aircraft} ${frame.operator} (${frame.registration})`}
                    className={`group text-left bg-[#080507] border rounded-[4px] overflow-hidden transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C] ${
                      isActive
                        ? 'border-[#EF233C]'
                        : 'border-[#2B1218] hover:border-[#EF233C]/75'
                    }`}
                  >
                    {/* Lubang Perforasi Film di Puncak Strip */}
                    <div
                      aria-hidden="true"
                      className="flex items-center justify-between px-2 py-1 border-b border-[#2B1218] bg-[#080507]"
                    >
                      <span className="font-mono text-xs font-semibold text-[#EF233C] tabular-nums">
                        {frame.indexLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-1 rounded-[1px] bg-[#2B1218]" />
                        <span className="w-2 h-1 rounded-[1px] bg-[#2B1218]" />
                        <span className="w-2 h-1 rounded-[1px] bg-[#2B1218]" />
                      </div>
                      <span className="font-mono text-xs text-[#A8969B] tabular-nums">
                        {frame.registration}
                      </span>
                    </div>

                    {/* Foto Pratinjau Lembar Kontak */}
                    <div className="relative aspect-[3/2] bg-[#120A0D] overflow-hidden">
                      <img
                        src={frame.imageUrl}
                        alt={`${frame.aircraft} — ${frame.operator} (${frame.registration}), ${frame.location}, ${frame.year}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.03]"
                      />
                    </div>

                    {/* Info Singkat Tanpa Kapsul */}
                    <div className="px-2.5 py-2 border-t border-[#2B1218]">
                      <div className="font-display text-base font-bold text-[#F6EEF0] group-hover:text-[#EF233C] uppercase tracking-wide truncate leading-tight transition-colors">
                        {frame.aircraft}
                      </div>
                      <div className="font-mono text-xs text-[#A8969B] truncate mt-0.5">
                        {frame.operator}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


