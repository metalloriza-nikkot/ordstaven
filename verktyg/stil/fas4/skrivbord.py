# Fas 4: Farfars skrivbord i morgonljus, startskärmens bakgrund (skiss 2). Stil 2026-11-08.
# Ett skrivbord, inte ett golv: en enda bordsskiva med ådring men inga plankfogar, en framkant med tjocklek,
# ett grönt skrivunderlägg i läder, och Farfars saker runt kanterna. Solen faller in genom ett spröjsat fönster
# uppe till vänster. Snett uppifrån, ljus uppifrån till vänster, fyra toner per material (10b, Så ritas allt).
import math, random
exec(open('/home/claude/fas4/skiss.py').read().split("if __name__")[0])

TRA = ['#2A140C', '#4A2618', '#6A3622', '#8A4A2E', '#A8603A']          # mahogny
GRON = ['#14281A', '#1E3A24', '#2A4E30', '#36623A', '#4A7A48']         # skrivunderlägget
SVART = ['#0E0E12', '#1C1A20', '#2A2830', '#4A4A54', '#6A6876']
GLAS = ['#3A5A6A', '#6E9AAE', '#A8D0DE', '#E8F6FA']
W, H = 320, 192
KANT = 178                                     # bordets framkant
UNDERLAGG = (44, 38, 276, 172)

