/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import {
  CARS_CATALOG,
  TRACKS_CATALOG,
  DEFAULT_KEYBINDINGS,
  INITIAL_ACHIEVEMENTS,
  UPGRADE_CONFIG,
} from './data/cars';
import {
  CarStats,
  GameMode,
  GameState,
  GraphicsQuality,
  FloatingText,
  PlayerInput,
  TrackId,
  KeyBindings,
  TransmissionType,
  CameraView,
  WeatherType,
  Achievement,
  CarUpgrades,
  OnScreenControlSetting,
  RadioStation,
  PlayerProfile,
  MultiplayerRoomState,
  MultiplayerCarConfig,
  OpenWorldHudState,
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GameOverModal, OnlineStandingResult } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { PhotoModeModal } from './components/PhotoModeModal';
import { ProfileModal } from './components/ProfileModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { WorldMapModal } from './components/WorldMapModal';
import { multiplayerClient } from './network/multiplayerClient';
import { soundManager } from './audio/soundManager';
import {
  isMobileOrTouchDevice,
  isFullscreenActive,
  enterFullscreenAndLandscape,
  toggleFullscreenAndLandscape,
} from './utils/mobileViewport';

const HIGH_SCORE_KEY = 'turbo_horizon_highscore';
const COINS_KEY = 'turbo_horizon_total_coins';
const UNLOCKED_CARS_KEY = 'turbo_horizon_unlocked_cars';
const UNLOCKED_TRACKS_KEY = 'turbo_horizon_unlocked_tracks';
const ACHIEVEMENTS_KEY = 'turbo_horizon_achievements';
const SETTINGS_KEY = 'turbo_horizon_settings';
const CAR_UPGRADES_KEY = 'turbo_horizon_car_upgrades';
const PROFILE_KEY = 'turbo_horizon_profile';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // 1. High Score Persistence
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  // 2. Coin Economy Persistence (starts with 150 bonus coins for immediate unlocks & tuning)
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(COINS_KEY);
      return saved !== null ? parseInt(saved, 10) : 150;
    } catch {
      return 150;
    }
  });

  // 3. Car & Track Unlocks Persistence
  const [unlockedCars, setUnlockedCars] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(UNLOCKED_CARS_KEY);
      return saved ? JSON.parse(saved) : ['cruiser'];
    } catch {
      return ['cruiser'];
    }
  });

  const [unlockedTracks, setUnlockedTracks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(UNLOCKED_TRACKS_KEY);
      return saved ? JSON.parse(saved) : ['sunset-coastal'];
    } catch {
      return ['sunset-coastal'];
    }
  });

  // 4. Car Performance Tuning Upgrades Persistence
  const [carUpgrades, setCarUpgrades] = useState<CarUpgrades>(() => {
    try {
      const saved = localStorage.getItem(CAR_UPGRADES_KEY);
      return saved ? JSON.parse(saved) : { engine: 0, handling: 0, nitro: 0 };
    } catch {
      return { engine: 0, handling: 0, nitro: 0 };
    }
  });

  // 5. Mini-Achievements Persistence
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (saved) {
        const savedIds: string[] = JSON.parse(saved);
        return INITIAL_ACHIEVEMENTS.map((a) => ({
          ...a,
          unlocked: savedIds.includes(a.id),
        }));
      }
    } catch {}
    return INITIAL_ACHIEVEMENTS;
  });

  // 6. Settings Persistence (Keybindings, Transmission, Weather, Camera, Quality, Touch Controls)
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.keyBindings) return { ...DEFAULT_KEYBINDINGS, ...parsed.keyBindings };
      }
    } catch {}
    return DEFAULT_KEYBINDINGS;
  });

  const [transmission, setTransmission] = useState<TransmissionType>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.transmission) return parsed.transmission;
      }
    } catch {}
    return 'automatic';
  });

  const [cameraView, setCameraView] = useState<CameraView>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cameraView) return parsed.cameraView;
      }
    } catch {}
    return 'thirdPerson';
  });

  const [weather, setWeather] = useState<WeatherType>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.weather) return parsed.weather;
      }
    } catch {}
    return 'sunset';
  });

  const [quality, setQuality] = useState<GraphicsQuality>('balanced');
  const [touchControls, setTouchControls] = useState<OnScreenControlSetting>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.touchControls) return parsed.touchControls;
      }
    } catch {}
    return 'auto';
  });

  // Device & Touch Detection + Fullscreen tracking
  const [isMobileDevice, setIsMobileDevice] = useState(() => isMobileOrTouchDevice());
  const [isFullscreen, setIsFullscreen] = useState(() => isFullscreenActive());

  useEffect(() => {
    const handleCheckTouch = () => {
      setIsMobileDevice(isMobileOrTouchDevice());
    };
    const handleFirstTouch = () => {
      setIsMobileDevice(true);
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };

    window.addEventListener('resize', handleCheckTouch);
    window.addEventListener('orientationchange', handleCheckTouch);
    window.addEventListener('touchstart', handleFirstTouch, { passive: true, once: true });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleCheckTouch);
      window.removeEventListener('orientationchange', handleCheckTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const showTouchControls =
    touchControls === 'force_on' ||
    (touchControls !== 'force_off' && isMobileDevice);

  const handleToggleFullscreen = useCallback(async () => {
    const next = await toggleFullscreenAndLandscape();
    setIsFullscreen(next);
  }, []);

  // In-Game Radio Station
  const [radioStation, setRadioStation] = useState<RadioStation>('synthwave');

  // Photo Mode State
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [photoFov, setPhotoFov] = useState(65);
  const [photoFilter, setPhotoFilter] = useState<'normal' | 'vintage' | 'cyber' | 'noir'>('normal');

  // Settings, Profile, Multiplayer & World Map Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [isWorldMapOpen, setIsWorldMapOpen] = useState(false);

  // 7. Player Profile Persistence
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      }
    } catch {}
    const randomNum = Math.floor(10 + Math.random() * 89);
    return {
      username: `RACER_${randomNum}`,
      tagColor: '#f59e0b',
      racesCompleted: 0,
      wins: 0,
    };
  });

  // 8. Online Multiplayer State
  const [onlineRoom, setOnlineRoom] = useState<MultiplayerRoomState | null>(null);
  const [onlineSelfId, setOnlineSelfId] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineBanner, setOnlineBanner] = useState<string | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineCountdown, setOnlineCountdown] = useState<number | null>(null);

  // Game UI state
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('sunset-coastal');
  const [currentCar, setCurrentCar] = useState<CarStats>(CARS_CATALOG[0]);

  // HUD metrics
  const [hudStats, setHudStats] = useState<{
    score: number;
    speed: number;
    nitro: number;
    distance: number;
    coins: number;
    timeLeft: number;
    isDrifting: boolean;
    shield: boolean;
    magnetTimeLeft: number;
    currentGear: number;
    transmission: TransmissionType;
    clutch: boolean;
    cameraView: CameraView;
    weather: WeatherType;
    headlights: boolean;
    indicators: string;
    doorsOpen: boolean;
    trunkOpen: boolean;
    heatLevel?: number;
    raceRank?: number;
    totalRacers?: number;
    lap?: number;
    totalLaps?: number;
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
    zoneName?: string;
    trophiesFound?: number;
    totalTrophies?: number;
    posX?: number;
    posZ?: number;
    heading?: number;
    openWorld?: OpenWorldHudState;
  }>({
    score: 0,
    speed: 0,
    nitro: 100,
    distance: 0,
    coins: 0,
    timeLeft: 35,
    isDrifting: false,
    shield: false,
    magnetTimeLeft: 0,
    currentGear: 1,
    transmission: 'automatic',
    clutch: false,
    cameraView: 'thirdPerson',
    weather: 'sunset',
    headlights: true,
    indicators: 'off',
    doorsOpen: false,
    trunkOpen: false,
    raceRank: 1,
    totalRacers: 4,
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [gameOverStats, setGameOverStats] = useState({
    score: 0,
    isNewHigh: false,
    distance: 0,
    coins: 0,
    nearMisses: 0,
  });

  // Continuous input state
  const inputRef = useRef<PlayerInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
    clutch: false,
    upshiftJustPressed: false,
    downshiftJustPressed: false,
  });

  // Keybindings ref for instantaneous lookup inside event listeners
  const keyBindingsRef = useRef<KeyBindings>(keyBindings);
  useEffect(() => {
    keyBindingsRef.current = keyBindings;
  }, [keyBindings]);

  // Save Settings helper
  const saveSettingsToStorage = useCallback(
    (overrides?: Partial<{ transmission: TransmissionType; cameraView: CameraView; weather: WeatherType; quality: GraphicsQuality; touchControls: OnScreenControlSetting; keyBindings: KeyBindings }>) => {
      try {
        const payload = {
          transmission,
          cameraView,
          weather,
          quality,
          touchControls,
          keyBindings,
          ...overrides,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
      } catch {}
    },
    [transmission, cameraView, weather, quality, touchControls, keyBindings]
  );

  // Trigger Achievement unlock with reward coins
  const handleTriggerAchievement = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const target = prev.find((a) => a.id === id);
        if (!target || target.unlocked) return prev;

        const updated = prev.map((a) => (a.id === id ? { ...a, unlocked: true } : a));

        try {
          const unlockedIds = updated.filter((a) => a.unlocked).map((a) => a.id);
          localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedIds));
        } catch {}

        setTotalCoins((c) => {
          const newTotal = c + target.rewardCoins;
          try {
            localStorage.setItem(COINS_KEY, newTotal.toString());
          } catch {}
          return newTotal;
        });

        soundManager.playAchievementUnlock();

        setFloatingTexts((ft) => [
          ...ft.slice(-3),
          {
            id: Date.now() + Math.random(),
            text: `🏆 ACHIEVEMENT: ${target.title.toUpperCase()} (+${target.rewardCoins} COINS)!`,
            type: 'powerup',
            score: target.rewardCoins * 10,
            timestamp: Date.now(),
          },
        ]);

        return updated;
      });
    },
    []
  );

  // Mount WebGL Engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, currentCar, quality);
    engineRef.current = engine;

    engine.carController.transmission = transmission;
    engine.carController.setUpgrades(carUpgrades);
    engine.setCameraView(cameraView);
    engine.setWeather(weather);
    engine.updatePlayerProfileTag(profile.username, profile.tagColor);

    engine.onLocalTransform = (tr) => {
      multiplayerClient.sendPlayerState(tr);
    };

    engine.onOnlineFinish = () => {
      multiplayerClient.sendFinish();
      soundManager.stopEngine();

      setProfile((prev) => {
        const won = engine.raceRank === 1;
        const updated: PlayerProfile = {
          ...prev,
          racesCompleted: prev.racesCompleted + 1,
          wins: prev.wins + (won ? 1 : 0),
        };
        try {
          localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (engine.coins > 0) {
        setTotalCoins((prev) => {
          const upd = prev + engine.coins;
          try {
            localStorage.setItem(COINS_KEY, upd.toString());
          } catch {}
          return upd;
        });
      }

      setGameOverStats({
        score: engine.score,
        isNewHigh: false,
        distance: engine.distance,
        coins: engine.coins,
        nearMisses: engine.nearMisses,
      });
      setGameState('gameover');
    };

    engine.onScoreUpdate = (stats) => {
      setHudStats(stats);
    };

    engine.onFloatingText = (ft) => {
      setFloatingTexts((prev) => [...prev.slice(-4), ft]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== ft.id));
      }, 1000);
    };

    engine.onAchievementTrigger = (achId) => {
      handleTriggerAchievement(achId);
    };

    engine.onGameOver = () => {
      const finalScore = engine.score;
      let newHigh = false;
      if (finalScore > highScore) {
        newHigh = true;
        setHighScore(finalScore);
        try {
          localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
        } catch {}
      }

      if (engine.coins > 0) {
        setTotalCoins((prev) => {
          const updated = prev + engine.coins;
          try {
            localStorage.setItem(COINS_KEY, updated.toString());
          } catch {}
          return updated;
        });

        if (engine.coins >= 25) {
          handleTriggerAchievement('coin-rush');
        }
      }

      setGameOverStats({
        score: finalScore,
        isNewHigh: newHigh,
        distance: engine.distance,
        coins: engine.coins,
        nearMisses: engine.nearMisses,
      });
      setGameState('gameover');
    };

    // Animation frame loop
    let animId: number;
    const loop = () => {
      engine.tick(inputRef.current);
      inputRef.current.upshiftJustPressed = false;
      inputRef.current.downshiftJustPressed = false;
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Build car visual payload for multiplayer room sync
  const buildCarPayload = useCallback(
    (car: CarStats): MultiplayerCarConfig => ({
      id: car.id,
      name: car.name,
      primaryColor: car.primaryColor,
      accentColor: car.accentColor,
      decalType: car.decalType,
      stripeColor: car.stripeColor,
    }),
    []
  );

  // Sync profile updates with 3D tag & active multiplayer room
  const handleSaveProfile = useCallback(
    (updated: PlayerProfile) => {
      setProfile(updated);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      } catch {}
      engineRef.current?.updatePlayerProfileTag(updated.username, updated.tagColor);
      if (onlineRoom) {
        multiplayerClient.updateCar(updated.username, buildCarPayload(currentCar));
      }
    },
    [onlineRoom, currentCar, buildCarPayload]
  );

  // Subscribe to real-time WebSocket multiplayer events
  useEffect(() => {
    const laneOffsets = [-4.5, -1.5, 1.5, 4.5];
    let goClearTimeout: number | null = null;

    const unsubscribe = multiplayerClient.subscribe((evt) => {
      switch (evt.type) {
        case 'room:joined': {
          setOnlineBusy(false);
          setOnlineError(null);
          setOnlineSelfId(evt.payload.selfId);
          setOnlineRoom(evt.payload.room);
          setSelectedTrack(evt.payload.room.trackId);
          engineRef.current?.setTrack(evt.payload.room.trackId);
          engineRef.current?.syncRemotePlayersMeta(evt.payload.room.players, evt.payload.selfId);
          setOnlineBanner(`Joined room ${evt.payload.room.code}`);
          break;
        }
        case 'room:state': {
          const room = evt.payload;
          setOnlineRoom(room);
          setSelectedTrack(room.trackId);
          engineRef.current?.setTrack(room.trackId);
          engineRef.current?.syncRemotePlayersMeta(room.players, multiplayerClient.selfId);

          if (room.status === 'lobby') {
            setOnlineCountdown(null);
            setGameState((prev) => {
              if (prev === 'gameover' || prev === 'playing') {
                engineRef.current?.resetToTitle();
                setIsMultiplayerOpen(true);
                return 'title';
              }
              return prev;
            });
          }
          break;
        }
        case 'room:error': {
          setOnlineBusy(false);
          setOnlineError(evt.payload.message);
          break;
        }
        case 'race:countdown': {
          const { count } = evt.payload;
          const room = multiplayerClient.currentRoom;
          const selfId = multiplayerClient.selfId;

          if (count === 3 && room && engineRef.current) {
            soundManager.unlock();
            setIsMultiplayerOpen(false);
            setIsProfileOpen(false);
            setIsSettingsOpen(false);
            setGameMode('online');
            setSelectedTrack(room.trackId);
            engineRef.current.setTrack(room.trackId);
            engineRef.current.syncRemotePlayersMeta(room.players, selfId);

            const slotIdx = Math.max(0, room.players.findIndex((p) => p.id === selfId));
            const startX = laneOffsets[slotIdx % 4];
            engineRef.current.start('online', {
              startX,
              totalLaps: room.totalLaps,
              lapDistance: room.lapDistance,
              countdownActive: true,
            });
            engineRef.current.carController.setUpgrades(carUpgrades);
            setGameState('playing');
          }

          setOnlineCountdown(count);
          if (count > 0) {
            soundManager.playBlinker();
          } else {
            soundManager.playCheckpoint();
            if (goClearTimeout) window.clearTimeout(goClearTimeout);
            goClearTimeout = window.setTimeout(() => {
              setOnlineCountdown(null);
            }, 950);
          }
          break;
        }
        case 'race:go': {
          engineRef.current?.setOnlineRacePhase('racing');
          break;
        }
        case 'players:sync': {
          engineRef.current?.applyRemoteTransforms(evt.transforms, multiplayerClient.selfId);
          break;
        }
        case 'player:finished': {
          const { username, rank } = evt.payload;
          setFloatingTexts((ft) => [
            ...ft.slice(-3),
            {
              id: Date.now() + Math.random(),
              text: `${username} FINISHED #${rank}!`,
              type: 'checkpoint',
              score: 0,
              timestamp: Date.now(),
            },
          ]);
          break;
        }
        case 'player:left': {
          setOnlineBanner(`${evt.payload.username} disconnected from the room.`);
          setFloatingTexts((ft) => [
            ...ft.slice(-3),
            {
              id: Date.now() + Math.random(),
              text: `${evt.payload.username} LEFT RACE`,
              type: 'hazard',
              score: 0,
              timestamp: Date.now(),
            },
          ]);
          break;
        }
        case 'host:migrated': {
          setOnlineBanner(`Host migrated to ${evt.payload.newHostUsername}`);
          setFloatingTexts((ft) => [
            ...ft.slice(-3),
            {
              id: Date.now() + Math.random(),
              text: `NEW HOST: ${evt.payload.newHostUsername}`,
              type: 'powerup',
              score: 0,
              timestamp: Date.now(),
            },
          ]);
          break;
        }
      }
    });

    return () => {
      if (goClearTimeout) window.clearTimeout(goClearTimeout);
      unsubscribe();
    };
  }, [carUpgrades]);

  // Update car when selected
  const handleSelectCar = useCallback((car: CarStats) => {
    setCurrentCar(car);
    if (engineRef.current) {
      engineRef.current.changePlayerCar(car);
      engineRef.current.carController.setUpgrades(carUpgrades);
    }
    if (onlineRoom) {
      multiplayerClient.updateCar(profile.username, buildCarPayload(car));
    }
  }, [carUpgrades, onlineRoom, profile.username, buildCarPayload]);

  // Update car customization
  const handleUpdateCarCustomization = useCallback((updates: Partial<CarStats>) => {
    setCurrentCar((prev) => {
      const updated = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.changePlayerCar(updated);
        engineRef.current.carController.setUpgrades(carUpgrades);
      }
      if (onlineRoom) {
        multiplayerClient.updateCar(profile.username, buildCarPayload(updated));
      }
      return updated;
    });
  }, [carUpgrades, onlineRoom, profile.username, buildCarPayload]);

  // Buy Car Upgrades (Performance Tuning)
  const handleBuyUpgrade = useCallback(
    (category: 'engine' | 'handling' | 'nitro') => {
      const config = UPGRADE_CONFIG[category];
      const currentLvl = carUpgrades[category];
      if (currentLvl >= config.levels.length - 1) return false;
      const nextLevelConfig = config.levels[currentLvl + 1];
      if (totalCoins < nextLevelConfig.cost) return false;

      const newCoins = totalCoins - nextLevelConfig.cost;
      const newUpgrades: CarUpgrades = {
        ...carUpgrades,
        [category]: currentLvl + 1,
      };

      setTotalCoins(newCoins);
      setCarUpgrades(newUpgrades);

      try {
        localStorage.setItem(COINS_KEY, newCoins.toString());
        localStorage.setItem(CAR_UPGRADES_KEY, JSON.stringify(newUpgrades));
      } catch {}

      soundManager.playCoin();
      soundManager.playAchievementUnlock();

      if (engineRef.current) {
        engineRef.current.carController.setUpgrades(newUpgrades);
      }

      setFloatingTexts((ft) => [
        ...ft.slice(-3),
        {
          id: Date.now(),
          text: `⚡ UPGRADE: ${config.name} (${nextLevelConfig.label.toUpperCase()})!`,
          type: 'powerup',
          score: 300,
          timestamp: Date.now(),
        },
      ]);
      return true;
    },
    [carUpgrades, totalCoins]
  );

  // Unlock car
  const handleUnlockCar = useCallback(
    (carId: string, price: number) => {
      if (totalCoins < price) return false;

      const newBalance = totalCoins - price;
      setTotalCoins(newBalance);
      const newUnlocked = [...unlockedCars, carId];
      setUnlockedCars(newUnlocked);

      try {
        localStorage.setItem(COINS_KEY, newBalance.toString());
        localStorage.setItem(UNLOCKED_CARS_KEY, JSON.stringify(newUnlocked));
      } catch {}

      soundManager.playCoin();
      soundManager.playAchievementUnlock();

      const carObj = CARS_CATALOG.find((c) => c.id === carId);
      if (carObj) {
        handleSelectCar(carObj);
      }

      setFloatingTexts((ft) => [
        ...ft.slice(-3),
        {
          id: Date.now(),
          text: `VEHICLE UNLOCKED: ${carObj?.name.toUpperCase()}!`,
          type: 'powerup',
          score: 500,
          timestamp: Date.now(),
        },
      ]);
      return true;
    },
    [totalCoins, unlockedCars, handleSelectCar]
  );

  // Unlock track
  const handleUnlockTrack = useCallback(
    (trackId: TrackId, price: number) => {
      if (totalCoins < price) return false;

      const newBalance = totalCoins - price;
      setTotalCoins(newBalance);
      const newUnlocked = [...unlockedTracks, trackId];
      setUnlockedTracks(newUnlocked);

      try {
        localStorage.setItem(COINS_KEY, newBalance.toString());
        localStorage.setItem(UNLOCKED_TRACKS_KEY, JSON.stringify(newUnlocked));
      } catch {}

      soundManager.playCoin();
      setSelectedTrack(trackId);
      if (engineRef.current) {
        engineRef.current.setTrack(trackId);
      }

      setFloatingTexts((ft) => [
        ...ft.slice(-3),
        {
          id: Date.now(),
          text: `TRACK UNLOCKED: ${trackId.toUpperCase()}!`,
          type: 'powerup',
          score: 500,
          timestamp: Date.now(),
        },
      ]);
      return true;
    },
    [totalCoins, unlockedTracks]
  );

  // Quality switch
  const handleSelectQuality = useCallback(
    (q: GraphicsQuality) => {
      setQuality(q);
      if (engineRef.current) {
        engineRef.current.setQuality(q);
      }
      saveSettingsToStorage({ quality: q });
    },
    [saveSettingsToStorage]
  );

  // Track switch
  const handleSelectTrack = useCallback((trackId: TrackId) => {
    setSelectedTrack(trackId);
    if (engineRef.current) {
      engineRef.current.setTrack(trackId);
    }
  }, []);

  // Transmission switch
  const handleChangeTransmission = useCallback(
    (t: TransmissionType) => {
      setTransmission(t);
      if (engineRef.current) {
        engineRef.current.carController.transmission = t;
      }
      saveSettingsToStorage({ transmission: t });
    },
    [saveSettingsToStorage]
  );

  // Camera switch
  const handleChangeCameraView = useCallback(
    (c: CameraView) => {
      setCameraView(c);
      if (engineRef.current) {
        engineRef.current.setCameraView(c);
      }
      saveSettingsToStorage({ cameraView: c });
    },
    [saveSettingsToStorage]
  );

  // Weather switch
  const handleChangeWeather = useCallback(
    (w: WeatherType) => {
      setWeather(w);
      if (engineRef.current) {
        engineRef.current.setWeather(w);
      }
      saveSettingsToStorage({ weather: w });
    },
    [saveSettingsToStorage]
  );

  // Touch controls switch
  const handleChangeTouchControls = useCallback(
    (tc: OnScreenControlSetting) => {
      setTouchControls(tc);
      saveSettingsToStorage({ touchControls: tc });
    },
    [saveSettingsToStorage]
  );

  // Keybindings update
  const handleChangeKeyBindings = useCallback(
    (kb: KeyBindings) => {
      setKeyBindings(kb);
      saveSettingsToStorage({ keyBindings: kb });
    },
    [saveSettingsToStorage]
  );

  // Radio Station switch
  const handleChangeRadioStation = useCallback((rs: RadioStation) => {
    setRadioStation(rs);
    soundManager.setRadioStation(rs);
  }, []);

  const handleCycleRadio = useCallback(() => {
    const nextSt = soundManager.nextRadioStation();
    setRadioStation(nextSt);
    setFloatingTexts((ft) => [
      ...ft.slice(-3),
      {
        id: Date.now(),
        text: `📻 RADIO: ${nextSt.toUpperCase()}`,
        type: 'powerup',
        score: 0,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  // Photo Mode handlers
  const handleTogglePhotoMode = useCallback(() => {
    setIsPhotoMode((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.isPhotoMode = next;
      }
      return next;
    });
  }, []);

  const handleTakeScreenshot = useCallback(() => {
    if (!engineRef.current) return;
    const dataUrl = engineRef.current.takeScreenshot();
    const link = document.createElement('a');
    link.download = `TurboHorizon_Photo_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    soundManager.playSpeedTrapFlash();
  }, []);

  // Start game (and optional fullscreen + landscape launch for mobile)
  const handleStartGame = useCallback(() => {
    soundManager.unlock();
    setIsWorldMapOpen(false);
    if (engineRef.current) {
      engineRef.current.start(gameMode);
      engineRef.current.carController.setUpgrades(carUpgrades);
    }
    setGameState('playing');
  }, [gameMode, carUpgrades]);

  const handleStartFullscreenRace = useCallback(async () => {
    soundManager.unlock();
    setIsWorldMapOpen(false);
    await enterFullscreenAndLandscape();
    setIsFullscreen(isFullscreenActive());
    if (engineRef.current) {
      engineRef.current.start(gameMode);
      engineRef.current.carController.setUpgrades(carUpgrades);
    }
    setGameState('playing');
  }, [gameMode, carUpgrades]);

  // Open-World Interactive Map Toggle (pauses driving cleanly while planning route)
  const handleOpenWorldMap = useCallback(() => {
    inputRef.current = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      nitro: false,
      clutch: false,
      upshiftJustPressed: false,
      downshiftJustPressed: false,
    };
    engineRef.current?.pause();
    setIsWorldMapOpen(true);
  }, []);

  const handleCloseWorldMap = useCallback(() => {
    setIsWorldMapOpen(false);
    engineRef.current?.resume();
  }, []);

  // Pause & Resume
  const handlePause = useCallback(() => {
    setIsWorldMapOpen(false);
    if (engineRef.current) {
      engineRef.current.pause();
    }
    setGameState('paused');
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
    setGameState('playing');
  }, []);

  const handleHome = useCallback(() => {
    setIsWorldMapOpen(false);
    if (onlineRoom) {
      multiplayerClient.leaveRoom();
      setOnlineRoom(null);
      setOnlineSelfId(null);
      setOnlineCountdown(null);
      setOnlineBanner(null);
    }
    if (engineRef.current) {
      if (engineRef.current.coins > 0) {
        setTotalCoins((prev) => {
          const upd = prev + engineRef.current!.coins;
          try {
            localStorage.setItem(COINS_KEY, upd.toString());
          } catch {}
          return upd;
        });
      }
      engineRef.current.resetToTitle();
    }
    setGameMode((m) => (m === 'online' ? 'arcade' : m));
    setIsPhotoMode(false);
    setGameState('title');
  }, [onlineRoom]);

  // Multiplayer Lobby Action Handlers
  const handleCreateRoom = useCallback(
    async (trackId: TrackId, totalLaps: number) => {
      setOnlineBusy(true);
      setOnlineError(null);
      setOnlineBanner(null);
      try {
        await multiplayerClient.createRoom(
          profile.username,
          buildCarPayload(currentCar),
          trackId,
          totalLaps
        );
      } catch (err: any) {
        setOnlineBusy(false);
        setOnlineError(err?.message || 'Unable to connect to multiplayer server.');
      }
    },
    [profile.username, currentCar, buildCarPayload]
  );

  const handleJoinRoom = useCallback(
    async (code: string) => {
      setOnlineBusy(true);
      setOnlineError(null);
      setOnlineBanner(null);
      try {
        await multiplayerClient.joinRoom(code, profile.username, buildCarPayload(currentCar));
      } catch (err: any) {
        setOnlineBusy(false);
        setOnlineError(err?.message || 'Unable to connect to multiplayer server.');
      }
    },
    [profile.username, currentCar, buildCarPayload]
  );

  const handleLeaveRoom = useCallback(() => {
    multiplayerClient.leaveRoom();
    setOnlineRoom(null);
    setOnlineSelfId(null);
    setOnlineCountdown(null);
    setOnlineError(null);
    setOnlineBanner(null);
    engineRef.current?.clearRemoteCars();
  }, []);

  // Keyboard controls listener matching customizable keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
        return;
      }

      soundManager.unlock();
      const kb = keyBindingsRef.current;

      // Escape / Pause / Close World Map
      if (e.code === 'Escape') {
        if (isWorldMapOpen) {
          handleCloseWorldMap();
          return;
        }
        if (isPhotoMode) {
          handleTogglePhotoMode();
          return;
        }
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
        return;
      }

      // Open-World Interactive Map Hotkey
      if (
        gameState === 'playing' &&
        !isPhotoMode &&
        (gameMode === 'openWorld' || gameMode === 'zen') &&
        e.code === (kb.worldMap || 'KeyM')
      ) {
        if (isWorldMapOpen) {
          handleCloseWorldMap();
        } else {
          handleOpenWorldMap();
        }
        return;
      }

      if (isWorldMapOpen) return;

      // Quick restart
      if (e.code === 'KeyR' && gameState === 'playing' && !isPhotoMode) {
        handleStartGame();
        return;
      }

      // Photo Mode Toggle
      if (e.code === kb.photoMode && gameState === 'playing') {
        handleTogglePhotoMode();
        return;
      }

      if (isPhotoMode) return; // Freeze inputs while in Photo Mode

      // Radio Station Cycle
      if (e.code === kb.radio) {
        handleCycleRadio();
        return;
      }

      // Car Horn
      if (e.code === kb.horn) {
        engineRef.current?.honkHorn();
        return;
      }

      // Driving inputs
      if (e.code === kb.throttle || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.forward = true;
      }
      if (e.code === kb.brake || e.code === 'ArrowDown' || e.code === 'KeyS') {
        inputRef.current.backward = true;
      }
      if (e.code === kb.steerLeft || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = true;
      }
      if (e.code === kb.steerRight || e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = true;
      }

      // Drift & Start
      if (e.code === kb.drift || e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          inputRef.current.drift = true;
        } else if (
          (gameState === 'title' || gameState === 'gameover') &&
          !isProfileOpen &&
          !isMultiplayerOpen &&
          !isSettingsOpen &&
          gameMode !== 'online'
        ) {
          handleStartGame();
        }
      }

      // Nitro Boost
      if (e.code === kb.nitro) {
        inputRef.current.nitro = true;
      }

      // Manual Clutch
      if (e.code === kb.clutch) {
        e.preventDefault();
        inputRef.current.clutch = true;
      }

      // Manual Upshift
      if (e.code === kb.upshift) {
        inputRef.current.upshiftJustPressed = true;
        engineRef.current?.carController.shiftUp(inputRef.current.clutch);
      }

      // Manual Downshift
      if (e.code === kb.downshift) {
        inputRef.current.downshiftJustPressed = true;
        engineRef.current?.carController.shiftDown(inputRef.current.clutch);
      }

      // Interactive Vehicle Controls
      if (engineRef.current) {
        if (e.code === kb.headlights) {
          engineRef.current.carController.toggleHeadlights();
        }
        if (e.code === kb.indicatorLeft) {
          engineRef.current.carController.setIndicator('left');
        }
        if (e.code === kb.indicatorRight) {
          engineRef.current.carController.setIndicator('right');
        }
        if (e.code === kb.hazardLights) {
          engineRef.current.carController.setIndicator('hazard');
        }
        if (e.code === kb.doors) {
          engineRef.current.carController.toggleDoors();
        }
        if (e.code === kb.trunk) {
          engineRef.current.carController.toggleTrunk();
        }
        if (e.code === kb.cameraToggle) {
          engineRef.current.cycleCameraView();
          setCameraView(engineRef.current.cameraView);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const kb = keyBindingsRef.current;
      if (e.code === kb.throttle || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.forward = false;
      }
      if (e.code === kb.brake || e.code === 'ArrowDown' || e.code === 'KeyS') {
        inputRef.current.backward = false;
      }
      if (e.code === kb.steerLeft || e.code === 'ArrowLeft' || e.code === 'KeyA') {
        inputRef.current.left = false;
      }
      if (e.code === kb.steerRight || e.code === 'ArrowRight' || e.code === 'KeyD') {
        inputRef.current.right = false;
      }
      if (e.code === kb.drift || e.code === 'Space') {
        inputRef.current.drift = false;
      }
      if (e.code === kb.nitro) {
        inputRef.current.nitro = false;
      }
      if (e.code === kb.clutch) {
        inputRef.current.clutch = false;
      }
    };

    const handleBlur = () => {
      inputRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        drift: false,
        nitro: false,
        clutch: false,
        upshiftJustPressed: false,
        downshiftJustPressed: false,
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    gameState,
    gameMode,
    isPhotoMode,
    isWorldMapOpen,
    isProfileOpen,
    isMultiplayerOpen,
    isSettingsOpen,
    handleStartGame,
    handlePause,
    handleResume,
    handleTogglePhotoMode,
    handleCycleRadio,
    handleOpenWorldMap,
    handleCloseWorldMap,
  ]);

  // Compute sorted online standings for GameOverModal
  const onlineResults: OnlineStandingResult[] = React.useMemo(() => {
    if (!onlineRoom) return [];
    return [...onlineRoom.players]
      .sort((a, b) => {
        if (a.finished && b.finished && a.finishRank && b.finishRank) {
          return a.finishRank - b.finishRank;
        }
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        return b.distance - a.distance;
      })
      .map((p) => ({
        id: p.id,
        username: p.username,
        carName: p.car.name,
        rank: p.finishRank,
        finishTime: p.finishTime,
        finished: p.finished,
        isLocal: p.id === onlineSelfId,
      }));
  }, [onlineRoom, onlineSelfId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Isolated Three.js WebGL Viewport Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          currentCar={currentCar}
          selectedTrack={selectedTrack}
          selectedMode={gameMode}
          selectedQuality={quality}
          highScore={highScore}
          totalCoins={totalCoins}
          unlockedCars={unlockedCars}
          unlockedTracks={unlockedTracks}
          carUpgrades={carUpgrades}
          onBuyUpgrade={handleBuyUpgrade}
          onSelectCar={handleSelectCar}
          onUpdateCarCustomization={handleUpdateCarCustomization}
          onSelectTrack={handleSelectTrack}
          onSelectMode={setGameMode}
          onSelectQuality={handleSelectQuality}
          onUnlockCar={handleUnlockCar}
          onUnlockTrack={handleUnlockTrack}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartGame={handleStartGame}
          profile={profile}
          onlineRoomCode={onlineRoom?.code || null}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenMultiplayer={() => {
            setOnlineError(null);
            setIsMultiplayerOpen(true);
          }}
          isMobileDevice={isMobileDevice}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onStartFullscreenRace={handleStartFullscreenRace}
        />
      )}

      {/* In-Game World-Matched HUD */}
      {gameState === 'playing' && (
        <GameHUD
          score={hudStats.score}
          speed={hudStats.speed}
          nitro={hudStats.nitro}
          distance={hudStats.distance}
          coins={hudStats.coins}
          timeLeft={hudStats.timeLeft}
          isDrifting={hudStats.isDrifting}
          gameMode={gameMode}
          trackName={TRACKS_CATALOG.find((t) => t.id === selectedTrack)?.name}
          zoneName={hudStats.zoneName}
          trophiesFound={hudStats.trophiesFound}
          totalTrophies={hudStats.totalTrophies}
          posX={hudStats.posX}
          posZ={hudStats.posZ}
          heading={hudStats.heading}
          shield={hudStats.shield}
          magnetTimeLeft={hudStats.magnetTimeLeft}
          currentGear={hudStats.currentGear}
          transmission={hudStats.transmission}
          clutch={hudStats.clutch}
          cameraView={hudStats.cameraView}
          weather={hudStats.weather}
          headlights={hudStats.headlights}
          indicators={hudStats.indicators}
          doorsOpen={hudStats.doorsOpen}
          trunkOpen={hudStats.trunkOpen}
          heatLevel={hudStats.heatLevel}
          raceRank={hudStats.raceRank}
          totalRacers={hudStats.totalRacers}
          radioStation={radioStation}
          floatingTexts={floatingTexts}
          showTouchControls={showTouchControls}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          openWorld={hudStats.openWorld}
          onOpenWorldMap={handleOpenWorldMap}
          onCancelStreetRace={() => engineRef.current?.cancelStreetRace()}
          username={profile.username}
          tagColor={profile.tagColor}
          lap={hudStats.lap}
          totalLaps={hudStats.totalLaps}
          countdown={onlineCountdown}
          leaderboard={hudStats.leaderboard}
          onPause={handlePause}
          onToggleCamera={() => {
            if (engineRef.current) {
              engineRef.current.cycleCameraView();
              setCameraView(engineRef.current.cameraView);
            }
          }}
          onCycleRadio={handleCycleRadio}
          onTogglePhotoMode={handleTogglePhotoMode}
          onHonkHorn={() => engineRef.current?.honkHorn()}
          onToggleHeadlights={() => {
            engineRef.current?.carController.toggleHeadlights();
          }}
          onToggleIndicator={(dir) => {
            engineRef.current?.carController.setIndicator(dir);
          }}
          onToggleDoors={() => {
            engineRef.current?.carController.toggleDoors();
          }}
          onToggleTrunk={() => {
            engineRef.current?.carController.toggleTrunk();
          }}
          onShiftUp={() => {
            engineRef.current?.carController.shiftUp(inputRef.current.clutch);
          }}
          onShiftDown={() => {
            engineRef.current?.carController.shiftDown(inputRef.current.clutch);
          }}
          onTouchSteer={(dir) => {
            inputRef.current.left = dir === 'left';
            inputRef.current.right = dir === 'right';
          }}
          onTouchLeft={(active) => {
            inputRef.current.left = active;
          }}
          onTouchRight={(active) => {
            inputRef.current.right = active;
          }}
          onTouchThrottle={(fwd) => {
            inputRef.current.forward = fwd;
          }}
          onTouchBrake={(brk) => {
            inputRef.current.backward = brk;
          }}
          onTouchNitro={(n) => {
            inputRef.current.nitro = n;
          }}
          onTouchDrift={(d) => {
            inputRef.current.drift = d;
          }}
          onTouchClutch={(c) => {
            inputRef.current.clutch = c;
          }}
        />
      )}

      {/* Interactive 4-Zone Open-World Map, GPS & Fast Travel */}
      {gameState === 'playing' && (gameMode === 'openWorld' || gameMode === 'zen') && hudStats.openWorld && (
        <WorldMapModal
          isOpen={isWorldMapOpen}
          onClose={handleCloseWorldMap}
          posX={hudStats.posX || 0}
          posZ={hudStats.posZ || 0}
          headingDeg={hudStats.heading || 0}
          openWorld={hudStats.openWorld}
          onSetWaypoint={(x, z, label) => {
            engineRef.current?.setGpsWaypoint(x, z, label);
          }}
          onClearWaypoint={() => {
            engineRef.current?.clearGpsWaypoint();
          }}
          onFastTravel={(hubId) => {
            engineRef.current?.fastTravelToHub(hubId);
            handleCloseWorldMap();
          }}
        />
      )}

      {/* Photo Mode Modal */}
      <PhotoModeModal
        isOpen={isPhotoMode}
        onClose={handleTogglePhotoMode}
        onTakeScreenshot={handleTakeScreenshot}
        fov={photoFov}
        onChangeFov={(f) => {
          setPhotoFov(f);
          if (engineRef.current) engineRef.current.photoFov = f;
        }}
        filter={photoFilter}
        onChangeFilter={setPhotoFilter}
      />

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={gameMode === 'online' ? handleResume : handleStartGame}
          onHome={handleHome}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          score={gameOverStats.score}
          highScore={highScore}
          isNewHigh={gameOverStats.isNewHigh}
          distance={gameOverStats.distance}
          coins={gameOverStats.coins}
          nearMisses={gameOverStats.nearMisses}
          onRestart={handleStartGame}
          onHome={handleHome}
          gameMode={gameMode}
          onlineResults={onlineResults}
          isHost={Boolean(onlineRoom && onlineSelfId && onlineRoom.hostId === onlineSelfId)}
          onBackToLobby={() => multiplayerClient.backToLobby()}
        />
      )}

      {/* Player Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        highScore={highScore}
        totalCoins={totalCoins}
        onSaveProfile={handleSaveProfile}
      />

      {/* Online Multiplayer Room Lobby Modal */}
      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        onClose={() => setIsMultiplayerOpen(false)}
        profile={profile}
        currentCar={currentCar}
        selectedTrack={selectedTrack}
        room={onlineRoom}
        selfId={onlineSelfId}
        errorMsg={onlineError}
        statusBanner={onlineBanner}
        isBusy={onlineBusy}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
        onSetTrack={(tid, laps) => multiplayerClient.setTrack(tid, laps)}
        onStartRace={() => multiplayerClient.startRace()}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Settings & Custom Keymapping Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        transmission={transmission}
        onChangeTransmission={handleChangeTransmission}
        keyBindings={keyBindings}
        onChangeKeyBindings={handleChangeKeyBindings}
        touchControls={touchControls}
        onChangeTouchControls={handleChangeTouchControls}
        cameraView={cameraView}
        onChangeCameraView={handleChangeCameraView}
        weather={weather}
        onChangeWeather={handleChangeWeather}
        quality={quality}
        onChangeQuality={handleSelectQuality}
        radioStation={radioStation}
        onChangeRadioStation={handleChangeRadioStation}
        achievements={achievements}
        totalCoins={totalCoins}
      />
    </div>
  );
}
