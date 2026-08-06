import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Wrap every br-word content with a br-word-inner span
# Only wrap if not already wrapped
def wrap_word(m):
    pre = m.group(1)
    cls_extra = m.group(2)
    text = m.group(3).strip()
    post = m.group(4)
    if 'br-word-inner' in text:
        return m.group(0)
    return f'{pre}<span class="br-word-inner">{text}</span>{post}'

html = re.sub(r'(<span class="br-word([^"]*)">\s*)([^<]+?)(\s*</span>)', wrap_word, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Wrapped br-word with br-word-inner')
