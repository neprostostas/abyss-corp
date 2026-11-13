"""Build UI-sized WebP derivatives; preserve the full-resolution reference PNGs."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / 'visual-development/icon-redesign/v1'
target = root / 'prototype-3d/public/icons/generated-v1'
target.mkdir(parents=True, exist_ok=True)
report = []
for entry in json.loads((source / 'catalog.json').read_text()):
    name = entry['id']
    original = source / f'{name}.png'
    image = Image.open(original).convert('RGBA')
    bounds = image.getchannel('A').getbbox()
    image = image.crop(bounds)
    for size in (64, 128, 256):
        resized = image.copy()
        resized.thumbnail((round(size * .9), round(size * .9)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (size, size))
        canvas.paste(resized, ((size-resized.width)//2, (size-resized.height)//2))
        dest = target / f'{name}-{size}.webp'
        canvas.save(dest, 'WEBP', quality=88, method=6, exact=True)
    report.append({'id': name, 'originalBytes': original.stat().st_size,
                   'webpBytes': {str(s): (target/f'{name}-{s}.webp').stat().st_size for s in (64,128,256)}})
(target / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
print(f'{len(report)} icons: {sum(x["originalBytes"] for x in report):,} original bytes → '
      f'{sum(x["webpBytes"]["64"] for x in report):,} bytes at 64px')
