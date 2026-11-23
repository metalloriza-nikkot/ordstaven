# Kapitel 4, beslut 122.2 och 122.4: raset som en följd av bilder som flyttas, snön som fyller grottans öppning
# inifrån, ungen på klippan (stege, rep och trappa), och det som glimtar i istappsgrottan.
# Allt läses till masterpaletten 1.2. Inga bokstäver.
#
# foremal/berg/  (fötterna = nederkantens mitt, om inget annat sägs)
#   ras_front_01–03        112 x 56   rasets front: en rullande våg av snö som Teknik flyttar nedför berget (växla ca 90 ms)
#   ras_sten_01–04          16 x 14   en sten som studsar och snurrar (växla ca 80 ms, Teknik flyttar i bågar)
#   ras_sten_liten_01–04    10 x 9    en mindre sten
#   ras_damm_01–03          56 x 36   snödamm som yr upp efter fronten (växla, och tona med opacitet)
#   ras_vagg_01–02         176 x 88   snön som står i luften: en hel VÄGG av packad snö som tornar upp över dem, med
#                                     stenar i och ett överhäng, inte ett moln. Smulor faller (två bilder, ca 300 ms)
#   mynning_inifran_01–04   44 x 48   grottans öppning i söder, sedd inifrån: dagsljus, snö som väller in, halvt, fullt
#                                     (läggs med övre vänstra hörnet i ca (20, 336) i grottan på 0.105.1)
#   klippa_stege             24 x 72  stegen som staven gör mot klippan (läggs i klippan_uppe, fötterna på y 244)
#   klippa_rep               24 x 72  repet med knutar, fäst i en sten på krönet
#   klippa_trappa            32 x 72  trappsteg i isen, i sicksack uppför klippan
#   tand_isen_01–02          24 x 16  tanden i ett isblock i istappsgrottan, som glimtar (växla ca 500 ms)
#   lockglimt_01–04           8 x 8   en glimt som tänds och släcks (lägg 2–3 längs vägen in till istappsgrottan)
#   ristning_tand            20 x 10  Farfars ristning av en tand i isväggen (bilden som stig 4:s ord kommer ur)
# figurer/hjalte/
#   hjalte_klattrar_unge_upp_01–02  24 x 44  hjälten klättrar uppåt, och ungen hänger i hans ryggsäck med tänderna och
#                                     sprattlar med benen. Samma bilder för stegen, repet och trappan. Ungen flyger aldrig.
# bildkort/
#   tand_isen                48 x 48  Dinobokens sida, En stor tand: tanden i isen, och ungens nos bredvid
import os, sys, math, random
from PIL import Image
_f = open('/home/claude/k4/foremal_k4.py').read()
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k4/ut122']
exec(_f[:_f.index("\ndef snomassa(")])
exec(_f[_f.index("\n_cache = {}"):_f.index("\nif __name__ == '__main__':\n")])
H = lambda c: hx(c) + (255,)
BLA = '#3e4a6a'
GLIMT = ('#ffffff', '#e8f4ff', '#bfe3ef')
TRA = ('#3a2414', '#5a3a22', '#7a5638', '#a07a50', '#c4a070')
def bild(rel): return Image.open('/home/claude/inkorg/' + rel).convert('RGBA')

def ras_front(n):
    d = Bild(112, 56); rnd = random.Random(10)
    for k in range(11):                                                      # vågen: klumpar i två rader, högst i mitten
        x = 6 + k * 10; top = 14 + abs(k - 5) * 1.6
        snoklump(d, x + (n * 3 + k) % 4, top + rnd.randint(-2, 2), 9 + rnd.random() * 3, 8 + rnd.random() * 3, rnd)
        snoklump(d, x + 4, top + 14 + rnd.randint(-2, 2), 8, 7, rnd)
    for x in range(2, 110):                                                  # framsidan i blå skugga
        for y in range(int(34 + 3 * math.sin(x / 6 + n)), int(40 + 2 * math.sin(x / 4))):
            if d.g(x, y): d.s(x, y, SNO[0] if (x + y) % 3 else SNO[1])
    r2 = random.Random(30 + n)
    for _ in range(26):                                                      # yrsnö och fartstreck framför
        x = r2.randrange(2, 110); y = r2.randrange(40, 56)
        d.s(x, y, SNO[3]);
        if r2.random() < 0.4: d.s(x, y - 1, SNO[2])
    for _ in range(4):                                                       # stenar i vågen
        x = r2.randrange(12, 100); y = r2.randrange(16, 34)
        d.ell(x, y, 2.5, 2, STEN[2], STEN[3], STEN[0])
    return d.kontur(BLA).im

