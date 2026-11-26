const BGM_URL = '/assets/audio/belial-bgm.mp3';
const FADE_DURATION_SEC = 1.5;

class PortfolioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmEl: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFailed = false;
  private pauseTimer = 0;

  // Default mati sesuai preferensi; baru memuat MP3 saat pengguna menyalakan suara
  private enabled = false;
  private reducedMotion = false;
  private tabVisible = typeof document !== 'undefined' ? !document.hidden : true;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  public getEnabled(): boolean {
    return this.enabled;
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public setTabVisible(visible: boolean): void {
    this.tabVisible = visible;
    if (!this.ctx || !this.masterGain) return;

    if (!visible) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.15);
      if (this.bgmEl && !this.bgmEl.paused) {
        this.bgmEl.pause();
      }
      if (this.ctx.state === 'running') {
        void this.ctx.suspend().catch(() => {});
      }
    } else if (this.enabled) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(1, now + 0.3);
      if (this.bgmEl && this.bgmEl.paused && !this.bgmFailed) {
        void this.bgmEl.play().catch(() => {});
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled && this.tabVisible ? 1 : 0;
      this.masterGain.connect(this.ctx.destination);
      this.pinkNoiseBuffer = this.buildNoiseBuffer(this.ctx, 1.8);
    }

    if (this.ctx.state === 'suspended' && this.tabVisible) {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      out[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + w * 0.1848) * 0.16));
    }
    return buffer;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (this.pauseTimer) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = 0;
    }

    if (next) {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;
      const now = ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(1, now + 0.12);
      this.fadeInBgm(ctx);
    } else {
      this.fadeOutBgm();
    }
  }

  private fadeInBgm(ctx: AudioContext): void {
    if (this.bgmFailed || !this.masterGain) return;

    if (!this.bgmEl) {
      const el = new Audio();
      el.src = BGM_URL;
      el.loop = true;
      el.preload = 'none';
      el.addEventListener('error', () => {
        this.bgmFailed = true;
      });

      try {
        const source = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.masterGain);
        this.bgmEl = el;
        this.bgmSource = source;
        this.bgmGain = gain;
      } catch {
        this.bgmFailed = true;
        return;
      }
    }

    if (!this.bgmEl || !this.bgmGain) return;
    const now = ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(0.45, now + FADE_DURATION_SEC);

    if (this.bgmEl.paused) {
      void this.bgmEl.play().catch(() => {});
    }
  }

  private fadeOutBgm(): void {
    if (!this.ctx || !this.bgmGain || !this.bgmEl) return;
    const now = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(0, now + FADE_DURATION_SEC);

    this.pauseTimer = window.setTimeout(() => {
      if (!this.enabled && this.bgmEl && !this.bgmEl.paused) {
        this.bgmEl.pause();
      }
    }, FADE_DURATION_SEC * 1000 + 60);
  }

  /**
   * Efek suara transformasi penuh: whoosh terfilter + dentuman sub-bass rendah.
   * Tetap diputar saat pengguna berinteraksi langsung apabila suara aktif.
   */
  public playTransformBurst(): void {
    if (!this.enabled || !this.tabVisible) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    const now = ctx.currentTime;
    const dur = this.reducedMotion ? 0.25 : 0.78;

    // 1. Whoosh naik-turun
    const noise = ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.4, now);
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1850, now + dur * 0.28);
    filter.frequency.exponentialRampToValueAtTime(160, now + dur);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.32, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + dur + 0.02);

    // 2. Dentuman rendah (sub-bass thump)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(92, now + 0.04);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.48);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.6);
  }

  public playTransformRevert(): void {
    if (!this.enabled || !this.tabVisible) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.pinkNoiseBuffer) return;

    const now = ctx.currentTime;
    const dur = 0.36;

    const noise = ctx.createBufferSource();
    noise.buffer = this.pinkNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + dur + 0.02);
  }

  public dispose(): void {
    if (this.pauseTimer) window.clearTimeout(this.pauseTimer);
    if (this.bgmEl) {
      this.bgmEl.pause();
      this.bgmEl.removeAttribute('src');
      this.bgmEl = null;
    }
    this.bgmSource?.disconnect();
    this.bgmSource = null;
    this.bgmGain?.disconnect();
    this.bgmGain = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
    this.pinkNoiseBuffer = null;
  }
}

export const audioEngine = new PortfolioAudioEngine();
