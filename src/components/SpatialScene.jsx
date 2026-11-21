import React, { useRef, useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import Monitor, { MONITOR_PX_TO_WORLD } from './Monitor';
import Hero from './Hero';
import WidgetHub from './WidgetHub';
import Projects from './Projects';
import { hideBoot } from '../boot';

const Effects = lazy(() => import('./Effects'));
// The gallery (and its photo list, which grows over time) stays out of the first bundle
const loadOptics = () => import('./OpticsArchive');
const OpticsArchive = lazy(loadOptics);

const CAMERA_FOV = 60;
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2);
// Exponential damping rate for camera flights (≈ the old 0.06-per-frame lerp at 60 fps,
// but now independent of refresh rate: same speed on 30, 60 or 144 Hz screens)
const CAMERA_DAMPING = 3.7;
// Frame rate used while nothing is moving except the slow galaxy drift
const IDLE_FPS = 30;
const CONSTELLATION = 6;

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

function CameraController({ station, stations, isMobile, monitorSize, activeRef, reducedMotion }) {
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

    if (isConstellation) {
      if (isTransitioningRef.current) {
        const distPos = camera.position.distanceTo(constellationDefaultPos);
        const distLook = lookAtTarget.current.distanceTo(constellationCenter);

        if (distPos > 0.5 || distLook > 0.5) {
          camera.position.lerp(constellationDefaultPos, t);
          lookAtTarget.current.lerp(constellationCenter, t);
          camera.lookAt(lookAtTarget.current);
          activeRef.current = true;
        } else {
          camera.position.copy(constellationDefaultPos);
          lookAtTarget.current.copy(constellationCenter);
          camera.lookAt(lookAtTarget.current);
          isTransitioningRef.current = false;
          activeRef.current = false;
          if (controlsRef.current) {
            controlsRef.current.target.copy(constellationCenter);
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

    const target = stations[station] || stations[0];
    desiredPosVec.set(target.x, target.y, target.z + distance);

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
      enabled={false}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.8}
      minDistance={40}
      maxDistance={isMobile ? 650 : 500}
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
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [stations]);

  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#00e5ff" transparent opacity={0.35} depthWrite={false} depthTest={false} />
    </lineSegments>
  );
}

function ConstellationBeacon({ position, color, onClick, label, size = 5 }) {
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
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Glowing outer wireframe */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[size * 1.15, 0]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.65 : 0.35} wireframe />
      </mesh>

      {label && (
        <Html
          center
          position={[0, -(size + 4), 0]}
          zIndexRange={[0, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: size < 4 ? '10.5px' : '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color,
            textShadow: `0 0 10px ${color}`,
            background: 'rgba(5, 5, 12, 0.88)',
            padding: size < 4 ? '3px 8px' : '4px 10px',
            borderRadius: '12px',
            border: `1px solid ${color}66`,
            boxShadow: `0 0 14px ${color}33`,
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: hovered ? 'scale(1.15)' : 'scale(1)',
          }}>
            {label}
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
  gradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.25)');
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

    const colorCore = new THREE.Color('#fff7ed');
    const colorCyan = new THREE.Color('#00e5ff');
    const colorPurple = new THREE.Color('#a855f7');
    const colorMagenta = new THREE.Color('#ff007f');
    const tintCyan = new THREE.Color('#67e8f9');
    const tintGold = new THREE.Color('#fef08a');
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

    const dustCyan = new THREE.Color('#00e5ff');
    const dustPurple = new THREE.Color('#9333ea');
    const dustMagenta = new THREE.Color('#ec4899');
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

function DistantStarfield({ isLowEnd = false }) {
  const count = isLowEnd ? 1500 : 3500;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4500;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4500;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4500;
    }
    return pos;
  }, [count]);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.5} color="#ffffff" sizeAttenuation={false} transparent opacity={0.65} depthWrite={false} depthTest={false} />
    </points>
  );
}

const NAV_ITEMS = [
  { station: 2, label: 'OPTICS', color: '#a855f7' },
  { station: 0, label: 'CORE', color: '#00e5ff' },
  { station: 1, label: 'DEPLOYMENTS', short: 'DEPLOY', color: '#ff007f' },
];

