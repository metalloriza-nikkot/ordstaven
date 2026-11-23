# Skissen av kapitel 4:s rum, version 2 (22/11): mer djup, som i konceptrundan, och snett ovanifrån.
# Rummen byggs som en höjdkarta: varje yta har en nivå, och där en högre yta möter en lägre i söder syns
# en brant (sten eller is) med snö på kanten och skugga nedanför. Det ger avsatser i flera steg, som i
# A Link to the Past, och känslan av att stå bland höga berg.
#   stigen   640 x 320   mot kartan på 0.103.0
#   stenfalt 320 x 192   mot kartan på 0.103.0, med ett förslag om kanter som stup (se rapporten)
#   grottan  640 x 384   ett FÖRSLAG till ny planlösning (22/11): smal gång, gemenernas vägg, öppen sal med
#                        stig 2, gåtans galleri, stig 3 uppåt mot sprickan, och tre avstickare
import os, sys, math, random
import numpy as np
_k = open('/home/claude/k4/skiss_k4.py').read()
exec(_k[:_k.index("\ndef stigen():")])
from PIL import Image, ImageDraw, ImageFont
UTS = '/home/claude/k4/skiss2'
KARTOR = '/home/claude/ordstaven/kartor/den-gomda-dalen/'
H = lambda c: hx(c) + (255,)

STENF = ('#2e2a36', '#4a4450', '#6e6a78', '#8e8aa8', '#a8a4c0')    # klippans sten, mörk till ljus
BRUN = ('#3a2a1e', '#5a4632', '#7a6448', '#9a8466', '#b8a684')      # varm sten för avsatserna (som i konceptet)

class Hojd:
    def __init__(s, b, h, bas=0, mat='sno'):
        s.b, s.h = b, h
        s.L = np.full((h, b), bas, dtype=np.int16)
        s.M = np.full((h, b), mat, dtype=object)
    def rk(s, x, y, b, h, niva, mat=None):
        s.L[max(0, y):y + h, max(0, x):x + b] = niva
        if mat: s.M[max(0, y):y + h, max(0, x):x + b] = mat
    def vag(s, x, y, b, h, niva, mat=None, amp=3, seed=0, botten=False):
        """Som rk, men övre kanten (och nedre om botten) böljar."""
        for xx in range(max(0, x), min(s.b, x + b)):
            o = int(amp * math.sin(xx / 23 + seed) + amp * 0.6 * math.sin(xx / 7 + seed * 2))
            y0 = max(0, y + o); y1 = y + h + (o if botten else 0)
            s.L[y0:y1, xx] = niva
            if mat: s.M[y0:y1, xx] = mat
    def mat(s, x, y, b, h, mat): s.M[max(0, y):y + h, max(0, x):x + b] = mat

