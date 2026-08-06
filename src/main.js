import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

import brutalistVertexShader  from './shaders/brutalistVertex.glsl?raw';
import brutalistFragmentShader from './shaders/brutalistFragment.glsl?raw';
import atmosVertexShader      from './shaders/atmosVertex.glsl?raw';
import atmosFragmentShader    from './shaders/atmosFragment.glsl?raw';

gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// --- Three.js Setup ---
const canvasContainer = document.getElementById('canvas-container');
const scene = new THREE.Scene();
// Scene background is transparent to show HTML behind it
scene.fog = new THREE.FogExp2('#0a0a0a', 0.008); // Subtle atmosphere

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 20); // Close to the mountain

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- Group for all world objects ---
const worldGroup = new THREE.Group();
scene.add(worldGroup);

// --- Act 1: The Void (Stars / Snow) ---
const particlesGeom = new THREE.BufferGeometry();
const particlesCount = 3000;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 100;
}
particlesGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMat = new THREE.PointsMaterial({
    size: 0.05,
    color: '#ffffff', // Polar White
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});
const starsMesh = new THREE.Points(particlesGeom, particlesMat);
worldGroup.add(starsMesh);

// --- Act 2 & 3: Particle Mountain & Bird Transition ---
const textureLoader = new THREE.TextureLoader();
let mountainParticles;
let birdParticles;
const birdIndices = []; // Store which particles become birds


