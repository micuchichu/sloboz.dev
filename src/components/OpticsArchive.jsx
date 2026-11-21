import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
// Generated from the photos/ folder by scripts/gallery.mjs — don't edit by hand.
import gallery from '../data/gallery.json';

const photos = gallery.photos;

function formatDate(takenAt) {
  if (!takenAt) return null;
  const [y, m, d] = takenAt.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const altText = (photo) => {
  const date = formatDate(photo.takenAt);
  return date ? `Photo taken ${date}` : 'Photo';
};

function Thumb({ photo, eager }) {
  const [loaded, setLoaded] = useState(false);
  // Cached images can finish before React attaches onLoad
  const ref = useCallback((img) => {
    if (img?.complete && img.naturalWidth) setLoaded(true);
  }, []);

  return (
    <img
      ref={ref}
      src={photo.thumb}
      alt={altText(photo)}
      width={photo.thumbWidth}
      height={photo.thumbHeight}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={loaded ? 'is-loaded' : undefined}
      onLoad={() => setLoaded(true)}
    />
  );
}

function ExifRow({ exif }) {
  const settings = [exif.iso, exif.shutter, exif.aperture, exif.focal, exif.ev, exif.wb && `WB ${exif.wb}`].filter(Boolean);
  if (!settings.length) return null;
  return (
    <ul className="exif-chips">
      {settings.map((s) => <li key={s}>{s}</li>)}
    </ul>
  );
}

function Lightbox({ index, onClose, onStep }) {
  const photo = photos[index];
  const date = formatDate(photo.takenAt);
  const gear = [photo.exif.camera, photo.exif.lens].filter(Boolean).join(' · ');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  // Warm the cache for the neighbours so stepping through feels instant
  useEffect(() => {
    [1, -1].forEach((d) => {
      const img = new Image();
      img.src = photos[(index + d + photos.length) % photos.length].src;
    });
  }, [index]);

  // Portal to <body>: inside drei's CSS-3D transform, position: fixed would be
  // relative to the tilted monitor instead of the viewport.
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`} onClick={onClose}>
      <button className="lb-btn lb-close" onClick={onClose} autoFocus>
        <X size={16} />
        <span>Close</span>
      </button>
      {photos.length > 1 && (
        <>
          <button className="lb-btn lb-nav lb-prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); onStep(-1); }}>
            <ChevronLeft size={20} />
          </button>
          <button className="lb-btn lb-nav lb-next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); onStep(1); }}>
            <ChevronRight size={20} />
          </button>
        </>
      )}

      <figure key={photo.id} onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.src}
          alt={altText(photo)}
          width={photo.width}
          height={photo.height}
          style={{ backgroundImage: `url(${photo.placeholder})` }}
        />
        <figcaption>
          <div className="lb-meta">
            {date && <span>{date}</span>}
            {gear && <span>{gear}</span>}
            <span className="lb-count mono">
              {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
            </span>
          </div>
          <ExifRow exif={photo.exif} />
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}

export default function OpticsArchive() {
  const [selected, setSelected] = useState(null);

  const close = useCallback(() => setSelected(null), []);
  const step = useCallback((d) => setSelected((i) => (i + d + photos.length) % photos.length), []);

  return (
    <section className="section">
      <header className="section-head reveal">
        <h2 className="display">Optics Archive</h2>
        <p>/* 35mm film &amp; digital captures */</p>
      </header>

      {photos.length === 0 ? (
        <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No photos yet. Drop some into the photos/ folder.
        </p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setSelected(idx)}
              className="photo-card reveal"
              style={{
                '--i': Math.min(idx + 1, 10),
                aspectRatio: `${photo.thumbWidth} / ${photo.thumbHeight}`,
                backgroundImage: `url(${photo.placeholder})`,
              }}
              aria-label={`Open photo ${idx + 1}`}
            >
              <Thumb photo={photo} eager={idx < 4} />
            </button>
          ))}
        </div>
      )}

      {selected !== null && photos[selected] && <Lightbox index={selected} onClose={close} onStep={step} />}
    </section>
  );
}
