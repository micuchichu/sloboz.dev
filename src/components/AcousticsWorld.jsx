// The Acoustics station: an old upright piano on a dark "stage" (just light
// and darkness, no set), light bricks growing out of its keys like a reverse
// waterfall, and the recordings as sheet music drifting around the viewer.
// Click a sheet (or drag it onto the piano) to play it, or throw it around; drag elsewhere to orbit.
//
// Piano model: "Old Piano" by paraverun, CC BY 4.0
// https://sketchfab.com/3d-models/old-piano-8b6b1487054a4a1b9a640387f5b819c2
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { acoustics, engine, useAcoustics } from '../lib/acousticsStore';
import { getPalette } from '../lib/palettes';
import { floatStep, restingSpot, BAND_MIN, BAND_MAX, SPIN_DRAG, MAX_THROW } from '../lib/sheetFloat';
import { PaperFlex, paperMaterial, PAPER_SEGMENTS } from '../lib/paperBend';

const WHITE_KEY = new THREE.Color('#f1ede4');
const WHITE_KEY_DOWN = new THREE.Color('#a9a396');
const BLACK_KEY = new THREE.Color('#17140f');
// Pressed black keys lift towards a warm grey so they read against the dark case
const BLACK_KEY_DOWN = new THREE.Color('#6a6054');

const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(60) / 2);

// Piano placement inside the station (pushed back and down from the focus point)
const PIANO_POS = [0, -8.6, -6];
const PIANO_YAW = -0.42;

// ───────────────────────── model + keyboard layout (piano-local units) ─────────────────────────
// The model is in centimetres; its flat keyboard spans x ±63.1, sits at y ≈ 60.6
// and runs from z 8.9 (back) to 20.2 (front). We hide it and lay 88 animated keys
// exactly on top, scaling the model so its keyboard matches ours.
const MODEL_URL = './models/old-piano/scene.gltf';
const KEYS_W = 13.4;
const MODEL_SCALE = KEYS_W / 126.2;
const cm = (v) => v * MODEL_SCALE;

const LOW = 21, HIGH = 108;              // full 88 keys, A0–C8
const BLACK = new Set([1, 3, 6, 8, 10]);
const WW = KEYS_W / 52;
const WHITE_TOP = cm(60.6);              // top surface of the white keys
const WHITE_H = 0.22, BLACK_H = 0.23;
const BLACK_TOP = WHITE_TOP + 0.13;     // same bottom as before, a lower top
const WHITE_LEN = cm(20.2 - 8.9), BLACK_LEN = WHITE_LEN * 0.62;
const KEY_BACK = cm(8.9);
const WHITE_Z = KEY_BACK + WHITE_LEN / 2, BLACK_Z = KEY_BACK + BLACK_LEN / 2;
const MAX_ANGLE = 0.09;                  // key dip when fully pressed (radians)


const KEYS = (() => {
  const list = [];
  let wi = 0;
  for (let n = LOW; n <= HIGH; n++) {
    if (BLACK.has(n % 12)) list.push({ note: n, black: true, x: -KEYS_W / 2 + wi * WW });
    else { list.push({ note: n, black: false, x: -KEYS_W / 2 + wi * WW + WW / 2 }); wi++; }
  }
  return list;
})();
const KEY_BY_NOTE = new Map(KEYS.map((k) => [k.note, k]));

// Where a sheet rests when it's playing (on the music desk, piano-local)
const DESK_POS = new THREE.Vector3(0, cm(66) + 1.7, cm(11));

