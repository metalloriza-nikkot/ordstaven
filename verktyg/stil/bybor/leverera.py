# Skriver byborna till ut/figurer/<namn>/<namn>_<riktning>_01.png (läst ur paletten) och två förhandsbilder.
import os, sys; sys.argv = sys.argv[:1]
HAR = '/home/claude/bybor'; os.chdir(HAR)
exec(open('bybor.py').read())
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
from PIL import Image, ImageDraw, ImageFont
P = Palett(); B = alla(); UT = os.path.join(HAR, 'ut')
for n, d in B.items():
    os.makedirs(f'{UT}/figurer/{n}', exist_ok=True)
    for r, im in d.items():
        d[r] = P.las_bild(im, f'{n}_{r}'); d[r].save(f'{UT}/figurer/{n}/{n}_{r}_01.png')
INK = '/home/claude/inkorg/figurer/'
def skugga(w):
    sk = Image.new('RGBA', (w, 4), (0, 0, 0, 0))
    for yy in range(4):
        for xx in range(w):
            if ((xx + .5 - w / 2) / (w * .38)) ** 2 + ((yy + .5 - 2) / 1.6) ** 2 <= 1: sk.putpixel((xx, yy), (20, 30, 10, 90))
    return sk
def stall(ov, im, x, yb):
    sk = skugga(16 if im.width <= 16 else 20); ov.alpha_composite(sk, (x + (im.width - sk.width) // 2, yb - 3))
    ov.alpha_composite(im, (x, yb - im.height))
# 1. arket: en rad per figur, ner, höger, vänster, upp. Hjälten och Farfar överst för storleken.
S = 6; RAD = 30; W = 150; namn = {'tant_rosa': 'Tant Rosa', 'fiskaren': 'Fiskaren', 'tvatterskan': 'Tvätterskan', 'barnet': 'Barnet', 'bo': 'Bo'}
bit = Image.open('/home/claude/skiss2/ut/02_byn_morgon.png').convert('RGBA').crop((318, 66, 318 + W, 66 + 60))   # torgets kullersten
ov = Image.new('RGBA', (W, 4 + 6 * RAD))
for y0 in range(0, ov.height, 60): ov.alpha_composite(bit, (0, y0))
stall(ov, Image.open(INK + 'hjalte/hjalte_ga_ner_01.png').convert('RGBA'), 10, 28)
stall(ov, Image.open(INK + 'farfar/farfar_morgon_ner_01.png').convert('RGBA'), 32, 28)
for i, (n, d) in enumerate(B.items()):
    yb = 28 + (i + 1) * RAD
    for c, r in enumerate(('ner', 'hoger', 'vanster', 'upp')):
        im = d[r]; stall(ov, im, 10 + c * 26 - (im.width - 16) // 2, yb)
big = ov.resize((W * S, ov.height * S), Image.NEAREST)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
ram = Image.new('RGBA', (big.width + 260, big.height), (250, 246, 236, 255)); ram.alpha_composite(big, (0, 0)); dr = ImageDraw.Draw(ram)
dr.text((big.width + 16, 28 * S - 70), 'hjälten och Farfar\n(för storleken)', fill=(60, 50, 40), font=f)
for i, n in enumerate(B): dr.text((big.width + 16, (28 + (i + 1) * RAD) * S - 90), namn[n], fill=(60, 50, 40), font=f)
for c, r in enumerate(('ner', 'höger', 'vänster', 'upp')): dr.text((10 * S + c * 26 * S + 10, 8), r, fill=(255, 255, 255), font=f, stroke_width=2, stroke_fill=(40, 30, 20))
ram.save('/mnt/user-data/outputs/bybor_grundstallning_x6.png')
# 2. på torget i spelets storlek (x3), som femsekunderstestet
t = Image.open('/home/claude/skiss2/ut/02_byn_morgon.png').convert('RGBA').crop((300, 40, 620, 232))
for (n, r, x, yb) in (('tant_rosa', 'ner', 150, 92), ('fiskaren', 'vanster', 236, 58), ('tvatterskan', 'hoger', 40, 70),
                      ('barnet', 'ner', 100, 52), ('bo', 'upp', 60, 96)):
    stall(t, B[n][r], x, yb)
stall(t, Image.open(INK + 'hjalte/hjalte_ga_upp_01.png').convert('RGBA'), 152, 128)
t.resize((t.width * 3, t.height * 3), Image.NEAREST).save('/mnt/user-data/outputs/bybor_pa_torget_x3.png')
print('klart')
# 3. gången: <namn>_ga_<riktning>_01–04 (bild 1 och 3 är grundställningen)
ANIM['vy'] = None
G = gang()
for n, d in G.items():
    for r, bilder in d.items():
        for i, im in enumerate(bilder, 1):
            P.las_bild(im, n).save(f'{UT}/figurer/{n}/{n}_ga_{r}_{i:02d}.png')
print('gången klar')
