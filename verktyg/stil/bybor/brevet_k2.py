# Kapitel 2, steg 5 del 3 (beslut 84): bilderna som saknades till brevets mellanscener (k2s02, k2s04, k2s05).
# - luftskepp_river_brevet_01–02: Herr Skata flyger och nafsar i ena änden av brevet, baronen håller i den andra. Båda drar.
# - luftskepp_brevet_rivet: RITS. Baronen håller sin halva, Herr Skata tumlar baklänges med tom näbb.
# - brev_halva_faller_01–02: den andra halvan fladdrar ned mot vassen (Teknik flyttar den).
# - brevram_nara_<lage>: närbilden av brevramen på Tant Rosas dörr (110 x 70, som bokbilden), där halvan
#   passar i sin rivna kontur och den blöta torkar. Ingen läsbar text: bara bläckrader, som Farfars lappar.
# Vänster halva = baronens (bryggan, torr), höger halva = den i vassen (blöt). Sigillet är Farfars kompassros i mässing.
import os, sys, math
HAR = '/home/claude/bybor'; os.chdir(HAR)
src = open('foremal_k2b.py').read().split("if __name__ == '__main__':")[0]
G = {'__name__': 'foremal_k2b', '__file__': os.path.join(HAR, 'foremal_k2b.py')}; exec(src, G)
for k in ('MAT', 'ny', 'pix', 'kontur', 'skriv', 'P', 'hxc', 'brev_halva'): globals()[k] = G[k]
from PIL import Image
G3 = {'__name__': 'pass3'}; cwd = os.getcwd()
exec(open('/home/claude/pass3/pass3.py').read().rsplit("UT={}", 1)[0], G3); os.chdir(cwd)
luftskepp, hx2 = G3['luftskepp'], G3['hx2']
SKD = '/home/claude/skata2/ut/'
def LD(n): return Image.open(SKD + n + '.png').convert('RGBA')
PAP = MAT['papper']; MASS = MAT['mass']; BLOT = ['#5a6470', '#8a96a4', '#a8b4c0', '#c0c8d0', '#dce0e4']

# ---------- brevet i luftskeppet ----------
def brev_lang(w, h, revet=None):
    """Brevet sett från sidan, w x h. revet: None (helt), 'v' (bara vänster halva), 'h' (bara höger)."""
    im = ny(w, h); mitt = w // 2
    riv = [mitt + (1 if (y % 2) else 0) for y in range(h)]
    for y in range(h):
        for x in range(w):
            if revet == 'v' and x >= riv[y]: continue
            if revet == 'h' and x < riv[y]: continue
            c = PAP[4] if y == 0 else (PAP[2] if y == h - 1 else PAP[3])
            if y in (2, 4) and 2 <= x < w - 2 and x % 3 and abs(x - mitt) > 2: c = '#5a4a3a'       # bläckrader, oläsbara
            pix(im, [(x, y, c)])
    sy = h // 2                                                                                   # sigillet mitt på
    for (dx, dy, c) in [(-1, 0, MASS[3]), (0, 0, MASS[2]), (-1, 1, MASS[1]), (0, 1, MASS[1]), (1, 0, MASS[2]), (1, 1, MASS[0])]:
        x = mitt + dx
        if (revet == 'v' and x >= riv[sy + dy]) or (revet == 'h' and x < riv[sy + dy]): continue
        pix(im, [(x, sy - 1 + dy, c)])
    return kontur(im)

def hand(im, x, y):
    pix(im, [(x, y, '#f2c6a2'), (x + 1, y, '#d9967a'), (x, y + 1, '#d9967a')])

def river(b):
    """b = 1 eller 2: dragkampen, brevet sträcks och Herr Skata slår med vingarna."""
    im = luftskepp('arg', 0 if b == 1 else 1, skata=None, mun=True)
    bx, by = 44, 40
    br = brev_lang(18, 7)
    ox = bx + 20 + (1 if b == 2 else 0)
    im.alpha_composite(br, (ox, by + 6))
    hand(im, ox, by + 8); hand(im, bx + 3, by + 9)                                                  # baronens händer: en på brevet
    s = LD('herr_skata_flyga_vanster_0%d' % b)
    im.alpha_composite(s, (ox + 16, by + 3 - (1 if b == 2 else 0)))                                 # näbben i brevets högra ände
    return im

