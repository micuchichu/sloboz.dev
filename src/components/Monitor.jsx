import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// World units per CSS pixel for drei <Html transform distanceFactor={6}>
export const MONITOR_PX_TO_WORLD = 6 / 400;

export default function Monitor({ position, rotation, children, width = 900, height = 500, scrollable = true, accent = '#00e5ff' }) {
  const groupRef = useRef();
  const containerRef = useRef();
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const lastOpacity = useRef('1');
  const lastPE = useRef('auto');

  // Fade out and stop intercepting pointer events while the camera is far away (mid-flight)
  useFrame((state) => {
    const el = containerRef.current;
    if (!groupRef.current || !el) return;
    groupRef.current.getWorldPosition(worldPos);
    const distance = state.camera.position.distanceTo(worldPos);

    const opacity = distance > 38 ? Math.max(0.15, 1 - (distance - 38) * 0.005).toFixed(2) : '1';
    const pe = distance > 50 ? 'none' : 'auto';
    if (opacity !== lastOpacity.current) {
      el.style.opacity = opacity;
      lastOpacity.current = opacity;
    }
    if (pe !== lastPE.current) {
      el.style.pointerEvents = pe;
      lastPE.current = pe;
    }
  });

  const className = ['monitor', width < 600 && 'monitor--compact', !scrollable && 'monitor--static'].filter(Boolean).join(' ');

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Html
        transform
        distanceFactor={6}
        zIndexRange={[0, 0]} // Disables drei's per-frame z-index sorting
        // The canvas wrapper has pointer-events: none outside map mode, so opt back in here
        style={{ width: `${width}px`, height: `${height}px`, pointerEvents: 'auto' }}
      >
        <div
          ref={containerRef}
          className={className}
          style={{ '--accent': accent, pointerEvents: 'auto' }}
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}
