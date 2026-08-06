import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add texture loading and uniforms to brutalistMaterial
old_brutalist = """    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uChapter: { value: -1 }, // -1 = Hero Intro, 0, 1, 2, 3 = Editorial Chapters
            uOpacity: { value: 0 }, // Crossfade opacity
            uIntroProgress: { value: 0 }, // 0 to 1 for the Awakening
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uHover: { value: 0 }, // 0 to 1 smooth
            uScrollVelocity: { value: 0 }
        },"""

new_brutalist = """    // Load textures for chapters
    const tLoader = new THREE.TextureLoader();
    const tex1 = tLoader.load('/img1.jpeg');
    const tex2 = tLoader.load('/img2.jpeg');
    const tex3 = tLoader.load('/img3.jpeg');
    const tex4 = tLoader.load('/smoking-man.jpeg'); // Fallback for missing img4
    
    brutalistMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uChapter: { value: -1 }, // -1 = Hero Intro, 0, 1, 2, 3 = Editorial Chapters
            uOpacity: { value: 0 }, // Crossfade opacity
            uIntroProgress: { value: 0 }, // 0 to 1 for the Awakening
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uHover: { value: 0 }, // 0 to 1 smooth
            uScrollVelocity: { value: 0 },
            tImg1: { value: tex1 },
            tImg2: { value: tex2 },
            tImg3: { value: tex3 },
            tImg4: { value: tex4 }
        },"""

js = js.replace(old_brutalist, new_brutalist)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Added texture loading to brutalistMaterial.")
