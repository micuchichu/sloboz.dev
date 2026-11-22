// Small Web Audio piano: no samples, no dependencies.
// Each voice = two slightly detuned oscillators on a warm harmonic wave,
// a velocity- and pitch-dependent lowpass that darkens as the note rings,
// a hammer "thump" of filtered noise, and a pitch-dependent decay.
// Notes are scheduled ahead of time with a small lookahead loop.

export const ROOMS = {
  dry: { label: 'Dry', seconds: 0, wet: 0 },
  room: { label: 'Room', seconds: 1.4, wet: 0.22 },
  hall: { label: 'Hall', seconds: 3.6, wet: 0.38 },
};

const LOOKAHEAD = 0.3;   // seconds of notes scheduled ahead
const TICK_MS = 40;

const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class PianoEngine {
  constructor() {
    this.ctx = null;
    this.notes = [];
    this.duration = 0;
    this.playing = false;
    this.offset = 0;         // song position when paused / at play start
    this.startedAt = 0;      // ctx time corresponding to song position 0
    this.cursor = 0;         // index of next note to schedule
    this.timer = null;
    this.session = null;     // per-play gain node; dropping it silences that run
    this.room = 'room';
    this.volume = 0.8;
    this.onEnded = null;
  }

  ensureContext() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    // Warm, piano-ish harmonic recipe
    const amps = [0, 1, 0.42, 0.24, 0.13, 0.09, 0.05, 0.035, 0.02, 0.012];
    const real = new Float32Array(amps.length);
    const imag = Float32Array.from(amps);
    this.wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    // Shared noise buffer for hammer transients
    const nb = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = nb;

    // master: voices → bus → (dry + reverb) → compressor → volume → out
    this.bus = ctx.createGain();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.01;
    this.comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;

    this.bus.connect(this.dry).connect(this.comp);
    this.bus.connect(this.reverb).connect(this.wet).connect(this.comp);
    this.comp.connect(this.master).connect(ctx.destination);
    this.applyRoom();
  }

  makeImpulse(seconds) {
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // early reflections + smooth exponential tail
        ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * (i < 400 ? 0.4 : 1);
      }
    }
    return buf;
  }

  setRoom(room) {
    this.room = room;
    if (this.ctx) this.applyRoom();
  }

  applyRoom() {
    const r = ROOMS[this.room] ?? ROOMS.room;
    const t = this.ctx.currentTime;
    if (r.seconds > 0) this.reverb.buffer = this.makeImpulse(r.seconds);
    this.wet.gain.setTargetAtTime(r.wet, t, 0.05);
    this.dry.gain.setTargetAtTime(1 - r.wet * 0.5, t, 0.05);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  load(song) {
    this.stop();
    this.notes = song.notes;
    this.duration = song.duration;
    // Normalise soft recordings so quiet playing is still audible
    const maxVel = song.notes.reduce((m, n) => Math.max(m, n.vel), 0.01);
    this.velScale = Math.min(2.2, 0.85 / maxVel);
  }

  get time() {
    if (!this.playing) return this.offset;
    return Math.min(this.duration, this.ctx.currentTime - this.startedAt);
  }

  async play(from = this.offset) {
    this.ensureContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.silence();

    this.offset = Math.max(0, Math.min(from, this.duration));
    this.startedAt = this.ctx.currentTime + 0.06 - this.offset;
    this.session = this.ctx.createGain();
    this.session.connect(this.bus);
    this.playing = true;

    // Notes already ringing at the start point are re-struck softly
    this.cursor = 0;
    while (this.cursor < this.notes.length && this.notes[this.cursor].start < this.offset) {
      const n = this.notes[this.cursor];
      if (n.end > this.offset + 0.05) this.voice(n, this.offset, 0.55);
      this.cursor++;
    }

    this.schedule();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.time;
    this.playing = false;
    clearInterval(this.timer);
    this.silence();
  }

  stop() {
    this.pause();
    this.offset = 0;
  }

  seek(t) {
    if (this.playing) this.play(t);
    else this.offset = Math.max(0, Math.min(t, this.duration));
  }

  silence() {
    if (!this.session) return;
    const s = this.session;
    const now = this.ctx.currentTime;
    s.gain.setTargetAtTime(0, now, 0.04);
    setTimeout(() => s.disconnect(), 400);
    this.session = null;
  }

  schedule() {
    if (!this.playing) return;
    const songNow = this.ctx.currentTime - this.startedAt;
    const horizon = songNow + LOOKAHEAD;
    while (this.cursor < this.notes.length && this.notes[this.cursor].start < horizon) {
      this.voice(this.notes[this.cursor], this.notes[this.cursor].start, 1);
      this.cursor++;
    }
    if (songNow >= this.duration + 0.8) {
      this.playing = false;
      this.offset = 0;
      clearInterval(this.timer);
      this.silence();
      this.onEnded?.();
    }
  }

  voice(n, songStart, gainScale) {
    const ctx = this.ctx;
    const t = Math.max(ctx.currentTime, this.startedAt + songStart);
    const end = Math.max(t + 0.03, this.startedAt + n.end);
    const f = midiToFreq(n.note);
    const vel = Math.min(1, n.vel * this.velScale);
    const amp = (0.05 + 0.32 * Math.pow(vel, 1.3)) * gainScale;

    // Pitch-dependent natural decay: bass rings for seconds, treble dies quickly
    const tau = 0.35 + 3.4 * Math.pow(1 - (n.note - 21) / 87, 1.8);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(amp, t + 0.004);
    out.gain.setTargetAtTime(amp * 0.28, t + 0.004, tau * 0.35); // fast initial drop
    out.gain.setTargetAtTime(0, t + 0.004 + tau * 0.5, tau);      // long tail
    out.gain.setTargetAtTime(0, end, 0.09);                       // damper

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    const bright = Math.min(16000, f * (3 + 14 * vel));
    filter.frequency.setValueAtTime(bright, t);
    filter.frequency.setTargetAtTime(Math.min(bright, f * 2.5 + 400), t, 0.7);
    filter.connect(out);

    for (const detune of [-2.5, 2.5]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this.wave);
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(end + 0.7);
    }

    // Hammer thump
    const hammer = ctx.createBufferSource();
    hammer.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(4000, f * 3);
    bp.Q.value = 1.2;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(amp * 0.35, t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    hammer.connect(bp).connect(hg).connect(out);
    hammer.start(t);
    hammer.stop(t + 0.05);

    out.connect(this.session);
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