def ras_sten(n, liten=False):
    b, h = (10, 9) if liten else (16, 14)
    d = Bild(b, h); cx, cy = b / 2, h / 2 + 0.5; rx, ry = (b / 2 - 1, h / 2 - 1.5)
    d.ell(cx, cy, rx, ry, STEN[2], STEN[3], STEN[1], STEN[0])
    a = n * math.pi / 2                                                      # en spricka och en snöfläck som snurrar runt
    for t in range(-2, 3):
        d.s(cx + math.cos(a) * t * 1.2, cy + math.sin(a) * t * 1.0, STEN[0])
    d.ell(cx + math.cos(a + 2) * rx * 0.45, cy + math.sin(a + 2) * ry * 0.45, 1.6 if liten else 2.4, 1.2 if liten else 1.8, SNO[3], SNO[3], SNO[2])
    return d.kontur(BLA).im

def ras_damm(n):
    d = Bild(56, 36); rnd = random.Random(50 + n)
    for k in range(7):
        cx = 8 + k * 7 + rnd.randint(-2, 2); cy = 24 - (k % 3) * 4 - n * 2
        r = 6 + n * 1.5
        for y in range(int(cy - r), int(cy + r)):
            for x in range(int(cx - r), int(cx + r)):
                if ((x - cx) / r) ** 2 + ((y - cy) / (r * 0.8)) ** 2 <= 1 and (x + y + n) % (2 if n < 2 else 3) == 0:
                    d.s(x, y, SNO[3] if y < cy else SNO[2])
    return d.im

def ras_vagg(n):
    """Snön som står i luften: en vägg av packad snö som tornar upp över hjälten och ungen, med ett
    överhäng som kröker sig fram över dem, som en våg som har stannat."""
    W, Hh = 176, 88; d = Bild(W, Hh); rnd = random.Random(7)
    krön = [int(6 + 3 * math.sin(x / 11) + 2 * math.sin(x / 4)) for x in range(W)]
    lapp = [int(30 + 4 * math.sin(x / 9 + 1) + 2 * math.sin(x / 3)) for x in range(W)]     # överhängets underkant
    fot = [int(72 + 3 * math.sin(x / 8)) for x in range(W)]
    for x in range(W):
        for y in range(krön[x], fot[x]):
            if y < lapp[x]:                                                  # överhänget: ljust ovanpå, mörkare mot kanten
                t = (y - krön[x]) / max(1, lapp[x] - krön[x])
                c = SNO[3] if t < 0.3 else SNO[2] if t < 0.75 else SNO[1]
                if (x * 3 + y) % 11 == 0 and t < 0.7: c = SNO[2]
            elif y < lapp[x] + 4:                                            # skuggan under överhänget
                c = '#8e9fcc' if (x + y) % 2 else '#6e7aa8'
            else:                                                            # väggen: lager av packad snö, mörkare nedåt
                t = (y - lapp[x]) / max(1, fot[x] - lapp[x])
                band = (y + int(2 * math.sin(x / 7))) % 8
                c = SNO[1] if t < 0.5 else '#b4c4e6'
                if band == 0: c = '#8e9fcc'
                if band == 1 and t < 0.6: c = SNO[2]
                if t > 0.8: c = '#8e9fcc' if (x + y) % 2 else '#b4c4e6'
            d.s(x, y, c)
    for x in range(W):                                                       # droppar och klumpar som hänger från överhänget
        if (x * 7) % 13 < 3:
            for k in range(2 + (x * 5) % 4): d.s(x, lapp[x] + k, SNO[2] if k < 2 else SNO[1])
    for k in range(12):                                                      # stora klumpar på krönet
        x0 = 6 + k * 15 + rnd.randint(-3, 3)
        snoklump(d, x0, krön[min(W - 1, max(0, x0))] + 4, 9, 6, rnd)
    for k in range(9):                                                       # stora block av packad snö som sticker ut ur väggen
        x0 = 10 + k * 19 + rnd.randint(-4, 4); y0 = rnd.randrange(42, 62)
        d.ell(x0, y0, 8 + rnd.random() * 4, 5 + rnd.random() * 2, SNO[1], SNO[2], '#8e9fcc', '#6e7aa8')
    for _ in range(14):                                                      # stenar och isbitar i väggen
        x = rnd.randrange(10, W - 10); y = rnd.randrange(38, 66)
        if rnd.random() < 0.6: d.ell(x, y, 3.5, 2.6, STEN[2], STEN[3], STEN[0])
        else: d.ell(x, y, 3, 2.2, IS[5], IS[7], IS[3])
    r2 = random.Random(90 + n)
    for _ in range(34):                                                      # smulor som faller
        x = r2.randrange(4, W - 4); y = fot[x] + r2.randrange(1, 15) + (3 if n == 2 else 0)
        if y < Hh - 1: d.s(x, y, SNO[3]); d.s(x, y + 1, SNO[1])
        y2 = lapp[x] + 6 + r2.randrange(0, 20)
        if n == 2 and y2 < fot[x]: d.s(x, y2, SNO[3])
    for x in range(W): d.s(x, fot[x], BLA)
    return d.kontur(BLA).im

