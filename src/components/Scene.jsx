import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';

function LaserScan() {
  const meshRef = useRef();

  useFrame((state) => {
    // Animate the laser plane scanning back and forth
    const time = state.clock.getElapsedTime();
    meshRef.current.position.y = Math.sin(time) * 5;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial color="#00e5ff" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function FloatingGeometry() {
  const ref = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    ref.current.rotation.x = time * 0.1;
    ref.current.rotation.y = time * 0.2;
    ref.current.position.y = Math.sin(time * 0.5) * 1 + 2;
  });

  return (
    <mesh ref={ref} position={[3, 2, -5]}>
      <icosahedronGeometry args={[2, 1]} />
      <meshStandardMaterial color="#00e5ff" wireframe />
    </mesh>
  );
}

export default function Scene() {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 2, 10]} fov={60} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff007f" />
      <pointLight position={[-10, -10, -10]} intensity={1.5} color="#00e5ff" />

      {/* Cyber Grid */}
      <Grid 
        position={[0, -2, 0]} 
        args={[50, 50]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#00e5ff" 
        sectionSize={5} 
        sectionThickness={1.5} 
        sectionColor="#ff007f" 
        fadeDistance={30} 
      />

      <LaserScan />
      <FloatingGeometry />
      
      <Environment preset="city" />
      <fog attach="fog" args={['#060507', 5, 25]} />
    </Canvas>
  );
}
