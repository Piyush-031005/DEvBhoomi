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
scene.fog = new THREE.FogExp2('#0a0a0a', 0.02); // Fog

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 30); // Start far back for Act 1

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
// --- Act 2: Cinematic 2D Mountain Base ---
const textureLoader = new THREE.TextureLoader();
let terrainMesh;

textureLoader.load('/mountain.png', (mountainTex) => {
    // A flat plane to display the photo directly, just like the video
    const aspect = mountainTex.image.width / mountainTex.image.height;
    const terrainHeight = 100;
    const terrainWidth = terrainHeight * aspect;
    
    const terrainGeom = new THREE.PlaneGeometry(terrainWidth, terrainHeight);
    const terrainMat = new THREE.MeshBasicMaterial({
        map: mountainTex,
        transparent: true
    });
    
    terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
    terrainMesh.position.set(0, 0, -20); // Sit right in front of camera
    worldGroup.add(terrainMesh);
});

// --- Act 3: The Poetic Bird Detachment (Golden Thread) ---
const birdParticlesCount = 15;
const birdGeom = new THREE.BufferGeometry();
const birdStartPos = new Float32Array(birdParticlesCount * 3);
const birdTargetPos = new Float32Array(birdParticlesCount * 3); // V-Shape

// V-Shape definition (local offsets from center)
const vShapeOffsets = [
    [0, 0, 0], // Leader
    [-1, 0, -1], [1, 0, -1],
    [-2, -0.2, -2], [2, -0.2, -2],
    [-3, -0.4, -3], [3, -0.4, -3],
    [-4, -0.6, -4], [4, -0.6, -4],
    [-5, -0.8, -5], [5, -0.8, -5],
    [-6, -1.0, -6], [6, -1.0, -6],
    [-7, -1.2, -7], [7, -1.2, -7]
];

for(let i=0; i<15; i++) {
    // Start chaotic, loosely grouped near the mountain peak
    birdStartPos[i*3] = (Math.random() - 0.5) * 8;
    birdStartPos[i*3+1] = (Math.random() - 0.5) * 8;
    birdStartPos[i*3+2] = (Math.random() - 0.5) * 8;
    
    // Target V-shape
    birdTargetPos[i*3] = vShapeOffsets[i][0] * 0.4;
    birdTargetPos[i*3+1] = vShapeOffsets[i][1] * 0.4;
    birdTargetPos[i*3+2] = vShapeOffsets[i][2] * 0.4;
}

birdGeom.setAttribute('position', new THREE.BufferAttribute(birdStartPos, 3));
birdGeom.setAttribute('aStartPos', new THREE.BufferAttribute(birdStartPos, 3));
birdGeom.setAttribute('aTargetPos', new THREE.BufferAttribute(birdTargetPos, 3));

const birdMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uMorphProgress: { value: 0.0 } // 0 = chaos, 1 = V-shape
    },
    vertexShader: `
        uniform float uTime;
        uniform float uMorphProgress;
        attribute vec3 aStartPos;
        attribute vec3 aTargetPos;
        
        void main() {
            // Interpolate from chaotic start to ordered V-shape
            vec3 localPos = mix(aStartPos, aTargetPos, uMorphProgress);
            
            // Flapping motion (sine wave offset based on index and time)
            if (uMorphProgress > 0.5) {
                float flap = sin(uTime * 15.0 - abs(aTargetPos.x) * 3.0) * 0.8;
                localPos.y += flap * smoothstep(0.5, 1.0, uMorphProgress);
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(localPos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = (8.0) / -mvPosition.z;
        }
    `,
    fragmentShader: `
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, 0.9); // White glowing particle
        }
    `,
    transparent: true,
    depthWrite: false
});

const birdSystem = new THREE.Points(birdGeom, birdMat);
// Start position at the main central peak
birdSystem.position.set(0, 10, -20);
worldGroup.add(birdSystem);

// Spline Path
const flightPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 5, -30),   // Peak
    new THREE.Vector3(5, 12, -20),
    new THREE.Vector3(15, 18, -10),
    new THREE.Vector3(25, 25, 10),
    new THREE.Vector3(40, 35, 40)    // Fly away off screen right/up
]);
const dummyBird = { pathProgress: 0 }; 

