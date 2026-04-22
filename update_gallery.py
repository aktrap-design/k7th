import os
import json
import random

gallery_dir = '/Users/akit/Documents/antiGravity/gallery/images'
json_path = '/Users/akit/Documents/antiGravity/gallery/gallery.json'

files = [f for f in os.listdir(gallery_dir) if f.endswith('.png') or f.endswith('.jpg')]
files.sort()

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_gallery = []
categories = ["LIFE", "ART"]

for f in files:
    # Use part of the filename for a clean title
    title = f.replace('.png', '').replace('.jpg', '').replace('K7_', '')
    category = random.choice(categories)
    new_gallery.append({
        "src": f"images/{f}",
        "alt": title,
        "category": category
    })

data['gallery'] = new_gallery

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Updated gallery.json with {len(files)} images.")
