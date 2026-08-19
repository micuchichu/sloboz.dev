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
    if (groupRef.current) {
      if (containerRef.current) {
        groupRef.current.getWorldPosition(worldPos);
        const distance = state.camera.position.distanceTo(worldPos);
        
        const targetOpacity = distance > 40 ? Math.max(0.15, 1 - (distance - 40) * 0.005) : 1;
        const opacityStr = targetOpacity.toFixed(2);
        if (containerRef.current.style.opacity !== opacityStr) {
          containerRef.current.style.opacity = opacityStr;
        }

        const targetPE = distance > 50 ? 'none' : 'auto';
        if (containerRef.current.style.pointerEvents !== targetPE) {
          containerRef.current.style.pointerEvents = targetPE;
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
            background: 'rgba(8, 7, 13, 0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: hovered ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: hovered 
              ? '0 0 35px rgba(0, 229, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)' 
              : '0 12px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 229, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            transition: 'box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
            pointerEvents: 'auto',
            transform: hovered ? 'scale(1.015)' : 'none'
          }}
        >
          {children}
        </div>
      </Html>
    </group>
  );
}
