/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { CARS_CATALOG, TRACKS_CATALOG, DEFAULT_KEYBINDINGS, INITIAL_ACHIEVEMENTS } from './data/cars';
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
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { soundManager } from './audio/soundManager';

const HIGH_SCORE_KEY = 'turbo_horizon_highscore';
const COINS_KEY = 'turbo_horizon_total_coins';
const UNLOCKED_CARS_KEY = 'turbo_horizon_unlocked_cars';
const UNLOCKED_TRACKS_KEY = 'turbo_horizon_unlocked_tracks';
const ACHIEVEMENTS_KEY = 'turbo_horizon_achievements';
const SETTINGS_KEY = 'turbo_horizon_settings';

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

  // 2. Coin Economy Persistence (starts with 150 coins bonus so user can explore unlocks immediately)
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

  // 4. Mini-Achievements Persistence
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

  // 5. Settings Persistence (Keybindings, Transmission, Weather, Camera, Quality)
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    zoneName?: string;
    trophiesFound?: number;
    totalTrophies?: number;
    posX?: number;
    posZ?: number;
    heading?: number;
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
    (overrides?: Partial<{ transmission: TransmissionType; cameraView: CameraView; weather: WeatherType; quality: GraphicsQuality; keyBindings: KeyBindings }>) => {
      try {
        const payload = {
          transmission,
          cameraView,
          weather,
          quality,
          keyBindings,
          ...overrides,
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
      } catch {}
    },
    [transmission, cameraView, weather, quality, keyBindings]
  );

  // Trigger Achievement unlock with reward coins
  const handleTriggerAchievement = useCallback(
    (id: string) => {
      setAchievements((prev) => {
        const target = prev.find((a) => a.id === id);
        if (!target || target.unlocked) return prev;

        const updated = prev.map((a) => (a.id === id ? { ...a, unlocked: true } : a));

        // Save to localStorage
        try {
          const unlockedIds = updated.filter((a) => a.unlocked).map((a) => a.id);
          localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedIds));
        } catch {}

        // Add reward coins
        setTotalCoins((c) => {
          const newTotal = c + target.rewardCoins;
          try {
            localStorage.setItem(COINS_KEY, newTotal.toString());
          } catch {}
          return newTotal;
        });

        // Play celebration fanfare
        soundManager.playAchievementUnlock();

        // Show floating notification
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
    engine.setCameraView(cameraView);
    engine.setWeather(weather);

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

      // Add coins collected in session to persistent balance
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
      // Reset edge-triggered shift inputs
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

  // Update car when selected
  const handleSelectCar = useCallback((car: CarStats) => {
    setCurrentCar(car);
    if (engineRef.current) {
      engineRef.current.changePlayerCar(car);
    }
  }, []);

  // Update car customization (paint, stripes)
  const handleUpdateCarCustomization = useCallback((updates: Partial<CarStats>) => {
    setCurrentCar((prev) => {
      const updated = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.changePlayerCar(updated);
      }
      return updated;
    });
  }, []);

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

  // Keybindings update
  const handleChangeKeyBindings = useCallback(
    (kb: KeyBindings) => {
      setKeyBindings(kb);
      saveSettingsToStorage({ keyBindings: kb });
    },
    [saveSettingsToStorage]
  );

  // Start game
  const handleStartGame = useCallback(() => {
    soundManager.unlock();
    if (engineRef.current) {
      engineRef.current.start(gameMode);
    }
    setGameState('playing');
  }, [gameMode]);

  // Pause & Resume
  const handlePause = useCallback(() => {
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
    if (engineRef.current) {
      // Add coins if any
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
    setGameState('title');
  }, []);

  // Keyboard controls listener matching customizable keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      soundManager.unlock();
      const kb = keyBindingsRef.current;

      // Escape / Pause
      if (e.code === 'Escape') {
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
        return;
      }

      // Quick restart
      if (e.code === 'KeyR' && gameState === 'playing') {
        handleStartGame();
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
        } else if (gameState === 'title' || gameState === 'gameover') {
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
      }

      // Manual Downshift
      if (e.code === kb.downshift) {
        inputRef.current.downshiftJustPressed = true;
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
  }, [gameState, handleStartGame, handlePause, handleResume]);

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
          onSelectCar={handleSelectCar}
          onUpdateCarCustomization={handleUpdateCarCustomization}
          onSelectTrack={handleSelectTrack}
          onSelectMode={setGameMode}
          onSelectQuality={handleSelectQuality}
          onUnlockCar={handleUnlockCar}
          onUnlockTrack={handleUnlockTrack}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartGame={handleStartGame}
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
          floatingTexts={floatingTexts}
          onPause={handlePause}
          onToggleCamera={() => {
            if (engineRef.current) {
              engineRef.current.cycleCameraView();
              setCameraView(engineRef.current.cameraView);
            }
          }}
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

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleStartGame}
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
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        transmission={transmission}
        onChangeTransmission={handleChangeTransmission}
        keyBindings={keyBindings}
        onChangeKeyBindings={handleChangeKeyBindings}
        cameraView={cameraView}
        onChangeCameraView={handleChangeCameraView}
        weather={weather}
        onChangeWeather={handleChangeWeather}
        quality={quality}
        onChangeQuality={handleSelectQuality}
        achievements={achievements}
        totalCoins={totalCoins}
      />
    </div>
  );
}
