import * as THREE from 'three';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  maxLife: number;
  life: number;
  colorHex: number;
}

export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private maxParticles = 350;
  private particles: Particle[] = [];
  private activeCount = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Pre-allocate particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0,
        maxLife: 1,
        life: 0,
        colorHex: 0xffffff,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
      this.mesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public emit(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    scale: number,
    life: number,
    colorHex: number
  ) {
    // Find first inactive or oldest particle
    let index = -1;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particles[i].life <= 0) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      index = Math.floor(Math.random() * this.maxParticles);
    }

    const p = this.particles[index];
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.scale = scale;
    p.maxLife = life;
    p.life = life;
    p.colorHex = colorHex;

    _color.setHex(colorHex);
    this.mesh.setColorAt(index, _color);
  }

  // Helper emitters
  public emitTireSmoke(x: number, y: number, z: number) {
    const vx = (Math.random() - 0.5) * 1.5;
    const vy = 0.5 + Math.random() * 0.8;
    const vz = -1.5 - Math.random() * 2.0;
    this.emit(
      x + (Math.random() - 0.5) * 0.4,
      y + 0.1,
      z + (Math.random() - 0.5) * 0.4,
      vx,
      vy,
      vz,
      0.4 + Math.random() * 0.3,
      0.4 + Math.random() * 0.3,
      0xd4d4d8
    );
  }

  public emitNitroFlame(x: number, y: number, z: number) {
    const vx = (Math.random() - 0.5) * 0.6;
    const vy = (Math.random() - 0.5) * 0.4;
    const vz = -6 - Math.random() * 6;
    const colors = [0x06b6d4, 0x38bdf8, 0x67e8f9, 0xffffff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.emit(
      x + (Math.random() - 0.5) * 0.2,
      y + 0.2,
      z - 0.2,
      vx,
      vy,
      vz,
      0.35 + Math.random() * 0.25,
      0.25 + Math.random() * 0.2,
      color
    );
  }

  public emitCrashSparks(x: number, y: number, z: number, count = 25) {
    const colors = [0xf59e0b, 0xfacc15, 0xef4444, 0xffffff];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const vx = Math.cos(angle) * speed;
      const vy = 2 + Math.random() * 7;
      const vz = Math.sin(angle) * speed;
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.emit(
        x + (Math.random() - 0.5) * 0.8,
        y + 0.5,
        z + (Math.random() - 0.5) * 0.8,
        vx,
        vy,
        vz,
        0.25 + Math.random() * 0.2,
        0.5 + Math.random() * 0.4,
        col
      );
    }
  }

  public emitCoinSparkles(x: number, y: number, z: number, count = 18) {
    const colors = [0xfacc15, 0xfef08a, 0xf59e0b, 0xffffff];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = 3 + Math.random() * 5;
      const vz = Math.sin(angle) * speed;
      const col = colors[Math.floor(Math.random() * colors.length)];
      this.emit(x, y, z, vx, vy, vz, 0.3 + Math.random() * 0.2, 0.45 + Math.random() * 0.3, col);
    }
  }

  public emitRain(aroundX: number, aroundZ: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const rx = aroundX + (Math.random() - 0.5) * 35;
      const rz = aroundZ + (Math.random() - 0.5) * 45;
      this.emit(
        rx,
        8.0 + Math.random() * 6.0,
        rz,
        (Math.random() - 0.5) * 1.5,
        -32 - Math.random() * 10,
        -5 - Math.random() * 5,
        0.18,
        0.35,
        0x93c5fd
      );
    }
  }

  public update(dt: number) {
    let hasUpdates = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        hasUpdates = true;
        p.life -= dt;

        if (p.life <= 0) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.set(0, 0, 0);
          _dummy.updateMatrix();
          this.mesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }

        // Apply physics
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 9.8 * dt * 0.5; // gravity

        // Scale down with age
        const progress = p.life / p.maxLife;
        const currentScale = p.scale * progress;

        _dummy.position.set(p.x, p.y, p.z);
        _dummy.scale.set(currentScale, currentScale, currentScale);
        _dummy.updateMatrix();
        this.mesh.setMatrixAt(i, _dummy.matrix);
      }
    }

    if (hasUpdates) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose() {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
