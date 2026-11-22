// Background scenery for the galaxy: twinkling stars, nebula haze, Saturn, a moon,
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

// Saturn's cloud bands: pale gold at the equator, tan belts, cool grey poles.
// Bands only vary with latitude, so a narrow, tall texture is enough.
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

function saturnTexture() {
  return canvasTexture(16, 1024, (ctx, w, h) => {
    const stops = [
      [0.0, '#e8d9b5'], [0.18, '#dcc69a'], [0.32, '#c7a978'],
      [0.5, '#b49a72'], [0.7, '#9d927f'], [0.88, '#7f8791'], [1.0, '#6f7a86'],
    ].map(([t, c]) => [t, new THREE.Color(c)]);
    const col = new THREE.Color(), tmp = new THREE.Color();
    for (let y = 0; y < h; y++) {
      const lat = Math.abs(y / (h - 1) - 0.5) * 2; // 0 equator → 1 pole
      let i = 0;
      while (i < stops.length - 2 && lat > stops[i + 1][0]) i++;
      const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
      col.copy(c0).lerp(c1, (lat - t0) / (t1 - t0));
      // Soft belts and zones, plus faint fine banding
      const band = Math.sin(lat * 23 + 0.6) * 0.045 + Math.sin(lat * 61 + 2.1) * 0.025
        + (hash(Math.floor(lat * 140)) - 0.5) * 0.03;
      col.multiplyScalar(1 + band);
      // A darker belt either side of the bright equatorial zone
      tmp.set('#a88a5e');
      col.lerp(tmp, Math.exp(-Math.pow((lat - 0.27) / 0.05, 2)) * 0.35);
      ctx.fillStyle = `#${col.getHexString()}`;
      ctx.fillRect(0, y, w, 1);
    }
  });
}

// Ring system as a 1D strip from the inner edge (u=0) to the outer edge (u=1):
// faint C ring, dense B ring, the Cassini Division, the A ring with the Encke
// Gap, and a thin F ring. Alpha is optical depth, RGB is the dust colour.
const RING_INNER = 1.24, RING_OUTER = 2.34; // in planet radii

