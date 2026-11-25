import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PORTFOLIO_ITEMS } from '../../data/portfolioData';
import { createCloudSpriteTexture } from '../../three/proceduralTextures';
import { TwinWidebodyJet } from './ProceduralVehicles';
import { audioEngine } from '../../audio/audioEngine';

interface IntroFlybySceneProps {
  active: boolean;
  reducedMotion: boolean;
  onComplete: () => void;
}

const _targetPos = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

export const IntroFlybyScene: React.FC<IntroFlybySceneProps> = ({
  active,
  reducedMotion,
  onComplete,
}) => {
  const { camera } = useThree();
  const planeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Group>(null);
  const streaksRef = useRef<THREE.Group>(null);
  const smokeRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const completedRef = useRef(false);
  const touchdownPlayedRef = useRef(false);

  useEffect(() => {
    if (active) {
      elapsedRef.current = 0;
      completedRef.current = false;
      touchdownPlayedRef.current = false;
      camera.position.set(1.2, 2.2, 5.8);
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = 46;
      persp.updateProjectionMatrix();
      if (planeRef.current) {
        planeRef.current.position.set(-14, 6.8, -68);
      }
    }
  }, [active, camera]);

  const koreanAirItem = PORTFOLIO_ITEMS[0];
  const cloudTexA = useMemo(() => createCloudSpriteTexture(0), []);
  const cloudTexB = useMemo(() => createCloudSpriteTexture(1), []);

  const cloudSprites = useMemo(() => {
    const items: Array<{
      pos: [number, number, number];
      scaleW: number;
      scaleH: number;
      opacity: number;
      speed: number;
      variant: 0 | 1;
    }> = [];
    let seed = 777;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 28; i++) {
      items.push({
        pos: [(rand() - 0.5) * 48, 1.5 + rand() * 11, -68 + rand() * 72],
        scaleW: 14 + rand() * 16,
        scaleH: 7 + rand() * 6,
        opacity: 0.14 + rand() * 0.16,
        speed: 0.65 + rand() * 1.1,
        variant: i % 2 === 0 ? 0 : 1,
      });
    }
    return items;
  }, []);

  const streakOffsets = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      x: (i - 6.5) * 1.9,
      y: ((i % 4) - 1.5) * 1.3 + 2.8,
      z: -18 - (i % 5) * 7.5,
      len: 4 + (i % 3) * 3,
    }));
  }, []);

  const smokePuffs = useMemo(
    () => [
      { x: -0.68, z: -0.25, delay: 0 },
      { x: 0.68, z: -0.25, delay: 0.02 },
      { x: -0.75, z: -0.85, delay: 0.05 },
      { x: 0.75, z: -0.85, delay: 0.07 },
    ],
    []
  );

  useFrame((_, rawDelta) => {
    if (!active || completedRef.current) return;
    const delta = Math.min(rawDelta, 0.05);
    elapsedRef.current += delta;
    const t = elapsedRef.current;

    audioEngine.updateIntroProgress(t);
    if (t >= 2.1 && !touchdownPlayedRef.current) {
      touchdownPlayedRef.current = true;
      audioEngine.playIntroTouchdown();
    }

    // 0 -> 2.10s: Final approach descent & flare
    // 2.10 -> 2.55s: Touchdown! Main gear contacts runway, tire smoke burst + brief camera shake
    // 2.55 -> 3.60s: Smooth zoom-out & transition into gallery
    if (planeRef.current) {
      const approachT = THREE.MathUtils.clamp(t / 2.1, 0, 1);
      const rolloutT = THREE.MathUtils.clamp((t - 2.1) / 1.0, 0, 1);

      let px: number;
      let py: number;
      let pz: number;
      let pitch: number;
      let bank: number;

      if (t < 2.1) {
        const ease = 1 - Math.pow(1 - approachT, 2);
        px = THREE.MathUtils.lerp(-14, 0.2, ease);
        py = THREE.MathUtils.lerp(6.8, 0.92, ease);
        pz = THREE.MathUtils.lerp(-68, -3.5, ease);
        pitch = -0.065; // Nose-up flare attitude before main gear contact
        bank = Math.sin(approachT * Math.PI) * -0.14;
      } else {
        px = THREE.MathUtils.lerp(0.2, 5.4, rolloutT);
        py = THREE.MathUtils.lerp(0.92, 0.84, Math.min(1, rolloutT * 3.5));
        pz = THREE.MathUtils.lerp(-3.5, 13.5, rolloutT);
        pitch = THREE.MathUtils.lerp(-0.065, 0.0, Math.min(1, rolloutT * 3.0));
        bank = 0;
      }

      planeRef.current.position.set(px, py, pz);
      planeRef.current.rotation.set(pitch, 0.24, bank);
      planeRef.current.scale.setScalar(1.14);
    }

    // Tire smoke burst on main gear touchdown (t = 2.08 -> 2.85)
    if (smokeRef.current && planeRef.current) {
      const smokeElapsed = t - 2.08;
      if (smokeElapsed > 0 && smokeElapsed < 0.85) {
        smokeRef.current.visible = true;
        smokeRef.current.position.set(
          planeRef.current.position.x,
          0.18,
          planeRef.current.position.z - 0.3
        );
        smokeRef.current.children.forEach((puff, idx) => {
          const d = Math.max(0, smokeElapsed - (smokePuffs[idx]?.delay ?? 0));
          const progress = THREE.MathUtils.clamp(d / 0.72, 0, 1);
          const scale = 0.55 + progress * 2.4;
          puff.scale.set(scale, scale * 0.6, 1);
          const mat = (puff as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = (1 - progress) * 0.42;
          puff.quaternion.copy(camera.quaternion);
        });
      } else {
        smokeRef.current.visible = false;
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((child, idx) => {
        const cfg = cloudSprites[idx];
        if (!cfg) return;
        child.position.z += delta * cfg.speed * 5.8;
        if (child.position.z > 14) {
          child.position.z = -70;
        }
        child.quaternion.copy(camera.quaternion);
      });
    }

    if (streaksRef.current) {
      streaksRef.current.position.z = (t * 50) % 34;
      streaksRef.current.visible = t < 2.2;
    }

    const persp = camera as THREE.PerspectiveCamera;

    if (t < 2.55) {
      const p = planeRef.current ? planeRef.current.position : _targetPos.set(0, 2, -15);
      // Brief damped camera shake right at touchdown (t = 2.10 -> 2.48)
      const shakeAge = t - 2.1;
      let shakeX = 0;
      let shakeY = 0;
      if (!reducedMotion && shakeAge > 0 && shakeAge < 0.38) {
        const decay = Math.exp(-shakeAge * 10);
        shakeX = Math.sin(shakeAge * 68) * 0.09 * decay;
        shakeY = Math.cos(shakeAge * 84) * 0.11 * decay;
      }

      _targetPos.set(
        THREE.MathUtils.lerp(1.2, 1.55, THREE.MathUtils.clamp(t / 2.55, 0, 1)) + shakeX,
        THREE.MathUtils.lerp(2.2, 1.55, THREE.MathUtils.clamp(t / 2.55, 0, 1)) + shakeY,
        THREE.MathUtils.lerp(5.8, 4.6, THREE.MathUtils.clamp(t / 2.55, 0, 1))
      );
      camera.position.lerp(_targetPos, 1 - Math.exp(-6.5 * delta));
      _lookAt.set(p.x * 0.48, Math.max(0.9, p.y * 0.72), Math.min(p.z, -1.5));
      camera.lookAt(_lookAt);

      const targetFov = t < 1.5 ? 46 : THREE.MathUtils.lerp(46, 53, (t - 1.5) / 1.05);
      persp.fov = THREE.MathUtils.damp(persp.fov, targetFov, 5, delta);
      persp.updateProjectionMatrix();
    } else if (t < 3.6) {
      const u = (t - 2.55) / 1.05;
      const smooth = u * u * (3 - 2 * u);
      _targetPos.set(
        THREE.MathUtils.lerp(1.55, 0, smooth),
        THREE.MathUtils.lerp(1.55, 1.85, smooth),
        THREE.MathUtils.lerp(4.6, 5.2, smooth)
      );
      camera.position.lerp(_targetPos, 1 - Math.exp(-7.5 * delta));
      _lookAt.set(0, 1.68, 0);
      camera.lookAt(_lookAt);

      persp.fov = THREE.MathUtils.damp(persp.fov, 46, 6.5, delta);
      persp.updateProjectionMatrix();
    } else {
      completedRef.current = true;
      camera.position.set(0, 1.85, 5.2);
      camera.lookAt(0, 1.68, 0);
      persp.fov = 46;
      persp.updateProjectionMatrix();
      onComplete();
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Korean Air Boeing 777-300ER Touchdown Approach */}
      <group ref={planeRef} position={[-14, 6.8, -68]}>
        <TwinWidebodyJet
          livery={koreanAirItem.livery}
          gearDown={true}
          showLights={true}
          spinEngines={true}
        />
        {[-3.42, 3.42].map((wx, idx) => (
          <mesh key={idx} position={[wx, 0.2, -5.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.04, 7.6, 6]} />
            <meshBasicMaterial color="#CBD5E1" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Touchdown Tire Smoke Burst */}
      <group ref={smokeRef} visible={false}>
        {smokePuffs.map((p, idx) => (
          <mesh key={idx} position={[p.x, 0.12, p.z]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshBasicMaterial
              map={cloudTexA}
              color="#E2E8F0"
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Runway 25R Touchdown Zone Guide Lights */}
      <group position={[0, 0.02, -16]}>
        {Array.from({ length: 10 }).map((_, idx) => (
          <mesh key={idx} position={[0, 0, -idx * 4.8 + 14]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.24, 1.8]} />
            <meshBasicMaterial color="#E2E8F0" transparent opacity={0.42} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Atmospheric Approach Cloud Layers */}
      <group ref={cloudsRef}>
        {cloudSprites.map((c, idx) => (
          <mesh key={idx} position={c.pos} renderOrder={-1}>
            <planeGeometry args={[c.scaleW, c.scaleH]} />
            <meshBasicMaterial
              map={c.variant === 0 ? cloudTexA : cloudTexB}
              transparent
              opacity={c.opacity}
              depthWrite={false}
              color="#94A3B8"
            />
          </mesh>
        ))}
      </group>

      {/* Thin High-Speed Airflow Wind Streaks */}
      <group ref={streaksRef}>
        {streakOffsets.map((s, idx) => (
          <mesh key={idx} position={[s.x, s.y, s.z]}>
            <boxGeometry args={[0.014, 0.014, s.len]} />
            <meshBasicMaterial color="#BAE6FD" transparent opacity={0.14} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
