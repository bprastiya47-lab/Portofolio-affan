export type VehicleArchetype =
  | 'twin-widebody'
  | 'turboprop-camo'
  | 'quad-a380'
  | 'quad-747'
  | 'locomotive-cc206';

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
  pattern?: 'korean' | 'garuda' | 'garuda-retro' | 'emirates' | 'thai' | 'anz' | 'cargolux' | 'mclaren' | 'camo' | 'kai';
}

export interface PortfolioItem {
  id: string;
  indexLabel: string;
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
  archetype: VehicleArchetype;
  livery: LiveryStyle;
  notes: string;
}

export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'ke-b777',
    indexLabel: '01',
    aircraft: 'Boeing 777-300ER',
    operator: 'Korean Air',
    registration: 'HL8209',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '200',
    focalLength: '420mm',
    location: 'CGK · Approach RWY 25R',
    liveryDesc: 'Blue/White Twin-Engine',
    imageUrl: '/assets/aistudio/IMG_1061__2_.jpg_b7ad7ee3.jpeg',
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
    notes: 'Full gear-down final approach capture with GE90-115B nacelles catching crisp midday azimuth light.',
  },
  {
    id: 'tniau-cn295',
    indexLabel: '02',
    aircraft: 'CN-295 Military Transport',
    operator: 'TNI AU Skadron Udara 2',
    registration: 'A-2903',
    year: '2026',
    shutter: '1/1600s',
    aperture: 'f/5.6',
    iso: '400',
    focalLength: '380mm',
    location: 'HLP · Halim Perdanakusuma AFB',
    liveryDesc: 'Camo Twin-Turboprop',
    imageUrl: '/assets/aistudio/IMG_8475__2_.jpg_98b230ee.jpeg',
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
    notes: 'Tactical woodland camouflage CN-295 lifting off past the historic Skadron Udara 2 arched hangar apron.',
  },
  {
    id: 'ga-b777',
    indexLabel: '03',
    aircraft: 'Boeing 777-300ER',
    operator: 'Garuda Indonesia',
    registration: 'PK-GIG',
    year: '2026',
    shutter: '1/1250s',
    aperture: 'f/6.3',
    iso: '320',
    focalLength: '300mm',
    location: 'CGK · Terminal 3 Apron',
    liveryDesc: 'White/Turquoise Tail',
    imageUrl: '/assets/aistudio/IMG_9512__2_.jpg_33ba273e.jpeg',
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
    notes: 'Overcast blue-hour pushback framing the twin GE90 intake fans and SkyTeam nose heraldry.',
  },
  {
    id: 'ek-a380',
    indexLabel: '04',
    aircraft: 'Airbus A380-800',
    operator: 'Emirates',
    registration: 'A6-EOY',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '250',
    focalLength: '450mm',
    location: 'DPS · Ngurah Rai RWY 09',
    liveryDesc: 'White/Gold Quad-Engine',
    imageUrl: '/assets/aistudio/IMG_5985__3_.jpg_07eb4fdd.jpeg',
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
    notes: 'Double-deck superjumbo rolling out in warm tropical sunset rim light with UAE flag tail sweep.',
  },
  {
    id: 'tg-a350',
    indexLabel: '05',
    aircraft: 'Airbus A350-900',
    operator: 'Thai Airways',
    registration: 'HS-THH',
    year: '2025',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '400',
    focalLength: '400mm',
    location: 'DPS · Departure Climb',
    liveryDesc: 'Purple/Gold Twin-Engine',
    imageUrl: '/assets/aistudio/IMG_6028.jpg_94f0d5fb.jpeg',
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
    notes: 'Magenta twilight climb-out matching the orchid-purple tail fin and signature A350 curved sharklets.',
  },
  {
    id: 'nz-b787',
    indexLabel: '06',
    aircraft: 'Boeing 787-9 Dreamliner',
    operator: 'Air New Zealand',
    registration: 'ZK-NZG',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/6.3',
    iso: '200',
    focalLength: '500mm',
    location: 'DPS · Runway Holding Point',
    liveryDesc: 'White/Black Tail',
    imageUrl: '/assets/aistudio/IMG_6156.jpg_32977c48.jpeg',
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
    notes: 'Tight telephoto close-up highlighting the 787 serrated engine chevrons and four-pane composite flight deck.',
  },
  {
    id: 'clx-b747',
    indexLabel: '07',
    aircraft: 'Boeing 747-8F',
    operator: 'Cargolux',
    registration: 'LX-VCD',
    year: '2025',
    shutter: '1/1600s',
    aperture: 'f/5.6',
    iso: '320',
    focalLength: '420mm',
    location: 'CGK · Golden Hour Taxiway',
    liveryDesc: 'White/Red Quad-Engine',
    imageUrl: '/assets/aistudio/IMG_9562.jpg_aa83052b.jpeg',
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
    notes: 'Queen of the Skies freighter gliding past volcanic mountain silhouettes beneath an amber sunset sky.',
  },
  {
    id: 'ey-mclaren',
    indexLabel: '08',
    aircraft: 'Boeing 787-9',
    operator: 'Etihad Airways McLaren Livery',
    registration: 'A6-BMI',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '200',
    focalLength: '450mm',
    location: 'CGK · Clear Sky Final',
    liveryDesc: 'Papaya Orange/Black',
    imageUrl: '/assets/aistudio/IMG_1117__2_.jpg_e65e193b.jpeg',
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
    notes: 'Special Formula 1 McLaren Racing papaya-orange and carbon-black faceted tail livery on clean final.',
  },
  {
    id: 'ga-retro',
    indexLabel: '09',
    aircraft: 'Airbus A330-300',
    operator: 'Garuda Indonesia Retro Livery',
    registration: 'PK-GHG',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '250',
    focalLength: '420mm',
    location: 'CGK · Storm Cloud Approach',
    liveryDesc: 'Classic Red/White',
    imageUrl: '/assets/aistudio/IMG_1105.jpg_a152ed8c.jpeg',
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
    notes: '1970s heritage red cheatline and classic geometric Garuda tail emblem framed against dramatic slate storm clouds.',
  },
  {
    id: 'kai-cc206',
    indexLabel: '10',
    aircraft: 'Locomotives CC 206',
    operator: 'KAI (Kereta Api Indonesia)',
    registration: 'CC 206 13 62',
    year: '2026',
    shutter: '1/2000s',
    aperture: 'f/5.6',
    iso: '320',
    focalLength: '300mm',
    location: 'DAOP 1 · Golden Hour Mainline',
    liveryDesc: 'KAI Red/White Diesel-Electric',
    specialBadge: 'AffanzRailspotter Collaboration',
    imageUrl: '/assets/aistudio/IMG_0710__2_.jpg_aed01d05.jpeg',
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
    notes: 'GE CM20EMP dual-cab diesel-electric locomotive hauling stainless passenger consist in golden-hour backlight.',
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
    category: 'Primary Body',
    name: 'Canon EOS R5',
    spec: '45MP Full-Frame · 20 fps Electronic · Dual Pixel AF II',
    role: 'High-resolution widebody close-ups & heavy crop versatility',
  },
  {
    category: 'Secondary Body',
    name: 'Canon EOS R7',
    spec: '32.5MP APS-C · 1.6x Reach · 15 fps Mechanical',
    role: 'Extended telephoto reach on runway centerline departures',
  },
  {
    category: 'Primary Telephoto',
    name: 'RF 100-500mm f/4.5-7.1L IS USM',
    spec: '5-Stop Optical IS · Dual Nano USM · Weather Sealed',
    role: 'Go-to tracking glass for fast final approaches and airshows',
  },
  {
    category: 'Super Telephoto',
    name: 'Sigma 150-600mm f/5-6.3 DG OS HSM',
    spec: 'Contemporary · 600mm Reach · Custom AF Limiter',
    role: 'Nose-gear taxiway portraits and heat-haze compression shots',
  },
  {
    category: 'Apron & Night',
    name: 'RF 24-70mm f/2.8L IS USM',
    spec: 'Constant f/2.8 · 0.21m Min Focus · L-Series Optics',
    role: 'Ramp pushbacks, hangar wide shots, and golden-hour locomotives',
  },
  {
    category: 'Field Support',
    name: 'Uniden Bearcat & CFexpress Type B',
    spec: 'VHF Airband 118–137 MHz · 1700 MB/s Sustained Write',
    role: 'Real-time ATC runway assignment monitoring and burst capture',
  },
];

export interface SpotterStat {
  label: string;
  value: string;
  detail: string;
}

export const SPOTTER_SPECS: SpotterStat[] = [
  { label: 'Curated Heavy Frames', value: '10', detail: 'Widebody jets, military airlift & mainline rail' },
  { label: 'Primary Airfields', value: 'CGK · HLP · DPS', detail: 'Soekarno-Hatta, Halim AFB & Ngurah Rai' },
  { label: 'Action Shutter Baseline', value: '1/2000s', detail: 'Motion-frozen turbine blades & touchdown smoke' },
  { label: 'Archive Window', value: '2025 — 2026', detail: 'Active field seasons & special livery intercepts' },
];
