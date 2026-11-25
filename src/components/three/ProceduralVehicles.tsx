import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LiveryStyle, PortfolioItem } from '../../data/portfolioData';
import {
  createFuselageTexture,
  createLocomotiveFrontTexture,
  createTailTexture,
} from '../../three/proceduralTextures';

interface VehicleProps {
  livery: LiveryStyle;
  gearDown?: boolean;
  showLights?: boolean;
  spinEngines?: boolean;
}

// Helper: Smooth aerodynamic fuselage LatheGeometry aligned with +Y = nose, -Y = tail
function buildFuselageGeometry(length: number, radius: number, segments = 48): THREE.LatheGeometry {
  const half = length / 2;
  const pts: THREE.Vector2[] = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = tail, 1 = nose
    const y = -half + t * length;
    let r = radius;
    if (t < 0.27) {
      // Smoothly tapered tail cone
      const u = t / 0.27;
      r = radius * (0.11 + 0.89 * Math.pow(u, 0.62));
    } else if (t > 0.76) {
      // Aerodynamic nose & radome contour
      const u = (1 - t) / 0.24;
      r = radius * Math.pow(u, 0.44);
    }
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const geom = new THREE.LatheGeometry(pts, segments);
  geom.computeVertexNormals();
  return geom;
}

// Helper: Extruded swept airfoil wing (single half-wing extending along +X)
function buildSweptWingGeometry(
  span: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness = 0.08
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
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geom.rotateX(Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

// Helper: Swept vertical tail fin in YZ plane
function buildVerticalTailGeometry(
  height: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness = 0.07
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  // Shape X = Z-forward, Shape Y = height-up
  shape.moveTo(rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5 - sweepZ, height);
  shape.lineTo(-rootChord * 0.5 - sweepZ + tipChord, height);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  // Center thickness along Z before rotating to align chord with Z and height with Y
  geom.translate(0, 0, -thickness / 2);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

// Helper: Aerodynamic swept winglet / sharklet profile
function buildWingletGeometry(
  height: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness = 0.026
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5, 0);
  shape.lineTo(-rootChord * 0.5 - sweepZ, height);
  shape.lineTo(-rootChord * 0.5 - sweepZ + tipChord, height);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geom.translate(0, 0, -thickness / 2);
  geom.rotateY(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

const LandingGearAssembly: React.FC<{
  position: [number, number, number];
  strutHeight: number;
  wheelsPerSide?: number;
  bogieRows?: number;
  scale?: number;
}> = ({ position, strutHeight, wheelsPerSide = 2, bogieRows = 1, scale = 1 }) => {
  const rows = useMemo(() => {
    const arr: number[] = [];
    for (let r = 0; r < bogieRows; r++) {
      arr.push((r - (bogieRows - 1) / 2) * 0.24 * scale);
    }
    return arr;
  }, [bogieRows, scale]);

  return (
    <group position={position}>
      {/* Main oleo strut */}
      <mesh position={[0, -strutHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.045 * scale, 0.038 * scale, strutHeight, 12]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.22} />
      </mesh>
      {/* Torque link collar */}
      <mesh position={[0, -strutHeight * 0.6, 0]}>
        <cylinderGeometry args={[0.058 * scale, 0.058 * scale, 0.09 * scale, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Bogie beam */}
      {bogieRows > 1 && (
        <mesh position={[0, -strutHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03 * scale, 0.03 * scale, (bogieRows - 1) * 0.26 * scale, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.3} />
        </mesh>
      )}
      {/* Rubber tires + alloy hubs */}
      {rows.map((zOff, ri) =>
        Array.from({ length: wheelsPerSide }).map((_, wi) => {
          const xOff = (wi - (wheelsPerSide - 1) / 2) * 0.14 * scale;
          return (
            <group key={`${ri}-${wi}`} position={[xOff, -strutHeight, zOff]} rotation={[0, 0, Math.PI / 2]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.11 * scale, 0.11 * scale, 0.075 * scale, 18]} />
                <meshStandardMaterial color="#16191F" roughness={0.88} metalness={0.05} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.055 * scale, 0.055 * scale, 0.08 * scale, 14]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.82} roughness={0.25} />
              </mesh>
            </group>
          );
        })
      )}
    </group>
  );
};

const TurbofanPod: React.FC<{
  position: [number, number, number];
  radius?: number;
  length?: number;
  color: string;
  accentColor?: string;
  spinRef?: React.Ref<THREE.Group>;
}> = ({ position, radius = 0.28, length = 1.05, color, accentColor, spinRef }) => {
  return (
    <group position={position}>
      {/* Pylon */}
      <mesh position={[0, radius * 0.9, -length * 0.08]}>
        <boxGeometry args={[0.09, radius * 1.1, length * 0.72]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.45} roughness={0.35} />
      </mesh>
      {/* Main fan cowling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.96, radius, length, 32, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.2}
          metalness={0.26}
          clearcoat={0.9}
          envMapIntensity={1.25}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner dark acoustic intake shroud */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.9, radius * 0.92, length * 0.85, 28, 1, true]} />
        <meshStandardMaterial color="#0F172A" roughness={0.75} metalness={0.2} side={THREE.BackSide} />
      </mesh>
      {/* Polished metallic intake lip */}
      <mesh position={[0, 0, length * 0.5]} rotation={[0, 0, 0]}>
        <torusGeometry args={[radius * 0.95, radius * 0.075, 16, 32]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.12} envMapIntensity={1.3} />
      </mesh>
      {/* Exhaust core nozzle */}
      <mesh position={[0, 0, -length * 0.56]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius * 0.65, radius * 0.44, length * 0.34, 24]} />
        <meshStandardMaterial color="#334155" metalness={0.86} roughness={0.24} />
      </mesh>
      {/* Optional livery ring on nacelle */}
      {accentColor && (
        <mesh position={[0, 0, length * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 1.005, radius * 1.005, length * 0.12, 24, 1, true]} />
          <meshStandardMaterial color={accentColor} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Spinning 14-blade titanium fan & spinner cone */}
      <group ref={spinRef} position={[0, 0, length * 0.36]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[radius * 0.24, radius * 0.48, 18]} />
          <meshStandardMaterial color="#1E293B" metalness={0.65} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, radius * 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[radius * 0.09, radius * 0.14, 14]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.92} roughness={0.14} />
        </mesh>
        {Array.from({ length: 14 }).map((_, idx) => (
          <mesh key={idx} rotation={[0.32, 0, (idx * Math.PI * 2) / 14]}>
            <boxGeometry args={[radius * 1.72, 0.036, 0.016]} />
            <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.22} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const TwinWidebodyJet: React.FC<VehicleProps> = ({
  livery,
  gearDown = true,
  showLights = false,
  spinEngines = true,
}) => {
  const fanLeft = useRef<THREE.Group>(null);
  const fanRight = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const tailStrobeRef = useRef<THREE.Mesh>(null);
  const leftStrobeRef = useRef<THREE.Mesh>(null);
  const rightStrobeRef = useRef<THREE.Mesh>(null);

  const fuselageTex = useMemo(() => createFuselageTexture(livery), [livery]);
  const tailTex = useMemo(() => createTailTexture(livery), [livery]);

  const is787 = livery.variant === '787';
  const isA350 = livery.variant === 'a350';
  const is777 = livery.variant === '777';

  const fuselageGeom = useMemo(() => buildFuselageGeometry(6.8, 0.44, 48), []);
  const rightWingGeom = useMemo(() => buildSweptWingGeometry(3.25, 1.35, 0.34, -1.35, 0.07), []);
  const wingletGeom = useMemo(() => buildWingletGeometry(isA350 ? 0.44 : 0.32, 0.3, 0.1, 0.18, 0.024), [isA350]);
  const hStabGeom = useMemo(() => buildSweptWingGeometry(1.18, 0.62, 0.22, -0.45, 0.045), []);
  const vTailGeom = useMemo(() => buildVerticalTailGeometry(1.22, 1.1, 0.42, 0.62, 0.065), []);

  useFrame(({ clock }, delta) => {
    if (spinEngines) {
      const spinSpeed = delta * 18;
      if (fanLeft.current) fanLeft.current.rotation.z += spinSpeed;
      if (fanRight.current) fanRight.current.rotation.z -= spinSpeed;
    }
    const elapsed = clock.elapsedTime;
    if (beaconRef.current) {
      const pulse = Math.sin(elapsed * 5.2) > 0.62 ? 4.2 : 0.25;
      (beaconRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    }
    // Realistic aviation double-strobe flash cycle (~1.2s)
    const cycle = elapsed % 1.25;
    const isDoubleFlash = (cycle > 0.04 && cycle < 0.11) || (cycle > 0.2 && cycle < 0.27);
    const strobeIntensity = showLights ? (isDoubleFlash ? 7.5 : 0.35) : 1.2;
    if (tailStrobeRef.current) {
      (tailStrobeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = strobeIntensity;
    }
    if (leftStrobeRef.current) {
      (leftStrobeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = strobeIntensity;
    }
    if (rightStrobeRef.current) {
      (rightStrobeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = strobeIntensity;
    }
  });

  return (
    <group>
      {/* Sculpted Fuselage (+Y lathe rotated to +Z forward) */}
      <mesh geometry={fuselageGeom} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={fuselageTex}
          roughness={0.2}
          metalness={0.14}
          clearcoat={0.88}
          clearcoatRoughness={0.12}
          envMapIntensity={1.22}
        />
      </mesh>

      {/* Cockpit Windshield Mask */}
      <mesh position={[0, 0.19, 2.86]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.32]} />
        <meshPhysicalMaterial
          color={isA350 ? '#090D16' : '#0F172A'}
          roughness={0.05}
          metalness={0.32}
          clearcoat={1}
          envMapIntensity={1.35}
        />
      </mesh>

      {/* Wing-Body Belly Fairing */}
      <mesh position={[0, -0.22, 0.15]} scale={[1.15, 0.65, 2.2]}>
        <sphereGeometry args={[0.44, 24, 16]} />
        <meshStandardMaterial color={livery.belly} roughness={0.3} metalness={0.12} />
      </mesh>

      {/* Main Wings (Right & Mirrored Left with 4° dihedral) */}
      <group position={[0.32, -0.1, 0.35]} rotation={[0, 0, 0.075]}>
        <mesh geometry={rightWingGeom} castShadow receiveShadow>
          <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.3} envMapIntensity={1.15} />
        </mesh>
        {/* Flap track fairings */}
        {[0.8, 1.55, 2.3].map((wx, i) => (
          <mesh key={i} position={[wx, -0.05, -0.35 - wx * 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.04, 0.42, 8]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.35} />
          </mesh>
        ))}
        {/* Swept Winglet / Raked Sharklet */}
        <mesh
          geometry={wingletGeom}
          position={[3.22, 0, -1.35]}
          rotation={[0, 0, isA350 ? -0.35 : is787 ? -1.12 : -1.2]}
        >
          <meshPhysicalMaterial color={livery.tail} roughness={0.25} clearcoat={0.75} />
        </mesh>
        {/* Starboard Green Navigation Light + White Strobe */}
        <mesh position={[3.28, 0.04, -1.32]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={showLights ? 4.5 : 1.6} />
        </mesh>
        <mesh ref={rightStrobeRef} position={[3.28, 0.04, -1.46]}>
          <sphereGeometry args={[0.038, 10, 10]} />
          <meshStandardMaterial color="#F8FAFC" emissive="#FFFFFF" emissiveIntensity={1.5} />
        </mesh>
      </group>

      <group position={[-0.32, -0.1, 0.35]} rotation={[0, 0, -0.075]} scale={[-1, 1, 1]}>
        <mesh geometry={rightWingGeom} castShadow receiveShadow>
          <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.3} envMapIntensity={1.15} />
        </mesh>
        {[0.8, 1.55, 2.3].map((wx, i) => (
          <mesh key={i} position={[wx, -0.05, -0.35 - wx * 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.04, 0.42, 8]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.35} />
          </mesh>
        ))}
        <mesh
          geometry={wingletGeom}
          position={[3.22, 0, -1.35]}
          rotation={[0, 0, isA350 ? -0.35 : is787 ? -1.12 : -1.2]}
        >
          <meshPhysicalMaterial color={livery.tail} roughness={0.25} clearcoat={0.75} />
        </mesh>
        {/* Port Red Navigation Light + White Strobe */}
        <mesh position={[3.28, 0.04, -1.32]}>
          <sphereGeometry args={[0.04, 10, 10]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={showLights ? 4.5 : 1.6} />
        </mesh>
        <mesh ref={leftStrobeRef} position={[3.28, 0.04, -1.46]}>
          <sphereGeometry args={[0.038, 10, 10]} />
          <meshStandardMaterial color="#F8FAFC" emissive="#FFFFFF" emissiveIntensity={1.5} />
        </mesh>
      </group>

      {/* Twin High-Bypass Turbofan Engines */}
      <TurbofanPod
        position={[1.18, -0.34, 0.48]}
        radius={is777 ? 0.31 : 0.27}
        length={is777 ? 1.15 : 1.02}
        color={livery.engine}
        accentColor={livery.pattern === 'mclaren' ? '#14171C' : undefined}
        spinRef={fanRight}
      />
      <TurbofanPod
        position={[-1.18, -0.34, 0.48]}
        radius={is777 ? 0.31 : 0.27}
        length={is777 ? 1.15 : 1.02}
        color={livery.engine}
        accentColor={livery.pattern === 'mclaren' ? '#14171C' : undefined}
        spinRef={fanLeft}
      />

      {/* Horizontal Stabilizers */}
      <group position={[0.14, 0.04, -2.55]} rotation={[0, 0, 0.09]}>
        <mesh geometry={hStabGeom}>
          <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.25} />
        </mesh>
      </group>
      <group position={[-0.14, 0.04, -2.55]} rotation={[0, 0, -0.09]} scale={[-1, 1, 1]}>
        <mesh geometry={hStabGeom}>
          <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.25} />
        </mesh>
      </group>

      {/* Vertical Tail Fin */}
      <mesh geometry={vTailGeom} position={[0, 0.26, -2.42]} castShadow>
        <meshPhysicalMaterial map={tailTex} roughness={0.24} clearcoat={0.8} />
      </mesh>

      {/* Upper Anti-Collision Red Beacon */}
      <mesh ref={beaconRef} position={[0, 0.45, 0.4]}>
        <sphereGeometry args={[0.042, 10, 10]} />
        <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={2.5} />
      </mesh>

      {/* Tail Strobe Light */}
      <mesh ref={tailStrobeRef} position={[0, 0.06, -3.38]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#F8FAFC" emissive="#FFFFFF" emissiveIntensity={showLights ? 4.5 : 1.5} />
      </mesh>

      {/* Landing Gear (Deployed for Fly-By & Inspection) */}
      {gearDown && (
        <group>
          <LandingGearAssembly position={[0, -0.38, 2.35]} strutHeight={0.44} wheelsPerSide={2} bogieRows={1} scale={0.85} />
          <LandingGearAssembly
            position={[0.68, -0.36, -0.15]}
            strutHeight={0.48}
            wheelsPerSide={2}
            bogieRows={is777 || isA350 ? 3 : 2}
            scale={0.95}
          />
          <LandingGearAssembly
            position={[-0.68, -0.36, -0.15]}
            strutHeight={0.48}
            wheelsPerSide={2}
            bogieRows={is777 || isA350 ? 3 : 2}
            scale={0.95}
          />
        </group>
      )}

      {/* Bright Forward Landing Lights Cone Glow during Fly-By */}
      {showLights && (
        <group position={[0, -0.45, 2.55]}>
          <mesh>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <pointLight color="#E0F2FE" intensity={5} distance={10} />
        </group>
      )}
    </group>
  );
};

export const QuadA380Model: React.FC<VehicleProps> = ({ livery, gearDown = true }) => {
  const fanRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const fuselageTex = useMemo(() => createFuselageTexture(livery), [livery]);
  const tailTex = useMemo(() => createTailTexture(livery), [livery]);

  const fuselageGeom = useMemo(() => {
    const g = buildFuselageGeometry(7.2, 0.48, 48);
    g.scale(1.0, 1.0, 1.24); // Tall double-deck oval cross-section (along Z before X-rotation -> Y after!)
    return g;
  }, []);
  const wingGeom = useMemo(() => buildSweptWingGeometry(3.85, 1.68, 0.42, -1.6, 0.085), []);
  const wingletGeom = useMemo(() => buildWingletGeometry(0.28, 0.24, 0.09, 0.14, 0.022), []);
  const hStabGeom = useMemo(() => buildSweptWingGeometry(1.42, 0.72, 0.25, -0.5, 0.05), []);
  const vTailGeom = useMemo(() => buildVerticalTailGeometry(1.48, 1.32, 0.48, 0.7, 0.075), []);

  useFrame((_, delta) => {
    fanRefs.forEach((r, idx) => {
      if (r.current) r.current.rotation.z += delta * 16 * (idx % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <group>
      {/* Double-Deck Widebody Fuselage */}
      <mesh geometry={fuselageGeom} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshPhysicalMaterial map={fuselageTex} roughness={0.2} clearcoat={0.88} envMapIntensity={1.22} />
      </mesh>
      {/* Upper Deck Forehead Cockpit */}
      <mesh position={[0, 0.24, 3.0]} rotation={[0.28, 0, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.34]} />
        <meshPhysicalMaterial color="#0F172A" roughness={0.05} clearcoat={1} envMapIntensity={1.35} />
      </mesh>
      {/* Wings + 4 Engines */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.34, -0.18, 0.35]} rotation={[0, 0, side * 0.08]} scale={[side, 1, 1]}>
          <mesh geometry={wingGeom} castShadow>
            <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.28} envMapIntensity={1.15} />
          </mesh>
          <mesh geometry={wingletGeom} position={[3.82, 0, -1.6]}>
            <meshPhysicalMaterial color={livery.tail} roughness={0.25} clearcoat={0.75} />
          </mesh>
          <mesh geometry={wingletGeom} position={[3.82, 0, -1.6]} rotation={[Math.PI, 0, 0]}>
            <meshPhysicalMaterial color={livery.tail} roughness={0.25} clearcoat={0.75} />
          </mesh>
        </group>
      ))}
      <TurbofanPod position={[1.38, -0.44, 0.48]} radius={0.26} length={1.0} color={livery.engine} spinRef={fanRefs[0]} />
      <TurbofanPod position={[2.45, -0.34, -0.15]} radius={0.24} length={0.95} color={livery.engine} spinRef={fanRefs[1]} />
      <TurbofanPod position={[-1.38, -0.44, 0.48]} radius={0.26} length={1.0} color={livery.engine} spinRef={fanRefs[2]} />
      <TurbofanPod position={[-2.45, -0.34, -0.15]} radius={0.24} length={0.95} color={livery.engine} spinRef={fanRefs[3]} />

      {/* Empennage */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.16, 0.06, -2.75]} rotation={[0, 0, side * 0.08]} scale={[side, 1, 1]}>
          <mesh geometry={hStabGeom}>
            <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh geometry={vTailGeom} position={[0, 0.36, -2.55]} castShadow>
        <meshPhysicalMaterial map={tailTex} roughness={0.22} clearcoat={0.85} envMapIntensity={1.2} />
      </mesh>

      {gearDown && (
        <group>
          <LandingGearAssembly position={[0, -0.5, 2.5]} strutHeight={0.48} wheelsPerSide={2} bogieRows={1} scale={0.9} />
          <LandingGearAssembly position={[0.76, -0.46, -0.15]} strutHeight={0.52} wheelsPerSide={2} bogieRows={3} scale={0.95} />
          <LandingGearAssembly position={[-0.76, -0.46, -0.15]} strutHeight={0.52} wheelsPerSide={2} bogieRows={3} scale={0.95} />
        </group>
      )}
    </group>
  );
};

export const Quad747Model: React.FC<VehicleProps> = ({ livery, gearDown = true }) => {
  const fanRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const fuselageTex = useMemo(() => createFuselageTexture(livery), [livery]);
  const tailTex = useMemo(() => createTailTexture(livery), [livery]);

  const fuselageGeom = useMemo(() => buildFuselageGeometry(7.3, 0.44, 48), []);
  const wingGeom = useMemo(() => buildSweptWingGeometry(3.65, 1.55, 0.34, -1.75, 0.075), []);
  const wingletGeom = useMemo(() => buildWingletGeometry(0.3, 0.28, 0.09, 0.22, 0.022), []);
  const hStabGeom = useMemo(() => buildSweptWingGeometry(1.32, 0.65, 0.22, -0.52, 0.045), []);
  const vTailGeom = useMemo(() => buildVerticalTailGeometry(1.38, 1.24, 0.44, 0.72, 0.068), []);

  useFrame((_, delta) => {
    fanRefs.forEach((r, idx) => {
      if (r.current) r.current.rotation.z += delta * 16 * (idx % 2 === 0 ? 1 : -1);
    });
  });

  return (
    <group>
      {/* Main Lower Hull */}
      <mesh geometry={fuselageGeom} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshPhysicalMaterial map={fuselageTex} roughness={0.2} clearcoat={0.88} envMapIntensity={1.22} />
      </mesh>
      {/* Iconic 747 Upper Deck Hump */}
      <mesh position={[0, 0.25, 1.75]} scale={[0.78, 0.64, 2.95]} castShadow>
        <sphereGeometry args={[0.42, 28, 20]} />
        <meshPhysicalMaterial color={livery.fuselage} roughness={0.2} clearcoat={0.88} envMapIntensity={1.22} />
      </mesh>
      {/* Upper Deck Cockpit Windshield */}
      <mesh position={[0, 0.41, 2.74]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.34, 0.11, 0.24]} />
        <meshPhysicalMaterial color="#0F172A" roughness={0.05} clearcoat={1} envMapIntensity={1.35} />
      </mesh>
      {/* Swept Wings + Raked 747-8F Wingtips + 4 GEnx Engines */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.32, -0.14, 0.25]} rotation={[0, 0, side * 0.07]} scale={[side, 1, 1]}>
          <mesh geometry={wingGeom} castShadow>
            <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.28} envMapIntensity={1.15} />
          </mesh>
          <mesh geometry={wingletGeom} position={[3.62, 0, -1.75]} rotation={[0, 0, -1.2]}>
            <meshPhysicalMaterial color={livery.wing} roughness={0.28} clearcoat={0.7} />
          </mesh>
        </group>
      ))}
      <TurbofanPod position={[1.28, -0.38, 0.32]} radius={0.24} length={0.98} color={livery.engine} spinRef={fanRefs[0]} />
      <TurbofanPod position={[2.32, -0.3, -0.35]} radius={0.23} length={0.94} color={livery.engine} spinRef={fanRefs[1]} />
      <TurbofanPod position={[-1.28, -0.38, 0.32]} radius={0.24} length={0.98} color={livery.engine} spinRef={fanRefs[2]} />
      <TurbofanPod position={[-2.32, -0.3, -0.35]} radius={0.23} length={0.94} color={livery.engine} spinRef={fanRefs[3]} />

      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.14, 0.05, -2.75]} rotation={[0, 0, side * 0.08]} scale={[side, 1, 1]}>
          <mesh geometry={hStabGeom}>
            <meshStandardMaterial color={livery.wing} roughness={0.3} metalness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh geometry={vTailGeom} position={[0, 0.3, -2.62]} castShadow>
        <meshPhysicalMaterial map={tailTex} roughness={0.24} clearcoat={0.8} />
      </mesh>

      {gearDown && (
        <group>
          <LandingGearAssembly position={[0, -0.4, 2.55]} strutHeight={0.45} wheelsPerSide={2} bogieRows={1} scale={0.85} />
          <LandingGearAssembly position={[0.78, -0.38, -0.15]} strutHeight={0.48} wheelsPerSide={2} bogieRows={2} scale={0.92} />
          <LandingGearAssembly position={[-0.78, -0.38, -0.15]} strutHeight={0.48} wheelsPerSide={2} bogieRows={2} scale={0.92} />
        </group>
      )}
    </group>
  );
};

