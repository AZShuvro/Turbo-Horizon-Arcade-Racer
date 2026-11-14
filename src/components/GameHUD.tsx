import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Flame,
  Pause,
  Settings,
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
  Lightbulb,
  DoorClosed,
  DoorOpen,
  ShieldAlert,
  Radio,
  Volume2,
  Flag,
  Maximize2,
  Minimize2,
  Warehouse,
  Navigation,
  Car,
  ChevronDown,
  ChevronUp,
  LocateFixed,
  MoreHorizontal,
  X,
  Wrench,
  Film,
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

export interface FastTelemetryApi {
  update: (
    speedKmH: number,
    nitro: number,
    gear: number,
    posX: number,
    posZ: number,
    headingDeg: number,
    isDrifting: boolean
  ) => void;
}

interface GameHUDProps {
  score: number;
  speed: number;
  nitro: number;
  distance: number;
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
  health?: number;
  replayState?: {
    active: boolean;
    currentSec: number;
    totalSec: number;
    cameraLabel: string;
  } | null;
  onExitReplay?: () => void;
  raceRank?: number;
  totalRacers?: number;
  radioStation?: RadioStation;
  floatingTexts: FloatingText[];
  showTouchControls?: boolean;
  fastTelemetryRef?: React.MutableRefObject<FastTelemetryApi | null>;
  onPause: () => void;
  onResetCar?: () => void;
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

// SVG semi-arc path lengths
const DESKTOP_SPEED_ARC_LEN = 188.5; // radius 60, PI * 60
const DESKTOP_NITRO_ARC_LEN = 150.8; // radius 48, PI * 48
const MOBILE_SPEED_ARC_LEN = 131.9; // radius 42, PI * 42
const MOBILE_NITRO_ARC_LEN = 100.5; // radius 32, PI * 32

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  speed,
  nitro,
  distance,
  coins,
  timeLeft,
  isDrifting,
  gameMode,
  zoneName,
  trophiesFound,
  totalTrophies = 12,
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
  health = 100,
  replayState,
  onExitReplay,
  raceRank = 1,
  totalRacers = 4,
  radioStation = 'synthwave',
  floatingTexts,
  showTouchControls = false,
  fastTelemetryRef,
  onPause,
  onResetCar,
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
  lap = 1,
  totalLaps = 3,
  countdown,
  leaderboard,
}) => {
  const isOW = gameMode === 'openWorld' || gameMode === 'zen';
  const isPolice = gameMode === 'policeChase';
  const isOnline = gameMode === 'online';

  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);

  // Direct DOM refs for 60fps imperative updates (Zero React re-renders!)
  const desktopSpeedRef = useRef<HTMLSpanElement | null>(null);
  const desktopGearRef = useRef<HTMLSpanElement | null>(null);
  const desktopNitroPctRef = useRef<HTMLSpanElement | null>(null);
  const desktopSpeedArcRef = useRef<SVGPathElement | null>(null);
  const desktopNitroArcRef = useRef<SVGPathElement | null>(null);

  const mobileSpeedRef = useRef<HTMLSpanElement | null>(null);
  const mobileGearRef = useRef<HTMLSpanElement | null>(null);
  const mobileSpeedArcRef = useRef<SVGPathElement | null>(null);
  const mobileNitroArcRef = useRef<SVGPathElement | null>(null);

  const minimapDrawRef = useRef<((x: number, z: number, headingDeg: number) => void) | null>(null);

  // Bind zero-allocation imperative telemetry updater
  useEffect(() => {
    if (!fastTelemetryRef) return;
    fastTelemetryRef.current = {
      update: (spd, ntr, gear, x, z, hDeg) => {
        const speedNorm = Math.min(1, spd / 260);
        const nitroNorm = Math.max(0, Math.min(1, ntr / 100));
        const gearLabel = `G${gear}`;

        if (desktopSpeedRef.current) desktopSpeedRef.current.textContent = String(spd);
        if (desktopGearRef.current) desktopGearRef.current.textContent = gearLabel;
        if (desktopNitroPctRef.current) desktopNitroPctRef.current.textContent = `${ntr}%`;
        if (desktopSpeedArcRef.current) {
          desktopSpeedArcRef.current.style.strokeDashoffset = String(
            DESKTOP_SPEED_ARC_LEN * (1 - speedNorm)
          );
        }
        if (desktopNitroArcRef.current) {
          desktopNitroArcRef.current.style.strokeDashoffset = String(
            DESKTOP_NITRO_ARC_LEN * (1 - nitroNorm)
          );
        }

        if (mobileSpeedRef.current) mobileSpeedRef.current.textContent = String(spd);
        if (mobileGearRef.current) mobileGearRef.current.textContent = gearLabel;
        if (mobileSpeedArcRef.current) {
          mobileSpeedArcRef.current.style.strokeDashoffset = String(
            MOBILE_SPEED_ARC_LEN * (1 - speedNorm)
          );
        }
        if (mobileNitroArcRef.current) {
          mobileNitroArcRef.current.style.strokeDashoffset = String(
            MOBILE_NITRO_ARC_LEN * (1 - nitroNorm)
          );
        }

        minimapDrawRef.current?.(x, z, hDeg);
      },
    };
    return () => {
      fastTelemetryRef.current = null;
    };
  }, [fastTelemetryRef]);

  const renderZoneIcon = () => {
    if (!zoneName) return null;
    if (openWorld?.currentZone === 'beach') return <Palmtree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (openWorld?.currentZone === 'mountains') return <Mountain className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (openWorld?.currentZone === 'industrial') return <Warehouse className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    return <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  };

  const radioLabel =
    radioStation === 'synthwave'
      ? 'Synthwave'
      : radioStation === 'retroArcade'
      ? '8-Bit'
      : radioStation === 'lofi'
      ? 'Lo-Fi'
      : 'Muted';

  const visibleLeaderboard = leaderboard
    ? leaderboardExpanded
      ? leaderboard
      : leaderboard.slice(0, 3)
    : [];

  if (replayState?.active) {
    const pct =
      replayState.totalSec > 0
        ? Math.min(100, (replayState.currentSec / replayState.totalSec) * 100)
        : 0;
    return (
      <div className="fixed inset-0 pointer-events-none flex flex-col justify-between hud-safe-inset select-none z-20 font-['Outfit',sans-serif]">
        <div className="flex items-center justify-between w-full">
          <div className="backdrop-blur-md bg-black/50 border border-white/15 rounded-full px-3.5 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-black italic font-['Chakra_Petch',sans-serif] text-white tracking-wider">
              {replayState.cameraLabel}
            </span>
          </div>
          {onExitReplay && (
            <button
              type="button"
              onClick={onExitReplay}
              className="pointer-events-auto min-h-[40px] px-4 py-1.5 rounded-full backdrop-blur-md bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black italic text-xs tracking-wider font-['Chakra_Petch',sans-serif] cursor-pointer shadow-lg"
            >
              EXIT REPLAY
            </button>
          )}
        </div>

        <div className="mx-auto w-full max-w-md backdrop-blur-md bg-black/55 border border-white/15 rounded-2xl px-4 py-2.5 flex flex-col gap-1.5 shadow-2xl">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 tabular-nums">
            <span>INSTANT 10S REPLAY</span>
            <span>
              {replayState.currentSec.toFixed(1)}s / {replayState.totalSec.toFixed(1)}s
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-[width] duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between hud-safe-inset select-none z-10 font-['Outfit',sans-serif] touch-none">
      {/* 1. TOP PERIMETER BAR (Ultra-Slim, 85%+ Center Viewport Left Completely Open) */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* TOP-LEFT: Compact Translucent Status Pill + Collapsible Top-3 Leaderboard */}
        <div className="flex flex-col gap-1.5 items-start max-w-[54vw] sm:max-w-xs">
          <div className="backdrop-blur-md bg-black/40 border border-white/15 rounded-2xl px-3 py-1.5 shadow-xl flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pointer-events-auto">
            {/* Primary Mode Metric */}
            {isPolice && heatLevel !== undefined ? (
              <div className="flex items-center gap-1.5 text-xs font-black italic font-['Chakra_Petch',sans-serif] text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span className="text-amber-400 tracking-tighter">
                  {'★'.repeat(heatLevel)}
                  {'☆'.repeat(5 - heatLevel)}
                </span>
                <span className="text-white tabular-nums">{Math.floor(distance / 20)}s</span>
              </div>
            ) : isOnline ? (
              <div className="flex items-center gap-2 text-xs font-black italic font-['Chakra_Petch',sans-serif] tabular-nums">
                <span className="text-amber-400">POS {raceRank}/{totalRacers}</span>
                <span className="text-white/30">·</span>
                <span className="text-cyan-300">LAP {lap}/{totalLaps}</span>
              </div>
            ) : isOW && openWorld?.activeRace ? (
              <div className="flex items-center gap-2 text-xs font-black italic font-['Chakra_Petch',sans-serif] tabular-nums">
                <Flag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-white">
                  CP {openWorld.activeRace.checkpointIdx}/{openWorld.activeRace.totalCheckpoints}
                </span>
                <span className="text-amber-400">#{openWorld.activeRace.rank}/{openWorld.activeRace.totalRacers}</span>
                {onCancelStreetRace && (
                  <button
                    type="button"
                    onClick={onCancelStreetRace}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-rose-500 text-[10px] font-mono text-white cursor-pointer"
                  >
                    Quit
                  </button>
                )}
              </div>
            ) : isOW ? (
              <div className="flex items-center gap-1.5 text-xs font-bold font-['Chakra_Petch',sans-serif] italic text-white">
                {renderZoneIcon()}
                <span className="truncate max-w-[120px] sm:max-w-none">{zoneName || 'Open World'}</span>
              </div>
            ) : gameMode !== 'zen' ? (
              <div className="flex items-center gap-2 text-xs font-black italic font-['Chakra_Petch',sans-serif] tabular-nums">
                <span
                  className={`flex items-center gap-1 ${
                    timeLeft <= 10 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {timeLeft}s
                </span>
                <span className="text-white/30">·</span>
                <span className="text-white">POS {raceRank}/{totalRacers}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold italic text-cyan-300">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>CRUISE</span>
              </div>
            )}

            <span className="text-white/25 hidden sm:inline">·</span>

            {/* Score & Coins */}
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              <span className="font-black italic font-['Chakra_Petch',sans-serif] text-amber-300">
                {score.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-yellow-400 font-bold">
                <Coins className="w-3 h-3 fill-current" />
                {coins}
              </span>
              {isOW && trophiesFound !== undefined && (
                <span className="hidden sm:inline-flex items-center gap-1 text-zinc-300">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  {trophiesFound}/{totalTrophies}
                </span>
              )}
            </div>
          </div>

          {/* Collapsible Multiplayer Mini-Leaderboard (Top 3 default, expand on tap) */}
          {isOnline && leaderboard && leaderboard.length > 0 && (
            <button
              type="button"
              onClick={() => setLeaderboardExpanded((v) => !v)}
              className="backdrop-blur-md bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-left pointer-events-auto cursor-pointer transition-colors hover:bg-black/55 min-w-[164px]"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold mb-1">
                <span>STANDINGS</span>
                {leaderboard.length > 3 && (
                  <span className="flex items-center gap-0.5 text-zinc-400">
                    {leaderboardExpanded ? 'Less' : `+${leaderboard.length - 3}`}
                    {leaderboardExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {visibleLeaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums ${
                      entry.isLocal ? 'text-amber-300 font-bold' : 'text-zinc-200'
                    }`}
                  >
                    <span className="truncate max-w-[100px]">
                      #{entry.finished && entry.finishRank ? entry.finishRank : idx + 1} {entry.username}
                    </span>
                    <span className="text-[10px] text-zinc-400 shrink-0">
                      {entry.finished ? 'FIN' : `L${entry.lap}`}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          )}

          {/* Active Drift Zone / Health / Powerup / GPS Pill (Only rendered when active or damaged) */}
          {(health < 100 || shield || magnetTimeLeft > 0 || openWorld?.activeDriftZone || (openWorld?.waypoint && openWorld.waypointDist !== null)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {health < 100 && (
                <div
                  className={`backdrop-blur-md bg-black/55 border rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold flex items-center gap-1.5 tabular-nums ${
                    health >= 65
                      ? 'border-emerald-400/50 text-emerald-300'
                      : health >= 45
                      ? 'border-amber-400/60 text-amber-300'
                      : 'border-rose-500/70 text-rose-300'
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  <span>HP {health}%</span>
                  {health < 50 && isOW && (
                    <span className="text-[9px] text-emerald-300 font-normal">· REPAIR BAY</span>
                  )}
                </div>
              )}
              {openWorld?.activeDriftZone && (
                <div className="backdrop-blur-md bg-black/45 border border-amber-400/50 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-300 tabular-nums">
                  DRIFT {openWorld.activeDriftZone.score.toLocaleString()}/{openWorld.activeDriftZone.target}
                </div>
              )}
              {openWorld?.waypoint && openWorld.waypointDist !== null && (
                <div className="backdrop-blur-md bg-black/45 border border-cyan-400/40 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold text-cyan-300 flex items-center gap-1 tabular-nums">
                  <Navigation className="w-3 h-3" />
                  <span>{openWorld.waypointDist}m</span>
                </div>
              )}
              {shield && (
                <div className="backdrop-blur-md bg-sky-950/70 border border-sky-400/60 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold text-sky-300 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SHIELD
                </div>
              )}
              {magnetTimeLeft > 0 && (
                <div className="backdrop-blur-md bg-amber-950/70 border border-amber-400/60 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 tabular-nums">
                  <Magnet className="w-3 h-3" /> {magnetTimeLeft}s
                </div>
              )}
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Compact Circular Minimap + Single [Car/•••] Quick Drawer + Single [⚙️] Pause */}
        <div className="relative flex items-start gap-2 pointer-events-auto">
          {isOW && openWorld && onOpenWorldMap && (
            <Minimap
              posX={posX}
              posZ={posZ}
              headingDeg={heading}
              openWorld={openWorld}
              onOpenWorldMap={onOpenWorldMap}
              drawRef={minimapDrawRef}
              hideShortcutHint={showTouchControls}
              compact={showTouchControls}
            />
          )}

          {/* Single [Car / •••] Quick Drawer Toggle (Hides all secondary vehicle/camera/radio controls) */}
          <button
            type="button"
            onClick={() => setQuickDrawerOpen((v) => !v)}
            className={`min-w-[44px] min-h-[44px] px-2.5 rounded-2xl backdrop-blur-md border transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xl ${
              quickDrawerOpen
                ? 'bg-amber-500 border-amber-400 text-zinc-950 font-bold'
                : 'bg-black/40 border-white/15 text-zinc-200 hover:text-white hover:bg-black/60'
            }`}
            title="Car Controls & Quick Menu"
            aria-label="Toggle Vehicle Quick Controls"
          >
            {quickDrawerOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <>
                <Car className="w-4 h-4 text-amber-400" />
                <MoreHorizontal className="w-3.5 h-3.5 hidden sm:block" />
              </>
            )}
          </button>

          {/* Single [⚙️] Pause/Menu Button */}
          <button
            type="button"
            onClick={() => {
              setQuickDrawerOpen(false);
              onPause();
            }}
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl backdrop-blur-md bg-black/40 border border-white/15 text-zinc-200 hover:text-white hover:bg-black/60 transition-colors cursor-pointer flex items-center justify-center shadow-xl"
            title={showTouchControls ? 'Pause Menu' : 'Pause Menu (ESC)'}
            aria-label="Pause Menu"
          >
            {showTouchControls ? <Settings className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Expandable Compact [Car / •••] Popover Drawer */}
          {quickDrawerOpen && (
            <div className="absolute right-0 top-[52px] w-56 backdrop-blur-xl bg-black/75 border border-white/15 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 z-50 animate-hud-toast">
              <div className="grid grid-cols-2 gap-1.5">
                {onToggleCamera && (
                  <button
                    type="button"
                    onClick={onToggleCamera}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate capitalize">
                      {cameraView === 'thirdPerson' ? 'Chase' : cameraView === 'hood' ? 'Hood' : 'Top'}
                    </span>
                  </button>
                )}

                {onCycleRadio && (
                  <button
                    type="button"
                    onClick={onCycleRadio}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{radioLabel}</span>
                  </button>
                )}

                {onTogglePhotoMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDrawerOpen(false);
                      onTogglePhotoMode();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                    <span>Photo</span>
                  </button>
                )}

                {onResetCar && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickDrawerOpen(false);
                      onResetCar();
                    }}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-amber-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LocateFixed className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset Car</span>
                  </button>
                )}
              </div>

              <div className="h-px bg-white/10 my-0.5" />

              {/* Vehicle Lights & Signals */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={onToggleHeadlights}
                  className={`min-h-[40px] rounded-xl border flex items-center justify-center cursor-pointer ${
                    headlights
                      ? 'bg-amber-500 border-amber-400 text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Headlights"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleIndicator?.('left')}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                    indicators === 'left'
                      ? 'bg-amber-500 border-amber-400 text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Left Signal"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => onToggleIndicator?.('hazard')}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                    indicators === 'hazard'
                      ? 'bg-rose-500 border-rose-400 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Hazards"
                >
                  ⚠
                </button>
                <button
                  type="button"
                  onClick={() => onToggleIndicator?.('right')}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold cursor-pointer ${
                    indicators === 'right'
                      ? 'bg-amber-500 border-amber-400 text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Right Signal"
                >
                  ▶
                </button>
              </div>

              {/* Doors, Trunk, Horn, Fullscreen */}
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={onToggleDoors}
                  className={`min-h-[40px] rounded-xl border flex items-center justify-center cursor-pointer ${
                    doorsOpen
                      ? 'bg-amber-500 border-amber-400 text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Doors"
                >
                  {doorsOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={onToggleTrunk}
                  className={`min-h-[40px] rounded-xl border text-[10px] font-bold cursor-pointer ${
                    trunkOpen
                      ? 'bg-amber-500 border-amber-400 text-zinc-950'
                      : 'bg-white/5 border-white/10 text-zinc-300'
                  }`}
                  title="Trunk"
                >
                  TRK
                </button>
                <button
                  type="button"
                  onClick={onHonkHorn}
                  className="min-h-[40px] rounded-xl border bg-white/5 border-white/10 text-zinc-300 hover:text-amber-300 flex items-center justify-center cursor-pointer"
                  title="Horn"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                {onToggleFullscreen && (
                  <button
                    type="button"
                    onClick={onToggleFullscreen}
                    className="min-h-[40px] rounded-xl border bg-white/5 border-white/10 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
                    title="Fullscreen"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. NON-BLOCKING UPPER-PERIMETER TOASTS & LAUNCH COUNTDOWN (Center Driving Lane Clear) */}
      <div className="fixed top-[max(56px,calc(env(safe-area-inset-top,12px)+46px))] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-20 max-w-[82vw]">
        {isDrifting && (
          <div className="px-3 py-0.5 rounded-full backdrop-blur-md bg-amber-500/25 border border-amber-400/60 text-xs font-black italic font-['Chakra_Petch',sans-serif] tracking-wider text-amber-300 animate-hud-toast">
            DRIFTING
          </div>
        )}

        {floatingTexts.slice(-2).map((ft) => (
          <div
            key={ft.id}
            className={`px-3.5 py-1 rounded-full backdrop-blur-md border text-[11px] sm:text-xs font-bold font-['Chakra_Petch',sans-serif] italic tracking-wide shadow-lg animate-hud-toast truncate max-w-full ${
              ft.type === 'nearMiss'
                ? 'bg-rose-950/75 border-rose-400/50 text-rose-200'
                : ft.type === 'hazard'
                ? 'bg-amber-950/75 border-amber-400/50 text-amber-200'
                : ft.type === 'speedtrap'
                ? 'bg-cyan-950/75 border-cyan-400/50 text-cyan-200'
                : ft.type === 'checkpoint'
                ? 'bg-emerald-950/75 border-emerald-400/50 text-emerald-200'
                : 'bg-black/65 border-white/20 text-amber-300'
            }`}
          >
            {ft.text}
          </div>
        ))}
      </div>

      {/* Synchronized Race Launch Countdown (Only during active 3-2-1-GO) */}
      {countdown !== null && countdown !== undefined && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-3xl backdrop-blur-md bg-black/55 border border-white/20 shadow-2xl flex flex-col items-center pointer-events-none animate-hud-toast">
          <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-300 uppercase">
            RACE LAUNCH
          </span>
          <span
            className={`text-5xl md:text-6xl font-black italic font-['Chakra_Petch',sans-serif] tracking-widest ${
              countdown === 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {countdown === 0 ? 'GO!' : countdown}
          </span>
        </div>
      )}

      {/* 3. BOTTOM TELEMETRY: Desktop Corner Cluster OR Mobile Integrated Arc */}
      {!showTouchControls ? (
        /* DESKTOP: Bottom-Right Digital Speedometer + Gear + Curved SVG Nitro & Speed Arc */
        <div className="flex items-end justify-end w-full pointer-events-none">
          <div className="relative backdrop-blur-md bg-black/40 border border-white/15 rounded-2xl px-4 pt-3 pb-2.5 shadow-2xl flex flex-col items-center min-w-[186px]">
            <svg width="144" height="80" viewBox="0 0 144 80" className="overflow-visible">
              {/* Outer Speed Track */}
              <path
                d="M 12 72 A 60 60 0 0 1 132 72"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Outer Speed Fill (Imperative 60fps ref) */}
              <path
                ref={desktopSpeedArcRef}
                d="M 12 72 A 60 60 0 0 1 132 72"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={DESKTOP_SPEED_ARC_LEN}
                strokeDashoffset={DESKTOP_SPEED_ARC_LEN * (1 - Math.min(1, speed / 260))}
              />
              {/* Inner Nitro Track */}
              <path
                d="M 24 72 A 48 48 0 0 1 120 72"
                fill="none"
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Inner Nitro Fill (Imperative 60fps ref) */}
              <path
                ref={desktopNitroArcRef}
                d="M 24 72 A 48 48 0 0 1 120 72"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={DESKTOP_NITRO_ARC_LEN}
                strokeDashoffset={DESKTOP_NITRO_ARC_LEN * (1 - nitro / 100)}
              />
            </svg>

            {/* Centered Speed Readout Inside Arc */}
            <div className="absolute top-[30px] inset-x-0 flex flex-col items-center">
              <span
                ref={desktopSpeedRef}
                className="text-3xl font-black italic font-['Chakra_Petch',sans-serif] text-white tabular-nums leading-none"
              >
                {speed}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 tracking-widest mt-0.5">KM/H</span>
            </div>

            {/* Bottom Gear & Nitro Footer */}
            <div className="flex items-center justify-between w-full pt-1 border-t border-white/10 text-[11px] font-mono tabular-nums">
              <span className="flex items-center gap-1 font-black italic font-['Chakra_Petch',sans-serif] text-amber-400">
                <span ref={desktopGearRef}>G{currentGear}</span>
                <span className="text-[9px] font-normal text-zinc-400 not-italic">
                  {transmission === 'manual' ? 'MAN' : 'AUTO'}
                </span>
              </span>
              <span className="flex items-center gap-1 text-cyan-300 font-bold">
                <Zap className="w-3 h-3 fill-current" />
                <span ref={desktopNitroPctRef}>{nitro}%</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* MOBILE: Ultra-Clean Ergonomic Thumb-Zone Controls + Integrated Bottom-Center Arc */
        <div
          className="fixed inset-0 z-40 pointer-events-none select-none"
          style={{ touchAction: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Compact Integrated Arc Speedometer + Gear + Curved Nitro (Bottom-Center clear zone) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            style={{ bottom: 'max(10px, env(safe-area-inset-bottom, 10px))' }}
          >
            <div className="relative backdrop-blur-md bg-black/40 border border-white/15 rounded-2xl px-3 pt-1.5 pb-1 shadow-xl flex flex-col items-center">
              <svg width="102" height="54" viewBox="0 0 102 54" className="overflow-visible">
                <path
                  d="M 9 50 A 42 42 0 0 1 93 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                />
                <path
                  ref={mobileSpeedArcRef}
                  d="M 9 50 A 42 42 0 0 1 93 50"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={MOBILE_SPEED_ARC_LEN}
                  strokeDashoffset={MOBILE_SPEED_ARC_LEN * (1 - Math.min(1, speed / 260))}
                />
                <path
                  d="M 19 50 A 32 32 0 0 1 83 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  ref={mobileNitroArcRef}
                  d="M 19 50 A 32 32 0 0 1 83 50"
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={MOBILE_NITRO_ARC_LEN}
                  strokeDashoffset={MOBILE_NITRO_ARC_LEN * (1 - nitro / 100)}
                />
              </svg>

              <div className="absolute top-[19px] inset-x-0 flex flex-col items-center">
                <span
                  ref={mobileSpeedRef}
                  className="text-xl font-black italic font-['Chakra_Petch',sans-serif] text-white tabular-nums leading-none"
                >
                  {speed}
                </span>
                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-300 mt-0.5 tabular-nums">
                  <span>KM/H</span>
                  <span className="text-amber-400 font-bold" ref={mobileGearRef}>
                    G{currentGear}
                  </span>
                </div>
              </div>
            </div>

            {/* Compact Manual Shifting Bar (Rendered ONLY when Manual Transmission is active) */}
            {transmission === 'manual' && (
              <div
                className="mt-1.5 flex items-center gap-1.5 pointer-events-auto backdrop-blur-md bg-black/50 border border-white/15 rounded-xl p-1"
                style={{ touchAction: 'none' }}
              >
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    onTouchClutch?.(true);
                  }}
                  onPointerUp={() => onTouchClutch?.(false)}
                  onPointerCancel={() => onTouchClutch?.(false)}
                  className={`min-h-[38px] px-2.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    clutch ? 'bg-amber-500 text-zinc-950' : 'bg-white/10 text-zinc-200'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  CLUTCH
                </button>
                <button
                  type="button"
                  onClick={onShiftDown}
                  className="min-w-[38px] min-h-[38px] rounded-lg bg-white/10 active:bg-amber-500 active:text-zinc-950 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                  aria-label="Downshift"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={onShiftUp}
                  className="min-w-[38px] min-h-[38px] rounded-lg bg-white/10 active:bg-amber-500 active:text-zinc-950 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                  aria-label="Upshift"
                >
                  ▲
                </button>
              </div>
            )}
          </div>

          {/* BOTTOM-LEFT: ONLY Left & Right Steering Arrows (opacity-45 idle, brightens on touch) */}
          <div
            className="absolute flex items-center gap-[clamp(8px,2vw,14px)] pointer-events-auto"
            style={{
              bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
              left: 'max(14px, env(safe-area-inset-left, 14px))',
              touchAction: 'none',
            }}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                onTouchLeft ? onTouchLeft(true) : onTouchSteer?.('left');
              }}
              onPointerUp={() => (onTouchLeft ? onTouchLeft(false) : onTouchSteer?.(null))}
              onPointerCancel={() => (onTouchLeft ? onTouchLeft(false) : onTouchSteer?.(null))}
              className="w-[clamp(56px,13vw,74px)] h-[clamp(56px,15vh,74px)] backdrop-blur-md bg-black/55 border border-white/25 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-xl opacity-45 active:opacity-100 active:bg-amber-500 active:text-zinc-950 active:border-amber-300 active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
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
              className="w-[clamp(56px,13vw,74px)] h-[clamp(56px,15vh,74px)] backdrop-blur-md bg-black/55 border border-white/25 text-white font-black text-2xl rounded-2xl flex items-center justify-center shadow-xl opacity-45 active:opacity-100 active:bg-amber-500 active:text-zinc-950 active:border-amber-300 active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
              style={{ touchAction: 'none' }}
              aria-label="Steer Right"
            >
              ▶
            </button>
          </div>

          {/* BOTTOM-RIGHT: ONLY Compact Nitro/Drift + Brake + Gas Pedals */}
          <div
            className="absolute flex items-end gap-[clamp(6px,1.5vw,10px)] pointer-events-auto"
            style={{
              bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
              right: 'max(14px, env(safe-area-inset-right, 14px))',
              touchAction: 'none',
            }}
          >
            {/* Compact Nitro & Drift Pair */}
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
                className="w-[clamp(48px,10.5vw,60px)] h-[clamp(46px,11vh,58px)] backdrop-blur-md bg-black/55 border border-cyan-400/50 text-cyan-300 font-black italic text-[10px] font-['Chakra_Petch',sans-serif] rounded-2xl flex flex-col items-center justify-center shadow-lg opacity-55 active:opacity-100 active:bg-cyan-400 active:text-zinc-950 active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
                style={{ touchAction: 'none' }}
                aria-label="Nitro Boost"
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
                className="w-[clamp(48px,10.5vw,60px)] h-[clamp(46px,11vh,58px)] backdrop-blur-md bg-black/55 border border-amber-400/50 text-amber-300 font-black italic text-[10px] font-['Chakra_Petch',sans-serif] rounded-2xl flex flex-col items-center justify-center shadow-lg opacity-55 active:opacity-100 active:bg-amber-400 active:text-zinc-950 active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
                style={{ touchAction: 'none' }}
                aria-label="Handbrake Drift"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>DRIFT</span>
              </button>
            </div>

            {/* Brake & Gas Pedals */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                onTouchBrake?.(true);
              }}
              onPointerUp={() => onTouchBrake?.(false)}
              onPointerCancel={() => onTouchBrake?.(false)}
              className="w-[clamp(48px,11vw,62px)] h-[clamp(66px,17vh,92px)] backdrop-blur-md bg-black/55 border border-rose-400/50 text-rose-200 font-black italic text-[11px] font-['Chakra_Petch',sans-serif] rounded-2xl flex flex-col items-center justify-center shadow-xl opacity-55 active:opacity-100 active:bg-rose-500 active:text-white active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
              style={{ touchAction: 'none' }}
              aria-label="Brake or Reverse"
            >
              <span>BRAKE</span>
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
              className="w-[clamp(56px,12.5vw,72px)] h-[clamp(86px,22vh,120px)] backdrop-blur-md bg-black/55 border border-emerald-400/55 text-emerald-200 font-black italic text-sm font-['Chakra_Petch',sans-serif] rounded-2xl flex flex-col items-center justify-center shadow-2xl opacity-60 active:opacity-100 active:bg-emerald-400 active:text-zinc-950 active:scale-95 transition-[opacity,transform] duration-100 select-none cursor-pointer"
              style={{ touchAction: 'none' }}
              aria-label="Gas Pedal"
            >
              <span>GAS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
