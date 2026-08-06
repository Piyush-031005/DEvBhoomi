import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Delete procedural GLSL sections (from BRUTALIST SECTION to Handle Resize)
start_idx = js.find('// ============================================================\n// BRUTALIST SECTION')
end_idx = js.find('// Handle Resize')
if start_idx != -1 and end_idx != -1:
    js = js[:start_idx] + js[end_idx:]

# 2. Clean animate() loop
js = re.sub(r'    if \(brutalistGroup && brutalistMaterial\) \{.*?\}\n', '', js, flags=re.DOTALL)
js = re.sub(r'    // Atmospheric mist particles\n    if \(atmosMesh\) \{.*?\}\n', '', js, flags=re.DOTALL)

# 3. Change Mask material to Silver/Chrome
old_material = """                child.material.color.setHex(0x222222); // Dark graphite
                child.material.roughness = 0.3;
                child.material.metalness = 0.8;
                child.material.transparent = true;
                // Additive/Normal blending with opacity
                child.material.opacity = animState.maskOpacity;
                child.material.depthWrite = false; // Helps text show through cleanly"""
new_material = """                child.material.color.setHex(0xaaaaaa); // Chrome / Silver
                child.material.roughness = 0.1;
                child.material.metalness = 1.0;
                child.material.transparent = true;
                child.material.opacity = animState.maskOpacity;
                child.material.depthWrite = false;"""
js = js.replace(old_material, new_material)

# 4. Modify GSAP timeline to not scale up massively
tl_start = js.find('    // 3. Dramatic Mask Scale Up (2.5 to 4.0)')
tl_end = js.find('// ============================================================\n    // BRUTALIST UI SCROLL LOGIC')
if tl_start != -1 and tl_end != -1:
    new_tl = """    // 3. Subtle Mask Interaction
    .to(animState, {
        maskRotY: Math.PI / 12,
        duration: 1.5,
        ease: "power2.inOut"
    }, 2.5);
    
    """
    js = js[:tl_start] + new_tl + js[tl_end:]

# 5. Delete BRUTALIST UI SCROLL LOGIC block
scroll_logic_start = js.find('    // ============================================================\n    // BRUTALIST UI SCROLL LOGIC')
scroll_logic_end = js.rfind('});')
if scroll_logic_start != -1 and scroll_logic_end != -1:
    js = js[:scroll_logic_start] + js[scroll_logic_end:]

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("main.js patched properly")