// ───────────────────────── procedural textures ─────────────────────────

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function glowTexture() {
  return canvasTex(256, 256, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,236,214,0.55)');
    g.addColorStop(0.45, 'rgba(255,214,170,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

// Sheet music engraved from the recording itself: the first bars of the MIDI
// laid out on grand staves.
const whiteIndex = (n) => {
  const oct = Math.floor(n / 12), pc = n % 12;
  return oct * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc];
};

function sheetTexture(track) {
  return canvasTex(512, 724, (ctx, w, h) => {
    // paper
    ctx.fillStyle = '#efe8d8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '120,100,70' : '255,255,255'},${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    const edge = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(90,70,40,0.18)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);

    // header
    ctx.fillStyle = '#211c17';
    ctx.textAlign = 'center';
    ctx.font = '400 34px "Instrument Serif", serif';
    const [main, sub] = track.title.split(' — ');
    ctx.fillText(main, w / 2, 62);
    ctx.font = '500 12px "JetBrains Mono", monospace';
    if (sub) ctx.fillText(sub.toUpperCase(), w / 2, 84);
    ctx.textAlign = 'right';
    ctx.fillText('sloboz', w - 40, 112);
    ctx.textAlign = 'left';
    ctx.fillText('Piano', 40, 112);

    // grand staves
    const SP = 8;                     // line spacing
    const systems = 4, sysH = 112, top0 = 140, x0 = 46, x1 = w - 40;
    const secPerSystem = 5;
    const notes = track.song.notes;
    ctx.strokeStyle = '#2b2520';
    ctx.fillStyle = '#211c17';
    for (let s = 0; s < systems; s++) {
      const trebleTop = top0 + s * sysH;
      const bassTop = trebleTop + SP * 4 + 26;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(x0, trebleTop + i * SP); ctx.lineTo(x1, trebleTop + i * SP); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, bassTop + i * SP); ctx.lineTo(x1, bassTop + i * SP); ctx.stroke();
      }
      // system bracket + barlines
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, trebleTop); ctx.lineTo(x0, bassTop + SP * 4); ctx.stroke();
      ctx.lineWidth = 1;
      for (let b = 1; b <= 4; b++) {
        const bx = x0 + 22 + ((x1 - x0 - 22) * b) / 4;
        ctx.beginPath(); ctx.moveTo(bx, trebleTop); ctx.lineTo(bx, bassTop + SP * 4); ctx.stroke();
      }
      // notes for this system's time window
      const t0 = s * secPerSystem, t1 = t0 + secPerSystem;
      for (const n of notes) {
        if (n.start < t0) continue;
        if (n.start >= t1) break;
        const x = x0 + 30 + ((n.start - t0) / secPerSystem) * (x1 - x0 - 44);
        const step = whiteIndex(n.note) - whiteIndex(60);     // diatonic steps from middle C
        let y;
        if (n.note >= 60) y = trebleTop + SP * 4 - (step - 2) * (SP / 2);  // E4 on bottom line
        else y = bassTop - (step + 2) * (SP / 2);                         // A3 on top line
        y = Math.max(trebleTop - SP * 3, Math.min(bassTop + SP * 7, y));
        ctx.beginPath();
        ctx.ellipse(x, y, 4.6, 3.3, -0.35, 0, Math.PI * 2);
        ctx.fill();
        const up = n.note < 71 && n.note >= 60 || n.note < 50;
        ctx.beginPath();
        ctx.moveTo(x + (up ? 4.2 : -4.2), y);
        ctx.lineTo(x + (up ? 4.2 : -4.2), y + (up ? -24 : 24));
        ctx.stroke();
      }
    }

    // Footnote, pencilled in at the bottom of the page
    ctx.save();
    ctx.translate(w / 2, h - 74);
    ctx.rotate(-0.025);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a2f26';
    ctx.font = 'italic 400 24px "Instrument Serif", serif';
    ctx.fillText('idk music theory.', 0, 0);
    ctx.fillText('this is some random bullshit', 0, 28);
    ctx.restore();
  });
}

// ───────────────────────── the piano ─────────────────────────

// The three pedals are one mesh. Pull the right one (sustain) out into its own
// mesh on a hinge at its back end so it can be pressed. Coordinates are the
// mesh's local units: x across, -y towards the player, z up.
const PEDAL_SPLIT_X = 0.03;
const PEDAL_ANGLE = 0.14; // ~1 cm of travel at the tip

function splitSustainPedal(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const index = geo.index;
  if (!index) return null;
  const keep = [];
  const pedal = [];
  let maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    const right = pos.getX(a) > PEDAL_SPLIT_X && pos.getX(b) > PEDAL_SPLIT_X && pos.getX(c) > PEDAL_SPLIT_X;
    (right ? pedal : keep).push(a, b, c);
    if (right) for (const v of [a, b, c]) {
      maxY = Math.max(maxY, pos.getY(v));
      minZ = Math.min(minZ, pos.getZ(v));
      maxZ = Math.max(maxZ, pos.getZ(v));
    }
  }
  if (!pedal.length) return null;
  const rest = geo.clone();
  rest.setIndex(keep);
  mesh.geometry = rest;

  // Hinge at the pedal's back end, halfway up its thickness
  const pivot = new THREE.Vector3(0, maxY, (minZ + maxZ) / 2);
  const pedalGeo = geo.clone();
  pedalGeo.setIndex(pedal);
  pedalGeo.translate(-pivot.x, -pivot.y, -pivot.z);
  const hinge = new THREE.Group();
  hinge.position.copy(pivot);
  hinge.add(new THREE.Mesh(pedalGeo, mesh.material));
  mesh.parent.add(hinge);
  return hinge;
}

