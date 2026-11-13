export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'arcade' | 'timeAttack' | 'zen' | 'openWorld' | 'policeChase' | 'online';

export type WorldZone = 'city' | 'beach' | 'mountains' | 'industrial';

export type CameraView = 'thirdPerson' | 'hood' | 'topDown';

export type WeatherType = 'sunny' | 'sunset' | 'night' | 'rain';

export type TransmissionType = 'automatic' | 'manual';

export type OpenWorldActivityType =
  | 'street_race'
  | 'drift_zone'
  | 'speedtrap'
  | 'ramp'
  | 'token'
  | 'crate';

export interface OpenWorldRoadSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  zone: WorldZone;
  kind: 'avenue' | 'highway' | 'switchback' | 'runway' | 'overpass' | 'tunnel' | 'pier' | 'shortcut';
  elevation1?: number;
  elevation2?: number;
}

export interface OpenWorldHub {
  id: string;
  name: string;
  zone: WorldZone;
  x: number;
  z: number;
  heading: number;
  color: string;
  discovered: boolean;
}

export interface OpenWorldActivity {
  id: string;
  name: string;
  type: OpenWorldActivityType;
  zone: WorldZone;
  x: number;
  z: number;
  radius: number;
  heading?: number;
  rewardCoins: number;
  rewardScore: number;
  completed: boolean;
  cooldownUntil?: number;
  raceRoute?: Array<{ x: number; z: number }>;
  targetDriftScore?: number;
  meshGroup?: any;
}

export interface OpenWorldBlip {
  x: number;
  z: number;
  kind: 'traffic' | 'cop' | 'rival' | 'checkpoint';
}

export interface OpenWorldWaypoint {
  x: number;
  z: number;
  label: string;
}

export interface OpenWorldHudState {
  currentZone: WorldZone;
  zoneName: string;
  tokensCollected: number;
  totalTokens: number;
  racesWon: number;
  totalRaces: number;
  waypoint: OpenWorldWaypoint | null;
  waypointDist: number | null;
  activeDriftZone: {
    name: string;
    score: number;
    target: number;
  } | null;
  activeRace: {
    name: string;
    checkpointIdx: number;
    totalCheckpoints: number;
    rank: number;
    totalRacers: number;
    elapsed: number;
  } | null;
  hubs: OpenWorldHub[];
  activities: Array<{
    id: string;
    name: string;
    type: OpenWorldActivityType;
    zone: WorldZone;
    x: number;
    z: number;
    completed: boolean;
  }>;
  blips: OpenWorldBlip[];
}

export interface DiscoveryItem {
  id: string;
  name: string;
  type: 'stunt' | 'trophy' | 'speedtrap' | 'lookout';
  x: number;
  z: number;
  completed: boolean;
  score: number;
  meshGroup?: any;
}

export type GraphicsQuality = 'low' | 'balanced' | 'high';

export type DecalType = 'none' | 'dual_stripes' | 'center_stripe' | 'side_arrows';

export type TrackId = 'sunset-coastal' | 'neon-circuit' | 'canyon-ridge';

export interface TrackConfig {
  id: TrackId;
  name: string;
  subtitle: string;
  description: string;
  features: string[];
  difficulty: 'Easy' | 'Medium' | 'Expert';
  biome: BiomeType;
  primaryCurvature: string;
  price: number;
  unlocked: boolean;
}

export interface CarStats {
  name: string;
  id: string;
  description: string;
  topSpeed: number; // in km/h scale
  acceleration: number; // 0 to 1 scale
  handling: number; // 0 to 1 scale
  nitroRecharge: number; // 0 to 1 scale
  primaryColor: string;
  accentColor: string;
  trimColor: string;
  decalType: DecalType;
  stripeColor: string;
  price: number;
  unlocked: boolean;
}

export type RadioStation = 'synthwave' | 'retroArcade' | 'lofi' | 'off';

export type OnScreenControlSetting = 'auto' | 'force_on' | 'force_off';

export interface CarUpgrades {
  engine: number; // 0 to 4 (+5 km/h & +8% accel per lvl)
  handling: number; // 0 to 4 (+8% drift grip & cornering per lvl)
  nitro: number; // 0 to 4 (+10% nitro capacity & +12% refill rate per lvl)
}

export interface KeyBindings {
  steerLeft: string;
  steerRight: string;
  throttle: string;
  brake: string;
  drift: string;
  nitro: string;
  clutch: string;
  upshift: string;
  downshift: string;
  headlights: string;
  indicatorLeft: string;
  indicatorRight: string;
  hazardLights: string;
  doors: string;
  trunk: string;
  cameraToggle: string;
  radio: string;
  photoMode: string;
  horn: string;
  worldMap: string;
}

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  nitro: boolean;
  clutch: boolean;
  upshiftJustPressed: boolean;
  downshiftJustPressed: boolean;
}

export interface TrafficCar {
  id: number;
  type: 'sedan' | 'suv' | 'sports' | 'semi' | 'cop';
  x: number;
  z: number;
  speed: number;
  lane: number;
  color: string;
  active: boolean;
  meshGroup: any; // THREE.Group
  width: number;
  length: number;
  isChaser?: boolean;
}

export interface PickupItem {
  id: number;
  type: 'coin' | 'nitro' | 'shield' | 'ramp' | 'magnet' | 'oil' | 'barricade' | 'speedtrap';
  x: number;
  z: number;
  active: boolean;
  meshGroup: any; // THREE.Group
  rotation: number;
}

export interface RivalCar {

  id: number;
  name: string;
  color: string;
  x: number;
  z: number;
  targetX: number;
  speed: number;
  maxSpeed: number;
  meshGroup: any;
  rank: number;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'nearMiss' | 'drift' | 'checkpoint' | 'combo' | 'nitro' | 'achievement' | 'powerup' | 'hazard' | 'police' | 'speedtrap' | 'rival';
  score: number;
  timestamp: number;
}

export interface GameScore {
  score: number;
  highScore: number;
  distance: number;
  coins: number;
  totalCoins: number;
  nearMisses: number;
  maxDriftScore: number;
  speed: number;
  nitro: number; // 0 to 100
  timeLeft: number;
  shield: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCoins: number;
  unlocked: boolean;
}

export interface GameSettings {
  transmission: TransmissionType;
  cameraView: CameraView;
  weather: WeatherType;
  quality: GraphicsQuality;
  touchControls: OnScreenControlSetting;
  keyBindings: KeyBindings;
}

export type BiomeType = 'sunset' | 'neon' | 'desert' | 'alpine';

export interface PlayerProfile {
  username: string;
  tagColor: string;
  racesCompleted: number;
  wins: number;
}

export interface MultiplayerCarConfig {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  decalType: DecalType;
  stripeColor: string;
}

export interface MultiplayerPlayerInfo {
  id: string;
  username: string;
  car: MultiplayerCarConfig;
  distance: number;
  lap: number;
  finished: boolean;
  finishTime: number | null;
  finishRank: number | null;
  isHost: boolean;
}

export interface MultiplayerRoomState {
  code: string;
  hostId: string;
  trackId: TrackId;
  totalLaps: number;
  lapDistance: number;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  players: MultiplayerPlayerInfo[];
}

export interface RemotePlayerTransform {
  id: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  steer: number;
  speed: number;
  distance: number;
  lap: number;
  finished: boolean;
  finishRank: number;
}


