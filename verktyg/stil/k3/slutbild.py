# Kapitel 3:s slutbild (beslut 106.7): hjälten och ungen på sköldpaddans skal, nedför floden mot solnedgången.
# En bred vy från sidan. De tre solarna går ned en i taget (spelarens värld har tre solar), ljusbåtarna tänds,
# och de två månarna stiger. Bara bildbyten, åtta bilder, ca 1 s var (högst ca 8 s); ett tryck hoppar över.
#   sidovyer/k3_slut_01–08.png   320 x 192
#   01 tre solar över horisonten   02–04 en sol i taget går ned   05 skymning, de första ljusbåtarna tänds
#   06 fler ljus, månarna syns     07–08 månarna stiger, natt, sköldpaddan är långt ute (08 är sista bilden, står kvar)
# Färgerna läses till masterpaletten. Inget orange (baronens): solarna är gula och rosa, himlen går från gul till lila.
import os, sys, math, random
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
from PIL import Image
P = Palett()
W, H, HOR = 320, 192, 96

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def bl(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

HIMMEL = [  # (topp, horisont) per bild
    ('#4A6AB8', '#F8E46A'), ('#5A5AA8', '#F8D27A'), ('#5A4A98', '#F4B0A0'), ('#4A3A88', '#C8789A'),
    ('#2E2A6A', '#8A5A8A'), ('#1E1E50', '#5A3A6A'), ('#141A40', '#3A2A58'), ('#0E1430', '#2A2248')]
SOLAR = [(214, 1.0, 12, '#FFF0A0', '#F8E46A'), (246, 0.9, 8, '#FFE0D0', '#F4B0A0'), (268, 0.8, 5, '#FFF8C8', '#F2D22E')]

def slutbild(k):
    """k = 1..8"""
    rnd = random.Random(3)
    im = Image.new('RGB', (W, H)); p = im.load()
    topp, hor = hx(HIMMEL[k - 1][0]), hx(HIMMEL[k - 1][1])
    for y in range(HOR):                                                       # himlen, rastrerad i band
        t = (y / HOR) ** 1.3
        for x in range(W):
            tt = t + ((x + y) % 2) * 0.04
            p[x, y] = bl(topp, hor, min(1, tt))
    if k >= 5:                                                                 # stjärnor
        for i in range(10 + 8 * (k - 5)):
            x, y = rnd.randrange(W), rnd.randrange(HOR - 30)
            p[x, y] = hx('#EEEFF4') if i % 3 else hx('#9AB6FF')
    if k >= 6:                                                                 # de två månarna stiger i öster (vänster)
        for (mx, r, fy) in ((44, 7, 1.0), (70, 4, 0.8)):
            my = int(HOR - 8 - (k - 5) * 14 * fy)
            for y in range(my - r, my + r + 1):
                for x in range(mx - r, mx + r + 1):
                    if (x - mx) ** 2 + (y - my) ** 2 <= r * r and 0 <= y < HOR:
                        p[x, y] = hx('#EEEFF4') if (x - mx + 2) ** 2 + (y - my + 2) ** 2 < r * r else hx('#C8CAD4')
    for i, (sx, fart, r, kant, mitt) in enumerate(SOLAR):                     # solarna: en i taget går ned
        ned = max(0, k - 1 - i)                                                # sol i går ned i bild i+2
        sy = HOR - r - 2 + (0 if k <= i + 1 else (r + 4) * min(1, (k - 1 - i)))
        if k > i + 2: continue
        for y in range(int(sy - r), int(sy + r) + 1):
            for x in range(sx - r, sx + r + 1):
                if (x - sx) ** 2 + (y - sy) ** 2 <= r * r and y < HOR:
                    p[x, y] = hx(mitt) if (x - sx) ** 2 + (y - sy) ** 2 < (r - 2) ** 2 else hx(kant)
    # berget som ryker, långt borta (nästa kapitel), och den bortre stranden
    for x in range(W):
        h = 4 + 3 * math.sin(x / 23) + 2 * math.sin(x / 7)
        if 150 < x < 210: h += 22 * max(0, 1 - abs(x - 180) / 30)            # berget
        for y in range(int(HOR - h), HOR): p[x, y] = bl(hx('#2E2A4A'), hor, 0.25 if k < 5 else 0.1)
    for i in range(8):                                                         # röken från berget
        x, y = 180 + int(math.sin(i * 0.9) * 3) + i, HOR - 26 - i * 3
        for dx in range(-2, 3):
            if 0 <= y < H: p[x + dx, y] = bl(hx('#9EA0AE'), topp, 0.3 + i * 0.07)
    # floden: speglar himlen, mörkare, med strimmor
    for y in range(HOR, H):
        t = (y - HOR) / (H - HOR)
        for x in range(W):
            c = bl(bl(hor, topp, 0.5), hx('#0E1A50'), min(1, t * 1.2 + (0.2 if k > 4 else 0)))
            if (y * 7 + x // 9 + k) % 23 == 0: c = bl(c, hx('#EEEFF4'), 0.35)
            p[x, y] = c
    for i, (sx, fart, r, kant, mitt) in enumerate(SOLAR):                     # solarnas spegling
        if k > i + 1: continue
        for y in range(HOR + 1, HOR + 40):
            if (y // 2) % 2: continue
            w = max(1, r - (y - HOR) // 4)
            for x in range(sx - w, sx + w):
                p[x, y] = hx(kant)
    # ljusbåtarna längs den närmre stranden, de tänds en i taget
    batar = [(30, 150), (64, 166), (100, 142), (136, 172), (176, 156), (300, 148)]
    for j, (bx, by) in enumerate(batar):
        for x in range(bx - 4, bx + 5): p[x, by] = hx('#3A2414'); p[x, by - 1] = hx('#5A3C26')
        for x in range(bx - 3, bx + 4, 2): p[x, by - 1] = hx('#2A52C8')        # flodfolkets ränder
        tand = k >= 5 and j < (k - 4) * 2
        if tand:
            p[bx, by - 3] = hx('#FFF8C8'); p[bx, by - 4] = hx('#F8E46A'); p[bx - 1, by - 3] = hx('#F2D22E'); p[bx + 1, by - 3] = hx('#F2D22E')
            for y in range(by + 1, by + 7, 2): p[bx, y] = hx('#F8E46A')         # ljuset i vattnet
        else: p[bx, by - 3] = hx('#55555F')
    # sköldpaddan från sidan: ett välvt skal med gräs och trädet, huvudet framåt, hjälten och ungen på ryggen
    tx = 120 + (k - 1) * 14; ty = 128
    for y in range(ty - 22, ty + 1):
        for x in range(tx - 40, tx + 41):
            u = ((x - tx) / 40) ** 2 + ((y - ty) / 22) ** 2
            if u <= 1:
                c = '#4E3220' if u > 0.78 else ('#6B4630' if y > ty - 5 else '#56661C' if u > 0.55 else '#80922A')
                if y > ty - 5 and (x - tx) % 9 == 0: c = '#2A1A10'                # plattornas skarvar
                if y < ty - 14 and (x * 3 + y) % 7 == 0: c = '#A3B53A'
                p[x, y] = bl(hx(c), topp, 0.15 if k < 5 else 0.35)
    for y in range(ty - 30, ty - 20):                                          # det lilla trädet
        p[tx + 18, y] = hx('#4E3220')
    for y in range(ty - 36, ty - 28):
        for x in range(tx + 13, tx + 24):
            if (x - tx - 18) ** 2 / 30 + (y - ty + 32) ** 2 / 14 <= 1: p[x, y] = bl(hx('#56661C'), topp, 0.2)
    for y in range(ty - 6, ty + 3):                                            # halsen ut under skalets kant, och huvudet framåt
        for x in range(tx + 30, tx + 46):
            if ((x - tx - 38) / 9) ** 2 + ((y - ty + 0.5) / 3.2) ** 2 <= 1: p[x, y] = bl(hx('#2E5A48'), topp, 0.2)
    for y in range(ty - 6, ty + 3):
        for x in range(tx + 38, tx + 56):
            if ((x - tx - 49) / 7) ** 2 + ((y - ty + 2) / 4.5) ** 2 <= 1: p[x, y] = bl(hx('#40705A'), topp, 0.2)
    p[tx + 52, ty - 3] = hx('#0E0E12')
    for (fx, fy, c1, c2) in ((tx - 6, ty - 24, '#EEEFF4', '#20946A'), (tx + 4, ty - 23, '#93A632', '#56661C')):   # hjälten och ungen
        for y in range(fy - 6, fy + 1):
            for x in range(fx - 2, fx + 3):
                if abs(x - fx) + max(0, fy - 4 - y) <= 2: p[x, y] = bl(hx(c2 if y > fy - 4 else c1), topp, 0.2)
    for i in range(3):                                                         # kölvattnet bakom
        y = ty + 1 + i
        for x in range(tx - 40 - 30 + i * 6, tx - 36, 3): p[x, y] = hx('#C8CAD4')
    for x in range(tx + 50, tx + 60, 2): p[x, ty + 1] = hx('#EEEFF4')        # bogvågen
    # läs till paletten
    ut = Image.new('RGBA', (W, H)); q = ut.load()
    cache = {}
    for y in range(H):
        for x in range(W):
            c = p[x, y]
            if c not in cache: cache[c] = hx(P.narmast('#%02x%02x%02x' % c)[0]) + (255,)
            q[x, y] = cache[c]
    return ut

if __name__ == '__main__':
    UT = '/home/claude/k3/ut106/sidovyer'; os.makedirs(UT, exist_ok=True)
    for k in range(1, 9):
        P.las_bild(slutbild(k), 'slut').save(f'{UT}/k3_slut_{k:02d}.png')
    print('8 bilder')
