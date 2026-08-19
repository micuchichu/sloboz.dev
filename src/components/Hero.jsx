import React from 'react';

export default function Hero() {
  return (
    <section className="section-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 0.5rem' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid var(--border-light)', letterSpacing: '0.5px' }}>
          System Protocol: Online
        </span>
      </div>

      <h1 style={{ fontSize: 'clamp(2.2rem, 8vw, 3.8rem)', textAlign: 'center', lineHeight: '1.1', marginBottom: '1rem' }}>
        <span style={{ display: 'block', color: 'var(--text-muted)' }}>sloboz.dev</span>
        <span style={{ color: '#ffffff', textShadow: '0 0 25px rgba(0, 229, 255, 0.35)' }}>Software Developer</span>
      </h1>

      <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(1rem, 4vw, 1.25rem)', maxWidth: '600px', textAlign: 'center', marginBottom: '2rem' }}>
        jegu de sub unghii.
      </p>

      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="https://github.com/micuchichu" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', background: 'var(--text-main)', color: 'var(--bg-dark)', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
          GitHub
        </a>
        <a href="https://www.instagram.com/micu.chi.chu/" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
          Instagram
        </a>
      </div>
    </section>
  );
}
