# Farfars karta (beslut 31.6, Stil 2026-11-03): ett gammalt papper rivet i sju bitar som passar ihop.
# Vägen går runt dalen: bit 2 (skogen) -> 3 -> 4 -> 5 -> 6 -> 7 (kompassrosen, hos baronen) -> 1 (dalen i mitten).
# Bit 1: berg, en dal full av moln och mammas stora skugga, som liknar ungen (13, s14).
# Bit 2: Farfars hus, skogen, stenen, bron och träsket (15, k1s11, granskningen A 1).
# Bit 3–7 är skisser som ändras när kapitlen skrivs.
# Allt ritas ur masterpaletten (palett/palett.json): färgerna väljs med pf(), som tar palettens närmaste.
import os, sys, math, random
from PIL import Image
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
def pf(h):
    return P.narmast(h.lower())[0]
def rgb(h):
    h = pf(h); return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)

W, H = 224, 144
PAPPER = [rgb('#F2E8C8'), rgb('#E6D6A8'), rgb('#D6C08A'), rgb('#B8A57A'), rgb('#8A6E40')]   # ljus .. kant
BLACK = rgb('#4A3018'); BLACK2 = rgb('#7A5A3A'); BLACK3 = rgb('#B8A57A')
VAG = rgb('#A8302A')
VATTEN = [rgb('#2E6B8F'), rgb('#4FA3C7'), rgb('#9FD3E6')]
GRON = [rgb('#3E6B35'), rgb('#6FA34A'), rgb('#A8C96B')]
MOLN = [rgb('#FFFFFF'), rgb('#E8F2FA'), rgb('#B9C6D3')]
SKUGGA = [rgb('#2A2E38'), rgb('#3A3F48'), rgb('#5A606C')]
STEN = [rgb('#6E6E80'), rgb('#9EA0AE'), rgb('#C8CAD4')]
TRA = [rgb('#5A3A1E'), rgb('#9A6E40')]
MASS = [rgb('#8A6A20'), rgb('#C8A040')]

# ---------- bitarna: rivna gränser ----------
def brus(t, fro):
    r = random.Random(int(t) * 7919 + fro * 104729)
    return round(1.6 * math.sin(t * 0.37 + fro) + 1.1 * math.sin(t * 0.91 + 2.3 * fro) + r.choice((-1, 0, 0, 1)))
def h1(x): return 46 + brus(x, 1)
def h2(x): return 98 + brus(x, 2)
def v1(y): return 72 + brus(y, 3)
def v2(y): return 152 + brus(y, 4)
def t1(y): return 116 + brus(y, 5)
def b1(y): return 108 + brus(y, 6)
def bit(x, y):
    if y < h1(x): return 4 if x < t1(y) else 5
    if y >= h2(x): return 2 if x < b1(y) else 7
    return 3 if x < v1(y) else (1 if x < v2(y) else 6)
ID = [[bit(x, y) for x in range(W)] for y in range(H)]
def kant_avst(x, y):
    """Avståndet (0–3) till en riven kant eller papperets ytterkant."""
    b = ID[y][x]
    for d in range(4):
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
            X, Y = x + dx, y + dy
            if not (0 <= X < W and 0 <= Y < H) or ID[Y][X] != b: return d
    return 4

# ---------- papperet ----------
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
rnd = random.Random(7)
flackar = [(rnd.randint(0, W), rnd.randint(0, H), rnd.randint(4, 12)) for _ in range(14)]
for y in range(H):
    for x in range(W):
        d = kant_avst(x, y)
        c = PAPPER[1]
        if (x * 7 + y * 13) % 29 == 0: c = PAPPER[0]                      # ljusa fibrer
        if any((x - fx) ** 2 + (y - fy) ** 2 < fr * fr for fx, fy, fr in flackar) and (x * 5 + y * 3) % 7 == 0: c = PAPPER[2]   # gamla fläckar, glesa
        if d == 2 and (x + y) % 2: c = PAPPER[2]
        if d == 1: c = PAPPER[3]
        if d == 0: c = PAPPER[4]
        p[x, y] = c

def satt(x, y, c, bara=None):
    if 0 <= x < W and 0 <= y < H and kant_avst(x, y) >= 1 and (bara is None or ID[y][x] == bara):
        p[x, y] = c
