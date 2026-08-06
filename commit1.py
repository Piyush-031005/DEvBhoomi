import re

with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace variables
css = css.replace('--c-red: #e8190a;', '--c-blue: #00BFFF;')
css = css.replace('--c-cyan: #00ffff;', '--c-gold: #FFD700;')

# Replace usage
css = css.replace('var(--c-red)', 'var(--c-blue)')
css = css.replace('var(--c-cyan)', 'var(--c-gold)')

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Lighting Overhaul in main.js
old_light = """const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#00ffff', 2.5); // Neon Cyan accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);"""

new_light = """const maskLight = new THREE.DirectionalLight('#00BFFF', 5.0); // Premium Sky Blue rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const goldLight = new THREE.DirectionalLight('#FFD700', 2.5); // Warm Gold accent light
goldLight.position.set(-5, -2, 5);
scene.add(goldLight);"""

js = js.replace(old_light, new_light)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Commit 1 Changes Applied")
