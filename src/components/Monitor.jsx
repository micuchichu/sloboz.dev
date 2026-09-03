import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Monitor({ position, rotation, children, width = 900, height = 500, scale = 0.015, spinning = false, isHidden = false, scrollable = true }) {
  const groupRef = useRef();
  const containerRef = useRef();
  const [hovered, setHovered] = useState(false);

  const worldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (spinning && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
    if (groupRef.current && containerRef.current) {
      groupRef.current.getWorldPosition(worldPos);
      const distance = state.camera.position.distanceTo(worldPos);
      
      if (distance > 38) {
        const targetOpacity = Math.max(0.15, 1 - (distance - 38) * 0.005).toFixed(2);
        if (containerRef.current.style.opacity !== targetOpacity) {
          containerRef.current.style.opacity = targetOpacity;
        }
        const targetPE = distance > 50 ? 'none' : 'auto';
        if (containerRef.current.style.pointerEvents !== targetPE) {
          containerRef.current.style.pointerEvents = targetPE;
        }
      } else {
        if (containerRef.current.style.opacity !== '1') {
          containerRef.current.style.opacity = '1';
        }
        if (containerRef.current.style.pointerEvents !== 'auto') {
          containerRef.current.style.pointerEvents = 'auto';
        }
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation}
    >
      <Html 
        transform 
        position={[0, 0, 0]} 
        distanceFactor={6}
        zIndexRange={[0, 0]} // CRITICAL FIX: Disables Drei's continuous z-index calculation loop
        style={{
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'auto',
          display: isHidden ? 'none' : 'block',
          opacity: isHidden ? 0 : 1,
        }}
      >
        <div 
          ref={containerRef}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ 
            width: '100%', 
            height: '100%', 
            overflowY: scrollable ? 'auto' : 'hidden', 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: width < 600 ? '1.25rem 1rem' : '2rem', 
            position: 'relative',
            background: 'rgba(10, 9, 15, 0.96)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: hovered ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: hovered 
              ? '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.25)' 
              : '0 16px 45px rgba(0, 0, 0, 0.85), 0 0 15px rgba(0, 229, 255, 0.1)',
            borderRadius: '16px',
            transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
            pointerEvents: 'auto'
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}
