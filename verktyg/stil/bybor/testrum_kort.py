# Testrummen (beslut 107.6): bildkorten i stället för emoji, 48 x 48 som de andra korten.
#   tr_*            testrummet för fritt skrivande: nio vardagliga problem. Bilden ställer frågan och visar aldrig svaret
#                   (bollen på taket utan stege, båten som läcker utan tejp, snögubben utan näsa).
#   tankebubbla_*   testrummets ledbilder i Stils bubbla: stege, tejp, morot, pump, vattendroppe, matskål, paraply
#                   och en hand som lyfter.
#   svamp, snogubbe, hund, kopp, solros   det halmdockan pekar på i duellens testrum. Svampen är röd med stora vita
#                   prickar och koppen vit och full (rond 2). Snögubben har halsduk, hatt och kolnäsa, så att den syns
#                   vara av snö, och solrosen har sin bruna mitt och sina blad, så att den inte är en ros. `bil` finns.
# Inga nya färger: allt läses till de färger som bildkorten redan har (zonen bildkort).
# python3 bybor/testrum_kort.py <inkorg> <ut>
import os, sys, glob, math, random
from PIL import Image
HAR = '/home/claude/bybor'
INK = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/inkorg'
UTMAPP = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HAR, 'ut_testrum')
_s = open(os.path.join(HAR, 'foremal_k2b.py')).read(); _c = os.getcwd(); os.chdir(HAR)
_a = sys.argv; sys.argv = _a[:1]; exec(_s.split("if __name__ == '__main__':")[0]); sys.argv = _a; os.chdir(_c)
_b = open(os.path.join(HAR, 'bildkort_k2.py')).read()
exec(_b[_b.index('def kort():'):_b.index('def tankebubbla(vad):')])

def C(h): return hxc(h) if isinstance(h, str) else h
def ell(im, cx, cy, rx, ry, c, ljus=None, mork=None):
    """En fylld ellips; ljus uppe till vänster och mörk nere till höger om tonerna ges."""
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            u = (x + .5 - cx) / rx; v = (y + .5 - cy) / ry
            if u * u + v * v <= 1:
                f = c
                if ljus and u + v < -0.75 and u * u + v * v > 0.25: f = ljus
                if mork and u + v > 0.85: f = mork
                pix(im, [(x, y, f)])
def rk(im, x0, y0, b, h, c): pix(im, [(x, y, c) for y in range(y0, y0 + h) for x in range(x0, x0 + b)])
def tri(im, pts, c):
    (ax, ay), (bx, by), (cx_, cy_) = pts
    for y in range(min(ay, by, cy_), max(ay, by, cy_) + 1):
        for x in range(min(ax, bx, cx_), max(ax, bx, cx_) + 1):
            d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by); d2 = (x - cx_) * (by - cy_) - (bx - cx_) * (y - cy_)
            d3 = (x - ax) * (cy_ - ay) - (cx_ - ax) * (y - ay)
            if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): pix(im, [(x, y, c)])
def mark_gras(im, y0=38): mark(im, y0, 'gras')
def figur(im, fil, x, y):
    s = Image.open(os.path.join(INK, fil)).convert('RGBA'); im.alpha_composite(s, (x, y)); return s

SNO = ('#7e8ea4', '#b8c6d8', '#e4ecf6', '#ffffff')
TRA = MAT['trad']; VAT = MAT['vatten']

