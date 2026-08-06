import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove brutalist-act section completely
brutalist_act_start = html.find('<!-- Act 5: Brutalism x Uttarakhand')
brutalist_act_end = html.find('</main>')

if brutalist_act_start != -1:
    html = html[:brutalist_act_start] + html[brutalist_act_end:]

# 2. Fix typography missing on mask screen
# It was inside .hero-brutalist. Let's make sure z-index is super high.
# Actually, the opacity tween handles it, but let's ensure it's unmissable.
html = html.replace('z-index: 1;', 'z-index: 100;')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("index.html patched")


with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Fix topbar font
css = css.replace('.br-topbar-brand {\n  font-family: monospace;', '.br-topbar-brand {\n  font-family: var(--f-brand);')
css = css.replace('.br-topbar-brand {\r\n  font-family: monospace;', '.br-topbar-brand {\r\n  font-family: var(--f-brand);')
# Actually let's just forcefully replace the topbar font
if '.br-topbar-brand {' in css:
    css = re.sub(r'\.br-topbar-brand \{[^}]+\}', 
                 '.br-topbar-brand { font-family: var(--f-brand); font-size: 1.5rem; font-weight: 800; letter-spacing: 0.2em; color: #ffffff; text-transform: uppercase; }', 
                 css)

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("style.css patched")


with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix mask color
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

# 2. Fix timeline (Remove scale up, keep mask on screen, remove brutalist chapter switch)
tl_start = js.find('    // 3. Dramatic Mask Scale Up')
tl_end = js.find('// BRUTALIST UI SCROLL LOGIC', tl_start)

# We want the mask to just stay there, or subtly rotate.
new_tl = """    // 3. Subtle Mask Interaction (2.5 to 4.0)
    .to(animState, {
        maskRotY: Math.PI / 12, // Slight tilt instead of massive rotation
        duration: 1.5,
        ease: "power2.inOut"
    }, 2.5);
    
    // We remove the procedural shader transition entirely!
"""
if tl_start != -1 and tl_end != -1:
    js = js[:tl_start] + new_tl + "    " + js[tl_end:]

# 3. Ensure topbar is visible immediately by setting #br-shell opacity to 1 immediately
# The br-shell is controlled by brutalistOpacity, which is 0 initially.
# Let's remove brutalistOpacity control over #br-shell from timeline, and just show it.
# In main.js, I'll search for `#br-shell` and just add it to initial fade in.
js = js.replace(".to('#br-shell', { opacity: 1", "// removed br-shell fade in here")
# Add br-shell to the initial title fade in (at 1.5)
js = js.replace('ease: "power2.out"\n    }, 1.5)', 'ease: "power2.out"\n    }, 1.5)\n    .to("#br-shell", {opacity: 1, duration: 0.5}, 1.5)')

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("main.js patched")
