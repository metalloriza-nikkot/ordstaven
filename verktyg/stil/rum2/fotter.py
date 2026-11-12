# Vassfältets toppar vid fötterna (som gräset i A Link to the Past): spelet ritar bilden ovanpå figuren
# när hans fötter står där masken vassen_falt.png är vit. 24 x 8, två bilder som vajar.
import sys; sys.path.insert(0, '/home/claude/palett')
from palett import Palett
from PIL import Image
P = Palett()
GRAS = ['#4E6A2C', '#6A8A36', '#86A444', '#A0B858', '#BCCC72']; TOPP = '#D6C07E'
def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
for b in (0, 1):
    im = Image.new('RGBA', (24, 8), (0, 0, 0, 0)); p = im.load()
    for x in range(1, 23):
        kant = min(x, 23 - x)
        h = [4, 6, 5, 7, 5, 6][(x * 7) % 6] - (2 if kant < 3 else 0)
        for i in range(h):
            y = 7 - i
            xx = x + (1 if (b and i >= h - 2 and x % 2) else 0)
            c = [GRAS[2], GRAS[3], GRAS[1]][(x + i) % 3]
            if i == h - 1: c = TOPP if x % 4 == 0 else GRAS[4]
            if 0 <= xx < 24: p[xx, y] = hx(P.narmast(c.lower())[0])
    im.save(f'/home/claude/rum2/ut/figurer/omgivning/vass_fotter_{b + 1:02d}.png')
print('ok')