textureLoader.load('/mountain.png', (mountainTex) => {
    const img = mountainTex.image;
    const canvas = document.createElement('canvas');
    
    // Massive resolution for ultra dense mountain (double density again to 80%)
    const maxWidth = 1800; // Super dense!
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = Math.floor(img.height * scale);
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    const positions = [];
    const targetPositions = [];
    const colors = [];
    const offsets = [];
    
    // Mountain width slightly wider than 16:9 screen at z=20 (which is ~41 units)
    // 50 ensures it covers left and right edges completely.
    const mountainWidth = 55; 
    const mountainHeight = mountainWidth * (canvas.height / canvas.width);
    
    // Iterate through pixels
    for(let y = 0; y < canvas.height; y++) {
        for(let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = imgData[index];
            const g = imgData[index+1];
            const b = imgData[index+2];
            
            // Luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // If bright enough, create a particle (lowered threshold for more density)
            if (lum > 2) {
                // PosX and PosY
                const posX = (x / canvas.width - 0.5) * mountainWidth;
                // Center the mountain. A slight upward shift (+5) pushes the peaks well above the halfway mark
                const posY = -(y / canvas.height - 0.5) * mountainHeight + 5; 
                const posZ = 0;
                
                positions.push(posX, posY, posZ);
                
                // Polar whiteness: boost the brightness significantly
                const boost = 1.5;
                colors.push(Math.min(1.0, (r/255)*boost), Math.min(1.0, (g/255)*boost), Math.min(1.0, (b/255)*boost));
                
                // Target position for when it turns into a bird and flies to the screen
                const scatterX = posX * (1.5 + Math.random() * 2.0);
                const scatterY = posY + 15 + Math.random() * 20; 
                const scatterZ = posZ + 25 + Math.random() * 15; // Fly past camera (camera is at z=20)
                targetPositions.push(scatterX, scatterY, scatterZ);
                
                offsets.push(Math.random() * Math.PI * 2);
            }
        }
    }
    
    // --- Create Unified Mountain/Bird System ---
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('aStartPos', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setAttribute('aOffset', new THREE.Float32BufferAttribute(offsets, 1));
    
    const matShader = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uFlightProgress: { value: 0.0 }, // 0 = mountain, 1 = flown past camera
            uOpacity: { value: 0.0 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uFlightProgress;
            attribute vec3 aStartPos;
            attribute vec3 aTargetPos;
            attribute vec3 color;
            attribute float aOffset;
            
            varying vec3 vColor;
            varying float vProgress;
            
            void main() {
                vColor = color;
                vProgress = uFlightProgress;
                
                // Non-linear flight path
                float easeProgress = pow(uFlightProgress, 1.5);
                vec3 localPos = mix(aStartPos, aTargetPos, easeProgress);
                
                // Add flapping and chaos as they fly
                if (uFlightProgress > 0.0) {
                    float flap = sin(uTime * 25.0 + aOffset) * 0.8;
                    localPos.y += flap * uFlightProgress;
                    float driftX = sin(uTime * 3.0 + aOffset) * 4.0;
                    localPos.x += driftX * uFlightProgress;
                }
                
                vec4 mvPosition = modelViewMatrix * vec4(localPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Base size for mountain, gets MASSIVE as they fly towards camera
                float baseSize = 3.5; // Enough to fill all microscopic gaps at 1800 density, creating a solid block
                float birdSize = 120.0; // Huge bird size
                float currentSize = mix(baseSize, birdSize, uFlightProgress);
                
                gl_PointSize = max(1.0, currentSize / -mvPosition.z);
            }
        `,
        fragmentShader: `
            uniform float uOpacity;
            varying vec3 vColor;
            varying float vProgress;
            
            void main() {
                vec2 uv = gl_PointCoord - vec2(0.5);
                
                // Mountain particle shape (soft circle)
                float circle = 1.0 - smoothstep(0.1, 0.5, length(uv));
                
                // Bird shape (V silhouette)
                float vShape = abs(uv.x) * 2.0 - uv.y;
                float birdAlpha = 1.0 - smoothstep(0.0, 0.2, abs(vShape - 0.2));
                float body = 1.0 - smoothstep(0.0, 0.1, length(uv - vec2(0.0, -0.1)));
                birdAlpha = max(birdAlpha, body);
                
                // Morph shape from circle to bird based on flight progress
                float finalShape = mix(circle, birdAlpha, smoothstep(0.01, 0.2, vProgress));
                
                // Color morphs to pure white birds
                vec3 finalColor = mix(vColor, vec3(1.0), smoothstep(0.01, 0.3, vProgress));
                
                // Fade out at the very end of the flight (past camera)
                float flightFade = 1.0 - smoothstep(0.8, 1.0, vProgress);
                
                if (finalShape < 0.01) discard;
                
                gl_FragColor = vec4(finalColor, finalShape * uOpacity * flightFade);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
    });
    
    mountainParticles = new THREE.Points(geom, matShader);
    worldGroup.add(mountainParticles);
});

// --- Intro State ---
const animState = {
    introProgress: 0.0, 
    brutalistOpacity: 0.0,
    maskScale: 9,      // Scaled down so it fits in the screen
    maskRotY: 0,
    maskRotX: 0,       // New: for mouse interaction pinning
    maskOpacity: 0.0,  // Start invisible!
    titleOpacity: 0.0,
    birdFlight: 0.0
};

// --- Act 2 & 3: Brutalist 3D Mask ---
let maskModel = null;
const loader = new GLTFLoader();

// Dramatic Brutalist Lighting
const maskLight = new THREE.DirectionalLight('#00BFFF', 5.0); // Premium Sky Blue rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const goldLight = new THREE.DirectionalLight('#FFD700', 2.5); // Warm Gold accent light
goldLight.position.set(-5, -2, 5);
scene.add(goldLight);

const maskFill = new THREE.DirectionalLight('#ffffff', 1.0); // Soft white fill
maskFill.position.set(-5, 0, 10);
scene.add(maskFill);

loader.load('/mask.glb', (gltf) => {
    maskModel = gltf.scene;
    
    // Scale and position the massive mask
    maskModel.scale.set(animState.maskScale, animState.maskScale, animState.maskScale);
    maskModel.position.set(0, 0, 0);
    
    // Apply materials
    maskModel.traverse((child) => {
        if (child.isMesh) {
            // Apply Brutalist dark metallic theme
            if (child.material) {
                child.material.color.setHex(0x050505); // Dark Obsidian
                child.material.roughness = 0.15;
                child.material.metalness = 0.9;
                child.material.transparent = true;
                child.material.opacity = animState.maskOpacity;
                child.material.depthWrite = false;
            }
        }
    });
    
    worldGroup.add(maskModel);
});
// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});


// Interactive Mask Mouse Control
let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
    // Map mouse to -1.0 to 1.0 range
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ============================================================
// BRUTALIST SECTION — 4 Procedural Worlds, No Images
// Everything is code: mountains, temples, culture, nature
// ============================================================

let brutalistGroup, brutalistMesh, brutalistMaterial;
let brutalistMouse = new THREE.Vector2(0, 0);
let targetBrutalistHover = 0;
let brutalistReady = false;

// Build the full-screen procedural plane immediately (no async texture load needed!)
{
    brutalistGroup = new THREE.Group();
    brutalistGroup.position.set(0, 0, 10);
    brutalistGroup.visible = false;
    worldGroup.add(brutalistGroup);

    // Full-screen plane at z=10 (camera at z=22, FOV=60 → visible area ≈ 27.7 × 15.6 units)
    const geom = new THREE.PlaneGeometry(30, 17, 1, 1);

    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uChapter: { value: -1 }, // -1 = Hero Intro, 0, 1, 2, 3 = Editorial Chapters
            uOpacity: { value: 0 }, // Crossfade opacity
            uIntroProgress: { value: 0 }, // 0 to 1 for the Awakening
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uHover: { value: 0 }, // 0 to 1 smooth
            uScrollVelocity: { value: 0 }
        },
        vertexShader:   brutalistVertexShader,
        fragmentShader: brutalistFragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    brutalistMesh = new THREE.Mesh(geom, brutalistMaterial);
    brutalistGroup.add(brutalistMesh);
    brutalistReady = true;
}

// Switch chapter: fade out → switch uChapter → fade in
function switchBrutalistChapter(chapterIdx) {
    if (!brutalistReady) return;
    const current = brutalistMaterial.uniforms.uChapter.value;
    if (current === chapterIdx) return;
    // Quick cross-dissolve via opacity
    gsap.killTweensOf(brutalistMaterial.uniforms.uOpacity);
    gsap.to(brutalistMaterial.uniforms.uOpacity, {
        value: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => {
            brutalistMaterial.uniforms.uChapter.value = chapterIdx;
            gsap.to(brutalistMaterial.uniforms.uOpacity, {
                value: animState.brutalistOpacity,
                duration: 0.6, ease: 'power2.out'
            });
        }
    });
}

// --- Atmospheric Mist Particle System (active during brutalist section) ---
const ATMOS_COUNT = 600;
const atmosPositions = new Float32Array(ATMOS_COUNT * 3);
const atmosSizes     = new Float32Array(ATMOS_COUNT);
const atmosOffsets   = new Float32Array(ATMOS_COUNT);
const atmosSpeeds    = new Float32Array(ATMOS_COUNT);

for (let i = 0; i < ATMOS_COUNT; i++) {
    // Scatter particles across the editorial stage (z slightly in front of image)
    atmosPositions[i * 3]     = (Math.random() - 0.5) * 30;
    atmosPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
    atmosPositions[i * 3 + 2] = 11 + Math.random() * 4; // Between image and camera
    atmosSizes[i]   = 0.4 + Math.random() * 1.2; // Large, soft blobs
    atmosOffsets[i] = Math.random();
    atmosSpeeds[i]  = 0.025 + Math.random() * 0.04; // Very slow drift
}

const atmosGeom = new THREE.BufferGeometry();
atmosGeom.setAttribute('position', new THREE.BufferAttribute(atmosPositions, 3));
atmosGeom.setAttribute('aSize',    new THREE.BufferAttribute(atmosSizes,     1));
atmosGeom.setAttribute('aOffset',  new THREE.BufferAttribute(atmosOffsets,   1));
atmosGeom.setAttribute('aSpeed',   new THREE.BufferAttribute(atmosSpeeds,    1));

const atmosMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 }
    },
    vertexShader:   atmosVertexShader,
    fragmentShader: atmosFragmentShader,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending
});