# ---------------- testrummet för fritt skrivande ----------------
def boll_pa_taket():
    im = kort(); mark_gras(im)
    rk(im, 10, 24, 28, 16, TRA[3]); [rk(im, 10, y, 28, 1, TRA[2]) for y in range(26, 40, 4)]
    rk(im, 20, 30, 7, 10, '#5a3a22'); rk(im, 30, 28, 5, 5, '#2a3a5a'); pix(im, [(32, 28 + k, TRA[1]) for k in range(5)])
    tri(im, [(5, 25), (43, 25), (24, 9)], '#4a5568'); tri(im, [(8, 24), (40, 24), (24, 11)], '#6e7a8c')
    for y in range(12, 25, 3): pix(im, linje(24 - (y - 9) * 19 // 16 + 1, y, 24 + (y - 9) * 19 // 16 - 1, y, '#4a5568'))
    ell(im, 33, 12, 4.5, 4.5, '#e04040', '#ffffff', '#a02828'); pix(im, linje(29, 12, 37, 12, '#ffffff'))   # bollen uppe på taket
    return kontur(im)
def bat_som_lacker():
    im = kort()
    for y in range(31, 47):                                            # sjön
        for x in range(1, 47):
            if ((x + .5 - 24) / 23) ** 2 + ((y + .5 - 39) / 9) ** 2 <= 1: pix(im, [(x, y, VAT[2] if (x + 2 * y) % 9 else VAT[3])])
    # en roddbåt från sidan: hög spetsig för till vänster, rak akter till höger
    for x in range(4, 43):
        t = (x - 4) / 38
        rel = 20 - int(7 * (1 - t) ** 3)                               # relingen stiger mot fören
        kol = 36 - int(10 * (1 - t) ** 2.2) if t < 0.45 else 36        # kölen kurvar upp mot fören
        if x > 40: kol = 36 - (x - 40)
        for y in range(rel, kol + 1):
            c = TRA[3] if y < rel + 2 else (TRA[2] if (y - rel) % 5 else TRA[1])
            pix(im, [(x, y, c)])
        pix(im, [(x, rel, TRA[4])])
    rk(im, 41, 20, 2, 16, TRA[1])                                      # aktern
    for x in range(9, 41): pix(im, [(x, 21, VAT[3]), (x, 22, VAT[4] if x % 4 else VAT[3])])   # vattnet står högt i båten
    for x in range(1, 47):                                             # vattenytan utanför ligger över kölen
        for y in range(33, 37):
            if ((x + .5 - 24) / 23) ** 2 + ((y + .5 - 39) / 9) ** 2 <= 1: pix(im, [(x, y, VAT[2] if (x + y) % 5 else VAT[3])])
    ell(im, 27, 28, 2.5, 2.2, '#0c0c12')                               # hålet i sidan
    for k in range(13):                                                # vattnet sprutar in i en båge
        x = 27 - k // 2; y = 27 - k + (k * k) // 16
        pix(im, [(x, y, '#ffffff'), (x - 1, y, VAT[4])])
    for (x, y) in ((19, 17), (18, 15), (21, 16), (17, 18)): pix(im, [(x, y, VAT[4])])
    return kontur(im)
def morkt_skap():
    im = kort(); rk(im, 2, 42, 44, 4, '#8a7660')
    rk(im, 12, 6, 22, 37, TRA[2]); rk(im, 14, 8, 18, 33, '#0c0c12')    # skåpet, mörkt inuti
    for y in (18, 29): rk(im, 14, y, 18, 1, '#1c1c26')
    pix(im, [(x, 40 - (x - 14) // 6, '#22222c') for x in range(14, 32)])
    for y in range(6, 43):                                             # dörren står öppen
        w = 9; pix(im, [(34 + k, y + (k // 4 if y < 24 else -(k // 4)), TRA[3] if k < w - 1 else TRA[1]) for k in range(w)])
    pix(im, [(40, 24, MAT['mass'][3]), (40, 25, MAT['mass'][2])])
    return kontur(im)
def snogubbe(nasa, hatt=True, halsduk=False):
    im = kort(); mark(im, 39, SNO[2])
    ell(im, 24, 36, 10, 8, SNO[2], SNO[3], SNO[1]); ell(im, 24, 23, 7.5, 6.5, SNO[2], SNO[3], SNO[1]); ell(im, 24, 13, 6, 5.5, SNO[2], SNO[3], SNO[1])
    pix(im, [(21, 12, '#1a1a20'), (27, 12, '#1a1a20'), (22, 16, '#1a1a20'), (23, 17, '#1a1a20'), (24, 17, '#1a1a20'), (25, 17, '#1a1a20'), (26, 16, '#1a1a20')])
    for y in (21, 24, 27): pix(im, [(24, y, '#1a1a20')])
    if nasa == 'kol': pix(im, [(24, 14, '#1a1a20'), (25, 14, '#33333c')])
    if halsduk:
        rk(im, 18, 18, 13, 2, '#c8453a'); rk(im, 27, 19, 3, 7, '#c8453a'); pix(im, [(27 + k % 3, 20 + 2 * (k // 3), '#ffffff') for k in range(9)])
    if hatt:
        rk(im, 17, 7, 14, 2, '#22252b'); rk(im, 19, 0, 10, 7, '#2e3238'); rk(im, 19, 5, 10, 1, '#c8453a')
    for s in (-1, 1): pix(im, linje(24 + s * 7, 22, 24 + s * 14, 16, TRA[1]) + [(24 + s * 14, 15, TRA[1]), (24 + s * 15, 17, TRA[1])])
    return kontur(im)
def cykel_utan_luft():
    im = kort(); mark(im, 40, '#9a8c74')
    def hjul(cx, cy, platt):
        if platt:                                                       # däcket sjunker ihop och breder ut sig mot marken
            for a in range(0, 360, 3):
                x = cx + 8 * math.cos(math.radians(a)); y = cy + 8 * math.sin(math.radians(a))
                if y > cy: y = cy + (y - cy) * 0.55; x = cx + (x - cx) * (1 + 0.35 * (y - cy) / 4.4)
                pix(im, [(round(x), round(y), '#22252b'), (round(x), round(y) + 1, '#3a3f48')])
            for x in range(cx - 10, cx + 11): pix(im, [(x, cy + 5, '#22252b'), (x, cy + 6, '#3a3f48')])
            for a in range(0, 360, 6): pix(im, [(round(cx + 6 * math.cos(math.radians(a))), round(cy - 1 + 6 * math.sin(math.radians(a))), '#8e949e')])
        else:
            for a in range(0, 360, 4):
                x = cx + 8 * math.cos(math.radians(a)); y = cy + 8 * math.sin(math.radians(a))
                pix(im, [(round(x), round(y), '#22252b'), (round(x), round(y) + 1, '#3a3f48')])
        for a in range(0, 360, 60): pix(im, linje(cx, cy - (1 if platt else 0), round(cx + 6 * math.cos(math.radians(a))), round(cy - (1 if platt else 0) + 6 * math.sin(math.radians(a))), '#b8bec6'))
    hjul(12, 33, False); hjul(36, 35, True)
    B = '#2a52c8'
    pix(im, linje(12, 33, 22, 33, B, 2) + linje(22, 33, 30, 22, B, 2) + linje(12, 33, 18, 22, B, 2) + linje(18, 22, 31, 22, B, 2) + linje(31, 22, 36, 35, B, 2))
    pix(im, linje(17, 20, 21, 20, '#22252b', 2) + linje(31, 22, 30, 16, '#8e949e') + linje(28, 16, 33, 16, '#22252b'))
    ell(im, 22, 33, 2, 2, '#8e949e')
    return kontur(im)
def vissen_blomma():
    im = kort()
    ell(im, 39, 8, 5, 5, '#fff0a8', '#ffffff')                        # solen
    for a in range(0, 360, 45): pix(im, [(round(39 + 8 * math.cos(math.radians(a))), round(8 + 8 * math.sin(math.radians(a))), '#f2c94a')])
    for y in range(32, 45):                                            # krukan
        w = 9 - (y - 32) // 4; rk(im, 24 - w, y, 2 * w, 1, '#b05a3a' if y > 33 else '#c87050')
    rk(im, 16, 31, 16, 2, '#7a4a2a'); pix(im, [(18 + k * 3, 31 + k % 2, '#5a3a22') for k in range(5)])
    pix(im, linje(24, 31, 24, 20, '#7a7a3a') + linje(24, 20, 28, 17, '#7a7a3a') + linje(28, 17, 31, 21, '#7a7a3a'))  # stjälken böjd
    for (x, y) in ((30, 22), (31, 23), (32, 22), (29, 23), (31, 24), (30, 24)): pix(im, [(x, y, '#a08050')])
    ell(im, 31, 22, 3, 2.5, '#b8806a', None, '#8a5a40')                 # hängande, vissna blad och blomma
    for s in (-1, 1): pix(im, linje(24, 27, 24 + s * 5, 30, '#8a7a3a'))
    pix(im, [(33, 26, '#8a5a40'), (21, 33, '#a08050')])
    return kontur(im)
def hund(sitter=False, im=None, x0=0, y0=0):
    eget = im is None
    if eget: im = kort(); mark_gras(im)
    H = ('#5a3a22', '#8a5a34', '#b07a48', '#d8a870')
    if sitter:
        ell(im, x0 + 20, y0 + 32, 8, 8, H[2], H[3], H[1]); ell(im, x0 + 25, y0 + 39, 5, 3, H[2], None, H[1])
        ell(im, x0 + 19, y0 + 18, 6.5, 6, H[2], H[3], H[1]); ell(im, x0 + 13, y0 + 20, 3.5, 2.5, H[3])
        pix(im, [(x0 + 10, y0 + 20, '#1a1a20'), (x0 + 11, y0 + 20, '#1a1a20')])
        ell(im, x0 + 23, y0 + 16, 2.5, 5, H[1]); pix(im, [(x0 + 17, y0 + 16, '#1a1a20'), (x0 + 16, y0 + 15, H[1]), (x0 + 18, y0 + 15, H[1])])
        rk(im, x0 + 15, y0 + 24, 10, 2, '#c8453a')
        rk(im, x0 + 15, y0 + 34, 3, 7, H[2]); rk(im, x0 + 20, y0 + 34, 3, 7, H[2])
        pix(im, linje(x0 + 28, y0 + 37, x0 + 33, y0 + 36, H[1], 2))
    else:
        ell(im, 26, 28, 11, 6, H[2], H[3], H[1])                          # kroppen från sidan
        for x in (17, 21, 30, 34): rk(im, x, 32, 3, 9, H[2]); rk(im, x, 40, 3, 1, H[1])
        ell(im, 13, 21, 6.5, 6, H[2], H[3], H[1]); ell(im, 7, 23, 3.5, 2.5, H[3]); pix(im, [(4, 22, '#1a1a20'), (5, 22, '#1a1a20')])
        ell(im, 16, 19, 2.5, 5, H[1]); pix(im, [(11, 19, '#1a1a20'), (11, 18, '#ffffff')])
        pix(im, [(7, 26, '#d86a7a'), (8, 26, '#d86a7a'), (8, 27, '#d86a7a')])
        rk(im, 16, 24, 3, 6, '#c8453a')
        pix(im, linje(37, 26, 42, 18, H[2], 2) + [(42, 17, H[3])])
    if eget: im = kontur(im)
    return im
def skal(im, cx, cy, full=False):
    for y in range(cy, cy + 5):
        w = 8 - (y - cy) // 2; rk(im, cx - w, y, 2 * w, 1, '#c8453a' if y < cy + 4 else '#8a2a24')
    rk(im, cx - 8, cy, 16, 1, '#e86a5a')
    if full:
        for k in range(12): ell(im, cx - 6 + k, cy - 1 - (2 if 3 < k < 9 else 0), 1.6, 1.6, '#8a5a34' if k % 2 else '#b07a48')
    else: rk(im, cx - 6, cy + 1, 12, 1, '#5a1a18')
def hund_tom_skal():
    im = kort(); mark(im, 40, '#c4ac82')
    hund(True, im, -4, -2); skal(im, 33, 37)
    pix(im, [(14, 15, '#1a1a20'), (13, 14, '#5a3a22'), (12, 13, '#5a3a22')])          # ledsen blick ned mot skålen
    return kontur(im)
def barn_i_regnet():
    im = kort(); mark(im, 40, '#7a8a6a')
    ell(im, 24, 9, 15, 6, '#8e949e', '#b8bec6', '#6e747f'); ell(im, 14, 10, 7, 5, '#8e949e', '#b8bec6'); ell(im, 34, 10, 7, 5, '#8e949e', None, '#6e747f')
    for (x, y) in ((12, 18), (18, 22), (26, 17), (32, 21), (38, 17), (15, 30), (35, 29), (22, 27), (29, 32), (9, 26), (41, 27)):
        pix(im, [(x, y, VAT[4]), (x - 1, y + 1, VAT[3]), (x - 1, y + 2, VAT[3])])
    ell(im, 24, 43, 9, 2, VAT[3])
    figur(im, 'figurer/barnet/barnet_ner_01.png', 16, 19)
    for (x, y) in ((20, 22), (27, 23)): pix(im, [(x, y, VAT[4]), (x, y + 1, VAT[3])])     # droppar på huvudet
    return kontur(im)
def fagelunge_pa_marken():
    im = kort(); mark_gras(im)
    rk(im, 30, 10, 6, 32, TRA[2]); rk(im, 30, 10, 2, 32, TRA[3]); rk(im, 35, 10, 1, 32, TRA[1])
    ell(im, 36, 7, 12, 7, '#4f8a3a', '#6fae4a', '#2e5a26')
    pix(im, linje(30, 16, 18, 12, TRA[2], 2))
    ell(im, 18, 11, 6, 3, '#8a6a3a', None, '#5a4222'); rk(im, 13, 9, 10, 1, '#a08050')     # boet på grenen
    ell(im, 18, 6, 3, 3, '#3a5a8a', '#6a8aba'); pix(im, [(16, 5, '#1a1a20'), (14, 6, '#f2c94a'), (15, 6, '#f2c94a')])  # mamman i boet
    ell(im, 15, 36, 5, 4, '#b8a080', '#d8c8a8', '#8a7458'); ell(im, 11, 33, 3, 3, '#b8a080', '#d8c8a8'); pix(im, [(10, 32, '#1a1a20'), (7, 33, '#f2c94a'), (8, 33, '#f2c94a'), (8, 34, '#f2c94a')])
    pix(im, [(14, 30, '#d8c8a8'), (12, 30, '#d8c8a8'), (18, 33, '#8a7458'), (19, 34, '#8a7458')])
    return kontur(im)

# ---------------- duellens testrum ----------------
def svamp():
    im = kort(); mark_gras(im, 39)
    rk(im, 19, 26, 10, 14, '#f4efe2'); rk(im, 19, 26, 2, 14, '#ffffff'); rk(im, 27, 26, 2, 14, '#d8ccb0')
    for y in range(8, 27):                                            # den röda hatten
        for x in range(4, 45):
            u = (x + .5 - 24) / 20; v = (y + .5 - 26) / 18
            if u * u + v * v <= 1 and y < 27: pix(im, [(x, y, '#e8443a' if u + v < 0.3 else '#b02a24')])
    pix(im, [(x, 26, '#7a1a18') for x in range(5, 44)])
    for (cx, cy, r) in ((15, 18, 2.6), (24, 12, 2.8), (33, 18, 2.6), (24, 21, 2.2), (9, 23, 1.7), (39, 23, 1.7), (17, 11, 1.5), (31, 11, 1.5)):
        ell(im, cx, cy, r, r, '#ffffff')                                # stora vita prickar
    return kontur(im)
def kopp():
    im = kort()
    ell(im, 24, 40, 18, 4, '#e4ecf6', '#ffffff', '#b8c6d8')            # fatet
    for y in range(20, 39):                                            # koppen
        w = 13 - max(0, y - 30) // 2; rk(im, 24 - w, y, 2 * w, 1, '#ffffff' if y < 30 else '#e4ecf6'); pix(im, [(24 + w - 1, y, '#b8c6d8'), (24 + w - 2, y, '#d0dae8')])
    ell(im, 24, 20, 13, 3.5, '#f4f8ff'); ell(im, 24, 20, 11, 2.5, '#6a4026', None, '#4a2a18'); pix(im, [(19, 19, '#8a5a34'), (20, 19, '#8a5a34')])  # full till kanten
    for y in range(24, 33):                                            # örat
        pix(im, [(38 + (2 if 26 < y < 31 else 1), y, '#e4ecf6'), (39 + (2 if 26 < y < 31 else 1), y, '#b8c6d8')])
    for s, x0 in ((0, 19), (1, 24), (0, 29)):                         # ånga
        for k in range(8): pix(im, [(x0 + int(1.5 * math.sin(k / 2 + s * 2)), 15 - k, '#d0dae8')])
    return kontur(im)
def solros():
    im = kort(); mark_gras(im)
    pix(im, linje(24, 22, 25, 42, '#4f8a3a', 2))
    for s in (-1, 1): ell(im, 24 + s * 6, 32 + s, 5, 2.5, '#6fae4a', None, '#2e5a26')
    for a in range(0, 360, 24):                                        # kronbladen
        ell(im, 24 + 10 * math.cos(math.radians(a)), 14 + 10 * math.sin(math.radians(a)), 3.2, 3.2, '#f2c94a', '#fff0a8', '#c89a2a')
    ell(im, 24, 14, 7, 7, '#6a4026', '#8a5a34', '#3a2414')
    for k in range(12): pix(im, [(20 + (k * 5) % 9, 10 + (k * 3) % 8, '#3a2414')])
    return kontur(im)

# ---------------- ledbilderna i bubblan ----------------
def bubbla(vad):
    im = bubbla_kort()
    if vad == 'stege':
        for y in range(9, 34): pix(im, [(18, y, TRA[2]), (19, y, TRA[3]), (31, y, TRA[2]), (32, y, TRA[3])])
        for y in range(12, 33, 5): rk(im, 20, y, 11, 2, TRA[3]); rk(im, 20, y + 1, 11, 1, TRA[1])
    elif vad == 'tejp':
        ell(im, 21, 20, 9, 9, '#d9c79a', '#f0e4c0', '#b9a676'); ell(im, 21, 20, 4, 4, '#8a7a55'); ell(im, 21, 20, 2.5, 2.5, '#fbf6e6')
        for k in range(11): rk(im, 28 + k, 25 + k // 2, 2, 4, '#e8dab3')
    elif vad == 'morot':
        for k in range(20):
            w = max(1, 4 - k // 5); x = 16 + k; y = 26 - k // 2
            pix(im, [(x, y + d, '#e0722a' if d < w else '#b04a1a') for d in range(-w, w + 1)])
            if k % 5 == 2: pix(im, [(x, y - w + 1, '#b04a1a')])
        for (dx, dy) in ((0, -4), (-3, -3), (3, -5)): pix(im, linje(15, 26, 15 + dx * 2, 26 + dy * 2 - 2, '#4f8a3a', 2))
    elif vad == 'pump':
        rk(im, 19, 12, 7, 20, '#2a52c8'); rk(im, 19, 12, 2, 20, '#4f7ae8'); rk(im, 15, 31, 15, 3, '#22252b')
        rk(im, 21, 7, 3, 6, '#8e949e'); rk(im, 16, 6, 13, 2, '#22252b')
        pix(im, linje(26, 28, 34, 30, '#22252b', 2) + linje(34, 30, 36, 24, '#22252b', 2))
    elif vad == 'vattendroppe':
        for y in range(9, 33):
            t = (y - 9) / 23; w = 9 * math.sin(t * math.pi * 0.62) if t < 0.75 else 9 * math.sqrt(max(0, 1 - ((t - 0.75) / 0.25) ** 2)) * 0.95
            for x in range(int(25 - w), int(25 + w) + 1): pix(im, [(x, y, VAT[3] if x < 25 - w / 3 else VAT[2])])
        pix(im, [(21, 22, '#ffffff'), (21, 23, '#ffffff'), (22, 21, '#ffffff')])
    elif vad == 'matskal':
        big = kort(); skal(big, 12, 12, True); big = big.crop((2, 6, 22, 18)).resize((40, 24), Image.NEAREST); im.alpha_composite(big, (5, 11))
    elif vad == 'paraply':
        for y in range(10, 22):
            for x in range(11, 40):
                u = (x + .5 - 25) / 14; v = (y + .5 - 22) / 12
                if u * u + v * v <= 1: pix(im, [(x, y, '#c8453a' if (int((x - 11) / 7.25)) % 2 == 0 else '#f2c94a')])
        for x in range(11, 40, 7): pix(im, [(x, 22, '#7a1a18'), (x + 1, 21, '#7a1a18')])
        pix(im, linje(25, 9, 25, 32, '#22252b') + linje(25, 32, 22, 34, '#22252b') + [(21, 33, '#22252b')])
    elif vad == 'hand_lyfter':
        Hd = ('#7a5a3a', '#d8a870', '#ecc490')                            # en öppen hand som lyfter, och pilen uppåt
        ell(im, 25, 27, 9, 5, Hd[1], Hd[2], Hd[0])
        for k, x in enumerate((17, 21, 25, 29)): rk(im, x, 19 + (k % 2), 3, 8, Hd[1]); pix(im, [(x, 19 + (k % 2), Hd[2])])
        pix(im, linje(33, 25, 37, 21, Hd[1], 2))
        pix(im, linje(25, 16, 25, 8, '#2a52c8', 2) + linje(21, 12, 25, 8, '#2a52c8', 2) + linje(29, 12, 25, 8, '#2a52c8', 2))
    return im

ALLA = {
    'tr_boll_pa_taket': boll_pa_taket, 'tr_bat_som_lacker': bat_som_lacker, 'tr_morkt_skap': morkt_skap,
    'tr_snogubbe_utan_nasa': lambda: snogubbe(None), 'tr_cykel_utan_luft': cykel_utan_luft, 'tr_vissen_blomma': vissen_blomma,
    'tr_hund_tom_skal': hund_tom_skal, 'tr_barn_i_regnet': barn_i_regnet, 'tr_fagelunge_pa_marken': fagelunge_pa_marken,
    'svamp': svamp, 'snogubbe': lambda: snogubbe('kol', True, True), 'hund': hund, 'kopp': kopp, 'solros': solros,
    **{f'tankebubbla_{v}': (lambda v=v: bubbla(v)) for v in ('stege', 'tejp', 'morot', 'pump', 'vattendroppe', 'matskal', 'paraply', 'hand_lyfter')},
}

def kortfarger():
    T = set()
    for f in glob.glob(os.path.join(INK, 'bildkort/*.png')):
        if os.path.basename(f)[:-4] in ALLA: continue
        T |= {c[1][:3] for c in Image.open(f).convert('RGBA').getcolors(1 << 20) if c[1][3] > 127}
    return sorted(T)
def las_till(im, farger):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 128: px[x, y] = (0, 0, 0, 0); continue
            px[x, y] = (*min(farger, key=lambda f: (f[0] - r) ** 2 * 2 + (f[1] - g) ** 2 * 3 + (f[2] - b) ** 2), 255)
    return im

if __name__ == '__main__':
    F = kortfarger(); ut = os.path.join(UTMAPP, 'bildkort'); os.makedirs(ut, exist_ok=True)
    for namn, fn in ALLA.items(): las_till(fn(), F).save(os.path.join(ut, namn + '.png'))
    n = len(ALLA); kol = 8
    o = Image.new('RGBA', (kol * 50, ((n + kol - 1) // kol) * 50), (250, 246, 236, 255))
    for i, namn in enumerate(ALLA): o.alpha_composite(Image.open(os.path.join(ut, namn + '.png')), (1 + (i % kol) * 50, 1 + (i // kol) * 50))
    o.resize((o.width * 3, o.height * 3), Image.NEAREST).save('/tmp/testrum_kort_x3.png')
    print(n, 'kort,', len(F), 'färger att välja bland')
