import React, { useState, useEffect } from 'react';
import { Sun, CloudSun, Coins, ArrowLeft, Radio, Zap } from 'lucide-react';

function SunTimer({ onBack }) {
  const [doom, setDoom] = useState(99999999);
  
  useEffect(() => {
    const i = setInterval(() => setDoom(d => d - 1), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.8rem' }}>
      
      {/* Node Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '0.8rem' }}>
        <Zap size={12} color="#f59e0b" />
        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#f59e0b', letterSpacing: '1px', fontWeight: 'bold' }}>
          SOLAR PROTOCOL // NODE 04
        </span>
      </div>

      <h3 style={{ color: '#ffffff', fontSize: '1.2rem', marginBottom: '0.4rem', fontWeight: '700' }}>
        Solar Flare Horizon
      </h3>

      {/* Big Digital Display */}
      <div style={{
        padding: '0.8rem 1.6rem',
        background: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '12px',
        margin: '0.5rem 0',
        boxShadow: '0 0 25px rgba(245, 158, 11, 0.12)'
      }}>
        <div style={{ fontSize: '2rem', color: '#f59e0b', fontFamily: 'monospace', fontWeight: '800', textShadow: '0 0 20px rgba(245, 158, 11, 0.6)' }}>
          {doom.toLocaleString()}s
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          T-MINUS EXPIRATION // CHRONO SYNC
        </span>
      </div>
      
      {onBack && (
        <button 
          onClick={onBack} 
          className="glass-btn glass-btn-secondary"
          style={{ marginTop: '1rem', padding: '6px 14px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
        >
          <ArrowLeft size={14} />
          <span>CONSTELLATION MAP</span>
        </button>
      )}
    </div>
  );
}

function MonopolyCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.8rem' }}>
      
      {/* Node Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(234, 179, 8, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '0.8rem' }}>
        <Coins size={12} color="#eab308" />
        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#eab308', letterSpacing: '1px', fontWeight: 'bold' }}>
          TREASURY VAULT // NODE 06
        </span>
      </div>

      <div style={{ 
        border: '1px solid rgba(234, 179, 8, 0.35)', 
        width: '85%', 
        padding: '1rem', 
        textAlign: 'center', 
        borderRadius: '12px', 
        background: 'rgba(234, 179, 8, 0.04)',
        boxShadow: '0 0 25px rgba(234, 179, 8, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
          <span style={{ fontSize: '1.8rem' }}>🎩</span>
          <span style={{ fontSize: '1.1rem', fontFamily: 'monospace', color: '#eab308', fontWeight: 'bold' }}>M10</span>
        </div>
        <p style={{ marginTop: '0.6rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', fontFamily: 'monospace' }}>
          Monopoly Reserves 😂
        </p>
      </div>

      {onBack && (
        <button 
          onClick={onBack} 
          className="glass-btn glass-btn-secondary"
          style={{ marginTop: '1rem', padding: '6px 14px', fontSize: '0.75rem', borderColor: 'rgba(234, 179, 8, 0.4)', color: '#eab308' }}
        >
          <ArrowLeft size={14} />
          <span>CONSTELLATION MAP</span>
        </button>
      )}
    </div>
  );
}

function WeatherCard({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '100%', padding: '0.8rem' }}>
      
      {/* Node Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '0.8rem' }}>
        <Radio size={12} color="#10b981" />
        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#10b981', letterSpacing: '1px', fontWeight: 'bold' }}>
          ATMOSPHERIC RADAR // NODE 05
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.4rem', justifyContent: 'center' }}>
        <Sun size={36} color="#10b981" />
        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981', textShadow: '0 0 20px rgba(16, 185, 129, 0.5)' }}>
          32°C
        </span>
      </div>

      <h3 style={{ color: '#ffffff', fontSize: '1.15rem', marginBottom: '0.2rem', fontWeight: '700' }}>
        Gaborone, BW
      </h3>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        Botswana Sector · Clear Sky · Humidity 24%
      </p>

      {onBack && (
        <button 
          onClick={onBack} 
          className="glass-btn glass-btn-secondary"
          style={{ marginTop: '1rem', padding: '6px 14px', fontSize: '0.75rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
        >
          <ArrowLeft size={14} />
          <span>CONSTELLATION MAP</span>
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