def mynning_inifran(n):
    """Öppningen i södra änden av den smala gången, sedd inifrån. 01 öppen, 02 snön väller in, 03 halvt, 04 fullt."""
    d = Bild(44, 48)
    for y in range(48):                                                      # dagsljuset på golvet i gången
        for x in range(4, 40):
            if n == 1 and y > 20 and (x + y) % (2 if y > 34 else 3) == 0: d.s(x, y, '#fff8c8' if y > 40 else IS[7])
    fyll = {1: 48, 2: 38, 3: 24, 4: 4}[n]                                     # hur högt upp snön når
    rnd = random.Random(60 + n)
    for x in range(2, 42):
        kant = fyll + int(3 * math.sin(x / 4 + n)) + (0 if n == 4 else rnd.randint(0, 2))
        for y in range(max(0, kant), 48):
            t = (y - kant) / 48
            c = SNO[2] if (x + y) % 5 else SNO[3]
            if y < kant + 3: c = SNO[3]
            if t > 0.4 and (x + y) % 3 == 0: c = SNO[1]
            d.s(x, y, c)
    if n in (2, 3):                                                          # klumpar som rullar in
        for k in range(4 if n == 2 else 6):
            snoklump(d, 8 + rnd.randrange(28), fyll - 4 - rnd.randrange(8), 5, 4, rnd)
        for _ in range(16): d.s(rnd.randrange(44), rnd.randrange(max(0, fyll - 18), fyll), SNO[3])
    if n == 4:                                                               # helt igen: en blå skugga och isglans
        for x in range(4, 40):
            d.s(x, 6, SNO[1]); d.s(x, 7, '#8e9fcc' if x % 2 else SNO[1])
        for _ in range(8): d.s(rnd.randrange(6, 38), rnd.randrange(12, 44), '#8e9fcc')
    return d.kontur(BLA).im if n > 1 else d.im

def klippa_stege():
    d = Bild(24, 72)
    for y in range(2, 70):
        d.s(5, y, TRA[2]); d.s(6, y, TRA[3]); d.s(17, y, TRA[2]); d.s(18, y, TRA[3])
        d.s(4, y, TRA[1]); d.s(19, y, TRA[1])
    for y in range(6, 68, 7):
        for x in range(6, 18): d.s(x, y, TRA[3]); d.s(x, y + 1, TRA[1])
    for y in (10, 31, 52): d.s(7, y, '#ffffff')                              # en glimt av staven
    return d.kontur('#2a1a10').im

def klippa_rep():
    d = Bild(24, 72)
    d.ell(12, 5, 8, 4, STEN[2], STEN[3], STEN[1], STEN[0])                  # stenen på krönet som repet sitter om
    for y in range(6, 70):
        x = 12 + int(1.5 * math.sin(y / 9))
        d.s(x, y, '#c4a070'); d.s(x + 1, y, '#a07a50')
        if y % 10 == 4:                                                      # knutar att hålla i
            for (a, b) in ((-1, 0), (2, 0), (0, -1), (1, 1), (-1, 1), (2, 1)): d.s(x + a, y + b, '#7a5638')
    for x in range(5, 19): d.s(x, 8, '#a07a50')                              # repet runt stenen
    return d.kontur('#2a1a10').im

def klippa_trappa():
    d = Bild(32, 72)
    for i in range(9):                                                       # trappsteg i sicksack, uthuggna i isen
        y = 66 - i * 8; x = 3 + (i % 2) * 10
        d.rk(x, y, 16, 3, IS[7]); d.rk(x, y + 3, 16, 3, IS[4]); d.rk(x, y + 6, 16, 1, IS[2])
        d.s(x + 15, y + 1, IS[6])
    return d.kontur(IS[0]).im

def tand_form(d, x0, y0, L, B):
    """En böjd tand från roten (x0, y0) mot spetsen uppåt höger, med sågtandad framkant."""
    for i in range(L):
        t = i / L; cx = x0 + i * 0.75; cy = y0 - i * 0.55 - 3 * math.sin(t * math.pi) * 0.6
        w = B * (1 - t) ** 0.8
        for k in range(-int(w), int(w) + 1):
            c = '#f2e8c8' if k <= 0 else '#d6cfa4'
            if k == -int(w): c = '#fffaf0'
            d.s(cx + k * 0.55, cy + k * 0.85, c)
        if i % 3 == 0 and w > 1: d.s(cx + int(w) * 0.55 + 0.5, cy + int(w) * 0.85, '#a08a6e')    # sågtänder
    for k in range(-B, B + 1): d.s(x0 + k * 0.55, y0 + k * 0.85 + 1, '#a08a6e')               # roten

