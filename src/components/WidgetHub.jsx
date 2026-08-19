import React, { useState, useEffect } from 'react';

function SunTimer({ onBack }) {
  const [doom, setDoom] = useState(99999999);
  
  useEffect(() => {
    const i = setInterval(() => setDoom(d => d - 1), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '0.8rem' }}>
        SOLAR_PROTOCOL_NODE
      </span>
      <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.6rem' }}>☀️ Sun Explodes In</h3>
      <div style={{ fontSize: '1.8rem', color: '#f59e0b', fontFamily: 'monospace', fontWeight: 'bold', textShadow: '0 0 15px rgba(245, 158, 11, 0.5)' }}>
        {doom.toLocaleString()}s
      </div>
      <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Countdown Active</p>
      
      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '1.2rem', 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.4)', 
            color: '#f59e0b', 
            padding: '6px 14px', 
            borderRadius: '16px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>✦</span> CONSTELLATION MAP
        </button>
      )}
    </div>
  );
}

function MonopolyCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '0.8rem' }}>
        TREASURY_NODE
      </span>
      <div style={{ border: '2px dashed rgba(234, 179, 8, 0.4)', width: '85%', padding: '0.8rem', textAlign: 'center', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.04)' }}>
        <span style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
        <div style={{ fontSize: '1.8rem', margin: '0.3rem 0' }}>🎩</div>
        <span style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
      </div>
      <p style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Monopoly Money 😂</p>

      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '1.2rem', 
            background: 'rgba(234, 179, 8, 0.1)', 
            border: '1px solid rgba(234, 179, 8, 0.4)', 
            color: '#eab308', 
            padding: '6px 14px', 
            borderRadius: '16px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>✦</span> CONSTELLATION MAP
        </button>
      )}
    </div>
  );
}

function WeatherCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '0.8rem' }}>
        ATMOSPHERIC_RADAR
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem' }}>☀️</span>
        <span style={{ fontSize: '2.2rem', fontWeight: '700', color: '#10b981', textShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}>32°C</span>
      </div>
      <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>Gaborone, BW</h3>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>Botswana Sector</p>

      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            marginTop: '1.2rem', 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.4)', 
            color: '#10b981', 
            padding: '6px 14px', 
            borderRadius: '16px', 
            cursor: 'pointer', 
            fontFamily: 'monospace', 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <span>✦</span> CONSTELLATION MAP
        </button>
      )}
    </div>
  );
}

export default function WidgetHub({ type, onBack }) {
  if (type === 'sun') return <SunTimer onBack={onBack} />;
  if (type === 'monopoly') return <MonopolyCard onBack={onBack} />;
  if (type === 'weather') return <WeatherCard onBack={onBack} />;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <SunTimer onBack={onBack} />
      <WeatherCard onBack={onBack} />
      <MonopolyCard onBack={onBack} />
    </div>
  );
}
