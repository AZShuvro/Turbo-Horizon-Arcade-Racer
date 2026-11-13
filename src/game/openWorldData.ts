import {
  OpenWorldActivity,
  OpenWorldHub,
  OpenWorldRoadSegment,
  WorldZone,
} from '../types/game';

export const WORLD_HALF_EXTENT = 720;

export const ZONE_LABELS: Record<WorldZone, string> = {
  city: 'Downtown Cyber Metro',
  beach: 'Coastal Highway & Pier',
  mountains: 'Canyon & Mountain Switchbacks',
  industrial: 'Industrial & Stunt Airport',
};

export const ZONE_COLORS: Record<WorldZone, string> = {
  city: '#06b6d4',
  beach: '#f59e0b',
  mountains: '#ea580c',
  industrial: '#a855f7',
};

export function getZoneAt(x: number, z: number): WorldZone {
  if (z > 145) {
    return x < -55 ? 'industrial' : 'beach';
  }
  return x > 25 ? 'mountains' : 'city';
}

export const OPEN_WORLD_ROADS: OpenWorldRoadSegment[] = [
  // Central Inter-Zone Connecting Highways
  { id: 'spine-ns', x1: 0, z1: -500, x2: 0, z2: 360, width: 16, zone: 'city', kind: 'highway', elevation1: 0, elevation2: 0 },
  { id: 'cross-ew', x1: -600, z1: 140, x2: 600, z2: 140, width: 16, zone: 'city', kind: 'highway', elevation1: 0, elevation2: 0 },
  { id: 'north-ring', x1: -480, z1: -480, x2: 0, z2: -480, width: 14, zone: 'city', kind: 'highway', elevation1: 0, elevation2: 0 },
  { id: 'north-ascent', x1: 0, z1: -480, x2: 280, z2: -480, width: 14, zone: 'mountains', kind: 'highway', elevation1: 0, elevation2: 11.5 },

  // ZONE 1: Downtown Cyber/Metro District (NW)
  { id: 'city-ave-w', x1: -480, z1: -480, x2: -480, z2: 140, width: 14, zone: 'city', kind: 'avenue' },
  { id: 'city-ave-c-n', x1: -280, z1: -480, x2: -280, z2: -420, width: 14, zone: 'city', kind: 'avenue' },
  { id: 'city-tunnel', x1: -280, z1: -420, x2: -280, z2: -250, width: 14, zone: 'city', kind: 'tunnel' },
  { id: 'city-ave-c-s', x1: -280, z1: -250, x2: -280, z2: 140, width: 14, zone: 'city', kind: 'avenue' },
  { id: 'city-ave-e', x1: -120, z1: -480, x2: -120, z2: 140, width: 14, zone: 'city', kind: 'avenue' },
  { id: 'city-st-n', x1: -520, z1: -320, x2: 0, z2: -320, width: 14, zone: 'city', kind: 'avenue' },
  // Elevated Overpass bridging across X = -280 at Z = -180
  { id: 'city-st-m-w', x1: -520, z1: -180, x2: -390, z2: -180, width: 14, zone: 'city', kind: 'avenue', elevation1: 0, elevation2: 0 },
  { id: 'city-overpass-up', x1: -390, z1: -180, x2: -320, z2: -180, width: 14, zone: 'city', kind: 'overpass', elevation1: 0, elevation2: 6.2 },
  { id: 'city-overpass-span', x1: -320, z1: -180, x2: -240, z2: -180, width: 14, zone: 'city', kind: 'overpass', elevation1: 6.2, elevation2: 6.2 },
  { id: 'city-overpass-dn', x1: -240, z1: -180, x2: -170, z2: -180, width: 14, zone: 'city', kind: 'overpass', elevation1: 6.2, elevation2: 0 },
  { id: 'city-st-m-e', x1: -170, z1: -180, x2: 0, z2: -180, width: 14, zone: 'city', kind: 'avenue', elevation1: 0, elevation2: 0 },
  { id: 'city-st-s', x1: -520, z1: -20, x2: 0, z2: -20, width: 14, zone: 'city', kind: 'avenue' },
  // Tight Downtown Alley Shortcuts
  { id: 'city-alley-1', x1: -380, z1: -180, x2: -380, z2: -20, width: 8.5, zone: 'city', kind: 'shortcut' },
  { id: 'city-alley-2', x1: -195, z1: -320, x2: -195, z2: -20, width: 8.5, zone: 'city', kind: 'shortcut' },

  // ZONE 2: Coastal Highway & Pier (SE)
  { id: 'coast-hwy-main', x1: -60, z1: 240, x2: 600, z2: 240, width: 16, zone: 'beach', kind: 'highway' },
  { id: 'coast-boardwalk', x1: -60, z1: 360, x2: 580, z2: 360, width: 14, zone: 'beach', kind: 'avenue' },
  { id: 'coast-cliff-e', x1: 580, z1: 140, x2: 580, z2: 360, width: 14, zone: 'beach', kind: 'highway' },
  { id: 'coast-pier-link', x1: 240, z1: 140, x2: 240, z2: 360, width: 14, zone: 'beach', kind: 'avenue' },
  { id: 'coast-pier-deck', x1: 240, z1: 360, x2: 240, z2: 600, width: 15, zone: 'beach', kind: 'pier', elevation1: 0, elevation2: 2.8 },
  { id: 'coast-west-link', x1: 400, z1: 140, x2: 400, z2: 360, width: 12, zone: 'beach', kind: 'shortcut' },

  // ZONE 3: Canyon & Mountain Switchbacks (NE)
  { id: 'mtn-entry', x1: 0, z1: -20, x2: 180, z2: -70, width: 14, zone: 'mountains', kind: 'switchback', elevation1: 0, elevation2: 2.4 },
  { id: 'mtn-south-link', x1: 180, z1: 140, x2: 180, z2: -70, width: 14, zone: 'mountains', kind: 'switchback', elevation1: 0, elevation2: 2.4 },
  { id: 'mtn-sw-1', x1: 180, z1: -70, x2: 490, z2: -140, width: 14, zone: 'mountains', kind: 'switchback', elevation1: 2.4, elevation2: 5.8 },
  { id: 'mtn-sw-2', x1: 490, z1: -140, x2: 220, z2: -260, width: 14, zone: 'mountains', kind: 'switchback', elevation1: 5.8, elevation2: 8.6 },
  { id: 'mtn-bridge', x1: 220, z1: -260, x2: 470, z2: -340, width: 14, zone: 'mountains', kind: 'overpass', elevation1: 8.6, elevation2: 10.2 },
  { id: 'mtn-sw-3', x1: 470, z1: -340, x2: 280, z2: -480, width: 14, zone: 'mountains', kind: 'switchback', elevation1: 10.2, elevation2: 11.5 },
  { id: 'mtn-summit', x1: 280, z1: -480, x2: 460, z2: -560, width: 16, zone: 'mountains', kind: 'switchback', elevation1: 11.5, elevation2: 13.5 },
  { id: 'mtn-valley-link', x1: 490, z1: -140, x2: 580, z2: 140, width: 12, zone: 'mountains', kind: 'shortcut', elevation1: 5.8, elevation2: 0 },

  // ZONE 4: Industrial & Stunt Airport Zone (SW)
  { id: 'ind-hwy-n', x1: -600, z1: 240, x2: -60, z2: 240, width: 16, zone: 'industrial', kind: 'highway' },
  { id: 'ind-hwy-s', x1: -600, z1: 480, x2: -60, z2: 480, width: 15, zone: 'industrial', kind: 'avenue' },
  { id: 'ind-west-freight', x1: -560, z1: 140, x2: -560, z2: 480, width: 14, zone: 'industrial', kind: 'avenue' },
  { id: 'ind-east-drift', x1: -180, z1: 140, x2: -180, z2: 480, width: 14, zone: 'industrial', kind: 'avenue' },
  { id: 'ind-runway', x1: -380, z1: 140, x2: -380, z2: 630, width: 26, zone: 'industrial', kind: 'runway' },
  { id: 'ind-container-cut', x1: -560, z1: 360, x2: -180, z2: 360, width: 11, zone: 'industrial', kind: 'shortcut' },
  { id: 'ind-south-beach-link', x1: -180, z1: 360, x2: -60, z2: 360, width: 14, zone: 'industrial', kind: 'avenue' },
];

