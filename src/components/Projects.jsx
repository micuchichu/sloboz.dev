import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Cuboid, SquareTerminal, PencilRuler, Building } from 'lucide-react';

const projects = [
  {
    title: 'Voxel Engine',
    description: 'A custom-built voxel rendering engine. Handles chunk generation, meshing, and block rendering from the ground up.',
    icon: <Cuboid size={24} color="var(--accent-1)" />,
    tags: ['C++', 'OpenGL'],
    link: 'https://github.com/micuchichu/voxel_engine',
    span: 2
  },
  {
    title: 'Tile Engine',
    description: 'A high-performance custom 2D tile rendering engine built from scratch.',
    icon: <SquareTerminal size={24} color="var(--accent-2)" />,
    tags: ['C++'],
    link: 'https://github.com/micuchichu/tile_engine',
    span: 1
  },
  {
    title: 'Exam Architect',
    description: 'An exam generator tailored specifically for pre-admission testing to Politehnica București.',
    icon: <PencilRuler size={24} color="var(--accent-1)" />,
    tags: ['TypeScript', 'Web'],
    link: 'https://github.com/micuchichu/exam-architect',
    span: 1
  },
  {
    title: 'Commie Block Viewer',
    description: 'An interactive city planner and brutalist building editor. Architecture generation is functional.',
    icon: <Building size={24} color="var(--accent-2)" />,
    tags: ['C++'],
    link: 'https://github.com/micuchichu/a',
    span: 2
  }
];

export default function Projects() {
  return (
    <section className="section-container" style={{ padding: '2rem 0.5rem' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.5rem' }}>Deployments</h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>/* built solely with the purpose of teaching myself shit */</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', gridAutoRows: 'auto' }}>
        {projects.map((proj, idx) => (
          <motion.a 
            href={proj.link} 
            target="_blank" 
            rel="noopener noreferrer"
            key={idx}
            className="border-glow-card"
            style={{ 
              display: 'flex', flexDirection: 'column', padding: '1.4rem', minHeight: '200px',
              gridColumn: typeof window !== 'undefined' && window.innerWidth > 768 && proj.span === 2 ? 'span 2' : 'span 1'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              {proj.icon}
              <ExternalLink size={20} color="var(--text-muted)" />
            </div>
            
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{proj.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'auto' }}>{proj.description}</p>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
              {proj.tags.map(tag => (
                <span key={tag} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', fontFamily: 'monospace' }}>
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
