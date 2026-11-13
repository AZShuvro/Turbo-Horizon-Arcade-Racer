import React, { useState } from 'react';
import {
  Play,
  Volume2,
  VolumeX,
  Music,
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
} from 'lucide-react';
import { CarStats, GameMode, GraphicsQuality, TrackId, CarUpgrades, PlayerProfile } from '../types/game';
import {
  CARS_CATALOG,
  COLOR_PALETTES,
  DECAL_OPTIONS,
  STRIPE_COLOR_PALETTES,
  TRACKS_CATALOG,
  UPGRADE_CONFIG,
} from '../data/cars';
import { soundManager } from '../audio/soundManager';

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
}


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
}) => {
  const [drawerOpen, setDrawerOpen] = useState<'customizer' | 'tracks' | null>(null);
  const [customizerSubTab, setCustomizerSubTab] = useState<'paint' | 'stripes' | 'cars' | 'upgrades'>('paint');


  const [muted, setMuted] = useState(soundManager.getMuted());
  const [musicOn, setMusicOn] = useState(soundManager.isMusicOn());

  const handleToggleMute = () => {
    const isM = soundManager.toggleMute();
    setMuted(isM);
  };

  const handleToggleMusic = () => {
    const isM = soundManager.toggleMusic();
    setMusicOn(isM);
  };

  const activeTrackObj = TRACKS_CATALOG.find((t) => t.id === selectedTrack) || TRACKS_CATALOG[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 md:p-8 select-none z-20 font-sans">
      {/* 1. TOP HEADER: Clean minimalist luxury branding & settings */}
      <div className="flex flex-wrap items-start justify-between gap-2 w-full pointer-events-auto">
        {/* Title Lockup */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 bg-amber-500 rounded-sm" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white font-['Chakra_Petch',sans-serif] uppercase">
              TURBO HORIZON
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-[11px] font-mono text-zinc-400">
            <span>LOW-POLY ARCADE RACING</span>
            {highScore > 0 && (
              <>
                <span className="text-zinc-600">/</span>
                <span className="text-amber-400 font-bold tabular-nums">
                  BEST: {highScore.toLocaleString()} PTS
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Right Settings Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl sm:rounded-full px-2.5 sm:px-3 py-1.5 shadow-sm max-w-full">
          {/* Driver Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400 rounded-full text-xs font-mono font-bold text-white transition-colors cursor-pointer"
            title="Edit Driver Username & Profile"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: profile.tagColor }}
            />
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[110px] truncate">{profile.username}</span>
          </button>

          {/* Coin balance */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
            <Coins className="w-3.5 h-3.5 fill-current" />
            <span>{totalCoins.toLocaleString()}</span>
          </div>

          {/* Quality Switcher */}
          <div className="flex items-center gap-1 text-[11px] font-mono pr-2 border-r border-zinc-800">
            {(['low', 'balanced', 'high'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => onSelectQuality(q)}
                className={`px-2 py-0.5 rounded-full uppercase transition-colors cursor-pointer ${
                  selectedQuality === q
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {q === 'low' ? 'ECO 60' : q}
              </button>
            ))}
          </div>

          {/* Audio toggles */}
          <button
            onClick={handleToggleMusic}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              musicOn ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-400'
            }`}
            title={musicOn ? 'Mute Music' : 'Enable Music'}
          >
            <Music className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              !muted ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-zinc-400'
            }`}
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Settings Modal Open */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Open Settings & Keybindings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-full text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Landscape)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 2. HERO CAR BADGE & MOBILE FULLSCREEN PROMPT */}
      <div className="w-full flex flex-col items-center gap-3 pointer-events-auto">
        {isMobileDevice && !isFullscreen && onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-zinc-950 font-black text-xs sm:text-sm tracking-wider rounded-2xl shadow-[0_0_24px_rgba(6,182,212,0.45)] flex items-center gap-2.5 font-['Chakra_Petch',sans-serif] cursor-pointer transition-all min-h-[44px]"
          >
            <Maximize2 className="w-4 h-4 shrink-0" />
            <span>PLAY IN FULLSCREEN (LANDSCAPE)</span>
          </button>
        )}

        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-full px-4 sm:px-5 py-1.5 sm:py-2 flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-mono shadow-lg max-w-full overflow-hidden">
          <span className="font-bold font-['Chakra_Petch',sans-serif] text-xs sm:text-sm text-white truncate">
            {currentCar.name}
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-300 whitespace-nowrap">
            {Math.round(currentCar.topSpeed * 2.5)} KM/H
          </span>
          <span className="text-zinc-500 hidden sm:inline">|</span>
          <span className="text-amber-400 capitalize hidden sm:inline">
            {currentCar.decalType.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* 3. CLEAN BOTTOM BAR: Mode selector, Drawer toggles & Start CTA */}
      <div className="flex flex-col items-center gap-3 w-full max-w-5xl mx-auto pointer-events-auto">
        {/* Main Dock Bar */}
        <div className="w-full bg-zinc-950/85 border border-zinc-800/90 rounded-2xl p-2.5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Mode Selector (Clean segmented pills) */}
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-xl p-1 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => onSelectMode('openWorld')}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedMode === 'openWorld'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>OPEN WORLD</span>
            </button>

            <button
              onClick={() => onSelectMode('policeChase')}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedMode === 'policeChase'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-rose-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>POLICE CHASE</span>
            </button>

            <button
              onClick={() => onSelectMode('arcade')}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedMode === 'arcade'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>ARCADE</span>
            </button>

            <button
              onClick={() => onSelectMode('timeAttack')}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedMode === 'timeAttack'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>TIME ATTACK</span>
            </button>

            <button
              onClick={() => onSelectMode('zen')}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedMode === 'zen'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              FREE CRUISE
            </button>

            <button
              onClick={onOpenMultiplayer}
              className={`px-3 py-2 rounded-lg text-xs font-bold font-['Chakra_Petch',sans-serif] tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                onlineRoomCode
                  ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                  : 'text-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{onlineRoomCode ? `ONLINE (${onlineRoomCode})` : 'ONLINE RACING'}</span>
            </button>
          </div>

          {/* Quick Action Drawers: Customize & Track & Settings */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Customizer Drawer Button */}
            <button
              onClick={() => setDrawerOpen(drawerOpen === 'customizer' ? null : 'customizer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer flex items-center gap-2 ${
                drawerOpen === 'customizer'
                  ? 'bg-zinc-800 border-amber-500 text-white'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Garage</span>
            </button>

            {/* Track Selector Button (only for linear circuit modes) */}
            {selectedMode !== 'openWorld' && selectedMode !== 'zen' && (
              <button
                onClick={() => setDrawerOpen(drawerOpen === 'tracks' ? null : 'tracks')}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer flex items-center gap-2 ${
                  drawerOpen === 'tracks'
                    ? 'bg-zinc-800 border-amber-500 text-white'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Track: {activeTrackObj.name.split(' ')[0]}</span>
              </button>
            )}

            {/* Primary Start CTA */}
            <button
              onClick={isMobileDevice && !isFullscreen && onStartFullscreenRace ? onStartFullscreenRace : onStartGame}
              className="px-5 sm:px-6 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs sm:text-sm tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-2 font-['Chakra_Petch',sans-serif] shadow-[0_0_16px_rgba(245,158,11,0.3)] cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>
                {isMobileDevice && !isFullscreen ? 'TAP TO START (FULLSCREEN)' : 'RACE'}
              </span>
              {!isMobileDevice && (
                <kbd className="text-[10px] bg-zinc-950/20 text-zinc-900 px-1.5 py-0.5 rounded font-mono font-bold">
                  SPACE
                </kbd>
              )}
            </button>
          </div>
        </div>

        {/* Minimal flat control line */}
        <div className="hidden md:block text-[11px] font-mono text-zinc-500 tracking-wider">
          WASD / Arrows to Drive · Space Drift · Nitro (Shift/N) · M World Map · C Camera · L Lights · B Radio
        </div>
      </div>

      {/* 4. ON-DEMAND SLIDE-UP DRAWER: CAR CUSTOMIZER */}
      {drawerOpen === 'customizer' && (
        <div className="absolute inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bottom-24 w-full md:max-w-2xl bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 shadow-2xl pointer-events-auto z-30 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold font-['Chakra_Petch',sans-serif] text-white uppercase tracking-wider">
                Vehicle Garage & Customizer
              </h2>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 text-xs font-mono">
              <button
                onClick={() => setCustomizerSubTab('paint')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  customizerSubTab === 'paint'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Paint
              </button>
              <button
                onClick={() => setCustomizerSubTab('stripes')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  customizerSubTab === 'stripes'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Decals
              </button>
              <button
                onClick={() => setCustomizerSubTab('cars')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  customizerSubTab === 'cars'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Vehicles
              </button>
              <button
                onClick={() => setCustomizerSubTab('upgrades')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  customizerSubTab === 'upgrades'
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Performance
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenProfile}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-400 text-[11px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Edit Driver Profile"
              >
                <User className="w-3 h-3 text-amber-400" />
                <span>{profile.username}</span>
              </button>
              <button
                onClick={() => setDrawerOpen(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Paint Color */}
          {customizerSubTab === 'paint' && (
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Primary Body Paint
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.name}
                    onClick={() =>
                      onUpdateCarCustomization({
                        primaryColor: pal.primary,
                        accentColor: pal.accent,
                      })
                    }
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                      currentCar.primaryColor.toLowerCase() === pal.primary.toLowerCase()
                        ? 'border-white scale-110 shadow-md'
                        : 'border-zinc-700'
                    }`}
                    style={{ backgroundColor: pal.primary }}
                    title={pal.name}
                  >
                    {currentCar.primaryColor.toLowerCase() === pal.primary.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    )}
                  </button>
                ))}

                <label className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-300 hover:border-amber-400 cursor-pointer">
                  <input
                    type="color"
                    value={currentCar.primaryColor}
                    onChange={(e) => onUpdateCarCustomization({ primaryColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span>Custom Hex</span>
                </label>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Stripes & Decals */}
          {customizerSubTab === 'stripes' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Racing Stripe Style
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DECAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateCarCustomization({ decalType: opt.id })}
                      className={`p-2.5 rounded-xl border text-xs font-mono text-left transition-colors cursor-pointer ${
                        currentCar.decalType === opt.id
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-slate-100">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {currentCar.decalType !== 'none' && (
                <div>
                  <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                    Stripe Color
                  </span>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {STRIPE_COLOR_PALETTES.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => onUpdateCarCustomization({ stripeColor: s.hex })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                          currentCar.stripeColor.toLowerCase() === s.hex.toLowerCase()
                            ? 'border-amber-400 scale-110'
                            : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: s.hex }}
                        title={s.name}
                      >
                        {currentCar.stripeColor.toLowerCase() === s.hex.toLowerCase() && (
                          <Check className="w-3 h-3 text-amber-400 drop-shadow" />
                        )}
                      </button>
                    ))}

                    <label className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300 cursor-pointer">
                      <input
                        type="color"
                        value={currentCar.stripeColor}
                        onChange={(e) => onUpdateCarCustomization({ stripeColor: e.target.value })}
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Car Models & Unlocks */}
          {customizerSubTab === 'cars' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {CARS_CATALOG.map((car) => {
                const isSelected = car.id === currentCar.id;
                const isUnlocked = unlockedCars.includes(car.id) || car.price === 0;
                const canAfford = totalCoins >= car.price;

                return (
                  <div
                    key={car.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-['Chakra_Petch',sans-serif] text-slate-100">
                          {car.name}
                        </span>
                        {!isUnlocked ? (
                          <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1 font-bold">
                            <Lock className="w-3 h-3" /> {car.price} COINS
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            OWNED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{car.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                      {isUnlocked ? (
                        <button
                          onClick={() => onSelectCar(car)}
                          className={`w-full py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-zinc-800 text-slate-200 hover:bg-zinc-700'
                          }`}
                        >
                          {isSelected ? 'SELECTED' : 'SELECT CAR'}
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnlockCar(car.id, car.price)}
                          disabled={!canAfford}
                          className={`w-full py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                              : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          {canAfford ? `UNLOCK FOR ${car.price} COINS` : `NEED ${car.price - totalCoins} MORE COINS`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sub-tab 4: Performance Tuning System (Garage Upgrades) */}
          {customizerSubTab === 'upgrades' && (
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
              {(['engine', 'handling', 'nitro'] as const).map((cat) => {
                const config = UPGRADE_CONFIG[cat];
                const currentLvl = carUpgrades ? carUpgrades[cat] : 0;
                const isMax = currentLvl >= config.levels.length - 1;
                const nextConfig = !isMax ? config.levels[currentLvl + 1] : null;
                const canAfford = nextConfig ? totalCoins >= nextConfig.cost : false;

                return (
                  <div
                    key={cat}
                    className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-['Chakra_Petch',sans-serif] text-white">
                          {config.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {isMax ? 'MAXED OUT (STAGE 4)' : `STAGE ${currentLvl} / 4`}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{config.desc}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {config.levels.map((lvl) => (
                          <div
                            key={lvl.level}
                            className={`h-1.5 w-6 rounded-full transition-all ${
                              lvl.level <= currentLvl ? 'bg-amber-400 shadow-sm' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isMax ? (
                        <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> FULLY TUNED
                        </span>
                      ) : (
                        <button
                          onClick={() => onBuyUpgrade(cat)}
                          disabled={!canAfford}
                          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>UPGRADE ({nextConfig?.cost} COINS)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      )}

      {/* 5. ON-DEMAND SLIDE-UP DRAWER: TRACK SELECTOR & UNLOCKS */}
      {drawerOpen === 'tracks' && (
        <div className="absolute inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bottom-24 w-full md:max-w-2xl bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 shadow-2xl pointer-events-auto z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-['Chakra_Petch',sans-serif] text-white uppercase tracking-wider">
                Select Race Track
              </h2>
            </div>
            <button
              onClick={() => setDrawerOpen(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TRACKS_CATALOG.map((track) => {
              const isSelected = track.id === selectedTrack;
              const isUnlocked = unlockedTracks.includes(track.id) || track.price === 0;
              const canAfford = totalCoins >= track.price;

              return (
                <div
                  key={track.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-['Chakra_Petch',sans-serif] text-white">
                        {track.name}
                      </span>
                      {!isUnlocked ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> {track.price}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          {track.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {track.subtitle}
                    </div>
                    <div className="text-[10px] text-zinc-500 line-clamp-2 mt-1">
                      {track.description}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-zinc-800/80">
                    {isUnlocked ? (
                      <button
                        onClick={() => {
                          onSelectTrack(track.id);
                          setDrawerOpen(null);
                        }}
                        className={`w-full py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-zinc-800 text-slate-200 hover:bg-zinc-700'
                        }`}
                      >
                        {isSelected ? 'SELECTED' : 'DRIVE TRACK'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onUnlockTrack(track.id, track.price)}
                        disabled={!canAfford}
                        className={`w-full py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-3 h-3" />
                        {canAfford ? `UNLOCK ${track.price}` : `NEED ${track.price - totalCoins}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
