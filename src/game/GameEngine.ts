import * as THREE from 'three';
import {
  GameMode,
  GameState,
  GraphicsQuality,
  CarStats,
  PlayerInput,
  FloatingText,
  BiomeType,
  TrackId,
  CameraView,
  WeatherType,
  TransmissionType,
} from '../types/game';
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

  // Weather & Camera View
  public weather: WeatherType = 'sunset';
  public cameraView: CameraView = 'thirdPerson';

  // Camera Shake & Hitstop
  private cameraShakeIntensity = 0;
  private hitstopTimer = 0; // seconds

  // Title showcase orbit
  private titleOrbitAngle = 0;

  // Police Chase state
  public policeSurvivalTimer = 0;
  private sirenSoundCooldown = 0;

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
  }) => void;
  public onFloatingText?: (text: FloatingText) => void;
  public onGameOver?: (reason: string) => void;
  public onAchievementTrigger?: (id: string) => void;

  constructor(container: HTMLElement, initialCar: CarStats, quality: GraphicsQuality = 'balanced') {
    this.container = container;
    this.quality = quality;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdba74);
    this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0055);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.3,
      700
    );
    this.camera.position.set(0, 3.5, -8);

    // 3. WebGL Renderer
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

    // 5b. Open World Manager
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

  // --- CAMERA ANGLE VIEW TOGGLES ---
  public setCameraView(view: CameraView) {
    this.cameraView = view;
    this.onFloatingText?.({
      id: Date.now(),
      text: `CAMERA: ${view === 'thirdPerson' ? 'THIRD PERSON' : view === 'hood' ? 'HOOD / COCKPIT' : 'TOP-DOWN ARCADE'}`,
      type: 'powerup',
      score: 50,
      timestamp: Date.now(),
    });
  }

  public cycleCameraView() {
    const views: CameraView[] = ['thirdPerson', 'hood', 'topDown'];
    const nextIdx = (views.indexOf(this.cameraView) + 1) % views.length;
    this.setCameraView(views[nextIdx]);
  }

  // --- WEATHER & LIGHTING VARIATIONS ---
  public setWeather(weather: WeatherType) {
    this.weather = weather;
    this.trackManager.setWeather(weather);

    if (weather === 'sunny') {
      this.scene.background = new THREE.Color(0x38bdf8); // Sky blue
      this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0035);
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x64748b);
      this.hemiLight.intensity = 1.1;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 1.8;
    } else if (weather === 'night') {
      this.scene.background = new THREE.Color(0x09090b); // Cyber midnight
      this.scene.fog = new THREE.FogExp2(0x09090b, 0.007);
      this.hemiLight.color.setHex(0x312e81);
      this.hemiLight.groundColor.setHex(0x030712);
      this.hemiLight.intensity = 0.55;
      this.dirLight.color.setHex(0x1e1b4b);
      this.dirLight.intensity = 0.45;
    } else if (weather === 'rain') {
      this.scene.background = new THREE.Color(0x334155); // Stormy overcast
      this.scene.fog = new THREE.FogExp2(0x334155, 0.008);
      this.hemiLight.color.setHex(0x94a3b8);
      this.hemiLight.groundColor.setHex(0x1e293b);
      this.hemiLight.intensity = 0.7;
      this.dirLight.color.setHex(0xe2e8f0);
      this.dirLight.intensity = 0.95;
    } else {
      // Sunset (default)
      this.scene.background = new THREE.Color(0xfdba74);
      this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0055);
      this.hemiLight.color.setHex(0xffedd5);
      this.hemiLight.groundColor.setHex(0x3b82f6);
      this.hemiLight.intensity = 0.9;
      this.dirLight.color.setHex(0xfff7ed);
      this.dirLight.intensity = 1.6;
    }
  }

  public setTrack(trackId: TrackId) {
    this.trackManager.setTrack(trackId);
    this.setBiome(this.trackManager.currentBiome);
  }

  public setBiome(biome: BiomeType) {
    this.trackManager.setBiome(biome);
    if (this.weather === 'sunset') {
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
        this.scene.background = new THREE.Color(0xfdba74);
        this.scene.fog = new THREE.FogExp2(0xfdba74, 0.0055);
        this.hemiLight.color.setHex(0xffedd5);
        this.hemiLight.groundColor.setHex(0x3b82f6);
        this.dirLight.color.setHex(0xfff7ed);
      }
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
      this.hitstopTimer = 0.06;
      this.cameraShakeIntensity = 0.85;
    };

    this.carController.onCheckpointPassed = () => {
      if (this.gameMode === 'arcade') {
        this.timeLeft += 18;
      } else if (this.gameMode === 'timeAttack') {
        this.timeLeft += 12;
      }
      this.score += 1500;
      this.onFloatingText?.({
        id: Date.now(),
        text: 'CHECKPOINT! +18s',
        type: 'checkpoint',
        score: 1500,
        timestamp: Date.now(),
      });
    };

    this.carController.onAchievementTrigger = (id) => {
      this.onAchievementTrigger?.(id);
    };
  }

  private setupResizeListener() {
    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = Math.max(1, this.container.clientHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
  }

  public start(mode: GameMode = 'arcade') {
    this.gameMode = mode;
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.nearMisses = 0;
    this.policeSurvivalTimer = 0;
    this.timeLeft = mode === 'timeAttack' ? 45 : 35;
    this.hitstopTimer = 0;
    this.cameraShakeIntensity = 0;

    const isOW = mode === 'openWorld';
    this.carController.isOpenWorld = isOW;
    this.openWorldManager.setVisible(isOW);

    for (const c of (this.trackManager as any).roadChunks) {
      c.visible = !isOW;
    }

    if (isOW) {
      this.openWorldManager.reset();
      this.carController.reset(0, 0, 0);
      this.scene.background = new THREE.Color(0x38bdf8);
      this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0035);
    } else {
      this.trackManager.reset();
      this.carController.reset(0, 0, 0);
      this.setWeather(this.weather);
    }

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
    this.setWeather(this.weather);
    soundManager.stopEngine();
    this.titleOrbitAngle = 0;
  }

  public pause() {
    this.gameState = 'paused';
    soundManager.stopEngine();
  }

  public resume() {
    this.gameState = 'playing';
    soundManager.startEngine();
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
      const isPolice = this.gameMode === 'policeChase';

      if (isOW) {
        this.openWorldManager.update(carX, carZ, speedKmH, dt);
      } else {
        this.trackManager.update(carZ, dt, carX, this.carController.speed, isPolice);
      }

      // 2. Police Chase Logic & Survival
      if (isPolice) {
        this.policeSurvivalTimer += dt;
        this.sirenSoundCooldown -= dt;

        // Siren audio when cop nearby
        if (this.sirenSoundCooldown <= 0) {
          const copNearby = this.trackManager.traffic.some(
            (c) => c.active && c.type === 'cop' && Math.abs(c.z - carZ) < 35
          );
          if (copNearby) {
            soundManager.playSiren();
            this.sirenSoundCooldown = 4.5;
          }
        }

        // 30s survival achievement
        if (this.policeSurvivalTimer >= 30) {
          this.onAchievementTrigger?.('cop-evader');
        }
      }

      // 3. Weather: Rain droplets in Rain weather
      if (this.weather === 'rain') {
        this.particleSystem.emitRain(carX, carZ, 8);
      }

      // 4. Update Particles
      this.particleSystem.update(dt);

      // 5. Update Game Metrics & Timer
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

      // Heat level calculation (1 to 5 stars)
      const heatLevel = isPolice ? Math.min(5, 1 + Math.floor(this.policeSurvivalTimer / 12)) : undefined;

      // Notify React HUD
      this.onScoreUpdate?.({
        score: this.score,
        speed: speedKmH,
        nitro: Math.round(this.carController.nitroAmount),
        distance: this.distance,
        coins: this.coins,
        timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
        isDrifting: this.carController.isDrifting,
        shield: this.carController.hasShield,
        magnetTimeLeft: Math.ceil(this.carController.magnetTimer),
        currentGear: this.carController.currentGear,
        transmission: this.carController.transmission,
        clutch: this.carController.clutchEngaged,
        cameraView: this.cameraView,
        weather: this.weather,
        headlights: this.carController.headlightsActive,
        indicators: this.carController.indicatorState,
        doorsOpen: this.carController.doorsOpen,
        trunkOpen: this.carController.trunkOpen,
        heatLevel,
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

      // 6. Dynamic Camera Follow with 3 Camera Modes
      const speedNorm = Math.min(1.0, this.carController.speed / 50);

      if (this.cameraView === 'hood') {
        // --- COCKPIT / HOOD VIEW ---
        if (isOW) {
          const h = this.carController.headingAngle;
          _idealOffset.set(
            carX + Math.sin(h) * 0.7,
            carY + 0.88,
            carZ + Math.cos(h) * 0.7
          );
          _camTarget.set(
            carX + Math.sin(h) * 28,
            carY + 0.78,
            carZ + Math.cos(h) * 28
          );
        } else {
          _idealOffset.set(carX, carY + 0.88, carZ + 0.7);
          _camTarget.set(carX, carY + 0.78, carZ + 28);
        }
      } else if (this.cameraView === 'topDown') {
        // --- TOP-DOWN ARCADE CAMERA ---
        _idealOffset.set(carX, carY + 22, carZ - 3);
        _camTarget.set(carX, carY, carZ + 14);
      } else {
        // --- THIRD-PERSON CHASE (DEFAULT) ---
        if (isOW) {
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
          const camHeight = 3.2 + (this.carController.isAirborne ? 1.0 : 0);
          const camDist = 6.8 + speedNorm * 1.5;
          _camTarget.set(carX, carY + 1.2, carZ + 12);
          _idealOffset.set(
            carX - this.carController.steerAngle * 1.5,
            carY + camHeight,
            carZ - camDist
          );
        }
      }

      const lerpSpeed = this.cameraView === 'hood' ? 24 : 10;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _idealOffset.x, lerpSpeed, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _idealOffset.y, lerpSpeed, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _idealOffset.z, lerpSpeed, dt);

      // FOV
      const baseFov = this.cameraView === 'hood' ? 72 : this.cameraView === 'topDown' ? 50 : 60;
      const targetFov = this.carController.isNitroActive ? baseFov + 14 : baseFov + speedNorm * 6;
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