export const OPEN_WORLD_HUBS: OpenWorldHub[] = [
  { id: 'hub-central', name: 'Central Crossroads Hub', zone: 'city', x: 0, z: 140, heading: 0, color: '#facc15', discovered: true },
  { id: 'hub-city', name: 'Cyber Metro Plaza', zone: 'city', x: -280, z: -20, heading: Math.PI, color: '#06b6d4', discovered: false },
  { id: 'hub-beach', name: 'Coastal Pier Boardwalk', zone: 'beach', x: 240, z: 360, heading: 0, color: '#f59e0b', discovered: false },
  { id: 'hub-mountains', name: 'Eagle Peak Summit', zone: 'mountains', x: 370, z: -520, heading: -1.1, color: '#ea580c', discovered: false },
  { id: 'hub-industrial', name: 'Stunt Airport Hangar', zone: 'industrial', x: -380, z: 240, heading: 0, color: '#a855f7', discovered: false },
];

export interface OpenWorldRampDef {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  rotY: number; // direction ramp faces (+Z rotated by rotY)
  baseY: number;
}

export const OPEN_WORLD_RAMPS: OpenWorldRampDef[] = [
  { id: 'ramp-pier', name: 'Ocean Pier Stunt Leap', x: 240, z: 592, width: 14, length: 18, height: 4.5, rotY: 0, baseY: 2.7 },
  { id: 'ramp-summit', name: 'Eagle Peak Overlook Launch', x: 460, z: -560, width: 16, length: 20, height: 5.2, rotY: -1.15, baseY: 13.5 },
  { id: 'ramp-airport-1', name: 'Runway Mega-Ramp South', x: -380, z: 615, width: 20, length: 22, height: 6.2, rotY: 0, baseY: 0 },
  { id: 'ramp-airport-2', name: 'Runway Twin Kicker', x: -380, z: 420, width: 14, length: 16, height: 4.0, rotY: Math.PI, baseY: 0 },
  { id: 'ramp-cross', name: 'Expressway Sky Bridge', x: 0, z: 290, width: 13, length: 16, height: 3.8, rotY: 0, baseY: 0 },
];

