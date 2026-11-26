import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCloudSpriteTexture, createEmberCloudSpriteTexture } from '../../three/proceduralTextures';

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  uniform float uTime;
  uniform float uMix;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d = hash(i + vec3(1.0, 1.0, 0.0));
    float e = hash(i + vec3(0.0, 0.0, 1.0));
    float g = hash(i + vec3(1.0, 0.0, 1.0));
    float h = hash(i + vec3(0.0, 1.0, 1.0));
    float k = hash(i + vec3(1.0, 1.0, 1.0));
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
  }

  vec3 skyColor(
    vec3 dir,
    vec3 zenithCol,
    vec3 midSkyCol,
    vec3 twilightCol,
    vec3 warmRimCol,
    vec3 nadirCol,
    vec3 starCol,
    float starGain
  ) {
    float y = dir.y;
    vec3 col;
    if (y >= 0.0) {
      float tMid = smoothstep(0.0, 0.34, y);
      float tZenith = smoothstep(0.24, 0.88, y);
      col = mix(twilightCol, midSkyCol, tMid);
      col = mix(col, zenithCol, tZenith);

      float sunAzimuth = max(0.0, dot(normalize(vec2(dir.x, dir.z)), normalize(vec2(-0.55, -0.83))));
      float horizonBand = exp(-abs(y) * 9.5);
      col = mix(col, warmRimCol, horizonBand * pow(sunAzimuth, 2.2) * 0.62);

      float starGrid = hash(floor(dir * 260.0));
      float starMask = smoothstep(0.9968, 0.9996, starGrid) * smoothstep(0.22, 0.72, y);
      float twinkle = 0.72 + 0.28 * sin(uTime * 1.2 + starGrid * 40.0);
      col += starCol * starMask * twinkle * starGain;
    } else {
      float tNadir = smoothstep(0.0, -0.45, y);
      col = mix(twilightCol, nadirCol, tNadir);
    }
    return col;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);

    // Intro approach: langit biru stratosfer
    vec3 intro = skyColor(
      dir,
      vec3(0.0314, 0.0471, 0.0784),
      vec3(0.0784, 0.1882, 0.3294),
      vec3(0.1490, 0.2157, 0.3059),
      vec3(0.225, 0.245, 0.335),
      vec3(0.068, 0.125, 0.215),
      vec3(0.62, 0.78, 0.95),
      0.5
    );

    // Galeri: langit malam bandara di bawah nebula galaksi gelap
    // zenith ungu-hitam -> cakrawala merah bara; tanpa cincin atau lingkaran dekoratif
    vec3 villain = skyColor(
      dir,
      vec3(0.012, 0.010, 0.026),
      vec3(0.040, 0.018, 0.058),
      vec3(0.150, 0.030, 0.062),
      vec3(0.70, 0.18, 0.10),
      vec3(0.026, 0.011, 0.022),
      vec3(1.0, 0.86, 0.80),
      0.85
    );

    float n1 = vnoise(dir * 3.1 + vec3(uTime * 0.008, 0.0, 0.0));
    float n2 = vnoise(dir * 7.4 - vec3(0.0, uTime * 0.012, 0.0));
    float neb = smoothstep(0.5, 0.92, n1 * 0.65 + n2 * 0.35) * smoothstep(0.06, 0.5, dir.y);
    villain += mix(vec3(0.30, 0.035, 0.11), vec3(0.17, 0.06, 0.34), n2) * neb * 0.5;

    gl_FragColor = vec4(mix(intro, villain, uMix), 1.0);
  }
