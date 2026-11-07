# Uppdragslappen (beslut 36.6, Stil 2026-11-04): bilderna till skissen.
# ui/lapp_uppdrag.png     24 x 24  Farfars gulnade papper med riven kant, som 9-slice (8 px i varje hörn)
# ui/lapp_kompassros.png  11 x 11  kompassrosen i mässing som sitter i lappens övre högra hörn
# ui/stampel.png          32 x 32  stämpeln när hela uppdraget är klart: blått bläck, kompassrosen och en bock
# ui/ikon_uppdrag.png     16 x 16  fliken KLART i MIN BOK: en liten lapp med stämpeln
# Bocken är ikon_klar och pilen för steget han gör nu är ikon_fram (hud/hud.py), samma som på packlistan.
# Allt läses till masterpaletten. Orden står i Lexend i textlagret, aldrig som pixlar.
import os, sys, random
from PIL import Image
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
def hx(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
PAPP = ['#5A4A30', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFFBEA']     # kontur, skugga, mitt, ljus, högdager
MASS = ['#4A3A10', '#8A6A20', '#C8A040', '#E8C868', '#FFF0B0']
BLACK = ['#0E2A5A', '#1E5FA8', '#2E8BD8']                           # stämpelns bläck: mörk, mitt, ljus
UT = '/home/claude/uppdrag/ut/ui/'

def lapp():
    """Papper 24 x 24 som 9-slice. Kanten är riven: konturen hoppar en pixel in och ut, så att den ser
    handriven ut också när mitten sträcks. Ljus uppe till vänster, en skuggrad nere och till höger."""
    random.seed(36)
    im = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); p = im.load()
    # kantens djup per position (0 eller 1), samma mönster upprepas så att mittdelarna går att sträcka
    rand = [0, 1, 0, 0, 1, 1, 0, 1]
    for y in range(24):
        for x in range(24):
            ut_v = rand[y % 8]; ut_h = rand[(y + 3) % 8]; ut_t = rand[x % 8]; ut_b = rand[(x + 5) % 8]
            if x < ut_v or x > 23 - ut_h or y < ut_t or y > 23 - ut_b: continue
            kant = x == ut_v or x == 23 - ut_h or y == ut_t or y == 23 - ut_b
            c = PAPP[3]
            if x <= ut_v + 1 or y <= ut_t + 1: c = PAPP[4]
            if x >= 22 - ut_h or y >= 22 - ut_b: c = PAPP[2]
            if kant: c = PAPP[1]
            if kant and (x == 23 - ut_h or y == 23 - ut_b): c = PAPP[0]
            p[x, y] = hx(c)
    # hörnen är rundade lite
    for (x, y) in [(0, 0), (1, 0), (0, 1), (23, 0), (22, 0), (23, 1), (0, 23), (1, 23), (0, 22), (23, 23), (22, 23), (23, 22)]:
        p[x, y] = (0, 0, 0, 0)
    return im

def kompassros():
    """Farfars kompassros i mässing, 11 x 11: fyra spetsar, norr ljusast."""
    rad = ['.....p.....',
           '....pn.....',
           '....nnm....',
           '...kmnmk...',
           '.k.kpomk.k.',
           'pnnmoWomnmk',
           '.k.kmomk.k.',
           '...kmnmk...',
           '....mmk....',
           '.....m.....',
           '.....k.....']
    nyckel = {'k': MASS[0], 'm': MASS[1], 'n': MASS[2], 'o': MASS[3], 'p': MASS[4], 'W': MASS[4]}
    im = Image.new('RGBA', (11, 11), (0, 0, 0, 0)); p = im.load()
    for y, r in enumerate(rad):
        for x, c in enumerate(r):
            if c in nyckel: p[x, y] = hx(nyckel[c])
    return im

def stampel():
    """Stämpeln, 32 x 32: en ring av blått bläck, kompassrosen och en stor bock. Bläcket är ojämnt (några pixlar
    saknas och kanten är ljusare där stämpeln tog mindre), som en riktig stämpel. Inte guld (guld är rätt svar)
    och inte rött (fel är aldrig rött). Ingen text: ordet KLART läses upp och står i textlagret."""
    random.seed(7)
    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); p = im.load()
    cx, cy = 15.5, 15.5
    for y in range(32):
        for x in range(32):
            r = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 13.0 <= r <= 15.4 or 10.6 <= r <= 11.4:
                if random.random() < 0.04: continue                    # bläcket tog inte
                c = BLACK[1] if (x + y) < 34 else BLACK[0]
                if random.random() < 0.08: c = BLACK[2]
                p[x, y] = hx(c)
    # små tänder i ringen mellan de två cirklarna (som en poststämpel)
    import math
    for i in range(16):
        a = i / 16 * 2 * math.pi
        x, y = round(cx + 12.2 * math.cos(a)), round(cy + 12.2 * math.sin(a))
        p[x, y] = hx(BLACK[1])
    # bocken, 3 pixlar tjock, från vänster nere till höger uppe
    bock = [(10, 16), (11, 17), (12, 18), (13, 19), (14, 18), (15, 17), (16, 16), (17, 15), (18, 14), (19, 13), (20, 12), (21, 11), (22, 10)]
    for (x, y) in bock:
        for dy in (-1, 0, 1):
            if random.random() < 0.05: continue
            p[x, y + dy] = hx(BLACK[0] if dy == 1 else BLACK[1])
    # kompassrosens norrspets ovanför bocken
    for (x, y) in [(15, 6), (16, 6), (15, 7), (16, 7), (14, 8), (17, 8), (15, 8), (16, 8)]:
        p[x, y] = hx(BLACK[1])
    for (x, y) in [(15, 24), (16, 24), (15, 25), (16, 25)]:
        p[x, y] = hx(BLACK[1])
    for (x, y) in [(6, 15), (6, 16), (25, 15), (25, 16)]:
        p[x, y] = hx(BLACK[1])
    return im

