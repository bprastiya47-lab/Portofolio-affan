export type VehicleArchetype =
  | 'twin-widebody'
  | 'turboprop-camo'
  | 'quad-a380'
  | 'quad-747'
  | 'locomotive-cc206';

export type PortfolioCategory = 'pesawat' | 'kereta';

export interface LiveryStyle {
  fuselage: string;
  belly: string;
  tail: string;
  accent: string;
  secondaryAccent?: string;
  engine: string;
  wing: string;
  registration: string;
  titleText: string;
  variant?: '777' | '787' | 'a350' | 'a330' | 'a380' | '747' | 'cn295' | 'cc206';
  pattern?:
    | 'korean'
    | 'garuda'
    | 'garuda-retro'
    | 'emirates'
    | 'thai'
    | 'anz'
    | 'cargolux'
    | 'mclaren'
    | 'camo'
    | 'kai';
}

export interface PortfolioItem {
  id: string;
  indexLabel: string;
  category: PortfolioCategory;
  aircraft: string;
  operator: string;
  registration: string;
  year: string;
  shutter: string;
  aperture: string;
  iso: string;
  focalLength: string;
  location: string;
  liveryDesc: string;
  specialBadge?: string;
  imageUrl: string;
  thumbUrl: string;
  srcSet: string;
  blurDataUrl: string;
  archetype: VehicleArchetype;
  livery: LiveryStyle;
  notes: string;
}