function saturnRingTexture() {
  return canvasTexture(1024, 1, (ctx, w) => {
    const img = ctx.createImageData(w, 1);
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let x = 0; x < w; x++) {
      const r = RING_INNER + (x / (w - 1)) * (RING_OUTER - RING_INNER);
      let d = 0;
      d += smooth(1.24, 1.30, r) * (1 - smooth(1.50, 1.53, r)) * 0.22;           // C ring
      d += smooth(1.52, 1.56, r) * (1 - smooth(1.93, 1.95, r)) * 0.92;           // B ring
      d += smooth(2.03, 2.05, r) * (1 - smooth(2.25, 2.27, r)) * 0.62;           // A ring
      d *= 1 - Math.exp(-Math.pow((r - 2.214) / 0.004, 2)) * 0.9;                // Encke Gap
      d += Math.exp(-Math.pow((r - 2.326) / 0.004, 2)) * 0.35;                   // F ring
      d *= 0.82 + 0.18 * hash(Math.floor(x / 3)) + 0.06 * Math.sin(r * 180);     // ringlets
      const warm = smooth(1.45, 1.8, r) * (1 - smooth(2.0, 2.3, r) * 0.4);
      const i = x * 4;
      img.data[i] = 150 + warm * 80;
      img.data[i + 1] = 138 + warm * 64;
      img.data[i + 2] = 120 + warm * 40;
      img.data[i + 3] = Math.min(255, d * 255);
    }
    ctx.putImageData(img, 0, 0);
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

// ───────────────────────── Saturn ─────────────────────────
// Custom shaders so the planet and rings light each other properly: a soft
// terminator, limb darkening, a thin sunlit haze on the limb, the rings'
// shadow across the clouds and the planet's shadow across the rings.

const SUN_POS = [260, 180, 320];
const SATURN_RADIUS = 46;
// Saturn gets its own key light from the side, so from the usual viewpoints
// it shows a terminator and a lit limb instead of a flat full disc.
const SATURN_SUN = new THREE.Vector3(0.87, 0.31, -0.39).normalize();
const RING_DEFINES = { RING_INNER: RING_INNER.toFixed(3), RING_OUTER: RING_OUTER.toFixed(3) };

const worldVertex = /* glsl */ `
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// Shared by Saturn and Mars; HAS_RINGS adds the ring shadow
const planetFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uRing;
  uniform vec3 uSun, uCenter, uPole, uAtmo;
  uniform float uRadius, uHaze;
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vP);
    float ndl = dot(n, uSun);
    float day = smoothstep(-0.12, 0.55, ndl);

    float shadow = 1.0;
    #ifdef HAS_RINGS
    // Shadow of the rings: follow the sunlight back to the ring plane
    float denom = dot(uSun, uPole);
    if (abs(denom) > 1e-4) {
      float t = dot(uCenter - vP, uPole) / denom;
      if (t > 0.0) {
        float r = length(vP + uSun * t - uCenter) / uRadius;
        float u = (r - RING_INNER) / (RING_OUTER - RING_INNER);
        if (u > 0.0 && u < 1.0) shadow = 1.0 - texture2D(uRing, vec2(u, 0.5)).a * 0.75;
      }
    }
    #endif

    float mu = max(dot(n, v), 0.0);
    float limb = mix(0.6, 1.0, pow(mu, 0.5));
    vec3 col = texture2D(uMap, vUv).rgb * (day * shadow * limb * 0.95 + 0.02);
    col += uAtmo * pow(1.0 - mu, 3.5) * smoothstep(-0.15, 0.6, ndl) * uHaze;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const ringFragment = /* glsl */ `
  uniform sampler2D uRing;
  uniform vec3 uSun, uCenter, uPole;
  uniform float uRadius;
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec4 tex = texture2D(uRing, vec2(vUv.x, 0.5));
    if (tex.a < 0.003) discard;

    // Planet's shadow: does the path towards the sun pass through the globe?
    vec3 toC = uCenter - vP;
    float tc = dot(toC, uSun);
    float shadow = 1.0;
    if (tc > 0.0) {
      float d = sqrt(max(dot(toC, toC) - tc * tc, 0.0));
      shadow = mix(0.05, 1.0, smoothstep(uRadius * 0.98, uRadius * 1.03, d));
    }

    // Lit face: full colour. Unlit face: dense rings go dark, thin ones glow a little.
    vec3 v = normalize(cameraPosition - vP);
    float sunSide = dot(uPole, uSun);
    float lit = abs(sunSide);
    float light = sunSide * dot(uPole, v) > 0.0
      ? 0.35 + 0.8 * lit
      : (0.2 + 0.5 * lit) * (1.0 - tex.a * 0.7);
    gl_FragColor = vec4(tex.rgb * light * shadow, tex.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun, uCenter, uAtmo;
  uniform float uRadius, uFalloff, uExtent, uStrength;
  varying vec3 vP;
  varying vec3 vN;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    // How close does this view ray pass to the planet? Glow falls off with
    // altitude (uFalloff, in planet radii) and stops at uExtent.
    vec3 dir = normalize(vP - cameraPosition);
    float t = dot(uCenter - cameraPosition, dir);
    vec3 closest = cameraPosition + dir * t;
    float h = length(closest - uCenter) / uRadius - 1.0;
    if (h < 0.0) discard;
    float glow = exp(-h / uFalloff) * (1.0 - smoothstep(uExtent * 0.6, uExtent, h));
    float day = smoothstep(-0.25, 0.7, dot(normalize(closest - uCenter), uSun));
    gl_FragColor = vec4(uAtmo * glow * day * uStrength, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

// A ShaderMaterial on worldVertex that also follows the scene fog
function worldMaterial(fragmentShader, uniforms, defines = {}, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: worldVertex,
    fragmentShader,
    defines,
    fog: true,
    ...opts,
  });
}

const ATMOSPHERE_OPTS = { transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending };

// Ring geometry in the planet's equatorial (XZ) plane, U = 0 inner → 1 outer
function ringGeometry(inner, outer) {
  const geo = new THREE.RingGeometry(inner, outer, 256, 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  return geo;
}

// Same viewing angle on the rings as before, but now the bands line up with them
const SATURN_TILT = new THREE.Quaternion()
  .setFromEuler(new THREE.Euler(-1.25, 0.15, 0))
  .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));

function Saturn({ position, radius = SATURN_RADIUS }) {
  const groupRef = useRef();
  const res = useMemo(() => {
    const map = saturnTexture();
    const ringTex = saturnRingTexture();
    const shared = {
      uSun: { value: SATURN_SUN.clone() },
      uCenter: { value: new THREE.Vector3() },
      uPole: { value: new THREE.Vector3(0, 1, 0) },
      uRadius: { value: radius },
      uAtmo: { value: new THREE.Color('#f2dcae') },
      uRing: { value: ringTex },
      uHaze: { value: 0.45 },
      uFalloff: { value: 0.022 },
      uExtent: { value: 0.08 },
      uStrength: { value: 0.55 },
    };
    const defines = { ...RING_DEFINES, HAS_RINGS: '' };
    return {
      map,
      ringTex,
      ring: ringGeometry(radius * RING_INNER, radius * RING_OUTER),
      planet: worldMaterial(planetFragment, { ...shared, uMap: { value: map } }, defines),
      rings: worldMaterial(ringFragment, shared, defines, { transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      atmosphere: worldMaterial(atmosphereFragment, shared, defines, ATMOSPHERE_OPTS),
      shared,
    };
  }, [radius]);
  useEffect(() => () => {
    ['map', 'ringTex', 'ring', 'planet', 'rings', 'atmosphere'].forEach((k) => res[k].dispose());
  }, [res]);

  // World-space centre and pole for the shaders (cheap; the planet never moves)
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.updateWorldMatrix(true, false);
    res.shared.uCenter.value.setFromMatrixPosition(g.matrixWorld);
    res.shared.uPole.value.set(0, 1, 0).transformDirection(g.matrixWorld);
  });

  return (
    <group position={position} rotation={[0, 0, 0.25]}>
      <group ref={groupRef} quaternion={SATURN_TILT}>
        <mesh material={res.planet}>
          <sphereGeometry args={[radius, 96, 64]} />
        </mesh>
        <mesh material={res.atmosphere}>
          <sphereGeometry args={[radius * 1.08, 96, 64]} />
        </mesh>
        <mesh geometry={res.ring} material={res.rings} />
      </group>
    </group>
  );
}

// ───────────────────────── Mars ─────────────────────────
// Same lighting model as Saturn, without rings: a very thin, dusty
// butterscotch haze that only shows along the sunlit limb.

function Mars({ position, radius = 17, reducedMotion }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const res = useMemo(() => {
    const map = moonTexture();
    const shared = {
      uSun: { value: new THREE.Vector3(...SUN_POS).normalize() },
      uCenter: { value: new THREE.Vector3() },
      uPole: { value: new THREE.Vector3(0, 1, 0) },
      uRadius: { value: radius },
      uAtmo: { value: new THREE.Color('#f0b08a') },
      // Mars is only ~30 px across on screen, so its haze is relatively wider
      // than Saturn's or it would vanish into a single pixel
      uHaze: { value: 0.5 },
      uFalloff: { value: 0.055 },
      uExtent: { value: 0.18 },
      uStrength: { value: 0.65 },
    };
    return {
      map,
      shared,
      planet: worldMaterial(planetFragment, { ...shared, uMap: { value: map } }),
      atmosphere: worldMaterial(atmosphereFragment, shared, {}, ATMOSPHERE_OPTS),
    };
  }, [radius]);
  useEffect(() => () => ['map', 'planet', 'atmosphere'].forEach((k) => res[k].dispose()), [res]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (!reducedMotion && meshRef.current) meshRef.current.rotation.y += Math.min(delta, 0.1) * 0.05;
    g.updateWorldMatrix(true, false);
    res.shared.uCenter.value.setFromMatrixPosition(g.matrixWorld);
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, 0, -0.2]}>
      <mesh ref={meshRef} material={res.planet}>
        <sphereGeometry args={[radius, 64, 48]} />
      </mesh>
      <mesh material={res.atmosphere}>
        <sphereGeometry args={[radius * 1.2, 64, 48]} />
      </mesh>
    </group>
  );
}

export function Planets({ reducedMotion = false }) {
  return (
    <>
      {/* Lights the asteroids; the planets light themselves in their shaders */}
      <ambientLight intensity={0.12} />
      <directionalLight position={SUN_POS} intensity={2.4} color="#fff3e6" />

      <Saturn position={[-340, 85, -420]} />
      <Mars position={[340, -75, -370]} reducedMotion={reducedMotion} />
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
