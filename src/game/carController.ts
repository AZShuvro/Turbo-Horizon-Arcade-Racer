import * as THREE from 'three';
import { CarStats, PlayerInput, FloatingText, TransmissionType } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { ParticleSystem } from './particleSystem';
import { TrackManager } from './trackManager';
import { OpenWorldManager } from './OpenWorldManager';
import { createShieldBubble } from './proceduralModels';

const GEAR_SPEED_LIMITS = [
  0,     // 0: Neutral / Stop
  12.5,  // 1: ~45 km/h
  23.6,  // 2: ~85 km/h
  37.5,  // 3: ~135 km/h
  51.4,  // 4: ~185 km/h
  63.8,  // 5: ~230 km/h
  78.0,  // 6: ~280 km/h
];

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
  public passedCars = new Set<number>();

  // Hitstop & Invulnerability
  public invulnerableTimer = 0;

  // --- POWER-UPS & HAZARDS STATE ---
  public magnetTimer = 0; // in seconds (active for 8s)
  public hasShield = false;
  private shieldBubbleMesh: THREE.Mesh | null = null;
  public oilSpinTimer = 0; // active for 1.6s

  // --- TRANSMISSION & MANUAL SHIFTING ---
  public transmission: TransmissionType = 'automatic';
  public currentGear = 1; // 1 - 6
  public clutchEngaged = false;

  // --- INTERACTIVE VEHICLE CONTROLS & OPENABLES ---
  public headlightsActive = true;
  public indicatorState: 'off' | 'left' | 'right' | 'hazard' = 'off';
  private blinkerTimer = 0;
  private blinkerFlashState = false;
  public doorsOpen = false;
  public trunkOpen = false;
  private doorAngle = 0;
  private trunkAngle = 0;

  // Stats for achievements & cops
  public copsEvadedTime = 0;
  public magnetCoinsDrawn = 0;

  // Callback hooks
  public onFloatingText?: (text: FloatingText) => void;
  public onCrash?: () => void;
  public onCheckpointPassed?: () => void;
  public onAchievementTrigger?: (id: string) => void;

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
    this.initShieldBubble();
  }

  private initShieldBubble() {
    this.shieldBubbleMesh = createShieldBubble();
    this.shieldBubbleMesh.visible = false;
    this.mesh.add(this.shieldBubbleMesh);
  }

  public setCar(mesh: THREE.Group, stats: CarStats) {
    this.mesh = mesh;
    this.stats = stats;
    this.maxSpeed = 38 + stats.topSpeed * 0.35;
    this.initShieldBubble();
  }

  // Toggle Headlights
  public toggleHeadlights(): boolean {
    this.headlightsActive = !this.headlightsActive;
    const ud = (this.mesh as any).userData;
    if (ud?.headlights) {
      for (const hl of ud.headlights) {
        if (hl.material) {
          hl.material.emissiveIntensity = this.headlightsActive ? 2.5 : 0.05;
        }
      }
    }
    if (ud?.spotLights) {
      for (const spot of ud.spotLights) {
        spot.visible = this.headlightsActive;
      }
    }
    soundManager.playBlinker();
    return this.headlightsActive;
  }

  // Toggle Turn Indicators / Hazards
  public setIndicator(state: 'left' | 'right' | 'hazard' | 'off') {
    this.indicatorState = this.indicatorState === state ? 'off' : state;
    soundManager.playBlinker();
  }

  // Toggle Doors Open/Close
  public toggleDoors(): boolean {
    this.doorsOpen = !this.doorsOpen;
    soundManager.playDoorToggle(this.doorsOpen);
    this.onFloatingText?.({
      id: Date.now(),
      text: this.doorsOpen ? 'DOORS OPENED' : 'DOORS CLOSED',
      type: 'powerup',
      score: 50,
      timestamp: Date.now(),
    });
    return this.doorsOpen;
  }

  // Toggle Trunk Open/Close
  public toggleTrunk(): boolean {
    this.trunkOpen = !this.trunkOpen;
    soundManager.playDoorToggle(this.trunkOpen);
    this.onFloatingText?.({
      id: Date.now(),
      text: this.trunkOpen ? 'TRUNK OPENED' : 'TRUNK CLOSED',
      type: 'powerup',
      score: 50,
      timestamp: Date.now(),
    });
    return this.trunkOpen;
  }

  // Manual Shifting handlers
  public shiftUp(clutchHeld: boolean) {
    if (this.transmission === 'automatic') return;

    if (clutchHeld) {
      if (this.currentGear < 6) {
        this.currentGear++;
        soundManager.playGearShift(true);
        this.onAchievementTrigger?.('manual-driver');
        this.onFloatingText?.({
          id: Date.now(),
          text: `GEAR SHIFT: ${this.currentGear}`,
          type: 'powerup',
          score: 50,
          timestamp: Date.now(),
        });
      }
    } else {
      // Clutch wasn't pressed - harsh gear grind!
      soundManager.playGearShift(false);
      this.speed = Math.max(0, this.speed * 0.88);
      this.onFloatingText?.({
        id: Date.now(),
        text: 'HOLD CLUTCH (ALT) TO SHIFT!',
        type: 'hazard',
        score: 0,
        timestamp: Date.now(),
      });
    }
  }

  public shiftDown(clutchHeld: boolean) {
    if (this.transmission === 'automatic') return;

    if (clutchHeld) {
      if (this.currentGear > 1) {
        this.currentGear--;
        soundManager.playGearShift(true);
        this.onAchievementTrigger?.('manual-driver');
        this.onFloatingText?.({
          id: Date.now(),
          text: `GEAR SHIFT: ${this.currentGear}`,
          type: 'powerup',
          score: 50,
          timestamp: Date.now(),
        });
      }
    } else {
      soundManager.playGearShift(false);
      this.speed = Math.max(0, this.speed * 0.88);
      this.onFloatingText?.({
        id: Date.now(),
        text: 'HOLD CLUTCH (ALT) TO SHIFT!',
        type: 'hazard',
        score: 0,
        timestamp: Date.now(),
      });
    }
  }

  public update(input: PlayerInput, dt: number) {
    const clampedDt = Math.min(dt, 0.05);

    // Update invulnerability flash
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= clampedDt;
      this.mesh.visible = Math.floor(Date.now() / 80) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // Update Magnet duration
    if (this.magnetTimer > 0) {
      this.magnetTimer = Math.max(0, this.magnetTimer - clampedDt);
      this.pullNearbyCoins(clampedDt);
    }

    // Update Oil Slick traction loss
    if (this.oilSpinTimer > 0) {
      this.oilSpinTimer = Math.max(0, this.oilSpinTimer - clampedDt);
      this.particleSystem.emitTireSmoke(this.x, this.y, this.z);
    }

    // Update Shield bubble visual
    if (this.shieldBubbleMesh) {
      this.shieldBubbleMesh.visible = this.hasShield;
      if (this.hasShield) {
        this.shieldBubbleMesh.rotation.y += clampedDt * 2.0;
        this.shieldBubbleMesh.rotation.x += clampedDt * 1.2;
        (this.shieldBubbleMesh.material as any).opacity = 0.35 + Math.sin(Date.now() * 0.008) * 0.15;
      }
    }

    // Update Interactive Turn Indicators & Hazards (2Hz blink)
    this.updateIndicators(clampedDt);

    // Update Interactive Doors & Trunk Animation
    this.updateInteractiveMeshes(clampedDt);

    // Manual shifting edge triggers
    this.clutchEngaged = input.clutch;
    if (input.upshiftJustPressed) {
      this.shiftUp(input.clutch);
    }
    if (input.downshiftJustPressed) {
      this.shiftDown(input.clutch);
    }

    // In Automatic mode, gear smoothly calculates from speed
    if (this.transmission === 'automatic') {
      const spd = Math.abs(this.speed);
      if (spd < 11) this.currentGear = 1;
      else if (spd < 22) this.currentGear = 2;
      else if (spd < 36) this.currentGear = 3;
      else if (spd < 49) this.currentGear = 4;
      else if (spd < 62) this.currentGear = 5;
      else this.currentGear = 6;
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
      if (this.nitroAmount < 100) {
        this.nitroAmount = Math.min(100, this.nitroAmount + 4 * this.stats.nitroRecharge * clampedDt);
      }
    }

    // Determine current gear top speed limit
    let currentMaxSpeed = this.maxSpeed;
    if (this.transmission === 'manual') {
      const gearLimit = GEAR_SPEED_LIMITS[this.currentGear];
      currentMaxSpeed = Math.min(this.maxSpeed, gearLimit);
    }
    if (this.isNitroActive) {
      currentMaxSpeed *= 1.35;
    }

    // Accelerate / Brake
    if (input.forward) {
      if (this.speed < currentMaxSpeed) {
        this.speed += accelRate * clampedDt;
      } else {
        // Rev limiter bounce if redlining current gear!
        this.speed = THREE.MathUtils.damp(this.speed, currentMaxSpeed, 5, clampedDt);
      }
    } else if (input.backward) {
      if (this.speed > 0) {
        this.speed -= brakeRate * clampedDt;
      } else {
        this.speed = Math.max(-12, this.speed - 12 * clampedDt);
      }
    } else {
      // Drag
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - drag * clampedDt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + drag * clampedDt);
      }
    }

    // Achievement speed check (>220 km/h)
    const kmh = Math.round(Math.abs(this.speed) * 3.6);
    if (kmh >= 220) {
      this.onAchievementTrigger?.('speed-demon');
    }

    // 2. Steering & Drifting
    const speedFactor = Math.min(1.0, Math.abs(this.speed) / 15);
    let steerSensitivity = 1.6 * (0.8 + this.stats.handling * 0.4);

    // Degrade steering control during Oil Slick hazard
    if (this.oilSpinTimer > 0) {
      steerSensitivity *= 0.3; // 70% grip lost!
    }

    let steerTarget = 0;
    if (input.left) steerTarget += 1;
    if (input.right) steerTarget -= 1;

    // Handbrake drift state
    const wantsDrift = input.drift && Math.abs(this.speed) > 18 && (input.left || input.right);
    this.isDrifting = (wantsDrift || this.oilSpinTimer > 0) && !this.isAirborne;

    soundManager.setDrifting(this.isDrifting);
    soundManager.setNitroAudio(this.isNitroActive);
    soundManager.updateEngine(
      Math.abs(this.speed) / this.maxSpeed,
      input.forward,
      this.isNitroActive
    );

    if (this.isDrifting) {
      const driftInc = Math.floor(Math.abs(this.speed) * 12 * clampedDt);
      this.currentDriftScore += driftInc;
      this.nitroAmount = Math.min(100, this.nitroAmount + 18 * clampedDt);

      const targetDriftAngle = this.oilSpinTimer > 0 ? (Math.sin(Date.now() * 0.01) * 0.6) : (steerTarget * 0.45);
      this.driftAngle = THREE.MathUtils.damp(this.driftAngle, targetDriftAngle, 12, clampedDt);

      this.particleSystem.emitTireSmoke(this.x - 0.8, this.y, this.z - 1.2);
      this.particleSystem.emitTireSmoke(this.x + 0.8, this.y, this.z - 1.2);

      if (this.currentDriftScore > 800) {
        this.onAchievementTrigger?.('drift-pro');
      }
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
      // 360-degree Open World driving
      const turnDir = this.speed >= 0 ? 1 : -1;
      const turnRate = steerTarget * steerSensitivity * turnDir * clampedDt * 2.2;
      this.headingAngle += turnRate;

      const vx = Math.sin(this.headingAngle) * this.speed;
      const vz = Math.cos(this.headingAngle) * this.speed;
      this.x += vx * clampedDt;
      this.z += vz * clampedDt;

      if (this.openWorldManager) {
        const col = this.openWorldManager.checkBuildingCollision(this.x, this.z, 2.0);
        if (col.hit) {
          if (this.hasShield) {
            this.hasShield = false;
            soundManager.playShieldDeflect();
            this.x += col.normalX * 2.5;
            this.z += col.normalZ * 2.5;
            this.onFloatingText?.({
              id: Date.now(),
              text: 'SHIELD DEFLECTED IMPACT!',
              type: 'powerup',
              score: 250,
              timestamp: Date.now(),
            });
          } else {
            this.x += col.normalX * 2.2;
            this.z += col.normalZ * 2.2;
            this.speed = -this.speed * 0.35;
            this.handleCrash(null);
          }
        }
      }

      this.x = Math.max(-560, Math.min(560, this.x));
      this.z = Math.max(-560, Math.min(560, this.z));

    } else {
      // Linear highway track driving
      const lateralSpeed = steerTarget * steerSensitivity * speedFactor * 14;
      this.x += lateralSpeed * clampedDt;

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

  // Magnet power-up: draw in nearby coins smoothly
  private pullNearbyCoins(dt: number) {
    const playerPos = new THREE.Vector3(this.x, this.y + 0.5, this.z);

    for (const item of this.trackManager.pickups) {
      if (!item.active || item.type !== 'coin') continue;

      const coinPos = new THREE.Vector3(item.x, 1.0, item.z);
      const dist = playerPos.distanceTo(coinPos);

      if (dist < 24.0) {
        // Accelerate coin towards player
        const dir = playerPos.clone().sub(coinPos).normalize();
        const pullSpeed = (25.0 - dist) * 1.8;
        item.x += dir.x * pullSpeed * dt;
        item.z += dir.z * pullSpeed * dt;
        item.meshGroup.position.set(item.x, 1.0, item.z);

        this.particleSystem.emitCoinSparkles(item.x, 1.0, item.z, 2);
      }
    }
  }

  // Update Turn Indicators / Hazard lights blinking
  private updateIndicators(dt: number) {
    const ud = (this.mesh as any).userData;
    if (!ud?.indicators) return;

    if (this.indicatorState === 'off') {
      ud.indicators.fl.visible = false;
      ud.indicators.fr.visible = false;
      ud.indicators.rl.visible = false;
      ud.indicators.rr.visible = false;
      return;
    }

    this.blinkerTimer += dt;
    if (this.blinkerTimer > 0.3) {
      this.blinkerTimer = 0;
      this.blinkerFlashState = !this.blinkerFlashState;
      if (this.blinkerFlashState) {
        soundManager.playBlinker();
      }
    }

    const isLeft = this.indicatorState === 'left' || this.indicatorState === 'hazard';
    const isRight = this.indicatorState === 'right' || this.indicatorState === 'hazard';

    ud.indicators.fl.visible = isLeft && this.blinkerFlashState;
    ud.indicators.rl.visible = isLeft && this.blinkerFlashState;
    ud.indicators.fr.visible = isRight && this.blinkerFlashState;
    ud.indicators.rr.visible = isRight && this.blinkerFlashState;

    // Amber glowing material intensity
    const indColor = new THREE.Color(0xf59e0b);
    for (const ind of [ud.indicators.fl, ud.indicators.fr, ud.indicators.rl, ud.indicators.rr]) {
      if (ind.material) {
        ind.material.color = indColor;
        ind.material.emissive = indColor;
        ind.material.emissiveIntensity = 3.0;
      }
    }
  }

  // Update Doors & Trunk Lid smooth animations
  private updateInteractiveMeshes(dt: number) {
    const ud = (this.mesh as any).userData;
    if (!ud) return;

    // Doors animation (-0.65 rad outward for L, +0.65 rad outward for R)
    const targetDoorAngle = this.doorsOpen ? 0.65 : 0;
    this.doorAngle = THREE.MathUtils.damp(this.doorAngle, targetDoorAngle, 8, dt);

    if (ud.doorL) {
      ud.doorL.rotation.y = -this.doorAngle;
    }
    if (ud.doorR) {
      ud.doorR.rotation.y = this.doorAngle;
    }

    // Trunk lid animation (tilts up by -0.6 rad)
    const targetTrunkAngle = this.trunkOpen ? -0.65 : 0;
    this.trunkAngle = THREE.MathUtils.damp(this.trunkAngle, targetTrunkAngle, 8, dt);

    if (ud.trunk) {
      ud.trunk.rotation.x = this.trunkAngle;
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
          if (this.hasShield) {
            // Shield absorbs crash!
            this.hasShield = false;
            this.invulnerableTimer = 1.0;
            soundManager.playShieldDeflect();
            this.particleSystem.emitCrashSparks(this.x, this.y + 0.5, this.z + 1.0, 45);
            this.onFloatingText?.({
              id: Date.now(),
              text: 'SHIELD DEFLECTED CRASH! +300',
              type: 'powerup',
              score: 300,
              timestamp: Date.now(),
            });
            // Nudge traffic car away
            car.x += car.x > this.x ? 3.5 : -3.5;
            return;
          } else {
            this.handleCrash(car);
          }
        }
        return;
      }

      // Near Miss Check
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
        if (this.passedCars.size >= 5) {
          this.onAchievementTrigger?.('close-call');
        }
      }
    }
  }

  private handleCrash(car: any) {
    this.invulnerableTimer = 1.8;
    this.speed = Math.min(this.speed * 0.35, 12);
    soundManager.playCrash();
    this.particleSystem.emitCrashSparks(this.x, this.y + 0.5, this.z + 1.0, 35);
    this.onCrash?.();
  }

  private checkPickups() {
    const playerPos = new THREE.Vector3(this.x, this.y + 0.5, this.z);

    for (const item of this.trackManager.pickups) {
      if (!item.active) continue;

      const dist = playerPos.distanceTo(new THREE.Vector3(item.x, 0.8, item.z));
      if (dist < 2.4) {
        if (item.type === 'coin') {
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playCoin();
          this.particleSystem.emitCoinSparkles(item.x, 1.0, item.z);
          if (this.magnetTimer > 0) {
            this.magnetCoinsDrawn++;
            if (this.magnetCoinsDrawn >= 5) {
              this.onAchievementTrigger?.('magnet-master');
            }
          }
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
          this.nitroAmount = Math.min(100, this.nitroAmount + 45);
          this.particleSystem.emitNitroFlame(item.x, 1.0, item.z);
          this.onFloatingText?.({
            id: Date.now(),
            text: 'NITRO REFILL!',
            type: 'nitro',
            score: 150,
            timestamp: Date.now(),
          });
        } else if (item.type === 'magnet') {
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playMagnetPickup();
          this.magnetTimer = 8.0; // 8 seconds duration
          this.particleSystem.emitCoinSparkles(item.x, 1.2, item.z, 25);
          this.onFloatingText?.({
            id: Date.now(),
            text: 'MAGNET ACTIVE! (8s)',
            type: 'powerup',
            score: 200,
            timestamp: Date.now(),
          });
        } else if (item.type === 'shield') {
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playShieldPickup();
          this.hasShield = true;
          this.particleSystem.emitCoinSparkles(item.x, 1.2, item.z, 30);
          this.onFloatingText?.({
            id: Date.now(),
            text: 'SHIELD GUARD ACTIVE!',
            type: 'powerup',
            score: 200,
            timestamp: Date.now(),
          });
        } else if (item.type === 'oil') {
          // Road Hazard: Oil Slick
          item.active = false;
          item.meshGroup.visible = false;
          soundManager.playOilSplash();
          this.oilSpinTimer = 1.6; // 1.6s traction loss
          this.speed = Math.max(12, this.speed * 0.82);
          this.particleSystem.emitTireSmoke(this.x, this.y, this.z);
          this.onFloatingText?.({
            id: Date.now(),
            text: 'OIL SLICK! TRACTION LOST!',
            type: 'hazard',
            score: 0,
            timestamp: Date.now(),
          });
        } else if (item.type === 'barricade') {
          // Road Hazard: Construction Barricade
          item.active = false;
          item.meshGroup.visible = false;
          if (this.hasShield) {
            this.hasShield = false;
            soundManager.playShieldDeflect();
            this.particleSystem.emitCrashSparks(this.x, this.y + 0.6, this.z, 30);
            this.onFloatingText?.({
              id: Date.now(),
              text: 'SHIELD SMASHED BARRICADE!',
              type: 'powerup',
              score: 200,
              timestamp: Date.now(),
            });
          } else {
            soundManager.playCrash();
            this.speed = Math.max(8, this.speed * 0.65);
            this.particleSystem.emitCrashSparks(this.x, this.y + 0.6, this.z, 30);
            this.onFloatingText?.({
              id: Date.now(),
              text: 'BARRICADE COLLISION!',
              type: 'hazard',
              score: 0,
              timestamp: Date.now(),
            });
          }
        } else if (item.type === 'ramp') {
          if (!this.isAirborne) {
            this.isAirborne = true;
            this.vy = 12.5; // launch up
            this.speed = Math.max(this.speed * 1.15, 38);
            soundManager.playJump();
            this.onAchievementTrigger?.('big-air');
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
    this.magnetTimer = 0;
    this.hasShield = false;
    this.oilSpinTimer = 0;
    this.currentGear = 1;
    this.doorsOpen = false;
    this.trunkOpen = false;
    this.doorAngle = 0;
    this.trunkAngle = 0;
    this.copsEvadedTime = 0;
    this.passedCars.clear();
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.set(0, startHeading, 0);
  }
}
