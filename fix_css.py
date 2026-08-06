import re

with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace hardcoded red in hero words
old_hero_word = """color: #ff1a2b; /* Vibrant aggressive red */"""
new_hero_word = """color: var(--c-blue); /* Premium Sky Blue */"""
css = css.replace(old_hero_word, new_hero_word)

old_hero_word_outline = """-webkit-text-stroke: 2px #ff1a2b;"""
new_hero_word_outline = """-webkit-text-stroke: 2px var(--c-gold);"""
css = css.replace(old_hero_word_outline, new_hero_word_outline)

old_hero_sub = """-webkit-text-stroke: 1.5px #ff1a2b;"""
new_hero_sub = """-webkit-text-stroke: 1.5px var(--c-blue);"""
css = css.replace(old_hero_sub, new_hero_sub)

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS Typography colors fixed.")
