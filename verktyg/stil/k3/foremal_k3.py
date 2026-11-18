# Kapitel 3 (beslut 100.6): föremålen som inte beror på rummens plats. Ritade enligt *Så ritas allt* (10b).
# Allt i foremal/flod/. Fötterna (nederkanten mitt i) är föremålets plats, som i kapitel 1–2.
#   ön:        tuva_hel, tuva_lyft (mossan lyft åt sidan), snigel, bar_litet, fisk_liten_01–02, skylt_skal (Farfars mässing,
#              ordfältet tomt för HTML-texten, sprickan och raden med tecken), snacka_klump, snacka_bort_01–02
#   floden:    tang_tuss_hel, tang_tuss_huggen (hjulet och fenan), skuggan_01–03, ljusbat_01–02, planka_on, mjolmoln_01–03
#   sandbanken: flaska, krabba_01–02, raka, ankare (hänger), ankare_sand (borrat i sanden), skalkant (mörkret)
#   kvarnen:   tavla_kvarn (målad, två tomma rader), lucka_stangd, lucka_oppen, sack_stor, sack_liten, sack_liten_puff, sackhiss
import os, sys, math
HAR = '/home/claude/k3'; os.chdir(HAR)
exec(open('/home/claude/k3/pix.py').read())
from PIL import Image
from bybor_hjalp import skilj
MAT.update({
 'lov':   ['#14301a', '#1e4a24', '#2e6a30', '#4a8e3a', '#78b456'],
 'gras':  ['#3e6e2e', '#5a8e3a', '#6fa34a', '#86b85a', '#9ac466'],
 'jord':  ['#24160c', '#3a2414', '#5a3c26', '#7a5638', '#9c7450'],
 'mass':  ['#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0'],
 'tang':  ['#10241a', '#1c432e', '#3e5a4a', '#4e6e5a', '#5e806a'],
 'sack':  ['#5e4a36', '#7e6a52', '#a08a6e', '#d6cfa4', '#f2e8c8'],
 'tra':   ['#24160c', '#4a3018', '#6a4626', '#8a6038', '#a87c50'],
 'jarn':  ['#1e1e24', '#34343c', '#55555f', '#8a8a96', '#c8cad4'],
 'skal':  ['#3a2414', '#7a5638', '#c49a72', '#e8d2b0', '#fff2e0'],
 'krabba':['#5a1414', '#8a2420', '#c23a2e', '#e86a5a', '#f6a89a'],
 'snigel':['#3a2414', '#7a5638', '#c49a72', '#e8d2b0', '#fff2e0'],
 'vit':   ['#6e747f', '#b8bec6', '#dce0e4', '#eeeff4', '#ffffff'],
 'marin': ['#0e1a50', '#1a3290', '#2a52c8', '#4f7ae8', '#9ab6ff'],
})
sys.path.insert(0, '/home/claude/palett'); from palett import Palett as _P; _p = _P()
for _k in list(MAT): MAT[_k] = [_p.narmast(c.lower())[0] for c in MAT[_k]]      # alla toner exakt ur paletten
def H(h):
    h = _p.narmast(h.lower())[0]
    return tuple(int(h[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
def rita(im, pts):
    p = im.load()
    for (x, y, c) in pts:
        if 0 <= x < im.width and 0 <= y < im.height: p[x, y] = H(c) if isinstance(c, str) else c
    return im
def brus(x, y, s=7): return ((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) % 1000 / 1000.0

# ---------------- ön ----------------
def tuva(lyft=False):
    d = Duk(24, 18)
    if lyft:
        d.ellips(12, 13, 9, 4.2, 'jord', 'grop', toner=(0, 1, 1, 2))                 # en grop av mörk jord
        d.ellips(21, 9, 4.5, 6.5, 'lov', 'tuva', zbias=0.2)                           # mossan vikt åt sidan, stående på kant
    else:
        d.ellips(12, 11, 10.5, 6.5, 'lov', 'tuva', zbias=0.2)
        d.ellips(8, 9, 4.5, 3.2, 'lov', 'tuva2', zbias=0.35)
    if not lyft: skilj(d, 'tuva2', 'tuva', 1)
    d.kontur()
    for (x, y), nm in list(d.del_.items()):
        if nm.startswith('tuva') and brus(x, y, 3) < 0.12: d.satt(x, y, 'lov', 4)
        if nm == 'grop' and brus(x, y, 4) < 0.08: d.satt(x, y, 'jord', 3)
    return d.bild()
def snigel():
    d = Duk(12, 8); d.ellips(5, 6, 4.5, 1.5, 'snigel', 'fot', toner=(1, 2, 3, 3)); d.ellips(6, 4, 3, 2.8, 'tra', 'hus', zbias=0.2)
    d.kontur(); im = d.bild()
    return rita(im, [(1, 4, '#3a2414'), (0, 3, '#3a2414'), (2, 4, '#3a2414'), (6, 4, '#6a4626'), (7, 3, '#4a3018')])
def bar_litet():
    d = Duk(8, 8); d.ellips(4, 4.5, 2.6, 2.6, 'krabba', 'bar', zbias=0.3); d.kontur(); return rita(d.bild(), [(3, 1, '#2e6a30'), (4, 1, '#4a8e3a')])
def fisk_liten(b=1):
    d = Duk(12, 8); d.ellips(5, 4, 4, 2, 'marin', 'kropp', zbias=0.25)
    for k in range(3): d.satt(9 + k, 4 + (k if b == 1 else -k) // 2 - (1 if k == 2 else 0) * (1 if b == 1 else -1), 'marin', 1, 'stjart')
    d.kontur(); return rita(d.bild(), [(3, 3, '#ffffff'), (3, 4, '#101010')])

SKYLT = (72, 36)
ORDFALT = (8, 4, 56, 14)        # där SKÖLD PADDA står (HTML), sprickan går genom x 36
RADFALT = (6, 22, 60, 10)       # raden med tecken, som snäckorna täcker
def skylt_skal():
    W, Hh = SKYLT
    d = Duk(W, Hh)
    for y in range(2, Hh - 1):
        for x in range(1, W - 1):
            ny = (y - 2) / (Hh - 3); nx = (x - 1) / (W - 2)
            t = 4 if (ny < 0.12 or nx < 0.04) else 3 if ny < 0.5 else 2 if ny < 0.92 else 1
            d.satt(x, y, 'mass', t, 'platta')
    d.kontur()
    im = d.bild(); pts = []
    x0, y0, b, h = ORDFALT                                                          # ordfältet: ljust ingraverat
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b): pts.append((x, y, '#f5e6a0' if y > y0 else '#8e6a22'))
    for y in range(1, Hh - 1):                                                      # sprickan mellan SKÖLD och PADDA
        x = 36 + (1 if (y // 3) % 2 else 0)
        pts.append((x, y, '#4a3410'))
    x0, y0, b, h = RADFALT                                                          # raden: en mörkare remsa
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b): pts.append((x, y, '#c8963e' if y > y0 else '#8e6a22'))
    for k in range(4):                                                              # kompassrosen i hörnet: Farfars märke
        a = math.radians(k * 90)
        for r in range(1, 4): pts.append((int(4 + r * math.cos(a)), int(30 + r * math.sin(a)), '#4a3410'))
    pts += [(4, 30, '#f5e6a0')] + [(x, 2, '#4a3410') for x in (3, 68)] + [(x, Hh - 3, '#4a3410') for x in (3, 68)]   # nitarna
    im = rita(im, pts)
    import importlib.util
    T = {}; exec(open('/home/claude/k3/tecken.py').read().split("if __name__")[0], T)
    rad = T['skylt_rad']().resize((60, 10), Image.NEAREST)
    im.alpha_composite(rad, (RADFALT[0], RADFALT[1]))
    return im
def snacka_klump():
    d = Duk(16, 12)
    for (cx, cy, r) in ((5, 7, 3.3), (10, 6, 3.6), (8, 9, 3.0), (12, 9, 2.6), (4, 9.5, 2.4)):
        d.ellips(cx, cy, r, r * 0.85, 'skal', f's{cx}{cy}', zbias=0.3)
    d.kontur(); im = d.bild()
    return rita(im, [(5, 6, '#7a5638'), (10, 5, '#7a5638'), (8, 8, '#7a5638'), (11, 5, '#fff2e0'), (6, 6, '#fff2e0')])
def snacka_bort(b=1):
    im = Image.new('RGBA', (20, 16), (0, 0, 0, 0))
    k = snacka_klump().resize((8, 6), Image.NEAREST)
    for (x, y) in (((2, 6), (10, 4)) if b == 1 else ((0, 9), (12, 1))): im.alpha_composite(k, (x, y))
    return im

# ---------------- floden ----------------
def tang_tuss(huggen=False):
    d = Duk(16, 22)
    blad = [(4, 0.0), (8, 0.6), (12, 0.2), (6, 1.1), (10, 1.5)]
    for i, (x0, fas) in enumerate(blad):
        topp = 2 if not huggen else 14
        for y in range(topp, 21):
            x = int(x0 + 1.6 * math.sin(y / 3.0 + fas))
            for w in (0, 1): d.satt(x + w, y, 'tang', 3 if (y + i) % 4 else 4, f'b{i}')
    d.kontur(); im = d.bild()
    if huggen:
        for x in range(2, 15):
            if im.getpixel((x, 14))[3]: im.putpixel((x, 14), H('#9ac8e8'))           # snittet lyser ljust
    return im

def skuggan(steg=1):
    """Något jättestort under vattnet: en mörk, mjuk form utan detaljer. 1 glider, 2 stannar och lyssnar, 3 sjunker."""
    W, Hh = 136, 64
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); p = im.load()
    a = {1: 110, 2: 130, 3: 70}[steg]
    rx, ry = {1: 58, 2: 60, 3: 52}[steg], {1: 22, 2: 24, 3: 19}[steg]
    for y in range(Hh):
        for x in range(W):
            u = ((x + 0.5 - 68) / rx) ** 2 + ((y + 0.5 - 32) / ry) ** 2
            for (fx, fy, fr) in ((40, 20, 7), (96, 20, 7), (44, 44, 6), (92, 44, 6), (118, 32, 6)):   # små suddiga utbuktningar
                u = min(u, ((x + 0.5 - fx) / (fr * 1.6)) ** 2 + ((y + 0.5 - fy) / fr) ** 2 + 0.4)
            if u < 1.0:
                kant = u > 0.72
                if kant and (x + y) % 2: continue                                   # rastrerad, mjuk kant
                p[x, y] = H('#24407a')[:3] + (a if not kant else a // 2 + 20,)
    return im

def ljusbat(b=1):
    d = Duk(12, 12)
    d.ellips(6, 9, 5, 2.2, 'tra', 'bat', toner=(1, 2, 3, 3), zbias=0.2)
    d.kontur(); im = d.bild()
    pts = [(6, 6, '#eeeff4'), (6, 5, '#eeeff4'), (6, 4, '#f2d22e' if b == 1 else '#f5e6a0'), (6, 3, '#fff2b8'), (5, 4 if b == 1 else 3, '#f2d22e')]
    pts += [(x, 8, '#2a52c8' if x % 2 else '#ffffff') for x in range(3, 10)]          # flodfolkets ränder på relingen
    return rita(im, pts)
def planka_on():
    im = Image.new('RGBA', (40, 10), (0, 0, 0, 0))
    C = MAT['tra']
    for y in range(2, 9):
        for x in range(1, 39): im.putpixel((x, y), H(C[0] if y in (2, 8) or x in (1, 38) else C[4] if y == 3 else C[3] if y < 6 else C[2]))
    for x in (10, 20, 30): im.putpixel((x, 5), H(C[1])); im.putpixel((x, 6), H(C[1]))
    return im
def mjolmoln(steg=1):
    """Mjölet som blåser ut ur hornet: ett vitt moln som växer och glesnar."""
    W, Hh = 40, 32
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); p = im.load()
    r = {1: 7, 2: 12, 3: 16}[steg]; cx = {1: 8, 2: 16, 3: 22}[steg]
    for y in range(Hh):
        for x in range(W):
            u = math.hypot((x - cx) / r, (y - 16) / (r * 0.8))
            if u < 1 and (steg < 3 or brus(x, y, 2) > 0.45):
                p[x, y] = H('#ffffff' if u < 0.5 else '#eeeff4' if u < 0.8 else '#dce0e4')
    return im

# ---------------- sandbanken ----------------
def flaska():
    d = Duk(10, 14)
    d.ellips(5, 9.5, 3.6, 4.2, 'mass', 'kropp', zbias=0.25)
    for y in range(2, 6): d.satt(4, y, 'mass', 3, 'hals'); d.satt(5, y, 'mass', 2, 'hals')
    d.kontur(); im = d.bild()
    pts = [(4, 1, '#7e6a52'), (5, 1, '#a08a6e'), (4, 0, '#5e4a36'), (5, 0, '#5e4a36')]
    pts += [(5, 8, '#4a3410'), (4, 9, '#4a3410'), (6, 9, '#4a3410'), (5, 10, '#4a3410'), (5, 9, '#f5e6a0')]   # kompassrosen
    return rita(im, pts)
def krabba(b=1):
    d = Duk(16, 10)
    d.ellips(8, 6, 4.6, 2.8, 'krabba', 'kropp', zbias=0.25)
    for s in (-1, 1):
        d.ellips(8 + s * 6, 3.6, 1.8, 1.4, 'krabba', f'klo{s}', zbias=0.3)
        for k in range(3): d.satt(8 + s * (4 + k), 8 + (k + b) % 2, 'krabba', 1, 'ben')
    d.kontur(); im = d.bild()
    return rita(im, [(7, 4, '#101010'), (9, 4, '#101010'), (7, 3, '#ffffff'), (9, 3, '#ffffff')])
def raka():
    d = Duk(12, 8)
    for i in range(6): d.ellips(2 + i * 1.5, 4 + (1 if i in (1, 4) else 0) * 0.5, 1.6, 1.8 - i * 0.12, 'krabba', f'l{i}', toner=(2, 3, 4, 4))
    d.kontur(); return rita(d.bild(), [(10, 3, '#101010'), (11, 2, '#c23a2e'), (11, 1, '#c23a2e')])
def ankare(sand=False):
    W, Hh = 24, 28
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); C = MAT['jarn']
    pts = []
    for y in range(4, 24): pts += [(11, y, C[3]), (12, y, C[2])]                        # skaftet
    for x in range(7, 17): pts += [(x, 7, C[3])]                                        # stocken
    for k in range(9):                                                                   # armarna i en båge
        pts += [(4 + k, 23 - abs(4 - k) // 2 - (k // 3), C[2]), (19 - k, 23 - abs(4 - k) // 2 - (k // 3), C[2])]
    pts += [(3, 19, C[3]), (4, 18, C[3]), (20, 19, C[3]), (19, 18, C[3])]                # flikarna
    pts += [(11, 2, C[2]), (12, 2, C[2]), (10, 3, C[2]), (13, 3, C[2]), (11, 4, C[1]), (12, 4, C[1])]   # ringen
    if not sand:
        for y in range(0, 2): pts += [(11, y, '#7e6a52'), (12, y, '#a08a6e')]           # repet upp till luftskeppet
    im = rita(im, pts)
    out = []
    for y in range(Hh):
        for x in range(W):
            if im.getpixel((x, y))[3] == 0 and any(0 <= x + a < W and 0 <= y + b < Hh and im.getpixel((x + a, y + b))[3] == 255 and
                                                    im.getpixel((x + a, y + b))[:3] != H('#7e6a52')[:3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.append((x, y, C[0]))
    im = rita(im, out)
    if sand:                                                                             # borrat i sanden: nedre delen borta, en sandvall
        p = im.load()
        for y in range(20, Hh):
            for x in range(W): p[x, y] = (0, 0, 0, 0)
        im = rita(im, [(x, 20, '#c49a72') for x in range(5, 19)] + [(x, 21, '#a08a6e') for x in range(4, 20)] + [(x, 19, '#e8d2b0') for x in range(7, 17)])
    return im
def skalkant():
    """Det mörka hålet under skalets bakre kant (frivilligt, LJUS)."""
    W, Hh = 40, 14
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); p = im.load()
    for y in range(Hh):
        for x in range(W):
            u = ((x + 0.5 - 20) / 19) ** 2 + ((y + 0.5 - 4) / 9.5) ** 2
            if u < 1 and y >= 2: p[x, y] = H('#0e0e12' if u < 0.6 else '#1e1e24' if u < 0.85 else '#24160c')
    return im

# ---------------- kvarnen ----------------
TAVLA = (64, 34); TAVLA_RADER = ((6, 7, 52, 9), (6, 19, 52, 9))   # var raderna står (HTML)
def tavla_kvarn():
    W, Hh = TAVLA
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); C = MAT['tra']; pts = []
    for y in range(Hh):
        for x in range(W):
            kant = x < 3 or x > W - 4 or y < 3 or y > Hh - 4
            if kant:
                rand = ((x + y) // 2) % 2                                                    # ramen målad i flodfolkets ränder
                c = '#2a52c8' if rand else '#ffffff'
                if x in (0, W - 1) or y in (0, Hh - 1): c = C[0]
                pts.append((x, y, c))
            else:
                pts.append((x, y, '#e8d2b0' if (y // 4) % 3 else '#d6cfa4'))              # bräder, ljust målade
    for (x0, y0, b, h) in TAVLA_RADER:
        for x in range(x0, x0 + b): pts.append((x, y0 + h, '#a08a6e'))                  # en linje under varje rad
    pts += [(W // 2 - 1, 1, '#5e4a36'), (W // 2, 1, '#5e4a36')]
    return rita(im, pts)
def lucka(oppen=False):
    W, Hh = 20, 14
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); C = MAT['tra']; pts = []
    for y in range(Hh):
        for x in range(W):
            kant = x in (0, W - 1) or y in (0, Hh - 1)
            if oppen and not kant: pts.append((x, y, '#0e0e12' if y > 3 else '#24160c'))
            else: pts.append((x, y, C[0] if kant else C[3] if (x % 5) else C[2]))
    if not oppen: pts += [(9, 7, '#55555f'), (10, 7, '#8a8a96'), (9, 8, '#34343c'), (10, 8, '#55555f')]   # ringen att lyfta i
    else: pts += [(x, 1, C[4]) for x in range(1, W - 1)]
    return rita(im, pts)
def sack(stor=True, puff=False):
    W, Hh = (22, 26) if stor else (14, 16)
    d = Duk(W, Hh)
    if puff: d.ellips(W / 2, Hh - 3, W / 2 - 0.5, 3, 'sack', 'sack', zbias=0.1)
    else:
        d.ellips(W / 2, Hh * 0.6, W / 2 - 1, Hh * 0.4 - 0.5, 'sack', 'sack', zbias=0.2)
        d.ellips(W / 2, Hh * 0.18, W * 0.18, Hh * 0.13, 'sack', 'knut', zbias=0.3)
        skilj(d, 'knut', 'sack', 1)
    d.kontur(); im = d.bild()
    if not puff: im = rita(im, [(int(W / 2) - 1, int(Hh * 0.3), '#7e6a52'), (int(W / 2), int(Hh * 0.3), '#7e6a52'), (int(W / 2) + 1, int(Hh * 0.3), '#7e6a52')])
    else: im = rita(im, [(2, Hh - 7, '#ffffff'), (W - 3, Hh - 8, '#ffffff'), (W // 2, Hh - 9, '#eeeff4')])   # PUFF: mjöl yr
    return im
def sackhiss():
    W, Hh = 28, 40
    im = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); C = MAT['tra']; pts = []
    for y in range(28, 36):
        for x in range(1, W - 1): pts.append((x, y, C[0] if y in (28, 35) or x in (1, W - 2) else C[3] if y < 31 else C[2]))
    for y in range(0, 28):
        for x in (4, W - 5): pts += [(x, y, '#a08a6e'), (x + 1, y, '#7e6a52')]          # repen upp mot hålet i taket
    return rita(im, pts)

ALLA = {
    'tuva_hel': lambda: tuva(False), 'tuva_lyft': lambda: tuva(True), 'snigel': snigel, 'bar_litet': bar_litet,
    'fisk_liten_01': lambda: fisk_liten(1), 'fisk_liten_02': lambda: fisk_liten(2), 'skylt_skal': skylt_skal,
    'snacka_klump': snacka_klump, 'snacka_bort_01': lambda: snacka_bort(1), 'snacka_bort_02': lambda: snacka_bort(2),
    'tang_tuss_hel': lambda: tang_tuss(False), 'tang_tuss_huggen': lambda: tang_tuss(True),
    'skuggan_01': lambda: skuggan(1), 'skuggan_02': lambda: skuggan(2), 'skuggan_03': lambda: skuggan(3),
    'ljusbat_01': lambda: ljusbat(1), 'ljusbat_02': lambda: ljusbat(2), 'planka_on': planka_on,
    'mjolmoln_01': lambda: mjolmoln(1), 'mjolmoln_02': lambda: mjolmoln(2), 'mjolmoln_03': lambda: mjolmoln(3),
    'flaska': flaska, 'krabba_01': lambda: krabba(1), 'krabba_02': lambda: krabba(2), 'raka': raka,
    'ankare': lambda: ankare(False), 'ankare_sand': lambda: ankare(True), 'skalkant': skalkant,
    'tavla_kvarn': tavla_kvarn, 'lucka_stangd': lambda: lucka(False), 'lucka_oppen': lambda: lucka(True),
    'sack_stor': lambda: sack(True), 'sack_liten': lambda: sack(False), 'sack_liten_puff': lambda: sack(False, True), 'sackhiss': sackhiss,
}

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    UT = '/home/claude/k3/ut/foremal/flod'; os.makedirs(UT, exist_ok=True)
    ims = {}
    for n, f in ALLA.items():
        im = f(); ims[n] = im
        (P.las_bild(im, n) if not n.startswith('skuggan') else P.las_bild(im.convert('RGBA'), n)).save(f'{UT}/{n}.png')
    o = Image.new('RGBA', (620, 200), (202, 178, 130, 255)); x = y = 2; hmax = 0
    for n, im in ims.items():
        if x + im.width > 618: x = 2; y += hmax + 4; hmax = 0
        if n.startswith('skuggan') or n.startswith('ljusbat') or n.startswith('mjol'):
            bg = Image.new('RGBA', im.size, (62, 126, 186, 255)); bg.alpha_composite(im); im = bg
        o.alpha_composite(im, (x, y)); x += im.width + 4; hmax = max(hmax, im.height)
    o.resize((o.width * 2, o.height * 2), Image.NEAREST).save('/tmp/foremal_k3_x2.png'); print(len(ims))
