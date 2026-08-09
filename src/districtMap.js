// src/districtMap.js
// ============================================================
// UTTARAKHAND 3D DISTRICT MAP
// Interactive, extruded GeoJSON map with glass/stone blend
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { openDistrictView } from './districtView.js';
import { districtData } from './districtData.js';
import { Ecosystem } from './Ecosystem.js';

export function initDistrictMap() {
    const container = document.getElementById('district-map-container');
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    // Remove static background, we will use a procedural skybox
    scene.background = null; 
    scene.fog = new THREE.Fog(0x010203, 100, 350); 
    
    // ============================================================
    // THE LIVING HORIZON (Procedural Skybox)
    // ============================================================
    const skyboxUniforms = {
        uTime: { value: 0.0 },
        uColorTop: { value: new THREE.Color(0x020813) }, // Deep space/sky
        uColorBottom: { value: new THREE.Color(0x15696F) }, // Teal horizon
        uHorizonOffset: { value: 0.0 }
    };
    
    const skyboxMat = new THREE.ShaderMaterial({
        uniforms: skyboxUniforms,
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uColorTop;
            uniform vec3 uColorBottom;
            uniform float uHorizonOffset;
            uniform float uTime;
            varying vec3 vWorldPosition;
            
            // Simple 3D noise function for clouds
            float hash(vec3 p) {
                p = fract(p * 0.3183099 + 0.1);
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
                );
            }

            void main() {
                vec3 viewDirection = normalize(vWorldPosition);
                // Mix sky colors based on Y direction (height)
                float h = max(0.0, viewDirection.y + uHorizonOffset);
                vec3 skyColor = mix(uColorBottom, uColorTop, pow(h, 0.5));
                
                // Add slow-moving procedural noise clouds near horizon
                float cloudNoise = noise(viewDirection * 5.0 + vec3(uTime * 0.02, 0.0, uTime * 0.05));
                float cloudMask = smoothstep(0.4, 0.7, cloudNoise) * (1.0 - smoothstep(0.0, 0.5, h));
                skyColor = mix(skyColor, vec3(0.5, 0.7, 0.8), cloudMask * 0.3);
                
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `,
        side: THREE.BackSide,
        depthWrite: false
    });
    
    const skyboxMesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyboxMat);
    scene.add(skyboxMesh);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    // Position camera closer so it's perfectly visible
    camera.position.set(0, 70, 90);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 25;
    controls.maxDistance = 220;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // Fix: pause autoRotate while user is dragging
    let autoRotateTimer = null;
    renderer.domElement.addEventListener('pointerdown', () => {
        controls.autoRotate = false;
        if (autoRotateTimer) clearTimeout(autoRotateTimer);
    });
    renderer.domElement.addEventListener('pointerup', () => {
        autoRotateTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
    });

    // LIGHTING - Optimised for Candy-Apple Lacquer (crisp key + warm rim for sheen)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    // Strong top-left key light — creates the bright specular highlight on glossy surface
    const keyLight = new THREE.DirectionalLight(0xffffff, 5.0);
    keyLight.position.set(-60, 120, 60);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Warm red fill from below-right — gives the deep glow inside the red
    const fillLight = new THREE.DirectionalLight(0xff2200, 2.5);
    fillLight.position.set(80, -20, 40);
    scene.add(fillLight);

    // Cool back rim light — separates the map from background with a bright edge
    const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(0, 80, -80);
    scene.add(rimLight);

    // --- PROCEDURAL TERRAIN TEXTURE ---
    function generateTerrainTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        // Draw 50,000 overlapping soft ellipses to create organic cloudy heightmap
        for(let i=0; i<50000; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
            const w = Math.random() * 15 + 2;
            const h = Math.random() * 15 + 2;
            ctx.beginPath();
            ctx.ellipse(Math.random() * size, Math.random() * size, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4); // Scale the terrain frequency
        return texture;
    }
    
    const terrainTexture = generateTerrainTexture();

    // GLOBAL SHADER UNIFORMS for Map Reveal
    const mapUniforms = {
        uFlowProgress: { value: 0.0 } // 0 = fully hidden (black void), 1.0 = fully revealed
    };

    const shaderInjection = (shader) => {
        shader.uniforms.uFlowProgress = mapUniforms.uFlowProgress;
        shader.fragmentShader = `
            uniform float uFlowProgress;
            ${shader.fragmentShader}
        `.replace(
            `#include <dithering_fragment>`,
            `#include <dithering_fragment>
            
            // "Rivers Draw Everything" - Reveal from top to bottom (Y axis is up in this scene, but map is flat on XY, so we reveal along Y)
            // vWorldPosition is available in MeshPhysicalMaterial
            float reveal = smoothstep(uFlowProgress * 150.0 - 75.0, (uFlowProgress * 150.0 - 75.0) + 10.0, vWorldPosition.y);
            
            // Add a glowing "water edge" where the reveal is currently happening
            float edge = smoothstep((uFlowProgress * 150.0 - 75.0) + 9.5, (uFlowProgress * 150.0 - 75.0) + 10.0, vWorldPosition.y);
            vec3 edgeColor = vec3(0.0, 1.0, 1.0); // Cyan glow edge
            
            // If the pixel is below the flow line, discard it (invisible)
            if (vWorldPosition.y < (uFlowProgress * 150.0 - 75.0)) {
                discard;
            }
            
            gl_FragColor.rgb = mix(gl_FragColor.rgb, edgeColor, edge * 0.8);
            `
        );
    };

    // GLASS UI — Original Sacred Red Glass
    const lacquerRedMat = new THREE.MeshPhysicalMaterial({
        color: 0xaa1122,          // Deep Crimson Red
        emissive: 0x440011,       // Dark blood glow
        emissiveIntensity: 0.4,
        roughness: 0.1,           
        metalness: 0.2,           
        transmission: 0.9,        // GLASS!
        opacity: 1.0,
        transparent: true,
        ior: 1.5,                 
        thickness: 2.0,           
        clearcoat: 1.0,           
        clearcoatRoughness: 0.05, 
        bumpMap: terrainTexture,
        bumpScale: 0.2
    });
    lacquerRedMat.onBeforeCompile = shaderInjection;

    // Darker variant for Himalayan districts
    const lacquerDarkRedMat = new THREE.MeshPhysicalMaterial({
        color: 0x550000,          // Dark obsidian red
        emissive: 0x220000,
        emissiveIntensity: 0.3,
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.85,
        opacity: 1.0,
        transparent: true,
        ior: 1.5,
        thickness: 2.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        bumpMap: terrainTexture,
        bumpScale: 0.4
    });
    lacquerDarkRedMat.onBeforeCompile = shaderInjection;

    const highlightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,          // White highlight on hover
        emissive: 0x00ffff,       // Cyan glow
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        opacity: 1.0,
        transparent: true,
        ior: 1.5,
        thickness: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05
    });
    
    // ============================================================
    // WATER REFLECTION (NAINITAL)
    // ============================================================
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
    });
    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    
    const lakeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0044aa,          // Deep water blue
        emissive: 0x001133,
        roughness: 0.0,           // Perfectly smooth for reflection
        metalness: 0.2,
        transmission: 0.9,
        ior: 1.33,                // Water IOR
        envMap: cubeRenderTarget.texture,
        envMapIntensity: 2.0,
        transparent: true
    });
    lakeMaterial.onBeforeCompile = shaderInjection;

    const materials = {
        himalayas: lacquerDarkRedMat,
        plains: lacquerRedMat,
        capital: lacquerRedMat,
        temples: lacquerDarkRedMat,
        lakes: lakeMaterial,
        default: lacquerRedMat
    };

    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x63BDB5,          // Glowing cyan glass edges
        transparent: true, 
        opacity: 0.6              
    });

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);
    
    // To center the map
    const centerOffset = new THREE.Vector3();
    let isMapLoaded = false;
    const districtMeshes = [];

    // ============================================================
    // SNOW PARTICLE SYSTEM (sits above the map)
    // ============================================================
    const snowCount = 1800;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount); // Y velocity per flake
    const snowSpread = 80;

    for (let i = 0; i < snowCount; i++) {
        snowPositions[i * 3 + 0] = (Math.random() - 0.5) * snowSpread * 2;
        snowPositions[i * 3 + 1] = (Math.random() - 0.5) * snowSpread * 1.2;
        snowPositions[i * 3 + 2] = Math.random() * 30 + 3; // above map
        snowVelocities[i] = 0.02 + Math.random() * 0.06;   // fall speed
    }

    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));

    const snowMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.35,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        sizeAttenuation: true
    });

    const snowParticles = new THREE.Points(snowGeo, snowMat);
    scene.add(snowParticles);

    function animateSnow() {
        const pos = snowGeo.attributes.position.array;
        for (let i = 0; i < snowCount; i++) {
            pos[i * 3 + 2] -= snowVelocities[i]; // fall downward (Z axis since map is flat)
            pos[i * 3 + 0] += Math.sin(Date.now() * 0.0005 + i) * 0.008; // gentle drift
            // Reset snowflake when it falls below the map
            if (pos[i * 3 + 2] < -5) {
                pos[i * 3 + 2] = 35;
                pos[i * 3 + 0] = (Math.random() - 0.5) * snowSpread * 2;
                pos[i * 3 + 1] = (Math.random() - 0.5) * snowSpread * 1.2;
            }
        }
        snowGeo.attributes.position.needsUpdate = true;
    }

    // ============================================================
    // ATMOSPHERIC LAYERS (Procedural Volumetric Fog)
    // ============================================================
    const fogUniforms = {
        uTime: { value: 0.0 }
    };
    
    function createFogPlane(y, opacity, scale) {
        const fogGeo = new THREE.PlaneGeometry(300, 150);
        const fogMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: fogUniforms.uTime,
                uOpacity: { value: opacity },
                uScale: { value: scale }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uOpacity;
                uniform float uScale;
                varying vec2 vUv;
                
                // Classic Perlin 2D Noise 
                vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
                vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
                float cnoise(vec2 P){
                  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
                  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
                  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
                  vec4 ix = Pi.xzxz;
                  vec4 iy = Pi.yyww;
                  vec4 fx = Pf.xzxz;
                  vec4 fy = Pf.yyww;
                  vec4 i = permute(permute(ix) + iy);
                  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
                  vec4 gy = abs(gx) - 0.5;
                  vec4 tx = floor(gx + 0.5);
                  gx = gx - tx;
                  vec2 g00 = vec2(gx.x,gy.x);
                  vec2 g10 = vec2(gx.y,gy.y);
                  vec2 g01 = vec2(gx.z,gy.z);
                  vec2 g11 = vec2(gx.w,gy.w);
                  vec4 norm = 1.79284291400159 - 0.85373472095314 * 
                    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
                  g00 *= norm.x;
                  g01 *= norm.y;
                  g10 *= norm.z;
                  g11 *= norm.w;
                  float n00 = dot(g00, vec2(fx.x, fy.x));
                  float n10 = dot(g10, vec2(fx.y, fy.y));
                  float n01 = dot(g01, vec2(fx.z, fy.z));
                  float n11 = dot(g11, vec2(fx.w, fy.w));
                  vec2 fade_xy = fade(Pf.xy);
                  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
                  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
                  return 2.3 * n_xy;
                }

                void main() {
                    vec2 uv = vUv * uScale;
                    uv.x += uTime * 0.05; // Fog drift
                    uv.y += sin(uTime * 0.02) * 0.2;
                    
                    float noise = cnoise(uv) * 0.5 + 0.5;
                    // Add detail octave
                    noise += cnoise(uv * 2.0 - vec2(uTime * 0.08, uTime * 0.03)) * 0.25;
                    
                    // Soft edges
                    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) *
                                 smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                                 
                    float alpha = smoothstep(0.3, 0.8, noise) * uOpacity * edge;
                    gl_FragColor = vec4(0.02, 0.08, 0.12, alpha); // Dark cinematic mist instead of bright white
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        const fog = new THREE.Mesh(fogGeo, fogMat);
        fog.position.set(0, y, 2.5);
        return fog;
    }

    // Volumetric procedural fog layers rolling through valleys
    scene.add(createFogPlane(-25, 0.4, 4.0));
    scene.add(createFogPlane(-15, 0.2, 6.0));


    // GEOJSON PARSING & EXTRUSION
    // We loaded uttarakhand_districts.json in public folder
    fetch('./uttarakhand_districts.json')
        .then(res => res.json())
        .then(data => {
            // Calculate bounding box to center the map
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            data.features.forEach(feature => {
                if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates[0].forEach(coord => {
                        minX = Math.min(minX, coord[0]);
                        maxX = Math.max(maxX, coord[0]);
                        minY = Math.min(minY, coord[1]);
                        maxY = Math.max(maxY, coord[1]);
                    });
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(poly => {
                        poly[0].forEach(coord => {
                            minX = Math.min(minX, coord[0]);
                            maxX = Math.max(maxX, coord[0]);
                            minY = Math.min(minY, coord[1]);
                            maxY = Math.max(maxY, coord[1]);
                        });
                    });
                }
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const scaleFactor = 28; // Reduced slightly for better framing

            data.features.forEach((feature, index) => {
                const name = feature.properties.NAME_2 || feature.properties.dt_name || feature.properties.DISTRICT || `District ${index+1}`;
                const lowerName = name.toLowerCase();

                let category = 'default';
                let baseHeight = 2; // Flat base for all districts

                if (['pithoragarh', 'chamoli', 'uttarkashi'].some(d => lowerName.includes(d))) {
                    category = 'himalayas';
                } else if (['haridwar', 'udham singh nagar'].some(d => lowerName.includes(d))) {
                    category = 'plains';
                } else if (lowerName.includes('dehradun')) {
                    category = 'capital';
                } else if (['rudraprayag', 'pauri garhwal'].some(d => lowerName.includes(d))) {
                    category = 'temples'; // Custom category for shrines
                } else if (lowerName.includes('naini tal') || lowerName.includes('nainital')) {
                    category = 'lakes';
                }
                
                const processPolygon = (coords) => {
                    const shape = new THREE.Shape();
                    const points = [];
                    let localMinX = Infinity, localMaxX = -Infinity, localMinY = Infinity, localMaxY = -Infinity;

                    coords.forEach((coord, i) => {
                        // Apply Mercator-like longitude squeeze (cos(30 deg) = 0.866) to fix diamond distortion
                        const x = (coord[0] - centerX) * scaleFactor * 0.866;
                        const y = (coord[1] - centerY) * scaleFactor;
                        points.push(new THREE.Vector3(x, y, 0));
                        if (i === 0) shape.moveTo(x, y);
                        else shape.lineTo(x, y);

                        localMinX = Math.min(localMinX, x);
                        localMaxX = Math.max(localMaxX, x);
                        localMinY = Math.min(localMinY, y);
                        localMaxY = Math.max(localMaxY, y);
                    });
                    
                    const extrudeSettings = {
                        depth: baseHeight,
                        bevelEnabled: true,
                        bevelSegments: 2,
                        steps: 1,
                        bevelSize: 0.1,
                        bevelThickness: 0.1
                    };
                    
                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    const materialToUse = materials[category] || materials['default'];
                    const mesh = new THREE.Mesh(geometry, materialToUse);
                    
                    // --- SUBTLE TERRAIN MARKERS (not cartoonish, very small) ---
                    const spawnAreaX = (localMaxX - localMinX) * 0.5;
                    const spawnAreaY = (localMaxY - localMinY) * 0.5;
                    const cx = (localMinX + localMaxX) / 2;
                    const cy = (localMinY + localMaxY) / 2;

                    if (category === 'himalayas') {
                        // Subtle white snow-cap markers — very thin, small cones
                        const numPeaks = 6 + Math.floor(Math.random() * 4);
                        const snowMat = new THREE.MeshPhysicalMaterial({
                            color: 0xffffff, emissive: 0xaabbcc,
                            emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.0,
                            clearcoat: 0.8
                        });
                        for(let i=0; i<numPeaks; i++) {
                            // Very slim, short — like tiny pins on a map
                            const h = 1.5 + Math.random() * 2.0;
                            const r = 0.2 + Math.random() * 0.3;
                            const peakGeo = new THREE.ConeGeometry(r, h, 5);
                            peakGeo.rotateX(Math.PI / 2);
                            const peakMesh = new THREE.Mesh(peakGeo, snowMat);
                            peakMesh.position.set(
                                cx + (Math.random() - 0.5) * spawnAreaX * 0.9,
                                cy + (Math.random() - 0.5) * spawnAreaY * 0.9,
                                baseHeight + h / 2
                            );
                            mesh.add(peakMesh);
                        }
                    }
                    else if (category === 'capital') {
                        // Very thin golden city spikes — like data viz pins
                        const numBuildings = 12 + Math.floor(Math.random() * 8);
                        const cityMat = new THREE.MeshPhysicalMaterial({
                            color: 0xffcc44, emissive: 0xaa6600,
                            emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.5,
                            clearcoat: 1.0
                        });
                        for(let i=0; i<numBuildings; i++) {
                            const h = 1.0 + Math.random() * 4.0;
                            const bGeo = new THREE.BoxGeometry(0.15, 0.15, h);
                            const bMesh = new THREE.Mesh(bGeo, cityMat);
                            bMesh.position.set(
                                cx + (Math.random() - 0.5) * spawnAreaX * 0.5,
                                cy + (Math.random() - 0.5) * spawnAreaY * 0.5,
                                baseHeight + h / 2
                            );
                            mesh.add(bMesh);
                        }
                    }
                    else if (name.toLowerCase().includes('haridwar')) {
                        // Slim glowing river ribbon — very thin and organic
                        const curvePoints = [];
                        for(let i=0; i<8; i++) {
                            curvePoints.push(new THREE.Vector3(
                                cx + (i/7 - 0.5) * spawnAreaX * 1.8,
                                cy + Math.sin(i * 0.9) * spawnAreaY * 0.35,
                                baseHeight + 0.3
                            ));
                        }
                        const riverCurve = new THREE.CatmullRomCurve3(curvePoints);
                        const riverGeo = new THREE.TubeGeometry(riverCurve, 30, 0.18, 6, false);
                        const riverMat = new THREE.MeshPhysicalMaterial({
                            color: 0x88ddff, emissive: 0x0055aa,
                            emissiveIntensity: 0.8, roughness: 0.0, metalness: 0.0,
                            clearcoat: 1.0, transmission: 0.4, ior: 1.33
                        });
                        mesh.add(new THREE.Mesh(riverGeo, riverMat));
                    }

                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    const GEOJSON_MAP = {
                        "Almora": "almora",
                        "Bageshwar": "bageshwar",
                        "Chamoli": "chamoli",
                        "Champawat": "champawat",
                        "Dehra Dun": "dehradun",
                        "Haridwar": "haridwar",
                        "Naini Tal": "nainital",
                        "Pauri Garhwal": "pauri garhwal",
                        "Pithoragarh": "pithoragarh",
                        "Rudra Prayag": "rudraprayag",
                        "Tehri Garhwal": "tehri garhwal",
                        "Udham Singh Nagar": "udham singh nagar",
                        "Uttarkashi": "uttarkashi"
                    };
                    
                    let matchedKey = GEOJSON_MAP[name] || 'default';
                    
                    const actualData = districtData[matchedKey] || districtData['default'];

                    mesh.userData = { 
                        name: actualData.name,
                        hindi: actualData.hindi,
                        theme: actualData.theme,
                        population: actualData.population,
                        originalHeight: baseHeight,
                        originalMat: mesh.material,
                        area: actualData.area, 
                        elevation: actualData.altitude,
                        center: new THREE.Vector3(cx, cy, baseHeight)
                    };

                    mapGroup.add(mesh);
                    districtMeshes.push(mesh);

                    // Add top border lines for definition
                    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeom, lineMaterial);
                    mapGroup.add(line);
                };

                if (feature.geometry.type === 'Polygon') {
                    processPolygon(feature.geometry.coordinates[0]);
                } else if (feature.geometry.type === 'MultiPolygon') {
                    feature.geometry.coordinates.forEach(poly => {
                        processPolygon(poly[0]);
                    });
                }
            });
            
            // Adjust map rotation so North is up, and it lays flat
            mapGroup.rotation.x = -Math.PI / 2; // Lay flat
            
            // Map starts fully visible. (Removed time-based entry animation to prevent conflicts with ScrollTrigger)
            mapGroup.children.forEach(child => {
                if (child.isMesh) {
                    child.material.transparent = true;
                    child.material.opacity = 1;
                    child.position.z = 0;
                }
            });

            isMapLoaded = true;
        })
        .catch(err => console.error("Error loading GeoJSON map data", err));

    // LOAD REAL 3D TERRAIN UNDERNEATH
    let terrainModel = null;
    const loader = new GLTFLoader();
    loader.load('/models/snowy_mountain_v2_-_terrain.glb', (gltf) => {
        terrainModel = gltf.scene;
        
        // Scale and position the terrain to fit exactly under the glass map
        terrainModel.scale.set(4, 1.5, 4);
        terrainModel.position.set(-2, -5, -2); 
        // Adjust these offsets to center it beneath the glass outline
        
        // The Earth Pulse uniform
        const terrainUniforms = {
            uEarthPulse: { value: 0.0 }
        };

        // Add a cool blue/cyan tint to the terrain material to match the Devbhoomi aesthetic
        terrainModel.traverse((child) => {
            if (child.isMesh && child.material) {
                const mat = new THREE.MeshStandardMaterial({
                    color: 0x113355, 
                    roughness: 0.8,
                    metalness: 0.2,
                    bumpMap: terrainTexture,
                    bumpScale: 2.0
                });
                
                mat.onBeforeCompile = (shader) => {
                    shader.uniforms.uEarthPulse = terrainUniforms.uEarthPulse;
                    shader.vertexShader = `
                        uniform float uEarthPulse;
                        ${shader.vertexShader}
                    `.replace(
                        `#include <begin_vertex>`,
                        `#include <begin_vertex>
                        // Mountain Breathing: Push vertices outward slightly along their normals
                        // The sine wave is pre-calculated in Ecosystem.earthPulse
                        transformed += normal * (uEarthPulse * 0.5); // Very subtle (approx 2px on screen depending on distance)
                        `
                    );
                };
                
                child.material = mat;
                child.userData.terrainUniforms = terrainUniforms; // Save reference to update it later
            }
        });
        
        // Animate terrain entry
        terrainModel.position.y = -50;
        gsap.to(terrainModel.position, { y: -15, duration: 2.5, ease: 'power3.out', delay: 0.5 });
        
        scene.add(terrainModel);
    }, undefined, (error) => {
        console.error("Error loading terrain model", error);
    });

    // RAYCASTER FOR HOVER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);
    // ============================================================
    // DISTRICT DNA PARTICLE BURST
    // Each district has a unique identity color when hovered
    // ============================================================
    const dnaColors = {
        pithoragarh: 0x00e5ff,   // Glacier cyan
        chamoli:     0xffffff,   // Pure ice white
        uttarkashi:  0x88ddff,   // Cold blue
        rudraprayag: 0xff2244,   // Sacred crimson
        haridwar:    0xffaa00,   // Ganga gold / fire
        dehradun:    0xffcc44,   // Warm amber city
        nainital:    0x44aaff,   // Lake blue
        almora:      0xff6688,   // Copper pink folk art
        bageshwar:   0xff44cc,   // Temple magenta
        champawat:   0xffdd00,   // Ancient gold
        tehri:       0x44ff88,   // Dam green-teal
        pauri:       0xaa44ff,   // Forest purple
        'udham singh nagar': 0xd4b886, // Terai sand
    };

    function spawnDNAParticles(mesh) {
        const name = (mesh.userData.name || '').toLowerCase();
        let color = 0xffffff;
        for (const key of Object.keys(dnaColors)) {
            if (name.includes(key)) { color = dnaColors[key]; break; }
        }

        const count = 80;
        const burstGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const mx = mesh.position.x, my = mesh.position.y, mz = mesh.position.z + 3;

        for (let i = 0; i < count; i++) {
            positions[i*3]   = mx + (Math.random() - 0.5) * 20;
            positions[i*3+1] = my + (Math.random() - 0.5) * 12;
            positions[i*3+2] = mz + Math.random() * 8;
        }

        burstGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const burstMat = new THREE.PointsMaterial({
            color, size: 0.5, transparent: true, opacity: 0.9,
            depthWrite: false, sizeAttenuation: true
        });
        const burst = new THREE.Points(burstGeo, burstMat);
        scene.add(burst);

        // Ecosystem reacts! A sudden wind gust based on the district position
        const windGust = new THREE.Vector3(
            (Math.random() - 0.5) * 2.0, 
            0,                           
            (Math.random() - 0.5) * 2.0  
        );
        Ecosystem.disturbWind(windGust);
        
        // Morph the Living Horizon based on district category
        const c = name.toLowerCase();
        let targetBottom = new THREE.Color(0x15696F); // Default Teal
        let targetTop = new THREE.Color(0x020813);
        
        if (['pithoragarh', 'chamoli', 'uttarkashi'].some(d => c.includes(d))) {
            targetBottom.setHex(0xffffff); // White icy horizon
            targetTop.setHex(0x15696F);
        } else if (['haridwar', 'udham singh nagar'].some(d => c.includes(d))) {
            targetBottom.setHex(0xffaa00); // Warm gold horizon
            targetTop.setHex(0x331100);
        } else if (c.includes('nainital')) {
            targetBottom.setHex(0x0044aa); // Deep blue lake horizon
        }
        
        gsap.to(skyboxUniforms.uColorBottom.value, { r: targetBottom.r, g: targetBottom.g, b: targetBottom.b, duration: 2.0 });
        gsap.to(skyboxUniforms.uColorTop.value, { r: targetTop.r, g: targetTop.g, b: targetTop.b, duration: 2.0 });

        // Animate opacity out and remove
        gsap.to(burstMat, { opacity: 0, duration: 1.8, ease: 'power2.in',
            onComplete: () => { scene.remove(burst); burstGeo.dispose(); burstMat.dispose(); }
        });
    }

    // ============================================================
    // ANIMATE LOOP
    // ============================================================
    let hoveredMesh = null;
    
    // UI Elements (Floating Editorial Layout)
    const uiPanel = document.getElementById('floating-editorial-ui');
    const uiName = document.getElementById('float-name');
    const uiHindi = document.getElementById('float-hindi');
    const uiCoords = document.getElementById('float-coords');
    const uiElev = document.getElementById('float-elev');
    const uiPop = document.getElementById('float-pop');
    const uiTracker = document.getElementById('float-tracker');
    const uiTheme = document.getElementById('float-theme');

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Stop auto-rotation when user is interacting
        controls.autoRotate = false;
    });

    container.addEventListener('mouseleave', () => {
        mouse.x = -9999;
        mouse.y = -9999;
        controls.autoRotate = true;
    });

    // RENDER LOOP
    let isActive = false;
    
    ScrollTrigger.create({
        trigger: '#district-map-section',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => { 
            isActive = true; 
            gsap.to(mapUniforms.uFlowProgress, { value: 1.0, duration: 3.5, ease: 'power2.inOut', overwrite: true });
        },
        onEnterBack: () => { isActive = true; },
        onLeave: () => { isActive = false; },
        onLeaveBack: () => { 
            isActive = false; 
            gsap.to(mapUniforms.uFlowProgress, { value: 0.0, duration: 1.0, overwrite: true }); // Hide when scrolling back up
        },
    });

    // THE GREAT CLIMB: Scroll-driven continuous timeline
    const climbTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: '#district-map-section',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1, // Smooth scrub
        }
    });

    // 1. Initial State -> Sacred Winter (Climb UP to 40)
    climbTimeline.to(camera.position, {
        y: 40,
        z: 20,
        ease: 'none'
    }, 0);

    // Turn glass districts to frosted ice midway AND make them GROW massively
    districtMeshes.forEach(mesh => {
        climbTimeline.to(mesh.material, {
            transmission: 0.2,
            roughness: 0.8,
            color: 0xffffff, // White frost
            ease: 'none'
        }, 0);
        
        // Crazy Mountain Growth effect!
        climbTimeline.to(mesh.scale, {
            z: 25, // Extrude them crazily upwards
            ease: 'power2.in'
        }, 0);
    });

    // Terrain turns cold midway and ALSO GROWS
    if (scene.children) {
        scene.children.forEach(c => {
            if (c.isGroup && c.scale.x === 4) { // Using 4 to identify the terrain model
                c.traverse(child => {
                    if (child.isMesh && child.material) {
                        climbTimeline.to(child.material.color, { r: 0.8, g: 0.9, b: 1.0, ease: 'none' }, 0);
                    }
                });
                
                // Real terrain bulges out slightly
                climbTimeline.to(c.scale, {
                    y: 10, // Small vertical stretch
                    ease: 'power2.in'
                }, 0);
            }
        });
    }

    // 2. Sacred Winter -> Energy Grid (Climb to 120, OrbitControls will auto look down)
    climbTimeline.to(camera.position, {
        y: 120,
        z: 0,
        ease: 'power1.in'
    }, 0.5); // Starts halfway through the scroll

    // Wireframe districts at the top
    districtMeshes.forEach(mesh => {
        climbTimeline.to(mesh.material, {
            color: 0x00ffff,
            emissive: 0x0088ff,
            emissiveIntensity: 2.0,
            opacity: 0.8,
            transparent: true,
            onStart: () => mesh.material.wireframe = true,
            ease: 'power1.in'
        }, 0.5);
    });

    // Hide terrain at the top
    if (scene.children) {
        scene.children.forEach(c => {
            if (c.isGroup && c.scale.x === 4) {
                climbTimeline.to(c.position, { y: -100, ease: 'power1.in' }, 0.5);
            }
        });
    }

    // 4. Energy Grid (Hide solid districts, show ONLY glowing data borders)
    climbTimeline.to(mapGroup.position, { z: -10, ease: 'power2.inOut' }, 0.5);
    
    districtMeshes.forEach(mesh => {
        climbTimeline.to(mesh.material, {
            opacity: 0.0, // Fade out the solid glass to reveal the wireframe borders
            ease: 'power2.inOut'
        }, 0.6);
    });

    // Skybox fades to pure void at high altitude
    climbTimeline.to(skyboxUniforms.uColorBottom.value, { r: 0.0, g: 0.01, b: 0.02, ease: 'none' }, 0.5);
    climbTimeline.to(skyboxUniforms.uColorTop.value, { r: 0.0, g: 0.0, b: 0.0, ease: 'none' }, 0.5);

    let nainitalMesh = null; // We will populate this to hide it during its own reflection render
    
    // Animate Loop logic for Ecosystem
    function updateEcosystemInMap() {
        if (terrainModel) {
            terrainModel.traverse(child => {
                if (child.userData && child.userData.terrainUniforms) {
                    child.userData.terrainUniforms.uEarthPulse.value = Ecosystem.earthPulse;
                }
            });
        }
    }
    
    function animateMap() {
        if (!container.parentElement) return; 

        requestAnimationFrame(animateMap);
        const time = Date.now() * 0.001;
        skyboxUniforms.uTime.value = time;
        fogUniforms.uTime.value = time;
        
        updateEcosystemInMap();

        if (!isActive) return;

        controls.update();
        
        // Find Nainital mesh if we haven't yet
        if (!nainitalMesh && districtMeshes.length > 0) {
            nainitalMesh = districtMeshes.find(m => m.userData.name.toLowerCase() === 'nainital');
        }
        
        // Update Live Reflection for Nainital
        if (nainitalMesh) {
            nainitalMesh.visible = false; // Don't reflect itself
            cubeCamera.position.copy(nainitalMesh.position);
            cubeCamera.update(renderer, scene);
            nainitalMesh.visible = true;
        }

        if (isMapLoaded) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(districtMeshes, false); // ONLY intersect main district meshes, not their children!

            if (intersects.length > 0) {
                const object = intersects[0].object;
                
                if (hoveredMesh !== object) {
                    // Reset previous hover
                    if (hoveredMesh) {
                        gsap.to(hoveredMesh.position, { z: 0, duration: 0.3, ease: 'power2.out' });
                        hoveredMesh.material = hoveredMesh.userData.originalMat;
                    }
                    
                    hoveredMesh = object;
                    // Apply highlight and lift up slightly
                    hoveredMesh.material = highlightMaterial;
                    gsap.to(hoveredMesh.position, { z: 2.5, duration: 0.5, ease: 'back.out(2)' });
                    
                    // Update UI
                    uiName.textContent = hoveredMesh.userData.name;
                    uiHindi.textContent = hoveredMesh.userData.hindi;
                    uiElev.textContent = hoveredMesh.userData.elevation;
                    uiPop.textContent = hoveredMesh.userData.population;
                    uiTheme.textContent = hoveredMesh.userData.theme;
                    
                    // Simple random/mock coordinates for demo if true coordinates aren't easy to fetch per-district
                    const lon = (77 + Math.random() * 3).toFixed(2);
                    const lat = (29 + Math.random() * 2).toFixed(2);
                    uiCoords.textContent = `${lat}° N, ${lon}° E`;

                    uiPanel.style.opacity = "1";

                    // District DNA — unique hover particle burst
                    spawnDNAParticles(hoveredMesh);
                }

                // 3D tracking: constantly update float-tracker position
                if (hoveredMesh) {
                    const centerPos = hoveredMesh.userData.center.clone();
                    // apply map rotation and position
                    centerPos.applyMatrix4(mapGroup.matrixWorld);
                    // project to 2d screen space
                    centerPos.project(camera);
                    
                    const x = (centerPos.x * .5 + .5) * window.innerWidth;
                    const y = (centerPos.y * -.5 + .5) * window.innerHeight;
                    
                    uiTracker.style.left = `${x}px`;
                    uiTracker.style.top = `${y}px`;
                }
            } else {
                if (hoveredMesh) {
                    gsap.to(hoveredMesh.position, { z: 0, duration: 0.3, ease: 'power2.out' });
                    hoveredMesh.material = hoveredMesh.userData.originalMat;
                    hoveredMesh = null;
                    uiPanel.style.opacity = "0";
                }
            }
        }

        animateSnow();
        renderer.render(scene, camera);
    }
    
    // CLICK VS DRAG DETECTION
    // Only open district view on a true stationary click, not after dragging the map.
    let mouseDownX = 0, mouseDownY = 0;
    const DRAG_THRESHOLD = 5; // pixels
    
    renderer.domElement.addEventListener('pointerdown', (e) => {
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
        const dx = Math.abs(e.clientX - mouseDownX);
        const dy = Math.abs(e.clientY - mouseDownY);
        const isDrag = dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD;

        if (!isDrag && hoveredMesh && isMapLoaded) {
            const key = hoveredMesh.userData.name.toLowerCase();
            let matchedKey = 'default';
            if (key.includes('udham')) matchedKey = 'udham singh nagar';
            else if (key.includes('tehri')) matchedKey = 'tehri garhwal';
            else if (key.includes('pauri')) matchedKey = 'pauri garhwal';
            else matchedKey = key;
            openDistrictView(matchedKey);
        }
    });

    animateMap();

    // RESIZE
    window.addEventListener('resize', () => {
        if (!isActive && container.clientWidth === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}
