import React from 'react';

interface CrimsonWarpProps {
  stage: 'out' | 'in' | null;
  reducedMotion: boolean;
}

/**
 * Overlay transisi sinematik Crimson Warp: kilatan merah, garis HUD tipis memancar
 * dari tengah layar, dan vignette obsidian. Dipakai saat Hero <-> Galeri 3D.
 */
export const CrimsonWarp: React.FC<CrimsonWarpProps> = ({ stage, reducedMotion }) => {
  if (!stage || reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
    >
      <div className={stage === 'out' ? 'warp-flash warp-flash-out' : 'warp-flash warp-flash-in'} />
      <div className={stage === 'out' ? 'warp-rays warp-rays-out' : 'warp-rays warp-rays-in'} />
      <div className={stage === 'out' ? 'warp-hud warp-hud-out' : 'warp-hud warp-hud-in'}>
        <span className="warp-hud-line warp-hud-line-top" />
        <span className="warp-hud-line warp-hud-line-bottom" />
      </div>
    </div>
  );
};
