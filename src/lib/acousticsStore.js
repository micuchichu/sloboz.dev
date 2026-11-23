// Shared state for the Acoustics station: track list, the piano engine and
// playback status. Both the 3D scene (inside the R3F canvas) and the DOM
// overlay read it through useAcoustics().
import { useSyncExternalStore } from 'react';
import { parseMidi } from './midi';
import { PianoEngine } from './pianoSynth';

// Every .mid file in /acoustics is bundled automatically.
const FILES = import.meta.glob('/acoustics/*.mid', { query: '?url', import: 'default', eager: true });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function describeFile(path) {
  const base = path.split('/').pop().replace(/\.mid$/i, '');
  const m = base.match(/^Clip (\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})$/); // Embers Piano naming
  if (m) {
    const [, y, mo, d, h, mi] = m;
    return { title: `Clip — ${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`, when: `${y}-${mo}-${d}T${h}:${mi}`, clock: `${h}:${mi}` };
  }
  // "song -artist" / "song - artist" → "song — artist"
  const [song, ...artist] = base.split(/\s+-\s*/);
  const clean = (t) => t.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const title = artist.length ? `${clean(song)} — ${clean(artist.join(' '))}` : clean(base);
  return { title, when: null, clock: null };
}

function readVolume() {
  try {
    const v = parseFloat(localStorage.getItem('sloboz-volume'));
    return Number.isFinite(v) ? v : 0.8;
  } catch {
    return 0.8;
  }
}

export const engine = new PianoEngine();

let state = {
  status: 'idle',      // idle | loading | ready | error
  tracks: [],          // [{ path, title, when, clock, song }]
  current: -1,         // index of the track on the piano, -1 = none
  playing: false,
  volume: readVolume(),
  room: 'room',
};
engine.setVolume(state.volume * state.volume);

const listeners = new Set();
function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

engine.onEnded = () => set({ playing: false, current: -1 });

let resumeAfterScrub = false;

export const acoustics = {
  get: () => state,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  async load() {
    if (state.status !== 'idle') return;
    set({ status: 'loading' });
    engine.loadSamples(); // the piano recordings load alongside the songs
    try {
      const list = await Promise.all(Object.entries(FILES).map(async ([path, url]) => {
        const buf = await fetch(url).then((r) => r.arrayBuffer());
        return { path, ...describeFile(path), song: parseMidi(buf) };
      }));
      list.sort((a, b) => (b.when ?? '').localeCompare(a.when ?? '') || a.title.localeCompare(b.title));
      set({ status: 'ready', tracks: list });
    } catch (e) {
      console.error(e);
      set({ status: 'error' });
    }
  },

  async play(index) {
    const track = state.tracks[index];
    if (!track) return;
    if (index !== state.current) engine.load(track.song);
    set({ current: index, playing: true });
    // Give the piano samples a moment if they're still on their way, rather than
    // starting on the synthesised piano and switching sound mid-piece
    await Promise.race([engine.loadSamples(), new Promise((r) => setTimeout(r, 4000))]);
    if (state.current !== index || !state.playing) return;
    await engine.play();
  },

  pause() {
    engine.pause();
    set({ playing: false });
  },

  toggle() {
    if (state.current < 0) return;
    if (state.playing) acoustics.pause();
    else acoustics.play(state.current);
  },

  // Jump to a point in the piece (keeps playing if it was)
  seek(t) {
    engine.seek(t);
  },

  // Dragging the position slider: silent while it moves (the keys still follow),
  // then carries on from where it was let go if it was playing before
  scrubStart() {
    resumeAfterScrub = state.playing;
    if (state.playing) engine.pause();
  },
  scrubTo(t) {
    engine.seek(t);
  },
  async scrubEnd(t) {
    engine.seek(t);
    if (resumeAfterScrub && state.current >= 0) await engine.play(t);
    resumeAfterScrub = false;
  },

  // Take the record off the piano
  eject() {
    engine.stop();
    set({ playing: false, current: -1 });
  },

  setVolume(v) {
    engine.setVolume(v * v); // perceptual curve
    try { localStorage.setItem('sloboz-volume', String(v)); } catch { /* private mode */ }
    set({ volume: v });
  },

  setRoom(room) {
    engine.setRoom(room);
    set({ room });
  },
};

export function useAcoustics() {
  return useSyncExternalStore(acoustics.subscribe, acoustics.get);
}

export const trackCount = Object.keys(FILES).length;