export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'ke-b777',
    indexLabel: '01',
    category: 'pesawat',
    aircraft: 'Boeing 777-300ER',
    operator: 'Korean Air',
    registration: 'HL8209',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '200',
    focalLength: '420mm',
    location: 'CGK · Approach RWY 25R',
    liveryDesc: 'Biru Langit / Putih Twin-Engine',
    imageUrl: '/assets/gallery/ke-b777-2000.webp',
    thumbUrl: '/assets/gallery/ke-b777-800.webp',
    srcSet: '/assets/gallery/ke-b777-800.webp 800w, /assets/gallery/ke-b777-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRpAAAABXRUJQVlA4IIQAAABQBACdASoYABAAPtFUo0uoJKMhsAgBABoJagCdMoMYAElpjuvoBcBCApIAAP7owp9xDMocfxVPSm1kOrBKmeM6rG9XYcktpwe+vs/qz0GO+0Flb7ebB206U5dN9fctR/kz7lw1zxReGxfTn7nIkqvbzbYdLTsjVIKGLtgBhbVsudMAAAA=',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#1CA9E8',
      belly: '#F1F5F9',
      tail: '#1CA9E8',
      accent: '#C8102E',
      secondaryAccent: '#0F2C59',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'HL8209',
      titleText: 'KOREAN AIR',
      variant: '777',
      pattern: 'korean',
    },
    notes: 'Pendekatan akhir dengan roda pendaratan penuh dan nacelle GE90-115B menangkap cahaya siang yang tajam.',
  },
  {
    id: 'tniau-cn295',
    indexLabel: '02',
    category: 'pesawat',
    aircraft: 'CN-295 Angkut Militer',
    operator: 'TNI AU Skadron Udara 2',
    registration: 'A-2903',
    year: '2026',
    shutter: '1/1600s',
    aperture: 'f/5.6',
    iso: '400',
    focalLength: '380mm',
    location: 'HLP · Lanud Halim Perdanakusuma',
    liveryDesc: 'Kamuflase Twin-Turboprop',
    imageUrl: '/assets/gallery/tniau-cn295-2000.webp',
    thumbUrl: '/assets/gallery/tniau-cn295-800.webp',
    srcSet: '/assets/gallery/tniau-cn295-800.webp 800w, /assets/gallery/tniau-cn295-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRqYAAABXRUJQVlA4IJoAAACwBACdASoYABAAPtFWo0uoJKMhsAgBABoJZQDE6f/gPJQ5OCff1kzs/xTxDwoAAP7znlEQg154WUzmn7wZtAgrzXuaYaP7CtnO5s9l7gV+P7pVPqmVEa0bf8m3PTILHktD3ztUhyhUxmpvfBDFa360Fu6QNdefanbueMA51E0heqWfBMkVTewoJJRH0klv8KtwN9V7Hd1IAAAA',
    archetype: 'turboprop-camo',
    livery: {
      fuselage: '#465433',
      belly: '#3D4730',
      tail: '#333D26',
      accent: '#7A6248',
      secondaryAccent: '#23281E',
      engine: '#4E5B3B',
      wing: '#52613D',
      registration: 'A-2903',
      titleText: 'TNI ANGKATAN UDARA',
      variant: 'cn295',
      pattern: 'camo',
    },
    notes: 'CN-295 berkamuflase taktis lepas landas melewati hanggar lengkung bersejarah Skadron Udara 2.',
  },
  {
    id: 'ga-b777',
    indexLabel: '03',
    category: 'pesawat',
    aircraft: 'Boeing 777-300ER',
    operator: 'Garuda Indonesia',
    registration: 'PK-GIG',
    year: '2026',
    shutter: '1/1250s',
    aperture: 'f/6.3',
    iso: '320',
    focalLength: '300mm',
    location: 'CGK · Apron Terminal 3',
    liveryDesc: 'Putih / Ekor Toska',
    imageUrl: '/assets/gallery/ga-b777-2000.webp',
    thumbUrl: '/assets/gallery/ga-b777-800.webp',
    srcSet: '/assets/gallery/ga-b777-800.webp 800w, /assets/gallery/ga-b777-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAAAwBACdASoYABAAPtFUo0uoJKMhsAgBABoJYwCdACHdftDrNNKfV0T40AAA/lvpgXTJIKBsebJBf0zWlcn+h4rUw1R5qdw8fSuY3ysl6DpALnaFkCThk9qAPRTBSpvwmhVr+Dt9wVmsNffds6KSV8nPkuYHt9zNN/Ir2xl8Un2yoWycnGB+j1I8THyHp2zfzZgrbbYPyINtk4F3Qh5hA4ccS6AAAA==',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#E2E8F0',
      tail: '#007C92',
      accent: '#00A3B4',
      secondaryAccent: '#0B3B60',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'PK-GIG',
      titleText: 'Garuda Indonesia',
      variant: '777',
      pattern: 'garuda',
    },
    notes: 'Momen pushback di blue hour mendung menonjolkan bilah kipas GE90 dan emblem hidung SkyTeam.',
  },
  {
    id: 'ek-a380',
    indexLabel: '04',
    category: 'pesawat',
    aircraft: 'Airbus A380-800',
    operator: 'Emirates',
    registration: 'A6-EOY',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '250',
    focalLength: '450mm',
    location: 'DPS · Ngurah Rai RWY 09',
    liveryDesc: 'Putih / Emas Quad-Engine',
    imageUrl: '/assets/gallery/ek-a380-2000.webp',
    thumbUrl: '/assets/gallery/ek-a380-800.webp',
    srcSet: '/assets/gallery/ek-a380-800.webp 800w, /assets/gallery/ek-a380-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRrgAAABXRUJQVlA4IKwAAABQBACdASoYABAAPtFUo0uoJKMhsAgBABoJYwCdIE36gAcZZeCvE1bt9bgAAP5AZfCSeL3zIVuq6MkfOxJ3O9sZd9Xelb3So8v0vf1VFgcQ+rjI7IP150+RodQtR7ZFt2syCWSIEyA6N3YR7aC4wPiL98q/ABGbfEEuvfswYf06u/dmo2iNKCI+YyHyYD2p8TkXmTgSrYIGJkk97aR/NXrZi6kYj723ZKYkH1AABLUR',
    archetype: 'quad-a380',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#E2E8F0',
      tail: '#CE1126',
      accent: '#C6973D',
      secondaryAccent: '#007A3D',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'A6-EOY',
      titleText: 'Emirates',
      variant: 'a380',
      pattern: 'emirates',
    },
    notes: 'Superjumbo dua dek meluncur di landasan berbalut cahaya rim senja tropis dengan ekor bendera UEA.',
  },
  {
    id: 'tg-a350',
    indexLabel: '05',
    category: 'pesawat',
    aircraft: 'Airbus A350-900',
    operator: 'Thai Airways',
    registration: 'HS-THH',
    year: '2025',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '400',
    focalLength: '400mm',
    location: 'DPS · Departure Climb',
    liveryDesc: 'Ungu / Emas Twin-Engine',
    imageUrl: '/assets/gallery/tg-a350-2000.webp',
    thumbUrl: '/assets/gallery/tg-a350-800.webp',
    srcSet: '/assets/gallery/tg-a350-800.webp 800w, /assets/gallery/tg-a350-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRrIAAABXRUJQVlA4IKYAAAAwBACdASoYABAAPtFUo0uoJKMhsAgBABoJQBOgBA3nh8uqTgrvscu5PAAA9i0dYIMGTK22i/NyXigSgPNxKPwRqTpfg2S9PPBuJrImvdTiN5m0bRR/ZxMWXI9sKKYUpuK81RMUWom++rdz8gxVH80CKyC3joXI5hknp8HN5yRkZk/1NOXZeqaxhDqGMdO/V/DsPolkwjGmKQpoYrIfglkeDAa8AAAABLUR',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#F1F5F9',
      tail: '#4B1D77',
      accent: '#E2A622',
      secondaryAccent: '#D11E6C',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'HS-THH',
      titleText: 'THAI',
      variant: 'a350',
      pattern: 'thai',
    },
    notes: 'Menanjak di langit senja magenta yang serasi dengan ekor ungu anggrek dan winglet lengkung khas A350.',
  },
  {
    id: 'nz-b787',
    indexLabel: '06',
    category: 'pesawat',
    aircraft: 'Boeing 787-9 Dreamliner',
    operator: 'Air New Zealand',
    registration: 'ZK-NZG',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/6.3',
    iso: '200',
    focalLength: '500mm',
    location: 'DPS · Holding Point Landasan',
    liveryDesc: 'Putih / Ekor Hitam',
    imageUrl: '/assets/gallery/nz-b787-2000.webp',
    thumbUrl: '/assets/gallery/nz-b787-800.webp',
    srcSet: '/assets/gallery/nz-b787-800.webp 800w, /assets/gallery/nz-b787-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAACQBACdASoYABAAPtFUo0uoJKMhsAgBABoJZACdMoMYDBoDPCnlC/UKxtwObwAA/u3pW5fA3HU/8+bJPT4jKJs060ZyXIYTmYQPVi/tNXUCTBKlBNEZ/wQOXXB4ZHAP8MTG9J/hgcbLRdPspaUZ4DvQ0/6AmQOqqqaQrRlOYLx7QvBk9JFs7G/F1QKbKCBsgiotNw77Id/AAA==',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#E2E8F0',
      tail: '#111827',
      accent: '#F8FAFC',
      secondaryAccent: '#0F172A',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'ZK-NZG',
      titleText: 'AIR NEW ZEALAND',
      variant: '787',
      pattern: 'anz',
    },
    notes: 'Tangkapan telefoto rapat menonjolkan gerigi chevron mesin 787 dan empat kaca kokpit komposit.',
  },
  {
    id: 'clx-b747',
    indexLabel: '07',
    category: 'pesawat',
    aircraft: 'Boeing 747-8F',
    operator: 'Cargolux',
    registration: 'LX-VCD',
    year: '2025',
    shutter: '1/1600s',
    aperture: 'f/5.6',
    iso: '320',
    focalLength: '420mm',
    location: 'CGK · Taxiway Golden Hour',
    liveryDesc: 'Putih / Merah Quad-Engine',
    imageUrl: '/assets/gallery/clx-b747-2000.webp',
    thumbUrl: '/assets/gallery/clx-b747-800.webp',
    srcSet: '/assets/gallery/clx-b747-800.webp 800w, /assets/gallery/clx-b747-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRrYAAABXRUJQVlA4IKoAAACwBACdASoYABAAPtFWpEuoJKOhsAgBABoJbACdMoHgA5+MB5CQ0DXXsy4KqJIAAP7Fz4L0Rz6nyr2qSBp9Rru3Hs0S4CAdDk5KbVxSbVpulhsluahUYD5Bey00GiyJ7r55IiW1pi2BlshhRwrkTqtkKBXoF85NyU59nnC98xnh5Qvgw+nE10AtgOjFZbvt85z4fhN1RmdR8KkdHykOaxw0Nsa6n4XROKTAAA==',
    archetype: 'quad-747',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#CBD5E1',
      tail: '#D90429',
      accent: '#D90429',
      secondaryAccent: '#0077B6',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'LX-VCD',
      titleText: 'cargolux',
      variant: '747',
      pattern: 'cargolux',
    },
    notes: 'Pesawat kargo Queen of the Skies meluncur melewati siluet pegunungan di bawah langit senja keemasan.',
  },
  {
    id: 'ey-mclaren',
    indexLabel: '08',
    category: 'pesawat',
    aircraft: 'Boeing 787-9',
    operator: 'Etihad Airways McLaren Livery',
    registration: 'A6-BMI',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '200',
    focalLength: '450mm',
    location: 'CGK · Clear Sky Final',
    liveryDesc: 'Oranye Papaya / Hitam',
    imageUrl: '/assets/gallery/ey-mclaren-2000.webp',
    thumbUrl: '/assets/gallery/ey-mclaren-800.webp',
    srcSet: '/assets/gallery/ey-mclaren-800.webp 800w, /assets/gallery/ey-mclaren-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAABwBACdASoYABAAPtFUo0uoJKMhsAgBABoJbACdMoRwGQAAcaA2F2393l7NAAD+zTftR8pgjjpNO6CHse7x2+yB3iXZOS+tK+2pvCDNXh6t/WU7iA15S7a2TK8oYHKJiNkGg92frwscVwAUnFywSBHnLmfD6tzAAAA=',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#FF8000',
      belly: '#14171C',
      tail: '#14171C',
      accent: '#FF8000',
      secondaryAccent: '#F8FAFC',
      engine: '#FF8000',
      wing: '#CBD5E1',
      registration: 'A6-BMI',
      titleText: 'ETIHAD · McLAREN',
      variant: '787',
      pattern: 'mclaren',
    },
    notes: 'Livery khusus Formula 1 McLaren Racing berwarna oranye papaya dan karbon hitam saat final approach cerah.',
  },
  {
    id: 'ga-retro',
    indexLabel: '09',
    category: 'pesawat',
    aircraft: 'Airbus A330-300',
    operator: 'Garuda Indonesia Retro Livery',
    registration: 'PK-GHG',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '250',
    focalLength: '420mm',
    location: 'CGK · Pendekatan Awan Badai',
    liveryDesc: 'Klasik Merah / Putih',
    imageUrl: '/assets/gallery/ga-retro-2000.webp',
    thumbUrl: '/assets/gallery/ga-retro-800.webp',
    srcSet: '/assets/gallery/ga-retro-800.webp 800w, /assets/gallery/ga-retro-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRngAAABXRUJQVlA4IGwAAADwAwCdASoYABAAPtFUo0uoJKMhsAgBABoJYwC06CHc78UR5SLOC+SgAP6wegxiJkddHNnwQGN6gS+VaW6fl0fV6OG5rtfrTrBu7vNR8+Pya9OLJ3jHG+yVRuaqEwqaC+hSVLFiCZIjZTHgAAA=',
    archetype: 'twin-widebody',
    livery: {
      fuselage: '#F8FAFC',
      belly: '#E2E8F0',
      tail: '#F8FAFC',
      accent: '#C8102E',
      secondaryAccent: '#1E293B',
      engine: '#F8FAFC',
      wing: '#CBD5E1',
      registration: 'PK-GHG',
      titleText: 'garuda · REPUBLIK INDONESIA',
      variant: 'a330',
      pattern: 'garuda-retro',
    },
    notes: 'Garis merah era 1970-an dan emblem ekor Garuda klasik dibingkai awan badai kelabu yang dramatis.',
  },
  {
    id: 'kai-cc206',
    indexLabel: '10',
    category: 'kereta',
    aircraft: 'Lokomotif CC 206',
    operator: 'KAI (Kereta Api Indonesia)',
    registration: 'CC 206 13 62',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '320',
    focalLength: '300mm',
    location: 'DAOP 1 · Jalur Utama Golden Hour',
    liveryDesc: 'Diesel-Elektrik Merah / Putih KAI',
    specialBadge: 'Kolaborasi AffanzRailspotter',
    imageUrl: '/assets/gallery/kai-cc206-2000.webp',
    thumbUrl: '/assets/gallery/kai-cc206-800.webp',
    srcSet: '/assets/gallery/kai-cc206-800.webp 800w, /assets/gallery/kai-cc206-2000.webp 2000w',
    blurDataUrl:
      'data:image/webp;base64,UklGRrAAAABXRUJQVlA4IKQAAACwBACdASoYABAAPtFUo0uoJKMhsAgBABoJZgCdMoACtc75RYyTk5R5bcXVxW4AAP7zmwyu5NbcB3dZA2TPA/DqL4yfjikpXZsAlpACdmfZMVqJWn+fAb5T7+Cnu9kuAEseMC5S4/5hVV8Y1fZxjLE7Vx1jBIcbV4xcXWihZYiRvOUqMb26HA9k3cBFRP0GiEL1YOzuAlJfKM82/+iC4bgc9ScAAA==',
    archetype: 'locomotive-cc206',
    livery: {
      fuselage: '#C8232C',
      belly: '#1E242B',
      tail: '#F8FAFC',
      accent: '#1E3A8A',
      secondaryAccent: '#EA580C',
      engine: '#334155',
      wing: '#94A3B8',
      registration: 'CC 206 13 62',
      titleText: 'KAI',
      variant: 'cc206',
      pattern: 'kai',
    },
    notes: 'Lokomotif diesel-elektrik kabin ganda GE CM20EMP menarik rangkaian penumpang stainless steel dalam cahaya senja.',
  },
];

export interface GearItem {
  category: string;
  name: string;
  spec: string;
  role: string;
}

export const GEAR_ITEMS: GearItem[] = [
  {
    category: 'Bodi Utama',
    name: 'Canon EOS R5',
    spec: '45MP Full-Frame · 20 fps Elektronik · Dual Pixel AF II',
    role: 'Close-up widebody beresolusi tinggi & fleksibilitas crop tajam',
  },
  {
    category: 'Bodi Sekunder',
    name: 'Canon EOS R7',
    spec: '32.5MP APS-C · 1.6x Reach · 15 fps Mekanik',
    role: 'Jangkauan telefoto ekstra saat pesawat menanjak dari sumbu landasan',
  },
  {
    category: 'Telefoto Utama',
    name: 'RF 100-500mm f/4.5-7.1L IS USM',
    spec: '5-Stop Optical IS · Dual Nano USM · Weather Sealed',
    role: 'Lensa andalan pelacakan final approach dan manuver udara',
  },
];
