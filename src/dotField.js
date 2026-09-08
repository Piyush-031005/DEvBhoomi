export function initDotField() {
    const container = document.getElementById('dot-field-container');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none'; // let mouse pass through
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');

    let W, H;
    let dots = [];

    // Configuration
    const dotRadius = 1.5;
    const dotSpacing = 14;
    const cursorRadius = 160;
    const cursorForce = 0.1;
    const maxBulge = 4;
    
    // Gradients from user reference
    const colorFrom = { r: 168, g: 85, b: 247 }; // #A855F7
    const colorTo = { r: 180, g: 151, b: 207 }; // #B497CF

    let mouseX = -1000;
    let mouseY = -1000;

    function resize() {
        W = container.clientWidth;
        H = container.clientHeight;
        canvas.width = W * window.devicePixelRatio;
        canvas.height = H * window.devicePixelRatio;
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        initDots();
    }

    function initDots() {
        dots = [];
        const cols = Math.floor(W / dotSpacing) + 2;
        const rows = Math.floor(H / dotSpacing) + 2;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                dots.push({
                    baseX: x * dotSpacing,
                    baseY: y * dotSpacing,
                    x: x * dotSpacing,
                    y: y * dotSpacing,
                    scale: 1,
                    // calculate color interpolation based on X position
                    progressX: x / cols
                });
            }
        }
    }

    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    window.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    function interpolateColor(color1, color2, factor) {
        return `rgb(${Math.round(color1.r + factor * (color2.r - color1.r))}, 
                    ${Math.round(color1.g + factor * (color2.g - color1.g))}, 
                    ${Math.round(color1.b + factor * (color2.b - color1.b))})`;
    }

    function render() {
        requestAnimationFrame(render);
        
        // Only render if we are somewhat visible in viewport
        const rect = container.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        
        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            
            const dx = mouseX - dot.baseX;
            const dy = mouseY - dot.baseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let targetScale = 1;
            let targetX = dot.baseX;
            let targetY = dot.baseY;

            if (dist < cursorRadius) {
                // Bulge logic
                const force = (cursorRadius - dist) / cursorRadius;
                targetScale = 1 + force * maxBulge;
                
                // Slight repulsion
                const angle = Math.atan2(dy, dx);
                const push = force * cursorRadius * cursorForce;
                targetX -= Math.cos(angle) * push;
                targetY -= Math.sin(angle) * push;
            }

            // Interpolate towards target smoothly
            dot.scale += (targetScale - dot.scale) * 0.1;
            dot.x += (targetX - dot.x) * 0.1;
            dot.y += (targetY - dot.y) * 0.1;

            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dotRadius * dot.scale, 0, Math.PI * 2);
            ctx.fillStyle = interpolateColor(colorFrom, colorTo, dot.progressX);
            ctx.fill();
        }
        
        // Add soft glow around cursor matching user's glowColor preference
        const gGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, cursorRadius);
        gGrad.addColorStop(0, 'rgba(18, 15, 23, 0.4)'); // #120F17
        gGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = gGrad;
        ctx.fillRect(mouseX - cursorRadius, mouseY - cursorRadius, cursorRadius * 2, cursorRadius * 2);
    }

    render();
}