export const TurbopropCN295Model: React.FC<VehicleProps> = ({ livery, gearDown = true }) => {
  const propLeft = useRef<THREE.Group>(null);
  const propRight = useRef<THREE.Group>(null);

  const fuselageTex = useMemo(() => createFuselageTexture(livery), [livery]);
  const tailTex = useMemo(() => createTailTexture(livery), [livery]);

  const fuselageGeom = useMemo(() => buildFuselageGeometry(5.6, 0.42, 36), []);
  // High straight/tapered military transport wing
  const highWingGeom = useMemo(() => buildSweptWingGeometry(3.1, 0.92, 0.46, -0.22, 0.075), []);
  const hStabGeom = useMemo(() => buildSweptWingGeometry(1.15, 0.54, 0.28, -0.16, 0.045), []);
  const vTailGeom = useMemo(() => buildVerticalTailGeometry(1.25, 1.05, 0.46, 0.35, 0.068), []);

  useFrame((_, delta) => {
    if (propLeft.current) propLeft.current.rotation.z += delta * 24;
    if (propRight.current) propRight.current.rotation.z -= delta * 24;
  });

  return (
    <group>
      {/* Tactical Camo Fuselage */}
      <mesh geometry={fuselageGeom} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial map={fuselageTex} roughness={0.78} metalness={0.08} />
      </mesh>
      {/* Cockpit Glazing */}
      <mesh position={[0, 0.14, 2.38]} rotation={[0.32, 0, 0]}>
        <boxGeometry args={[0.42, 0.14, 0.28]} />
        <meshPhysicalMaterial color="#0F172A" roughness={0.08} clearcoat={0.9} />
      </mesh>
      {/* Lower Gear Sponson Fairings */}
      {[-0.4, 0.4].map((sx, idx) => (
        <mesh key={idx} position={[sx, -0.24, -0.15]} scale={[0.45, 0.45, 2.1]}>
          <sphereGeometry args={[0.36, 16, 12]} />
          <meshStandardMaterial color="#333D26" roughness={0.8} />
        </mesh>
      ))}
      {/* High-Mounted Wing */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.22, 0.36, 0.2]} rotation={[0, 0, side * -0.02]} scale={[side, 1, 1]}>
          <mesh geometry={highWingGeom} castShadow>
            <meshStandardMaterial color={livery.wing} roughness={0.76} metalness={0.08} />
          </mesh>
        </group>
      ))}
      {/* Twin Turboprop Nacelles + 6-Blade Composite Propellers */}
      {[1, -1].map((side, idx) => (
        <group key={side} position={[side * 1.15, 0.24, 0.55]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.18, 1.18, 18]} />
            <meshStandardMaterial color={livery.engine} roughness={0.75} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.08, 0.56]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.06, 0.18, 12]} />
            <meshStandardMaterial color="#1E293B" roughness={0.5} />
          </mesh>
          <group ref={idx === 0 ? propRight : propLeft} position={[0, 0, 0.64]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.12, 0.28, 14]} />
              <meshStandardMaterial color="#1E293B" roughness={0.4} metalness={0.4} />
            </mesh>
            {Array.from({ length: 6 }).map((_, bi) => (
              <mesh key={bi} rotation={[0, 0, (bi * Math.PI * 2) / 6]}>
                <boxGeometry args={[0.075, 0.96, 0.018]} />
                <meshStandardMaterial color="#18181B" roughness={0.45} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {/* Tail Surfaces */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.14, 0.12, -2.2]} scale={[side, 1, 1]}>
          <mesh geometry={hStabGeom}>
            <meshStandardMaterial color={livery.wing} roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh geometry={vTailGeom} position={[0, 0.34, -2.05]} castShadow>
        <meshStandardMaterial map={tailTex} roughness={0.74} />
      </mesh>

      {gearDown && (
        <group>
          <LandingGearAssembly position={[0, -0.34, 1.98]} strutHeight={0.36} wheelsPerSide={2} bogieRows={1} scale={0.75} />
          <LandingGearAssembly position={[0.48, -0.3, -0.15]} strutHeight={0.4} wheelsPerSide={2} bogieRows={1} scale={0.85} />
          <LandingGearAssembly position={[-0.48, -0.3, -0.15]} strutHeight={0.4} wheelsPerSide={2} bogieRows={1} scale={0.85} />
        </group>
      )}
    </group>
  );
};

