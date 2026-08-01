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

// Create material synchronously so GSAP can target it immediately
const terrainMat = new THREE.ShaderMaterial({
    uniforms: {
        uTexture: { value: null },
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
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D(uTexture, vUv);
            // Calculate luminance
            float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            // Boost alpha slightly to keep dark grey mountain parts opaque
            float alpha = smoothstep(0.01, 0.1, lum); 
            gl_FragColor = vec4(color.rgb, alpha * uOpacity);
        }
    `,
    transparent: true,
    depthWrite: false
});

// We need a dummy geometry until the texture loads to know aspect ratio
let terrainGeom = new THREE.PlaneGeometry(120 * 2, 120); 
let terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
terrainMesh.position.set(0, -10, -30);
worldGroup.add(terrainMesh);

textureLoader.load('/mountain.png', (mountainTex) => {
    terrainMat.uniforms.uTexture.value = mountainTex;
    terrainMat.needsUpdate = true;
    
    // Recreate geometry with correct aspect
    const aspect = mountainTex.image.width / mountainTex.image.height;
    const terrainHeight = 120;
    const terrainWidth = terrainHeight * aspect;
    terrainMesh.geometry.dispose();
    terrainMesh.geometry = new THREE.PlaneGeometry(terrainWidth, terrainHeight);
});

// --- Act 3: The Poetic Bird Detachment ---
const birdParticlesCount = 60;
const birdGeom = new THREE.BufferGeometry();
const birdStartPos = new Float32Array(birdParticlesCount * 3);
const birdTargetPos = new Float32Array(birdParticlesCount * 3);
const birdOffsets = new Float32Array(birdParticlesCount);

for(let i=0; i<birdParticlesCount; i++) {
    // Start along the ridge line (approximate)
    birdStartPos[i*3] = (Math.random() - 0.5) * 60; // Spread across X
    birdStartPos[i*3+1] = -5 + Math.random() * 10; // Near peaks Y
    birdStartPos[i*3+2] = -30 + Math.random() * 2; // Z depth near mountain
    
    // Target position (fly up and towards camera)
    birdTargetPos[i*3] = birdStartPos[i*3] * 1.5; // Scatter X
    birdTargetPos[i*3+1] = 20 + Math.random() * 30; // Fly high up Y
    birdTargetPos[i*3+2] = -10 + Math.random() * 20; // Fly forward Z
    
    birdOffsets[i] = Math.random() * Math.PI * 2; // Random phase
}

birdGeom.setAttribute('position', new THREE.BufferAttribute(birdStartPos, 3));
birdGeom.setAttribute('aStartPos', new THREE.BufferAttribute(birdStartPos, 3));
birdGeom.setAttribute('aTargetPos', new THREE.BufferAttribute(birdTargetPos, 3));
birdGeom.setAttribute('aOffset', new THREE.BufferAttribute(birdOffsets, 1));

const birdMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uFlightProgress: { value: 0.0 } // 0 = at mountain, 1 = flown away
    },
    vertexShader: `
        uniform float uTime;
        uniform float uFlightProgress;
        attribute vec3 aStartPos;
        attribute vec3 aTargetPos;
        attribute float aOffset;
        varying float vAlpha;
        
        void main() {
            // Non-linear interpolation for dramatic lift-off
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
            
            // Size gets bigger as they fly forward
            gl_PointSize = (15.0 * (1.0 + uFlightProgress)) / -mvPosition.z;
            
            // Fade in at start, fade out at end
            vAlpha = smoothstep(0.0, 0.1, uFlightProgress) * (1.0 - smoothstep(0.8, 1.0, uFlightProgress));
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        void main() {
            // Draw a soft glowing bird/streak shape
            vec2 uv = gl_PointCoord - vec2(0.5);
            // Squish Y to make it look like a winged streak (motion blur)
            uv.y *= 2.5; 
            float dist = length(uv);
            
            float alpha = smoothstep(0.5, 0.1, dist);
            if (alpha < 0.01) discard;
            
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vAlpha); 
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const birdSystem = new THREE.Points(birdGeom, birdMat);
worldGroup.add(birdSystem);

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
    
    if (birdMat) birdMat.uniforms.uTime.value = elapsedTime;
    if (smokeMat) smokeMat.uniforms.uTime.value = elapsedTime;
    
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

    // Act 1 to 2: The Himalaya Reveal
    masterTl.to(terrainMat.uniforms.uOpacity, {
        value: 1, // Fade in mountain from black
        duration: 2.5,
        ease: "power2.inOut"
    }, 0)
    // Act 2 to 3: Devbhoomi Text
    .to("#devbhoomi-title", {
        opacity: 1,
        y: "0px", // Subtle rise to center
        duration: 2.5,
        ease: "power2.out"
    }, 1.5)
    
    // Act 3: The Poetic Bird Flight
    .to(birdMat.uniforms.uFlightProgress, {
        value: 1.0,
        duration: 4,
        ease: "power1.inOut"
    }, 3)

    // Act 4: Transition to Smoking Man
    .to(terrainMat.uniforms.uOpacity, { value: 0, duration: 1 }, 6) // Fade out mountain
    .to("#devbhoomi-title", { opacity: 0, duration: 0.5 }, 6)
    .add(() => { if (terrainMesh) terrainMesh.visible = false; }, 7)
    .add(() => { if(smokeMesh) smokeMesh.visible = true; }, 6)
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
