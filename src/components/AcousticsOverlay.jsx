// Minimal controls for the immersive Acoustics station. Invisible by default;
// fades in while the pointer moves and fades out again after a moment.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { acoustics, engine, useAcoustics, trackCount } from '../lib/acousticsStore';
import { ROOMS } from '../lib/pianoSynth';

const fmtTime = (s) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

// Position slider. Behind it, how busy each stretch of the piece is (notes per
// slice, weighted by how hard they were played), so the loud runs and the quiet
// bits are easy to find; the part already played is drawn in the accent.
const BARS = 140;

function SeekBar({ track }) {
  const inputRef = useRef(null);
  const playedRef = useRef(null);
  const scrubbing = useRef(false);
  const duration = track.song.duration;

  const bars = useMemo(() => {
    const sums = new Array(BARS).fill(0);
    for (const n of track.song.notes) sums[Math.min(BARS - 1, Math.floor((n.start / duration) * BARS))] += 0.4 + n.vel;
    const max = Math.max(...sums, 1);
    return sums.map((v) => 0.12 + 0.88 * Math.sqrt(v / max));
  }, [track, duration]);

  // follow the music
  useEffect(() => {
    let raf;
    const tick = () => {
      const t = engine.time;
      if (!scrubbing.current && inputRef.current) inputRef.current.value = String(t);
      const shown = scrubbing.current ? parseFloat(inputRef.current?.value ?? t) : t;
      if (playedRef.current) playedRef.current.style.clipPath = `inset(0 ${100 - (shown / duration) * 100}% 0 0)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const begin = () => {
    scrubbing.current = true;
    acoustics.scrubStart();
    const end = () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      scrubbing.current = false;
      acoustics.scrubEnd(parseFloat(inputRef.current.value));
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  const strip = bars.map((h, i) => <span key={i} style={{ height: `${h * 100}%` }} />);
  return (
    <div className="imm-seek">
      <div className="seek-bars" aria-hidden="true">
        <div className="seek-layer">{strip}</div>
        <div className="seek-layer seek-played" ref={playedRef}>{strip}</div>
      </div>
      <input
        ref={inputRef}
        type="range"
        min="0"
        max={duration}
        step="0.5"
        defaultValue="0"
        aria-label="Position in the piece"
        onPointerDown={begin}
        onChange={(e) => {
          const t = parseFloat(e.target.value);
          if (scrubbing.current) acoustics.scrubTo(t);
          else acoustics.seek(t); // keyboard: arrow keys step half a second
        }}
      />
    </div>
  );
}

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

  // Esc leaves, Space plays/pauses, ← / → jump five seconds
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onExit(); return; }
      // Focused controls keep their native Space and arrow behaviour
      if (e.target.closest?.('input, textarea, button')) return;
      if (e.code === 'Space') { e.preventDefault(); acoustics.toggle(); }
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && acoustics.get().current >= 0) {
        e.preventDefault();
        acoustics.seek(engine.time + (e.key === 'ArrowRight' ? 5 : -5));
      }
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
    <div className={`immersive-ui${visible ? ' is-visible' : ''}${track ? ' has-track' : ''}`}>
      <div className={`imm-hint${showHint ? ' is-visible' : ''}`} aria-hidden={!showHint}>
        Drag a sheet onto the piano · drag anywhere else to look around
      </div>

      {/* Attribution: the piano model (CC BY 4.0) and the piano samples (CC BY 3.0) */}
      <div className="imm-credit">
        <a href="https://sketchfab.com/3d-models/old-piano-8b6b1487054a4a1b9a640387f5b819c2" target="_blank" rel="noopener noreferrer">
          Piano model: “Old Piano” by paraverun · CC BY 4.0
        </a>
        <a href="https://archive.org/details/SalamanderGrandPianoV3" target="_blank" rel="noopener noreferrer">
          Piano sound: Salamander Grand Piano by Alexander Holm · CC BY 3.0
        </a>
      </div>

      <div className="imm-bottom">
        {track && <SeekBar key={track.path} track={track} />}
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
