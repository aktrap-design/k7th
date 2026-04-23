import json
import os

json_path = '/Users/akit/Documents/antiGravity/gallery/gallery.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Reverse the gallery array
data['gallery'].reverse()

# 2. Change "ART" to "GRAPHIC" in categories
if 'categories' in data:
    data['categories'] = ["GRAPHIC" if c == "ART" else c for c in data['categories']]

# 3. Change "ART" to "GRAPHIC" in all gallery items
for item in data['gallery']:
    if item.get('category') == "ART":
        item['category'] = "GRAPHIC"

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("gallery.json updated successfully.")
