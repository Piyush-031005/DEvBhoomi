import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

import womanVertexShader from './shaders/womanVertex.glsl?raw';
import womanFragmentShader from './shaders/womanFragment.glsl?raw';

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

// We need a dummy object for GSAP to target before the async load finishes
const animState = {
    mountainOpacity: 0,
    birdFlight: 0
};

textureLoader.load('/mountain.png', (mountainTex) => {
    const img = mountainTex.image;
    const canvas = document.createElement('canvas');
    
    // Higher resolution for denser mountain
    const maxWidth = 500; 
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = Math.floor(img.height * scale);
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    const positions = [];
    const colors = [];
    
    // Camera at z=20, mountain at z=0, distance=20
    // Visible width = 2 * 20 * tan(30°) = 23 units
    // We want to OVERFILL the screen so no edges are visible
    const mountainWidth = 35; 
    const mountainHeight = mountainWidth * (canvas.height / canvas.width);
    
    const potentialBirdIndices = []; // Store indices of top-edge particles
    
    let particleIndex = 0;
    
    // Iterate through pixels
    for(let y = 0; y < canvas.height; y++) {
        let foundEdgeInColumn = false; // To find the top-most visible pixel in each column
        
        for(let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const r = imgData[index];
            const g = imgData[index+1];
            const b = imgData[index+2];
            
            // Luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Only create particle if it's bright enough
            if (lum > 8) {
                // Map x, y to 3D space
                const posX = (x / canvas.width - 0.5) * mountainWidth;
                // Flip Y (canvas Y goes down, 3D Y goes up)
                // Push mountain DOWN so peaks are in the center/upper area
                const posY = -(y / canvas.height - 0.5) * mountainHeight - 4; 
                const posZ = 0;
                
                positions.push(posX, posY, posZ);
                colors.push(r / 255, g / 255, b / 255);
                
                // If it's the first bright pixel from the top in this column, it's an edge
                if (!foundEdgeInColumn && y < canvas.height * 0.5) { // Only upper half
                    potentialBirdIndices.push(particleIndex);
                    foundEdgeInColumn = true;
                }
                
                particleIndex++;
            }
        }
    }
    
    // --- Create Mountain ---
    const mountainGeom = new THREE.BufferGeometry();
    mountainGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mountainGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const mountainMat = new THREE.PointsMaterial({
        size: 0.08, // Tight particles at close range
        vertexColors: true,
        transparent: true,
        opacity: 0, // Starts at 0
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.NormalBlending
    });
    
    mountainParticles = new THREE.Points(mountainGeom, mountainMat);
    worldGroup.add(mountainParticles);
    
    // --- Create Birds (Detaching from Mountain) ---
    // Select 35 random edge particles to become birds
    const numBirds = 35;
    for(let i=0; i<numBirds; i++) {
        if(potentialBirdIndices.length === 0) break;
        const randIdx = Math.floor(Math.random() * potentialBirdIndices.length);
        birdIndices.push(potentialBirdIndices[randIdx]);
        potentialBirdIndices.splice(randIdx, 1); // Remove so we don't pick twice
    }
    
    const birdStartPos = new Float32Array(numBirds * 3);
    const birdTargetPos = new Float32Array(numBirds * 3);
    const birdOffsets = new Float32Array(numBirds);
    
    for(let i=0; i<numBirds; i++) {
        const pIdx = birdIndices[i];
        
        // Start position is exact position of that mountain particle
        birdStartPos[i*3] = positions[pIdx*3];
        birdStartPos[i*3+1] = positions[pIdx*3+1];
        birdStartPos[i*3+2] = positions[pIdx*3+2];
        
        // Target position: fly UP and TOWARDS camera so they get bigger
        birdTargetPos[i*3] = birdStartPos[i*3] + (Math.random() - 0.5) * 8;
        birdTargetPos[i*3+1] = birdStartPos[i*3+1] + 8 + Math.random() * 4; 
        birdTargetPos[i*3+2] = birdStartPos[i*3+2] + 15 + Math.random() * 5; // Fly TOWARDS camera (positive Z)
        
        birdOffsets[i] = Math.random() * Math.PI * 2;
    }
    
    const birdGeom = new THREE.BufferGeometry();
    birdGeom.setAttribute('position', new THREE.BufferAttribute(birdStartPos, 3));
    birdGeom.setAttribute('aStartPos', new THREE.BufferAttribute(birdStartPos, 3));
    birdGeom.setAttribute('aTargetPos', new THREE.BufferAttribute(birdTargetPos, 3));
    birdGeom.setAttribute('aOffset', new THREE.BufferAttribute(birdOffsets, 1));
    
    const birdMatShader = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uFlightProgress: { value: 0.0 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uFlightProgress;
            attribute vec3 aStartPos;
            attribute vec3 aTargetPos;
            attribute float aOffset;
            varying float vAlpha;
            
            void main() {
                float easeProgress = pow(uFlightProgress, 1.5);
                vec3 localPos = mix(aStartPos, aTargetPos, easeProgress);
                
                // Flapping motion and drift
                if (uFlightProgress > 0.0) {
                    float flap = sin(uTime * 20.0 + aOffset) * 0.5;
                    localPos.y += flap * uFlightProgress;
                    float driftX = sin(uTime * 2.0 + aOffset) * 2.0;
                    localPos.x += driftX * uFlightProgress;
                }
                
                vec4 mvPosition = modelViewMatrix * vec4(localPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                gl_PointSize = max(3.0, (80.0 * (1.0 + uFlightProgress * 3.0)) / -mvPosition.z);
                
                // Hide when progress is 0, fade in as they fly
                vAlpha = smoothstep(0.01, 0.1, uFlightProgress) * (1.0 - smoothstep(0.8, 1.0, uFlightProgress));
            }
        `,
        fragmentShader: `
            varying float vAlpha;
            void main() {
                // V-shaped bird silhouette
                vec2 uv = gl_PointCoord - vec2(0.5);
                // Simple V shape using abs(x) and y
                float vShape = abs(uv.x) * 2.0 - uv.y;
                // Softness
                float alpha = 1.0 - smoothstep(0.0, 0.2, abs(vShape - 0.2));
                // Add a small body circle
                float body = 1.0 - smoothstep(0.0, 0.1, length(uv - vec2(0.0, -0.1)));
                
                alpha = max(alpha, body);
                if (alpha < 0.01) discard;
                
                gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vAlpha); 
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    birdParticles = new THREE.Points(birdGeom, birdMatShader);
    worldGroup.add(birdParticles);
});

// No spline or trail needed for the scattered bird flight

// --- Act 5: Smoking Man Magic (Shader Displacement) ---
let smokeMat, smokeMesh;

textureLoader.load('/smoking-man.jpeg', (texture) => {
    const aspect = texture.image.width / texture.image.height;
    const smokeGeom = new THREE.PlaneGeometry(25 * aspect, 25, 64, 64);
    
    smokeMat = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: texture },
            uTime: { value: 0 },
            uScrollProgress: { value: 0 },
            uOpacity: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uTime;
            uniform float uScrollProgress;
            uniform float uOpacity;
            varying vec2 vUv;
            
            // Basic noise for smoke flow
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ; m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 uv = vUv;
                
                // Mask: Only affect the left side (the smoke and purple flowers)
                // Left side has x near 0. Smoothstep creates a gradient mask.
                float smokeMask = smoothstep(0.5, 0.1, uv.x) * smoothstep(0.1, 0.8, uv.y);
                
                // Animate based on time AND scroll progress
                float speed = uTime * 0.8 + uScrollProgress * 15.0;
                
                // Distort UVs using noise
                float noiseX = snoise(vec2(uv.y * 4.0, speed)) * 0.04;
                float noiseY = snoise(vec2(uv.x * 4.0, speed + 10.0)) * 0.04;
                
                uv.x += noiseX * smokeMask;
                uv.y += noiseY * smokeMask;
                
                vec4 color = texture2D(uTexture, uv);
                gl_FragColor = vec4(color.rgb, color.a * uOpacity);
            }
        `,
        transparent: true
    });
    
    smokeMesh = new THREE.Mesh(smokeGeom, smokeMat);
    smokeMesh.position.set(0, 0, 10);
    smokeMesh.visible = false;
    worldGroup.add(smokeMesh);
});

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
    
    if (mountainParticles && mountainParticles.material) {
        mountainParticles.material.opacity = animState.mountainOpacity;
    }
    
    if (birdParticles && birdParticles.material) {
        birdParticles.material.uniforms.uTime.value = elapsedTime;
        birdParticles.material.uniforms.uFlightProgress.value = animState.birdFlight;
    }
    
    if (smokeMat) smokeMat.uniforms.uTime.value = elapsedTime;
    
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
                if (smokeMat) {
                    smokeMat.uniforms.uScrollProgress.value = self.progress;
                }
            }
        }
    });

    // Act 1 to 2: The Himalaya Reveal
    // Speed up initial animations drastically!
    masterTl.to(animState, {
        mountainOpacity: 1, // Fade in mountain from black
        duration: 0.5, // Used to be 2.5
        ease: "power2.inOut"
    }, 0)
    // Act 2 to 3: Devbhoomi Text
    .to("#devbhoomi-title", {
        opacity: 1,
        y: "0px", // Subtle rise to center
        duration: 0.5,
        ease: "power2.out"
    }, 0.2) // Triggers almost immediately
    
    // Act 3: The Poetic Bird Flight
    .to(animState, {
        birdFlight: 1.0,
        duration: 1.5, // Used to be 4
        ease: "power1.inOut"
    }, 0.6) // Trigger soon after text appears

    // Act 4: Transition to Smoking Man
    .to(animState, { mountainOpacity: 0, duration: 0.8 }, 2.5) // Fade out mountain
    .to("#devbhoomi-title", { opacity: 0, duration: 0.5 }, 2.5)
    .add(() => { if (mountainParticles) mountainParticles.visible = false; }, 3.5)
    .add(() => { if (birdParticles) birdParticles.visible = false; }, 3.5)
    .add(() => { if(smokeMesh) smokeMesh.visible = true; }, 2.8)
    .fromTo(smokeMat ? smokeMat.uniforms.uOpacity : {value:0}, {value:0}, {
        value: 1,
        duration: 1
    }, 3);

    // Act 5: Macro Zoom (Smoking Man Magic)
    masterTl.to(camera.position, {
        z: 18,
        y: 0,
        duration: 2,
    }, 4);

    // Act 6: Portrait Closeups (End of Experience)
    masterTl.to(camera.position, {
        z: 22,
        x: 2,
        duration: 2,
        ease: "power2.inOut"
    }, 6);

});
