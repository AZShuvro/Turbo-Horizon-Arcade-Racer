import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Navigation,
  Zap,
  Flag,
  Flame,
  Coins,
  MapPin,
  Trash2,
} from 'lucide-react';
import { OpenWorldHudState, WorldZone, WorldRecords } from '../types/game';
import {
  OPEN_WORLD_ROADS,
  WORLD_HALF_EXTENT,
  ZONE_COLORS,
  ZONE_LABELS,
  distanceToNearestRoad,
} from '../game/openWorldData';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  posX: number;
  posZ: number;
  headingDeg: number;
  openWorld: OpenWorldHudState;
  worldRecords?: WorldRecords;
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onClearWaypoint: () => void;
  onFastTravel: (hubId: string) => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  posX,
  posZ,
  headingDeg,
  openWorld,
  worldRecords,
  onSetWaypoint,
  onClearWaypoint,
  onFastTravel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filterKind, setFilterKind] = useState<'all' | 'street_race' | 'drift_zone' | 'ramp'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 28;
    const mapSpan = WORLD_HALF_EXTENT * 2;
    const scale = (Math.min(w, h) - pad * 2) / mapSpan;
    const cx = w * 0.5;
    const cy = h * 0.5;

    const toScreenX = (wx: number) => cx + wx * scale;
    const toScreenY = (wz: number) => cy + wz * scale;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // 4 Biome Zone Quadrants
    const borderX = toScreenX(25);
    const borderZ = toScreenY(145);
    const splitSouthX = toScreenX(-55);

    // NW: Downtown Cyber Metro
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fillRect(0, 0, borderX, borderZ);

    // NE: Canyon & Mountain Switchbacks
    ctx.fillStyle = 'rgba(234, 88, 12, 0.09)';
    ctx.fillRect(borderX, 0, w - borderX, borderZ);

    // SW: Industrial & Stunt Airport
    ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
    ctx.fillRect(0, borderZ, splitSouthX, h - borderZ);

    // SE: Coastal Highway & Pier
    ctx.fillStyle = 'rgba(245, 158, 11, 0.09)';
    ctx.fillRect(splitSouthX, borderZ, w - splitSouthX, h - borderZ);

    // Ocean Overlay (SE Bottom Coast)
    ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
    ctx.fillRect(toScreenX(-140), toScreenY(390), w - toScreenX(-140), h - toScreenY(390));

    // District Titles on Canvas
    ctx.font = 'bold 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(34, 211, 238, 0.72)';
    ctx.fillText('01. DOWNTOWN CYBER METRO', 16, 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(251, 146, 60, 0.78)';
    ctx.fillText('02. CANYON SWITCHBACKS', w - 16, 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(192, 132, 252, 0.78)';
    ctx.fillText('04. INDUSTRIAL & STUNT AIRPORT', 16, h - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(251, 191, 36, 0.78)';
    ctx.fillText('03. COASTAL HIGHWAY & PIER', w - 16, h - 14);

    // Road Network
    ctx.lineCap = 'round';
    for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
      const r = OPEN_WORLD_ROADS[i];
      const x1 = toScreenX(r.x1);
      const y1 = toScreenY(r.z1);
      const x2 = toScreenX(r.x2);
      const y2 = toScreenY(r.z2);

      ctx.strokeStyle =
        r.kind === 'overpass'
          ? '#38bdf8'
          : r.kind === 'tunnel'
          ? '#a855f7'
          : r.kind === 'pier'
          ? '#d97706'
          : r.kind === 'runway'
          ? '#94a3b8'
          : r.kind === 'switchback'
          ? '#fb923c'
          : r.kind === 'shortcut'
          ? '#475569'
          : '#64748b';
      ctx.lineWidth = Math.max(2.2, r.width * scale * 0.9);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Repair & Nitro Service Bays
    if (openWorld.repairStations) {
      for (let i = 0; i < openWorld.repairStations.length; i++) {
        const rs = openWorld.repairStations[i];
        const sx = toScreenX(rs.x);
        const sy = toScreenY(rs.z);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 3.5, sy);
        ctx.lineTo(sx + 3.5, sy);
        ctx.moveTo(sx, sy - 3.5);
        ctx.lineTo(sx, sy + 3.5);
        ctx.stroke();
      }
    }

    // Activity Markers
    for (let i = 0; i < openWorld.activities.length; i++) {
      const act = openWorld.activities[i];
      if ((act.type === 'token' || act.type === 'crate') && act.completed) continue;
      const sx = toScreenX(act.x);
      const sy = toScreenY(act.z);

      if (act.type === 'street_race') {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (act.type === 'drift_zone') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 7.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (act.type === 'ramp') {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(sx - 4, sy - 4, 8, 8);
      } else if (act.type === 'speedtrap') {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fast Travel Hubs
    for (let i = 0; i < openWorld.hubs.length; i++) {
      const hub = openWorld.hubs[i];
      const sx = toScreenX(hub.x);
      const sy = toScreenY(hub.z);
      ctx.fillStyle = hub.discovered ? hub.color : '#475569';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx + 7, sy);
      ctx.lineTo(sx, sy + 8);
      ctx.lineTo(sx - 7, sy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Live Traffic & Police Blips
    for (let i = 0; i < openWorld.blips.length; i++) {
      const b = openWorld.blips[i];
      const sx = toScreenX(b.x);
      const sy = toScreenY(b.z);
      ctx.fillStyle =
        b.kind === 'cop'
          ? '#38bdf8'
          : b.kind === 'rival'
          ? '#f43f5e'
          : b.kind === 'checkpoint'
          ? '#4ade80'
          : 'rgba(203, 213, 225, 0.7)';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }

    // Active GPS Waypoint Line & Pin
    const px = toScreenX(posX);
    const py = toScreenY(posZ);
    if (openWorld.waypoint) {
      const wx = toScreenX(openWorld.waypoint.x);
      const wy = toScreenY(openWorld.waypoint.z);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(wx, wy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(wx, wy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Player Car Arrow
    const hRad = (headingDeg * Math.PI) / 180;
    const canvasAng = Math.atan2(Math.cos(hRad), Math.sin(hRad));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(canvasAng);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }, [isOpen, posX, posZ, headingDeg, openWorld]);

  if (!isOpen) return null;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const pad = 28;
    const mapSpan = WORLD_HALF_EXTENT * 2;
    const scale = (Math.min(canvas.width, canvas.height) - pad * 2) / mapSpan;
    const worldX = (clickX - canvas.width * 0.5) / scale;
    const worldZ = (clickY - canvas.height * 0.5) / scale;

    // Snap nicely to nearest road if within 55m
    const nearest = distanceToNearestRoad(worldX, worldZ);
    if (nearest.dist < 55) {
      onSetWaypoint(Math.round(nearest.cx), Math.round(nearest.cz), 'Road Waypoint');
    } else {
      onSetWaypoint(Math.round(worldX), Math.round(worldZ), 'Map Pin');
    }
  };

  const filteredActivities = openWorld.activities.filter((a) => {
    if (filterKind === 'all') {
      return a.type === 'street_race' || a.type === 'drift_zone' || a.type === 'ramp';
    }
    return a.type === filterKind;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="w-full max-w-6xl h-full max-h-[860px] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 border-b border-slate-800">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white uppercase">
              Open-World Navigation Map
            </h2>
            <p className="text-xs font-mono text-slate-400">
              {ZONE_LABELS[openWorld.currentZone]} · Tokens {openWorld.tokensCollected}/{openWorld.totalTokens}
              {worldRecords && worldRecords.bestJumpMeters > 0
                ? ` · Best Jump ${worldRecords.bestJumpMeters}m (${worldRecords.bestAirtimeSec.toFixed(1)}s)`
                : ''}
              {' · Click anywhere on roads to set GPS Waypoint'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {openWorld.waypoint && (
              <button
                type="button"
                onClick={onClearWaypoint}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500 text-xs font-mono text-slate-200 hover:text-rose-300 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear GPS</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Close [M]</span>
            </button>
          </div>
        </div>

        {/* Map Canvas + Right Tactical Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Interactive Map Canvas */}
          <div className="flex-1 min-h-[260px] bg-[#070b14] flex items-center justify-center p-2 sm:p-4 relative">
            <canvas
              ref={canvasRef}
              width={720}
              height={720}
              onClick={handleCanvasClick}
              className="w-full h-full max-w-[660px] max-h-[660px] aspect-square rounded-xl border border-slate-800 cursor-crosshair"
            />
          </div>

          {/* Hubs & Activities Sidebar */}
          <div className="w-full lg:w-88 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col min-h-0 overflow-y-auto p-4 gap-5">
            {/* Fast Travel District Hubs */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Fast Travel Hubs
              </h3>
              <div className="flex flex-col gap-1.5">
                {openWorld.hubs.map((hub) => (
                  <div
                    key={hub.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {hub.name}
                      </span>
                      <span
                        className="text-[11px] font-mono"
                        style={{ color: ZONE_COLORS[hub.zone as WorldZone] }}
                      >
                        {hub.discovered ? 'Discovered' : 'Undiscovered'}
                      </span>
                    </div>
                    {hub.discovered ? (
                      <button
                        type="button"
                        onClick={() => {
                          onFastTravel(hub.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 min-h-[36px] rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] font-mono cursor-pointer shrink-0"
                      >
                        Fast Travel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSetWaypoint(hub.x, hub.z, hub.name)}
                        className="px-3 py-1.5 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] font-mono cursor-pointer shrink-0"
                      >
                        Set GPS
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Events & Activities Filter + List */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  World Events
                </h3>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg text-[10px] font-mono">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'street_race', label: 'Races' },
                      { id: 'drift_zone', label: 'Drift' },
                      { id: 'ramp', label: 'Ramps' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterKind(tab.id)}
                      className={`px-2 py-1 rounded-md cursor-pointer ${
                        filterKind === tab.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {filteredActivities.map((act) => {
                  const bestRace =
                    act.type === 'street_race' ? worldRecords?.raceBestTimes[act.id] : undefined;
                  const bestDrift =
                    act.type === 'drift_zone' ? worldRecords?.driftBestScores[act.id] : undefined;
                  const bestRamp =
                    act.type === 'ramp' ? worldRecords?.rampBestDistances[act.id] : undefined;
                  const bestTag =
                    bestRace !== undefined
                      ? `BEST ${bestRace.toFixed(2)}s`
                      : bestDrift !== undefined
                      ? `BEST ${bestDrift.toLocaleString()} PTS`
                      : bestRamp !== undefined
                      ? `BEST ${bestRamp}m`
                      : null;

                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => onSetWaypoint(act.x, act.z, act.name)}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-left cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {act.type === 'street_race' ? (
                          <Flag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : act.type === 'drift_zone' ? (
                          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : act.type === 'ramp' ? (
                          <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        ) : (
                          <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {act.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                            {ZONE_LABELS[act.zone]}
                            {act.completed ? ' · Completed' : ''}
                            {bestTag ? ` · ${bestTag}` : ''}
                          </span>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 shrink-0">
                        <Navigation className="w-3 h-3" />
                        GPS
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Legend */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Street Race</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-amber-400" />
                <span>Drift Zone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-orange-500" />
                <span>Jump Ramp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Repair &amp; Nitro Bay</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span>Hidden Token</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>Traffic / Police</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
