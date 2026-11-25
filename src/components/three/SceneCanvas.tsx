import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PortfolioItem } from '../../data/portfolioData';
import { detectSoftwareWebGL, supportsWebGL } from '../../utils/webglDetect';
import { IntroFlybyScene } from './IntroFlybyScene';
import { GalleryCylinder, GalleryLoadProgress } from './GalleryCylinder';
import { AtmosphericSky } from './AtmosphericSky';

interface SceneCanvasProps {
  items: PortfolioItem[];
  phase: 'intro' | 'hero' | 'gallery';
  selectedId: string | null;
  overlayOpen: boolean;
  reducedMotion: boolean;
  tabVisible: boolean;
  onIntroComplete: () => void;
  onSelectItem: (id: string) => void;
  onHoverItem?: (item: PortfolioItem | null) => void;
  onHeadingFrame?: (headingDegFloat: number) => void;
  onActiveIndexChange?: (activeIndex: number, headingDegInt: number) => void;
  onLoadProgress?: (progress: GalleryLoadProgress) => void;
  onSceneReady?: () => void;
}

const StudioEnvironment: React.FC<{ intensity: number }> = ({ intensity }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  return null;
};

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  items,
  phase,
  selectedId,
  overlayOpen,
  reducedMotion,
  tabVisible,
  onIntroComplete,
  onSelectItem,
  onHoverItem,
  onHeadingFrame,
  onActiveIndexChange,
  onLoadProgress,
  onSceneReady,
}) => {
  const [contextLost, setContextLost] = useState(false);
  const webglAvailable = useMemo(() => supportsWebGL(), []);
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  // Intro approach tetap langit biru stratosfer; hero & galeri memakai Obsidian Crimson Eclipse
  const villain = phase !== 'intro';

  useEffect(() => {
    if (!webglAvailable || contextLost) {
      onSceneReady?.();
    }
  }, [webglAvailable, contextLost, onSceneReady]);

  if (!webglAvailable || contextLost) {
    return (
      <div className="absolute inset-0 bg-[#080507] flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="max-w-md border border-[#2B1218] rounded-[4px] bg-[#120A0D] p-6">
          <h2 className="font-display text-2xl tracking-wide text-[#F6EEF0] uppercase">
            Viewport 3D Stratosfer Tidak Tersedia
          </h2>
          <p className="text-sm text-[#A8969B] mt-2">
            Konteks WebGL perangkat keras sedang dijeda atau tidak didukung. Pilih frame di bawah untuk melihat fotografi.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            {items.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="min-h-[44px] text-left border border-[#2B1218] rounded-[4px] hover:border-[#EF233C]/70 overflow-hidden transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF233C]"
              >
                <img
                  src={item.imageUrl}
                  alt={`${item.aircraft} — ${item.operator} (${item.registration}), ${item.location}, ${item.year}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover"
                />
                <div className="p-2 text-xs text-[#F6EEF0] truncate">{item.aircraft}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 w-full h-full touch-none transition-opacity duration-300 ${
        phase === 'hero' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <Canvas
        style={{ touchAction: 'none' }}
        frameloop={tabVisible && phase !== 'hero' ? 'always' : 'never'}
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{ position: [1.2, 2.2, 5.8], fov: 46, near: 0.1, far: 180 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.04,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          onSceneReady?.();
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          canvas.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <color attach="background" args={[villain ? '#0A0306' : '#091424']} />
        <fogExp2 attach="fog" args={[villain ? '#1D0408' : '#15243A', villain ? 0.021 : 0.015]} />

        <StudioEnvironment intensity={villain ? 0.3 : 1} />
        <AtmosphericSky isSoftwareGl={isSoftwareGl} reducedMotion={reducedMotion} villain={villain} />

        {villain ? (
          <>
            {/* Rig pencahayaan villain: rim-light merah dari belakang, pantulan marun dari lantai */}
            <hemisphereLight args={['#8A1426', '#1A050A', 0.62]} />
            <directionalLight
              position={[14, 18, 10]}
              intensity={1.35}
              color="#FFD9D2"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0005}
            />
            <directionalLight position={[-12, 10, -14]} intensity={1.5} color="#EF233C" />
            <pointLight position={[0, 4.2, 2.5]} intensity={0.9} color="#FF5A6E" distance={22} />
            <pointLight position={[0, 0.4, -3]} intensity={1.6} color="#D90429" distance={16} />
          </>
        ) : (
          <>
            {/* Rig Pencahayaan 3 Titik Stratosfer Seimbang (Intro) */}
            <hemisphereLight args={['#93C5FD', '#0C1522', 0.72]} />
            <directionalLight
              position={[14, 18, 10]}
              intensity={2.1}
              color="#FFF7ED"
              castShadow={!isSoftwareGl}
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0005}
            />
            <directionalLight position={[-12, 10, -14]} intensity={0.85} color="#7DD3FC" />
            <pointLight position={[0, 4.2, 2.5]} intensity={1.1} color="#E0F2FE" distance={22} />
          </>
        )}

        <IntroFlybyScene
          active={phase === 'intro'}
          reducedMotion={reducedMotion}
          onComplete={onIntroComplete}
        />

        <GalleryCylinder
          items={items}
          visible={phase === 'gallery'}
          selectedId={selectedId}
          overlayOpen={overlayOpen}
          isSoftwareGl={isSoftwareGl}
          reducedMotion={reducedMotion}
          onSelectItem={onSelectItem}
          onHoverItem={onHoverItem}
          onHeadingFrame={onHeadingFrame}
          onActiveIndexChange={onActiveIndexChange}
          onLoadProgress={onLoadProgress}
        />
      </Canvas>
    </div>
  );
};

