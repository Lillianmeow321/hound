import os
import re

def clean_md(content):
    content = re.sub(r'!\[[^\]]*\]\(https://[^)]*\)', '', content)
    content = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', content)
    content = re.sub(r'<br\s*/?>', '\n', content)
    content = re.sub(r'<[^>]+>', '', content)
    content = re.sub(r'https://my\.feishu\.cn/space/api/[^\s\)]+', '', content)
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content.strip()

count = 0
for root, dirs, files in os.walk('./data/memo'):
    for filename in files:
        if filename.endswith('.md'):
            path = os.path.join(root, filename)
            with open(path, 'r', encoding='utf-8') as f:
                original = f.read()
            cleaned = clean_md(original)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(cleaned)
            count += 1
            print('cleaned: ' + filename)

print('done: ' + str(count) + ' files')
