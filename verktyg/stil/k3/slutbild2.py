# Kapitel 3:s nya slutbild (beslut 109.10) och berget som ryker långt bort (109.8).
# Lugnare än 106.7: solarna går inte ned. Det börjar bli kväll, hjälten och ungen åker på sköldpaddan nedför floden,
# och berget som ryker syns långt bort, samma berg som på kartbit 4 (en kon med kluven topp och grå rök).
#   sidovyer/k3_slut_bakgrund_01–02.png   640 x 192   floden mot berget i kvällsljus; 01 och 02 skiljer sig bara i
#                                         vattnet (glittret och ljusbåtarnas speglingar), så att det rör sig
#   sidovyer/k3_slut_skoldpadda_01–02.png 128 x 72    sköldpaddan från sidan med hjälten och ungen på skalet, simmar åt
#                                         höger; fenan tar ett simtag mellan 01 och 02. Vattenlinjen ligger i y 62
#   foremal/flod/berget_ryker_01–03.png   48 x 40     berget långt bort för regin skoldpadda_visar_berget på sandbanken;
#                                         röken stiger i tre bilder. Foten i dis, så att det ser långt bort ut
# Färgerna läses till masterpaletten. Inget orange (baronens): kvällsljuset är gult, rosa och lila.
import os, sys, math, random
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
from PIL import Image
P = Palett()
W, H, HOR = 640, 192, 104

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def bl(a, b, t): t = max(0.0, min(1.0, t)); return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
TOPP, MELLAN, HORISONT = hx('#3A3A88'), hx('#C8789A'), hx('#F8D27A')
BERG_X = 500

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
def rast(c, x, y, styrka=22):
    d = (BAYER[y % 4][x % 4] / 16 - 0.5) * styrka
    return tuple(max(0, min(255, int(v + d))) for v in c)

def himmel(y):
    t = y / HOR
    return bl(TOPP, MELLAN, t / 0.65) if t < 0.65 else bl(MELLAN, HORISONT, (t - 0.65) / 0.35)

def berg_hojd(x):
    """Bergets kontur: en bred kon med kluven topp (kartbit 4), och låga åsar runt."""
    h = 6 + 3 * math.sin(x / 31) + 2 * math.sin(x / 11 + 1)
    d = abs(x - BERG_X)
    if d < 74: h = max(h, 58 * (1 - d / 74) ** 1.1)
    if d < 6: h -= (6 - d) * 1.4                                               # kratern
    return h

def ryk(p, cx, cy, steg, skala=1.0, bas=(158, 160, 174), mot=TOPP, bredd=None, hojd=None):
    """Röken: runda tussar som stiger och driver åt höger. steg flyttar dem uppåt (0, 1, 2)."""
    for i in range(7):
        k = i + steg / 3
        x = cx + (k * k * 0.9 + math.sin(k) * 2) * skala; y = cy - k * 6 * skala; r = (2 + k * 0.9) * skala
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r and 0 <= xx < (bredd or W) and 0 <= yy < (hojd or H):
                    p[xx, yy] = bl(bas, mot, 0.15 + k * 0.08 + (0.12 if (xx + yy) % 2 else 0))

