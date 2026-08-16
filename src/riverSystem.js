// src/riverSystem.js
// ================================================================
// DEVBHOOMI: RIVER SYSTEM
// Animated canvas showing rivers flowing from Himalayan glaciers
// to the plains, with hover info and Bauhaus-style name cards.
// ================================================================

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// River data: source → path through districts → confluence point
const RIVERS = [
    {
        id: 'ganga',
        name: 'GANGA',
        hindi: 'गंगा',
        source: 'Gangotri Glacier, 3,892m',
        origin: 'Uttarkashi',
        districts: ['Uttarkashi', 'Tehri', 'Haridwar'],
        length: '2,525 km (total)',
        uttarakhandKm: '450 km',
        color: '#4aa8ff',
        glow: 'rgba(74, 168, 255, 0.6)',
        desc: 'Born from the mouth of Gaumukh glacier, the Ganga flows through the entire heart of Devbhoomi.',
        waypoints: [0.1, 0.0, 0.25, 0.15, 0.5, 0.35, 0.75, 0.55, 0.95, 0.65],
    },
    {
        id: 'yamuna',
        name: 'YAMUNA',
        hindi: 'यमुना',
        source: 'Yamunotri Glacier, 4,421m',
        origin: 'Uttarkashi',
        districts: ['Uttarkashi', 'Dehradun', 'Haridwar'],
        length: '1,376 km (total)',
        uttarakhandKm: '136 km',
        color: '#00e5ff',
        glow: 'rgba(0, 229, 255, 0.6)',
        desc: 'Sister of the Ganga. The Yamuna descends from Yamunotri, one of the Char Dham pilgrimage sites.',
        waypoints: [0.05, 0.0, 0.18, 0.18, 0.35, 0.42, 0.6, 0.6, 0.92, 0.72],
    },
    {
        id: 'alaknanda',
        name: 'ALAKNANDA',
        hindi: 'अलकनंदा',
        source: 'Satopanth Glacier, 4,600m',
        origin: 'Chamoli',
        districts: ['Chamoli', 'Rudraprayag', 'Pauri', 'Haridwar'],
        length: '190 km',
        uttarakhandKm: '190 km',
        color: '#7c4dff',
        glow: 'rgba(124, 77, 255, 0.6)',
        desc: 'The primary headstream of the Ganga. Flows past Badrinath and through the five sacred Prayags.',
        waypoints: [0.3, 0.0, 0.42, 0.2, 0.58, 0.38, 0.72, 0.52, 0.95, 0.68],
    },
    {
        id: 'ramganga',
        name: 'RAMGANGA',
        hindi: 'रामगंगा',
        source: 'Dudhpokhari, 3,110m',
        origin: 'Pauri Garhwal',
        districts: ['Pauri Garhwal', 'Chamoli', 'Almora', 'Nainital'],
        length: '596 km',
        uttarakhandKm: '155 km',
        color: '#69f0ae',
        glow: 'rgba(105, 240, 174, 0.6)',
        desc: 'The Ramganga emerges from the higher Himalayan glaciers. The Corbett National Park exists because of this river.',
        waypoints: [0.55, 0.0, 0.62, 0.22, 0.72, 0.4, 0.85, 0.58, 0.98, 0.7],
    },
    {
        id: 'kali',
        name: 'KALI / SHARDA',
        hindi: 'काली / शारदा',
        source: 'Kalapani, 3,600m',
        origin: 'Pithoragarh',
        districts: ['Pithoragarh', 'Champawat', 'Udham Singh Nagar'],
        length: '350 km',
        uttarakhandKm: '150 km',
        color: '#ff6e40',
        glow: 'rgba(255, 110, 64, 0.6)',
        desc: 'The Kali river forms the natural border between India and Nepal. Its source, Kalapani, is a disputed territory.',
        waypoints: [0.85, 0.0, 0.88, 0.2, 0.9, 0.42, 0.93, 0.6, 0.97, 0.75],
    },
];

let canvas, ctx, W, H;
let particles = [];
let animFrame;
let hoveredRiver = null;
let isVisible = false;

// A particle that flows along a bezier-like path
class RiverParticle {
    constructor(river, canvasW, canvasH) {
        this.river = river;
        this.progress = Math.random(); // 0 to 1 = source to sea
        this.speed = 0.0008 + Math.random() * 0.0012;
        this.size = 1.5 + Math.random() * 2;
        this.opacity = 0;
        this.maxOpacity = 0.4 + Math.random() * 0.5;
        this.W = canvasW;
        this.H = canvasH;
    }

    getPosition() {
        const pts = this.river.waypoints;
        // Simple catmull-rom style interpolation across waypoints
        const segments = (pts.length / 2) - 1;
        const seg = Math.floor(this.progress * segments);
        const t = (this.progress * segments) - seg;
        const i = Math.min(seg, segments - 1) * 2;
        const x0 = pts[i] * this.W;
        const y0 = pts[i + 1] * this.H;
        const x1 = pts[i + 2] * this.W;
        const y1 = pts[i + 3] * this.H;
        return {
            x: x0 + (x1 - x0) * t,
            y: y0 + (y1 - y0) * t,
        };
    }

