import re

with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix headline size so it's not congested
old_headline = """.br-headline {
  font-size: clamp(3rem, 6vw, 7rem);
  font-weight: 900;
  color: var(--c-red);
  line-height: 1;
  letter-spacing: -0.02em;
}"""

new_headline = """.br-headline {
  font-size: clamp(2rem, 5vw, 5.5rem);
  font-weight: 900;
  color: var(--c-red);
  line-height: 1;
  letter-spacing: -0.02em;
}"""

css = css.replace(old_headline, new_headline)

# Make .br-word display inline-block so it wraps better instead of stacking 3 huge lines
old_word = """.br-word {
  display: block;
  color: var(--c-polar);
  transform: translateY(110%);
  transition: none; /* GSAP handles this */
}"""

new_word = """.br-word {
  display: inline-block;
  margin-right: 0.15em;
  color: var(--c-polar);
  transform: translateY(110%);
  transition: none; /* GSAP handles this */
}"""

css = css.replace(old_word, new_word)

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Fixed CSS layout congestion.")