`;

interface CloudLayerItem {
  x: number;
  y: number;
  z: number;
  scaleW: number;
  scaleH: number;
  opacity: number;
  speedX: number;
  speedZ: number;
  variant: 0 | 1;
  tint: string;
}

const EmberDrift: React.FC<{ count: number; reducedMotion: boolean }> = ({ count, reducedMotion }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    let seed = 919;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 3 + rand() * 26;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = rand() * 14;
      pos[i * 3 + 2] = Math.sin(angle) * radius - 2;
      spd[i] = 0.18 + rand() * 0.46;
    }
    return { positions: pos, speeds: spd };
  }, [count]);

  useFrame((_, rawDelta) => {
    if (reducedMotion || !pointsRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.7 + i) * 0.12 * delta;
      if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = 0;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#FF5A6E"
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0.78}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </points>
  );
};

export const AtmosphericSky: React.FC<{
  isSoftwareGl: boolean;
  reducedMotion?: boolean;
  villain?: boolean;
}> = ({ isSoftwareGl, reducedMotion = false, villain = false }) => {
  const cloudsGroupRef = useRef<THREE.Group>(null);
  const skyUniforms = useMemo(() => ({ uTime: { value: 0 }, uMix: { value: villain ? 1 : 0 } }), []);

  const cloudTexA = useMemo(() => createCloudSpriteTexture(0), []);
  const cloudTexB = useMemo(() => createCloudSpriteTexture(1), []);
  const emberTexA = useMemo(() => createEmberCloudSpriteTexture(0), []);
  const emberTexB = useMemo(() => createEmberCloudSpriteTexture(1), []);

  const skyGeo = useMemo(() => new THREE.SphereGeometry(128, 40, 28), []);
  const cloudPlaneGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: skyUniforms,
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
      }),
    [skyUniforms]
  );

  // Ganti palet langsung (kanvas tersembunyi saat fase hero sehingga tidak ada kilatan biru)
  useEffect(() => {
    skyUniforms.uMix.value = villain ? 1 : 0;
  }, [villain, skyUniforms]);

  useEffect(() => {
    return () => {
      skyGeo.dispose();
      cloudPlaneGeo.dispose();
      skyMat.dispose();
    };
  }, [skyGeo, cloudPlaneGeo, skyMat]);

  const cloudLayers = useMemo<CloudLayerItem[]>(() => {
    const items: CloudLayerItem[] = [];
    let seed = 2026;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const lowerCount = isSoftwareGl ? 20 : 34;
    for (let i = 0; i < lowerCount; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 8 + rand() * 44;
      items.push({
        x: Math.cos(angle) * radius,
        y: -3.2 + rand() * 2.4,
        z: Math.sin(angle) * radius,
        scaleW: 18 + rand() * 24,
        scaleH: 8 + rand() * 9,
        opacity: 0.14 + rand() * 0.14,
        speedX: 0.24 + rand() * 0.34,
        speedZ: (rand() - 0.5) * 0.14,
        variant: i % 2 === 0 ? 0 : 1,
        tint: i % 3 === 0 ? '#A8969B' : i % 3 === 1 ? '#64748B' : '#B0C4DE',
      });
    }

    const perimeterCount = isSoftwareGl ? 10 : 18;
    for (let i = 0; i < perimeterCount; i++) {
      const angle = (i / perimeterCount) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const radius = 25 + rand() * 34;
      items.push({
        x: Math.cos(angle) * radius,
        y: 1.5 + rand() * 10.5,
        z: Math.sin(angle) * radius,
        scaleW: 24 + rand() * 26,
        scaleH: 10 + rand() * 9,
        opacity: 0.09 + rand() * 0.11,
        speedX: 0.16 + rand() * 0.24,
        speedZ: (rand() - 0.5) * 0.08,
        variant: i % 2 === 0 ? 1 : 0,
        tint: i % 2 === 0 ? '#7E94B0' : '#9EB3CC',
      });
    }

    return items;
  }, [isSoftwareGl]);

  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!reducedMotion) {
      skyUniforms.uTime.value += delta;
    }

    if (cloudsGroupRef.current) {
      const children = cloudsGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const mesh = children[i];
        const cfg = cloudLayers[i];
        if (!cfg) continue;

        if (!reducedMotion) {
          mesh.position.x += cfg.speedX * delta;
          mesh.position.z += cfg.speedZ * delta;

          if (mesh.position.x > 62) mesh.position.x = -62;
          if (mesh.position.z > 62) mesh.position.z = -62;
          else if (mesh.position.z < -62) mesh.position.z = 62;
        }

        mesh.quaternion.copy(camera.quaternion);
      }
    }
  });

  return (
    <group>
      {/* Kubah Langit Stratosfer */}
      <mesh geometry={skyGeo} material={skyMat} frustumCulled={false} />

      {/* Partikel bara/abu merah halus melayang di udara galeri */}
      {villain && <EmberDrift count={isSoftwareGl ? 70 : 150} reducedMotion={reducedMotion} />}

      {/* Lapisan Awan & Kabut Bergerak Lambat */}
      <group ref={cloudsGroupRef}>
        {cloudLayers.map((c, idx) => (
          <mesh
            key={idx}
            geometry={cloudPlaneGeo}
            position={[c.x, c.y, c.z]}
            scale={[c.scaleW, c.scaleH, 1]}
            renderOrder={-1}
          >
            <meshBasicMaterial
              map={
                villain
                  ? c.variant === 0
                    ? emberTexA
                    : emberTexB
                  : c.variant === 0
                    ? cloudTexA
                    : cloudTexB
              }
              color={villain ? '#FFFFFF' : c.tint}
              transparent
              opacity={villain ? Math.min(0.5, c.opacity * 1.3) : c.opacity}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
