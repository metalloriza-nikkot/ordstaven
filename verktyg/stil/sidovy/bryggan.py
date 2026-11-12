# Sidovyn under bryggan i kapitel 2 (10g, *Mellanscenerna*): baronen sitter i leran under bryggan och gräver med
# spaden. Herr Skata sitter på en påle, en stövel sticker upp ur leran, och en fisk sprattlar. Bryggan går tvärs över
# bilden ovanför, och hjälten och ungen kan gå på den (fötterna på y 74). Långt bort syns vassbyn med radiomasten.
#   sidovyer/under_bryggan_bakgrund.png     320 x 192
#   sidovyer/under_bryggan_baronen_01..03   48 x 40: gräver (spaden uppe), gräver (leran yr) och håller upp bit 7
#   sidovyer/under_bryggan_fisk_01..02      14 x 10
# Herr Skata är `figurer/herr_skata/herr_skata_sitta_vanster_01–02` på pålen (SKATA_POS).
import os, sys, math, random
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.dirname(HAR)
src = open(os.path.join(HAR, 'bron.py')).read().split("BILDER = {")[0]
exec(src)                                                  # Duk, MAT, baronens färger, P, hx2, bakgrundens himmel
LERA = ['#241c16', '#2a2018', '#43362a', '#5e4a36', '#7e838c']
V2 = ['#1E3E6A', '#2E5E94', '#3E7EBA', '#6AA6D8', '#B8E0F4']
VASS = ['#16302a', '#1e4436', '#285a44', '#347054', '#4e8a62']

def himmel(p, W, H, rnd):
    for y in range(H):
        for x in range(W): p[x, y] = hx2('#9AD0F0' if y < 40 else '#B8E0F4')
    for (cx, cy, r, c, k) in [(262, 20, 6, '#F2D22E', '#FFFBEA'), (284, 11, 4, '#FFFBEA', '#FFFFFF'), (300, 21, 2, '#F08A2A', '#F08A2A')]:
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r + r * 0.6: p[cx + x, cy + y] = hx2(k if (x < 0 and y < 0 and x * x + y * y < r * r * 0.35) else c)
    for (cx, cy) in [(52, 16), (150, 24)]:
        for y in range(-4, 5):
            for x in range(-12, 13):
                if (x / 12) ** 2 + (y / 4) ** 2 <= 1: p[cx + x, cy + y] = hx2('#FFFFFF' if y < 1 else '#E8F2FA')

