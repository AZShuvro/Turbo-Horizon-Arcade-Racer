import * as THREE from 'three';
import {
  GraphicsQuality,
  OpenWorldActivity,
  OpenWorldBlip,
  OpenWorldHub,
  OpenWorldHudState,
  OpenWorldRoadSegment,
  OpenWorldWaypoint,
  TrafficCar,
  WeatherType,
  WorldZone,
} from '../types/game';
import { soundManager } from '../audio/soundManager';
import {
  createJumpRamp,
  createPlayerCar,
  createSpeedTrapCamera,
  createTrafficVehicle,
} from './proceduralModels';
import {
  OPEN_WORLD_HUBS,
  OPEN_WORLD_RAMPS,
  OPEN_WORLD_ROADS,
  WORLD_HALF_EXTENT,
  ZONE_LABELS,
  createInitialActivities,
  distanceToNearestRoad,
  getWorldHeightAt,
  getZoneAt,
} from './openWorldData';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

interface PooledOpenWorldVehicle {
  car: TrafficCar;
  roadIdx: number;
  dir: 1 | -1;
  t: number;
  laneOffset: number;
  baseSpeed: number;
}

interface PooledRival {
  id: number;
  name: string;
  color: string;
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  rotY: number;
  speed: number;
  maxSpeed: number;
  checkpointIdx: number;
  finished: boolean;
  progress: number;
}

export class OpenWorldManager {
  public scene: THREE.Scene;
  public rootGroup: THREE.Group;

  public currentZone: WorldZone = 'city';
  public hubs: OpenWorldHub[] = OPEN_WORLD_HUBS.map((h) => ({ ...h }));
  public activities: OpenWorldActivity[] = createInitialActivities();
  public colliders: THREE.Box3[] = [];

  // Quality & Culling parameters
  public cullRadius = 330;
  private maxActiveTraffic = 15;
  private maxActivePolice = 3;

  // Counters
  public tokensCollected = 0;
  public totalTokens = 12;
  public racesWon = 0;
  public totalRaces = 4;

  // Interactive Pools (Zero-GC)
  public trafficPool: PooledOpenWorldVehicle[] = [];
  public policePool: PooledOpenWorldVehicle[] = [];
  private rivalPool: PooledRival[] = [];
  private blipsBuffer: OpenWorldBlip[] = [];

  // Active GPS Waypoint & 3D Arrow Guidance
  public waypoint: OpenWorldWaypoint | null = null;
  private gpsArrowGroup!: THREE.Group;
  private gpsBeamGroup!: THREE.Group;

  // Active Drift Zone tracking
  private activeDriftZone: OpenWorldActivity | null = null;
  private driftZoneScore = 0;

  // Active Street Race tracking
  private activeRace: OpenWorldActivity | null = null;
  private raceCheckpointIdx = 0;
  private raceElapsed = 0;
  private raceCheckpointBeacon!: THREE.Group;

  // Reusable Instanced Materials / Meshes
  private roadMat!: THREE.MeshStandardMaterial;
  private lampGlowMat!: THREE.MeshStandardMaterial;
  private neonTrimMat!: THREE.MeshStandardMaterial;

  // Callbacks
  public onZoneChange?: (zone: WorldZone, zoneName: string) => void;
  public onActivityReward?: (payload: {
    title: string;
    coins: number;
    score: number;
    kind: 'race' | 'drift' | 'speedtrap' | 'ramp' | 'token' | 'hub';
  }) => void;
  public onAchievementTrigger?: (id: string) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'open-world';
    this.scene.add(this.rootGroup);

    this.totalTokens = this.activities.filter(
      (a) => a.type === 'token' || a.type === 'crate'
    ).length;
    this.totalRaces = this.activities.filter((a) => a.type === 'street_race').length;

