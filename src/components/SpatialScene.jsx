import React, { useRef, useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Canvas, useFrame, useThree, events as defaultEvents } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import Monitor, { MONITOR_PX_TO_WORLD } from './Monitor';
import Hero from './Hero';
import WidgetHub from './WidgetHub';
import Projects from './Projects';
import SpaceDecor from './SpaceDecor';
import { hideBoot } from '../boot';
import { usePalette, cyclePalette } from '../lib/palettes';

const Effects = lazy(() => import('./Effects'));
// The gallery (and its photo list, which grows over time) stays out of the first bundle
const loadOptics = () => import('./OpticsArchive');
const OpticsArchive = lazy(loadOptics);
// Acoustics: a full 3D scene (piano + records) and a tiny auto-hiding overlay
const loadAcoustics = () => import('./AcousticsWorld');
const AcousticsWorld = lazy(loadAcoustics);
const AcousticsOverlay = lazy(() => import('./AcousticsOverlay'));
const MiniPlayer = lazy(() => import('./MiniPlayer'));
const IMMERSIVE = 6; // station id with no panel and no HUD

const CAMERA_FOV = 60;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
// Exponential damping rate for camera flights (≈ the old 0.06-per-frame lerp at 60 fps,
// but now independent of refresh rate: same speed on 30, 60 or 144 Hz screens)
const CAMERA_DAMPING = 3.7;
// Frame rate used while nothing is moving except the slow galaxy drift
const IDLE_FPS = 30;
const CONSTELLATION = -1; // sentinel: the system map (not a station index)

function readCapabilities() {
  if (typeof window === 'undefined') return { isMobile: false, isLowEnd: false, reducedMotion: false };
  const isMobile = window.innerWidth < 768;
  const concurrency = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  const isLowEnd = isMobile || concurrency <= 4 || memory < 4;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return { isMobile, isLowEnd, reducedMotion };
}

function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState(readCapabilities);

  useEffect(() => {
    // Only re-render when a flag actually flips, not on every resize event
    const update = () => {
      const next = readCapabilities();
      setCapabilities((prev) =>
        prev.isMobile === next.isMobile && prev.isLowEnd === next.isLowEnd && prev.reducedMotion === next.reducedMotion
          ? prev
          : next
      );
    };
    window.addEventListener('resize', update);
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    mq?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq?.removeEventListener?.('change', update);
    };
  }, []);

  return capabilities;
}

/**
 * Camera distance that makes a monitor of pxW × pxH CSS pixels fit the viewport,
 * leaving room for the HUD, and never magnifying it past 1:1 (keeps text crisp).
 */
function fitDistance(pxW, pxH, viewW, viewH, isMobile) {
  const w = pxW * MONITOR_PX_TO_WORLD;
  const h = pxH * MONITOR_PX_TO_WORLD;
  const hudClearance = isMobile ? 64 : 88;
  const availH = Math.max(0.5, (viewH - 2 * hudClearance) / viewH);
  const availW = isMobile ? 0.94 : 0.9;
  const fitHeight = h / (2 * TAN_HALF_FOV * availH);
  const fitWidth = w / (2 * TAN_HALF_FOV * (viewW / viewH) * availW);
  const oneToOne = (MONITOR_PX_TO_WORLD * viewH) / (2 * TAN_HALF_FOV);
  return Math.max(fitHeight, fitWidth, oneToOne);
}

/**
 * Normals palette: draw every solid surface with its normal as its colour, the way a
 * renderer's G-buffer debug view shows it (+X salmon, +Y mint, +Z lilac). Glows,
 * atmospheres and sprites have no surface of their own, so they're hidden; stars and
 * lines keep their look. Objects that mount later (stations, the piano) are picked up
 * on the next frame, and everything is put back when the palette changes.
 */
const NORMAL_MATERIAL = new THREE.MeshNormalMaterial();

const isGlow = (material) => {
  const m = Array.isArray(material) ? material[0] : material;
  return !m || m.transparent || m.blending === THREE.AdditiveBlending || m.side === THREE.BackSide;
};

function toNormals(o) {
  if (o.userData.normals) return;
  if (o.isSprite || (o.isMesh && isGlow(o.material))) {
    o.userData.normals = { visible: o.visible };
    o.visible = false;
  } else if (o.isMesh) {
    o.userData.normals = { material: o.material };
    o.material = NORMAL_MATERIAL;
  } else {
    o.userData.normals = {};
  }
}

