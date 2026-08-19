import React, { useState, useEffect } from 'react';
import { Sun, ArrowLeft } from 'lucide-react';

function SunTimer({ onBack }) {
  const BASE_SECONDS = 142006284000000000n;
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsedSinceEpoch = BigInt(Math.floor(Date.now() / 1000));
    return BASE_SECONDS - elapsedSinceEpoch;
  });
  const [ms, setMs] = useState(999);

  useEffect(() => {
    const sInterval = setInterval(() => {
      setSecondsLeft(prev => prev - 1n);
    }, 1000);
    const msInterval = setInterval(() => {
      setMs(Math.floor(Math.random() * 900) + 100);
    }, 60);
    return () => {
      clearInterval(sInterval);
      clearInterval(msInterval);
    };
  }, []);

  const formattedSeconds = secondsLeft.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      textAlign: 'center', 
      height: '100%', 
      padding: '0.75rem',
      fontFamily: 'monospace',
      position: 'relative'
    }}>
      
      {/* Cyberpunk Hazard Header */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 176, 0, 0.12)',
        border: '1px solid rgba(255, 176, 0, 0.5)',
        padding: '3px 12px',
        borderRadius: '2px',
        color: '#ffb000',
        fontSize: '0.72rem',
        letterSpacing: '1.5px',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        boxShadow: '0 0 12px rgba(255, 176, 0, 0.25)'
      }}>
        <span>⚠</span>
        <span>DOOMSDAY_CHRONO // SOL-0</span>
        <span>⚠</span>
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.4rem', textShadow: '0 0 10px rgba(255, 176, 0, 0.5)' }}>
        Solar Core Collapse
      </div>

      {/* Cyberpunk Display Panel with Cut Corners & Scanlines */}
      <div style={{
        position: 'relative',
        margin: '0.4rem 0',
        padding: '0.9rem 1.4rem',
        background: 'linear-gradient(180deg, rgba(20, 16, 8, 0.95) 0%, rgba(10, 8, 4, 0.98) 100%)',
        border: '1px solid #ffb000',
        borderRadius: '4px',
        clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
        width: '100%',
        maxWidth: '390px',
        boxShadow: '0 0 25px rgba(255, 176, 0, 0.2), inset 0 0 20px rgba(255, 176, 0, 0.08)'
      }}>
        {/* Scanlines Effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
          opacity: 0.6
        }} />

        {/* Primary Counter */}
        <div style={{ fontSize: '0.7rem', color: '#ffb000', letterSpacing: '2px', textAlign: 'left', marginBottom: '2px' }}>
          T-MINUS // TIME REMAINING:
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          color: '#ffb000', 
          fontWeight: '900', 
          letterSpacing: '1px',
          textShadow: '0 0 15px #ffb000, 0 0 30px rgba(255, 176, 0, 0.4)' 
        }}>
          ~4,500,000,000 Y
        </div>

        {/* Live Ticking Seconds + Subseconds */}
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#00f0ff', 
          marginTop: '4px',
          fontWeight: '700',
          textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
        }}>
          {formattedSeconds}.{ms} s
        </div>
      </div>

      {/* Cyber Fuel Progress Bar */}
      <div style={{ width: '100%', maxWidth: '390px', margin: '0.4rem 0 0.8rem 0', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
          <span>H2_CORE_FUSION: 47.4%</span>
          <span style={{ color: '#ff0055' }}>EVENT: HELIUM_FLASH</span>
        </div>
        <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: '47.4%', height: '100%', background: 'linear-gradient(90deg, #ffb000, #ff0055)', boxShadow: '0 0 10px #ffb000' }} />
        </div>
      </div>
      
      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            padding: '7px 20px', 
            fontSize: '0.75rem', 
            color: '#ffb000', 
            background: 'rgba(255, 176, 0, 0.08)',
            border: '1px solid rgba(255, 176, 0, 0.5)',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            cursor: 'pointer',
            fontWeight: 'bold',
            letterSpacing: '1px',
            transition: 'all 0.2s ease'
          }}
        >
          [ ✦ RETURN_TO_MAP ]
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
