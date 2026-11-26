const AUDIO_ENABLED_KEY = 'fanz_audio_enabled';
const AUDIO_VOLUME_KEY = 'fanz_audio_volume';
const MAX_CONCURRENT_VOICES = 6;
const HOVER_THROTTLE_MS = 60;
const CROSSFADE_SECONDS = 1.5;

/** Backsound utama: medley Ultraman Belial (ditaruh di public/assets/audio/) */
const BGM_URL = '/assets/audio/belial-bgm.mp3';

type SceneAudioMode = 'none' | 'intro' | 'hero' | 'gallery';

const optionalAmbientAssets = import.meta.glob('/src/assets/audio/ambient.mp3', {
  eager: false,
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;

function jitter(base: number, ratio = 0.05): number {
  return base * (1 + (Math.random() * 2 - 1) * ratio);
}

function readStoredEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(AUDIO_ENABLED_KEY);
    // Pengunjung baru: musik menyala begitu ada gestur pertama (kebijakan autoplay browser)
    return stored === null ? true : stored === 'true';
  } catch {
    return false;
  }
}

function writeStoredEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUDIO_ENABLED_KEY, enabled ? 'true' : 'false');
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

function readStoredVolume(): number {
  try {
    if (typeof window === 'undefined') return 0.7;
    const raw = window.localStorage.getItem(AUDIO_VOLUME_KEY);
    if (raw === null) return 0.7;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 0.7;
    return Math.max(0, Math.min(1, parsed));
  } catch {
    return 0.7;
  }
}

function writeStoredVolume(vol: number): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUDIO_VOLUME_KEY, vol.toFixed(2));
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
}

function createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    output[i] = Math.max(-1, Math.min(1, pink * 0.11));
  }
  return buffer;
}

class AviationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private backsoundBus: GainNode | null = null;

  private introBus: GainNode | null = null;
  private introFilter: BiquadFilterNode | null = null;
  private introRoarGain: GainNode | null = null;
  private introNodes: AudioNode[] = [];
  private introStopTimer = 0;
  private introActive = false;

  private galleryBus: GainNode | null = null;
  private galleryNodes: AudioNode[] = [];
  private galleryAmbientEl: HTMLAudioElement | null = null;
  private galleryStopTimer = 0;
  private galleryActive = false;

  private heroBus: GainNode | null = null;
  private heroSubFilter: BiquadFilterNode | null = null;
  private heroSubGain: GainNode | null = null;
  private heroRumbleFilter: BiquadFilterNode | null = null;
  private heroRumbleGain: GainNode | null = null;
  private heroNodes: AudioNode[] = [];
  private heroStopTimer = 0;
  private heroActive = false;
  private heroProgress = 0;

  private pinkBuffer: AudioBuffer | null = null;

  // Backsound medley (HTMLAudioElement -> lowpass -> gain -> backsoundBus)
  private bgmEl: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFailed = false;
  private bgmWanted = false;
  private bgmPauseTimer = 0;

  private enabled: boolean = readStoredEnabled();
  private masterVolume: number = readStoredVolume();
  private tabVisible = typeof document !== 'undefined' ? !document.hidden : true;
  private reducedMotion = false;
  private ducked = false;
  private sceneMode: SceneAudioMode = 'none';
  private hasUserGesture = false;

  private activeVoices = 0;
  private lastHoverAt = 0;
  private lastPillSlideAt = 0;

  public getEnabled(): boolean {
    return this.enabled;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public markUserGesture(): void {
    this.hasUserGesture = true;
    if (this.enabled && this.tabVisible) {
      this.ensureGraph();
      this.syncActiveBacksound();
    }
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    writeStoredEnabled(next);

    if (next) {
      this.hasUserGesture = true;
      const ctx = this.ensureGraph();
      if (ctx) {
        this.applyMasterGain(0.18);
        this.syncActiveBacksound();
      }
    } else {
      this.applyMasterGain(0.08);
      this.fadeOutBgm(0.12);
      this.teardownIntroNodes(0.12);
      this.teardownHeroNodes(0.12);
      this.teardownGalleryNodes(0.12);
    }
  }

  public setMasterVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterVolume = clamped;
    writeStoredVolume(clamped);
    this.applyMasterGain(0.08);
  }

  public setTabVisible(visible: boolean): void {
    this.tabVisible = visible;
    if (!this.ctx) return;

    if (!visible) {
      this.applyMasterGain(0.05);
      if (this.ctx.state === 'running') {
        void this.ctx.suspend().catch(() => {});
      }
      if (this.galleryAmbientEl && !this.galleryAmbientEl.paused) {
        this.galleryAmbientEl.pause();
      }
      if (this.bgmEl && !this.bgmEl.paused) {
        this.bgmEl.pause();
      }
    } else if (this.enabled) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      if (this.galleryAmbientEl && this.galleryActive) {
        void this.galleryAmbientEl.play().catch(() => {});
      }
      if (this.bgmEl && this.bgmWanted) {
        void this.bgmEl.play().catch(() => {});
      }
      this.applyMasterGain(0.2);
      this.syncActiveBacksound();
    }
  }

  public setDucked(ducked: boolean): void {
    this.ducked = ducked;
    if (!this.ctx || !this.backsoundBus) return;
    const now = this.ctx.currentTime;
    const target = ducked ? 0.4 : 1.0; // Turunkan backsound 60% saat modal/detail terbuka
    this.backsoundBus.gain.cancelScheduledValues(now);
    this.backsoundBus.gain.setValueAtTime(this.backsoundBus.gain.value, now);
    this.backsoundBus.gain.linearRampToValueAtTime(target, now + 0.28);
  }

  public setSceneMode(mode: SceneAudioMode): void {
    if (this.sceneMode === mode) return;
    this.sceneMode = mode;
    if (this.enabled && this.hasUserGesture && this.tabVisible) {
      this.syncActiveBacksound();
    }
  }

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined' || !this.hasUserGesture || !this.enabled) {
      return null;
    }

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.backsoundBus = this.ctx.createGain();

      this.masterBus.gain.value = this.tabVisible ? this.masterVolume : 0;
      this.sfxBus.gain.value = 1;
      this.backsoundBus.gain.value = this.ducked ? 0.4 : 1;

      this.sfxBus.connect(this.masterBus);
      this.backsoundBus.connect(this.masterBus);
      this.masterBus.connect(this.ctx.destination);

      this.pinkBuffer = createPinkNoiseBuffer(this.ctx, 7);
    }

    if (this.ctx.state === 'suspended' && this.tabVisible) {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private applyMasterGain(rampSec: number): void {
    if (!this.ctx || !this.masterBus) return;
    const now = this.ctx.currentTime;
    const target = this.enabled && this.tabVisible ? this.masterVolume : 0;
    this.masterBus.gain.cancelScheduledValues(now);
    this.masterBus.gain.setValueAtTime(this.masterBus.gain.value, now);
    this.masterBus.gain.linearRampToValueAtTime(target, now + rampSec);
  }

  private syncActiveBacksound(): void {
    if (!this.enabled || !this.hasUserGesture || !this.tabVisible) return;
    const ctx = this.ensureGraph();
    if (!ctx) return;

    if (this.sceneMode === 'intro') {
      this.startIntroBacksound(ctx);
      this.fadeOutBgm(CROSSFADE_SECONDS);
      this.fadeOutHero(CROSSFADE_SECONDS);
      this.fadeOutGallery(CROSSFADE_SECONDS);
    } else if (this.sceneMode === 'hero') {
      // Medley menjadi backsound utama; bed prosedural hanya cadangan bila file gagal dimuat
      if (this.startBgm(ctx)) {
        this.fadeOutHero(CROSSFADE_SECONDS);
      } else {
        this.startHeroBacksound(ctx);
      }
      this.fadeOutIntro(CROSSFADE_SECONDS);
      this.fadeOutGallery(CROSSFADE_SECONDS);
    } else if (this.sceneMode === 'gallery') {
      if (this.startBgm(ctx)) {
        this.fadeOutGallery(CROSSFADE_SECONDS);
      } else {
        this.startGalleryBacksound(ctx);
      }
      this.fadeOutIntro(CROSSFADE_SECONDS);
      this.fadeOutHero(CROSSFADE_SECONDS);
    } else {
      this.fadeOutBgm(0.35);
      this.fadeOutIntro(0.35);
      this.fadeOutHero(0.35);
      this.fadeOutGallery(0.35);
    }
  }

  /** Menyalakan medley; false bila file tidak bisa dimuat (pemanggil memakai bed prosedural) */
  private startBgm(ctx: AudioContext): boolean {
    if (this.bgmFailed || !this.backsoundBus) return false;
    this.bgmWanted = true;
    if (this.bgmPauseTimer) {
      window.clearTimeout(this.bgmPauseTimer);
      this.bgmPauseTimer = 0;
    }

    if (!this.bgmEl) {
      const el = new Audio(BGM_URL);
      el.loop = true;
      el.preload = 'auto';
      el.addEventListener('error', () => {
        this.bgmFailed = true;
        this.teardownBgm();
        if (this.enabled && this.hasUserGesture && this.tabVisible) {
          this.syncActiveBacksound();
        }
      });

      let source: MediaElementAudioSourceNode;
      try {
        source = ctx.createMediaElementSource(el);
      } catch {
        this.bgmFailed = true;
        return false;
      }
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.6;
      filter.frequency.value = 2200;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.backsoundBus);

      this.bgmEl = el;
      this.bgmSource = source;
      this.bgmFilter = filter;
      this.bgmGain = gain;
    }

    if (this.bgmEl && this.bgmEl.paused) {
      void this.bgmEl.play().catch(() => {});
    }
    this.applyBgmMood(CROSSFADE_SECONDS);
    return true;
  }

  /**
   * Warna musik mengikuti adegan: di Hero tertahan (lowpass) sampai Belial bangkit,
   * lalu terbuka penuh; di Galeri terang dan lebih pelan agar foto tetap jadi pusat perhatian.
   */
  private applyBgmMood(rampSec: number): void {
    if (!this.ctx || !this.bgmGain || !this.bgmFilter) return;
    const now = this.ctx.currentTime;
    let gain = 0.0001;
    let cutoff = 2200;
    if (this.bgmWanted && this.enabled && this.tabVisible) {
      if (this.sceneMode === 'hero') {
        const p = this.heroProgress;
        const curve = p * p * (3 - 2 * p);
        gain = 0.46 + 0.5 * curve;
        cutoff = 1700 + 15000 * curve;
      } else {
        gain = 0.68;
        cutoff = 9000;
      }
    }
    const tc = Math.max(0.03, rampSec / 3);
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setTargetAtTime(gain, now, tc);
    this.bgmFilter.frequency.cancelScheduledValues(now);
    this.bgmFilter.frequency.setTargetAtTime(cutoff, now, tc);
  }

  private fadeOutBgm(fadeSec: number): void {
    if (!this.bgmEl) {
      this.bgmWanted = false;
      return;
    }
    this.bgmWanted = false;
    this.applyBgmMood(fadeSec);
    if (this.bgmPauseTimer) window.clearTimeout(this.bgmPauseTimer);
    this.bgmPauseTimer = window.setTimeout(() => {
      this.bgmPauseTimer = 0;
      if (!this.bgmWanted && this.bgmEl) this.bgmEl.pause();
    }, Math.round(fadeSec * 1000) + 120);
  }

  private teardownBgm(): void {
    this.bgmWanted = false;
    if (this.bgmPauseTimer) {
      window.clearTimeout(this.bgmPauseTimer);
      this.bgmPauseTimer = 0;
    }
    const el = this.bgmEl;
    this.bgmEl = null;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    try {
      this.bgmSource?.disconnect();
      this.bgmFilter?.disconnect();
      this.bgmGain?.disconnect();
    } catch {
      // Abaikan node yang sudah terputus
    }
    this.bgmSource = null;
    this.bgmFilter = null;
    this.bgmGain = null;
  }

  private startIntroBacksound(ctx: AudioContext): void {
    if (!this.backsoundBus || !this.pinkBuffer) return;

    if (this.introStopTimer) {
      window.clearTimeout(this.introStopTimer);
      this.introStopTimer = 0;
    }

    const now = ctx.currentTime;
    if (this.introActive && this.introBus) {
      this.introBus.gain.cancelScheduledValues(now);
      this.introBus.gain.setValueAtTime(this.introBus.gain.value, now);
      this.introBus.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
      return;
    }

    const introBus = ctx.createGain();
    introBus.gain.setValueAtTime(0.0001, now);
    introBus.gain.linearRampToValueAtTime(1, now + 0.45);
    introBus.connect(this.backsoundBus);

    const roarSrc = ctx.createBufferSource();
    roarSrc.buffer = this.pinkBuffer;
    roarSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.Q.setValueAtTime(0.8, now);

    const roarGain = ctx.createGain();
    roarGain.gain.setValueAtTime(0.045, now);

    // Dengung turbin N1 halus saat final approach
    const turbineOsc = ctx.createOscillator();
    turbineOsc.type = 'sine';
    turbineOsc.frequency.setValueAtTime(84, now);

    const turbineGain = ctx.createGain();
    turbineGain.gain.setValueAtTime(0.018, now);

    roarSrc.connect(filter);
    filter.connect(roarGain);
    roarGain.connect(introBus);

    turbineOsc.connect(turbineGain);
    turbineGain.connect(introBus);

    roarSrc.start(now);
    turbineOsc.start(now);

    this.introBus = introBus;
    this.introFilter = filter;
    this.introRoarGain = roarGain;
    this.introNodes = [roarSrc, turbineOsc, filter, roarGain, turbineGain, introBus];
    this.introActive = true;
  }

  public updateIntroProgress(elapsedSec: number): void {
    if (!this.enabled || !this.tabVisible || !this.introActive) return;
    if (!this.ctx || !this.introFilter || !this.introRoarGain) return;

    const now = this.ctx.currentTime;
    // 0 -> 2.1s: pesawat mendekat, frekuensi & level deru jet naik pelan
    // 2.1 -> 3.6s: setelah touchdown, deru mengecil perlahan
    let cutoff = 160;
    let level = 0.05;

    if (elapsedSec < 2.15) {
      const p = Math.max(0, Math.min(1, elapsedSec / 2.15));
      const curve = p * p;
      cutoff = 150 + curve * 780;
      level = 0.045 + curve * 0.14;
    } else {
      const p = Math.max(0, Math.min(1, (elapsedSec - 2.15) / 1.45));
      cutoff = 930 - p * 690;
      level = 0.185 * (1 - p * 0.82);
    }

    this.introFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.introRoarGain.gain.setTargetAtTime(level, now, 0.08);
  }

  public playIntroTouchdown(): void {
    if (!this.enabled || !this.tabVisible || !this.hasUserGesture) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.backsoundBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;

    // 1. Thump roda utama menyentuh landasan 25R
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(jitter(92), now);
    thumpOsc.frequency.exponentialRampToValueAtTime(32, now + 0.19);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.28, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.backsoundBus);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.22);

    // 2. Gesekan ban singkat (tire chirp) saat touchdown
    const chirpSrc = ctx.createBufferSource();
    chirpSrc.buffer = this.pinkBuffer;

    const chirpFilter = ctx.createBiquadFilter();
    chirpFilter.type = 'bandpass';
    chirpFilter.frequency.setValueAtTime(jitter(1900), now);
    chirpFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
    chirpFilter.Q.setValueAtTime(2.6, now);

    const chirpGain = ctx.createGain();
    chirpGain.gain.setValueAtTime(0.001, now);
    chirpGain.gain.linearRampToValueAtTime(0.14, now + 0.018);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    chirpSrc.connect(chirpFilter);
    chirpFilter.connect(chirpGain);
    chirpGain.connect(this.backsoundBus);
    chirpSrc.start(now);
    chirpSrc.stop(now + 0.24);
  }

  private fadeOutIntro(fadeSec: number): void {
    if (!this.introActive || !this.ctx || !this.introBus) return;
    const now = this.ctx.currentTime;
    this.introBus.gain.cancelScheduledValues(now);
    this.introBus.gain.setValueAtTime(this.introBus.gain.value, now);
    this.introBus.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    this.teardownIntroNodes(fadeSec + 0.08);
  }

  private teardownIntroNodes(delaySec: number): void {
    this.introActive = false;
    if (this.introStopTimer) {
      window.clearTimeout(this.introStopTimer);
    }
    const nodes = this.introNodes;
    this.introNodes = [];
    this.introBus = null;
    this.introFilter = null;
    this.introRoarGain = null;

    this.introStopTimer = window.setTimeout(() => {
      nodes.forEach((n) => {
        try {
          if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
            (n as AudioScheduledSourceNode).stop();
          }
          n.disconnect();
        } catch {
          // Abaikan node yang sudah dihentikan
        }
      });
    }, Math.round(delaySec * 1000));
  }

  private startGalleryBacksound(ctx: AudioContext): void {
    if (!this.backsoundBus || !this.pinkBuffer) return;

    if (this.galleryStopTimer) {
      window.clearTimeout(this.galleryStopTimer);
      this.galleryStopTimer = 0;
    }

    const now = ctx.currentTime;
    if (this.galleryActive && this.galleryBus) {
      this.galleryBus.gain.cancelScheduledValues(now);
      this.galleryBus.gain.setValueAtTime(this.galleryBus.gain.value, now);
      this.galleryBus.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
      return;
    }

    const galleryBus = ctx.createGain();
    galleryBus.gain.setValueAtTime(0.0001, now);
    galleryBus.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
    galleryBus.connect(this.backsoundBus);

    const nodes: AudioNode[] = [galleryBus];

    // 1. Dengung rendah bandara (dua osilator sine detune tipis)
    const droneA = ctx.createOscillator();
    droneA.type = 'sine';
    droneA.frequency.setValueAtTime(58.0, now);

    const droneB = ctx.createOscillator();
    droneB.type = 'sine';
    droneB.frequency.setValueAtTime(58.55, now);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.022, now);

    droneA.connect(droneGain);
    droneB.connect(droneGain);
    droneGain.connect(galleryBus);

    droneA.start(now);
    droneB.start(now);
    nodes.push(droneA, droneB, droneGain);

    // 2. Desis angin tarmac (pink noise band-pass dengan modulasi amat lambat)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.pinkBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(320, now);
    windFilter.Q.setValueAtTime(0.75, now);

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.067, now);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(75, now);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.032, now);

    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(galleryBus);

    windSrc.start(now);
    windLfo.start(now);
    nodes.push(windSrc, windFilter, windLfo, windLfoGain, windGain);

    // 3. Pad lembut yang berubah pelan, atau pakai src/assets/audio/ambient.mp3 jika disediakan
    const loader = optionalAmbientAssets['/src/assets/audio/ambient.mp3'];
    if (loader) {
      void loader()
        .then((url) => {
          if (!this.galleryActive || !this.ctx || this.galleryBus !== galleryBus) return;
          const el = new Audio(url);
          el.loop = true;
          el.crossOrigin = 'anonymous';
          const source = this.ctx.createMediaElementSource(el);
          const padGain = this.ctx.createGain();
          padGain.gain.value = 0.14;
          source.connect(padGain);
          padGain.connect(galleryBus);
          this.galleryAmbientEl = el;
          this.galleryNodes.push(source, padGain);
          if (this.tabVisible) {
            void el.play().catch(() => {});
          }
        })
        .catch(() => {
          this.attachProceduralPad(ctx, galleryBus, nodes, now);
        });
    } else {
      this.attachProceduralPad(ctx, galleryBus, nodes, now);
    }

    this.galleryBus = galleryBus;
    this.galleryNodes = nodes;
    this.galleryActive = true;
  }

  private attachProceduralPad(
    ctx: AudioContext,
    galleryBus: GainNode,
    nodes: AudioNode[],
    now: number
  ): void {
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(380, now);
    padFilter.Q.setValueAtTime(0.6, now);

    const padMaster = ctx.createGain();
    padMaster.gain.setValueAtTime(0.022, now);
    padFilter.connect(padMaster);
    padMaster.connect(galleryBus);
    nodes.push(padFilter, padMaster);

    const voices = [
      { freq: 110.0, lfoHz: 0.043, depth: 0.35 },
      { freq: 164.81, lfoHz: 0.031, depth: 0.3 },
      { freq: 246.94, lfoHz: 0.059, depth: 0.22 },
    ];

    voices.forEach((v) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(v.freq, now);

      const vGain = ctx.createGain();
      vGain.gain.setValueAtTime(0.42, now);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(v.lfoHz, now);

      const lfoDepth = ctx.createGain();
      lfoDepth.gain.setValueAtTime(v.depth, now);

      lfo.connect(lfoDepth);
      lfoDepth.connect(vGain.gain);
      osc.connect(vGain);
      vGain.connect(padFilter);

      osc.start(now);
      lfo.start(now);
      nodes.push(osc, vGain, lfo, lfoDepth);
    });
  }

  private fadeOutGallery(fadeSec: number): void {
    if (!this.galleryActive || !this.ctx || !this.galleryBus) return;
    const now = this.ctx.currentTime;
    this.galleryBus.gain.cancelScheduledValues(now);
    this.galleryBus.gain.setValueAtTime(this.galleryBus.gain.value, now);
    this.galleryBus.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    this.teardownGalleryNodes(fadeSec + 0.08);
  }

  private teardownGalleryNodes(delaySec: number): void {
    this.galleryActive = false;
    if (this.galleryStopTimer) {
      window.clearTimeout(this.galleryStopTimer);
    }
    const nodes = this.galleryNodes;
    const ambientEl = this.galleryAmbientEl;
    this.galleryNodes = [];
    this.galleryBus = null;
    this.galleryAmbientEl = null;

    this.galleryStopTimer = window.setTimeout(() => {
      if (ambientEl) {
        ambientEl.pause();
        ambientEl.src = '';
      }
      nodes.forEach((n) => {
        try {
          if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
            (n as AudioScheduledSourceNode).stop();
          }
          n.disconnect();
        } catch {
          // Abaikan node yang sudah dihentikan
        }
      });
    }, Math.round(delaySec * 1000));
  }

  private startHeroBacksound(ctx: AudioContext): void {
    if (!this.backsoundBus || !this.pinkBuffer) return;

    if (this.heroStopTimer) {
      window.clearTimeout(this.heroStopTimer);
      this.heroStopTimer = 0;
    }

    const now = ctx.currentTime;
    if (this.heroActive && this.heroBus) {
      this.heroBus.gain.cancelScheduledValues(now);
      this.heroBus.gain.setValueAtTime(this.heroBus.gain.value, now);
      this.heroBus.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
      return;
    }

    const heroBus = ctx.createGain();
    heroBus.gain.setValueAtTime(0.0001, now);
    heroBus.gain.linearRampToValueAtTime(1, now + 0.65);
    heroBus.connect(this.backsoundBus);

    // 1. Sub-bass berat & detuned untuk aura titan (naik seiring progress Belial)
    const subA = ctx.createOscillator();
    subA.type = 'sawtooth';
    subA.frequency.setValueAtTime(44, now);

    const subB = ctx.createOscillator();
    subB.type = 'triangle';
    subB.frequency.setValueAtTime(44.65, now);

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(72 + this.heroProgress * 135, now);
    subFilter.Q.setValueAtTime(2.2, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.012 + this.heroProgress * 0.088, now);

    subA.connect(subFilter);
    subB.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(heroBus);

    subA.start(now);
    subB.start(now);

    // 2. Gemuruh api/energi gelap prosedural (pink noise bandpass + modulasi lambat)
    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = this.pinkBuffer;
    rumbleSrc.loop = true;

    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'bandpass';
    rumbleFilter.frequency.setValueAtTime(155 + this.heroProgress * 195, now);
    rumbleFilter.Q.setValueAtTime(1.15, now);

    const rumbleLfo = ctx.createOscillator();
    rumbleLfo.type = 'sine';
    rumbleLfo.frequency.setValueAtTime(1.85, now);
    const rumbleLfoGain = ctx.createGain();
    rumbleLfoGain.gain.setValueAtTime(42, now);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0.008 + this.heroProgress * 0.095, now);

    rumbleLfo.connect(rumbleLfoGain);
    rumbleLfoGain.connect(rumbleFilter.frequency);
    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(heroBus);

    rumbleSrc.start(now);
    rumbleLfo.start(now);

    this.heroBus = heroBus;
    this.heroSubFilter = subFilter;
    this.heroSubGain = subGain;
    this.heroRumbleFilter = rumbleFilter;
    this.heroRumbleGain = rumbleGain;
    this.heroNodes = [
      subA,
      subB,
      subFilter,
      subGain,
      rumbleSrc,
      rumbleFilter,
      rumbleLfo,
      rumbleLfoGain,
      rumbleGain,
      heroBus,
    ];
    this.heroActive = true;
  }

  public setHeroBelialProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.heroProgress = p;
    if (this.bgmWanted && this.sceneMode === 'hero') {
      this.applyBgmMood(0.2);
    }
    if (!this.enabled || !this.tabVisible || !this.heroActive || !this.ctx) return;
    const now = this.ctx.currentTime;
    const curve = p * p * (3 - 2 * p);

    if (this.heroSubFilter && this.heroSubGain) {
      this.heroSubFilter.frequency.setTargetAtTime(72 + curve * 145, now, 0.08);
      this.heroSubGain.gain.setTargetAtTime(0.01 + curve * 0.092, now, 0.08);
    }
    if (this.heroRumbleFilter && this.heroRumbleGain) {
      this.heroRumbleFilter.frequency.setTargetAtTime(155 + curve * 210, now, 0.08);
      this.heroRumbleGain.gain.setTargetAtTime(0.006 + curve * 0.1, now, 0.08);
    }
  }

  public playBelialTransformUp(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    this.trackVoice(0.45);

    // 1. Thump sub-bass berat ketika progres melewati ambang 0.5
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(jitter(84, 0.03), now);
    thump.frequency.exponentialRampToValueAtTime(28, now + 0.4);

    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.001, now);
    tg.gain.linearRampToValueAtTime(0.32, now + 0.025);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    thump.connect(tg);
    tg.connect(this.sfxBus);
    thump.start(now);
    thump.stop(now + 0.44);

    // 2. Ledakan energi bara naik (tanpa whoosh agresif bila reducedMotion)
    if (!this.reducedMotion) {
      const src = ctx.createBufferSource();
      src.buffer = this.pinkBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(190, now);
      bp.frequency.exponentialRampToValueAtTime(1350, now + 0.34);
      bp.Q.setValueAtTime(1.6, now);

      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.linearRampToValueAtTime(0.14, now + 0.04);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      src.connect(bp);
      bp.connect(sg);
      sg.connect(this.sfxBus);
      src.start(now);
      src.stop(now + 0.38);
    }
  }

  public playBelialTransformDown(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    this.trackVoice(0.32);

    const sweep = ctx.createOscillator();
    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(140, now);
    sweep.frequency.exponentialRampToValueAtTime(42, now + 0.28);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    sweep.connect(g);
    g.connect(this.sfxBus);
    sweep.start(now);
    sweep.stop(now + 0.31);
  }

  private fadeOutHero(fadeSec: number): void {
    if (!this.heroActive || !this.ctx || !this.heroBus) return;
    const now = this.ctx.currentTime;
    this.heroBus.gain.cancelScheduledValues(now);
    this.heroBus.gain.setValueAtTime(this.heroBus.gain.value, now);
    this.heroBus.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    this.teardownHeroNodes(fadeSec + 0.08);
  }

  private teardownHeroNodes(delaySec: number): void {
    this.heroActive = false;
    if (this.heroStopTimer) {
      window.clearTimeout(this.heroStopTimer);
    }
    const nodes = this.heroNodes;
    this.heroNodes = [];
    this.heroBus = null;
    this.heroSubFilter = null;
    this.heroSubGain = null;
    this.heroRumbleFilter = null;
    this.heroRumbleGain = null;

    this.heroStopTimer = window.setTimeout(() => {
      nodes.forEach((n) => {
        try {
          if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
            (n as AudioScheduledSourceNode).stop();
          }
          n.disconnect();
        } catch {
          // Abaikan node yang sudah dihentikan
        }
      });
    }, Math.round(delaySec * 1000));
  }

  private canPlaySfx(): AudioContext | null {
    if (!this.enabled || !this.tabVisible || !this.hasUserGesture || this.masterVolume <= 0.001) {
      return null;
    }
    if (this.activeVoices >= MAX_CONCURRENT_VOICES) {
      return null;
    }
    return this.ensureGraph();
  }

  private trackVoice(durationSec: number): void {
    this.activeVoices++;
    window.setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, Math.ceil(durationSec * 1000) + 20);
  }

  // 1. Hover tab dock: tick halus bernada naik tipis (throttle >= 60ms)
  public playDockHover(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastHoverAt < HOVER_THROTTLE_MS) return;
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus) return;
    this.lastHoverAt = nowMs;

    const now = ctx.currentTime;
    const dur = jitter(0.045);
    this.trackVoice(dur);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(860), now);
    osc.frequency.exponentialRampToValueAtTime(jitter(1140), now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.045, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + dur + 0.005);
  }

  // 2. Klik tab dock: klik mekanis sakelar kokpit
  public playTabClick(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    const dur = jitter(0.065);
    this.trackVoice(dur);

    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = this.pinkBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(jitter(2100), now);
    bp.Q.setValueAtTime(2.4, now);

    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.14, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    clickSrc.connect(bp);
    bp.connect(cg);
    cg.connect(this.sfxBus);
    clickSrc.start(now);
    clickSrc.stop(now + 0.032);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(jitter(310), now);
    body.frequency.exponentialRampToValueAtTime(jitter(140), now + dur);

    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.1, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + dur);

    body.connect(bg);
    bg.connect(this.sfxBus);
    body.start(now);
    body.stop(now + dur + 0.005);
  }

  // 3. Pil dock meluncur: whoosh sangat tipis sebanding kecepatan
  public playPillSlide(speedNorm: number): void {
    if (this.reducedMotion) return;
    const nowMs = performance.now();
    if (nowMs - this.lastPillSlideAt < 90) return;
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;
    this.lastPillSlideAt = nowMs;

    const clamped = Math.max(0.15, Math.min(1, speedNorm));
    const now = ctx.currentTime;
    const dur = jitter(0.075);
    this.trackVoice(dur);

    const src = ctx.createBufferSource();
    src.buffer = this.pinkBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(jitter(540), now);
    filter.frequency.exponentialRampToValueAtTime(jitter(880 + clamped * 320), now + dur);
    filter.Q.setValueAtTime(1.5, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.025 * clamped, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(now, Math.random() * 2);
    src.stop(now + dur + 0.005);
  }

  // 4. Huruf judul flip: klak papan flip per huruf
  public playFlipClack(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    const dur = jitter(0.042);
    this.trackVoice(dur);

    const tap = ctx.createOscillator();
    tap.type = 'triangle';
    tap.frequency.setValueAtTime(jitter(640), now);
    tap.frequency.exponentialRampToValueAtTime(jitter(260), now + 0.032);

    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.065, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + dur);

    tap.connect(tg);
    tg.connect(this.sfxBus);
    tap.start(now);
    tap.stop(now + dur + 0.005);

    const snapSrc = ctx.createBufferSource();
    snapSrc.buffer = this.pinkBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(jitter(2900), now);

    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.05, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    snapSrc.connect(hp);
    hp.connect(sg);
    sg.connect(this.sfxBus);
    snapSrc.start(now, Math.random() * 2);
    snapSrc.stop(now + 0.026);
  }

  // 5a. Buka modal: whoosh naik singkat (tanpa whoosh panjang saat reduced-motion)
  public playModalOpen(): void {
    if (this.reducedMotion) {
      this.playTabClick();
      return;
    }
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    const dur = jitter(0.16);
    this.trackVoice(dur);

    const src = ctx.createBufferSource();
    src.buffer = this.pinkBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(jitter(320), now);
    filter.frequency.exponentialRampToValueAtTime(jitter(1420), now + dur);
    filter.Q.setValueAtTime(1.25, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(now);
    src.stop(now + dur + 0.01);
  }

  // 5b. Tutup modal: whoosh turun singkat (tanpa whoosh panjang saat reduced-motion)
  public playModalClose(): void {
    if (this.reducedMotion) {
      this.playBackClick();
      return;
    }
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    const dur = jitter(0.14);
    this.trackVoice(dur);

    const src = ctx.createBufferSource();
    src.buffer = this.pinkBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(jitter(1180), now);
    filter.frequency.exponentialRampToValueAtTime(jitter(260), now + dur);
    filter.Q.setValueAtTime(1.2, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.075, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);
    src.start(now);
    src.stop(now + dur + 0.01);
  }

  // 6. Buka detail frame: klik rana kamera dua tahap (half-press lalu full)
  public playDetailShutter(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    this.trackVoice(0.17);

    // Tahap 1: half-press AF micro-switch
    const halfOsc = ctx.createOscillator();
    halfOsc.type = 'sine';
    halfOsc.frequency.setValueAtTime(jitter(1680), now);
    halfOsc.frequency.exponentialRampToValueAtTime(jitter(1320), now + 0.024);

    const halfGain = ctx.createGain();
    halfGain.gain.setValueAtTime(0.055, now);
    halfGain.gain.exponentialRampToValueAtTime(0.001, now + 0.026);

    halfOsc.connect(halfGain);
    halfGain.connect(this.sfxBus);
    halfOsc.start(now);
    halfOsc.stop(now + 0.03);

    // Tahap 2: full shutter release (~72ms kemudian)
    const fullTime = now + jitter(0.072);
    const openSrc = ctx.createBufferSource();
    openSrc.buffer = this.pinkBuffer;

    const openFilter = ctx.createBiquadFilter();
    openFilter.type = 'bandpass';
    openFilter.frequency.setValueAtTime(jitter(2550), fullTime);
    openFilter.Q.setValueAtTime(1.7, fullTime);

    const openGain = ctx.createGain();
    openGain.gain.setValueAtTime(0.22, fullTime);
    openGain.gain.exponentialRampToValueAtTime(0.001, fullTime + 0.036);

    openSrc.connect(openFilter);
    openFilter.connect(openGain);
    openGain.connect(this.sfxBus);
    openSrc.start(fullTime);
    openSrc.stop(fullTime + 0.04);

    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(jitter(185), fullTime);
    bodyOsc.frequency.exponentialRampToValueAtTime(72, fullTime + 0.032);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.14, fullTime);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, fullTime + 0.035);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.sfxBus);
    bodyOsc.start(fullTime);
    bodyOsc.stop(fullTime + 0.038);

    // Tirai penutup (~36ms setelah pembuka)
    const closeTime = fullTime + jitter(0.036);
    const closeSrc = ctx.createBufferSource();
    closeSrc.buffer = this.pinkBuffer;

    const closeFilter = ctx.createBiquadFilter();
    closeFilter.type = 'bandpass';
    closeFilter.frequency.setValueAtTime(jitter(3150), closeTime);
    closeFilter.Q.setValueAtTime(2.0, closeTime);

    const closeGain = ctx.createGain();
    closeGain.gain.setValueAtTime(0.16, closeTime);
    closeGain.gain.exponentialRampToValueAtTime(0.001, closeTime + 0.03);

    closeSrc.connect(closeFilter);
    closeFilter.connect(closeGain);
    closeGain.connect(this.sfxBus);
    closeSrc.start(closeTime);
    closeSrc.stop(closeTime + 0.034);
  }

  // 7. Ganti frame / putar carousel: klik detent putaran mekanis
  public playCarouselTick(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus || !this.pinkBuffer) return;

    const now = ctx.currentTime;
    const dur = jitter(0.055);
    this.trackVoice(dur);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(jitter(1120), now);
    osc.frequency.exponentialRampToValueAtTime(jitter(420), now + dur);

    const og = ctx.createGain();
    og.gain.setValueAtTime(0.085, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(og);
    og.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + dur + 0.005);
  }

  // 8a. Kirim form berhasil: nada konfirmasi dua not
  public playFormSuccess(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus) return;

    const now = ctx.currentTime;
    this.trackVoice(0.26);

    const notes = [
      { offset: 0, freq: jitter(523.25), dur: 0.1 },
      { offset: 0.095, freq: jitter(783.99), dur: 0.16 },
    ];

    notes.forEach((n) => {
      const start = now + n.offset;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, start);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, start);
      g.gain.linearRampToValueAtTime(0.11, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

      osc.connect(g);
      g.connect(this.sfxBus!);
      osc.start(start);
      osc.stop(start + n.dur + 0.008);
    });
  }

  // 8b. Kirim form gagal: nada rendah pendek
  public playFormError(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus) return;

    const now = ctx.currentTime;
    const dur = jitter(0.16);
    this.trackVoice(dur);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(jitter(190), now);
    osc.frequency.exponentialRampToValueAtTime(jitter(132), now + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(480, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.09, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + dur + 0.008);
  }

  // 9. Tombol kembali & Esc: klik lembut
  public playBackClick(): void {
    const ctx = this.canPlaySfx();
    if (!ctx || !this.sfxBus) return;

    const now = ctx.currentTime;
    const dur = jitter(0.052);
    this.trackVoice(dur);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(jitter(520), now);
    osc.frequency.exponentialRampToValueAtTime(jitter(300), now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(now);
    osc.stop(now + dur + 0.005);
  }

  public dispose(): void {
    this.teardownBgm();
    this.teardownIntroNodes(0);
    this.teardownHeroNodes(0);
    this.teardownGalleryNodes(0);
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterBus = null;
    this.sfxBus = null;
    this.backsoundBus = null;
    this.pinkBuffer = null;
  }
}

export const audioEngine = new AviationAudioEngine();
