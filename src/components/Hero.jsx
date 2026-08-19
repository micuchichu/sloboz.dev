import React from 'react';

function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export default function Hero() {
  const skills = ['C++', 'OpenGL', 'Voxel Engine', 'TypeScript', 'Three.js', 'Graphics & Systems'];

  return (
    <section className="section-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '1rem' }}>
      
      {/* Title */}
      <h1 style={{ 
        fontSize: 'clamp(2.6rem, 8vw, 4rem)', 
        lineHeight: '1.05', 
        letterSpacing: '-0.03em',
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: '0.5rem'
      }}>
        sloboz.dev
      </h1>

      <p style={{ 
        fontSize: 'clamp(1.1rem, 3.5vw, 1.35rem)', 
        fontWeight: '600', 
        color: 'var(--accent-1)',
        marginBottom: '1rem' 
      }}>
        Software Developer
      </p>

      {/* Bio */}
      <p style={{ 
        color: 'var(--text-body)', 
        fontSize: 'clamp(1rem, 3.5vw, 1.15rem)', 
        maxWidth: '480px', 
        lineHeight: '1.6', 
        marginBottom: '1.6rem',
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '0.75rem 1.25rem',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        jegu de sub unghii.
      </p>

      {/* Tech Stack Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '500px', marginBottom: '1.8rem' }}>
        {skills.map((skill, idx) => (
          <span 
            key={idx} 
            style={{
              padding: '5px 12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#ffffff',
              fontWeight: '500'
            }}
          >
            {skill}
          </span>
        ))}
      </div>

      {/* Action Links */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a 
          href="https://github.com/micuchichu" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="clean-btn clean-btn-primary"
        >
          <GithubIcon size={18} />
          <span>GitHub</span>
        </a>
        <a 
          href="https://www.instagram.com/micu.chi.chu/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="clean-btn clean-btn-secondary"
        >
          <InstagramIcon size={18} />
          <span>Instagram</span>
        </a>
      </div>
    </section>
  );
}