def rivet():
    im = luftskepp('arg', 0, skata=None, mun=True)
    bx, by = 44, 40
    im.alpha_composite(brev_lang(18, 7, 'v'), (bx + 16, by + 3))                                     # baronen håller upp sin halva
    hand(im, bx + 16, by + 6)
    s = LD('herr_skata_krascha_vanster_02')                                                        # Herr Skata tumlar bakåt
    im.alpha_composite(s, (bx + 44, by - 2))
    p = im.load()
    for (x, y) in [(bx + 40, by + 4), (bx + 41, by + 2), (bx + 39, by + 7)]: p[x, y] = hx2('#fbf6e6')  # små pappersflagor
    return im

def faller(b):
    h = brev_halva()
    h = h.transpose(Image.FLIP_LEFT_RIGHT)                                                         # den högra halvan
    return h.rotate(-18 if b == 1 else 14, resample=Image.NEAREST, expand=True)

# ---------- närbilden av brevramen ----------
W, H = 110, 70
RX0, RY0, RW, RH = 13, 11, 84, 48                       # brevets plats i ramen
def zick(y): return RX0 + RW // 2 + (2 if (y // 3) % 2 else -1)        # den rivna kanten, samma i plats och halva

def kompassros(im, cx, cy, sida, blot=False):
    """Farfars sigill: en rund mässingsplomb med en fyruddig kompassros, riven mitt itu (sida 'v' eller 'h')."""
    M = MASS if not blot else ['#4a4438', '#7a6e50', '#a09060', '#b8a878', '#d0c49a']
    for y in range(cy - 7, cy + 8):
        for x in range(cx - 7, cx + 8):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d > 7.2: continue
            if (sida == 'v' and x >= zick(y)) or (sida == 'h' and x < zick(y)): continue
            c = M[2] if d < 6 else M[1]
            if d >= 6.6: c = M[0]
            if (x - cx) + (y - cy) < -5 and d < 6: c = M[3]
            r = abs(x - cx) + abs(y - cy)
            if (x == cx or y == cy) and d < 5.5: c = M[4] if (x < cx or y < cy) else M[1]       # rosens fyra uddar
            elif r <= 2: c = M[3]
            pix(im, [(x, y, c)])

