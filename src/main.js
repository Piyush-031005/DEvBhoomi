import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';


import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initSacredData } from './sacredData.js';
import { initDistrictMap } from './districtMap.js';
import { Ecosystem } from './Ecosystem.js';
import { SoundEngine } from './SoundEngine.js';
import { initMuseumRoom } from './museumRoom.js';
import { initRiverSystem } from './riverSystem.js';
import { initGalaxy } from './galaxy.js';
import { initGhostFibers } from './shaders/GhostFibers.js';
import { initStarBurst } from './shaders/StarBurst.js';

// ==========================================================
// PRELOADER LOGIC
// ==========================================================
THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    const progressEl = document.getElementById('loader-progress');
    if (progressEl) {
        progressEl.innerText = `LOADING ASSETS ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
    }
};

THREE.DefaultLoadingManager.onLoad = function () {
    const progressEl = document.getElementById('loader-progress');
    const enterBtn = document.getElementById('enter-btn');
    if (progressEl && enterBtn) {
        progressEl.style.display = 'none';
        enterBtn.style.display = 'inline-block';
        
        enterBtn.addEventListener('click', () => {
            const loaderEl = document.getElementById('global-loader');
            if (loaderEl) {
                loaderEl.style.opacity = '0';
                
                // Play double temple bell on enter
                if (typeof SoundEngine !== "undefined") {
                    if (!SoundEngine.isInitialized) SoundEngine.init();
                    SoundEngine.playProceduralBell(440, 1.5);
                    setTimeout(() => SoundEngine.playProceduralBell(440, 2.0), 400); // 2nd strike
                }
                
                setTimeout(() => {
                    loaderEl.remove();
                }, 1500);
            }
        });
    }
};

// Initialize audio on first click (browser autoplay policy)
document.addEventListener('click', () => {
    if (!SoundEngine.isInitialized) {
        SoundEngine.init();
    }
}, { once: true });

import brutalistVertexShader  from './shaders/brutalistVertex.glsl?raw';
import brutalistFragmentShader from './shaders/brutalistFragment.glsl?raw';
import atmosVertexShader      from './shaders/atmosVertex.glsl?raw';
import atmosFragmentShader    from './shaders/atmosFragment.glsl?raw';

gsap.registerPlugin(ScrollTrigger);

// --- Custom Cursor Logic ---
const cursor = document.getElementById('custom-cursor');
const cursorRing = document.getElementById('custom-cursor-ring');
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let ringX = cursorX;
let ringY = cursorY;

window.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
});

function updateCursor() {
  if (cursor && cursorRing) {
    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    // Lerp the ring for smooth trailing
    ringX += (cursorX - ringX) * 0.15;
    ringY += (cursorY - ringY) * 0.15;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
  }
  requestAnimationFrame(updateCursor);
}
requestAnimationFrame(updateCursor);

// Add hover state to body when hovering interactive elements
document.addEventListener('mouseover', (e) => {
  if (e.target.closest('button, a, .district-info-panel, .map-ui')) {
    document.body.classList.add('hover-active');
  }
});
document.addEventListener('mouseout', (e) => {
  if (e.target.closest('button, a, .district-info-panel, .map-ui')) {
    document.body.classList.remove('hover-active');
  }
});


// Initialize Lenis
export const lenis = new Lenis({
  duration: 1.5,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: 'vertical',
  gestureDirection: 'vertical',
  smooth: true,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

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

// --- INVISIBLE GODS (Bell Resonance Ripple) ---
// A transparent glass ring that expands to distort the view
const rippleGeo = new THREE.RingGeometry(0.1, 0.5, 64);
const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
rippleMesh.position.set(0, 0, -5); // In front of the camera
rippleMesh.visible = false; // Hidden until bell echo
camera.add(rippleMesh);
scene.add(camera); // Add camera to scene so its children are rendered

Ecosystem.on('invisibleGod', (e) => {
    if (e.type === 'bellEcho') {
        // Reset and trigger shockwave
        rippleMesh.scale.set(0.1, 0.1, 0.1);
        rippleMat.opacity = 1.0;
        rippleMesh.visible = true;
        
        gsap.to(rippleMesh.scale, {
            x: 20, y: 20, z: 20,
            duration: 2.5,
            ease: "power2.out"
        });
        
        gsap.to(rippleMat, {
            opacity: 0.0,
            duration: 2.0,
            ease: "power2.in",
            onComplete: () => { rippleMesh.visible = false; }
        });
    }
});

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
const loader = new GLTFLoader(manager);

// Setup DRACOLoader for compressed models
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); // Use gstatic CDN for draco decoders
loader.setDRACOLoader(dracoLoader);

// Dramatic Brutalist Lighting
const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#ffffff', 3.0); // Bright White Cream accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);

const maskFill = new THREE.DirectionalLight('#ffffff', 1.0); // Soft white fill
maskFill.position.set(-5, 0, 10);
scene.add(maskFill);

let maskGroup = new THREE.Group();
worldGroup.add(maskGroup);

loader.load('/mask.glb', (gltf) => {
    maskModel = gltf.scene;
    
    // Apply materials
    maskModel.traverse((child) => {
        if (child.isMesh) {
            // Apply Brutalist dark metallic theme (User provided black/red reference)
            if (child.material) {
                child.material.color.setHex(0x111111); // Dark charcoal black
                child.material.roughness = 0.4;
                child.material.metalness = 0.6;
                child.material.transparent = true;
                child.material.opacity = animState.maskOpacity;
                child.material.depthWrite = false;
            }
        }
    });

    // Reset base scale to 1 so maskGroup handles scaling
    maskModel.scale.set(1, 1, 1);
    maskModel.position.set(0, 0, 0);
    // User requested mask not to face right by default
    maskModel.rotation.y = -Math.PI / 6; 
    
    // Main mask
    maskGroup.add(maskModel);
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

// Build the full-screen dark procedural plane (NO images — pure dark cinematic bg)
{
    brutalistGroup = new THREE.Group();
    brutalistGroup.position.set(0, 0, 10);
    brutalistGroup.visible = false;
    worldGroup.add(brutalistGroup);

    // Full-screen plane at z=10
    const geom = new THREE.PlaneGeometry(30, 17, 1, 1);

    // Dummy textures — shader uses them for noise only, not displayed as images
    const blankTex = new THREE.Texture();
    
    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uChapter: { value: 0 },
            uOpacity: { value: 0 },
            uIntroProgress: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uHover: { value: 0 },
            uScrollVelocity: { value: 0 },
            tImg1: { value: blankTex },
            tImg2: { value: blankTex },
            tImg3: { value: blankTex },
            tImg4: { value: blankTex }
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
        uOpacity: { value: 0 },
        uWind:    { value: new THREE.Vector3() }
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



// Initialize Galaxy Particle System
let galaxyParticles = initGalaxy(scene);
// Move galaxy far back so it doesn't block other elements
galaxyParticles.position.set(0, 0, -30);

// Initialize GhostFibers System
let ghostFibers = initGhostFibers(scene);

// Initialize StarBurst System (Hero focal point)
let starBurst = initStarBurst(scene);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update Ecosystem
    Ecosystem.update(delta);
    
    // Constant subtle motion
    starsMesh.rotation.y = elapsedTime * 0.01;
    if (galaxyParticles) {
        galaxyParticles.rotation.y = elapsedTime * 0.05;
        // Interactive mouse rotation for galaxy
        galaxyParticles.rotation.x = mouseY * 0.2;
        galaxyParticles.rotation.z = mouseX * 0.1;
    }
    if (ghostFibers) {
        ghostFibers.uniforms.uTime.value = elapsedTime;
    }
    if (starBurst) {
        starBurst.uniforms.uTime.value = elapsedTime;
        // Fade out StarBurst as we scroll down into the brutalist map section
        starBurst.uniforms.uOpacity.value = 0.9 * (1.0 - animState.brutalistOpacity);
    }
    
    if (typeof mountainParticles !== "undefined" && mountainParticles) {
        mountainParticles.material.uniforms.uTime.value = elapsedTime;
        mountainParticles.material.uniforms.uFlightProgress.value = animState.birdFlight;
        mountainParticles.material.uniforms.uOpacity.value = 1.0 - animState.brutalistOpacity;
    }
    
    if (typeof atmosMesh !== "undefined" && atmosMesh && atmosMesh.visible) {
        atmosMat.uniforms.uTime.value = elapsedTime;
        atmosMat.uniforms.uWind.value.copy(Ecosystem.wind);
    }

    if (maskGroup && maskModel) {
        // Continuous slow floating rotation + Interactive Mouse X rotation
        // The mask is "pinned" on the Y axis, so only rotation.y is affected by mouseX
        let targetRotY = animState.maskRotY + (mouseX * 0.8) + (Math.sin(elapsedTime * 0.5) * 0.1);
        
        // Smoothly interpolate current rotation to target rotation
        maskGroup.rotation.y += (targetRotY - maskGroup.rotation.y) * 0.1;
        maskGroup.rotation.x = Math.cos(elapsedTime * 0.3) * 0.05 + (mouseY * 0.2); // Look up/down slightly
        
        // Y-axis limited tracking
        let targetPosY = mouseY * 0.8;
        // Keep mask closer to center (1.0) so it doesn't vanish on mobile screens!
        let targetPosX = 1.0 + (mouseX * 0.5); 
        
        maskGroup.position.x += (targetPosX - maskGroup.position.x) * 0.1;
        maskGroup.position.y += (targetPosY - maskGroup.position.y) * 0.1;
        
        // Scale (stretched wider on X) and opacity driven by GSAP
        // Restored correct proportions
        maskGroup.scale.set(animState.maskScale * 0.8, animState.maskScale * 0.8, animState.maskScale * 0.8);
        
        // Traverse and update opacity
        if (maskGroup) maskGroup.visible = (animState.maskOpacity > 0.01);
        maskModel.traverse(child => {
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
            end: "+=200%", // Exactly matches the 200vh height of acts 1-4 combined
            scrub: 1,
            onUpdate: (self) => {
                // Remove uScrollProgress if it was used for smokeMat
            }
        }
    });


    // masterTl is now only for hero titles and brutalist shell opacity
    
    // masterTl is now only for hero titles and brutalist shell opacity
    
    // 1. "WELCOME TO GOD'S LAND" rises from behind mountains and vanishes quickly
    masterTl.to('#gods-land-text', { y: '-25vh', opacity: 1, duration: 1.0, ease: 'power2.out' }, 0)
            .to('#gods-land-text', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 2.0); // Vanishes quickly before Act 1 fully hits
    
    // 2. Fade in the Brutalist Shell (Act 1 start point basically)
    masterTl.to(animState, { brutalistOpacity: 1.0, duration: 0.5 }, 5.0)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 5.5);

    
    // ============================================================
    // BRUTALIST UI SCROLL LOGIC
    // Each chapter gets its OWN ScrollTrigger so it pins independently
    // and the text stays PERMANENTLY on screen until you scroll away.
    // ============================================================

    function activateChapter(idx) {
        const chIds = ['br-ch-01', 'br-ch-02', 'br-ch-03', 'br-ch-04'];
        
        // Hide all other chapters instantly
        chIds.forEach((id, i) => {
            if (i === idx) return;
            const el = document.getElementById(id);
            if (!el) return;
            // Kill ALL tweens on this element and its children
            gsap.killTweensOf(el);
            el.querySelectorAll('*').forEach(child => gsap.killTweensOf(child));
            gsap.set(el, { opacity: 0 });
            el.classList.remove('active-ch');
        });

        const chEl = document.getElementById(chIds[idx]);
        if (!chEl) return;
        
        // Play bell sound effect on chapter change
        if (typeof SoundEngine !== "undefined" && SoundEngine.isInitialized) {
            SoundEngine.playProceduralBell(440 - (idx * 50), 2.0); // Slightly different pitch per chapter
        }

        // --- MASK & GHOST FIBERS LOGIC TIE-IN ---
        if (idx >= 2) {
            // Chapter 3 and 4: Fade IN the mask and GhostFibers
            gsap.to(animState, { maskOpacity: 0.75, maskRotY: Math.PI / 12, duration: 1.0, ease: "power2.out", overwrite: "auto" });
            if (ghostFibers) gsap.to(ghostFibers.uniforms.uOpacity, { value: 1.0, duration: 2.0, ease: "power2.out" });
        } else {
            // Chapter 1 and 2: Hide the mask and GhostFibers
            gsap.to(animState, { maskOpacity: 0.0, maskRotY: 0, duration: 0.5, ease: "power2.in", overwrite: "auto" });
            if (ghostFibers) gsap.to(ghostFibers.uniforms.uOpacity, { value: 0.0, duration: 1.0, ease: "power2.in" });
        }
        // -------------------------
        
        // Target the INNER spans for animation (the br-word is the clip container)
        const wordInners = chEl.querySelectorAll('.br-word');
        const body       = chEl.querySelector('.br-body');
        const divider    = chEl.querySelector('.br-divider');
        const numEl      = chEl.querySelector('.br-chapter-num');

        // Kill any lingering tweens on THIS chapter
        gsap.killTweensOf(chEl);
        chEl.querySelectorAll('*').forEach(child => gsap.killTweensOf(child));

        // Make PERMANENTLY visible — set opacity to 1, never auto-revert
        chEl.classList.add('active-ch');
        gsap.set(chEl, { opacity: 1, clearProps: 'visibility' });

        // Reset word positions to hidden below
        gsap.set(wordInners, { y: '110%' });
        if (body) gsap.set(body, { opacity: 0, y: 20 });

        // Slam words up into view and keep them there
        gsap.to(wordInners, {
            y: '0%', duration: 0.9, ease: 'power4.out', stagger: 0.08
        });
        if (body) gsap.to(body, { opacity: 1, y: 0, duration: 0.8, delay: 0.35, ease: 'expo.out' });
        if (divider) gsap.fromTo(divider, { width: 0 }, { width: '80px', duration: 0.7, delay: 0.2, ease: 'power3.out' });
        if (numEl) gsap.fromTo(numEl, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });

        // Update progress rail
        document.querySelectorAll('.br-progress-tick').forEach((t, ti) => {
            t.classList.toggle('active', ti === idx);
        });
        const counter = document.getElementById('br-chapter-counter');
        if (counter) counter.textContent = `${String(idx + 1).padStart(2, '0')} / 04`;
    }

    // Create ONE big pinned section that covers all 4 chapters
    // Reduced to 200vh for much faster switching
    ScrollTrigger.create({
        trigger: '#brutalist-act',
        start: 'top top',
        end: '+=200%',
        pin: true,
        onEnter: () => activateChapter(0),
        onUpdate: (self) => {
            // Determine which of the 4 chapters is active based on scroll progress
            const idx = Math.min(3, Math.floor(self.progress * 4));
            // Only re-trigger when chapter changes
            const counter = document.getElementById('br-chapter-counter');
            const currentLabel = counter ? counter.textContent : '01 / 04';
            const expectedLabel = `${String(idx + 1).padStart(2, '0')} / 04`;
            if (currentLabel !== expectedLabel) {
                activateChapter(idx);
            }
        },
        onLeave: () => {
            // User scrolled past Chapter 4, hide mask completely
            gsap.to(animState, { maskOpacity: 0.0, duration: 0.5, ease: "power2.in", overwrite: "auto" });
        },
        onEnterBack: () => {
            // User scrolled back UP into Chapter 4
            activateChapter(3);
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

    // ── Sacred Topography Scanner (Section 5) ──
    initSacredData();

    // ── Uttarakhand 3D District Map (Section 6) ──
    initDistrictMap();

    // Init Inner Museum Rooms (Phase 2)
    initMuseumRoom();

    // ── Hide Map HUD & Fade In Galaxy when scrolling into River Section ──
    ScrollTrigger.create({
        trigger: '#river-system-section',
        start: 'top 80%', // When river section enters 20% from bottom
        end: 'bottom top',
        onEnter: () => {
            gsap.to(['#floating-editorial-ui', '#layer-toggles'], { opacity: 0, duration: 0.3, pointerEvents: 'none' });
            if (galaxyParticles) gsap.to(galaxyParticles.material, { opacity: 1, duration: 2.0, ease: 'power2.inOut' });
        },
        onLeaveBack: () => {
            // Only fade back in if we are actually still in the map section
            // (Assuming the map section sets them to opacity 1 when active)
            gsap.to(['#floating-editorial-ui', '#layer-toggles'], { opacity: 1, duration: 0.3, pointerEvents: 'auto' });
            if (galaxyParticles) gsap.to(galaxyParticles.material, { opacity: 0, duration: 1.0, ease: 'power2.inOut' });
        }
    });

    // Init River System (Phase 2 — Below Map)
    initRiverSystem();
});
