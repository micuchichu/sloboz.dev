import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { galleryPlugin } from './scripts/gallery.mjs';

export default defineConfig({
  // galleryPlugin: turns photos/ into public/gallery/ + src/data/gallery.json (see photos/README.md)
  plugins: [react(), galleryPlugin()],
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2022',
    // three.js alone is ~600 kB minified; it lives in its own long-cached chunk
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Split rarely-changing vendor code into separate, long-cached chunks
        // that the browser downloads in parallel. Groups capture their
        // dependencies too, so shared libs (react, three) must claim first.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 40 },
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 35 },
            { name: 'r3f', test: /node_modules[\\/](@react-three[\\/](fiber|drei)|three-stdlib|three-mesh-bvh|zustand|its-fine|suspend-react|react-use-measure|@monogrid|troika-|camera-controls|meshline|stats)/, priority: 30 },
            // Lazy: only fetched on devices that render bloom
            { name: 'postfx', test: /node_modules[\\/](postprocessing|@react-three[\\/]postprocessing|n8ao|maath)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
});
