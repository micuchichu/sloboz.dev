import React from 'react';
import { Cuboid, SquareTerminal, PencilRuler, Building, ArrowUpRight } from 'lucide-react';

const CYAN = '#00e5ff';
const MAGENTA = '#ff007f';

const projects = [
  {
    title: 'Voxel Engine',
    description: 'A custom-built voxel rendering engine in C++ and OpenGL. Features procedural chunk generation, greedy meshing algorithms, and efficient block rendering from scratch.',
    Icon: Cuboid,
    accent: CYAN,
    tags: ['C++', 'OpenGL', 'GLSL', 'Procedural'],
    link: 'https://github.com/micuchichu/voxel_engine',
    span: 2
  },
  {
    title: 'Tile Engine',
    description: 'High-performance 2D tile rendering engine with custom collision systems and level parsing.',
    Icon: SquareTerminal,
    accent: MAGENTA,
    tags: ['C++', 'Graphics'],
    link: 'https://github.com/micuchichu/tile_engine',
    span: 1
  },
  {
    title: 'Exam Architect',
    description: 'Exam generator and problem randomized built specifically for pre-admission testing to Politehnica București.',
    Icon: PencilRuler,
    accent: CYAN,
    tags: ['TypeScript', 'React', 'Algorithms'],
    link: 'https://github.com/micuchichu/exam-architect',
    span: 1
  },
  {
    title: 'Commie Block Viewer',
    description: 'Interactive city planner and brutalist architectural editor with dynamic geometry generation.',
    Icon: Building,
    accent: MAGENTA,
    tags: ['C++', '3D Geometry', 'Procedural'],
    link: 'https://github.com/micuchichu/a',
    span: 2
  }
];

export default function Projects() {
  return (
    <section className="section-container">
      <header className="section-head reveal">
        <h2>Deployments</h2>
        <p>/* built solely with the purpose of teaching myself shit */</p>
      </header>

      <div className="projects-grid">
        {projects.map(({ title, description, Icon, accent, tags, link, span }, idx) => (
          <a
            key={title}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={`border-glow-card project-card reveal${span === 2 ? ' span-2' : ''}`}
            style={{ '--i': idx + 1, '--accent': accent }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="icon-box">
                <Icon size={22} />
              </div>
              <ArrowUpRight className="arrow" size={18} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.55rem' }}>{title}</h3>
            <p style={{ color: 'var(--text-body)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: 'auto' }}>
              {description}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '1.3rem' }}>
              {tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
