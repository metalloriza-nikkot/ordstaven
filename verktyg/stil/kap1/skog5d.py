# 5d (beslut 50.2): skogens föremål som görs om. Stil 2026-11-07.
#
# foremal/skog/lian_gang_a, _b          32 x 28  en lian i gången (5–6 i rad, en bakom den andra), två varianter
# foremal/skog/lian_gang_hugg_01–02     32 x 28  lianen huggs av och faller (ca 80 ms var)
# foremal/skog/lian_gang_kvar           32 x 28  det som ligger kvar: en låg hög på marken, inget som hänger
# foremal/skog/lian_kvar, liten_lian_kvar          samma låga hög för väggens och den lilla lianens bilder
# foremal/skog/lovhog_hugg_01–02, lovhog_kvar  24 x 16  högen sjunker ihop när han slår (löven yr: efx_lov_yr)
# foremal/skog/buske_gron, _gul, _rod, barbuske 30 x 24  buskarna med blåbär som syns (skylten BÄR)
# foremal/skog/apans_trad              96 x 104  trädet: krona runt plattformen, stammen och stegens plats under
# foremal/skog/apans_bo                 56 x 36  plattformen i kronan (ytan man går på) med boet
# foremal/skog/fossil                   18 x 14  fossilet som ligger i boet
# foremal/skog/bro                      28 x 42  bron snett ovanifrån, över bäckarmen på baronens sida
# foremal/skog/buske_hjalm              24 x 24  busken vid bron, med baronens tropikhjälm som sticker upp
# foremal/skog/stubbe_svamp, sten_mossa, stenar_sma, svampar   sydost: det som bara står där
import os
exec(open('/home/claude/kap1/bas.py').read())

# ---------------------------------------------------------------- lianerna i gången
GRON = ['#14301A', '#2E6A30', '#4A8E3A', '#78B456', '#A8D870']   # ljusare än skogen runt gången
SNITT = '#C8E36A'

def _rita(p, pix, w, h, ox=0, oy=0):
    kant = set()
    for (x, y) in pix:
        for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + a, y + b) not in pix: kant.add((x + a + ox, y + b + oy))
    for q in kant:
        if 0 <= q[0] < w and 0 <= q[1] < h and p[q][3] == 0: p[q] = hx2(GRON[0])
    for (x, y), t in pix.items():
        X, Y = x + ox, y + oy
        if 0 <= X < w and 0 <= Y < h: p[X, Y] = hx2(SNITT if t == 'snitt' else GRON[t])

def lian_strangar(variant, w=32, h=28, tofs=True):
    """Fem strängar som hänger från kronan över gången, med blad i klungor och en tofs uppe."""
    rnd = random.Random(40 + variant)
    pix = {}
    bas = [3, 9, 15, 21, 27] if variant == 0 else [5, 11, 16, 22, 28]
    for i, bx in enumerate(bas):
        amp = 1.2 + (i % 2) * 0.6; fas = i * 1.3 + variant
        slut = h - 2 - rnd.randint(0, 3)
        for y in range(1, slut):
            x = int(round(bx + amp * math.sin(y / 4.5 + fas)))
            pix[(x, y)] = 3 if math.cos(y / 4.5 + fas) > 0 else 2
            pix.setdefault((x + 1, y), 1)
        y = 4 + rnd.randint(0, 3); sida = rnd.choice((-1, 1))
        while y < slut - 2:
            x = int(round(bx + amp * math.sin(y / 4.5 + fas))) + sida * 2
            for (a, b, t) in [(0, 0, 3), (sida, 0, 4), (0, 1, 2), (sida, 1, 3)]: pix[(x + a, y + b)] = t
            y += rnd.randint(4, 6); sida = -sida
    for x in range(w if tofs else 0):      # tofsen där lianerna hänger från kronan (inte i gången: där blir det ränder)
        for y in range(0, 2 + (x * 7 % 3 == 0)): pix[(x, y)] = 1 if (x + y) % 3 else 2
    return pix

