import re

with open('Module_Core.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix parsing of r[4] for myRevTarget
content = content.replace('myRevTarget += parseFloat(r[4]) || 0;', 'myRevTarget += parseFloat(String(r[4]).replace(/,/g, " \)) || 0;')

with open('Module_Core.html', 'w', encoding='utf-8') as f:
 f.write(content)

print(\Done\)