export function createInitialActivities(): OpenWorldActivity[] {
  return [
    // 4 STREET RACES (Point-to-Point & Circuit)
    {
      id: 'race-metro',
      name: 'Metro Neon Sprint',
      type: 'street_race',
      zone: 'city',
      x: -280,
      z: -20,
      radius: 13,
      heading: Math.PI,
      rewardCoins: 220,
      rewardScore: 2500,
      completed: false,
      raceRoute: [
        { x: -280, z: -180 },
        { x: -280, z: -320 },
        { x: -120, z: -320 },
        { x: -120, z: -20 },
        { x: 0, z: 140 },
      ],
    },
    {
      id: 'race-coastal',
      name: 'Coastal Pier Dash',
      type: 'street_race',
      zone: 'beach',
      x: 40,
      z: 240,
      radius: 13,
      heading: Math.PI / 2,
      rewardCoins: 240,
      rewardScore: 2600,
      completed: false,
      raceRoute: [
        { x: 240, z: 240 },
        { x: 580, z: 240 },
        { x: 580, z: 360 },
        { x: 240, z: 360 },
        { x: 240, z: 540 },
      ],
    },
    {
      id: 'race-canyon',
      name: 'Canyon Switchback Ascent',
      type: 'street_race',
      zone: 'mountains',
      x: 180,
      z: -70,
      radius: 13,
      heading: 1.35,
      rewardCoins: 280,
      rewardScore: 3000,
      completed: false,
      raceRoute: [
        { x: 490, z: -140 },
        { x: 220, z: -260 },
        { x: 470, z: -340 },
        { x: 280, z: -480 },
        { x: 420, z: -540 },
      ],
    },
    {
      id: 'race-airport',
      name: 'Stunt Airport GP',
      type: 'street_race',
      zone: 'industrial',
      x: -380,
      z: 240,
      radius: 14,
      heading: 0,
      rewardCoins: 250,
      rewardScore: 2700,
      completed: false,
      raceRoute: [
        { x: -380, z: 480 },
        { x: -560, z: 480 },
        { x: -560, z: 240 },
        { x: -180, z: 240 },
        { x: -180, z: 480 },
      ],
    },

    // 4 DRIFT ZONES
    {
      id: 'drift-plaza',
      name: 'Cyber Plaza Drift Circle',
      type: 'drift_zone',
      zone: 'city',
      x: -480,
      z: -180,
      radius: 36,
      rewardCoins: 110,
      rewardScore: 1200,
      targetDriftScore: 600,
      completed: false,
    },
    {
      id: 'drift-canyon',
      name: 'Canyon Hairpin Drift Zone',
      type: 'drift_zone',
      zone: 'mountains',
      x: 340,
      z: -200,
      radius: 42,
      rewardCoins: 130,
      rewardScore: 1400,
      targetDriftScore: 700,
      completed: false,
    },
    {
      id: 'drift-airport',
      name: 'Airport Tarmac Drift Arena',
      type: 'drift_zone',
      zone: 'industrial',
      x: -180,
      z: 360,
      radius: 40,
      rewardCoins: 120,
      rewardScore: 1300,
      targetDriftScore: 650,
      completed: false,
    },
    {
      id: 'drift-pier',
      name: 'Boardwalk Sweeper Drift',
      type: 'drift_zone',
      zone: 'beach',
      x: 400,
      z: 360,
      radius: 36,
      rewardCoins: 110,
      rewardScore: 1200,
      targetDriftScore: 600,
      completed: false,
    },

    // 5 SPEED TRAPS
    { id: 'speed-spine', name: 'Central Spine Radar', type: 'speedtrap', zone: 'city', x: 0, z: -120, radius: 14, rewardCoins: 60, rewardScore: 800, completed: false },
    { id: 'speed-tunnel', name: 'Metro Tunnel Exit Radar', type: 'speedtrap', zone: 'city', x: -280, z: -245, radius: 14, rewardCoins: 75, rewardScore: 950, completed: false },
    { id: 'speed-coast', name: 'Oceanfront Straight Radar', type: 'speedtrap', zone: 'beach', x: 320, z: 240, radius: 14, rewardCoins: 70, rewardScore: 900, completed: false },
    { id: 'speed-bridge', name: 'Canyon Bridge Speed Gate', type: 'speedtrap', zone: 'mountains', x: 345, z: -300, radius: 14, rewardCoins: 85, rewardScore: 1100, completed: false },
    { id: 'speed-runway', name: 'Airport Runway Trap', type: 'speedtrap', zone: 'industrial', x: -380, z: 495, radius: 16, rewardCoins: 80, rewardScore: 1000, completed: false },

    // 5 JUMP RAMPS
    { id: 'ramp-pier', name: 'Ocean Pier Stunt Leap', type: 'ramp', zone: 'beach', x: 240, z: 592, radius: 12, rewardCoins: 90, rewardScore: 1400, completed: false },
    { id: 'ramp-summit', name: 'Eagle Peak Overlook Launch', type: 'ramp', zone: 'mountains', x: 460, z: -560, radius: 13, rewardCoins: 120, rewardScore: 1800, completed: false },
    { id: 'ramp-airport-1', name: 'Runway Mega-Ramp', type: 'ramp', zone: 'industrial', x: -380, z: 615, radius: 14, rewardCoins: 110, rewardScore: 1600, completed: false },
    { id: 'ramp-airport-2', name: 'Runway Twin Kicker', type: 'ramp', zone: 'industrial', x: -380, z: 420, radius: 11, rewardCoins: 85, rewardScore: 1200, completed: false },
    { id: 'ramp-cross', name: 'Expressway Sky Bridge', type: 'ramp', zone: 'beach', x: 0, z: 290, radius: 11, rewardCoins: 80, rewardScore: 1100, completed: false },

    // 12 HIDDEN COLLECTIBLE TOKENS & MYSTERY CRATES
    { id: 'tok-alley-1', name: 'Cyber Alley Golden Token', type: 'token', zone: 'city', x: -380, z: -100, radius: 4.5, rewardCoins: 75, rewardScore: 500, completed: false },
    { id: 'tok-alley-2', name: 'Neon Shortcut Crate', type: 'crate', zone: 'city', x: -195, z: -250, radius: 4.5, rewardCoins: 100, rewardScore: 650, completed: false },
    { id: 'tok-tunnel', name: 'Underground Tunnel Token', type: 'token', zone: 'city', x: -280, z: -340, radius: 4.5, rewardCoins: 90, rewardScore: 600, completed: false },
    { id: 'tok-overpass', name: 'Sky Overpass Token', type: 'token', zone: 'city', x: -280, z: -180, radius: 4.5, rewardCoins: 110, rewardScore: 700, completed: false },
    { id: 'tok-pier-tip', name: 'Boardwalk End Token', type: 'token', zone: 'beach', x: 240, z: 545, radius: 4.5, rewardCoins: 95, rewardScore: 600, completed: false },
    { id: 'tok-east-cape', name: 'East Cliffside Crate', type: 'crate', zone: 'beach', x: 580, z: 295, radius: 4.5, rewardCoins: 115, rewardScore: 700, completed: false },
    { id: 'tok-shore-cove', name: 'Palm Cove Token', type: 'token', zone: 'beach', x: 110, z: 360, radius: 4.5, rewardCoins: 75, rewardScore: 500, completed: false },
    { id: 'tok-canyon-gorge', name: 'Canyon Bridge Crate', type: 'crate', zone: 'mountains', x: 345, z: -300, radius: 4.5, rewardCoins: 125, rewardScore: 800, completed: false },
    { id: 'tok-summit', name: 'Eagle Peak Crown Token', type: 'token', zone: 'mountains', x: 410, z: -535, radius: 4.5, rewardCoins: 150, rewardScore: 1000, completed: false },
    { id: 'tok-mtn-pass', name: 'Alpine Trail Token', type: 'token', zone: 'mountains', x: 535, z: 10, radius: 4.5, rewardCoins: 90, rewardScore: 600, completed: false },
    { id: 'tok-containers', name: 'Container Maze Crate', type: 'crate', zone: 'industrial', x: -470, z: 360, radius: 4.5, rewardCoins: 120, rewardScore: 750, completed: false },
    { id: 'tok-hangar', name: 'Runway Hangar Token', type: 'token', zone: 'industrial', x: -560, z: 420, radius: 4.5, rewardCoins: 95, rewardScore: 600, completed: false },
  ];
}

