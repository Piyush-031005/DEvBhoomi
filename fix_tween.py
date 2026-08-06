import re

with open('src/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the tween killing bug
old_gsap_set = """                // Ensure container is fully visible
                gsap.set(newEl, { opacity: 1 });
                if (newBody) gsap.set(newBody, { opacity: 1, y: 0 });"""

new_gsap_set = """                // Kill any running fade-out tweens on the new element so it doesn't vanish!
                gsap.killTweensOf(newEl);
                if (newBody) gsap.killTweensOf(newBody);
                
                // Ensure container is fully visible
                gsap.set(newEl, { opacity: 1 });
                if (newBody) gsap.set(newBody, { opacity: 1, y: 0 });"""

js = js.replace(old_gsap_set, new_gsap_set)

# We should also kill the tweens on oldEl just to be safe, but gsap.to with overwrite: true usually handles that.
# Let's add overwrite: true to the oldEl fade out just in case.
old_fade_out = """                    gsap.to(oldEl, { 
                        opacity: 0, 
                        duration: 0.4, 
                        onComplete: () => oldEl.classList.remove('active-ch') 
                    });"""

new_fade_out = """                    gsap.to(oldEl, { 
                        opacity: 0, 
                        duration: 0.4,
                        overwrite: true,
                        onComplete: () => oldEl.classList.remove('active-ch') 
                    });"""

js = js.replace(old_fade_out, new_fade_out)

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Fixed vanishing text bug by killing old tweens.")
