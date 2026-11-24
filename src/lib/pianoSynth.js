// Web Audio piano. Notes play from recorded samples of a real grand piano
// (Salamander Grand Piano, see SAMPLE_NAMES below) once they have loaded; until then,
// or if they can't be fetched, a synthesised voice stands in.
//
// The synthesised voice is modelled on a struck string rather than a plain wave:
// - its spectrum depends on where the hammer hits (about an eighth of the way
//   along, which leaves gaps around the 8th and 16th partials) and on how hard
//   (harder = more upper partials), and in the bass the fundamental is weaker
//   than the partials above it, as on a real piano;
// - two strings a cent or two apart, so the tone beats and drifts;
// - bass notes get their upper partials as separate, slightly sharp sines
//   (string stiffness stretches them), each dying away faster than the last;
// - a two-stage decay (a quick drop, then a long ring), longest in the bass;
// - a hammer knock of filtered noise, and a soundboard EQ on the whole piano.
// Notes are scheduled ahead of time with a small lookahead loop.

export const ROOMS = {
  dry: { label: 'Dry', seconds: 0, wet: 0 },
  room: { label: 'Room', seconds: 1.4, wet: 0.22 },
  hall: { label: 'Hall', seconds: 3.6, wet: 0.38 },
};

const LOOKAHEAD = 0.3;   // seconds of notes scheduled ahead
// In a background browser tab timers fire about once a second at best, so the
// music keeps going by queueing further ahead while the page is hidden
const HIDDEN_LOOKAHEAD = 3;
// Dynamics: a key struck as hard as the loudest note in the piece plays at PEAK;
// every step softer drops on a decibel scale, DYN_DB down at the faintest touch.
// A real piano spans roughly 30–40 dB from pianissimo to fortissimo.
const PEAK = 0.75;
const DYN_DB = 30;
const TICK_MS = 40;

// Salamander Grand Piano V3 by Alexander Holm (a Yamaha C5), CC BY 3.0: one
// recording every three semitones from A0 to C8, in public/samples/piano/.
// Credited in the Acoustics overlay; licence text next to the files.
const SAMPLE_NAMES = ['A0'];
for (let o = 1; o <= 7; o++) SAMPLE_NAMES.push(`C${o}`, `Ds${o}`, `Fs${o}`, `A${o}`);
SAMPLE_NAMES.push('C8');
const PITCH_CLASS = { C: 0, Ds: 3, Fs: 6, A: 9 };
const sampleMidi = (name) => {
  const [, pc, oct] = name.match(/^([A-Z]s?)(\d)$/);
  return 12 * (Number(oct) + 1) + PITCH_CLASS[pc];
};
// Level of the hardest note when playing from samples. The busiest 15 s of each
// piece peak around −2 dBFS at this level, with no clipping.
const SAMPLE_PEAK = 3.6;

// Decoded as they come, the recordings would take ~155 MB (bass notes ring for
// 25 s, in stereo at 48 kHz). Kept at 32 kHz, in mono (voices are panned by
// pitch instead) and cut at 10 s with a fade, they take ~30 MB.
const SAMPLE_RATE = 32000;
const MAX_SAMPLE_SECONDS = 10;
const FADE_SECONDS = 1.5;

// The recordings start with 10–30 ms of silence and weren't recorded at matched
// levels (peaks range from −10 to −22 dB). Each one is trimmed to 2 ms before the
// hammer lands, so chords sound together, and levelled to the same loudness over
// its first 0.3 s, the attack the ear judges a note by.
const ATTACK_RMS = 0.1;

function compactSample(buf) {
  const sr = buf.sampleRate;
  const chs = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const mono = (i) => {
    let v = 0;
    for (const ch of chs) v += ch[i];
    return v / chs.length;
  };
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(mono(i)));
  let onset = 0;
  while (onset < buf.length && Math.abs(mono(onset)) < peak * 0.05) onset++;
  const start = Math.max(0, onset - Math.floor(0.002 * sr));

  const len = Math.min(buf.length - start, Math.floor(MAX_SAMPLE_SECONDS * sr));
  const fade = Math.floor(FADE_SECONDS * sr);
  const cut = buf.length - start > len;
  let sum = 0;
  const win = Math.min(len, Math.floor(0.3 * sr));
  for (let i = 0; i < win; i++) sum += mono(start + i) ** 2;
  const gain = ATTACK_RMS / Math.max(1e-6, Math.sqrt(sum / win));

  const out = new AudioBuffer({ numberOfChannels: 1, length: len, sampleRate: sr });
  const o = out.getChannelData(0);
  for (let i = 0; i < len; i++) {
    let v = mono(start + i) * gain;
    if (cut && i > len - fade) v *= (len - i) / fade;
    o[i] = v;
  }
  return out;
}

