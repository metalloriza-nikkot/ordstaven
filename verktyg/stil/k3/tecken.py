# Kapitel 3 (beslut 100.6): Farfars bildtecken i bläck, elva stycken (manus 19, Chiffret), 48 x 48 som bildkorten.
# Samma stil som tecknen på kodnyckeln i kapitel 1 (bildkort/chiffernyckel): fyllda siluetter i Farfars bruna bläck,
# utan text. Varje tecken ska gå att känna igen på en sekund och inte likna något av de andra.
#   tecken_fjaril  F   tecken_sten     A   tecken_droppe  D   tecken_stjarna  H   tecken_krabba  R   tecken_sol  S
#   tecken_blad    E   tecken_fjader   O   tecken_vag     U   tecken_mane     M   tecken_fisk    N
# Dessutom chiffernyckel_elva (48 x 48): papperet med alla elva tecken i nyckelns ordning, och raden på skylten
# (skylt_tecken, 152 x 24): kompassrosen först och sedan UNDER FENAN i tecken, för mellanscenen.
import math, os
from PIL import Image, ImageDraw
BLACK = (0x3a, 0x2a, 0x18, 255); LJUS = (0x5e, 0x4a, 0x36, 255)
PAPP = ['#7e6a52', '#d6cfa4', '#f2e8c8', '#fff2b8']

def ny(): im = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def ell(d, cx, cy, rx, ry, f=BLACK): d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=f)
def poly(d, pts, f=BLACK): d.polygon(pts, fill=f)
def lin(d, pts, w, f=BLACK): d.line(pts, fill=f, width=w)

def sol():
    im, d = ny(); ell(d, 24, 24, 9, 9)
    for k in range(8):
        a = math.radians(k * 45); r0, r1 = 13, 20
        lin(d, [(24 + r0 * math.cos(a), 24 + r0 * math.sin(a)), (24 + r1 * math.cos(a), 24 + r1 * math.sin(a))], 4)
    return im
def sten():
    im, d = ny(); poly(d, [(10, 34), (12, 22), (19, 14), (30, 13), (38, 20), (40, 32), (35, 37), (14, 38)]); return im
def stjarna():
    im, d = ny(); pts = []
    for k in range(10):
        r = 19 if k % 2 == 0 else 8; a = math.radians(-90 + k * 36); pts.append((24 + r * math.cos(a), 25 + r * math.sin(a)))
    poly(d, pts); return im
def blad():
    im, d = ny(); poly(d, [(24, 6), (34, 14), (37, 26), (31, 37), (24, 41), (17, 37), (11, 26), (14, 14)])
    lin(d, [(24, 10), (24, 44)], 2, (0, 0, 0, 0)); lin(d, [(24, 41), (24, 46)], 3)
    for y in (18, 26, 33): lin(d, [(24, y), (30, y - 5)], 1, (0, 0, 0, 0)); lin(d, [(24, y), (18, y - 5)], 1, (0, 0, 0, 0))
    return im
def fjader():
    im, d = ny(); lin(d, [(14, 42), (34, 6)], 2)
    poly(d, [(33, 7), (38, 12), (37, 22), (30, 31), (22, 37), (18, 36), (21, 26), (26, 15)])
    for k in range(4): lin(d, [(31 - k * 4, 12 + k * 6), (36 - k * 4, 16 + k * 6)], 1, (0, 0, 0, 0))
    return im
def mane():
    im, d = ny(); ell(d, 24, 24, 17, 17); ell(d, 31, 19, 15, 15, (0, 0, 0, 0)); return im
def fjaril():
    im, d = ny()
    for s in (-1, 1):
        ell(d, 24 + s * 10, 17, 9, 9); ell(d, 24 + s * 8, 32, 6.5, 6.5)
    lin(d, [(24, 12), (24, 39)], 4); lin(d, [(24, 12), (19, 5)], 2); lin(d, [(24, 12), (29, 5)], 2)
    ell(d, 24 + 10, 17, 2.5, 2.5, (0, 0, 0, 0)); ell(d, 24 - 10, 17, 2.5, 2.5, (0, 0, 0, 0))
    return im
def droppe():
    im, d = ny(); ell(d, 24, 30, 11, 11); poly(d, [(24, 5), (34, 26), (14, 26)])
    ell(d, 20, 30, 2.5, 4, (0, 0, 0, 0)); return im
def krabba():
    im, d = ny(); ell(d, 24, 28, 12, 8)
    for s in (-1, 1):
        for k in range(3): lin(d, [(24 + s * 9, 30 + k * 3), (24 + s * 18, 34 + k * 4)], 2)
        lin(d, [(24 + s * 8, 22), (24 + s * 14, 14)], 3)
        poly(d, [(24 + s * 11, 15), (24 + s * 19, 8), (24 + s * 20, 15), (24 + s * 15, 13)])
    ell(d, 20, 24, 1.5, 1.5, (0, 0, 0, 0)); ell(d, 28, 24, 1.5, 1.5, (0, 0, 0, 0)); return im
