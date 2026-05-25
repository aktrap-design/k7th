import json

json_path = '/Users/akit/Documents/antiGravity/gallery/gallery.json'

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

gallery = data.get('gallery', [])
num_items = len(gallery)
curated_indices = [int(i * num_items / 10) for i in range(10)]

curated = []
for idx in curated_indices:
    if idx < num_items:
        curated.append(gallery[idx])

data['curated'] = curated

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Added curated array to gallery.json")
