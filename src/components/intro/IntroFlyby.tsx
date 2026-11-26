import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  createIntroCloudTexture,
  createIntroFuselageTexture,
  createIntroTailTexture,
} from './aircraftTextures';
import { detectSoftwareWebGL, supportsWebGL } from '../../utils/webglDetect';

interface IntroFlybyProps {
  onComplete: () => void;
  reducedMotion: boolean;
}

const TOTAL_DURATION = 6.0;
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function buildFuselageLathe(length: number, radius: number): THREE.LatheGeometry {
  const half = length / 2;
  const pts: THREE.Vector2[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = ekor, 1 = hidung
    const y = -half + t * length;
    let r = radius;
    if (t < 0.27) {
      const u = t / 0.27;
      r = radius * (0.1 + 0.9 * Math.pow(u, 0.62));
    } else if (t > 0.76) {
      const u = (1 - t) / 0.24;
      r = radius * Math.pow(u, 0.43);
    }
    pts.push(new THREE.Vector2(Math.max(0.002, r), y));
  }
  const geom = new THREE.LatheGeometry(pts, 48);
  geom.computeVertexNormals();
  return geom;
}

function buildSweptWing(
  span: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness = 0.075
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, rootChord * 0.5);
  shape.lineTo(span, sweepZ + tipChord * 0.5);
  shape.lineTo(span, sweepZ - tipChord * 0.5);
  shape.lineTo(0, -rootChord * 0.5);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.4,
    bevelSize: 0.035,
    bevelSegments: 2,
  });
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function buildWinglet(height: number, rootChord: number, tipChord: number, sweepZ: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5 - sweepZ, height);
  shape.lineTo(-rootChord * 0.5 - sweepZ + tipChord, height);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -0.012);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

function buildVerticalTail(height: number, rootChord: number, tipChord: number, sweepZ: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5 - sweepZ, height);
  shape.lineTo(-rootChord * 0.5 - sweepZ + tipChord, height);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.068,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -0.034);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

const TurbofanEngine: React.FC<{
  position: [number, number, number];
  fanRef: React.Ref<THREE.Group>;
  hazeRef: React.Ref<THREE.Mesh>;
}> = ({ position, fanRef, hazeRef }) => (
  <group position={position}>
    {/* Pylon penopang */}
    <mesh position={[0, 0.25, -0.08]}>
      <boxGeometry args={[0.09, 0.34, 0.78]} />
      <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.32} />
    </mesh>
    {/* Cowling mesin putih */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.27, 0.285, 1.08, 32, 1, true]} />
      <meshPhysicalMaterial
        color="#F5F7FF"
        roughness={0.2}
        metalness={0.22}
        clearcoat={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
    {/* Garis biru #2F5BEA di nacelle */}
    <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.288, 0.288, 0.14, 28, 1, true]} />
      <meshStandardMaterial color="#2F5BEA" roughness={0.3} side={THREE.DoubleSide} />
    </mesh>
    {/* Intake akustik gelap */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.252, 0.258, 0.9, 28, 1, true]} />
      <meshStandardMaterial color="#0A0F1F" roughness={0.85} metalness={0.2} side={THREE.BackSide} />
    </mesh>
    {/* Bibir intake krom */}
    <mesh position={[0, 0, 0.54]}>
      <torusGeometry args={[0.268, 0.024, 16, 32]} />
      <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.1} envMapIntensity={1.4} />
    </mesh>
    {/* Nozzle knalpot belakang */}
    <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.18, 0.12, 0.38, 24]} />
      <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.22} />
    </mesh>
    {/* Bilah fan berputar */}
    <group ref={fanRef} position={[0, 0, 0.39]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.072, 0.15, 18]} />
        <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.25} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} rotation={[0.32, 0, (i * Math.PI * 2) / 14]}>
          <boxGeometry args={[0.48, 0.036, 0.015]} />
          <meshStandardMaterial color="#64748B" metalness={0.88} roughness={0.2} />
        </mesh>
      ))}
    </group>
    {/* Efek heat haze di belakang mesin */}
    <mesh ref={hazeRef} position={[0, 0, -1.65]} rotation={[-Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.32, 1.9, 16, 1, true]} />
      <meshBasicMaterial
        color="#93C5FD"
        transparent
        opacity={0.14}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  </group>
);

