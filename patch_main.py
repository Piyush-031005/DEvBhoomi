import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update lighting (Add Cyan)
lighting_insert = """const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#00ffff', 2.5); // Neon Cyan accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);"""
js = js.replace("const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light\nmaskLight.position.set(5, 5, -5);\nscene.add(maskLight);", lighting_insert)

# 2. Update Mask Material
old_mat = """                child.material.color.setHex(0xdddddd); // Matte light-grey
                child.material.roughness = 0.8;
                child.material.metalness = 0.1;"""
new_mat = """                child.material.color.setHex(0x050505); // Dark Obsidian
                child.material.roughness = 0.15;
                child.material.metalness = 0.9;"""
js = js.replace(old_mat, new_mat)

# 3. Add mouseY and tracking
mouse_listener_old = """let mouseX = 0;
window.addEventListener('mousemove', (e) => {
    // Map mouse X to -1.0 to 1.0 range
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
});"""
mouse_listener_new = """let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
    // Map mouse to -1.0 to 1.0 range
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
});"""
js = js.replace(mouse_listener_old, mouse_listener_new)

# 4. Update Mask Scale and Position in animate
animate_old = """        // Smoothly interpolate current rotation to target rotation
        maskModel.rotation.y += (targetRotY - maskModel.rotation.y) * 0.1;
        maskModel.rotation.x = Math.cos(elapsedTime * 0.3) * 0.05;
        
        // Scale and opacity driven by GSAP
        maskModel.scale.set(animState.maskScale, animState.maskScale, animState.maskScale);"""
animate_new = """        // Smoothly interpolate current rotation to target rotation
        maskModel.rotation.y += (targetRotY - maskModel.rotation.y) * 0.1;
        maskModel.rotation.x = Math.cos(elapsedTime * 0.3) * 0.05 + (mouseY * 0.2); // Look up/down slightly
        
        // Y-axis limited tracking
        let targetPosY = mouseY * 0.8;
        maskModel.position.y += (targetPosY - maskModel.position.y) * 0.1;
        
        // Scale (stretched wider on X) and opacity driven by GSAP
        maskModel.scale.set(animState.maskScale * 1.4, animState.maskScale, animState.maskScale);"""
js = js.replace(animate_old, animate_new)

# 5. Load Textures and Update brutalistMaterial
shader_uniforms_old = """    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uMouse: { value: new THREE.Vector2() },
            uHover: { value: 0 },
            uScrollVelocity: { value: 0 },
            uChapter: { value: 0 },
            uIntroProgress: { value: 0 }
        },"""
shader_uniforms_new = """    const texLoader = new THREE.TextureLoader();
    const t1 = texLoader.load('/img1.jpeg');
    const t2 = texLoader.load('/img2.jpeg');
    const t3 = texLoader.load('/img3.jpeg');
    const t4 = texLoader.load('/woman.jpeg');
    
    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uMouse: { value: new THREE.Vector2() },
            uHover: { value: 0 },
            uScrollVelocity: { value: 0 },
            uChapter: { value: 0 },
            uIntroProgress: { value: 0 },
            tImg1: { value: t1 },
            tImg2: { value: t2 },
            tImg3: { value: t3 },
            tImg4: { value: t4 }
        },"""
js = js.replace(shader_uniforms_old, shader_uniforms_new)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("main.js updated")
