export const OWNER_IDENTITY = {
  fullName: 'Dikut Affan Aryansyah',
  nickname: 'Affan',
  brand: 'FANZ FIGHTERS',
  aviationHandle: '@fanzfighters_pict',
  aviationUrl: 'https://www.instagram.com/fanzfighters_pict/',
  railHandle: '@affanzrailspotter',
  railUrl: 'https://www.instagram.com/affanzrailspotter/',
} as const;

export const HERO_PATHS = {
  personBack: '/assets/hero/person-back.png',
  personFront: '/assets/hero/person-front.png',
  transform: '/assets/hero/transform.png',
  mountain: '/assets/hero/mountain.jpg',
  treesLeft: '/assets/hero/trees-left.png',
  treesRight: '/assets/hero/trees-right.png',
  foliageBottom: '/assets/hero/foliage-bottom.png',
} as const;

/**
 * Pengukuran kotak opak hasil alpha-trim untuk menyelaraskan `transform.png` (411x606)
 * tepat di atas `person-back.png` (374x667) saat efek lingkaran atau transformasi penuh.
 *
 * person-back.png (374x667): tubuh opak X 95..348 (pusat 0.592, lebar 0.676), Y 67..631 (tinggi 0.8456)
 * transform.png (411x606): tubuh opak X 34..380 (pusat 0.5036, lebar 0.8418), Y 0..606 (tinggi 1.0)
 */
export const SILHOUETTE_ALIGNMENT = {
  humanCanvasAspect: 374 / 667,
  humanCenterX: 221.5 / 374,
  humanTopY: 67 / 667,
  humanHeightRatio: 564 / 667,

  transformCenterX: 207 / 411,
  transformAspect: 411 / 606,
  // Koordinat fitur glow pada transform.png (ternormalisasi 0..1 pada gambar transform.png)
  eyeCenter: { x: 0.525, y: 0.165 },
  chestCore: { x: 0.50, y: 0.345 },
} as const;
