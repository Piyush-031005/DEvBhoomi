import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the chapter text animation so it HOLDS its opacity instead of vanishing
# Right now, newEl opacity is never set to 1! We only set it to 1 via CSS .active-ch, but inline opacity from previous fadeOut is 0!
old_gsap_in = """                // GSAP Typography Slam
                gsap.killTweensOf(newWords);
                gsap.fromTo(newWords, { y: '110%' }, {
                    y: '0%', duration: 0.85, ease: 'power4.out', stagger: 0.07, overwrite: true
                });"""

new_gsap_in = """                // Ensure container is fully visible
                gsap.set(newEl, { opacity: 1 });
                if (newBody) gsap.set(newBody, { opacity: 1, y: 0 });
                
                // GSAP Typography Slam
                gsap.killTweensOf(newWords);
                gsap.fromTo(newWords, { y: '110%' }, {
                    y: '0%', duration: 0.85, ease: 'power4.out', stagger: 0.07, overwrite: true
                });"""

js = js.replace(old_gsap_in, new_gsap_in)

# Also fix the image names. The user has woman.jpeg and smoking-man.jpeg instead of img4.jpeg
old_tex = """const t1 = texLoader.load('/img1.jpeg');
const t2 = texLoader.load('/img2.jpeg');
const t3 = texLoader.load('/img3.jpeg');
const t4 = texLoader.load('/img4.jpeg');"""

new_tex = """const t1 = texLoader.load('/img1.jpeg');
const t2 = texLoader.load('/img2.jpeg');
const t3 = texLoader.load('/img3.jpeg');
const t4 = texLoader.load('/smoking-man.jpeg'); // Fallback since img4 is missing"""

js = js.replace(old_tex, new_tex)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed GSAP fade in and image loading.")
