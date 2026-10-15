import * as THREE from 'three';
import { CarStats, PlayerInput, FloatingText } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { ParticleSystem } from './particleSystem';
import { TrackManager } from './trackManager';
import { OpenWorldManager } from './OpenWorldManager';

export class CarController {
  public mesh: THREE.Group;
  public stats: CarStats;
  private particleSystem: ParticleSystem;
  private trackManager: TrackManager;
  public openWorldManager?: OpenWorldManager;
  public isOpenWorld = false;
  public headingAngle = 0; // 360 degree free-roam heading in radians

  // Car kinematics state
  public x = 0;
  public y = 0;
  public z = 0;
  public speed = 0; // m/s
  public maxSpeed = 55; // ~200 km/h
  public steerAngle = 0;
  public driftAngle = 0;
  public isDrifting = false;
  public isAirborne = false;
  public vy = 0; // vertical velocity
  public pitch = 0;
  public roll = 0;

  // Nitro
  public nitroAmount = 100; // 0 - 100
  public isNitroActive = false;

  // Drift combo tracking
  public currentDriftScore = 0;

  // Near miss tracking set
  private passedCars = new Set<number>();

  // Hitstop & Invulnerability
  public invulnerableTimer = 0;
  public isShielded = false;

  // Callback hooks
  public onFloatingText?: (text: FloatingText) => void;
  public onCrash?: () => void;
  public onCheckpointPassed?: () => void;

  constructor(
    mesh: THREE.Group,
    stats: CarStats,
    particleSystem: ParticleSystem,
    trackManager: TrackManager
  ) {
    this.mesh = mesh;
    this.stats = stats;
    this.particleSystem = particleSystem;
    this.trackManager = trackManager;
    this.maxSpeed = 38 + stats.topSpeed * 0.35; // scales with car top speed
  }

  public setCar(mesh: THREE.Group, stats: CarStats) {
    this.mesh = mesh;
    this.stats = stats;
    this.maxSpeed = 38 + stats.topSpeed * 0.35;
  }