def linje(x0, y0, x1, y1, c, streckad=False):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1):
        if streckad and (i // 2) % 2: continue
        satt(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
def ellips(cx, cy, rx, ry, fyll, kant=None):
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            r = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if r <= 1: satt(x, y, kant if (kant and r > 0.62) else fyll)

# ---------- symbolerna ----------
def berg(x, y, h, sno=True, skiss=False):
    """Ett berg: kontur i bläck, skuggsidan till höger streckad (ljuset uppifrån till vänster)."""
    bl = BLACK2 if skiss else BLACK
    for i in range(h):
        satt(x - i, y - h + i, bl); satt(x + i, y - h + i, bl)
        if not skiss:
            for j in range(1, i, 2): satt(x + j, y - h + i, BLACK3 if (j + i) % 4 else BLACK2)
    if sno and not skiss:
        for i in range(1, max(2, h // 4)):
            for j in range(-i + 1, i): satt(x + j, y - h + i, MOLN[0])
def trad(x, y):
    ellips(x, y - 4, 3.2, 3.0, GRON[1], GRON[0]); satt(x - 1, y - 6, GRON[2]); satt(x, y - 6, GRON[2])
    satt(x, y - 1, TRA[0]); satt(x, y, TRA[0])
def hus(x, y):
    for i in range(6):
        satt(x + 3 - i // 2, y - 8 + i // 2 * 1, BLACK)
    for dy in range(-8, -4):
        w = dy + 9
        for dx in range(-w, w + 1): satt(x + 3 + dx, y + dy, rgb('#A8302A') if dy > -8 else BLACK)
    for dy in range(-4, 1):
        for dx in range(0, 7): satt(x + dx, y + dy, PAPPER[0] if 0 < dx < 6 and dy < 0 else BLACK)
    satt(x + 3, y - 1, TRA[0]); satt(x + 3, y - 2, TRA[0])
def sten(x, y):
    ellips(x, y - 3, 3.5, 3.2, STEN[1], STEN[0]); satt(x - 1, y - 5, STEN[2]); satt(x - 2, y - 4, STEN[2])
def back(punkter):
    for (x0, y0), (x1, y1) in zip(punkter, punkter[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
            satt(x, y, VATTEN[1]); satt(x + 1, y, VATTEN[1]); satt(x - 1, y, VATTEN[0]); satt(x + 2, y, VATTEN[2] if i % 3 == 0 else VATTEN[1])
def bro(x, y):
    for dx in range(-5, 6):
        h = 2 - abs(dx) // 3
        satt(x + dx, y - h, TRA[1]); satt(x + dx, y - h + 1, TRA[0])
        if dx % 2 == 0: satt(x + dx, y - h - 1, TRA[0])
def trask(x, y, w, h):
    rr = random.Random(x * 31 + y)
    for _ in range(5):
        cx, cy = x + rr.randint(0, w), y + rr.randint(0, h)
        ellips(cx, cy, rr.randint(3, 5), 1.6, VATTEN[2], VATTEN[1])
    for _ in range(9):
        cx, cy = x + rr.randint(0, w), y + rr.randint(0, h)
        satt(cx, cy, GRON[0]); satt(cx, cy - 1, GRON[0]); satt(cx - 1, cy - 2, GRON[1]); satt(cx + 1, cy - 2, GRON[1])
def moln(cx, cy, rx, ry):
    for (ox, oy, k) in [(0, 0, 1.0), (-rx * 0.55, ry * 0.25, 0.7), (rx * 0.55, ry * 0.3, 0.75)]:
        ellips(cx + ox, cy + oy, rx * k, ry * k, MOLN[0], MOLN[1])
def mamma(cx, cy):
    """Mammas stora skugga: en ankylosaurus som liknar ungen, vänd åt vänster. Stort runt huvud,
    rund kropp med mjuka taggar på ryggen, korta ben och en tunn svans med den ovala klubban uppåt."""
    S = SKUGGA
    for i in range(12):                                      # svansen, tunn och uppåtböjd
        tx, ty = cx + 11 + i, cy - 1 - (i * i) // 18
        satt(tx, ty, S[0]); satt(tx, ty + 1, S[1])
    ellips(cx + 24, cy - 9, 3.6, 2.6, S[0])                  # klubban
    satt(cx + 23, cy - 10, S[2])
    ellips(cx + 2, cy + 1, 12, 7, S[1])                     # kroppen
    for lx in (-6, -1, 6, 10):                               # korta ben
        for dy in range(6, 10):
            for dx in range(0, 3): satt(cx + lx + dx, cy + dy, S[0])
    ellips(cx - 11, cy - 4, 6.8, 6.4, S[1])                  # stort runt huvud, högre än ryggen
    ellips(cx - 17, cy - 1, 3.0, 2.6, S[1])                  # nosen
    for tx in range(cx - 4, cx + 13, 3):                     # mjuka taggar längs ryggen
        ty = cy - 6 + (1 if tx - cx > 8 else 0)
        satt(tx, ty, S[0]); satt(tx + 1, ty, S[0]); satt(tx, ty - 1, S[0])
    for (x, y) in [(cx - 13, cy - 5), (cx - 12, cy - 5), (cx - 13, cy - 4)]: satt(x, y, S[2])   # ögat glimtar i skuggan
    for x in range(cx - 19, cx + 14):                        # ljus kant upptill: ljuset uppifrån till vänster
        for y in range(cy - 12, cy + 2):
            if p[x, y] in (S[1], S[0]):
                if x < cx - 2: satt(x, y, S[2])
                break
def vulkan(x, y):
    for i in range(14):
        satt(x - 8 + i // 2 - 4, y - i, BLACK2); satt(x + 8 - i // 2 + 4, y - i, BLACK2)
    for dx in range(-5, 6): satt(x + dx, y - 14, BLACK2)
    for (ox, oy, r) in [(0, -18, 2.5), (3, -22, 3), (7, -26, 3.5)]: ellips(x + ox, y + oy, r, r * 0.8, MOLN[2], BLACK3)
def isberg(x, y):
    for (ox, h) in [(-8, 9), (0, 14), (8, 10)]:
        for i in range(h):
            satt(x + ox - i // 2, y - h + i, VATTEN[0]); satt(x + ox + i // 2, y - h + i, VATTEN[0])
    for dy in range(-4, 0):
        for dx in range(-2, 3):
            if abs(dx) + abs(dy + 2) < 3: satt(x + dx, y + dy, BLACK2)
def flod(punkter):
    for (x0, y0), (x1, y1) in zip(punkter, punkter[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x, y = round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n)
            for k in range(-2, 3): satt(x + k, y, VATTEN[1] if abs(k) < 2 else VATTEN[0])
def luftskepp_skiss(x, y):
    for dx in range(-9, 10):
        dy = round(3.5 * math.sqrt(max(0, 1 - (dx / 9.5) ** 2)))
        satt(x + dx, y - dy, BLACK2); satt(x + dx, y + dy, BLACK2)
    for dx in range(-3, 4): satt(x + dx, y + 7, BLACK2)
    satt(x - 3, y + 4, BLACK2); satt(x + 3, y + 4, BLACK2)
def kompassros(cx, cy, r=7):
    """Farfars kompassros i mässing (inte stavens guld: guld betyder rätt svar)."""
    for i in range(-r, r + 1):
        w = (r - abs(i)) // 3
        for j in range(-w, w + 1):
            satt(cx + j, cy + i, MASS[1] if j <= 0 else MASS[0]); satt(cx + i, cy + j, MASS[1] if j <= 0 else MASS[0])
    for i in range(-r // 2, r // 2 + 1):
        satt(cx + i, cy + i, MASS[0]); satt(cx + i, cy - i, MASS[0])
    ellips(cx, cy, 1.6, 1.6, BLACK)
    for (x, y) in [(cx - 2, cy - r - 2), (cx - 2, cy - r - 3), (cx - 2, cy - r - 4), (cx - 2, cy - r - 5), (cx - 1, cy - r - 4), (cx, cy - r - 3),
                   (cx + 1, cy - r - 2), (cx + 1, cy - r - 3), (cx + 1, cy - r - 4), (cx + 1, cy - r - 5)]:
        satt(x, y, BLACK)                                    # N

# ---------- bit 1: dalen i molnen ----------
for (x, h) in [(82, 12), (92, 16), (102, 11), (124, 13), (134, 17), (144, 12)]: berg(x, 64, h)
for (x, h) in [(80, 9), (146, 10)]: berg(x, 92, h, sno=False)
moln(100, 80, 14, 6); moln(126, 84, 13, 5)
mamma(110, 77)
moln(96, 90, 11, 4); moln(124, 92, 12, 4); moln(140, 76, 8, 4)
# ---------- bit 2: skogen ----------
hus(6, 136)
for (x, y) in [(22, 122), (28, 132), (34, 118), (16, 112), (40, 137), (24, 108)]: trad(x, y)
sten(46, 126)
back([(60, 101), (58, 108), (62, 114), (60, 122), (63, 130), (61, 143)])
bro(61, 118)
trask(72, 104, 30, 22)
# ---------- bit 3–7: skisser ----------
flod([(4, 58), (20, 66), (34, 64), (50, 76), (66, 73)])
for (x, y) in [(14, 84), (40, 90), (56, 56)]: trad(x, y)
vulkan(40, 40); berg(80, 34, 10, skiss=True); berg(96, 40, 8, skiss=True)
isberg(150, 30); isberg(176, 24); berg(206, 36, 9, skiss=True)
luftskepp_skiss(190, 66); berg(176, 92, 8, skiss=True)
kompassros(198, 124, 8)
# ---------- vägen (streckad, rödbrun) ----------
VAGEN = [(12, 134), (24, 128), (40, 126), (52, 121), (61, 117), (74, 113), (88, 118), (96, 110), (82, 104), (64, 97),
         (44, 86), (28, 74), (20, 60), (28, 46), (44, 26), (66, 20), (92, 24), (118, 18), (142, 14), (170, 30),
         (196, 40), (204, 56), (196, 74), (186, 90), (180, 102), (166, 116), (146, 114), (130, 104), (118, 92)]
for a, b in zip(VAGEN, VAGEN[1:]): linje(*a, *b, VAG, streckad=True)
for (x, y) in [(118, 92), (117, 91), (119, 91), (118, 90)]: satt(x, y, VAG)          # vägen slutar i dalen

# ---------- ut ----------
def bitbild(n, glipa=True):
    """Bit n med genomskinligt runtom (rivna kanter), beskuren."""
    ut = Image.new('RGBA', (W, H), (0, 0, 0, 0)); q = ut.load()
    for y in range(H):
        for x in range(W):
            if ID[y][x] == n and (not glipa or kant_avst(x, y) >= 1 or x in (0, W - 1) or y in (0, H - 1)):
                q[x, y] = p[x, y]
    POS[f'kartbit_{n}'] = dict(zip(('x', 'y'), ut.getbbox()[:2]))
    return ut.crop(ut.getbbox())
POS = {}
hel = Image.new('RGBA', (W, H), (0, 0, 0, 0)); q = hel.load()
for y in range(H):
    for x in range(W):
        if kant_avst(x, y) >= 1 or x in (0, W - 1) or y in (0, H - 1) or ID[y][x] == ID[max(0, y - 1)][x] == ID[y][max(0, x - 1)]:
            q[x, y] = p[x, y]
if __name__ == '__main__':
    os.makedirs('ut/karta', exist_ok=True)
    hel.save('ut/karta/karta_hel.png')
    for n in (1, 2): bitbild(n).save(f'ut/karta/kartbit_{n}.png')
    for n in (3, 4, 5, 6, 7): bitbild(n).save(f'ut/karta/skiss_kartbit_{n}.png')
    import json
    json.dump({'om': 'Var varje bit ligger i hela kartan (224 x 144), övre vänstra hörnet. Bitarna läggs ihop med 1 pixels glipa (rivna kanter).',
               'storlek': [W, H], 'bitar': POS}, open('ut/karta/karta.json', 'w'), ensure_ascii=False, indent=1)
    g = Image.new('RGBA', (W + 8, H + 8), (60, 40, 24, 255)); g.alpha_composite(hel, (4, 4))
    g.resize((g.width * 4, g.height * 4), Image.NEAREST).save('karta_x4.png')
