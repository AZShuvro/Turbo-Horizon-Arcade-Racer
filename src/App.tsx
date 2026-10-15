/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { CARS_CATALOG } from './data/cars';
import {
  CarStats,
  GameMode,
  GameState,
  GraphicsQuality,
  BiomeType,
  FloatingText,
  PlayerInput,
  TrackId,
} from './types/game';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { soundManager } from './audio/soundManager';
import { TRACKS_CATALOG } from './data/cars';

const HIGH_SCORE_KEY = 'turbo_horizon_highscore';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High score
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });

  // Game UI state
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('sunset-coastal');
  const [quality, setQuality] = useState<GraphicsQuality>('balanced');
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
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [gameOverStats, setGameOverStats] = useState({
    score: 0,
    isNewHigh: false,
    distance: 0,
    coins: 0,
    nearMisses: 0,
  });

  // Continuous input state (isolated in ref to prevent React re-renders)
  const inputRef = useRef<PlayerInput>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
  });

  // Mount WebGL Engine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, currentCar, quality);
    engineRef.current = engine;

    engine.onScoreUpdate = (stats) => {
      setHudStats(stats);
    };

    engine.onFloatingText = (ft) => {
      setFloatingTexts((prev) => [...prev.slice(-4), ft]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== ft.id));
      }, 900);
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
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update car when changed in Title
  const handleSelectCar = useCallback((car: CarStats) => {
    setCurrentCar(car);
    if (engineRef.current) {
      engineRef.current.changePlayerCar(car);
    }
  }, []);

  // Update car customization (primary color, decals, stripe colors)
  const handleUpdateCarCustomization = useCallback((updates: Partial<CarStats>) => {
    setCurrentCar((prev) => {
      const updated = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.changePlayerCar(updated);
      }
      return updated;
    });
  }, []);

  // Quality switch
  const handleSelectQuality = useCallback((q: GraphicsQuality) => {
    setQuality(q);
    if (engineRef.current) {
      engineRef.current.setQuality(q);
    }
  }, []);

  // Track switch
  const handleSelectTrack = useCallback((trackId: TrackId) => {
    setSelectedTrack(trackId);
    if (engineRef.current) {
      engineRef.current.setTrack(trackId);
    }
  }, []);

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
      engineRef.current.resetToTitle();
    }
    setGameState('title');
  }, []);

  // Keyboard controls listener with edge triggers and blur clearance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Audio unlock on any key
      soundManager.unlock();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.forward = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.backward = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.left = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.right = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          inputRef.current.drift = true;
        } else if (gameState === 'title' || gameState === 'gameover') {
          handleStartGame();
        }
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
        inputRef.current.nitro = true;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
      }
      if (e.code === 'KeyR' && gameState === 'playing') {
        handleStartGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.forward = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.backward = false;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.left = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.right = false;
      }
      if (e.code === 'Space') {
        inputRef.current.drift = false;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN') {
        inputRef.current.nitro = false;
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
      {/* Isolated Three.js WebGL Viewport Container (never re-rendered by React) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          currentCar={currentCar}
          selectedTrack={selectedTrack}
          selectedMode={gameMode}
          selectedQuality={quality}
          highScore={highScore}
          onSelectCar={handleSelectCar}
          onUpdateCarCustomization={handleUpdateCarCustomization}
          onSelectTrack={handleSelectTrack}
          onSelectMode={setGameMode}
          onSelectQuality={handleSelectQuality}
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
          floatingTexts={floatingTexts}
          onPause={handlePause}
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
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal onResume={handleResume} onRestart={handleStartGame} onHome={handleHome} />
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
    </div>
  );
}
