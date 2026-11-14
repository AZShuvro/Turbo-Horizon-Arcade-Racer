import React, { useState } from 'react';
import {
  Play,
  SlidersHorizontal,
  MapPin,
  X,
  Check,
  Compass,
  Flame,
  Clock,
  Coins,
  Settings,
  Lock,
  ShieldAlert,
  User,
  Users,
  Maximize2,
  Minimize2,
  Wrench,
  Trophy,
  Palette,
  Car,
} from 'lucide-react';
import {
  CarStats,
  GameMode,
  GraphicsQuality,
  TrackId,
  CarUpgrades,
  PlayerProfile,
  Achievement,
  CarStance,
  EngineAudioProfile,
  WorldRecords,
} from '../types/game';
import {
  CARS_CATALOG,
  COLOR_PALETTES,
  DECAL_OPTIONS,
  STRIPE_COLOR_PALETTES,
  TRACKS_CATALOG,
  UPGRADE_CONFIG,
  DEFAULT_CAR_STANCE,
  ENGINE_AUDIO_PROFILES,
} from '../data/cars';

interface TitleScreenProps {
  currentCar: CarStats;
  selectedTrack: TrackId;
  selectedMode: GameMode;
  selectedQuality: GraphicsQuality;
  highScore: number;
  totalCoins: number;
  unlockedCars: string[];
  unlockedTracks: string[];
  carUpgrades: CarUpgrades;
  achievements: Achievement[];
  onBuyUpgrade: (category: 'engine' | 'handling' | 'nitro') => boolean;
  onSelectCar: (car: CarStats) => void;
  onUpdateCarCustomization: (updates: Partial<CarStats>) => void;
  onSelectTrack: (trackId: TrackId) => void;
  onSelectMode: (mode: GameMode) => void;
  onSelectQuality: (q: GraphicsQuality) => void;
  onUnlockCar: (carId: string, price: number) => boolean;
  onUnlockTrack: (trackId: TrackId, price: number) => boolean;
  onOpenSettings: () => void;
  onStartGame: () => void;
  profile: PlayerProfile;
  onlineRoomCode?: string | null;
  onOpenProfile: () => void;
  onOpenMultiplayer: () => void;
  isMobileDevice?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onStartFullscreenRace?: () => void;
  carStance?: CarStance;
  onChangeCarStance?: (s: CarStance) => void;
  engineAudioProfile?: EngineAudioProfile;
  onChangeEngineAudioProfile?: (p: EngineAudioProfile) => void;
  worldRecords?: WorldRecords;
}

type ActiveDrawer = 'garage' | 'upgrades' | 'missions' | 'tracks' | null;

