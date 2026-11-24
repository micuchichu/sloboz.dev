// Mini player: shown everywhere except the Acoustics station, but only while a
// piece is on the piano (playing or paused). Play/pause, a short list of the
// songs to switch to, and a button that tucks it away into a small tab.
import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Minus, Music2 } from 'lucide-react';
import { acoustics, engine, useAcoustics } from '../lib/acousticsStore';

const fmt = (s) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

// Remembered while the page is open, so leaving and coming back keeps your choice
let tuckedAway = false;

export default function MiniPlayer() {
  const s = useAcoustics();
  const [hidden, setHidden] = useState(tuckedAway);
  const barRef = useRef(null);
  const timeRef = useRef(null);
  const track = s.current >= 0 ? s.tracks[s.current] : null;

  const hide = (v) => { tuckedAway = v; setHidden(v); };

  // Progress follows the music without re-rendering React every frame
  useEffect(() => {
    if (!track || hidden) return;
    let raf;
    const tick = () => {
      const d = track.song.duration || 1;
      const t = Math.min(engine.time, d);
      if (barRef.current) barRef.current.style.transform = `scaleX(${t / d})`;
      if (timeRef.current) timeRef.current.textContent = `${fmt(t)} / ${fmt(d)}`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [track, hidden]);

  if (!track) return null;

  if (hidden) {
    return (
      <button type="button" className={`mini-tab${s.playing ? ' is-playing' : ''}`} onClick={() => hide(false)} aria-label={`Show the player: ${track.title}`}>
        <Music2 size={14} strokeWidth={1.75} />
        <span className="mini-eq" aria-hidden="true"><i /><i /><i /></span>
      </button>
    );
  }

  return (
    <section className="mini-player" aria-label="Music player">
      <div className="mini-head">
        <span className="mini-state">{s.playing ? 'Playing' : 'Paused'}</span>
        <button type="button" className="mini-hide" onClick={() => hide(true)} aria-label="Hide the player">
          <Minus size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="mini-now">
        <button type="button" className="mini-toggle" onClick={() => acoustics.toggle()} aria-label={s.playing ? 'Pause' : 'Play'}>
          {s.playing ? <Pause size={15} strokeWidth={1.75} /> : <Play size={15} strokeWidth={1.75} />}
        </button>
        <div className="mini-title">
          <span>{track.title}</span>
          <span className="mini-time" ref={timeRef} />
        </div>
      </div>
      <div className="mini-progress" aria-hidden="true"><i ref={barRef} /></div>

      <ol className="mini-list" aria-label="Songs">
        {s.tracks.map((t, i) => (
          <li key={t.path}>
            <button
              type="button"
              className={i === s.current ? 'is-current' : undefined}
              aria-current={i === s.current || undefined}
              onClick={() => (i === s.current ? acoustics.toggle() : acoustics.play(i))}
            >
              <span className="mini-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="mini-name">{t.title}</span>
              <span className="mini-len">{fmt(t.song.duration)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
