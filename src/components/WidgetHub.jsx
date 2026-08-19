import React, { useState, useEffect } from 'react';
import { Sun, ArrowLeft, Lock, Construction } from 'lucide-react';

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
    }, 50);
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
      padding: '1.5rem',
      fontFamily: 'monospace',
      position: 'relative'
    }}>
      
      {/* Cyberpunk Hazard Header */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(255, 176, 0, 0.15)',
        border: '1px solid rgba(255, 176, 0, 0.6)',
        padding: '5px 16px',
        borderRadius: '3px',
        color: '#ffb000',
        fontSize: '0.85rem',
        letterSpacing: '2px',
        fontWeight: 'bold',
        marginBottom: '0.8rem',
        boxShadow: '0 0 15px rgba(255, 176, 0, 0.3)'
      }}>
        <span>⚠</span>
        <span>DOOMSDAY_CHRONOMETER // SOL-0</span>
        <span>⚠</span>
      </div>

      <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#ffffff', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.6rem', textShadow: '0 0 15px rgba(255, 176, 0, 0.6)' }}>
        Solar Core Collapse
      </div>

      {/* Cyberpunk Display Panel */}
      <div style={{
        position: 'relative',
        margin: '0.6rem 0',
        padding: '1.4rem 2rem',
        background: 'linear-gradient(180deg, rgba(24, 18, 10, 0.96) 0%, rgba(12, 9, 5, 0.99) 100%)',
        border: '2px solid #ffb000',
        borderRadius: '6px',
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 0 35px rgba(255, 176, 0, 0.25), inset 0 0 25px rgba(255, 176, 0, 0.1)'
      }}>
        {/* Scanlines Effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 2px)',
          pointerEvents: 'none',
          opacity: 0.7
        }} />

        {/* Primary Counter */}
        <div style={{ fontSize: '0.8rem', color: '#ffb000', letterSpacing: '2px', textAlign: 'left', marginBottom: '4px', fontWeight: 'bold' }}>
          T-MINUS // ESTIMATED REMAINING LIFESPAN:
        </div>
        <div style={{ 
          fontSize: 'clamp(2rem, 5vw, 2.75rem)', 
          color: '#ffb000', 
          fontWeight: '900', 
          lineHeight: '1.1',
          letterSpacing: '1.5px',
          textShadow: '0 0 20px #ffb000, 0 0 40px rgba(255, 176, 0, 0.5)' 
        }}>
          ~4,500,000,000 Y
        </div>

        {/* Live Ticking Seconds + Subseconds */}
        <div style={{ 
          fontSize: 'clamp(1rem, 2.8vw, 1.35rem)', 
          color: '#00f0ff', 
          marginTop: '8px',
          fontWeight: '800',
          letterSpacing: '1px',
          textShadow: '0 0 12px rgba(0, 240, 255, 0.6)'
        }}>
          {formattedSeconds}.{ms} s
        </div>
      </div>

      {/* Cyber Fuel Progress Bar */}
      <div style={{ width: '100%', maxWidth: '560px', margin: '0.6rem 0 1.2rem 0', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-body)', fontWeight: 'bold', marginBottom: '5px' }}>
          <span style={{ color: '#ffb000' }}>H2_CORE_FUSION: 47.4% REMAINING</span>
          <span style={{ color: '#ff0055' }}>EVENT: HELIUM_FLASH</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '47.4%', height: '100%', background: 'linear-gradient(90deg, #ffb000, #ff0055)', boxShadow: '0 0 15px #ffb000' }} />
        </div>
      </div>
      
      {onBack && (
        <button 
          onClick={onBack} 
          style={{ 
            padding: '10px 28px', 
            fontSize: '0.85rem', 
            color: '#ffb000', 
            background: 'rgba(255, 176, 0, 0.12)',
            border: '1px solid #ffb000',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
            cursor: 'pointer',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            boxShadow: '0 0 15px rgba(255, 176, 0, 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          [ ✦ RETURN_TO_MAP ]
        </button>
      )}
    </div>
  );
}

function WorkInProgressCard({ title, icon, color = '#f59e0b', onBack }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      textAlign: 'center', 
      height: '100%', 
      padding: '1.5rem',
      position: 'relative'
    }}>
      {/* Caution Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: `${color}18`,
        border: `1px solid ${color}60`,
        padding: '5px 16px',
        borderRadius: '4px',
        color: color,
        fontFamily: 'monospace',
        fontSize: '0.82rem',
        fontWeight: 'bold',
        letterSpacing: '1.5px',
        marginBottom: '1rem',
        boxShadow: `0 0 20px ${color}25`
      }}>
        <span>🚧</span>
        <span>WORK IN PROGRESS // LOCKED</span>
        <span>🚧</span>
      </div>

      {/* Center Icon Frame */}
      <div style={{
        padding: '1.2rem',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px dashed ${color}60`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '0.9rem',
        boxShadow: `0 0 30px ${color}15`
      }}>
        {icon}
      </div>

      <h3 style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.4rem' }}>
        {title}
      </h3>

      <p style={{ color: 'var(--text-body)', fontSize: '0.92rem', maxWidth: '380px', lineHeight: '1.6', marginBottom: '1.5rem' }}>
        This module is currently under active construction. Signal calibration and telemetry integration in progress.
      </p>

      {onBack && (
        <button 
          onClick={onBack} 
          className="clean-btn clean-btn-secondary"
          style={{ 
            padding: '9px 24px', 
            fontSize: '0.85rem', 
            color: color, 
            borderColor: `${color}60`,
            background: `${color}10`,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}
        >
          <ArrowLeft size={16} />
          <span>RETURN TO MAP</span>
        </button>
      )}
    </div>
  );
}

function MonopolyCard({ onBack }) {
  return (
    <WorkInProgressCard 
      title="Monopoly Treasury" 
      icon={<Lock size={38} color="#eab308" />} 
      color="#eab308" 
      onBack={onBack} 
    />
  );
}

function WeatherCard({ onBack }) {
  return (
    <WorkInProgressCard 
      title="Atmospheric Radar" 
      icon={<Construction size={38} color="#10b981" />} 
      color="#10b981" 
      onBack={onBack} 
    />
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