export const LocomotiveCC206Model: React.FC<VehicleProps> = ({ livery }) => {
  const frontTex = useMemo(() => createLocomotiveFrontTexture(), []);

  // Angled dual-cab locomotive shell extrusion
  const bodyGeom = useMemo(() => {
    const shape = new THREE.Shape();
    // Side profile (X = length along Z, Y = height)
    shape.moveTo(-2.75, 0);
    shape.lineTo(2.75, 0);
    shape.lineTo(2.92, 0.45);
    shape.lineTo(2.68, 1.12);
    shape.lineTo(2.38, 1.24);
    shape.lineTo(-2.38, 1.24);
    shape.lineTo(-2.68, 1.12);
    shape.lineTo(-2.92, 0.45);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 1.06,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2,
    });
    g.translate(0, 0, -0.53);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <group position={[0, -0.55, 0]}>
      {/* Main KAI Red Carbody */}
      <mesh geometry={bodyGeom} position={[0, 0.36, 0]} castShadow>
        <meshPhysicalMaterial color={livery.fuselage} roughness={0.28} metalness={0.2} clearcoat={0.75} />
      </mesh>

      {/* White Mid-Body Stripe & Dark Roof */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[1.13, 0.18, 4.3]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.56, 0]}>
        <boxGeometry args={[0.92, 0.1, 4.4]} />
        <meshStandardMaterial color="#334155" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* Dynamic Brake & Exhaust Stack Modules */}
      <mesh position={[0, 1.65, -0.4]}>
        <boxGeometry args={[0.62, 0.14, 1.4]} />
        <meshStandardMaterial color="#1E293B" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Front & Rear Cab Windshields + KAI Emblem + Headlights */}
      {[1, -1].map((dir) => (
        <group key={dir} position={[0, 0.36, dir * 2.75]} rotation={[0, dir === 1 ? 0 : Math.PI, 0]}>
          {/* Twin Windshields */}
          {[-0.24, 0.24].map((wx, wi) => (
            <mesh key={wi} position={[wx, 0.88, 0.01]} rotation={[-0.22, 0, 0]}>
              <boxGeometry args={[0.38, 0.32, 0.06]} />
              <meshPhysicalMaterial color="#090D16" roughness={0.08} clearcoat={1} />
            </mesh>
          ))}
          {/* KAI Front Emblem Plate */}
          <mesh position={[0, 0.5, 0.14]}>
            <planeGeometry args={[0.48, 0.28]} />
            <meshStandardMaterial map={frontTex} roughness={0.3} />
          </mesh>
          {/* Twin Main Headlights */}
          {[-0.38, 0.38].map((hx, hi) => (
            <mesh key={hi} position={[hx, 0.24, 0.17]}>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color="#FEF9C3" emissive="#FEF08A" emissiveIntensity={3.5} />
            </mesh>
          ))}
          {/* Roof Auxiliary Ditch Lights */}
          {[-0.08, 0.08].map((lx, li) => (
            <mesh key={li} position={[lx, 1.15, -0.22]}>
              <sphereGeometry args={[0.04, 10, 10]} />
              <meshStandardMaterial color="#FFFFFF" emissive="#FEF08A" emissiveIntensity={3.0} />
            </mesh>
          ))}
          {/* Cowcatcher Snowplow Skirt */}
          <mesh position={[0, -0.02, 0.14]}>
            <boxGeometry args={[1.08, 0.26, 0.24]} />
            <meshStandardMaterial color="#7F1D1D" roughness={0.65} metalness={0.25} />
          </mesh>
        </group>
      ))}

      {/* Underframe Sill & Fuel Tank */}
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[1.1, 0.14, 5.75]} />
        <meshStandardMaterial color="#1E242B" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.92, 0.24, 1.65]} />
        <meshStandardMaterial color="#11161D" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Two 3-Axle Co-Co Bogie Trucks & Steel Wheels */}
      {[1.65, -1.65].map((bz, bi) => (
        <group key={bi} position={[0, 0.18, bz]}>
          <mesh>
            <boxGeometry args={[1.04, 0.16, 1.6]} />
            <meshStandardMaterial color="#1E293B" roughness={0.55} metalness={0.65} />
          </mesh>
          {[-0.56, 0, 0.56].map((az, ai) => (
            <group key={ai} position={[0, -0.06, az]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 1.08, 10]} />
                <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
              </mesh>
              {[-0.46, 0.46].map((wx, wi) => (
                <mesh key={wi} position={[wx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.16, 0.16, 0.07, 18]} />
                  <meshStandardMaterial color="#94A3B8" metalness={0.88} roughness={0.22} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}

      {/* Precision Steel Rail Track Segment */}
      <group position={[0, -0.06, 0]}>
        {[-0.46, 0.46].map((rx, ri) => (
          <mesh key={ri} position={[rx, 0, 0]}>
            <boxGeometry args={[0.05, 0.07, 6.8]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}
        {Array.from({ length: 15 }).map((_, ti) => (
          <mesh key={ti} position={[0, -0.045, -3.15 + ti * 0.45]}>
            <boxGeometry args={[1.38, 0.04, 0.14]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const ProceduralVehicle: React.FC<{
  item: PortfolioItem;
  gearDown?: boolean;
  showLights?: boolean;
}> = ({ item, gearDown = true, showLights = false }) => {
  switch (item.archetype) {
    case 'quad-a380':
      return <QuadA380Model livery={item.livery} gearDown={gearDown} showLights={showLights} />;
    case 'quad-747':
      return <Quad747Model livery={item.livery} gearDown={gearDown} showLights={showLights} />;
    case 'turboprop-camo':
      return <TurbopropCN295Model livery={item.livery} gearDown={gearDown} showLights={showLights} />;
    case 'locomotive-cc206':
      return <LocomotiveCC206Model livery={item.livery} gearDown={gearDown} showLights={showLights} />;
    case 'twin-widebody':
    default:
      return <TwinWidebodyJet livery={item.livery} gearDown={gearDown} showLights={showLights} />;
  }
};