    this.buildTerrain();
    this.buildInstancedRoads();
    this.buildCityProps();
    this.buildCoastalProps();
    this.buildMountainProps();
    this.buildIndustrialProps();
    this.buildStreetLightsAndBarriers();
    this.buildActivityMeshes();
    this.buildGpsGuidance();
    this.initVehiclePools();
  }

  public setQuality(quality: GraphicsQuality) {
    if (quality === 'low') {
      this.cullRadius = 215;
      this.maxActiveTraffic = 9;
      this.maxActivePolice = 2;
    } else if (quality === 'balanced') {
      this.cullRadius = 330;
      this.maxActiveTraffic = 15;
      this.maxActivePolice = 3;
    } else {
      this.cullRadius = 460;
      this.maxActiveTraffic = 20;
      this.maxActivePolice = 4;
    }
  }

  public setWeather(weather: WeatherType) {
    if (!this.roadMat) return;
    if (weather === 'rain') {
      this.roadMat.roughness = 0.16;
      this.roadMat.metalness = 0.72;
      this.roadMat.color.setHex(0x0b0d13);
    } else {
      this.roadMat.roughness = 0.85;
      this.roadMat.metalness = 0.12;
      this.roadMat.color.setHex(0x18181b);
    }
    if (this.lampGlowMat) {
      this.lampGlowMat.emissiveIntensity = weather === 'night' ? 3.0 : 1.6;
    }
    if (this.neonTrimMat) {
      this.neonTrimMat.emissiveIntensity = weather === 'night' ? 2.8 : 1.8;
    }
  }

  // 1. 1600m x 1600m Multi-Biome Low-Poly Terrain & Ocean
  private buildTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(1650, 1650, 32, 32);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const zone = getZoneAt(x, z);

      if (zone === 'city') {
        // Dark cyber concrete slate
        colors[i * 3] = 0.11;
        colors[i * 3 + 1] = 0.13;
        colors[i * 3 + 2] = 0.19;
      } else if (zone === 'beach') {
        // Warm golden coastal sand
        colors[i * 3] = 0.92;
        colors[i * 3 + 1] = 0.80;
        colors[i * 3 + 2] = 0.52;
      } else if (zone === 'mountains') {
        // Terracotta canyon highlands with gentle terrain undulation away from road
        colors[i * 3] = 0.68;
        colors[i * 3 + 1] = 0.34;
        colors[i * 3 + 2] = 0.16;
      } else {
        // Industrial tarmac / dusty gravel yard
        colors[i * 3] = 0.22;
        colors[i * 3 + 1] = 0.23;
        colors[i * 3 + 2] = 0.27;
      }
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
    });

    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.12;
    terrain.receiveShadow = true;
    this.rootGroup.add(terrain);

    // Tropical Ocean Plane on South-East Coastline
    const oceanGeo = new THREE.PlaneGeometry(1100, 560);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.18,
      metalness: 0.65,
      transparent: true,
      opacity: 0.88,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.set(280, -0.04, 670);
    this.rootGroup.add(ocean);

    // Subtle Shoreline Surf Band
    const foamGeo = new THREE.PlaneGeometry(920, 14);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.55,
    });
    const foam = new THREE.Mesh(foamGeo, foamMat);
    foam.position.set(280, 0.0, 392);
    this.rootGroup.add(foam);
  }

  // 2. GPU-Instanced Interconnected Road Network (2 Draw Calls!)
  private buildInstancedRoads() {
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.12,
    });

    const roadBoxGeo = new THREE.BoxGeometry(1, 0.24, 1);
    const roadsMesh = new THREE.InstancedMesh(
      roadBoxGeo,
      this.roadMat,
      OPEN_WORLD_ROADS.length
    );
    roadsMesh.receiveShadow = true;

    const lineGeo = new THREE.PlaneGeometry(0.32, 1);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const linesMesh = new THREE.InstancedMesh(
      lineGeo,
      lineMat,
      OPEN_WORLD_ROADS.length
    );

    for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
      const r = OPEN_WORLD_ROADS[i];
      const e1 = r.elevation1 ?? 0;
      const e2 = r.elevation2 ?? 0;
      const midX = (r.x1 + r.x2) * 0.5;
      const midZ = (r.z1 + r.z2) * 0.5;
      const midY = (e1 + e2) * 0.5;

      const dx = r.x2 - r.x1;
      const dy = e2 - e1;
      const dz = r.z2 - r.z1;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) + r.width * 0.5;

      _vA.set(r.x1, e1, r.z1);
      _vB.set(r.x2, e2, r.z2);

      _dummy.position.set(midX, midY - 0.08, midZ);
      _dummy.up.copy(_up);
      _dummy.lookAt(_vB.x, _vB.y - 0.08, _vB.z);
      _dummy.scale.set(r.width, 1, len);
      _dummy.updateMatrix();
      roadsMesh.setMatrixAt(i, _dummy.matrix);

      // Tint asphalt slightly per road type
      if (r.kind === 'pier') _color.setHex(0x78350f);
      else if (r.kind === 'switchback') _color.setHex(0x44403c);
      else if (r.kind === 'runway') _color.setHex(0x27272a);
      else if (r.kind === 'shortcut') _color.setHex(0x3f3f46);
      else _color.setHex(0x18181b);
      roadsMesh.setColorAt(i, _color);

      // Center lane stripe
      _dummy.position.set(midX, midY + 0.06, midZ);
      _dummy.lookAt(_vB.x, _vB.y + 0.06, _vB.z);
      _dummy.scale.set(1, 1, Math.max(1, len - 2));
      _dummy.updateMatrix();
      linesMesh.setMatrixAt(i, _dummy.matrix);
    }

    roadsMesh.instanceMatrix.needsUpdate = true;
    if (roadsMesh.instanceColor) roadsMesh.instanceColor.needsUpdate = true;
    roadsMesh.computeBoundingSphere();

    linesMesh.instanceMatrix.needsUpdate = true;
    linesMesh.computeBoundingSphere();

    this.rootGroup.add(roadsMesh, linesMesh);

    // Underground Cyber Tunnel Roof & Ribbed Arches along X = -280 (Z = -415 to -255)
    const tunnelRoof = new THREE.Mesh(
      new THREE.BoxGeometry(17.5, 0.8, 160),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.45,
        metalness: 0.7,
        flatShading: true,
      })
    );
    tunnelRoof.position.set(-280, 6.8, -335);
    this.rootGroup.add(tunnelRoof);

    // Tunnel side walls (leave open ends North & South)
    const tunnelWallGeo = new THREE.BoxGeometry(1.0, 6.8, 160);
    const tunnelWallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      flatShading: true,
    });
    const tWallL = new THREE.Mesh(tunnelWallGeo, tunnelWallMat);
    tWallL.position.set(-288.5, 3.4, -335);
    const tWallR = new THREE.Mesh(tunnelWallGeo, tunnelWallMat);
    tWallR.position.set(-271.5, 3.4, -335);
    this.rootGroup.add(tWallL, tWallR);

    // Glowing Cyber Neon Strips inside tunnel
    const tNeonMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const tNeonL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 158), tNeonMat);
    tNeonL.position.set(-287.8, 5.4, -335);
    const tNeonR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 158), tNeonMat);
    tNeonR.position.set(-272.2, 5.4, -335);
    this.rootGroup.add(tNeonL, tNeonR);

    // Overpass Support Pillars (under Cyber Overpass and Canyon Bridge)
    const pillarGeo = new THREE.CylinderGeometry(0.9, 1.1, 1, 6);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      flatShading: true,
    });
    const pillarCoords = [
      { x: -320, y: 6.2, z: -187 },
      { x: -320, y: 6.2, z: -173 },
      { x: -240, y: 6.2, z: -187 },
      { x: -240, y: 6.2, z: -173 },
      { x: 265, y: 9.0, z: -275 },
      { x: 345, y: 9.4, z: -300 },
      { x: 425, y: 9.8, z: -325 },
    ];
    const pillarsMesh = new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCoords.length);
    for (let i = 0; i < pillarCoords.length; i++) {
      const p = pillarCoords[i];
      _dummy.position.set(p.x, p.y * 0.5, p.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, p.y, 1);
      _dummy.updateMatrix();
      pillarsMesh.setMatrixAt(i, _dummy.matrix);
    }
    pillarsMesh.instanceMatrix.needsUpdate = true;
    pillarsMesh.computeBoundingSphere();
    this.rootGroup.add(pillarsMesh);
  }

  // 3. Zone 1: Downtown Cyber/Metro District (Instanced Skyscrapers + Neon Trims)
  private buildCityProps() {
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.55,
      flatShading: true,
    });

    this.neonTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    const placements: Array<{ x: number; z: number; w: number; d: number; h: number; col: number; neonCol: number }> = [];
    const palette = [0x0f172a, 0x1e293b, 0x172554, 0x312e81, 0x134e4a, 0x1e1b4b];
    const neonPalette = [0x06b6d4, 0xf43f5e, 0xa855f7, 0xfacc15, 0x38bdf8];

    let seed = 0;
    for (let bx = -560; bx <= -40; bx += 54) {
      for (let bz = -450; bz <= 105; bz += 52) {
        seed++;
        const px = bx + ((seed * 13) % 15) - 7;
        const pz = bz + ((seed * 19) % 15) - 7;
        const w = 18 + (seed % 3) * 5;
        const d = 18 + ((seed + 1) % 3) * 5;
        const h = 28 + ((seed * 17) % 68);

        // Guarantee skyscrapers never block any road, tunnel, overpass, or alley shortcut
        const nearest = distanceToNearestRoad(px, pz);
        const minClear = nearest.road.width * 0.5 + Math.max(w, d) * 0.55 + 3.5;
        if (nearest.dist < minClear) continue;

        placements.push({
          x: px,
          z: pz,
          w,
          d,
          h,
          col: palette[seed % palette.length],
          neonCol: neonPalette[seed % neonPalette.length],
        });
      }
    }

    const buildingsMesh = new THREE.InstancedMesh(buildingGeo, buildingMat, Math.max(1, placements.length));
    const neonMesh = new THREE.InstancedMesh(buildingGeo, this.neonTrimMat, Math.max(1, placements.length));
    buildingsMesh.castShadow = true;
    buildingsMesh.receiveShadow = true;

    for (let i = 0; i < placements.length; i++) {
      const b = placements[i];
      _dummy.position.set(b.x, b.h * 0.5, b.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(b.w, b.h, b.d);
      _dummy.updateMatrix();
      buildingsMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(b.col);
      buildingsMesh.setColorAt(i, _color);

      // Glowing cyber rooftop crown & billboard band
      _dummy.position.set(b.x, b.h - 1.2, b.z);
      _dummy.scale.set(b.w + 0.5, 1.4, b.d + 0.5);
      _dummy.updateMatrix();
      neonMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(b.neonCol);
      neonMesh.setColorAt(i, _color);

      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(b.x - b.w * 0.5, 0, b.z - b.d * 0.5),
          new THREE.Vector3(b.x + b.w * 0.5, b.h, b.z + b.d * 0.5)
        )
      );
    }

    buildingsMesh.instanceMatrix.needsUpdate = true;
    if (buildingsMesh.instanceColor) buildingsMesh.instanceColor.needsUpdate = true;
    buildingsMesh.computeBoundingSphere();

    neonMesh.instanceMatrix.needsUpdate = true;
    if (neonMesh.instanceColor) neonMesh.instanceColor.needsUpdate = true;
    neonMesh.computeBoundingSphere();

    this.rootGroup.add(buildingsMesh, neonMesh);

    // Downtown Cyber Drift Plaza Centerpiece (-480, -180)
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3, metalness: 0.7 })
    );
    plaza.position.set(-480, 0.08, -180);
    this.rootGroup.add(plaza);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 2.4, 26, 6),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 2.2 })
    );
    spire.position.set(-480, 13, -180);
    this.rootGroup.add(spire);
  }

  // 4. Zone 2: Coastal Highway & Pier (Instanced Palms + Wooden Pilings + Headland Rocks)
  private buildCoastalProps() {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 6.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85, flatShading: true });
    const leafGeo = new THREE.ConeGeometry(2.1, 3.4, 6);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75, flatShading: true });

    const palmCoords: Array<{ x: number; z: number; scale: number }> = [];
    for (let i = 0; i < 48; i++) {
      const px = -40 + ((i * 37) % 620);
      const pz = 175 + ((i * 53) % 210);
      const nearest = distanceToNearestRoad(px, pz);
      if (nearest.dist < nearest.road.width * 0.5 + 3.5) continue;
      palmCoords.push({ x: px, z: pz, scale: 0.85 + (i % 4) * 0.16 });
    }

    if (palmCoords.length > 0) {
      const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCoords.length);
      const leaves = new THREE.InstancedMesh(leafGeo, leafMat, palmCoords.length);
      for (let i = 0; i < palmCoords.length; i++) {
        const p = palmCoords[i];
        _dummy.position.set(p.x, 3.1 * p.scale, p.z);
        _dummy.rotation.set(0.05 * Math.sin(i), i * 0.7, 0.05 * Math.cos(i));
        _dummy.scale.setScalar(p.scale);
        _dummy.updateMatrix();
        trunks.setMatrixAt(i, _dummy.matrix);

        _dummy.position.set(p.x, 6.4 * p.scale, p.z);
        _dummy.scale.set(p.scale * 1.15, p.scale, p.scale * 1.15);
        _dummy.updateMatrix();
        leaves.setMatrixAt(i, _dummy.matrix);
      }
      trunks.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingSphere();
      leaves.computeBoundingSphere();
      this.rootGroup.add(trunks, leaves);
    }

    // Wooden Pier Pilings under X = 240, Z = 380..595
    const pileGeo = new THREE.CylinderGeometry(0.55, 0.65, 6.5, 6);
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9, flatShading: true });
    const pileCount = 24;
    const piles = new THREE.InstancedMesh(pileGeo, pileMat, pileCount);
    for (let i = 0; i < 12; i++) {
      const pz = 380 + i * 19;
      _dummy.position.set(233, -0.8, pz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      piles.setMatrixAt(i * 2, _dummy.matrix);

      _dummy.position.set(247, -0.8, pz);
      _dummy.updateMatrix();
      piles.setMatrixAt(i * 2 + 1, _dummy.matrix);
    }
    piles.instanceMatrix.needsUpdate = true;
    piles.computeBoundingSphere();
    this.rootGroup.add(piles);
  }

  // 5. Zone 3: Canyon & Mountain Switchbacks (Instanced Terracotta Spires)
  private buildMountainProps() {
    const rockGeo = new THREE.CylinderGeometry(3.8, 9.5, 28, 6);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      flatShading: true,
    });

    const rocks: Array<{ x: number; z: number; sx: number; sy: number; col: number }> = [];
    const rockPalette = [0x9a3412, 0xb45309, 0x7c2d12, 0xc2410c];

    let idx = 0;
    for (let rx = 70; rx <= 640; rx += 58) {
      for (let rz = -620; rz <= 90; rz += 62) {
        idx++;
        const px = rx + Math.sin(idx * 2.1) * 16;
        const pz = rz + Math.cos(idx * 1.7) * 16;
        const nearest = distanceToNearestRoad(px, pz);
        const sx = 0.9 + ((idx * 5) % 9) * 0.14;
        const sy = 0.75 + ((idx * 7) % 14) * 0.16;

        if (nearest.dist < nearest.road.width * 0.5 + 9 * sx + 4) continue;
        rocks.push({
          x: px,
          z: pz,
          sx,
          sy,
          col: rockPalette[idx % rockPalette.length],
        });
      }
    }

    const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, rocks.length));
    rocksMesh.castShadow = true;
    rocksMesh.receiveShadow = true;

    for (let i = 0; i < rocks.length; i++) {
      const rk = rocks[i];
      _dummy.position.set(rk.x, 14 * rk.sy - 0.5, rk.z);
      _dummy.rotation.set(0, i * 0.65, 0);
      _dummy.scale.set(rk.sx, rk.sy, rk.sx);
      _dummy.updateMatrix();
      rocksMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(rk.col);
      rocksMesh.setColorAt(i, _color);

      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(rk.x - 6.8 * rk.sx, 0, rk.z - 6.8 * rk.sx),
          new THREE.Vector3(rk.x + 6.8 * rk.sx, 32, rk.z + 6.8 * rk.sx)
        )
      );
    }

    rocksMesh.instanceMatrix.needsUpdate = true;
    if (rocksMesh.instanceColor) rocksMesh.instanceColor.needsUpdate = true;
    rocksMesh.computeBoundingSphere();
    this.rootGroup.add(rocksMesh);
  }

  // 6. Zone 4: Industrial & Stunt Airport (Instanced Hangars + Shipping Container Maze + Drift Pad)
  private buildIndustrialProps() {
    // Warehouses / Airport Hangars
    const hangarGeo = new THREE.BoxGeometry(1, 1, 1);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.72,
      metalness: 0.35,
      flatShading: true,
    });

    const hangars = [
      { x: -490, z: 190, w: 38, h: 16, d: 26 },
      { x: -490, z: 560, w: 42, h: 18, d: 28 },
      { x: -275, z: 560, w: 36, h: 16, d: 28 },
      { x: -115, z: 295, w: 28, h: 15, d: 34 },
      { x: -625, z: 320, w: 26, h: 16, d: 52 },
    ];
    const hangarsMesh = new THREE.InstancedMesh(hangarGeo, hangarMat, hangars.length);
    hangarsMesh.castShadow = true;
    hangarsMesh.receiveShadow = true;

    for (let i = 0; i < hangars.length; i++) {
      const hg = hangars[i];
      _dummy.position.set(hg.x, hg.h * 0.5, hg.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(hg.w, hg.h, hg.d);
      _dummy.updateMatrix();
      hangarsMesh.setMatrixAt(i, _dummy.matrix);

      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(hg.x - hg.w * 0.5, 0, hg.z - hg.d * 0.5),
          new THREE.Vector3(hg.x + hg.w * 0.5, hg.h, hg.z + hg.d * 0.5)
        )
      );
    }
    hangarsMesh.instanceMatrix.needsUpdate = true;
    hangarsMesh.computeBoundingSphere();
    this.rootGroup.add(hangarsMesh);

    // Shipping Container Maze (Colorful Instanced Containers)
    const containerGeo = new THREE.BoxGeometry(3.2, 3.2, 9.5);
    const containerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.25,
      flatShading: true,
    });
    const containerColors = [0xdc2626, 0x0284c7, 0xf59e0b, 0x16a34a, 0x7c3aed];
    const containerCoords: Array<{ x: number; y: number; z: number; rotY: number; col: number }> = [];

    for (let i = 0; i < 34; i++) {
      const cx = -530 + (i % 6) * 26 + ((i % 2) * 5);
      const cz = 285 + Math.floor(i / 6) * 26;
      const nearest = distanceToNearestRoad(cx, cz);
      if (nearest.dist < nearest.road.width * 0.5 + 6.5) continue;

      const rotY = i % 3 === 0 ? Math.PI / 2 : 0;
      containerCoords.push({
        x: cx,
        y: 1.6,
        z: cz,
        rotY,
        col: containerColors[i % containerColors.length],
      });
      // Stack second level on some containers
      if (i % 4 === 0) {
        containerCoords.push({
          x: cx,
          y: 4.8,
          z: cz,
          rotY,
          col: containerColors[(i + 2) % containerColors.length],
        });
      }
    }

    if (containerCoords.length > 0) {
      const containersMesh = new THREE.InstancedMesh(
        containerGeo,
        containerMat,
        containerCoords.length
      );
      containersMesh.castShadow = true;
      for (let i = 0; i < containerCoords.length; i++) {
        const c = containerCoords[i];
        _dummy.position.set(c.x, c.y, c.z);
        _dummy.rotation.set(0, c.rotY, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        containersMesh.setMatrixAt(i, _dummy.matrix);
        _color.setHex(c.col);
        containersMesh.setColorAt(i, _color);

        if (c.y < 2.5) {
          const hw = c.rotY !== 0 ? 4.8 : 1.7;
          const hd = c.rotY !== 0 ? 1.7 : 4.8;
          this.colliders.push(
            new THREE.Box3(
              new THREE.Vector3(c.x - hw, 0, c.z - hd),
              new THREE.Vector3(c.x + hw, 6.5, c.z + hd)
            )
          );
        }
      }
      containersMesh.instanceMatrix.needsUpdate = true;
      if (containersMesh.instanceColor) containersMesh.instanceColor.needsUpdate = true;
      containersMesh.computeBoundingSphere();
      this.rootGroup.add(containersMesh);
    }

    // Stunt Airport Tarmac Drift Arena Pad (-180, 360)
    const driftArena = new THREE.Mesh(
      new THREE.CylinderGeometry(38, 38, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.78 })
    );
    driftArena.position.set(-180, 0.01, 360);
    this.rootGroup.add(driftArena);
  }

  // 7. Instanced Streetlights & Guardrails along Highways
  private buildStreetLightsAndBarriers() {
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const glowGeo = new THREE.BoxGeometry(1.1, 0.25, 0.45);
    this.lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.6,
    });

    const lampPositions: Array<{ x: number; y: number; z: number; rotY: number }> = [];
    for (let i = 0; i < OPEN_WORLD_ROADS.length; i++) {
      const r = OPEN_WORLD_ROADS[i];
      if (r.kind === 'tunnel' || r.kind === 'shortcut') continue;
      const dx = r.x2 - r.x1;
      const dz = r.z2 - r.z1;
      const segLen = Math.hypot(dx, dz);
      const steps = Math.max(1, Math.floor(segLen / 90));
      const rotY = Math.atan2(dx, dz);
      const perpX = Math.cos(rotY);
      const perpZ = -Math.sin(rotY);
      const sideOffset = r.width * 0.5 + 1.4;
      const e1 = r.elevation1 ?? 0;
      const e2 = r.elevation2 ?? 0;

      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const side = s % 2 === 0 ? 1 : -1;
        const lx = r.x1 + dx * t + perpX * sideOffset * side;
        const lz = r.z1 + dz * t + perpZ * sideOffset * side;
        const ly = e1 + (e2 - e1) * t;
        lampPositions.push({ x: lx, y: ly, z: lz, rotY });
      }
    }

    if (lampPositions.length > 0) {
      const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
      const glows = new THREE.InstancedMesh(glowGeo, this.lampGlowMat, lampPositions.length);
      for (let i = 0; i < lampPositions.length; i++) {
        const lp = lampPositions[i];
        _dummy.position.set(lp.x, lp.y + 3.25, lp.z);
        _dummy.rotation.set(0, lp.rotY, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        poles.setMatrixAt(i, _dummy.matrix);

        _dummy.position.set(lp.x, lp.y + 6.45, lp.z);
        _dummy.updateMatrix();
        glows.setMatrixAt(i, _dummy.matrix);
      }
      poles.instanceMatrix.needsUpdate = true;
      glows.instanceMatrix.needsUpdate = true;
      poles.computeBoundingSphere();
      glows.computeBoundingSphere();
      this.rootGroup.add(poles, glows);
    }
  }

  // 8. Interactive Beacons, Street Race Gates, Drift Rings, Speed Traps, Ramps & Collectible Tokens
  private buildActivityMeshes() {
    // A. Build Stunt Mega-Ramps matching OPEN_WORLD_RAMPS physics coordinates
    for (const rampDef of OPEN_WORLD_RAMPS) {
      const rampGroup = createJumpRamp();
      rampGroup.position.set(rampDef.x, rampDef.baseY, rampDef.z);
      rampGroup.rotation.y = rampDef.rotY;
      rampGroup.scale.set(rampDef.width / 3.6, rampDef.height / 1.1, rampDef.length / 3.2);
      this.rootGroup.add(rampGroup);

      const act = this.activities.find((a) => a.id === rampDef.id);
      if (act) act.meshGroup = rampGroup;
    }

    // B. Fast Travel Hub Glowing Beacons
    const hubRingGeo = new THREE.TorusGeometry(6.5, 0.25, 8, 24);
    for (const hub of this.hubs) {
      const hubY = getWorldHeightAt(hub.x, hub.z, 8.0);
      const ring = new THREE.Mesh(
        hubRingGeo,
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hub.color) })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(hub.x, hubY + 0.22, hub.z);
      this.rootGroup.add(ring);
    }

    // C. Activity Meshes
    const tokenGeo = new THREE.OctahedronGeometry(1.3, 0);
    const tokenMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.7,
      flatShading: true,
    });
    const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.65,
      roughness: 0.25,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.85,
      flatShading: true,
    });
    const driftRingGeo = new THREE.TorusGeometry(14, 0.32, 8, 28);
    const driftRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
    });

    for (const act of this.activities) {
      const yBase =
        act.id === 'tok-tunnel'
          ? 0
          : getWorldHeightAt(act.x, act.z, 8.0);

      if (act.type === 'street_race') {
        const gate = new THREE.Group();
        const postMat = new THREE.MeshStandardMaterial({
          color: 0x09090b,
          metalness: 0.7,
          roughness: 0.3,
        });
        const neonGateMat = new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 2.2,
        });
        const pL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.0, 0.9), postMat);
        pL.position.set(-7.5, 4.0, 0);
        const pR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.0, 0.9), postMat);
        pR.position.set(7.5, 4.0, 0);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 1.1), neonGateMat);
        bar.position.set(0, 8.0, 0);
        const pad = new THREE.Mesh(
          new THREE.RingGeometry(4.5, 5.4, 24),
          new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.14;
        gate.add(pL, pR, bar, pad);
        gate.position.set(act.x, yBase, act.z);
        gate.rotation.y = act.heading ?? 0;
        this.rootGroup.add(gate);
        act.meshGroup = gate;
      } else if (act.type === 'drift_zone') {
        const ring = new THREE.Mesh(driftRingGeo, driftRingMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(act.x, yBase + 0.2, act.z);
        this.rootGroup.add(ring);
        act.meshGroup = ring;
      } else if (act.type === 'speedtrap') {
        const cam = createSpeedTrapCamera();
        cam.position.set(act.x + 8, yBase, act.z);
        this.rootGroup.add(cam);
        act.meshGroup = cam;
      } else if (act.type === 'token') {
        const m = new THREE.Mesh(tokenGeo, tokenMat);
        m.position.set(act.x, yBase + 1.8, act.z);
        this.rootGroup.add(m);
        act.meshGroup = m;
      } else if (act.type === 'crate') {
        const m = new THREE.Mesh(crateGeo, crateMat);
        m.position.set(act.x, yBase + 1.5, act.z);
        this.rootGroup.add(m);
        act.meshGroup = m;
      }
    }

    // Active Street Race Checkpoint Beacon (reused across checkpoints -> zero allocations)
    this.raceCheckpointBeacon = new THREE.Group();
    const cpRing = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.45, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    cpRing.position.y = 4.2;
    const cpBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 2.2, 42, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    cpBeam.position.y = 21;
    this.raceCheckpointBeacon.add(cpRing, cpBeam);
    this.raceCheckpointBeacon.visible = false;
    this.rootGroup.add(this.raceCheckpointBeacon);
  }

  // 9. Floating 3D GPS Directional Arrow & Destination Beacon
  private buildGpsGuidance() {
    this.gpsArrowGroup = new THREE.Group();
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 1.3), arrowMat);
    shaft.position.z = -0.3;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 4), arrowMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.7;
    this.gpsArrowGroup.add(shaft, head);
    this.gpsArrowGroup.visible = false;
    this.rootGroup.add(this.gpsArrowGroup);

    this.gpsBeamGroup = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 2.4, 70, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 35;
    const targetRing = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
    );
    targetRing.rotation.x = -Math.PI / 2;
    targetRing.position.y = 0.22;
    this.gpsBeamGroup.add(beam, targetRing);
    this.gpsBeamGroup.visible = false;
    this.rootGroup.add(this.gpsBeamGroup);
  }

  // 10. Pre-Allocated Object Pools for Civilian Traffic, Roaming Police & Street Race AI Rivals
  private initVehiclePools() {
    const types: Array<'sedan' | 'suv' | 'sports' | 'semi'> = ['sedan', 'suv', 'sports', 'semi'];
    const colors = ['#f8fafc', '#38bdf8', '#f97316', '#84cc16', '#eab308', '#a855f7'];

    // 20 pooled civilian traffic cars
    for (let i = 0; i < 20; i++) {
      const type = types[i % types.length];
      const mesh = createTrafficVehicle(type, colors[i % colors.length]);
      mesh.visible = false;
      this.rootGroup.add(mesh);

      this.trafficPool.push({
        car: {
          id: 2000 + i,
          type,
          x: 0,
          z: 0,
          speed: 14,
          lane: i % 2 === 0 ? -3.4 : 3.4,
          color: colors[i % colors.length],
          active: false,
          meshGroup: mesh,
          width: type === 'semi' ? 2.4 : 1.8,
          length: type === 'semi' ? 8.5 : 4.2,
        },
        roadIdx: i % OPEN_WORLD_ROADS.length,
        dir: i % 2 === 0 ? 1 : -1,
        t: 0.5,
        laneOffset: i % 2 === 0 ? -3.4 : 3.4,
        baseSpeed: type === 'sports' ? 22 : type === 'semi' ? 12 : 16,
      });
    }

    // 4 pooled roaming police cruisers
    for (let i = 0; i < 4; i++) {
      const mesh = createTrafficVehicle('cop', '#09090b');
      mesh.visible = false;
      this.rootGroup.add(mesh);
      this.policePool.push({
        car: {
          id: 3000 + i,
          type: 'cop',
          x: 0,
          z: 0,
          speed: 18,
          lane: 3.4,
          color: '#09090b',
          active: false,
          meshGroup: mesh,
          width: 1.85,
          length: 4.2,
          isChaser: true,
        },
        roadIdx: (i * 5) % OPEN_WORLD_ROADS.length,
        dir: 1,
        t: 0.4,
        laneOffset: 3.4,
        baseSpeed: 19,
      });
    }

    // 3 pooled AI Street Race Rivals
    const rivalDefs = [
      { id: 'viper', name: 'KAI_GT', primary: '#ef4444', accent: '#18181b', stripe: '#facc15' },
      { id: 'cyber', name: 'NOVA_X', primary: '#06b6d4', accent: '#0f172a', stripe: '#f43f5e' },
      { id: 'formula', name: 'APEX_PRO', primary: '#a855f7', accent: '#fbbf24', stripe: '#ffffff' },
    ];
    for (let i = 0; i < rivalDefs.length; i++) {
      const rd = rivalDefs[i];
      const mesh = createPlayerCar(rd.id, rd.primary, rd.accent, 'dual_stripes', rd.stripe);
      mesh.visible = false;
      this.rootGroup.add(mesh);
      this.rivalPool.push({
        id: i + 1,
        name: rd.name,
        color: rd.primary,
        mesh,
        x: 0,
        y: 0,
        z: 0,
        rotY: 0,
        speed: 0,
        maxSpeed: 54 + i * 3.5,
        checkpointIdx: 0,
        finished: false,
        progress: 0,
      });
    }
  }

  public setGpsWaypoint(x: number, z: number, label = 'Custom Waypoint') {
    this.waypoint = { x, z, label };
    const y = getWorldHeightAt(x, z, 8.0);
    this.gpsBeamGroup.position.set(x, y, z);
    this.gpsBeamGroup.visible = true;
    soundManager.playBlinker();
  }

  public clearGpsWaypoint() {
    this.waypoint = null;
    this.gpsArrowGroup.visible = false;
    this.gpsBeamGroup.visible = false;
  }

  public fastTravelToHub(hubId: string): { x: number; z: number; heading: number; name: string } | null {
    const hub = this.hubs.find((h) => h.id === hubId);
    if (!hub) return null;
    hub.discovered = true;
    soundManager.playCheckpoint();
    return { x: hub.x, z: hub.z, heading: hub.heading, name: hub.name };
  }

  public cancelStreetRace() {
    this.activeRace = null;
    this.raceCheckpointBeacon.visible = false;
    for (const r of this.rivalPool) {
      r.mesh.visible = false;
    }
  }

  private launchStreetRace(act: OpenWorldActivity, playerX: number, playerZ: number) {
    if (!act.raceRoute || act.raceRoute.length === 0) return;
    this.activeRace = act;
    this.raceCheckpointIdx = 0;
    this.raceElapsed = 0;

    const firstPt = act.raceRoute[0];
    const startAngle = Math.atan2(firstPt.x - playerX, firstPt.z - playerZ);
    const perpX = Math.cos(startAngle);
    const perpZ = -Math.sin(startAngle);

    // Position 3 AI Rivals alongside start line
    for (let i = 0; i < this.rivalPool.length; i++) {
      const r = this.rivalPool[i];
      const lateral = (i - 1) * 3.6;
      const back = -2.5 - (i % 2) * 3.0;
      r.x = act.x + perpX * lateral + Math.sin(startAngle) * back;
      r.z = act.z + perpZ * lateral + Math.cos(startAngle) * back;
      r.y = getWorldHeightAt(r.x, r.z, 8.0);
      r.rotY = startAngle;
      r.speed = 24;
      r.checkpointIdx = 0;
      r.finished = false;
      r.progress = 0;
      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.y = r.rotY;
      r.mesh.visible = true;
    }

    const cpY = getWorldHeightAt(firstPt.x, firstPt.z, 8.0);
    this.raceCheckpointBeacon.position.set(firstPt.x, cpY, firstPt.z);
    this.raceCheckpointBeacon.visible = true;
    soundManager.playCheckpoint();

    this.onActivityReward?.({
      title: `STREET RACE STARTED: ${act.name.toUpperCase()}`,
      coins: 0,
      score: 100,
      kind: 'race',
    });
  }

  // Main per-frame Open-World Update (Zero-GC)
  public update(
    playerX: number,
    playerY: number,
    playerZ: number,
    playerHeading: number,
    playerSpeedKmH: number,
    isDrifting: boolean,
    dt: number
  ) {
    const now = Date.now();
    const cullSq = this.cullRadius * this.cullRadius;

    // 1. Zone & Fast-Travel Hub Discovery
    const newZone = getZoneAt(playerX, playerZ);
    if (newZone !== this.currentZone) {
      this.currentZone = newZone;
      this.onZoneChange?.(newZone, ZONE_LABELS[newZone]);
    }
    for (let i = 0; i < this.hubs.length; i++) {
      const h = this.hubs[i];
      if (!h.discovered) {
        const dx = playerX - h.x;
        const dz = playerZ - h.z;
        if (dx * dx + dz * dz < 42 * 42 || h.zone === newZone) {
          h.discovered = true;
          this.onActivityReward?.({
            title: `HUB DISCOVERED: ${h.name.toUpperCase()}`,
            coins: 35,
            score: 250,
            kind: 'hub',
          });
        }
      }
    }

    // 2. Activities, Distance Culling & Collectibles
    for (let i = 0; i < this.activities.length; i++) {
      const act = this.activities[i];
      const dx = playerX - act.x;
      const dz = playerZ - act.z;
      const distSq = dx * dx + dz * dz;

      // Distance culling for activity 3D meshes
      if (act.meshGroup) {
        const isCollectibleRemaining =
          (act.type === 'token' || act.type === 'crate') && !act.completed;
        const shouldShow =
          distSq < cullSq &&
          (act.type !== 'token' && act.type !== 'crate' ? true : isCollectibleRemaining);
        act.meshGroup.visible = shouldShow;

        if (shouldShow && (act.type === 'token' || act.type === 'crate')) {
          act.meshGroup.rotation.y += dt * 2.6;
          if (act.type === 'token') act.meshGroup.rotation.z += dt * 1.2;
        }
      }

      if (act.cooldownUntil && now < act.cooldownUntil) continue;

      if ((act.type === 'token' || act.type === 'crate') && !act.completed) {
        const meshY = act.meshGroup ? act.meshGroup.position.y : 1.6;
        if (distSq < act.radius * act.radius && Math.abs(playerY - (meshY - 1.5)) < 4.5) {
          act.completed = true;
          if (act.meshGroup) act.meshGroup.visible = false;
          this.tokensCollected++;
          soundManager.playCoin();
          this.onActivityReward?.({
            title: `${act.name.toUpperCase()} COLLECTED`,
            coins: act.rewardCoins,
            score: act.rewardScore,
            kind: 'token',
          });
        }
      } else if (act.type === 'speedtrap') {
        if (distSq < act.radius * act.radius && playerSpeedKmH >= 150) {
          act.cooldownUntil = now + 12000;
          soundManager.playSpeedTrapFlash();
          this.onActivityReward?.({
            title: `SPEED TRAP ${Math.round(playerSpeedKmH)} KM/H`,
            coins: act.rewardCoins,
            score: act.rewardScore,
            kind: 'speedtrap',
          });
          if (playerSpeedKmH >= 220) this.onAchievementTrigger?.('speed-demon');
        }
      } else if (act.type === 'street_race' && !this.activeRace) {
        if (distSq < act.radius * act.radius) {
          act.cooldownUntil = now + 15000;
          this.launchStreetRace(act, playerX, playerZ);
        }
      }
    }

    // 3. Drift Zone Continuous Combo Logic
    let insideDriftZone: OpenWorldActivity | null = null;
    for (let i = 0; i < this.activities.length; i++) {
      const act = this.activities[i];
      if (act.type !== 'drift_zone') continue;
      const dx = playerX - act.x;
      const dz = playerZ - act.z;
      if (dx * dx + dz * dz <= act.radius * act.radius) {
        insideDriftZone = act;
        break;
      }
    }

    if (insideDriftZone) {
      if (this.activeDriftZone?.id !== insideDriftZone.id) {
        this.activeDriftZone = insideDriftZone;
        this.driftZoneScore = 0;
      }
      if (isDrifting && playerSpeedKmH > 35) {
        this.driftZoneScore += Math.floor(playerSpeedKmH * 3.8 * dt);
      }
    } else if (this.activeDriftZone) {
      const target = this.activeDriftZone.targetDriftScore ?? 600;
      if (this.driftZoneScore >= target) {
        this.activeDriftZone.completed = true;
        soundManager.playAchievementUnlock();
        this.onActivityReward?.({
          title: `DRIFT ZONE CLEARED: ${this.activeDriftZone.name.toUpperCase()}`,
          coins: this.activeDriftZone.rewardCoins,
          score: this.activeDriftZone.rewardScore + this.driftZoneScore,
          kind: 'drift',
        });
      }
      this.activeDriftZone = null;
      this.driftZoneScore = 0;
    }

    // 4. Active Street Race Checkpoints & AI Rivals
    if (this.activeRace && this.activeRace.raceRoute) {
      this.raceElapsed += dt;
      const route = this.activeRace.raceRoute;
      const targetCp = route[this.raceCheckpointIdx];
      const dx = playerX - targetCp.x;
      const dz = playerZ - targetCp.z;

      if (dx * dx + dz * dz < 16 * 16) {
        this.raceCheckpointIdx++;
        soundManager.playCheckpoint();

        if (this.raceCheckpointIdx >= route.length) {
          // Player finished the street race!
          const rivalsFinishedAhead = this.rivalPool.filter((r) => r.finished).length;
          const rank = 1 + rivalsFinishedAhead;
          const won = rank === 1;
          if (won && !this.activeRace.completed) {
            this.activeRace.completed = true;
            this.racesWon++;
          } else if (won) {
            this.racesWon = Math.max(this.racesWon, 1);
          }

          const payoutCoins = won
            ? this.activeRace.rewardCoins
            : Math.round(this.activeRace.rewardCoins * 0.45);
          const payoutScore = won
            ? this.activeRace.rewardScore
            : Math.round(this.activeRace.rewardScore * 0.5);

          this.onActivityReward?.({
            title: won
              ? `RACE VICTORY! #1 ${this.activeRace.name.toUpperCase()}`
              : `FINISHED #${rank}: ${this.activeRace.name.toUpperCase()}`,
            coins: payoutCoins,
            score: payoutScore,
            kind: 'race',
          });
          this.cancelStreetRace();
        } else {
          const nextCp = route[this.raceCheckpointIdx];
          const cpY = getWorldHeightAt(nextCp.x, nextCp.z, 8.0);
          this.raceCheckpointBeacon.position.set(nextCp.x, cpY, nextCp.z);
        }
      }

      // Advance AI Rivals smoothly along race route
      for (let i = 0; i < this.rivalPool.length; i++) {
        const r = this.rivalPool[i];
        if (!r.mesh.visible || r.finished) continue;
        const cp = route[r.checkpointIdx];
        const rdx = cp.x - r.x;
        const rdz = cp.z - r.z;
        const dist = Math.hypot(rdx, rdz);
        if (dist < 10) {
          r.checkpointIdx++;
          if (r.checkpointIdx >= route.length) {
            r.finished = true;
            r.progress = route.length * 1000;
            continue;
          }
        }
        const desiredHeading = Math.atan2(rdx, rdz);
        let diff = desiredHeading - r.rotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        r.rotY += diff * Math.min(1, dt * 6);
        r.speed = THREE.MathUtils.damp(r.speed, r.maxSpeed, 2.2, dt);
        r.x += Math.sin(r.rotY) * r.speed * dt;
        r.z += Math.cos(r.rotY) * r.speed * dt;
        r.y = getWorldHeightAt(r.x, r.z, r.y);
        r.progress = r.checkpointIdx * 1000 + (1000 - Math.min(999, dist));

        r.mesh.position.set(r.x, r.y, r.z);
        r.mesh.rotation.y = r.rotY;
      }
    }

    // 5. Update 3D GPS Directional Arrow & Check Arrival
    if (this.waypoint) {
      const wdx = this.waypoint.x - playerX;
      const wdz = this.waypoint.z - playerZ;
      const distSq = wdx * wdx + wdz * wdz;
      if (distSq < 22 * 22) {
        soundManager.playCheckpoint();
        this.onActivityReward?.({
          title: `ARRIVED AT ${this.waypoint.label.toUpperCase()}`,
          coins: 15,
          score: 150,
          kind: 'hub',
        });
        this.clearGpsWaypoint();
      } else {
        this.gpsArrowGroup.visible = true;
        this.gpsArrowGroup.position.set(
          playerX + Math.sin(playerHeading) * 3.8,
          playerY + 2.55,
          playerZ + Math.cos(playerHeading) * 3.8
        );
        this.gpsArrowGroup.rotation.y = Math.atan2(wdx, wdz);
      }
    }

    // 6. Object-Pooled Dynamic Traffic & Roaming Police Cruisers
    this.updateVehiclePool(this.trafficPool, this.maxActiveTraffic, playerX, playerZ, cullSq, dt, false);
    this.updateVehiclePool(this.policePool, this.maxActivePolice, playerX, playerZ, cullSq, dt, true);

    // 7. Rebuild zero-GC radar blips buffer
    this.blipsBuffer.length = 0;
    for (let i = 0; i < this.trafficPool.length; i++) {
      const c = this.trafficPool[i].car;
      if (c.active) {
        this.blipsBuffer.push({ x: c.x, z: c.z, kind: 'traffic' });
      }
    }
    for (let i = 0; i < this.policePool.length; i++) {
      const c = this.policePool[i].car;
      if (c.active) {
        this.blipsBuffer.push({ x: c.x, z: c.z, kind: 'cop' });
      }
    }
    if (this.activeRace) {
      for (let i = 0; i < this.rivalPool.length; i++) {
        const r = this.rivalPool[i];
        if (r.mesh.visible) {
          this.blipsBuffer.push({ x: r.x, z: r.z, kind: 'rival' });
        }
      }
      const cp = this.activeRace.raceRoute?.[this.raceCheckpointIdx];
      if (cp) {
        this.blipsBuffer.push({ x: cp.x, z: cp.z, kind: 'checkpoint' });
      }
    }
  }

  private updateVehiclePool(
    pool: PooledOpenWorldVehicle[],
    maxActive: number,
    playerX: number,
    playerZ: number,
    cullSq: number,
    dt: number,
    isPolice: boolean
  ) {
    let activeCount = 0;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].car.active) activeCount++;
    }

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];

      if (p.car.active) {
        const road = OPEN_WORLD_ROADS[p.roadIdx];
        const segLen = Math.max(1, Math.hypot(road.x2 - road.x1, road.z2 - road.z1));
        const speedNorm = (p.baseSpeed * dt) / segLen;
        p.t += speedNorm * p.dir;

        if (p.t >= 1 || p.t <= 0) {
          p.dir = p.t >= 1 ? -1 : 1;
          p.t = Math.max(0.02, Math.min(0.98, p.t));
        }

        const rx = road.x1 + (road.x2 - road.x1) * p.t;
        const rz = road.z1 + (road.z2 - road.z1) * p.t;
        const ry = (road.elevation1 ?? 0) + ((road.elevation2 ?? 0) - (road.elevation1 ?? 0)) * p.t;
        const heading = Math.atan2(
          (road.x2 - road.x1) * p.dir,
          (road.z2 - road.z1) * p.dir
        );
        const perpX = Math.cos(heading);
        const perpZ = -Math.sin(heading);

        p.car.x = rx + perpX * p.laneOffset;
        p.car.z = rz + perpZ * p.laneOffset;
        p.car.speed = p.baseSpeed;
        p.car.meshGroup.position.set(p.car.x, ry, p.car.z);
        p.car.meshGroup.rotation.y = heading;

        if (isPolice) {
          const ud = p.car.meshGroup.userData;
          if (ud?.redLight && ud?.blueLight) {
            const flash = Math.floor(Date.now() / 160) % 2 === 0;
            ud.redLight.material.emissiveIntensity = flash ? 3.2 : 0.3;
            ud.blueLight.material.emissiveIntensity = flash ? 0.3 : 3.2;
          }
        }

        const dx = p.car.x - playerX;
        const dz = p.car.z - playerZ;
        if (dx * dx + dz * dz > cullSq + 2400) {
          p.car.active = false;
          p.car.meshGroup.visible = false;
          activeCount--;
        }
      } else if (activeCount < maxActive) {
        // Pick a road segment near the player to recycle pooled vehicle onto
        const candidateIdx = (p.roadIdx + Math.floor(Math.random() * 5)) % OPEN_WORLD_ROADS.length;
        const road = OPEN_WORLD_ROADS[candidateIdx];
        if (road.kind === 'shortcut' || road.kind === 'pier') {
          p.roadIdx = (candidateIdx + 1) % OPEN_WORLD_ROADS.length;
          continue;
        }
        const tSpawn = 0.2 + Math.random() * 0.6;
        const sx = road.x1 + (road.x2 - road.x1) * tSpawn;
        const sz = road.z1 + (road.z2 - road.z1) * tSpawn;
        const dx = sx - playerX;
        const dz = sz - playerZ;
        const dSq = dx * dx + dz * dz;

        if (dSq > 55 * 55 && dSq < cullSq) {
          p.roadIdx = candidateIdx;
          p.t = tSpawn;
          p.dir = Math.random() > 0.5 ? 1 : -1;
          p.laneOffset = p.dir === 1 ? -3.4 : 3.4;
          p.car.x = sx;
          p.car.z = sz;
          p.car.active = true;
          p.car.meshGroup.visible = true;
          activeCount++;
        } else {
          p.roadIdx = (candidateIdx + 1) % OPEN_WORLD_ROADS.length;
        }
      }
    }
  }

  public getHudState(playerX: number, playerZ: number): OpenWorldHudState {
    let waypointDist: number | null = null;
    if (this.waypoint) {
      waypointDist = Math.round(Math.hypot(this.waypoint.x - playerX, this.waypoint.z - playerZ));
    }

    let racePayload: OpenWorldHudState['activeRace'] = null;
    if (this.activeRace && this.activeRace.raceRoute) {
      const route = this.activeRace.raceRoute;
      const target = route[this.raceCheckpointIdx];
      const playerDistToCp = target ? Math.hypot(target.x - playerX, target.z - playerZ) : 0;
      const playerProgress = this.raceCheckpointIdx * 1000 + (1000 - Math.min(999, playerDistToCp));
      let aheadCount = 0;
      for (let i = 0; i < this.rivalPool.length; i++) {
        if (this.rivalPool[i].progress > playerProgress) aheadCount++;
      }
      racePayload = {
        name: this.activeRace.name,
        checkpointIdx: this.raceCheckpointIdx + 1,
        totalCheckpoints: route.length,
        rank: 1 + aheadCount,
        totalRacers: 4,
        elapsed: Math.round(this.raceElapsed * 10) / 10,
      };
    }

    return {
      currentZone: this.currentZone,
      zoneName: ZONE_LABELS[this.currentZone],
      tokensCollected: this.tokensCollected,
      totalTokens: this.totalTokens,
      racesWon: this.racesWon,
      totalRaces: this.totalRaces,
      waypoint: this.waypoint,
      waypointDist,
      activeDriftZone: this.activeDriftZone
        ? {
            name: this.activeDriftZone.name,
            score: this.driftZoneScore,
            target: this.activeDriftZone.targetDriftScore ?? 600,
          }
        : null,
      activeRace: racePayload,
      hubs: this.hubs,
      activities: this.activities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        zone: a.zone,
        x: a.x,
        z: a.z,
        completed: a.completed,
      })),
      blips: this.blipsBuffer,
    };
  }

  public checkBuildingCollision(
    px: number,
    pz: number,
    py: number,
    radius = 1.8
  ): { hit: boolean; normalX: number; normalZ: number } {
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (py > box.max.y) continue;
      if (
        px + radius > box.min.x &&
        px - radius < box.max.x &&
        pz + radius > box.min.z &&
        pz - radius < box.max.z
      ) {
        const cx = (box.min.x + box.max.x) * 0.5;
        const cz = (box.min.z + box.max.z) * 0.5;
        const nx = px - cx;
        const nz = pz - cz;
        const len = Math.hypot(nx, nz) || 1;
        return { hit: true, normalX: nx / len, normalZ: nz / len };
      }
    }

    // Clamp world perimeter cleanly
    if (Math.abs(px) > WORLD_HALF_EXTENT || Math.abs(pz) > WORLD_HALF_EXTENT) {
      const len = Math.hypot(px, pz) || 1;
      return { hit: true, normalX: -px / len, normalZ: -pz / len };
    }

    return { hit: false, normalX: 0, normalZ: 0 };
  }

  public setVisible(visible: boolean) {
    this.rootGroup.visible = visible;
    if (!visible) {
      this.cancelStreetRace();
    }
  }

  public reset() {
    this.currentZone = 'city';
    this.tokensCollected = 0;
    this.racesWon = 0;
    this.activeDriftZone = null;
    this.driftZoneScore = 0;
    this.cancelStreetRace();
    this.clearGpsWaypoint();

    for (let i = 0; i < this.activities.length; i++) {
      const a = this.activities[i];
      a.completed = false;
      a.cooldownUntil = undefined;
      if (a.meshGroup) a.meshGroup.visible = true;
    }

    for (let i = 0; i < this.trafficPool.length; i++) {
      this.trafficPool[i].car.active = false;
      this.trafficPool[i].car.meshGroup.visible = false;
    }
    for (let i = 0; i < this.policePool.length; i++) {
      this.policePool[i].car.active = false;
      this.policePool[i].car.meshGroup.visible = false;
    }
  }

  public dispose() {
    this.scene.remove(this.rootGroup);
    this.colliders = [];
    this.activities = [];
    this.trafficPool = [];
    this.policePool = [];
    this.rivalPool = [];
  }
}