function fromNormals(o) {
  const saved = o.userData.normals;
  if (!saved) return;
  if ('visible' in saved) o.visible = saved.visible;
  if (saved.material) o.material = saved.material;
  delete o.userData.normals;
}

function NormalsView({ on }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    scene.traverse(on ? toNormals : fromNormals);
    invalidate();
  }, [on, scene, invalidate]);
  useFrame(() => { if (on) scene.traverse(toNormals); });
  return null;
}

/**
 * The canvas runs in "demand" mode. This drives it: every display frame while
 * something is moving, and at IDLE_FPS otherwise (saves GPU/battery while reading).
 */
function FrameDriver({ activeRef, idleFps }) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let raf;
    let last = -Infinity;
    const minGap = 1000 / idleFps;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (activeRef.current || now - last >= minGap - 2) {
        last = now;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate, idleFps, activeRef]);

  return null;
}

function CameraController({ station, stations, isMobile, monitorSize, activeRef, reducedMotion, immersive }) {
  const lookVec = useMemo(() => new THREE.Vector3(), []);
  const controlsRef = useRef();
  const isTransitioningRef = useRef(false);
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPosVec = useMemo(() => new THREE.Vector3(), []);
  const constellationCenter = useMemo(() => new THREE.Vector3(10, 10, -80), []);
  const constellationDefaultPos = useMemo(() =>
    isMobile ? new THREE.Vector3(10, 200, 320) : new THREE.Vector3(10, 140, 210),
    [isMobile]
  );
  const isConstellation = station === CONSTELLATION;
  const size = useThree((s) => s.size);

  const distance = useMemo(
    () => (monitorSize ? fitDistance(monitorSize[0], monitorSize[1], size.width, size.height, isMobile) : 15),
    [monitorSize, size.width, size.height, isMobile]
  );

  useEffect(() => {
    isTransitioningRef.current = true;
    activeRef.current = true;
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [station, activeRef]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const t = reducedMotion ? 1 : 1 - Math.exp(-CAMERA_DAMPING * delta);
    const camera = state.camera;

    // Orbit modes: the system map, and the immersive Acoustics station (around the piano)
    if (isConstellation || immersive) {
      let home = constellationDefaultPos;
      let center = constellationCenter;
      if (immersive) {
        const st = stations[station] || stations[0];
        const aspect = size.width / size.height;
        const d = Math.max(22, 21 / (2 * TAN_HALF_FOV * aspect));
        home = desiredPosVec.set(st.x, st.y + 1.5, st.z + d);
        center = lookVec.set(st.x, st.y - 1.2, st.z - 6); // the piano
      }

      if (isTransitioningRef.current) {
        const distPos = camera.position.distanceTo(home);
        const distLook = lookAtTarget.current.distanceTo(center);

        if (distPos > 0.5 || distLook > 0.5) {
          camera.position.lerp(home, t);
          lookAtTarget.current.lerp(center, t);
          camera.lookAt(lookAtTarget.current);
          activeRef.current = true;
        } else {
          camera.position.copy(home);
          lookAtTarget.current.copy(center);
          camera.lookAt(lookAtTarget.current);
          isTransitioningRef.current = false;
          activeRef.current = false;
          if (controlsRef.current) {
            controlsRef.current.target.copy(center);
            controlsRef.current.enabled = true;
            controlsRef.current.update();
          }
        }
      } else if (controlsRef.current && controlsRef.current.enabled) {
        controlsRef.current.update();
        lookAtTarget.current.copy(controlsRef.current.target);
      }
      return;
    }

    const station3 = stations[station] || stations[0];
    desiredPosVec.set(station3.x, station3.y, station3.z + distance);
    lookVec.copy(station3);
    const target = lookVec;

    const distPos = camera.position.distanceTo(desiredPosVec);
    const distLook = lookAtTarget.current.distanceTo(target);
    const moving = distPos > 0.01 || distLook > 0.01;

    if (distPos > 0.01) camera.position.lerp(desiredPosVec, t);
    else camera.position.copy(desiredPosVec);

    if (distLook > 0.01) lookAtTarget.current.lerp(target, t);
    else lookAtTarget.current.copy(target);

    camera.lookAt(lookAtTarget.current);
    activeRef.current = moving;
    if (!moving) isTransitioningRef.current = false;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={false}
      enableDamping
      dampingFactor={0.05}
      enablePan={!immersive}
      rotateSpeed={immersive ? 0.55 : 0.8}
      minDistance={immersive ? 16 : 40}
      maxDistance={immersive ? 46 : isMobile ? 650 : 500}
      maxPolarAngle={immersive ? 1.62 : Math.PI}
      target={[10, 10, -80]}
    />
  );
}

function ConstellationLines({ stations }) {
  const lineGeometry = useMemo(() => {
    const points = [
      // Primary Triangle
      stations[2], stations[0],
      stations[0], stations[1],
      stations[1], stations[2],

      // Satellite Widget Nodes
      stations[0], stations[3], // Core -> Sun
      stations[3], stations[2], // Sun -> Optics
      stations[0], stations[4], // Core -> Weather
      stations[4], stations[1], // Weather -> Deployments
      stations[1], stations[5], // Deployments -> Monopoly
      stations[5], stations[2], // Monopoly -> Optics
      stations[0], stations[6], // Core -> Acoustics
      stations[6], stations[2], // Acoustics -> Optics
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [stations]);

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.14} depthWrite={false} depthTest={false} />
    </lineSegments>
  );
}


function ConstellationBeacon({ position, onClick, label, index, size = 5 }) {
  const palette = usePalette();
  const meshRef = useRef();
  const wireRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const targetScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const wireScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = 1 - Math.exp(-6 * dt);
    if (meshRef.current) {
      meshRef.current.rotation.x += dt * (hovered ? 1.0 : 0.4);
      meshRef.current.rotation.y += dt * (hovered ? 1.4 : 0.6);
    }
    if (groupRef.current) {
      const s = hovered ? 1.35 : 1.0;
      targetScaleVec.set(s, s, s);
      groupRef.current.scale.lerp(targetScaleVec, t);
    }
    if (wireRef.current) {
      // Wireframe shell grows slightly more than the core on hover (scale, not a new geometry)
      const w = hovered ? 1.25 / 1.15 : 1;
      wireScaleVec.set(w, w, w);
      wireRef.current.scale.lerp(wireScaleVec, t);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'auto';
        if (onClick) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Invisible enlarged hitbox for effortless clicking */}
      <mesh visible={false}>
        <sphereGeometry args={[Math.max(12, size * 2.4), 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* Solid rotating core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color={hovered ? palette.accent : palette.beacon} />
      </mesh>

      {/* Glowing outer wireframe */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[size * 1.15, 0]} />
        <meshBasicMaterial color={hovered ? palette.accent : palette.beacon} transparent opacity={hovered ? 0.7 : 0.25} wireframe />
      </mesh>

      {label && (
        <Html
          center
          position={[0, -(size + 4), 0]}
          zIndexRange={[0, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className={`beacon-label${hovered ? ' is-hover' : ''}`}>
            <span className="idx">{index}</span>{label}
          </div>
        </Html>
      )}
    </group>
  );
}

function makeStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(220, 245, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(170, 190, 255, 0.22)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

function ProceduralGalaxy({ isLowEnd = false, reducedMotion = false }) {
  const galaxyRef = useRef();
  const dustRef = useRef();

  // Soft radial glow star sprite, created once
  const starTexture = useMemo(makeStarTexture, []);
  useEffect(() => () => starTexture.dispose(), [starTexture]);

  // Adaptive particle counts: scaled down on low-end devices
  const { positions, colors } = useMemo(() => {
    const count = isLowEnd ? 8000 : 20000;
    const arms = 3;
    const radius = 900;
    const spin = 1.35;
    const randomness = 0.4;
    const power = 3.2;

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const colorCore = new THREE.Color('#fff2e0');
    const colorCyan = new THREE.Color('#9db8ff');
    const colorPurple = new THREE.Color('#6c74c9');
    const colorMagenta = new THREE.Color('#b07a9c');
    const tintCyan = new THREE.Color('#d5e3ff');
    const tintGold = new THREE.Color('#ffe2b0');
    const mixed = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * radius;
      const normalizedR = r / radius;

      const branchAngle = ((i % arms) / arms) * Math.PI * 2;
      const spinAngle = r * spin * 0.0055;

      const rX = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 20);
      const rY = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r * 0.25 + 10);
      const rZ = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 20);

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + rX;
      pos[i * 3 + 1] = rY;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + rZ;

      if (normalizedR < 0.25) {
        mixed.copy(colorCore).lerp(colorCyan, normalizedR / 0.25);
      } else if (normalizedR < 0.65) {
        mixed.copy(colorCyan).lerp(colorPurple, (normalizedR - 0.25) / 0.4);
      } else {
        mixed.copy(colorPurple).lerp(colorMagenta, (normalizedR - 0.65) / 0.35);
      }

      if (Math.random() > 0.9) {
        mixed.lerp(tintCyan, 0.3);
      } else if (Math.random() > 0.95) {
        mixed.lerp(tintGold, 0.4);
      }

      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }

    return { positions: pos, colors: col };
  }, [isLowEnd]);

  // Nebula gas clouds (few, large, faint sprites)
  const { dustPositions, dustColors } = useMemo(() => {
    const dustCount = isLowEnd ? 300 : 1000;
    const arms = 3;
    const radius = 850;
    const spin = 1.35;
    const randomness = 0.5;
    const power = 2.5;

    const pos = new Float32Array(dustCount * 3);
    const col = new Float32Array(dustCount * 3);

    const dustCyan = new THREE.Color('#3f63b5');
    const dustPurple = new THREE.Color('#4b3f8f');
    const dustMagenta = new THREE.Color('#7d4565');
    const mixed = new THREE.Color();

    for (let i = 0; i < dustCount; i++) {
      const r = Math.pow(Math.random(), 1.3) * radius;
      const normalizedR = r / radius;
      const branchAngle = ((i % arms) / arms) * Math.PI * 2;
      const spinAngle = r * spin * 0.0055;

      const rX = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 25);
      const rY = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r * 0.3 + 15);
      const rZ = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 25);

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + rX;
      pos[i * 3 + 1] = rY;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + rZ;

      if (normalizedR < 0.5) {
        mixed.copy(dustCyan).lerp(dustPurple, normalizedR / 0.5);
      } else {
        mixed.copy(dustPurple).lerp(dustMagenta, (normalizedR - 0.5) / 0.5);
      }

      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }

    return { dustPositions: pos, dustColors: col };
  }, [isLowEnd]);

  useFrame((state, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    if (galaxyRef.current) galaxyRef.current.rotation.y += dt * 0.01;
    if (dustRef.current) dustRef.current.rotation.y += dt * 0.008;
  });

  return (
    <group position={[15, -20, -70]} rotation={[0.48, 0.2, -0.15]}>
      <points ref={galaxyRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={3.0}
          map={starTexture}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <points ref={dustRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={dustPositions.length / 3} array={dustPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={dustColors.length / 3} array={dustColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={10.0}
          map={starTexture}
          vertexColors
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Station layout + labels. `idx` is the number shown in the HUD and on the map.
const STATIONS = [
  { id: 0, idx: '02', name: 'Core', meta: 'Profile', pos: [0, 0, 0], rot: [0, 0, 0], size: 5 },
  { id: 1, idx: '03', name: 'Deployments', short: 'Work', meta: 'Selected work', pos: [180, 60, -120], rot: [0, -0.1, 0], size: 5 },
  { id: 2, idx: '01', name: 'Optics', meta: 'Photography', pos: [-150, -40, -160], rot: [0, 0.1, 0], size: 5 },
  { id: 3, idx: '05', name: 'Sun', meta: 'Sol · G2V', pos: [-60, -40, 40], rot: [0, 0.1, 0], size: 2.5, widget: 'sun' },
  { id: 4, idx: '06', name: 'Weather', meta: 'In development', pos: [70, 75, -40], rot: [-0.1, -0.1, 0], size: 2.5, widget: 'weather' },
  { id: 5, idx: '07', name: 'Monopoly', meta: 'In development', pos: [110, -50, -160], rot: [0.1, 0.1, 0], size: 2.5, widget: 'monopoly' },
  { id: 6, idx: '04', name: 'Acoustics', short: 'Sound', meta: 'MIDI recordings', pos: [-120, 80, -60], rot: [0, 0.08, 0], size: 4 },
];
const NAV_ORDER = [2, 0, 1, 6];

// drei's <Html transform> panels live inside an overflow:hidden wrapper. When a
// control inside a panel takes focus, the browser "scrolls it into view" by
// scrolling that wrapper, which shoves the whole 3D layer off screen. Pin it.
function lockScroll(canvas) {
  [canvas.parentElement, canvas.parentElement?.parentElement].forEach((el) => {
    if (!el) return;
    el.addEventListener('scroll', () => {
      if (el.scrollTop || el.scrollLeft) el.scrollTo(0, 0);
    });
  });
}

// R3F derives the pointer from event.offsetX/Y, which is wrong whenever the page
// is scaled (browser zoom/emulation, CSS transforms). Use client coordinates
// against the canvas rect instead so clicks always land where they look.
const clientCoordEvents = (store) => ({
  ...defaultEvents(store),
  compute(event, state) {
    const r = state.gl.domElement.getBoundingClientRect();
    state.pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    state.raycaster.setFromCamera(state.pointer, state.camera);
  },
});

function readFxPref() {
  try { return localStorage.getItem('sloboz-fx') !== 'off'; } catch { return true; }
}

const fmtCoord = (v) => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1).padStart(5, '0')}`;

/** Writes the live camera position into the HUD (DOM write only when it changes). */
function CameraReadout({ elRef }) {
  const last = useRef('');
  useFrame(({ camera }) => {
    const el = elRef.current;
    if (!el) return;
    const p = camera.position;
    const s = `X ${fmtCoord(p.x)}  Y ${fmtCoord(p.y)}  Z ${fmtCoord(p.z)}`;
    if (s !== last.current) {
      el.textContent = s;
      last.current = s;
    }
  });
  return null;
}

function UtcClock() {
  const ref = useRef();
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = new Date().toISOString().slice(11, 19);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span ref={ref} />;
}

function StationContent({ station, onBack }) {
  if (station.id === 0) return <Hero />;
  if (station.id === 1) return <Projects />;
  if (station.id === 2) {
    return (
      <Suspense fallback={null}>
        <OpticsArchive />
      </Suspense>
    );
  }
  return <WidgetHub type={station.widget} onBack={onBack} />;
}

const CRT_OFF_MS = 1250; // keep in step with the crt-collapse animation in index.css
const CRT_ON_MS = 1300;  // and crt-warmup

// CRT sounds: static crackle for the warm-up, the classic tube "thunk" and
// whine for the power-off. They play from the click (so browsers allow them)
// and follow the site volume set in the Acoustics player. The warm-up clip
// is four seconds long, so it fades out as the picture settles.
const CRT_SOUNDS = { on: './sounds/crt-on.mp3', off: './sounds/crt-off.wav' };
const crtAudio = {};
let crtFade = 0;
const getCrtSound = (name) => {
  if (!crtAudio[name]) {
    crtAudio[name] = new Audio(CRT_SOUNDS[name]);
    crtAudio[name].preload = 'auto';
  }
  return crtAudio[name];
};
const preloadCrtSounds = () => Object.keys(CRT_SOUNDS).forEach(getCrtSound);
function stopCrtSounds() {
  clearInterval(crtFade);
  Object.values(crtAudio).forEach((a) => a.pause());
}
// fade = [startMs, endMs] to fade out over, or null to play the whole clip
function playCrtSound(name, fade = null) {
  let vol = 0.8;
  try {
    const v = parseFloat(localStorage.getItem('sloboz-volume'));
    if (Number.isFinite(v)) vol = v;
  } catch { /* private mode */ }
  const peak = 0.6 * vol * vol; // same perceptual curve as the piano
  stopCrtSounds();
  if (peak <= 0) return;
  const a = getCrtSound(name);
  a.currentTime = 0;
  a.volume = peak;
  a.play().catch(() => { /* blocked or not loaded: stay silent */ });
  if (!fade) return;
  const [from, to] = fade;
  const t0 = performance.now();
  crtFade = setInterval(() => {
    const t = performance.now() - t0;
    if (t >= to) { stopCrtSounds(); return; }
    a.volume = t < from ? peak : peak * (1 - (t - from) / (to - from));
  }, 30);
}

export default function SpatialScene() {
  const palette = usePalette();
  const [station, setStation] = useState(0);
  // The mini player only matters once the piano room has been opened
  const [heardPiano, setHeardPiano] = useState(false);
  useEffect(() => { if (station === IMMERSIVE) setHeardPiano(true); }, [station]);
  const [fx, setFx] = useState(readFxPref);
  const { isMobile, isLowEnd, reducedMotion } = useDeviceCapabilities();
  const activeRef = useRef(true);
  const readoutRef = useRef();

  const stations = useMemo(() => STATIONS.map((s) => new THREE.Vector3(...s.pos)), []);
  const isConstellation = station === CONSTELLATION;
  const current = STATIONS[station];

  // Responsive monitor dimensions (CSS px), per station
  const monitorSizes = useMemo(() => {
    const widget = isMobile ? [360, 500] : [680, 460];
    return [
      isMobile ? [380, 580] : [920, 520],   // Core
      isMobile ? [380, 680] : [1000, 800],  // Deployments
      isMobile ? [380, 680] : [1200, 800],  // Optics
      widget, widget, widget,
    ];
  }, [isMobile]);

  const goToMap = () => setStation(CONSTELLATION);

  // Turning FX off plays an old-CRT power-off: the picture (effects still on)
  // collapses to a bright line, then a dot, goes dark, and the clean view fades
  // back in. 1 = collapsing, 2 = coming back without effects.
  // Turning it on plays a struggling warm-up: the tube flickers on and off
  // through heavy static for about a second, then settles.
  const [shutdown, setShutdown] = useState(0);
  const [startup, setStartup] = useState(false);
  const crtTimers = useRef([]);
  const toggleFx = () => {
    crtTimers.current.forEach(clearTimeout);
    crtTimers.current = [];
    setShutdown(0);
    setStartup(false);
    stopCrtSounds();
    if (!reducedMotion) {
      if (fx) {
        setShutdown(1);
        playCrtSound('off');
        crtTimers.current = [
          setTimeout(() => setShutdown(2), CRT_OFF_MS * 0.45),
          setTimeout(() => setShutdown(0), CRT_OFF_MS),
        ];
      } else {
        setStartup(true);
        playCrtSound('on', [CRT_ON_MS * 0.7, CRT_ON_MS + 450]);
        crtTimers.current = [setTimeout(() => setStartup(false), CRT_ON_MS)];
      }
    }
    setFx((v) => !v);
  };
  useEffect(() => () => crtTimers.current.forEach(clearTimeout), []);
  const showFx = fx || shutdown === 1;

  useEffect(() => {
    try { localStorage.setItem('sloboz-fx', fx ? 'on' : 'off'); } catch { /* private mode */ }
  }, [fx]);

  // Prefetch the gallery chunk once the scene has settled, so opening Optics is instant
  useEffect(() => {
    const t = setTimeout(() => { loadOptics(); loadAcoustics(); preloadCrtSounds(); }, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
    <div className={`stage${showFx ? ' fx-on' : ''}${station === IMMERSIVE ? ' is-immersive' : ''}${shutdown ? ' crt-shutdown' : ''}${startup ? ' crt-startup' : ''}`}>
      <div className="stage-vignette" aria-hidden="true" />
      {/* Deep stage vignette for the immersive Acoustics station */}
      <div className="stage-spot" aria-hidden="true" />

      {/* ── HUD ── */}
      <header className="hud-top">
        <button className="brand" onClick={() => setStation(0)} aria-label="sloboz.dev, go to Core">
          sloboz<span>.dev</span>
        </button>

        <nav className="hud-nav" aria-label="Sections">
          {NAV_ORDER.map((id) => {
            const s = STATIONS[id];
            return (
              <button key={id} className="nav-item" aria-current={station === id} onClick={() => setStation(id)}>
                <span className="idx">{s.idx}</span>
                {isMobile && s.short ? s.short : s.name}
              </button>
            );
          })}
        </nav>

        <div className="hud-actions">
          <button
            className="chip-btn fx-toggle"
            aria-pressed={fx}
            onClick={toggleFx}
            title="Toggle the CRT / chromatic aberration effects"
          >
            <span className="led" aria-hidden="true" />FX
          </button>
          <button
            className="chip-btn palette-btn"
            onClick={(e) => cyclePalette(e.shiftKey ? -1 : 1)}
            title="Next colour palette (Shift-click for the previous one)"
            aria-label={`Colour palette: ${palette.name}. Click for the next one`}
          >
            <span className="swatch" aria-hidden="true" />
            <span className="palette-name">{palette.name}</span>
          </button>
          <button className="chip-btn map-btn" aria-current={isConstellation} onClick={goToMap}>
            Map
          </button>
        </div>
      </header>

      <footer className="hud-bottom" aria-hidden="true">
        <div className="hud-readout">
          <span className="hud-label">{isConstellation ? '00' : current.idx}</span>
          <span className="hud-value">{isConstellation ? 'System map' : current.name}</span>
          <span className="hud-coords" ref={readoutRef} />
        </div>
        <div className="hud-readout hud-readout--right">
          {isConstellation && <span className="hud-hint">{isMobile ? 'Drag to orbit · tap a node' : 'Drag to orbit · scroll to zoom · click a node'}</span>}
          <span className="hud-label">UTC</span>
          <span className="hud-value"><UtcClock /></span>
        </div>
      </footer>

      <div className="frame-corners" aria-hidden="true"><i /><i /><i /><i /></div>
      {showFx && <div className="crt" aria-hidden="true" />}
      {station === IMMERSIVE && (
        <Suspense fallback={null}>
          <AcousticsOverlay onExit={goToMap} />
        </Suspense>
      )}
      {/* Outside the piano room, a small player for whatever is on the piano */}
      {heardPiano && station !== IMMERSIVE && (
        <Suspense fallback={null}>
          <MiniPlayer />
        </Suspense>
      )}

      <Canvas
        frameloop="demand"
        events={clientCoordEvents}
        camera={{ position: [0, 2, 15], fov: CAMERA_FOV, near: 0.5, far: 5000 }}
        dpr={isLowEnd ? [0.75, 1] : 1}
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          stencil: false,
          depth: true,
          alpha: false,
          precision: isLowEnd ? 'mediump' : 'highp'
        }}
        style={{ pointerEvents: isConstellation || station === IMMERSIVE ? 'auto' : 'none' }}
        onCreated={({ gl }) => {
          lockScroll(gl.domElement);
          requestAnimationFrame(() => requestAnimationFrame(hideBoot));
        }}
      >
        <color attach="background" args={[palette.background]} />

        <NormalsView on={!!palette.normals} />
        <FrameDriver activeRef={activeRef} idleFps={station === IMMERSIVE ? 120 : reducedMotion ? 15 : IDLE_FPS} />
        <CameraReadout elRef={readoutRef} />

        <SpaceDecor isLowEnd={isLowEnd} reducedMotion={reducedMotion} />
        <ProceduralGalaxy isLowEnd={isLowEnd} reducedMotion={reducedMotion} />

        {isConstellation && <ConstellationLines stations={stations} />}

        <CameraController
          station={station}
          stations={stations}
          isMobile={isMobile}
          monitorSize={isConstellation || station === IMMERSIVE ? null : monitorSizes[station]}
          activeRef={activeRef}
          reducedMotion={reducedMotion}
          immersive={station === IMMERSIVE}
        />

        {STATIONS.map((s) => (
          <group key={s.id} position={stations[s.id]}>
            {isConstellation && (
              <ConstellationBeacon
                position={s.id === IMMERSIVE ? [0, 9.5, 0] : [0, 0, 0]}
                index={s.idx}
                label={s.name}
                size={s.size}
                onClick={() => setStation(s.id)}
              />
            )}
            {s.id === IMMERSIVE && (
              <Suspense fallback={null}>
                <AcousticsWorld active={station === IMMERSIVE} />
              </Suspense>
            )}
            {station === s.id && s.id !== IMMERSIVE && (
              <Monitor
                position={[0, 0, 0]}
                rotation={s.rot}
                width={monitorSizes[s.id][0]}
                height={monitorSizes[s.id][1]}
                scrollable={!s.widget && s.id !== 2} // Optics pans its own wall
                index={s.idx}
                label={s.name}
                meta={s.meta}
              >
                <StationContent station={s} onBack={goToMap} />
              </Monitor>
            )}
          </group>
        ))}

        {/* Post-processing: skipped (and never downloaded) on mobile/low-end devices */}
        {!isLowEnd && (
          <Suspense fallback={null}>
            <Effects fx={showFx} bloom={palette.bloom} />
          </Suspense>
        )}
      </Canvas>
    </div>
    {shutdown > 0 && <div className="crt-flash" aria-hidden="true" />}
    {startup && <div className="crt-static" aria-hidden="true" />}
    </>
  );
}