def bakgrund(n):
    rnd = random.Random(7)
    im = Image.new('RGB', (W, H)); p = im.load()
    for y in range(HOR):
        for x in range(W): p[x, y] = rast(himmel(y), x, y)
    for i in range(22):                                                        # de första stjärnorna högt upp
        x, y = rnd.randrange(W), rnd.randrange(30)
        p[x, y] = hx('#EEEFF4') if i % 4 else hx('#9AB6FF')
    for (sx, sy, r) in ((70, HOR - 10, 9), (104, HOR - 6, 6), (128, HOR - 4, 4)):   # tre låga solar i väster, de går inte ned
        for y in range(sy - r - 6, sy + r + 7):
            for x in range(sx - r - 6, sx + r + 7):
                d = math.hypot(x - sx, y - sy)
                if y < HOR and d <= r + 6 and (x + y) % 2 == 0: p[x, y] = bl(p[x, y], hx('#FFF0A8'), 0.35 * (1 - (d - r) / 6) if d > r else 0)
                if y < HOR and d <= r: p[x, y] = hx('#FFF8C8') if d < r - 2 else hx('#F8E46A')
    for x in range(W):                                                         # de bortre åsarna och berget i dis
        h = berg_hojd(x)
        for y in range(int(HOR - h), HOR):
            luft = (HOR - y) / 60
            c = bl(hx('#5A4A78'), himmel(y), 0.25 + luft * 0.25)
            if abs(x - BERG_X) < 74 and y < HOR - 8:                           # bergets ljusa västsida, mörka östsida
                c = bl(c, hx('#C8789A'), 0.25) if x < BERG_X - (HOR - y) * 0.15 else bl(c, hx('#2E2A4A'), 0.25)
            p[x, y] = c
    for k in range(3):                                                         # strimmor av lava i kratern
        p[BERG_X - 1 + k, int(HOR - berg_hojd(BERG_X)) + 1] = hx('#E8443A')
    ryk(p, BERG_X, int(HOR - berg_hojd(BERG_X)) - 1, 0, 1.4)
    for x in range(W):                                                         # den bortre stranden med vass och träd
        h = 3 + 2 * math.sin(x / 9) + (6 if (x // 37) % 3 == 0 and x % 37 < 14 else 0) * math.sin((x % 37) / 14 * math.pi)
        for y in range(int(HOR - h), HOR + 2): p[x, y] = hx('#2E3A3A') if y < HOR else hx('#26302E')
        if x % 5 == 0: p[x, int(HOR - h) - 2] = hx('#2E3A3A'); p[x, int(HOR - h) - 1] = hx('#2E3A3A')
    for y in range(HOR + 2, H):                                                # floden: speglar himlen, mörkare nedåt
        t = (y - HOR) / (H - HOR)
        spegel = himmel(max(0, HOR - (y - HOR) * 1.6))
        for x in range(W):
            c = bl(spegel, hx('#1A3290'), 0.35 + t * 0.55)
            vag = (y * 5 + x // 11 + (3 if n == 2 else 0) + (x // 37) * 7) % 19
            if vag == 0: c = bl(c, hx('#EEEFF4'), 0.3 - t * 0.2)
            if vag == 1 and t < 0.6: c = bl(c, hx('#F8D27A'), 0.25)
            p[x, y] = rast(c, x, y, 16)
    for (sx, r) in ((70, 9), (104, 6), (128, 4)):                             # solarnas spegling i strimmor
        for y in range(HOR + 3, HOR + 46):
            if (y + n) % 3: continue
            w = max(1, r + 2 - (y - HOR) // 6)
            for x in range(sx - w + (n - 1), sx + w + (n - 1)): p[x, y] = bl(p[x, y], hx('#F8E46A'), 0.6)
    for y in range(HOR + 4, HOR + 30):                                         # bergets spegling, svag
        if y % 2: continue
        for x in range(BERG_X - 40 + (y - HOR), BERG_X + 40 - (y - HOR)):
            if 0 <= x < W: p[x, y] = bl(p[x, y], hx('#2E2A4A'), 0.2)
    for j, bx in enumerate((40, 176, 262, 350, 432, 588)):                    # ljusbåtarna vid bortre stranden
        by = HOR + 6 + (j % 2) * 3
        for x in range(bx - 5, bx + 6): p[x, by] = hx('#3A2414'); p[x, by - 1] = hx('#5A3C26')
        for x in range(bx - 4, bx + 5, 2): p[x, by - 1] = hx('#2A52C8')        # flodfolkets ränder
        p[bx, by - 3] = hx('#FFF8C8'); p[bx, by - 4] = hx('#F8E46A'); p[bx - 1, by - 3] = hx('#F2D22E'); p[bx + 1, by - 3] = hx('#F2D22E')
        for y in range(by + 2, by + 12, 2): p[bx + (1 if (y // 2 + n) % 2 else 0), y] = hx('#F8E46A')
    for x in range(W):                                                         # den närmre stranden: vass i motljus längst ned
        h = 5 + 3 * math.sin(x / 13) + 2 * math.sin(x / 5)
        for y in range(int(H - h), H): p[x, y] = hx('#1A2420')
        if x % 3 == 0:
            top = int(H - h - 6 - (x * 7) % 9)
            for y in range(top, int(H - h)): p[x, y] = hx('#1A2420')
            if x % 9 == 0: p[x, top - 1] = hx('#3A2414'); p[x, top - 2] = hx('#3A2414')
    return im

def skoldpadda(n):
    """Sköldpaddan från sidan, simmar åt höger: ett högt, välvt skal av uråldriga plattor med gräs och trädet, halsen
    framåt och huvudet lyft, hjälten och ungen på ryggen. Under vattenlinjen syns bara fenan och en mörk skugga."""
    BW, BH, VL = 128, 72, 62
    im = Image.new('RGBA', (BW, BH), (0, 0, 0, 0)); p = im.load()
    def s(x, y, c, a=255):
        if 0 <= x < BW and 0 <= y < BH: p[x, y] = (*(hx(c) if isinstance(c, str) else c), a)
    cx, cy = 56, VL + 4
    for y in range(BH):                                                        # skalet
        for x in range(BW):
            u = ((x + .5 - cx) / 46) ** 2 + ((y + .5 - cy) / 34) ** 2
            if u <= 1 and y < VL:
                kant = u > 0.8
                if kant:
                    c = '#4E3220' if (x // 8 + (y > VL - 6)) % 2 else '#6B4630'
                    if y > VL - 9 and (x - 2) % 8 == 0: c = '#2A1A10'
                    if (x * 3 + y * 5) % 23 == 0: c = '#D8CCB0'                # havstulpaner
                else:
                    c = '#80922A' if (x * 7 + y * 3) % 11 else '#A3B53A'
                    if u > 0.62: c = '#56661C'
                    if x > cx + 10 and u > 0.45: c = '#56661C' if (x + y) % 3 else '#2E3D10'   # skuggsidan
                c = bl(hx(c), hx('#C8789A'), 0.12) if x < cx else bl(hx(c), hx('#3A3A88'), 0.18)  # kvällsljuset från väster
                s(x, y, c)
    for y in range(VL - 33, VL - 22): s(cx + 22, y, '#4E3220'); s(cx + 23, y, '#3A2414')   # det lilla trädet
    for y in range(VL - 44, VL - 31):
        for x in range(cx + 14, cx + 33):
            if ((x - cx - 23) / 9.5) ** 2 + ((y - VL + 38) / 6.5) ** 2 <= 1:
                s(x, y, '#56661C' if x > cx + 24 or (x + y) % 4 == 0 else '#80922A')
    # halsen ut under skalets främre kant, och huvudet lyft, med ett gammalt, vänligt leende
    for i in range(18):
        t = i / 17; x = cx + 40 + t * 18; y = VL - 4 - t * 10; r = 5.5 - t * 1.2
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r and yy < VL:
                    s(xx, yy, '#2E5A48' if yy > y + r * 0.3 else '#40705A' if yy > y - r * 0.4 else '#5A8A70')
    hx0, hy0 = cx + 62, VL - 17
    for yy in range(hy0 - 7, hy0 + 6):
        for xx in range(hx0 - 7, hx0 + 10):
            if ((xx - hx0) / 9) ** 2 + ((yy - hy0) / 6) ** 2 <= 1:
                s(xx, yy, '#2E5A48' if yy > hy0 + 2 else '#40705A' if yy > hy0 - 3 else '#5A8A70')
    s(hx0 + 3, hy0 - 2, '#0E0E12'); s(hx0 + 3, hy0 - 3, '#5A8A70'); s(hx0 + 2, hy0 - 3, '#2E5A48')   # ögat under ett tungt lock
    for xx in range(hx0 + 2, hx0 + 9): s(xx, hy0 + 2 + (1 if xx < hx0 + 5 else 0), '#1E3A30')         # leendet
    for k in range(4): s(hx0 - 2 + k, hy0 + 5 + k % 2, '#56661C')                                   # algskägget
    # fenan under vattnet, som tar ett simtag
    vink = -0.5 if n == 1 else 0.45
    for i in range(22):
        t = i / 21; x = cx + 30 + math.cos(vink) * t * 22; y = VL + 2 + math.sin(vink + 1.2) * t * 8
        r = 3.2 * (1 - t) + 1
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r and yy > VL: s(xx, yy, bl(hx('#2E5A48'), hx('#1A3290'), 0.45))
    for yy in range(VL + 1, VL + 7):                                           # skalets skugga under ytan
        for xx in range(cx - 40, cx + 40):
            if ((xx - cx) / 42) ** 2 + ((yy - VL) / 7) ** 2 <= 1 and (xx + yy) % 2 == 0 and p[xx, yy][3] == 0:
                s(xx, yy, bl(hx('#1A3290'), hx('#0E1A50'), 0.5))
    # hjälten och ungen sitter på ryggen och tittar framåt (mot berget)
    hjx, hjy = cx - 2, VL - 33
    for yy in range(hjy - 9, hjy + 1):
        for xx in range(hjx - 4, hjx + 5):
            d = ((xx - hjx) / 4.2) ** 2 + ((yy - hjy + 6) / 3.6) ** 2
            if d <= 1: s(xx, yy, '#EEEFF4' if yy < hjy - 6 else '#C8CAD4' if xx < hjx + 2 else '#4F7AE8')   # hjälmen och ansiktet
    s(hjx + 3, hjy - 5, '#0E0E12')
    for yy in range(hjy - 2, hjy + 3):
        for xx in range(hjx - 3, hjx + 3): s(xx, yy, '#2A52C8' if xx > hjx - 2 else '#1A3290')
    s(hjx + 2, hjy + 2, '#2A52C8'); s(hjx + 3, hjy + 2, '#2A52C8')
    for k in range(9): s(hjx - 5, hjy - 4 + k, '#8a5a34')                     # staven
    s(hjx - 5, hjy - 5, '#E8443A'); s(hjx - 5, hjy - 6, '#F2C94A')
    ux, uy = cx + 10, VL - 32                                                  # ungen
    for yy in range(uy - 6, uy + 2):
        for xx in range(ux - 5, ux + 6):
            if ((xx - ux) / 5) ** 2 + ((yy - uy + 2) / 4) ** 2 <= 1: s(xx, yy, '#93A632' if yy < uy - 1 else '#6A7C22')
    for k in range(3): s(ux - 3 + k * 2, uy - 6, '#34343C')                   # klubbans taggar på ryggen
    s(ux + 3, uy - 4, '#0E0E12'); s(ux + 3, uy - 5, '#EEEFF4')
    for yy in range(uy - 4, uy):                                               # svansen med klubban
        s(ux - 6 - (uy - yy), yy + 1, '#6A7C22')
    s(ux - 10, uy - 2, '#34343C'); s(ux - 11, uy - 2, '#34343C'); s(ux - 10, uy - 3, '#34343C')
    rnd = random.Random(60 + n)                                                # skum i oregelbundna tussar där skalet möter vattnet
    xx = 4
    while xx < cx + 50:
        lang = rnd.randint(2, 5)
        for k in range(lang):
            if p[xx + k, VL - 1][3]: s(xx + k, VL - 1 + (1 if rnd.random() < 0.4 else 0), '#EEEFF4')
        xx += lang + rnd.randint(2, 6)
    for k in range(6):                                                          # kölvattnet bakom, glesnar ut
        s(2 + k * 4 + (n - 1), VL + 1 + (k % 2), '#C8CAD4')
    for k in range(4): s(hx0 + 8 + k * 2, VL - (k % 2), '#EEEFF4')              # bogvågen
    return im

def berget(n):
    """Berget långt bort för sandbanken (109.8): samma berg som på kartbit 4 och i slutbilden, i dis, med röken i tre
    bilder. 48 x 40. Foten löses upp i dis nedåt (glesare pixlar), så att det ser långt bort ut."""
    BW, BH = 48, 40
    im = Image.new('RGBA', (BW, BH), (0, 0, 0, 0)); p = im.load()
    cx, fot = 24, 38
    for y in range(BH):
        for x in range(BW):
            d = abs(x + .5 - cx); h = 24 * (1 - d / 22) ** 1.1 if d < 22 else 0
            if d < 3: h -= (3 - d) * 1.5
            top = fot - h
            if top <= y <= fot and d < 22:
                dis = (y - (fot - 8)) / 8
                if dis > 0 and ((x + y) % 2 == 0 if dis < 0.5 else (x + 2 * y) % 4 != 0): continue
                c = '#8E8AA8' if x < cx - (y - top) * 0.1 else '#6E6A88'
                if y < top + 2: c = '#B8B4CC' if x < cx else '#8E8AA8'
                p[x, y] = (*hx(c), 255)
    for k in range(3): p[cx - 1 + k, int(fot - 24 + 4)] = (*hx('#E8443A'), 255)
    ryk(p, cx, fot - 22, n - 1, 0.9, (176, 178, 190), (220, 224, 228), BW, BH)
    for y in range(BH):                                                        # röken ska vara ogenomskinlig i bilden
        for x in range(BW):
            if p[x, y] != (0, 0, 0, 0) and len(p[x, y]) == 4 and p[x, y][3] == 0: p[x, y] = (*p[x, y][:3], 255)
    return im

def las(im):
    rgba = im.convert('RGBA'); q = rgba.load(); cache = {}
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = q[x, y]
            if a < 128: q[x, y] = (0, 0, 0, 0); continue
            c = (r, g, b)
            if c not in cache: cache[c] = hx(P.narmast('#%02x%02x%02x' % c)[0])
            q[x, y] = (*cache[c], 255)
    return rgba

if __name__ == '__main__':
    UT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k3/ut109'
    for d in ('sidovyer', 'foremal/flod'): os.makedirs(f'{UT}/{d}', exist_ok=True)
    for n in (1, 2):
        las(bakgrund(n)).save(f'{UT}/sidovyer/k3_slut_bakgrund_{n:02d}.png')
        las(skoldpadda(n)).save(f'{UT}/sidovyer/k3_slut_skoldpadda_{n:02d}.png')
    for n in (1, 2, 3): las(berget(n)).save(f'{UT}/foremal/flod/berget_ryker_{n:02d}.png')
    print('klart')
