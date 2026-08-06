// src/sacredData.js
// ============================================================
// DEVBHOOMI: DECODED — Sacred Topography Scanner
// Pure code-generated visualization. Zero images.
// Only math, noise, canvas, and the soul of the Himalayas.
// ============================================================

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Peak data — x is fraction of canvas width (0 to 1)
const PEAKS = [
    { name: 'NANDA DEVI',   nameSkt: 'नन्दा देवी',  elev: 7816, x: 0.12, label: 'HIGHEST IN INDIA',  side: 'right' },
    { name: 'KEDARNATH',    nameSkt: 'केदारनाथ',   elev: 3584, x: 0.30, label: 'CHAR DHAM CIRCUIT', side: 'left'  },
    { name: 'TRISHUL',      nameSkt: 'त्रिशूल',   elev: 7120, x: 0.50, label: "SHIVA'S TRIDENT",   side: 'right' },
    { name: 'PANCHACHULI',  nameSkt: 'पञ्चचूली',  elev: 6904, x: 0.70, label: 'THE FIVE FIRES',    side: 'left'  },
    { name: 'BADRINATH',    nameSkt: 'बद्रीनाथ',  elev: 3133, x: 0.88, label: 'VAIKUNTHA DHAM',   side: 'right' },
];

// Counter statistics
const COUNTERS = [
    { id: 'sd-c-0', label: 'GLACIERS',        value: 968 },
    { id: 'sd-c-1', label: 'SACRED RIVERS',   value: 45  },
    { id: 'sd-c-2', label: 'PEAKS > 6000M',   value: 86  },
    { id: 'sd-c-3', label: 'CHAR DHAMS',      value: 4   },
];

