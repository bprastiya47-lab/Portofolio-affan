import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { PortfolioItem } from '../../data/portfolioData';
import { createApronFloorTexture, createDeckAlphaMask } from '../../three/proceduralTextures';
import { ProceduralVehicle } from './ProceduralVehicles';
import { audioEngine } from '../../audio/audioEngine';

export interface GalleryLoadProgress {
  loaded: number;
  total: number;
  loading: boolean;
}

interface GalleryCylinderProps {
  items: PortfolioItem[];
  visible: boolean;
  selectedId: string | null;
  overlayOpen: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  onSelectItem: (id: string) => void;
  onHoverItem?: (item: PortfolioItem | null) => void;
  onHeadingFrame?: (headingDegFloat: number) => void;
  onActiveIndexChange?: (activeIndex: number, headingDegInt: number) => void;
  onLoadProgress?: (progress: GalleryLoadProgress) => void;
}

const CYLINDER_RADIUS = 6.8;
const CARD_WIDTH = 3.66;
const CARD_HEIGHT = 2.44;
const MAX_CARD_TEX_WIDTH = 1600;
const MAX_TILT_Y = THREE.MathUtils.degToRad(3);
const MAX_TILT_X = THREE.MathUtils.degToRad(2.0);
const LOAD_WINDOW_RAD = 2.35;
const DISPOSE_WINDOW_RAD = 2.85;

function normalizeAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function createConvexPlaneGeometry(
  width: number,
  height: number,
  radius: number,
  widthSegments = 24
): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(width, height, widthSegments, 1);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const theta = x / radius;
    const curvedX = radius * Math.sin(theta);
    const curvedZ = radius * Math.cos(theta) - radius;
    pos.setX(i, curvedX);
    pos.setZ(i, curvedZ);
  }
  geom.computeVertexNormals();
  return geom;
}

