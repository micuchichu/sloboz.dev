// Background scenery for the galaxy: twinkling stars, nebula haze, two planets,
// an asteroid belt around the Core and the occasional shooting star.
// Everything is procedural (no image downloads) and cheap: a handful of draw calls.
import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ───────────────────────── procedural textures ─────────────────────────

function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function radialTexture(inner, outer = 'rgba(0,0,0,0)') {
  return canvasTexture(128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

// Banded gas giant (neutral sand tones)
function gasGiantTexture() {
  return canvasTexture(512, 256, (ctx, w, h) => {
    const a = new THREE.Color('#2a2622'), b = new THREE.Color('#9a8b74'), c = new THREE.Color('#d8cdb8'), tmp = new THREE.Color();
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const n = 0.5 + 0.5 * Math.sin(v * 38 + Math.sin(v * 11) * 2.4) * Math.cos(v * 9.0);
      tmp.copy(a).lerp(b, n);
      if (Math.sin(v * 70 + 1.3) > 0.82) tmp.lerp(c, 0.35);
      ctx.fillStyle = `#${tmp.getHexString()}`;
      ctx.fillRect(0, y, w, 1);
    }
    // Turbulent streaks
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '240,230,210' : '30,22,15'},${Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 60, 1 + Math.random() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // A storm
    ctx.fillStyle = 'rgba(200,120,80,0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.62, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Dusty cratered moon
function moonTexture() {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#8a4b3a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '40,18,14' : '230,170,130'},${Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 7;
      ctx.fillStyle = 'rgba(30,12,10,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,160,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - 0.6, y - 0.6, r, Math.PI, Math.PI * 1.8);
      ctx.stroke();
    }
  });
}

// Ring bands: 1D strip mapped radially (see RingedPlanet)
function ringTexture() {
  return canvasTexture(512, 4, (ctx, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = x / w;
      let alpha = 0.25 + 0.55 * Math.abs(Math.sin(v * 31) * Math.sin(v * 7.3 + 1));
      if (v > 0.55 && v < 0.6) alpha *= 0.1;          // a gap
      alpha *= Math.min(1, v * 8, (1 - v) * 6);         // soft edges
      ctx.fillStyle = `rgba(${215 + v * 20},${205 + v * 20},${185 + v * 20},${alpha})`;
      ctx.fillRect(x, 0, 1, h);
    }
  });
}

// ───────────────────────── twinkling stars ─────────────────────────

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vAlpha = 0.55 + 0.45 * sin(uTime * (0.6 + aPhase * 1.8) + aPhase * 6.2831);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.05, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function TwinklingStarfield({ isLowEnd = false, reducedMotion = false }) {
  const count = isLowEnd ? 1800 : 4500;
  const matRef = useRef();

  const { positions, sizes, phases, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const tints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe8ff'), new THREE.Color('#ffe9c4'), new THREE.Color('#d6c8ff')];
    for (let i = 0; i < count; i++) {
      // Random points on a big shell so stars always sit far behind everything
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 1500 + Math.random() * 1600;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = r * s * Math.cos(th);
      positions[i * 3 + 1] = r * u;
      positions[i * 3 + 2] = r * s * Math.sin(th);
      sizes[i] = Math.random() < 0.04 ? 2.6 + Math.random() * 1.4 : 0.8 + Math.random() * 1.4;
      phases[i] = Math.random();
      const c = tints[(Math.random() * tints.length) | 0];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, sizes, phases, colors };
  }, [count]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  }), []);

  useFrame((state) => {
    if (!reducedMotion && matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points frustumCulled={false} renderOrder={-10}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
}

// ───────────────────────── nebula haze ─────────────────────────

const NEBULAE = [
  { pos: [-700, 250, -1500], scale: 1500, color: 'rgba(110,90,200,0.9)', opacity: 0.12 },
  { pos: [800, -150, -1600], scale: 1700, color: 'rgba(60,130,170,0.9)', opacity: 0.09 },
  { pos: [150, 500, -1800], scale: 1400, color: 'rgba(170,80,110,0.9)', opacity: 0.06 },
  { pos: [-300, -450, -1400], scale: 1200, color: 'rgba(70,90,170,0.9)', opacity: 0.08 },
];

export function NebulaBackdrop({ isLowEnd = false }) {
  const textures = useMemo(() => NEBULAE.map((n) => radialTexture(n.color)), []);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const list = isLowEnd ? NEBULAE.slice(0, 2) : NEBULAE;

  return list.map((n, i) => (
    <sprite key={i} position={n.pos} scale={[n.scale, n.scale * 0.7, 1]} renderOrder={-9}>
      <spriteMaterial map={textures[i]} transparent opacity={n.opacity} blending={THREE.AdditiveBlending} depthWrite={false} depthTest={false} />
    </sprite>
  ));
}

// ───────────────────────── planets ─────────────────────────

function ringGeometry(inner, outer) {
  const geo = new THREE.RingGeometry(inner, outer, 160, 1);
  // Map U to the radius so the 1D band texture wraps around as rings
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  return geo;
}

function Planet({ position, radius, texture, glowColor, spin = 0.02, tilt = 0.3, children, reducedMotion }) {
  const meshRef = useRef();
  const glow = useMemo(() => radialTexture(glowColor), [glowColor]);
  useEffect(() => () => glow.dispose(), [glow]);

  useFrame((_, delta) => {
    if (!reducedMotion && meshRef.current) meshRef.current.rotation.y += Math.min(delta, 0.1) * spin;
  });

  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <sprite scale={[radius * 3.2, radius * 3.2, 1]}>
        <spriteMaterial map={glow} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} />
      </mesh>
      {children}
    </group>
  );
}

