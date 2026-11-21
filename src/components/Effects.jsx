import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// Loaded lazily, and only on capable devices, so phones and low-end
// machines never download the post-processing library at all.
export default function Effects() {
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.8} intensity={1.1} />
      <Vignette eskil={false} offset={0.15} darkness={0.9} />
    </EffectComposer>
  );
}
