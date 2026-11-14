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
  MultiplayerPlayerInfo,
  RemotePlayerTransform,
  OpenWorldHudState,
  CarStance,
} from '../types/game';
import { createPlayerCar, createUsernameTag, applyCarStance } from './proceduralModels';
import { TrackManager } from './trackManager';
import { ParticleSystem } from './particleSystem';
import { CarController } from './carController';
import { OpenWorldManager } from './OpenWorldManager';
import { ZONE_LABELS, getWorldHeightAt, distanceToNearestRoad } from './openWorldData';
import { DEFAULT_CAR_STANCE } from '../data/cars';
import { soundManager } from '../audio/soundManager';

interface ReplayFrame {
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  roll: number;
  steer: number;
  speed: number;
}

const REPLAY_CAPACITY = 300; // 10s @ 30Hz
const REPLAY_INTERVAL = 1 / 30;

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

  // Photo Mode & Crash Cam
  public isPhotoMode = false;
  public photoFov = 65;
  public photoFilter: 'normal' | 'vintage' | 'cyber' | 'noir' = 'normal';
  public photoOrbitX = 0;
  public photoOrbitY = 0;
  public crashCamTimer = 0; // seconds of cinematic slow-mo

  // Car Stance & Zero-GC 10-Second Replay Ring Buffer
  public carStance: CarStance = { ...DEFAULT_CAR_STANCE };
  public isReplayActive = false;
  private replayFrames: ReplayFrame[] = [];
  private replayHead = 0;
  private replayCount = 0;
  private replaySampleTimer = 0;
  private replayPlayTime = 0;
  private replayDuration = 0;
  private lastReplayEmitTenths = -1;
  private lastReplayCamIdx = -1;
  private replayRestoreState: GameState = 'paused';

  // Racing Position / Rank
  public raceRank = 1;

  // Camera Shake & Hitstop
  private cameraShakeIntensity = 0;
  private hitstopTimer = 0; // seconds

  // Title showcase orbit
  private titleOrbitAngle = 0;

  // Police Chase state
  public policeSurvivalTimer = 0;
  private sirenSoundCooldown = 0;

  // Player Profile & Online Multiplayer state
  public playerUsername = 'DRIVER 01';
  public playerTagColor = '#f59e0b';
  private playerUsernameSprite: THREE.Sprite | null = null;
  public onlinePhase: 'countdown' | 'racing' | 'finished' = 'racing';
  public onlineLap = 1;
  public onlineTotalLaps = 3;
  public onlineLapDistance = 1200;
  private lastTransformEmitTime = 0;
  private onlineFinishEmitted = false;
  private remoteCars = new Map<
    string,
    {
      info: MultiplayerPlayerInfo;
      mesh: THREE.Group;
      targetX: number;
      targetY: number;
      targetZ: number;
      targetRotY: number;
      targetSteer: number;
      speed: number;
      distance: number;
      lap: number;
      finished: boolean;
      finishRank: number;
    }
  >();

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
    openWorld?: OpenWorldHudState;
    health?: number;
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
  }) => void;
  // Zero-allocation 60fps telemetry stream for imperative DOM/Canvas gauges (no React re-renders)
  public onFastTelemetry?: (
    speedKmH: number,
    nitro: number,
    gear: number,
    posX: number,
    posZ: number,
    headingDeg: number,
    isDrifting: boolean
  ) => void;
  public onFloatingText?: (text: FloatingText) => void;
  public onGameOver?: (reason: string) => void;
  public onAchievementTrigger?: (id: string) => void;
  public onRecordUpdate?: (type: 'race' | 'drift' | 'ramp', id: string, value: number, secondary?: number) => void;
  public onReplayProgress?: (currentSec: number, totalSec: number, cameraLabel: string) => void;
  public onReplayEnded?: (restoreState: GameState) => void;
  private hudEmitTimer = 0;
  private lastHudSig = '';
  public onLocalTransform?: (state: {
    x: number;
    y: number;
    z: number;
    rotY: number;
    steer: number;
    speed: number;
    d: number;
    lap: number;
  }) => void;
  public onOnlineFinish?: () => void;


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
    this.openWorldManager.setQuality(quality);
    this.openWorldManager.onZoneChange = (_zone, zoneTitle) => {
      this.onFloatingText?.({
        id: Date.now(),
        text: `ENTERING: ${zoneTitle.toUpperCase()}`,
        type: 'checkpoint',
        score: 150,
        timestamp: Date.now(),
      });
    };
    this.openWorldManager.onActivityReward = (reward) => {
      this.score += reward.score;
      if (reward.coins > 0) {
        this.coins += reward.coins;
      }
      this.onFloatingText?.({
        id: Date.now() + Math.random(),
        text: reward.coins > 0 ? `${reward.title} (+${reward.coins} COINS)` : reward.title,
        type: reward.kind === 'race' || reward.kind === 'hub' ? 'checkpoint' : reward.kind === 'speedtrap' ? 'speedtrap' : 'combo',
        score: reward.score,
        timestamp: Date.now(),
      });
    };
    this.openWorldManager.onAchievementTrigger = (id) => {
      this.onAchievementTrigger?.(id);
    };
    this.openWorldManager.onRepairPulse = (hpDelta, nitroDelta, stationName) => {
      const justFull = this.carController.healAndRefill(hpDelta, nitroDelta);
      if (justFull) {
        soundManager.playRepairComplete();
        this.particleSystem.emitRepairSparkles(
          this.carController.x,
          this.carController.y,
          this.carController.z,
          20
        );
        this.onFloatingText?.({
          id: Date.now() + Math.random(),
          text: `${stationName.toUpperCase()}: 100% HP & NITRO REFILLED`,
          type: 'powerup',
          score: 100,
          timestamp: Date.now(),
        });
      }
    };
    this.openWorldManager.onRecordEvent = (evt) => {
      this.onRecordUpdate?.(evt.kind, evt.id, evt.value);
    };

    // 6. Particle System
    this.particleSystem = new ParticleSystem(this.scene);

    // Pre-allocate Zero-GC Replay Ring Buffer
    for (let i = 0; i < REPLAY_CAPACITY; i++) {
      this.replayFrames.push({ x: 0, y: 0, z: 0, rotY: 0, pitch: 0, roll: 0, steer: 0, speed: 0 });
    }

    // 7. Player Car
    this.playerCarGroup = createPlayerCar(
      initialCar.id,
      initialCar.primaryColor,
      initialCar.accentColor,
      initialCar.decalType,
      initialCar.stripeColor
    );
    applyCarStance(this.playerCarGroup, this.carStance);
    this.scene.add(this.playerCarGroup);
    this.attachPlayerUsernameSprite();

    // 8. Car Controller
    this.carController = new CarController(
      this.playerCarGroup,
      initialCar,
      this.particleSystem,
      this.trackManager
    );
    this.carController.openWorldManager = this.openWorldManager;
    this.carController.setStance(this.carStance);

    this.bindControllerEvents();
    this.setupResizeListener();
    this.setupPointerControls();
  }

  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private setupPointerControls() {
    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (this.isPhotoMode) {
        this.photoOrbitX -= dx * 0.008;
        this.photoOrbitY = Math.max(-1.0, Math.min(1.5, this.photoOrbitY - dy * 0.008));
      } else if (this.gameState === 'title') {
        this.titleOrbitAngle -= dx * 0.008;
      }
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    this.container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  public takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public honkHorn() {
    soundManager.playHorn();
    this.onFloatingText?.({
      id: Date.now(),
      text: '📢 BEEP BEEP!',
      type: 'powerup',
      score: 10,
      timestamp: Date.now(),
    });
  }


  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    if (quality === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
      this.camera.far = 265;
    } else if (quality === 'balanced') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.dirLight) this.dirLight.castShadow = true;
      this.camera.far = 400;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.dirLight) this.dirLight.castShadow = true;
      this.camera.far = 620;
    }
    this.camera.updateProjectionMatrix();
    this.openWorldManager?.setQuality(quality);
  }

  public setGpsWaypoint(x: number, z: number, label = 'Custom Pin') {
    this.openWorldManager.setGpsWaypoint(x, z, label);
    this.onFloatingText?.({
      id: Date.now(),
      text: `GPS LOCKED: ${label.toUpperCase()}`,
      type: 'checkpoint',
      score: 0,
      timestamp: Date.now(),
    });
  }

  public clearGpsWaypoint() {
    this.openWorldManager.clearGpsWaypoint();
  }

  public fastTravelToHub(hubId: string) {
    const dest = this.openWorldManager.fastTravelToHub(hubId);
    if (!dest) return false;
    const destY = getWorldHeightAt(dest.x, dest.z, 8.0);
    this.carController.x = dest.x;
    this.carController.z = dest.z;
    this.carController.y = destY;
    this.carController.vy = 0;
    this.carController.isAirborne = false;
    this.carController.headingAngle = dest.heading;
    this.carController.speed = 0;
    this.carController.mesh.position.set(dest.x, destY, dest.z);
    this.carController.mesh.rotation.set(0, dest.heading, 0);
    this.onFloatingText?.({
      id: Date.now(),
      text: `FAST TRAVELED: ${dest.name.toUpperCase()}`,
      type: 'checkpoint',
      score: 0,
      timestamp: Date.now(),
    });
    return true;
  }

  public cancelStreetRace() {
    this.openWorldManager.cancelStreetRace();
  }

  public resetCarToRoad() {
    const isOW = this.gameMode === 'openWorld' || this.gameMode === 'zen';
    if (isOW) {
      const nearest = distanceToNearestRoad(this.carController.x, this.carController.z);
      const roadHeading = Math.atan2(nearest.road.x2 - nearest.road.x1, nearest.road.z2 - nearest.road.z1);
      const destY = getWorldHeightAt(nearest.cx, nearest.cz, 8.0);
      this.carController.x = nearest.cx;
      this.carController.z = nearest.cz;
      this.carController.y = destY;
      this.carController.vy = 0;
      this.carController.isAirborne = false;
      this.carController.speed = 0;
      this.carController.headingAngle = roadHeading;
      this.carController.mesh.position.set(nearest.cx, destY, nearest.cz);
      this.carController.mesh.rotation.set(0, roadHeading, 0);
    } else {
      this.carController.x = 0;
      this.carController.y = 0;
      this.carController.vy = 0;
      this.carController.isAirborne = false;
      this.carController.speed = Math.min(this.carController.speed, 12);
      this.carController.headingAngle = 0;
      this.carController.mesh.position.set(0, 0, this.carController.z);
      this.carController.mesh.rotation.set(0, 0, 0);
    }
    this.onFloatingText?.({
      id: Date.now(),
      text: 'CAR RESET TO ROAD',
      type: 'checkpoint',
      score: 0,
      timestamp: Date.now(),
    });
  }

  // --- CAMERA ANGLE VIEW TOGGLES ---
  public setCameraView(view: CameraView) {
    this.cameraView = view;
    if (this.playerUsernameSprite) {
      this.playerUsernameSprite.visible = view !== 'hood';
    }
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
    this.openWorldManager?.setWeather(weather);

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

  private disposeSprite(sprite: THREE.Sprite | null) {
    if (!sprite) return;
    sprite.parent?.remove(sprite);
    const mat = sprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.dispose();
  }

  private attachPlayerUsernameSprite() {
    this.disposeSprite(this.playerUsernameSprite);
    this.playerUsernameSprite = createUsernameTag(
      this.playerUsername,
      this.playerTagColor,
      true
    );
    this.playerUsernameSprite.visible = this.cameraView !== 'hood';
    this.playerCarGroup.add(this.playerUsernameSprite);
  }

  public updatePlayerProfileTag(username: string, tagColor = '#f59e0b') {
    this.playerUsername = username || 'DRIVER 01';
    this.playerTagColor = tagColor || '#f59e0b';
    this.attachPlayerUsernameSprite();
  }

  public setCarStance(stance: CarStance) {
    this.carStance = { ...stance };
    this.carController.setStance(this.carStance);
    applyCarStance(this.playerCarGroup, this.carStance);
  }

  public changePlayerCar(carStats: CarStats) {
    this.disposeSprite(this.playerUsernameSprite);
    this.playerUsernameSprite = null;
    this.scene.remove(this.playerCarGroup);
    this.playerCarGroup = createPlayerCar(
      carStats.id,
      carStats.primaryColor,
      carStats.accentColor,
      carStats.decalType,
      carStats.stripeColor
    );
    applyCarStance(this.playerCarGroup, this.carStance);
    this.scene.add(this.playerCarGroup);
    this.attachPlayerUsernameSprite();
    this.carController.setCar(this.playerCarGroup, carStats);
    this.carController.setStance(this.carStance);
  }

  public setOnlineRacePhase(phase: 'countdown' | 'racing' | 'finished') {
    this.onlinePhase = phase;
  }

  public clearRemoteCars() {
    for (const remote of this.remoteCars.values()) {
      const tag = remote.mesh.getObjectByName('username-tag') as THREE.Sprite | undefined;
      if (tag) this.disposeSprite(tag);
      this.scene.remove(remote.mesh);
    }
    this.remoteCars.clear();
  }

  public syncRemotePlayersMeta(players: MultiplayerPlayerInfo[], selfId: string | null) {
    const activeIds = new Set(players.map((p) => p.id));

    for (const [id, remote] of this.remoteCars.entries()) {
      if (!activeIds.has(id) || id === selfId) {
        const tag = remote.mesh.getObjectByName('username-tag') as THREE.Sprite | undefined;
        if (tag) this.disposeSprite(tag);
        this.scene.remove(remote.mesh);
        this.remoteCars.delete(id);
      }
    }

    const laneOffsets = [-4.5, -1.5, 1.5, 4.5];
    players.forEach((p, idx) => {
      if (p.id === selfId) return;
      const existing = this.remoteCars.get(p.id);
      if (!existing) {
        const mesh = createPlayerCar(
          p.car.id,
          p.car.primaryColor,
          p.car.accentColor,
          p.car.decalType,
          p.car.stripeColor
        );
        const tag = createUsernameTag(p.username, '#38bdf8', false);
        mesh.add(tag);
        const startX = laneOffsets[idx % 4];
        mesh.position.set(startX, 0, 0);
        this.scene.add(mesh);

        this.remoteCars.set(p.id, {
          info: p,
          mesh,
          targetX: startX,
          targetY: 0,
          targetZ: 0,
          targetRotY: 0,
          targetSteer: 0,
          speed: 0,
          distance: p.distance || 0,
          lap: p.lap || 1,
          finished: p.finished,
          finishRank: p.finishRank || 0,
        });
      } else {
        const carChanged =
          existing.info.car.id !== p.car.id ||
          existing.info.car.primaryColor !== p.car.primaryColor ||
          existing.info.car.decalType !== p.car.decalType ||
          existing.info.username !== p.username;
        existing.info = p;
        existing.finished = p.finished;
        existing.finishRank = p.finishRank || existing.finishRank;

        if (carChanged) {
          const prevPos = existing.mesh.position.clone();
          const prevRotY = existing.mesh.rotation.y;
          const oldTag = existing.mesh.getObjectByName('username-tag') as THREE.Sprite | undefined;
          if (oldTag) this.disposeSprite(oldTag);
          this.scene.remove(existing.mesh);

          const mesh = createPlayerCar(
            p.car.id,
            p.car.primaryColor,
            p.car.accentColor,
            p.car.decalType,
            p.car.stripeColor
          );
          mesh.add(createUsernameTag(p.username, '#38bdf8', false));
          mesh.position.copy(prevPos);
          mesh.rotation.y = prevRotY;
          this.scene.add(mesh);
          existing.mesh = mesh;
        }
      }
    });
  }

  public applyRemoteTransforms(transforms: RemotePlayerTransform[], selfId: string | null) {
    for (const tr of transforms) {
      if (tr.id === selfId) continue;
      const remote = this.remoteCars.get(tr.id);
      if (!remote) continue;
      remote.targetX = tr.x;
      remote.targetY = tr.y;
      remote.targetZ = tr.z;
      remote.targetRotY = tr.rotY;
      remote.targetSteer = tr.steer;
      remote.speed = tr.speed;
      remote.distance = tr.distance;
      remote.lap = tr.lap;
      remote.finished = tr.finished;
      remote.finishRank = tr.finishRank;
    }
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
      this.hitstopTimer = 0.08;
      this.cameraShakeIntensity = 0.95;
      this.crashCamTimer = 1.0; // Cinematic slow motion crash cam!
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

    this.carController.onJumpLanded = (distMeters, airtimeSec, rampId) => {
      if (distMeters >= 8 || airtimeSec >= 0.7) {
        this.onFloatingText?.({
          id: Date.now() + Math.random(),
          text: `BIG AIR: ${Math.round(distMeters)}m (${airtimeSec.toFixed(1)}s)`,
          type: 'checkpoint',
          score: Math.round(distMeters * 8),
          timestamp: Date.now(),
        });
        this.score += Math.round(distMeters * 8);
      }
      this.onRecordUpdate?.(
        'ramp',
        rampId || 'open-jump',
        Math.round(distMeters),
        Number(airtimeSec.toFixed(2))
      );
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

  public start(
    mode: GameMode = 'arcade',
    options?: {
      startX?: number;
      totalLaps?: number;
      lapDistance?: number;
      countdownActive?: boolean;
    }
  ) {
    this.gameMode = mode;
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.nearMisses = 0;
    this.policeSurvivalTimer = 0;
    this.timeLeft = mode === 'timeAttack' ? 45 : 35;
    this.hitstopTimer = 0;
    this.cameraShakeIntensity = 0;
    this.onlineLap = 1;
    this.onlineTotalLaps = options?.totalLaps ?? 3;
    this.onlineLapDistance = options?.lapDistance ?? 1200;
    this.onlineFinishEmitted = false;
    this.onlinePhase = options?.countdownActive ? 'countdown' : 'racing';
    this.lastTransformEmitTime = 0;
    this.isReplayActive = false;
    this.replayHead = 0;
    this.replayCount = 0;
    this.replaySampleTimer = 0;

    const isOW = mode === 'openWorld' || mode === 'zen';
    this.carController.isOpenWorld = isOW;
    this.openWorldManager.setVisible(isOW);

    for (const c of (this.trackManager as any).roadChunks) {
      c.visible = !isOW;
    }

    const startX = options?.startX ?? 0;

    if (isOW) {
      this.clearRemoteCars();
      this.openWorldManager.reset();
      this.openWorldManager.setQuality(this.quality);
      this.openWorldManager.setWeather(this.weather);
      // Spawn cleanly at Central Crossroads Hub facing Downtown Cyber Metro
      this.carController.reset(0, 140, -Math.PI * 0.5);
      this.setWeather(this.weather);
      const fogDensity = this.quality === 'low' ? 0.0058 : this.quality === 'balanced' ? 0.0038 : 0.0026;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = fogDensity;
      }
    } else {
      if (mode !== 'online') {
        this.clearRemoteCars();
      }
      this.trackManager.reset();
      this.carController.reset(startX, 0, 0);
      this.setWeather(this.weather);
    }

    this.gameState = 'playing';
    soundManager.startEngine();
  }

  public resetToTitle() {
    this.gameState = 'title';
    this.carController.isOpenWorld = false;
    this.clearRemoteCars();
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

  public hasReplayFrames(): boolean {
    return this.replayCount >= 6;
  }

  public startReplay(restoreState: GameState = 'paused'): boolean {
    if (this.replayCount < 6) return false;
    this.replayRestoreState = restoreState;
    this.isReplayActive = true;
    this.gameState = 'playing';
    this.replayPlayTime = 0;
    this.replayDuration = (this.replayCount - 1) * REPLAY_INTERVAL;
    this.lastReplayEmitTenths = -1;
    this.lastReplayCamIdx = -1;
    soundManager.stopEngine();
    return true;
  }

  public stopReplay(overrideState?: GameState) {
    if (!this.isReplayActive) return;
    this.isReplayActive = false;
    const target = overrideState || this.replayRestoreState;
    this.gameState = target;
    this.playerCarGroup.position.set(this.carController.x, this.carController.y, this.carController.z);
    this.playerCarGroup.rotation.set(0, this.carController.headingAngle, 0);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.onReplayEnded?.(target);
  }

  private recordReplayFrame(dt: number) {
    this.replaySampleTimer += dt;
    if (this.replaySampleTimer < REPLAY_INTERVAL && this.replayCount > 0) return;
    this.replaySampleTimer = 0;
    const slot = this.replayFrames[this.replayHead];
    slot.x = this.carController.x;
    slot.y = this.carController.y;
    slot.z = this.carController.z;
    slot.rotY = this.playerCarGroup.rotation.y;
    slot.pitch = this.playerCarGroup.rotation.x;
    slot.roll = this.playerCarGroup.rotation.z;
    slot.steer = this.carController.steerAngle;
    slot.speed = this.carController.speed;
    this.replayHead = (this.replayHead + 1) % REPLAY_CAPACITY;
    if (this.replayCount < REPLAY_CAPACITY) {
      this.replayCount++;
    }
  }

  private getReplayFrameAt(index: number): ReplayFrame {
    const oldest = this.replayCount < REPLAY_CAPACITY ? 0 : this.replayHead;
    const wrapped = (oldest + Math.max(0, Math.min(this.replayCount - 1, index))) % REPLAY_CAPACITY;
    return this.replayFrames[wrapped];
  }

  private updateReplayPlayback(dt: number) {
    this.replayPlayTime += dt;
    if (this.replayPlayTime >= this.replayDuration) {
      this.stopReplay();
      return;
    }

    const exactIdx = this.replayPlayTime / REPLAY_INTERVAL;
    const idxA = Math.min(this.replayCount - 2, Math.floor(exactIdx));
    const idxB = idxA + 1;
    const alpha = Math.max(0, Math.min(1, exactIdx - idxA));

    const fA = this.getReplayFrameAt(idxA);
    const fB = this.getReplayFrameAt(idxB);

    const x = fA.x + (fB.x - fA.x) * alpha;
    const y = fA.y + (fB.y - fA.y) * alpha;
    const z = fA.z + (fB.z - fA.z) * alpha;
    // Shortest angle lerp for rotY
    let dRot = fB.rotY - fA.rotY;
    while (dRot > Math.PI) dRot -= Math.PI * 2;
    while (dRot < -Math.PI) dRot += Math.PI * 2;
    const rotY = fA.rotY + dRot * alpha;
    const pitch = fA.pitch + (fB.pitch - fA.pitch) * alpha;
    const roll = fA.roll + (fB.roll - fA.roll) * alpha;
    const steer = fA.steer + (fB.steer - fA.steer) * alpha;
    const spd = fA.speed + (fB.speed - fA.speed) * alpha;

    this.playerCarGroup.position.set(x, y, z);
    this.playerCarGroup.rotation.set(pitch, rotY, roll);

    const ud = (this.playerCarGroup as any).userData;
    const wheelMounts = ud?.wheelMounts as THREE.Group[] | undefined;
    const wheels = ud?.wheels as THREE.Group[] | undefined;
    const spin = (spd * dt) / 0.36;
    if (wheels) {
      for (let i = 0; i < wheels.length; i++) wheels[i].rotation.x += spin;
    }
    if (wheelMounts && wheelMounts.length >= 2) {
      wheelMounts[0].rotation.y = steer * 0.85;
      wheelMounts[1].rotation.y = steer * 0.85;
    }

    // Cycle 3 cinematic cameras every ~3.3s
    const camIdx = Math.min(2, Math.floor((this.replayPlayTime / Math.max(0.1, this.replayDuration)) * 3));
    let camLabel = 'TRACKSIDE LOW CAM';
    if (camIdx === 0) {
      camLabel = 'TRACKSIDE LOW CAM';
      const anchorIdx = Math.min(this.replayCount - 1, Math.floor((camIdx + 0.65) * (this.replayCount / 3)));
      const anchor = this.getReplayFrameAt(anchorIdx);
      const sideX = Math.cos(anchor.rotY) * 5.4;
      const sideZ = -Math.sin(anchor.rotY) * 5.4;
      this.camera.position.set(
        anchor.x + Math.sin(anchor.rotY) * 6 + sideX,
        anchor.y + 1.35,
        anchor.z + Math.cos(anchor.rotY) * 6 + sideZ
      );
      this.camera.fov = 52;
      _camTarget.set(x, y + 0.75, z);
    } else if (camIdx === 1) {
      camLabel = 'HELICOPTER ORBIT';
      const orbitAng = rotY + 2.3 + this.replayPlayTime * 0.48;
      this.camera.position.set(
        x + Math.sin(orbitAng) * 12.5,
        y + 7.2,
        z + Math.cos(orbitAng) * 12.5
      );
      this.camera.fov = 60;
      _camTarget.set(x, y + 0.8, z);
    } else {
      camLabel = 'WHEEL-WELL CHASE';
      const backX = -Math.sin(rotY) * 3.8 + Math.cos(rotY) * 2.1;
      const backZ = -Math.cos(rotY) * 3.8 - Math.sin(rotY) * 2.1;
      this.camera.position.set(x + backX, y + 0.92, z + backZ);
      this.camera.fov = 72;
      _camTarget.set(x + Math.sin(rotY) * 14, y + 0.65, z + Math.cos(rotY) * 14);
    }

    this.camera.updateProjectionMatrix();
    this.camera.lookAt(_camTarget);
    this.dirLight.position.set(x + 25, 40, z - 15);
    this.dirLight.target.position.set(x, y, z + 10);
    this.dirLight.target.updateMatrixWorld();

    const tenths = Math.floor(this.replayPlayTime * 10);
    if (tenths !== this.lastReplayEmitTenths || camIdx !== this.lastReplayCamIdx) {
      this.lastReplayEmitTenths = tenths;
      this.lastReplayCamIdx = camIdx;
      this.onReplayProgress?.(this.replayPlayTime, this.replayDuration, camLabel);
    }
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

    // Photo Mode Active: freeze physics & game clock, orbit camera around car
    if (this.isPhotoMode) {
      const cx = this.carController.x;
      const cy = this.carController.y;
      const cz = this.carController.z;
      const radius = 6.2;
      this.camera.position.x = cx + Math.sin(this.photoOrbitX) * radius;
      this.camera.position.z = cz - Math.cos(this.photoOrbitX) * radius;
      this.camera.position.y = cy + 1.8 + this.photoOrbitY * 2.2;
      this.camera.fov = this.photoFov;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(cx, cy + 0.8, cz);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.gameState === 'playing') {
      if (this.isReplayActive) {
        this.updateReplayPlayback(dt);
        this.renderer.render(this.scene, this.camera);
        return;
      }

      // Crash Cam Slow-Motion replay
      let effectiveDt = dt;
      if (this.crashCamTimer > 0) {
        this.crashCamTimer -= dt;
        effectiveDt = dt * 0.28; // 0.28x dramatic slow motion!
      }

      const isOnline = this.gameMode === 'online';
      const lockedByCountdown = isOnline && this.onlinePhase === 'countdown';
      const activeInput: PlayerInput = lockedByCountdown
        ? {
            forward: false,
            backward: false,
            left: false,
            right: false,
            drift: false,
            nitro: false,
            clutch: input.clutch,
            upshiftJustPressed: false,
            downshiftJustPressed: false,
          }
        : input;

      // 1. Update Car Physics
      this.carController.update(activeInput, effectiveDt);

      const carX = this.carController.x;
      const carY = this.carController.y;
      const carZ = this.carController.z;
      const speedKmH = Math.round(Math.abs(this.carController.speed) * 3.6);

      const isOW = this.gameMode === 'openWorld' || this.gameMode === 'zen';
      const isPolice = this.gameMode === 'policeChase';

      if (isOW) {
        this.openWorldManager.update(
          carX,
          carY,
          carZ,
          this.carController.headingAngle,
          speedKmH,
          this.carController.isDrifting,
          effectiveDt
        );
      } else {
        this.trackManager.update(carZ, effectiveDt, carX, this.carController.speed, isPolice, isOnline);

        // Speed Trap Camera Trigger (>160 km/h)
        for (const item of this.trackManager.pickups) {
          if (item.active && item.type === 'speedtrap') {
            if (Math.abs(item.z - carZ) < 3.8 && Math.abs(item.x - carX) < 5.0) {
              const ud = (item.meshGroup as any).userData;
              if (!ud?.triggered) {
                if (!ud) (item.meshGroup as any).userData = {};
                (item.meshGroup as any).userData.triggered = true;
                if (speedKmH >= 160) {
                  soundManager.playSpeedTrapFlash();
                  this.score += 450;
                  this.onFloatingText?.({
                    id: Date.now(),
                    text: `📸 SPEED TRAP: ${speedKmH} KM/H (+450 PTS)!`,
                    type: 'speedtrap',
                    score: 450,
                    timestamp: Date.now(),
                  });
                  this.onAchievementTrigger?.('speed-demon');
                }
              }
            }
          }
        }

        // Interpolate Remote Opponent Cars in Online Mode
        if (isOnline) {
          for (const remote of this.remoteCars.values()) {
            remote.mesh.position.x = THREE.MathUtils.damp(remote.mesh.position.x, remote.targetX, 14, dt);
            remote.mesh.position.y = THREE.MathUtils.damp(remote.mesh.position.y, remote.targetY, 14, dt);
            remote.mesh.position.z = THREE.MathUtils.damp(remote.mesh.position.z, remote.targetZ, 14, dt);
            remote.mesh.rotation.y = THREE.MathUtils.damp(remote.mesh.rotation.y, remote.targetRotY, 14, dt);

            const ud = (remote.mesh as any).userData;
            const wheels = ud?.wheels as THREE.Group[] | undefined;
            const wheelMounts = ud?.wheelMounts as THREE.Group[] | undefined;
            if (wheels) {
              const spin = (remote.speed * dt) / 0.36;
              for (const w of wheels) {
                w.rotation.x += spin;
              }
            }
            const steerTargets = wheelMounts && wheelMounts.length >= 2 ? wheelMounts : wheels;
            if (steerTargets && steerTargets.length >= 2) {
              steerTargets[0].rotation.y = THREE.MathUtils.damp(steerTargets[0].rotation.y, remote.targetSteer * 0.8, 12, dt);
              steerTargets[1].rotation.y = THREE.MathUtils.damp(steerTargets[1].rotation.y, remote.targetSteer * 0.8, 12, dt);
            }
          }
        } else {
          // Live Race Ranking (1st to 4th) against traffic vehicles
          const carsAhead = this.trackManager.traffic.filter((c) => c.active && c.z > carZ).length;
          this.raceRank = Math.max(1, Math.min(4, 1 + (carsAhead % 4)));
        }
      }

      // 2. Police Chase Logic & Survival
      if (isPolice) {
        this.policeSurvivalTimer += effectiveDt;
        this.sirenSoundCooldown -= effectiveDt;

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

      // 4. Update Particles & Record Zero-GC Replay Frame
      this.particleSystem.update(effectiveDt);
      this.recordReplayFrame(effectiveDt);

      // 5. Update Game Metrics & Timer
      this.distance += Math.floor(Math.abs(this.carController.speed) * effectiveDt);
      this.score += Math.floor(Math.abs(this.carController.speed) * 0.4 * effectiveDt * 10);

      if (this.gameMode === 'arcade' || this.gameMode === 'timeAttack') {
        this.timeLeft -= effectiveDt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.gameState = 'gameover';
          soundManager.stopEngine();
          this.onGameOver?.('TIME RUN OUT');
        }
      }

      // Online Multiplayer Laps, Live Leaderboard & 25Hz Transform Broadcast
      let onlineLeaderboard:
        | Array<{
            id: string;
            username: string;
            distance: number;
            lap: number;
            finished: boolean;
            finishRank: number;
            isLocal: boolean;
            color: string;
          }>
        | undefined;
      let totalRacersCount = 4;

      if (isOnline) {
        const computedLap = Math.min(
          this.onlineTotalLaps,
          1 + Math.floor(this.distance / this.onlineLapDistance)
        );
        if (computedLap > this.onlineLap && this.onlinePhase === 'racing') {
          this.onlineLap = computedLap;
          soundManager.playCheckpoint();
          this.onFloatingText?.({
            id: Date.now(),
            text:
              this.onlineLap === this.onlineTotalLaps
                ? 'FINAL LAP!'
                : `LAP ${this.onlineLap} / ${this.onlineTotalLaps}`,
            type: 'checkpoint',
            score: 500,
            timestamp: Date.now(),
          });
        }

        const totalGoal = this.onlineTotalLaps * this.onlineLapDistance;
        if (this.distance >= totalGoal && !this.onlineFinishEmitted && this.onlinePhase === 'racing') {
          this.onlineFinishEmitted = true;
          this.onlinePhase = 'finished';
          soundManager.playAchievementUnlock();
          this.onOnlineFinish?.();
        }

        if (now - this.lastTransformEmitTime >= 40 && this.onlinePhase === 'racing') {
          this.lastTransformEmitTime = now;
          this.onLocalTransform?.({
            x: carX,
            y: carY,
            z: carZ,
            rotY: this.playerCarGroup.rotation.y,
            steer: this.carController.steerAngle,
            speed: this.carController.speed,
            d: this.distance,
            lap: this.onlineLap,
          });
        }

        const entries = [
          {
            id: 'local',
            username: this.playerUsername,
            distance: this.distance,
            lap: this.onlineLap,
            finished: this.onlineFinishEmitted,
            finishRank: 0,
            isLocal: true,
            color: this.playerTagColor,
          },
          ...Array.from(this.remoteCars.values()).map((r) => ({
            id: r.info.id,
            username: r.info.username,
            distance: r.distance,
            lap: r.lap,
            finished: r.finished,
            finishRank: r.finishRank || 0,
            isLocal: false,
            color: r.info.car.primaryColor,
          })),
        ];

        entries.sort((a, b) => {
          if (a.finished && b.finished && a.finishRank && b.finishRank) {
            return a.finishRank - b.finishRank;
          }
          if (a.finished !== b.finished) return a.finished ? -1 : 1;
          return b.distance - a.distance;
        });

        onlineLeaderboard = entries;
        totalRacersCount = entries.length;
        const localIdx = entries.findIndex((e) => e.isLocal);
        this.raceRank = localIdx >= 0 ? localIdx + 1 : 1;
      }

      // Heat level calculation (1 to 5 stars)
      const heatLevel = isPolice ? Math.min(5, 1 + Math.floor(this.policeSurvivalTimer / 12)) : undefined;

      // Zero-re-render 60fps imperative telemetry stream (Speedometer, Gear, Nitro Arc, Minimap)
      const headingDeg = (((this.carController.headingAngle * 180) / Math.PI) % 360 + 360) % 360;
      this.onFastTelemetry?.(
        speedKmH,
        Math.round(this.carController.nitroAmount),
        this.carController.currentGear,
        carX,
        carZ,
        headingDeg,
        this.carController.isDrifting
      );

      // Throttled React HUD sync (~5Hz or immediately when discrete state changes)
      const openWorldData = isOW ? this.openWorldManager.getHudState(carX, carZ) : undefined;
      const discreteTime = Math.max(0, Math.ceil(this.timeLeft));
      const discreteHealth = Math.round(this.carController.health);
      const hudSig = `${this.carController.currentGear}|${this.carController.hasShield}|${this.carController.headlightsActive}|${this.carController.indicatorState}|${this.carController.doorsOpen}|${this.carController.trunkOpen}|${this.carController.isDrifting}|${this.coins}|${discreteTime}|${discreteHealth}|${this.raceRank}|${this.onlineLap}|${openWorldData?.currentZone || ''}|${openWorldData?.activeRace?.checkpointIdx ?? -1}|${openWorldData?.activeDriftZone?.name || ''}|${openWorldData?.waypoint?.label || ''}`;
      this.hudEmitTimer += dt;
      if (this.hudEmitTimer >= 0.2 || hudSig !== this.lastHudSig) {
        this.hudEmitTimer = 0;
        this.lastHudSig = hudSig;
        this.onScoreUpdate?.({
          score: this.score,
          speed: speedKmH,
          nitro: Math.round(this.carController.nitroAmount),
          distance: this.distance,
          coins: this.coins,
          timeLeft: discreteTime,
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
          health: discreteHealth,
          raceRank: openWorldData?.activeRace ? openWorldData.activeRace.rank : this.raceRank,
          totalRacers: openWorldData?.activeRace ? openWorldData.activeRace.totalRacers : totalRacersCount,
          lap: isOnline ? this.onlineLap : undefined,
          totalLaps: isOnline ? this.onlineTotalLaps : undefined,
          leaderboard: onlineLeaderboard,
          zoneName: isOW ? ZONE_LABELS[this.openWorldManager.currentZone] : undefined,
          trophiesFound: isOW ? this.openWorldManager.tokensCollected : undefined,
          totalTrophies: isOW ? this.openWorldManager.totalTokens : undefined,
          posX: Math.round(carX),
          posZ: Math.round(carZ),
          heading: Math.round(headingDeg),
          openWorld: openWorldData,
        });
      }


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
        if (isOW) {
          const h = this.carController.headingAngle;
          _idealOffset.set(carX - Math.sin(h) * 6, carY + 26, carZ - Math.cos(h) * 6);
          _camTarget.set(carX + Math.sin(h) * 10, carY, carZ + Math.cos(h) * 10);
        } else {
          _idealOffset.set(carX, carY + 22, carZ - 3);
          _camTarget.set(carX, carY, carZ + 14);
        }
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