export const TitleScreen: React.FC<TitleScreenProps> = ({
  currentCar,
  selectedTrack,
  selectedMode,
  selectedQuality,
  highScore,
  totalCoins,
  unlockedCars,
  unlockedTracks,
  carUpgrades,
  achievements,
  onBuyUpgrade,
  onSelectCar,
  onUpdateCarCustomization,
  onSelectTrack,
  onSelectMode,
  onSelectQuality,
  onUnlockCar,
  onUnlockTrack,
  onOpenSettings,
  onStartGame,
  profile,
  onlineRoomCode,
  onOpenProfile,
  onOpenMultiplayer,
  isMobileDevice = false,
  isFullscreen = false,
  onToggleFullscreen,
  onStartFullscreenRace,
  carStance = DEFAULT_CAR_STANCE,
  onChangeCarStance,
  engineAudioProfile = 'street_v6',
  onChangeEngineAudioProfile,
}) => {
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [garageSubTab, setGarageSubTab] = useState<'vehicles' | 'paint' | 'decals' | 'stance'>('vehicles');

  const toggleDrawer = (drawer: ActiveDrawer) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  const activeTrackObj = TRACKS_CATALOG.find((t) => t.id === selectedTrack) || TRACKS_CATALOG[0];
  const unlockedMissionsCount = achievements.filter((a) => a.unlocked).length;
  const usesLinearTrack = selectedMode !== 'openWorld' && selectedMode !== 'zen';

  const modeItems: { id: GameMode | 'online_btn'; label: string; icon: React.ReactNode }[] = [
    { id: 'openWorld', label: 'Open World', icon: <Compass className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'policeChase', label: 'Pursuit', icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'arcade', label: 'Arcade', icon: <Flame className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'timeAttack', label: 'Time Trial', icon: <Clock className="w-3.5 h-3.5 shrink-0" /> },
    { id: 'zen', label: 'Free Cruise', icon: <Car className="w-3.5 h-3.5 shrink-0" /> },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between hud-safe-inset select-none z-20 font-['Outfit',sans-serif]">
      {/* 1. TOP PERIMETER: Clean Brand Wordmark & Single Glass Profile/Currency Pill */}
      <div className="flex items-start justify-between gap-3 w-full pointer-events-auto">
        {/* Top-Left: Clean Racing Wordmark + Unboxed Best Score */}
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-3xl font-black italic tracking-wider text-white font-['Chakra_Petch',sans-serif] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] whitespace-nowrap">
            TURBO <span className="text-amber-400">HORIZON</span>
          </h1>
          {highScore > 0 && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300/90 tabular-nums drop-shadow">
              <span>BEST</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold">{highScore.toLocaleString()} PTS</span>
            </div>
          )}
        </div>

        {/* Top-Right: Single Translucent Glassmorphic Utility Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 backdrop-blur-md bg-black/40 border border-white/15 rounded-full px-2.5 sm:px-3.5 py-1.5 shadow-xl">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-white/10 text-xs font-medium text-white transition-colors cursor-pointer min-h-[36px]"
            title="Driver Profile"
          >
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: profile.tagColor }} />
            <span className="max-w-[90px] sm:max-w-[120px] truncate">{profile.username}</span>
          </button>

          <span className="h-4 w-px bg-white/15" aria-hidden="true" />

          <div className="flex items-center gap-1.5 px-1.5 text-xs sm:text-sm font-black italic font-['Chakra_Petch',sans-serif] text-amber-400 tabular-nums">
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span>{totalCoins.toLocaleString()}</span>
          </div>

          <span className="h-4 w-px bg-white/15 hidden sm:block" aria-hidden="true" />

          {/* Quality Quick Pill (Desktop) */}
          <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono">
            {(['low', 'balanced', 'high'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSelectQuality(q)}
                className={`px-2 py-1 rounded-full uppercase transition-colors cursor-pointer ${
                  selectedQuality === q
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {q === 'low' ? 'ECO' : q}
              </button>
            ))}
          </div>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="min-w-[36px] min-h-[36px] p-1.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="min-w-[36px] min-h-[36px] p-1.5 rounded-full text-zinc-200 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
            title="Settings & Controls"
            aria-label="Open Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MIDDLE SHOWROOM VIEWPORT: 80%+ Unobstructed 3D Rotating Car */}
      <div className="relative flex-1 flex items-center justify-between pointer-events-none my-2">
        {/* Left Edge Floating Mode Selector Rail (Desktop / Landscape Tablet) */}
        <div className="hidden md:flex flex-col gap-1 backdrop-blur-md bg-black/40 border border-white/15 rounded-2xl p-1.5 shadow-2xl pointer-events-auto">
          {modeItems.map((m) => {
            const active = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id as GameMode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap min-h-[38px] ${
                  active
                    ? m.id === 'policeChase'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}

          <div className="h-px bg-white/10 my-0.5" />

          <button
            type="button"
            onClick={onOpenMultiplayer}
            className={`px-3 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap min-h-[38px] ${
              onlineRoomCode
                ? 'bg-cyan-500 text-zinc-950 shadow-md'
                : 'text-cyan-300 hover:bg-cyan-500/15'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{onlineRoomCode ? `Room ${onlineRoomCode}` : 'Online'}</span>
          </button>
        </div>

        {/* Mobile Non-Fullscreen Quick Prompt (Tucked upper-left so center 3D car stays clear) */}
        {isMobileDevice && !isFullscreen && onToggleFullscreen && (
          <div className="md:hidden self-start pointer-events-auto">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="px-3.5 py-2 backdrop-blur-md bg-cyan-500/90 hover:bg-cyan-400 active:scale-95 text-zinc-950 font-black italic text-xs tracking-wider rounded-full shadow-lg flex items-center gap-1.5 font-['Chakra_Petch',sans-serif] cursor-pointer min-h-[40px]"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>FULLSCREEN</span>
            </button>
          </div>
        )}

        {/* Single Slide-Over Drawer (Only ONE open at a time, leaving showroom visible) */}
        {activeDrawer && (
          <div className="ml-auto w-full sm:w-[400px] max-h-full backdrop-blur-xl bg-black/65 border border-white/15 rounded-2xl p-4 shadow-2xl pointer-events-auto flex flex-col gap-3 animate-drawer-in overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                {activeDrawer === 'garage' && <Car className="w-4 h-4 text-amber-400" />}
                {activeDrawer === 'upgrades' && <Wrench className="w-4 h-4 text-amber-400" />}
                {activeDrawer === 'missions' && <Trophy className="w-4 h-4 text-amber-400" />}
                {activeDrawer === 'tracks' && <MapPin className="w-4 h-4 text-cyan-400" />}
                <h2 className="text-sm font-black italic font-['Chakra_Petch',sans-serif] text-white uppercase tracking-wider">
                  {activeDrawer === 'garage'
                    ? 'Car Garage'
                    : activeDrawer === 'upgrades'
                    ? 'Performance Tuning'
                    : activeDrawer === 'missions'
                    ? `Missions (${unlockedMissionsCount}/${achievements.length})`
                    : 'Select Circuit'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="min-w-[36px] min-h-[36px] p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DRAWER 1: GARAGE (Vehicles / Paint / Decals / Stance) */}
            {activeDrawer === 'garage' && (
              <>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white/5 shrink-0">
                  {(
                    [
                      { id: 'vehicles', label: 'Vehicles' },
                      { id: 'paint', label: 'Paint' },
                      { id: 'decals', label: 'Decals' },
                      { id: 'stance', label: 'Stance' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGarageSubTab(t.id)}
                      className={`py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                        garageSubTab === t.id
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[44vh] sm:max-h-[52vh]">
                  {garageSubTab === 'vehicles' &&
                    CARS_CATALOG.map((car) => {
                      const isSelected = car.id === currentCar.id;
                      const isUnlocked = unlockedCars.includes(car.id) || car.price === 0;
                      const canAfford = totalCoins >= car.price;
                      return (
                        <div
                          key={car.id}
                          className={`p-3 rounded-xl border transition-colors flex flex-col gap-2 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400/70'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold italic font-['Chakra_Petch',sans-serif] text-sm text-white">
                              {car.name}
                            </span>
                            <span className="text-[11px] font-mono tabular-nums text-zinc-300">
                              {Math.round(car.topSpeed * 2.5)} KM/H
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{car.description}</p>
                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => onSelectCar(car)}
                              className={`w-full min-h-[38px] py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-zinc-950'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select Car'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUnlockCar(car.id, car.price)}
                              disabled={!canAfford}
                              className={`w-full min-h-[38px] py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                                canAfford
                                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                                  : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                              }`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span className="tabular-nums">Unlock · {car.price}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                  {garageSubTab === 'paint' && (
                    <div className="space-y-3 pt-1">
                      <span className="text-xs text-zinc-400 block">Body Paint Finish</span>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {COLOR_PALETTES.map((pal) => (
                          <button
                            key={pal.name}
                            type="button"
                            onClick={() =>
                              onUpdateCarCustomization({
                                primaryColor: pal.primary,
                                accentColor: pal.accent,
                              })
                            }
                            className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                              currentCar.primaryColor.toLowerCase() === pal.primary.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-white/20'
                            }`}
                            style={{ backgroundColor: pal.primary }}
                            title={pal.name}
                          >
                            {currentCar.primaryColor.toLowerCase() === pal.primary.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                        <label className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-xs text-zinc-200 cursor-pointer min-h-[38px]">
                          <input
                            type="color"
                            value={currentCar.primaryColor}
                            onChange={(e) => onUpdateCarCustomization({ primaryColor: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <span>Custom</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {garageSubTab === 'decals' && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        {DECAL_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => onUpdateCarCustomization({ decalType: opt.id })}
                            className={`p-2.5 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                              currentCar.decalType === opt.id
                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                            }`}
                          >
                            <div className="font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {currentCar.decalType !== 'none' && (
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {STRIPE_COLOR_PALETTES.map((s) => (
                            <button
                              key={s.name}
                              type="button"
                              onClick={() => onUpdateCarCustomization({ stripeColor: s.hex })}
                              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                                currentCar.stripeColor.toLowerCase() === s.hex.toLowerCase()
                                  ? 'border-amber-400 scale-110'
                                  : 'border-white/20'
                              }`}
                              style={{ backgroundColor: s.hex }}
                              title={s.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {garageSubTab === 'stance' && onChangeCarStance && (
                    <div className="space-y-4 pt-1">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">Ride Height</span>
                          <span className="font-mono tabular-nums text-amber-400 font-bold">
                            {carStance.rideHeight > 0 ? '+' : ''}
                            {carStance.rideHeight.toFixed(2)}m
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-0.14}
                          max={0.2}
                          step={0.01}
                          value={carStance.rideHeight}
                          onChange={(e) =>
                            onChangeCarStance({
                              ...carStance,
                              rideHeight: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>Slammed</span>
                          <span>Stock (0.00)</span>
                          <span>Rally Lift</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">Wheel Camber</span>
                          <span className="font-mono tabular-nums text-cyan-300 font-bold">
                            {carStance.camberDeg > 0 ? '+' : ''}
                            {carStance.camberDeg.toFixed(1)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-10}
                          max={2}
                          step={0.5}
                          value={carStance.camberDeg}
                          onChange={(e) =>
                            onChangeCarStance({
                              ...carStance,
                              camberDeg: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                          <span>-10° Track</span>
                          <span>-2° Sport</span>
                          <span>+2° Tilt</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onChangeCarStance(DEFAULT_CAR_STANCE)}
                        className="w-full min-h-[38px] py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-zinc-200 cursor-pointer transition-colors"
                      >
                        Reset Stock Stance
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* DRAWER 2: UPGRADES & ENGINE SOUND PROFILE */}
            {activeDrawer === 'upgrades' && (
              <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[48vh] sm:max-h-[54vh]">
                {onChangeEngineAudioProfile && (
                  <div className="p-3 rounded-xl border border-cyan-400/25 bg-cyan-950/25 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-['Chakra_Petch',sans-serif] text-cyan-300 uppercase">
                        Engine & Turbo Audio
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">EXHAUST NOTE</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ENGINE_AUDIO_PROFILES.map((prof) => {
                        const active = engineAudioProfile === prof.id;
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => onChangeEngineAudioProfile(prof.id)}
                            className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer flex flex-col items-center gap-0.5 ${
                              active
                                ? 'bg-cyan-400 border-cyan-300 text-zinc-950'
                                : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate max-w-full">{prof.name}</span>
                            <span
                              className={`text-[9px] font-mono font-normal ${
                                active ? 'text-zinc-900' : 'text-zinc-400'
                              }`}
                            >
                              {prof.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(['engine', 'handling', 'nitro'] as const).map((cat) => {
                  const config = UPGRADE_CONFIG[cat];
                  const currentLvl = carUpgrades ? carUpgrades[cat] : 0;
                  const isMax = currentLvl >= config.levels.length - 1;
                  const nextConfig = !isMax ? config.levels[currentLvl + 1] : null;
                  const canAfford = nextConfig ? totalCoins >= nextConfig.cost : false;

                  return (
                    <div
                      key={cat}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold font-['Chakra_Petch',sans-serif] text-white uppercase">
                          {config.name}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-amber-400 font-bold">
                          {isMax ? 'MAX' : `STAGE ${currentLvl}/4`}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{config.desc}</p>
                      <div className="flex items-center gap-1.5">
                        {config.levels.map((lvl) => (
                          <div
                            key={lvl.level}
                            className={`h-1.5 flex-1 rounded-full ${
                              lvl.level <= currentLvl ? 'bg-amber-400' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      {!isMax && nextConfig ? (
                        <button
                          type="button"
                          onClick={() => onBuyUpgrade(cat)}
                          disabled={!canAfford}
                          className={`w-full min-h-[38px] py-1.5 rounded-lg text-xs font-bold font-mono tabular-nums flex items-center justify-center gap-1.5 transition-colors ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                              : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Upgrade · {nextConfig.cost}</span>
                        </button>
                      ) : (
                        <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Fully Tuned
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* DRAWER 3: MISSIONS & TROPHIES */}
            {activeDrawer === 'missions' && (
              <div className="overflow-y-auto pr-1 space-y-2 max-h-[48vh] sm:max-h-[54vh]">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      ach.unlocked
                        ? 'bg-amber-500/15 border-amber-400/50'
                        : 'bg-white/5 border-white/10 opacity-75'
                    }`}
                  >
                    <div className="text-xl shrink-0">{ach.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate">{ach.title}</span>
                        {ach.unlocked ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
                            DONE
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-400 font-bold tabular-nums shrink-0">
                            +{ach.rewardCoins}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DRAWER 4: CIRCUIT TRACKS */}
            {activeDrawer === 'tracks' && (
              <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[48vh] sm:max-h-[54vh]">
                {TRACKS_CATALOG.map((track) => {
                  const isSelected = track.id === selectedTrack;
                  const isUnlocked = unlockedTracks.includes(track.id) || track.price === 0;
                  const canAfford = totalCoins >= track.price;
                  return (
                    <div
                      key={track.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400/70'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold italic font-['Chakra_Petch',sans-serif] text-sm text-white">
                          {track.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{track.difficulty}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{track.description}</p>
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTrack(track.id);
                            setActiveDrawer(null);
                          }}
                          className={`w-full min-h-[38px] py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-400 text-zinc-950'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Circuit'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUnlockTrack(track.id, track.price)}
                          disabled={!canAfford}
                          className={`w-full min-h-[38px] py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer'
                              : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span className="tabular-nums">Unlock · {track.price}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BOTTOM FLOATING DOCK: Car Identity + Collapsible Drawers + Primary RACE CTA */}
      <div className="flex flex-col gap-2 w-full pointer-events-auto">
        {/* Mobile Horizontal Mode Strip (Cleanly hidden on md+ where left rail shows) */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {modeItems.map((m) => {
            const active = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id as GameMode)}
                className={`px-3 py-2 rounded-full backdrop-blur-md border text-xs font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[40px] ${
                  active
                    ? m.id === 'policeChase'
                      ? 'bg-rose-500 border-rose-400 text-white'
                      : 'bg-amber-500 border-amber-400 text-zinc-950'
                    : 'bg-black/45 border-white/15 text-zinc-200'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onOpenMultiplayer}
            className={`px-3 py-2 rounded-full backdrop-blur-md border text-xs font-bold tracking-wide transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[40px] ${
              onlineRoomCode
                ? 'bg-cyan-500 border-cyan-300 text-zinc-950'
                : 'bg-black/45 border-white/15 text-cyan-300'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{onlineRoomCode ? onlineRoomCode : 'Online'}</span>
          </button>
        </div>

        {/* Main Glassmorphic Floating Bottom Bar */}
        <div className="flex items-center justify-between gap-2 backdrop-blur-md bg-black/45 border border-white/15 rounded-2xl p-2 sm:px-4 sm:py-2.5 shadow-2xl">
          {/* Selected Car Identity (Unboxed Italic Typography) */}
          <div className="hidden sm:flex flex-col min-w-0 pr-2">
            <span className="text-sm font-black italic font-['Chakra_Petch',sans-serif] text-white truncate">
              {currentCar.name}
            </span>
            <span className="text-[11px] font-mono text-zinc-300 tabular-nums">
              {Math.round(currentCar.topSpeed * 2.5)} KM/H ·{' '}
              {usesLinearTrack ? activeTrackObj.name : '4-Zone Open World'}
            </span>
          </div>

          {/* Drawer Tabs (Mutually exclusive, 1 open at a time) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => toggleDrawer('garage')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeDrawer === 'garage'
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Garage</span>
            </button>

            <button
              type="button"
              onClick={() => toggleDrawer('upgrades')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeDrawer === 'upgrades'
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Upgrades</span>
            </button>

            <button
              type="button"
              onClick={() => toggleDrawer('missions')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeDrawer === 'missions'
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Missions</span>
            </button>

            {usesLinearTrack && (
              <button
                type="button"
                onClick={() => toggleDrawer('tracks')}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeDrawer === 'tracks'
                    ? 'bg-white/20 text-white'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Track</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden sm:flex min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer items-center gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              <span>Settings</span>
            </button>
          </div>

          {/* Primary Start CTA */}
          <button
            type="button"
            onClick={
              isMobileDevice && !isFullscreen && onStartFullscreenRace ? onStartFullscreenRace : onStartGame
            }
            className="min-h-[44px] px-5 sm:px-7 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-black italic text-sm sm:text-base tracking-wider rounded-xl transition-all flex items-center gap-2 font-['Chakra_Petch',sans-serif] shadow-[0_0_24px_rgba(245,158,11,0.4)] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>{isMobileDevice && !isFullscreen ? 'START' : 'RACE'}</span>
          </button>
        </div>

        {/* Desktop-only subtle control legend (Completely hidden on mobile/touch) */}
        {!isMobileDevice && (
          <div className="hidden lg:flex items-center justify-center gap-3 text-[11px] font-mono text-zinc-400/80">
            <span>Drive: WASD / Arrows</span>
            <span aria-hidden="true">·</span>
            <span>Drift: Space</span>
            <span aria-hidden="true">·</span>
            <span>Nitro: Shift</span>
            <span aria-hidden="true">·</span>
            <span>Map: M</span>
            <span aria-hidden="true">·</span>
            <span>Camera: C</span>
          </div>
        )}
      </div>
    </div>
  );
};
