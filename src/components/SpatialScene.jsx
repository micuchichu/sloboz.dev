import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import Monitor from './Monitor';
import Hero from './Hero';
import WidgetHub from './WidgetHub';
import Projects from './Projects';
import OpticsArchive from './OpticsArchive';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

function CameraController({ station, stations, isMobile }) {
  const controlsRef = useRef();
  const isTransitioningRef = useRef(false);
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPosVec = useMemo(() => new THREE.Vector3(), []);
  const constellationCenter = useMemo(() => new THREE.Vector3(10, 10, -80), []);
  const constellationDefaultPos = useMemo(() => 
    isMobile ? new THREE.Vector3(10, 200, 320) : new THREE.Vector3(10, 140, 210), 
    [isMobile]
  );
  const isConstellation = station === 6;

  useEffect(() => {
    isTransitioningRef.current = true;
    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [station]);

  useFrame((state) => {
    if (isConstellation) {
      if (isTransitioningRef.current) {
        const distPos = state.camera.position.distanceTo(constellationDefaultPos);
        const distLook = lookAtTarget.current.distanceTo(constellationCenter);

        if (distPos > 0.5 || distLook > 0.5) {
          state.camera.position.lerp(constellationDefaultPos, 0.06);
          lookAtTarget.current.lerp(constellationCenter, 0.06);
          state.camera.lookAt(lookAtTarget.current);
        } else {
          state.camera.position.copy(constellationDefaultPos);
          lookAtTarget.current.copy(constellationCenter);
          state.camera.lookAt(lookAtTarget.current);
          isTransitioningRef.current = false;
          if (controlsRef.current) {
            controlsRef.current.target.copy(constellationCenter);
            controlsRef.current.enabled = true;
            controlsRef.current.update();
          }
        }
      } else {
        if (controlsRef.current && controlsRef.current.enabled) {
          controlsRef.current.update();
          lookAtTarget.current.copy(controlsRef.current.target);
        }
      }
    } else {
      const target = stations[station] || stations[0];
      const cameraDistance = isMobile ? 16 : 15;
      desiredPosVec.set(target.x, target.y, target.z + cameraDistance);

      const distPos = state.camera.position.distanceTo(desiredPosVec);
      const distLook = lookAtTarget.current.distanceTo(target);

      if (distPos > 0.01) {
        state.camera.position.lerp(desiredPosVec, 0.06);
      } else {
        state.camera.position.copy(desiredPosVec);
      }

      if (distLook > 0.01) {
        lookAtTarget.current.lerp(target, 0.06);
      } else {
        lookAtTarget.current.copy(target);
      }

      state.camera.lookAt(lookAtTarget.current);
    }
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

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#00e5ff" transparent opacity={0.35} depthWrite={false} depthTest={false} />
    </lineSegments>
  );
}

function ConstellationBeacon({ position, color, onClick, label, size = 5 }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const targetScaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * (hovered ? 1.0 : 0.4);
      meshRef.current.rotation.y += delta * (hovered ? 1.4 : 0.6);
    }
    if (groupRef.current) {
      const s = hovered ? 1.35 : 1.0;
      targetScaleVec.set(s, s, s);
      groupRef.current.scale.lerp(targetScaleVec, 0.1);
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
      <mesh>
        <icosahedronGeometry args={[hovered ? size * 1.25 : size * 1.15, 0]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.65 : 0.35} wireframe />
      </mesh>

      <pointLight color={color} intensity={hovered ? 8 : (size > 3 ? 4 : 2)} distance={size > 3 ? 80 : 45} />

      {/* Crisp Always-Readable Floating Label Badge */}
      {label && (
        <Html
          center
          position={[0, -(size + 4), 0]}
          zIndexRange={[0, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{
            fontFamily: 'monospace',
            fontSize: size < 4 ? '11px' : '12.5px',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            color: color,
            textShadow: `0 0 10px ${color}`,
            background: 'rgba(5, 5, 12, 0.85)',
            backdropFilter: 'blur(8px)',
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

function ProceduralGalaxy() {
  const galaxyRef = useRef();
  const dustRef = useRef();

  // Create soft radial glow star particle texture
  const starTexture = useMemo(() => {
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
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // 22,000 High-Performance Spiral Galaxy Stars
  const { positions, colors } = useMemo(() => {
    const count = 22000;
    const arms = 3;
    const radius = 900;
    const spin = 1.35;
    const randomness = 0.4;
    const power = 3.2;

    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const colorCore = new THREE.Color('#fff7ed'); // Warm white-gold core
    const colorCyan = new THREE.Color('#00e5ff'); // Electric cyan mid arm
    const colorPurple = new THREE.Color('#a855f7'); // Deep purple
    const colorMagenta = new THREE.Color('#ff007f'); // Magenta nebulae outer edge

    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * radius;
      const normalizedR = r / radius;

      // Logarithmic Spiral Arm Angles
      const branchAngle = ((i % arms) / arms) * Math.PI * 2;
      const spinAngle = r * spin * 0.0055;

      // Arm Dispersion
      const rX = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 20);
      const rY = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r * 0.25 + 10);
      const rZ = Math.pow(Math.random(), power) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 20);

      pos[i * 3] = Math.cos(branchAngle + spinAngle) * r + rX;
      pos[i * 3 + 1] = rY;
      pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * r + rZ;

      // Color Gradient
      const mixedColor = new THREE.Color();
      if (normalizedR < 0.25) {
        mixedColor.copy(colorCore).lerp(colorCyan, normalizedR / 0.25);
      } else if (normalizedR < 0.65) {
        mixedColor.copy(colorCyan).lerp(colorPurple, (normalizedR - 0.25) / 0.4);
      } else {
        mixedColor.copy(colorPurple).lerp(colorMagenta, (normalizedR - 0.65) / 0.35);
      }

      if (Math.random() > 0.9) {
        mixedColor.lerp(new THREE.Color('#67e8f9'), 0.3);
      } else if (Math.random() > 0.95) {
        mixedColor.lerp(new THREE.Color('#fef08a'), 0.4);
      }

      col[i * 3] = mixedColor.r;
      col[i * 3 + 1] = mixedColor.g;
      col[i * 3 + 2] = mixedColor.b;
    }

    return { positions: pos, colors: col };
  }, []);

  // 1,200 Soft Nebula Gas Clouds (Eliminates Fill-Rate Overdraw)
  const { dustPositions, dustColors } = useMemo(() => {
    const dustCount = 1200;
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

      const mixed = new THREE.Color();
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
  }, []);

  // Smooth galactic rotation
  useFrame((state, delta) => {
    if (galaxyRef.current) {
      galaxyRef.current.rotation.y += delta * 0.01;
    }
    if (dustRef.current) {
      dustRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <group position={[15, -20, -70]} rotation={[0.48, 0.2, -0.15]}>
      {/* Optimized Spiral Galaxy Stars */}
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

      {/* Lightweight Nebula Dust Clouds */}
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

function DistantStarfield() {
  const count = 4000;
  
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

export default function SpatialScene() {
  const [station, setStation] = useState(0);
  const isMobile = useIsMobile();
  
  // Fixed asymmetrical constellation layout with 6 stations
  const stations = useMemo(() => [
    new THREE.Vector3(0, 0, 0),             // 0: Core
    new THREE.Vector3(180, 60, -120),       // 1: Deployments
    new THREE.Vector3(-150, -40, -160),     // 2: Optics Archive
    new THREE.Vector3(-60, -40, 40),        // 3: Sun Timer
    new THREE.Vector3(70, 75, -40),         // 4: Weather Radar
    new THREE.Vector3(110, -50, -160)       // 5: Monopoly Treasury
  ], []);

  const isConstellation = station === 6;

  // Dynamic responsive dimensions for 3D Monitors
  const coreWidth = isMobile ? 380 : 900;
  const coreHeight = isMobile ? 560 : 500;
  const projectsWidth = isMobile ? 380 : 1000;
  const projectsHeight = isMobile ? 680 : 800;
  const opticsWidth = isMobile ? 380 : 1200;
  const opticsHeight = isMobile ? 680 : 800;
  const widgetWidth = isMobile ? 340 : 420;
  const widgetHeight = 340;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* 2D HUD Navigation Overlay */}
      <div style={{
        position: 'absolute',
        top: isMobile ? 'max(0.8rem, env(safe-area-inset-top, 0.8rem))' : '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999999,
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '4px' : '0.6rem',
        background: 'rgba(5, 5, 10, 0.75)',
        backdropFilter: 'blur(16px)',
        padding: isMobile ? '0.4rem 0.5rem' : '0.6rem 1rem',
        borderRadius: '35px',
        border: '1px solid rgba(0, 229, 255, 0.35)',
        boxShadow: '0 0 25px rgba(0, 229, 255, 0.2)',
        maxWidth: 'calc(100vw - 1rem)',
        width: 'max-content',
        boxSizing: 'border-box'
      }}>
        <button 
          onClick={() => setStation(2)} 
          style={{ 
            background: station === 2 ? 'var(--accent-1)' : 'transparent', 
            color: station === 2 ? '#000' : 'var(--text-main)', 
            border: 'none', 
            padding: isMobile ? '8px 10px' : '10px 18px', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            letterSpacing: isMobile ? '0px' : '0.5px',
            touchAction: 'manipulation',
            transition: 'all 0.2s' 
          }}
        >
          OPTICS
        </button>
        <button 
          onClick={() => setStation(0)} 
          style={{ 
            background: station === 0 ? 'var(--accent-1)' : 'transparent', 
            color: station === 0 ? '#000' : 'var(--text-main)', 
            border: 'none', 
            padding: isMobile ? '8px 10px' : '10px 18px', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            letterSpacing: isMobile ? '0px' : '0.5px',
            touchAction: 'manipulation',
            transition: 'all 0.2s' 
          }}
        >
          CORE
        </button>
        <button 
          onClick={() => setStation(1)} 
          style={{ 
            background: station === 1 ? 'var(--accent-1)' : 'transparent', 
            color: station === 1 ? '#000' : 'var(--text-main)', 
            border: 'none', 
            padding: isMobile ? '8px 10px' : '10px 18px', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            letterSpacing: isMobile ? '0px' : '0.5px',
            touchAction: 'manipulation',
            transition: 'all 0.2s' 
          }}
        >
          {isMobile ? 'DEPLOY' : 'DEPLOYMENTS'}
        </button>
        
        <div style={{ width: '1px', height: isMobile ? '16px' : '20px', background: 'rgba(255,255,255,0.18)', margin: '0 2px' }} />
        
        <button 
          onClick={() => setStation(6)} 
          style={{ 
            background: station === 6 ? 'linear-gradient(135deg, #00e5ff, #ff007f)' : 'rgba(255,255,255,0.06)', 
            color: station === 6 ? '#ffffff' : 'var(--accent-1)', 
            border: station === 6 ? 'none' : '1px solid rgba(0, 229, 255, 0.4)', 
            padding: isMobile ? '8px 10px' : '10px 18px', 
            borderRadius: '20px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            letterSpacing: isMobile ? '0px' : '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            touchAction: 'manipulation',
            boxShadow: station === 6 ? '0 0 20px rgba(0, 229, 255, 0.6)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span>✦</span> {isMobile ? 'MAP' : 'CONSTELLATION'}
        </button>
      </div>

      <div style={{ width: '100%', height: '100%' }}>
        <Canvas 
          camera={{ position: [0, 2, 15], fov: 60 }} 
          dpr={1} 
          gl={{ powerPreference: 'high-performance', antialias: false, stencil: false, depth: true }}
          style={{ pointerEvents: isConstellation ? 'auto' : 'none' }}
        >
          <color attach="background" args={['#030204']} />
          <ambientLight intensity={0.25} />
          <pointLight position={[100, 100, 100]} intensity={2} color="#00e5ff" />
          <pointLight position={[-100, 50, -100]} intensity={2} color="#ff007f" />
          
          <DistantStarfield />
          <ProceduralGalaxy />
          
          {isConstellation && <ConstellationLines stations={stations} />}

          <CameraController station={station} stations={stations} isMobile={isMobile} />

          {/* STATION 1: CORE */}
          <group position={stations[0]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#00e5ff" label="CORE" size={5} onClick={() => setStation(0)} />
            )}
            <group visible={!isConstellation && station === 0}>
              <Monitor isHidden={isConstellation || station !== 0} position={[0, 0, 0]} rotation={[0, 0, 0]} width={coreWidth} height={coreHeight}>
                <Hero />
              </Monitor>
            </group>
          </group>

          {/* STATION 2: DEPLOYMENTS */}
          <group position={stations[1]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#ff007f" label="DEPLOYMENTS" size={5} onClick={() => setStation(1)} />
            )}
            <group visible={!isConstellation && station === 1}>
              <Monitor isHidden={isConstellation || station !== 1} position={[0, 0, 0]} rotation={[0, -0.1, 0]} width={projectsWidth} height={projectsHeight}>
                <Projects />
              </Monitor>
            </group>
          </group>

          {/* STATION 3: OPTICS ARCHIVE */}
          <group position={stations[2]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#a855f7" label="OPTICS ARCHIVE" size={5} onClick={() => setStation(2)} />
            )}
            <group visible={!isConstellation && station === 2}>
              <Monitor isHidden={isConstellation || station !== 2} position={[0, 0, 0]} rotation={[0, 0.1, 0]} width={opticsWidth} height={opticsHeight}>
                <OpticsArchive />
              </Monitor>
            </group>
          </group>

          {/* STATION 4: SUN TIMER SATELLITE */}
          <group position={stations[3]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#f59e0b" label="SUN TIMER" size={2.5} onClick={() => setStation(3)} />
            )}
            <group visible={!isConstellation && station === 3}>
              <Monitor isHidden={isConstellation || station !== 3} scrollable={false} position={[0, 0, 0]} rotation={[0, 0.1, 0]} width={widgetWidth} height={widgetHeight}>
                <WidgetHub type="sun" onBack={() => setStation(6)} />
              </Monitor>
            </group>
          </group>

          {/* STATION 5: WEATHER RADAR SATELLITE */}
          <group position={stations[4]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#10b981" label="WEATHER" size={2.5} onClick={() => setStation(4)} />
            )}
            <group visible={!isConstellation && station === 4}>
              <Monitor isHidden={isConstellation || station !== 4} scrollable={false} position={[0, 0, 0]} rotation={[-0.1, -0.1, 0]} width={widgetWidth} height={widgetHeight}>
                <WidgetHub type="weather" onBack={() => setStation(6)} />
              </Monitor>
            </group>
          </group>

          {/* STATION 6: MONOPOLY TREASURY SATELLITE */}
          <group position={stations[5]}>
            {isConstellation && (
              <ConstellationBeacon position={[0, 0, 0]} color="#eab308" label="MONOPOLY" size={2.5} onClick={() => setStation(5)} />
            )}
            <group visible={!isConstellation && station === 5}>
              <Monitor isHidden={isConstellation || station !== 5} scrollable={false} position={[0, 0, 0]} rotation={[0.1, 0.1, 0]} width={widgetWidth} height={widgetHeight}>
                <WidgetHub type="monopoly" onBack={() => setStation(6)} />
              </Monitor>
            </group>
          </group>

          {/* Lightweight High-Performance Post-Processing */}
          <EffectComposer multisampling={0} disableNormalPass>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.8} intensity={1.2} />
            <Vignette eskil={false} offset={0.15} darkness={1.0} />
            <ChromaticAberration offset={[0.001, 0.001]} />
          </EffectComposer>

        </Canvas>
      </div>
    </div>
  );
}
