// Colour palettes for the whole site. The CSS tokens for each one live in
// index.css under :root[data-palette='…']; the 3D scene reads the few colours
// it needs (accent, beacons, background) from here. The choice is remembered.
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { playThemeTransition } from './themeTransitions';

export const PALETTES = [
  { id: 'orbit', name: 'Orbit', accent: '#6ee7cf', beacon: '#e3ebf2', background: '#05070c' },
  { id: 'mono', name: 'Mono', accent: '#ffffff', beacon: '#bdbdbd', background: '#000000' },
  // Mono, but the windows become hand-drawn notebook pages
  { id: 'sketch', name: 'Sketch', accent: '#ffffff', beacon: '#bdbdbd', background: '#000000' },
  { id: 'signal', name: 'Signal', accent: '#ff6a3d', beacon: '#e9e7e2', background: '#050507' },
  { id: 'ice', name: 'Ice', accent: '#9db4ff', beacon: '#e6e9f7', background: '#06070e' },
  { id: 'halpha', name: 'H-alpha', accent: '#ff7a9c', beacon: '#f1e6ea', background: '#09060a' },
  { id: 'phosphor', name: 'Phosphor', accent: '#5dff8f', beacon: '#dcefe0', background: '#030604' },
  // The scene as a renderer's normal buffer: every surface coloured by the way it
  // faces (SpatialScene swaps the materials). Glow would wash the colours out.
  { id: 'normals', name: 'Normals', accent: '#ff8080', beacon: '#8080ff', background: '#07071a', normals: true, bloom: { threshold: 0.95, intensity: 0.3 } },
  // A sky survey plate: the sky as a photographic negative, black stars on grey
  // glass, marked up in red. The canvas is inverted in CSS, so its colours are
  // given here as their negatives.
  { id: 'plate', name: 'Plate', accent: '#ffffff', beacon: '#e3ebf2', background: '#1e1e1e' },
  // Night under sodium street lamps: one wavelength of light, so everything is
  // amber (a CSS filter on the canvas) and the windows are prefab concrete.
  { id: 'sodium', name: 'Sodium', accent: '#ffffff', beacon: '#e3ebf2', background: '#0b0b0b' },
];

const KEY = 'sloboz-palette';

function readSaved() {
  try {
    const id = localStorage.getItem(KEY);
    return PALETTES.find((p) => p.id === id) || PALETTES[0];
  } catch {
    return PALETTES[0];
  }
}

let current = readSaved();
const listeners = new Set();

function apply(p) {
  document.documentElement.dataset.palette = p.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.background);
}
apply(current);

export const getPalette = () => current;

export function setPalette(p) {
  if (p === current) return;
  // Each theme switches in with its own transition (themeTransitions.js). The
  // update has to land synchronously so the transition can capture the new page.
  playThemeTransition(p.id, () => flushSync(() => {
    current = p;
    apply(p);
    try { localStorage.setItem(KEY, p.id); } catch { /* private mode */ }
    listeners.forEach((l) => l());
  }));
}

// step = 1 for next, -1 for previous
export function cyclePalette(step = 1) {
  const i = PALETTES.indexOf(current);
  setPalette(PALETTES[(i + step + PALETTES.length) % PALETTES.length]);
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function usePalette() {
  return useSyncExternalStore(subscribe, getPalette);
}
