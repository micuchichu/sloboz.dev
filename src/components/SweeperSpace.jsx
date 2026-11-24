// The space around the Minesweeper station, built from the game's own pixel art.
// Beside the panel floats an N-cube that takes the shape of the board you're
// playing: a square in 2D, a cube in 3D, a tesseract turning through the fourth
// dimension in 4D. Player blobs walk its edges, flags stand on its corners, and
// behind it the campaign's merchant ships cruise past, the roulette turns and
// the orbital launcher drifts.
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { sweeper } from '../lib/sweeperStore';
import { usePalette } from '../lib/palettes';

const SPRITES = './minesweeper/sprites/';
const NAMES = [
  'blob-orange', 'blob-cyan', 'blob-pink', 'blob-green', 'blob-purple', 'blob-white', 'blob-red', 'blob-blue',
  'flag-red', 'flag-jade', 'banana', 'bubbles', 'radar', 'scrap',
  'ship-small', 'ship-mid', 'ship-big', 'roulette', 'launcher',
];

// ── the 4-cube: 16 corners at (±1, ±1, ±1, ±1), 32 edges between corners one coordinate apart
const CORNERS = Array.from({ length: 16 }, (_, i) => [0, 1, 2, 3].map((b) => ((i >> b) & 1 ? 1 : -1)));
const EDGES = [];
for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (i < j) EDGES.push([i, j, b]); }
const NEIGHBOURS = CORNERS.map((_, i) => [0, 1, 2, 3].map((b) => ({ j: i ^ (1 << b), axis: b })));

const CUBE_RADIUS = 1.7;
const PROJECT_DIST = 3.2; // eye distance in the fourth dimension

