import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Restore red/cyan lighting
old_light = """const maskLight = new THREE.DirectionalLight('#00BFFF', 5.0); // Premium Sky Blue rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const goldLight = new THREE.DirectionalLight('#FFD700', 2.5); // Warm Gold accent light
goldLight.position.set(-5, -2, 5);
scene.add(goldLight);"""

new_light = """const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#00ffff', 2.5); // Neon Cyan accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);"""

js = js.replace(old_light, new_light)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS restored to Red Brutalist Lighting")
