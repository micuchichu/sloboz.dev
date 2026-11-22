// Minimal controls for the immersive Acoustics station. Invisible by default;
// fades in while the pointer moves and fades out again after a moment.
import React, { useEffect, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { acoustics, engine, useAcoustics, trackCount } from '../lib/acousticsStore';
import { ROOMS } from '../lib/pianoSynth';

const fmtTime = (s) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export default function AcousticsOverlay({ onExit }) {
  const s = useAcoustics();
  const [visible, setVisible] = useState(true);
  const [hint, setHint] = useState(true);
  const timer = useRef();
  const timeRef = useRef();
  const lastVolume = useRef(0.8);
  const track = s.current >= 0 ? s.tracks[s.current] : null;

  // Show on movement, hide after 2.5 s of stillness
  useEffect(() => {
    const poke = () => {
      setVisible(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 2500);
    };
    poke();
    const hintTimer = setTimeout(() => setHint(false), 6000);
    window.addEventListener('pointermove', poke);
    window.addEventListener('pointerdown', poke);
    window.addEventListener('keydown', poke);
    return () => {
      clearTimeout(timer.current);
      clearTimeout(hintTimer);
      window.removeEventListener('pointermove', poke);
      window.removeEventListener('pointerdown', poke);
      window.removeEventListener('keydown', poke);
    };
  }, []);

  // Esc leaves, Space plays/pauses
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onExit(); return; }
      // Focused controls keep their native Space behaviour
      if (e.target.closest?.('input, textarea, button')) return;
      if (e.code === 'Space') { e.preventDefault(); acoustics.toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  // Live time readout
  useEffect(() => {
    if (!track) return;
    let raf;
    const tick = () => {
      if (timeRef.current) timeRef.current.textContent = `${fmtTime(engine.time)} / ${fmtTime(track.song.duration)}`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [track]);

  const VolumeIcon = s.volume === 0 ? VolumeX : s.volume < 0.5 ? Volume1 : Volume2;
  const toggleMute = () => {
    if (s.volume > 0) { lastVolume.current = s.volume; acoustics.setVolume(0); }
    else acoustics.setVolume(lastVolume.current || 0.8);
  };

  const showHint = hint && !track && trackCount > 0;

  return (
    <div className={`immersive-ui${visible ? ' is-visible' : ''}`}>
      <div className={`imm-hint${showHint ? ' is-visible' : ''}`} aria-hidden={!showHint}>
        Drag a sheet onto the piano · drag anywhere else to look around
      </div>

      {/* CC BY 4.0 attribution for the piano model */}
      <a
        className="imm-credit"
        href="https://sketchfab.com/3d-models/old-piano-8b6b1487054a4a1b9a640387f5b819c2"
        target="_blank"
        rel="noopener noreferrer"
      >
        Piano model: “Old Piano” by paraverun · CC BY 4.0
      </a>

      <div className="imm-bottom">
        <div className="imm-now">
          {track ? (
            <>
              <span className="imm-state">{s.playing ? 'Playing' : 'Paused'}</span>
              <span className="imm-title">{track.title}</span>
              <span className="imm-time" ref={timeRef} />
            </>
          ) : (
            <span className="imm-state">
              {trackCount ? 'Click a sheet or drag it onto the piano' : 'Add .mid files to the acoustics/ folder'}
            </span>
          )}
        </div>

        <div className="imm-controls">
          <div className="volume">
            <button className="vol-btn" aria-label={s.volume === 0 ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              <VolumeIcon size={16} strokeWidth={1.5} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={s.volume}
              aria-label="Volume"
              style={{ '--vol': `${s.volume * 100}%` }}
              onChange={(e) => acoustics.setVolume(parseFloat(e.target.value))}
            />
          </div>
          <div className="rooms" role="radiogroup" aria-label="Room acoustics">
            {Object.entries(ROOMS).map(([key, r]) => (
              <button key={key} role="radio" aria-checked={s.room === key} onClick={() => acoustics.setRoom(key)}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