def bakgrund():
    W, H = 320, 192
    im = Image.new('RGBA', (W, H)); p = im.load(); rnd = random.Random(21)
    himmel(p, W, H, rnd)
    # vassbyn långt bort på andra stranden: tak, pålar och radiomasten (beslut 81.4: förra och nästa regionens landmärke)
    for x in range(W):
        for y in range(52, 62): p[x, y] = hx2('#7aa070' if y > 55 else '#8fb27e')
    for (x0, b, h) in [(18, 26, 9), (52, 20, 8), (196, 30, 10), (238, 22, 8)]:
        for y in range(58 - h, 58):
            t = (y - (58 - h)) / h; ins = int((1 - t) * b * 0.3)
            for x in range(x0 + ins, x0 + b - ins): p[x, y] = hx2('#b8a878' if y < 58 - h // 2 else '#8a7a5a')
    for y in range(24, 52): p[228, y] = hx2('#6e7a88'); p[229, y] = hx2('#8e98a4')
    for (y, w) in ((30, 2), (38, 3), (46, 4)):
        for x in range(228 - w, 230 + w): p[x, y] = hx2('#6e7a88')
    p[228, 23] = hx2('#e86a5a'); p[229, 23] = hx2('#e86a5a')
    # vattnet
    for y in range(62, 128):
        for x in range(W):
            c = V2[2] if y > 66 else V2[3]
            if (x * 5 + y * 11) % 331 == 0: c = V2[4]
            p[x, y] = hx2(c)
    # leran under bryggan, ned mot oss: mörk och blank
    for y in range(120, H):
        for x in range(W):
            kant = 120 + int(3 * math.sin(x / 17.0) + 2 * math.sin(x / 6.0))
            if y < kant: continue
            c = LERA[2] if y < kant + 3 else LERA[1]
            if y == kant: c = LERA[3]
            if (x * 7 + y * 3) % 157 == 0: c = LERA[3]
            if (x * 13 + y * 5) % 173 == 0: c = LERA[4]
            p[x, y] = hx2(c)
    # pålarna ned i vattnet och leran, och bryggans däck tvärs över
    for px_ in range(10, W, 46):
        for y in range(80, 168):
            if y > 122 + (px_ % 3):
                for k, c in enumerate((TRA[1], TRA[2], TRA[3], TRA[1])): p[px_ + k, y] = hx2(c if y < 150 else LERA[0] if k == 0 else c)
            else:
                for k, c in enumerate((TRA[0], TRA[2], TRA[3], TRA[1])): p[px_ + k, y] = hx2(c)
        for y in range(120, 124): p[px_ - 1, y] = hx2(V2[4]); p[px_ + 4, y] = hx2(V2[4])
    for y in range(74, 84):
        for x in range(W):
            c = TRA[3]
            if y == 74: c = TRA[4]
            if y in (82, 83): c = TRA[0]
            if y in (76, 77, 78, 79, 80, 81) and x % 9 == 0: c = TRA[1]
            p[x, y] = hx2(c)
    for y in range(84, 88):                                  # bjälken under däcket och skuggan på vattnet
        for x in range(W): p[x, y] = hx2(TRA[1] if y < 86 else V2[1])
    for y in range(88, 96):
        for x in range(W):
            if (x + y) % 3 == 0 and y < 92: p[x, y] = hx2(V2[1])
    # en förtöjningspåle som sticker upp genom däcket, där Herr Skata sitter
    for y in range(60, 84):
        for k, c in enumerate((TRA[0], TRA[3], TRA[2], TRA[1], TRA[0])): p[100 + k, y] = hx2(c)
    for k in range(5): p[100 + k, 60] = hx2(TRA[4])
    # stöveln som sticker upp ur leran, och vass vid kanterna
    for (x, y, c) in [(x, y, '#2a2830') for x in range(70, 76) for y in range(150, 160)] + [(x, 150, '#4a4a54') for x in range(70, 77)] + \
                     [(x, y, '#34343c') for x in range(74, 80) for y in range(158, 162)]:
        p[x, y] = hx2(c)
    for k in range(24):
        x = (k * 13 + rnd.randint(0, 6)) % W
        if 110 < x < 230: continue
        h = rnd.randint(18, 34)
        for i in range(h):
            yy = 191 - i; xx = x + int((i / h) ** 2 * rnd.choice((-2, 2)))
            if 0 <= xx < W: p[xx, yy] = hx2(VASS[2] if i < h * 0.6 else VASS[3])
        if rnd.random() < 0.5:
            for i in range(3): p[max(0, min(W - 1, x)), 191 - h - i] = hx2('#5a3e24')
    return im

def baron_lera(f=0):
    """Baronen sitter i leran till midjan, från sidan och vänd åt höger, och gräver med spaden."""
    d = Duk(48, 40); ox, oy = 8, 6
    def e(cx, cy, rx, ry, m, n, **k): d.ellips(cx + ox, cy + oy, rx, ry, m, n, **k)
    e(11.0, 16.0, 6.8, 6.4, 'jacka', 'kropp')
    e(13.2, 8.6, 4.4, 4.0, 'hud', 'huvud')
    e(12.6, 4.6, 4.2, 3.0, 'hjalm', 'kupol'); e(12.8, 6.6, 6.8, 1.5, 'hjalm', 'brätte', zbias=0.1)
    e(17.2, 9.8, 1.5, 1.2, 'nos', 'nos', zbias=0.2)
    if f == 2:                                              # håller upp biten med båda händerna
        e(15.0, 10.6, 1.6, 2.8, 'jacka', 'arm', zbias=0.05); e(16.0, 7.2, 1.3, 1.1, 'hud', 'hand')
    else:
        e(15.6, 13.6 - (2 if f == 0 else 0), 3.0, 1.5, 'jacka', 'arm', zbias=0.05)
        e(18.8, 12.6 - (2 if f == 0 else 0), 1.3, 1.1, 'hud', 'hand')
    skilj(d, 'arm', 'kropp', ton=1); skilj(d, 'huvud', 'kropp', ton=1); skilj(d, 'brätte', 'huvud', ton=1); skilj(d, 'brätte', 'kupol', ton=1)
    fjader(d, [(8 + ox, 4 + oy), (7 + ox, 3 + oy), (7 + ox, 2 + oy), (6 + ox, 1 + oy), (6 + ox, oy)])
    d.kontur()
    for x in range(9 + ox, 17 + ox):
        if d.del_.get((x, 5 + oy)) == 'kupol': d.fast(x, 5 + oy, BAND)
    d.fast(15 + ox, 8 + oy, OGA if f != 2 else OGA); d.fast(14 + ox, 10 + oy, KIND)
    if f == 2: d.fast(16 + ox, 12 + oy, MUN); d.fast(17 + ox, 12 + oy, MUN); d.fast(15 + ox, 11 + oy, MUN)   # han ler
    else: d.fast(16 + ox, 12 + oy, MUN)
    for (x, y, c) in [(12, 13, '#C83A3A'), (11, 14, '#3A8A3A')]: d.fast(x + ox, y + oy, c); d.fast(x + ox, y + 1 + oy, MAS)
    im = d.bild()
    # spaden: skaft i trä och ett blad av järn
    if f == 0: skaft = [(28 + i, 16 - i) for i in range(9)]; blad = (36, 6)
    elif f == 1: skaft = [(27 + i, 18 + i // 2) for i in range(10)]; blad = (36, 22)
    else: skaft = []; blad = None
    for (x, y) in skaft: im.putpixel((x, y), hx2('#7A522C')); im.putpixel((x, y + 1), hx2('#5A3A1E'))
    if blad:
        bx, by = blad
        for y in range(by, by + 5):
            for x in range(bx, bx + 4): im.putpixel((x, y), hx2('#9EA0AE' if x < bx + 2 else '#6E6E80'))
    if f == 1:                                              # leran yr
        for (x, y) in [(40, 18), (42, 14), (44, 17), (39, 12), (45, 21)]:
            im.putpixel((x, y), hx2(LERA[3])); im.putpixel((x, y + 1), hx2(LERA[1]))
    if f == 2:                                              # bit 7: en riven kartbit i gulnat papper, med en ros i mässing
        for y in range(0, 10):
            for x in range(21, 33):
                riv = 32 - (1 if y % 3 == 1 else 0) - (2 if y % 3 == 2 else 0)
                if x > riv: continue
                c = '#E8D8B0' if (x + y) % 5 else '#D8C49A'
                if x == 21 or y == 0: c = '#F2E8C8'
                if y == 9 or x == riv: c = '#A68E52'
                im.putpixel((x, y), hx2(c))
        for (x, y) in [(23, 3), (24, 4), (25, 4), (26, 5), (27, 6), (28, 6)]: im.putpixel((x, y), hx2('#7A522C'))   # en väg på kartan
        for (x, y, c) in [(29, 2, '#C8963E'), (30, 3, '#8E6A22'), (28, 3, '#E6BC66'), (29, 4, '#8E6A22')]: im.putpixel((x, y), hx2(c))
    # leran runt midjan: allt under raden 28 är lera, med en blank kant
    p = im.load()
    for y in range(28, 40):
        for x in range(48):
            u = ((x + .5 - 22) / 21) ** 2 + ((y + .5 - 31) / 4.2) ** 2
            if y >= 31 and u > 1: p[x, y] = (0, 0, 0, 0); continue
            if u <= 1 or (y >= 28 and p[x, y][3] and y >= 30):
                c = LERA[2] if y < 31 else LERA[1]
                if u > 0.75: c = LERA[0]
                if y == 29 and (x + f) % 5 == 0: c = LERA[4]
                if u <= 1: p[x, y] = hx2(c)
    for y in range(35, 40):
        for x in range(48): p[x, y] = (0, 0, 0, 0)
    return im

def fisk_lera(f):
    im = Image.new('RGBA', (14, 10), (0, 0, 0, 0))
    lut = -0.5 if f == 1 else 0.5
    for i in range(-4, 5):
        x = 7 + i; y = 5 + int(i * lut)
        for w in (-1, 0, 1):
            if abs(i) == 4 and w: continue
            im.putpixel((x, y + w), hx2('#C8CED8' if w < 0 else '#8AA0B0' if w == 0 else '#5A6878'))
    im.putpixel((2, 5 - int(-5 * lut) - 1), hx2('#5A6878')); im.putpixel((2, 5 - int(-5 * lut) + 1), hx2('#5A6878'))
    im.putpixel((10, 4 + int(3 * lut)), hx2('#101C1C'))
    return im

BILDER = {
    'sidovyer/under_bryggan_bakgrund': bakgrund(),
    'sidovyer/under_bryggan_baronen_01': baron_lera(0),
    'sidovyer/under_bryggan_baronen_02': baron_lera(1),
    'sidovyer/under_bryggan_baronen_03': baron_lera(2),
    'sidovyer/under_bryggan_fisk_01': fisk_lera(1),
    'sidovyer/under_bryggan_fisk_02': fisk_lera(2),
}
BARON_POS = (150, 128)      # baronens bild (övre vänstra hörnet), i leran mellan två pålar
SKATA_POS = (95, 49)        # Herr Skata på förtöjningspålen (x 100–104, toppen y 60)
FISK_POS = (226, 150)

def las_till(im, namn):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3]: px[x, y] = hx2(P.narmast('#%02x%02x%02x' % c[:3])[0])[:3] + (c[3],)
    return P.las_bild(im, namn)

if __name__ == '__main__':
    for k, v in BILDER.items():
        f = os.path.join(HAR, 'ut', k + '.png'); os.makedirs(os.path.dirname(f), exist_ok=True)
        BILDER[k] = las_till(v, os.path.basename(k)); BILDER[k].save(f)
    for i, bar in enumerate(('01', '02', '03')):
        s = BILDER['sidovyer/under_bryggan_bakgrund'].copy()
        s.alpha_composite(BILDER['sidovyer/under_bryggan_baronen_' + bar], BARON_POS)
        s.alpha_composite(LD('figurer/herr_skata/herr_skata_sitta_vanster_01.png'), SKATA_POS)
        s.alpha_composite(BILDER['sidovyer/under_bryggan_fisk_0' + str(1 + i % 2)], FISK_POS)
        h = LD('figurer/hjalte/hjalte_ga_hoger_01.png'); u = LD('figurer/unge/unge1_ga_hoger_01.png')
        s.alpha_composite(u, (40, 74 - 24)); s.alpha_composite(h, (66, 74 - 24))
        s.resize((960, 576), Image.NEAREST).save(os.path.join(HAR, f'under_bryggan_prov_{i + 1}_x3.png'))
    print('klar')
