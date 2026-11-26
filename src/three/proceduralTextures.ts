import * as THREE from 'three';
import { LiveryStyle } from '../data/portfolioData';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function createFuselageTexture(livery: LiveryStyle): THREE.CanvasTexture {
  const key = `fuselage:${livery.pattern}:${livery.registration}:${livery.fuselage}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // LatheGeometry wraps V from nose (bottom) to tail (top) or U around circumference.
  // We map fuselage horizontally along X (0 = nose, 1024 = tail) and vertically along Y (0 = top, 512 = bottom).
  ctx.fillStyle = livery.fuselage;
  ctx.fillRect(0, 0, 1024, 512);

  if (livery.pattern === 'camo') {
    // Woodland tactical camouflage splotches
    const camoColors = ['#3B4B2A', '#5E4D36', '#252B1E', '#6B7449', '#4A5735'];
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = camoColors[i % camoColors.length];
      ctx.beginPath();
      const cx = rand() * 1024;
      const cy = rand() * 512;
      const rx = 45 + rand() * 95;
      const ry = 28 + rand() * 65;
      ctx.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // Lower dark tactical belly
    ctx.fillStyle = '#2B3324';
    ctx.fillRect(0, 355, 1024, 157);
  } else {
    // Belly color split (lower ~36% of fuselage)
    ctx.fillStyle = livery.belly;
    ctx.fillRect(0, 330, 1024, 182);
  }

  // Specific airline cheatlines & markings (drawn for both left & right sides symmetrically using Y bands)
  // On our LatheGeometry UVs, we rotate fuselage so U=0..0.5 is starboard and U=0.5..1 is port, OR we draw symmetrically!
  // Let's inspect how LatheGeometry assigns UVs: u goes 0->1 around phi (0..2PI), v goes 0->1 along profile points.
  // If we rotate the canvas texture or draw fuselage with Cylinder/Lathe, let's align cleanly:
  // Actually, in Three.js LatheGeometry: x = sin(phi)*r, z = cos(phi)*r, y = profile.y.
  // Wait: it's even cleaner to make `createFuselageTexture` tile around circumference (V = circumference or U = circumference)!
  // Let's orient our texture cleanly: U = around circumference (0..1), V = nose-to-tail (0..1) if using standard LatheGeometry!
  // Wait — let's make sure the texture matches LatheGeometry directly!
  // In LatheGeometry:
  // - u = phi / (2 * PI) (0..1 around the cylinder)
  // - v = i / (points.length - 1) (0 at first point = nose, 1 at last point = tail!)
  // So if we draw on canvas where X = u (circumference: 0 = bottom/keel, 0.25 = right side, 0.5 = top spine, 0.75 = left side),
  // AND Y = v (from bottom=0 nose or top=1 tail, note CanvasTexture flipY=true by default so y=canvasHeight*(1-v)!).
  // That's SO smart and exact! Let's implement this exact UV mapping so windows, belly, cheatlines, and titles sit flawlessly on BOTH sides of the fuselage!

  // Re-clear and draw in exact Lathe UV coordinates:
  // X (0..1024): phi from 0 to 2*PI.
  // Let's set LatheGeometry phiStart = 0, phiLength = Math.PI * 2.
  // In LatheGeometry: x = r * sin(phi), z = r * cos(phi).
  // If fuselage axis is rotated so +Y_lathe points toward +X (nose) or -Z (nose):
  // Let's rotate the Lathe mesh by rotation.z = -Math.PI / 2 so +Y_lathe -> +X (nose at +X, tail at -X) OR rotation.x = Math.PI / 2 so +Y_lathe -> +Z.
  // Better: rotation.z = Math.PI / 2 -> +Y_lathe points to -X, -Y_lathe points to +X.
  // Let's define profile points from tail (y = -L/2, v = 0) to nose (y = +L/2, v = 1), and rotate group so +Y_lathe -> +Z (forward) via rotation.x = Math.PI / 2!
  // When rotation.x = Math.PI / 2:
  // Local (x, y, z) -> (x, -z, y).
  // So:
  // - +Y_lathe (v = 1) -> +Z (Nose!) -> Top of canvas (y=0 when flipY=true)!
  // - -Y_lathe (v = 0) -> -Z (Tail!) -> Bottom of canvas (y=512 when flipY=true)!
  // - At phi = 0 (u = 0): x=0, z=+r -> rotated -> y = -r (BELLY!)
  // - At phi = PI/2 (u = 0.25): x=+r, z=0 -> rotated -> x = +r (LEFT / PORT SIDE!)
  // - At phi = PI (u = 0.50): x=0, z=-r -> rotated -> y = +r (TOP SPINE!)
  // - At phi = 3*PI/2 (u = 0.75): x=-r, z=0 -> rotated -> x = -r (RIGHT / STARBOARD SIDE!)
  // Let's verify that!
  // Rotate around X by +90 deg (+PI/2):
  // y' = y*cos(90) - z*sin(90) = -z
  // z' = y*sin(90) + z*cos(90) = y
  // Yes!!
  // u = 0 (x=0..80, 944..1024) = Belly!
  // u = 0.25 (x=256) = +X side (Starboard/Port)!
  // u = 0.50 (x=512) = Top Spine!
  // u = 0.75 (x=768) = -X side!
  // And v=1 (Nose) = canvas y = 0 (top of canvas); v=0 (Tail) = canvas y = 512 (bottom of canvas)!

  ctx.clearRect(0, 0, 1024, 512);

  // Base fuselage fill
  ctx.fillStyle = livery.fuselage;
  ctx.fillRect(0, 0, 1024, 512);

  if (livery.pattern === 'camo') {
    const camoColors = ['#3E4D2C', '#624F36', '#23281D', '#6E7A4B', '#4B5937'];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 85; i++) {
      ctx.fillStyle = camoColors[i % camoColors.length];
      ctx.beginPath();
      ctx.ellipse(
        rand() * 1024,
        rand() * 512,
        40 + rand() * 85,
        25 + rand() * 55,
        rand() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Belly band at u around 0 (0..130 and 894..1024)
    ctx.fillStyle = '#2B3324';
    ctx.fillRect(0, 0, 130, 512);
    ctx.fillRect(894, 0, 130, 512);
  } else {
    // Belly band along u near 0 and 1 (bottom of fuselage)
    ctx.fillStyle = livery.belly;
    ctx.fillRect(0, 0, 160, 512);
    ctx.fillRect(864, 0, 160, 512);

    if (livery.pattern === 'korean') {
      // Korean Air: silver cheatline separating blue top and white belly
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(156, 0, 8, 512);
      ctx.fillRect(860, 0, 8, 512);
    } else if (livery.pattern === 'garuda-retro') {
      // Classic red cheatline along both sides
      ctx.fillStyle = livery.accent;
      ctx.fillRect(215, 0, 16, 512);
      ctx.fillRect(793, 0, 16, 512);
    } else if (livery.pattern === 'cargolux') {
      // Red & blue twin cheatlines
      ctx.fillStyle = '#D90429';
      ctx.fillRect(215, 0, 14, 512);
      ctx.fillRect(795, 0, 14, 512);
      ctx.fillStyle = '#0077B6';
      ctx.fillRect(200, 0, 8, 512);
      ctx.fillRect(816, 0, 8, 512);
      // Red tail cone sweep
      ctx.fillStyle = '#D90429';
      ctx.fillRect(0, 410, 1024, 102);
    } else if (livery.pattern === 'thai') {
      // Rear purple/gold/magenta ribbon sweep
      ctx.fillStyle = '#4B1D77';
      ctx.fillRect(0, 355, 1024, 157);
      ctx.fillStyle = '#E2A622';
      ctx.fillRect(0, 342, 1024, 10);
      ctx.fillStyle = '#D11E6C';
      ctx.fillRect(0, 330, 1024, 10);
    } else if (livery.pattern === 'mclaren') {
      // Etihad McLaren: papaya orange front, sweeping black rear
      ctx.fillStyle = '#14171C';
      ctx.fillRect(0, 290, 1024, 222);
      ctx.fillRect(0, 0, 150, 512);
      ctx.fillRect(874, 0, 150, 512);
      // Papaya swoosh arc on sides
      ctx.fillStyle = '#FF8000';
      ctx.beginPath();
      ctx.ellipse(256, 330, 45, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(768, 330, 45, 70, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (livery.pattern === 'anz') {
      // Air New Zealand black rear fuselage sweep
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 365, 1024, 147);
    } else if (livery.pattern === 'garuda') {
      // Turquoise rear tail sweep
      ctx.fillStyle = '#007C92';
      ctx.fillRect(0, 395, 1024, 117);
      ctx.fillStyle = '#00A3B4';
      ctx.fillRect(0, 378, 1024, 14);
    }
  }

  // Passenger / Cabin Windows along both sides (x around 256 and 768, y from 95 to 415)
  const isFreighter = livery.variant === '747';
  const isTurboprop = livery.variant === 'cn295';

  if (!isFreighter) {
    const winStartY = isTurboprop ? 115 : 92;
    const winEndY = isTurboprop ? 365 : 415;
    const winStep = isTurboprop ? 18 : 11;
    const winW = isTurboprop ? 9 : 7;
    const winH = isTurboprop ? 6 : 5;

    ctx.fillStyle = '#0F172A';
    for (let wy = winStartY; wy < winEndY; wy += winStep) {
      // Skip door gaps
      if (!isTurboprop && (Math.abs(wy - 160) < 10 || Math.abs(wy - 285) < 10)) continue;
      // Port side (x = 256)
      ctx.fillRect(245, wy, winW, winH);
      // Starboard side (x = 768)
      ctx.fillRect(772, wy, winW, winH);
    }
  }

  // Doors & panel outlines
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.lineWidth = 2;
  for (const dy of [80, 160, 285, 395]) {
    ctx.strokeRect(228, dy, 22, 12);
    ctx.strokeRect(774, dy, 22, 12);
  }

  // Airline title text along upper fuselage sides
  const drawSideText = (text: string, color: string, fontSize: number, yCenter: number) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px "Oswald", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Port side (rotated along fuselage axis)
    ctx.save();
    ctx.translate(295, yCenter);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Starboard side
    ctx.save();
    ctx.translate(729, yCenter);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.restore();
  };

  if (livery.pattern === 'korean') {
    drawSideText('KOREAN AIR', '#0F2C59', 26, 150);
  } else if (livery.pattern === 'garuda') {
    drawSideText('Garuda Indonesia', '#0B3B60', 22, 155);
  } else if (livery.pattern === 'emirates') {
    drawSideText('Emirates', '#C6973D', 26, 165);
  } else if (livery.pattern === 'thai') {
    drawSideText('THAI', '#4B1D77', 24, 150);
  } else if (livery.pattern === 'anz') {
    drawSideText('AIR NEW ZEALAND', '#111827', 20, 165);
  } else if (livery.pattern === 'cargolux') {
    drawSideText('cargolux', '#1E293B', 26, 175);
  } else if (livery.pattern === 'mclaren') {
    drawSideText('ETIHAD  McLAREN', '#14171C', 20, 165);
  } else if (livery.pattern === 'garuda-retro') {
    drawSideText('REPUBLIK INDONESIA', '#1E293B', 15, 185);
  } else if (livery.pattern === 'camo') {
    drawSideText('TNI AU', '#E2E8F0', 16, 145);
  }

  // Registration near rear fuselage
  const regColor =
    livery.pattern === 'mclaren' || livery.pattern === 'anz' || livery.pattern === 'camo'
      ? '#E2E8F0'
      : '#1E293B';
  drawSideText(livery.registration, regColor, 11, 388);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  textureCache.set(key, texture);
  return texture;
}

export function createTailTexture(livery: LiveryStyle): THREE.CanvasTexture {
  const key = `tail:${livery.pattern}:${livery.tail}:${livery.accent}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = livery.tail;
  ctx.fillRect(0, 0, 512, 512);

  if (livery.pattern === 'korean') {
    // Taegeuk red/blue circle emblem
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = '#C8102E';
    ctx.beginPath();
    ctx.arc(0, 0, 120, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#003478';
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(-30, 0, 60, Math.PI * 0.1, Math.PI * 1.1);
    ctx.stroke();
    ctx.restore();
  } else if (livery.pattern === 'garuda') {
    // Stylized turquoise wing curves
    ctx.fillStyle = '#00A3B4';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(300, 160 + i * 60, 190, 22, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (livery.pattern === 'garuda-retro') {
    // Classic red stripes + bold retro wordmark
    ctx.fillStyle = '#C8102E';
    ctx.fillRect(0, 120, 512, 48);
    ctx.fillRect(0, 360, 512, 32);
    ctx.fillStyle = '#C8102E';
    ctx.font = '700 72px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('garuda', 256, 275);
  } else if (livery.pattern === 'emirates') {
    // UAE flag horizontal bands
    ctx.fillStyle = '#007A3D';
    ctx.fillRect(0, 0, 512, 170);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 170, 512, 170);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 340, 512, 172);
    ctx.fillStyle = '#CE1126';
    ctx.fillRect(0, 0, 145, 512);
  } else if (livery.pattern === 'thai') {
    // Golden orchid swirl
    ctx.strokeStyle = '#E2A622';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(256, 256, 95, 0, Math.PI * 1.7);
    ctx.stroke();
    ctx.strokeStyle = '#D11E6C';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(256, 256, 55, 0.5, Math.PI * 2.1);
    ctx.stroke();
  } else if (livery.pattern === 'anz') {
    // Silver fern inspired geometric fronds
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 12;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(110 + i * 45, 420 - i * 45);
      ctx.quadraticCurveTo(250, 260 - i * 25, 410, 140 + i * 20);
      ctx.stroke();
    }
  } else if (livery.pattern === 'cargolux') {
    // Geometric 3-cube white logo
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 20;
    for (const [cx, cy] of [
      [256, 175],
      [195, 290],
      [317, 290],
    ]) {
      ctx.strokeRect(cx - 42, cy - 42, 84, 84);
    }
  } else if (livery.pattern === 'mclaren') {
    // Faceted papaya / white / black triangles
    const cols = ['#FF8000', '#14171C', '#F8FAFC', '#D97706'];
    let idx = 0;
    for (let y = 0; y < 512; y += 128) {
      for (let x = 0; x < 512; x += 128) {
        ctx.fillStyle = cols[idx % cols.length];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 128, y);
        ctx.lineTo(x + 64, y + 128);
        ctx.closePath();
        ctx.fill();
        idx++;
      }
    }
  } else if (livery.pattern === 'camo') {
    ctx.fillStyle = '#333D26';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#5E4D36';
    ctx.beginPath();
    ctx.ellipse(210, 230, 140, 110, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Indonesian red/white fin flash
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(190, 150, 120, 38);
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(190, 188, 120, 38);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function createCloudSpriteTexture(variant: 0 | 1 = 0): THREE.CanvasTexture {
  const key = `cloud-sprite-v2-${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  // Soft multi-lobe cumulus silhouette with twilight upper rim and cool shadow base
  const lobes =
    variant === 0
      ? [
          { x: 256, y: 264, rx: 168, ry: 88, a: 0.34, top: '#CBD5E1', bot: '#334155' },
          { x: 175, y: 248, rx: 112, ry: 72, a: 0.30, top: '#E2E8F0', bot: '#475569' },
          { x: 332, y: 252, rx: 118, ry: 74, a: 0.28, top: '#CBD5E1', bot: '#334155' },
          { x: 246, y: 205, rx: 108, ry: 76, a: 0.32, top: '#F1F5F9', bot: '#475569' },
          { x: 292, y: 222, rx: 88, ry: 62, a: 0.24, top: '#E2E8F0', bot: '#334155' },
        ]
      : [
          { x: 256, y: 256, rx: 196, ry: 68, a: 0.26, top: '#94A3B8', bot: '#1E293B' },
          { x: 162, y: 244, rx: 120, ry: 56, a: 0.22, top: '#CBD5E1', bot: '#334155' },
          { x: 348, y: 248, rx: 124, ry: 54, a: 0.22, top: '#CBD5E1', bot: '#1E293B' },
          { x: 254, y: 218, rx: 118, ry: 58, a: 0.24, top: '#E2E8F0', bot: '#334155' },
        ];

  for (const lobe of lobes) {
    ctx.save();
    ctx.translate(lobe.x, lobe.y);
    ctx.scale(1, lobe.ry / lobe.rx);
    const grad = ctx.createRadialGradient(0, -lobe.rx * 0.14, lobe.rx * 0.08, 0, 0, lobe.rx);
    grad.addColorStop(0, `rgba(226, 232, 240, ${lobe.a})`);
    grad.addColorStop(0.42, `rgba(148, 163, 184, ${lobe.a * 0.62})`);
    grad.addColorStop(0.75, `rgba(51, 65, 85, ${lobe.a * 0.24})`);
    grad.addColorStop(1, 'rgba(20, 48, 84, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, lobe.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function createDeckAlphaMask(): THREE.CanvasTexture {
  const key = 'deck-alpha-mask-v2';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 36, 256, 256, 252);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.38, 'rgba(210, 210, 210, 0.68)');
  grad.addColorStop(0.68, 'rgba(110, 110, 110, 0.22)');
  grad.addColorStop(0.92, 'rgba(18, 18, 18, 0.03)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function createApronFloorTexture(): THREE.CanvasTexture {
  const key = 'apron-floor-v4-night';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Aspal apron malam: ungu-hitam yang menyatu dengan cakrawala
  const baseGrad = ctx.createRadialGradient(512, 512, 40, 512, 512, 512);
  baseGrad.addColorStop(0, '#120A14');
  baseGrad.addColorStop(0.6, '#0D0810');
  baseGrad.addColorStop(1, '#09060C');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Sambungan pelat beton apron (kisi tipis)
  ctx.strokeStyle = 'rgba(180, 163, 168, 0.07)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 1024; i += 96) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Garis masuk parkir pesawat (lead-in) kuning, putus-putus, melengkung ke arah karusel
  ctx.strokeStyle = 'rgba(255, 176, 32, 0.34)';
  ctx.lineWidth = 4;
  ctx.setLineDash([46, 30]);
  ctx.beginPath();
  ctx.arc(512, 410, 330, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
  ctx.setLineDash([]);

  // Genangan cahaya merah di kaki dinding foto (pusat karusel berada ~4,8 m di belakang pusat lantai)
  const pool = ctx.createRadialGradient(512, 410, 100, 512, 410, 215);
  pool.addColorStop(0, 'rgba(239, 35, 60, 0)');
  pool.addColorStop(0.55, 'rgba(239, 35, 60, 0.2)');
  pool.addColorStop(1, 'rgba(239, 35, 60, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, 1024, 1024);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

export function createLocomotiveFrontTexture(): THREE.CanvasTexture {
  const key = 'kai-front';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#C8232C';
  ctx.fillRect(0, 0, 256, 256);

  // KAI Logo block
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '700 68px "Oswald", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KAI', 128, 128);

  // Blue italic slash accent
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(148, 160);
  ctx.lineTo(188, 96);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}


/**
 * Sprite awan gelap bertepi bara tipis untuk langit "Obsidian Crimson Eclipse".
 */
export function createEmberCloudSpriteTexture(variant: 0 | 1 = 0): THREE.CanvasTexture {
  const key = `ember-cloud-sprite-${variant}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const lobes =
    variant === 0
      ? [
          { x: 256, y: 264, rx: 168, ry: 88, a: 0.5 },
          { x: 175, y: 248, rx: 112, ry: 72, a: 0.44 },
          { x: 332, y: 252, rx: 118, ry: 74, a: 0.42 },
          { x: 246, y: 205, rx: 108, ry: 76, a: 0.46 },
        ]
      : [
          { x: 256, y: 256, rx: 196, ry: 68, a: 0.4 },
          { x: 162, y: 244, rx: 120, ry: 56, a: 0.36 },
          { x: 348, y: 248, rx: 124, ry: 54, a: 0.36 },
          { x: 254, y: 218, rx: 118, ry: 58, a: 0.38 },
        ];

  for (const lobe of lobes) {
    ctx.save();
    ctx.translate(lobe.x, lobe.y);
    ctx.scale(1, lobe.ry / lobe.rx);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, lobe.rx);
    grad.addColorStop(0, `rgba(22, 6, 10, ${lobe.a})`);
    grad.addColorStop(0.58, `rgba(40, 8, 14, ${lobe.a * 0.7})`);
    grad.addColorStop(0.86, `rgba(239, 35, 60, ${lobe.a * 0.22})`);
    grad.addColorStop(1, 'rgba(239, 35, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, lobe.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
