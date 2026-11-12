# Kapitel 2, steg 5 del 3: föremålen som spelet ritar själv (10g, beslut 80.5 och 82).
# Ritat enligt *Så ritas allt*: snett uppifrån, ljus uppifrån till vänster, fyra toner och kontur i materialets mörka färg.
# Allt läses till paletten. Orange bara för baronen (repen, skyltarna). Inget blått och inga ränder i vassbyn (81.6),
# utom läsvalets blå dörrar, som är en egenskap han läser.
import os, sys, math, random
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('bybor.py').read().split('# ---------- gången')[0])
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
P = Palett()
from PIL import Image
MAT.update({
 'sten':   ['#3a3a48', '#6e6e80', '#9ea0ae', '#c8cad4', '#eeeff4'],
 'mass':   ['#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0'],
 'trad':   ['#24160c', '#5a3c26', '#7a5638', '#9c7450', '#c49a72'],
 'vass':   ['#16302a', '#1e4436', '#285a44', '#347054', '#4e8a62'],
 'orange': ['#8a4a1e', '#b85e22', '#e8823a', '#f3a462', '#f6dcc3'],
 'papper': ['#8a7448', '#c8b080', '#e8d8b0', '#f2e8c8', '#fbf6e6'],
 'vatten': ['#16244a', '#24407a', '#3a64a8', '#5e8cc8', '#a8c8e8'],
 'katt':   ['#2a2a30', '#4a4a54', '#6e6e7a', '#9a9aa6', '#c8c8d0'],
 'blom':   ['#7a5a10', '#b8901e', '#f2c94a', '#f4dc64', '#fff0a8'],
 'rod':    ['#4a1010', '#8a2420', '#c23a2e', '#e86a5a', '#f69a84'],
 'skiffer':['#1e2230', '#2e3448', '#465068', '#6a7690', '#9aa6c0'],
})
UT = os.path.join(HAR, 'ut')
KOLV = ('#5a3e24', '#8a6a3a')
def hxc(h): return hx(h) + (255,)

def las(im, namn):
    """Läs bilden till paletten: varje färg blir närmaste i paletten (de som redan finns står kvar)."""
    im = im.convert('RGBA'); p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if c[3] == 0: continue
            p[x, y] = hx(P.narmast('#%02x%02x%02x' % c[:3])[0]) + (c[3],)
    return P.las_bild(im, namn)
def skriv(im, rel):
    full = os.path.join(UT, rel); os.makedirs(os.path.dirname(full), exist_ok=True)
    las(im, rel).save(full)
def ny(b, h): return Image.new('RGBA', (b, h), (0, 0, 0, 0))
def pix(im, pts):
    p = im.load()
    for (x, y, c) in pts:
        if 0 <= x < im.width and 0 <= y < im.height: p[int(x), int(y)] = hxc(c) if isinstance(c, str) else c
    return im
