# Kapitel 3 (beslut 100.6): hornen.
#   hornet_mjol / hornet_rent  88 x 56  det stora hornet i loftet, av mässing, format som kammen på en stor dinosaurie:
#                                       ett långt rör som svänger bakåt och uppåt och vidgar sig till en klocka mot luckan.
#                                       Det står på en fot av drivved. mjol: fullt av mjöl. rent: blankt, med ett målat fält
#                                       där texten står (HTML, hornet_skrift).
#   frukosthorn                16 x 12  det lilla hornet på pråmen: ett naturhorn med blå och vit snodd
# Mässingen är flodfolkets enda mässing (16 §9). Ingen kompassros: den är Farfars.
import os, sys, math
HAR = '/home/claude/k3'; os.chdir(HAR)
exec(open('/home/claude/k3/pix.py').read())
from PIL import Image
MASS = ['#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0']
DRIV = ['#3a2a18', '#5e4a36', '#7e6a52', '#a08a6e', '#d6cfa4']                # drivved, grå och urlakad
MJOL = ['#b8bec6', '#dce0e4', '#eeeff4', '#f2f3f0', '#ffffff']
HORN = ['#5e4a36', '#a08a6e', '#d6cfa4', '#f2e8c8', '#ffffff']
L = (-0.55, -0.75, 0.45)

def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * e for a, b, c, e in zip(p0, p1, p2, p3))

def ror(im, punkter, radie, farger, z=None):
    """Ett rör längs en kurva: för varje pixel, närmaste punkt på kurvan avgör om den är inne och hur den skuggas."""
    W, H = im.size; px = im.load(); zb = z if z is not None else {}
    for y in range(H):
        for x in range(W):
            best = None
            for i, (cx, cy) in enumerate(punkter):
                r = radie(i / (len(punkter) - 1))
                dd = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if dd <= r and (best is None or dd / r < best[0]): best = (dd / r, i, cx, cy, r)
            if best:
                f, i, cx, cy, r = best
                nx, ny = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
                nz = math.sqrt(max(0, 1 - nx * nx - ny * ny))
                ll = nx * L[0] + ny * L[1] + nz * L[2]
                t = 4 if ll > 0.80 else 3 if ll > 0.45 else 2 if ll > 0.05 else 1
                if f > 0.86: t = min(t, 1)
                px[x, y] = tuple(int(farger[t][k:k + 2], 16) for k in (1, 3, 5)) + (255,)
                zb[(x, y)] = i
    return zb