def ikon_uppdrag():
    """Fliken KLART i MIN BOK: en liten lapp (12 x 13) med en blå stämpel i hörnet."""
    rad = ['................',
           '...bbbbbbbbb....',
           '..bdddddddddb...',
           '..bdaaaaaddcb...',
           '..bdddddddccb...',
           '..bdaaaaddccb...',
           '..bddddddcccb...',
           '..bdaaaddKKKKK..',
           '..bddddcKCCCCCK.',
           '..bdaadcKCDKKCK.',
           '..bddddcKCKDCCK.',
           '..bccccc.KCCCK..',
           '..abbbbbb.KKK...',
           '...aaaaaaa......',
           '................',
           '................']
    nyckel = {'a': PAPP[0], 'b': PAPP[1], 'c': PAPP[2], 'd': PAPP[3], 'K': BLACK[0], 'C': BLACK[1], 'D': '#E8F0FF'}
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); p = im.load()
    for y, r in enumerate(rad):
        for x, c in enumerate(r):
            if c in nyckel: p[x, y] = hx(nyckel[c])
    return im

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    for namn, im in [('lapp_uppdrag', lapp()), ('lapp_kompassros', kompassros()), ('stampel', stampel()), ('ikon_uppdrag', ikon_uppdrag())]:
        P.las_bild(im, namn).save(UT + namn + '.png')
    big = Image.new('RGBA', (110, 36), (40, 30, 24, 255))
    for i, n in enumerate(['lapp_uppdrag', 'lapp_kompassros', 'stampel', 'ikon_uppdrag']):
        big.alpha_composite(Image.open(UT + n + '.png'), (2 + i * 27, 2))
    big.resize((big.width * 6, big.height * 6), Image.NEAREST).save('/home/claude/uppdrag/delar_x6.png')
    print('klart')
