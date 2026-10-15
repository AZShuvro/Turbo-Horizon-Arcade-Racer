import * as THREE from 'three';
import { GameMode, GameState, GraphicsQuality, CarStats, PlayerInput, FloatingText, BiomeType, TrackId } from '../types/game';
import { createPlayerCar } from './proceduralModels';
import { TrackManager } from './trackManager';
import { ParticleSystem } from './particleSystem';
import { CarController } from './carController';
import { OpenWorldManager } from './OpenWorldManager';
import { soundManager } from '../audio/soundManager';

const _camTarget = new THREE.Vector3();
const _idealOffset = new THREE.Vector3();

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public trackManager: TrackManager;
  public openWorldManager: OpenWorldManager;
  public particleSystem: ParticleSystem;
  public carController: CarController;
  public playerCarGroup: THREE.Group;

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Engine state
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private quality: GraphicsQuality = 'balanced';
  public gameState: GameState = 'title';
  public gameMode: GameMode = 'arcade';

  // Camera Shake & Hitstop
  private cameraShakeIntensity = 0;
  private hitstopTimer = 0; // seconds

  // Title showcase orbit
  private titleOrbitAngle = 0;

  // Score & Gameplay Metrics
  public score = 0;
  public distance = 0;
  public coins = 0;
  public nearMisses = 0;
  public timeLeft = 35; // Arcade mode timer in seconds
  public maxDriftScore = 0;

  // React Callbacks
  public onScoreUpdate?: (stats: {
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
  }) => void;
  public onFloatingText?: (text: FloatingText) => void;
  public onGameOver?: (reason: string) => void;

  constructor(container: HTMLElement, initialCar: CarStats, quality: GraphicsQuality = 'balanced') {
    this.container = container;
    this.quality = quality;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdba74); // Warm sunset orange
    this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0055);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.5,
      600
    );
    this.camera.position.set(0, 3.5, -8);

    // 3. WebGL Renderer (Optimized for low-end hardware)
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: quality !== 'low',
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Apply quality settings
    this.setQuality(quality);

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xffedd5, 0x3b82f6, 0.9);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    this.dirLight.position.set(25, 40, -15);
    this.dirLight.castShadow = quality !== 'low';
    if (this.dirLight.shadow) {
      this.dirLight.shadow.mapSize.width = quality === 'high' ? 2048 : 1024;
      this.dirLight.shadow.mapSize.height = quality === 'high' ? 2048 : 1024;
      this.dirLight.shadow.camera.near = 1;
      this.dirLight.shadow.camera.far = 120;
      this.dirLight.shadow.camera.left = -25;
      this.dirLight.shadow.camera.right = 25;
      this.dirLight.shadow.camera.top = 25;
      this.dirLight.shadow.camera.bottom = -25;
      this.dirLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.dirLight);

    // 5. Track Manager
    this.trackManager = new TrackManager(this.scene);

    // 5b. Open World Manager (connecting City -> Beach -> Mountains)
    this.openWorldManager = new OpenWorldManager(this.scene);
    this.openWorldManager.setVisible(false);
    this.openWorldManager.onZoneChange = (_zone, zoneTitle) => {
      this.onFloatingText?.({
        id: Date.now(),
        text: `ENTERING: ${zoneTitle.toUpperCase()}`,
        type: 'checkpoint',
        score: 150,
        timestamp: Date.now(),
      });
    };
    this.openWorldManager.onDiscovery = (d) => {
      this.score += d.score;
      this.onFloatingText?.({
        id: Date.now(),
        text: `${d.name.toUpperCase()}! +${d.score}`,
        type: d.type === 'trophy' ? 'combo' : 'nitro',
        score: d.score,
        timestamp: Date.now(),
      });
    };

    // 6. Particle System
    this.particleSystem = new ParticleSystem(this.scene);

    // 7. Player Car
    this.playerCarGroup = createPlayerCar(
      initialCar.id,
      initialCar.primaryColor,
      initialCar.accentColor,
      initialCar.decalType,
      initialCar.stripeColor
    );
    this.scene.add(this.playerCarGroup);

    // 8. Car Controller
    this.carController = new CarController(
      this.playerCarGroup,
      initialCar,
      this.particleSystem,
      this.trackManager
    );
    this.carController.openWorldManager = this.openWorldManager;

    this.bindControllerEvents();
    this.setupResizeListener();
  }

  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    if (quality === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
    } else if (quality === 'balanced') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.dirLight) this.dirLight.castShadow = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.dirLight) this.dirLight.castShadow = true;
    }
  }

  public setTrack(trackId: TrackId) {
    this.trackManager.setTrack(trackId);
    this.setBiome(this.trackManager.currentBiome);
  }

  public setBiome(biome: BiomeType) {
    this.trackManager.setBiome(biome);
    if (biome === 'neon') {
      this.scene.background = new THREE.Color(0x09090b);
      this.scene.fog = new THREE.FogExp2(0x09090b, 0.006);
      this.hemiLight.color.setHex(0x818cf8);
      this.hemiLight.groundColor.setHex(0x06b6d4);
      this.dirLight.color.setHex(0xa855f7);
    } else if (biome === 'desert') {
      this.scene.background = new THREE.Color(0xfbbf24);
      this.scene.fog = new THREE.FogExp2(0xfbbf24, 0.005);
      this.hemiLight.color.setHex(0xfef3c7);
      this.hemiLight.groundColor.setHex(0xb45309);
      this.dirLight.color.setHex(0xffedd5);
    } else if (biome === 'alpine') {
      this.scene.background = new THREE.Color(0x94a3b8);
      this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.005);
      this.hemiLight.color.setHex(0xe2e8f0);
      this.hemiLight.groundColor.setHex(0x334155);
      this.dirLight.color.setHex(0xffffff);
    } else {
      // Sunset
      this.scene.background = new THREE.Color(0xfdba74);
      this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0055);
      this.hemiLight.color.setHex(0xffedd5);
      this.hemiLight.groundColor.setHex(0x3b82f6);
      this.dirLight.color.setHex(0xfff7ed);
    }
  }

  public changePlayerCar(carStats: CarStats) {
    this.scene.remove(this.playerCarGroup);
    this.playerCarGroup = createPlayerCar(
      carStats.id,
      carStats.primaryColor,
      carStats.accentColor,
      carStats.decalType,
      carStats.stripeColor
    );
    this.scene.add(this.playerCarGroup);
    this.carController.setCar(this.playerCarGroup, carStats);
  }

  private bindControllerEvents() {
    this.carController.onFloatingText = (ft) => {
      this.score += ft.score;
      if (ft.type === 'drift') {
        this.maxDriftScore = Math.max(this.maxDriftScore, ft.score);
      } else if (ft.type === 'nearMiss') {
        this.nearMisses++;
      } else if (ft.type === 'combo' && ft.text.includes('COIN')) {
        this.coins++;
      }
      this.onFloatingText?.(ft);
    };

    this.carController.onCrash = () => {
      // Hitstop simulation freeze (60ms) for punchy impact weight
      this.hitstopTimer = 0.06;
      this.cameraShakeIntensity = 0.85;
      if (this.gameMode === 'arcade') {
        this.timeLeft = Math.max(0, this.timeLeft - 4); // time penalty on crash
      }
    };

    this.carController.onCheckpointPassed = () => {
      if (this.gameMode === 'arcade') {
        this.timeLeft += 18; // +18 bonus seconds!
        this.onFloatingText?.({
          id: Date.now(),
          text: 'CHECKPOINT! +18s',
          type: 'checkpoint',
          score: 1000,
          timestamp: Date.now(),
        });
        this.score += 1000;
      }
    };
  }

  private setupResizeListener() {
    const onResize = () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / Math.max(1, height);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);
  }

  // --- START GAME LOOP ---
  public start(mode: GameMode = 'arcade') {
    this.gameMode = mode;
    this.gameState = 'playing';
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.nearMisses = 0;
    this.timeLeft = mode === 'arcade' ? 35 : mode === 'timeAttack' ? 60 : 99999;
    this.maxDriftScore = 0;
    this.cameraShakeIntensity = 0;
    this.hitstopTimer = 0;

    if (mode === 'openWorld') {
      this.carController.isOpenWorld = true;
      for (const t of this.trackManager.traffic) {
        t.meshGroup.visible = false;
        t.active = false;
      }
      for (const p of this.trackManager.pickups) {
        p.meshGroup.visible = false;
        p.active = false;
      }
      for (const c of (this.trackManager as any).roadChunks) {
        c.visible = false;
      }
      for (const cp of this.trackManager.checkpoints) {
        cp.visible = false;
      }

      this.openWorldManager.setVisible(true);
      this.scene.background = new THREE.Color(0x38bdf8); // Sky blue
      this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0035);

      // Spawn in central crossing facing south toward the beach
      this.carController.reset(0, 0, Math.PI);
    } else {
      this.carController.isOpenWorld = false;
      for (const c of (this.trackManager as any).roadChunks) {
        c.visible = true;
      }
      this.openWorldManager.setVisible(false);
      this.trackManager.reset();
      this.carController.reset(0, 0, 0);
      this.setBiome(this.trackManager.currentBiome);
    }

    soundManager.startEngine();
    soundManager.startMusic();
  }

  public pause() {
    this.gameState = 'paused';
    soundManager.stopEngine();
  }

  public resume() {
    this.gameState = 'playing';
    soundManager.startEngine();
  }

  public resetToTitle() {
    this.gameState = 'title';
    this.carController.isOpenWorld = false;
    this.openWorldManager.setVisible(false);
    for (const c of (this.trackManager as any).roadChunks) {
      c.visible = true;
    }
    this.trackManager.reset();
    this.carController.reset(0, 0, 0);
    this.setBiome(this.trackManager.currentBiome);
    soundManager.stopEngine();
    this.titleOrbitAngle = 0;
  }

  public triggerShake(amount = 0.5) {
    this.cameraShakeIntensity = Math.min(1.2, this.cameraShakeIntensity + amount);
  }

  // Continuous animation loop
  public tick(input: PlayerInput) {
    const now = performance.now();
    const rawDt = (now - (this.lastTime || now)) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    // Handle hitstop freeze frame on heavy impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.gameState === 'playing') {
      // 1. Update Car Physics
      this.carController.update(input, dt);

      const carX = this.carController.x;
      const carY = this.carController.y;
      const carZ = this.carController.z;
      const speedKmH = Math.round(Math.abs(this.carController.speed) * 3.6);

      const isOW = this.gameMode === 'openWorld';

      if (isOW) {
        // Update Open World discoveries & zone triggers
        this.openWorldManager.update(carX, carZ, speedKmH, dt);
      } else {
        // Update Track chunks & Traffic in linear modes
        this.trackManager.update(this.carController.z, dt);
      }

      // 3. Update Particles
      this.particleSystem.update(dt);

      // 4. Update Game Metrics & Timer
      this.distance += Math.floor(Math.abs(this.carController.speed) * dt);
      this.score += Math.floor(Math.abs(this.carController.speed) * 0.4 * dt * 10);

      if (this.gameMode === 'arcade' || this.gameMode === 'timeAttack') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.gameState = 'gameover';
          soundManager.stopEngine();
          this.onGameOver?.('TIME RUN OUT');
        }
      }

      // Notify React HUD
      this.onScoreUpdate?.({
        score: this.score,
        speed: speedKmH,
        nitro: Math.round(this.carController.nitroAmount),
        distance: this.distance,
        coins: this.coins,
        timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
        isDrifting: this.carController.isDrifting,
        zoneName: isOW
          ? this.openWorldManager.currentZone === 'city'
            ? 'Downtown Metropolis'
            : this.openWorldManager.currentZone === 'beach'
            ? 'Sunset Golden Beach'
            : 'Canyon Mountains & Summit'
          : undefined,
        trophiesFound: isOW ? this.openWorldManager.trophiesCollected : undefined,
        totalTrophies: isOW ? this.openWorldManager.totalTrophies : undefined,
        posX: Math.round(carX),
        posZ: Math.round(carZ),
        heading: Math.round((((this.carController.headingAngle * 180) / Math.PI) % 360 + 360) % 360),
      });

      // 5. Dynamic Camera Positioning (Smooth exponential damping follow)
      const speedNorm = Math.min(1.0, this.carController.speed / 50);

      if (isOW) {
        // 360-degree camera follow in Open World
        const camDist = 7.6 + speedNorm * 1.8;
        const camHeight = 3.8 + (this.carController.isAirborne ? 1.5 : 0);
        const h = this.carController.headingAngle;

        _idealOffset.set(
          carX - Math.sin(h) * camDist,
          carY + camHeight,
          carZ - Math.cos(h) * camDist
        );
        _camTarget.set(
          carX + Math.sin(h) * 14,
          carY + 1.2,
          carZ + Math.cos(h) * 14
        );
      } else {
        // Linear highway camera follow
        const camHeight = 3.2 + (this.carController.isAirborne ? 1.0 : 0);
        const camDist = 6.8 + speedNorm * 1.5;
        _camTarget.set(carX, carY + 1.2, carZ + 12);
        _idealOffset.set(
          carX - this.carController.steerAngle * 1.5,
          carY + camHeight,
          carZ - camDist
        );
      }

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _idealOffset.x, 9, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _idealOffset.y, 9, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _idealOffset.z, 14, dt);

      // Dynamic FOV zoom during Nitro boost
      const targetFov = this.carController.isNitroActive ? 75 : 60 + speedNorm * 6;
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
      this.camera.updateProjectionMatrix();

      // Camera Shake decay
      if (this.cameraShakeIntensity > 0.01) {
        const shakeX = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.4;
        const shakeY = (Math.random() - 0.5) * this.cameraShakeIntensity * 0.4;
        this.camera.position.x += shakeX;
        this.camera.position.y += shakeY;
        this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - dt * 2.8);
      }

      this.camera.lookAt(_camTarget);

      // Move directional light with player
      this.dirLight.position.set(carX + 25, 40, carZ - 15);
      this.dirLight.target.position.set(carX, 0, carZ + 10);
      this.dirLight.target.updateMatrixWorld();

    } else if (this.gameState === 'title') {
      // Atmospheric 3D Showcase Turntable camera pan
      this.titleOrbitAngle += dt * 0.6;
      const radius = 6.2;
      this.camera.position.x = Math.sin(this.titleOrbitAngle) * radius;
      this.camera.position.z = Math.cos(this.titleOrbitAngle) * radius;
      this.camera.position.y = 2.4 + Math.sin(this.titleOrbitAngle * 0.5) * 0.4;
      this.camera.lookAt(0, 0.8, 0);

      this.playerCarGroup.rotation.y = this.titleOrbitAngle * 0.25;
      this.particleSystem.update(dt);
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.trackManager.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
    soundManager.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
