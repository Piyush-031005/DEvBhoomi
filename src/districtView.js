import { districtData } from './districtData.js';
import gsap from 'gsap';

export function openDistrictView(districtKey) {
    const data = districtData[districtKey] || districtData['default'];
    const overlay = document.getElementById('district-view');
    
    if (!overlay) return;

    // Populate Data
    document.getElementById('dv-name').innerText = data.name;
    document.getElementById('dv-hindi').innerText = data.hindi;
    document.getElementById('dv-theme').innerText = data.theme;
    document.getElementById('dv-desc').innerText = data.description;
    document.getElementById('dv-alt').innerText = data.altitude;
    document.getElementById('dv-area').innerText = data.area;

    // Set Theme Color
    overlay.style.setProperty('--district-color', data.color);

    // Show Overlay
    overlay.classList.add('active');

    // GSAP Enter Animations
    const tl = gsap.timeline();
    tl.fromTo('#dv-name', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.2 })
      .fromTo('#dv-hindi', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.8')
      .fromTo('.dv-left', { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .fromTo('.data-row', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, '-=0.6');
}

export function closeDistrictView() {
    const overlay = document.getElementById('district-view');
    if (overlay) {
        // Fade out overlay
        overlay.classList.remove('active');
    }
}

// Bind back button
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-to-map-btn');
    if (backBtn) {
        backBtn.addEventListener('click', closeDistrictView);
    }
});
