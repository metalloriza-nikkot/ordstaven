"""Ritar tillfälliga PWA-ikoner (public/icons/). Ersätts när stilspåret har tagit fram Ordstavens symbol.
Kör: python3 verktyg/ikoner.py  (kräver Pillow)"""
import os
from PIL import Image, ImageDraw

UT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(UT, exist_ok=True)
RAM, SOM, STAV, STJARNA = (42, 29, 22), (107, 76, 53), (192, 137, 74), (242, 193, 78)


def rita(storlek, maskable=False):
    # Ritas i 64×64 pixlar och skalas upp utan utjämning, så att ikonen blir pixlig som spelet.
    b = 64
    im = Image.new('RGB', (b, b), RAM)
    d = ImageDraw.Draw(im)
    m = 10 if maskable else 4
    d.rectangle([m, m, b - 1 - m, b - 1 - m], outline=SOM, width=2)
    # staven diagonalt
    for i in range(22):
        x, y = 18 + i, 46 - i
        d.rectangle([x, y, x + 2, y + 2], fill=STAV)
    # stjärna i toppen
    cx, cy = 42, 22
    for dx, dy in [(0, -6), (0, 6), (-6, 0), (6, 0)]:
        d.line([cx, cy, cx + dx, cy + dy], fill=STJARNA, width=3)
    d.rectangle([cx - 2, cy - 2, cx + 2, cy + 2], fill=(255, 236, 170))
    return im.resize((storlek, storlek), Image.NEAREST)


for s in (180, 192, 512):
    rita(s).save(os.path.join(UT, f'ikon-{s}.png'))
rita(512, maskable=True).save(os.path.join(UT, 'ikon-maskable-512.png'))
print('ikoner klara')
