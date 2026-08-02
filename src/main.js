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

// No spline or trail needed for the scattered bird flight

// --- Act 5: Culture (The Himalayan Elder - Advanced Particle Flow) ---
let elderBgMesh, elderParticles;

textureLoader.load('/smoking-man.jpeg', (texture) => {
    const aspect = texture.image.width / texture.image.height;
    // Base image plane
    const bgGeom = new THREE.PlaneGeometry(25 * aspect, 25);
    const bgMat = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0
    });
    elderBgMesh = new THREE.Mesh(bgGeom, bgMat);
    elderBgMesh.position.set(0, 0, 10);
    elderBgMesh.visible = false;
    worldGroup.add(elderBgMesh);
    
    // Advanced Particle Flow (150,000 particles)
    const pCount = 150000;
    const pGeom = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pOffsets = new Float32Array(pCount);
    const pRandoms = new Float32Array(pCount);
    
    // Cigarette tip approximate world position relative to plane
    // Plane is 25 * aspect wide, 25 high. 
    // Cigarette is around lower-left center.
    const startX = -2.0;
    const startY = -3.0;
    
    for(let i=0; i<pCount; i++) {
        pPositions[i*3] = startX;
        pPositions[i*3+1] = startY;
        pPositions[i*3+2] = 0;
        
        pOffsets[i] = Math.random() * 100.0; // Random time offset
        pRandoms[i] = Math.random(); // Random seed for color/behavior
    }
    
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeom.setAttribute('aOffset', new THREE.BufferAttribute(pOffsets, 1));
    pGeom.setAttribute('aRandom', new THREE.BufferAttribute(pRandoms, 1));
    
    const pMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uEvolution: { value: 0.0 }, // 0 = smoke, 1 = birds/flowers/ribbons
            uOpacity: { value: 0.0 }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uEvolution;
            attribute float aOffset;
            attribute float aRandom;
            
            varying vec3 vColor;
            varying float vAge;
            varying float vShapeType; // 0=smoke, 1=ribbon, 2=bird, 3=flower
            
            // Simplex noise function
            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec3 v){
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod(i, 289.0);
                vec4 p = permute(permute(permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0))
                          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);
                vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
                p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            void main() {
                // Particle lifetime: 0 to 1
                float speed = 0.2;
                float age = fract((uTime * speed) + aOffset);
                vAge = age;
                
                // Shape assignment based on random seed and evolution
                vShapeType = 0.0; // Default smoke
                if (uEvolution > 0.3) {
                    if (aRandom < 0.2) vShapeType = 1.0; // Ribbon
                    else if (aRandom < 0.3 && uEvolution > 0.6) vShapeType = 2.0; // Bird
                    else if (aRandom < 0.4 && uEvolution > 0.5) vShapeType = 3.0; // Flower motif
                }
                
                vec3 pos = position;
                
                // Base flow upwards and leftwards
                pos.y += age * 12.0;
                pos.x -= age * 6.0;
                pos.z += age * 2.0;
                
                // Curl Noise distortion
                float n1 = snoise(vec3(pos.y * 0.2, pos.x * 0.2, uTime * 0.1));
                float n2 = snoise(vec3(pos.y * 0.3 + 10.0, pos.x * 0.3, uTime * 0.15));
                float n3 = snoise(vec3(pos.y * 0.1 + 20.0, pos.x * 0.1, uTime * 0.05));
                
                // Spread as it ages
                pos.x += n1 * age * 8.0;
                pos.y += n2 * age * 4.0;
                pos.z += n3 * age * 3.0;
                
                // Ribbon clustering
                if (vShapeType == 1.0) {
                    pos.x += sin(age * 20.0 + aOffset) * 0.5 * uEvolution;
                }
                
                // Constrain flow strictly to left side (avoid face)
                // Face is roughly at x > 0.0 in world space
                float mask = smoothstep(-1.0, 1.0, pos.x); 
                // We push particles back to the left if they drift too far right
                pos.x -= mask * (pos.x + 1.0) * age * 2.0;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Size calculation
                float baseSize = mix(40.0, 15.0, age); // Smoke gets smaller as it rises
                if (vShapeType == 1.0) baseSize = 5.0; // Fine thread
                if (vShapeType == 2.0) baseSize = 25.0; // Birds
                if (vShapeType == 3.0) baseSize = 35.0; // Flowers
                
                gl_PointSize = baseSize / -mvPosition.z;
                
                // Color Palette
                vec3 cSmoke = vec3(0.8, 0.8, 0.9); // Warm Grey / Stone White
                vec3 cRed = vec3(0.8, 0.1, 0.2); // Rangila Pichora Red
                vec3 cGold = vec3(0.8, 0.6, 0.1); // Antique Gold
                vec3 cBlue = vec3(0.1, 0.3, 0.8); // Royal Blue
                vec3 cMagenta = vec3(0.8, 0.1, 0.6); // Magenta
                
                vec3 finalColor = cSmoke;
                if (vShapeType > 0.0) {
                    if (aRandom < 0.2) finalColor = cRed;
                    else if (aRandom < 0.3) finalColor = cGold;
                    else if (aRandom < 0.35) finalColor = cBlue;
                    else finalColor = cMagenta;
                }
                
                // Interpolate from smoke to vibrant colors based on evolution
                vColor = mix(cSmoke, finalColor, uEvolution);
            }
        `,
        fragmentShader: `
            uniform float uOpacity;
            varying vec3 vColor;
            varying float vAge;
            varying float vShapeType;
            
            void main() {
                vec2 uv = gl_PointCoord - vec2(0.5);
                float dist = length(uv);
                
                float alpha = 0.0;
                
                if (vShapeType < 0.5) {
                    // Smoke (Soft circle)
                    alpha = 1.0 - smoothstep(0.1, 0.5, dist);
                    // Add some noise texture to smoke
                    alpha *= 0.6;
                } else if (vShapeType < 1.5) {
                    // Ribbon (thin line)
                    alpha = 1.0 - smoothstep(0.0, 0.1, abs(uv.y));
                    alpha *= (1.0 - smoothstep(0.3, 0.5, abs(uv.x)));
                } else if (vShapeType < 2.5) {
                    // Bird (V shape)
                    float vShape = abs(uv.x) * 2.0 - uv.y;
                    alpha = 1.0 - smoothstep(0.0, 0.2, abs(vShape - 0.2));
                    float body = 1.0 - smoothstep(0.0, 0.1, length(uv - vec2(0.0, -0.1)));
                    alpha = max(alpha, body);
                } else {
                    // Flower Motif (simplified petal shape)
                    float angle = atan(uv.y, uv.x);
                    float petals = cos(angle * 5.0) * 0.2 + 0.3;
                    alpha = 1.0 - smoothstep(petals - 0.05, petals + 0.05, dist);
                }
                
                // Fade in/out based on age
                float ageFade = smoothstep(0.0, 0.1, vAge) * (1.0 - smoothstep(0.7, 1.0, vAge));
                
                if (alpha < 0.01) discard;
                
                gl_FragColor = vec4(vColor, alpha * ageFade * uOpacity);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    elderParticles = new THREE.Points(pGeom, pMat);
    elderParticles.position.set(0, 0, 10.1); // Slightly in front of BG
    elderParticles.visible = false;
    worldGroup.add(elderParticles);
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
        mountainParticles.material.uniforms.uOpacity.value = animState.mountainOpacity;
        mountainParticles.material.uniforms.uTime.value = elapsedTime;
        mountainParticles.material.uniforms.uFlightProgress.value = animState.birdFlight;
    }
    
    if (elderParticles && elderParticles.material) {
        elderParticles.material.uniforms.uTime.value = elapsedTime;
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
    // Mountain turns into birds completely, wait until they pass, then fade out title
    .to("#devbhoomi-title", { opacity: 0, duration: 0.5 }, 2.0)
    .add(() => { if (mountainParticles) mountainParticles.visible = false; }, 3.0)
    .add(() => { 
        if(elderBgMesh) elderBgMesh.visible = true; 
        if(elderParticles) elderParticles.visible = true; 
    }, 2.8)
    .to(elderBgMesh ? elderBgMesh.material : {opacity:0}, {
        opacity: 1,
        duration: 1
    }, 3)
    .fromTo(elderParticles && elderParticles.material ? elderParticles.material.uniforms.uOpacity : {value:0}, {value:0}, {
        value: 1,
        duration: 1
    }, 3);

    // Act 5: Macro Zoom (Smoking Man Magic & Particle Evolution)
    masterTl.to(camera.position, {
        z: 18,
        y: 0,
        duration: 2,
    }, 4)
    .to(elderParticles && elderParticles.material ? elderParticles.material.uniforms.uEvolution : {value:0}, {
        value: 1.0, // Evolve from smoke -> ribbons -> birds -> flowers
        duration: 3,
        ease: "power1.inOut"
    }, 4);

    // Act 6: Portrait Closeups (End of Experience)
    masterTl.to(camera.position, {
        z: 22,
        x: 2,
        duration: 2,
        ease: "power2.inOut"
    }, 6);

});