def vag():
    im, d = ny()
    for y0 in (18, 30):
        pts = [(6 + x, y0 + 5 * math.sin((x / 36) * 2 * math.pi)) for x in range(0, 37)]
        lin(d, pts, 4)
    return im
def fisk():
    im, d = ny(); ell(d, 21, 24, 14, 8); poly(d, [(32, 24), (43, 15), (43, 33)])
    ell(d, 13, 22, 2, 2, (0, 0, 0, 0)); lin(d, [(25, 18), (25, 30)], 1, (0, 0, 0, 0)); return im
def kompassros(stor=1.0):
    im, d = ny()
    for k in range(4):
        a = math.radians(k * 90); b1 = math.radians(k * 90 + 90)
        poly(d, [(24 + 18 * stor * math.cos(a), 24 + 18 * stor * math.sin(a)), (24 + 5 * stor * math.cos(a + 0.8), 24 + 5 * stor * math.sin(a + 0.8)),
                 (24, 24), (24 + 5 * stor * math.cos(a - 0.8), 24 + 5 * stor * math.sin(a - 0.8))])
    ell(d, 24, 24, 3, 3, (0, 0, 0, 0)); return im

TECKEN = {'fjaril': fjaril, 'sten': sten, 'droppe': droppe, 'stjarna': stjarna, 'krabba': krabba, 'sol': sol,
          'blad': blad, 'fjader': fjader, 'vag': vag, 'mane': mane, 'fisk': fisk}        # nyckelns ordning (manus 19)
RAD = ['vag', 'fisk', 'droppe', 'blad', 'krabba', None, 'fjaril', 'blad', 'fisk', 'sten', 'fisk']   # UNDER FENAN

def liten(im, n):
    return im.resize((n, n), Image.NEAREST) if n == 48 else im.resize((n, n), Image.BOX).point(lambda v: v)

def skarp(im):
    """Efter förminskning: varje pixel blir antingen bläck eller ingenting (inga halvtoner)."""
    p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = p[x, y]; p[x, y] = BLACK if a > 110 else (0, 0, 0, 0)
    return im

def papper(W, H):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    for y in range(H):
        for x in range(W):
            kant = x in (0, W - 1) or y in (0, H - 1)
            c = PAPP[0] if kant else (PAPP[1] if (y > H - 4 or x < 1) else PAPP[2])
            p[x, y] = tuple(int(c[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    return im

def nyckel():
    """48 x 48: papperet med elva tecken i tre rader (4, 4, 3) och ett streck under varje, där bokstaven står."""
    im = papper(46, 46); ut = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); ut.alpha_composite(im, (1, 1))
    for i, n in enumerate(TECKEN):
        r, k = divmod(i, 4); x = 4 + k * 11 + (5 if r == 2 else 0); y = 4 + r * 14
        ut.alpha_composite(skarp(TECKEN[n]().resize((9, 9), Image.BOX)), (x, y))
        for xx in range(x + 2, x + 7): ut.putpixel((xx, y + 11), LJUS)
    return ut

def skylt_rad():
    """96 x 24: raden under ordet på skylten, kompassrosen först och sedan tio tecken (UNDER FENAN, med ett mellanrum)."""
    ut = Image.new('RGBA', (152, 24), (0, 0, 0, 0))
    ut.alpha_composite(skarp(kompassros().resize((14, 14), Image.BOX)), (1, 5))
    x = 18
    for n in RAD:
        if n is None: x += 6; continue
        ut.alpha_composite(skarp(TECKEN[n]().resize((12, 12), Image.BOX)), (x, 6)); x += 13
    return ut

if __name__ == '__main__':
    import sys; sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    UT = '/home/claude/k3/ut/bildkort'; os.makedirs(UT, exist_ok=True)
    alla = {}
    for n, f in TECKEN.items(): alla[f'tecken_{n}'] = f()
    alla['chiffernyckel_elva'] = nyckel(); alla['skylt_tecken'] = skylt_rad()
    for n, im in alla.items(): P.las_bild(im, n).save(f'{UT}/{n}.png')
    o = Image.new('RGBA', (11 * 50 + 4, 50 + 52), (242, 232, 200, 255))
    for i, n in enumerate(TECKEN): o.alpha_composite(alla[f'tecken_{n}'], (2 + i * 50, 1))
    o.alpha_composite(alla['chiffernyckel_elva'], (2, 51)); o.alpha_composite(alla['skylt_tecken'], (60, 63))
    o.resize((o.width * 2, o.height * 2), Image.NEAREST).save('/tmp/tecken_x2.png'); print('klart')