function PianoModel({ pedalRef }) {
  const { scene } = useGLTF(MODEL_URL);
  const { model, hinge } = useMemo(() => {
    const m = scene.clone(true);
    let pedals = null;
    m.traverse((o) => {
      if (!o.isMesh) return;
      const owner = o.parent?.name || '';
      // the model's own (static) keyboard is replaced by our animated keys
      if (owner === 'Cube.002' || owner === 'Cube002') o.visible = false;
      if (owner === 'Cube.004' || owner === 'Cube004') pedals = o;
    });
    return { model: m, hinge: pedals ? splitSustainPedal(pedals) : null };
  }, [scene]);
  useEffect(() => {
    pedalRef.current = hinge;
    return () => { if (pedalRef.current === hinge) pedalRef.current = null; };
  }, [hinge, pedalRef]);
  return <primitive object={model} scale={MODEL_SCALE} />;
}

function Piano({ onClick, hoverable, pianoRef, showModel, children }) {
  const whiteRef = useRef();
  const blackRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  // Per-key animation state: current depth (0..1), target, press speed
  const depth = useMemo(() => new Float32Array(128), []);
  const target = useMemo(() => new Uint8Array(128), []);
  const speed = useMemo(() => new Float32Array(128).fill(12), []);
  const pedalRef = useRef(null);
  const pedalDepth = useRef(0);

  const mats = useMemo(() => ({
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }),
  }), []);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const whites = useMemo(() => KEYS.filter((k) => !k.black), []);
  const blacks = useMemo(() => KEYS.filter((k) => k.black), []);
  const whiteIdx = useMemo(() => new Map(whites.map((k, i) => [k.note, i])), [whites]);
  const blackIdx = useMemo(() => new Map(blacks.map((k, i) => [k.note, i])), [blacks]);

  // Keys pivot near their back end, so pressing dips the front
  const placeKey = (k, d) => {
    const len = k.black ? BLACK_LEN : WHITE_LEN;
    const baseY = k.black ? BLACK_TOP - BLACK_H / 2 : WHITE_TOP - WHITE_H / 2;
    const z = k.black ? BLACK_Z : WHITE_Z;
    const a = d * MAX_ANGLE;
    dummy.position.set(k.x, baseY - Math.sin(a) * (len / 2), z);
    dummy.rotation.set(a, 0, 0);
    dummy.updateMatrix();
    const mesh = k.black ? blackRef.current : whiteRef.current;
    const i = k.black ? blackIdx.get(k.note) : whiteIdx.get(k.note);
    mesh.setMatrixAt(i, dummy.matrix);
    tmpColor.copy(k.black ? BLACK_KEY : WHITE_KEY).lerp(k.black ? BLACK_KEY_DOWN : WHITE_KEY_DOWN, d);
    mesh.setColorAt(i, tmpColor);
  };

  // Lay out every key the first time we render with a given mesh (also after hot reloads)
  const initFor = useRef(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (initFor.current !== whiteRef.current) {
      KEYS.forEach((k) => placeKey(k, depth[k.note]));
      for (const m of [whiteRef.current, blackRef.current]) {
        m.instanceMatrix.needsUpdate = true;
        m.instanceColor.needsUpdate = true;
      }
      initFor.current = whiteRef.current;
    }
    const s = acoustics.get();
    target.fill(0);
    let pedalGoal = 0;
    if (s.current >= 0) {
      const song = s.tracks[s.current]?.song;
      const t = engine.time;
      if (song && (s.playing || t > 0)) {
        for (const p of song.pedals || []) {
          if (p.start > t) break;
          if (p.end > t) { pedalGoal = 1; break; }
        }
        const scale = engine.velScale || 1;
        for (const n of song.notes) {
          if (n.start > t) break;
          // Keys follow the fingers (key-up), not the pedal-sustained sound
          if (n.release > t) {
            target[n.note] = 1;
            // Harder notes go down faster: ~70 ms for a soft touch, ~15 ms for a hard strike
            speed[n.note] = 14 + Math.min(1, n.vel * scale) * 60;
          }
        }
      }
    }
    // Sustain pedal: a foot goes down a little slower than it lets go
    const pd = pedalDepth.current;
    if (pd !== pedalGoal) {
      pedalDepth.current = pedalGoal > pd ? Math.min(1, pd + 8 * dt) : Math.max(0, pd - 11 * dt);
    }
    if (pedalRef.current) pedalRef.current.rotation.x = pedalDepth.current * PEDAL_ANGLE;

    let dirty = false;
    for (let n = LOW; n <= HIGH; n++) {
      const goal = target[n];
      const cur = depth[n];
      if (cur === goal) continue;
      const next = goal > cur ? Math.min(1, cur + speed[n] * dt) : Math.max(0, cur - 9 * dt); // release springs back
      depth[n] = next;
      placeKey(KEY_BY_NOTE.get(n), next);
      dirty = true;
    }
    if (dirty) {
      for (const m of [whiteRef.current, blackRef.current]) {
        m.instanceMatrix.needsUpdate = true;
        m.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group
      ref={pianoRef}
      position={PIANO_POS}
      rotation={[0, PIANO_YAW, 0]}
      onClick={(e) => { if (!onClick || e.delta > 4) return; e.stopPropagation(); onClick(); }}
      onPointerOver={() => { if (hoverable) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { if (hoverable) document.body.style.cursor = 'auto'; }}
    >
      {/* The 2.5 MB model only downloads once someone actually visits this station */}
      {showModel && (
        <Suspense fallback={null}>
          <PianoModel pedalRef={pedalRef} />
        </Suspense>
      )}
      <instancedMesh ref={whiteRef} args={[undefined, mats.white, whites.length]}>
        <boxGeometry args={[WW * 0.93, WHITE_H, WHITE_LEN]} />
      </instancedMesh>
      <instancedMesh ref={blackRef} args={[undefined, mats.black, blacks.length]}>
        <boxGeometry args={[WW * 0.56, BLACK_H, BLACK_LEN]} />
      </instancedMesh>
      {children}
    </group>
  );
}

// ───────────────────────── light bricks: a reverse waterfall ─────────────────────────

const BRICKS = 320;

// Additive bricks whose fade is a soft edge sweeping from the top down (aFade 0 → 1)
const brickMaterial = () => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  vertexShader: /* glsl */ `
    attribute float aFade;
    varying float vY;
    varying float vFade;
    varying vec3 vColor;
    void main() {
      vY = position.y;
      vFade = aFade;
      #ifdef USE_INSTANCING_COLOR
        vColor = instanceColor;
      #else
        vColor = vec3(1.0);
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vY;
    varying float vFade;
    varying vec3 vColor;
    void main() {
      float edge = mix(0.85, -0.85, vFade);
      float a = 1.0 - smoothstep(edge - 0.35, edge, vY);
      gl_FragColor = vec4(vColor * a, 1.0);
    }
  `,
});
const RISE_SPEED = 2.4;     // units per second
const FADE_TIME = 1.4;      // fade-out at the end of a brick's climb

