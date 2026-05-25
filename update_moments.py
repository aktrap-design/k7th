import json
import random

json_path = '/Users/akit/Documents/antiGravity/gallery/gallery.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Keywords that suggest a dramatic or specific moment
moment_keywords = ['N', 'FES', 'sunrise', 'LOCATION', 'em', 'Ev']

updated_count = 0

for item in data.get('gallery', []):
    if item['category'] == 'LIFE':
        # Check if alt text contains any of the moment keywords
        is_moment = any(kw in item['alt'] for kw in moment_keywords)
        # Add a bit of randomness so we get a good split
        if is_moment and random.random() > 0.3: # 70% chance if keyword matches
            item['category'] = 'MOMENT'
            updated_count += 1
        elif random.random() > 0.8: # 20% chance for other LIFE items
            item['category'] = 'MOMENT'
            updated_count += 1

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Successfully converted {updated_count} items to MOMENT.")
