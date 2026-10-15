import { CarStats, BiomeType, DecalType, TrackConfig, KeyBindings, Achievement } from '../types/game';

export const CARS_CATALOG: CarStats[] = [
  {
    id: 'cruiser',
    name: 'Apex Cruiser',
    description: 'Balanced GT racer with agile responsive steering and great road stability.',
    topSpeed: 82, // ~210 km/h
    acceleration: 0.85,
    handling: 0.88,
    nitroRecharge: 0.8,
    primaryColor: '#f97316', // Vibrant Orange
    accentColor: '#18181b', // Carbon Black
    trimColor: '#ffffff',
    decalType: 'dual_stripes',
    stripeColor: '#ffffff',
    price: 0,
    unlocked: true,
  },
  {
    id: 'viper',
    name: 'Viper GT',
    description: 'Raw muscle beast with high top speed and dual supercharger hood scoops.',
    topSpeed: 96, // ~245 km/h
    acceleration: 0.95,
    handling: 0.72,
    nitroRecharge: 0.75,
    primaryColor: '#dc2626', // Crimson Red
    accentColor: '#09090b',
    trimColor: '#e4e4e7',
    decalType: 'center_stripe',
    stripeColor: '#facc15',
    price: 450,
    unlocked: false,
  },
  {
    id: 'cyber',
    name: 'Cyber Brawler',
    description: 'Heavy cyberpunk road tank with bumper shield armor and oversized off-road wheels.',
    topSpeed: 76,
    acceleration: 0.78,
    handling: 0.82,
    nitroRecharge: 0.9,
    primaryColor: '#06b6d4', // Cyan
    accentColor: '#1e293b',
    trimColor: '#facc15',
    decalType: 'side_arrows',
    stripeColor: '#38bdf8',
    price: 900,
    unlocked: false,
  },
  {
    id: 'formula',
    name: 'Formula Sprint',
    description: 'Ultra-lightweight aerodynamic open-wheel racer with instantaneous boost refill.',
    topSpeed: 92,
    acceleration: 0.92,
    handling: 0.96,
    nitroRecharge: 1.0,
    primaryColor: '#a855f7', // Electric Violet
    accentColor: '#fbbf24',
    trimColor: '#000000',
    decalType: 'dual_stripes',
    stripeColor: '#fef08a',
    price: 1800,
    unlocked: false,
  },
];

export const COLOR_PALETTES = [
  { name: 'Sunburst Orange', primary: '#f97316', accent: '#18181b' },
  { name: 'Cyber Cyan', primary: '#06b6d4', accent: '#0f172a' },
  { name: 'Crimson Fury', primary: '#dc2626', accent: '#111827' },
  { name: 'Acid Lime', primary: '#84cc16', accent: '#18181b' },
  { name: 'Electric Violet', primary: '#a855f7', accent: '#09090b' },
  { name: 'Midnight Stealth', primary: '#18181b', accent: '#eab308' },
  { name: 'Arctic White', primary: '#f8fafc', accent: '#0284c7' },
  { name: 'Hyper Yellow', primary: '#eab308', accent: '#09090b' },
];

export const DECAL_OPTIONS: { id: DecalType; label: string; icon: string; desc: string }[] = [
  { id: 'none', label: 'Solid Clean', icon: '▰', desc: 'Sleek monocolor paint' },
  { id: 'dual_stripes', label: 'Twin GT Stripes', icon: '║║', desc: 'Parallel classic racing lines' },
  { id: 'center_stripe', label: 'Center Bold Band', icon: '▌', desc: 'Thick aerodynamic center strip' },
  { id: 'side_arrows', label: 'Speed Chevrons', icon: '»', desc: 'Dynamic flank arrow decals' },
];

export const STRIPE_COLOR_PALETTES = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Pitch Black', hex: '#09090b' },
  { name: 'Racing Yellow', hex: '#facc15' },
  { name: 'Neon Cyan', hex: '#22d3ee' },
  { name: 'Flame Orange', hex: '#f97316' },
  { name: 'Hot Pink', hex: '#f43f5e' },
];

