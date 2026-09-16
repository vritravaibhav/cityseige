/**
 * SoundManager - Procedural Web Audio API Sound Synthesizer
 * Generates all game sound effects and vehicle audio dynamically without external audio assets.
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.engineNode = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.nitroGain = null;
    this.driftGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this._initEngineAudio();
      this._initSirenAudio();
      this._initDriftAudio();

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext initialization deferred until user interaction:', e);
    }
  }

  ensureStarted() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  // --- Continuous Engine Sound ---
  _initEngineAudio() {
    if (!this.ctx) return;
    // Create twin oscillators for rich muscle car rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.engineOsc2.frequency.setValueAtTime(46, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speedRatio, isAccelerating, active = true) {
    if (!this.ctx || !this.engineGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.isMuted) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      return;
    }

    const baseFreq = 42 + speedRatio * 95 + (isAccelerating ? 22 : 0);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.08);

    const filterFreq = 180 + speedRatio * 850 + (isAccelerating ? 300 : 0);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);

    const targetGain = 0.22 + speedRatio * 0.18 + (isAccelerating ? 0.12 : 0);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  // --- Drift / Tire Screech ---
  _initDriftAudio() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.driftGain);
    this.driftGain.connect(this.masterGain);

    whiteNoise.start();
  }

  updateDrift(driftIntensity) {
    if (!this.ctx || !this.driftGain) return;
    const now = this.ctx.currentTime;
    const gain = Math.min(0.35, Math.max(0, (driftIntensity - 0.25) * 0.5));
    this.driftGain.gain.setTargetAtTime(this.isMuted ? 0 : gain, now, 0.05);
  }

  // --- Police Siren ---
  _initSirenAudio() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);

    // LFO to create wail
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.frequency.setValueAtTime(1.8, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(260, this.ctx.currentTime);
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(filter);
    filter.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  setSirenActive(active, proximity = 1.0) {
    if (!this.ctx || !this.sirenGain) return;
    const now = this.ctx.currentTime;
    const target = (active && !this.isMuted) ? Math.min(0.28, 0.28 * proximity) : 0;
    this.sirenGain.gain.setTargetAtTime(target, now, 0.15);
  }

  // --- Explosions & Impact SFX ---
  playExplosion(size = 'medium') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = size === 'huge' ? 140 : 180;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.5);

    oscGain.gain.setValueAtTime(size === 'huge' ? 0.7 : 0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + (size === 'huge' ? 1.2 : 0.7));

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.3);

    // Noise burst
    const dur = size === 'huge' ? 1.4 : 0.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(size === 'huge' ? 650 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(size === 'huge' ? 0.6 : 0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
  }

  // --- Metal Crash / Collision ---
  playCrash(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 * intensity, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(Math.min(0.5, 0.25 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // --- Rocket Missile Launch ---
  playMissileLaunch() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // --- Hydraulic Big Jump ---
  playBigJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Air release hiss + rocket thrust
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.35);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // --- Invisibility / Cloak Activation ---
  playInvisibility() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [440, 659.25, 880, 1318.5];
    freqs.forEach((f, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + index * 0.08);

      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + index * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.75);
    });
  }

  // --- Nitro Boost ---
  playNitro() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(620, now + 0.5);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.3);
  }

  // --- Bomb Dropped / Armed ---
  playBombDrop() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1200, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // --- Turret / Cannon Fire ---
  playTurretFire() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // --- UI Click / Placement / Upgrade Ding ---
  playClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playPlace() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(440, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playUpgrade() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chord = [330, 415.3, 493.88, 659.25];
    chord.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.15, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    });
  }

  playLoot() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.5, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // --- Manual Tap-to-Collect Chime ---
  playCollectChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Ascending arpeggio (E5, G#5, B5, E6) for a crisp, rewarding crystal-coin collection sound
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.38);
    });
  }
}

export const soundManager = new SoundManager();
