// Hand-drawn frame for the Sketch palette: a wobbly double pencil border that
// overshoots its corners, drawn just inside the paper, plus two folded corners. Three slightly
// different drawings are generated and shown in turn ("line boil"), the way
// hand-drawn animation flickers between redraws.
import React, { useMemo } from 'react';

export const FOLD_TR = 64; // top-right dog-ear, CSS px (matches the clip-path in index.css)
export const FOLD_BL = 44; // bottom-left dog-ear

// Small seeded PRNG so each panel draws the same way every time
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => n.toFixed(1);

// One pencil stroke from A to B: a gentle bow, a little jitter and a slight
// overshoot past each end, like a quickly ruled line
function stroke(x1, y1, x2, y2, rnd, wobble = 2.6, overshoot = 10) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
  const nx = -dy, ny = dx;
  const j = () => (rnd() - 0.5) * 2 * wobble;
  const o1 = rnd() * overshoot, o2 = rnd() * overshoot;
  const sx = x1 - dx * o1 + nx * j(), sy = y1 - dy * o1 + ny * j();
  const ex = x2 + dx * o2 + nx * j(), ey = y2 + dy * o2 + ny * j();
  const bow = (rnd() - 0.5) * Math.min(len * 0.02, 9);
  const t1 = 0.25 + rnd() * 0.15, t2 = 0.6 + rnd() * 0.15;
  const c1x = x1 + (x2 - x1) * t1 + nx * (bow + j()), c1y = y1 + (y2 - y1) * t1 + ny * (bow + j());
  const c2x = x1 + (x2 - x1) * t2 + nx * (bow + j()), c2y = y1 + (y2 - y1) * t2 + ny * (bow + j());
  return `M${f(sx)} ${f(sy)}C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(ex)} ${f(ey)}`;
}

// Every edge twice, so it reads as a sketched (not plotted) line
const twice = (a, b, rnd, w, o) => stroke(a[0], a[1], b[0], b[1], rnd, w, o) + stroke(a[0], a[1], b[0], b[1], rnd, w, o);

const poly = (pts) => `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;

const INSET = 10;     // the drawn border sits just inside the paper's edge
const HEAD_H = 40;    // matches .monitor-head height

function drawing(w, h, seed) {
  const rnd = mulberry32(seed);
  const T = FOLD_TR, B = FOLD_BL, I = INSET;
  // Border rectangle (its corners disappear under the folded flaps) and the
  // line under the window title
  const corners = [[I, I], [w - I, I], [w - I, h - I], [I, h - I]];
  let ink = '';
  for (let i = 0; i < 4; i++) ink += twice(corners[i], corners[(i + 1) % 4], rnd, 2.6, 7);
  ink += stroke(I + 2, HEAD_H, w - I - 2, HEAD_H, rnd, 2, 6);

  // The folded-over flaps (the back of the paper): two legs plus the fold line
  // along the cut edge, and a few hatch strokes
  const flapTR = [[w - T, 0], [w - T, T], [w, T]];
  const flapBL = [[0, h - B], [B, h - B], [B, h]];
  let flapInk = '';
  for (const fl of [flapTR, flapBL]) {
    flapInk += twice(fl[0], fl[1], rnd, 1.4, 3) + twice(fl[1], fl[2], rnd, 1.4, 3);
  }
  flapInk += stroke(w - T + 1.5, 1.5, w - 1.5, T - 1.5, rnd, 1, 0);
  flapInk += stroke(1.5, h - B + 1.5, B - 1.5, h - 1.5, rnd, 1, 0);
  // Hatching parallel to each fold line, inside the flap
  for (const s of [0.28, 0.46, 0.64, 0.8]) {
    flapInk += stroke(w - T + 3, T * s, w - T + T * (1 - s) - 2, T - 3, rnd, 1, 0);
  }
  for (const s of [0.34, 0.56, 0.76]) {
    flapInk += stroke(B * s, h - B + 3, B - 3, h - B * s - 2, rnd, 0.8, 0);
  }

  const shift = (pts, x, y) => pts.map(([px, py]) => [px + x, py + y]);
  return {
    ink,
    flapInk,
    flaps: poly(flapTR) + poly(flapBL),
    shadow: poly(shift(flapTR, -4, 4)) + poly(shift(flapBL, 4, -4)),
  };
}

export default function SketchFrame({ width, height, seed = 1 }) {
  const frames = useMemo(
    () => [0, 1, 2].map((k) => drawing(width, height, seed * 101 + k * 7919)),
    [width, height, seed]
  );
  return (
    <svg
      className="sketch-frame"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {frames.map((d, i) => (
        <g key={i} className="boil" style={{ animationDelay: `${-i * 0.18}s` }}>
          <path className="sketch-ink" d={d.ink} />
          <path className="sketch-shadow" d={d.shadow} />
          <path className="sketch-flap" d={d.flaps} />
          <path className="sketch-ink sketch-ink--thin" d={d.flapInk} />
        </g>
      ))}
    </svg>
  );
}