    update() {
        this.progress += this.speed;
        // Fade in at start, fade out at end
        if (this.progress < 0.1) {
            this.opacity = (this.progress / 0.1) * this.maxOpacity;
        } else if (this.progress > 0.85) {
            this.opacity = ((1 - this.progress) / 0.15) * this.maxOpacity;
        } else {
            this.opacity = this.maxOpacity;
        }
        if (this.progress >= 1) {
            this.progress = 0;
        }
    }

    draw(ctx) {
        const pos = this.getPosition();
        const isHovered = hoveredRiver === this.river.id;
        const alpha = isHovered ? Math.min(this.opacity * 2.5, 1) : this.opacity;
        const size = isHovered ? this.size * 2.5 : this.size;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
        ctx.fillStyle = this.river.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Glow
        if (isHovered || alpha > 0.5) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size * 3, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 3);
            grad.addColorStop(0, this.river.color + '44');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fill();
        }
    }
}

function drawRiverPaths() {
    RIVERS.forEach(river => {
        const pts = river.waypoints;
        const isHovered = hoveredRiver === river.id;

        ctx.beginPath();
        ctx.moveTo(pts[0] * W, pts[1] * H);
        for (let i = 2; i < pts.length; i += 2) {
            ctx.lineTo(pts[i] * W, pts[i + 1] * H);
        }

        ctx.strokeStyle = river.color + (isHovered ? 'aa' : '22');
        ctx.lineWidth = isHovered ? 3 : 1;
        ctx.stroke();

        // Draw source dot (mountain)
        const sx = pts[0] * W;
        const sy = pts[1] * H;
        ctx.beginPath();
        ctx.arc(sx, sy, isHovered ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = river.color;
        ctx.fill();

        // Draw source label
        if (isHovered) {
            ctx.font = '500 11px "Space Mono", monospace';
            ctx.fillStyle = river.color;
            ctx.fillText('▲ ' + river.source.toUpperCase(), sx + 10, sy + 4);
        } else {
            ctx.font = 'bold 10px "Space Mono", monospace';
            ctx.fillStyle = river.color + '88';
            ctx.fillText(river.name, sx + 8, sy + 4);
        }
    });
}

function drawMountainSilhouette() {
    // Background layer (softer, further away)
    drawJaggedMountains(H * 0.4, 'rgba(15, 20, 35, 1)', 0.02, 100);
    
    // Foreground layer (darker, sharper)
    drawJaggedMountains(H * 0.25, 'rgba(5, 8, 15, 1)', 0.04, 150);

    // Plains gradient at bottom (organic fluid base)
    const plainGrad = ctx.createLinearGradient(0, H * 0.65, 0, H);
    plainGrad.addColorStop(0, 'transparent');
    plainGrad.addColorStop(1, 'rgba(5, 20, 10, 0.8)');
    ctx.fillStyle = plainGrad;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);
}

function drawJaggedMountains(baseHeight, color, roughness, amplitude) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, baseHeight);
    
    // Generate seeded predictable random heights so it doesn't flicker on resize
    let currentY = baseHeight;
    let seed = 12345;
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    for (let x = 0; x <= W; x += 10) {
        let noise = (random() - 0.5) * 2.0; // -1 to 1
        // Smooth out the noise slightly based on roughness
        currentY += noise * roughness * amplitude;
        
        // Keep it bounded
        if (currentY > baseHeight + amplitude) currentY = baseHeight + amplitude;
        if (currentY < baseHeight - amplitude) currentY = baseHeight - amplitude;

        ctx.lineTo(x, currentY);
    }
    
    ctx.lineTo(W, H);
    ctx.closePath();
    
    // Add gradient to the mountains
    const grad = ctx.createLinearGradient(0, baseHeight - amplitude, 0, H);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    
    // Draw subtle snow caps on the highest peaks
    ctx.globalCompositeOperation = 'lighter';
    for (let x = 0; x <= W; x += 50) {
        if (random() > 0.8) {
            ctx.beginPath();
            ctx.arc(x, baseHeight - (random() * amplitude), random() * 20, 0, Math.PI);
            const snowGrad = ctx.createRadialGradient(x, baseHeight - amplitude, 0, x, baseHeight - amplitude, 20);
            snowGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
            snowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = snowGrad;
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = 'source-over';
}

    // Label zones
    ctx.font = '600 11px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillText('GREATER HIMALAYAS', W * 0.35, H * 0.04);
    ctx.fillStyle = 'rgba(105,240,174,0.25)';
    ctx.fillText('PLAINS OF HARIDWAR / ROORKEE', W * 0.3, H * 0.92);
}

function animate() {
    if (!isVisible) return;
    animFrame = requestAnimationFrame(animate);

    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = '#030608';
    ctx.fillRect(0, 0, W, H);

    // Mountain silhouette
    drawMountainSilhouette();

    // River paths
    drawRiverPaths();

    // Particles
    particles.forEach(p => {
        p.update();
        p.draw(ctx);
    });
}

