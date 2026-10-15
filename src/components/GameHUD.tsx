import React from 'react';
import {
  Gauge,
  Zap,
  Flame,
  Pause,
  Trophy,
  Clock,
  Coins,
  Compass,
  MapPin,
  Building2,
  Palmtree,
  Mountain,
} from 'lucide-react';
import { FloatingText } from '../types/game';

interface GameHUDProps {
  score: number;
  speed: number; // km/h
  nitro: number; // 0 - 100
  distance: number; // meters
  coins: number;
  timeLeft: number;
  isDrifting: boolean;
  gameMode: string;
  trackName?: string;
  zoneName?: string;
  trophiesFound?: number;
  totalTrophies?: number;
  posX?: number;
  posZ?: number;
  heading?: number;
  floatingTexts: FloatingText[];
  onPause: () => void;
  // Touch controls input binders
  onTouchSteer?: (dir: 'left' | 'right' | null) => void;
  onTouchThrottle?: (forward: boolean) => void;
  onTouchBrake?: (brake: boolean) => void;
  onTouchNitro?: (nitro: boolean) => void;
  onTouchDrift?: (drift: boolean) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  speed,
  nitro,
  distance,
  coins,
  timeLeft,
  isDrifting,
  gameMode,
  trackName,
  zoneName,
  trophiesFound,
  totalTrophies = 10,
  posX = 0,
  posZ = 0,
  heading = 0,
  floatingTexts,
  onPause,
  onTouchSteer,
  onTouchThrottle,
  onTouchBrake,
  onTouchNitro,
  onTouchDrift,
}) => {
  const isOW = gameMode === 'openWorld';

  // Approximate gear based on speed
  const gear = speed < 5 ? 'N' : speed < 45 ? '1' : speed < 85 ? '2' : speed < 135 ? '3' : speed < 185 ? '4' : speed < 230 ? '5' : '6';

  // Speedometer fill percentage (0 to 260 km/h)
  const speedPct = Math.min(100, (speed / 260) * 100);

  // Helper icon for zone
  const renderZoneIcon = () => {
    if (!zoneName) return null;
    if (zoneName.toLowerCase().includes('beach')) return <Palmtree className="w-4 h-4 text-emerald-400" />;
    if (zoneName.toLowerCase().includes('canyon') || zoneName.toLowerCase().includes('mountain')) return <Mountain className="w-4 h-4 text-amber-500" />;
    return <Building2 className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none z-10">
      {/* 1. TOP PERIMETER STATUS CLUSTER (<85% playfield unobstructed) */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Score, Distance & Track/Zone Name */}
        <div className="flex flex-col gap-1.5 bg-slate-950/85 border border-slate-800 rounded-xl px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xl md:text-2xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-amber-300 tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>

            {isOW ? (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/80 rounded text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3 h-3" />
                OPEN WORLD
              </span>
            ) : trackName ? (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded text-slate-300 uppercase tracking-wider hidden sm:inline">
                {trackName}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
            <span className="tabular-nums">{(distance / 1000).toFixed(2)} KM</span>
            {isOW && trophiesFound !== undefined ? (
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  TROPHIES: {trophiesFound}/{totalTrophies}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-yellow-400">
                <Coins className="w-3.5 h-3.5" />
                <span className="tabular-nums font-bold">{coins}</span>
              </span>
            )}
            {isOW && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                POS: {posX}, {posZ}
              </span>
            )}
          </div>
        </div>

        {/* Top-Center: Open World Zone Banner OR Checkpoint Countdown Timer */}
        {isOW && zoneName ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl animate-fade-in font-['Chakra_Petch',sans-serif]">
            {renderZoneIcon()}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                CURRENT ZONE
              </span>
              <span className="text-sm md:text-base font-black text-amber-300 tracking-wider">
                {zoneName}
              </span>
            </div>
          </div>
        ) : gameMode !== 'zen' ? (
          <div
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl border font-['Chakra_Petch',sans-serif] shadow-lg transition-all ${
              timeLeft <= 10
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-950/80 border-slate-800 text-amber-300'
            }`}
          >
            <Clock className="w-5 h-5 text-amber-400" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                TIME LEFT
              </span>
              <span className="text-2xl md:text-3xl font-black tabular-nums tracking-wider leading-none">
                {timeLeft}s
              </span>
            </div>
          </div>
        ) : null}

        {/* Top-Right: Mini-Radar Compass & Pause */}
        <div className="flex items-center gap-3">
          {/* Lightweight SVG Mini-Radar in Open World */}
          {isOW && (
            <div
              className="w-12 h-12 rounded-full bg-slate-950/85 border border-slate-800 shadow-lg flex items-center justify-center relative overflow-hidden hidden sm:flex"
              title={`Heading: ${heading}°`}
            >
              <div
                className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${-heading}deg)` }}
              >
                {/* Red North arrow */}
                <div className="w-0.5 h-4 bg-rose-500 absolute top-1 rounded-full shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                {/* South marker */}
                <div className="w-0.5 h-3 bg-slate-500 absolute bottom-1 rounded-full" />
                <span className="text-[8px] font-mono font-black text-rose-400 absolute top-1">N</span>
              </div>
              {/* Center car dot */}
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full z-10" />
            </div>
          )}

          {isDrifting && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500 rounded-xl text-amber-300 font-bold font-['Chakra_Petch',sans-serif] tracking-wider text-sm shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
              DRIFTING
            </div>
          )}

          <button
            onClick={onPause}
            className="pointer-events-auto p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer shadow-lg"
            title="Pause Game (Esc)"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. FLOATING ANNOUNCEMENT TOASTS */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30">
        {floatingTexts.map((ft) => (
          <div
            key={ft.id}
            className={`px-4 py-1.5 rounded-xl font-['Chakra_Petch',sans-serif] font-black text-sm md:text-base tracking-wider shadow-xl ${
              ft.type === 'nearMiss'
                ? 'bg-amber-500 text-slate-950 border border-amber-300'
                : ft.type === 'checkpoint'
                ? 'bg-emerald-500 text-slate-950 border border-emerald-300'
                : ft.type === 'nitro'
                ? 'bg-cyan-500 text-slate-950 border border-cyan-300'
                : 'bg-indigo-600 text-white border border-indigo-400'
            }`}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* 3. BOTTOM PERIMETER GAUGES & TOUCH CONTROLS */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Nitro Overdrive Tank */}
        <div className="flex flex-col gap-1.5 bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-xl w-44 md:w-56">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              NITRO BOOST
            </span>
            <span className="text-cyan-400 font-bold tabular-nums">{nitro}%</span>
          </div>

          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                nitro > 85
                  ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-white shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
              }`}
              style={{ width: `${nitro}%` }}
            />
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-200">Shift</kbd> to ignite
          </span>
        </div>

        {/* Mobile / Touch Pedals & Steer buttons */}
        <div className="flex sm:hidden items-center gap-3 pointer-events-auto">
          <div className="flex gap-2">
            <button
              onPointerDown={() => onTouchSteer?.('left')}
              onPointerUp={() => onTouchSteer?.(null)}
              onPointerLeave={() => onTouchSteer?.(null)}
              className="w-12 h-12 bg-slate-900/90 border border-slate-700 text-white font-bold rounded-xl active:bg-amber-500 active:text-black flex items-center justify-center text-lg select-none"
            >
              ◀
            </button>
            <button
              onPointerDown={() => onTouchSteer?.('right')}
              onPointerUp={() => onTouchSteer?.(null)}
              onPointerLeave={() => onTouchSteer?.(null)}
              className="w-12 h-12 bg-slate-900/90 border border-slate-700 text-white font-bold rounded-xl active:bg-amber-500 active:text-black flex items-center justify-center text-lg select-none"
            >
              ▶
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onPointerDown={() => onTouchBrake?.(true)}
              onPointerUp={() => onTouchBrake?.(false)}
              onPointerLeave={() => onTouchBrake?.(false)}
              className="w-12 h-12 bg-rose-950/80 border border-rose-800 text-rose-300 font-bold rounded-xl active:bg-rose-500 active:text-black flex items-center justify-center text-xs select-none"
            >
              BRAKE
            </button>
            <button
              onPointerDown={() => onTouchThrottle?.(true)}
              onPointerUp={() => onTouchThrottle?.(false)}
              onPointerLeave={() => onTouchThrottle?.(false)}
              className="w-14 h-14 bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold rounded-xl active:bg-emerald-500 active:text-black flex items-center justify-center text-sm select-none"
            >
              GAS
            </button>
          </div>
        </div>

        {/* Bottom-Right: Tachometer Speedometer Cluster */}
        <div className="flex items-center gap-3 bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-xl">
          <div className="flex flex-col items-center justify-center w-10 h-14 bg-slate-900 border border-slate-800 rounded-xl font-['Chakra_Petch',sans-serif]">
            <span className="text-[9px] font-mono text-slate-400">GEAR</span>
            <span className="text-xl font-black text-amber-400">{gear}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white tabular-nums">
                {speed}
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">KM/H</span>
            </div>

            <div className="w-28 md:w-36 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-1">
              <div
                className={`h-full transition-all duration-75 ${
                  speed > 210
                    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    : speed > 140
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${speedPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
