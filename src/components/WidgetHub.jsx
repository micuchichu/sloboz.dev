import React, { useState, useEffect } from 'react';
import { Sun, ArrowLeft } from 'lucide-react';

function SunTimer({ onBack }) {
  const BASE_SECONDS = 142006284000000000n;
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsedSinceEpoch = BigInt(Math.floor(Date.now() / 1000));
    return BASE_SECONDS - elapsedSinceEpoch;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1n);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedSeconds = secondsLeft.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '1rem' }}>
      
      <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '0.6rem', fontWeight: '700' }}>
        ☀️ Time Until Sun Explodes
      </h3>

      {/* Main Countdown Display */}
      <div style={{
        margin: '0.6rem 0',
        padding: '1rem 1.5rem',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '380px'
      }}>
        <div style={{ fontSize: '1.6rem', color: '#f59e0b', fontFamily: 'monospace', fontWeight: '800' }}>
          ~4.5 Billion Years
        </div>
        <div style={{ fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace', marginTop: '6px' }}>
          {formattedSeconds} s
        </div>
      </div>

      <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', maxWidth: '340px', lineHeight: '1.5', margin: '0.4rem 0 1rem 0' }}>
        Estimated time before the Sun enters its red giant phase and exhausts its core hydrogen.
      </p>
      
      {onBack && (
        <button 
          onClick={onBack} 
          className="clean-btn clean-btn-secondary"
          style={{ padding: '8px 18px', fontSize: '0.8rem', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Map</span>
        </button>
      )}
    </div>
  );
}

function MonopolyCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '1rem' }}>
      
      <div style={{ 
        border: '1px dashed rgba(234, 179, 8, 0.5)', 
        width: '85%', 
        maxWidth: '320px',
        padding: '1.2rem', 
        textAlign: 'center', 
        borderRadius: '12px', 
        background: 'rgba(234, 179, 8, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
          <span style={{ fontSize: '2rem' }}>🎩</span>
          <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
        </div>
        <p style={{ marginTop: '0.75rem', color: '#ffffff', fontSize: '0.95rem', fontWeight: '600' }}>
          Monopoly Money 😂
        </p>
      </div>

      {onBack && (
        <button 
          onClick={onBack} 
          className="clean-btn clean-btn-secondary"
          style={{ marginTop: '1.2rem', padding: '8px 18px', fontSize: '0.8rem', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Map</span>
        </button>
      )}
    </div>
  );
}

function WeatherCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '1rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.4rem', justifyContent: 'center' }}>
        <Sun size={38} color="#10b981" />
        <span style={{ fontSize: '2.6rem', fontWeight: '800', color: '#ffffff' }}>
          32°C
        </span>
      </div>

      <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '0.2rem', fontWeight: '700' }}>
        Gaborone, Botswana
      </h3>
      <p style={{ color: 'var(--text-body)', fontSize: '0.88rem', marginBottom: '1rem' }}>
        Sunny & Clear Skies
      </p>

      {onBack && (
        <button 
          onClick={onBack} 
          className="clean-btn clean-btn-secondary"
          style={{ padding: '8px 18px', fontSize: '0.8rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Map</span>
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
