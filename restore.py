import subprocess
import re

# 1. Restore HTML
try:
    old_html = subprocess.check_output(['git', 'show', '6ee8e56:index.html']).decode('utf-8')
    with open('index.html', 'r', encoding='utf-8') as f:
        curr_html = f.read()
        
    start_marker = '<!-- Act 5: Brutalism x Uttarakhand — 4 Editorial Chapters -->'
    end_marker = '</main>'
    
    old_start = old_html.find(start_marker)
    old_end = old_html.find(end_marker, old_start)
    
    if old_start != -1 and old_end != -1:
        extracted_html = old_html[old_start:old_end]
        
        curr_end = curr_html.find(end_marker)
        if curr_end != -1:
            # Inject it right before </main>
            curr_html = curr_html[:curr_end] + "      " + extracted_html + "\n    " + curr_html[curr_end:]
            
            with open('index.html', 'w', encoding='utf-8') as f:
                f.write(curr_html)
            print("Successfully restored HTML chapters.")
except Exception as e:
    print(f"Failed HTML restore: {e}")

# 2. Restore JS
try:
    old_js = subprocess.check_output(['git', 'show', '6ee8e56:src/main.js']).decode('utf-8')
    with open('src/main.js', 'r', encoding='utf-8') as f:
        curr_js = f.read()
        
    # Extract BRUTALIST SECTION (up to animate())
    brutalist_section_start = old_js.find('// ============================================================\n// BRUTALIST SECTION')
    brutalist_section_end = old_js.find('function animate()')
    extracted_section1 = old_js[brutalist_section_start:brutalist_section_end]
    
    # Inject it before function animate()
    curr_animate = curr_js.find('function animate()')
    curr_js = curr_js[:curr_animate] + extracted_section1 + curr_js[curr_animate:]
    
    # Extract animate() additions
    curr_js = curr_js.replace('renderer.render(scene, camera);', '''        // Smooth damp hover
        if (typeof brutalistMaterial !== "undefined" && brutalistMaterial) {
            brutalistMaterial.uniforms.uHover.value = THREE.MathUtils.lerp(
                brutalistMaterial.uniforms.uHover.value, targetBrutalistHover, 0.1
            );
            // Scroll velocity
            brutalistMaterial.uniforms.uScrollVelocity.value = THREE.MathUtils.lerp(
                brutalistMaterial.uniforms.uScrollVelocity.value, window.lastScrollVelocity || 0, 0.05
            );
            // Mouse in UV space (0-1)
            const targetMouseUV = new THREE.Vector2(
                brutalistMouse.x,
                brutalistMouse.y
            );
            brutalistMaterial.uniforms.uMouse.value.lerp(targetMouseUV, 0.08);
            if(brutalistGroup) brutalistGroup.visible = (animState.brutalistOpacity > 0.005);
        }
        
    renderer.render(scene, camera);''')
    
    # Extract Timeline Additions
    # We want to transition to Procedural worlds from 4.0 to 4.5
    timeline_insert = curr_js.find('    // 4. Transition to Editorial Procedural Worlds')
    if timeline_insert == -1: # Wait, I didn't add this comment in the current masterTl?
        pass # I'll just append it to the end of the timeline
        
    # We will just append the scrolltrigger at the end of the file
    scroll_trigger_start = old_js.find('    // ============================================================\n    // BRUTALIST UI SCROLL LOGIC')
    scroll_trigger_end = old_js.find('});', scroll_trigger_start) # We will manually copy it to avoid syntax issues.
    
    # Let's extract the full BRUTALIST UI SCROLL LOGIC
    extracted_scroll = old_js[scroll_trigger_start:scroll_trigger_end]
    
    # Inject before the final `});` of DOMContentLoaded
    last_brace = curr_js.rfind('});')
    curr_js = curr_js[:last_brace] + extracted_scroll + curr_js[last_brace:]
    
    # We need to add the timeline transition back
    # Let's find the subtle mask interaction in current JS
    mask_interaction = curr_js.find('    // 3. Subtle Mask Interaction')
    mask_interaction_end = curr_js.find(';', mask_interaction) + 1
    
    transition_logic = """
    
    // 4. Transition to Editorial Procedural Worlds (4.0 to 4.5)
    .to(".hero-title-container", { opacity: 0, scale: 1.1, duration: 0.3 }, 4.0)
    .to(animState, { maskOpacity: 0.0, duration: 0.4 }, 4.1) // Fade mask out
    .to(animState, { brutalistOpacity: 1.0, duration: 0.5, ease: "power2.inOut" }, 4.2)
    .to('#br-shell', { opacity: 1, duration: 0.5, ease: 'power2.inOut' }, 4.2)
    .add(() => { document.getElementById('br-shell')?.classList.add('active'); }, 4.3)
    .add(() => { if(typeof switchBrutalistChapter !== "undefined") switchBrutalistChapter(0); }, 4.2);
"""
    curr_js = curr_js[:mask_interaction_end] + transition_logic + curr_js[mask_interaction_end:]
    
    with open('src/main.js', 'w', encoding='utf-8') as f:
        f.write(curr_js)
    print("Successfully restored JS logic.")
except Exception as e:
    print(f"Failed JS restore: {e}")