def kontur(im, farg):
    px = im.load(); W, H = im.size; c = tuple(int(farg[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    ut = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0 and any(0 <= x + a < W and 0 <= y + b < H and px[x + a, y + b][3] == 255 for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                ut.append((x, y))
    for (x, y) in ut: px[x, y] = c

BAND = (0.30, 0.62)   # den del av röret (t) där det målade bandet sitter i hornet_rent, där hornet_skrift står

def kurva(n=120):
    """Munstycket nere till vänster, en lång kam som stiger bakåt, och en rak klocka mot höger."""
    a = [bez((6, 44), (8, 18), (34, 6), (56, 14), t / 80) for t in range(81)]
    b = [(56 + 22 * t / 40, 14 + 6 * t / 40) for t in range(1, 41)]
    return a + b
def radie(t):
    if t < 0.66: return 2.6 + 1.6 * t
    u = (t - 0.66) / 0.34
    return 3.7 + 8.5 * u ** 1.8                                               # klockan vidgar sig som en trumpet

def stora_hornet(lage='rent'):
    W, H = 88, 56
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); px = im.load()
    C = lambda h: tuple(int(h[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    pts = kurva()
    # foten av drivved: två gafflar som bär röret, och en planka
    for (x0, topp) in ((14, 22), (50, 20)):
        for y in range(topp, 52):
            for x in range(x0, x0 + 3): px[x, y] = C(DRIV[3 if x == x0 else 2])
        for k in range(4):                                                     # gaffelns två grenar
            px[x0 - 1 - k // 2, topp - k] = C(DRIV[3]); px[x0 + 3 + k // 2, topp - k] = C(DRIV[2])
    for y in range(50, 54):
        for x in range(8, 62): px[x, y] = C(DRIV[3 if y == 50 else 2 if y < 53 else 1])
    zb = ror(im, pts, radie, MASS)
    # kammens räfflor: korta mörka tvärstreck längs röret, och en låg kam på ovansidan
    for i in range(14, 80, 9):
        cx, cy = pts[i]; r = radie(i / (len(pts) - 1))
        for k in range(-int(r) + 1, int(r)):
            x, y = int(cx + k * 0.35), int(cy + k)
            if 0 <= x < W and 0 <= y < H and px[x, y][3]: px[x, y] = C(MASS[1])
    for i in range(10, 78, 6):
        cx, cy = pts[i]; r = radie(i / (len(pts) - 1))
        x, y = int(cx), int(cy - r - 1)
        if 0 <= y < H: px[x, y] = C(MASS[2]); px[x, max(0, y - 1)] = C(MASS[3])
    kontur(im, MASS[0])
    # klockans öppning, mot höger: mörk insida och en ljus kant
    ex, ey = pts[-1]
    for y in range(H):
        for x in range(W):
            dx, dy = (x + 0.5 - ex) / 5.5, (y + 0.5 - ey) / 11.0
            d = dx * dx + dy * dy
            if d <= 1: px[x, y] = C('#24160c' if d < 0.55 else MASS[3] if dy < 0 else MASS[2])
    px[4, 45] = C(MASS[0]); px[5, 45] = C(MASS[3]); px[5, 46] = C(MASS[1])   # munstycket
    if lage == 'rent':                                                         # det målade bandet: ljust, med streck som antyder bokstäver
        for i in range(int(BAND[0] * len(pts)), int(BAND[1] * len(pts))):
            cx, cy = pts[i]
            for k in (-1, 0, 1, 2):
                x, y = int(cx), int(cy + k)
                if px[x, y][3] and px[x, y][:3] != C(MASS[0])[:3]:
                    px[x, y] = C('#f2e8c8' if k in (0, 1) else '#d6cfa4')
            if i % 4 == 0: px[int(cx), int(cy)] = C('#3a2a18')
            if i % 4 == 1 and i % 12 != 1: px[int(cx), int(cy) + 1] = C('#3a2a18')
    else:                                                                      # mjölet ligger på ovansidan och fyller klockan
        for x in range(W):
            topp = next((y for y in range(H) if px[x, y][3] and px[x, y][:3] != (0, 0, 0)), None)
            if topp is None or topp >= 50: continue
            for k, ton in ((0, 3), (1, 4), (2, 2), (3, 1)):
                y = topp + k
                if y < H and px[x, y][3] and y < 49: px[x, y] = C(MJOL[ton])
        for y in range(H):
            for x in range(W):
                dx, dy = (x + 0.5 - ex) / 5.0, (y + 0.5 - ey) / 10.0
                if dx * dx + dy * dy <= 1: px[x, y] = C(MJOL[2 if dy < 0 else 1])
        for y in range(48, 50):
            for x in range(10, 60):
                if (x * 7 + y) % 5: px[x, y] = C(MJOL[3])                     # mjöl på plankan
    return im

def frukosthorn():
    im = Image.new('RGBA', (16, 12), (0, 0, 0, 0))
    pts = [bez((2, 9), (4, 3), (10, 2), (13, 5), t / 30) for t in range(31)]
    ror(im, pts, lambda t: 1.0 + 1.9 * t, HORN)
    kontur(im, HORN[0])
    px = im.load()
    for (x, y) in ((5, 5), (6, 4), (7, 4), (8, 4)):                           # snodden, blå och vit
        px[x, y] = tuple(int(('#2a52c8' if x % 2 else '#ffffff')[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    for (x, y) in ((13, 6), (14, 5), (14, 6)): px[x, y] = (0x5e, 0x4a, 0x36, 255)   # öppningen
    return im

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    a = P.las_bild(stora_hornet('mjol'), 'mjol'); b = P.las_bild(stora_hornet('rent'), 'rent'); c = P.las_bild(frukosthorn(), 'fh')
    o = Image.new('RGBA', (88 * 2 + 40, 60), (154, 124, 86, 255))
    o.alpha_composite(a, (2, 2)); o.alpha_composite(b, (94, 2)); o.alpha_composite(c, (194, 30))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/hornen_x4.png'); print('klart')
