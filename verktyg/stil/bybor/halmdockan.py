# Halmdockan, motståndaren i duellens testrum (beslut 91.5). En egen figur som inte finns i äventyret och
# inte liknar baronen: ingen orange färg, ingen tropikhjälm och ingen mustasch. Den är gjord av halm med ett
# huvud av säckväv, knappögon och en sydd mun, en liten filthatt, en röd halsduk och en grön väst med två knappar.
# Allt ritas framifrån i 32 x 32, med fötterna på nederkanten mitt i (x 16, y 31), som de andra figurerna.
#
# Sakerna som trillar av i duellen (testrum-duell.json): ett halmstrå, hatten, halsduken och en knapp. Därför
# finns varje läge i fem utrustningar: hel, utan_hatt, utan_hatt_knapp, utan_halsduk och utan_halsduk_knapp.
# Sakerna som faller är egna små bilder (halmdocka_sak_<sak>_01–02).
import os, sys, math
HAR = '/home/claude/bybor'; os.chdir(HAR)
src = open('foremal_k2b.py').read().split("if __name__ == '__main__':")[0]
G = {'__name__': 'foremal_k2b', '__file__': os.path.join(HAR, 'foremal_k2b.py')}; exec(src, G)
for k in ('ny', 'pix', 'kontur', 'skriv'): globals()[k] = G[k]
from PIL import Image

HALM = ['#5a4418', '#8a6a28', '#b8963c', '#d8bc64', '#f0dc98']
SACK = ['#5a4430', '#8a7058', '#b89c7c', '#d8c4a4', '#f0e4cc']
VAST = ['#1f3a24', '#2f5a34', '#447a44', '#64a058', '#a8d088']
DUK = ['#4a1418', '#8a2428', '#c03a36', '#e06a5a']
HATT = ['#2a1c14', '#4a3220', '#6a4a30', '#8a6a48']
TRA = ['#4a3220', '#8a6a48', '#c8a070']
OGA = '#141414'
W = H = 32

def ell(im, cx, cy, rx, ry, toner, ljus=(-0.5, -0.6)):
    """En ellips skuggad mot ljuset uppe till vänster, i tonerna (mörk till ljus, utan den mörkaste)."""
    for y in range(H):
        for x in range(W):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = dx * dx + dy * dy
            if d <= 1:
                l = -(dx * ljus[0] + dy * ljus[1]) + (1 - d) * 0.6
                i = 1 if l < -0.1 else 2 if l < 0.35 else 3 if l < 0.75 else 4
                pix(im, [(x, y, toner[min(i, len(toner) - 1)])])