// The Golden Trail
const maxTrailVertices = 300;
const trailPositions = new Float32Array(maxTrailVertices * 3);
const trailGeom = new THREE.BufferGeometry();
trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
trailGeom.setDrawRange(0, 0);

const trailMat = new THREE.LineBasicMaterial({
    color: 0xffffff, // Starts white, transitions to gold via GSAP
    transparent: true,
    opacity: 0.9,
    linewidth: 3 // Note: WebGL standard restricts linewidth to 1 on most systems, but it works conceptually
});
const trailLine = new THREE.Line(trailGeom, trailMat);
worldGroup.add(trailLine);

let trailIndex = 0;
let lastPathProgress = -1;

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
    
    if (birdMat) birdMat.uniforms.uTime.value = elapsedTime;
    if (smokeMat) smokeMat.uniforms.uTime.value = elapsedTime;
    
    // Update bird position along spline
    if (dummyBird.pathProgress > 0 && dummyBird.pathProgress < 1) {
        const pt = flightPath.getPointAt(dummyBird.pathProgress);
        birdSystem.position.copy(pt);
        
        // Add point to trail
        if (trailIndex < maxTrailVertices && dummyBird.pathProgress > lastPathProgress + 0.005) {
            trailPositions[trailIndex * 3] = pt.x;
            trailPositions[trailIndex * 3 + 1] = pt.y;
            trailPositions[trailIndex * 3 + 2] = pt.z;
            trailGeom.setDrawRange(0, trailIndex + 1);
            trailGeom.attributes.position.needsUpdate = true;
            trailIndex++;
            lastPathProgress = dummyBird.pathProgress;
        }
    }
    
    renderer.render(scene, camera);
}
animate();

// --- GSAP Master Timeline for 7 Acts ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Start perfectly at ground level looking at the horizon
    camera.position.set(0, 0, 80); 
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

    // Act 1 to 2: The Sunrise Reveal (DEVBHOOMI text rises)
    masterTl.to("#devbhoomi-title", {
        opacity: 1,
        y: "-15vh", // Rise up in HTML space behind the solid WebGL mountain
        duration: 2.5,
        ease: "power2.out"
    }, 0)
    // Subtle camera drift over the mountains
    .to(camera.position, {
        z: 40, 
        y: 10,
        duration: 2.5,
        ease: "power1.inOut"
    }, 0);

    // Act 2.5: The Poetic Bird Flight
    masterTl.to(birdMat.uniforms.uMorphProgress, {
        value: 1.0,
        duration: 1.5,
        ease: "power2.inOut"
    }, 1.5)
    // Bird flies along spline
    .to(dummyBird, {
        pathProgress: 1.0,
        duration: 4,
        ease: "power1.inOut"
    }, 2)
    // Trail turns golden (Pichoda)
    .to(trailMat.color, {
        r: 207/255, // #cfb53b gold
        g: 181/255,
        b: 59/255,
        duration: 2
    }, 3)

    // Act 3: Orbital Camera (Transition to Smoking Man)
    masterTl.to(camera.position, {
        z: 15,
        x: 0,
        y: 5,
        rotationX: -0.5,
        duration: 2,
        ease: "power2.inOut"
    }, 6)
    .to("#devbhoomi-title", { opacity: 0, duration: 0.5 }, 6)
    .add(() => { if (terrainMesh) terrainMesh.visible = false; }, 7) // Hide mountain when close
    .add(() => { if(smokeMesh) smokeMesh.visible = true; }, 6) // Reveal smoking man
    .fromTo(smokeMat ? smokeMat.uniforms.uOpacity : {value:0}, {value:0}, {
        value: 1,
        duration: 1
    }, 6.5);

    // Act 4 to 5: Macro Zoom (Smoking Man Magic)
    masterTl.to(camera.position, {
        z: 18,
        y: 0,
        duration: 2,
    }, 8);

    // Act 5 to 6: Portrait Closeups (End of Experience)
    masterTl.to(camera.position, {
        z: 22,
        x: 2,
        duration: 2,
        ease: "power2.inOut"
    }, 10);

});
