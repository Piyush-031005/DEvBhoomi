import re

with open('src/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Add hover effect for topbar labels
old_topbar = """.br-topbar-label {
  font-family: var(--f-condensed);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--c-fog);
}"""

new_topbar = """.br-topbar-label {
  font-family: var(--f-condensed);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: var(--c-fog);
  transition: color 0.3s ease, letter-spacing 0.3s ease;
  cursor: pointer;
}

.br-topbar-label:hover {
  color: var(--c-blue);
  letter-spacing: 0.25em;
}"""

css = css.replace(old_topbar, new_topbar)

# Add hover effect for bottombar items
old_bottombar = """.br-bottombar-item {
  font-family: var(--f-condensed);
  font-size: 0.65rem;
  font-weight: 300;
  letter-spacing: 0.2em;
  color: var(--c-fog);
}"""

new_bottombar = """.br-bottombar-item {
  font-family: var(--f-condensed);
  font-size: 0.65rem;
  font-weight: 300;
  letter-spacing: 0.2em;
  color: var(--c-fog);
  transition: color 0.3s ease, text-shadow 0.3s ease;
  cursor: pointer;
}

.br-bottombar-item:hover {
  color: var(--c-polar);
  text-shadow: 0 0 10px var(--c-polar);
}"""

css = css.replace(old_bottombar, new_bottombar)

with open('src/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Commit 4 CSS Applied")
