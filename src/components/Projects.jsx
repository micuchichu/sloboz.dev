import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Cuboid, SquareTerminal, PencilRuler, Building, ArrowUpRight } from 'lucide-react';

const projects = [
  {
    title: 'Voxel Engine',
    category: 'GRAPHICS / ENGINE',
    status: 'ACTIVE',
    statusColor: '#00e5ff',
    description: 'A custom-built voxel rendering engine. Handles chunk generation, greedy meshing, and high-performance block rendering from the ground up.',
    icon: <Cuboid size={22} color="var(--accent-1)" />,
    tags: ['C++', 'OpenGL', 'GLSL', 'Procedural'],
    link: 'https://github.com/micuchichu/voxel_engine',
    span: 2
  },
  {
    title: 'Tile Engine',
    category: '2D CORE',
    status: 'SHIPPED',
    statusColor: '#10b981',
    description: 'A high-performance custom 2D tile rendering engine built from scratch with custom collision matrices.',
    icon: <SquareTerminal size={22} color="var(--accent-2)" />,
    tags: ['C++', 'Graphics'],
    link: 'https://github.com/micuchichu/tile_engine',
    span: 1
  },
  {
    title: 'Exam Architect',
    category: 'WEB TOOL',
    status: 'PRODUCTION',
    statusColor: '#a855f7',
    description: 'An intelligent exam generator and problem randomized tailored specifically for pre-admission testing to Politehnica București.',
    icon: <PencilRuler size={22} color="var(--accent-1)" />,
    tags: ['TypeScript', 'React', 'Algorithms'],
    link: 'https://github.com/micuchichu/exam-architect',
    span: 1
  },
  {
    title: 'Commie Block Viewer',
    category: 'SIMULATION',
    status: 'EXPERIMENTAL',
    statusColor: '#f59e0b',
    description: 'An interactive city planner and brutalist architectural editor. Dynamic building generation and spatial geometry manipulation.',
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
      <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-1)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            DEPLOYMENTS // REPOSITORY INDEX
          </span>
          <span style={{ padding: '2px 8px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '10px', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--accent-1)' }}>
            4 MODULES
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.2rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
          Selected Deployments
        </h2>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          /* built solely with the purpose of teaching myself shit */
        </p>
      </div>

      {/* Modern Grid */}
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
              minHeight: '220px',
              gridColumn: typeof window !== 'undefined' && window.innerWidth > 768 && proj.span === 2 ? 'span 2' : 'span 1'
            }}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ y: -4 }}
          >
            {/* Card Top Metadata */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {proj.icon}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-subtle)', display: 'block', letterSpacing: '1px' }}>
                    {proj.category}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: proj.statusColor, fontWeight: 'bold' }}>
                    ● {proj.status}
                  </span>
                </div>
              </div>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ArrowUpRight size={16} color="var(--text-muted)" />
              </div>
            </div>
            
            {/* Title & Description */}
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: '700' }}>
              {proj.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'auto' }}>
              {proj.description}
            </p>
            
            {/* Tech Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '1.4rem' }}>
              {proj.tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '3px 8px', 
                    fontSize: '0.72rem', 
                    borderRadius: '6px', 
                    fontFamily: 'monospace',
                    color: 'var(--text-main)' 
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
