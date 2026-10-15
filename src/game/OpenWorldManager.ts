import * as THREE from 'three';
import { DiscoveryItem, WorldZone } from '../types/game';
import { soundManager } from '../audio/soundManager';

const _dummy = new THREE.Object3D();

export class OpenWorldManager {
  public scene: THREE.Scene;
  public rootGroup: THREE.Group;
  public discoveries: DiscoveryItem[] = [];
  public currentZone: WorldZone = 'city';

  // Instanced Meshes for high performance (under 15 draw calls for whole map!)
  private buildingsMesh!: THREE.InstancedMesh;
  private palmTreesMesh!: THREE.InstancedMesh;
  private rocksMesh!: THREE.InstancedMesh;
  private streetLampsMesh!: THREE.InstancedMesh;

  // Collision bounding boxes (buildings & obstacles)
  public colliders: THREE.Box3[] = [];

  // Trophies collected count
  public trophiesCollected = 0;
  public totalTrophies = 10;

  // Callbacks
  public onZoneChange?: (zone: WorldZone, zoneName: string) => void;
  public onDiscovery?: (item: DiscoveryItem) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'open-world';
    this.scene.add(this.rootGroup);

    this.buildTerrain();
    this.buildRoadNetwork();
    this.buildCity();
    this.buildBeach();
    this.buildMountains();
    this.initDiscoveries();
  }

  // 1. Unified Continuous Open World Terrain
  private buildTerrain() {
    // 1200m x 1200m world terrain base
    const terrainGeo = new THREE.PlaneGeometry(1200, 1200, 24, 24);
    terrainGeo.rotateX(-Math.PI / 2);

    // Vertex color painting: Green valleys, golden sand beaches, dark obsidian city, red canyon stone
    const count = terrainGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const pos = terrainGeo.attributes.position;

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      if (z > 160) {
        // South: Golden Beach & Ocean
        colors[i * 3] = 0.94; // r
        colors[i * 3 + 1] = 0.82; // g
        colors[i * 3 + 2] = 0.55; // b
      } else if (x > 80 && z < -40) {
        // North-East: Mountain Canyon terracotta
        colors[i * 3] = 0.76;
        colors[i * 3 + 1] = 0.38;
        colors[i * 3 + 2] = 0.16;
      } else if (x < -60) {
        // West: City dark asphalt/concrete
        colors[i * 3] = 0.14;
        colors[i * 3 + 1] = 0.16;
        colors[i * 3 + 2] = 0.2;
      } else {
        // Central lush grassland & hills
        colors[i * 3] = 0.12;
        colors[i * 3 + 1] = 0.42;
        colors[i * 3 + 2] = 0.18;
      }
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.position.y = -0.1;
    terrain.receiveShadow = true;
    this.rootGroup.add(terrain);

    // Ocean Water plane on the South edge (Z > 360)
    const oceanGeo = new THREE.PlaneGeometry(1200, 500);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // vibrant tropical azure
      roughness: 0.2,
      metalness: 0.7,
      transparent: true,
      opacity: 0.88,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.set(0, -0.05, 550);
    this.rootGroup.add(ocean);
  }

  // 2. Open World Road Network connecting City, Beach, and Mountains
  private buildRoadNetwork() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const createRoadSegment = (x: number, z: number, w: number, l: number, rotY = 0) => {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l).rotateX(-Math.PI / 2), roadMat);
      r.position.set(x, 0.01, z);
      r.rotation.y = rotY;
      r.receiveShadow = true;
      this.rootGroup.add(r);

      // Dashed yellow line down the middle
      const lineLen = Math.max(w, l);
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, lineLen).rotateX(-Math.PI / 2), stripeMat);
      line.position.set(x, 0.02, z);
      line.rotation.y = rotY;
      this.rootGroup.add(line);
    };

    // Main Connecting Ring Highway:
    // Avenues:
    createRoadSegment(0, 0, 16, 600); // Main North-South Central Spine
    createRoadSegment(0, 0, 700, 16); // Main East-West Continental Highway

    // City Grid Roads (West side)
    createRoadSegment(-180, 0, 14, 450); // West Avenue
    createRoadSegment(-320, 0, 14, 400); // Oceanfront Blvd
    createRoadSegment(-200, 120, 360, 14); // Downtown Cross St 1
    createRoadSegment(-200, -120, 360, 14); // Downtown Cross St 2

    // Beach Coastal Highway (South side)
    createRoadSegment(0, 260, 800, 16); // Sunken Beach Coast Highway
    createRoadSegment(0, 340, 500, 12); // Boardwalk Shore Run

    // Mountain Canyon Road (North-East winding ascent)
    createRoadSegment(220, -180, 14, 420, 0.35); // Canyon Pass Road
    createRoadSegment(320, -300, 14, 350, -0.4); // Summit Ascent Road
    createRoadSegment(180, -360, 300, 14); // High Alpine Lookout Highway
  }

  // 3. Downtown City: Low-poly Skyscrapers using 1 InstancedMesh (Lightning 60fps)
  private buildCity() {
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
      flatShading: true,
    });

    const numBuildings = 48;
    this.buildingsMesh = new THREE.InstancedMesh(buildingGeo, buildingMat, numBuildings);
    this.buildingsMesh.castShadow = true;
    this.buildingsMesh.receiveShadow = true;

    let bIdx = 0;
    // Generate city blocks between X: -380 to -80, Z: -220 to 220
    const blockX = [-340, -280, -220, -140, -80];
    const blockZ = [-180, -90, 0, 90, 180];

    const colors = [0x0f172a, 0x1e293b, 0x334155, 0x0284c7, 0x6366f1, 0x0f766e];

    for (const bx of blockX) {
      for (const bz of blockZ) {
        if (bIdx >= numBuildings) break;

        const w = 24 + (bIdx % 3) * 6;
        const d = 24 + ((bIdx + 1) % 3) * 6;
        const h = 35 + ((bIdx * 17) % 65); // height 35m to 100m

        const posX = bx + (Math.sin(bIdx) * 10);
        const posZ = bz + (Math.cos(bIdx) * 10);

        _dummy.position.set(posX, h / 2, posZ);
        _dummy.scale.set(w, h, d);
        _dummy.updateMatrix();

        this.buildingsMesh.setMatrixAt(bIdx, _dummy.matrix);
        this.buildingsMesh.setColorAt(bIdx, new THREE.Color(colors[bIdx % colors.length]));

        // Add bounding box collider
        this.colliders.push(
          new THREE.Box3(
            new THREE.Vector3(posX - w / 2, 0, posZ - d / 2),
            new THREE.Vector3(posX + w / 2, h, posZ + d / 2)
          )
        );

        bIdx++;
      }
    }

    this.buildingsMesh.instanceMatrix.needsUpdate = true;
    if (this.buildingsMesh.instanceColor) this.buildingsMesh.instanceColor.needsUpdate = true;
    this.rootGroup.add(this.buildingsMesh);

    // Downtown Circular Drift Plaza Centerpiece (Roundabout with glowing neon monolith)
    const plazaGeo = new THREE.CylinderGeometry(28, 28, 0.4, 24);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(-200, 0.2, 0);
    this.rootGroup.add(plaza);

    // Neon center spire
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 2.5, 30, 6),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 2.2,
      })
    );
    spire.position.set(-200, 15, 0);
    this.rootGroup.add(spire);
  }

  // 4. Sunny Beach & Coastline: Palm trees, pier jump ramp, dunes
  private buildBeach() {
    // Stunt Pier Jump Ramp into ocean breeze
    const pierMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // wooden deck
      roughness: 0.8,
      flatShading: true,
    });
    const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 90), pierMat);
    pierDeck.position.set(0, 3, 400);
    this.rootGroup.add(pierDeck);

    // Wooden pilings
    const pileGeo = new THREE.CylinderGeometry(0.6, 0.6, 8, 6);
    for (let p = 0; p < 6; p++) {
      const pL = new THREE.Mesh(pileGeo, pierMat);
      pL.position.set(-7, 0, 365 + p * 14);
      const pR = new THREE.Mesh(pileGeo, pierMat);
      pR.position.set(7, 0, 365 + p * 14);
      this.rootGroup.add(pL, pR);
    }

    // Pier Launch Ramp at end
    const pierRamp = new THREE.Mesh(
      new THREE.BoxGeometry(16, 2.5, 12).rotateX(-0.3),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.2,
      })
    );
    pierRamp.position.set(0, 4.2, 442);
    this.rootGroup.add(pierRamp);

    // Palm Trees along coastal highway (Instanced)
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 5.5, 6);
    const leafGeo = new THREE.ConeGeometry(1.4, 3.2, 5);
    const palmMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true });

    const numPalms = 35;
    this.palmTreesMesh = new THREE.InstancedMesh(leafGeo, palmMat, numPalms);
    for (let i = 0; i < numPalms; i++) {
      const px = -350 + i * 22;
      const pz = 240 + Math.sin(i * 1.5) * 45;
      _dummy.position.set(px, 5.5, pz);
      _dummy.scale.set(1.5, 1.5, 1.5);
      _dummy.updateMatrix();
      this.palmTreesMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.palmTreesMesh.instanceMatrix.needsUpdate = true;
    this.rootGroup.add(this.palmTreesMesh);
  }

  // 5. Canyon Mountains & Summit Lookout: Terracotta rock pillars, mountain arches
  private buildMountains() {
    const rockGeo = new THREE.CylinderGeometry(4, 9, 28, 6);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // warm terracotta mountain rock
      roughness: 0.95,
      flatShading: true,
    });

    const numRocks = 32;
    this.rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, numRocks);
    this.rocksMesh.castShadow = true;
    this.rocksMesh.receiveShadow = true;

    for (let i = 0; i < numRocks; i++) {
      const rx = 140 + (i % 6) * 55 + (Math.sin(i * 3) * 20);
      const rz = -420 + Math.floor(i / 6) * 60 + (Math.cos(i * 2) * 20);
      const scaleY = 0.8 + ((i * 7) % 15) * 0.15;
      const scaleXZ = 1.2 + ((i * 5) % 10) * 0.12;

      _dummy.position.set(rx, 14 * scaleY, rz);
      _dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      _dummy.rotation.y = i * 0.7;
      _dummy.updateMatrix();
      this.rocksMesh.setMatrixAt(i, _dummy.matrix);

      // Add mountain collision box
      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(rx - 8 * scaleXZ, 0, rz - 8 * scaleXZ),
          new THREE.Vector3(rx + 8 * scaleXZ, 35, rz + 8 * scaleXZ)
        )
      );
    }
    this.rocksMesh.instanceMatrix.needsUpdate = true;
    this.rootGroup.add(this.rocksMesh);

    // Eagle Peak Summit Ramp (overlooking the entire city and ocean!)
    const summitRamp = new THREE.Mesh(
      new THREE.BoxGeometry(22, 5, 20).rotateX(-0.35),
      new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: 0xc2410c,
        emissiveIntensity: 1.5,
      })
    );
    summitRamp.position.set(280, 10, -420);
    this.rootGroup.add(summitRamp);
  }

  // 6. Interactive Stunt Spots, Speed Traps & Collectibles
  private initDiscoveries() {
    this.discoveries = [
      // Stunt Ramps
      {
        id: 'stunt-pier',
        name: 'Ocean Pier Stunt Leap',
        type: 'stunt',
        x: 0,
        z: 440,
        completed: false,
        score: 1500,
      },
      {
        id: 'stunt-summit',
        name: 'Eagle Peak Summit Launch',
        type: 'stunt',
        x: 280,
        z: -420,
        completed: false,
        score: 2500,
      },
      {
        id: 'stunt-downtown',
        name: 'Downtown Plaza Drift Pad',
        type: 'stunt',
        x: -200,
        z: 0,
        completed: false,
        score: 1200,
      },

      // Speed Traps (Trigger when passed at >160 km/h)
      {
        id: 'speed-highway',
        name: 'Central Expressway Radar',
        type: 'speedtrap',
        x: 0,
        z: 0,
        completed: false,
        score: 800,
      },
      {
        id: 'speed-beach',
        name: 'Coastal Boulevard Sprint',
        type: 'speedtrap',
        x: 0,
        z: 260,
        completed: false,
        score: 900,
      },
      {
        id: 'speed-canyon',
        name: 'Canyon Pass Speed Gate',
        type: 'speedtrap',
        x: 220,
        z: -180,
        completed: false,
        score: 1100,
      },

      // Hidden Golden Trophies
      { id: 'trophy-1', name: 'Downtown Rooftop Trophy', type: 'trophy', x: -280, z: -90, completed: false, score: 500 },
      { id: 'trophy-2', name: 'Alleyway Secret Trophy', type: 'trophy', x: -140, z: 90, completed: false, score: 500 },
      { id: 'trophy-3', name: 'Beach Dunes Trophy', type: 'trophy', x: -220, z: 290, completed: false, score: 500 },
      { id: 'trophy-4', name: 'Pier Shoreline Trophy', type: 'trophy', x: 180, z: 310, completed: false, score: 500 },
      { id: 'trophy-5', name: 'Canyon Gorge Trophy', type: 'trophy', x: 160, z: -240, completed: false, score: 500 },
      { id: 'trophy-6', name: 'Summit Vista Trophy', type: 'trophy', x: 340, z: -380, completed: false, score: 500 },
      { id: 'trophy-7', name: 'Crossroad Highway Trophy', type: 'trophy', x: 0, z: 120, completed: false, score: 500 },
      { id: 'trophy-8', name: 'High Alpine Overlook Trophy', type: 'trophy', x: 80, z: -320, completed: false, score: 500 },
      { id: 'trophy-9', name: 'Plaza Fountain Trophy', type: 'trophy', x: -200, z: 25, completed: false, score: 500 },
      { id: 'trophy-10', name: 'Boardwalk End Trophy', type: 'trophy', x: 260, z: 260, completed: false, score: 500 },
    ];

    // Spawn 3D meshes for trophies
    const trophyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    const trophyGeo = new THREE.OctahedronGeometry(1.2, 0);

    for (const d of this.discoveries) {
      if (d.type === 'trophy') {
        const mesh = new THREE.Mesh(trophyGeo, trophyMat);
        mesh.position.set(d.x, 1.8, d.z);
        this.rootGroup.add(mesh);
        d.meshGroup = mesh;
      }
    }
  }

  // Update loop for Open World: zones, spin trophies, check triggers
  public update(playerX: number, playerZ: number, playerSpeedKmH: number, dt: number) {
    // 1. Zone detection
    let newZone: WorldZone = 'city';
    let zoneTitle = 'Downtown Metropolis';

    if (playerZ > 170) {
      newZone = 'beach';
      zoneTitle = 'Sunset Golden Beach';
    } else if (playerX > 70 && playerZ < -40) {
      newZone = 'mountains';
      zoneTitle = 'Canyon Mountains & Summit';
    } else {
      newZone = 'city';
      zoneTitle = 'Downtown Metropolis';
    }

    if (newZone !== this.currentZone) {
      this.currentZone = newZone;
      this.onZoneChange?.(newZone, zoneTitle);
    }

    // 2. Rotate trophy meshes & check collection
    for (const d of this.discoveries) {
      if (d.type === 'trophy' && d.meshGroup && !d.completed) {
        d.meshGroup.rotation.y += dt * 3.0;
        d.meshGroup.rotation.z += dt * 1.5;

        // Check pickup distance
        const dx = playerX - d.x;
        const dz = playerZ - d.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < 16) {
          // Collected!
          d.completed = true;
          d.meshGroup.visible = false;
          this.trophiesCollected++;
          soundManager.playCoin();
          this.onDiscovery?.(d);
        }
      } else if (d.type === 'speedtrap' && !d.completed) {
        const dx = playerX - d.x;
        const dz = playerZ - d.z;
        if (Math.abs(dx) < 14 && Math.abs(dz) < 14 && playerSpeedKmH > 155) {
          d.completed = true;
          soundManager.playCheckpoint();
          this.onDiscovery?.({
            ...d,
            name: `${d.name} (${Math.round(playerSpeedKmH)} KM/H!)`,
          });
          // Reset speedtrap after 12 seconds so player can trigger again
          setTimeout(() => {
            d.completed = false;
          }, 12000);
        }
      } else if (d.type === 'stunt' && !d.completed) {
        const dx = playerX - d.x;
        const dz = playerZ - d.z;
        if (Math.abs(dx) < 16 && Math.abs(dz) < 16 && playerSpeedKmH > 110) {
          d.completed = true;
          soundManager.playJump();
          this.onDiscovery?.(d);
          setTimeout(() => {
            d.completed = false;
          }, 15000);
        }
      }
    }
  }

  // Fast AABB Collision check against buildings & mountain pillars
  public checkBuildingCollision(px: number, pz: number, radius = 1.8): { hit: boolean; normalX: number; normalZ: number } {
    for (const box of this.colliders) {
      if (
        px + radius > box.min.x &&
        px - radius < box.max.x &&
        pz + radius > box.min.z &&
        pz - radius < box.max.z
      ) {
        // Calculate collision normal pushout
        const cx = (box.min.x + box.max.x) / 2;
        const cz = (box.min.z + box.max.z) / 2;
        const nx = px - cx;
        const nz = pz - cz;
        const len = Math.hypot(nx, nz) || 1;
        return { hit: true, normalX: nx / len, normalZ: nz / len };
      }
    }
    return { hit: false, normalX: 0, normalZ: 0 };
  }

  public setVisible(visible: boolean) {
    this.rootGroup.visible = visible;
  }

  public dispose() {
    this.scene.remove(this.rootGroup);
    this.colliders = [];
    this.discoveries = [];
  }
}
