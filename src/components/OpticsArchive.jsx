import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const photos = [
  { id: 'CAP_01.RAW', src: './assets/passions/photo.jpg', specs: 'ISO 50 | f/1.7 | 58mm' },
  { id: 'CAP_02.RAW', src: './assets/gallery/day1.jpg', specs: 'ISO 50 | f/1.7 | 23mm' },
  { id: 'CAP_03.RAW', src: './assets/gallery/day2.jpg', specs: 'ISO 80 | f/1.7 | 23mm' },
  { id: 'CAP_04.RAW', src: './assets/gallery/day3.jpg', specs: 'ISO 80 | f/1.7 | 23mm' },
  { id: 'CAP_05.RAW', src: './assets/gallery/day4.jpg', specs: 'ISO 64 | f/2.0 | 35mm' },
  { id: 'CAP_06.RAW', src: './assets/gallery/day5.jpg', specs: 'ISO 100 | f/1.8 | 28mm' },
  { id: 'CAP_07.RAW', src: './assets/gallery/day6.jpg', specs: 'ISO 50 | f/1.7 | 50mm' },
  { id: 'CAP_08.RAW', src: './assets/gallery/day7.jpg', specs: 'ISO 125 | f/2.2 | 85mm' }
];

export default function OpticsArchive() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <section className="section-container" style={{ padding: '2rem 0.5rem' }}>
      
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.8rem' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: 'var(--accent-1)' }}>Optics Archive</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {photos.map(photo => (
          <motion.div 
            layoutId={photo.id}
            key={photo.id}
            onClick={() => setSelectedId(photo)}
            className="border-glow-card"
            style={{ height: '300px', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
            whileHover={{ scale: 1.02 }}
          >
            <img src={photo.src} alt={photo.id} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(50%) contrast(120%)' }} />
            <div style={{ position: 'absolute', bottom: 15, left: 15, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ background: 'var(--accent-1)', color: '#000', padding: '2px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{photo.id}</span>
              <span style={{ background: 'var(--bg-card)', padding: '2px 8px', fontSize: '0.75rem', border: '1px solid var(--border-light)' }}>{photo.specs}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(6,5,7,0.95)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            onClick={() => setSelectedId(null)}
          >
            <motion.div layoutId={selectedId.id} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img src={selectedId.src} alt={selectedId.id} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', border: '1px solid var(--accent-1)' }} />
              <div style={{ marginTop: '1rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--accent-1)' }}>{selectedId.id}</span> // {selectedId.specs}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