def hog(pix_under, w, h, bredd_ut=2):
    """Det avhuggna som en låg hög på marken: högst fem pixlar hög, lite bredare än lianen."""
    hogen = {}
    rnd = random.Random(len(pix_under))
    for (x, y), t in pix_under.items():
        X = x + (1 if x > w / 2 else -1) * rnd.randint(0, bredd_ut)
        Y = h - 2 - (y * 7 % 5)
        if 0 <= X < w: hogen[(X, Y)] = t if t != 1 else 2
    for x in range(2, w - 2, 5):           # färska snitt i högen
        if (x, h - 4) in hogen: hogen[(x, h - 4)] = 'snitt'
    return hogen

def lian_gang(variant=0, steg=None):
    w, h = 32, 28
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    pix = lian_strangar(variant, w, h, tofs=False)
    if steg is None:
        _rita(p, pix, w, h); return im
    klipp = 3
    over = {k: v for k, v in pix.items() if k[1] <= klipp}
    under = {k: v for k, v in pix.items() if k[1] > klipp}
    if steg == 1:                           # snittet lyser och lianen sjunker en bit
        _rita(p, {**{k: ('snitt' if k[1] == klipp else v) for k, v in over.items()}}, w, h)
        _rita(p, under, w, h, 0, 4)
    elif steg == 2:                         # nästan nere: den nedre halvan har redan lagt sig
        _rita(p, {k: ('snitt' if k[1] == klipp else v) for k, v in over.items() if k[1] >= klipp - 1}, w, h)
        halv = {k: v for k, v in under.items() if k[1] < h * 0.55}
        _rita(p, {(x, h - 10 + (y % 6)): t for (x, y), t in halv.items()}, w, h)
        _rita(p, hog({k: v for k, v in under.items() if k[1] >= h * 0.55}, w, h, 1), w, h)
    else:                                   # kvar: bara högen, inget som hänger kvar
        _rita(p, hog(under, w, h), w, h)
    return im

for v, n in ((0, 'a'), (1, 'b')): spara(f'foremal/skog/lian_gang_{n}', lian_gang(v))
spara('foremal/skog/lian_gang_hugg_01', lian_gang(0, 1))
spara('foremal/skog/lian_gang_hugg_02', lian_gang(0, 2))
spara('foremal/skog/lian_gang_kvar', lian_gang(0, 3))

# väggens och den lilla lianens kvarbilder: samma låga hög (om Teknik behåller dem någonstans)
def bara_hog(w, h, variant):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    pix = lian_strangar(variant, w, h); _rita(p, hog({k: v for k, v in pix.items() if k[1] > 3}, w, h), w, h); return im
spara('foremal/skog/lian_kvar', bara_hog(24, 48, 0))
spara('foremal/skog/liten_lian_kvar', bara_hog(28, 28, 1))

# ---------------------------------------------------------------- lövhögen sjunker ihop
def lovhog_steg(steg):
    """steg 0 = som förut (lovhog), 1–2 = sjunker, 3 = platt hög med löv runt omkring."""
    rnd = random.Random(5)
    d = Duk(24, 16)
    plat = [1.0, 0.7, 0.45, 0.25][steg]; bred = [1.0, 1.08, 1.15, 1.2][steg]
    for (cx, cy, rx, ry) in [(12, 10, 10, 5), (7, 9, 5, 4), (17, 9, 5, 4), (12, 7, 6, 4)]:
        cy2 = 15 - (15 - cy) * plat; ry2 = max(1.2, ry * plat)
        d.ellips(12 + (cx - 12) * bred, cy2, rx * bred, ry2, 'lovhog', 'hog')
    d.kontur(); im = d.bild()
    for i in range(22):
        x = rnd.randint(3, 20); y = rnd.randint(4, 13)
        if im.getpixel((x, y))[3]: im.putpixel((x, y), hx2(rnd.choice(['#6A3A12', '#EEC46A', '#D09A40', '#8A5A1E', '#4E8A3A'])))
    if steg == 3:                           # löv som har lagt sig runt högen
        for (x, y, c) in [(1, 13, '#D09A40'), (2, 14, '#EEC46A'), (22, 12, '#A86E2A'), (21, 14, '#D09A40'), (4, 10, '#EEC46A'), (19, 9, '#D09A40')]:
            if not im.getpixel((x, y))[3]: im.putpixel((x, y), hx2(c))
    return im