export const TRACKS_CATALOG: TrackConfig[] = [
  {
    id: 'sunset-coastal',
    name: 'Sunset Coastline',
    subtitle: 'Scenic Highway & High-Speed Straights',
    description: 'Long open straightaways and sweeping gentle ocean curves framed by low-poly palm trees and a warm golden horizon. Perfect for top speed testing and smooth cruising.',
    features: ['Long 300m straights', 'Gentle sweeping curves', 'Scenic road ramp', 'Low-poly palm silhouettes'],
    difficulty: 'Easy',
    biome: 'sunset',
    primaryCurvature: 'Gentle & Open',
    price: 0,
    unlocked: true,
  },
  {
    id: 'neon-circuit',
    name: 'Neon Megacity',
    subtitle: 'Cyber Grid & S-Curve Chicanes',
    description: 'A nocturnal high-tech circuit featuring sharp S-turn chicanes, luminous overpass arches, and high-contrast road barriers designed for precision handbrake drifting.',
    features: ['Technical S-chicanes', 'Glowing cyber arches', 'High drift multipliers', 'Overpass sprint'],
    difficulty: 'Medium',
    biome: 'neon',
    primaryCurvature: 'Chicanes & Drifts',
    price: 300,
    unlocked: false,
  },
  {
    id: 'canyon-ridge',
    name: 'Canyon Ridge',
    subtitle: 'Terracotta Slalom & Ravine Ramps',
    description: 'Winding desert ridge carved through terracotta rock pillars, featuring rapid chicane slaloms, elevation crests, and double launch ramps for big aerial stunts.',
    features: ['Twin jump ramps', 'Desert rock formations', 'Slalom switchbacks', 'Aerial bonus pads'],
    difficulty: 'Expert',
    biome: 'desert',
    primaryCurvature: 'Elevation & Slaloms',
    price: 650,
    unlocked: false,
  },
];

export const DEFAULT_KEYBINDINGS: KeyBindings = {
  steerLeft: 'KeyA',
  steerRight: 'KeyD',
  throttle: 'KeyW',
  brake: 'KeyS',
  drift: 'Space',
  nitro: 'KeyN',
  clutch: 'AltLeft',
  upshift: 'KeyE',
  downshift: 'KeyQ',
  headlights: 'KeyL',
  indicatorLeft: 'BracketLeft',
  indicatorRight: 'BracketRight',
  hazardLights: 'KeyH',
  doors: 'KeyO',
  trunk: 'KeyP',
  cameraToggle: 'KeyC',
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'drift-pro',
    title: 'Drift King',
    description: 'Accumulate over 800 drift points in a single drift sequence',
    icon: '🔥',
    rewardCoins: 150,
    unlocked: false,
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Break past 220 km/h top speed using Nitro Boost',
    icon: '⚡',
    rewardCoins: 200,
    unlocked: false,
  },
  {
    id: 'big-air',
    title: 'Sky Diver',
    description: 'Launch off a jump ramp for high airtime',
    icon: '🚀',
    rewardCoins: 100,
    unlocked: false,
  },
  {
    id: 'coin-rush',
    title: 'Coin Hoarder',
    description: 'Collect 25 coins in a single race session',
    icon: '💰',
    rewardCoins: 120,
    unlocked: false,
  },
  {
    id: 'close-call',
    title: 'Near Miss Master',
    description: 'Execute 5 near misses in a single race without crashing',
    icon: '🎯',
    rewardCoins: 180,
    unlocked: false,
  },
  {
    id: 'cop-evader',
    title: 'Most Wanted',
    description: 'Survive 30 seconds in Police Chase interception mode',
    icon: '🚨',
    rewardCoins: 250,
    unlocked: false,
  },
  {
    id: 'manual-driver',
    title: 'Gearhead',
    description: 'Engage Clutch and shift gears using Manual Transmission',
    icon: '⚙️',
    rewardCoins: 120,
    unlocked: false,
  },
  {
    id: 'magnet-master',
    title: 'Magnetizer',
    description: 'Grab a Magnet power-up and draw in 5 coins',
    icon: '🧲',
    rewardCoins: 100,
    unlocked: false,
  },
];

export const BIOMES: { id: BiomeType; name: string; tag: string }[] = [
  { id: 'sunset', name: 'Sunset Coast', tag: 'Warm Golden Hour' },
  { id: 'neon', name: 'Neon Metropolis', tag: 'Synthwave Night' },
  { id: 'desert', name: 'Desert Canyon', tag: 'Terracotta Dunes' },
  { id: 'alpine', name: 'Alpine Overpass', tag: 'High Altitude Mist' },
];