const ProceduralJet: React.FC = () => {
  const fanL = useRef<THREE.Group>(null);
  const fanR = useRef<THREE.Group>(null);
  const hazeL = useRef<THREE.Mesh>(null);
  const hazeR = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const strobeL = useRef<THREE.Mesh>(null);
  const strobeR = useRef<THREE.Mesh>(null);
  const strobeTail = useRef<THREE.Mesh>(null);

  const fuselageTex = useMemo(() => createIntroFuselageTexture(), []);
  const tailTex = useMemo(() => createIntroTailTexture(), []);

  const fuselageGeom = useMemo(() => buildFuselageLathe(7.1, 0.45), []);
  const wingGeom = useMemo(() => buildSweptWing(3.35, 1.38, 0.34, -1.38, 0.075), []);
  const wingletGeom = useMemo(() => buildWinglet(0.38, 0.32, 0.1, 0.2), []);
  const hStabGeom = useMemo(() => buildSweptWing(1.22, 0.64, 0.22, -0.46, 0.045), []);
  const vTailGeom = useMemo(() => buildVerticalTail(1.28, 1.12, 0.44, 0.64), []);

  useEffect(() => {
    return () => {
      fuselageTex.dispose();
      tailTex.dispose();
      fuselageGeom.dispose();
      wingGeom.dispose();
      wingletGeom.dispose();
      hStabGeom.dispose();
      vTailGeom.dispose();
    };
  }, [fuselageTex, tailTex, fuselageGeom, wingGeom, wingletGeom, hStabGeom, vTailGeom]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    if (fanL.current) fanL.current.rotation.z += dt * 24;
    if (fanR.current) fanR.current.rotation.z -= dt * 24;

    // Heat haze berkilau halus
    const shimmer = 0.94 + Math.sin(t * 36) * 0.07;
    if (hazeL.current) hazeL.current.scale.set(shimmer, 1, shimmer);
    if (hazeR.current) hazeR.current.scale.set(shimmer, 1, shimmer);

    // Beacon merah berkedip
    if (beaconRef.current) {
      const beaconOn = Math.sin(t * 5.2) > 0.6;
      (beaconRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = beaconOn ? 7.5 : 0.2;
    }

    // Strobe putih ganda realistis
    const cycle = t % 1.15;
    const flash = (cycle > 0.04 && cycle < 0.11) || (cycle > 0.2 && cycle < 0.27);
    const strobeVal = flash ? 9.5 : 0.2;
    for (const ref of [strobeL, strobeR, strobeTail]) {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = strobeVal;
      }
    }
  });

  const dihedral = 0.078; // +4.5 derajat dihedral realistis

  return (
    <group>
      {/* Badan utama (LatheGeometry dirotasi agar +Y -> +Z arah terbang) */}
      <mesh geometry={fuselageGeom} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshPhysicalMaterial
          map={fuselageTex}
          roughness={0.22}
          metalness={0.14}
          clearcoat={0.9}
          clearcoatRoughness={0.12}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Sayap kanan dengan dihedral & winglet */}
      <group position={[0.32, -0.1, 0.35]} rotation={[0, 0, dihedral]}>
        <mesh geometry={wingGeom} castShadow>
          <meshStandardMaterial color="#DDE5F4" metalness={0.32} roughness={0.28} />
        </mesh>
        <mesh geometry={wingletGeom} position={[3.33, 0.02, -1.38]} rotation={[0, 0, -0.2]}>
          <meshStandardMaterial color="#0D1C52" roughness={0.3} />
        </mesh>
        {/* Navigation light hijau (kanan/starboard) */}
        <mesh position={[3.36, 0.02, -1.24]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={6.5} />
        </mesh>
        {/* Strobe putih ujung sayap kanan */}
        <mesh ref={strobeR} position={[3.38, 0.02, -1.42]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.3} />
        </mesh>
        {/* Contrail tipis di ujung winglet kanan */}
        <mesh position={[3.42, 0.36, -5.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.048, 8.2, 8]} />
          <meshBasicMaterial color="#E2ECFF" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>

      {/* Sayap kiri (mirror) dengan dihedral & winglet */}
      <group position={[-0.32, -0.1, 0.35]} rotation={[0, 0, -dihedral]}>
        <mesh geometry={wingGeom} scale={[-1, 1, 1]} castShadow>
          <meshStandardMaterial color="#DDE5F4" metalness={0.32} roughness={0.28} />
        </mesh>
        <mesh geometry={wingletGeom} position={[-3.33, 0.02, -1.38]} rotation={[0, 0, 0.2]}>
          <meshStandardMaterial color="#0D1C52" roughness={0.3} />
        </mesh>
        {/* Navigation light merah (kiri/port) */}
        <mesh position={[-3.36, 0.02, -1.24]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={6.5} />
        </mesh>
        {/* Strobe putih ujung sayap kiri */}
        <mesh ref={strobeL} position={[-3.38, 0.02, -1.42]}>
          <sphereGeometry args={[0.042, 12, 12]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.3} />
        </mesh>
        {/* Contrail tipis di ujung winglet kiri */}
        <mesh position={[-3.42, 0.36, -5.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.048, 8.2, 8]} />
          <meshBasicMaterial color="#E2ECFF" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>

      {/* 2 Mesin Turbofan bawah sayap */}
      <TurbofanEngine position={[-1.36, -0.34, 0.2]} fanRef={fanL} hazeRef={hazeL} />
      <TurbofanEngine position={[1.36, -0.34, 0.2]} fanRef={fanR} hazeRef={hazeR} />

      {/* Horizontal stabilizer kiri & kanan */}
      <group position={[0, 0.04, -2.72]}>
        <mesh geometry={hStabGeom} position={[0.14, 0, 0]} rotation={[0, 0, 0.06]}>
          <meshStandardMaterial color="#DDE5F4" metalness={0.3} roughness={0.3} />
        </mesh>
        <mesh geometry={hStabGeom} position={[-0.14, 0, 0]} scale={[-1, 1, 1]} rotation={[0, 0, -0.06]}>
          <meshStandardMaterial color="#DDE5F4" metalness={0.3} roughness={0.3} />
        </mesh>
      </group>

      {/* Vertical tail biru tua dengan logo FF */}
      <mesh geometry={vTailGeom} position={[0, 0.16, -2.64]} castShadow>
        <meshStandardMaterial map={tailTex} roughness={0.28} metalness={0.18} />
      </mesh>

      {/* Landing lights terang di pangkal sayap */}
      {[-0.58, 0.58].map((lx, idx) => (
        <group key={idx} position={[lx, -0.14, 0.85]}>
          <mesh>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color="#FFFBEB" emissive="#FEF3C7" emissiveIntensity={10} />
          </mesh>
          <mesh position={[0, -0.08, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.55, 4.4, 16, 1, true]} />
            <meshBasicMaterial
              color="#FEF9C3"
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Beacon merah di atas punggung badan pesawat */}
      <mesh ref={beaconRef} position={[0, 0.48, 0.4]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#FF2438" emissive="#FF2438" emissiveIntensity={0.4} />
      </mesh>

      {/* Strobe putih ekor */}
      <mesh ref={strobeTail} position={[0, 0.06, -3.55]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

const DuskSkyDome: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldPos;
          void main() {
            vec3 dir = normalize(vWorldPos);
            float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
            vec3 groundCol = vec3(0.039, 0.059, 0.122); // #0A0F1F
            vec3 horizonCol = vec3(0.18, 0.31, 0.52);
            vec3 duskWarm = vec3(0.42, 0.28, 0.38);
            vec3 zenithCol = vec3(0.035, 0.055, 0.14);

            vec3 col = mix(groundCol, horizonCol, smoothstep(0.46, 0.53, h));
            col = mix(col, zenithCol, smoothstep(0.53, 0.85, h));

            // Semburat senja hangat di arah cakrawala depan-kiri
            float sunDot = max(0.0, dot(normalize(vec3(-0.35, 0.06, -1.0)), dir));
            col += duskWarm * pow(sunDot, 5.0) * 0.55 * smoothstep(0.44, 0.58, h);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    []
  );

  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <mesh material={mat} frustumCulled={false}>
      <sphereGeometry args={[120, 32, 24]} />
    </mesh>
  );
};

const RunwayLightsStrip: React.FC = () => {
  const pointsGeom = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const push = (x: number, y: number, z: number, r: number, g: number, b: number) => {
      pos.push(x, y, z);
      col.push(r, g, b);
    };
    for (let z = 25; z > -110; z -= 4.5) {
      push(-6.5, 0.08, z, 0.85, 0.92, 1.0);
      push(6.5, 0.08, z, 0.85, 0.92, 1.0);
      push(0, 0.08, z, 0.45, 0.68, 1.0);
    }
    for (let x = -5.5; x <= 5.5; x += 1.4) {
      push(x, 0.09, -12, 1.0, 0.28, 0.32);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);

  useEffect(() => () => pointsGeom.dispose(), [pointsGeom]);

  return (
    <points geometry={pointsGeom}>
      <pointsMaterial size={0.32} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  );
};

const PostBloomEffect: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    if (!enabled) {
      composerRef.current = null;
      return;
    }
    const composer = new EffectComposer(gl);
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    composer.setSize(size.width, size.height);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(size.width / 2)), Math.max(1, Math.floor(size.height / 2))),
      0.38,
      0.55,
      0.88
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [enabled, gl, scene, camera, size.width, size.height]);

  useFrame(() => {
    if (enabled && composerRef.current) {
      composerRef.current.render();
    }
  }, 1);

  return null;
};