export function initSacredData() {
    const canvas = document.getElementById('sd-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    let time = 0;
    let scanProgress = 0;
    let peakPositions = [];
    let mouseX = 0.5, mouseY = 0.3;
    let animFrame;

    // ─────────────────────────────────────────────
    // RESIZE
    // ─────────────────────────────────────────────
    function resize() {
        const container = canvas.parentElement;
        W = canvas.width  = container.offsetWidth;
        H = canvas.height = container.offsetHeight;
        buildPeakPositions();
        initParticles();
    }

    // ─────────────────────────────────────────────
    // MOUNTAIN PROFILE
    // Returns height 0→1 at fractional position t
    // ─────────────────────────────────────────────
    function mountainH(t) {
        // Layered sine waves = organic Himalayan ridgeline
        let y = 0;
        y += Math.sin(t * Math.PI * 1.1)          * 0.38;
        y += Math.sin(t * Math.PI * 2.9  + 0.83)  * 0.19;
        y += Math.sin(t * Math.PI * 5.3  + 1.67)  * 0.10;
        y += Math.sin(t * Math.PI * 11.7 + 0.31)  * 0.05;
        y += Math.sin(t * Math.PI * 19.1 + 2.54)  * 0.025;
        // Taper edges to 0
        const edge = Math.pow(Math.sin(t * Math.PI), 0.55);
        return Math.max(0, Math.min(0.78, (y + 0.12) * edge));
    }

    function buildPeakPositions() {
        peakPositions = PEAKS.map(p => ({
            ...p,
            px: p.x * W,
            py: H - mountainH(p.x) * H,
        }));
    }

    // ─────────────────────────────────────────────
    // PARTICLES — atmospheric snow/mist
    // ─────────────────────────────────────────────
    const PCOUNT = 140;
    const particles = [];

    function newParticle(scatter) {
        return {
            x: Math.random() * (W || 1000),
            y: scatter ? Math.random() * (H || 600) : -8,
            vx: (Math.random() - 0.5) * 0.25,
            vy: 0.15 + Math.random() * 0.4,
            r:  0.4 + Math.random() * 1.4,
            a:  0.1 + Math.random() * 0.4,
        };
    }

    function initParticles() {
        particles.length = 0;
        for (let i = 0; i < PCOUNT; i++) particles.push(newParticle(true));
    }

    // ─────────────────────────────────────────────
    // DRAW — GRID
    // ─────────────────────────────────────────────
    function drawGrid() {
        const sz = 55;
        ctx.strokeStyle = 'rgba(255,255,255,0.022)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W; x += sz) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y <= H; y += sz) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }
    }

    // ─────────────────────────────────────────────
    // DRAW — CONTOUR LINES (topographic)
    // ─────────────────────────────────────────────
    function drawContours() {
        const COUNT = 14;
        for (let c = 0; c < COUNT; c++) {
            const hf = (c + 1) / COUNT;
            ctx.beginPath();
            let inPath = false;
            for (let xi = 0; xi <= W; xi += 2) {
                const t  = xi / W;
                const mh = mountainH(t);
                if (mh >= hf) {
                    const y = H - hf * H;
                    if (!inPath) { ctx.moveTo(xi, y); inPath = true; }
                    else ctx.lineTo(xi, y);
                } else if (inPath) {
                    inPath = false;
                }
            }
            const a = 0.012 + (c / COUNT) * 0.025;
            ctx.strokeStyle = `rgba(255,255,255,${a})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // ─────────────────────────────────────────────
    // DRAW — MOUNTAIN
    // ─────────────────────────────────────────────
    function drawMountain(breathe) {
        const STEPS = W;

        // Build the ridgeline path
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let i = 0; i <= STEPS; i++) {
            const t  = i / STEPS;
            const bv = Math.sin(t * Math.PI * 4 + breathe) * 1.5;
            const y  = H - mountainH(t) * H + bv;
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(t * W, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();

        // Fill — deep dark
        const fillG = ctx.createLinearGradient(0, 0, 0, H);
        fillG.addColorStop(0,   'rgba(22, 5, 5, 0.97)');
        fillG.addColorStop(0.5, 'rgba(12, 3, 3, 0.99)');
        fillG.addColorStop(1,   'rgba(6,  1, 1, 1.00)');
        ctx.fillStyle = fillG;
        ctx.fill();

        // Ridge — white ghost glow
        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
            const t  = i / STEPS;
            const bv = Math.sin(t * Math.PI * 4 + breathe) * 1.5;
            const y  = H - mountainH(t) * H + bv;
            i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(t * W, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255,255,255,0.25)';
        ctx.shadowBlur  = 7;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Ridge — red scan-reveal (left of scan line)
        if (scanProgress > 0) {
            ctx.beginPath();
            const scanX = scanProgress * W;
            for (let i = 0; i <= STEPS; i++) {
                const px = (i / STEPS) * W;
                if (px > scanX + 2) break;
                const t  = i / STEPS;
                const bv = Math.sin(t * Math.PI * 4 + breathe) * 1.5;
                const y  = H - mountainH(t) * H + bv;
                i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(px, y);
            }
            ctx.strokeStyle = 'rgba(232,25,10,0.55)';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#e8190a';
            ctx.shadowBlur  = 14;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    // ─────────────────────────────────────────────
    // DRAW — SCAN LINE
    // ─────────────────────────────────────────────
    function drawScanLine(progress) {
        if (progress <= 0.005) return;
        const x = progress * W;

        // Trailing glow
        const beam = ctx.createLinearGradient(x - 60, 0, x, 0);
        beam.addColorStop(0,   'rgba(232,25,10,0)');
        beam.addColorStop(0.6, 'rgba(232,25,10,0.04)');
        beam.addColorStop(1,   'rgba(232,25,10,0.18)');
        ctx.fillStyle = beam;
        ctx.fillRect(x - 60, 0, 62, H);

        // Hard line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.strokeStyle = 'rgba(232,25,10,0.9)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#e8190a';
        ctx.shadowBlur  = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Scanning text label
        ctx.font = '10px "Syne", monospace';
        ctx.fillStyle = 'rgba(232,25,10,0.7)';
        ctx.fillText('SCANNING', x + 6, 18);
    }

    // ─────────────────────────────────────────────
    // DRAW — PEAK DOTS
    // ─────────────────────────────────────────────
    function drawPeakDot(peak, revealed) {
        if (!revealed) return;
        const { px, py } = peak;

        // Pulsing ring
        const ringR = 3 + (Math.sin(time * 2.5 + peak.x * 12) * 0.5 + 0.5) * 10;
        ctx.beginPath();
        ctx.arc(px, py, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232,25,10,${Math.max(0, 0.5 - ringR / 25)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#e8190a';
        ctx.shadowColor = '#e8190a';
        ctx.shadowBlur  = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connector line to edge (like Blue Flax poster)
        const lineLen = 50 + Math.abs(peak.py - H * 0.5) * 0.15;
        const dir = peak.side === 'right' ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(px + dir * 4, py);
        ctx.lineTo(px + dir * lineLen, py);
        ctx.strokeStyle = 'rgba(232,25,10,0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Tiny crosshair at peak
        ctx.beginPath();
        ctx.moveTo(px - 7, py);
        ctx.lineTo(px + 7, py);
        ctx.moveTo(px, py - 7);
        ctx.lineTo(px, py + 7);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // ─────────────────────────────────────────────
    // DRAW — SACRED TRISHUL (त्रिशूल)
    // Drawn with pure canvas geometry, no images
    // ─────────────────────────────────────────────
    function drawTrishul(cx, cy, size, opacity) {
        if (opacity < 0.01) return;
        ctx.save();
        ctx.globalAlpha = opacity;

        const red = 'rgba(232,25,10,0.55)';
        const wht = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.8;

        // Outer rotating hexagram
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
            const a = (i / 6) * Math.PI * 2 + time * 0.04;
            const r = size * 0.85;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wht;
        ctx.stroke();

        // Inner triangle (up) — the Yantra
        ctx.beginPath();
        for (let i = 0; i <= 3; i++) {
            const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + time * 0.02;
            const x = cx + Math.cos(a) * size * 0.5;
            const y = cy + Math.sin(a) * size * 0.5;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = red;
        ctx.stroke();

        // Inner triangle (down) — inverted
        ctx.beginPath();
        for (let i = 0; i <= 3; i++) {
            const a = (i / 3) * Math.PI * 2 + Math.PI / 2 - time * 0.02;
            const x = cx + Math.cos(a) * size * 0.5;
            const y = cy + Math.sin(a) * size * 0.5;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.stroke();

        // Trishul staff (vertical)
        ctx.lineWidth = 1;
        ctx.strokeStyle = red;
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.7);
        ctx.lineTo(cx, cy - size * 0.7);
        ctx.stroke();

        // Three prongs
        [-0.28, 0, 0.28].forEach((offset, i) => {
            const px = cx + offset * size;
            const topY = cy - size * (i === 1 ? 0.7 : 0.55);
            ctx.beginPath();
            ctx.moveTo(px, cy - size * 0.1);
            ctx.lineTo(px, topY);
            ctx.stroke();
            // Curved tip (simplified)
            ctx.beginPath();
            ctx.moveTo(px - size * 0.07, topY + size * 0.1);
            ctx.lineTo(px, topY);
            ctx.lineTo(px + size * 0.07, topY + size * 0.1);
            ctx.stroke();
        });

        // Cross bar
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.32, cy - size * 0.06);
        ctx.lineTo(cx + size * 0.32, cy - size * 0.06);
        ctx.stroke();

        ctx.restore();
    }

    // ─────────────────────────────────────────────
    // DRAW — PARTICLES
    // ─────────────────────────────────────────────
    function drawParticles() {
        particles.forEach(p => {
            // Mouse repulsion
            const dx = p.x / W - mouseX;
            const dy = p.y / H - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.12) {
                p.vx += dx * 0.04;
                p.vy += dy * 0.04;
            }
            p.vx *= 0.985;
            p.x  += p.vx;
            p.y  += p.vy;

            if (p.y > H + 5 || p.x < -5 || p.x > W + 5) {
                Object.assign(p, newParticle(false));
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.a * 0.45})`;
            ctx.fill();
        });
    }

    // ─────────────────────────────────────────────
    // MAIN ANIMATION LOOP
    // ─────────────────────────────────────────────
    function draw() {
        animFrame = requestAnimationFrame(draw);
        time += 0.007;

        ctx.clearRect(0, 0, W, H);

        // BG
        ctx.fillStyle = '#060101';
        ctx.fillRect(0, 0, W, H);

        drawGrid();
        drawContours();
        drawMountain(time);
        drawScanLine(scanProgress);

        // Trishul — appears from center as scan passes 40%
        if (scanProgress > 0.25) {
            const op = Math.min(0.9, (scanProgress - 0.25) * 4) * 0.3;
            drawTrishul(W * 0.5, H * 0.38, Math.min(W, H) * 0.17, op);
        }

        peakPositions.forEach(p => drawPeakDot(p, scanProgress >= p.x));
        drawParticles();

        // HUD scan progress bar
        const barEl = document.getElementById('sd-scanbar-fill');
        if (barEl) barEl.style.width = `${scanProgress * 100}%`;
    }

    // ─────────────────────────────────────────────
    // SCROLL INTEGRATION
    // ─────────────────────────────────────────────
    function initScroll() {
        ScrollTrigger.create({
            trigger: '#sacred-data',
            start: 'top 80%',
            end: 'bottom 20%',
            onUpdate: (self) => {
                // Drive scan with scroll progress
                scanProgress = Math.max(0, Math.min(1, self.progress * 1.4 - 0.05));

                // Drive counters
                COUNTERS.forEach(c => {
                    const el = document.getElementById(c.id);
                    if (!el) return;
                    const v = Math.floor(c.value * Math.min(1, self.progress * 1.8));
                    el.textContent = String(v).padStart(String(c.value).length, '0');
                });

                // Reveal callouts as scan passes them
                PEAKS.forEach((pk, i) => {
                    const el = document.querySelector(`.sd-callout[data-idx="${i}"]`);
                    if (el && scanProgress >= pk.x + 0.05) {
                        el.classList.add('revealed');
                    }
                });
            }
        });
    }

    // ─────────────────────────────────────────────
    // MOUSE TRACKING
    // ─────────────────────────────────────────────
    function initMouse() {
        const section = document.getElementById('sacred-data');
        if (!section) return;
        section.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = (e.clientX - rect.left) / rect.width;
            mouseY = (e.clientY - rect.top)  / rect.height;
        });
    }

    // ─────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────
    window.addEventListener('resize', resize);
    resize();
    initScroll();
    initMouse();
    draw();
}