def kontur(im, farg=None, bara_ute=True):
    """En kontur runt det som är ritat, i en mörk ton av grannens egen färg."""
    p = im.load(); W, H = im.size; ut = []
    for y in range(H):
        for x in range(W):
            if p[x, y][3]: continue
            gr = [p[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < H and p[x + dx, y + dy][3]]
            if gr:
                c = gr[0]; ut.append((x, y, farg or tuple(int(v * 0.42) for v in c[:3]) + (255,)))
    return pix(im, ut)
def skugga(im, cx, cy, rx, ry, a=80):
    p = im.load()
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if 0 <= x < im.width and 0 <= y < im.height and ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1 and p[x, y][3] == 0:
                p[x, y] = (20, 30, 16, a)
def linje(x0, y0, x1, y1, c, tjock=1):
    n = max(abs(x1 - x0), abs(y1 - y0), 1); ut = []
    for i in range(int(n) + 1):
        x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
        for t in range(tjock): ut.append((round(x), round(y) + t, c))
    return ut

# ---------------- vasstussen: hel, huggen och med bär (vassväggen, 75.3) ----------------
def vasstuss(lage='hel', seed=0):
    rnd = random.Random(seed)
    im = ny(16, 38); V = MAT['vass']
    if lage != 'huggen':
        strån = sorted([(rnd.uniform(2, 13), rnd.randint(24, 35), rnd.random()) for _ in range(8)], key=lambda s: -s[1])
        for (sx, h, r) in strån:
            lut = rnd.uniform(-1.6, 1.6)
            for i in range(h):
                y = 36 - i; x = sx + lut * (i / h) ** 2
                ton = 1 + (1 if x < 8 else 0) + (1 if i > h * 0.6 else 0)
                pix(im, [(x, y, V[min(4, ton + (1 if r > 0.6 else 0))])])
                if i < h * 0.7 and r > 0.4: pix(im, [(x + 1, y, V[1])])
            if r > 0.55:                                                   # kolven
                kx, ky = sx + lut, 36 - h
                pix(im, [(kx, ky + d, KOLV[d % 2]) for d in range(4)] + [(kx + 1, ky + 1, KOLV[0]), (kx + 1, ky + 2, KOLV[0])])
        for x in range(1, 15): pix(im, [(x, 37, V[0]), (x, 36, V[1] if x % 3 else V[2])])
        if lage == 'bar':
            for (x, y, c) in ((6, 20, '#4a72d2'), (7, 20, '#6a8ae8'), (6, 21, '#1a2a6a'), (8, 22, '#4a72d2'), (9, 22, '#9ab6ff'), (8, 23, '#1a2a6a'),
                              (7, 24, '#4a72d2'), (7, 25, '#1a2a6a'), (6, 19, '#e8f0ff')):
                pix(im, [(x, y, c)])
    else:
        for k in range(7):                                                 # stubbar och strån på marken
            sx = 2 + k * 2 + rnd.randint(0, 1)
            for i in range(rnd.randint(2, 4)): pix(im, [(sx, 36 - i, V[3 if i else 2])])
            pix(im, [(sx, 36 - rnd.randint(2, 4), '#a68e52')])
        for k in range(4):
            y = rnd.randint(30, 36); x0 = rnd.randint(0, 8)
            pix(im, linje(x0, y, x0 + rnd.randint(5, 8), y - rnd.randint(-1, 1), '#c0a866'))
        for x in range(1, 15): pix(im, [(x, 37, '#4e6a2c')])
    return kontur(im)

# ---------------- baronens rep och skyltar (orange, med tropikhjälmen) ----------------
def stolpe(im, x, y0, y1):
    for y in range(y0, y1): pix(im, [(x, y, MAT['trad'][3]), (x + 1, y, MAT['trad'][1])])
    pix(im, [(x, y0, MAT['trad'][4]), (x + 1, y0, MAT['trad'][2])])
def rep_vagrat():
    im = ny(40, 14); O = MAT['orange']
    stolpe(im, 1, 2, 13); stolpe(im, 37, 2, 13)
    for x in range(2, 38):
        t = (x - 2) / 36; y = 4 + 4 * math.sin(t * math.pi)
        pix(im, [(x, y, O[2] if x % 3 else O[3]), (x, y + 1, O[1])])
    pix(im, [(2, 3, O[3]), (3, 4, O[2]), (37, 3, O[3]), (36, 4, O[2])])  # knutarna
    return kontur(im)
def rep_lodrat():
    im = ny(10, 38); O = MAT['orange']
    stolpe(im, 3, 1, 12); stolpe(im, 3, 25, 37)
    for y in range(2, 27):
        t = (y - 2) / 24; x = 4 + 3 * math.sin(t * math.pi)
        pix(im, [(x, y, O[2] if y % 3 else O[3]), (x + 1, y, O[1])])
    return kontur(im)
def tropikhjalm(im, x, y, k=1):
    """Baronens underskrift: tropikhjälmen med den orange fjädern."""
    H = ('#7a6a48', '#c8b48a', '#e6d6a8', '#f6ecd0')
    if k == 1:
        pts = [(x + 1, y, H[2]), (x + 2, y, H[3]), (x + 3, y, H[2]), (x, y + 1, H[2]), (x + 1, y + 1, H[3]), (x + 2, y + 1, H[2]),
               (x + 3, y + 1, H[2]), (x + 4, y + 1, H[1]), (x - 1, y + 2, H[1]), (x, y + 2, '#6b4630'), (x + 1, y + 2, '#6b4630'),
               (x + 2, y + 2, '#6b4630'), (x + 3, y + 2, '#6b4630'), (x + 4, y + 2, H[1]), (x + 5, y + 2, H[0]),
               (x + 4, y - 1, '#e8823a'), (x + 5, y - 2, '#f3a462')]
        return pix(im, pts)
    d = Duk(12 * k // 2, 8 * k // 2)
    return im
def skylt_baronen():
    im = ny(16, 22); O = MAT['orange']
    stolpe(im, 7, 9, 21)
    for y in range(1, 11):
        for x in range(1, 15):
            c = O[2]
            if y == 1 or x == 1: c = O[3]
            if y == 10 or x == 14: c = O[1]
            if y in (4, 7) and 2 <= x <= 13 and x % 4 == 2: c = O[1]       # spikar
            pix(im, [(x, y, c)])
    for y in range(3, 9):                                                   # en ljus ruta där texten skulle stå
        for x in range(3, 13): pix(im, [(x, y, O[4] if (x + y) % 5 else O[3])])
    tropikhjalm(im, 5, 4)
    im = kontur(im); skugga(im, 8, 21, 4, 1); return im

# ---------------- brunnen: en stenring med vatten och en mur framtill ----------------
def brunnen():
    im = ny(28, 30); S = MAT['sten']; Vt = MAT['vatten']
    cx, cy, rx, ry = 14, 12, 13, 7
    for y in range(30):
        for x in range(28):
            u = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            if u <= 1:
                inne = ((x + .5 - cx) / (rx - 3)) ** 2 + ((y + .5 - cy) / (ry - 2.4)) ** 2 <= 1
                if inne:
                    c = Vt[2] if y > cy - 1 else Vt[1]
                    if (x * 3 + y * 5) % 11 == 0: c = Vt[4]
                    if y == int(cy - ry + 3): c = Vt[0]
                else:
                    sten = (int(math.atan2(y - cy, x - cx) * 4) + (x // 4)) % 2
                    c = S[3] if (y < cy and x < cx) else S[2]
                    if sten: c = S[[2, 1][y > cy]] if y > cy else S[3] if x < cx else S[2]
                pix(im, [(x, y, c)])
            elif y > cy and y <= cy + 10 and abs(x + .5 - cx) <= rx * math.sqrt(max(0, 1 - ((min(y, cy + ry) - cy) / ry) ** 2)) + 0.2 and y - cy <= ry + 9:
                pass
    for x in range(28):                                                     # muren framtill
        half = rx * math.sqrt(max(0, 1 - ((x + .5 - cx) / rx) ** 2))
        top = int(cy + ry * math.sqrt(max(0, 1 - ((x + .5 - cx) / rx) ** 2)))
        if abs(x + .5 - cx) > rx: continue
        for y in range(top, top + 9):
            rad = (y - top) // 3; fog = (y - top) % 3 == 2 or (x + rad * 2) % 5 == 0
            c = S[0] if fog else (S[2] if x < cx else S[1])
            if y == top: c = S[3]
            pix(im, [(x, y, c)])
    im = kontur(im)
    for (x, y) in ((9, 9), (10, 9), (17, 13), (12, 11)): pix(im, [(x, y, '#ffffff')])   # glittret: brunnen är full
    return im

# ---------------- draken på taket (röd och gul, rosetter i rosa och gult) ----------------
def drake(flyger=0):
    im = ny(20, 22)
    kx, ky = 8, 8
    for y in range(-7, 8):
        for x in range(-6, 7):
            if abs(x) / 6 + abs(y) / 7 <= 1:
                c = MAT['rod'][2] if (x < 0) == (y < 0) else '#f2d22e'
                if x == 0 or y == 0: c = '#6b4630'
                pix(im, [(kx + x, ky + y, c)])
    im = kontur(im)
    sv = 1 if flyger == 2 else 0
    svans = [(kx + 1 + i // 2, ky + 8 + i, '#5a3c26') for i in range(10)]
    svans = [(x + (sv if i > 4 else 0), y, c) for i, (x, y, c) in enumerate(svans)]
    pix(im, svans)
    for (i, c) in ((3, '#e07aa6'), (7, '#f2d22e'), (11, '#e07aa6')):
        x, y = kx + 1 + i // 2 + (sv if i > 4 else 0), ky + 8 + i
        pix(im, [(x - 1, y, c), (x + 1, y, c), (x, y, '#8a2e56')])
    return im

# ---------------- brevramen på Tant Rosas dörr: tom, en halva och hel ----------------
def brevram(lage='tom'):
    im = ny(14, 12); M = MAT['mass']; Pp = MAT['papper']
    for y in range(12):
        for x in range(14):
            kant = x in (0, 13) or y in (0, 11)
            c = M[3] if (kant and (x == 0 or y == 0)) else M[1] if kant else M[2]
            pix(im, [(x, y, c)])
    # de två platserna i form av rivna halvor (vänster och höger), med en sicksack i mitten
    riv = [6, 7, 6, 7, 7, 6, 7, 6, 7, 6]
    for y in range(1, 11):
        for x in range(1, 13):
            vanster = x < riv[y - 1]
            fylld = (lage in ('halva', 'hel') and vanster) or (lage == 'hel' and not vanster)
            if fylld: c = Pp[3] if (x + y) % 4 else Pp[2]
            else: c = M[0] if (x in (1, 12) or y in (1, 10) or x in (riv[y - 1] - 1, riv[y - 1])) else '#3a2a10'
            pix(im, [(x, y, c)])
    if lage == 'hel':                                                       # sigillet i mässing med kompassrosen, helt igen
        pix(im, [(6, 5, M[3]), (7, 5, M[2]), (6, 6, M[2]), (7, 6, M[1]), (6, 4, M[4]), (8, 6, M[1]), (5, 5, M[2]), (6, 7, M[1])])
    elif lage == 'halva':
        pix(im, [(5, 5, M[2]), (5, 6, M[1]), (4, 5, M[3])])
    for y in (3, 8):                                                        # raderna på pappret, bara som streck
        for x in range(2, 12):
            if im.getpixel((x, y))[:3] in (hx(Pp[3]), hx(Pp[2])) and x % 3: pix(im, [(x, y, Pp[0])])
    return im

# ---------------- bubbelblommorna och bubblan ----------------
def bubbelblommor(b=1):
    im = ny(40, 24); B = MAT['blom']
    for k in range(6):
        bx = 3 + k * 7; by = 22 - (k % 2) * 2
        top = by - 9 - (k % 3)
        sv = (1 if (k + b) % 2 else 0)
        for y in range(top + 2, by): pix(im, [(bx, y, '#347054' if y % 3 else '#4e8a62')])
        pix(im, [(bx - 1, by - 3, '#4e8a62'), (bx + 1, by - 5, '#4e8a62'), (bx - 2, by - 4, '#347054')])
        hx_, hy_ = bx + sv, top
        for (dx, dy, t) in ((-1, 0, 3), (0, 0, 4), (1, 0, 2), (-1, 1, 2), (0, 1, 2), (1, 1, 1), (0, -1, 3), (-2, 0, 2), (2, 1, 1), (0, 2, 1)):
            pix(im, [(hx_ + dx, hy_ + dy, B[t])])
        pix(im, [(hx_ + 1, hy_ - 1, '#8a6a1a')])                           # blommans mun som blåser
    return kontur(im)
def bubbla(storlek=6):
    im = ny(8, 8); r = storlek / 2; c = 3.5
    for y in range(8):
        for x in range(8):
            d = math.hypot(x + .5 - c - .5, y + .5 - c - .5)
            if d <= r:
                col = '#cdeff8' if d > r - 1.1 else '#e8f8fc'
                if d > r - 1.1 and x > c and y > c: col = '#8ac6da'
                pix(im, [(x, y, col + 'b0' if False else col)])
    pix(im, [(2, 2, '#ffffff'), (3, 2, '#ffffff')])
    p = im.load()
    for y in range(8):
        for x in range(8):
            if p[x, y][3] and p[x, y][:3] == hx('#e8f8fc'): p[x, y] = hx('#e8f8fc') + (110,)
    return im

# ---------------- stocken, halvorna och fjädern ----------------
def stock():
    im = ny(30, 12); T = MAT['trad']
    for x in range(1, 27):
        for y in range(2, 10):
            c = T[3] if y in (3, 4) else T[2] if y < 7 else T[1]
            if y == 2: c = T[4]
            if (x * 5 + y * 3) % 13 == 0: c = T[0]
            pix(im, [(x, y, c)])
    for y in range(2, 10):                                                  # den sågade änden med årsringar
        for x in range(26, 30):
            d = math.hypot((x - 27.5) / 1.6, (y - 5.8) / 4)
            if d <= 1: pix(im, [(x, y, T[4] if d < 0.45 else '#c8a878' if d < 0.75 else T[3])])
    pix(im, [(10, 1, T[2]), (11, 1, '#4e8a62'), (12, 0, '#4e8a62')])         # en liten kvist med ett blad
    return kontur(im)
def brev_halva(blot=False, b=1):
    im = ny(12, 12); Pp = MAT['papper'] if not blot else ['#5a6470', '#8a96a4', '#a8b4c0', '#c0c8d0', '#dce0e4']
    riv = [7, 8, 7, 8, 8, 7, 8, 7, 8]
    for y in range(1, 10):
        for x in range(1, riv[y - 1]):
            c = Pp[3] if (x + y) % 5 else Pp[2]
            if y == 1: c = Pp[4]
            if y in (3, 5, 7) and 2 <= x < riv[y - 1] - 1 and x % 3: c = Pp[0] if not blot else Pp[1]
            pix(im, [(x, y + (1 if blot and b == 2 else 0), c)])
    M = MAT['mass']
    pix(im, [(riv[4] - 2, 5, M[3]), (riv[4] - 1, 5, M[2]), (riv[4] - 2, 6, M[1]), (riv[4] - 1, 6, M[1])])   # sigillets halva
    im = kontur(im)
    if blot:
        y0 = 10 + (1 if b == 2 else 0)
        pix(im, [(x, y0, MAT['vatten'][4]) for x in range(0, 12) if (x + b) % 3])
    return im
def fjader(k=1):
    im = ny(10 * k, 10 * k)
    for i in range(9 * k):
        x = 1 * k + i; y = 8 * k - int(i * 0.75)
        for w in range(-2 * k, 2 * k + 1):
            yy = y + w
            vit = i > 4 * k
            c = ('#f4f4f0' if w < 0 else '#c4cad0') if vit else ('#22252b' if w < 0 else '#3a3f48')
            if abs(w) == 2 * k: c = '#2e5966' if not vit else '#c4cad0'
            if abs(w) <= 2 * k - abs(i - 4.5 * k) // (3 * k): pix(im, [(x, yy, c)])
        pix(im, [(x, y, '#464a52')])
    return kontur(im)

# ---------------- tavlorna i Tant Rosas hus: samma motiv, bara form och storlek skiljer ----------------
def tavla(stor, rund):
    im = ny(24, 24); M = MAT['mass']
    r = 11 if stor else 6; cx = cy = 12
    if not stor: cy = 12
    for y in range(24):
        for x in range(24):
            dx, dy = x + .5 - cx, y + .5 - cy
            inne = dx * dx + dy * dy <= r * r if rund else (abs(dx) <= r and abs(dy) <= r)
            if not inne: continue
            kant = (dx * dx + dy * dy > (r - 1.6) ** 2) if rund else (abs(dx) > r - 1.6 or abs(dy) > r - 1.6)
            if kant: c = M[3] if (dx < 0 and dy < 0) or dy < -r + 1.6 else M[1] if dx > 0 or dy > 0 else M[2]
            else:
                u = (dy + r) / (2 * r)                                      # motivet: himmel, en kulle och en sol
                c = '#a8dcf8' if u < 0.55 else '#5e9e70' if u < 0.8 else '#3e7a52'
                if u < 0.55 and math.hypot(dx + r * 0.35, dy + r * 0.35) < r * 0.22: c = '#f2d22e'
                if 0.45 < u < 0.6 and math.sin(dx / r * 3) * 0.08 + 0.52 > u: c = '#75c987'
            pix(im, [(x, y, c)])
    im = kontur(im)
    return im

# ---------------- soffan (rosa) med katten som sover ----------------
def soffa():
    d = Duk(56, 30); R = 'rosa'
    d.ellips(28, 12, 25, 6, R, 'rygg', zbias=-0.1)
    d.ellips(28, 21, 26, 7, R, 'sits', zbias=0.2)
    d.ellips(4, 18, 4, 7, R, 'arm', zbias=0.05); d.ellips(52, 18, 4, 7, R, 'arm2', zbias=0.05)
    for cx in (17, 37): d.ellips(cx, 18, 9, 4, R, 'kudde', zbias=0.3)
    d.ellips(16, 15, 6.5, 3.4, 'katt', 'katt', zbias=0.25)
    d.ellips(10, 14, 3, 2.6, 'katt', 'kattH', zbias=0.3)
    skilj(d, 'sits', 'rygg'); skilj(d, 'arm', 'sits'); skilj(d, 'arm2', 'sits'); skilj(d, 'kudde', 'sits'); skilj(d, 'katt', 'kudde', 0)
    skilj(d, 'kattH', 'katt')
    d.kontur()
    im = d.bild()
    pix(im, [(9, 13, '#2a2a30'), (11, 13, '#2a2a30'), (8, 11, '#6e6e7a'), (12, 11, '#6e6e7a')])   # stängda ögon och öron
    for x in (14, 17, 20): pix(im, [(x, 13, '#4a4a54'), (x, 14, '#4a4a54')])                    # randig grå katt
    for y in range(26, 30): pix(im, [(5, y, MAT['trad'][1]), (50, y, MAT['trad'][1])])
    return im

# ---------------- fisken som hoppar vid bryggan ----------------
def fisk(b):
    im = ny(14, 12)
    bana = [(3, 9), (6, 3), (10, 9)][b - 1]
    vink = [-0.6, 0, 0.6][b - 1]
    fx, fy = bana
    for i in range(-4, 5):
        x = fx + i; y = fy + int(i * vink)
        for w in (-1, 0, 1):
            if abs(i) == 4 and w: continue
            pix(im, [(x, y + w, '#c8ced8' if w < 0 else '#8aa0b0' if w == 0 else '#5a6878')])
    pix(im, [(fx - 5, fy - 1, '#5a6878'), (fx - 5, fy + 1, '#5a6878'), (fx + 3, fy - 1 + int(3 * vink), '#101c1c')])
    im = kontur(im)
    if b in (1, 3):
        sx = 3 if b == 1 else 10
        pix(im, [(sx - 2, 11, '#a8c8e8'), (sx + 2, 11, '#a8c8e8'), (sx - 1, 10, '#ffffff'), (sx + 1, 10, '#ffffff')])
    return im

# ---------------- övergången: det han skrev blir en väg över vattnet (96 x 24) ----------------
def overgang(ord_):
    im = ny(96, 26); T = MAT['trad']
    if ord_ == 'bro':
        for x in range(96):
            for y in range(2, 22):
                c = T[3] if (x % 6) else T[1]
                if y in (2, 3): c = T[4]
                if y in (20, 21): c = T[1]
                pix(im, [(x, y, c)])
        for x in range(96): pix(im, [(x, 22, T[0]), (x, 23, '#24407a')])
        for px_ in range(4, 96, 22): stolpe(im, px_, 0, 3); pix(im, [(px_, 24, T[1]), (px_ + 1, 24, T[0]), (px_, 25, T[0])])
        for x in range(2, 94): pix(im, [(x, 0, T[3])])
    elif ord_ == 'stege':
        for x in range(96):
            for y in (5, 6, 17, 18): pix(im, [(x, y, T[3] if y in (5, 17) else T[1])])
        for x in range(4, 96, 7):
            for y in range(7, 17): pix(im, [(x, y, T[3]), (x + 1, y, T[2])])
        for x in range(96): pix(im, [(x, 19, '#24407a')])
    elif ord_ == 'rep':
        O = ('#7a5a30', '#a8865a', '#c8a878')                              # vanligt rep, inte baronens orange
        for x in range(96):
            y = 8 + 5 * math.sin(x / 95 * math.pi)
            pix(im, [(x, y, O[1] if x % 3 else O[2]), (x, y + 1, O[0])])
            y2 = 14 + 5 * math.sin(x / 95 * math.pi)
            pix(im, [(x, y2, O[1] if x % 3 else O[2]), (x, y2 + 1, O[0])])
        for x in range(3, 94, 6): pix(im, linje(x, 9 + 5 * math.sin(x / 95 * math.pi), x, 15 + 5 * math.sin(x / 95 * math.pi), O[0]))
        stolpe(im, 0, 2, 22); stolpe(im, 94, 2, 22)
    elif ord_ == 'flotte':
        for k in range(5):
            y0 = 3 + k * 4
            for x in range(20, 76):
                for y in range(y0, y0 + 4):
                    c = T[3] if y == y0 else T[2] if y < y0 + 3 else T[1]
                    pix(im, [(x, y, c)])
            pix(im, [(76, y0 + 1, T[4]), (76, y0 + 2, T[3])])
        for x in (28, 66):
            for y in range(3, 23): pix(im, [(x, y, '#a8865a')])
        for x in range(18, 79): pix(im, [(x, 23, '#a8c8e8' if x % 3 else '#ffffff')])
    return kontur(im)

def alla():
    ut = {}
    for i, lage in enumerate(('hel', 'huggen', 'bar')): ut[f'foremal/trask/vasstuss_{lage}.png'] = vasstuss(lage, seed=3 + i)
    ut['foremal/trask/rep_vagrat.png'] = rep_vagrat(); ut['foremal/trask/rep_lodrat.png'] = rep_lodrat()
    ut['foremal/trask/skylt_baronen.png'] = skylt_baronen()
    ut['foremal/trask/brunnen.png'] = brunnen()
    ut['foremal/trask/drake_tak.png'] = drake(0)
    for b in (1, 2): ut[f'foremal/trask/drake_flyger_{b:02d}.png'] = drake(b)
    for lage in ('tom', 'halva', 'hel'): ut[f'foremal/trask/brevram_{lage}.png'] = brevram(lage)
    for b in (1, 2): ut[f'foremal/trask/bubbelblommor_{b:02d}.png'] = bubbelblommor(b)
    ut['foremal/trask/bubbla.png'] = bubbla()
    ut['foremal/trask/stock.png'] = stock()
    ut['foremal/trask/brev_halva.png'] = brev_halva()
    for b in (1, 2): ut[f'foremal/trask/brev_halva_blot_{b:02d}.png'] = brev_halva(True, b)
    ut['foremal/trask/fjader.png'] = fjader()
    for namn, stor, rund in (('tavla_stor_rund', 1, 1), ('tavla_liten_fyrkant', 0, 0), ('tavla_stor_fyrkant', 1, 0), ('tavla_liten_rund', 0, 1)):
        ut[f'foremal/trask/{namn}.png'] = tavla(stor, rund)
    ut['foremal/trask/soffa.png'] = soffa()
    for b in (1, 2, 3): ut[f'foremal/trask/fisk_hopp_{b:02d}.png'] = fisk(b)
    for o in ('bro', 'stege', 'rep', 'flotte'): ut[f'foremal/trask/overgang_{o}.png'] = overgang(o)
    return ut

if __name__ == '__main__':
    A = alla()
    for rel, im in A.items(): skriv(im, rel)
    # översikt
    ims = list(A.items()); W = 0; rader = [[]]
    for rel, im in ims:
        if sum(i.width + 4 for _, i in rader[-1]) + im.width > 300: rader.append([])
        rader[-1].append((rel, im))
    H = sum(max(i.height for _, i in r) + 6 for r in rader)
    o = Image.new('RGBA', (304, H), (126, 170, 74, 255)); y = 2
    for r in rader:
        x = 2; hh = max(i.height for _, i in r)
        for rel, im in r: o.alpha_composite(Image.open(os.path.join(UT, rel)), (x, y + hh - im.height)); x += im.width + 4
        y += hh + 6
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/del3_foremal.png')
    print(len(A), 'föremål')