// With every recording levelled, the register balance is set here: the bass a
// few dB fuller than middle C, the top a little lighter, as on the instrument
const SAMPLE_REGISTER = [[21, 3], [45, 2.5], [60, 0], [84, -0.5], [108, -1.5]];
function sampleRegisterDb(note) {
  for (let i = 1; i < SAMPLE_REGISTER.length; i++) {
    const [n1, d1] = SAMPLE_REGISTER[i];
    if (note <= n1) {
      const [n0, d0] = SAMPLE_REGISTER[i - 1];
      return d0 + ((d1 - d0) * (note - n0)) / (n1 - n0);
    }
  }
  return SAMPLE_REGISTER[SAMPLE_REGISTER.length - 1][1];
}

const midiToFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

const STRIKE = 1 / 8.2;    // hammer position along the string
const MAX_HZ = 9000;       // partials above this are left to the lowpass anyway
const STRETCH_BELOW = 48;  // notes under C3 get stretched (inharmonic) upper partials
const WAVE_PARTIALS = 5;   // ...for partials 6 and up
const STRETCH_MAX_K = 12;  // ...to 12 (the faint ones above stay harmonic, to save oscillators)

// Loudness by register, on top of the per-note level. Measured on what small
// speakers can play (above ~150 Hz): the bass comes out 2–6 dB fuller than
// middle C (a long string over a big soundboard), and the top is lifted to make
// up for the soundboard EQ and its quicker decay, so it falls off gently.
const REGISTER = [[21, 4], [33, 4], [45, 3], [60, 0], [72, 1.5], [84, 3.5], [96, 4.5], [108, 4]];
function registerDb(note) {
  for (let i = 1; i < REGISTER.length; i++) {
    const [n1, d1] = REGISTER[i];
    if (note <= n1) {
      const [n0, d0] = REGISTER[i - 1];
      return d0 + ((d1 - d0) * (note - n0)) / (n1 - n0);
    }
  }
  return REGISTER[REGISTER.length - 1][1];
}

