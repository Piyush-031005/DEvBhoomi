// src/districtMap.js
// ============================================================
// UTTARAKHAND 3D DISTRICT MAP
// Interactive, extruded GeoJSON map with glass/stone blend
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2; // Don't go below ground
    controls.minDistance = 30;
    controls.maxDistance = 200;
    // Auto rotation (slow)
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // LIGHTING - Shaded Relief (High Contrast, Low Angle)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Very low ambient to allow deep shadows
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.5); // Intense main light
    dirLight.position.set(-80, 40, 80); // Grazing angle to highlight bump map ridges
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const redRimLight = new THREE.DirectionalLight(0xff4444, 1.5);
    redRimLight.position.set(80, 20, -50); // Low angle back rim light
    scene.add(redRimLight);

    const blueRimLight = new THREE.DirectionalLight(0x4488ff, 1.0);
    blueRimLight.position.set(-80, 20, -50); 
    scene.add(blueRimLight);

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

    // THEMATIC MATERIALS (Photorealistic Shaded Relief)
    const materials = {
        himalayas: new THREE.MeshStandardMaterial({
            color: 0xe0e8f0,          // Glacier White/Blue
            bumpMap: terrainTexture,
            bumpScale: 1.5,           // Extreme bumps for himalayas
            roughness: 0.9,
            metalness: 0.1
        }),
        plains: new THREE.MeshStandardMaterial({
            color: 0x1a3c40,          // Deep Teal / River valley
            bumpMap: terrainTexture,
            bumpScale: 0.2,           // Very subtle bumps for plains
            roughness: 0.7,
            metalness: 0.2
        }),
        capital: new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,          // Bronze / Earthy Gold
            bumpMap: terrainTexture,
            bumpScale: 0.8,           // Medium bumps
            roughness: 0.8,
            metalness: 0.15
        }),
        temples: new THREE.MeshStandardMaterial({
            color: 0x6b2b2b,          // Deep Crimson/Earth
            bumpMap: terrainTexture,
            bumpScale: 1.0,
            roughness: 0.85,
            metalness: 0.1
        }),
        default: new THREE.MeshStandardMaterial({
            color: 0x4a5d4e,          // Earthy Forest Green
            bumpMap: terrainTexture,
            bumpScale: 0.8,
            roughness: 0.9,
            metalness: 0.1
        })
    };

    const highlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0000,       // Glowing red when hovered
        roughness: 0.5,
        metalness: 0.3,
        flatShading: true
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
                    
                    // --- PREMIUM 3D DATA VIZ ELEMENTS ---
                    const spawnAreaX = (localMaxX - localMinX) * 0.5;
                    const spawnAreaY = (localMaxY - localMinY) * 0.5;
                    const cx = (localMinX + localMaxX) / 2;
                    const cy = (localMinY + localMaxY) / 2;

                    if (category === 'himalayas') {
                        // Jagged Crystal Mountains
                        const numPeaks = 5 + Math.floor(Math.random() * 4);
                        for(let i=0; i<numPeaks; i++) {
                            const peakHeight = 8 + Math.random() * 15;
                            // Icosahedron heavily scaled on Y creates a jagged, premium crystal mountain look
                            const peakGeo = new THREE.IcosahedronGeometry(2 + Math.random()*1.5, 0); 
                            peakGeo.scale(1, 1, peakHeight / 2); // Scale along Z since map is rotated
                            const peakMat = new THREE.MeshStandardMaterial({
                                color: 0xffffff, emissive: 0x224466, roughness: 0.2, metalness: 0.8, flatShading: true
                            });
                            const peakMesh = new THREE.Mesh(peakGeo, peakMat);
                            peakMesh.position.set(
                                cx + (Math.random() - 0.5) * spawnAreaX,
                                cy + (Math.random() - 0.5) * spawnAreaY,
                                baseHeight + peakHeight/4
                            );
                            peakMesh.rotation.z = Math.random() * Math.PI;
                            mesh.add(peakMesh);
                        }
                    } 
                    else if (category === 'capital') {
                        // Data Spikes / Modern Architecture (Thin glowing bars)
                        const numBuildings = 15 + Math.floor(Math.random() * 10);
                        for(let i=0; i<numBuildings; i++) {
                            const bHeight = 2 + Math.random() * 10;
                            const bGeo = new THREE.BoxGeometry(0.3, 0.3, bHeight);
                            const bMat = new THREE.MeshStandardMaterial({
                                color: 0xffaa00, emissive: 0xff5500, roughness: 0.1, metalness: 0.9
                            });
                            const bMesh = new THREE.Mesh(bGeo, bMat);
                            bMesh.position.set(
                                cx + (Math.random() - 0.5) * spawnAreaX * 0.6,
                                cy + (Math.random() - 0.5) * spawnAreaY * 0.6,
                                baseHeight + bHeight/2
                            );
                            mesh.add(bMesh);
                        }
                    }
                    else if (category === 'plains' && name.toLowerCase().includes('haridwar')) {
                        // Winding Glowing River
                        const curvePoints = [];
                        for(let i=0; i<5; i++) {
                            curvePoints.push(new THREE.Vector3(
                                cx + (i/5 - 0.5) * spawnAreaX * 1.5,
                                cy + Math.sin(i * 1.5) * spawnAreaY * 0.5,
                                baseHeight + 0.5
                            ));
                        }
                        const riverCurve = new THREE.CatmullRomCurve3(curvePoints);
                        const riverGeo = new THREE.TubeGeometry(riverCurve, 20, 0.6, 8, false);
                        const riverMat = new THREE.MeshStandardMaterial({
                            color: 0x00ffff, emissive: 0x0088ff, roughness: 0.1, metalness: 1.0
                        });
                        const riverMesh = new THREE.Mesh(riverGeo, riverMat);
                        mesh.add(riverMesh);
                    }
                    else if (category === 'temples') {
                        // Stylized Floating Shrines (Golden octahedrons)
                        const numTemples = 2 + Math.floor(Math.random() * 2);
                        for(let i=0; i<numTemples; i++) {
                            const tGeo = new THREE.OctahedronGeometry(2, 0);
                            tGeo.scale(1, 1, 1.5);
                            const tMat = new THREE.MeshStandardMaterial({
                                color: 0xffdd00, emissive: 0x884400, roughness: 0.3, metalness: 0.8, flatShading: true
                            });
                            const tMesh = new THREE.Mesh(tGeo, tMat);
                            tMesh.position.set(
                                cx + (Math.random() - 0.5) * spawnAreaX * 0.7,
                                cy + (Math.random() - 0.5) * spawnAreaY * 0.7,
                                baseHeight + 3 // Floating slightly
                            );
                            mesh.add(tMesh);
                        }
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
            isMapLoaded = true;
        })
        .catch(err => console.error("Error loading GeoJSON map data", err));

    // RAYCASTER FOR HOVER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1, -1);
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
                    gsap.to(hoveredMesh.position, { z: 1.5, duration: 0.4, ease: 'back.out(1.5)' });
                    
                    // Update UI
                    uiName.textContent = hoveredMesh.userData.name;
                    uiElev.textContent = hoveredMesh.userData.elevation;
                    uiArea.textContent = hoveredMesh.userData.area;
                    uiPanel.classList.add('visible');
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

        renderer.render(scene, camera);
    }
    
    animate();

    // RESIZE
    window.addEventListener('resize', () => {
        if (!isActive && container.clientWidth === 0) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}
