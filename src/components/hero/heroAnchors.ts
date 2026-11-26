export interface AnchorPoint {
  x: number;
  y: number;
}

/**
 * Titik acuan ternormalisasi (0..1) pada kanvas figur 1061x1889 / 374x667.
 * chest: titik ledakan alami bila transformasi dipicu tombol atau papan ketik.
 */
export const HERO_ANCHORS = {
  chest: { x: 0.5, y: 0.36 },
} as const satisfies Record<string, AnchorPoint>;

export const OWNER_IDENTITY = {
  fullName: 'Dikut Affan Aryansyah',
  nickname: 'Affan',
  aviationHandle: '@fanzfighters_pict',
  aviationUrl: 'https://www.instagram.com/fanzfighters_pict/',
  railHandle: '@affanzrailspotter',
  railUrl: 'https://www.instagram.com/affanzrailspotter/',
} as const;

export const FALLBACK_CUTOUT_URL =
  '/assets/aistudio/IMG_4200.jpg-removebg-preview_c3d490be.png';

const heroAssetGlob = import.meta.glob('/src/assets/hero/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function pickHeroAsset(prefix: string): string | null {
  for (const [path, url] of Object.entries(heroAssetGlob)) {
    const file = path.split('/').pop()?.toLowerCase() ?? '';
    if (file.startsWith(prefix)) {
      return url;
    }
  }
  return null;
}

export const HERO_ASSETS = {
  photoOriginalUrl: pickHeroAsset('photo-original'),
  figureCutoutUrl: pickHeroAsset('figure-cutout') ?? FALLBACK_CUTOUT_URL,
};

/** Kotak pembatas piksel buram (alpha > ambang), ternormalisasi 0..1 terhadap gambarnya. */
export interface AlphaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** berial2-removebg-preview.png (408x612): hasil ukur alpha > 24, dipakai sebelum pengukuran runtime selesai */
export const BELIAL_FALLBACK_BOUNDS: AlphaBounds = {
  minX: 10 / 408,
  maxX: 398 / 408,
  minY: 12 / 612,
  maxY: 1,
};

export const BELIAL_IMAGE_ASPECT = 408 / 612;

/** Titik mata dan batu dada pada gambar Belial (ternormalisasi) untuk cahaya yang berdenyut */
export const BELIAL_EYES = { x: 0.5, y: 0.125 } as const;
export const BELIAL_ORB = { x: 0.5, y: 0.43 } as const;

/** Cadangan bila pengukuran alpha cutout gagal (mis. CORS) */
export const HUMAN_FALLBACK_BOUNDS: AlphaBounds = {
  minX: 95 / 374,
  maxX: 347 / 374,
  minY: 67 / 667,
  maxY: 630 / 667,
};

/** Mengukur kotak alpha gambar dengan kanvas kecil; null bila gagal. */
export function measureAlphaBounds(img: HTMLImageElement, threshold = 24): AlphaBounds | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, 360 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(img, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    let minX = cw;
    let maxX = -1;
    let minY = ch;
    let maxY = -1;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (data[(y * cw + x) * 4 + 3] > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return {
      minX: minX / cw,
      maxX: (maxX + 1) / cw,
      minY: minY / ch,
      maxY: (maxY + 1) / ch,
    };
  } catch {
    return null;
  }
}
