# Fas 4 (beslut 61.3): bilderna till skissen av startskärmen, pausmenyn och menyn för vuxna. Stil 2026-11-08.
# Bara skissbilder (mock/), inget till spelet. Allt i masterpalettens färger och i HUD:ens stil: mässing och läder.
import os, sys, math, random
from PIL import Image, ImageDraw
ROT = '/home/claude'
sys.path.insert(0, ROT + '/palett')
from palett import Palett
P = Palett()
def hx(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def nar(c): return hx('#%02x%02x%02x' % c[:3])
MASS = ['#4A3A10', '#8A6A20', '#C8A040', '#E8C868', '#FFF0B0']
LADER = ['#140C06', '#2E1C0E', '#3A2414', '#5A3A1E', '#7A522C']
BOK = ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260']
PAPP = ['#5A4A30', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFFBEA']
UT = ROT + '/fas4/mock/'
IN = ROT + '/inkorg/'
def ny(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def las(p): return Image.open(p).convert('RGBA')

def bord():
    """Farfars skrivbord i morgonljus: plankorna ur kontoret, ett snett ljus från fönstret uppe till vänster."""
    k = las(IN + 'rum/hus/kontoret.png').crop((40, 50, 280, 174))
    im = ny(320, 192)
    for oy in range(0, 192, k.height):
        for ox in range(-((oy // k.height) * 70) % k.width - k.width, 320, k.width): im.alpha_composite(k, (ox, oy))
    p = im.load(); cache = {}
    for y in range(192):
        for x in range(320):
            c = p[x, y]; d = x * 0.55 + y
            ljus = 0.30 if 40 < d < 110 else 0.18 if 125 < d < 165 else 0.0
            if 30 < d <= 40 or 110 <= d < 118: ljus = 0.30 if (x + y) % 2 else 0.0      # rastrerad kant
            mork = max(0.0, (y - 150) / 42 * 0.25) + max(0.0, (x - 270) / 50 * 0.2)
            r, g, b = c[:3]
            r = r + (255 - r) * ljus; g = g + (232 - g) * ljus; b = b + (176 - b) * ljus
            r, g, b = r * (1 - mork), g * (1 - mork), b * (1 - mork)
            q = (int(r), int(g), int(b))
            if q not in cache: cache[q] = nar(q)
            p[x, y] = cache[q]
    return im

def ram(im, w, h, ox=0, oy=0, tjock=3):
    """Mässingsram: mörk kontur, ljus kant uppe och till vänster, skugga nere och till höger."""
    d = ImageDraw.Draw(im)
    d.rectangle((ox, oy, ox + w - 1, oy + h - 1), outline=hx(MASS[0]))
    for i in range(1, tjock):
        d.rectangle((ox + i, oy + i, ox + w - 1 - i, oy + h - 1 - i), outline=hx(MASS[2]))
    d.line((ox + 1, oy + 1, ox + w - 2, oy + 1), fill=hx(MASS[3])); d.line((ox + 1, oy + 1, ox + 1, oy + h - 2), fill=hx(MASS[3]))
    d.line((ox + 1, oy + h - 2, ox + w - 2, oy + h - 2), fill=hx(MASS[1])); d.line((ox + w - 2, oy + 1, ox + w - 2, oy + h - 2), fill=hx(MASS[1]))
    d.rectangle((ox + tjock, oy + tjock, ox + w - 1 - tjock, oy + h - 1 - tjock), outline=hx(MASS[0]))
    for (x, y) in ((ox + 1, oy + 1), (ox + w - 3, oy + 1), (ox + 1, oy + h - 3), (ox + w - 3, oy + h - 3)):   # nitar
        d.point((x, y), fill=hx(MASS[4])); d.point((x + 1, y + 1), fill=hx(MASS[1]))
    return im

def foto(src, x0, y0, w=160, h=96, dimma=False):
    im = ny(w + 8, h + 8)
    bit = las(src).crop((x0, y0, x0 + w, y0 + h))
    if dimma:
        p = bit.load()
        for y in range(h):
            for x in range(w):
                c = p[x, y]; p[x, y] = nar((int(c[0] * 0.55 + 40), int(c[1] * 0.55 + 30), int(c[2] * 0.55 + 20)))
    im.alpha_composite(bit, (4, 4)); ram(im, w + 8, h + 8, tjock=4)
    sk = ny(w + 10, h + 10); ImageDraw.Draw(sk).rectangle((2, 2, w + 9, h + 9), fill=(20, 12, 6, 110)); sk.alpha_composite(im)
    return sk

def ring(d, aktiv=False):
    """En rund knapp som HUD:ens, d pixlar: mässingsring och mörkt läder (aktiv: ljusare ring)."""
    im = ny(d, d); p = im.load(); r = d / 2 - 0.5; c = (d - 1) / 2
    M = MASS if not aktiv else ['#4A3A10', '#C8A040', '#E8C868', '#FFF0B0', '#FFFBEA']
    for y in range(d):
        for x in range(d):
            a = math.hypot(x - c, y - c)
            if a > r + 0.3: continue
            if a > r - 0.8: p[x, y] = hx(M[0]); continue
            if a > r - 3.4:
                v = ((c - x) + (c - y)) / (2 * r)
                p[x, y] = hx(M[3] if v > 0.35 else M[2] if v > -0.35 else M[1]); continue
            if a > r - 4.2: p[x, y] = hx(M[0]); continue
            v = ((c - x) + (c - y)) / (2 * r)
            p[x, y] = hx(LADER[3] if v > 0.45 else LADER[2] if v > -0.3 else LADER[1])
    return im

def pil(im, farg=PAPP[3]):
    """En spelpil mitt i ringen."""
    d = im.width; c = d / 2; s = d * 0.22; dr = ImageDraw.Draw(im)
    dr.polygon([(c - s * 0.7 + 1, c - s), (c - s * 0.7 + 1, c + s), (c + s + 1, c)], fill=hx(LADER[0]))
    dr.polygon([(c - s * 0.7, c - s - 1), (c - s * 0.7, c + s - 1), (c + s, c - 1)], fill=hx(farg))
    dr.line((c - s * 0.7, c - s - 1, c - s * 0.7, c + s - 1), fill=hx(PAPP[4]))
    return im

def ikon_i(im, namn, skala=1):
    ik = las(IN + 'ui/ikon_' + namn + '.png')
    if skala > 1: ik = ik.resize((ik.width * skala, ik.height * skala), Image.NEAREST)
    im.alpha_composite(ik, ((im.width - ik.width) // 2, (im.height - ik.height) // 2)); return im

def bok(w, h, emblem='plus', farg=BOK):
    """En stängd äventyrsbok: läder, ryggen till vänster, sidorna till höger och nere, mässingshörn."""
    im = ny(w + 2, h + 2); d = ImageDraw.Draw(im)
    d.rectangle((2, 2, w + 1, h + 1), fill=(20, 12, 6, 110))                       # skugga
    d.rectangle((3, 2, w - 1, h - 1), fill=hx(PAPP[2]), outline=hx(PAPP[0]))       # sidorna
    for y in range(4, h - 2, 2): d.line((w - 3, y, w - 2, y), fill=hx(PAPP[1]))
    d.rectangle((0, 0, w - 4, h - 4), fill=hx(farg[2]), outline=hx(farg[0]))       # pärmen
    d.rectangle((1, 1, 6, h - 5), fill=hx(farg[1]))                                 # ryggen
    d.line((7, 1, 7, h - 5), fill=hx(farg[0]))
    d.line((8, 1, w - 5, 1), fill=hx(farg[3])); d.line((8, 1, 8, h - 5), fill=hx(farg[3]))
    for y in (6, h - 10): d.line((1, y, 6, y), fill=hx(MASS[2])); d.line((1, y + 1, 6, y + 1), fill=hx(MASS[1]))
    for (x, y, sx, sy) in ((w - 4, 0, -1, 1), (w - 4, h - 4, -1, -1)):              # mässingshörn
        for i in range(5):
            for j in range(5 - i): d.point((x + sx * j, y + sy * i), fill=hx(MASS[2] if (i + j) < 3 else MASS[1]))
        d.point((x, y), fill=hx(MASS[0]))
    cx, cy = (w - 4 + 8) // 2, (h - 4) // 2
    if emblem == 'plus':
        s = max(3, w // 9)
        d.rectangle((cx - s - 1, cy - 2, cx + s + 1, cy + 2), fill=hx(MASS[0])); d.rectangle((cx - 2, cy - s - 1, cx + 2, cy + s + 1), fill=hx(MASS[0]))
        d.rectangle((cx - s, cy - 1, cx + s, cy + 1), fill=hx(MASS[2])); d.rectangle((cx - 1, cy - s, cx + 1, cy + s), fill=hx(MASS[2]))
        d.line((cx - s, cy - 1, cx + s, cy - 1), fill=hx(MASS[3])); d.line((cx - 1, cy - s, cx - 1, cy + s), fill=hx(MASS[3]))
    return im

def portratt(farg=None, aktiv=False):
    """Hjältens huvud i en rund ram (spelarval). farg byter dräktens blå mot en annan ton (en annan spelare)."""
    im = ring(28, aktiv); p = im.load()
    for y in range(28):
        for x in range(28):
            if math.hypot(x - 13.5, y - 13.5) < 9.3: p[x, y] = hx('#A8DCF8' if y < 17 else '#78B456')
    h = las(IN + 'figurer/hjalte/hjalte_ga_ner_01.png').crop((0, 0, 16, 17))
    if farg:
        q = h.load()
        for y in range(h.height):
            for x in range(h.width):
                c = q[x, y]
                if c[3] and c[2] > c[0] + 40 and c[2] > c[1]: q[x, y] = nar((c[2] // 3, c[2], c[2] // 3)) if farg == 'gron' else c
    m = Image.new('L', (28, 28), 0); ImageDraw.Draw(m).ellipse((5, 5, 22, 22), fill=255)
    lag = ny(28, 28); lag.alpha_composite(h, (6, 6)); im.paste(lag, (0, 0), Image.composite(lag, ny(28, 28), m).split()[3])
    return im

def plus_ring():
    im = ring(28); d = ImageDraw.Draw(im)
    d.rectangle((9, 13, 18, 14), fill=hx(PAPP[3])); d.rectangle((13, 9, 14, 18), fill=hx(PAPP[3])); return im

def skylt(w, h):
    """Mässingsskylten för namnet ORDSTAVEN (texten står i Lexend ovanpå)."""
    im = ny(w, h + 1); d = ImageDraw.Draw(im)
    d.rectangle((1, 1, w - 1, h), fill=(20, 12, 6, 110))
    d.rectangle((0, 0, w - 2, h - 2), fill=hx(MASS[3]), outline=hx(MASS[0]))
    d.line((1, 1, w - 3, 1), fill=hx(MASS[4])); d.line((1, h - 3, w - 3, h - 3), fill=hx(MASS[2])); d.line((1, h - 4, w - 3, h - 4), fill=hx(MASS[2]))
    for x in (3, w - 6):
        for y in (3, h - 6): d.point((x, y), fill=hx(MASS[1])); d.point((x + 1, y), fill=hx(MASS[4]))
    return im

def kort(w, h):
    """Ett papperskort i pausmenyn (ikonen och ordet står på det)."""
    im = ny(w + 2, h + 2); d = ImageDraw.Draw(im)
    d.rectangle((2, 2, w + 1, h + 1), fill=(20, 12, 6, 120))
    d.rectangle((0, 0, w - 1, h - 1), fill=hx(PAPP[3]), outline=hx(PAPP[0]))
    d.line((1, 1, w - 2, 1), fill=hx(PAPP[4])); d.line((1, h - 2, w - 2, h - 2), fill=hx(PAPP[1]))
    return im

def panel(w, h):
    """Läderpanelen bakom pausmenyn: mörkt läder, en söm runt om och mässingshörn."""
    im = ny(w + 3, h + 3); d = ImageDraw.Draw(im)
    d.rectangle((3, 3, w + 2, h + 2), fill=(10, 6, 2, 140))
    d.rectangle((0, 0, w - 1, h - 1), fill=hx(LADER[2]), outline=hx(LADER[0]))
    d.line((1, 1, w - 2, 1), fill=hx(LADER[3]))
    for x in range(5, w - 5, 4): d.line((x, 4, x + 1, 4), fill=hx(LADER[4])); d.line((x, h - 5, x + 1, h - 5), fill=hx(LADER[4]))
    for y in range(5, h - 5, 4): d.line((4, y, 4, y + 1), fill=hx(LADER[4])); d.line((w - 5, y, w - 5, y + 1), fill=hx(LADER[4]))
    for (x, y, sx, sy) in ((0, 0, 1, 1), (w - 1, 0, -1, 1), (0, h - 1, 1, -1), (w - 1, h - 1, -1, -1)):
        for i in range(8):
            for j in range(8 - i): d.point((x + sx * j, y + sy * i), fill=hx(MASS[2] if i + j < 5 else MASS[1]))
        d.point((x + sx * 2, y + sy * 2), fill=hx(MASS[4]))
    return im

def dimma(src):
    im = las(src); p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]; p[x, y] = (c[0] * 45 // 100, c[1] * 45 // 100, c[2] * 45 // 100, 255)
    return im

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    SK = '/tmp/nat_gangen-soder.png'
    B = {
        'bord': bord(), 'foto': foto(SK, 70, 40), 'foto_dim': foto(SK, 70, 40, dimma=True),
        'ring32': pil(ring(32)), 'ring32_aktiv': pil(ring(32, True)), 'ring32_klar': ikon_i(ring(32, True), 'klar', 1),
        'ring24_bak': ikon_i(ring(24), 'bak'), 'ring24_kugg': ring(24), 'bok_ny': bok(38, 46), 'bok_stor': bok(76, 92),
        'portratt_a': portratt(aktiv=True), 'portratt_b': portratt('gron'), 'portratt_ny': plus_ring(),
        'skylt': skylt(132, 22), 'kort': kort(64, 72), 'panel': panel(248, 100), 'spel_dim': dimma(SK),
        'unge_sover': las(IN + 'figurer/unge/unge1_sover_ner_01.png'),
    }
    for n in ('karta', 'bok', 'paus', 'klar', 'bak', 'fram'): B['ikon_' + n] = las(IN + 'ui/ikon_' + n + '.png')
    for n, im in B.items(): im.save(UT + n + '.png')
    print(len(B), 'skissbilder i', UT, {n: im.size for n, im in B.items() if n in ('unge_sover', 'bord')})