spara('foremal/skog/lovhog_hugg_01', lovhog_steg(1))
spara('foremal/skog/lovhog_hugg_02', lovhog_steg(2))
spara('foremal/skog/lovhog_kvar', lovhog_steg(3))

# ---------------------------------------------------------------- buskarna med bär
_s = open(ROT + '/rutor/stenar.py').read()
exec(_s[_s.index('def busk('):_s.index('def kompassros')])
exec(_s[_s.index('GRON=['):_s.index('STENAR={')])
BAR_PL = [(7, 11), (12, 8), (18, 7), (22, 12), (10, 15), (16, 13), (20, 17), (5, 16), (14, 18), (24, 16)]
def bar(im, n=8):
    """Blåbär som syns: tre pixlar stora, med mörk kant och en ljus prick (samma blå som ikonen och skylten)."""
    p = im.load()
    for (x, y) in BAR_PL[:n]:
        for (a, b) in [(-1, 0), (2, 0), (0, -1), (1, -1), (0, 2), (1, 2), (-1, 1), (2, 1)]:
            if p[x + a, y + b][3]: p[x + a, y + b] = hx2('#0E1A50')
        for (a, b, c) in [(0, 0, '#7A9AF0'), (1, 0, '#3A5AD8'), (0, 1, '#3A5AD8'), (1, 1, '#1A3290')]: p[x + a, y + b] = hx2(c)
        p[x, y] = hx2('#E8F0FF')
    return im
for n, ramp in (('buske_gron', GRON), ('buske_gul', GUL), ('buske_rod', ROD)): spara('foremal/skog/' + n, bar(busk(ramp, 4), 7))
spara('foremal/skog/barbuske', bar(busk(BARB, 7), 9))

# ---------------------------------------------------------------- apans träd, plattformen och boet
# Kartan (förslag): apans_bo (yta) 40,200 56 x 36 = plattformens golv. apans_trad 40,236 56 x 24 = marken under
# plattformen; bilden (96 x 104) har nederkantens mitt i 68,260 och når x 20–116, y 156–260.
# Stegen 60,228 16 x 32 står framför stammen. Nätet hänger från grenen: apan_i_nat 74,190 22 x 24.
TW, TH = 96, 104
OX0, OY0 = 20, 156                       # bildens övre vänstra hörn i kartan
def k2b(x, y): return (x - OX0, y - OY0)  # kartans läge -> bildens
DECK = (40, 200, 96, 236)                 # plattformens golv i kartan (x0, y0, x1, y1)
STEGE = (60, 228, 76, 260)
TRA = MAT['tra']

