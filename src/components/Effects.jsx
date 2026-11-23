import React, { useMemo } from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// Loaded lazily, and only on capable devices, so phones and low-end machines
// never download the post-processing library. The CRT scanlines + grain are a
// CSS layer (see .crt in index.css) so they also cover the HTML panels.
// bloom: a palette can turn the glow down (see palettes.js)
export default function Effects({ fx = true, bloom }) {
  // Lens-style fringing: zero in the centre, growing towards the edges
  const offset = useMemo(() => new THREE.Vector2(0.0022, 0.0016), []);

  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom mipmapBlur luminanceThreshold={bloom?.threshold ?? 0.32} luminanceSmoothing={0.5} intensity={bloom?.intensity ?? 0.85} />
      {fx && <ChromaticAberration offset={offset} radialModulation modulationOffset={0.22} />}
      <Vignette eskil={false} offset={0.2} darkness={0.85} />
    </EffectComposer>
  );
}
