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
    scene.fog = new THREE.FogExp2(0x050101, 0.015);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    // Position camera higher and further back because we are increasing the map size
    camera.position.set(0, 140, 160);

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
    controls.minDistance = 50;
    controls.maxDistance = 250;
    // Auto rotation (slow)
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // LIGHTING - Strong lighting for the solid stone
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(-20, 100, 50); 
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const redRimLight = new THREE.DirectionalLight(0xff0000, 3.5);
    redRimLight.position.set(60, 40, -30); 
    scene.add(redRimLight);

    const blueRimLight = new THREE.DirectionalLight(0x4466ff, 1.5);
    blueRimLight.position.set(-60, 40, 30); 
    scene.add(blueRimLight);

    // THEMATIC MATERIALS
    const materials = {
        himalayas: new THREE.MeshStandardMaterial({
            color: 0xffffff,          // Pure white snow
            emissive: 0x002244,       // Icy blue faint glow
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true
        }),
        plains: new THREE.MeshStandardMaterial({
            color: 0x00bcd4,          // Cyan/Water color
            emissive: 0x003344,       // Deep water glow
            roughness: 0.2,           // Smoother for water feel
            metalness: 0.6,
            flatShading: true
        }),
        capital: new THREE.MeshStandardMaterial({
            color: 0xffb300,          // Golden/Amber
            emissive: 0x442200,       // Warm glow
            roughness: 0.6,
            metalness: 0.3,
            flatShading: true
        }),
        default: new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,          // Light grey stone
            emissive: 0x330000,       // Deep red theme glow
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
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
            const scaleFactor = 38; // Increased scale factor by almost 2x for a larger map

            data.features.forEach((feature, index) => {
                const name = feature.properties.NAME_2 || feature.properties.dt_name || feature.properties.DISTRICT || `District ${index+1}`;
                const lowerName = name.toLowerCase();

                let category = 'default';
                let baseHeight = 10 + Math.random() * 10;

                if (['pithoragarh', 'chamoli', 'uttarkashi', 'rudraprayag', 'bageshwar'].some(d => lowerName.includes(d))) {
                    category = 'himalayas';
                    baseHeight = 30 + Math.random() * 20; // Very tall peaks
                } else if (['haridwar', 'udham singh nagar'].some(d => lowerName.includes(d))) {
                    category = 'plains';
                    baseHeight = 2 + Math.random() * 3; // Flat plains
                } else if (lowerName.includes('dehradun')) {
                    category = 'capital';
                    baseHeight = 15 + Math.random() * 5; // Mid level city
                }
                
                const processPolygon = (coords) => {
                    const shape = new THREE.Shape();
                    const points = [];
                    coords.forEach((coord, i) => {
                        const x = (coord[0] - centerX) * scaleFactor;
                        const y = (coord[1] - centerY) * scaleFactor;
                        points.push(new THREE.Vector3(x, y, 0));
                        if (i === 0) shape.moveTo(x, y);
                        else shape.lineTo(x, y);
                    });
                    
                    const extrudeSettings = {
                        depth: baseHeight,
                        bevelEnabled: true,
                        bevelSegments: 2,
                        steps: 1,
                        bevelSize: 0.2,
                        bevelThickness: 0.2
                    };
                    
                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    
                    // Shift so bottom is at z=0 (and keep original X/Y relative to the map center)
                    geometry.translate(0, 0, -baseHeight);
                    
                    const materialToUse = materials[category];
                    const mesh = new THREE.Mesh(geometry, materialToUse);
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