def rendera(hk, FH=14, seed=1, stil='berg', fhniva=None):
    """Höjdkartan till en bild. stil 'berg': sten med snö; 'is': isväggar i grottan."""
    b, h = hk.b, hk.h; L, M = hk.L, hk.M
    d = Bild(b, h); p = d.p
    face = np.zeros((h, b), dtype=np.float32) - 1
    faceh = np.zeros((h, b), dtype=np.int16)
    for x in range(b):
        for y in range(h - 2, -1, -1):
            if L[y + 1, x] < L[y, x]:
                diff = int(L[y, x] - L[y + 1, x]); fh = (fhniva or {}).get(int(L[y, x]), FH * min(diff, 2))
                for k in range(fh):
                    yy = y - k
                    if yy < 0 or L[yy, x] != L[y, x]: break
                    face[yy, x] = 1 - k / fh; faceh[yy, x] = fh
    for y in range(h):
        for x in range(b):
            m = M[y, x]; f = face[y, x]; n = brus(x, y, 14, seed)
            if f >= 0:
                ty = int((1 - f) * faceh[y, x])
                if stil == 'is' or m in ('is', 'isvagg'):
                    s = brus(x * 3, y * 0.3, 7, seed + 3)
                    c = IS[6] if ty < 2 else (IS[4] if s > 0.55 else IS[3]) if f > 0.35 else (IS[3] if s > 0.6 else IS[2])
                    if (x * 7 + seed) % 13 == 0 and ty > 2: c = IS[5]
                    if f < 0.08: c = IS[1]
                    if 2 <= ty <= 3 + (x * 13 + seed) % 5 and (x * 5 + seed) % 4 == 0: c = IS[7]   # istappar
                else:
                    pal = BRUN if m in ('sno', 'snoberg') else STENF
                    BH = 7; rad = (ty - 3) // BH; by = (ty - 3) % BH
                    bw = 9 + int(4 * brus(rad * 7.0, x // 12, 1.0, seed))
                    bx = (x + rad * 5 + seed) % bw
                    s = brus(x * 1.3, y, 5, seed + 5)
                    c = pal[2] if s > 0.35 else pal[1]
                    if by <= 1: c = pal[3] if by == 0 else (pal[3] if s > 0.5 else pal[2])
                    if by == 0 and brus(x, rad * 9.0, 4, seed + 11) > 0.55: c = SNO[2] if (x + rad) % 3 else SNO[3]
                    if bx == 0 or by == BH - 1: c = pal[0]
                    elif bx == bw - 1 or by == BH - 2: c = pal[1]
                    if ty < 3: c = SNO[3] if ty == 0 else SNO[2] if ty == 1 else SNO[1]
                    if f < 0.04: c = pal[0]
                d.s(x, y, c); continue
            if m == 'stup':                                                 # brant nedåt från kanten ovanför (rummets ytterkant)
                ty = 0
                while y - ty - 1 >= 0 and M[y - ty - 1, x] == 'stup': ty += 1
                pal = BRUN; BH = 7; rad = ty // BH; by = ty % BH
                bw = 9 + int(4 * brus(rad * 7.0, x // 12, 1.0, seed)); bx = (x + rad * 5 + seed) % bw
                s = brus(x * 1.3, y, 5, seed + 5)
                c = pal[2] if s > 0.35 else pal[1]
                if by <= 1: c = pal[3]
                if by == 0 and brus(x, rad * 9.0, 4, seed + 11) > 0.55: c = SNO[2]
                if bx == 0 or by == BH - 1: c = pal[0]
                elif bx == bw - 1: c = pal[1]
                if ty < 2: c = SNO[3] if ty == 0 else SNO[2]
                if ty > 10 and (x + y) % 2 == 0: c = '#b4c4e6'                  # dis längre ned
                if ty > 14: c = '#b4c4e6' if (x + y) % 2 else '#c8d4ec'
                d.s(x, y, c); continue
            if m == 'vatten':
                s = brus(x, y * 2, 12, seed + 7)
                c = IS[0] if s < 0.55 else IS[1]
                if (y + int(3 * math.sin(x / 7))) % 9 == 0 and s > 0.55: c = IS[2]
            elif m == 'is':
                c = IS[6]
                if n < 0.2 and (x + y) % 2 == 0: c = IS[5]
                elif n > 0.85 and (x + 2 * y) % 3 == 0: c = IS[7]
            elif m == 'isvagg':                                             # toppen av isväggen: stora isblock
                rad = y // 10; bx = (x + (rad % 2) * 8) % 16; by = y % 10
                c = IS[3] if n > 0.4 else IS[2]
                if by <= 1: c = IS[4]
                if bx == 0 or by == 9: c = IS[1]
                if bx == 1 and by > 1: c = IS[4]
            elif m == 'flod':
                s = brus(x, y * 2, 8, seed + 30)
                c = IS[2] if s > 0.5 else IS[3]
                if s > 0.78 and (x + y) % 2 == 0: c = IS[5]
            elif m == 'dal':
                c = '#c8d4ec' if n > 0.45 else '#b4c4e6'
            elif m == 'moln':
                s = brus(x, y * 2.5, 10, seed + 9)
                c = '#ffffff' if s > 0.55 else '#e8f2fa' if s > 0.3 else '#dce0e4'
            elif m == 'himmel':
                c = '#a0d9ee' if y % 7 else '#bfe3ef'
            else:
                c = SNO[2]
                if n < 0.13 and (x + y) % 2 == 0: c = SNO[1]
                elif n > 0.86 and (x + y) % 3 == 0: c = SNO[3]
            d.s(x, y, c)
    for y in range(1, h):
        for x in range(b):
            if face[y, x] >= 0 or M[y, x] in ('vatten', 'moln', 'himmel', 'dal', 'flod', 'stup'): continue
            hogre_n = any(y - k >= 0 and face[y - k, x] >= 0 and L[y - k, x] > L[y, x] for k in (1, 2, 3))
            hogre_v = any(x - k >= 0 and L[y, x - k] > L[y, x] for k in (1, 2, 3, 4))
            if hogre_n or (hogre_v and (x + y) % 2 == 0):
                p[x, y] = H(IS[4] if M[y, x] == 'is' else SNO[1])
    for y in range(h):
        for x in range(1, b - 1):
            if face[y, x] < 0 and (L[y, x - 1] < L[y, x] or L[y, x + 1] < L[y, x]):
                d.s(x, y, IS[1] if stil == 'is' else STENF[0])
            elif face[y, x] < 0 and y > 0 and L[y - 1, x] < L[y, x] and face[y - 1, x] < 0:
                d.s(x, y, SNO[3] if stil != 'is' else IS[7])
    return d

def gran(im, bx, by, s=1.0):
    for k in range(5):
        w = int((2 + k * 2) * s)
        for j in range(int(3 * s)):
            for x in range(-w + (2 - min(j, 2)), w - (2 - min(j, 2)) + 1):
                px, py = bx + x, by + int(k * 3 * s) + j
                if 0 <= px < im.width and 0 <= py < im.height:
                    im.putpixel((px, py), H(SNO[3] if j == 0 and x % 2 == 0 else '#2e5a3a' if (x + j) % 4 else '#1e3a28'))
    for j in range(int(3 * s)):
        py = by + int(15 * s) + j
        if py < im.height: im.putpixel((bx, py), H(TRA[1]))

def stolpe(im, sx, sy):
    dd = ImageDraw.Draw(im)
    dd.rectangle((sx - 1, sy - 16, sx, sy), fill=H(TRA[1])); dd.rectangle((sx - 9, sy - 16, sx + 8, sy - 10), fill=H(TRA[3]))
    dd.line((sx - 9, sy - 10, sx + 8, sy - 10), fill=H(TRA[1]))

def flak_rutnat(im, cx, cy, kol, rad, hoppa=()):
    fl = k4('foremal/berg/isflak.png')
    for r in range(rad):
        for k in range(kol):
            if (r, k) in hoppa: continue
            x = cx + (k - (kol - 1) / 2) * 30; y = cy + (r - (rad - 1) / 2) * 22
            fot(im, fl, x, y + 8)

def rok(im, x0, y0, n=40, seed=5):
    rr = random.Random(seed)
    for i in range(n):
        x = x0 + int(6 * math.sin(i / 4)) + rr.randrange(-3, 4) + i // 3; y = y0 - i
        for a in range(-2, 3):
            for b2 in range(-1, 2):
                if 0 <= x + a < im.width and 0 <= y + b2 < im.height and (a + b2 + i) % 2 == 0:
                    im.putpixel((x + a, y + b2), H(ANGA[1] if i % 5 else ANGA[0]))

# ---------------------------------------------------------------- stigen (0.103.0)
def stigen():
    hk = Hojd(640, 320, bas=2)
    hk.rk(0, 0, 24, 320, 0, 'flod')
    hk.vag(24, 306, 616, 14, 2, 'stup', amp=2, seed=1)                       # branten ned mot dalen
    hk.rk(24, 174, 616, 30, 3)                                               # stupet: tre avsatser, branterna inne i väggen
    hk.rk(24, 146, 616, 28, 4)
    hk.rk(24, 64, 616, 84, 5); hk.rk(528, 44, 112, 20, 5)                    # platån (kartans golv y 64–116) och översta avsatsen
    hk.vag(24, 40, 504, 24, 6, amp=2, seed=5)                                # avsatsen mot sluttningen
    hk.vag(24, 14, 616, 30, 7, amp=3, seed=6)                                # sluttningen mot stenfältet
    hk.vag(24, 0, 300, 16, 8, amp=2, seed=7); hk.rk(24, 0, 150, 5, 9)        # högre mot toppen i nordväst
    hk.rk(528, 44, 112, 20, 5)
    hk.rk(262, 116, 76, 86, 5, 'is')
    d = rendera(hk, FH=26, seed=2)
    im = d.im
    # isfallet: en isig ramp med lodräta stråk, flaken står på den
    for y in range(116, 202):
        for x in range(262, 338):
            s = brus(x * 2.5, y * 0.2, 8, 41); t = min(x - 262, 338 - x)
            c = IS[7] if t < 2 else IS[6] if t < 6 else (IS[5] if s > 0.45 else IS[4])
            if (x + y) % 17 == 0: c = IS[7]
            im.putpixel((x, y), H(c))
        im.putpixel((261, y), H(STENF[0])); im.putpixel((338, y), H(STENF[0]))
    # mynningen i nordöstra hörnet: valv i branten ovanför (552–616)
    for x in range(546, 622):
        for y in range(14, 76):
            u = (x - 584) / 34; v = (y - 74) / 56; r = u * u + v * v
            if r <= 0.62: im.putpixel((x, y), H(IS[0] if r < 0.48 else IS[1]))
            elif r <= 1.0 and y < 64: im.putpixel((x, y), H(STENF[2] if (x // 6 + y // 5) % 2 else STENF[1]))
            elif r <= 1.1 and y < 64: im.putpixel((x, y), H(STENF[0]))
    for x in range(556, 614, 5):
        for k in range(2 + x % 3): im.putpixel((x, 26 + k + abs(x - 584) // 5), H(IS[7]))
    # toppen som ryker, högt uppe i nordväst
    for x in range(30, 150):
        for y in range(0, 14):
            if abs(x - 90) < 60 - y * 3: im.putpixel((x, y), H(SNO[3] if (x + y) % 5 else SNO[2]))
    d2 = Bild(640, 320); d2.ell(90, 3, 10, 3, STENF[0]); im.alpha_composite(d2.im)
    rok(im, 88, 2, 0)
    # stigarna nere: från floden till gaffeln och de tre hållen
    sp = Bild(640, 320)
    spar(sp, [(30, 288), (80, 282), (130, 266), (166, 254)]); spar(sp, [(166, 254), (220, 240), (262, 214)])
    spar(sp, [(166, 254), (128, 228), (108, 210)]); spar(sp, [(166, 254), (170, 290), (190, 306)])
    spar(sp, [(338, 120), (400, 96), (470, 92), (560, 82), (584, 78)])
    im.alpha_composite(sp.im)
    # bron över floden, granar, stolparna
    dd = ImageDraw.Draw(im); dd.rectangle((0, 270, 24, 290), fill=H(TRA[3]))
    for x in range(0, 24, 4): dd.line((x, 270, x, 290), fill=H(TRA[1]))
    for (gx, gy, s) in ((60, 220, 1), (40, 296, 1.2), (226, 270, 1), (590, 214, 1.3), (620, 240, 1), (410, 222, 1.1), (480, 290, 1)):
        gran(im, gx, gy, s)
    for (sx, sy) in ((181, 254), (161, 310), (107, 224)): stolpe(im, sx, sy)
    flak_rutnat(im, 300, 159, 2, 3)
    sn = Bild(640, 320); rr = random.Random(9)
    for (x, y) in ((392, 82), (462, 100), (552, 100), (612, 104)): snoklump(sn, x, y, 9, 6, rr)
    sn.ell(481, 78, 9, 6, STEN[2], STEN[3], STEN[1], STEN[0])
    im.alpha_composite(sn.kontur('#2a2a3a').im)
    k = k4('foremal/berg/block_hanger.png'); fot(im, k, 540, 36)               # blocket på sluttningen
    fot(im, bild('figurer/hjalte/hjalte_ga_hoger_01.png'), 52, 284); fot(im, bild('figurer/unge/unge1_ga_hoger_01.png'), 34, 288)
    return im

# ---------------------------------------------------------------- stenfältet (0.103.0 + kanter som stup)
def stenfalt():
    hk = Hojd(320, 192, bas=3)
    hk.vag(0, 0, 320, 26, 3, 'moln', amp=2, seed=4)                         # molnhavet långt nedanför norra kanten
    hk.rk(0, 0, 320, 7, 3, 'himmel')
    hk.vag(0, 176, 320, 16, 3, 'stup', amp=2, seed=5)                       # södra kanten ned mot grottan (förslag: vägg)
    hk.rk(304, 26, 16, 150, 3, 'moln')                                       # östra kanten: molnen (förslag: vägg)
    hk.vag(0, 56, 46, 92, 5, amp=2, seed=8)                                  # klippan med grottans utgång i väster
    hk.vag(236, 26, 68, 22, 4, amp=2, seed=9)                                # en högre hylla i nordost
    d = rendera(hk, FH=22, seed=21)
    im = d.im
    for x in range(0, 304):                                                  # norra kanten: snö och en mörk kant mot molnen
        y0 = next((y for y in range(0, 40) if hk.M[y, x] not in ('moln', 'himmel')), 26)
        im.putpixel((x, y0), H(STENF[0])); im.putpixel((x, y0 + 1), H(SNO[3]))
    for y in range(26, 176):                                                 # östra kanten: en mörk kant mot molnen
        for x in (302, 303): im.putpixel((x, y), H(STENF[0] if x == 303 else SNO[3]))
    def topp(cx, by, hojd, bredd):
        for y in range(by - hojd, by):
            w = (y - (by - hojd)) / hojd * bredd
            for x in range(int(cx - w), int(cx + w) + 1):
                if not (0 <= x < 320 and 0 <= y < 192): continue
                snog = y < by - hojd * 0.55 + 2 * math.sin(x / 3)
                c = (SNO[3] if x < cx else SNO[1]) if snog else (STENF[3] if x < cx else STENF[1])
                im.putpixel((x, y), H(c))
    topp(262, 24, 20, 22); topp(222, 22, 10, 12); topp(40, 22, 8, 10); rok(im, 263, 5, 6)
    for x in range(4, 40):                                                   # grottans utgång i klippans brant
        for y in range(122, 150):
            u = (x - 22) / 18; v = (y - 150) / 26; r = u * u + v * v
            if r <= 0.62: im.putpixel((x, y), H(IS[0] if r < 0.45 else IS[1]))
            elif r <= 1.0: im.putpixel((x, y), H(IS[5] if (x + y) % 4 else IS[6]))
            elif r <= 1.12: im.putpixel((x, y), H(IS[2]))
    sp = Bild(320, 192); spar(sp, [(24, 156), (78, 154), (100, 106), (124, 96), (178, 46), (176, 26)], 4); im.alpha_composite(sp.im)
    for (n, (x, y, b, h_)) in (('sten_varm_slat_01', (70, 60, 26, 20)), ('sten_varm_taggsvans_01', (140, 46, 26, 20)),
                               ('sten_kall_klubbsvans', (210, 70, 26, 20)), ('sten_hal', (240, 130, 30, 18)),
                               ('sten_varm_klubbsvans_01', (110, 120, 26, 20))):
        fot(im, k4('foremal/berg/' + n + '.png'), x + b / 2, y + h_ + 4)
    fot(im, k4('foremal/berg/block_driva.png'), 270, 96)
    fot(im, bild('figurer/hjalte/hjalte_ga_hoger_01.png'), 40, 162); fot(im, bild('figurer/unge/unge1_ga_hoger_01.png'), 24, 166)
    return im

# ---------------------------------------------------------------- isgrottan: förslag till ny planlösning
# Golvet är nivå 1, isväggarna nivå 3 (en hög brant med istappar), vattnet nivå 0.
GROTTA_PLATSER = {
    'start (snön stänger bakom honom)': (40, 370),
    'A smal gång': (40, 300),
    'B gemenernas vägg': (100, 74),
    'C salen, stig 2 (TAVLA)': (280, 260),
    'D gåtans galleri': (430, 150),
    'E stig 3 uppåt (klubba)': (556, 230),
    'sprickan, ut till stenfältet': (558, 18),
    'F1 avstickare: bär': (122, 318),
    'F2 avstickare: ishyllan': (268, 350),
    'F3 avstickare: istappsgrottan': (612, 330),
}
def grottan():
    hk = Hojd(640, 384, bas=3, mat='isvagg')
    G = lambda x, y, b, h_: hk.rk(x, y, b, h_, 1, 'is')
    # A: den smala gången från ingången i sydväst, upp och runt
    G(24, 330, 36, 54); G(28, 200, 28, 132); G(28, 196, 96, 26); G(96, 120, 28, 100)
    # F1: avstickare österut från gången till en liten kammare med bär (återvändsgränd)
    G(56, 272, 48, 22); G(100, 250, 44, 60)
    # B: gemenernas vägg, en liten kammare i nordväst, som öppnar sig mot salen
    G(52, 62, 130, 62)
    # C: salen med stig 2 över vattnet
    G(160, 90, 22, 220)                                                      # västra stranden
    hk.rk(182, 96, 196, 214, 0, 'vatten')                                    # vattnet (stig 2 går tvärs över)
    # D: gåtans galleri
    G(378, 64, 108, 256)
    # F2: avstickaren under sjön till ishyllan (söderut från galleriet och västerut)
    G(400, 318, 36, 48); G(214, 340, 222, 26); G(214, 322, 90, 20)
    # E: stig 3 uppåt till sprickan i norr
    hk.rk(486, 28, 140, 226, 0, 'vatten')
    G(486, 254, 140, 56)                                                     # landningen nedanför stig 3
    G(536, 10, 44, 20)                                                       # nischen vid sprickan
    # F3: avstickaren österut från landningen till istappsgrottan
    G(586, 300, 40, 66)
    d = rendera(hk, FH=18, seed=9, stil='is')
    im = d.im
    # stig 2 (5 x 3) och stig 3 (3 brett, 6 uppåt)
    flak_rutnat(im, 280, 200, 5, 3)
    flak_rutnat(im, 556, 140, 3, 6, hoppa=((2, 2),))
    v = k4('foremal/berg/vak_01.png'); fot(im, v, 556 + 30, 140 - 11 + 8)
    # B: gemenernas vägg och gåtans väggar: glimt av skrift, inga bokstäver
    def skrift(x, y, n=3, w=22):
        for k in range(w):
            for j in range(n):
                if (k + j * 2) % 4: im.putpixel((x + k, y + j * 3), H('#fff8c8' if j == 1 else '#ffffff'))
    for x in (64, 94, 124): skrift(x, 50, 2, 20)                             # versal och gemen, par för par
    for x in (386, 422, 458): skrift(x, 52, 3, 22)                           # gåtans tre rader
    skrift(492, 296, 2, 20); skrift(520, 296, 2, 20)                         # vägen ut och gåtans rad igen
    # sprickan med dagsljus i norr
    for y in range(0, 14):
        w = 6 - y // 3
        for x in range(558 - w, 558 + w): im.putpixel((x, y), H('#fff8c8' if abs(x - 558) < 2 else '#ffffff'))
    for i in range(60):
        for j in range(-4 - i // 6, 5 + i // 6):
            x, y = 558 + j, 16 + i
            if 0 <= y < 384 and im.getpixel((x, y))[:3] == hx(IS[5]) and (x + y) % 3 == 0: im.putpixel((x, y), H(IS[7]))
    # F2: ishyllan med isblocket
    for x in range(222, 296):
        for y in range(326, 334): im.putpixel((x, y), H(IS[7] if y < 328 else IS[6]))
    fot(im, Image.open('/home/claude/k4/ut118/foremal/berg/isblock_hylla_01.png'), 258, 352)
    # F1: bär i isen, F3: istappar som en skog
    for (bx, by) in ((112, 282), (124, 290), (132, 278)):
        dd = ImageDraw.Draw(im); dd.ellipse((bx - 2, by - 2, bx + 2, by + 2), fill=H('#2a52c8')); im.putpixel((bx - 1, by - 1), H('#9ab6ff'))
    for x in range(590, 624, 5):
        for k in range(6 + (x * 7) % 9): im.putpixel((x, 302 + k), H(IS[7] if k < 3 else IS[6]))
    # snöpluggen vid ingången
    sn = Bild(640, 384); rr = random.Random(2)
    for x in (30, 44, 54): snoklump(sn, x, 380, 8, 5, rr)
    im.alpha_composite(sn.kontur(IS[0]).im)
    rr = random.Random(3)
    for _ in range(80):                                                      # stavens regnbågsljus i väggarna
        x, y = rr.randrange(640), rr.randrange(384)
        if im.getpixel((x, y))[:3] in (hx(IS[3]), hx(IS[4])): im.putpixel((x, y), H(REGNBAGE[rr.randrange(5)]))
    fot(im, bild('figurer/hjalte/hjalte_ga_upp_01.png'), 42, 330); fot(im, bild('figurer/unge/unge1_ga_upp_01.png'), 42, 352)
    return im

def plan(im, platser):
    """Planen med etiketter (bara för skissen, inget i spelet)."""
    k = im.resize((im.width * 2, im.height * 2), Image.NEAREST); dd = ImageDraw.Draw(k)
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except Exception: f = ImageFont.load_default()
    for t, (x, y) in platser.items():
        X, Y = x * 2, y * 2; w = dd.textlength(t, font=f)
        X = min(max(4, X - w / 2), k.width - w - 6)
        dd.rounded_rectangle((X - 4, Y - 11, X + w + 4, Y + 10), 5, fill=(255, 250, 230, 235), outline=(60, 40, 20, 255))
        dd.text((X, Y - 9), t, fill=(40, 30, 20, 255), font=f)
    return k

def karta(im, rum):
    import json
    m = json.load(open(KARTOR + rum + '.tmj')); k = im.copy(); dd = ImageDraw.Draw(k)
    for Lr in m['layers']:
        for o in Lr.get('objects', []):
            x, y, b, h_ = o['x'], o['y'], o.get('width', 0), o.get('height', 0)
            if b and h_: dd.rectangle((x, y, x + b - 1, y + h_ - 1), outline=(230, 40, 40, 255) if o.get('type') == 'vagg' else (250, 210, 40, 255))
            else: dd.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(250, 210, 40, 255))
    return k.resize((k.width * 2, k.height * 2), Image.NEAREST)

if __name__ == '__main__':
    os.makedirs(UTS, exist_ok=True)
    val = sys.argv[1:] or ['stigen', 'stenfalt', 'grottan']
    for namn in val:
        im = las({'stigen': stigen, 'stenfalt': stenfalt, 'grottan': grottan}[namn]())
        im.save(f'{UTS}/skiss2_k4_{namn}.png'); im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f'{UTS}/skiss2_k4_{namn}_x2.png')
        if namn == 'grottan': plan(im, GROTTA_PLATSER).save(f'{UTS}/skiss2_k4_grottan_plan_x2.png')
        else: karta(im, {'stigen': 'berget_stigen', 'stenfalt': 'berget_stenfalt'}[namn]).save(f'{UTS}/skiss2_k4_{namn}_karta_x2.png')
    print('klart')