def apans_trad():
    d = Duk(TW, TH)
    # kronan: runda klungor runt plattformen (vänster, höger, bakom och lite nedanför), aldrig över golvet
    klungor = [(48, 22, 20), (26, 30, 14), (70, 28, 16), (36, 14, 12), (60, 12, 12), (12, 50, 10), (84, 48, 11),
               (48, 8, 10), (88, 30, 8), (8, 34, 8), (10, 62, 9), (86, 62, 9)]
    for (cx, cy, r) in klungor: d.ellips(cx, cy, r, r * 0.85, 'lovung', 'krona')
    # stammen under plattformen (bakom stegen) och rötterna
    sx0, sx1 = k2b(52, 0)[0], k2b(84, 0)[0]
    for y in range(k2b(0, 238)[1], TH - 1):
        for x in range(sx0, sx1):
            t = 3 if x < sx0 + 5 else (2 if x < sx1 - 6 else 1)
            d.satt(x, y, 'barkung', t, 'stam')
    for (cx, cy, rx, ry) in [(k2b(52, 0)[0], TH - 4, 6, 3), (k2b(84, 0)[0], TH - 4, 6, 3)]: d.ellips(cx, cy, rx, ry, 'barkung', 'rot')
    d.kontur(); im = d.bild(); p = im.load()
    # golvet lämnas tomt (det är ytan apans_bo, och hjälten går där)
    gx0, gy0 = k2b(DECK[0], DECK[1]); gx1, gy1 = k2b(DECK[2], DECK[3])
    for y in range(gy0, gy1):
        for x in range(gx0, gx1): p[x, y] = (0, 0, 0, 0)
    # plattformens framkant (bjälken) och de två stolparna, som stammen bär
    for x in range(gx0 - 1, gx1 + 1):
        for k, c in enumerate([TRA[0], TRA[3], TRA[2], TRA[2], TRA[1], TRA[0]]): p[x, gy1 + k] = hx2(c)
        if (x - gx0) % 9 == 4: p[x, gy1 + 2] = hx2(TRA[1])
    # två sneda stöttor från stammen ut till plattformens hörn
    for sgn, x0 in ((-1, sx0), (1, sx1 - 1)):
        for i in range(12):
            x = x0 + sgn * i; y = gy1 + 16 - i
            for k, c in enumerate([TRA[0], TRA[2], TRA[1], TRA[0]]):
                if 0 <= x < TW and p[x, y + k][3] == 0 or k in (1, 2): p[x, y + k] = hx2(c)
    # grenen som nätet hänger från: ut ur kronan till höger, över plattformens främre högra del
    for x in range(k2b(74, 0)[0], k2b(112, 0)[0]):
        y = k2b(0, 188)[1] - (x - k2b(74, 0)[0]) // 10
        for k, c in enumerate(['#3A2A18', '#C8A87A', '#A8885C', '#6A5032', '#3A2A18']): p[x, y + k - 2] = hx2(c)
    # stegens plats: stegen står framför stammen, så trädet får inte rita över den (trädet ligger bland figurerna)
    stg = Image.open(ROT + '/inkorg/foremal/skog/stege.png').convert('RGBA')
    bx, by = k2b(STEGE[0], STEGE[1])
    for y in range(stg.height):
        for x in range(stg.width):
            if stg.getpixel((x, y))[3] and 0 <= bx + x < TW and 0 <= by + y < TH: p[bx + x, by + y] = (0, 0, 0, 0)
    return im

def apans_bo():
    """Plattformens golv: brädor, en låg kant bak och boet av kvistar längst bak till vänster."""
    w, h = DECK[2] - DECK[0], DECK[3] - DECK[1]
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    for y in range(h):
        for x in range(w):
            bracka = y // 6
            c = TRA[3] if y % 6 in (1, 2) else TRA[2]
            if y % 6 == 0: c = TRA[1]
            if (x + bracka * 13) % 19 == 0: c = TRA[1]
            if x in (0, w - 1): c = TRA[0]
            p[x, y] = hx2(c)
    for x in range(w):                        # kanten bak: en stock
        for k, c in enumerate([TRA[0], TRA[4], TRA[3], TRA[1]]): p[x, k] = hx2(c)
    # boet: en ring av kvistar (fossilet ligger i den, 52,206 i kartan = 12,6 i bilden)
    cx, cy, rx, ry = 20, 12, 13, 7
    rnd = random.Random(3)
    for y in range(h):
        for x in range(w):
            d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if d <= 1:
                if d > 0.45: c = rnd.choice(['#6A4626', '#8A6038', '#A87C50', '#4A3018'])
                else: c = '#3A2410' if d > 0.2 else '#4A3018'
                p[x, y] = hx2(c)
            elif d <= 1.18: p[x, y] = hx2('#24160C')
    for i in range(14):                       # kvistar som sticker ut
        a = rnd.uniform(0, 2 * math.pi); r = 1.05
        x, y = int(cx + math.cos(a) * rx * r), int(cy + math.sin(a) * ry * r)
        if 0 <= x < w and 0 <= y < h: p[x, y] = hx2('#A87C50')
    return im

def fossil():
    """Fossilet i boet: en ljus svans av ben med kotor, lite stenigt, och kvistar från boets kant framför."""
    w, h = 18, 14
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    pts = []
    for i in range(12):                       # svansen som en båge av kotor
        x = 3 + i; y = int(round(8 - 3.2 * math.sin(i / 11 * math.pi)))
        pts.append((x, y))
    for (x, y) in pts:
        for (a, b, c) in [(0, 0, '#F2ECD8'), (0, 1, '#D8CCB0'), (0, -1, '#FFF8E8')]: p[x, y + b] = hx2(c)
    for (x, y) in pts[::2]: p[x, y + 2] = hx2('#D8CCB0')
    kontur_runt(im, '#5A5E66')
    for x in range(2, 16):                    # boets främre kant framför fossilet
        y = 11 + (x % 3 == 0)
        p[x, y] = hx2(['#6A4626', '#8A6038', '#A87C50'][x % 3]); p[x, y + 1] = hx2('#24160C')
    return im

