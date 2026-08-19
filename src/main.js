// src/main.js
import { setupScene } from './three/scene.js';
import { initMinesweeper } from './components/minesweeper.js';
import { initSlotMachine } from './components/slotMachine.js';
import { initOpticsGallery } from './components/opticsGallery.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Three.js 3D Background & Features
    const canvas = document.getElementById('webgl-canvas');
    setupScene(canvas);

    // 2. Profile Interactions
    document.getElementById('discord-copy').addEventListener('click', (e) => {
        navigator.clipboard.writeText('sloboz.dev#1234'); // Replace with actual discord tag if known
        const btn = e.target;
        btn.textContent = 'Copied!';
        btn.style.background = 'var(--accent-1)';
        btn.style.color = '#000';
        setTimeout(() => {
            btn.textContent = 'Discord';
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-main)';
        }, 2000);
    });

    // 3. Init Widgets
    initMinesweeper();
    initSlotMachine();

    // 4. Init Optics Gallery
    initOpticsGallery();

    // 5. Sun Countdown Simulator
    let doomSeconds = 99999999;
    const sunTimer = document.getElementById('sun-countdown');
    setInterval(() => {
        doomSeconds--;
        sunTimer.textContent = doomSeconds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "s";
    }, 1000);
});
