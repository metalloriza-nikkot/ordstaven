# Kapitel 2 (beslut 93.7): två små bilder uppifrån som saknades.
# - baronen_lera_ner_01–02 (24 x 24): baronen till knäna i leran vid bryggan, samma lerpöl som hjälten och ungen
#   (lagen_k2.i_leran). Bild 2 vickar och skvätter, och han tittar surt ned. Ingen ny figur: hans egen stillbild.
# - foremal/trask/kartbit_3_golv (24 x 19): kartbit 3 som den ligger på golvet, sedd uppifrån: den rivna formen,
#   floden och ön, vägen i rödbrunt och en skugga under. Läsbar i spelets storlek, inte en förminskad karta.
import os, sys
HAR = '/home/claude/bybor'; os.chdir(HAR)
G = {'__name__': 'lagen_k2', '__file__': os.path.join(HAR, 'lagen_k2.py')}
exec(open('lagen_k2.py').read().split("if __name__ == '__main__':")[0], G)
i_leran, hx, P = G['i_leran'], G['hx'], G['P']
from PIL import Image
INK = '/home/claude/inkorg'

def baron_lera(b):
    fig = Image.open(INK + '/figurer/baronen/baronen_ga_ner_01.png').convert('RGBA')
    if b == 2:   # vickar en pixel åt sidan
        f2 = Image.new('RGBA', fig.size, (0, 0, 0, 0)); f2.alpha_composite(fig, (1, 0)); fig = f2
    return i_leran(fig, 3, 21, bredd=10, b=b)

PAP = ['#5a4a36', '#b89c6c', '#d8c098', '#ecdcb4', '#f8f0d8']
def kartbit_golv():
    src = Image.open(INK + '/karta/kartbit_3.png').convert('RGBA')        # 75 x 58, samma rivna form
    W, H = 24, 19
    form = src.resize((22, 17), Image.LANCZOS)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    for y in range(17):                                                   # skuggan under, en pixel ned och åt höger
        for x in range(22):
            if form.getpixel((x, y))[3] > 110: p[x + 2, y + 2] = hx('#3a2a18')[:3] + (120,)   # palettens mörkbruna (94.3)
    for y in range(17):
        for x in range(22):
            if form.getpixel((x, y))[3] > 110:
                kant = any(form.getpixel((x + dx, y + dy))[3] <= 110 if 0 <= x + dx < 22 and 0 <= y + dy < 17 else True
                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                c = PAP[1] if kant else (PAP[3] if (x + y) % 5 else PAP[2])
                if not kant and y < 3 and x < 8: c = PAP[4]
                p[x + 1, y + 1] = hx(c)
    for y in range(H):                                                    # en mörk kant runt pappret
        for x in range(W):
            if p[x, y][3] != 255 and any(0 <= x + dx < W and 0 <= y + dy < H and p[x + dx, y + dy][3] == 255
                                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                if not (p[x, y][3] and x > 1 and y > 1): p[x, y] = hx(PAP[0])
    # floden längs övre kanten, med ön
    for (x, y) in [(2, 4), (3, 4), (4, 3), (5, 3), (6, 3), (7, 2), (8, 2), (2, 5), (3, 5), (6, 4), (7, 3)]:
        if p[x + 1, y + 1][3] == 255: p[x + 1, y + 1] = hx('#5e8cc8')
    p[5, 5] = hx('#3e7634')                                              # ön
    for (x, y) in [(6, 9), (8, 10), (12, 11), (15, 12), (18, 14)]:      # vägen i rödbrunt, streckad
        if p[x, y][3] == 255: p[x, y] = hx('#8a3a2a')
    for (x, y) in [(10, 13), (13, 14)]:                                   # vassbyns rosa tak
        if p[x, y][3] == 255: p[x, y] = hx('#d9789a')
    for (x, y) in [(15, 6), (17, 7), (19, 9)]:                           # vass
        if p[x, y][3] == 255: p[x, y] = hx('#3e7634')
    return im

def las(im):
    """Läs till paletten, också halvgenomskinliga skuggor (beslut 94.3): färgen byts, genomskinligheten står kvar."""
    p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if c[3]: p[x, y] = hx(P.narmast('#%02x%02x%02x' % c[:3])[0])[:3] + (c[3],)
    return im

if __name__ == '__main__':
    ut = {f'figurer/baronen/baronen_lera_ner_0{b}.png': las(baron_lera(b)) for b in (1, 2)}
    ut['foremal/trask/kartbit_3_golv.png'] = las(kartbit_golv())
    for rel, im in ut.items():
        f = os.path.join(HAR, 'ut', rel); os.makedirs(os.path.dirname(f), exist_ok=True); im.save(f)
    bg = Image.open(INK + '/rum/kap-02/tant_rosas_hus.png').convert('RGBA').crop((120, 100, 200, 140))
    bg.alpha_composite(ut['foremal/trask/kartbit_3_golv.png'], (10, 12))
    bg2 = Image.open(INK + '/rum/kap-02/bryggan.png').convert('RGBA')
    g = Image.new('RGBA', (80 + 4 + 80, 40), (0, 0, 0, 255)); g.alpha_composite(bg, (0, 0))
    b2 = bg2.crop((0, 0, 80, 40)).copy()
    for i, b in enumerate((1, 2)): b2.alpha_composite(ut[f'figurer/baronen/baronen_lera_ner_0{b}.png'], (8 + i * 30, 12))
    g.alpha_composite(b2, (84, 0))
    g.resize((g.width * 6, g.height * 6), Image.NEAREST).save('/tmp/uppifran_prov.png')
    print('klart', len(ut))
