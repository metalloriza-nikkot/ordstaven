# Kapitel 3:s rum som färdiga bilder (beslut 102.3–102.4), efter skissen version 2 med avsatsen.
# En bild per rum (82.7): marken, vattnet, husen och det som står still. Det som spelet ritar själv (figurerna,
# hornet, hjulet, ön, sköldpaddans huvud och fena, tuvorna, snäckorna, säckarna, luckorna, hissen, tavlan) är egna bilder.
# En enda skala (beslut 102.4): skalet är 280 × 192 i alla vyer (myt.SKALSKALA), som i Zelda: det stora går ut ur bild.
#   rum/kap-03/floden.png        640 × 384, kvarnen i skala med avsatsen på övervåningen
#   rum/kap-03/floden_kvall.png  samma, på kvällen (resan): mörkare, kvarnens fönster tända
#   rum/kap-03/kvarnen.png       320 × 192, kvarnen inne: axeln från hjulet till kvarnstenen och till hissens schakt
#   rum/kap-03/on.png            320 × 192, ön (skalets rygg) i floden, blöt efter att ha stigit
#   rum/kap-03/sandbanken.png    320 × 192, framdelen: skalet i nordöstra hörnet och halsen mot väster
import os, sys, math, random
from PIL import Image, ImageDraw
sys.path.insert(0, '/home/claude/skiss3')
os.chdir('/home/claude/skiss3')
from avsats import *
import rum_k3, myt
from myt import TULP, ALG, SKAL, HUD, LAV
UT = '/home/claude/rum3/ut'

# ---------------- små saker ----------------
def pol(d, cx, cy, rx, ry, seed=0):
    """En vattenpöl: kallt vatten, en mörk kant och en ljus glimt."""
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 + 0.25 * (brus(x, y, seed) - 0.5)
            if u <= 1: d.satt(x, y, VATT[3] if u > 0.55 else VATT[2])
            elif u <= 1.35 and d.inne(x, y): d.mork(x, y, 0.3)
    for k in range(max(2, int(rx * 0.6))): d.satt(int(cx - rx * 0.4 + k), int(cy - ry * 0.4), VATT[4])
    d.satt(int(cx - rx * 0.4 + 1), int(cy - ry * 0.4) - 1, '#FFFFFF')

