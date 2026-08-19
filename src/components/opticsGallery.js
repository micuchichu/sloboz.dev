// src/components/opticsGallery.js
export function initOpticsGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxMeta = document.getElementById('lightbox-meta');
    const lightboxClose = document.getElementById('lightbox-close');

    const photos = [
        { id: 'CAP_01.RAW', src: 'https://sloboz.dev/assets/passions/photo.jpg', specs: 'ISO 50 | f/1.7 | 58mm | 1/1000s' },
        { id: 'CAP_02.RAW', src: 'https://sloboz.dev/assets/gallery/day3.jpg', specs: 'ISO 80 | f/1.7 | 23mm | 1/12000s' },
        { id: 'CAP_03.RAW', src: 'https://sloboz.dev/assets/gallery/day2.jpg', specs: 'ISO 80 | f/1.7 | 23mm | 1/12000s' },
        { id: 'CAP_04.RAW', src: 'https://sloboz.dev/assets/gallery/day1.jpg', specs: 'ISO 50 | f/1.7 | 23mm | 1/3000s' },
        { id: 'CAP_05.RAW', src: 'https://sloboz.dev/assets/gallery/day4.jpg', specs: 'ISO 80 | f/1.7 | 23mm | 1/8000s' },
        { id: 'CAP_06.RAW', src: 'https://sloboz.dev/assets/gallery/day5.jpg', specs: 'ISO 50 | f/1.7 | 23mm | 1/45s' },
        { id: 'CAP_07.RAW', src: 'https://sloboz.dev/assets/gallery/day6.jpg', specs: 'ISO 3200 | f/1.7 | 58mm | 1/2000s' },
        { id: 'CAP_08.RAW', src: 'https://sloboz.dev/assets/gallery/day7.jpg', specs: 'ISO 1600 | f/1.7 | 27mm | 1/12000s' },
    ];

    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // Add specific span classes for masonry look
        if(index === 0 || index === 3 || index === 6) {
            item.style.gridColumn = 'span 2';
            item.style.gridRow = 'span 2';
        }

        item.innerHTML = `
            <img src="${photo.src}" class="gallery-img" alt="${photo.id}">
            <div class="img-data">
                <span class="data-id">${photo.id}</span>
                <span class="data-specs">${photo.specs}</span>
            </div>
        `;

        item.addEventListener('click', () => {
            lightboxImg.src = photo.src;
            lightboxMeta.textContent = `${photo.id} // ${photo.specs}`;
            lightbox.classList.add('active');
        });

        galleryGrid.appendChild(item);
    });

    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    // Close on click outside
    lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') {
            lightbox.classList.remove('active');
        }
    });
}