// Fast distance from point (px, pz) to segment (x1,z1)-(x2,z2)
export function pointToSegmentDistSq(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): { distSq: number; t: number; cx: number; cz: number } {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) {
    const ox = px - x1;
    const oz = pz - z1;
    return { distSq: ox * ox + oz * oz, t: 0, cx: x1, cz: z1 };
  }
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = x1 + t * dx;
  const cz = z1 + t * dz;
  const ox = px - cx;
  const oz = pz - cz;
  return { distSq: ox * ox + oz * oz, t, cx, cz };
}

export function distanceToNearestRoad(px: number, pz: number): {
  dist: number;
  cx: number;
  cz: number;
  road: OpenWorldRoadSegment;
} {
  let bestDistSq = Infinity;
  let bestCx = px;
  let bestCz = pz;
  let bestRoad = OPEN_WORLD_ROADS[0];

  for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
    const r = OPEN_WORLD_ROADS[i];
    const res = pointToSegmentDistSq(px, pz, r.x1, r.z1, r.x2, r.z2);
    if (res.distSq < bestDistSq) {
      bestDistSq = res.distSq;
      bestCx = res.cx;
      bestCz = res.cz;
      bestRoad = r;
    }
  }
  return { dist: Math.sqrt(bestDistSq), cx: bestCx, cz: bestCz, road: bestRoad };
}

