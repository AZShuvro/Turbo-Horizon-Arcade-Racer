/**
 * Procedural Web Audio synthesizer for arcade car sound effects and music.
 * Zero external audio files required - works completely offline with 0 network latency.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine synth nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

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

  // --- ENGINE AUDIO ---
  public startEngine() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.isEngineRunning) return;

    try {
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineSubOsc = this.ctx.createOscillator();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'triangle';
      this.engineSubOsc.type = 'sine';

      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineOsc2.frequency.setValueAtTime(46.5, this.ctx.currentTime);
      this.engineSubOsc.frequency.setValueAtTime(22.5, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSubOsc.start();
      this.isEngineRunning = true;
    } catch {
      // Audio failed to start
    }
  }

  public updateEngine(speedNormalized: number, throttle: boolean, nitro: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;

    const baseFreq = 42 + speedNormalized * 140 + (nitro ? 35 : 0) + (throttle ? 15 : 0);
    const filterFreq = 260 + speedNormalized * 1200 + (nitro ? 600 : 0) + (throttle ? 250 : 0);
    const targetGain = 0.15 + speedNormalized * 0.25 + (nitro ? 0.1 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.025, now, 0.08);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
    }
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineSubOsc?.disconnect();
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

  // --- PROCEDURAL SYNTH MUSIC LOOP ---
  public startMusic() {
    this.unlock();
    if (this.musicInterval) return;

    // 130 BPM energetic synthwave bassline & chord progression
    const bpm = 128;
    const stepDuration = (60 / bpm) / 4; // 16th notes
    // Chords: Am -> F -> C -> G
    const bassline = [
      110, 110, 220, 110,  110, 110, 220, 164.81, // A2 octave bounce
      87.31, 87.31, 174.61, 87.31,  87.31, 87.31, 174.61, 130.81, // F2
      130.81, 130.81, 261.63, 130.81, 130.81, 130.81, 261.63, 196.0, // C3
      98.0, 98.0, 196.0, 98.0,  98.0, 98.0, 196.0, 146.83, // G2
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
