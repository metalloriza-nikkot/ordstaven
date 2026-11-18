import os, sys
sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
from PIL import Image, ImageDraw, ImageFont
G = {}
exec(open('/home/claude/k3/flodfolket.py').read().split("if __name__ == '__main__':")[0], G)
S = {}; exec(open('/home/claude/k3/skoldpadda.py').read().split("if __name__ == '__main__':")[0], S)
Hh = {}; exec(open('/home/claude/k3/hornen.py').read().split("if __name__ == '__main__':")[0], Hh)
g = G['gang']()
INK = '/home/claude/inkorg/figurer/'
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
SAND = (222, 202, 150, 255); VAT = (62, 126, 186, 255)
# rad 1: figurerna åt fyra håll, med hjälten, Tant Rosa och fiskaren som jämförelse
r1 = Image.new('RGBA', (360, 34), SAND); x = 4
for n in G['FIGURER']:
    for r in ('ner', 'hoger', 'vanster', 'upp'):
        r1.alpha_composite(P.las_bild(g[n][r][0]), (x, 6)); x += 18
    x += 8
for p in ('hjalte/hjalte_ga_ner_01.png', 'tant_rosa/tant_rosa_ner_01.png', 'fiskaren/fiskaren_ner_01.png'):
    im = Image.open(INK + p).convert('RGBA'); r1.alpha_composite(im, (x - (im.width - 16) // 2, 6)); x += 22
# rad 2: sköldpaddan på sandbanken med hjälten, och ön i floden
r2 = Image.new('RGBA', (360, 150), SAND)
for y in range(0, 52):
    for xx in range(0, 360): r2.putpixel((xx, y), VAT)
for y in range(52, 150):
    for xx in range(200, 360): r2.putpixel((xx, y), VAT)
k = P.las_bild(S['kropp_sandbanken']()); r2.alpha_composite(k, (6, 4))
r2.alpha_composite(P.las_bild(S['fena']('sanden')), (6 + 88 - 36 - 22, 4 + 104 - 20))
r2.alpha_composite(P.las_bild(S['huvud']('vilar')), (6 + 88 - 22, 4 + 96))
r2.alpha_composite(Image.open(INK + 'hjalte/hjalte_ga_ner_01.png').convert('RGBA'), (150, 112))
r2.alpha_composite(Image.open(INK + 'unge/unge1_ater_ner_01.png').convert('RGBA'), (166, 116))
r2.alpha_composite(P.las_bild(S['on_floden']()), (232, 60))
# rad 3: huvudets lägen, fenans lägen och hornen
r3 = Image.new('RGBA', (360, 64), (154, 124, 86, 255))
for i, l in enumerate(('vilar', 'lyft', 'ropar', 'nickar', 'tittar')): r3.alpha_composite(P.las_bild(S['huvud'](l)), (2 + i * 34, 4))
r3.alpha_composite(P.las_bild(Hh['stora_hornet']('mjol')), (176, 4)); r3.alpha_composite(P.las_bild(Hh['stora_hornet']('rent')), (266, 4))
r3.alpha_composite(P.las_bild(Hh['frukosthorn']()), (150, 48))
r3b = Image.new('RGBA', (360, 30), SAND)
for i, l in enumerate(('sanden', 'lyft', 'trappa')): r3b.alpha_composite(P.las_bild(S['fena'](l)), (4 + i * 48, 1))
alla = Image.new('RGBA', (360, 34 + 150 + 64 + 30 + 6), (250, 246, 236, 255))
y = 0
for r in (r1, r2, r3, r3b): alla.alpha_composite(r, (0, y)); y += r.height + 2
alla.resize((alla.width * 4, alla.height * 4), Image.NEAREST).save('/mnt/user-data/outputs/kap3_design_x4.png')
print(alla.size)