  public update(input: PlayerInput, dt: number) {
    // Clamp delta
    const clampedDt = Math.min(dt, 0.05);

    // Update invulnerability
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= clampedDt;
      this.mesh.visible = Math.floor(Date.now() / 80) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // 1. Throttle & Acceleration
    const accelRate = 22 * (0.8 + this.stats.acceleration * 0.4);
    const brakeRate = 35;
    const drag = 6.5;

    // Nitro logic
    this.isNitroActive = input.nitro && this.nitroAmount > 0 && this.speed > 5;
    if (this.isNitroActive) {
      this.nitroAmount = Math.max(0, this.nitroAmount - 32 * clampedDt);
      this.speed += accelRate * 1.6 * clampedDt;
    } else {
      // Passive nitro refill during high speed driving
      if (this.nitroAmount < 100) {
        this.nitroAmount = Math.min(100, this.nitroAmount + 4 * this.stats.nitroRecharge * clampedDt);
      }
    }

    if (input.forward) {
      const topSpeedCurrent = this.isNitroActive ? this.maxSpeed * 1.35 : this.maxSpeed;
      if (this.speed < topSpeedCurrent) {
        this.speed += accelRate * clampedDt;
      }
    } else if (input.backward) {
      if (this.speed > 0) {
        this.speed -= brakeRate * clampedDt;
      } else {
        this.speed = Math.max(-12, this.speed - 12 * clampedDt); // reverse
      }
    } else {
      // Coasting drag
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - drag * clampedDt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + drag * clampedDt);
      }
    }

    // 2. Steering & Drifting
    const speedFactor = Math.min(1.0, Math.abs(this.speed) / 15);
    const steerSensitivity = 1.6 * (0.8 + this.stats.handling * 0.4);

    let steerTarget = 0;
    if (input.left) steerTarget += 1;
    if (input.right) steerTarget -= 1;

    // Handbrake drift state
    const wantsDrift = input.drift && Math.abs(this.speed) > 18 && (input.left || input.right);
    this.isDrifting = wantsDrift && !this.isAirborne;

    soundManager.setDrifting(this.isDrifting);
    soundManager.setNitroAudio(this.isNitroActive);
    soundManager.updateEngine(
      Math.abs(this.speed) / this.maxSpeed,
      input.forward,
      this.isNitroActive
    );

    if (this.isDrifting) {
      // Accumulate drift score & nitro bonus
      const driftInc = Math.floor(Math.abs(this.speed) * 12 * clampedDt);
      this.currentDriftScore += driftInc;
      this.nitroAmount = Math.min(100, this.nitroAmount + 18 * clampedDt);

      const targetDriftAngle = steerTarget * 0.45;
      this.driftAngle = THREE.MathUtils.damp(this.driftAngle, targetDriftAngle, 12, clampedDt);

      // Emit tire smoke particles from rear wheels
      this.particleSystem.emitTireSmoke(this.x - 0.8, this.y, this.z - 1.2);
      this.particleSystem.emitTireSmoke(this.x + 0.8, this.y, this.z - 1.2);
    } else {
      if (this.currentDriftScore > 200) {
        this.onFloatingText?.({
          id: Date.now(),
          text: `DRIFT +${this.currentDriftScore}`,
          type: 'drift',
          score: this.currentDriftScore,
          timestamp: Date.now(),
        });
      }
      this.currentDriftScore = 0;
      this.driftAngle = THREE.MathUtils.damp(this.driftAngle, 0, 10, clampedDt);
    }

    // Steer angle interpolation
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, steerTarget * 0.32, 14, clampedDt);

    if (this.isOpenWorld) {
      // 360-DEGREE OPEN WORLD FREE-ROAM DRIVING
      const turnDir = this.speed >= 0 ? 1 : -1;
      const turnRate = steerTarget * steerSensitivity * turnDir * clampedDt * 2.2;
      this.headingAngle += turnRate;

      // Planar velocity
      const vx = Math.sin(this.headingAngle) * this.speed;
      const vz = Math.cos(this.headingAngle) * this.speed;
      this.x += vx * clampedDt;
      this.z += vz * clampedDt;

      // Building & Mountain collision in open world
      if (this.openWorldManager) {
        const col = this.openWorldManager.checkBuildingCollision(this.x, this.z, 2.0);
        if (col.hit) {
          this.x += col.normalX * 2.2;
          this.z += col.normalZ * 2.2;
          this.speed = -this.speed * 0.35;
          this.handleCrash(null);
        }
      }

      // Island bounds clamp (±560m)
      this.x = Math.max(-560, Math.min(560, this.x));
      this.z = Math.max(-560, Math.min(560, this.z));

    } else {
      // LINEAR HIGHWAY TRACK DRIVING
      const lateralSpeed = steerTarget * steerSensitivity * speedFactor * 14;
      this.x += lateralSpeed * clampedDt;

      // Follow track curvature base
      const currentRoadCenter = this.trackManager.getCurvatureAt(this.z);
      const relX = this.x - currentRoadCenter;
      if (relX < -6.2) {
        this.x = currentRoadCenter - 6.2;
        this.speed *= 0.96;
        this.particleSystem.emitTireSmoke(this.x, this.y, this.z);
      } else if (relX > 6.2) {
        this.x = currentRoadCenter + 6.2;
        this.speed *= 0.96;
        this.particleSystem.emitTireSmoke(this.x, this.y, this.z);
      }

      this.z += this.speed * clampedDt;
    }

    // 4. Nitro exhaust flame emission
    if (this.isNitroActive) {
      this.particleSystem.emitNitroFlame(this.x - 0.45, this.y + 0.25, this.z - 2.0);
      this.particleSystem.emitNitroFlame(this.x + 0.45, this.y + 0.25, this.z - 2.0);
    }

    // 5. Airborne Physics & Jump Ramps
    if (this.isAirborne) {
      this.y += this.vy * clampedDt;
      this.vy -= 28 * clampedDt; // Gravity

      this.pitch = THREE.MathUtils.damp(this.pitch, 0.25, 4, clampedDt);
      this.roll = THREE.MathUtils.damp(this.roll, steerTarget * 0.35, 6, clampedDt);

      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isAirborne = false;
        this.pitch = 0;
        this.roll = 0;
        soundManager.playCrash();
        this.particleSystem.emitTireSmoke(this.x - 0.9, 0, this.z - 1.2);
        this.particleSystem.emitTireSmoke(this.x + 0.9, 0, this.z - 1.2);
      }
    } else {
      this.y = 0;
      this.pitch = -input.forward ? 0.03 : input.backward ? -0.04 : 0;
      this.roll = THREE.MathUtils.damp(this.roll, -this.steerAngle * 0.15, 10, clampedDt);
    }

    // 6. Update Car Mesh Transform
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.isOpenWorld ? this.headingAngle + this.driftAngle : this.steerAngle + this.driftAngle;
    this.mesh.rotation.x = this.pitch;
    this.mesh.rotation.z = this.roll;

    // Spin wheels
    const wheels = (this.mesh as any).userData?.wheels as THREE.Group[] | undefined;
    if (wheels) {
      const wheelSpin = (this.speed * clampedDt) / 0.36;
      for (const w of wheels) {
        w.rotation.x += wheelSpin;
      }
      // Steer front wheels
      if (wheels.length >= 2) {
        wheels[0].rotation.y = this.steerAngle * 0.8;
        wheels[1].rotation.y = this.steerAngle * 0.8;
      }
    }

    // 7. Track Specific Collisions (only when not in open world mode)
    if (!this.isOpenWorld) {
      this.checkTrafficCollisions();
      this.checkPickups();
      this.checkCheckpoints();
    }
  }

  private checkTrafficCollisions() {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(this.x, this.y + 0.6, this.z),
      new THREE.Vector3(1.8, 1.2, 4.0)
    );

    for (const car of this.trackManager.traffic) {
      if (!car.active) continue;

      const trafficBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(car.x, 0.6, car.z),
        new THREE.Vector3(car.width, 1.4, car.length)
      );

      // Collision Check
      if (playerBox.intersectsBox(trafficBox)) {
        if (this.invulnerableTimer <= 0) {
          this.handleCrash(car);
        }
        return;
      }

      // Near Miss Check (Passing within lateral proximity at high speed)
      const dz = Math.abs(this.z - car.z);
      const dx = Math.abs(this.x - car.x);
      if (dz < 2.5 && dx < 3.2 && !this.passedCars.has(car.id) && this.speed > 25) {
        this.passedCars.add(car.id);
        soundManager.playNearMiss();
        this.onFloatingText?.({
          id: Date.now(),
          text: 'NEAR MISS! +250',
          type: 'nearMiss',
          score: 250,
          timestamp: Date.now(),
        });
      }
    }
  }

  private handleCrash(car: any) {
    this.invulnerableTimer = 1.8; // 1.8s invulnerability flash
    this.speed = Math.min(this.speed * 0.35, 12); // slow down heavily
    soundManager.playCrash();
    this.particleSystem.emitCrashSparks(this.x, this.y + 0.5, this.z + 1.0, 35);
    this.onCrash?.();
  }

  private checkPickups() {
    const playerPos = new THREE.Vector3(this.x, this.y + 0.5, this.z);

    for (const item of this.trackManager.pickups) {
      if (!item.active) continue;

      const dist = playerPos.distanceTo(new THREE.Vector3(item.x, 0.8, item.z));
      if (dist < 2.2) {
        if (item.type === 'coin') {
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playCoin();
          this.particleSystem.emitCoinSparkles(item.x, 1.0, item.z);
          this.onFloatingText?.({
            id: Date.now() + Math.random(),
            text: '+100 COIN',
            type: 'combo',
            score: 100,
            timestamp: Date.now(),
          });
        } else if (item.type === 'nitro') {
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playNitroPickup();
          this.nitroAmount = Math.min(100, this.nitroAmount + 40);
          this.particleSystem.emitNitroFlame(item.x, 1.0, item.z);
          this.onFloatingText?.({
            id: Date.now(),
            text: 'NITRO REFILL!',
            type: 'nitro',
            score: 150,
            timestamp: Date.now(),
          });
        } else if (item.type === 'ramp') {
          if (!this.isAirborne) {
            this.isAirborne = true;
            this.vy = 12; // launch up
            this.speed = Math.max(this.speed * 1.15, 35); // launch forward
            soundManager.playJump();
            this.onFloatingText?.({
              id: Date.now(),
              text: 'BIG AIR! +500',
              type: 'combo',
              score: 500,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  private checkCheckpoints() {
    for (const cp of this.trackManager.checkpoints) {
      if (Math.abs(this.z - cp.position.z) < 3.0) {
        soundManager.playCheckpoint();
        this.particleSystem.emitCoinSparkles(this.x, 3.5, this.z, 40);
        this.onCheckpointPassed?.();
        // Remove or pass it once
        cp.position.z = -9999;
      }
    }
  }

  public reset(startX = 0, startZ = 0, startHeading = 0) {
    this.x = startX;
    this.y = 0;
    this.z = startZ;
    this.headingAngle = startHeading;
    this.speed = 0;
    this.steerAngle = 0;
    this.driftAngle = 0;
    this.isAirborne = false;
    this.vy = 0;
    this.nitroAmount = 100;
    this.invulnerableTimer = 0;
    this.passedCars.clear();
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.set(0, startHeading, 0);
  }
}