function pixelTexture(t) {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// A flag sheet has three frames side by side; each flag gets its own copy to wave on its own beat
function flagTexture(base) {
  const t = pixelTexture(base.clone());
  t.repeat.set(1 / 3, 1);
  return t;
}

export default function SweeperSpace({ isMobile, center }) {
  const loaded = useTexture(NAMES.map((n) => `${SPRITES}${n}.png`));
  const tex = useMemo(() => Object.fromEntries(NAMES.map((n, i) => [n, pixelTexture(loaded[i])])), [loaded]);
  const palette = usePalette();

  // ── N-cube lines
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(EDGES.length * 6), 3));
    return g;
  }, []);
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 }), []);
  const dotGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    return g;
  }, []);
  const dotMat = useMemo(() => new THREE.PointsMaterial({ size: 0.16, transparent: true, opacity: 0.9 }), []);
  useEffect(() => { lineMat.color.set(palette.accent); dotMat.color.set(palette.accent); }, [palette, lineMat, dotMat]);
  useEffect(() => () => { lineGeo.dispose(); lineMat.dispose(); dotGeo.dispose(); dotMat.dispose(); }, [lineGeo, lineMat, dotGeo, dotMat]);

  // How far each extra axis is unfolded (z for 3D, w for 4D), eased towards the chosen dimension
  const unfold = useRef({ z: 1, w: 1 });
  const projected = useMemo(() => CORNERS.map(() => new THREE.Vector3()), []);

  // ── players walking the edges, and flags planted on corners
  const walkers = useMemo(() => ['blob-orange', 'blob-cyan', 'blob-pink', 'blob-green', 'blob-purple'].map((name, k) => ({
    name, from: k * 3, to: (k * 3) ^ 1, t: Math.random(), speed: 0.35 + Math.random() * 0.25,
  })), []);
  const walkerRefs = useRef([]);
  const flags = useMemo(() => [
    { corner: 15, map: flagTexture(tex['flag-red']), beat: 0 },
    { corner: 0, map: flagTexture(tex['flag-jade']), beat: 0.4 },
    { corner: 6, map: flagTexture(tex['flag-red']), beat: 0.8 },
  ], [tex]);
  const flagRefs = useRef([]);
  useEffect(() => () => flags.forEach((f) => f.map.dispose()), [flags]);

  // ── background traffic and drifting pieces (positions relative to the cube's side of the panel)
  const ships = useMemo(() => [
    { name: 'ship-big', w: 7.2, h: 2.7, y: 6.5, z: -26, speed: 1.1, x0: -10 },
    { name: 'ship-mid', w: 4.6, h: 1.7, y: -5.5, z: -18, speed: -1.6, x0: 14 },
    { name: 'ship-small', w: 2.8, h: 1.4, y: 1.5, z: -32, speed: 2.1, x0: -30 },
  ], []);
  const shipRefs = useRef([]);
  const drifters = useMemo(() => [
    { name: 'banana', pos: [3.6, 3.6, -3], size: 0.7, spin: 0.6 },
    { name: 'bubbles', pos: [-2.8, -3.2, -2], size: 0.65, spin: -0.3 },
    { name: 'radar', pos: [3.4, -3.4, -5], size: 0.75, spin: 0.25 },
    { name: 'scrap', pos: [-3.4, 3.2, -6], size: 0.7, spin: -0.5 },
    { name: 'blob-white', pos: [1.2, 4.6, -9], size: 0.9, spin: 0.15 },
    { name: 'blob-red', pos: [-1.6, -4.8, -10], size: 0.9, spin: -0.12 },
    { name: 'blob-blue', pos: [4.6, 0.4, -12], size: 1, spin: 0.1 },
  ], []);
  const drifterRefs = useRef([]);
  const rouletteRef = useRef();
  const launcherRef = useRef();

  // The cube sits in the space beside the panel on wide screens, above it on phones
  const anchor = useMemo(() => new THREE.Vector3(...center), [center]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = clock.elapsedTime;
    const { dim } = sweeper.get();
    const u = unfold.current;
    u.z += ((dim >= 3 ? 1 : 0) - u.z) * (1 - Math.exp(-3 * dt));
    u.w += ((dim >= 4 ? 1 : 0) - u.w) * (1 - Math.exp(-3 * dt));

    // Turn the cube: two planes through the fourth axis, plus a slow turn in 3D
    const a = t * 0.32, b = t * 0.21, c = t * 0.17, tilt = 0.42;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const cc = Math.cos(c), sc = Math.sin(c), ct = Math.cos(tilt), st = Math.sin(tilt);
    CORNERS.forEach(([x0, y0, z0, w0], i) => {
      let x = x0, y = y0, z = z0 * u.z, w = w0 * u.w;
      // x–w and z–w rotations (only visible once w is unfolded)
      [x, w] = [x * ca - w * sa, x * sa + w * ca];
      [z, w] = [z * cb - w * sb, z * sb + w * cb];
      // perspective from the fourth dimension into three
      const k = PROJECT_DIST / (PROJECT_DIST - w * u.w * 0.9);
      x *= k; y *= k; z *= k;
      // ordinary turn and tilt (the 2D square still turns flat)
      [x, z] = [x * cc - z * sc, x * sc + z * cc];
      [y, z] = [y * ct - z * st, y * st + z * ct];
      projected[i].set(x, y, z).multiplyScalar(CUBE_RADIUS);
    });
    const lp = lineGeo.attributes.position.array;
    EDGES.forEach(([i, j], e) => {
      projected[i].toArray(lp, e * 6);
      projected[j].toArray(lp, e * 6 + 3);
    });
    lineGeo.attributes.position.needsUpdate = true;
    const dp = dotGeo.attributes.position.array;
    projected.forEach((p, i) => p.toArray(dp, i * 3));
    dotGeo.attributes.position.needsUpdate = true;

    // Walkers: along an edge, then on to a random neighbouring corner along an axis that's unfolded
    walkers.forEach((wk, k) => {
      wk.t += wk.speed * dt;
      if (wk.t >= 1) {
        wk.t = 0;
        const open = NEIGHBOURS[wk.to].filter(({ j, axis }) => j !== wk.from && (axis < 2 || (axis === 2 ? u.z > 0.5 : u.w > 0.5)));
        const next = open[Math.floor(Math.random() * open.length)] ?? { j: wk.from };
        wk.from = wk.to;
        wk.to = next.j;
      }
      const s = walkerRefs.current[k];
      if (s) {
        s.position.lerpVectors(projected[wk.from], projected[wk.to], wk.t);
        s.position.y += 0.32 + Math.abs(Math.sin(t * 8 + k)) * 0.08; // a little hop as they go
      }
    });

    // Flags wave through their three frames
    flags.forEach((f, k) => {
      const s = flagRefs.current[k];
      if (!s) return;
      f.map.offset.x = (Math.floor(t * 6 + f.beat * 3) % 3) / 3;
      s.position.copy(projected[f.corner]);
      s.position.y += 0.45;
    });

    ships.forEach((sh, k) => {
      const s = shipRefs.current[k];
      if (!s) return;
      const span = 70;
      let x = sh.x0 + sh.speed * t;
      x = ((x + span / 2) % span + span) % span - span / 2;
      s.position.set(x, sh.y + Math.sin(t * 0.5 + k) * 0.25, sh.z);
      s.scale.x = sh.speed < 0 ? -sh.w : sh.w; // flip the ones flying the other way
    });

    drifters.forEach((d, k) => {
      const s = drifterRefs.current[k];
      if (!s) return;
      s.position.set(
        d.pos[0] + Math.sin(t * 0.3 + k * 1.7) * 0.4,
        d.pos[1] + Math.cos(t * 0.25 + k) * 0.35,
        d.pos[2],
      );
      s.material.rotation += d.spin * dt;
    });
    if (rouletteRef.current) rouletteRef.current.material.rotation -= 0.12 * dt;
    if (launcherRef.current) launcherRef.current.position.y = -7.5 + Math.sin(t * 0.4) * 0.3;
  });

  const sprite = (name, key, props = {}) => (
    <sprite key={key} {...props}>
      <spriteMaterial map={tex[name]} transparent depthWrite={false} color="#e6e6e6" />
    </sprite>
  );

  return (
    <group position={anchor}>
      {/* the N-cube */}
      <lineSegments geometry={lineGeo} material={lineMat} />
      <points geometry={dotGeo} material={dotMat} />
      {walkers.map((w, k) => sprite(w.name, w.name, { ref: (el) => { walkerRefs.current[k] = el; }, scale: [0.62, 0.62, 1] }))}
      {flags.map((f, k) => (
        <sprite key={k} ref={(el) => { flagRefs.current[k] = el; }} scale={[0.7, 0.7, 1]}>
          <spriteMaterial map={f.map} transparent depthWrite={false} color="#e6e6e6" />
        </sprite>
      ))}

      {/* drifting pieces */}
      {drifters.map((d, k) => sprite(d.name, d.name, { ref: (el) => { drifterRefs.current[k] = el; }, scale: [d.size, d.size, 1] }))}

      {/* the campaign in the background */}
      {ships.map((sh, k) => sprite(sh.name, sh.name, { ref: (el) => { shipRefs.current[k] = el; }, scale: [sh.w, sh.h, 1] }))}
      {sprite('roulette', 'roulette', { ref: rouletteRef, position: isMobile ? [-3, 9, -24] : [-20, 8, -28], scale: [5, 5, 1] })}
      {sprite('launcher', 'launcher', { ref: launcherRef, position: isMobile ? [2.5, -7.5, -16] : [6, -7.5, -16], scale: [4, 2, 1] })}
    </group>
  );
}

export const preloadSweeperSprites = () => NAMES.forEach((n) => useTexture.preload(`${SPRITES}${n}.png`));