export function Planets({ reducedMotion = false }) {
  const textures = useMemo(() => ({ giant: gasGiantTexture(), moon: moonTexture(), ring: ringTexture() }), []);
  const ring = useMemo(() => ringGeometry(62, 108), []);
  useEffect(() => () => {
    Object.values(textures).forEach((t) => t.dispose());
    ring.dispose();
  }, [textures, ring]);

  return (
    <>
      {/* Light only affects the planets and asteroids; the galaxy uses unlit materials */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[260, 180, 320]} intensity={2.4} color="#fff3e6" />

      <Planet position={[-340, 85, -420]} radius={46} texture={textures.giant} glowColor="rgba(220,200,170,0.3)" tilt={0.25} reducedMotion={reducedMotion}>
        <mesh geometry={ring} rotation={[-1.25, 0.15, 0]}>
          <meshBasicMaterial map={textures.ring} transparent side={THREE.DoubleSide} depthWrite={false} color="#c9c0ad" />
        </mesh>
      </Planet>

      <Planet position={[340, -75, -370]} radius={17} texture={textures.moon} glowColor="rgba(255,140,90,0.28)" spin={0.05} tilt={-0.2} reducedMotion={reducedMotion} />
    </>
  );
}

// ───────────────────────── asteroid belt ─────────────────────────

export function AsteroidBelt({ isLowEnd = false, reducedMotion = false, center = [0, -12, -40] }) {
  const count = isLowEnd ? 40 : 90;
  const meshRef = useRef();
  const groupRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const rocks = useMemo(() => Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 70;
    return {
      pos: new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 18, Math.sin(a) * r * 0.85),
      rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
      spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6),
      scale: new THREE.Vector3(1 + Math.random() * 0.6, 0.7 + Math.random() * 0.5, 0.8 + Math.random() * 0.5)
        .multiplyScalar(0.5 + Math.pow(Math.random(), 2.5) * 3.2),
    };
  }), [count]);

  const update = (dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    rocks.forEach((rock, i) => {
      rock.rot.x += rock.spin.x * dt;
      rock.rot.y += rock.spin.y * dt;
      rock.rot.z += rock.spin.z * dt;
      dummy.position.copy(rock.pos);
      dummy.rotation.copy(rock.rot);
      dummy.scale.copy(rock.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => update(0), [rocks]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.012;
    update(dt);
  });

  return (
    <group ref={groupRef} position={center} rotation={[0.12, 0, 0.06]}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#6f6a7d" roughness={0.95} metalness={0.05} flatShading />
      </instancedMesh>
    </group>
  );
}

// ───────────────────────── shooting stars ─────────────────────────

export function ShootingStars({ reducedMotion = false }) {
  const lineRef = useRef();
  const state = useRef({ next: 2 + Math.random() * 3, t: -1, head: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0, len: 0, life: 0.9 });
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    // Bright head, black tail: with additive blending black adds nothing, so the tail fades out
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera, clock }, delta) => {
    const s = state.current;
    const line = lineRef.current;
    if (!line || reducedMotion) return;
    const now = clock.elapsedTime;

    if (s.t < 0) {
      line.visible = false;
      if (now < s.next) return;
      // Spawn in the upper part of whatever the camera is looking at
      const D = 300 + Math.random() * 300;
      camera.getWorldDirection(tmp.fwd);
      tmp.right.crossVectors(tmp.fwd, camera.up).normalize();
      tmp.up.crossVectors(tmp.right, tmp.fwd).normalize();
      s.head.copy(camera.position)
        .addScaledVector(tmp.fwd, D)
        .addScaledVector(tmp.right, (Math.random() - 0.5) * D * 1.1)
        .addScaledVector(tmp.up, (0.15 + Math.random() * 0.35) * D);
      s.dir.copy(tmp.right).multiplyScalar(Math.random() < 0.5 ? 1 : -1).addScaledVector(tmp.up, -0.45).normalize();
      s.speed = D * 1.3;
      s.len = D * 0.22;
      s.t = 0;
      line.visible = true;
    }

    s.t += Math.min(delta, 0.1);
    const k = s.t / s.life;
    if (k >= 1) {
      s.t = -1;
      s.next = now + 3 + Math.random() * 6;
      line.visible = false;
      return;
    }
    s.head.addScaledVector(s.dir, s.speed * Math.min(delta, 0.1));
    const p = geometry.attributes.position.array;
    const tail = s.len * Math.sin(Math.PI * k); // grows, then shrinks
    p[0] = s.head.x; p[1] = s.head.y; p[2] = s.head.z;
    p[3] = s.head.x - s.dir.x * tail; p[4] = s.head.y - s.dir.y * tail; p[5] = s.head.z - s.dir.z * tail;
    geometry.attributes.position.needsUpdate = true;
    line.material.opacity = Math.sin(Math.PI * k);
  });

  return (
    <line ref={lineRef} geometry={geometry} frustumCulled={false} visible={false}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </line>
  );
}

export default function SpaceDecor({ isLowEnd = false, reducedMotion = false }) {
  return (
    <>
      <NebulaBackdrop isLowEnd={isLowEnd} />
      <TwinklingStarfield isLowEnd={isLowEnd} reducedMotion={reducedMotion} />
      <Planets reducedMotion={reducedMotion} />
      <AsteroidBelt isLowEnd={isLowEnd} reducedMotion={reducedMotion} />
      <ShootingStars reducedMotion={reducedMotion} />
    </>
  );
}
