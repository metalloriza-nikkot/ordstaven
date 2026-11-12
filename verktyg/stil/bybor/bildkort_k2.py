# Kapitel 2, steg 5 del 3: bildkorten (48 x 48) och ledbilderna i tankebubblor (10g, *Bildkort*).
# Bara en egenskap ändras åt gången mellan korten i ett läsval (stilguiden §4): husen skiljer sig bara i storlek och
# dörrens färg, och tavlorna bara i form och storlek.
import os, sys, math, random
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('foremal_k2b.py').read().split("if __name__ == '__main__':")[0])
INK = '/home/claude/inkorg'

def kort(): return ny(48, 48)
def rekt(im, x0, y0, b, h, c):
    return pix(im, [(x, y, c) for y in range(y0, y0 + h) for x in range(x0, x0 + b)])
def mark(im, y0, typ='kullersten'):
    """En rund bit mark längst ned, som på de andra korten."""
    for y in range(y0, 47):
        for x in range(1, 47):
            if ((x + .5 - 24) / 23) ** 2 + ((y + .5 - 40) / 8) ** 2 > 1 and y > y0 + 1: continue
            if typ == 'kullersten': c = '#8e949e' if (x // 3 + y // 2) % 2 else '#b8bec6'; c = '#6e747f' if (x % 3 == 0 or y % 2 == 0) and (x + y) % 4 == 0 else c
            elif typ == 'gras': c = '#86a444' if (x * 3 + y) % 7 else '#a0b858'
            else: c = typ
            pix(im, [(x, y, c)])

# ---------------- husen på torget ----------------
def hus_kort(stor, dorr):
    im = kort(); mark(im, 36)
    S = MAT['skiffer']; T = MAT['trad']
    b, h = (40, 30) if stor else (26, 20)
    x0 = 24 - b // 2; yb = 40; ft = h * 5 // 9; tak = h - ft
    for y in range(yb - ft, yb):                                         # fasaden: plankor, ljus till vänster
        for x in range(x0, x0 + b):
            c = T[3] if (x - x0) % 4 else T[2]
            if x > x0 + b * 0.75: c = T[2] if (x - x0) % 4 else T[1]
            pix(im, [(x, y, c)])
    for x in range(x0, x0 + b): pix(im, [(x, yb - ft, T[0]), (x, yb - ft + 1, T[1])])
    for y in range(yb - ft - tak, yb - ft + 1):                           # valmat skiffertak med nock
        t = (y - (yb - ft - tak)) / tak
        inset = int((1 - t) * b * 0.28)
        for x in range(x0 - 2 + inset, x0 + b + 2 - inset):
            vast = x < x0 + b // 2
            c = S[3] if vast else S[2]
            if (y + (x // 4)) % 3 == 0: c = S[2] if vast else S[1]
            if y == yb - ft - tak: c = S[4]
            pix(im, [(x, y, c)])
    rx = 3 if stor else 2                                                 # runda fönster med mässing
    for fx in ([x0 + 7, x0 + b - 8] if stor else [x0 + 5]):
        fy = yb - ft + 6
        for y in range(fy - rx, fy + rx + 1):
            for x in range(fx - rx, fx + rx + 1):
                d = math.hypot(x - fx, y - fy)
                if d <= rx: pix(im, [(x, y, MAT['mass'][2] if d > rx - 1 else '#9ac8e6' if y < fy else '#4a7aa8')])
    dc = MAT['rosa'] if dorr == 'rosa' else ['#0e1a50', '#1a3290', '#2a52c8', '#4f7ae8', '#9ab6ff']
    db, dh = (10, 16) if stor else (7, 11)
    dx = x0 + b // 2 - db // 2 + (4 if stor else 4)
    for y in range(yb - dh, yb):
        for x in range(dx, dx + db):
            c = dc[3] if x == dx else dc[1] if x == dx + db - 1 else dc[2]
            if y == yb - dh: c = dc[0]
            pix(im, [(x, y, c)])
    pix(im, [(dx + db - 3, yb - dh // 2, MAT['mass'][3])])                 # handtaget
    for x in range(dx - 1, dx + db + 1): pix(im, [(x, yb, '#6e6e80')])       # trappstenen
    im = kontur(im)
    for x in range(x0 + b, x0 + b + 3):                                     # skuggan österut
        for y in range(yb - ft + 2, yb + 1): pix(im, [(x, y, (30, 34, 40, 90))])
    return im

# ---------------- baronens skylt, den täta vassen och tavlorna ----------------
def skylt_baronen_kort():
    im = kort(); mark(im, 38, 'gras'); O = MAT['orange']
    stolpe(im, 22, 24, 42); stolpe(im, 23, 24, 42)
    for y in range(6, 27):
        for x in range(6, 42):
            c = O[2]
            if y == 6 or x == 6: c = O[3]
            if y == 26 or x == 41: c = O[1]
            pix(im, [(x, y, c)])
    for y in range(9, 24):
        for x in range(9, 39): pix(im, [(x, y, O[4] if (x * 3 + y) % 9 else O[3])])
    H = ('#7a6a48', '#c8b48a', '#e6d6a8', '#f6ecd0')                         # tropikhjälmen, stor
    for y in range(11, 20):
        for x in range(14, 34):
            u = ((x + .5 - 24) / 8) ** 2 + ((y + .5 - 18) / 7) ** 2
            if u <= 1 and y <= 18: pix(im, [(x, y, H[3] if x < 22 and y < 15 else H[2] if x < 28 else H[1])])
    for x in range(12, 37): pix(im, [(x, 19, H[1]), (x, 20, H[0] if x in (12, 36) else H[1])])
    for x in range(16, 33): pix(im, [(x, 17, '#6b4630')])
    pix(im, linje(29, 13, 34, 8, '#e8823a', 2)); pix(im, [(35, 7, '#f3a462'), (34, 7, '#f3a462')])
    return kontur(im)
def tat_vass_kort():
    im = kort(); mark(im, 40, 'gras')
    for k in range(6):
        t = vasstuss('hel', seed=20 + k)
        im.alpha_composite(t.crop((0, 0, 16, 38)), (-2 + k * 9 - (k % 2), 4 + (k % 2) * 3))
    return im
def tavla_kort(stor, rund, vagg=True):
    im = kort()
    if vagg:
        for y in range(0, 48):
            for x in range(0, 48): pix(im, [(x, y, '#a86278' if (x // 6 + y // 6) % 2 else '#8a4e60')])
    M = MAT['mass']; r = 20 if stor else 11; cx = cy = 24
    for y in range(48):
        for x in range(48):
            dx, dy = x + .5 - cx, y + .5 - cy
            inne = dx * dx + dy * dy <= r * r if rund else (abs(dx) <= r and abs(dy) <= r)
            if not inne: continue
            kant = (dx * dx + dy * dy > (r - 2.6) ** 2) if rund else (abs(dx) > r - 2.6 or abs(dy) > r - 2.6)
            if kant: c = M[3] if dx + dy < -r * 0.6 else M[1] if dx + dy > r * 0.6 else M[2]
            else:
                u = (dy + r) / (2 * r)
                c = '#a8dcf8' if u < 0.55 else '#5e9e70' if u < 0.8 else '#3e7a52'
                if u < 0.55 and math.hypot(dx + r * 0.35, dy + r * 0.35) < r * 0.2: c = '#f2d22e'
                if 0.45 < u < 0.6 and math.sin(dx / r * 3) * 0.08 + 0.52 > u: c = '#75c987'
            pix(im, [(x, y, c)])
    for y in range(48):                                                     # skuggan under tavlan
        for x in range(48):
            dx, dy = x + .5 - cx - 1.5, y + .5 - cy - 2
            inne = dx * dx + dy * dy <= r * r if rund else (abs(dx) <= r and abs(dy) <= r)
            ok = dx * dx + dy * dy > 0
            if inne and im.getpixel((x, y))[:3] in (hx('#a86278'), hx('#8a4e60')): pix(im, [(x, y, '#6a3a4a')])
    return im
def tavla_hog_kort():
    im = kort()
    for y in range(0, 36):
        for x in range(0, 48): pix(im, [(x, y, '#a86278' if (x // 6 + y // 6) % 2 else '#8a4e60')])
    for y in range(36, 48):
        for x in range(0, 48): pix(im, [(x, y, '#9c7450' if (x + (y // 3) * 5) % 10 else '#7a5638')])
    for x in range(48): pix(im, [(x, 35, '#4a2a34'), (x, 36, '#5a3c26')])
    t = tavla(True, False); im.alpha_composite(t.crop((1, 1, 23, 23)), (13, 1))
    for x in range(14, 36): pix(im, [(x, 23, '#6a3a4a')])
    for y in range(26, 35, 3): pix(im, [(24, y, '#e0a0b4'), (24, y + 1, '#e0a0b4')])   # en prickad linje: luft under
    pix(im, [(22, 27, '#e0a0b4'), (26, 27, '#e0a0b4'), (21, 28, '#e0a0b4'), (27, 28, '#e0a0b4')])
    return im

# ---------------- vattnet med en prickad båge (72.4), draken, fjädern och brevet ----------------
def over_vattnet_kort():
    im = kort(); Vt = MAT['vatten']
    for y in range(24, 46):
        for x in range(48):
            if 14 <= x < 34: c = Vt[2] if (x * 7 + y * 13) % 29 else Vt[4]; c = Vt[1] if y > 40 else c
            else: c = '#86a444' if (x * 3 + y) % 7 else '#a0b858'
            if x in (13, 34) and y > 24: c = '#6a4a2a'
            pix(im, [(x, y, c)])
    for k in range(0, 21):                                                   # den prickade bågen över vattnet
        t = k / 20; x = 8 + t * 32; y = 26 - 16 * math.sin(t * math.pi)
        if k % 2 == 0: pix(im, [(x, y, '#5a3c26'), (x + 1, y, '#5a3c26'), (x, y + 1, '#5a3c26'), (x + 1, y + 1, '#5a3c26')])
    return im
def drake_pa_taket_kort():
    im = kort(); mark(im, 40, 'gras'); T = MAT['trad']
    for y in range(22, 41):
        for x in range(6, 42): pix(im, [(x, y, T[3] if (x - 6) % 4 else T[2])])
    for y in range(8, 23):                                                   # vasstaket
        t = (y - 8) / 14; inset = int((1 - t) * 10)
        for x in range(3 + inset, 45 - inset):
            c = '#d6c07e' if x < 24 else '#c0a866'
            if (x + y * 2) % 5 == 0: c = '#a68e52'
            pix(im, [(x, y, c)])
    for x in range(4, 44): pix(im, [(x, 23, '#8a7440'), (x, 24, T[0])])
    d = drake(0); im.alpha_composite(d, (26, 2))
    return kontur(im)
def fjader_svavar_kort():
    im = kort()
    for i in range(34):                                                     # skaftet snett uppåt
        t = i / 33; x = 8 + i; y = 38 - int(i * 0.8 + 3 * math.sin(t * math.pi))
        bredd = 6 * math.sin(min(1, t * 1.15) * math.pi) if t > 0.12 else 0
        for w in range(-int(bredd) - 1, int(bredd) + 2):
            if abs(w) > bredd: continue
            vit = t > 0.55
            uppe = w < 0
            c = ('#f4f4f0' if uppe else '#c4cad0') if vit else ('#3a3f48' if uppe else '#22252b')
            if not vit and abs(w) >= bredd - 1: c = '#2e5966' if uppe else '#14161a'
            if (i + w) % 5 == 0 and abs(w) > 1: c = '#c4cad0' if vit else '#14161a'
            pix(im, [(x, y + w, c)])
        pix(im, [(x, y, '#464a52' if t < 0.9 else '#c4cad0')])
    im = kontur(im)
    for (x0, y0) in ((4, 24), (30, 40), (38, 10)):                          # små bågar som visar att den svävar
        for k in range(6): pix(im, [(x0 + k, y0 - int(math.sin(k / 5 * math.pi) * 2), '#8ac6da')])
    return im
def brev_kort(halva=False):
    im = kort(); Pp = MAT['papper']; M = MAT['mass']
    riv = [24 + (2 if (y // 2) % 2 else -1) for y in range(48)]
    for y in range(8, 42):
        for x in range(7, 41):
            if halva and x >= riv[y]: continue
            c = Pp[3] if (x + y) % 7 else Pp[2]
            if y == 8 or x == 7: c = Pp[4]
            if (halva and x == riv[y] - 1) or x == 40 or y == 41: c = Pp[1]
            if y in (14, 18, 22, 32, 36) and 11 <= x <= 36 and x % 4 and not (18 <= x <= 30 and 20 <= y <= 32): c = Pp[0]
            pix(im, [(x, y, c)])
    cx, cy = 24, 26                                                          # sigillet i mässing med kompassrosen
    for y in range(cy - 6, cy + 7):
        for x in range(cx - 6, cx + 7):
            if halva and x >= riv[y]: continue
            d = math.hypot(x - cx, y - cy)
            if d <= 6: pix(im, [(x, y, M[1] if d > 5 else M[3] if x + y < cx + cy else M[2])])
    for (dx, dy) in ((0, -4), (0, -3), (0, 3), (0, 4), (-4, 0), (-3, 0), (3, 0), (4, 0), (0, -2), (0, 2), (-2, 0), (2, 0), (0, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        x, y = cx + dx, cy + dy
        if not (halva and x >= riv[y]): pix(im, [(x, y, M[4] if dy < 0 or dx < 0 else M[0])])
    return kontur(im)

# ---------------- ungen på stocken, bryggan, vassen och byn ----------------
def unge_pa_stocken_kort():
    im = kort(); Vt = MAT['vatten']
    for y in range(18, 46):
        for x in range(1, 47):
            if ((x + .5 - 24) / 23) ** 2 + ((y + .5 - 32) / 14) ** 2 <= 1:
                pix(im, [(x, y, Vt[2] if (x * 7 + y * 13) % 29 else Vt[4])])
    s = stock(); s2 = s.resize((s.width, s.height), Image.NEAREST); im.alpha_composite(s2, (9, 28))
    u = Image.open(f'{INK}/figurer/unge/unge1_tomgang_ner_01.png').convert('RGBA'); im.alpha_composite(u, (12, 10))
    for x in range(8, 40, 3): pix(im, [(x, 41, '#ffffff')])
    return im
def uppdrag_bryggan_kort():
    im = kort(); Vt = MAT['vatten']; T = MAT['trad']
    for y in range(48):
        for x in range(48): pix(im, [(x, y, (Vt[2] if (x * 7 + y * 13) % 29 else Vt[4]) if x > 12 else ('#86a444' if (x + y) % 5 else '#a0b858'))])
    for y in range(18, 30):
        for x in range(8, 48):
            c = T[3] if (x - 8) % 5 else T[1]
            if y in (18, 19): c = T[4]
            pix(im, [(x, y, c)])
    for x in range(8, 48): pix(im, [(x, 30, T[0]), (x, 31, (20, 30, 60, 120))])
    for px_ in range(12, 48, 10):
        for y in range(30, 40): pix(im, [(px_, y, T[2]), (px_ + 1, y, T[0])])
        pix(im, [(px_ - 1, 40, Vt[4]), (px_ + 2, 40, Vt[4])])
        for y in range(10, 19): pix(im, [(px_, y, T[3]), (px_ + 1, y, T[1])])
    for x in range(10, 48): pix(im, [(x, 10, T[4]), (x, 11, T[2])])
    return im
def uppdrag_vassen_kort():
    im = kort(); Vt = MAT['vatten']
    for y in range(48):
        for x in range(48): pix(im, [(x, y, Vt[2] if (x * 7 + y * 13) % 29 else Vt[4])])
    for k in range(4):
        t = vasstuss('hel', seed=40 + k); im.alpha_composite(t, (-4 + k * 6, 10 + (k % 2) * 2))
    for k in range(3):
        t = vasstuss('hel', seed=50 + k); im.alpha_composite(t, (32 + k * 5, 12 + (k % 2) * 3))
    cx, cy, r = 26, 26, 9                                                  # halvan i en bubbla
    for y in range(48):
        for x in range(48):
            d = math.hypot(x + .5 - cx, y + .5 - cy)
            if d <= r:
                c = '#cdeff8' if d > r - 1.2 else None
                if c: pix(im, [(x, y, c)])
                elif (x + y) % 2: pix(im, [(x, y, '#a8c8e8')])
    h = brev_halva(True, 1); im.alpha_composite(h, (20, 20))
    pix(im, [(21, 19, '#ffffff'), (22, 19, '#ffffff'), (20, 20, '#ffffff')])
    return im
def byn_kort():
    im = kort(); mark(im, 34, 'gras')
    for (x0, b, h, tak) in ((2, 18, 14, 'vass'), (16, 20, 18, 'skiffer'), (32, 15, 12, 'vass')):
        T = MAT['trad']; yb = 40 if x0 != 16 else 38
        for y in range(yb - h // 2, yb):
            for x in range(x0, x0 + b): pix(im, [(x, y, T[3] if (x - x0) % 4 else T[2])])
        for y in range(yb - h, yb - h // 2 + 1):
            t = (y - (yb - h)) / (h / 2); inset = int((1 - t) * b * 0.25)
            for x in range(x0 - 1 + inset, x0 + b + 1 - inset):
                if tak == 'vass': c = '#d6c07e' if x < x0 + b // 2 else '#c0a866'
                else: c = MAT['skiffer'][3] if x < x0 + b // 2 else MAT['skiffer'][2]
                pix(im, [(x, y, c)])
        fx = x0 + b // 2; fy = yb - h // 4 - 1
        pix(im, [(fx, fy, MAT['mass'][2]), (fx + 1, fy, MAT['mass'][2]), (fx, fy + 1, '#4a7aa8'), (fx + 1, fy + 1, '#9ac8e6')])
    for y in range(4, 22): pix(im, [(28, y, '#5a5a66'), (29, y, '#8a8aa0')])   # radiomasten
    for (y, w) in ((8, 3), (13, 4), (18, 5)): pix(im, [(28 - w, y, '#5a5a66')] + [(x, y, '#8a8aa0') for x in range(28 - w + 1, 30 + w)])
    pix(im, [(28, 3, '#e86a5a'), (29, 3, '#e86a5a')])
    return kontur(im)

# ---------------- ledbilderna i tankebubblor ----------------
def bubbla_kort():
    im = kort()
    for y in range(48):
        for x in range(48):
            u = ((x + .5 - 25) / 21) ** 2 + ((y + .5 - 21) / 17) ** 2
            for (bx, by, br) in ((24, 8, 10), (12, 14, 9), (37, 14, 9), (10, 26, 9), (39, 27, 8), (24, 32, 10)):
                if math.hypot(x + .5 - bx, y + .5 - by) <= br: u = min(u, 0.5)
            if u <= 1: pix(im, [(x, y, '#fbf6e6' if not (x + y) % 9 == 0 or u < 0.9 else '#f2e8c8')])
    for (bx, by, br) in ((8, 42, 3), (4, 46, 1.6)):
        for y in range(48):
            for x in range(48):
                if math.hypot(x + .5 - bx, y + .5 - by) <= br: pix(im, [(x, y, '#fbf6e6')])
    return kontur(im, farg=hx('#a8a080') + (255,))
def lagg(im, del_, x, y):
    im.alpha_composite(del_, (x, y)); return im
def tankebubbla(vad):
    im = bubbla_kort()
    if vad == 'bro':
        b = Image.open(f'{INK}/bildkort/bro.png').convert('RGBA').resize((32, 32), Image.NEAREST) if False else None
        T = MAT['trad']
        for k in range(26):                                                  # en liten valvbro
            x = 12 + k; y = 25 - int(7 * math.sin(k / 25 * math.pi))
            pix(im, [(x, y, T[4]), (x, y + 1, T[3]), (x, y + 2, T[1])])
            if k % 5 == 0: pix(im, linje(x, y - 5, x, y, T[2]))
        pix(im, [(x, y - 5 + int(7 * math.sin(k / 25 * math.pi)) * 0, T[3]) for k in range(0)])
        for k in range(26): pix(im, [(12 + k, 20 - int(7 * math.sin(k / 25 * math.pi)), T[3])])
        for x in range(10, 40): pix(im, [(x, 30, MAT['vatten'][2]), (x, 31, MAT['vatten'][3] if x % 3 else '#ffffff')])
    elif vad == 'brev_flyger':
        Pp = MAT['papper']
        for y in range(16, 30):
            for x in range(16, 34): pix(im, [(x, y, Pp[3] if (x + y) % 5 else Pp[2])])
        pix(im, linje(16, 16, 25, 23, Pp[1]) + linje(33, 16, 25, 23, Pp[1]))
        pix(im, [(24, 24, MAT['mass'][2]), (25, 24, MAT['mass'][3]), (24, 25, MAT['mass'][1]), (25, 25, MAT['mass'][2])])
        for s in (-1, 1):                                                    # vingar
            for k in range(8):
                x = 25 + s * (9 + k); top = 12 + k // 2 + (k * k) // 12
                pix(im, linje(x, top, x, 22 - k // 3, '#c4cad0'))
                pix(im, [(x, top, '#f4f4f0'), (x, top + 1, '#f4f4f0'), (x, 23 - k // 3, '#8e949e')])
    elif vad == 'fagel':
        F = ('#22252b', '#3a3f48', '#f4f4f0', '#2e5966')                     # en fågel som flyger (FLYG)
        for k in range(-14, 15):                                            # vingarna i en bred båge
            a = abs(k); y = 22 - int(6 * math.sin(a / 14 * math.pi * 0.9)) + (a // 6)
            for w in range(0, 4 if a < 10 else 3):
                c = F[0] if w == 0 else F[1]
                if 6 < a < 12 and w == 1: c = F[2]
                pix(im, [(25 + k, y + w, c)])
        for y in range(19, 28):                                             # kroppen och stjärten
            for x in range(23, 28):
                if abs(x + .5 - 25.5) + abs(y - 23) * 0.6 < 3: pix(im, [(x, y, F[2] if y > 23 else F[1])])
        for y in range(27, 32): pix(im, [(25, y, F[3]), (26, y, F[3])])
        pix(im, [(24, 18, F[1]), (25, 17, F[1]), (26, 17, F[0]), (27, 16, '#464a52'), (28, 16, '#464a52'), (26, 18, '#ffffff')])
    elif vad == 'ljusboll':
        cx, cy = 25, 21
        for y in range(48):
            for x in range(48):
                d = math.hypot(x + .5 - cx, y + .5 - cy)
                if d <= 4: pix(im, [(x, y, '#fff0a8' if d > 2 else '#ffffff')])
                elif d <= 7 and (x + y) % 2 == 0: pix(im, [(x, y, '#f4dc64')])
        for a in range(0, 360, 45):
            for r in (9, 10): pix(im, [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)), '#f2c94a')])
    elif vad == 'svard':
        for k in range(20):                                                 # ett svärd snett uppåt (i stål, inte i guld)
            x = 16 + k; y = 30 - k
            pix(im, [(x, y - 1, '#ffffff' if k > 2 else '#eeeff4'), (x, y, '#dce0e4'), (x + 1, y, '#b8bec6'), (x, y + 1, '#8e949e'), (x + 1, y + 1, '#6e747f')])
        pix(im, linje(12, 26, 20, 34, MAT['mass'][2], 2))                    # parerstången
        pix(im, linje(12, 34, 16, 30, MAT['trad'][3], 2) + [(11, 35, MAT['mass'][3]), (10, 36, MAT['mass'][2]), (11, 36, MAT['mass'][1])])
        im = kontur(im, farg=hx('#a8a080') + (255,)) if False else im
    return im

def alla_kort():
    ut = {}
    for stor in (0, 1):
        for farg in ('bla', 'rosa'):
            ut[f'bildkort/hus_{"stort" if stor else "litet"}_{farg}.png'] = hus_kort(stor, farg)
    ut['bildkort/skylt_baronen.png'] = skylt_baronen_kort()
    ut['bildkort/tat_vass.png'] = tat_vass_kort()
    for namn, stor, rund in (('tavla_stor_rund', 1, 1), ('tavla_liten_fyrkant', 0, 0), ('tavla_stor_fyrkant', 1, 0), ('tavla_liten_rund', 0, 1)):
        ut[f'bildkort/{namn}.png'] = tavla_kort(stor, rund)
    ut['bildkort/tavla_hog.png'] = tavla_hog_kort()
    ut['bildkort/over_vattnet.png'] = over_vattnet_kort()
    ut['bildkort/drake_pa_taket.png'] = drake_pa_taket_kort()
    ut['bildkort/fjader_svavar.png'] = fjader_svavar_kort()
    ut['bildkort/brev.png'] = brev_kort(False); ut['bildkort/brev_halva.png'] = brev_kort(True)
    ut['bildkort/unge_pa_stocken.png'] = unge_pa_stocken_kort()
    ut['bildkort/uppdrag_bryggan.png'] = uppdrag_bryggan_kort()
    ut['bildkort/uppdrag_vassen.png'] = uppdrag_vassen_kort()
    ut['bildkort/byn.png'] = byn_kort()
    for v in ('brev_flyger', 'bro', 'fagel', 'ljusboll', 'svard'): ut[f'bildkort/tankebubbla_{v}.png'] = tankebubbla(v)
    return ut

if __name__ == '__main__':
    A = alla_kort()
    for rel, im in A.items(): skriv(im, rel)
    n = len(A); kol = 7
    o = Image.new('RGBA', (kol * 50, ((n + kol - 1) // kol) * 50), (250, 246, 236, 255))
    for i, rel in enumerate(A): o.alpha_composite(Image.open(os.path.join(UT, rel)), (1 + (i % kol) * 50, 1 + (i // kol) * 50))
    o.resize((o.width * 3, o.height * 3), Image.NEAREST).save('/tmp/del3_kort.png')
    print(n, 'bildkort')