// Strength of partial k of a note, for a strike of the given hardness (0–1)
function partialAmp(note, k, hard) {
  const comb = Math.abs(Math.sin(Math.PI * k * STRIKE));
  const tilt = Math.pow(k, -(0.85 + 0.95 * (1 - hard)));
  let a = comb * tilt;
  // In the bass the fundamental is weaker than the partials above it
  const deep = clamp01((45 - note) / 24);
  if (k === 1) a *= 1 - 0.45 * deep;
  if (k === 2) a *= 1 - 0.15 * deep;
  return a;
}

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
    this.samples = null;      // midi note → AudioBuffer, once loaded
    this.samplesReady = null; // promise, set by loadSamples()
  }

  // Fetch and decode the piano samples. Safe to call before any user gesture:
  // the audio context just stays suspended until play().
  loadSamples(base = './samples/piano/') {
    if (this.samplesReady) return this.samplesReady;
    this.ensureContext();
    // Decoding through a 32 kHz context resamples on the way in
    const decoder = new OfflineAudioContext(1, 1, SAMPLE_RATE);
    this.samplesReady = Promise.all(SAMPLE_NAMES.map(async (name) => {
      const data = await fetch(`${base}${name}.mp3`).then((r) => {
        if (!r.ok) throw new Error(`${name}: ${r.status}`);
        return r.arrayBuffer();
      });
      return [sampleMidi(name), compactSample(await decoder.decodeAudioData(data))];
    }))
      .then((pairs) => {
        this.samples = new Map(pairs);
        this.sampleKeys = pairs.map(([m]) => m);
        // A real recording needs none of the synth's soundboard shaping
        for (const f of Object.values(this.eq)) f.gain.setValueAtTime(0, this.ctx.currentTime);
        return true;
      })
      .catch((e) => {
        console.warn('Piano samples unavailable, using the synthesised piano:', e);
        return false;
      });
    return this.samplesReady;
  }

  ensureContext() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.waves = new Map(); // one wave per note and hardness step, made as needed

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
    // Only catches the peaks of big chords; anything gentler would squash the
    // difference between soft and loud playing
    this.comp.threshold.value = -9;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003;
    this.comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;

    // Soundboard: a little more body in the low end, less glare in the upper mids
    // and the very top, where a synthesised string sounds most electronic
    const body = ctx.createBiquadFilter();
    body.type = 'lowshelf';
    body.frequency.value = 170;
    body.gain.value = 4;
    const glare = ctx.createBiquadFilter();
    glare.type = 'peaking';
    glare.frequency.value = 2800;
    glare.Q.value = 0.8;
    glare.gain.value = -3;
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 6500;
    air.gain.value = -4;
    this.eq = { body, glare, air };
    this.bus.connect(body).connect(glare).connect(air);
    air.connect(this.dry).connect(this.comp);
    air.connect(this.reverb).connect(this.wet).connect(this.comp);
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
    // Velocities are read relative to the hardest note in the piece, so a softly
    // played recording still uses the whole range from faint to full
    const maxVel = song.notes.reduce((m, n) => Math.max(m, n.vel), 0.01);
    this.velScale = 1 / maxVel;
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
    const horizon = songNow + (document.hidden ? HIDDEN_LOOKAHEAD : LOOKAHEAD);
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

  // The partials a note's string makes, for a strike of hardness `hard` (0–1),
  // split into a wave (the low partials) and the stretched ones played as sines
  spectrum(note, hard) {
    const key = `${note}:${hard}`;
    let sp = this.waves.get(key);
    if (sp) return sp;
    const f = midiToFreq(note);
    const count = Math.max(2, Math.min(32, Math.floor(MAX_HZ / f)));
    const amps = [];
    for (let k = 1; k <= count; k++) amps.push(partialAmp(note, k, hard));
    // Scale by the energy of the main partials, so every note's body comes out
    // at about the same level whatever the register (the register curve is in voice())
    const main = amps.slice(0, 10);
    const norm = 0.9 / Math.sqrt(main.reduce((a, b) => a + b * b, 0));
    // Bass notes play partials 6–12 as their own stretched sines; the rest (the
    // low ones, and the faint ones above 12) stay in the shared wave
    const stretchedK = (k) => note < STRETCH_BELOW && k > WAVE_PARTIALS && k <= STRETCH_MAX_K;
    const imag = new Float32Array(count + 1);
    for (let k = 1; k <= count; k++) if (!stretchedK(k)) imag[k] = amps[k - 1] * norm;
    const wave = this.ctx.createPeriodicWave(new Float32Array(count + 1), imag, { disableNormalization: true });
    // String stiffness: partial k sits at k·f·√(1 + B·k²)
    const B = 0.00012 + 0.0003 * clamp01((note - 21) / 34);
    const stretched = [];
    for (let k = 1; k <= count; k++) {
      if (stretchedK(k)) stretched.push({ k, freq: k * f * Math.sqrt(1 + B * k * k), amp: amps[k - 1] * norm });
    }
    sp = { wave, stretched };
    this.waves.set(key, sp);
    return sp;
  }

  voice(n, songStart, gainScale) {
    if (this.samples) { this.sampledVoice(n, songStart, gainScale); return; }
    const ctx = this.ctx;
    const t = Math.max(ctx.currentTime, this.startedAt + songStart);
    const end = Math.max(t + 0.03, this.startedAt + n.end);
    const f = midiToFreq(n.note);
    const vel = Math.min(1, n.vel * this.velScale);

    // Register: the bass is louder and rings much longer, the top is a touch softer
    const low = clamp01((60 - n.note) / 39);   // 1 at A0, 0 from middle C up
    const high = clamp01((n.note - 60) / 48);  // 0 up to middle C, 1 at C8
    const pitchDb = registerDb(n.note);
    const amp = PEAK * Math.pow(10, (-(1 - vel) * DYN_DB + pitchDb) / 20) * gainScale;
    const pos = (n.note - 21) / 87;
    const tau = 0.4 + 7.5 * Math.pow(1 - pos, 2.2);  // ~8 s at A0, ~2.4 s at C4, <1 s up top
    const after = 0.3 + 0.2 * low;                    // level of the long ring after the first drop

    const attack = 0.002 + 0.004 * (1 - vel);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(amp, t + attack);
    out.gain.setTargetAtTime(amp * after, t + attack, tau * 0.22);   // prompt sound
    out.gain.setTargetAtTime(0, t + attack + tau * 0.6, tau);         // aftersound
    out.gain.setTargetAtTime(0, end, 0.08 + 0.22 * low);              // damper (slower on the big bass strings)

    // Bright at the strike, mellowing as it rings; never so dark that the bass loses its partials
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    const bright = Math.min(18000, Math.max(f * (2 + 16 * Math.pow(vel, 1.3)), 700 + 3200 * vel));
    const mellow = Math.min(bright, Math.max(f * (1.6 + 2 * vel), 380 + 1000 * vel));
    filter.frequency.setValueAtTime(bright, t);
    filter.frequency.setTargetAtTime(mellow, t + 0.01, 0.25 + 0.5 * vel + 0.6 * low);
    filter.connect(out);

    const hard = Math.round(vel * 5) / 5;
    const { wave, stretched } = this.spectrum(n.note, hard);
    const stopAt = end + 1 + 0.6 * low;

    // Two strings, a cent or two apart: the slow beating is most of what makes it sound acoustic
    const spread = 0.6 + Math.random() * 1.2;
    for (const detune of [-spread, spread]) {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = f;
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(filter);
      o.start(t);
      o.stop(stopAt);
    }

    // Bass: the stretched upper partials, each fading faster than the one below
    for (const p of stretched) {
      const o = ctx.createOscillator();
      o.frequency.value = p.freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(p.amp, t);
      g.gain.setTargetAtTime(0, t, (tau * 0.5) / (1 + 0.12 * p.k));
      o.connect(g).connect(filter);
      o.start(t);
      o.stop(Math.min(stopAt, t + 4 * tau));
    }

    // Hammer knock: higher and sharper for hard strikes, a soft thud in the bass
    const hammer = ctx.createBufferSource();
    hammer.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(4500, f * 4 + 250 + 900 * vel);
    bp.Q.value = 1.1;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(amp * (0.1 + 0.35 * vel), t);
    hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + 0.02 * low);
    hammer.connect(bp).connect(hg).connect(out);
    hammer.start(t);
    hammer.stop(t + 0.07);

    out.connect(this.session);
  }

  // A note from the recordings: the nearest sample, re-pitched by at most a
  // semitone and a half. The recording has a single strength, so softer touches
  // are both quieter (the same decibel curve as the synth) and darker.
  sampledVoice(n, songStart, gainScale) {
    const ctx = this.ctx;
    const t = Math.max(ctx.currentTime, this.startedAt + songStart);
    const end = Math.max(t + 0.03, this.startedAt + n.end);
    const vel = Math.min(1, n.vel * this.velScale);
    const amp = SAMPLE_PEAK * Math.pow(10, (-(1 - vel) * DYN_DB + sampleRegisterDb(n.note)) / 20) * gainScale;
    const low = clamp01((60 - n.note) / 39);

    let key = this.sampleKeys[0];
    for (const k of this.sampleKeys) if (Math.abs(k - n.note) < Math.abs(key - n.note)) key = k;

    const src = ctx.createBufferSource();
    src.buffer = this.samples.get(key);
    src.playbackRate.value = Math.pow(2, (n.note - key) / 12);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = Math.min(20000, 1100 + 18900 * Math.pow(vel, 2.2));

    const g = ctx.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.setTargetAtTime(0, end, 0.07 + 0.2 * low); // damper, slower on the bass strings

    // Spread across the stereo field the way the player hears it: bass left, treble right
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, (n.note - 64) / 44)) * 0.45;

    src.connect(filter).connect(g).connect(pan).connect(this.session);
    src.start(t);
    src.stop(Math.min(t + src.buffer.duration / src.playbackRate.value, end + 1.5));
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
