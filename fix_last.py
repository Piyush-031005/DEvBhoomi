import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix Lenis syncing with ScrollTrigger
old_lenis_raf = """function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);"""

new_lenis_raf = """lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);"""

js = js.replace(old_lenis_raf, new_lenis_raf)

# Fix mask material to White Cream
old_mat = """            if (child.material) {
                child.material.color.setHex(0xdfc27d); // Premium Pale Gold
                child.material.roughness = 0.2;
                child.material.metalness = 1.0;"""

new_mat = """            if (child.material) {
                child.material.color.setHex(0xf5f5dc); // White Cream
                child.material.roughness = 0.3;
                child.material.metalness = 0.5;"""

js = js.replace(old_mat, new_mat)

# Fix lighting to Red and Cream
old_light = """const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#00ffff', 2.5); // Neon Cyan accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);"""

new_light = """const maskLight = new THREE.DirectionalLight('#ff1a2b', 5.0); // Intense red rim light
maskLight.position.set(5, 5, -5);
scene.add(maskLight);

const cyanLight = new THREE.DirectionalLight('#ffffff', 3.0); // Bright White Cream accent light
cyanLight.position.set(-5, -2, 5);
scene.add(cyanLight);"""

js = js.replace(old_light, new_light)

# Increase pin duration so texts stay longer
old_pin = """    ScrollTrigger.create({
        trigger: '#brutalist-act',
        start: 'top top',
        end: '+=400%', // 4 chapters, pin for 400vh"""

new_pin = """    ScrollTrigger.create({
        trigger: '#brutalist-act',
        start: 'top top',
        end: '+=1000%', // 4 chapters, pin for 1000vh so they HOLD much longer
        snap: 1 / 3, // Snap to each chapter"""

js = js.replace(old_pin, new_pin)


with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed Lenis, colors, and scroll duration.")
