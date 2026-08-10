import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

let scene, camera, renderer, controls;
let currentHologramGroup = null;
let animationId = null;

export function initHologram(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear previous if any
    container.innerHTML = '';
    
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;
    
    // Lighting for the hologram
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    // Resize handler
    window.addEventListener('resize', () => {
        if (!container || !camera || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    
    animate();
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (controls) controls.update();
    
    if (currentHologramGroup) {
        // Add subtle floating or pulsing effects here if needed
        const time = Date.now() * 0.001;
        currentHologramGroup.position.y = Math.sin(time * 2) * 0.2;
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

export function loadHologram(type) {
    if (!scene) return;
    
    if (currentHologramGroup) {
        // Fade out and remove old
        gsap.to(currentHologramGroup.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.4, onComplete: () => {
            scene.remove(currentHologramGroup);
            buildNewHologram(type);
        }});
    } else {
        buildNewHologram(type);
    }
}

function buildNewHologram(type) {
    currentHologramGroup = new THREE.Group();
    scene.add(currentHologramGroup);
    
    currentHologramGroup.scale.set(0.01, 0.01, 0.01);
    
    // Holographic Material Base
    const holoMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });
    
    const pointMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    if (type === 'SPIRITUAL') {
        // Procedural Temple (Base, Steps, Shikhara)
        holoMat.color.setHex(0xff3333); // Red/Orange
        pointMat.color.setHex(0xff3333);
        
        // Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), holoMat);
        base.position.y = -2;
        currentHologramGroup.add(base);
        
        // Sanctum
        const sanctum = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), holoMat);
        sanctum.position.y = 0;
        currentHologramGroup.add(sanctum);
        
        // Shikhara (Spire)
        const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 6, 4), holoMat);
        spire.position.y = 4.5;
        spire.rotation.y = Math.PI / 4;
        currentHologramGroup.add(spire);
        
        // Point cloud overlay for Jarvis effect
        const points = new THREE.Points(new THREE.ConeGeometry(2.5, 6, 16, 16), pointMat);
        points.position.y = 4.5;
        currentHologramGroup.add(points);
        
    } else if (type === 'ECOLOGY') {
        // Procedural Tree (Trunk and Leaves)
        holoMat.color.setHex(0x00ff88); // Cyan/Green
        pointMat.color.setHex(0x00ff88);
        
        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 4, 8), holoMat);
        trunk.position.y = -1;
        currentHologramGroup.add(trunk);
        
        // Leaves (Icosahedrons)
        for(let i=0; i<5; i++) {
            const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + Math.random(), 1), holoMat);
            leaf.position.set((Math.random()-0.5)*3, 1 + Math.random()*3, (Math.random()-0.5)*3);
            currentHologramGroup.add(leaf);
        }
        
        const leavesPoints = new THREE.Points(new THREE.IcosahedronGeometry(3.5, 3), pointMat);
        leavesPoints.position.y = 2;
        currentHologramGroup.add(leavesPoints);
        
    } else if (type === 'CULTURE') {
        // Artifact / Instrument (Dhol/Damau style)
        holoMat.color.setHex(0xffaa00); // Gold
        pointMat.color.setHex(0xffaa00);
        
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(3, 2, 4, 16), holoMat);
        drum.rotation.x = Math.PI / 4;
        currentHologramGroup.add(drum);
        
        const drumPoints = new THREE.Points(new THREE.CylinderGeometry(3, 2, 4, 32, 10), pointMat);
        drumPoints.rotation.x = Math.PI / 4;
        currentHologramGroup.add(drumPoints);
        
    } else if (type === 'TERRAIN') {
        // Mountain Peak
        holoMat.color.setHex(0x00d4ff); // Ice Blue
        pointMat.color.setHex(0x00d4ff);
        
        const peak = new THREE.Mesh(new THREE.TetrahedronGeometry(4, 2), holoMat);
        peak.position.y = 1;
        currentHologramGroup.add(peak);
        
        const peakPoints = new THREE.Points(new THREE.TetrahedronGeometry(4, 4), pointMat);
        peakPoints.position.y = 1;
        currentHologramGroup.add(peakPoints);
    }
    
    gsap.to(currentHologramGroup.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: 'elastic.out(1, 0.5)' });
}

export function stopHologram() {
    if (animationId) cancelAnimationFrame(animationId);
    scene = null;
    renderer = null;
    camera = null;
    controls = null;
}
