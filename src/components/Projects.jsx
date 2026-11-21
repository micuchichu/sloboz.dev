import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const projects = [
  {
    title: 'ND Minesweeper',
    description: 'N-dimensional Minesweeper in C++20 with Raylib: 2D, 3D and 4D hypercube boards, a 1-bit bomb board that generates a million cells in under 12 ms, a CRT shader pass, and online multiplayer over ENet and Steam P2P.',
    tags: ['C++20', 'Raylib', 'GLSL', 'Multiplayer'],
    link: 'https://github.com/micuchichu/nd-minesweeper',
    span: 2
  },
  {
    title: 'Tile Engine',
    description: 'High-performance 2D tile rendering engine with custom collision systems and level parsing.',
    tags: ['C++', 'Graphics'],
    link: 'https://github.com/micuchichu/tile_engine',
    span: 1
  },
  {
    title: 'Exam Architect',
    description: 'Exam generator and problem randomized built specifically for pre-admission testing to Politehnica București.',
    tags: ['TypeScript', 'React', 'Algorithms'],
    link: 'https://github.com/micuchichu/exam-architect',
    span: 1
  },
  {
    title: 'Commie Block Viewer',
    description: 'Interactive city planner and brutalist architectural editor with dynamic geometry generation.',
    tags: ['C++', '3D Geometry', 'Procedural'],
    link: 'https://github.com/micuchichu/a',
    span: 2
  }
];

export default function Projects() {
  return (
    <section className="section">
      <header className="section-head reveal">
        <h2 className="display">Deployments</h2>
        <p>/* built solely with the purpose of teaching myself shit */</p>
      </header>

      <div className="projects-grid reveal" style={{ '--i': 1 }}>
        {projects.map(({ title, description, tags, link, span }, idx) => (
          <a
            key={title}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`project${span === 2 ? ' span-2' : ''}`}
          >
            <div className="project-top">
              <span className="idx">{String(idx + 1).padStart(2, '0')}</span>
              <ArrowUpRight className="arrow" size={18} strokeWidth={1.5} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <ul className="tags">
              {tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          </a>
        ))}
      </div>
    </section>
  );
}