def halmtofs(im, x, y, riktning, n=3):
    """Några strån som sticker ut åt ett håll (dx, dy)."""
    dx, dy = riktning
    for i in range(n):
        ox, oy = (i - n // 2) * (1 if dy else 0), (i - n // 2) * (1 if dx else 0)
        for k in range(3):
            pix(im, [(x + ox + dx * k, y + oy + dy * k, HALM[3] if k < 2 else HALM[4])])

def docka(mun='stangd', ogon='knapp', armar='ner', lut=0, huvud_lut=0, hopp=0, ben='sta',
          hatt=True, duk=True, knappar=2, bak=False):
    im = ny(W, H)
    cx = 16 + lut; by = 31 - hopp                       # fötternas mitt
    # benen: två halmbuntar
    if ben == 'sta':
        for bx in (cx - 3, cx + 2):
            for y in range(by - 6, by + 1):
                pix(im, [(bx, y, HALM[2]), (bx + 1, y, HALM[3] if y % 2 else HALM[2])])
            pix(im, [(bx - 1, by, HALM[3]), (bx + 2, by, HALM[4])])
    elif ben == 'ihop':                                  # i luften, benen tätt ihop och lite böjda
        for y in range(by - 6, by - 1):
            pix(im, [(cx - 1, y, HALM[2]), (cx, y, HALM[3]), (cx + 1, y, HALM[2])])
        halmtofs(im, cx, by - 1, (0, 1), 3)
    ty = by - 6                                          # kroppens nederkant
    # kroppen: västen över en halmbuk, strån sticker ut under
    halmtofs(im, cx - 3, ty, (-1, 1), 2); halmtofs(im, cx + 3, ty, (1, 1), 2)
    ell(im, cx, ty - 5, 5.6, 5.6, VAST)
    for y in range(ty - 10, ty):                        # västen är öppen i mitten, halmen syns
        for x in (cx, cx + 1) if not bak else ():
            if im.getpixel((x, y))[3]: pix(im, [(x, y, HALM[3] if y % 2 else HALM[2])])
    if not bak:
        for i in range(knappar):
            ky = ty - 8 + i * 3
            pix(im, [(cx - 1, ky, TRA[2]), (cx - 1, ky + 1, TRA[1])])
    # armarna: halmbuntar från axlarna, med en tofs som hand
    ay = ty - 8
    for s in (-1, 1):
        if armar == 'ner':
            pts = [(cx + s * (5 + k // 2), ay + k) for k in range(6)]; slut = (s, 1)
        elif armar == 'upp' or (armar == 'peka' and s == 1) or (armar == 'klia' and s == -1):
            pts = [(cx + s * (5 + k), ay - k) for k in range(5)]; slut = (s, -1)
        elif armar == 'peka':
            pts = [(cx + s * (5 + k), ay + 1) for k in range(6)]; slut = (s, 0)
        elif armar == 'klia':
            pts = [(cx + s * (5 + min(k, 2)), ay - k) for k in range(7)]; slut = (0, -1)
        else:   # flaxa: ut åt sidorna
            pts = [(cx + s * (5 + k), ay - (k % 2)) for k in range(6)]; slut = (s, 0)
        for (x, y) in pts: pix(im, [(x, y, HALM[2]), (x, y + 1, HALM[1])])
        halmtofs(im, pts[-1][0], pts[-1][1], slut, 3)
    # halsduken
    hx = cx + huvud_lut
    if duk:
        for x in range(cx - 4, cx + 5): pix(im, [(x, ty - 11, DUK[2] if x % 3 else DUK[3]), (x, ty - 10, DUK[1])])
        for y in range(ty - 10, ty - 6): pix(im, [(cx + 3, y, DUK[2]), (cx + 4, y, DUK[1])])     # snibben hänger
    # huvudet: säckväv, knutet under med ett snöre
    hy = ty - 17
    ell(im, hx, hy, 5.8, 5.6, SACK)
    for x in range(hx - 5, hx + 6):                     # vävens rader
        for y in range(hy - 5, hy + 6):
            if im.getpixel((x, y))[3] and (x + y * 3) % 7 == 0: pix(im, [(x, y, SACK[2])])
    if not hatt:
        halmtofs(im, hx - 2, hy - 5, (-1, -1), 2); halmtofs(im, hx + 2, hy - 5, (1, -1), 2); halmtofs(im, hx, hy - 6, (0, -1), 3)
    if not bak:
        ex = (hx - 3, hx + 2)
        for i, x in enumerate(ex):
            if ogon == 'knapp':
                pix(im, [(x, hy - 1, OGA), (x + 1, hy - 1, OGA), (x, hy, OGA), (x + 1, hy, '#3a3a3a'), (x, hy - 1, '#5a5a5a')])
            elif ogon == 'snurr':                         # förvirrad: ena ögat stort, det andra litet
                if i == 0: pix(im, [(x, hy - 2, OGA), (x + 1, hy - 2, OGA), (x - 1, hy - 1, OGA), (x + 2, hy - 1, OGA), (x, hy, OGA), (x + 1, hy, OGA), (x + 1, hy - 1, '#5a5a5a')])
                else: pix(im, [(x, hy, OGA)])
            elif ogon == 'stora':                         # ropar: ögonen spärras upp
                pix(im, [(x, hy - 2, OGA), (x + 1, hy - 2, OGA), (x, hy - 1, OGA), (x + 1, hy - 1, OGA), (x, hy, OGA), (x + 1, hy, OGA), (x, hy - 2, '#6a6a6a')])
            elif ogon == 'kryss':                         # trillat: små kryss
                pix(im, [(x - 1, hy - 2, OGA), (x + 1, hy, OGA), (x + 1, hy - 2, OGA), (x - 1, hy, OGA), (x, hy - 1, OGA)])
        my = hy + 3
        if mun == 'stangd':                               # ett sytt leende: en tunn linje med små stygn, ingen mustasch
            for x in range(hx - 3, hx + 4): pix(im, [(x, my + (1 if abs(x - hx) < 3 else 0), SACK[0])])
            for x in (hx - 1, hx + 1): pix(im, [(x, my + 2, SACK[1])])
        elif mun == 'oppen':
            for x in range(hx - 1, hx + 2): pix(im, [(x, my, SACK[0]), (x, my + 2, SACK[0])])
            for x in range(hx - 2, hx + 3): pix(im, [(x, my + 1, '#3a1a14' if abs(x - hx) < 2 else SACK[0])])
        elif mun == 'vagig':
            for i, x in enumerate(range(hx - 3, hx + 4)): pix(im, [(x, my + (i % 2), SACK[0])])
        elif mun == 'o':
            pix(im, [(hx, my - 1, SACK[0]), (hx - 1, my, SACK[0]), (hx + 1, my, SACK[0]), (hx, my + 1, SACK[0])])
    else:
        for x in range(hx - 1, hx + 2): pix(im, [(x, hy + 4, SACK[0])])          # knuten i nacken
    for x in range(hx - 3, hx + 4): pix(im, [(x, hy + 5, SACK[1])])              # snöret runt halsen
    # hatten: en liten filthatt med lapp och en bucklig kulle, inte en tropikhjälm
    if hatt:
        for x in range(hx - 6, hx + 7): pix(im, [(x, hy - 5, HATT[1]), (x, hy - 4, HATT[0] if abs(x - hx) > 4 else HATT[1])])
        for y in range(hy - 9, hy - 5):
            for x in range(hx - 3 - (1 if y > hy - 8 else 0), hx + 4 + (1 if y > hy - 8 else 0)):
                pix(im, [(x, y, HATT[3] if x < hx - 1 else HATT[2])])
        pix(im, [(hx, hy - 9, HATT[1])])                                         # bucklan
        if not bak: pix(im, [(hx + 2, hy - 7, VAST[3]), (hx + 3, hy - 7, VAST[3]), (hx + 2, hy - 6, VAST[2]), (hx + 3, hy - 6, VAST[2])])   # en grön lapp
    return kontur(im)

BRED = 48
def vrid(im, grader, skjut=0):
    """Vrider figuren bakåt runt fötterna, så att den trillar, på en bredare duk (48 x 32, fötterna mitt i)."""
    stor = Image.new('RGBA', (96, 64), (0, 0, 0, 0)); stor.alpha_composite(im, (32, 1))
    v = stor.rotate(grader, resample=Image.NEAREST, center=(48, 32))
    ut = Image.new('RGBA', (BRED, H), (0, 0, 0, 0)); ut.alpha_composite(v.crop((24 - skjut, 1, 72 - skjut, 33)))
    return ut
def bred(im):
    ut = Image.new('RGBA', (BRED, H), (0, 0, 0, 0)); ut.alpha_composite(im, ((BRED - W) // 2, 0)); return ut

def hog(im, yr=False, sida=0):
    """En hög med hö under och bakom figuren, och strån som yr."""
    hog = ny(BRED, H)
    for y in range(22, 32):
        for x in range(2, BRED - 2):
            dx, dy = (x + 0.5 - BRED / 2 - sida) / 18, (y + 0.5 - 32) / 9
            if dx * dx + dy * dy <= 1: pix(hog, [(x, y, HALM[3] if (x * 3 + y) % 5 else HALM[2])])
    hog = kontur(hog); hog.alpha_composite(im)
    if yr:
        for (x, y) in ((6, 12), (40, 9), (14, 6), (34, 15), (44, 18)): pix(hog, [(x, y, HALM[4]), (x + 1, y + 1, HALM[3])])
    return hog

def sak(namn, b):
    """De små sakerna som trillar av, 10 x 10, i två lägen som snurrar."""
    im = ny(10, 10)
    if namn == 'halmstra':
        pts = [(1 + k, 8 - k) for k in range(8)] if b == 1 else [(1 + k, 5) for k in range(8)]
        for (x, y) in pts: pix(im, [(x, y, HALM[3])])
        pix(im, [pts[-1] + (HALM[4],)])
    elif namn == 'knapp':
        for y in range(3, 7):
            for x in range(3, 7):
                if (x, y) not in ((3, 3), (6, 3), (3, 6), (6, 6)): pix(im, [(x, y, TRA[2])])
        pix(im, [(4, 4, TRA[0]), (5, 5, TRA[0])] if b == 1 else [(5, 4, TRA[0]), (4, 5, TRA[0])])
        im = kontur(im)
    elif namn == 'hatt':
        for x in range(1, 9): pix(im, [(x, 6, HATT[1])])
        for y in range(3, 6):
            for x in range(3, 7): pix(im, [(x, y, HATT[2])])
        pix(im, [(5, 4, VAST[3])])
        if b == 2: im = im.rotate(180, resample=Image.NEAREST)
        im = kontur(im)
    elif namn == 'halsduk':
        pts = [(1, 3), (2, 3), (3, 4), (4, 4), (5, 4), (6, 5), (7, 5), (7, 6), (7, 7)] if b == 1 else [(2, 6), (3, 5), (4, 5), (5, 4), (6, 4), (7, 3), (8, 3), (2, 7), (2, 8)]
        for (x, y) in pts: pix(im, [(x, y, DUK[2]), (x, y + 1, DUK[1])])
        im = kontur(im)
    return im

UTRUSTNING = {'hel': dict(), 'utan_hatt': dict(hatt=False), 'utan_hatt_knapp': dict(hatt=False, knappar=1),
              'utan_halsduk': dict(duk=False), 'utan_halsduk_knapp': dict(duk=False, knappar=1)}

def lagen(u):
    k = UTRUSTNING[u]; L = {}
    L['grund_01'] = docka(**k); L['grund_02'] = docka(lut=0, huvud_lut=1, **k)
    L['ropar_01'] = docka(mun='oppen', ogon='stora', armar='peka', **k)
    L['ropar_02'] = docka(mun='oppen', ogon='stora', armar='upp', hopp=1, **k)
    L['forvirrad_01'] = docka(mun='vagig', ogon='snurr', armar='klia', huvud_lut=-1, **k)
    L['forvirrad_02'] = docka(mun='vagig', ogon='snurr', armar='klia', huvud_lut=1, **k)
    L['backar_01'] = docka(mun='o', ogon='stora', armar='flaxa', lut=-1, **k)
    L['backar_02'] = docka(mun='o', ogon='stora', armar='flaxa', lut=1, hopp=1, **k)
    L['narmare_01'] = docka(mun='stangd', armar='upp', hopp=0, **k)
    L['narmare_02'] = docka(mun='oppen', armar='upp', ben='ihop', hopp=4, **k)
    L['trillar_01'] = vrid(docka(mun='o', ogon='stora', armar='flaxa', **k), 20, 0)
    L['trillar_02'] = hog(vrid(docka(mun='o', ogon='stora', armar='upp', **k), 55, 8))
    L['trillar_03'] = hog(vrid(docka(mun='vagig', ogon='kryss', armar='upp', **k), 85, 14), yr=True)
    L['snurrar_01'] = docka(mun='oppen', ogon='snurr', armar='flaxa', **k)
    L['snurrar_02'] = docka(armar='flaxa', bak=True, **k)
    L['sitter_01'] = hog(bred(docka(mun='vagig', ogon='kryss', armar='ner', hopp=-5, ben='ihop', **k)))
    return L

def alla():
    ut = {}
    for u in UTRUSTNING:
        for lage, im in lagen(u).items():
            ut[f'figurer/halmdockan/halmdockan_{lage}_{u}.png'] = im
    for s in ('halmstra', 'knapp', 'hatt', 'halsduk'):
        for b in (1, 2): ut[f'figurer/halmdockan/halmdocka_sak_{s}_0{b}.png'] = sak(s, b)
    return ut

if __name__ == '__main__':
    A = alla()
    for rel, im in A.items(): skriv(im, rel)
    # förhandsbild: alla lägen i hel utrustning, och de fem utrustningarna i grundställning, bredvid hjälten
    L = lagen('hel'); namn = list(L)
    g = Image.new('RGBA', (8 * 50 + 4, 4 * 34 + 4), (196, 168, 110, 255))
    for i, n in enumerate(namn): g.alpha_composite(G['las'](L[n], 'x'), (4 + (i % 8) * 50, 4 + (i // 8) * 34))
    rad = 2
    for j, u in enumerate(UTRUSTNING): g.alpha_composite(G['las'](lagen(u)['grund_01'], 'x'), (4 + j * 34, 4 + rad * 34))
    hj = Image.open('/home/claude/inkorg/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA')
    g.alpha_composite(hj, (4 + 5 * 34 + 8, 4 + rad * 34 + 8))
    for j, s in enumerate(('halmstra', 'knapp', 'hatt', 'halsduk')):
        g.alpha_composite(G['las'](sak(s, 1), 'x'), (4 + j * 34 + 10, 4 + 3 * 34 + 10))
    g.resize((g.width * 4, g.height * 4), Image.NEAREST).save('/tmp/halmdockan_prov.png')
    print('klart', len(A))
