import React, { useEffect, useRef } from 'react';
import { Map as MapIcon, Navigation } from 'lucide-react';
import { OpenWorldHudState } from '../types/game';
import { OPEN_WORLD_ROADS, ZONE_COLORS } from '../game/openWorldData';

interface MinimapProps {
  posX: number;
  posZ: number;
  headingDeg: number;
  openWorld: OpenWorldHudState;
  onOpenWorldMap: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  posX,
  posZ,
  headingDeg,
  openWorld,
  onOpenWorldMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size * 0.5;
    const radarRange = 240; // meters radius shown on radar
    const scale = (half - 6) / radarRange;

    const h = (headingDeg * Math.PI) / 180;
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);

    const projectX = (wx: number, wz: number) => {
      const dx = wx - posX;
      const dz = wz - posZ;
      return half + (dx * -cosH + dz * sinH) * scale;
    };
    const projectY = (wx: number, wz: number) => {
      const dx = wx - posX;
      const dz = wz - posZ;
      return half - (dx * sinH + dz * cosH) * scale;
    };

    // Background & Radar Grid
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(half, half, half * 0.48, 0, Math.PI * 2);
    ctx.arc(half, half, half * 0.88, 0, Math.PI * 2);
    ctx.stroke();

    // Roads
    ctx.lineCap = 'round';
    for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
      const r = OPEN_WORLD_ROADS[i];
      const x1 = projectX(r.x1, r.z1);
      const y1 = projectY(r.x1, r.z1);
      const x2 = projectX(r.x2, r.z2);
      const y2 = projectY(r.x2, r.z2);

      // Quick bounds reject
      if (
        (x1 < -20 && x2 < -20) ||
        (x1 > size + 20 && x2 > size + 20) ||
        (y1 < -20 && y2 < -20) ||
        (y1 > size + 20 && y2 > size + 20)
      ) {
        continue;
      }

      ctx.strokeStyle =
        r.kind === 'overpass'
          ? '#38bdf8'
          : r.kind === 'tunnel'
          ? '#a855f7'
          : r.kind === 'pier'
          ? '#d97706'
          : r.kind === 'runway'
          ? '#64748b'
          : '#334155';
      ctx.lineWidth = Math.max(2, r.width * scale * 0.85);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Activity Beacons
    for (let i = 0; i < openWorld.activities.length; i++) {
      const act = openWorld.activities[i];
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
      ctx.arc(sx, sy, act.type === 'street_race' ? 3.8 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Traffic, Police, Rivals & Race Checkpoints
    for (let i = 0; i < openWorld.blips.length; i++) {
      const b = openWorld.blips[i];
      const sx = projectX(b.x, b.z);
      const sy = projectY(b.x, b.z);
      if (sx < 3 || sx > size - 3 || sy < 3 || sy > size - 3) continue;

      if (b.kind === 'checkpoint') {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'rival') {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
      } else if (b.kind === 'cop') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
    }

    // Active GPS Waypoint Line & Edge Indicator
    if (openWorld.waypoint) {
      const wx = projectX(openWorld.waypoint.x, openWorld.waypoint.z);
      const wy = projectY(openWorld.waypoint.x, openWorld.waypoint.z);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clamp marker onto radar edge if outside radius
      const vx = wx - half;
      const vy = wy - half;
      const distPx = Math.hypot(vx, vy);
      const maxR = half - 8;
      const markerX = distPx > maxR ? half + (vx / distPx) * maxR : wx;
      const markerY = distPx > maxR ? half + (vy / distPx) * maxR : wy;

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered Player Chevron (Always pointing UP)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(half, half - 7);
    ctx.lineTo(half + 5, half + 5);
    ctx.lineTo(half, half + 2.5);
    ctx.lineTo(half - 5, half + 5);
    ctx.closePath();
    ctx.fill();
  }, [posX, posZ, headingDeg, openWorld]);

  const zoneAccent = ZONE_COLORS[openWorld.currentZone];

  return (
    <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
      <div
        className="relative rounded-2xl overflow-hidden border-2 bg-slate-950/90 shadow-xl"
        style={{ borderColor: zoneAccent }}
      >
        <canvas
          ref={canvasRef}
          width={128}
          height={128}
          className="w-[104px] h-[104px] sm:w-[128px] sm:h-[128px] block"
        />

        {/* North / GPS Badge */}
        {openWorld.waypoint && openWorld.waypointDist !== null && (
          <div className="absolute top-1 left-1 right-1 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-mono font-bold text-cyan-300">
            <Navigation className="w-2.5 h-2.5" />
            <span className="tabular-nums">{openWorld.waypointDist}m</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenWorldMap}
        className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-950/90 border border-slate-700 hover:border-cyan-400 text-[11px] font-mono font-bold text-slate-200 hover:text-cyan-300 transition-colors cursor-pointer shadow-md"
        title="Open Full World Map (Key M)"
      >
        <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
        <span>WORLD MAP [M]</span>
      </button>
    </div>
  );
};
