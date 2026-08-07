// src/districtMap.js
// ============================================================
// UTTARAKHAND 3D DISTRICT MAP
// Interactive, extruded GeoJSON map with glass/stone blend
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { openDistrictView } from './districtView.js';

export function initDistrictMap() {
    const container = document.getElementById('district-map-container');
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050101);
    // Use linear fog so the map doesn't get completely hidden at a distance
    scene.fog = new THREE.Fog(0x050101, 100, 350); 

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

    // CANDY-APPLE LACQUER RED — Shiny, solid, like polished red ceramic/glass
    // NO transmission (transmission makes it absorb the dark background)
    const lacquerRedMat = new THREE.MeshPhysicalMaterial({
        color: 0xcc0011,          // Vivid candy-apple red
        emissive: 0x440000,       // Deep inner warmth
        emissiveIntensity: 0.3,
        roughness: 0.04,          // Extremely glossy — mirror-like surface
        metalness: 0.0,           // Not metallic, more like lacquer/ceramic
        transmission: 0.0,        // OPAQUE — no dark-background bleed
        clearcoat: 1.0,           // Full clearcoat for wet/glossy look
        clearcoatRoughness: 0.03, // Smooth clearcoat = crisp specular highlights
        bumpMap: terrainTexture,
        bumpScale: 0.6            // Subtle organic terrain surface detail
    });

    // Darker variant for shadowed/Himalayan districts
    const lacquerDarkRedMat = new THREE.MeshPhysicalMaterial({
        color: 0x990008,          // Deeper burgundy-red
        emissive: 0x330000,
        emissiveIntensity: 0.25,
        roughness: 0.06,
        metalness: 0.0,
        transmission: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        bumpMap: terrainTexture,
        bumpScale: 1.0            // More bump for mountain districts
    });

    const materials = {
        himalayas: lacquerDarkRedMat,
        plains: lacquerRedMat,
        capital: lacquerRedMat,
        temples: lacquerDarkRedMat,
        default: lacquerRedMat
    };

    const highlightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff5577,          // Bright hot pink highlight on hover
        emissive: 0xff1133,
        emissiveIntensity: 1.0,
        roughness: 0.03,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02
    });

    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000,          // Bright red edges
        transparent: true, 
        opacity: 0.8              // Highly visible lines
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
    // ATMOSPHERIC LAYERS (fog planes for depth)
    // ============================================================
    function createFogPlane(y, opacity) {
        const fogGeo = new THREE.PlaneGeometry(200, 100);
        const fogMat = new THREE.MeshBasicMaterial({
            color: 0x0a0505,
            transparent: true,
            opacity,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const fog = new THREE.Mesh(fogGeo, fogMat);
        fog.rotation.x = Math.PI / 2;
        fog.position.set(0, y, 1.5);
        return fog;
    }

    // Subtle dark fog layers at different heights for depth
    scene.add(createFogPlane(-25, 0.25));
    scene.add(createFogPlane(-15, 0.15));


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
                }
                
                const processPolygon = (coords) => {
                    const shape = new THREE.Shape();
                    const points = [];
                    let localMinX = Infinity, localMaxX = -Infinity, localMinY = Infinity, localMaxY = -Infinity;

                    coords.forEach((coord, i) => {
                        const x = (coord[0] - centerX) * scaleFactor;
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
                    mesh.userData = { 
                        name: name,
                        originalHeight: baseHeight,
                        originalMat: mesh.material,
                        area: Math.floor(800 + Math.random() * 4000) + ' sq km', // Mock data
                        elevation: Math.floor(1000 + Math.random() * 5000) + ' m'
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
            
            // ── CINEMATIC ENTRY SEQUENCE ──
            // Map starts invisible, then materializes from below with stagger
            mapGroup.children.forEach(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0;
                    child.position.z -= 8; // Start sunken
                }
            });

            const entryTl = gsap.timeline({ delay: 0.3 });
            mapGroup.children.forEach((child, i) => {
                if (child.isMesh) {
                    entryTl.to(child.material, { opacity: 1, duration: 0.8, ease: 'power2.out' }, i * 0.04)
                           .to(child.position, { z: 0, duration: 1.0, ease: 'back.out(1.2)' }, i * 0.04);
                }
            });

            isMapLoaded = true;
        })
        .catch(err => console.error("Error loading GeoJSON map data", err));

    // RAYCASTER FOR HOVER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1, -1);
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

        // Animate opacity out and remove
        gsap.to(burstMat, { opacity: 0, duration: 1.8, ease: 'power2.in',
            onComplete: () => { scene.remove(burst); burstGeo.dispose(); burstMat.dispose(); }
        });
    }

    // ============================================================
    // ANIMATE LOOP
    // ============================================================
    let hoveredMesh = null;
    
    // UI Elements
    const uiPanel = document.getElementById('district-info-panel');
    const uiName = document.getElementById('di-name');
    const uiElev = document.getElementById('di-elev');
    const uiArea = document.getElementById('di-area');

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Stop auto-rotation when user is interacting
        controls.autoRotate = false;
    });

    container.addEventListener('mouseleave', () => {
        mouse.x = -1;
        mouse.y = -1;
        controls.autoRotate = true;
    });

    // RENDER LOOP
    let isActive = false;
    
    ScrollTrigger.create({
        trigger: '#district-map-section',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => isActive = true,
        onEnterBack: () => isActive = true,
        onLeave: () => isActive = false,
        onLeaveBack: () => isActive = false,
    });

    function animate() {
        requestAnimationFrame(animate);
        
        if (!isActive) return;

        controls.update();

        if (isMapLoaded) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(districtMeshes);

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
                    uiElev.textContent = hoveredMesh.userData.elevation;
                    uiArea.textContent = hoveredMesh.userData.area;
                    uiPanel.classList.add('visible');

                    // District DNA — unique hover particle burst
                    spawnDNAParticles(hoveredMesh);
                }
            } else {
                if (hoveredMesh) {
                    gsap.to(hoveredMesh.position, { z: 0, duration: 0.3, ease: 'power2.out' });
                    hoveredMesh.material = hoveredMesh.userData.originalMat;
                    hoveredMesh = null;
                    uiPanel.classList.remove('visible');
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

    animate();

    // RESIZE
    window.addEventListener('resize', () => {
        if (!isActive && container.clientWidth === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}
