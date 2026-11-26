import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // aPhase < 0: lampu tetap menyala. Lainnya: lampu kilat berurutan (sequenced flashing) menuju ambang landasan
    float pulse = aPhase < 0.0 ? 1.0 : 0.18 + 0.82 * pow(max(0.0, sin((aPhase - uTime * 0.85) * 6.2831)), 7.0);
    vGlow = pulse;
    vColor = aColor;
    gl_PointSize = clamp(aSize * uScale / max(0.1, -mv.z) * (0.7 + 0.5 * pulse), 1.0, 26.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor * vGlow, a * vGlow);
  }
`;

/**
 * Lampu landasan di kejauhan di belakang karusel galeri: deretan tepi landasan, garis tengah
 * dengan lampu kilat berurutan, palang merah ambang, dan satu set PAPI (dua merah, dua putih).
 * Detail ini nyata di bandara; menjadi jangkar dunia aviasi sekaligus menambah kedalaman latar.
 */
export const AirfieldLights: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const { geometry, uniforms } = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const phase: number[] = [];
    const size: number[] = [];

    const push = (x: number, y: number, z: number, c: [number, number, number], ph: number, sz: number) => {
      pos.push(x, y, z);
      col.push(c[0], c[1], c[2]);
      phase.push(ph);
      size.push(sz);
    };

    const white: [number, number, number] = [1.0, 0.9, 0.72];
    const amber: [number, number, number] = [1.0, 0.62, 0.16];
    const red: [number, number, number] = [1.0, 0.1, 0.16];

    const near = -36;
    const far = -150;

    // Tepi landasan
    for (let z = near; z > far; z -= 5) {
      push(-9, 0.15, z, white, -1, 0.34);
      push(9, 0.15, z, white, -1, 0.34);
    }
    // Garis tengah: kilat berurutan merambat ke arah ambang (fase = jarak ternormalisasi)
    for (let z = near - 4; z > near - 70; z -= 3) {
      const t = (z - near) / -70;
      push(0, 0.22, z, white, 1 - t, 0.5);
    }
    // Palang ambang merah
    for (let x = -6; x <= 6; x += 1.5) {
      push(x, 0.15, near + 2, red, -1, 0.42);
    }
    // PAPI di sisi kiri: merah-merah-putih-putih
    for (let i = 0; i < 4; i++) {
      push(-16 - i * 1.3, 0.35, near + 4, i < 2 ? red : white, -1, 0.7);
    }
    // Lampu taxiway amber di sisi kanan jauh
    for (let z = near - 12; z > far + 20; z -= 7) {
      push(24, 0.15, z, amber, -1, 0.3);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    // Bola pembatas besar agar tidak terpotong frustum culling
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -80), 120);

    return { geometry: g, uniforms: { uTime: { value: 0 }, uScale: { value: 700 } } };
  }, []);

  useFrame(({ clock, size, camera }) => {
    if (!reducedMotion) uniforms.uTime.value = clock.elapsedTime;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 46;
    uniforms.uScale.value = (size.height * Math.min(window.devicePixelRatio || 1, 2)) / (2 * Math.tan((fov * Math.PI) / 360)) * 0.35;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
