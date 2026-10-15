import React from 'react';
import {
  Zap,
  Flame,
  Pause,
  Trophy,
  Clock,
  Coins,
  Compass,
  Building2,
  Palmtree,
  Mountain,
  Shield,
  Magnet,
  Camera,
  Sun,
  Lightbulb,
  DoorClosed,
  DoorOpen,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { FloatingText, TransmissionType, CameraView, WeatherType } from '../types/game';

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
  shield?: boolean;
  magnetTimeLeft?: number;
  currentGear?: number;
  transmission?: TransmissionType;
  clutch?: boolean;
  cameraView?: CameraView;
  weather?: WeatherType;
  headlights?: boolean;
  indicators?: string;
  doorsOpen?: boolean;
  trunkOpen?: boolean;
  heatLevel?: number;
  floatingTexts: FloatingText[];
  onPause: () => void;
  onToggleCamera?: () => void;
  onToggleHeadlights?: () => void;
  onToggleIndicator?: (dir: 'left' | 'right' | 'hazard') => void;
  onToggleDoors?: () => void;
  onToggleTrunk?: () => void;
  onShiftUp?: () => void;
  onShiftDown?: () => void;
  // Touch controls input binders
  onTouchSteer?: (dir: 'left' | 'right' | null) => void;
  onTouchThrottle?: (forward: boolean) => void;
  onTouchBrake?: (brake: boolean) => void;
  onTouchNitro?: (nitro: boolean) => void;
  onTouchDrift?: (drift: boolean) => void;
  onTouchClutch?: (clutch: boolean) => void;
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
  shield = false,
  magnetTimeLeft = 0,
  currentGear = 1,
  transmission = 'automatic',
  clutch = false,
  cameraView = 'thirdPerson',
  headlights = true,
  indicators = 'off',
  doorsOpen = false,
  trunkOpen = false,
  heatLevel,
  floatingTexts,
  onPause,
  onToggleCamera,
  onToggleHeadlights,
  onToggleIndicator,
  onToggleDoors,
  onToggleTrunk,
  onShiftUp,
  onShiftDown,
  onTouchSteer,
  onTouchThrottle,
  onTouchBrake,
  onTouchNitro,
  onTouchDrift,
  onTouchClutch,
}) => {
  const isOW = gameMode === 'openWorld';
  const isPolice = gameMode === 'policeChase';

  // Display gear
  const gearDisplay = speed === 0 && currentGear === 1 ? '1' : `${currentGear}`;

  // Speedometer fill percentage (0 to 260 km/h)
  const speedPct = Math.min(100, (speed / 260) * 100);

  const renderZoneIcon = () => {
    if (!zoneName) return null;
    if (zoneName.toLowerCase().includes('beach')) return <Palmtree className="w-4 h-4 text-emerald-400" />;
    if (zoneName.toLowerCase().includes('canyon') || zoneName.toLowerCase().includes('mountain')) return <Mountain className="w-4 h-4 text-amber-500" />;
    return <Building2 className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none z-10 font-sans">
      {/* 1. TOP PERIMETER STATUS CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Score, Distance & Mode Badge */}
        <div className="flex flex-col gap-1.5 bg-slate-950/85 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xl md:text-2xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-amber-300 tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>

            {isPolice ? (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950/90 border border-rose-600 rounded text-rose-300 uppercase tracking-wider flex items-center gap-1 font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                POLICE PURSUIT
              </span>
            ) : isOW ? (
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
            <span className="tabular-nums font-bold">{(distance / 1000).toFixed(2)} KM</span>
            <span className="inline-flex items-center gap-1 text-yellow-400">
              <Coins className="w-3.5 h-3.5 fill-current" />
              <span className="tabular-nums font-bold">{coins}</span>
            </span>

            {isOW && trophiesFound !== undefined && (
              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  TROPHIES: {trophiesFound}/{totalTrophies}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Top-Center: Active Status Banners (Police Heat, Zone or Checkpoint Countdown) */}
        <div className="flex flex-col items-center gap-1.5">
          {isPolice && heatLevel !== undefined ? (
            <div className="flex flex-col items-center px-4 py-2 bg-rose-950/90 border border-rose-500 rounded-2xl shadow-xl animate-fade-in font-['Chakra_Petch',sans-serif]">
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold tracking-widest uppercase">
                <span>WANTED HEAT LEVEL</span>
                <span className="text-amber-400">{'★'.repeat(heatLevel)}{'☆'.repeat(5 - heatLevel)}</span>
              </div>
              <span className="text-lg md:text-xl font-black text-white tabular-nums tracking-wider">
                SURVIVED: {distance > 0 ? Math.floor(distance / 20) : 0}s
              </span>
            </div>
          ) : isOW && zoneName ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl font-['Chakra_Petch',sans-serif]">
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

          {/* Active Power-up Badges (Magnet, Shield) */}
          <div className="flex items-center gap-2">
            {shield && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-950/90 border border-sky-400 rounded-full text-sky-300 text-xs font-mono font-bold animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                <Shield className="w-3.5 h-3.5" />
                SHIELD ACTIVE
              </div>
            )}
            {magnetTimeLeft > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/90 border border-amber-400 rounded-full text-amber-300 text-xs font-mono font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                <Magnet className="w-3.5 h-3.5" />
                MAGNET: {magnetTimeLeft}s
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Quick Vehicle Actions & Pause */}
        <div className="flex items-center gap-2">
          {/* Quick interactive control buttons */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/85 border border-slate-800 rounded-xl p-1 pointer-events-auto">
            {/* Camera View Switcher */}
            <button
              onClick={onToggleCamera}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              title={`Camera Angle: ${cameraView} (Key C)`}
            >
              <Camera className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Headlights Toggle */}
            <button
              onClick={onToggleHeadlights}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                headlights ? 'text-amber-300 bg-amber-500/15' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Headlights (Key L)"
            >
              <Lightbulb className="w-4 h-4" />
            </button>

            {/* Left Indicator */}
            <button
              onClick={() => onToggleIndicator?.('left')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                indicators === 'left' ? 'text-amber-400 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-white'
              }`}
              title="Left Signal ([ or Q)"
            >
              ◀
            </button>

            {/* Hazard Lights */}
            <button
              onClick={() => onToggleIndicator?.('hazard')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                indicators === 'hazard' ? 'text-amber-400 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-white'
              }`}
              title="Hazard Lights (Key H)"
            >
              ▲
            </button>

            {/* Right Indicator */}
            <button
              onClick={() => onToggleIndicator?.('right')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                indicators === 'right' ? 'text-amber-400 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-white'
              }`}
              title="Right Signal (] or E)"
            >
              ▶
            </button>

            {/* Doors Toggle */}
            <button
              onClick={onToggleDoors}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                doorsOpen ? 'text-amber-300 bg-amber-500/15' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle Doors (Key O)"
            >
              {doorsOpen ? <DoorOpen className="w-4 h-4 text-amber-400" /> : <DoorClosed className="w-4 h-4" />}
            </button>
          </div>

          {isDrifting && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500 rounded-xl text-amber-300 font-bold font-['Chakra_Petch',sans-serif] tracking-wider text-sm shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
              DRIFT
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

      {/* 2. FLOATING TOASTS */}
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
                : ft.type === 'hazard'
                ? 'bg-rose-600 text-white border border-rose-400 animate-shake'
                : ft.type === 'powerup'
                ? 'bg-sky-500 text-slate-950 border border-sky-300'
                : 'bg-indigo-600 text-white border border-indigo-400'
            }`}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* 3. BOTTOM GAUGES & TOUCH PEDALS */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Nitro Tank & Manual Transmission Status */}
        <div className="flex flex-col gap-2">
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

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Shift or N</span>
              {transmission === 'manual' && (
                <span className={`px-1.5 py-0.5 rounded font-bold ${clutch ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  CLUTCH: {clutch ? 'IN' : 'OUT'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Touch Pedals */}
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

        {/* Bottom-Right: Speedometer & Manual Gear Shifter Cluster */}
        <div className="flex items-center gap-3 bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-xl">
          {/* Transmission & Gear Box */}
          <div className="flex flex-col items-center justify-center w-12 h-16 bg-slate-900 border border-slate-800 rounded-xl font-['Chakra_Petch',sans-serif] relative overflow-hidden">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter">
              {transmission === 'manual' ? 'MANUAL' : 'AUTO'}
            </span>
            <span className="text-2xl font-black text-amber-400">{gearDisplay}</span>

            {transmission === 'manual' && (
              <div className="flex items-center gap-1 mt-0.5 pointer-events-auto">
                <button
                  onClick={onShiftDown}
                  className="text-[9px] font-mono px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                  title="Downshift (Q)"
                >
                  ▼
                </button>
                <button
                  onClick={onShiftUp}
                  className="text-[9px] font-mono px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                  title="Upshift (E)"
                >
                  ▲
                </button>
              </div>
            )}
          </div>

          {/* Speed Number & Tachometer Bar */}
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

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>0</span>
              <span>140</span>
              <span>260+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
