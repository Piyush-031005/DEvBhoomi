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
    // Position camera to look down at the map at an angle (Y is UP)
    camera.position.set(0, 80, 80);

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
    controls.maxDistance = 150;
    // Auto rotation (slow)
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // LIGHTING - Dramatic, contrasty, highlighting the "glass/stone" edges
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(-20, -50, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const redRimLight = new THREE.DirectionalLight(0xe8190a, 2.0);
    redRimLight.position.set(40, 50, 10);
    scene.add(redRimLight);

    const blueRimLight = new THREE.DirectionalLight(0x4466ff, 1.0);
    blueRimLight.position.set(-40, 20, 5);
    scene.add(blueRimLight);

    // MATERIALS - Blend of Obsidian Glass and Stone
    const mapMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111115,          // Dark base
        emissive: 0x000000,
        roughness: 0.25,          // Slightly polished
        metalness: 0.8,           // Metallic stone feel
        clearcoat: 0.5,           // Glassy outer layer
        clearcoatRoughness: 0.1,
        transmission: 0.3,        // Slight glass transmission
        thickness: 2.0,
        transparent: true,
        opacity: 0.95
    });

    const highlightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe8190a,          // Red highlight
        emissive: 0x330000,
        roughness: 0.2,
        metalness: 0.9,
        clearcoat: 1.0,
        transparent: true,
        opacity: 1.0
    });

    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.15 
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
            const scaleFactor = 20; // Scale degrees to 3D units

            data.features.forEach((feature, index) => {
                const name = feature.properties.NAME_2 || feature.properties.dt_name || feature.properties.DISTRICT || `District ${index+1}`;
                
                // Randomize height slightly to simulate topography, or use real data if available
                const baseHeight = 2 + Math.random() * 6;
                
                const processPolygon = (coords) => {
                    const shape = new THREE.Shape();
                    const points = [];
                    coords.forEach((coord, i) => {
                        const x = (coord[0] - centerX) * scaleFactor;
                        const y = (coord[1] - centerY) * scaleFactor;
                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                        points.push(new THREE.Vector3(x, y, baseHeight + 0.1));
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
                    // Shift so bottom is at z=0
                    geometry.translate(0, 0, -baseHeight);
                    
                    const mesh = new THREE.Mesh(geometry, mapMaterial.clone());
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
