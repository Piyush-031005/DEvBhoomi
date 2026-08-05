import './style.css';
import * as THREE from 'three';
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
// --- Intro State ---
const animState = {
    introProgress: 0.0, // Drives the GLSL awakening sequence
    titleOpacity: 0.0,
    titleScale: 0.9,
    brutalistOpacity: 0.0
};

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
            uHover: { value: 0 } // 0 to 1 smooth
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

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    
    // Constant subtle motion
    starsMesh.rotation.y = elapsedTime * 0.01;
    
    // Intro + Brutalist animations
    if (brutalistGroup && brutalistMaterial) {
        brutalistMaterial.uniforms.uTime.value = elapsedTime;
        brutalistMaterial.uniforms.uIntroProgress.value = animState.introProgress;
        
        // Use timeline opacity for intro, but let switchBrutalistChapter override for sections
        if (brutalistMaterial.uniforms.uChapter.value === -1) {
            brutalistMaterial.uniforms.uOpacity.value = animState.brutalistOpacity;
        }

        // Smooth damp hover
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
        brutalistGroup.visible = (animState.brutalistOpacity > 0.005);
    }

    // Atmospheric mist particles
    if (atmosMesh) {
        atmosMat.uniforms.uTime.value    = elapsedTime;
        atmosMat.uniforms.uOpacity.value = animState.brutalistOpacity;
        atmosMesh.visible = (animState.brutalistOpacity > 0.01);
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

    // 1. The Awakening (0 to 2)
    masterTl.to(animState, {
        brutalistOpacity: 1.0, // Fade in the GLSL canvas completely
        duration: 0.2,
    }, 0)
    .to(animState, {
        introProgress: 1.0, // Drives the darkness -> heartbeat -> portal math
        duration: 2.0,
        ease: "power2.inOut"
    }, 0)
    // 2. The Divine Word Appears (1.5 to 2.5)
    .to("#devbhoomi-title", {
        opacity: 1,
        scale: 1,
        duration: 1.0,
        ease: "power3.out"
    }, 1.5)
    
    // 3. The Transition to Editorial (2.5 to 3.5)
    // Title fades out
    .to("#devbhoomi-title", { opacity: 0, scale: 1.1, duration: 0.8 }, 2.5)
    
    // Reveal brutalist UI shell
    .to('#br-shell', { opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 3.0)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 3.5)
    
    // Switch GLSL to Chapter 0 (Panchachuli) smoothly
    .add(() => { switchBrutalistChapter(0); }, 2.8);

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
