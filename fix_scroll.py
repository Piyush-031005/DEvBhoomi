import subprocess

old_js = subprocess.check_output(['git', 'show', '6ee8e56:src/main.js']).decode('utf-8')
with open('src/main.js', 'r', encoding='utf-8') as f:
    curr_js = f.read()

# The script truncated curr_js at line 557. Let's just remove the truncated part and append the full scroll logic from old_js
trunc_start = curr_js.find('    // ============================================================\n    // BRUTALIST UI SCROLL LOGIC')
if trunc_start != -1:
    curr_js = curr_js[:trunc_start]

# Now get the full scroll logic from old_js
old_start = old_js.find('    // ============================================================\n    // BRUTALIST UI SCROLL LOGIC')

curr_js += old_js[old_start:]

with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(curr_js)

print("Fixed truncated scroll logic")
