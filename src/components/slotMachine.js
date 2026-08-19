// src/components/slotMachine.js
export function initSlotMachine() {
    const playBtn = document.getElementById('slot-play');
    const reelsContainer = document.getElementById('slot-reels');
    
    const symbols = ['🎰', '💎', '⚡', '👑', '7️⃣', '🔔', '🍒'];
    let isSpinning = false;

    playBtn.addEventListener('click', () => {
        if (isSpinning) return;
        isSpinning = true;
        playBtn.textContent = 'Spinning...';
        playBtn.style.opacity = '0.5';

        // Animate reels
        let spins = 0;
        const spinInterval = setInterval(() => {
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];
            reelsContainer.innerHTML = `<span>${r1}</span><span>${r2}</span><span>${r3}</span>`;
            
            spins++;
            if (spins > 20) {
                clearInterval(spinInterval);
                finishSpin();
            }
        }, 50);
    });

    function finishSpin() {
        // Final result
        const r1 = symbols[Math.floor(Math.random() * symbols.length)];
        const r2 = symbols[Math.floor(Math.random() * symbols.length)];
        const r3 = symbols[Math.floor(Math.random() * symbols.length)];
        
        reelsContainer.innerHTML = `<span>${r1}</span><span>${r2}</span><span>${r3}</span>`;
        
        isSpinning = false;
        
        // Check win
        if(r1 === r2 && r2 === r3) {
            playBtn.textContent = 'WINNER! 🎉 (Play Again)';
            playBtn.style.background = 'var(--accent-1)';
            playBtn.style.color = '#000';
            reelsContainer.style.transform = 'scale(1.2)';
            setTimeout(() => reelsContainer.style.transform = 'scale(1)', 500);
        } else {
            playBtn.textContent = 'Try Again';
            playBtn.style.background = 'transparent';
            playBtn.style.color = 'var(--text-main)';
        }
        playBtn.style.opacity = '1';
    }
}