spara('foremal/skog/apans_trad', apans_trad())
spara('foremal/skog/apans_bo', apans_bo())
spara('foremal/skog/fossil', fossil())

# ---------------------------------------------------------------- bron och busken med hjälmen
STEN = MAT['sten']
def bro():
    """Bron över bäckarmen, snett ovanifrån: däcket med tvärgående plankor, räcken på båda sidor och ett
    stenfäste i varje ände. Bron går från norr till söder längs baronens stig."""
    w, h = 28, 42
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    def fast(x0, y0, x1, y1):                 # stenfäste: ovansida ljus, framsida mörkare, fogar
        for y in range(y0, y1):
            for x in range(x0, x1):
                fram = y >= y1 - 4
                c = STEN[3] if not fram else STEN[2]
                if (x + (y // 3) * 2) % 6 == 0 or y % 3 == 0 and fram: c = STEN[1]
                if x in (x0, x1 - 1) or y in (y0, y1 - 1): c = STEN[0]
                p[x, y] = hx2(c)
    fast(1, 2, 27, 12); fast(1, 30, 27, 41)
    for y in range(8, 36):                    # däcket: plankor tvärs över
        for x in range(4, 24):
            c = TRA[3] if y % 3 == 1 else TRA[2]
            if y % 3 == 0: c = TRA[1]
            if (x * 5 + y) % 23 == 0: c = TRA[1]
            p[x, y] = hx2(c)
    for y in range(36, 39):                   # däckets framkant mot södra fästet
        for x in range(4, 24): p[x, y] = hx2(TRA[1] if y < 38 else TRA[0])
    for x0 in (3, 22):                        # räckena: en ledstång och tre stolpar på varje sida
        for y in range(5, 37):
            p[x0, y] = hx2(TRA[0]); p[x0 + 1, y] = hx2(TRA[3] if x0 == 3 else TRA[2]); p[x0 + 2, y] = hx2(TRA[0]) if x0 == 22 else p[x0 + 2, y]
        for sy in (8, 20, 32):
            for k in range(4): p[x0, sy + k] = hx2(TRA[0]); p[x0 + 1, sy + k] = hx2(TRA[1])
            p[x0 + 1, sy] = hx2(TRA[4])
    return im

def buske_hjalm():
    """Busken vid bron (bäcksidan) med baronens orange tropikhjälm som sticker upp bakom. Ingen mustasch, inget blått."""
    w, h = 24, 24
    # hjälmen först, bakom busken
    d = Duk(w, h)
    MAT['hjalmbaron'] = ['#5A4A30', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFFBEA']   # baronens tropikhjälm (baron.py)
    d.ellips(12, 6, 6, 4.5, 'hjalmbaron', 'kupol', zbias=-0.05)
    d.kontur(); hj = d.bild(); q = hj.load()
    for x in range(7, 18): q[x, 7] = hx2('#6B4630')        # bandet
    for x in range(4, 21): q[x, 9] = hx2('#E6D6A8'); q[x, 10] = hx2('#5A4A30')   # brättet
    for (x, y, c) in [(6, 5, '#E8823A'), (5, 4, '#F3A462'), (5, 3, '#E8823A'), (4, 2, '#F3A462')]: q[x, y] = hx2(c)   # fjädern
    b = Duk(w, h)
    for (cx, cy, r) in [(12, 16, 9), (5, 18, 5), (19, 18, 5), (8, 12, 5), (16, 12, 5)]: b.ellips(cx, cy, r, r * 0.8, 'lov', 'buske')
    b.kontur(); bu = b.bild()
    rnd = random.Random(9)
    for i in range(10):
        x = rnd.randint(3, 20); y = rnd.randint(10, 21)
        if bu.getpixel((x, y))[3] and bu.getpixel((x, y)) != hx2(MAT['lov'][0]): bu.putpixel((x, y), hx2(MAT['lov'][4] if y < 15 else MAT['lov'][1]))
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); im.alpha_composite(hj, (0, -1)); im.alpha_composite(bu)
    return im

spara('foremal/skog/bro', bro())
spara('foremal/skog/buske_hjalm', buske_hjalm())

# ---------------------------------------------------------------- sydost: det som bara står där
def stubbe_svamp():
    w, h = 24, 18
    d = Duk(w, h)
    d.ellips(12, 12, 8, 5, 'bark', 'stam', toner=(1, 1, 2, 2))
    for (cx, cy, rx, ry) in [(4, 15, 3, 2), (20, 15, 3, 2)]: d.ellips(cx, cy, rx, ry, 'bark', 'rot')
    d.ellips(12, 8, 8, 3.2, 'barkung', 'snitt', toner=(2, 3, 3, 4))
    d.kontur(); im = d.bild(); p = im.load()
    for (x, y) in [(9, 8), (10, 7), (12, 7), (14, 8), (13, 9), (11, 9), (10, 8)]: p[x, y] = hx2('#8A6C46')   # årsringar
    p[12, 8] = hx2('#6A5032')
    for (x, y) in [(5, 11), (6, 12), (18, 10), (19, 11)]: p[x, y] = hx2('#4A8E3A')                          # mossa
    for (sx, sy) in [(4, 13), (19, 12)]:                                                                     # två små svampar vid foten
        for (a, b, c) in [(-1, -1, '#A86E2A'), (0, -2, '#D09A40'), (1, -1, '#A86E2A'), (0, -1, '#EEC46A'), (0, 0, '#F2ECD8'), (0, 1, '#D8CCB0')]: p[sx + a, sy + b] = hx2(c)
    return im

def sten_mossa():
    d = Duk(18, 13)
    d.ellips(9, 8, 8, 4.5, 'sten', 'sten'); d.ellips(6, 6, 4, 2.5, 'sten', 'sten2')
    d.kontur(); im = d.bild(); p = im.load()
    for (x, y) in [(5, 4), (6, 4), (7, 4), (8, 5), (4, 5), (12, 5), (13, 6)]: p[x, y] = hx2('#4A8E3A')
    for (x, y) in [(6, 3), (5, 4)]: p[x, y] = hx2('#78B456')
    return im

def stenar_sma():
    im = Image.new('RGBA', (16, 9), (0, 0, 0, 0))
    for (cx, cy, rx, ry) in [(4, 5, 3.5, 2.5), (10, 6, 3, 2), (13, 3, 2, 1.6)]:
        d = Duk(16, 9); d.ellips(cx, cy, rx, ry, 'sten', 's'); d.kontur(); im.alpha_composite(d.bild())
    return im

def svampar():
    """Tre bruna svampar (stensopp-färger), ingen röd med prickar."""
    im = Image.new('RGBA', (14, 10), (0, 0, 0, 0)); p = im.load()
    for (sx, sy, r) in [(3, 6, 2), (8, 4, 3), (12, 7, 2)]:
        for y in range(sy, 10):
            for x in range(sx - 1, sx + 1): p[x, y] = hx2('#F2ECD8' if x == sx - 1 else '#D8CCB0')
        for x in range(sx - r - 1, sx + r + 1):
            for y in range(sy - r // 2 - 1, sy + 1):
                if ((x + 0.5 - sx) / (r + 0.6)) ** 2 + ((y + 0.5 - sy) / (r * 0.6 + 0.6)) ** 2 <= 1:
                    p[x, y] = hx2('#8A5A1E' if y == sy else ('#D09A40' if x < sx else '#A86E2A'))
    kontur_runt(im, '#3A2410')
    return im

spara('foremal/skog/stubbe_svamp', stubbe_svamp())
spara('foremal/skog/sten_mossa', sten_mossa())
spara('foremal/skog/stenar_sma', stenar_sma())
spara('foremal/skog/svampar', svampar())

if __name__ == '__main__':
    skriv()
    ark('/tmp/k5d_skog.png', list(ALLA.values()), 4)
