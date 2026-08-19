import React from 'react';
import { motion } from 'framer-motion';
import { Cuboid, SquareTerminal, PencilRuler, Building, ArrowUpRight } from 'lucide-react';

const projects = [
  {
    title: 'Voxel Engine',
    description: 'A custom-built voxel rendering engine in C++ and OpenGL. Features procedural chunk generation, greedy meshing algorithms, and efficient block rendering from scratch.',
    icon: <Cuboid size={22} color="var(--accent-1)" />,
    tags: ['C++', 'OpenGL', 'GLSL', 'Procedural'],
    link: 'https://github.com/micuchichu/voxel_engine',
    span: 2
  },
  {
    title: 'Tile Engine',
    description: 'High-performance 2D tile rendering engine with custom collision systems and level parsing.',
    icon: <SquareTerminal size={22} color="var(--accent-2)" />,
    tags: ['C++', 'Graphics'],
    link: 'https://github.com/micuchichu/tile_engine',
    span: 1
  },
  {
    title: 'Exam Architect',
    description: 'Exam generator and problem randomized built specifically for pre-admission testing to Politehnica București.',
    icon: <PencilRuler size={22} color="var(--accent-1)" />,
    tags: ['TypeScript', 'React', 'Algorithms'],
    link: 'https://github.com/micuchichu/exam-architect',
    span: 1
  },
  {
    title: 'Commie Block Viewer',
    description: 'Interactive city planner and brutalist architectural editor with dynamic geometry generation.',
    icon: <Building size={22} color="var(--accent-2)" />,
    tags: ['C++', '3D Geometry', 'Procedural'],
    link: 'https://github.com/micuchichu/a',
    span: 2
  }
];

export default function Projects() {
  return (
    <section className="section-container" style={{ padding: '2rem 1rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: '800', marginBottom: '0.4rem', color: '#ffffff' }}>
          Deployments
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
          /* built solely with the purpose of teaching myself shit */
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
        {projects.map((proj, idx) => (
          <motion.a 
            href={proj.link} 
            target="_blank" 
            rel="noopener noreferrer"
            key={idx}
            className="border-glow-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '1.6rem', 
              minHeight: '210px',
              gridColumn: typeof window !== 'undefined' && window.innerWidth > 768 && proj.span === 2 ? 'span 2' : 'span 1'
            }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -3 }}
          >
            {/* Card Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {proj.icon}
              </div>
              <ArrowUpRight size={18} color="var(--text-muted)" />
            </div>
            
            {/* Title & Description */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', fontWeight: '700', color: '#ffffff' }}>
              {proj.title}
            </h3>
            <p style={{ color: 'var(--text-body)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: 'auto' }}>
              {proj.description}
            </p>
            
            {/* Tech Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1.4rem' }}>
              {proj.tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    background: 'rgba(255,255,255,0.06)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '3px 9px', 
                    fontSize: '0.75rem', 
                    borderRadius: '6px', 
                    fontFamily: 'monospace',
                    color: '#e2e8f0' 
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
