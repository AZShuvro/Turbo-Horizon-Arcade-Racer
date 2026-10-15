import * as THREE from 'three';
import { BiomeType, TrafficCar, PickupItem, TrackId } from '../types/game';
import {
  createTrafficVehicle,
  createPalmTree,
  createGoldCoin,
  createNitroCanister,
  createJumpRamp,
  createCheckpointArchway,
  createCyberGate,
  createCanyonPillar,
  createCactus,
} from './proceduralModels';

const ROAD_WIDTH = 14;
const CHUNK_LENGTH = 40;
const TOTAL_CHUNKS = 22; // ~880m road buffer
const LANES = [-4.0, 0, 4.0];

export class TrackManager {
  public scene: THREE.Scene;
  private roadChunks: THREE.Group[] = [];
  public traffic: TrafficCar[] = [];
  public pickups: PickupItem[] = [];
  public checkpoints: THREE.Group[] = [];

  public currentTrack: TrackId = 'sunset-coastal';
  public currentBiome: BiomeType = 'sunset';
  private chunkIndex = 0;
  private nextCheckpointDistance = 700;

  // Track materials
  private roadMat!: THREE.MeshStandardMaterial;
  private curbMatRed!: THREE.MeshStandardMaterial;
  private curbMatWhite!: THREE.MeshStandardMaterial;
  private stripeMat!: THREE.MeshBasicMaterial;
  private terrainMat!: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, initialTrack: TrackId = 'sunset-coastal') {
    this.scene = scene;
    this.currentTrack = initialTrack;
    this.initMaterials();
    this.applyTrackTheme(initialTrack);
    this.buildInitialTrack();
    this.initTrafficPool();
    this.initPickupPool();
  }

  private initMaterials() {
    this.roadMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });
    this.curbMatRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.6,
    });
    this.curbMatWhite = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
    });
    this.stripeMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });
    this.terrainMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });
  }

  public setTrack(trackId: TrackId) {
    this.currentTrack = trackId;
    this.applyTrackTheme(trackId);
    this.rebuildTrack();
  }

  private applyTrackTheme(trackId: TrackId) {
    if (trackId === 'neon-circuit') {
      this.currentBiome = 'neon';
      this.terrainMat.color.setHex(0x09090b); // obsidian floor
      this.roadMat.color.setHex(0x0f172a); // dark midnight tarmac
      this.stripeMat.color.setHex(0x06b6d4); // glowing cyan road stripes
      this.curbMatRed.color.setHex(0xf43f5e); // neon pink curbs
      this.curbMatWhite.color.setHex(0x38bdf8); // neon cyan curbs
    } else if (trackId === 'canyon-ridge') {
      this.currentBiome = 'desert';
      this.terrainMat.color.setHex(0xb45309); // warm terracotta canyon floor
      this.roadMat.color.setHex(0x292524); // mountain asphalt
      this.stripeMat.color.setHex(0xfef08a); // yellow road line
      this.curbMatRed.color.setHex(0xd97706);
      this.curbMatWhite.color.setHex(0xfafaf9);
    } else {
      // Sunset Coastal
      this.currentBiome = 'sunset';
      this.terrainMat.color.setHex(0x15803d); // lush coastal foliage
      this.roadMat.color.setHex(0x18181b); // dark asphalt
      this.stripeMat.color.setHex(0xfacc15); // classic yellow dashed stripes
      this.curbMatRed.color.setHex(0xef4444);
      this.curbMatWhite.color.setHex(0xf8fafc);
    }
  }

  public setBiome(biome: BiomeType) {
    this.currentBiome = biome;
    if (biome === 'desert') {
      this.terrainMat.color.setHex(0xd97706);
      this.roadMat.color.setHex(0x27272a);
    } else if (biome === 'neon') {
      this.terrainMat.color.setHex(0x09090b);
      this.roadMat.color.setHex(0x0f172a);
      this.stripeMat.color.setHex(0x06b6d4);
    } else if (biome === 'alpine') {
      this.terrainMat.color.setHex(0x334155);
      this.roadMat.color.setHex(0x18181b);
      this.stripeMat.color.setHex(0xf8fafc);
    } else {
      this.terrainMat.color.setHex(0x15803d);
      this.roadMat.color.setHex(0x18181b);
      this.stripeMat.color.setHex(0xfacc15);
    }
  }

  /**
   * Layout Profile Curvature:
   * - sunset-coastal: Long straightaways (280m flat) followed by gentle ocean curves
   * - neon-circuit: High speed straight leading into sharp rhythmic S-curve chicanes
   * - canyon-ridge: Continuous winding mountain slalom switchbacks & elevation
   */
  public getCurvatureAt(z: number): number {
    if (this.currentTrack === 'sunset-coastal') {
      // Long straightaways + gentle sweeping ocean curves
      const cycle = 540;
      const mod = ((z % cycle) + cycle) % cycle;
      if (mod < 260) {
        return 0; // Pure straightaway for top speed
      } else {
        const t = (mod - 260) / 280;
        return Math.sin(t * Math.PI * 2) * 11;
      }
    } else if (this.currentTrack === 'neon-circuit') {
      // Fast straight followed by sharp technical S-turn chicanes
      const cycle = 460;
      const mod = ((z % cycle) + cycle) % cycle;
      if (mod < 180) {
        return 0; // High speed sprint
      } else {
        // Sharp S-chicane: 2 complete oscillations
        const t = (mod - 180) / 280;
        return Math.sin(t * Math.PI * 4) * 9.5;
      }
    } else {
      // canyon-ridge: mountain canyon slalom switchbacks
      return Math.sin(z * 0.012) * 11 + Math.cos(z * 0.005) * 5;
    }
  }

  private buildChunk(zStart: number, index: number): THREE.Group {
    const chunk = new THREE.Group();
    chunk.position.z = zStart;

    const curveOffset = this.getCurvatureAt(zStart);
    chunk.position.x = curveOffset;

    // 1. Asphalt Road plane
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // 2. Curbs (Left & Right alternating red/white blocks)
    const curbGeo = new THREE.BoxGeometry(0.6, 0.14, CHUNK_LENGTH / 8);
    for (let c = 0; c < 8; c++) {
      const zSub = -CHUNK_LENGTH / 2 + (c + 0.5) * (CHUNK_LENGTH / 8);
      const curbMat = c % 2 === 0 ? this.curbMatRed : this.curbMatWhite;
      
      const curbL = new THREE.Mesh(curbGeo, curbMat);
      curbL.position.set(-ROAD_WIDTH / 2 - 0.3, 0.07, zSub);
      const curbR = new THREE.Mesh(curbGeo, curbMat);
      curbR.position.set(ROAD_WIDTH / 2 + 0.3, 0.07, zSub);
      chunk.add(curbL, curbR);
    }

    // 3. Center dashed lane markings
    const laneDivGeo = new THREE.BoxGeometry(0.2, 0.01, 2.5);
    for (let d = 0; d < 5; d++) {
      const zDash = -CHUNK_LENGTH / 2 + (d + 0.5) * (CHUNK_LENGTH / 5);
      const dashL = new THREE.Mesh(laneDivGeo, this.stripeMat);
      dashL.position.set(-2.0, 0.015, zDash);
      const dashR = new THREE.Mesh(laneDivGeo, this.stripeMat);
      dashR.position.set(2.0, 0.015, zDash);
      chunk.add(dashL, dashR);
    }

    // 4. Ground terrain flanking the road
    const terrainGeo = new THREE.PlaneGeometry(120, CHUNK_LENGTH);
    terrainGeo.rotateX(-Math.PI / 2);
    const terrainL = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrainL.position.set(-ROAD_WIDTH / 2 - 60, -0.05, 0);
    terrainL.receiveShadow = true;
    const terrainR = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrainR.position.set(ROAD_WIDTH / 2 + 60, -0.05, 0);
    terrainR.receiveShadow = true;
    chunk.add(terrainL, terrainR);

    // 5. Distinct Roadside Props based on Track Layout:
    if (this.currentTrack === 'neon-circuit') {
      // Neon Megacity: glowing cyber arches every 4 chunks
      if (index % 4 === 0) {
        const gate = createCyberGate();
        gate.position.set(0, 0, 0);
        chunk.add(gate);
      }
    } else if (this.currentTrack === 'canyon-ridge') {
      // Canyon Ridge: Terracotta pillars and desert cacti
      if (index % 2 === 0) {
        const pillarL = createCanyonPillar();
        pillarL.position.set(-ROAD_WIDTH / 2 - 6 - Math.random() * 4, 0, (Math.random() - 0.5) * 15);
        const sL = 0.9 + Math.random() * 0.4;
        pillarL.scale.set(sL, sL, sL);
        chunk.add(pillarL);

        const cactusR = createCactus();
        cactusR.position.set(ROAD_WIDTH / 2 + 5 + Math.random() * 3, 0, (Math.random() - 0.5) * 15);
        chunk.add(cactusR);
      }
    } else {
      // Sunset Coastal: Low-poly palm trees
      if (index % 2 === 0) {
        const treeL = createPalmTree();
        treeL.position.set(-ROAD_WIDTH / 2 - 4.5 - Math.random() * 6, 0, (Math.random() - 0.5) * 15);
        const scale = 0.8 + Math.random() * 0.4;
        treeL.scale.set(scale, scale, scale);
        chunk.add(treeL);

        const treeR = createPalmTree();
        treeR.position.set(ROAD_WIDTH / 2 + 4.5 + Math.random() * 6, 0, (Math.random() - 0.5) * 15);
        treeR.scale.set(scale, scale, scale);
        chunk.add(treeR);
      }
    }

    return chunk;
  }

  private buildInitialTrack() {
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const z = i * CHUNK_LENGTH - 40;
      const chunk = this.buildChunk(z, i);
      this.roadChunks.push(chunk);
      this.scene.add(chunk);
    }
    this.chunkIndex = TOTAL_CHUNKS;
  }

  public rebuildTrack() {
    // Remove existing chunks
    for (const chunk of this.roadChunks) {
      this.scene.remove(chunk);
    }
    this.roadChunks = [];
    this.buildInitialTrack();
    this.reset();
  }

  // Pool of traffic vehicles
  private initTrafficPool() {
    const types: Array<'sedan' | 'suv' | 'sports' | 'semi' | 'cop'> = ['sedan', 'suv', 'sports', 'semi', 'cop'];
    const colors = ['#dc2626', '#2563eb', '#ca8a04', '#16a34a', '#9333ea', '#e11d48'];

    for (let i = 0; i < 18; i++) {
      const type = types[i % types.length];
      const color = colors[i % colors.length];
      const mesh = createTrafficVehicle(type, color);
      mesh.position.set(0, -50, 0);
      mesh.visible = false;
      this.scene.add(mesh);

      this.traffic.push({
        id: i,
        type,
        x: 0,
        z: -100,
        speed: 18 + Math.random() * 8, // ~65 - 95 km/h
        lane: 0,
        color,
        active: false,
        meshGroup: mesh,
        width: type === 'semi' ? 2.6 : 2.0,
        length: type === 'semi' ? 7.2 : 4.4,
      });
    }
  }

  // Pool of coins, nitro tanks, and jump ramps
  private initPickupPool() {
    // 30 Coins
    for (let i = 0; i < 30; i++) {
      const coinMesh = createGoldCoin();
      coinMesh.position.set(0, -50, 0);
      this.scene.add(coinMesh);
      this.pickups.push({
        id: i,
        type: 'coin',
        x: 0,
        z: -100,
        active: false,
        meshGroup: coinMesh,
        rotation: 0,
      });
    }

    // 8 Nitro canisters
    for (let i = 0; i < 8; i++) {
      const nitroMesh = createNitroCanister();
      nitroMesh.position.set(0, -50, 0);
      this.scene.add(nitroMesh);
      this.pickups.push({
        id: 30 + i,
        type: 'nitro',
        x: 0,
        z: -100,
        active: false,
        meshGroup: nitroMesh,
        rotation: 0,
      });
    }

    // 6 Jump Ramps (for big air and chicane hops!)
    for (let i = 0; i < 6; i++) {
      const rampMesh = createJumpRamp();
      rampMesh.position.set(0, -50, 0);
      this.scene.add(rampMesh);
      this.pickups.push({
        id: 38 + i,
        type: 'ramp',
        x: 0,
        z: -100,
        active: false,
        meshGroup: rampMesh,
        rotation: 0,
      });
    }
  }

  public spawnCheckpointAt(z: number) {
    const arch = createCheckpointArchway();
    arch.position.set(this.getCurvatureAt(z), 0, z);
    this.scene.add(arch);
    this.checkpoints.push(arch);
  }

  public update(playerZ: number, dt: number) {
    // 1. Recycle road chunks that fall behind player
    for (const chunk of this.roadChunks) {
      if (chunk.position.z < playerZ - CHUNK_LENGTH * 2.5) {
        // Move to front
        const furthestZ = Math.max(...this.roadChunks.map((c) => c.position.z));
        const newZ = furthestZ + CHUNK_LENGTH;
        chunk.position.z = newZ;
        chunk.position.x = this.getCurvatureAt(newZ);
        this.chunkIndex++;

        // Spawn traffic or items ahead
        this.maybeSpawnEntitiesAhead(newZ);

        // Checkpoint spawn every 700m
        if (newZ >= this.nextCheckpointDistance) {
          this.spawnCheckpointAt(newZ);
          this.nextCheckpointDistance += 700;
        }
      }
    }

    // 2. Update traffic movement & cop lights
    for (const car of this.traffic) {
      if (car.active) {
        car.z += car.speed * dt;
        car.x = this.getCurvatureAt(car.z) + LANES[car.lane];
        car.meshGroup.position.set(car.x, 0, car.z);

        const nextCurve = this.getCurvatureAt(car.z + 5) + LANES[car.lane];
        const angle = Math.atan2(nextCurve - car.x, 5);
        car.meshGroup.rotation.y = angle;

        if (car.type === 'cop' && (car.meshGroup as any).userData?.redLight) {
          const flash = Math.sin(Date.now() * 0.015) > 0;
          (car.meshGroup as any).userData.redLight.visible = flash;
          (car.meshGroup as any).userData.blueLight.visible = !flash;
        }

        if (car.z < playerZ - 30 || car.z > playerZ + 550) {
          car.active = false;
          car.meshGroup.visible = false;
          car.meshGroup.position.set(0, -50, 0);
        }
      }
    }

    // 3. Update pickups
    for (const item of this.pickups) {
      if (item.active) {
        item.rotation += dt * 3.5;
        item.meshGroup.rotation.y = item.rotation;

        if (item.type === 'coin') {
          item.meshGroup.position.y = 1.0 + Math.sin(item.rotation * 1.5) * 0.2;
        }

        if (item.z < playerZ - 20) {
          item.active = false;
          item.meshGroup.visible = false;
          item.meshGroup.position.set(0, -50, 0);
        }
      }
    }

    // 4. Clean up old checkpoints
    for (let i = this.checkpoints.length - 1; i >= 0; i--) {
      const cp = this.checkpoints[i];
      if (cp.position.z < playerZ - 50) {
        this.scene.remove(cp);
        this.checkpoints.splice(i, 1);
      }
    }
  }

  private maybeSpawnEntitiesAhead(z: number) {
    if (Math.random() < 0.45) {
      const availableCar = this.traffic.find((c) => !c.active);
      if (availableCar) {
        availableCar.active = true;
        availableCar.z = z + Math.random() * 20;
        availableCar.lane = Math.floor(Math.random() * 3);
        availableCar.x = this.getCurvatureAt(availableCar.z) + LANES[availableCar.lane];
        availableCar.meshGroup.visible = true;
        availableCar.meshGroup.position.set(availableCar.x, 0, availableCar.z);
      }
    }

    const roll = Math.random();
    if (roll < 0.35) {
      const lane = Math.floor(Math.random() * 3);
      for (let i = 0; i < 3; i++) {
        const coin = this.pickups.find((p) => p.type === 'coin' && !p.active);
        if (coin) {
          coin.active = true;
          coin.z = z + i * 5;
          coin.x = this.getCurvatureAt(coin.z) + LANES[lane];
          coin.meshGroup.visible = true;
          coin.meshGroup.position.set(coin.x, 1.0, coin.z);
        }
      }
    } else if (roll < 0.52) {
      const nitro = this.pickups.find((p) => p.type === 'nitro' && !p.active);
      if (nitro) {
        const lane = Math.floor(Math.random() * 3);
        nitro.active = true;
        nitro.z = z + 10;
        nitro.x = this.getCurvatureAt(nitro.z) + LANES[lane];
        nitro.meshGroup.visible = true;
        nitro.meshGroup.position.set(nitro.x, 1.1, nitro.z);
      }
    } else if (roll < (this.currentTrack === 'canyon-ridge' ? 0.75 : 0.62)) {
      // More jump ramps in Canyon Ridge!
      const ramp = this.pickups.find((p) => p.type === 'ramp' && !p.active);
      if (ramp) {
        const lane = Math.floor(Math.random() * 3);
        ramp.active = true;
        ramp.z = z + 15;
        ramp.x = this.getCurvatureAt(ramp.z) + LANES[lane];
        ramp.meshGroup.visible = true;
        ramp.meshGroup.position.set(ramp.x, 0, ramp.z);
      }
    }
  }

  public reset() {
    this.nextCheckpointDistance = 700;
    for (let i = 0; i < this.roadChunks.length; i++) {
      const z = i * CHUNK_LENGTH - 40;
      this.roadChunks[i].position.z = z;
      this.roadChunks[i].position.x = this.getCurvatureAt(z);
    }
    for (const car of this.traffic) {
      car.active = false;
      car.meshGroup.visible = false;
      car.meshGroup.position.set(0, -50, 0);
    }
    for (const item of this.pickups) {
      item.active = false;
      item.meshGroup.visible = false;
      item.meshGroup.position.set(0, -50, 0);
    }
    for (const cp of this.checkpoints) {
      this.scene.remove(cp);
    }
    this.checkpoints = [];
  }

  public dispose() {
    for (const chunk of this.roadChunks) {
      this.scene.remove(chunk);
    }
    this.roadChunks = [];
  }
}
