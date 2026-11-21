import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

// Rough estimate: ~4.5 billion years of main-sequence life left, counted down in real seconds.
const BASE_SECONDS = 142006284000000000n;

function SunTimer({ onBack }) {
  const [secondsLeft, setSecondsLeft] = useState(() => BASE_SECONDS - BigInt(Math.floor(Date.now() / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(BASE_SECONDS - BigInt(Math.floor(Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formatted = secondsLeft.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <div className="widget">
      <p className="eyebrow reveal" style={{ '--i': 0 }}>Sol · G2V main-sequence star</p>
      <h3 className="display widget-title reveal" style={{ '--i': 1 }}>About 4.5 billion years left</h3>

      <div className="readout reveal" style={{ '--i': 2 }}>
        <span className="readout-label">Seconds remaining (est.)</span>
        <span className="readout-value">{formatted}</span>
      </div>

      <div className="meter reveal" style={{ '--i': 3 }}>
        <div className="meter-track"><div className="meter-fill" style={{ width: '47.4%' }} /></div>
        <div className="meter-labels">
          <span>Core hydrogen ≈ 47% remaining</span>
          <span>Next phase: red giant</span>
        </div>
      </div>

      {onBack && <BackButton onBack={onBack} />}
    </div>
  );
}

function BackButton({ onBack }) {
  return (
    <button className="btn btn--ghost widget-back reveal" style={{ '--i': 4 }} onClick={onBack}>
      <ArrowLeft size={15} strokeWidth={1.75} />
      Back to map
    </button>
  );
}

function WorkInProgress({ title, onBack }) {
  return (
    <div className="widget">
      <p className="eyebrow reveal" style={{ '--i': 0 }}>
        <span className="status-dot" aria-hidden="true" />In development
      </p>
      <h3 className="display widget-title reveal" style={{ '--i': 1 }}>{title}</h3>
      <p className="widget-copy reveal" style={{ '--i': 2 }}>
        This module is still being built. Check back soon.
      </p>
      {onBack && <BackButton onBack={onBack} />}
    </div>
  );
}

export default function WidgetHub({ type, onBack }) {
  if (type === 'sun') return <SunTimer onBack={onBack} />;
  if (type === 'monopoly') return <WorkInProgress title="Monopoly Treasury" onBack={onBack} />;
  return <WorkInProgress title="Atmospheric Radar" onBack={onBack} />;
}
