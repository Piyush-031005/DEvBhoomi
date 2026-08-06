import re

with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Restore red variables and usage
css = css.replace('--c-blue: #00BFFF;', '--c-red: #e8190a;')
css = css.replace('--c-gold: #FFD700;', '--c-cyan: #00ffff;')

css = css.replace('var(--c-blue)', 'var(--c-red)')
css = css.replace('var(--c-gold)', 'var(--c-cyan)')

# The fix_css script changed the hero words, let's revert that too
old_hero_word = """color: var(--c-red); /* Premium Sky Blue */"""
new_hero_word = """color: #ff1a2b; /* Vibrant aggressive red */"""
css = css.replace(old_hero_word, new_hero_word)

old_hero_word_outline = """-webkit-text-stroke: 2px var(--c-cyan);"""
new_hero_word_outline = """-webkit-text-stroke: 2px #ff1a2b;"""
css = css.replace(old_hero_word_outline, new_hero_word_outline)

old_hero_sub = """-webkit-text-stroke: 1.5px var(--c-red);"""
new_hero_sub = """-webkit-text-stroke: 1.5px #ff1a2b;"""
css = css.replace(old_hero_sub, new_hero_sub)

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("CSS restored to Red Brutalist")
