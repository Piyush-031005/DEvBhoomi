import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update the mask material to premium Gold
old_material = """            if (child.material) {
                child.material.color.setHex(0x050505); // Dark Obsidian
                child.material.roughness = 0.15;
                child.material.metalness = 0.9;"""
new_material = """            if (child.material) {
                child.material.color.setHex(0xdfc27d); // Premium Pale Gold
                child.material.roughness = 0.2;
                child.material.metalness = 1.0;"""
js = js.replace(old_material, new_material)

# 2. Update scroll timeline so text stays longer
old_timeline_end = """    // 4. Transition to Editorial Procedural Worlds (4.0 to 4.5)
    .to(".hero-title-container", { opacity: 0, scale: 1.1, duration: 0.3 }, 4.0)
    .to(animState, { maskOpacity: 0.0, duration: 0.4 }, 4.1) // Fade mask out
    .to(animState, { brutalistOpacity: 1.0, duration: 0.5, ease: "power2.inOut" }, 4.2)
    .to('#br-shell', { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 4.2)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 4.3)
    .add(() => { if(typeof switchBrutalistChapter !== "undefined") switchBrutalistChapter(0); }, 4.2);"""

new_timeline_end = """    // 4. Transition to Editorial Procedural Worlds (5.5 to 6.0)
    .to(".hero-title-container", { opacity: 0, scale: 1.1, duration: 0.3 }, 5.5)
    .to(animState, { maskOpacity: 0.0, duration: 0.4 }, 5.6) // Fade mask out
    .to(animState, { brutalistOpacity: 1.0, duration: 0.5, ease: "power2.inOut" }, 5.7)
    .to('#br-shell', { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 5.7)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 5.8)
    .add(() => { if(typeof switchBrutalistChapter !== "undefined") switchBrutalistChapter(0); }, 5.7);"""
js = js.replace(old_timeline_end, new_timeline_end)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("main.js fixed.")