function buildRiverCards() {
    const container = document.getElementById('river-cards');
    if (!container) return;
    container.innerHTML = '';

    RIVERS.forEach((river, i) => {
        const card = document.createElement('div');
        card.className = 'river-card';
        card.dataset.riverId = river.id;
        card.style.cssText = `
            padding: 40px;
            border-right: 1px solid rgba(255,255,255,0.06);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            cursor: pointer;
            transition: background 0.3s ease;
            position: relative;
            overflow: hidden;
        `;
        card.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: ${river.color}; opacity: 0.5; transition: opacity 0.3s;"></div>
            <div style="font-family: 'Space Mono', monospace; color: ${river.color}; font-size: 0.7rem; letter-spacing: 0.3em; margin-bottom: 12px;">${river.hindi}</div>
            <h3 style="font-family: 'Neue Machina', sans-serif; font-size: clamp(1.5rem, 2.5vw, 2.5rem); color: #fff; font-weight: 800; margin: 0 0 12px; text-transform: uppercase;">${river.name}</h3>
            <div style="font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.35); font-size: 0.75rem; margin-bottom: 16px; line-height: 1.8;">
                ▲ ${river.source}<br>
                ${river.districts.join(' → ')}
            </div>
            <p style="font-family: 'Space Mono', monospace; color: rgba(255,255,255,0.5); font-size: 0.8rem; line-height: 1.7; margin-bottom: 24px;">${river.desc}</p>
            <div style="display: flex; gap: 24px;">
                <div>
                    <div style="font-family: 'Space Mono', monospace; font-size: 0.65rem; color: rgba(255,255,255,0.25); margin-bottom: 4px;">UTTARAKHAND</div>
                    <div style="font-family: 'Neue Machina', sans-serif; font-size: 1.2rem; color: ${river.color}; font-weight: 800;">${river.uttarakhandKm}</div>
                </div>
                <div>
                    <div style="font-family: 'Space Mono', monospace; font-size: 0.65rem; color: rgba(255,255,255,0.25); margin-bottom: 4px;">TOTAL LENGTH</div>
                    <div style="font-family: 'Neue Machina', sans-serif; font-size: 1.2rem; color: rgba(255,255,255,0.6); font-weight: 800;">${river.length}</div>
                </div>
            </div>
        `;

        card.addEventListener('mouseenter', () => {
            hoveredRiver = river.id;
            card.style.background = `rgba(${hexToRgb(river.color)}, 0.06)`;
        });
        card.addEventListener('mouseleave', () => {
            hoveredRiver = null;
            card.style.background = 'transparent';
        });

        container.appendChild(card);
    });
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

function initCanvas() {
    canvas = document.getElementById('river-flow-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = Math.round(window.innerHeight * 0.65);
        canvas.style.height = H + 'px';
        particles = [];
        // Spawn particles for each river
        RIVERS.forEach(river => {
            for (let i = 0; i < 60; i++) {
                particles.push(new RiverParticle(river, W, H));
            }
        });
    }

    resize();
    window.addEventListener('resize', resize);

    // Canvas hover
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (W / rect.width);
        const my = (e.clientY - rect.top) * (H / rect.height);

        hoveredRiver = null;
        RIVERS.forEach(river => {
            const pts = river.waypoints;
            for (let i = 0; i < pts.length - 2; i += 2) {
                const sx = pts[i] * W;
                const sy = pts[i + 1] * H;
                const ex = pts[i + 2] * W;
                const ey = pts[i + 3] * H;
                const dx = ex - sx;
                const dy = ey - sy;
                const len = Math.sqrt(dx * dx + dy * dy);
                const t = Math.max(0, Math.min(1, ((mx - sx) * dx + (my - sy) * dy) / (len * len)));
                const closestX = sx + t * dx;
                const closestY = sy + t * dy;
                const dist = Math.sqrt((mx - closestX) ** 2 + (my - closestY) ** 2);
                if (dist < 20) hoveredRiver = river.id;
            }
        });
    });
    canvas.addEventListener('mouseleave', () => { hoveredRiver = null; });
}

export function initRiverSystem() {
    initCanvas();
    buildRiverCards();

    // ScrollTrigger: only animate when section is visible
    ScrollTrigger.create({
        trigger: '#river-system-section',
        start: 'top 80%',
        end: 'bottom 20%',
        onEnter: () => {
            if (!isVisible) {
                isVisible = true;
                animate();
            }
            // Stagger-animate cards in
            gsap.fromTo('.river-card', 
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out' }
            );
            gsap.fromTo('#river-header h2',
                { opacity: 0, y: 40 },
                { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
            );
        },
        onLeave: () => { isVisible = false; cancelAnimationFrame(animFrame); },
        onEnterBack: () => {
            if (!isVisible) { isVisible = true; animate(); }
        },
        onLeaveBack: () => { isVisible = false; cancelAnimationFrame(animFrame); },
    });
}
