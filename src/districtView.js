import { districtData } from './districtData.js';
import gsap from 'gsap';

// Canvas-based particle atmosphere for each district
let particleCanvas = null;
let particleCtx = null;
let particleAnimId = null;
let particles = [];

function initParticleCanvas() {
    if (particleCanvas) return;
    particleCanvas = document.createElement('canvas');
    particleCanvas.style.cssText = `
        position:absolute; top:0; left:0; width:100%; height:100%;
        z-index:0; pointer-events:none;
    `;
    document.getElementById('district-view').prepend(particleCanvas);
    particleCtx = particleCanvas.getContext('2d');
}

function spawnParticles(color) {
    const W = window.innerWidth, H = window.innerHeight;
    particleCanvas.width = W;
    particleCanvas.height = H;
    particles = [];
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 3 + 1,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            alpha: Math.random() * 0.6 + 0.2
        });
    }

    function renderParticles() {
        particleCtx.clearRect(0, 0, W, H);
        for (const p of particles) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            particleCtx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2,'0');
            particleCtx.fill();
        }
        particleAnimId = requestAnimationFrame(renderParticles);
    }

    if (particleAnimId) cancelAnimationFrame(particleAnimId);
    renderParticles();
}

export function openDistrictView(districtKey) {
    const data = districtData[districtKey] || districtData['default'];
    const overlay = document.getElementById('district-view');
    if (!overlay) return;

    initParticleCanvas();

    // Set data
    document.getElementById('dv-name').innerText = data.name;
    document.getElementById('dv-hindi').innerText = data.hindi;
    document.getElementById('dv-theme').innerText = data.theme;
    document.getElementById('dv-desc').innerText = data.description;
    document.getElementById('dv-alt').innerText = data.altitude;
    document.getElementById('dv-area').innerText = data.area;
    
    // New fields
    document.getElementById('dv-pop').innerText = data.population || '---';
    document.getElementById('dv-peak').innerText = data.highestPeak || '---';
    document.getElementById('dv-river').innerText = data.majorRiver || '---';
    document.getElementById('dv-dance').innerText = data.folkDance || '---';
    document.getElementById('dv-park').innerText = data.nationalPark || '---';
    document.getElementById('dv-season').innerText = data.bestSeason || '---';
    document.getElementById('dv-craft').innerText = data.craft || '---';
    document.getElementById('dv-soul').innerText = data.soul || '---';


    // Set unique district color as CSS var + particle atmosphere
    overlay.style.setProperty('--district-color', data.color);
    spawnParticles(data.color);

    overlay.classList.add('active');

    // Cinematic staggered entrance
    const tl = gsap.timeline();
    tl.fromTo('#dv-name',
        { y: 120, opacity: 0, skewY: 4 },
        { y: 0, opacity: 1, skewY: 0, duration: 1.1, ease: 'expo.out', delay: 0.15 })
      .fromTo('#dv-hindi',
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '-=0.85')
      .fromTo('#dv-theme',
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.65')
      .fromTo('#dv-desc',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.5')
      .fromTo('.data-row',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: 'power3.out' }, '-=0.5');
}

export function closeDistrictView() {
    const overlay = document.getElementById('district-view');
    if (!overlay) return;

    gsap.to(overlay, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => {
        overlay.classList.remove('active');
        overlay.style.opacity = '';
        if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; }
    }});
}

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-to-map-btn');
    if (backBtn) backBtn.addEventListener('click', closeDistrictView);
});
