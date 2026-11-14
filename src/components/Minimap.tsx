import React, { useEffect, useRef, useCallback } from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';
import { OpenWorldHudState } from '../types/game';
import { OPEN_WORLD_ROADS, ZONE_COLORS } from '../game/openWorldData';

interface MinimapProps {
  posX: number;
  posZ: number;
  headingDeg: number;
  openWorld: OpenWorldHudState;
  onOpenWorldMap: () => void;
  drawRef?: React.MutableRefObject<((x: number, z: number, headingDeg: number) => void) | null>;
  hideShortcutHint?: boolean;
  compact?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({
  posX,
  posZ,
  headingDeg,
  openWorld,
  onOpenWorldMap,
  drawRef,
  hideShortcutHint = false,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const openWorldRef = useRef(openWorld);
  openWorldRef.current = openWorld;

  const renderRadar = useCallback((rx: number, rz: number, rHeadingDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ow = openWorldRef.current;
    const size = canvas.width;
    const half = size * 0.5;
    const radarRange = 235;
    const scale = (half - 6) / radarRange;

    const h = (rHeadingDeg * Math.PI) / 180;
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);

    const projectX = (wx: number, wz: number) => {
      const dx = wx - rx;
      const dz = wz - rz;
      return half + (dx * -cosH + dz * sinH) * scale;
    };
    const projectY = (wx: number, wz: number) => {
      const dx = wx - rx;
      const dz = wz - rz;
      return half - (dx * sinH + dz * cosH) * scale;
    };

    ctx.clearRect(0, 0, size, size);

    // Subtle circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(8, 12, 20, 0.85)';
    ctx.fillRect(0, 0, size, size);

    // Concentric radar rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.45, 0, Math.PI * 2);
    ctx.arc(half, half, half * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // Roads
    ctx.lineCap = 'round';
    for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
      const r = OPEN_WORLD_ROADS[i];
      const x1 = projectX(r.x1, r.z1);
      const y1 = projectY(r.x1, r.z1);
      const x2 = projectX(r.x2, r.z2);
      const y2 = projectY(r.x2, r.z2);

      if (
        (x1 < -16 && x2 < -16) ||
        (x1 > size + 16 && x2 > size + 16) ||
        (y1 < -16 && y2 < -16) ||
        (y1 > size + 16 && y2 > size + 16)
      ) {
        continue;
      }

      ctx.strokeStyle =
        r.kind === 'overpass'
          ? 'rgba(56, 189, 248, 0.85)'
          : r.kind === 'tunnel'
          ? 'rgba(168, 85, 247, 0.85)'
          : r.kind === 'pier'
          ? 'rgba(217, 119, 6, 0.85)'
          : r.kind === 'runway'
          ? 'rgba(148, 163, 184, 0.7)'
          : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = Math.max(2, r.width * scale * 0.85);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Repair & Nitro Service Bays
    if (ow.repairStations) {
      for (let i = 0; i < ow.repairStations.length; i++) {
        const rs = ow.repairStations[i];
        const sx = projectX(rs.x, rs.z);
        const sy = projectY(rs.x, rs.z);
        if (sx < 4 || sx > size - 4 || sy < 4 || sy > size - 4) continue;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 3, sy);
        ctx.lineTo(sx + 3, sy);
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx, sy + 3);
        ctx.stroke();
      }
    }

    // Activity Beacons
    for (let i = 0; i < ow.activities.length; i++) {
      const act = ow.activities[i];
      if ((act.type === 'token' || act.type === 'crate') && act.completed) continue;
      const sx = projectX(act.x, act.z);
      const sy = projectY(act.x, act.z);
      if (sx < 4 || sx > size - 4 || sy < 4 || sy > size - 4) continue;

      if (act.type === 'street_race') ctx.fillStyle = '#22d3ee';
      else if (act.type === 'drift_zone') ctx.fillStyle = '#f59e0b';
      else if (act.type === 'ramp') ctx.fillStyle = '#f97316';
      else if (act.type === 'speedtrap') ctx.fillStyle = '#f43f5e';
      else ctx.fillStyle = '#facc15';

      ctx.beginPath();
      ctx.arc(sx, sy, act.type === 'street_race' ? 3.5 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dynamic Blips
    for (let i = 0; i < ow.blips.length; i++) {
      const b = ow.blips[i];
      const sx = projectX(b.x, b.z);
      const sy = projectY(b.x, b.z);
      if (sx < 3 || sx > size - 3 || sy < 3 || sy > size - 3) continue;

      if (b.kind === 'checkpoint') {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'rival') {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
      } else if (b.kind === 'cop') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      } else {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
    }

    // GPS Route Line & Edge Marker
    if (ow.waypoint) {
      const wx = projectX(ow.waypoint.x, ow.waypoint.z);
      const wy = projectY(ow.waypoint.x, ow.waypoint.z);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      const vx = wx - half;
      const vy = wy - half;
      const distPx = Math.hypot(vx, vy);
      const maxR = half - 8;
      const markerX = distPx > maxR ? half + (vx / distPx) * maxR : wx;
      const markerY = distPx > maxR ? half + (vy / distPx) * maxR : wy;

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Chevron
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(half, half - 6.5);
    ctx.lineTo(half + 4.5, half + 4.5);
    ctx.lineTo(half, half + 2);
    ctx.lineTo(half - 4.5, half + 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  // Expose imperative 60fps draw handle
  useEffect(() => {
    if (drawRef) {
      drawRef.current = renderRadar;
      return () => {
        drawRef.current = null;
      };
    }
  }, [drawRef, renderRadar]);

  // Initial / fallback redraw
  useEffect(() => {
    renderRadar(posX, posZ, headingDeg);
  }, [posX, posZ, headingDeg, openWorld, renderRadar]);

  const zoneAccent = ZONE_COLORS[openWorld.currentZone];

  return (
    <button
      type="button"
      onClick={onOpenWorldMap}
      className="group relative rounded-full p-0.5 backdrop-blur-md bg-black/45 border border-white/20 hover:border-cyan-400/80 shadow-xl transition-transform active:scale-95 cursor-pointer pointer-events-auto"
      style={{ boxShadow: `0 0 18px ${zoneAccent}28` }}
      title={hideShortcutHint ? 'Open World Map' : 'Open World Map (M)'}
      aria-label="Open World Map"
    >
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        className={`block rounded-full ${
          compact ? 'w-[74px] h-[74px]' : 'w-[86px] h-[86px] sm:w-[110px] sm:h-[110px]'
        }`}
      />

      {/* Bottom GPS or Map Tag */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md bg-black/75 border border-white/15 text-[9px] font-mono font-bold text-white whitespace-nowrap shadow">
        {openWorld.waypoint && openWorld.waypointDist !== null ? (
          <>
            <Navigation className="w-2.5 h-2.5 text-cyan-400" />
            <span className="tabular-nums text-cyan-300">{openWorld.waypointDist}m</span>
          </>
        ) : (
          <>
            <MapIcon className="w-2.5 h-2.5 text-cyan-400" />
            <span>{hideShortcutHint ? 'MAP' : 'MAP · M'}</span>
          </>
        )}
      </div>
    </button>
  );
};
