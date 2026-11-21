# Kapitel 4:s slutbild (beslut 115.7, manus 21: regin resan_molnkant): kvällen kommer, och hjälten och ungen går
# längs bergskammen mot molnkanten, som lyser långt borta under två månar. Vy från sidan, som kapitel 3:s slutbild.
#   sidovyer/k4_slut_bakgrund_01–02.png  640 x 192  kvällshimlen med två månar och stjärnor, berget som ryker bakom dem
#                                        till vänster, bergskammen tvärs över bilden (snö i månljus, palettens kalla
#                                        toner) och molnkanten som lyser vid horisonten till höger, med luftskeppet på
#                                        väg dit. 01 och 02 skiljer sig i stjärnorna, molnens sken och röken
#   sidovyer/k4_slut_vandrar_01–02.png   40 x 28    hjälten och ungen från sidan, går åt höger; stavens topp lyser.
#                                        Fötterna i y 27. Kammens stig ligger i y 132 i bakgrunden: lägg bilden med y 105
# Färgerna läses till masterpaletten 1.2. Orange bara på luftskeppet.
import os, sys, math, random
_s = open('/home/claude/k3/slutbild2.py').read(); exec(_s[:_s.rindex("if __name__ == '__main__':")])
from PIL import Image
W, H = 640, 192
STIG = 132                                                   # kammens stig, där de går
HOR = 118                                                    # horisonten bakom kammen
TOPP2, MITT2, HOR2 = hx('#1a1f4a'), hx('#3a3a88'), hx('#8e9fcc')
def himmel2(y):
    t = y / HOR
    return bl(TOPP2, MITT2, t / 0.6) if t < 0.6 else bl(MITT2, HOR2, (t - 0.6) / 0.4)