export default function SpatialScene() {
  const [station, setStation] = useState(0);
  const { isMobile, isLowEnd, reducedMotion } = useDeviceCapabilities();
  const activeRef = useRef(true);

  // Fixed asymmetrical constellation layout with 6 stations
  const stations = useMemo(() => [
    new THREE.Vector3(0, 0, 0),             // 0: Core
    new THREE.Vector3(180, 60, -120),       // 1: Deployments
    new THREE.Vector3(-150, -40, -160),     // 2: Optics Archive
    new THREE.Vector3(-60, -40, 40),        // 3: Sun Timer
    new THREE.Vector3(70, 75, -40),         // 4: Weather Radar
    new THREE.Vector3(110, -50, -160)       // 5: Monopoly Treasury
  ], []);

  const isConstellation = station === CONSTELLATION;

  // Responsive monitor dimensions (CSS px), per station
  const monitorSizes = useMemo(() => {
    const widget = isMobile ? [360, 500] : [680, 460];
    return [
      isMobile ? [380, 560] : [900, 500],   // Core
      isMobile ? [380, 680] : [1000, 800],  // Deployments
      isMobile ? [380, 680] : [1200, 800],  // Optics
      widget, widget, widget,
    ];
  }, [isMobile]);

  const goToMap = () => setStation(CONSTELLATION);

  // Prefetch the gallery chunk once the scene has settled, so opening Optics is instant
  useEffect(() => {
    const t = setTimeout(loadOptics, 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#030204', overflow: 'hidden' }}>

      {/* Zero-cost radial vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, transparent 60%, rgba(3, 2, 4, 0.75) 100%)',
        zIndex: 2
      }} />

      <nav className="hud" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.station}
            className="hud-btn"
            style={{ '--c': item.color }}
            aria-current={station === item.station}
            onClick={() => setStation(item.station)}
          >
            {isMobile && item.short ? item.short : item.label}
          </button>
        ))}

        <div className="hud-sep" aria-hidden="true" />

        <button className="hud-btn hud-btn--map" aria-current={isConstellation} onClick={goToMap}>
          <span aria-hidden="true">✦</span> {isMobile ? 'MAP' : 'CONSTELLATION'}
        </button>
      </nav>

      {isConstellation && (
        <div className="hud-hint">
          {isMobile ? 'drag to orbit · tap a star' : 'drag to orbit · scroll to zoom · click a star'}
        </div>
      )}

      <Canvas
        frameloop="demand"
        camera={{ position: [0, 2, 15], fov: CAMERA_FOV }}
        dpr={isLowEnd ? [0.75, 1] : 1}
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          stencil: false,
          depth: true,
          alpha: false,
          precision: isLowEnd ? 'mediump' : 'highp'
        }}
        style={{ pointerEvents: isConstellation ? 'auto' : 'none' }}
        onCreated={() => requestAnimationFrame(() => requestAnimationFrame(hideBoot))}
      >
        <color attach="background" args={['#030204']} />

        <FrameDriver activeRef={activeRef} idleFps={reducedMotion ? 15 : IDLE_FPS} />

        <DistantStarfield isLowEnd={isLowEnd} />
        <ProceduralGalaxy isLowEnd={isLowEnd} reducedMotion={reducedMotion} />

        {isConstellation && <ConstellationLines stations={stations} />}

        <CameraController
          station={station}
          stations={stations}
          isMobile={isMobile}
          monitorSize={isConstellation ? null : monitorSizes[station]}
          activeRef={activeRef}
          reducedMotion={reducedMotion}
        />

        {/* STATION 1: CORE */}
        <group position={stations[0]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#00e5ff" label="CORE" size={5} onClick={() => setStation(0)} />
          )}
          {station === 0 && (
            <Monitor position={[0, 0, 0]} rotation={[0, 0, 0]} width={monitorSizes[0][0]} height={monitorSizes[0][1]} accent="#00e5ff">
              <Hero />
            </Monitor>
          )}
        </group>

        {/* STATION 2: DEPLOYMENTS */}
        <group position={stations[1]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#ff007f" label="DEPLOYMENTS" size={5} onClick={() => setStation(1)} />
          )}
          {station === 1 && (
            <Monitor position={[0, 0, 0]} rotation={[0, -0.1, 0]} width={monitorSizes[1][0]} height={monitorSizes[1][1]} accent="#ff007f">
              <Projects />
            </Monitor>
          )}
        </group>

        {/* STATION 3: OPTICS ARCHIVE */}
        <group position={stations[2]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#a855f7" label="OPTICS ARCHIVE" size={5} onClick={() => setStation(2)} />
          )}
          {station === 2 && (
            <Monitor position={[0, 0, 0]} rotation={[0, 0.1, 0]} width={monitorSizes[2][0]} height={monitorSizes[2][1]} accent="#a855f7">
              <Suspense fallback={null}>
                <OpticsArchive />
              </Suspense>
            </Monitor>
          )}
        </group>

        {/* STATION 4: SUN TIMER SATELLITE */}
        <group position={stations[3]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#f59e0b" label="SUN TIMER" size={2.5} onClick={() => setStation(3)} />
          )}
          {station === 3 && (
            <Monitor scrollable={false} position={[0, 0, 0]} rotation={[0, 0.1, 0]} width={monitorSizes[3][0]} height={monitorSizes[3][1]} accent="#ffb000">
              <WidgetHub type="sun" onBack={goToMap} />
            </Monitor>
          )}
        </group>

        {/* STATION 5: WEATHER RADAR SATELLITE */}
        <group position={stations[4]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#10b981" label="WEATHER" size={2.5} onClick={() => setStation(4)} />
          )}
          {station === 4 && (
            <Monitor scrollable={false} position={[0, 0, 0]} rotation={[-0.1, -0.1, 0]} width={monitorSizes[4][0]} height={monitorSizes[4][1]} accent="#10b981">
              <WidgetHub type="weather" onBack={goToMap} />
            </Monitor>
          )}
        </group>

        {/* STATION 6: MONOPOLY TREASURY SATELLITE */}
        <group position={stations[5]}>
          {isConstellation && (
            <ConstellationBeacon position={[0, 0, 0]} color="#eab308" label="MONOPOLY" size={2.5} onClick={() => setStation(5)} />
          )}
          {station === 5 && (
            <Monitor scrollable={false} position={[0, 0, 0]} rotation={[0.1, 0.1, 0]} width={monitorSizes[5][0]} height={monitorSizes[5][1]} accent="#eab308">
              <WidgetHub type="monopoly" onBack={goToMap} />
            </Monitor>
          )}
        </group>

        {/* Post-processing: skipped (and never downloaded) on mobile/low-end devices */}
        {!isLowEnd && (
          <Suspense fallback={null}>
            <Effects />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