def tand_isen(n):
    d = Bild(24, 16)
    d.rk(1, 2, 22, 13, IS[5]); d.rk(1, 2, 22, 2, IS[7]); d.rk(1, 13, 22, 2, IS[3])
    tand_form(d, 7, 12, 11, 3)
    gl = [(4, 4), (19, 9)] if n == 1 else [(18, 5), (5, 11)]
    for (a, b) in gl:
        d.s(a, b, '#ffffff'); d.s(a - 1, b, IS[7]); d.s(a + 1, b, IS[7]); d.s(a, b - 1, IS[7]); d.s(a, b + 1, IS[7])
    return d.kontur(IS[0]).im

def lockglimt(n):
    d = Bild(8, 8); r = (1, 2, 3, 1)[n - 1]
    d.s(4, 4, '#ffffff')
    for k in range(1, r + 1):
        c = GLIMT[min(k - 1, 2)]
        for (a, b) in ((k, 0), (-k, 0), (0, k), (0, -k)): d.s(4 + a, 4 + b, c)
    if n == 3:
        for (a, b) in ((1, 1), (-1, -1), (1, -1), (-1, 1)): d.s(4 + a, 4 + b, GLIMT[1])
    return d.im

def ristning_tand():
    """Farfars ristning av samma tand i isväggen: bara konturen, som glimtar."""
    t = Bild(24, 16); tand_form(t, 7, 12, 11, 3); d = Bild(20, 10)
    for y in range(16):
        for x in range(24):
            if t.g(x, y) and any(not t.g(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                d.s(x - 3, y - 4, '#fff8c8')
    return d.im

def hjalte_klattrar_unge(n):
    c = Image.new('RGBA', (24, 44), (0, 0, 0, 0))
    hj = bild(f'figurer/hjalte/hjalte_klattra_upp_0{n}.png')
    un = bild(f'figurer/unge/unge1_klattra_upp_0{n}.png')
    c.alpha_composite(un, (0 + (1 if n == 2 else -1), 19))                    # ungen hänger under och håller i
    c.alpha_composite(hj, (4, 0))
    d = Bild(24, 44); d.im = c; d.p = c.load()
    for y in (19, 20, 21): d.s(12, y, '#5a3a22')                              # ryggsäckens rem, som ungen biter i
    return c

def tand_kort():
    d = Bild(48, 48)
    for y in range(6, 42):
        for x in range(6, 42):
            d.s(x, y, IS[6] if (x * 2 + y) % 9 else IS[7])
    d.rk(6, 6, 36, 3, IS[7]); d.rk(6, 39, 36, 3, IS[3])
    tand_form(d, 14, 36, 34, 7)
    for (a, b) in ((12, 12), (36, 30), (30, 10)): d.s(a, b, '#ffffff'); d.s(a + 1, b, IS[7]); d.s(a, b + 1, IS[7])
    return d.kontur(IS[0]).im

def till_zon(rel):
    import glob
    gam = set()
    for f in glob.glob('/home/claude/inkorg/bildkort/*.png'):
        for (n, c) in Image.open(f).convert('RGBA').getcolors(100000):
            if c[3]: gam.add(c[:3])
    G = list(gam); f = f'{UT}/{rel}.png'; im = Image.open(f).convert('RGBA'); q = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = q[x, y]
            if a and (r, g, b) not in gam: q[x, y] = min(G, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2) + (255,)
    im.save(f)

if __name__ == '__main__':
    F = 'foremal/berg/'
    for k in (1, 2, 3): spara(F + f'ras_front_0{k}', ras_front(k)); spara(F + f'ras_damm_0{k}', ras_damm(k))
    for k in (1, 2, 3, 4):
        spara(F + f'ras_sten_0{k}', ras_sten(k)); spara(F + f'ras_sten_liten_0{k}', ras_sten(k, True))
        spara(F + f'mynning_inifran_0{k}', mynning_inifran(k)); spara(F + f'lockglimt_0{k}', lockglimt(k))
    for k in (1, 2): spara(F + f'ras_vagg_0{k}', ras_vagg(k)); spara(F + f'tand_isen_0{k}', tand_isen(k))
    spara(F + 'klippa_stege', klippa_stege()); spara(F + 'klippa_rep', klippa_rep()); spara(F + 'klippa_trappa', klippa_trappa())
    spara(F + 'ristning_tand', ristning_tand())
    for k in (1, 2): spara(f'figurer/hjalte/hjalte_klattrar_unge_upp_0{k}', hjalte_klattrar_unge(k))
    spara('bildkort/tand_isen', tand_kort()); till_zon('bildkort/tand_isen')
    print('klart')