function Bricks() {
  const meshRef = useRef();
  const material = useMemo(brickMaterial, []);
  const fade = useMemo(() => new Float32Array(BRICKS), []);
  useEffect(() => () => material.dispose(), [material]);
  const pool = useMemo(() => Array.from({ length: BRICKS }, () => ({
    alive: false, age: 0, rise: 2, h: 1, w: 0.2, x: 0, y: 0, z: 0, drift: 0, detach: 0,
    vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, sx: 0, sy: 0, sz: 0, color: new THREE.Color(), bright: 1,
  })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  const cursor = useRef({ song: null, index: 0, lastT: 0, next: 0 });

  useEffect(() => {
    const m = meshRef.current;
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    for (let i = 0; i < BRICKS; i++) {
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tmp.setRGB(0, 0, 0));
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }, [dummy, tmp]);

  const emit = (n) => {
    const k = KEY_BY_NOTE.get(n.note);
    if (!k) return;
    const c = cursor.current;
    const b = pool[c.next];
    c.next = (c.next + 1) % BRICKS;
    const vel = Math.min(1, n.vel * (engine.velScale || 1));
    b.alive = true;
    b.age = 0;
    b.rise = 1.8 + Math.random() * 0.6;   // seconds before it starts fading
    // Chunky bricks: length follows the note's duration, but stays brick-shaped
    b.h = THREE.MathUtils.clamp(0.25 + (n.release - n.start) * 0.45, 0.25, 1.6);
    b.w = (k.black ? WW * 0.62 : WW * 0.9);
    b.x = k.x;
    // Grows out of the key surface: `top` starts there and the brick extends upward
    b.base = k.black ? BLACK_TOP : WHITE_TOP;
    b.top = b.base;
    // Every brick leaves the keys on the same plane (it sits over the black keys
    // too); about half then drift a little towards the player or back.
    b.z = WHITE_Z;
    b.drift = Math.random() < 0.5 ? (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.18) : 0;
    b.detach = b.h / RISE_SPEED; // fully out of the key: only then may it wander
    b.rx = b.ry = b.rz = 0;
    // Additive, so this is also the brick's opacity: harder notes glow more
    b.bright = 0.3 + vel * 0.4;
    b.color.set(getPalette().accent);
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const st = acoustics.get();
    const c = cursor.current;

    if (st.playing && st.current >= 0) {
      const song = st.tracks[st.current].song;
      const t = engine.time;
      // A new song or a jump (the position slider): pick up from the new spot
      // instead of firing every note that was skipped over
      if (song !== c.song || t < c.lastT - 0.05 || t > c.lastT + 0.5) {
        c.song = song;
        c.index = 0;
        while (c.index < song.notes.length && song.notes[c.index].start <= t) c.index++;
      }
      let budget = 12;
      while (c.index < song.notes.length && song.notes[c.index].start <= t && budget-- > 0) {
        emit(song.notes[c.index]);
        c.index++;
      }
      c.lastT = t;
    }

    const m = meshRef.current;
    let dirty = false;
    for (let i = 0; i < BRICKS; i++) {
      const b = pool[i];
      if (!b.alive) continue;
      dirty = true;
      b.age += dt;
      // Straight up the whole time; nothing ever shows below the key surface
      b.top += RISE_SPEED * dt;
      const bottom = Math.max(b.base, b.top - b.h);
      const visible = b.top - bottom;
      let f = 0;
      if (b.age > b.rise) {
        f = (b.age - b.rise) / FADE_TIME;
        if (f >= 1) {
          b.alive = false;
          fade[i] = 0;
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix);
          continue;
        }
      }
      fade[i] = f;

      // Ease into the drift so the brick doesn't snap sideways as it leaves the key
      const free = Math.max(0, b.age - b.detach);
      const wander = b.drift * (free - (1 - Math.exp(-free * 3)) / 3);
      dummy.position.set(b.x, (b.top + bottom) / 2, b.z + wander);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(b.w, Math.max(0.0001, visible), 0.26);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, tmp.copy(b.color).multiplyScalar(b.bright));
    }
    if (dirty) {
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
      m.geometry.attributes.aFade.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, BRICKS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-aFade" args={[fade, 1]} />
      </boxGeometry>
    </instancedMesh>
  );
}

// ───────────────────────── sheet music drifting around the viewer ─────────────────────────

const SHEET_W = 2.3, SHEET_H = 3.25;

// Loose sheets float, get thrown and keep out of the way: see lib/sheetFloat.js

function Sheet({ index, track, total, active, playingIndex, pianoRef, bodies }) {
  const outer = useRef();
  const [hover, setHover] = useState(false);
  const drag = useRef(null);
  const pos = useRef(null);
  const vel = useRef(new THREE.Vector3());
  const spin = useRef(new THREE.Vector3());
  const size = useThree((s) => s.size);
  const tmp = useMemo(() => ({
    target: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(),
    v: new THREE.Vector3(), m: new THREE.Matrix4(), up: new THREE.Vector3(0, 1, 0), box: new THREE.Box3(),
    cam: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), base: new THREE.Vector3(),
    rel: new THREE.Vector3(), home: new THREE.Vector3(), piano: new THREE.Vector3(), push: new THREE.Vector3(),
    dq: new THREE.Quaternion(), axis: new THREE.Vector3(),
    prev: new THREE.Vector3(), frameVel: new THREE.Vector3(), local: new THREE.Vector3(), inv: new THREE.Quaternion(),
  }), []);
  const flex = useMemo(() => new PaperFlex(index * 1.7), [index]);
  // Shared with the other sheets, so they can keep their distance
  useEffect(() => {
    bodies.current[index] = { pos };
    return () => { delete bodies.current[index]; };
  }, [bodies, index]);
  const controls = useThree((st) => st.controls);
  const onDesk = playingIndex === index;

  const mats = useMemo(() => {
    const map = sheetTexture(track);
    // Matte paper: Lambert is purely diffuse, so the stage lights scatter off it
    // instead of leaving a sheen over the notes. A little self-light keeps it
    // readable from any angle, kept under the bloom threshold so ink stays crisp.
    const front = new THREE.MeshLambertMaterial({ map, color: '#c4beb2', emissiveMap: map, emissive: '#a39d91', emissiveIntensity: 0.3, side: THREE.FrontSide });
    const back = new THREE.MeshLambertMaterial({ color: '#d9d1c0', side: THREE.FrontSide });
    // Both faces bend together, like one sheet of paper (lib/paperBend.js)
    paperMaterial(front, flex.uniforms, 1, SHEET_W / 2, SHEET_H / 2);
    paperMaterial(back, flex.uniforms, -1, SHEET_W / 2, SHEET_H / 2);
    return { front, back };
  }, [track, flex]);
  useEffect(() => () => { mats.front.map.dispose(); mats.front.dispose(); mats.back.dispose(); }, [mats]);
  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);

  useFrame(({ clock, camera }, delta) => {
    const g = outer.current;
    if (!g) return;
    // Floating sheets only exist inside the station; otherwise they would trail
    // the camera across the map. On return they grow back in front of the viewer.
    if (!active && !onDesk && !drag.current) {
      g.visible = false;
      pos.current = null;
      tmp.prev.set(0, 0, 0);      // reappearing elsewhere isn't motion: don't let it bend the paper
      tmp.frameVel.set(0, 0, 0);
      g.scale.setScalar(0.001);
      return;
    }
    g.visible = true;
    // viewer position + axes in this group's (unrotated) space
    tmp.cam.copy(camera.position);
    g.parent.worldToLocal(tmp.cam);
    tmp.fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tmp.base.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const dt = Math.min(delta, 0.1);
    const time = clock.elapsedTime;

    const aspect = size.width / size.height;
    // Smaller while floating on narrow (portrait) screens; full size on the desk
    // (down to half size on a portrait phone, so four sheets still fit round the piano)
    const fit = onDesk ? 1 : THREE.MathUtils.clamp(aspect / 1.1, 0.5, 1);
    const env = {
      cam: tmp.cam, fwd: tmp.fwd, right: tmp.right, up: tmp.base, aspect, tanHalfFov: TAN_HALF_FOV, index,
      sheetHalfW: (SHEET_W / 2) * fit, sheetHalfH: (SHEET_H / 2) * fit, piano: null, others: [],
    };
    if (!pos.current) {
      // First appearance: spread round the band, in front of the viewer
      const a = (index / Math.max(1, total)) * Math.PI * 2 + 0.6;
      const depth = 9;
      const halfH = depth * TAN_HALF_FOV, halfW = halfH * aspect;
      const r = (BAND_MIN + BAND_MAX) / 2;
      tmp.target.copy(tmp.cam)
        .addScaledVector(tmp.fwd, depth)
        .addScaledVector(tmp.right, Math.cos(a) * halfW * r)
        .addScaledVector(tmp.base, Math.sin(a) * halfH * r);
      pos.current = restingSpot(tmp.target, env, new THREE.Vector3());
      vel.current.set(0, 0, 0);
    }
    const p = pos.current, v = vel.current;

    if (drag.current) {
      p.lerp(drag.current.point, 1 - Math.exp(-20 * dt));
      v.set(0, 0, 0);
      spin.current.set(0, 0, 0);
    } else if (onDesk && pianoRef.current) {
      // music desk, converted from piano space into this group's space
      tmp.target.copy(DESK_POS);
      pianoRef.current.localToWorld(tmp.target);
      g.parent.worldToLocal(tmp.target);
      p.lerp(tmp.target, 1 - Math.exp(-3.5 * dt));
      v.set(0, 0, 0);
      spin.current.set(0, 0, 0);
    } else {
      // Where it would rest: its own spot, nudged into the band around the edge of the view
      if (pianoRef.current) {
        pianoRef.current.getWorldPosition(tmp.piano);
        g.parent.worldToLocal(tmp.piano);
      }
      for (const other of Object.values(bodies.current)) {
        if (other?.pos.current && other.pos !== pos) env.others.push(other.pos.current);
      }
      env.piano = pianoRef.current ? tmp.piano : null;
      floatStep(p, v, env, dt);
    }
    g.position.copy(p);

    // How it's moving through the air, in the sheet's own frame: this is what bends it
    if (tmp.prev.lengthSq() === 0) tmp.prev.copy(p);
    tmp.local.copy(p).sub(tmp.prev).divideScalar(Math.max(dt, 1e-3));
    tmp.prev.copy(p);
    tmp.frameVel.lerp(tmp.local, 1 - Math.exp(-14 * dt));
    tmp.local.copy(tmp.frameVel).applyQuaternion(tmp.inv.copy(g.quaternion).invert());
    flex.update(tmp.local, dt, onDesk && !drag.current);
    const airSpeed = tmp.frameVel.length();

    // Orientation: on the desk, lean back against it; otherwise face the viewer and
    // flutter gently, rocking more the faster it moves, like paper catching the air
    if (onDesk && !drag.current && pianoRef.current) {
      pianoRef.current.getWorldQuaternion(tmp.q);
      g.parent.getWorldQuaternion(tmp.q2).invert();
      tmp.q.premultiply(tmp.q2).multiply(tmp.q2.setFromEuler(tmp.e.set(-0.2, 0, 0)));
    } else {
      tmp.m.lookAt(tmp.cam, g.position, tmp.base);
      tmp.q.setFromRotationMatrix(tmp.m);
      const flutter = drag.current ? 0.3 : 1;
      const rock = Math.min(1, airSpeed / 14);
      tmp.q.multiply(tmp.q2.setFromEuler(tmp.e.set(
        (Math.sin(time * 0.6 + index) * 0.18 + Math.sin(time * 7.3 + index) * 0.22 * rock) * flutter,
        (Math.sin(time * 0.45 + index * 1.3) * 0.28 + Math.sin(time * 5.1 + index * 2) * 0.3 * rock) * flutter,
        Math.sin(time * 0.33 + index * 0.7) * 0.1 * flutter
      )));
    }
    // A thrown sheet tumbles with its spin; as the spin dies it turns back to face you
    const w = spin.current, spinRate = w.length();
    if (spinRate > 0.02) {
      tmp.dq.setFromAxisAngle(tmp.axis.copy(w).divideScalar(spinRate), spinRate * dt);
      g.quaternion.premultiply(tmp.dq);
      w.multiplyScalar(Math.exp(-SPIN_DRAG * dt));
    }
    const settle = THREE.MathUtils.clamp(1 - spinRate / 2.5, 0, 1);
    g.quaternion.slerp(tmp.q, (1 - Math.exp(-(drag.current || onDesk ? 7 : 3) * dt)) * settle);

    const s = fit * (hover && active ? 1.08 : 1);
    g.scale.lerp(tmp.v.set(s, s, s), 1 - Math.exp(-10 * dt));
  });

  // Drags are tracked with window listeners + our own raycast, so releasing over
  // the piano (or anywhere) always reaches us.
  const camera = useThree((st) => st.camera);
  const canvas = useThree((st) => st.gl.domElement);
  const rayFrom = (ev, raycaster) => {
    const r = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray;
  };

  const onDown = (e) => {
    if (!active) return;
    e.stopPropagation();
    const world = outer.current.getWorldPosition(new THREE.Vector3());
    const normal = camera.getWorldDirection(new THREE.Vector3()).negate();
    const d = {
      plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, world),
      start: { x: e.clientX, y: e.clientY },
      point: pos.current.clone(),
      moved: false,
      raycaster: new THREE.Raycaster(),
      trail: [], // recent pointer positions, for the speed of a throw
    };
    drag.current = d;
    document.body.style.cursor = 'grabbing';
    if (controls) controls.enabled = false; // don't orbit while carrying a sheet

    const move = (ev) => {
      if (Math.hypot(ev.clientX - d.start.x, ev.clientY - d.start.y) > 6) d.moved = true;
      const hit = new THREE.Vector3();
      if (rayFrom(ev, d.raycaster).intersectPlane(d.plane, hit) && outer.current) {
        d.point.copy(outer.current.parent.worldToLocal(hit));
        const now = performance.now();
        d.trail.push({ t: now, p: d.point.clone() });
        while (d.trail.length > 2 && now - d.trail[0].t > 90) d.trail.shift();
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      drag.current = null;
      document.body.style.cursor = 'auto';
      if (controls) controls.enabled = true;
      if (!d.moved) {
        if (onDesk) acoustics.eject();
        else acoustics.play(index);
        return;
      }
      // Dropped "onto" the piano = the pointer ray passes through the piano
      const ray = rayFrom(ev, d.raycaster);
      const overPiano = pianoRef.current && ray.intersectsBox(tmp.box.setFromObject(pianoRef.current));
      if (overPiano) { acoustics.play(index); return; }
      if (onDesk) acoustics.eject();
      // Let go while moving: it flies off at the hand's speed, spinning with the swing
      const tr = d.trail, a = tr[0], b = tr[tr.length - 1];
      const dtMs = b && a ? b.t - a.t : 0;
      if (dtMs > 8 && performance.now() - b.t < 120) {
        vel.current.copy(b.p).sub(a.p).multiplyScalar(1000 / dtMs);
        if (vel.current.length() > MAX_THROW) vel.current.setLength(MAX_THROW);
        const fwd = camera.getWorldDirection(new THREE.Vector3());
        spin.current.crossVectors(fwd, vel.current).multiplyScalar(0.22)
          .add(new THREE.Vector3(0, 0, (Math.random() - 0.5) * 0.15 * vel.current.length()).applyQuaternion(camera.quaternion));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <group
      ref={outer}
      onPointerDown={onDown}
      onPointerOver={(e) => { if (!active) return; e.stopPropagation(); setHover(true); document.body.style.cursor = drag.current ? 'grabbing' : 'grab'; }}
      onPointerOut={() => { setHover(false); if (!drag.current) document.body.style.cursor = 'auto'; }}
    >
      {/* subdivided so the paper can bend; the bend itself is in the materials' shader */}
      <mesh material={mats.front}>
        <planeGeometry args={[SHEET_W, SHEET_H, ...PAPER_SEGMENTS]} />
      </mesh>
      <mesh material={mats.back} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[SHEET_W, SHEET_H, ...PAPER_SEGMENTS]} />
      </mesh>
      {hover && active && (
        <Html center position={[0, SHEET_H / 2 + 0.55, 0]} zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
          <div className="record-label">
            <span>{track.title}</span>
            <em>{onDesk ? 'click to stop' : 'click, drag onto the piano, or throw it'}</em>
          </div>
        </Html>
      )}
    </group>
  );
}

