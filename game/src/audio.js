// Sound, synthesised with WebAudio — no audio files, so the game stays
// fully offline. Footsteps are short filtered noise taps: the player's own
// steps are soft, a guard's steps pan left or right by where the guard
// stands, so ears tell you where the patrol is before eyes do.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Browsers only allow audio after a user gesture; main.js calls this on
  // the first key press or click.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short burst of filtered noise: a footstep. `pan` is -1 (left) .. 1.
  footstep(pan = 0, loud = 0.5) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const duration = 0.07;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28 * loud, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter).connect(gain).connect(panner).connect(this.master);
    source.start(t);
  }

  // A two-note chime when a relic is pocketed.
  pickup() {
    this.tone(880, 0.09, 0.16, 'sine');
    setTimeout(() => this.tone(1318, 0.14, 0.16, 'sine'), 90);
  }

  // A low sting when a guard spots the thief.
  alarm() {
    this.tone(196, 0.22, 0.22, 'sawtooth');
    setTimeout(() => this.tone(147, 0.3, 0.22, 'sawtooth'), 140);
  }

  // A soft questioning blip when a guard grows suspicious.
  suspicious() {
    this.tone(520, 0.08, 0.1, 'triangle');
  }

  // A pebble's clatter.
  pebble() {
    if (!this.ctx || this.muted) return;
    this.tone(1400, 0.03, 0.12, 'square');
    setTimeout(() => this.tone(950, 0.04, 0.1, 'square'), 60);
  }

  win() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.18, 0.16, 'triangle'), i * 130);
    });
  }

  tone(freq, duration, volume, type) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}