const atmosMesh = new THREE.Points(atmosGeom, atmosMat);
atmosMesh.visible = false;
worldGroup.add(atmosMesh);


// Lighting
const ambientLight = new THREE.AmbientLight('#ffffff', 0.2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight('#ffffff', 1.5);
directionalLight.position.set(10, 20, -10); // Sunlight from behind mountains
scene.add(directionalLight);





function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    
    // Constant subtle motion
    starsMesh.rotation.y = elapsedTime * 0.01;
    
    if (typeof mountainParticles !== "undefined" && mountainParticles) {
        mountainParticles.material.uniforms.uTime.value = elapsedTime;
        mountainParticles.material.uniforms.uFlightProgress.value = animState.birdFlight;
        mountainParticles.material.uniforms.uOpacity.value = 1.0 - animState.brutalistOpacity;
    }
    if (maskModel) {
        // Continuous slow floating rotation + Interactive Mouse X rotation
        // The mask is "pinned" on the Y axis, so only rotation.y is affected by mouseX
        let targetRotY = animState.maskRotY + (mouseX * 0.8) + (Math.sin(elapsedTime * 0.5) * 0.1);
        
        // Smoothly interpolate current rotation to target rotation
        maskModel.rotation.y += (targetRotY - maskModel.rotation.y) * 0.1;
        maskModel.rotation.x = Math.cos(elapsedTime * 0.3) * 0.05 + (mouseY * 0.2); // Look up/down slightly
        
        // Y-axis limited tracking
        let targetPosY = mouseY * 0.8;
        maskModel.position.y += (targetPosY - maskModel.position.y) * 0.1;
        
        // Scale (stretched wider on X) and opacity driven by GSAP
        maskModel.scale.set(animState.maskScale * 1.4, animState.maskScale, animState.maskScale);
        
        // Traverse and update opacity
        maskModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.opacity = animState.maskOpacity;
            }
        });
    }


            // Smooth damp hover
        if (typeof brutalistMaterial !== "undefined" && brutalistMaterial) {
            brutalistMaterial.uniforms.uHover.value = THREE.MathUtils.lerp(
                brutalistMaterial.uniforms.uHover.value, targetBrutalistHover, 0.1
            );
            // Scroll velocity
            brutalistMaterial.uniforms.uScrollVelocity.value = THREE.MathUtils.lerp(
                brutalistMaterial.uniforms.uScrollVelocity.value, window.lastScrollVelocity || 0, 0.05
            );
            // Mouse in UV space (0-1)
            const targetMouseUV = new THREE.Vector2(
                brutalistMouse.x,
                brutalistMouse.y
            );
            brutalistMaterial.uniforms.uMouse.value.lerp(targetMouseUV, 0.08);
            if(brutalistGroup) brutalistGroup.visible = (animState.brutalistOpacity > 0.005);
        }
        
    renderer.render(scene, camera);
}
animate();

