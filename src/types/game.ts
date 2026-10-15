export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'arcade' | 'timeAttack' | 'zen' | 'openWorld' | 'policeChase';

export type WorldZone = 'city' | 'beach' | 'mountains';

export type CameraView = 'thirdPerson' | 'hood' | 'topDown';

export type WeatherType = 'sunny' | 'sunset' | 'night' | 'rain';

export type TransmissionType = 'automatic' | 'manual';

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
  type: 'coin' | 'nitro' | 'shield' | 'ramp' | 'magnet' | 'oil' | 'barricade';
  x: number;
  z: number;
  active: boolean;
  meshGroup: any; // THREE.Group
  rotation: number;
}

export interface FloatingText {
  id: number;
  text: string;
  type: 'nearMiss' | 'drift' | 'checkpoint' | 'combo' | 'nitro' | 'achievement' | 'powerup' | 'hazard' | 'police';
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
  keyBindings: KeyBindings;
}

export type BiomeType = 'sunset' | 'neon' | 'desert' | 'alpine';
