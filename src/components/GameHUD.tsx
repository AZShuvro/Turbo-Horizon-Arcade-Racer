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
  Radio,
  Volume2,
  User,
  Flag,
  Maximize2,
  Minimize2,
  Map as MapIcon,
  Warehouse,
  Navigation,
} from 'lucide-react';
import {
  FloatingText,
  TransmissionType,
  CameraView,
  WeatherType,
  RadioStation,
  OpenWorldHudState,
} from '../types/game';
import { Minimap } from './Minimap';

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
  raceRank?: number;
  totalRacers?: number;
  radioStation?: RadioStation;
  floatingTexts: FloatingText[];
  showTouchControls?: boolean;
  onPause: () => void;
  onToggleCamera?: () => void;
  onCycleRadio?: () => void;
  onTogglePhotoMode?: () => void;
  onHonkHorn?: () => void;
  onToggleHeadlights?: () => void;
  onToggleIndicator?: (dir: 'left' | 'right' | 'hazard') => void;
  onToggleDoors?: () => void;
  onToggleTrunk?: () => void;
  onShiftUp?: () => void;
  onShiftDown?: () => void;
  // Touch controls input binders
  onTouchSteer?: (dir: 'left' | 'right' | null) => void;
  onTouchLeft?: (active: boolean) => void;
  onTouchRight?: (active: boolean) => void;
  onTouchThrottle?: (forward: boolean) => void;
  onTouchBrake?: (brake: boolean) => void;
  onTouchNitro?: (nitro: boolean) => void;
  onTouchDrift?: (drift: boolean) => void;
  onTouchClutch?: (clutch: boolean) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  openWorld?: OpenWorldHudState;
  onOpenWorldMap?: () => void;
  onCancelStreetRace?: () => void;
  username?: string;
  tagColor?: string;
  lap?: number;
  totalLaps?: number;
  countdown?: number | null;
  leaderboard?: Array<{
    id: string;
    username: string;
    distance: number;
    lap: number;
    finished: boolean;
    finishRank: number;
    isLocal: boolean;
    color: string;
  }>;
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
  raceRank = 1,
  totalRacers = 4,
  radioStation = 'synthwave',
  floatingTexts,
  showTouchControls = true,
  onPause,
  onToggleCamera,
  onCycleRadio,
  onTogglePhotoMode,
  onHonkHorn,
  onToggleHeadlights,
  onToggleIndicator,
  onToggleDoors,
  onToggleTrunk,
  onShiftUp,
  onShiftDown,
  onTouchSteer,
  onTouchLeft,
  onTouchRight,
  onTouchThrottle,
  onTouchBrake,
  onTouchNitro,
  onTouchDrift,
  onTouchClutch,
  isFullscreen = false,
  onToggleFullscreen,
  openWorld,
  onOpenWorldMap,
  onCancelStreetRace,
  username,
  tagColor = '#f59e0b',
  lap = 1,
  totalLaps = 3,
  countdown,
  leaderboard,
}) => {
  const isOW = gameMode === 'openWorld' || gameMode === 'zen';
  const isPolice = gameMode === 'policeChase';
  const isOnline = gameMode === 'online';

  // Display gear
  const gearDisplay = speed === 0 && currentGear === 1 ? '1' : `${currentGear}`;

  // Speedometer fill percentage (0 to 260 km/h)
  const speedPct = Math.min(100, (speed / 260) * 100);

  const renderZoneIcon = () => {
    if (!zoneName) return null;
    if (openWorld?.currentZone === 'beach' || zoneName.toLowerCase().includes('coastal')) {
      return <Palmtree className="w-4 h-4 text-emerald-400" />;
    }
    if (openWorld?.currentZone === 'mountains' || zoneName.toLowerCase().includes('canyon')) {
      return <Mountain className="w-4 h-4 text-amber-500" />;
    }
    if (openWorld?.currentZone === 'industrial' || zoneName.toLowerCase().includes('industrial')) {
      return <Warehouse className="w-4 h-4 text-purple-400" />;
    }
    return <Building2 className="w-4 h-4 text-cyan-400" />;
  };

  const getRadioLabel = () => {
    switch (radioStation) {
      case 'synthwave': return 'SYNTHWAVE';
      case 'retroArcade': return '8-BIT ARCADE';
      case 'lofi': return 'LO-FI CHILL';
      case 'off': return 'RADIO OFF';
      default: return 'RADIO';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none z-10 font-sans touch-none">
      {/* 1. TOP PERIMETER STATUS CLUSTER */}
      <div className="flex flex-wrap items-start justify-between gap-1.5 w-full">
        {/* Top-Left: Score, Distance & Mode / Rank Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5 bg-slate-950/85 border border-slate-800 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xl md:text-2xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-amber-300 tabular-nums">
                  {score.toLocaleString()}
                </span>
              </div>

              {/* Race Position Rank (1st / 4) */}
              {(!isOW || openWorld?.activeRace) && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs font-mono font-bold text-amber-400">
                  <span>POS:</span>
                  <span className="text-white">{raceRank}</span>
                  <span className="text-slate-500">/</span>
                  <span>{totalRacers}</span>
                </div>
              )}

              {isPolice ? (
                <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950/90 border border-rose-600 rounded text-rose-300 uppercase tracking-wider flex items-center gap-1 font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  PURSUIT
                </span>
              ) : isOW ? (
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3 h-3" />
                  {gameMode === 'zen' ? 'FREE CRUISE' : 'OPEN WORLD'}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-slate-300">
              <span className="tabular-nums font-bold">{(distance / 1000).toFixed(2)} KM</span>
              <span className="inline-flex items-center gap-1 text-yellow-400">
                <Coins className="w-3.5 h-3.5 fill-current" />
                <span className="tabular-nums font-bold">{coins}</span>
              </span>

              {isOW && trophiesFound !== undefined && (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="tabular-nums">
                    TOKENS: {trophiesFound}/{totalTrophies}
                  </span>
                </span>
              )}

              {username && (
                <span className="inline-flex items-center gap-1 text-slate-200 font-bold border-l border-slate-700 pl-2.5">
                  <User className="w-3 h-3" style={{ color: tagColor }} />
                  <span>{username}</span>
                </span>
              )}
            </div>

            {/* Live Online Multiplayer Standings Panel */}
            {isOnline && leaderboard && leaderboard.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/90 flex flex-col gap-1 min-w-[190px]">
                <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  LIVE STANDINGS
                </span>
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 text-[11px] font-mono px-1.5 py-0.5 rounded ${
                      entry.isLocal ? 'bg-amber-500/15 text-amber-300 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-slate-400 w-4">#{entry.finished && entry.finishRank ? entry.finishRank : idx + 1}</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="truncate max-w-[92px]">{entry.username}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                      {entry.finished ? 'FIN' : `L${entry.lap} · ${entry.distance}m`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Rotating Open-World Radar Minimap */}
          {isOW && openWorld && onOpenWorldMap && (
            <Minimap
              posX={posX}
              posZ={posZ}
              headingDeg={heading}
              openWorld={openWorld}
              onOpenWorldMap={onOpenWorldMap}
            />
          )}
        </div>

        {/* Top-Center: Active Status Banners (Police Heat, Zone or Countdown) */}
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
          ) : isOW && openWorld?.activeRace ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/90 border border-cyan-500 rounded-2xl shadow-xl font-['Chakra_Petch',sans-serif] pointer-events-auto">
              <Flag className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-wider text-cyan-300 uppercase font-bold">
                  {openWorld.activeRace.name}
                </span>
                <span className="text-sm md:text-base font-black text-white tabular-nums">
                  CP {openWorld.activeRace.checkpointIdx}/{openWorld.activeRace.totalCheckpoints} · POS #{openWorld.activeRace.rank}/{openWorld.activeRace.totalRacers} · {openWorld.activeRace.elapsed.toFixed(1)}s
                </span>
              </div>
              {onCancelStreetRace && (
                <button
                  type="button"
                  onClick={onCancelStreetRace}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-[10px] font-mono text-slate-200 cursor-pointer"
                >
                  Quit
                </button>
              )}
            </div>
          ) : isOW && openWorld?.activeDriftZone ? (
            <div className="flex flex-col items-center px-4 py-2 bg-slate-950/90 border border-amber-400 rounded-2xl shadow-xl font-['Chakra_Petch',sans-serif]">
              <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
                DRIFT ZONE: {openWorld.activeDriftZone.name}
              </span>
              <span className="text-base md:text-lg font-black text-white tabular-nums">
                {openWorld.activeDriftZone.score.toLocaleString()} / {openWorld.activeDriftZone.target.toLocaleString()} PTS
              </span>
            </div>
          ) : isOW && zoneName ? (
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-950/90 border border-slate-800 rounded-2xl shadow-xl font-['Chakra_Petch',sans-serif]">
              {renderZoneIcon()}
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  CURRENT ZONE
                </span>
                <span className="text-sm md:text-base font-black text-amber-300 tracking-wider">
                  {zoneName}
                </span>
              </div>
              {openWorld?.waypoint && openWorld.waypointDist !== null && (
                <div className="flex items-center gap-1 pl-2 border-l border-slate-700 text-xs font-mono text-cyan-300 font-bold">
                  <Navigation className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{openWorld.waypointDist}m</span>
                </div>
              )}
            </div>
          ) : isOnline ? (
            <div className="flex items-center gap-2.5 px-5 py-2 rounded-2xl border bg-slate-950/85 border-cyan-500/50 text-cyan-300 font-['Chakra_Petch',sans-serif] shadow-lg">
              <Flag className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  ONLINE RACE · {trackName || 'CIRCUIT'}
                </span>
                <span className="text-xl sm:text-2xl font-black tabular-nums tracking-wider leading-none text-white">
                  LAP {lap} <span className="text-slate-500">/</span> {totalLaps}
                </span>
              </div>
            </div>
          ) : gameMode !== 'zen' ? (
            <div
              className={`flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-2xl border font-['Chakra_Petch',sans-serif] shadow-lg transition-all ${
                timeLeft <= 10
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-slate-950/80 border-slate-800 text-amber-300'
              }`}
            >
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  TIME LEFT
                </span>
                <span className="text-xl sm:text-3xl font-black tabular-nums tracking-wider leading-none">
                  {timeLeft}s
                </span>
              </div>
            </div>
          ) : null}

          {/* Active Power-up Badges */}
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

        {/* Top-Right: Quick Vehicle Actions, Radio, Photo Mode, & Pause */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Radio Station Switcher */}
          <button
            onClick={onCycleRadio}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white hover:border-amber-400 transition-all cursor-pointer shadow-lg text-xs font-mono"
            title="Cycle Radio Station (Key M)"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline text-[10px] font-bold">{getRadioLabel()}</span>
          </button>

          {/* Photo Mode Trigger */}
          <button
            onClick={onTogglePhotoMode}
            className="p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-lg"
            title="Photo Mode (Key F)"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Camera View Switcher */}
          <button
            onClick={onToggleCamera}
            className="p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg"
            title={`Camera Angle: ${cameraView} (Key C)`}
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Horn */}
          <button
            onClick={onHonkHorn}
            className="p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-amber-400 transition-all cursor-pointer shadow-lg"
            title="Honk Horn (Key X)"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Open-World Interactive Map Trigger */}
          {isOW && onOpenWorldMap && (
            <button
              onClick={onOpenWorldMap}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-lg flex items-center justify-center"
              title="Open World Map (Key M)"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-amber-400 transition-all cursor-pointer shadow-lg flex items-center justify-center"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg flex items-center justify-center"
            title="Pause Game (ESC)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. CENTER FLOATING TEXTS, SYNCHRONIZED COUNTDOWN & DRIFT SCORE */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none relative">
        {/* Synchronized Online Race Launch Countdown */}
        {countdown !== null && countdown !== undefined && (
          <div className="mb-4 px-8 py-4 rounded-3xl bg-slate-950/90 border-2 border-amber-400 shadow-2xl flex flex-col items-center">
            <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase">
              RACE LAUNCH
            </span>
            <span
              className={`text-5xl md:text-6xl font-black font-['Chakra_Petch',sans-serif] tracking-widest ${
                countdown === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </span>
          </div>
        )}

        {/* Drift Multiplier Banner */}
        {isDrifting && (
          <div className="flex flex-col items-center animate-bounce mb-2">
            <span className="text-2xl md:text-3xl font-black font-['Chakra_Petch',sans-serif] text-amber-400 italic tracking-wider drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
              DRIFTING!
            </span>
          </div>
        )}

        {/* Floating Award Texts */}
        <div className="flex flex-col items-center gap-1.5 min-h-16">
          {floatingTexts.slice(-3).map((ft) => (
            <div
              key={ft.id}
              className={`px-4 py-1.5 rounded-xl border text-xs sm:text-sm font-black font-['Chakra_Petch',sans-serif] tracking-wider animate-in fade-in zoom-in-95 duration-100 shadow-xl ${
                ft.type === 'nearMiss'
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : ft.type === 'hazard'
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                  : ft.type === 'speedtrap'
                  ? 'bg-indigo-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.6)]'
                  : ft.type === 'checkpoint'
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                  : 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              }`}
            >
              {ft.text}
            </div>
          ))}
        </div>
      </div>

      {/* 3. BOTTOM TELEMETRY GAUGES (Positioned cleanly above touch controls on mobile) */}
      <div
        className={`flex items-end justify-between w-full transition-all ${
          showTouchControls ? 'mb-[clamp(112px,26vh,152px)]' : ''
        }`}
      >
        {/* Bottom-Left: Nitro Tank Telemetry */}
        <div className="flex flex-col gap-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-2 sm:p-3 shadow-xl w-32 sm:w-48">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              NITRO
            </span>
            <span className="text-cyan-400 font-bold tabular-nums">{nitro}%</span>
          </div>

          <div className="w-full h-2 sm:h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                nitro > 85
                  ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-white shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
              }`}
              style={{ width: `${nitro}%` }}
            />
          </div>
        </div>

        {/* Bottom-Right: Speedometer & Gearbox */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl p-2 sm:p-3.5 shadow-xl">
          <div className="flex flex-col items-center justify-center w-9 sm:w-12 h-11 sm:h-16 bg-slate-900 border border-slate-800 rounded-xl font-['Chakra_Petch',sans-serif]">
            <span className="text-[8px] font-mono text-slate-400 uppercase">
              {transmission === 'manual' ? 'MAN' : 'AUTO'}
            </span>
            <span className="text-lg sm:text-2xl font-black text-amber-400">{gearDisplay}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-4xl font-black font-['Chakra_Petch',sans-serif] tracking-wider text-white tabular-nums">
                {speed}
              </span>
              <span className="text-[9px] sm:text-xs font-mono font-bold text-amber-400">KM/H</span>
            </div>

            <div className="w-20 sm:w-32 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-1">
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

      {/* 4. HIGH-PRIORITY Z-50 ON-SCREEN MULTI-TOUCH CONTROLS OVERLAY */}
      {showTouchControls && (
        <div
          className="fixed inset-0 z-50 pointer-events-none select-none"
          style={{ touchAction: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Left Touch Cluster: Lights/Indicators + Steering Left/Right */}
          <div
            className="absolute bottom-[max(12px,2.5vh)] left-[max(12px,2vw)] flex flex-col gap-2 pointer-events-auto"
            style={{ touchAction: 'none' }}
          >
            {/* Vehicle Lights & Indicators Row */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={onToggleHeadlights}
                className={`min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center justify-center ${
                  headlights ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
                title="Toggle Headlights"
              >
                <Lightbulb className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleIndicator?.('left')}
                className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  indicators === 'left' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
                title="Indicator Left"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => onToggleIndicator?.('hazard')}
                className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  indicators === 'hazard' ? 'bg-rose-500 text-white font-bold animate-pulse' : 'text-slate-300'
                }`}
                title="Hazard Flashers"
              >
                ⚠
              </button>
              <button
                type="button"
                onClick={() => onToggleIndicator?.('right')}
                className={`min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  indicators === 'right' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'
                }`}
                title="Indicator Right"
              >
                ▶
              </button>
            </div>

            {/* Virtual Steering Buttons (Left / Right) */}
            <div className="flex items-center gap-[clamp(8px,2vw,14px)]" style={{ touchAction: 'none' }}>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchLeft ? onTouchLeft(true) : onTouchSteer?.('left');
                }}
                onPointerUp={() => (onTouchLeft ? onTouchLeft(false) : onTouchSteer?.(null))}
                onPointerCancel={() => (onTouchLeft ? onTouchLeft(false) : onTouchSteer?.(null))}
                className="w-[clamp(58px,14vw,76px)] h-[clamp(58px,15vh,76px)] bg-slate-950/70 border-2 border-slate-600/90 active:border-amber-400 active:bg-amber-500 active:text-slate-950 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-2xl select-none cursor-pointer active:scale-95 transition-transform backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
                aria-label="Steer Left"
              >
                ◀
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchRight ? onTouchRight(true) : onTouchSteer?.('right');
                }}
                onPointerUp={() => (onTouchRight ? onTouchRight(false) : onTouchSteer?.(null))}
                onPointerCancel={() => (onTouchRight ? onTouchRight(false) : onTouchSteer?.(null))}
                className="w-[clamp(58px,14vw,76px)] h-[clamp(58px,15vh,76px)] bg-slate-950/70 border-2 border-slate-600/90 active:border-amber-400 active:bg-amber-500 active:text-slate-950 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-2xl select-none cursor-pointer active:scale-95 transition-transform backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
                aria-label="Steer Right"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Center-Bottom: Manual Shifting Cluster (When in Manual Mode) */}
          {transmission === 'manual' && (
            <div
              className="absolute bottom-[max(12px,2.5vh)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-auto bg-slate-950/80 border border-slate-700 rounded-2xl p-2 shadow-xl backdrop-blur-[2px]"
              style={{ touchAction: 'none' }}
            >
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-tighter">
                MANUAL GEARS
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    onTouchClutch?.(true);
                  }}
                  onPointerUp={() => onTouchClutch?.(false)}
                  onPointerCancel={() => onTouchClutch?.(false)}
                  className={`px-2.5 py-2.5 min-h-[44px] rounded-xl font-mono text-[11px] font-bold border transition-all select-none cursor-pointer ${
                    clutch
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  CLUTCH
                </button>

                <button
                  type="button"
                  onClick={onShiftDown}
                  className="w-11 h-11 bg-slate-900 border border-slate-700 hover:border-amber-400 text-white font-bold rounded-xl flex items-center justify-center active:bg-amber-500 active:text-black cursor-pointer"
                  title="Downshift"
                >
                  ▼
                </button>

                <button
                  type="button"
                  onClick={onShiftUp}
                  className="w-11 h-11 bg-slate-900 border border-slate-700 hover:border-amber-400 text-white font-bold rounded-xl flex items-center justify-center active:bg-amber-500 active:text-black cursor-pointer"
                  title="Upshift"
                >
                  ▲
                </button>
              </div>
            </div>
          )}

          {/* Right Touch Cluster: Nitro, Drift, Brake & Gas Pedals */}
          <div
            className="absolute bottom-[max(12px,2.5vh)] right-[max(12px,2vw)] flex items-end gap-[clamp(6px,1.5vw,12px)] pointer-events-auto"
            style={{ touchAction: 'none' }}
          >
            {/* Drift & Nitro Column */}
            <div className="flex flex-col gap-[clamp(6px,1.4vh,10px)]" style={{ touchAction: 'none' }}>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchNitro?.(true);
                }}
                onPointerUp={() => onTouchNitro?.(false)}
                onPointerCancel={() => onTouchNitro?.(false)}
                className="w-[clamp(50px,11vw,64px)] h-[clamp(48px,11vh,62px)] bg-cyan-950/75 border-2 border-cyan-400/90 active:bg-cyan-400 active:text-slate-950 text-cyan-200 font-black text-[10px] sm:text-xs font-mono rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform select-none cursor-pointer backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>NITRO</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchDrift?.(true);
                }}
                onPointerUp={() => onTouchDrift?.(false)}
                onPointerCancel={() => onTouchDrift?.(false)}
                className="w-[clamp(50px,11vw,64px)] h-[clamp(48px,11vh,62px)] bg-amber-950/75 border-2 border-amber-400/90 active:bg-amber-400 active:text-slate-950 text-amber-200 font-black text-[10px] sm:text-xs font-mono rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform select-none cursor-pointer backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>DRIFT</span>
              </button>
            </div>

            {/* Brake & Gas Pedals */}
            <div className="flex items-end gap-[clamp(6px,1.5vw,10px)]" style={{ touchAction: 'none' }}>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchBrake?.(true);
                }}
                onPointerUp={() => onTouchBrake?.(false)}
                onPointerCancel={() => onTouchBrake?.(false)}
                className="w-[clamp(50px,11vw,66px)] h-[clamp(74px,18vh,102px)] bg-rose-950/75 border-2 border-rose-500 active:bg-rose-500 active:text-slate-950 text-rose-200 font-black text-[11px] sm:text-xs font-mono rounded-2xl flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform select-none cursor-pointer backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
              >
                <span>BRAKE</span>
                <span className="text-[9px] text-rose-300">REV</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  onTouchThrottle?.(true);
                }}
                onPointerUp={() => onTouchThrottle?.(false)}
                onPointerCancel={() => onTouchThrottle?.(false)}
                className="w-[clamp(58px,13vw,76px)] h-[clamp(94px,23vh,130px)] bg-emerald-950/75 border-2 border-emerald-400 active:bg-emerald-400 active:text-slate-950 text-emerald-200 font-black text-xs sm:text-sm font-mono rounded-2xl flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform select-none cursor-pointer backdrop-blur-[2px]"
                style={{ touchAction: 'none' }}
              >
                <span className="text-sm sm:text-base font-black">GAS</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-300 font-normal">ACCEL</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