// --- GSAP Master Timeline for 7 Acts ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Start perfectly at ground level looking at the horizon
    camera.position.set(0, 2, 20); 
    camera.rotation.x = 0;
    
    const masterTl = gsap.timeline({
        scrollTrigger: {
            trigger: "#app",
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            onUpdate: (self) => {
                // Remove uScrollProgress if it was used for smokeMat
            }
        }
    });


    // 1. Mountain to Birds Flight (0.0 to 1.5)
    masterTl.to(animState, {
        birdFlight: 1.0,
        duration: 1.5,
        ease: "power1.inOut"
    }, 0.0)
    .add(() => { if (typeof mountainParticles !== "undefined" && mountainParticles) mountainParticles.visible = false; }, 1.5)
    
    // 2. Mask and Typography Reveal (1.5 to 2.0)
    .to(".hero-title-container", {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "power2.out"
    }, 1.5)
    .to(animState, {
        maskOpacity: 0.85,
        duration: 0.5,
        ease: "power2.out"
    }, 1.5)
    
    // 3. Subtle Mask Interaction
    .to(animState, {
        maskRotY: Math.PI / 12,
        duration: 1.5,
        ease: "power2.inOut"
    }, 2.5)
    
    // 4. Transition to Editorial Procedural Worlds (4.0 to 4.5)
    .to(".hero-title-container", { opacity: 0, scale: 1.1, duration: 0.3 }, 4.0)
    .to(animState, { maskOpacity: 0.0, duration: 0.4 }, 4.1) // Fade mask out
    .to(animState, { brutalistOpacity: 1.0, duration: 0.5, ease: "power2.inOut" }, 4.2)
    .to('#br-shell', { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 4.2)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 4.3)
    .add(() => { if(typeof switchBrutalistChapter !== "undefined") switchBrutalistChapter(0); }, 4.2);

    
    // ============================================================
    // BRUTALIST UI SCROLL LOGIC
    // Single pinned container controls 4 layered chapters
    // ============================================================
    const chapters = [
        { id: 'br-ch-01', chIdx: 0 },
        { id: 'br-ch-02', chIdx: 1 },
        { id: 'br-ch-03', chIdx: 2 },
        { id: 'br-ch-04', chIdx: 3 },
    ];
    let currentCh = -1;

    ScrollTrigger.create({
        trigger: '#brutalist-act',
        start: 'top top',
        end: '+=400%', // 4 chapters, pin for 400vh
        pin: true,
        onUpdate: (self) => {
            // self.progress goes from 0 to 1
            // Convert to chapter index (0, 1, 2, 3)
            let idx = Math.min(3, Math.floor(self.progress * 4));
            
            if (idx !== currentCh) {
                // Fade out old
                if (currentCh >= 0) {
                    const oldEl = document.getElementById(chapters[currentCh].id);
                    const oldWords = oldEl.querySelectorAll('.br-word');
                    const oldBody = oldEl.querySelector('.br-body');
                    
                    gsap.to(oldWords, { y: '-110%', duration: 0.5, ease: 'power4.in', stagger: 0.04, overwrite: true });
                    if (oldBody) gsap.to(oldBody, { opacity: 0, y: -20, duration: 0.35, overwrite: true });
                    gsap.to(oldEl, { 
                        opacity: 0, 
                        duration: 0.4, 
                        onComplete: () => oldEl.classList.remove('active-ch') 
                    });
                }
                
                // Fade in new
                const newEl = document.getElementById(chapters[idx].id);
                newEl.classList.add('active-ch');
                const newWords = newEl.querySelectorAll('.br-word');
                const newBody = newEl.querySelector('.br-body');
                const newDivider = newEl.querySelector('.br-divider');
                const newNumEl = newEl.querySelector('.br-chapter-num');

                // Switch WebGL Shader chapter
                switchBrutalistChapter(chapters[idx].chIdx);

                // Update UI Rail
                document.querySelectorAll('.br-progress-tick').forEach((t, ti) => {
                    t.classList.toggle('active', ti === idx);
                });
                const chNum = String(idx + 1).padStart(2, '0');
                const counter = document.getElementById('br-chapter-counter');
                if (counter) counter.textContent = `${chNum} / 04`;

                // GSAP Typography Slam
                gsap.killTweensOf(newWords);
                gsap.fromTo(newWords, { y: '110%' }, {
                    y: '0%', duration: 0.85, ease: 'power4.out', stagger: 0.07, overwrite: true
                });

                if (newNumEl) gsap.fromTo(newNumEl, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' });
                
                if (newBody) gsap.fromTo(newBody, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.25, ease: 'power2.out', overwrite: true });
                
                if (newDivider) {
                    gsap.fromTo(newDivider, { width: 0 }, { width: '80px', duration: 0.7, delay: 0.2, ease: 'power3.out' });
                }
                
                gsap.to(newEl, { opacity: 1, duration: 0.5, ease: 'power2.out' });

                currentCh = idx;
            }
        }
    });

    // Track scroll velocity for the shader
    let scrollTimeout;
    window.lastScrollVelocity = 0;
    
    ScrollTrigger.create({
        trigger: "#app",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
            window.lastScrollVelocity = self.getVelocity() * 0.002;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                window.lastScrollVelocity = 0;
            }, 100);
        }
    });

    // Mouse tracking for WebGL liquid/glitch effect
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    window.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        if (brutalistMesh) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(brutalistMesh);
            
            if (intersects.length > 0) {
                targetBrutalistHover = 1.0;
                brutalistMouse.copy(intersects[0].uv);
            } else {
                targetBrutalistHover = 0.0;
            }
        }
    });
});