// ───────────────────────── the station ─────────────────────────

export default function AcousticsWorld({ active }) {
  const s = useAcoustics();
  const pianoRef = useRef();
  const sheetBodies = useRef({});
  const scene = useThree((st) => st.scene);
  const glow = useMemo(glowTexture, []);
  useEffect(() => () => glow.dispose(), [glow]);

  const [visited, setVisited] = useState(active);
  useEffect(() => { if (active) setVisited(true); }, [active]);

  useEffect(() => { acoustics.load(); }, []);
  // Leaving the station stops the music
  useEffect(() => { if (!active && acoustics.get().playing) acoustics.pause(); }, [active]);

  // Dark stage: fade everything far from the piano into black while here
  const fog = useRef({ far: 6000 });
  useFrame((_, delta) => {
    const f = fog.current;
    const goal = active ? 95 : 6000;
    f.far += (goal - f.far) * (1 - Math.exp(-(active ? 1.6 : 3) * Math.min(delta, 0.1)));
    if (f.far > 5000 && !active) {
      if (scene.fog) scene.fog = null;
      return;
    }
    if (!scene.fog) scene.fog = new THREE.Fog('#04060a', 40, 6000);
    scene.fog.near = Math.min(f.far * 0.45, 42);
    scene.fog.far = f.far;
  });
  useEffect(() => () => { scene.fog = null; }, [scene]);

  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(PIANO_POS[0], PIANO_POS[1] + 6, PIANO_POS[2]);
    return o;
  }, []);

  return (
    <group>
      {/* Stage lighting: a warm spot from above, a cool backlight, and a soft fill for the sheets */}
      <primitive object={spotTarget} />
      <spotLight
        position={[PIANO_POS[0] + 3, PIANO_POS[1] + 30, PIANO_POS[2] + 10]}
        target={spotTarget}
        angle={0.42}
        penumbra={0.85}
        intensity={430}
        distance={80}
        decay={1.7}
        color="#ffdcb4"
      />
      <pointLight position={[PIANO_POS[0] - 9, PIANO_POS[1] + 16, PIANO_POS[2] - 10]} intensity={110} distance={50} decay={1.6} color="#8fb0ff" />

      {/* Pool of light under the piano, as if the spot hits an unseen floor */}
      <mesh position={[PIANO_POS[0], PIANO_POS[1] - 0.05, PIANO_POS[2] + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[34, 24]} />
        <meshBasicMaterial map={glow} transparent blending={THREE.AdditiveBlending} depthWrite={false} opacity={0.9} />
      </mesh>

      <Piano pianoRef={pianoRef} showModel={visited} onClick={active && s.current >= 0 ? acoustics.toggle : null} hoverable={active && s.current >= 0}>
        <Bricks />
      </Piano>

      {s.tracks.map((t, i) => (
        <Sheet
          key={t.path}
          index={i}
          track={t}
          total={s.tracks.length}
          active={active}
          playingIndex={s.current}
          pianoRef={pianoRef}
          bodies={sheetBodies}
        />
      ))}
    </group>
  );
}