def halva_nara(im, sida, blot=False, torkar=False):
    Pp = PAP if not blot else BLOT
    for y in range(RY0, RY0 + RH):
        for x in range(RX0, RX0 + RW):
            if (sida == 'v' and x >= zick(y)) or (sida == 'h' and x < zick(y)): continue
            c = Pp[3] if (x * 3 + y * 5) % 23 else Pp[2]
            if y == RY0: c = Pp[4]
            if y == RY0 + RH - 1: c = Pp[1]
            pix(im, [(x, y, c)])
    blk = '#3a3028' if not blot else '#6a7484'
    for i, ry in enumerate(range(RY0 + 8, RY0 + RH - 6, 7)):              # bläckraderna: klotter, inga bokstäver
        for x in range(RX0 + 6, RX0 + RW - 6):
            if (sida == 'v' and x >= zick(ry) - 2) or (sida == 'h' and x < zick(ry) + 2): continue
            if abs(x - (RX0 + RW // 2)) < 10 and abs(ry - (RY0 + RH // 2)) < 9: continue             # luft runt sigillet
            v = int(1.2 * math.sin(x * 0.9 + i)); hopp = (x * 7 + i * 3) % 11 == 0
            if hopp: continue
            if blot: v += (x + i) % 3 - 1                                                         # suddigt
            pix(im, [(x, ry + v, blk)])
            if blot and (x + i) % 4 == 0: pix(im, [(x, ry + v + 1, '#8a96a4')])
    kompassros(im, RX0 + RW // 2, RY0 + RH // 2, sida, blot)
    if blot:                                                                                       # droppar
        for (x, y) in [(RX0 + RW - 10, RY0 + RH + 1), (RX0 + RW - 24, RY0 + RH + 2), (RX0 + RW - 16, RY0 + RH + 4)]:
            if sida == 'h': pix(im, [(x, y, MAT['vatten'][4]), (x, y + 1, MAT['vatten'][3])])

def brevram_nara(v=None, h=None):
    """v: None eller 'torr'. h: None, 'blot' eller 'torr'."""
    im = ny(W, H)
    T = MAT['trad']
    for y in range(H):                                     # dörrens bräder bakom
        for x in range(W):
            c = T[2] if (x // 11) % 2 else T[3]
            if x % 11 == 0: c = T[1]
            pix(im, [(x, y, c)])
    for y in range(RY0 - 6, RY0 + RH + 6):                 # mässingsramen
        for x in range(RX0 - 6, RX0 + RW + 6):
            kant = min(x - (RX0 - 6), (RX0 + RW + 5) - x, y - (RY0 - 6), (RY0 + RH + 5) - y)
            if kant > 5: continue
            c = MASS[3] if kant in (1, 2) and (x < RX0 or y < RY0) else MASS[2] if kant < 4 else MASS[1]
            if kant == 0: c = MASS[0]
            pix(im, [(x, y, c)])
    for (x, y) in [(RX0 - 3, RY0 - 3), (RX0 + RW + 2, RY0 - 3), (RX0 - 3, RY0 + RH + 2), (RX0 + RW + 2, RY0 + RH + 2)]:
        pix(im, [(x, y, MASS[4]), (x + 1, y + 1, MASS[0])])                                          # nitarna
    for y in range(RY0, RY0 + RH):                         # de två tomma platserna, med den rivna konturen
        for x in range(RX0, RX0 + RW):
            z = zick(y)
            c = '#3a2a10'
            if x in (RX0, RX0 + RW - 1) or y in (RY0, RY0 + RH - 1): c = MASS[0]
            elif min(z, zick(y - 1)) - 1 <= x <= max(z, zick(y - 1)) or x in (RX0 + 1, RX0 + RW - 2) or y in (RY0 + 1, RY0 + RH - 2): c = MASS[1]      # platsernas rivna kontur syns
            pix(im, [(x, y, c)])
    if v: halva_nara(im, 'v')
    if h: halva_nara(im, 'h', blot=(h == 'blot'))
    return im

LAGEN = {'tom': (None, None), 'vanster': ('torr', None), 'hoger_blot': (None, 'blot'), 'hoger': (None, 'torr'),
         'hel_blot': ('torr', 'blot'), 'hel': ('torr', 'torr')}

def alla():
    ut = {}
    for b in (1, 2): ut[f'figurer/baronen/luftskepp_river_brevet_0{b}.png'] = river(b)
    ut['figurer/baronen/luftskepp_brevet_rivet.png'] = rivet()
    for b in (1, 2): ut[f'foremal/trask/brev_halva_faller_0{b}.png'] = faller(b)
    for n, (v, h) in LAGEN.items(): ut[f'bildkort/brevram_nara_{n}.png'] = brevram_nara(v, h)
    return ut

if __name__ == '__main__':
    A = alla()
    for rel, im in A.items(): skriv(im, rel)
    # förhandsbild
    L = [A[f'figurer/baronen/luftskepp_river_brevet_0{b}.png'] for b in (1, 2)] + [A['figurer/baronen/luftskepp_brevet_rivet.png']]
    g = Image.new('RGBA', (3 * 116 + 4, 96 + 4 + 2 * 74), (120, 170, 210, 255))
    for i, im in enumerate(L): g.alpha_composite(G['las'](im, 'x'), (4 + i * 116, 4))
    for i, n in enumerate(LAGEN):
        g.alpha_composite(G['las'](A[f'bildkort/brevram_nara_{n}.png'], 'x'), (4 + (i % 3) * 116, 104 + (i // 3) * 74))
    g.resize((g.width * 3, g.height * 3), Image.NEAREST).save('/tmp/brevet_prov.png')
    print('klart', len(A))