MOLN_X = 560
def bakgrund_k4(n):
    rnd = random.Random(11); im = Image.new('RGB', (W, H)); p = im.load()
    for y in range(H):
        for x in range(W): p[x, y] = rast(himmel2(min(y, HOR)), x, y)
    for i in range(70):                                                         # stjärnorna, några blinkar
        x, y = rnd.randrange(W), rnd.randrange(80)
        if (i + n) % 5 == 0: continue
        p[x, y] = hx('#ffffff') if i % 3 else hx('#bfe3ef')
    for (mx, my, r, c, k) in ((150, 30, 9, '#f2f6f8', '#dce0e4'), (196, 18, 5, '#bfe3ef', '#9ab6ff')):   # två månar
        for y in range(my - r - 4, my + r + 5):
            for x in range(mx - r - 4, mx + r + 5):
                d = math.hypot(x - mx, y - my)
                if r < d <= r + 4 and (x + y) % 2 == 0: p[x, y] = bl(p[x, y], hx(c), 0.25)
                if d <= r: p[x, y] = hx(c) if (x - mx) + (y - my) < r * 0.6 else hx(k)
    p[147, 28] = hx('#dce0e4'); p[152, 33] = hx('#dce0e4'); p[148, 33] = hx('#dce0e4')    # kratrar på den stora
    # molnkanten: en bank av moln vid horisonten till höger, som lyser underifrån (dalen bakom)
    for y in range(HOR - 46, HOR + 2):
        for x in range(420, W):
            v = (x - 420) / 220
            topp = HOR - 10 - 30 * v - 6 * math.sin(x / 13) - 4 * math.sin(x / 5 + 1)
            if y >= topp:
                ljus = (y - topp) / (HOR - topp + 1)
                c = bl(hx('#e8f0ff'), hx('#f8e46a'), ljus * 0.8)
                if n == 2 and ljus > 0.5: c = bl(c, hx('#fff8c8'), 0.3)
                if y < topp + 2: c = hx('#ffffff')
                p[x, y] = rast(c, x, y, 14)
    # luftskeppet långt borta, på väg mot molnen
    lx, ly = 470 + (n - 1), 62
    for x in range(lx - 7, lx + 8):
        for y in range(ly - 3, ly + 4):
            if ((x - lx) / 7.5) ** 2 + ((y - ly) / 3.5) ** 2 <= 1: p[x, y] = hx('#E8823A') if y < ly + 1 else hx('#A85418')
    for x in range(lx - 2, lx + 3): p[x, ly + 5] = hx('#3a2414')
    p[lx - 1, ly + 4] = hx('#3a2414'); p[lx + 1, ly + 4] = hx('#3a2414')
    # berget som ryker bakom dem till vänster, mörkt mot kvällen, med glöd i kratern
    BX = 70
    for x in range(0, 200):
        d = abs(x - BX); h = 70 * (1 - d / 110) ** 1.05 if d < 110 else 0
        if d < 7: h -= (7 - d) * 1.3
        for y in range(int(HOR - h), HOR + 2):
            c = bl(hx('#2e2a4a'), himmel2(y), 0.25)
            if y < HOR - h + 10 and h > 30: c = bl(c, hx('#b4c4e6'), 0.35)       # snö i månljuset
            p[x, y] = c
    for k in range(5): p[BX - 2 + k, int(HOR - 70 + 9)] = hx('#e8443a')
    ryk(p, BX, int(HOR - 70 + 7), n - 1, 1.6, (120, 118, 140), TOPP2)
    STENTON = ['#1e1a2a', '#2e2a4a', '#3e3a5a', '#4a5a7a']
    rh = random.Random(77); RUT = {}
    def ruta(i, j):
        if (i, j) not in RUT: RUT[(i, j)] = rh.random()
        return RUT[(i, j)]
    def brusnivå(x, y):                                                         # mjukt brus i klippan, mörkare nedåt
        fx, fy = x / 9, y / 6; i, j = int(fx), int(fy); u, v = fx - i, fy - j
        a = ruta(i, j) * (1 - u) + ruta(i + 1, j) * u; b2 = ruta(i, j + 1) * (1 - u) + ruta(i + 1, j + 1) * u
        n = a * (1 - v) + b2 * v - (y - STIG) / 90 + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.25
        return max(0, min(3, int(n * 3.2)))
    # bergskammen tvärs över: en snökant i månljus, och under den en brant sluttning av mörk sten med snöstråk
    rnd2 = random.Random(5)
    for x in range(W):
        topp = STIG - 2 - (1 if (x // 23) % 3 == 0 else 0)
        for y in range(topp, H):
            if y < STIG + 2: c = hx('#e8f2fa') if (x + y) % 5 else hx('#ffffff')
            elif y < STIG + 4 + int(2 * math.sin(x / 9)): c = hx('#b4c4e6')            # snöns överhäng
            else:
                c = hx(STENTON[brusnivå(x, y)])
            p[x, y] = c
    for x in range(W):                                                          # stigens spår i snön
        if x % 7 < 3: p[x, STIG] = hx('#b4c4e6')
    for k in range(26):                                                         # snö i skrevor nedför branten
        x0 = rnd2.randrange(W); y0 = STIG + 5 + rnd2.randrange(0, 20); l = rnd2.randrange(6, 22)
        for t in range(l):
            x = x0 - t // 2 + (1 if (t // 3) % 2 else 0); y = y0 + t
            if 0 <= x < W and y < H: p[x, y] = hx('#8e9fcc') if t < l * 0.7 else hx('#4a5a7a')
    for k in range(7):                                                          # klippor som sticker upp ur branten
        sx = 40 + k * 97 + (k * 31) % 29; sy = STIG + 18 + (k % 3) * 9
        for y in range(sy - 8, sy + 10):
            w = max(0, (y - (sy - 8)) // 2)
            for x in range(sx - w, sx + w + 1):
                if 0 <= x < W and y < H: p[x, y] = hx('#3e3a5a') if x < sx else hx('#1e1a2a')
            if 0 <= sx - w < W and y < H: p[sx - w, y] = hx('#8e9fcc')
    return im

def vandrar(n):
    """Hjälten och ungen från sidan, åt höger, små som på kammen (hjälten 16 hög, ungen 10)."""
    im = Image.new('RGBA', (40, 28), (0, 0, 0, 0)); p = im.load()
    def s(x, y, c):
        if 0 <= x < 40 and 0 <= y < 28: p[x, y] = hx(c) + (255,)
    steg = 1 if n == 1 else -1
    hx0 = 22                                                                    # hjälten
    for y in range(11, 19):
        for x in range(hx0 - 3, hx0 + 4):
            if ((x - hx0) / 3.4) ** 2 + ((y - 15) / 4.2) ** 2 <= 1: s(x, y, '#2a52c8' if x < hx0 + 1 else '#1a3290')
    for y in range(4, 11):
        for x in range(hx0 - 4, hx0 + 4):
            if ((x - hx0 + 0.5) / 3.8) ** 2 + ((y - 7.5) / 3.6) ** 2 <= 1:
                s(x, y, '#eeeff4' if y < 7 else '#4f7ae8' if x > hx0 - 1 else '#c8cad4')
    s(hx0 + 2, 8, '#0e0e12')
    for k, (x0, d) in enumerate(((hx0 - 1, steg), (hx0 + 1, -steg))):          # benen
        for y in range(19, 25): s(x0 + (d * (y - 19)) // 3, y, '#1a3290')
        s(x0 + (d * 6) // 3, 25, '#3a2414'); s(x0 + (d * 6) // 3 + 1, 25, '#3a2414')
    for y in range(6, 23): s(hx0 + 5, y, '#8a5a34')                              # staven, toppen lyser
    s(hx0 + 5, 5, '#fff8c8'); s(hx0 + 5, 4, '#ffffff'); s(hx0 + 4, 5, '#bfe3ef'); s(hx0 + 6, 5, '#bfe3ef'); s(hx0 + 5, 3, '#bfe3ef')
    s(hx0 + 4, 14, '#4f7ae8'); s(hx0 + 4, 15, '#4f7ae8')                         # handen på staven
    ux, uy = 9, 21                                                              # ungen, några steg före... nej, efter
    for y in range(uy - 5, uy + 2):
        for x in range(ux - 6, ux + 7):
            if ((x - ux) / 6) ** 2 + ((y - uy + 2) / 4) ** 2 <= 1: s(x, y, '#93a632' if y < uy else '#6a7c22')
    for k in range(4): s(ux - 4 + k * 2, uy - 6, '#34343c')
    for y in range(uy - 4, uy + 1):                                             # huvudet framåt
        for x in range(ux + 5, ux + 10):
            if ((x - ux - 7) / 2.8) ** 2 + ((y - uy + 2.5) / 2.5) ** 2 <= 1: s(x, y, '#93a632')
    s(ux + 8, uy - 3, '#0e0e12'); s(ux + 8, uy - 4, '#eeeff4')
    for k in range(4): s(ux - 7 - k, uy - 1 - (k // 2), '#6a7c22')              # svansen med klubban
    s(ux - 11, uy - 3, '#34343c'); s(ux - 12, uy - 3, '#34343c'); s(ux - 11, uy - 4, '#34343c'); s(ux - 12, uy - 2, '#34343c')
    for i, x0 in enumerate((ux - 4, ux - 1, ux + 2, ux + 4)):                   # benen, två och två i takt
        d = steg if i % 2 else -steg
        s(x0 + (d if True else 0), uy + 2, '#6a7c22'); s(x0 + d, uy + 3, '#6a7c22'); s(x0 + d, 25, '#4f7ae8')
    # konturen
    ut = []
    for y in range(28):
        for x in range(40):
            if p[x, y][3]: continue
            if any(0 <= x + a < 40 and 0 <= y + b < 28 and p[x + a, y + b][3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): ut.append((x, y))
    for (x, y) in ut: p[x, y] = hx('#0e0e12') + (255,)
    return im

if __name__ == '__main__':
    UT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k4/ut115'
    os.makedirs(f'{UT}/sidovyer', exist_ok=True)
    for k in (1, 2):
        las(bakgrund_k4(k)).save(f'{UT}/sidovyer/k4_slut_bakgrund_{k:02d}.png')
        las(vandrar(k)).save(f'{UT}/sidovyer/k4_slut_vandrar_{k:02d}.png')
    print('klart')