function createBlurredPlaceholderTexture(item: PortfolioItem): THREE.CanvasTexture {
  // Buat pratinjau resolusi sangat rendah dulu agar menghasilkan blur atmosferik yang nyata
  const tiny = document.createElement('canvas');
  tiny.width = 48;
  tiny.height = 32;
  const tctx = tiny.getContext('2d')!;

  const skyGrad = tctx.createLinearGradient(0, 0, 0, 32);
  skyGrad.addColorStop(0, '#0A0306');
  skyGrad.addColorStop(0.55, '#26060D');
  skyGrad.addColorStop(1, '#0A0306');
  tctx.fillStyle = skyGrad;
  tctx.fillRect(0, 0, 48, 32);

  // Semburat warna livery pesawat/kereta di bagian tengah yang diburamkan
  tctx.fillStyle = item.livery.fuselage;
  tctx.globalAlpha = 0.34;
  tctx.fillRect(8, 12, 32, 8);
  tctx.fillStyle = item.livery.tail;
  tctx.globalAlpha = 0.38;
  tctx.fillRect(10, 8, 10, 8);
  tctx.fillStyle = item.livery.accent;
  tctx.globalAlpha = 0.25;
  tctx.fillRect(14, 17, 22, 3);
  tctx.globalAlpha = 1;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  if ('filter' in ctx) {
    ctx.filter = 'blur(12px)';
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tiny, -16, -16, 544, 372);
  ctx.restore();

  // Overlay gelap tipis & reticle kokpit agar tidak pernah terlihat kotak kosong
  ctx.fillStyle = 'rgba(8, 5, 7, 0.32)';
  ctx.fillRect(0, 0, 512, 340);

  ctx.strokeStyle = 'rgba(239, 35, 60, 0.16)';
  ctx.lineWidth = 1;
  for (let x = 128; x < 512; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 340);
    ctx.stroke();
  }
  for (let y = 85; y < 340; y += 85) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(239, 35, 60, 0.45)';
  ctx.lineWidth = 2;
  const pad = 22;
  const len = 22;
  ctx.beginPath();
  ctx.moveTo(pad, pad + len);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + len, pad);
  ctx.moveTo(512 - pad - len, pad);
  ctx.lineTo(512 - pad, pad);
  ctx.lineTo(512 - pad, pad + len);
  ctx.moveTo(pad, 340 - pad - len);
  ctx.lineTo(pad, 340 - pad);
  ctx.lineTo(pad + len, 340 - pad);
  ctx.moveTo(512 - pad - len, 340 - pad);
  ctx.lineTo(512 - pad, 340 - pad);
  ctx.lineTo(512 - pad, 340 - pad - len);
  ctx.stroke();

  ctx.fillStyle = '#EF233C';
  ctx.font = '600 15px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${item.indexLabel} · ${item.registration}`, 256, 152);

  ctx.fillStyle = '#F6EEF0';
  ctx.font = '700 26px "Big Shoulders Display", sans-serif';
  ctx.fillText(item.aircraft.toUpperCase(), 256, 184);

  ctx.fillStyle = '#A8969B';
  ctx.font = '500 13px "IBM Plex Mono", monospace';
  ctx.fillText('MEMUAT FRAME...', 256, 212);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 128);

  ctx.save();
  ctx.translate(128, 64);
  ctx.scale(1, 0.48);
  const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 122);
  grad.addColorStop(0, 'rgba(6, 1, 3, 0.78)');
  grad.addColorStop(0.55, 'rgba(34, 4, 9, 0.38)');
  grad.addColorStop(1, 'rgba(34, 4, 9, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 122, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createViewfinderTexture(item: PortfolioItem): THREE.CanvasTexture {
  const w = 1024;
  const h = 682;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Empat sudut braket tipis viewfinder
  const m = 34;
  const bLen = 54;
  ctx.strokeStyle = 'rgba(239, 231, 225, 0.92)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'square';
  ctx.beginPath();
  // Kiri atas
  ctx.moveTo(m, m + bLen);
  ctx.lineTo(m, m);
  ctx.lineTo(m + bLen, m);
  // Kanan atas
  ctx.moveTo(w - m - bLen, m);
  ctx.lineTo(w - m, m);
  ctx.lineTo(w - m, m + bLen);
  // Kiri bawah
  ctx.moveTo(m, h - m - bLen);
  ctx.lineTo(m, h - m);
  ctx.lineTo(m + bLen, h - m);
  // Kanan bawah
  ctx.moveTo(w - m - bLen, h - m);
  ctx.lineTo(w - m, h - m);
  ctx.lineTo(w - m, h - m - bLen);
  ctx.stroke();

  // Kotak titik fokus AF di tengah
  const cx = w * 0.5;
  const cy = h * 0.5;
  const afHalf = 52;
  const afCorner = 18;
  ctx.strokeStyle = 'rgba(239, 35, 60, 0.92)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // 4 sudut kotak AF
  ctx.moveTo(cx - afHalf, cy - afHalf + afCorner);
  ctx.lineTo(cx - afHalf, cy - afHalf);
  ctx.lineTo(cx - afHalf + afCorner, cy - afHalf);

  ctx.moveTo(cx + afHalf - afCorner, cy - afHalf);
  ctx.lineTo(cx + afHalf, cy - afHalf);
  ctx.lineTo(cx + afHalf, cy - afHalf + afCorner);

  ctx.moveTo(cx - afHalf, cy + afHalf - afCorner);
  ctx.lineTo(cx - afHalf, cy + afHalf);
  ctx.lineTo(cx - afHalf + afCorner, cy + afHalf);

  ctx.moveTo(cx + afHalf - afCorner, cy + afHalf);
  ctx.lineTo(cx + afHalf, cy + afHalf);
  ctx.lineTo(cx + afHalf, cy + afHalf - afCorner);
  ctx.stroke();

  // Crosshair titik AF tengah
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  // Label AF & nomor frame di kiri atas
  ctx.fillStyle = 'rgba(8, 5, 7, 0.78)';
  ctx.fillRect(m + 14, m + 12, 210, 32);
  ctx.fillStyle = '#FFB020';
  ctx.font = '600 18px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`AF-C · ${item.indexLabel} ${item.registration}`, m + 26, m + 28);

  // Bar data tembakan mono di dasar viewfinder
  const shotLine = `${item.shutter}   ${item.aperture}   ISO ${item.iso}   ${item.focalLength}`;
  ctx.font = '600 22px "IBM Plex Mono", monospace';
  const textW = Math.ceil(ctx.measureText(shotLine).width);
  const pillW = Math.min(w - m * 2 - 40, textW + 48);
  const pillX = (w - pillW) * 0.5;
  const pillY = h - m - 48;

  ctx.fillStyle = 'rgba(8, 5, 7, 0.84)';
  ctx.fillRect(pillX, pillY, pillW, 38);
  ctx.strokeStyle = 'rgba(255, 176, 32, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pillX, pillY, pillW, 38);

  ctx.fillStyle = '#EFE7E1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(shotLine, cx, pillY + 19);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const CARD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldY = worldPosition.y;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const CARD_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uLqipMap;
  uniform float uMix;
  uniform float uBlur;
  uniform float uOpacity;
  uniform float uInspectMix;
  uniform float uHot;
  uniform float uTime;
  uniform vec2 uTexelSize;
  varying vec2 vUv;
  varying float vWorldY;

  vec3 sampleBlurred(sampler2D tex, vec2 uv, float radius) {
    if (radius <= 0.02) {
      return texture2D(tex, uv).rgb;
    }
    vec2 off = uTexelSize * radius * 2.4;
    vec3 sum = texture2D(tex, uv).rgb * 0.24;
    sum += texture2D(tex, clamp(uv + vec2(off.x, 0.0), 0.002, 0.998)).rgb * 0.12;
    sum += texture2D(tex, clamp(uv - vec2(off.x, 0.0), 0.002, 0.998)).rgb * 0.12;
    sum += texture2D(tex, clamp(uv + vec2(0.0, off.y), 0.002, 0.998)).rgb * 0.12;
    sum += texture2D(tex, clamp(uv - vec2(0.0, off.y), 0.002, 0.998)).rgb * 0.12;
    sum += texture2D(tex, clamp(uv + vec2(off.x, off.y), 0.002, 0.998)).rgb * 0.07;
    sum += texture2D(tex, clamp(uv + vec2(-off.x, off.y), 0.002, 0.998)).rgb * 0.07;
    sum += texture2D(tex, clamp(uv + vec2(off.x, -off.y), 0.002, 0.998)).rgb * 0.07;
    sum += texture2D(tex, clamp(uv + vec2(-off.x, -off.y), 0.002, 0.998)).rgb * 0.07;
    return sum;
  }

  void main() {
    vec3 lqipCol = sampleBlurred(uLqipMap, vUv, 1.35);
    float activeBlur = mix(1.9, uBlur, uMix);
    vec3 photoCol = sampleBlurred(uMap, vUv, activeBlur);
    vec3 finalCol = mix(lqipCol, photoCol, uMix);

    // Frame yang disorot: foto tidak diwarnai atau digaris-garisi; hanya sedikit lebih terang
    // dengan garis tepi amber setipis kawat (warna mata Belial). Frame lain diredupkan tipis.
    float edgeD = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float hairline = smoothstep(0.011, 0.004, edgeD);
    finalCol *= mix(0.8, 1.04, uHot);
    finalCol = mix(finalCol, vec3(1.0, 0.69, 0.13), hairline * uHot * 0.92);

    // Pudarkan tipis jika bagian atas frame mendekati zona aman judul hero saat mode karusel
    float safeFade = 1.0 - smoothstep(2.55, 2.85, vWorldY) * (1.0 - uInspectMix);
    gl_FragColor = vec4(finalCol, uOpacity * safeFade);
    #include <colorspace_fragment>
  }
`;

export interface CardTextureHandle {
  id: string;
  startLoad: () => void;
  disposeFull: () => void;
  isLoaded: () => boolean;
  isLoading: () => boolean;
  getWorldAngle: () => number;
}

interface GalleryCardProps {
  item: PortfolioItem;
  index: number;
  total: number;
  cylinderAngleRef: React.MutableRefObject<number>;
  selectedId: string | null;
  hoveredId: string | null;
  isCenterActive: boolean;
  showViewfinder: boolean;
  reducedMotion: boolean;
  cardGeometry: THREE.BufferGeometry;
  frameGeometry: THREE.BufferGeometry;
  contactShadowGeo: THREE.BufferGeometry;
  contactShadowTex: THREE.Texture;
  onHover: (item: PortfolioItem | null) => void;
  onClickCard: (id: string) => void;
  wasDraggingRef: React.MutableRefObject<boolean>;
  registerCardHandle: (id: string, handle: CardTextureHandle | null) => void;
  onCardLoadFinished: (id: string, success: boolean) => void;
}

const GalleryCard: React.FC<GalleryCardProps> = ({
  item,
  index,
  total,
  cylinderAngleRef,
  selectedId,
  hoveredId,
  isCenterActive,
  showViewfinder,
  reducedMotion,
  cardGeometry,
  frameGeometry,
  contactShadowGeo,
  contactShadowTex,
  onHover,
  onClickCard,
  wasDraggingRef,
  registerCardHandle,
  onCardLoadFinished,
}) => {
  const { gl, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const viewfinderMeshRef = useRef<THREE.Mesh>(null);
  const viewfinderMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const pullProgressRef = useRef(0);
  const hoverOffsetRef = useRef(0);
  const loadedMixRef = useRef(0);
  const focusPullElapsedRef = useRef(0.35);
  const prevActiveFocusRef = useRef(false);
  const fullTexRef = useRef<THREE.Texture | null>(null);
  const isLoadingRef = useRef(false);
  const isLoadedRef = useRef(false);
  const loadAbortRef = useRef(false);

  const baseAngle = (index / total) * Math.PI * 2;
  const worldAngleRef = useRef(normalizeAngle(baseAngle + cylinderAngleRef.current));

  const lqipTexture = useMemo(() => createBlurredPlaceholderTexture(item), [item]);
  const viewfinderTexture = useMemo(() => {
    const tex = createViewfinderTexture(item);
    tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return tex;
  }, [gl, item]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uMap: { value: lqipTexture },
          uLqipMap: { value: lqipTexture },
          uMix: { value: 0 },
          uBlur: { value: 0 },
          uOpacity: { value: 1 },
          uInspectMix: { value: 0 },
          uHot: { value: 0 },
          uTime: { value: 0 },
          uTexelSize: { value: new THREE.Vector2(1 / 512, 1 / 340) },
        },
        vertexShader: CARD_VERTEX_SHADER,
        fragmentShader: CARD_FRAGMENT_SHADER,
      }),
    [lqipTexture]
  );

  const disposeFullTexture = useCallback(() => {
    loadAbortRef.current = true;
    isLoadingRef.current = false;
    isLoadedRef.current = false;
    loadedMixRef.current = 0;
    shaderMaterial.uniforms.uMix.value = 0;
    shaderMaterial.uniforms.uMap.value = lqipTexture;
    shaderMaterial.uniforms.uTexelSize.value.set(1 / 512, 1 / 340);
    if (fullTexRef.current) {
      fullTexRef.current.dispose();
      fullTexRef.current = null;
    }
  }, [lqipTexture, shaderMaterial]);

  const startSequentialLoad = useCallback(() => {
    if (isLoadedRef.current || isLoadingRef.current) return;
    isLoadingRef.current = true;
    loadAbortRef.current = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    img.onload = () => {
      if (loadAbortRef.current) {
        isLoadingRef.current = false;
        onCardLoadFinished(item.id, false);
        return;
      }

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const scale = srcW > MAX_CARD_TEX_WIDTH ? MAX_CARD_TEX_WIDTH / srcW : 1;
      const targetW = Math.max(1, Math.round(srcW * scale));
      const targetH = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isLoadingRef.current = false;
        onCardLoadFinished(item.id, false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.min(12, gl.capabilities.getMaxAnisotropy());
      tex.needsUpdate = true;

      if (fullTexRef.current) {
        fullTexRef.current.dispose();
      }
      fullTexRef.current = tex;
      shaderMaterial.uniforms.uMap.value = tex;
      shaderMaterial.uniforms.uTexelSize.value.set(1 / targetW, 1 / targetH);
      isLoadingRef.current = false;
      isLoadedRef.current = true;
      onCardLoadFinished(item.id, true);
    };

    img.onerror = () => {
      isLoadingRef.current = false;
      onCardLoadFinished(item.id, false);
    };

    img.src = item.imageUrl;
  }, [gl, item.id, item.imageUrl, onCardLoadFinished, shaderMaterial]);

  // Daftarkan handle kontrol tekstur ke koordinator karusel & bersihkan resource saat unmount
  useEffect(() => {
    registerCardHandle(item.id, {
      id: item.id,
      startLoad: startSequentialLoad,
      disposeFull: disposeFullTexture,
      isLoaded: () => isLoadedRef.current,
      isLoading: () => isLoadingRef.current,
      getWorldAngle: () => worldAngleRef.current,
    });

    return () => {
      registerCardHandle(item.id, null);
      disposeFullTexture();
      lqipTexture.dispose();
      viewfinderTexture.dispose();
      shaderMaterial.dispose();
    };
  }, [
    item.id,
    registerCardHandle,
    startSequentialLoad,
    disposeFullTexture,
    lqipTexture,
    viewfinderTexture,
    shaderMaterial,
  ]);

  const isSelected = selectedId === item.id;
  const isOtherSelected = selectedId !== null && !isSelected;
  const isHovered = hoveredId === item.id && selectedId === null;

  // Picu focus pull 350ms setiap kali frame menjadi aktif di tengah atau dipilih ke detail
  useEffect(() => {
    const activeNow = isCenterActive || isSelected;
    if (activeNow && !prevActiveFocusRef.current && !reducedMotion) {
      focusPullElapsedRef.current = 0;
    }
    prevActiveFocusRef.current = activeNow;
  }, [isCenterActive, isSelected, reducedMotion]);

  useFrame((_, rawDelta) => {
    if (!groupRef.current) return;
    const delta = Math.min(rawDelta, 0.05);

    const worldAngle = normalizeAngle(baseAngle + cylinderAngleRef.current);
    worldAngleRef.current = worldAngle;

    // Cross-fade halus dari placeholder blur ke foto asli
    const targetMix = isLoadedRef.current ? 1 : 0;
    loadedMixRef.current = reducedMotion
      ? targetMix
      : THREE.MathUtils.damp(loadedMixRef.current, targetMix, 6.5, delta);
    shaderMaterial.uniforms.uMix.value = loadedMixRef.current;

    pullProgressRef.current = reducedMotion
      ? isSelected
        ? 1
        : 0
      : THREE.MathUtils.damp(pullProgressRef.current, isSelected ? 1 : 0, 7, delta);

    hoverOffsetRef.current = reducedMotion
      ? isHovered
        ? 0.16
        : 0
      : THREE.MathUtils.damp(hoverOffsetRef.current, isHovered ? 0.16 : 0, 9, delta);

    // Posisi karusel cembung di (0, 0, -R); baseline Y=1.30 menjaga safe zone judul hero di atas
    const wallRadius = CYLINDER_RADIUS + hoverOffsetRef.current;
    const wallX = Math.sin(worldAngle) * wallRadius;
    const wallZ = Math.cos(worldAngle) * wallRadius - CYLINDER_RADIUS;
    const wallRotY = worldAngle;

    const aspect = size.width / Math.max(size.height, 1);
    const isPortrait = aspect < 1.05;
    const targetX = isPortrait ? 0 : -Math.min(1.98, aspect * 1.1);
    const targetY = isPortrait ? 2.68 : 1.92;
    const targetZ = isPortrait ? 0.36 : 0.48;

    const p = pullProgressRef.current;
    const posX = THREE.MathUtils.lerp(wallX, targetX, p);
    const posY = THREE.MathUtils.lerp(1.3, targetY, p);
    const posZ = THREE.MathUtils.lerp(wallZ, targetZ, p);

    groupRef.current.position.set(posX, posY, posZ);

    const targetInspectRotY = isPortrait ? 0 : 0.14;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(wallRotY, targetInspectRotY, p);

    const scale = THREE.MathUtils.lerp(1, isPortrait ? 0.72 : 0.9, p);
    groupRef.current.scale.setScalar(scale);

    // Frame samping mendapat blur optik ringan; frame baru aktif melakukan focus pull 350ms ke tajam
    const sideAngleFactor = THREE.MathUtils.clamp((Math.abs(worldAngle) - 0.18) / 1.15, 0, 1);
    const baseBlur = THREE.MathUtils.lerp(sideAngleFactor * 1.95, 0, p);

    if (focusPullElapsedRef.current < 0.35) {
      focusPullElapsedRef.current = Math.min(0.35, focusPullElapsedRef.current + delta);
    }
    const pullRatio = THREE.MathUtils.clamp(focusPullElapsedRef.current / 0.35, 0, 1);
    const focusPullBlur = reducedMotion ? 0 : Math.pow(1 - pullRatio, 2.1) * 2.35;

    shaderMaterial.uniforms.uBlur.value = Math.max(baseBlur, focusPullBlur);
    shaderMaterial.uniforms.uInspectMix.value = p;

    // Intensitas glow crimson: hover atau frame tepat di tengah pandangan
    const hotTarget = (isHovered || isCenterActive) && !isOtherSelected && !isSelected ? 1 : 0;
    shaderMaterial.uniforms.uHot.value = reducedMotion
      ? hotTarget * 0.7
      : THREE.MathUtils.damp(shaderMaterial.uniforms.uHot.value, hotTarget, 9, delta);
    if (!reducedMotion) {
      shaderMaterial.uniforms.uTime.value += delta;
    }

    const targetOpacity = isOtherSelected ? 0.12 : 1;
    shaderMaterial.uniforms.uOpacity.value = THREE.MathUtils.damp(
      shaderMaterial.uniforms.uOpacity.value,
      targetOpacity,
      8,
      delta
    );

    // Transisi halus overlay viewfinder kamera pada frame yang disorot
    if (viewfinderMatRef.current && viewfinderMeshRef.current) {
      const targetVfOpacity = showViewfinder ? 1 : 0;
      viewfinderMatRef.current.opacity = reducedMotion
        ? targetVfOpacity
        : THREE.MathUtils.damp(viewfinderMatRef.current.opacity, targetVfOpacity, 12, delta);
      viewfinderMeshRef.current.visible = viewfinderMatRef.current.opacity > 0.01;
    }

    // Bayangan kontak di landasan tepat di bawah setiap frame
    if (shadowRef.current) {
      shadowRef.current.position.set(posX, 0.022, posZ);
      shadowRef.current.rotation.set(-Math.PI / 2, 0, groupRef.current.rotation.y);
      shadowRef.current.scale.set(scale, 1, 1);
      const sMat = shadowRef.current.material as THREE.MeshBasicMaterial;
      const distFade = THREE.MathUtils.clamp(1 - Math.abs(worldAngle) / 2.2, 0.12, 1);
      sMat.opacity = isOtherSelected ? 0.08 : 0.72 * distFade;
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (selectedId === null) {
      onHover(item);
    }
  };

  const handlePointerOut = () => {
    onHover(null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (wasDraggingRef.current) return;
    onClickCard(item.id);
  };

  return (
    <>
      <group ref={groupRef}>
        {/* Bingkai Hairline */}
        <mesh
          geometry={frameGeometry}
          position={[0, 0, -0.012]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <meshStandardMaterial
            color={isSelected || isHovered ? '#EF233C' : '#7A3C48'}
            emissive={isSelected || isHovered ? '#D90429' : '#000000'}
            emissiveIntensity={isSelected ? 0.55 : isHovered ? 0.42 : 0}
            roughness={0.28}
            metalness={0.5}
            transparent
            opacity={isOtherSelected ? 0.08 : isSelected || isHovered ? 0.62 : 0.18}
          />
        </mesh>

        {/* Permukaan Shader Foto Melengkung */}
        <mesh
          geometry={cardGeometry}
          material={shaderMaterial}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />

        {/* Overlay Viewfinder Kamera (4 Braket Sudut, Kotak AF, Data Tembakan Mono) */}
        <mesh
          ref={viewfinderMeshRef}
          geometry={cardGeometry}
          position={[0, 0, 0.018]}
          renderOrder={2}
          visible={false}
        >
          <meshBasicMaterial
            ref={viewfinderMatRef}
            map={viewfinderTexture}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Bayangan Kontak Landasan */}
      <mesh ref={shadowRef} geometry={contactShadowGeo} renderOrder={1}>
        <meshBasicMaterial
          map={contactShadowTex}
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

/** Cincin radar merah berdenyut di bawah model 3D yang sedang diinspeksi */
const InspectRadarRings: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pulseRefs = useRef<Array<THREE.Mesh | null>>([]);
  const PULSES = 3;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    for (let i = 0; i < PULSES; i++) {
      const mesh = pulseRefs.current[i];
      if (!mesh) continue;
      const phase = reducedMotion ? 0.5 : (t * 0.42 + i / PULSES) % 1;
      const scale = 0.42 + phase * 0.72;
      mesh.scale.set(scale, scale, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = reducedMotion ? 0.22 : Math.pow(1 - phase, 1.6) * 0.55;
    }
  });

  return (
    <group position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Cakram cahaya merah redup di lantai */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[2.4, 64]} />
        <meshBasicMaterial color="#5A0713" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* Cincin dasar tetap */}
      <mesh>
        <ringGeometry args={[2.35, 2.41, 64]} />
        <meshBasicMaterial
          color="#EF233C"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Tiga denyut radar yang mengembang dan memudar */}
      {Array.from({ length: PULSES }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            pulseRefs.current[i] = el;
          }}
        >
          <ringGeometry args={[2.3, 2.4, 64]} />
          <meshBasicMaterial
            color="#FF5A6E"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export const GalleryCylinder: React.FC<GalleryCylinderProps> = ({
  items,
  visible,
  selectedId,
  overlayOpen,
  isSoftwareGl,
  reducedMotion,
  onSelectItem,
  onHoverItem,
  onHeadingFrame,
  onActiveIndexChange,
  onLoadProgress,
}) => {
  const { camera, size, gl, pointer } = useThree();

  const initialAngle = useMemo(() => {
    if (!selectedId) return 0;
    const idx = items.findIndex((i) => i.id === selectedId);
    return idx >= 0 ? -(idx / items.length) * Math.PI * 2 : 0;
  }, [items, selectedId]);

  const cylinderAngleRef = useRef(initialAngle);
  const targetAngleRef = useRef(initialAngle);
  const velocityRef = useRef(0);
  const lastReportedRef = useRef<{ deg: number; idx: number }>({ deg: -1, idx: -1 });

  const cardHandlesRef = useRef<Map<string, CardTextureHandle>>(new Map());
  const loadingIdRef = useRef<string | null>(null);
  const lastProgressReportRef = useRef({ loaded: -1, total: -1, loading: false });

  const tiltGroupRef = useRef<THREE.Group>(null);
  const centerlineMeshRef = useRef<THREE.InstancedMesh>(null);
  const centerlineOffsetRef = useRef(0);
  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const wasDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pinchDistRef = useRef<number | null>(null);

  // State Inspeksi Pesawat 3D Detail (orbit, pan, zoom terklamp)
  const inspectGroupRef = useRef<THREE.Group>(null);
  const inspectScaleRef = useRef(0.001);
  const inspectRotRef = useRef({ y: -0.68, x: 0.14 });
  const inspectTargetRotRef = useRef({ y: -0.68, x: 0.14 });
  const inspectPanRef = useRef({ x: 0, y: 0 });
  const inspectTargetPanRef = useRef({ x: 0, y: 0 });
  const inspectZoomRef = useRef(1);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [centerActiveId, setCenterActiveId] = useState<string | null>(
    () => selectedId ?? items[0]?.id ?? null
  );

  const cardGeometry = useMemo(
    () => createConvexPlaneGeometry(CARD_WIDTH, CARD_HEIGHT, CYLINDER_RADIUS, 24),
    []
  );
  const frameGeometry = useMemo(
    () =>
      createConvexPlaneGeometry(
        CARD_WIDTH + 0.024,
        CARD_HEIGHT + 0.024,
        CYLINDER_RADIUS + 0.012,
        24
      ),
    []
  );
  const contactShadowGeo = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH * 1.06, 1.35), []);
  const contactShadowTex = useMemo(() => createContactShadowTexture(), []);
  const apronTexture = useMemo(() => createApronFloorTexture(), []);
  const deckAlphaMask = useMemo(() => createDeckAlphaMask(), []);

  const centerlineGeo = useMemo(() => new THREE.PlaneGeometry(0.16, 1.55), []);
  const centerlineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#A8969B',
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    []
  );

  // Dispose geometries, textures, and materials cleanly on unmount
  useEffect(() => {
    return () => {
      cardGeometry.dispose();
      frameGeometry.dispose();
      contactShadowGeo.dispose();
      contactShadowTex.dispose();
      centerlineGeo.dispose();
      centerlineMat.dispose();
    };
  }, [
    cardGeometry,
    frameGeometry,
    contactShadowGeo,
    contactShadowTex,
    centerlineGeo,
    centerlineMat,
  ]);

  const selectedIndex = useMemo(
    () => items.findIndex((i) => i.id === selectedId),
    [items, selectedId]
  );
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : null;

  const reportLoadProgress = useCallback(() => {
    if (!onLoadProgress) return;
    const handles = Array.from(cardHandlesRef.current.values());
    let eligibleTotal = 0;
    let eligibleLoaded = 0;
    let anyLoading = loadingIdRef.current !== null;

    for (const h of handles) {
      const dist = Math.abs(h.getWorldAngle());
      const isSelected = h.id === selectedId;
      if (dist < LOAD_WINDOW_RAD || isSelected || h.isLoaded() || h.isLoading()) {
        eligibleTotal++;
        if (h.isLoaded()) eligibleLoaded++;
        if (h.isLoading()) anyLoading = true;
      }
    }

    const total = Math.max(1, eligibleTotal);
    const prev = lastProgressReportRef.current;
    if (
      prev.loaded !== eligibleLoaded ||
      prev.total !== total ||
      prev.loading !== anyLoading
    ) {
      lastProgressReportRef.current = { loaded: eligibleLoaded, total, loading: anyLoading };
      onLoadProgress({ loaded: eligibleLoaded, total, loading: anyLoading });
    }
  }, [onLoadProgress, selectedId]);

  const registerCardHandle = useCallback((id: string, handle: CardTextureHandle | null) => {
    if (handle) {
      cardHandlesRef.current.set(id, handle);
    } else {
      cardHandlesRef.current.delete(id);
      if (loadingIdRef.current === id) {
        loadingIdRef.current = null;
      }
    }
  }, []);

  const handleCardLoadFinished = useCallback(
    (id: string) => {
      if (loadingIdRef.current === id) {
        loadingIdRef.current = null;
      }
      reportLoadProgress();
    },
    [reportLoadProgress]
  );

  // Pusatkan frame terpilih dengan mulus saat masuk mode detail
  useEffect(() => {
    if (selectedItem) {
      inspectRotRef.current = { y: -0.68, x: 0.14 };
      inspectTargetRotRef.current = { y: -0.68, x: 0.14 };
      inspectPanRef.current = { x: 0, y: 0 };
      inspectTargetPanRef.current = { x: 0, y: 0 };
      inspectZoomRef.current = 1;

      const desired = -(selectedIndex / items.length) * Math.PI * 2;
      const current = targetAngleRef.current;
      let delta = (desired - current) % (Math.PI * 2);
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      targetAngleRef.current = current + delta;
      velocityRef.current = 0;
    }
  }, [selectedItem, selectedIndex, items.length]);

  const handleCardHover = (item: PortfolioItem | null) => {
    setHoveredId(item ? item.id : null);
    if (onHoverItem) onHoverItem(item);
  };

  // Interaksi pointer, sentuh (swipe + pinch), dan wheel
  useEffect(() => {
    const dom = gl.domElement;

    const onContextMenu = (e: MouseEvent) => {
      if (selectedId) e.preventDefault();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!visible || overlayOpen) return;
      if (pinchDistRef.current !== null) return;
      isDraggingRef.current = true;
      isPanningRef.current = Boolean(selectedId && (e.shiftKey || e.button === 2));
      wasDraggingRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !visible || overlayOpen) return;
      if (pinchDistRef.current !== null) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      const totalDist = Math.hypot(
        e.clientX - dragStartRef.current.x,
        e.clientY - dragStartRef.current.y
      );
      if (totalDist > 8) {
        wasDraggingRef.current = true;
      }

      if (selectedId) {
        if (isPanningRef.current || e.shiftKey) {
          inspectTargetPanRef.current.x = THREE.MathUtils.clamp(
            inspectTargetPanRef.current.x + dx * 0.0025,
            -0.38,
            0.38
          );
          inspectTargetPanRef.current.y = THREE.MathUtils.clamp(
            inspectTargetPanRef.current.y - dy * 0.0025,
            -0.28,
            0.28
          );
        } else {
          inspectTargetRotRef.current.y += dx * 0.011;
          inspectTargetRotRef.current.x = THREE.MathUtils.clamp(
            inspectTargetRotRef.current.x + dy * 0.008,
            -0.55,
            0.72
          );
        }
      } else {
        const sensitivity = e.pointerType === 'touch' ? 0.0048 : 0.0032;
        const inertiaFactor = e.pointerType === 'touch' ? 22 : 26;
        const angularDelta = dx * sensitivity;
        targetAngleRef.current += angularDelta;
        velocityRef.current = angularDelta * inertiaFactor;
      }
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      isPanningRef.current = false;
      window.setTimeout(() => {
        wasDraggingRef.current = false;
      }, 60);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!visible || overlayOpen || !selectedId) return;
      if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistRef.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!visible || overlayOpen || !selectedId) return;
      if (e.touches.length === 2 && pinchDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = (dist - pinchDistRef.current) * 0.0035;
        pinchDistRef.current = dist;
        inspectZoomRef.current = THREE.MathUtils.clamp(
          inspectZoomRef.current + delta,
          0.78,
          1.28
        );
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchDistRef.current = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!visible || overlayOpen) return;
      e.preventDefault();
      if (selectedId) {
        inspectZoomRef.current = THREE.MathUtils.clamp(
          inspectZoomRef.current - e.deltaY * 0.00075,
          0.78,
          1.28
        );
      } else {
        const delta =
          (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.0011;
        targetAngleRef.current += delta;
        velocityRef.current = delta * 18;
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });
    dom.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl, visible, overlayOpen, selectedId]);

  useFrame((_, rawDelta) => {
    if (!visible) return;
    const delta = Math.min(rawDelta, 0.05);

    // Kamera pendaratan dengan safe zone vertikal di atas agar judul hero selalu terbaca
    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 5.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 2.05, 5.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 5.6, 5.5, delta);
    camera.lookAt(0, 1.65, 0);

    // Rotasi & inersia karusel
    if (!selectedId && !isDraggingRef.current) {
      targetAngleRef.current += velocityRef.current * delta;
      velocityRef.current *= Math.exp(-4.2 * delta);
    }
    cylinderAngleRef.current = reducedMotion
      ? targetAngleRef.current
      : THREE.MathUtils.damp(cylinderAngleRef.current, targetAngleRef.current, 7.5, delta);

    // Antrean lazy-load berurutan dari frame terdekat + dispose tekstur di sisi belakang jauh
    const handles = Array.from(cardHandlesRef.current.values());
    let bestHandle: CardTextureHandle | null = null;
    let bestDist = Infinity;

    for (const h of handles) {
      const dist = Math.abs(h.getWorldAngle());
      const isSel = h.id === selectedId;

      if (h.isLoaded() && !isSel && dist > DISPOSE_WINDOW_RAD) {
        h.disposeFull();
        continue;
      }

      if (!h.isLoaded() && !h.isLoading() && (dist < LOAD_WINDOW_RAD || isSel)) {
        const priorityDist = isSel ? -1 : dist;
        if (priorityDist < bestDist) {
          bestDist = priorityDist;
          bestHandle = h;
        }
      }
    }

    if (loadingIdRef.current === null && bestHandle) {
      loadingIdRef.current = bestHandle.id;
      bestHandle.startLoad();
    }
    reportLoadProgress();

    // Kemiringan karusel maks 3° mengikuti pointer (dinonaktifkan saat sentuh/detail/reducedMotion)
    if (tiltGroupRef.current) {
      const wantTilt = !selectedId && !overlayOpen && !reducedMotion;
      const targetRotY = wantTilt
        ? THREE.MathUtils.clamp(pointer.x * MAX_TILT_Y, -MAX_TILT_Y, MAX_TILT_Y)
        : 0;
      const targetRotX = wantTilt
        ? THREE.MathUtils.clamp(-pointer.y * MAX_TILT_X, -MAX_TILT_X, MAX_TILT_X)
        : 0;
      tiltGroupRef.current.rotation.y = THREE.MathUtils.damp(
        tiltGroupRef.current.rotation.y,
        targetRotY,
        6,
        delta
      );
      tiltGroupRef.current.rotation.x = THREE.MathUtils.damp(
        tiltGroupRef.current.rotation.x,
        targetRotX,
        6,
        delta
      );
    }

    // Marka garis tengah landasan bergerak
    if (centerlineMeshRef.current) {
      if (!reducedMotion && !selectedId && !overlayOpen) {
        centerlineOffsetRef.current = (centerlineOffsetRef.current + delta * 2.1) % 3.4;
      }
      for (let i = 0; i < 12; i++) {
        const z = -26 + i * 3.4 + centerlineOffsetRef.current;
        dummyObj.position.set(0, 0.015, z);
        dummyObj.rotation.set(-Math.PI / 2, 0, 0);
        const fadeScale = z > 3.5 ? Math.max(0, 1 - (z - 3.5) / 2.2) : 1;
        dummyObj.scale.set(1, fadeScale, 1);
        dummyObj.updateMatrix();
        centerlineMeshRef.current.setMatrixAt(i, dummyObj.matrix);
      }
      centerlineMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Heading kompas kontinu untuk pita kompas + indeks aktif saat berubah
    if (items.length > 0) {
      const normalized =
        ((-cylinderAngleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const degFloat = (normalized / (Math.PI * 2)) * 360;
      if (onHeadingFrame) {
        onHeadingFrame(degFloat);
      }
      const degInt = Math.round(degFloat) % 360;
      const activeIdx = Math.round((normalized / (Math.PI * 2)) * items.length) % items.length;
      if (lastReportedRef.current.idx !== activeIdx) {
        if (lastReportedRef.current.idx !== -1 && !selectedId) {
          audioEngine.playCarouselTick();
        }
        setCenterActiveId(items[activeIdx]?.id ?? null);
      }
      if (
        onActiveIndexChange &&
        (lastReportedRef.current.deg !== degInt || lastReportedRef.current.idx !== activeIdx)
      ) {
        lastReportedRef.current = { deg: degInt, idx: activeIdx };
        onActiveIndexChange(activeIdx, degInt);
      }
    }

    // Area khusus model 3D pesawat/lokomotif di sisi kanan (terklamp & tidak menimpa foto)
    if (inspectGroupRef.current) {
      const aspect = size.width / Math.max(size.height, 1);
      const isPortrait = aspect < 1.05;

      const baseScale = isPortrait ? 0.28 : 0.37;
      const targetScale = selectedItem ? baseScale * inspectZoomRef.current : 0.001;
      inspectScaleRef.current = reducedMotion
        ? targetScale
        : THREE.MathUtils.damp(inspectScaleRef.current, targetScale, 7.5, delta);
      inspectGroupRef.current.scale.setScalar(inspectScaleRef.current);

      inspectPanRef.current.x = THREE.MathUtils.damp(
        inspectPanRef.current.x,
        inspectTargetPanRef.current.x,
        8,
        delta
      );
      inspectPanRef.current.y = THREE.MathUtils.damp(
        inspectPanRef.current.y,
        inspectTargetPanRef.current.y,
        8,
        delta
      );

      const baseTargetX = isPortrait ? 0 : Math.min(2.04, aspect * 1.15);
      const baseTargetY = isPortrait ? 1.12 : 1.86;
      const baseTargetZ = isPortrait ? 0.56 : 0.45;

      inspectGroupRef.current.position.x = THREE.MathUtils.damp(
        inspectGroupRef.current.position.x,
        baseTargetX + inspectPanRef.current.x,
        7.5,
        delta
      );
      inspectGroupRef.current.position.y = THREE.MathUtils.damp(
        inspectGroupRef.current.position.y,
        baseTargetY +
          inspectPanRef.current.y +
          (selectedItem && !reducedMotion ? Math.sin(performance.now() * 0.0015) * 0.035 : 0),
        7.5,
        delta
      );
      inspectGroupRef.current.position.z = THREE.MathUtils.damp(
        inspectGroupRef.current.position.z,
        baseTargetZ,
        7.5,
        delta
      );

      if (selectedItem && !isDraggingRef.current && !reducedMotion) {
        inspectTargetRotRef.current.y += delta * 0.24;
      }

      inspectRotRef.current.y = THREE.MathUtils.damp(
        inspectRotRef.current.y,
        inspectTargetRotRef.current.y,
        9,
        delta
      );
      inspectRotRef.current.x = THREE.MathUtils.damp(
        inspectRotRef.current.x,
        inspectTargetRotRef.current.x,
        9,
        delta
      );

      inspectGroupRef.current.rotation.y = inspectRotRef.current.y;
      inspectGroupRef.current.rotation.x = inspectRotRef.current.x;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Lantai Landasan dengan Refleksi Memudar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
        <circleGeometry args={[24, 72]} />
        {isSoftwareGl ? (
          <meshStandardMaterial
            map={apronTexture}
            alphaMap={deckAlphaMask}
            transparent
            depthWrite={false}
            color="#0C0710"
            roughness={0.28}
            metalness={0.68}
          />
        ) : (
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={512}
            mixBlur={0.95}
            mixStrength={16}
            roughness={0.36}
            depthScale={0.85}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#0C0710"
            metalness={0.6}
            map={apronTexture}
            alphaMap={deckAlphaMask}
            transparent
            depthWrite={false}
          />
        )}
      </mesh>

      {/* Marka Garis Tengah Landasan Bergerak */}
      <instancedMesh
        ref={centerlineMeshRef}
        args={[centerlineGeo, centerlineMat, 12]}
        frustumCulled={false}
        renderOrder={1}
      />

      {/* Karusel Cembung dengan Kemiringan Maks 3° Mengikuti Kursor */}
      <group ref={tiltGroupRef}>
        {items.map((item, idx) => {
          const viewfinderTargetId =
            !selectedId && !overlayOpen ? hoveredId ?? centerActiveId : null;
          return (
            <GalleryCard
              key={item.id}
              item={item}
              index={idx}
              total={items.length}
              cylinderAngleRef={cylinderAngleRef}
              selectedId={selectedId}
              hoveredId={hoveredId}
              isCenterActive={item.id === centerActiveId}
              showViewfinder={item.id === viewfinderTargetId}
              reducedMotion={reducedMotion}
              cardGeometry={cardGeometry}
              frameGeometry={frameGeometry}
              contactShadowGeo={contactShadowGeo}
              contactShadowTex={contactShadowTex}
              onHover={handleCardHover}
              onClickCard={onSelectItem}
              wasDraggingRef={wasDraggingRef}
              registerCardHandle={registerCardHandle}
              onCardLoadFinished={handleCardLoadFinished}
            />
          );
        })}
      </group>

      {/* Area Khusus Model 3D Pesawat/Lokomotif (Sisi Kanan, Terbatas & Terklamp) */}
      <group ref={inspectGroupRef} position={[2.04, 1.86, 0.45]} scale={0.001}>
        {selectedItem && (
          <>
            <ProceduralVehicle item={selectedItem} gearDown={true} showLights={false} />

            {/* Rim-light merah dramatis dari bawah dan belakang model */}
            <pointLight position={[0, -2.1, 1.1]} intensity={5.5} color="#EF233C" distance={14} decay={1.6} />
            <pointLight position={[0.6, 1.2, -3.6]} intensity={6.5} color="#FF3B52" distance={16} decay={1.6} />
            <pointLight position={[-3.2, -0.4, -1.4]} intensity={3.2} color="#D90429" distance={12} decay={1.6} />

            <InspectRadarRings reducedMotion={reducedMotion} />
          </>
        )}
      </group>
    </group>
  );
};