def tangsnore(d, punkter, seed=0):
    """Ett snöre av tång som hänger över en kant och torkar."""
    rnd = random.Random(seed)
    for (x0, y0), (x1, y1) in zip(punkter, punkter[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t + math.sin(i * 0.7) * 0.7
            d.satt(int(x), int(y), ALG[rnd.randrange(3)]); d.satt(int(x), int(y) + 1, ALG[0])
            if rnd.random() < 0.18: d.satt(int(x) + rnd.choice((-1, 1)), int(y) + 2, ALG[2])

def drivstock(d, x, y, l, lut=0.12):
    """En stock av drivved, grå och urlakad, med en skugga söderut."""
    for i in range(l):
        yy = y + i * lut
        d.mork(x + i + 1, int(yy) + 4, 0.35)
        for k in range(4): d.satt(x + i, int(yy) + k, (DRIV[4], DRIV[3], DRIV[2], DRIV[1])[k] if i % 9 else DRIV[1])
    d.ellips(x + l - 1, y + l * lut + 1.5, 1.6, 2.2, DRIV[3], DRIV[0])
    for k in range(5): d.satt(x + 3 + k, int(y - 1 - k * 0.6), DRIV[2])          # en gren som sticker upp

def fagelspar(d, x, y, n=6, seed=0):
    for i in range(n):
        px, py = x + i * 5, y + (i % 2) * 3
        for (dx, dy) in ((0, 0), (-1, -1), (1, -1), (0, 1)): d.mork(px + dx, py + dy, 0.28)

def liten_snacka(d, x, y, c=0):
    col = (DRIV[4], TULP[2], TULP[1])[c % 3]
    d.satt(x, y, col); d.satt(x + 1, y, col); d.satt(x, y + 1, DRIV[2]); d.satt(x + 1, y + 1, TULP[0])

def sjostjarna(d, x, y):
    for a in range(5):
        r = math.radians(a * 72 - 90)
        for k in range(4): d.satt(int(x + k * math.cos(r)), int(y + k * math.sin(r)), DRIV[4] if k < 3 else DRIV[3])
    d.satt(x, y, DRIV[3])

def sack(d, x, y, mjol=True):
    """En mjölsäck av jute, stående, med knuten topp (x, y = botten mitt)."""
    d.skugga_under(x + 2, y, 6, 2)
    for yy in range(y - 12, y):
        t = (yy - (y - 12)) / 12
        w = 3 + 3.2 * math.sin(math.pi * min(1, 0.25 + t * 0.85))
        for xx in range(int(x - w), int(x + w) + 1):
            c = TRAMP[3] if xx < x - w * 0.2 else TRAMP[2] if xx < x + w * 0.5 else TRAMP[1]
            if yy == y - 1 or abs(xx - x) >= w - 0.5: c = TRAMP[0]
            if mjol and yy < y - 8 and brus(xx, yy, 4) < 0.35: c = MJOL[1]
            d.satt(xx, yy, c)
    for k in (-1, 0, 1): d.satt(x + k, y - 13, TRAMP[0]); d.satt(x + k * 2, y - 14, TRAMP[2])

def tunna(d, x, y):
    """En tunna snett ovanifrån: locket som en ellips, sidan med två järnband (x, y = botten mitt)."""
    d.skugga_under(x + 2, y, 7, 2)
    for yy in range(y - 10, y):
        for xx in range(x - 6, x + 7):
            c = DRIV[2] if xx < x else DRIV[1]
            if yy in (y - 8, y - 3): c = '#34343C'
            if abs(xx - x) == 6: c = DRIV[0]
            d.satt(xx, yy, c)
    d.ellips(x, y - 10, 6, 3, DRIV[3], DRIV[0]); d.ellips(x - 1, y - 10.5, 3, 1.4, MJOL[1])

def damm(d, cx, cy, rx, ry, seed=0, upptaget=()):
    """Mjöldamm som har lagt sig: tätast i mitten, glesare utåt, en ljus hinna över golvet i stället för prickar."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if not d.inne(x, y) or i_ruta(x, y, upptaget, 0): continue
            u = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 + 0.35 * (slat(x, y, 6, seed) - 0.5)
            if u >= 1: continue
            t = 1 - u
            d.satt(x, y, blanda(d.get(x, y), MJOL[1], 0.10 + 0.32 * t if (x + y) % 2 or t > 0.5 else 0.06 + 0.18 * t))   # svagare: i spelet såg det ut som rök

def kras_alfa(im):
    """Till palettens närmaste färger; det genomskinliga står kvar genomskinligt (ingen halvgenomskinlighet)."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3] < 128: px[x, y] = (0, 0, 0, 0); continue
            px[x, y] = hx(P.narmast('#%02x%02x%02x' % c[:3])[0])
    return im

def i_ruta(x, y, rutor, marg=3):
    return any(rx - marg <= x < rx + rb + marg and ry - marg <= y < ry + rh + marg for (rx, ry, rb, rh) in rutor)

# ---------------- floden ----------------
def floden(kvall=False):
    d = Duk(B, H); grund(d, 'hjul', hjul=False, horn=False, ankor=False)
    rnd = random.Random(3)
    tak = {c.upper() for c in TAK}
    for y in range(0, 50):                                                    # mossa och lav på det gamla skiffertaket
        for x in range(440, 640):
            if d.get(x, y).upper() in tak and slat(x, y, 4, 13) > 0.8 and (x + y) % 2: d.satt(x, y, ALG[1] if slat(x, y, 3, 2) > 0.6 else HUD[2])
    for x in range(441, 640):                                                 # mossan vid kvarnens fot, där det alltid stänker
        for k in range(4):
            if brus(x, 150 + k, 4) < 0.5 - k * 0.12 and d.get(x, 149 - k).upper() in {c.upper() for c in rum_k3.FLODSTEN}: d.satt(x, 149 - k, ALG[k % 2 + 1])
    for y in range(112, 120): d.satt(558, y, '#34343C')                       # lyktan vid dörren
    d.ellips(558, 122, 2.5, 3, '#9EA0AE' if not kvall else '#E8C878', '#34343C')
    # vardagen som har funnits länge: nötta stenar vid bryggkanten, rep som torkar, ett gammalt ankare, fiskekorgar
    for (x, y) in ((96, 40), (180, 42), (270, 40), (330, 44)):
        for k in range(10): d.satt(x + k, y, DRIV[1] if k % 3 else DRIV[0])        # nötta spår av kärror längs kajen
    for (x, y) in ((20, 60), (60, 20), (380, 60), (360, 140), (400, 100)):
        for k in range(rnd.randrange(3, 6)): liten_snacka(d, x + rnd.randrange(-8, 8), y + rnd.randrange(-6, 6), k)
    for (x, y) in ((10, 40), (24, 46)): myt.LAST['korg'](d, x, y)
    myt.LAST['rep'](d, 360, 160)
    drivstock(d, 12, 82, 30, 0.05)
    # tång som torkar på kajens kant och en rad med mjölsäckar som väntar vid kvarnens dörr
    tangsnore(d, [(86, 66), (100, 69), (118, 67)], 1); tangsnore(d, [(200, 66), (214, 68)], 2)
    for k in range(4): sack(d, 566 + k * 10, 166 + (k % 2) * 3)
    tunna(d, 606, 182); tunna(d, 620, 176)
    # mjöldamm vid kvarnens dörr: vitt som har trampats ut i generationer
    pass                                                                      # (mjöldammet vid dörren såg ut som rök och är borttaget)
    if kvall:
        for y in range(H):
            for x in range(B): d.mork(x, y, 0.45, '#10182A')
        for (fx, fy) in ((470, 62), (520, 62), (570, 120), (612, 120)):         # fönstren tända
            for y in range(fy + 2, fy + 10):
                for x in range(fx + 1, fx + 7): d.satt(x, y, '#E8C878' if (x + y) % 3 else '#C8963E')
            for y in range(fy + 10, fy + 18):
                for x in range(fx - 2, fx + 10):
                    if d.inne(x, y) and (x + y) % 2 == 0: d.ljus(x, y, 0.2, '#E8C878')
    kras_ihop(d); return d

# ---------------- kvarnen inne ----------------
KVARNSTEN = (104, 68)
def kvarnen():
    d = rum_k3.kvarnen(rum=True)
    m, o = objekt('kvarnen')
    # norra väggen på nytt, utan de gamla hjulen: axeln från hjulet går längs väggen, till kvarnstenen och hissen
    flodsten(d, 48, 0, 202, 40)
    for x in range(48, 250):
        for k in range(4): d.mork(x, 40 + k, 0.45 - k * 0.1)
    ay = 4                                                                     # axeln går under taket, som i en riktig kvarn
    for x in range(40, 254):                                                   # axeln, en trästock på järnfästen
        for k, c in enumerate((DRIV[3], DRIV[2], DRIV[1], DRIV[0])): d.satt(x, ay + k, c if x % 23 else DRIV[0])
    for x in (60, 150, 240):
        for y in range(ay - 4, ay + 6): d.satt(x, y, '#55555F'); d.satt(x + 1, y, '#34343C')
    def remskiva(cx, r):                                                      # remskivor, sedda snett ovanifrån
        d.ellips(cx, ay + 1.5, 3, r, DRIV[2], DRIV[0]); d.ellips(cx - 1, ay + 1.5, 1.4, r - 2, DRIV[3])
    remskiva(104, 9); remskiva(244, 7)
    for y in range(ay + 9, KVARNSTEN[1] - 12):                                  # remmen ned till kvarnstenen
        d.satt(102, y, '#3A2A18'); d.satt(106, y, '#3A2A18')
    # hissens schakt i nordöstra hörnet: två bjälkar, mörkt uppåt, ljus från övervåningen, och repet
    for y in range(0, 50):
        for x in range(250, 290):
            if 252 <= x < 288: d.satt(x, y, blanda('#1E1A18', '#E0C890', max(0, 0.35 - y / 60)) if y < 44 else blanda(d.get(x, y), '#1E1A18', 0.4))
        for x in (250, 251, 288, 289): d.satt(x, y, DRIV[2] if x in (250, 288) else DRIV[1])
    for x in range(250, 290): d.satt(x, 0, DRIV[1]); d.satt(x, 1, DRIV[3])
    for y in range(2, 48): d.satt(270, y, '#A08A6E' if y % 3 else '#7E6A52')
    # kvarnstenen: en rund trälåda med stenen i, tratten ovanför, och mjöl som har pudrat allt runt omkring
    cx, cy = KVARNSTEN
    damm(d, cx + 4, cy + 10, 50, 26, 9)
    d.skugga_under(cx + 3, cy + 16, 26, 5)
    for y in range(cy + 2, cy + 16):                                            # lådans sida mot söder
        for x in range(cx - 30, cx + 31):
            if ((x + .5 - cx) / 30) ** 2 <= 1:
                d.satt(x, y, DRIV[1] if (x - cx) % 6 == 0 else DRIV[2] if y < cy + 12 else DRIV[0])
    d.ellips(cx, cy + 2, 30, 12, DRIV[3], DRIV[0])                              # lådans lock, uppifrån
    d.ellips(cx, cy + 1, 22, 8.5, STEN[2], STEN[0])                             # stenen
    for a in range(0, 360, 30):                                                 # stenens räfflor
        r = math.radians(a)
        for k in range(5, 21): d.satt(int(cx + k * math.cos(r)), int(cy + 1 + k * 0.38 * math.sin(r)), STEN[1])
    d.ellips(cx, cy + 1, 4, 2, '#1E1A18')
    for y in range(cy - 16, cy - 4):                                            # tratten
        w = 10 - (y - (cy - 16)) * 0.6
        for x in range(int(cx - w), int(cx + w) + 1):
            d.satt(x, y, DRIV[3] if y == cy - 16 else DRIV[2] if x < cx else DRIV[1])
    for k in range(6): d.satt(cx - 6 + k * 2, cy - 15, MJOL[2])
    for y in range(cy + 10, cy + 16):                                           # rännan där mjölet kommer ut, och en säck under
        d.satt(cx + 24, y, DRIV[2]); d.satt(cx + 25, y, DRIV[1])
    sack(d, cx + 24, cy + 26)
    # vardagen: säckar i högar, en våg, en kvast, mjöl i hörnen och vita fotspår mot dörren
    upptaget = [(int(ob['x']), int(ob['y']), int(ob.get('width', 0)), int(ob.get('height', 0))) for ob in o.values()]
    upptaget += [rum_k3.TAVLA_NY if hasattr(rum_k3, 'TAVLA_NY') else (176, 126, 64, 34)]
    for (sx, sy) in ((298, 54), (310, 56), (304, 66), (294, 76), (312, 78), (302, 88)): sack(d, sx, sy)
    for (sx, sy) in ((298, 152), (311, 158), (302, 170)): tunna(d, sx, sy)
    for y in range(140, 176):                                                   # kvasten mot väggen i sydväst
        d.satt(56 + (176 - y) // 10, y, DRIV[3])
    for k in range(7):
        for j in range(5): d.satt(56 + k - 3, 176 - j, TRAMP[2] if (k + j) % 2 else TRAMP[1])
    for (x0, y0, rx_, ry_) in ((60, 48, 16, 8), (304, 100, 22, 16), (66, 176, 26, 12), (306, 186, 20, 10), (190, 48, 30, 6)):
        damm(d, x0, y0, rx_, ry_, x0, upptaget)
    for (fx, fy) in ((150, 150), (158, 140), (148, 128), (156, 118), (146, 106), (154, 96)):   # fotspår i mjölet
        if not i_ruta(fx, fy, upptaget, 0):
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2)): d.satt(fx + dx, fy + dy, blanda(d.get(fx + dx, fy + dy), MJOL[1], 0.5))
    kras_ihop(d); return d

# ---------------- ön ----------------
def on():
    d = rum_k3.on(rum=True)
    m, o = objekt('on')
    upptaget = [(int(ob['x']), int(ob['y']), int(ob.get('width', 0)), int(ob.get('height', 0))) for ob in o.values() if ob.get('width')]
    rx, ry = myt.SKALSKALA; cx, cy = 160, 98
    irx, iry = rx * 0.82, ry * 0.78
    rnd = random.Random(12)
    def inne(x, y, k=0.9): return ((x + .5 - cx) / (irx * k)) ** 2 + ((y + .5 - cy - 3) / (iry * k)) ** 2 <= 1
    # ön har just stigit: pölar i gräset, glänsande blött gräs, och tång som hänger över skalets kant
    for (px, py, prx, pry) in ((96, 100, 8, 4), (214, 108, 10, 4), (120, 150, 7, 3), (200, 160, 6, 3), (60, 92, 5, 3), (262, 112, 6, 3)):
        if inne(px, py, 0.92) and not i_ruta(px, py, upptaget, 6): pol(d, px, py, prx, pry, rnd.randrange(99))
    for y in range(192):
        for x in range(320):
            if inne(x, y) and not i_ruta(x, y, upptaget) and brus(x, y, 31) < 0.006: d.satt(x, y, VATT[4])  # några droppar som glittrar (tätare såg ut som snö)
    for a in (200, 235, 300, 330, 20, 150, 120):
        r = math.radians(a)
        x0, y0 = cx + irx * 0.98 * math.cos(r), cy + 3 + iry * 0.98 * math.sin(r)
        x1, y1 = cx + rx * 1.0 * math.cos(r), cy + ry * 1.0 * math.sin(r)
        tangsnore(d, [(x0, y0), ((x0 + x1) / 2 + 2, (y0 + y1) / 2 + 2), (x1, y1 + 6)], a)
    for (x, y) in ((70, 70), (250, 70), (110, 130), (230, 150), (180, 40), (140, 170)):   # platta stenar och snäckor
        if inne(x, y, 0.85) and not i_ruta(x, y, upptaget, 4):
            d.ellips(x, y, 4, 2.5, STEN[2], STEN[0]); d.satt(x - 1, y - 1, STEN[4])
            liten_snacka(d, x + 6, y + 1, rnd.randrange(3))
    for (x, y) in ((86, 120), (240, 96)):
        if not i_ruta(x, y, upptaget, 4): sjostjarna(d, x, y)
    kras_ihop(d); return d

# ---------------- sandbanken ----------------
import json as _json
# vattnet ur kartan (0.94.1: vattnet står fast i kartan och flyttas inte när bilden ritas om)
VATTEN_SB = [ob for ob in _json.load(open('/home/claude/ordstaven/kartor/den-gomda-dalen/sandbanken.tmj'))['layers'][0]['objects']
             if any(q['name'] == 'vatten' and q['value'] for q in ob.get('properties', []))]

def sandbanken():
    """Som skissen version 2, men stranden är en mjuk, oregelbunden sandbank i stället för en klippt ellips."""
    m, o = objekt('sandbanken')
    SB = dict(rum_k3.SB); SB['skalkant'] = (250, 128, 34, 12)                 # kartan 0.92.0
    d = Duk(320, 192)
    d.mark('vatten', (0, 0, 320, 192))
    vrutor = [(int(ob['x']), int(ob['y']), int(ob['width']), int(ob['height'])) for ob in VATTEN_SB]
    from PIL import ImageFilter
    mask = Image.new('L', (320, 192), 255)                                    # stranden följer kartans vatten (0.92.0), utjämnad
    md = ImageDraw.Draw(mask)
    for (rx, ry, rb, rh) in vrutor: md.rectangle([rx, ry, rx + rb - 1, ry + rh - 1], fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(5)); mpx = mask.load()
    def ar_sand(x, y):
        return mpx[x, y] / 255 + 0.25 * (slat(x, y, 6, 5) - 0.5) > 0.5
    d.mark('sand', ar_sand)
    rita_terrang(d, seed=71)
    upptaget = [(int(ob['x']), int(ob['y']), int(ob.get('width', 0)), int(ob.get('height', 0))) for ob in o.values() if ob.get('width')]
    upptaget += [(100, 60, 90, 60), (190, 132, 60, 34)]                         # där huvudet och fenan ligger
    sand = lambda x, y: d.inne(x, y) and d.typ[y][x] == 'sand'
    vatten = lambda x, y: d.inne(x, y) and d.typ[y][x] == 'vatten'
    # blöt, mörkare sand närmast vattnet, och en tångrand där floden stod som högst
    for y in range(192):
        for x in range(320):
            if not sand(x, y): continue
            nara = min((max(abs(dx), abs(dy)) for dx in range(-10, 11, 2) for dy in range(-10, 11, 2) if vatten(x + dx, y + dy)), default=99)
            if 2 < nara <= 6: d.satt(x, y, STIG[2] if (x + y) % 3 else STIG[3])
            elif nara <= 2 and d.get(x, y).upper() not in ('#3A2818',): d.satt(x, y, STIG[2])
            elif 8 <= nara <= 10 and slat(x, y, 3, 77) > 0.55: d.satt(x, y, ALG[1] if brus(x, y, 2) < 0.5 else DRIV[2])
    for k in range(10):                                                         # vågrippel
        y0 = 22 + k * 15
        for x in range(10, 260):
            y = int(y0 + 3 * math.sin(x / 11 + k * 1.7))
            if sand(x, y) and sand(x, y + 1) and not i_ruta(x, y, upptaget) and (x // 4 + k) % 6 < 4 and d.get(x, y).upper() in (STIG[3].upper(), STIG[4].upper()):
                d.satt(x, y, STIG[2]); d.satt(x, y + 1, STIG[4])
    cx, cy = SB['skal']
    x0, y0, b, h = SB['skalkant']
    # Sköldpaddans framdel hänger ihop (beslut 106.3): halsen kommer ut under skalets kant och går fram till huvudet,
    # armarna kommer ut under kanten och slutar i handleden där fenan sitter. Huvudet och vänstra fenan är egna bilder
    # (de rör sig), och de läggs på kartans huvud_plats och fena_plats, där halsen och armen slutar.
    hx_, hy = 150, 92                                                           # huvudets mitt (huvud_plats 98, 64 + 52, 28)
    HALS = [(hx_ + 32, hy + 4), (hx_ + 66, hy + 8), (hx_ + 112, hy + 12)]
    ARM_V = [(268, 133), (259, 141), (251, 148)]                                # vänstra armen, till fenans handled (186+65, 132+16)
    ARM_H = [(318, 118), (317, 140), (316, 150)]
    for y in range(192):                                                        # skuggan under huvudet, halsen och armarna:
        for x in range(320):                                                    # förskjuten söderut, så att huvudet är lyft
            if not sand(x, y): continue
            def nara(linje, r):
                return min(((x - px) ** 2 + ((y - 10) - py) ** 2) ** .5 - r for (px, py) in linje)
            m = min(nara([(hx_, hy)], 30), nara(HALS, 14), nara(ARM_V, 9), nara(ARM_H, 9))
            if m < 0: d.satt(x, y, STIG[1] if (x + y) % 2 else STIG[2])
            elif m < 3 and (x + y) % 2: d.satt(x, y, STIG[2])
    myt.ror(d, HALS, 13, 17, seed=1)
    myt.ror(d, ARM_H, 10, 8, seed=3)
    myt.skal(d, cx, cy, seed=9, trad=[(300, 34, 1.2)])
    for y in range(y0 - 2, y0 + h + 2):                                          # mörkret under skalets kant (skalkant), mjuk kant
        for x in range(x0 - 3, x0 + b + 3):
            u = ((x + .5 - (x0 + b / 2)) / (b / 2 + 2)) ** 2 + ((y + .5 - y0) / (h + 1)) ** 2
            if u <= 0.8: d.satt(x, y, '#0E0E12')
            elif u <= 1.0 and d.inne(x, y): d.mork(x, y, 0.6)
    myt.ror(d, ARM_V, 9, 8, seed=2)                                              # vänstra armen kommer ut ur mörkret
    myt.fena2(d, 316, 152, 1.0, mot='hoger')                                    # den andra framfenan står still, mot öster
    fagelspar(d, 40, 112, 7, 1); fagelspar(d, 200, 30, 5, 2)
    # (drivveden är borttagen: den grå stocken uppe till vänster såg ut som en sak han borde göra något med, 106.3)
    rnd = random.Random(8)
    for (x, y) in ((50, 140), (96, 36), (188, 120), (70, 92), (236, 104), (120, 168)):
        if sand(x, y) and not i_ruta(x, y, upptaget, 2): liten_snacka(d, x, y, rnd.randrange(3))
    # (stenarna är borttagna av samma skäl som drivveden)
    kras_ihop(d); return d

if __name__ == '__main__':
    os.makedirs(UT + '/rum/kap-03', exist_ok=True)
    for n, f in (('floden', floden), ('floden_kvall', lambda: floden(True)), ('kvarnen', kvarnen), ('on', on), ('sandbanken', sandbanken)):
        f().im.save(f'{UT}/rum/kap-03/{n}.png'); print(n)
    # floden_over: kajkanten, den lilla pråmen och bryggan vid kvarnen, ovanför ön (Tekniks utsnitt, 0.93.0).
    # Samma utsnitt, men ur den omritade bilden, så att kanten stämmer med trumman och nischen.
    mask = Image.open('/home/claude/ordstaven/assets/rum/kap-03/floden_over.png').split()[3]
    bas = Image.open(f'{UT}/rum/kap-03/floden.png').convert('RGBA')
    over = Image.new('RGBA', bas.size, (0, 0, 0, 0)); over.paste(bas, (0, 0), mask.point(lambda a: 255 if a > 0 else 0))
    over.save(f'{UT}/rum/kap-03/floden_over.png'); print('floden_over')
