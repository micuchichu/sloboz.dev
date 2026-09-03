import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const photos = [
  { id: '01', src: './assets/passions/photo.jpg', title: 'Bucharest Sector', specs: '58mm · f/1.7' },
  { id: '02', src: './assets/gallery/day1.jpg', title: 'Urban Transit', specs: '23mm · f/1.7' },
  { id: '03', src: './assets/gallery/day2.jpg', title: 'Night Walk', specs: '23mm · f/1.7' },
  { id: '04', src: './assets/gallery/day3.jpg', title: 'Industrial Node', specs: '23mm · f/1.7' },
  { id: '05', src: './assets/gallery/day4.jpg', title: 'Perimeter', specs: '35mm · f/2.0' },
  { id: '06', src: './assets/gallery/day5.jpg', title: 'Skyline', specs: '28mm · f/1.8' },
  { id: '07', src: './assets/gallery/day6.jpg', title: 'Brutalist Blocks', specs: '50mm · f/1.7' },
  { id: '08', src: './assets/gallery/day7.jpg', title: 'Atmosphere', specs: '85mm · f/2.2' }
];

export default function OpticsArchive() {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <section className="section-container" style={{ padding: '2rem 1rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: '800', marginBottom: '0.4rem', color: '#ffffff' }}>
          Optics Archive
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          /* 35mm film & digital captures */
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {photos.map((photo, idx) => (
          <motion.div 
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="border-glow-card"
            style={{ 
              height: '310px', 
              cursor: 'pointer', 
              overflow: 'hidden', 
              position: 'relative',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)'
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
              alt={photo.title} 
              loading="lazy"
              decoding="async"
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                transition: 'transform 0.4s ease'
              }} 
            />

            {/* Gradient Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(6,5,10,0.85) 0%, rgba(6,5,10,0.2) 40%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Bottom Caption */}
            <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff', display: 'block' }}>
                  {photo.title}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {photo.specs}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-1)', fontWeight: 'bold' }}>
                #{photo.id}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPhoto && (
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
              background: 'rgba(5, 4, 8, 0.95)', 
              backdropFilter: 'blur(20px)',
              zIndex: 9999999, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setSelectedPhoto(null)}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: 24,
                right: 24,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                zIndex: 10
              }}
            >
              <X size={16} />
              <span>Close</span>
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
                src={selectedPhoto.src} 
                alt={selectedPhoto.title} 
                style={{ 
                  width: '100%', 
                  maxHeight: '74vh', 
                  objectFit: 'contain', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)'
                }} 
              />
              
              {/* Footer */}
              <div style={{ 
                marginTop: '1rem', 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center',
                background: 'rgba(16, 15, 23, 0.9)',
                padding: '8px 20px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.85rem' 
              }}>
                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{selectedPhoto.title}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedPhoto.specs}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
