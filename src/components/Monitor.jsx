import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePalette } from '../lib/palettes';
import SketchFrame from './SketchFrame';

// World units per CSS pixel for drei <Html transform distanceFactor={6}>
export const MONITOR_PX_TO_WORLD = 6 / 400;

export default function Monitor({ position, rotation, children, width = 900, height = 500, scrollable = true, index, label, meta, backdrop, clear = false }) {
  const groupRef = useRef();
  const containerRef = useRef();
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const lastOpacity = useRef('1');
  const lastPE = useRef('auto');
  const sketch = usePalette().id === 'sketch';
  const seed = parseInt(index, 10) || label?.length || 1;

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

  const className = ['monitor', width < 600 && 'monitor--compact', !scrollable && 'monitor--static', clear && 'monitor--clear'].filter(Boolean).join(' ');

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
          className="monitor-shell"
          style={{ pointerEvents: 'auto' }}
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* anything a station draws around its panel (behind it, or past its edges) */}
          {backdrop}
          <div className={className}>
            <div className="monitor-head">
              <span>
                {index && <span className="idx">{index}</span>}
                {label}
              </span>
              {meta && <span className="monitor-meta">{meta}</span>}
            </div>
            <div className="monitor-body">{children}</div>
          </div>
          {/* Drawn outside the clipped paper so strokes can overshoot its edges */}
          {sketch && <SketchFrame width={width} height={height} seed={seed} />}
        </div>
      </Html>
    </group>
  );
}
