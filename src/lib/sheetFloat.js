// How a loose sheet of music floats in the Acoustics station. Like paper in zero
// gravity: thrown, it keeps the throw's speed and slows down gradually; at rest it
// drifts into a band around the edge of the view, out of the middle where the
// piano stands. The band is in screen terms: x and y as fractions of the
// half-width and half-height of the view at the sheet's depth.
import * as THREE from 'three';

export const BAND_MIN = 0.62;      // keep out of this central ellipse
export const BAND_MAX = 0.9;       // ...and inside this one, so they stay in reach
export const BAND_BOTTOM = -0.84;  // a sheet's lower edge stays above the player bar...
export const BAND_TOP = 0.86;      // ...its upper edge below the header...
export const EDGE_MARGIN = 0.04;   // ...and its sides this far inside the frame
export const PIANO_ZONE_X = 0.44;  // the piano's patch of screen, as an ellipse round the middle
export const PIANO_ZONE_Y = 0.58;
export const DEPTH_MIN = 6.5;
export const DEPTH_MAX = 12.5;
export const HOME_PULL = 1.3;      // spring towards the band
export const DRIFT_DRAG = 2.3;     // drag at low speed (per second): settles without swinging past
export const AIR_DRAG = 0.12;      // ...plus this much per unit of speed, so fast throws stop sharply
export const SPIN_DRAG = 2.2;      // a spinning sheet catches the air too
export const MAX_THROW = 38;       // units per second
export const PIANO_CLEARANCE = 9;  // units around the piano's centre
export const SHEET_GAP = 3.3;      // sheets push apart when closer than this

const rel = new THREE.Vector3();
const home = new THREE.Vector3();
const push = new THREE.Vector3();

// The spot a sheet at p would rest at: its own spot, nudged into the band
export function restingSpot(p, env, out = home) {
  const { cam, fwd, right, up, aspect, tanHalfFov, index } = env;
  rel.copy(p).sub(cam);
  const depth = THREE.MathUtils.clamp(rel.dot(fwd), DEPTH_MIN, DEPTH_MAX);
  const halfH = depth * tanHalfFov, halfW = halfH * aspect;
  let sx = rel.dot(right) / halfW, sy = rel.dot(up) / halfH;
  let r = Math.hypot(sx, sy);
  if (r < 1e-3) { sx = Math.cos(index * 2.4 + 0.6); sy = Math.sin(index * 2.4 + 0.6); r = 1; }
  const goal = THREE.MathUtils.clamp(r, BAND_MIN, BAND_MAX);
  sx *= goal / r;
  sy *= goal / r;
  // The whole sheet stays on screen, not just its middle: below the header, above
  // the player bar, and clear of the side edges
  const ex = (env.sheetHalfW ?? 0) / halfW, ey = (env.sheetHalfH ?? 0) / halfH;
  const maxX = Math.max(0, 1 - EDGE_MARGIN - ex);
  sx = THREE.MathUtils.clamp(sx, -maxX, maxX);
  sy = THREE.MathUtils.clamp(sy, Math.min(0, BAND_BOTTOM + ey), Math.max(0, BAND_TOP - ey));
  // ...and no part of it over the piano: if its outline reaches into the piano's
  // patch of screen, slide it sideways (a wide screen always has room at the sides)
  const dy = Math.max(0, Math.abs(sy) - ey);
  if (dy < PIANO_ZONE_Y) {
    const needX = ex + PIANO_ZONE_X * Math.sqrt(1 - (dy / PIANO_ZONE_Y) ** 2);
    if (Math.abs(sx) < needX) sx = (sx === 0 ? (index % 2 ? -1 : 1) : Math.sign(sx)) * Math.min(maxX, needX);
  }
  return out.copy(cam).addScaledVector(fwd, depth).addScaledVector(right, sx * halfW).addScaledVector(up, sy * halfH);
}

// One step for a sheet at p moving at v (both changed in place).
// env: { cam, fwd, right, up, aspect, tanHalfFov, index, piano?, others: Vector3[] }
export function floatStep(p, v, env, dt) {
  v.addScaledVector(push.copy(restingSpot(p, env)).sub(p), HOME_PULL * dt);

  // Never through or right next to the piano
  if (env.piano) {
    push.copy(p).sub(env.piano);
    const dist = push.length();
    if (dist < PIANO_CLEARANCE) v.addScaledVector(push.normalize(), (PIANO_CLEARANCE - dist) * 6 * dt);
  }
  // ...or stacked on another sheet
  for (const o of env.others) {
    push.copy(p).sub(o);
    const dist = push.length();
    if (dist < SHEET_GAP) {
      if (dist < 1e-3) push.set(Math.cos(env.index), Math.sin(env.index), 0);
      v.addScaledVector(push.normalize(), (SHEET_GAP - dist) * 4 * dt);
    }
  }

  // Paper is all surface and no weight: air brakes a fast sheet hard (drag grows
  // with speed), then lets it glide the last bit
  v.multiplyScalar(Math.exp(-(DRIFT_DRAG + AIR_DRAG * v.length()) * dt));
  p.addScaledVector(v, dt);
}
