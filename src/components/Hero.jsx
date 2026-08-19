import React from 'react';

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export default function Hero() {
  const skills = ['C++', 'OpenGL', 'Voxel Engines', 'TypeScript', 'Three.js', 'Systems Architecture'];

  return (
    <section className="section-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '1rem 0.5rem' }}>
      
      {/* Live System Status Pill */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '30px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          color: '#10b981',
          letterSpacing: '1px',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)'
        }}>
          <span className="pulse-dot"></span>
          <span>SYSTEM ONLINE // CORE NODE</span>
        </div>
      </div>

      {/* Main Typography Header */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ 
          fontSize: '0.9rem', 
          fontFamily: 'monospace', 
          color: 'var(--accent-1)', 
          letterSpacing: '2px', 
          textTransform: 'uppercase',
          display: 'block',
          marginBottom: '0.4rem'
        }}>
          sloboz.dev
        </span>
        <h1 style={{ 
          fontSize: 'clamp(2.4rem, 7vw, 3.6rem)', 
          lineHeight: '1.05', 
          letterSpacing: '-0.03em',
          fontWeight: '800',
          color: '#ffffff',
          textShadow: '0 0 35px rgba(0, 229, 255, 0.3)'
        }}>
          Software Developer
        </h1>
      </div>

      {/* Terminal Quote Box */}
      <div style={{
        maxWidth: '480px',
        width: '100%',
        margin: '0.4rem auto 1.4rem auto',
        padding: '0.8rem 1.2rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        position: 'relative'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontStyle: 'italic', margin: 0 }}>
          "{' '}jegu de sub unghii.{' '}"
        </p>
      </div>

      {/* Tech Stack Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '550px', marginBottom: '1.6rem' }}>
        {skills.map((skill, idx) => (
          <span 
            key={idx} 
            style={{
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: 'var(--text-main)',
              letterSpacing: '0.3px',
              transition: 'all 0.2s ease'
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Modern Interactive Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a 
          href="https://github.com/micuchichu" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="glass-btn glass-btn-primary"
        >
          <GithubIcon size={16} />
          <span>GitHub</span>
        </a>
        <a 
          href="https://www.instagram.com/micu.chi.chu/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="glass-btn glass-btn-secondary"
        >
          <InstagramIcon size={16} />
          <span>Instagram</span>
        </a>
      </div>
    </section>
  );
}