const StudioEnv: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.9;
    room.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
};

const FlybyRig: React.FC<{
  isMobile: boolean;
  isSoftwareGl: boolean;
  mistDivRef: React.RefObject<HTMLDivElement | null>;
  doneRef: React.MutableRefObject<boolean>;
  onDone: () => void;
}> = ({ isMobile, isSoftwareGl, mistDivRef, doneRef, onDone }) => {
  const { camera } = useThree();
  const planeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);

  const cloudTexA = useMemo(() => createIntroCloudTexture(0), []);
  const cloudTexB = useMemo(() => createIntroCloudTexture(1), []);

  useEffect(
    () => () => {
      cloudTexA.dispose();
      cloudTexB.dispose();
    },
    [cloudTexA, cloudTexB]
  );

  const clouds = useMemo(() => {
    const count = isMobile || isSoftwareGl ? 16 : 30;
    const list: Array<{ pos: [number, number, number]; w: number; h: number; op: number; v: 0 | 1 }> = [];
    let s = 421;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      list.push({
        pos: [(rnd() - 0.5) * 44, 3.8 + rnd() * 14, -72 + rnd() * 94],
        w: 14 + rnd() * 14,
        h: 7 + rnd() * 6,
        op: 0.24 + rnd() * 0.24,
        v: i % 2 === 0 ? 0 : 1,
      });
    }
    return list;
  }, [isMobile, isSoftwareGl]);

  useFrame((_, rawDelta) => {
    if (finishedRef.current) return;
    const dt = Math.min(rawDelta, 0.05);
    elapsedRef.current += dt;
    const t = elapsedRef.current;

    // Gerakan pesawat terus meluncur ke arah +Z dengan sedikit naik setelah melintas
    if (planeRef.current) {
      const pT = THREE.MathUtils.clamp(t / TOTAL_DURATION, 0, 1);
      const px = THREE.MathUtils.lerp(-9.5, 4.5, pT);
      const py = t < 3.6 ? THREE.MathUtils.lerp(5.8, 2.35, t / 3.6) : THREE.MathUtils.lerp(2.35, 6.2, (t - 3.6) / 2.4);
      const pz = THREE.MathUtils.lerp(-58, 26, pT);
      const pitch = t < 3.4 ? 0.04 : THREE.MathUtils.lerp(0.04, -0.18, Math.min(1, (t - 3.4) / 1.8));
      const bank = Math.sin(pT * Math.PI * 1.4) * -0.18;

      planeRef.current.position.set(px, py, pz);
      planeRef.current.rotation.set(pitch, 0.18, bank);
    }

    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((child) => {
        child.quaternion.copy(camera.quaternion);
      });
    }

    const p = planeRef.current ? planeRef.current.position : _lookTarget.set(0, 3, 0);
    const persp = camera as THREE.PerspectiveCamera;

    // 3 Shot Sinematik (~6 detik total)
    if (t < 2.3) {
      // Shot 1: Low-angle dari landasan menengadah saat pesawat mendekat
      const u = t / 2.3;
      _camTarget.set(THREE.MathUtils.lerp(-1.2, 0.4, u), THREE.MathUtils.lerp(0.75, 1.35, u), 4.2);
      camera.position.lerp(_camTarget, 1 - Math.exp(-5 * dt));
      _lookTarget.set(p.x, p.y, p.z);
      camera.lookAt(_lookTarget);
      persp.fov = THREE.MathUtils.damp(persp.fov, 44, 4, dt);
      persp.updateProjectionMatrix();
    } else if (t < 4.2) {
      // Shot 2: Side tracking shot menyusuri sisi lambung & logo FF
      const u = (t - 2.3) / 1.9;
      _camTarget.set(p.x + 6.8, p.y + 0.65, p.z + THREE.MathUtils.lerp(2.4, -2.0, u));
      camera.position.lerp(_camTarget, 1 - Math.exp(-6 * dt));
      _lookTarget.set(p.x, p.y, p.z - 0.6);
      camera.lookAt(_lookTarget);
      persp.fov = THREE.MathUtils.damp(persp.fov, 48, 5, dt);
      persp.updateProjectionMatrix();
    } else {
      // Shot 3: Pesawat melintas dekat (camera shake) lalu kamera menembus awan putih
      const u = THREE.MathUtils.clamp((t - 4.2) / 1.8, 0, 1);
      const shakeAmt = t < 4.85 ? Math.exp(-(t - 4.2) * 5.2) * 0.14 : 0;
      const sx = Math.sin(t * 64) * shakeAmt;
      const sy = Math.cos(t * 78) * shakeAmt;

      _camTarget.set(
        THREE.MathUtils.lerp(4.2, 1.5, u) + sx,
        THREE.MathUtils.lerp(2.6, 13.5, u * u) + sy,
        THREE.MathUtils.lerp(8.5, 18.0, u)
      );
      camera.position.lerp(_camTarget, 1 - Math.exp(-5.5 * dt));
      _lookTarget.set(p.x * 0.5, THREE.MathUtils.lerp(p.y, 16, u), p.z + 6);
      camera.lookAt(_lookTarget);
      persp.fov = THREE.MathUtils.damp(persp.fov, 58, 4, dt);
      persp.updateProjectionMatrix();
    }

    // Kabut awan putih memuncak di akhir shot 3 (t = 4.95 -> 5.75)
    const mist = THREE.MathUtils.smoothstep(t, 4.95, 5.75);
    if (!doneRef.current && mistDivRef.current) {
      mistDivRef.current.style.opacity = mist.toFixed(3);
    }

    if (t >= TOTAL_DURATION) {
      finishedRef.current = true;
      onDone();
    }
  });

  return (
    <>
      <DuskSkyDome />
      <fogExp2 attach="fog" args={['#1A2B52', 0.011]} />
      <StudioEnv />

      <hemisphereLight args={['#93C5FD', '#0A0F1F', 0.85]} />
      <directionalLight position={[12, 16, 10]} intensity={2.2} color="#FFF7ED" castShadow={!isSoftwareGl} />
      <directionalLight position={[-14, 8, -12]} intensity={1.1} color="#60A5FA" />

      <group ref={planeRef} position={[-9.5, 5.8, -58]}>
        <ProceduralJet />
      </group>

      {/* Lantai landasan gelap + lampu landasan */}
      <mesh position={[0, 0, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 200]} />
        <meshStandardMaterial color="#070B18" roughness={0.9} metalness={0.1} />
      </mesh>
      <RunwayLightsStrip />

      {/* Awan senja volumetrik sederhana */}
      <group ref={cloudsRef}>
        {clouds.map((c, idx) => (
          <mesh key={idx} position={c.pos}>
            <planeGeometry args={[c.w, c.h]} />
            <meshBasicMaterial
              map={c.v === 0 ? cloudTexA : cloudTexB}
              transparent
              opacity={c.op}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      <PostBloomEffect enabled={!isSoftwareGl && !isMobile} />
    </>
  );
};

export const IntroFlyby: React.FC<IntroFlybyProps> = ({ onComplete, reducedMotion }) => {
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);
  const mistDivRef = useRef<HTMLDivElement>(null);

  const webglOk = useMemo(() => supportsWebGL(), []);
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const isMobile = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false), []);

  useEffect(() => {
    if (!webglOk || reducedMotion) {
      onComplete();
    }
  }, [webglOk, reducedMotion, onComplete]);

  const finishWithMistFade = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (mistDivRef.current) {
      mistDivRef.current.style.opacity = '1';
    }
    setExiting(true);
    window.setTimeout(() => {
      onComplete();
    }, 650);
  };

  if (!webglOk || reducedMotion) return null;

  return (
    <div
      aria-label="Animasi intro pesawat terbang"
      className={`fixed inset-0 z-50 bg-[#0A0F1F] transition-opacity duration-700 ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <Canvas
        dpr={isSoftwareGl || isMobile ? 1 : [1, 2]}
        shadows={!isSoftwareGl && !isMobile}
        camera={{ position: [-1.2, 0.75, 4.2], fov: 44, near: 0.1, far: 220 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.08,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <FlybyRig
          isMobile={isMobile}
          isSoftwareGl={isSoftwareGl}
          mistDivRef={mistDivRef}
          doneRef={doneRef}
          onDone={finishWithMistFade}
        />
      </Canvas>

      {/* Kabut awan putih saat kamera menembus awan ke Hero */}
      <div
        ref={mistDivRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          opacity: 0,
          background:
            'radial-gradient(ellipse 95% 85% at 50% 45%, rgba(245, 248, 255, 0.98) 0%, rgba(226, 236, 255, 0.94) 55%, rgba(210, 224, 248, 0.9) 100%)',
        }}
      />

      {/* Tombol Lewati Intro kecil di pojok kanan bawah */}
      <button
        type="button"
        onClick={finishWithMistFade}
        className="fixed right-5 bottom-5 z-20 min-h-[44px] px-4 py-2 rounded-full bg-[#0A0F1F]/70 hover:bg-[#121A33] border border-[#F5F7FF]/20 text-xs font-medium text-[#F5F7FF] backdrop-blur-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5BEA]"
      >
        Lewati intro
      </button>
    </div>
  );
};
