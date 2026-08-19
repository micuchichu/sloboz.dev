import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Maximize2, Aperture } from 'lucide-react';

const photos = [
  { id: 'CAP_01.RAW', src: './assets/passions/photo.jpg', specs: 'ISO 50 · f/1.7 · 58mm', location: 'Bucharest Sector' },
  { id: 'CAP_02.RAW', src: './assets/gallery/day1.jpg', specs: 'ISO 50 · f/1.7 · 23mm', location: 'Urban Transit' },
  { id: 'CAP_03.RAW', src: './assets/gallery/day2.jpg', specs: 'ISO 80 · f/1.7 · 23mm', location: 'Night Recon' },
  { id: 'CAP_04.RAW', src: './assets/gallery/day3.jpg', specs: 'ISO 80 · f/1.7 · 23mm', location: 'Industrial Node' },
  { id: 'CAP_05.RAW', src: './assets/gallery/day4.jpg', specs: 'ISO 64 · f/2.0 · 35mm', location: 'Perimeter Alpha' },
  { id: 'CAP_06.RAW', src: './assets/gallery/day5.jpg', specs: 'ISO 100 · f/1.8 · 28mm', location: 'Skyline Orbit' },
  { id: 'CAP_07.RAW', src: './assets/gallery/day6.jpg', specs: 'ISO 50 · f/1.7 · 50mm', location: 'Brutalist Blocks' },
  { id: 'CAP_08.RAW', src: './assets/gallery/day7.jpg', specs: 'ISO 125 · f/2.2 · 85mm', location: 'Atmospheric Log' }
];

export default function OpticsArchive() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <section className="section-container" style={{ padding: '2rem 1rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-purple)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            OPTICS // VISUAL RECON LOGS
          </span>
          <span style={{ padding: '2px 8px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-purple)' }}>
            8 CAPTURES
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.2rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
          Optics Archive
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          /* 35mm & digital sensor captures */
        </p>
      </div>

      {/* Modern Photo Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {photos.map((photo, idx) => (
          <motion.div 
            key={photo.id}
            onClick={() => setSelectedId(photo)}
            className="border-glow-card"
            style={{ 
              height: '320px', 
              cursor: 'pointer', 
              overflow: 'hidden', 
              position: 'relative',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Image */}
            <img 
              src={photo.src} 
              alt={photo.id} 
              loading="lazy"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                filter: 'grayscale(20%) contrast(110%)',
                transition: 'transform 0.4s ease, filter 0.4s ease'
              }} 
            />

            {/* Gradient Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(6,5,10,0.9) 0%, rgba(6,5,10,0.2) 40%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Top Right Quick Sensor Pill */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(5, 5, 10, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'var(--text-main)'
              }}>
                <Aperture size={12} color="var(--accent-purple)" />
                <span>RAW</span>
              </div>
            </div>

            {/* Bottom Metadata Badges */}
            <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  background: 'var(--accent-purple)', 
                  color: '#ffffff', 
                  padding: '2px 8px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  boxShadow: '0 0 10px rgba(168,85,247,0.4)'
                }}>
                  {photo.id}
                </span>
                <Maximize2 size={14} color="var(--text-muted)" />
              </div>
              <span style={{ 
                color: 'var(--text-muted)', 
                fontSize: '0.75rem', 
                fontFamily: 'monospace',
                marginTop: '2px'
              }}>
                {photo.specs}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* High-Res Lightbox Modal */}
      <AnimatePresence>
        {selectedId && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100vw', 
              height: '100vh', 
              background: 'rgba(5, 4, 8, 0.94)', 
              backdropFilter: 'blur(20px)',
              zIndex: 9999999, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setSelectedId(null)}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedId(null)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                zIndex: 10
              }}
            >
              <X size={16} />
              <span>CLOSE</span>
            </button>

            {/* Modal Image Box */}
            <div 
              onClick={(e) => e.stopPropagation()} 
              style={{ 
                position: 'relative', 
                maxWidth: '92vw', 
                maxHeight: '82vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <img 
                src={selectedId.src} 
                alt={selectedId.id} 
                style={{ 
                  width: '100%', 
                  maxHeight: '74vh', 
                  objectFit: 'contain', 
                  borderRadius: '12px',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  boxShadow: '0 0 40px rgba(168, 85, 247, 0.25)'
                }} 
              />
              
              {/* EXIF Footer */}
              <div style={{ 
                marginTop: '1rem', 
                display: 'flex', 
                gap: '16px', 
                alignItems: 'center',
                background: 'rgba(12, 10, 18, 0.8)',
                padding: '8px 18px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'monospace', 
                fontSize: '0.85rem' 
              }}>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>{selectedId.id}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span style={{ color: 'var(--text-main)' }}>{selectedId.specs}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>{selectedId.location}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
