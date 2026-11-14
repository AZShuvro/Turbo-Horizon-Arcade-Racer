/**
 * Procedural Web Audio synthesizer for arcade car sound effects and music.
 * Zero external audio files required - works completely offline with 0 network latency.
 */

import { EngineAudioProfile, RadioStation } from '../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Radio Station State
  private currentStation: RadioStation = 'synthwave';

  // Engine synth nodes & profile
  private engineProfile: EngineAudioProfile = 'street_v6';
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;
  private lastThrottleState = false;
  private bovCooldown = 0;


  // Drift squeal synth nodes
  private driftNoiseNode: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private isDriftingAudio: boolean = false;

  // Nitro boost synth nodes
  private nitroNoiseNode: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private isNitroAudio: boolean = false;

  // Synth music loop interval
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch {
      // Audio not supported or blocked
    }
  }

  public unlock() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
    }
    return this.musicEnabled;
  }

  public isMusicOn(): boolean {
    return this.musicEnabled;
  }

  // Helper to create white noise buffer
  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // --- ENGINE AUDIO PROFILES ---
  public setEngineProfile(profile: EngineAudioProfile) {
    this.engineProfile = profile;
    if (this.engineOsc1 && this.engineOsc2 && this.ctx) {
      if (profile === 'muscle_v8') {
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'square';
      } else if (profile === 'twin_turbo') {
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'sawtooth';
      } else {
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
      }
    }
  }

  public getEngineProfile(): EngineAudioProfile {
    return this.engineProfile;
  }

  public startEngine() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isEngineRunning) return;

    try {
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();
      this.turboOsc = this.ctx.createOscillator();

      this.setEngineProfile(this.engineProfile);
      this.engineSubOsc.type = 'sine';
      this.turboOsc.type = 'sine';

      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineOsc2.frequency.setValueAtTime(46.5, this.ctx.currentTime);
      this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);
      this.turboOsc.frequency.setValueAtTime(900, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.sfxGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSubOsc.start();
      this.turboOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio failed to start
    }
  }

  public updateEngine(speedNormalized: number, throttle: boolean, nitro: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;

    const now = this.ctx.currentTime;
    const clampedSpd = Math.max(0, Math.min(1.4, speedNormalized));

    // Trigger BOV chirp on sudden throttle lift above 55% speed
    if (this.lastThrottleState && !throttle && clampedSpd > 0.52 && now > this.bovCooldown) {
      if (this.engineProfile === 'twin_turbo') {
        this.playTurboFlutter(1.0);
        this.bovCooldown = now + 0.65;
      } else if (this.engineProfile === 'street_v6') {
        this.playTurboFlutter(0.45);
        this.bovCooldown = now + 0.85;
      }
    }
    this.lastThrottleState = throttle;

    let pitchMult = 1.0;
    let osc2Detune = 1.025;
    let filterBase = 260;
    let filterSpan = 1200;
    let filterQ = 3.0;
    let gainScale = 1.0;

    if (this.engineProfile === 'muscle_v8') {
      pitchMult = 0.72;
      osc2Detune = 1.012;
      filterBase = 190;
      filterSpan = 820;
      filterQ = 4.2;
      gainScale = 1.15;
    } else if (this.engineProfile === 'twin_turbo') {
      pitchMult = 1.18;
      osc2Detune = 1.04;
      filterBase = 340;
      filterSpan = 1550;
      filterQ = 2.6;
      gainScale = 0.95;
    }

    const baseFreq = (42 + clampedSpd * 140 + (nitro ? 35 : 0) + (throttle ? 15 : 0)) * pitchMult;
    const filterFreq = filterBase + clampedSpd * filterSpan + (nitro ? 600 : 0) + (throttle ? 250 : 0);
    const targetGain = (0.15 + clampedSpd * 0.24 + (nitro ? 0.1 : 0)) * gainScale;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * osc2Detune, now, 0.08);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
    }
    this.engineFilter.Q.setTargetAtTime(filterQ, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);

    // Twin-Turbo spool whistle harmonic
    if (this.turboOsc && this.turboGain) {
      const turboTargetGain =
        this.engineProfile === 'twin_turbo' && throttle && clampedSpd > 0.22
          ? Math.min(0.055, (clampedSpd - 0.2) * 0.055 + (nitro ? 0.02 : 0))
          : 0.0;
      const turboFreq = 1100 + clampedSpd * 2400 + (nitro ? 550 : 0);
      this.turboOsc.frequency.setTargetAtTime(turboFreq, now, 0.1);
      this.turboGain.gain.setTargetAtTime(turboTargetGain, now, 0.08);
    }
  }

  public playTurboFlutter(intensity = 1.0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const buffer = this.createNoiseBuffer();
      if (!buffer) return;
      // Three rapid staccato BOV flutter pulses ("psshh-ch-ch")
      const pulses = [0, 0.055, 0.105];
      pulses.forEach((offset, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3400 - idx * 520, now + offset);
        filter.Q.setValueAtTime(5.5, now + offset);

        const gain = this.ctx.createGain();
        const peak = 0.16 * intensity * (1 - idx * 0.26);
        gain.gain.setValueAtTime(peak, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.048);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        src.start(now + offset);
        src.stop(now + offset + 0.05);
      });
    } catch {}
  }

  public playRepairComplete() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [587.33, 880, 1174.66]; // D5 -> A5 -> D6 clean service bay chime
      notes.forEach((freq, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.065);
        gain.gain.setValueAtTime(0.2, now + i * 0.065);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.065);
        osc.stop(now + i * 0.065 + 0.3);
      });
    } catch {}
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSubOsc?.stop();
      this.turboOsc?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineSubOsc?.disconnect();
      this.turboOsc?.disconnect();
      this.turboGain?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // Ignore
    }
    this.isEngineRunning = false;
  }

  // --- DRIFT TIRE SQUEAL ---
  public setDrifting(drifting: boolean) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    if (drifting && !this.isDriftingAudio) {
      try {
        const noiseBuffer = this.createNoiseBuffer();
        if (!noiseBuffer) return;
        this.driftNoiseNode = this.ctx.createBufferSource();
        this.driftNoiseNode.buffer = noiseBuffer;
        this.driftNoiseNode.loop = true;

        this.driftFilter = this.ctx.createBiquadFilter();
        this.driftFilter.type = 'bandpass';
        this.driftFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
        this.driftFilter.Q.setValueAtTime(8, this.ctx.currentTime);

        this.driftGain = this.ctx.createGain();
        this.driftGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.driftGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);

        this.driftNoiseNode.connect(this.driftFilter);
        this.driftFilter.connect(this.driftGain);
        this.driftGain.connect(this.sfxGain);

        this.driftNoiseNode.start();
        this.isDriftingAudio = true;
      } catch {
        // Ignore
      }
    } else if (!drifting && this.isDriftingAudio && this.driftGain) {
      try {
        this.driftGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.06);
        setTimeout(() => {
          if (!this.isDriftingAudio) return;
          try {
            this.driftNoiseNode?.stop();
            this.driftNoiseNode?.disconnect();
          } catch {}
          this.isDriftingAudio = false;
        }, 80);
      } catch {
        this.isDriftingAudio = false;
      }
    }
  }

  // --- NITRO BOOST ---
  public setNitroAudio(active: boolean) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    if (active && !this.isNitroAudio) {
      try {
        const noiseBuffer = this.createNoiseBuffer();
        if (!noiseBuffer) return;
        this.nitroNoiseNode = this.ctx.createBufferSource();
        this.nitroNoiseNode.buffer = noiseBuffer;
        this.nitroNoiseNode.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, this.ctx.currentTime);

        this.nitroGain = this.ctx.createGain();
        this.nitroGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.nitroGain.gain.setTargetAtTime(0.25, this.ctx.currentTime, 0.04);

        this.nitroNoiseNode.connect(filter);
        filter.connect(this.nitroGain);
        this.nitroGain.connect(this.sfxGain);

        this.nitroNoiseNode.start();
        this.isNitroAudio = true;

        // Nitro ignition whoosh
        this.playWhoosh(1.4);
      } catch {
        // Ignore
      }
    } else if (!active && this.isNitroAudio && this.nitroGain) {
      try {
        this.nitroGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (!this.isNitroAudio) return;
          try {
            this.nitroNoiseNode?.stop();
            this.nitroNoiseNode?.disconnect();
          } catch {}
          this.isNitroAudio = false;
        }, 70);
      } catch {
        this.isNitroAudio = false;
      }
    }
  }

  // --- SFX: COIN / PICKUP ---
  public playCoin() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {}
  }

  // --- SFX: NITRO PICKUP ---
  public playNitroPickup() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // --- SFX: NEAR MISS WHOOSH ---
  public playNearMiss() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // --- SFX: WHOOSH ---
  private playWhoosh(speed = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160 * speed, now);
      osc.frequency.exponentialRampToValueAtTime(650 * speed, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // --- SFX: JUMP / RAMP ---
  public playJump() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.28);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  // --- SFX: CRASH / IMPACT ---
  public playCrash() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;

      // Heavy low thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4);

      // Noise metal crunch
      const noiseBuffer = this.createNoiseBuffer();
      if (noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.3);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.45, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.35);
      }
    } catch {}
  }

  // --- SFX: CHECKPOINT FANFARE ---
  public playCheckpoint() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const time = this.ctx!.currentTime + i * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.22, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(time);
        osc.stop(time + 0.22);
      });
    } catch {}
  }

  // --- SFX: GEAR SHIFT (CLUNK / CLICK) ---
  public playGearShift(success = true) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      if (success) {
        // Satisfying mechanical shifter clunk
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
        if (this.engineProfile === 'twin_turbo') {
          this.playTurboFlutter(0.85);
        }
      } else {
        // Harsh clutch grind noise (trying to shift without clutch!)
        const buffer = this.createNoiseBuffer();
        if (buffer) {
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.setValueAtTime(4, now);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          noise.start(now);
          noise.stop(now + 0.25);
        }
      }
    } catch {}
  }

  // --- SFX: BLINKER / INDICATOR TICK-TOCK ---
  public playBlinker() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.025);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  // --- SFX: POLICE SIREN YELP / WAIL ---
  public playSiren() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.18);
      osc.frequency.linearRampToValueAtTime(700, now + 0.36);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }

  // --- SFX: MAGNET POWER-UP ---
  public playMagnetPickup() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }

  // --- SFX: SHIELD ACTIVATION & DEFLECT ---
  public playShieldPickup() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  public playShieldDeflect() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      // High energy deflection shockwave
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch {}
  }

  // --- SFX: OIL SLICK SPLASH ---
  public playOilSplash() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const buffer = this.createNoiseBuffer();
      if (buffer) {
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.35);
      }
    } catch {}
  }

  // --- SFX: DOOR / TRUNK TOGGLE CLICK ---
  public playDoorToggle(isOpen: boolean) {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isOpen ? 380 : 260, now);
      osc.frequency.exponentialRampToValueAtTime(isOpen ? 650 : 120, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // --- SFX: ACHIEVEMENT UNLOCK FANFARE ---
  public playAchievementUnlock() {
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C Major triumph
      chord.forEach((freq, idx) => {
        const time = this.ctx!.currentTime + idx * 0.07;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.24, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(time);
        osc.stop(time + 0.45);
      });
    } catch {}
  }

  // --- SFX: EXHAUST POP / BACKFIRE SPUTTER ---
  public playExhaustPop() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // 1. High transient crackle
      const buffer = this.createNoiseBuffer();
      if (buffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.09);
      }

      // 2. Low sub thump
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, now);
      sub.frequency.exponentialRampToValueAtTime(35, now + 0.09);

      subGain.gain.setValueAtTime(0.38, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + 0.1);
    } catch {}
  }

  // --- SFX: CAR HORN ---
  public playHorn() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(now);
        osc.stop(now + 0.28);
      });
    } catch {}
  }

  // --- SFX: SPEED TRAP FLASH ---
  public playSpeedTrapFlash() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // High laser confirmation chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.linearRampToValueAtTime(1975.53, now + 0.12); // B6

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // --- RADIO STATIONS ---
  public getRadioStation(): RadioStation {
    return this.currentStation;
  }

  public setRadioStation(station: RadioStation) {
    this.currentStation = station;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (station !== 'off' && this.musicEnabled && !this.isMuted) {
      this.startMusic();
    }
  }

  public nextRadioStation(): RadioStation {
    const stations: RadioStation[] = ['synthwave', 'retroArcade', 'lofi', 'off'];
    const idx = stations.indexOf(this.currentStation);
    const next = stations[(idx + 1) % stations.length];
    this.setRadioStation(next);
    return next;
  }

  // --- PROCEDURAL SYNTH MUSIC LOOP ---
  public startMusic() {
    this.unlock();
    if (this.musicInterval) return;
    if (this.currentStation === 'off') return;

    if (this.currentStation === 'retroArcade') {
      // 144 BPM Chiptune Fast Arcade Arpeggios
      const bpm = 144;
      const stepDuration = (60 / bpm) / 4;
      const arcadeNotes = [
        440, 554.37, 659.25, 880,
        587.33, 739.99, 880, 1174.66,
        659.25, 830.61, 987.77, 1318.51,
        554.37, 659.25, 880, 1108.73,
      ];

      this.musicStep = 0;
      this.musicInterval = window.setInterval(() => {
        if (!this.ctx || !this.musicGain || !this.musicEnabled || this.isMuted) return;
        const note = arcadeNotes[this.musicStep % arcadeNotes.length];
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.08);

        this.musicStep++;
      }, stepDuration * 1000);
      return;
    }

    if (this.currentStation === 'lofi') {
      // 84 BPM Chill Lo-Fi Chords
      const bpm = 84;
      const stepDuration = (60 / bpm) / 2; // 8th notes
      // Warm chords: Dm9 -> G13 -> Cmaj9 -> Am9
      const lofiChords = [
        [293.66, 349.23, 440, 523.25], // Dm
        [196.0, 246.94, 349.23, 440],  // G7
        [261.63, 329.63, 392, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392],  // Am7
      ];

      this.musicStep = 0;
      this.musicInterval = window.setInterval(() => {
        if (!this.ctx || !this.musicGain || !this.musicEnabled || this.isMuted) return;
        const chord = lofiChords[Math.floor(this.musicStep / 2) % lofiChords.length];
        const now = this.ctx.currentTime;

        chord.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const filter = this.ctx!.createBiquadFilter();
          const gain = this.ctx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);

          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.musicGain!);

          osc.start(now);
          osc.stop(now + stepDuration * 1.8);
        });

        this.musicStep++;
      }, stepDuration * 1000);
      return;
    }

    // Default: 'synthwave' (128 BPM Energetic Synthwave)
    const bpm = 128;
    const stepDuration = (60 / bpm) / 4; // 16th notes
    const bassline = [
      110, 110, 220, 110,  110, 110, 220, 164.81,
      87.31, 87.31, 174.61, 87.31,  87.31, 87.31, 174.61, 130.81,
      130.81, 130.81, 261.63, 130.81, 130.81, 130.81, 261.63, 196.0,
      98.0, 98.0, 196.0, 98.0,  98.0, 98.0, 196.0, 146.83,
    ];

    this.musicStep = 0;
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.isMuted) return;

      const freq = bassline[this.musicStep % bassline.length];
      const now = this.ctx.currentTime;

      // Synth bass note
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.14);

      // Snare / Hi-hat on every 4th 16th note
      if (this.musicStep % 4 === 2) {
        const noise = this.ctx.createBufferSource();
        const noiseBuff = this.createNoiseBuffer();
        if (noiseBuff) {
          noise.buffer = noiseBuff;
          const hFilter = this.ctx.createBiquadFilter();
          hFilter.type = 'highpass';
          hFilter.frequency.setValueAtTime(4000, now);

          const hGain = this.ctx.createGain();
          hGain.gain.setValueAtTime(0.08, now);
          hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          noise.connect(hFilter);
          hFilter.connect(hGain);
          hGain.connect(this.musicGain);

          noise.start(now);
          noise.stop(now + 0.06);
        }
      }

      this.musicStep++;
    }, stepDuration * 1000);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public dispose() {
    this.stopEngine();
    this.stopMusic();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}


export const soundManager = new SoundManager();
