import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

start_marker = "// ============================================================"
# Delete everything from BRUTALIST SECTION to the end of document.addEventListener
start_idx = js.find('// BRUTALIST SECTION — 4 Procedural Worlds')
if start_idx != -1:
    actual_start = js.rfind(start_marker, 0, start_idx)
    end_idx = js.rfind('});') # This is the end of DOMContentLoaded
    if actual_start != -1 and end_idx != -1:
        js = js[:actual_start] + "});\n"
        
        # Now remove any reference to brutalistOpacity, brutalistGroup, etc in animate()
        js = re.sub(r'if \(brutalistGroup && brutalistMaterial\) \{.*?\}', '', js, flags=re.DOTALL)
        js = re.sub(r'if \(typeof mountainParticles !== "undefined" && mountainParticles\) \{.*?mountainParticles\.material\.uniforms\.uOpacity\.value = 1\.0 - animState\.brutalistOpacity;\s*\}', 
                    'if (typeof mountainParticles !== "undefined" && mountainParticles) {\n        mountainParticles.material.uniforms.uTime.value = elapsedTime;\n        mountainParticles.material.uniforms.uFlightProgress.value = animState.birdFlight;\n    }', js, flags=re.DOTALL)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("main.js cleaned perfectly")
