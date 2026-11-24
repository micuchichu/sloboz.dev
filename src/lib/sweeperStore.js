// Shared by the Minesweeper station's panel (the board you play) and its 3D
// scene (the N-cube floating beside it), so picking 2D, 3D or 4D on the page
// reshapes the cube in space.
import { useSyncExternalStore } from 'react';

let state = { dim: 4 };
const listeners = new Set();

export const sweeper = {
  get: () => state,
  setDim(dim) {
    if (dim === state.dim) return;
    state = { ...state, dim };
    listeners.forEach((l) => l());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const useSweeper = () => useSyncExternalStore(sweeper.subscribe, sweeper.get);

// The v1.0.0 release (what the downloads are)
export const RELEASE = {
  tag: 'v1.0.0',
  page: 'https://github.com/micuchichu/nd-minesweeper/releases/tag/v1.0.0',
  repo: 'https://github.com/micuchichu/nd-minesweeper',
  windows: 'https://github.com/micuchichu/nd-minesweeper/releases/download/v1.0.0/DimensionSweeper-Windows-x64.zip',
  mac: 'https://github.com/micuchichu/nd-minesweeper/releases/download/v1.0.0/DimensionSweeper-macOS.zip',
};
