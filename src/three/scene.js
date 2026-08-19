// src/three/scene.js
import * as THREE from 'three';
import { gsap } from 'gsap';

export function setupScene(canvas) {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;
    camera.position.y = 2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Cyber Grid Floor
    const gridHelper = new THREE.GridHelper(100, 100, 0x00ffff, 0x00ffff);
    gridHelper.position.y = -5;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Floating Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 50;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xff10f0,
        transparent: true,
        opacity: 0.8
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Floating Geometry (Voxel / Icosahedron)
    const geo = new THREE.IcosahedronGeometry(2, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(6, 2, -5);
    scene.add(mesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Theme Change Listener
    window.addEventListener('themeChange', (e) => {
        const isDay = e.detail === 'day';
        gsap.to(gridHelper.material, {
            color: isDay ? new THREE.Color(0x111111) : new THREE.Color(0x00ffff),
            opacity: isDay ? 0.1 : 0.2,
            duration: 1
        });
        gsap.to(particlesMaterial, {
            color: isDay ? new THREE.Color(0xff4500) : new THREE.Color(0xff10f0),
            duration: 1
        });
        gsap.to(mat, {
            color: isDay ? new THREE.Color(0x0000ff) : new THREE.Color(0x00ffff),
            duration: 1
        });
    });

    // Animation Loop
    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Rotate Mesh
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.002;

        // Animate particles slowly
        particlesMesh.rotation.y = elapsedTime * 0.02;

        // Camera Parallax based on mouse
        gsap.to(camera.position, {
            x: mouseX * 2,
            y: 2 + mouseY * 2,
            duration: 2,
            ease: "power2.out"
        });

        renderer.render(scene, camera);
    }
    
    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
