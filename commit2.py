import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace body fade-out animation
old_body_out = "gsap.to(oldBody, { opacity: 0, y: -20, duration: 0.3 });"
new_body_out = "gsap.to(oldBody, { opacity: 0, y: -10, duration: 0.4, ease: 'power2.in', overwrite: true });"
js = js.replace(old_body_out, new_body_out)

# Replace body fade-in animation
old_body_in = "gsap.fromTo(body, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.2 });"
new_body_in = "gsap.fromTo(body, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.0, delay: 0.3, ease: 'expo.out', overwrite: true });"
js = js.replace(old_body_in, new_body_in)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Commit 2 Applied")
