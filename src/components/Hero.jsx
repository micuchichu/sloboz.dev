import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const FACTS = [
  { k: 'Focus', v: 'Graphics & systems' },
  { k: 'Languages', v: 'C++ · TypeScript' },
  { k: 'Tools', v: 'OpenGL · Three.js' },
  { k: 'Building', v: 'Voxel engine' },
];

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/micuchichu' },
  { label: 'Instagram', href: 'https://www.instagram.com/micu.chi.chu/' },
];

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-main">
        <p className="eyebrow reveal" style={{ '--i': 0 }}>Software developer</p>
        <h1 className="display hero-title reveal" style={{ '--i': 1 }}>
          sloboz<span className="accent">.</span>dev
        </h1>
        <p className="hero-bio reveal" style={{ '--i': 2 }}>jegu de sub unghii.</p>
        <div className="hero-actions reveal" style={{ '--i': 3 }}>
          {LINKS.map((l, i) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={`btn${i === 0 ? ' btn--solid' : ''}`}>
              {l.label}
              <ArrowUpRight size={15} strokeWidth={1.75} />
            </a>
          ))}
        </div>
      </div>

      <dl className="spec reveal" style={{ '--i': 4 }}>
        {FACTS.map((f) => (
          <div key={f.k} className="spec-row">
            <dt>{f.k}</dt>
            <dd>{f.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