def skiva():
    im = ny(W, H); p = im.load()
    rnd = random.Random(8)
    knutar = [(rnd.randint(0, W), rnd.randint(0, KANT), rnd.uniform(6, 12)) for _ in range(5)]
    for y in range(KANT):
        for x in range(W):
            v = y + 2.6 * math.sin(x / 41 + y / 17) + 1.4 * math.sin(x / 13 + y * 0.7)
            for (kx, ky, r) in knutar:                      # ådringen böjer sig runt några kvistar
                d = math.hypot((x - kx) / 2.2, y - ky)
                if d < r * 2.4: v += (r * 2.4 - d) * 0.5
            s = math.sin(v / 2.1)
            t = 2
            if s > 0.86: t = 1
            elif s > 0.70 and (x + y) % 2: t = 1
            elif s < -0.93 and (x // 3 + y) % 5 == 0: t = 3
            p[x, y] = hx(TRA[t])
    d = ImageDraw.Draw(im)                                  # polerad yta: ett par långa blanka streck
    for (x0, y0, l) in ((60, 30, 70), (190, 120, 90), (20, 150, 40), (250, 60, 50)):
        d.line((x0, y0, x0 + l, y0), fill=hx(TRA[3])); d.line((x0 + l // 4, y0 + 1, x0 + l * 3 // 4, y0 + 1), fill=hx(TRA[3]))
    # framkanten: rundad kant, framsida med en list, skugga under
    rader = [(KANT, TRA[4]), (KANT + 1, TRA[3]), (KANT + 2, TRA[3]), (KANT + 3, TRA[2]), (KANT + 4, TRA[1]),
             (KANT + 5, TRA[2]), (KANT + 6, TRA[2]), (KANT + 7, TRA[3]), (KANT + 8, TRA[2]), (KANT + 9, TRA[1]),
             (KANT + 10, TRA[1]), (KANT + 11, TRA[0]), (KANT + 12, TRA[0]), (KANT + 13, TRA[0])]
    for (y, c) in rader:
        if y < H: d.line((0, y, W, y), fill=hx(c))
    return im

def underlagg(im):
    x0, y0, x1, y1 = UNDERLAGG; d = ImageDraw.Draw(im)
    d.rectangle((x0 + 2, y0 + 2, x1 + 2, y1 + 2), fill=hx(TRA[1]))                   # skugga
    d.rectangle((x0, y0, x1, y1), fill=hx(GRON[2]), outline=hx(GRON[0]))
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), outline=hx(GRON[3]))
    d.rectangle((x0 + 4, y0 + 4, x1 - 4, y1 - 4), outline=hx(MASS[1]))                # pressad bård i ockra (inte guld)
    p = im.load(); rnd = random.Random(3)
    for y in range(y0 + 6, y1 - 5):                                                     # läderytan
        for x in range(x0 + 6, x1 - 5):
            r = rnd.random()
            if r < 0.05: p[x, y] = hx(GRON[1])
            elif r < 0.08: p[x, y] = hx(GRON[3])
    for (cx, cy, sx, sy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):   # läderhörn
        for i in range(12):
            for j in range(12 - i):
                t = 3 if i == 0 or j == 0 else 2 if i + j < 9 else 1
                if i + j == 11: t = 0
                p[cx + sx * j, cy + sy * i] = hx(BOK[t])
    return im

def skugga(im, box, alfa=110):
    lag = ny(W, H); ImageDraw.Draw(lag).rectangle(box, fill=(26, 10, 4, alfa)); im.alpha_composite(lag)

def stav(langd=104):
    """Ordstaven liggande, efter stilguiden §5: svart, tjock och knölig, blanka streck, en knöl på mitten, LJUS ristat i guld,
    kall ände till vänster (rosa ytterst) och varm till höger (röd ytterst)."""
    hh = 13; im = ny(langd, hh); p = im.load()
    kall = ['#F2A0C0', '#7A3AA8', '#24308A', '#3A7AD8', '#6EC6E6']
    varm = ['#D83A2E', '#F08A2A', '#F2D22E', '#8CCB4A', '#3E8A3A']
    mitt = langd // 2
    for x in range(langd):
        topp = 3 + (1 if (x * 7) % 11 < 2 else 0) - (1 if (x * 5) % 13 == 0 else 0)
        if abs(x - mitt) <= 2: topp = 1 if abs(x - mitt) < 2 else 2                     # knölen
        botten = 10 - (1 if (x * 3) % 17 == 0 else 0)
        if x < 2 or x > langd - 3: topp += 1; botten -= 1                                # trubbiga ändar
        for y in range(topp, botten + 1):
            if x < 15: c = kall[min(4, x // 3)]
            elif x >= langd - 15: c = varm[min(4, (langd - 1 - x) // 3)]
            else: c = SVART[1] if y > topp + 1 else SVART[2]
            if y == topp: c = SVART[4] if 15 <= x < langd - 15 else c
            if y == botten: c = SVART[0]
            p[x, y] = hx(c)
        if 15 <= x < langd - 15 and (x * 13) % 9 < 3 and topp + 1 < botten: p[x, topp + 1] = hx(SVART[3])   # blanka streck
    for y in range(hh):                                                                  # kontur i barkens mörka
        for x in range(langd):
            if p[x, y][3] == 0 and any(0 <= x + a < langd and 0 <= y + b < hh and p[x + a, y + b][3] and p[x + a, y + b][:3] != hx(SVART[0])[:3]
                                       for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                p[x, y] = hx(SVART[0])
    # LJUS ristat i guld (fyra små tecken, 3 px höga, mellan knölen och den varma änden)
    tecken = {'L': [(0, 0), (0, 1), (0, 2), (1, 2)], 'J': [(1, 0), (1, 1), (0, 2), (1, 2)],
              'U': [(0, 0), (0, 1), (0, 2), (1, 2), (2, 0), (2, 1), (2, 2)], 'S': [(1, 0), (2, 0), (1, 1), (0, 2), (1, 2)]}
    x = mitt + 8
    for ch in 'LJUS':
        for (a, b) in tecken[ch]: p[x + a, 5 + b] = hx('#FFD95A')
        x += 4 if ch == 'U' else 3 + (1 if ch == 'S' else 0)
    return im

def lampa():
    """Fotogenlampa: mässingsfot, glasballong med en liten låga, ljuset runt den."""
    im = ny(28, 40); d = ImageDraw.Draw(im)
    d.ellipse((3, 30, 24, 39), fill=(26, 10, 4, 110))
    d.ellipse((4, 28, 23, 37), fill=hx(MASS[1]), outline=hx(MASS[0])); d.ellipse((6, 28, 21, 34), fill=hx(MASS[2]))
    d.line((8, 29, 14, 29), fill=hx(MASS[4]))
    d.rectangle((11, 18, 16, 29), fill=hx(MASS[2]), outline=hx(MASS[0])); d.line((12, 19, 12, 28), fill=hx(MASS[3]))
    d.ellipse((5, 4, 22, 21), fill=hx(GLAS[2]), outline=hx(GLAS[0])); d.ellipse((7, 6, 18, 17), fill=hx(GLAS[3]))
    d.ellipse((12, 9, 15, 15), fill=hx('#F08A2A')); d.ellipse((13, 10, 14, 13), fill=hx('#F2D22E'))
    d.line((8, 7, 9, 6), fill=hx('#FFFBEA')); d.rectangle((11, 1, 16, 4), fill=hx(MASS[2]), outline=hx(MASS[0]))
    return im

def blackhorn():
    """Bläckhorn i glas med en fjäderpenna."""
    im = ny(30, 34); d = ImageDraw.Draw(im)
    d.ellipse((3, 23, 22, 32), fill=(26, 10, 4, 110))
    d.rectangle((4, 16, 20, 29), fill=hx(GLAS[1]), outline=hx(GLAS[0])); d.rectangle((5, 20, 19, 28), fill=hx('#24308A'))
    d.line((6, 17, 6, 27), fill=hx(GLAS[3])); d.rectangle((8, 12, 16, 16), fill=hx(MASS[2]), outline=hx(MASS[0]))
    for i in range(18):                                                                  # pennan, snett upp åt höger
        x, y = 12 + i * 0.85, 15 - i * 0.8
        w = 0 if i < 3 else min(3, (i - 2) // 2 + 1)
        for k in range(-w, w + 1):
            d.point((x + k * 0.6, y + k * 0.6), fill=hx(PAPP[3] if k <= 0 else PAPP[1]))
        d.point((x, y), fill=hx(PAPP[0]))
    return im

def glasogon():
    im = ny(30, 12); d = ImageDraw.Draw(im)
    d.line((3, 10, 27, 10), fill=(26, 10, 4, 110))
    for cx in (8, 21):
        d.ellipse((cx - 6, 2, cx + 5, 10), outline=hx(MASS[0])); d.ellipse((cx - 5, 3, cx + 4, 9), fill=hx(GLAS[2]))
        d.line((cx - 3, 4, cx - 1, 4), fill=hx(GLAS[3]))
    d.line((13, 4, 16, 4), fill=hx(MASS[0])); d.line((1, 5, 0, 1), fill=hx(MASS[0])); d.line((28, 5, 29, 1), fill=hx(MASS[0]))
    return im

def kompass():
    im = ny(22, 22); d = ImageDraw.Draw(im)
    d.ellipse((2, 3, 21, 21), fill=(26, 10, 4, 110))
    d.ellipse((0, 0, 19, 19), fill=hx(MASS[2]), outline=hx(MASS[0])); d.ellipse((2, 2, 17, 17), fill=hx(PAPP[3]), outline=hx(MASS[1]))
    d.polygon([(9.5, 3), (11, 9.5), (9.5, 16), (8, 9.5)], fill=hx(SVART[2])); d.polygon([(9.5, 3), (11, 9.5), (8, 9.5)], fill=hx('#D83A2E'))
    d.point((9, 9), fill=hx(MASS[4])); d.line((4, 3, 6, 2), fill=hx(MASS[4]))
    return im

def solljus(im, falt=((22, -10), (118, -10), (88, 120), (-8, 120))):
    """Morgonsolen genom ett fönster med spröjs: ett snett ljust fält med ett kors av skugga i."""
    from PIL import ImageDraw as D
    mask = Image.new('L', (W, H), 0); dm = D.Draw(mask)
    dm.polygon(falt, fill=255)
    (ax, ay), (bx, by), (cx, cy), (dx, dy) = falt
    mx0, my0 = (ax + bx) / 2, (ay + by) / 2; mx1, my1 = (dx + cx) / 2, (dy + cy) / 2
    dm.line((mx0, my0, mx1, my1), fill=0, width=4)                                       # lodrät spröjs
    lx0, ly0 = (ax + dx) / 2, (ay + dy) / 2; lx1, ly1 = (bx + cx) / 2, (by + cy) / 2
    dm.line((lx0, ly0, lx1, ly1), fill=0, width=4)                                       # vågrät spröjs
    p = im.load(); m = mask.load(); cache = {}
    ljusare = {}                                                                         # samma material, ett steg ljusare
    for ramp, extra in ((TRA, ['#C27A4C', '#D89A68']), (GRON, ['#5E9258', '#78AA6A']), (BOK, ['#D8AE7A', '#E8C898'])):
        for i, c in enumerate(ramp): ljusare[hx(c)] = hx((ramp + extra)[i + 2])
    for y in range(H):
        for x in range(W):
            if not m[x, y]: continue
            kant = any(0 <= x + a < W and 0 <= y + b < H and not m[x + a, y + b] for a, b in ((2, 0), (-2, 0), (0, 2), (0, -2)))
            if kant and (x + y) % 2: continue                                            # rastrerad kant, som på SNES
            c = p[x, y]
            if c in ljusare: p[x, y] = ljusare[c]; continue
            f = 0.36
            q = (int(c[0] + (255 - c[0]) * f), int(c[1] + (232 - c[1]) * f), int(c[2] + (176 - c[2]) * f))
            if q not in cache: cache[q] = nar(q)
            p[x, y] = cache[q]
    return im

def skrivbord(ljus=True, saker=True):
    im = skiva(); underlagg(im)
    if saker:
        im.alpha_composite(lampa(), (6, 2)); im.alpha_composite(blackhorn(), (284, 4))
        im.alpha_composite(glasogon(), (44, 12)); im.alpha_composite(kompass(), (250, 8))
    if ljus: solljus(im)
    return im

if __name__ == '__main__':
    B = {'bord2': skrivbord(), 'bord2_morkt': skrivbord(ljus=False), 'stav_bord': stav()}
    sk = ny(108, 17); ImageDraw.Draw(sk).rectangle((3, 11, 105, 15), fill=(26, 10, 4, 110)); sk.alpha_composite(B['stav_bord'], (0, 0))
    B['stav_bord_skugga'] = sk
    for n, im in B.items(): im.save(UT + n + '.png')
    o = B['bord2'].copy(); o.alpha_composite(sk, (108, 27))
    o.resize((W * 3, H * 3), Image.NEAREST).save('/tmp/bord2.png')
    print('klart')

# ---------------------------------------------------------------- menyn för vuxna i SNES-stil och introns bilder
def fonster(w, h, rubrik=False):
    """Ett fönster som i SNES-spelens menyer: mörkt läder inuti, mässingsram med fas och nitar i hörnen."""
    im = ny(w + 2, h + 2); d = ImageDraw.Draw(im)
    d.rectangle((2, 2, w + 1, h + 1), fill=(8, 4, 2, 150))
    d.rectangle((0, 0, w - 1, h - 1), fill=hx(MASS[0]))
    d.rectangle((1, 1, w - 2, h - 2), fill=hx(MASS[2])); d.line((1, 1, w - 2, 1), fill=hx(MASS[3])); d.line((1, 1, 1, h - 2), fill=hx(MASS[3]))
    d.line((1, h - 2, w - 2, h - 2), fill=hx(MASS[1])); d.line((w - 2, 1, w - 2, h - 2), fill=hx(MASS[1]))
    d.rectangle((3, 3, w - 4, h - 4), fill=hx(MASS[0]))
    inne = LADER[1] if not rubrik else LADER[2]
    d.rectangle((4, 4, w - 5, h - 5), fill=hx(inne))
    p = im.load()
    for y in range(5, h - 5):                                                          # lädrets struktur, glest
        for x in range(5, w - 5):
            if (x * 7 + y * 13) % 29 == 0: p[x, y] = hx(LADER[2] if not rubrik else LADER[3])
    d.line((4, 4, w - 5, 4), fill=hx(LADER[3]))
    for (x, y) in ((1, 1), (w - 3, 1), (1, h - 3), (w - 3, h - 3)):
        d.point((x, y), fill=hx(MASS[4])); d.point((x + 1, y + 1), fill=hx(MASS[1]))
    return im

def pip(fylld):
    im = ny(6, 7); d = ImageDraw.Draw(im)
    d.rectangle((1, 1, 5, 6), fill=(8, 4, 2, 150))
    if fylld:
        d.rectangle((0, 0, 4, 5), fill=hx(MASS[2]), outline=hx(MASS[0])); d.line((1, 1, 3, 1), fill=hx(MASS[4])); d.point((1, 2), fill=hx(MASS[3]))
    else:
        d.rectangle((0, 0, 4, 5), fill=hx(LADER[0]), outline=hx(MASS[1]))
    return im

def markor():
    """Menyns markör, som i SNES-spelen: en liten ljus pil som pekar på raden."""
    im = ny(9, 10); d = ImageDraw.Draw(im)
    d.polygon([(1, 1), (1, 9), (8, 5)], fill=hx(LADER[0])); d.polygon([(0, 0), (0, 8), (7, 4)], fill=hx(PAPP[4]))
    d.line((1, 6, 5, 4), fill=hx(PAPP[2])); d.line((0, 0, 0, 8), fill=hx(MASS[3]))
    return im

def gryning(im, f=0.55):
    """Före första trycket: rummet i gryningens blå skymning."""
    im = im.copy(); p = im.load(); cache = {}
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if not c[3]: continue
            q = (int(c[0] * (1 - f) + 28 * f), int(c[1] * (1 - f) + 36 * f), int(c[2] * (1 - f) + 70 * f))
            if q not in cache: cache[q] = nar(q)
            p[x, y] = (*cache[q][:3], c[3])
    return im

if __name__ == '__main__':
    X = {'fonster_titel': fonster(312, 22, True), 'fonster_vanster': fonster(98, 160), 'fonster_hoger': fonster(208, 160),
         'pip_1': pip(True), 'pip_0': pip(False), 'markor': markor(),
         'bord2_gryning': gryning(skrivbord(ljus=False)), 'stav_gryning': gryning(sk, 0.4),
         'ljus_halvt': skrivbord()}
    # introns andra bild: solen har nått halvvägs (fältet smalare)
    X['ljus_halvt'] = solljus(gryning(skrivbord(ljus=False), 0.25), falt=((22, -10), (70, -10), (40, 120), (-8, 120)))
    for n, im in X.items(): im.save(UT + n + '.png')
    print('vuxen och intro klart')
