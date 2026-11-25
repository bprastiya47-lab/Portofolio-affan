export interface AnchorPoint {
  x: number;
  y: number;
}

/**
 * Jangkar proporsional (koordinat ternormalisasi 0..1 terhadap kanvas figur 1061x1889 / 374x667)
 * Memastikan tanduk, aura bahu, cakar tangan kiri, dan bara keliman mantel tetap akurat di semua viewport.
 */
export const HERO_ANCHORS = {
  head: { x: 0.50, y: 0.16 },
  headTop: { x: 0.50, y: 0.11 },
  leftShoulder: { x: 0.34, y: 0.27 },
  rightShoulder: { x: 0.70, y: 0.27 },
  coatHem: { x: 0.50, y: 0.82 },
  leftHand: { x: 0.28, y: 0.56 },
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

export const FALLBACK_BELIAL_URL =
  '/assets/aistudio/berial2-removebg-preview_5178deb7.png';

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
  // src/assets/hero/berial2-removebg-preview.png (atau belial-form.png); cadangan di public/assets/aistudio
  belialFormUrl:
    pickHeroAsset('berial2-removebg-preview') ??
    pickHeroAsset('belial-form') ??
    pickHeroAsset('berial2') ??
    FALLBACK_BELIAL_URL,
};
