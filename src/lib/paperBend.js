// Sheets of music that bend like paper. A vertex shader displaces a subdivided
// plane; PaperFlex works out how much from the sheet's motion each frame:
// - moving face-first, the air holds the edges back and the sheet cups,
//   springing back (with a little wobble) when it stops;
// - sliding through the air edge-first, a ripple runs along it and the trailing
//   edge flaps;
// - at rest it keeps a slight lengthwise curl, as paper never lies quite flat.
// Kept subtle: even the hardest throw curves the edges by only about an eighth of the width.
import * as THREE from 'three';

const REST_CURL = 0.07;      // lengthwise curl at rest (units at the far edges)
const CUP_PER_SPEED = 0.016; // cupping per unit/s of face-on speed
const MAX_CUP = 0.26;
const FLEX_K = 70;           // paper stiffness...
const FLEX_DAMP = 7;         // ...and how quickly its wobble dies
const FLAP_PER_SPEED = 0.008;
const MAX_FLAP = 0.12;
const IDLE_FLAP = 0.012;     // a faint breathing ripple even when still

export const PAPER_SEGMENTS = [12, 16];

// Bend the plane geometry of a material. flip = -1 for the back face, which is
// the same geometry turned round: it bends with the front, not against it.
export function paperMaterial(material, uniforms, flip, halfW, halfH) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uBend = uniforms.uBend;
    sh.uniforms.uFlapDir = uniforms.uFlapDir;
    sh.uniforms.uFlip = { value: flip };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform vec4 uBend;      // x: cup across, y: curl along, z: flap size, w: flap phase
uniform vec2 uFlapDir;   // direction the sheet is sliding, in its own plane
uniform float uFlip;
float paperZ(vec2 p) {
  vec2 n = vec2(p.x * uFlip, p.y) / vec2(${halfW.toFixed(4)}, ${halfH.toFixed(4)});
  float s = dot(n, uFlapDir);   // +1 at the leading edge, -1 at the trailing one
  float z = uBend.x * n.x * n.x + uBend.y * n.y * n.y
          + uBend.z * sin(s * 2.6 - uBend.w) * (0.3 + 0.35 * (1.0 - s));
  return z * uFlip;
}`)
      .replace('#include <beginnormal_vertex>', `
  float pe = 0.02;
  float dzx = (paperZ(position.xy + vec2(pe, 0.0)) - paperZ(position.xy - vec2(pe, 0.0))) / (2.0 * pe);
  float dzy = (paperZ(position.xy + vec2(0.0, pe)) - paperZ(position.xy - vec2(0.0, pe))) / (2.0 * pe);
  vec3 objectNormal = normalize(vec3(-dzx, -dzy, 1.0));
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3(tangent.xyz);
  #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.xy, position.z + paperZ(position.xy));');
  };
  material.customProgramCacheKey = () => 'paper-sheet';
  return material;
}

export class PaperFlex {
  constructor(seed = 0) {
    this.uniforms = {
      uBend: { value: new THREE.Vector4(0, REST_CURL, IDLE_FLAP, seed) },
      uFlapDir: { value: new THREE.Vector2(0, 1) },
    };
    this.cup = 0;
    this.cupVel = 0;
    this.flap = IDLE_FLAP;
    this.phase = seed;
    this.dir = new THREE.Vector2(0, 1);
  }

  // vLocal: the sheet's velocity in its own frame (x across, y along, z out of the printed face)
  update(vLocal, dt, calm = false) {
    const inPlane = Math.hypot(vLocal.x, vLocal.y);
    const cupGoal = calm ? 0 : THREE.MathUtils.clamp(-CUP_PER_SPEED * vLocal.z, -MAX_CUP, MAX_CUP);
    // a spring, so the paper overshoots a touch and wobbles back
    this.cupVel += (FLEX_K * (cupGoal - this.cup) - FLEX_DAMP * this.cupVel) * dt;
    this.cup = THREE.MathUtils.clamp(this.cup + this.cupVel * dt, -MAX_CUP * 1.3, MAX_CUP * 1.3);

    const flapGoal = calm ? IDLE_FLAP : Math.min(MAX_FLAP, IDLE_FLAP + FLAP_PER_SPEED * inPlane);
    this.flap += (flapGoal - this.flap) * (1 - Math.exp(-6 * dt));
    if (inPlane > 0.3) {
      this.dir.lerp(new THREE.Vector2(vLocal.x / inPlane, vLocal.y / inPlane), 1 - Math.exp(-8 * dt)).normalize();
    }
    this.phase += dt * (2 + 0.5 * Math.min(inPlane, 30));

    const b = this.uniforms.uBend.value;
    b.set(this.cup, REST_CURL + this.cup * 0.45, this.flap, this.phase);
    this.uniforms.uFlapDir.value.copy(this.dir);
  }
}
