import * as THREE from 'three';

/**
 * Tekstur badan pesawat untuk intro fly-by:
 * Putih bersih, garis biru #2F5BEA, jendela kabin berderet, pintu, dan kaca kokpit.
 * Koordinat UV LatheGeometry: X (0..1024) = keliling (0=perut, 256=kiri, 512=punggung, 768=kanan),
 * Y (0..512) = memanjang dari hidung (y=0) ke ekor (y=512).
 */
export function createIntroFuselageTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Badan putih bersih
  ctx.fillStyle = '#F5F7FF';
  ctx.fillRect(0, 0, 1024, 512);

  // Perut abu-abu metalik tipis di bagian bawah (u dekat 0 & 1)
  ctx.fillStyle = '#DCE3F2';
  ctx.fillRect(0, 0, 145, 512);
  ctx.fillRect(879, 0, 145, 512);

  // Garis livery biru #2F5BEA memanjang di kedua sisi lambung
  ctx.fillStyle = '#2F5BEA';
  ctx.fillRect(148, 42, 22, 460);
  ctx.fillRect(854, 42, 22, 460);

  // Garis aksen navy tipis pendamping di atas garis biru
  ctx.fillStyle = '#0D1C52';
  ctx.fillRect(174, 55, 8, 445);
  ctx.fillRect(842, 55, 8, 445);

  // Sapuan biru tua di pangkal ekor belakang
  ctx.fillStyle = '#0D1C52';
  ctx.fillRect(0, 442, 1024, 70);

  // Kaca kokpit (di bagian depan atas, sekitar y=56..72 dan mengelilingi x=512)
  ctx.fillStyle = '#091126';
  const cockpitPanes = [
    { x: 454, y: 60, w: 22, h: 12 },
    { x: 480, y: 56, w: 28, h: 12 },
    { x: 516, y: 56, w: 28, h: 12 },
    { x: 548, y: 60, w: 22, h: 12 },
    { x: 428, y: 66, w: 20, h: 10 },
    { x: 576, y: 66, w: 20, h: 10 },
  ];
  for (const p of cockpitPanes) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // Jendela kabin berderet sepanjang kedua sisi (port x=256, starboard x=768)
  ctx.fillStyle = '#0F1B38';
  for (let wy = 104; wy < 414; wy += 10.5) {
    if (Math.abs(wy - 170) < 11 || Math.abs(wy - 295) < 11) continue;
    ctx.fillRect(244, wy, 7, 5);
    ctx.fillRect(773, wy, 7, 5);
  }

  // Garis pintu kabin
  ctx.strokeStyle = 'rgba(13, 28, 82, 0.35)';
  ctx.lineWidth = 2;
  for (const dy of [92, 170, 295, 398]) {
    ctx.strokeRect(228, dy, 22, 12);
    ctx.strokeRect(774, dy, 22, 12);
  }

  // Teks identitas "FANZ FIGHTERS" & registrasi di kedua sisi badan
  const drawSideLabel = (text: string, color: string, size: number, yCenter: number) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px "Big Shoulders Display", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.translate(292, yCenter);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(732, yCenter);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    ctx.restore();
  };

  drawSideLabel('FANZ FIGHTERS', '#0D1C52', 24, 154);
  drawSideLabel('PK-FF26', '#2F5BEA', 13, 384);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tekstur sirip ekor vertikal: biru tua #0D1C52 dengan garis dinamis #2F5BEA dan logo "FF".
 */
export function createIntroTailTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Biru tua
  ctx.fillStyle = '#0D1C52';
  ctx.fillRect(0, 0, 512, 512);

  // Garis aksen diagonal #2F5BEA
  ctx.fillStyle = '#2F5BEA';
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.lineTo(512, 120);
  ctx.lineTo(512, 195);
  ctx.lineTo(0, 485);
  ctx.closePath();
  ctx.fill();

  // Logo monogram "FF" putih tegas di tengah sirip ekor
  ctx.fillStyle = '#F5F7FF';
  ctx.font = '800 170px "Big Shoulders Display", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FF', 256, 250);

  // Garis tipis aksen di bawah logo
  ctx.fillStyle = '#60A5FA';
  ctx.fillRect(166, 332, 180, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Tekstur sprite awan senja lembut untuk lapisan awan volumetrik intro.
 */
export function createIntroCloudTexture(variant: 0 | 1 = 0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  const lobes =
    variant === 0
      ? [
          { x: 256, y: 266, rx: 170, ry: 92, a: 0.42 },
          { x: 174, y: 250, rx: 118, ry: 74, a: 0.36 },
          { x: 334, y: 252, rx: 120, ry: 76, a: 0.34 },
          { x: 248, y: 204, rx: 112, ry: 78, a: 0.38 },
        ]
      : [
          { x: 256, y: 256, rx: 196, ry: 70, a: 0.34 },
          { x: 162, y: 244, rx: 122, ry: 58, a: 0.28 },
          { x: 348, y: 248, rx: 124, ry: 56, a: 0.28 },
          { x: 254, y: 218, rx: 118, ry: 60, a: 0.32 },
        ];

  for (const lobe of lobes) {
    ctx.save();
    ctx.translate(lobe.x, lobe.y);
    ctx.scale(1, lobe.ry / lobe.rx);
    const grad = ctx.createRadialGradient(0, -lobe.rx * 0.14, lobe.rx * 0.08, 0, 0, lobe.rx);
    grad.addColorStop(0, `rgba(241, 245, 255, ${lobe.a})`);
    grad.addColorStop(0.45, `rgba(176, 196, 232, ${lobe.a * 0.65})`);
    grad.addColorStop(0.78, `rgba(74, 102, 152, ${lobe.a * 0.22})`);
    grad.addColorStop(1, 'rgba(20, 34, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, lobe.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