/**
 * Zero-allocation surface elevation query for Open-World roads, mountain switchbacks,
 * wooden pier, elevated cyber overpass, and ramp wedges.
 * `currentY` disambiguates overlapping overpass vs underpass tunnel/avenue at (-280, -180).
 */
export function getWorldHeightAt(px: number, pz: number, currentY = 0): number {
  let bestY = 0;

  // 1. Check elevated roads (mountain switchbacks, pier, overpass)
  for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
    const r = OPEN_WORLD_ROADS[i];
    const e1 = r.elevation1 ?? 0;
    const e2 = r.elevation2 ?? 0;
    if (e1 === 0 && e2 === 0) continue;

    // Disambiguate cyber overpass vs street underneath at X = -280
    if (r.kind === 'overpass' && r.zone === 'city' && currentY < 1.2) {
      // Only snap onto overpass deck if driving up the ramp ends, or already elevated
      if (px > -365 && px < -195) {
        continue;
      }
    }

    const halfW = r.width * 0.65;
    const res = pointToSegmentDistSq(px, pz, r.x1, r.z1, r.x2, r.z2);
    if (res.distSq <= halfW * halfW) {
      const h = e1 + (e2 - e1) * res.t;
      if (h > bestY) bestY = h;
    }
  }

  // 2. Check ramps for smooth uphill launch height
  for (let i = 0; i < OPEN_WORLD_RAMPS.length; i++) {
    const ramp = OPEN_WORLD_RAMPS[i];
    const dx = px - ramp.x;
    const dz = pz - ramp.z;
    const cos = Math.cos(-ramp.rotY);
    const sin = Math.sin(-ramp.rotY);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const halfW = ramp.width * 0.55;
    const halfL = ramp.length * 0.5;
    if (Math.abs(localX) <= halfW && Math.abs(localZ) <= halfL) {
      const progress = (localZ + halfL) / ramp.length; // 0 at base, 1 at lip
      const rampY = ramp.baseY + progress * ramp.height;
      if (rampY > bestY) bestY = rampY;
    }
  }

  return bestY;
}
