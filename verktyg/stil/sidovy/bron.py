# Sidovyn vid bron i k1s13 (Stil 5, beslut 41.2 och 43): hjälten och ungen smyger längs bäcken förbi bron.
# Baronen sitter bakom busken vid brons östra fäste (på andra sidan bäcken, som i kartan, beslut 50.2) och läser
# sin egen lapp upp och ned, och han ser dem inte. Herr Skata
# flyger in och landar på tropikhjälmen, och hjälmen åker ner över ögonen.
#   sidovyer/vid_bron_bakgrund.png        320 x 192, samma himmel och stig som in_i_skogen (fötterna på y 162)
#   sidovyer/vid_bron_baronen_01..03.png  48 x 40: bakom busken, läser (två bilder) och hjälmen över ögonen med Herr Skata
#   sidovyer/vid_bron_skata_01..02.png    18 x 12: Herr Skata flyger in från höger (samma som flyga_vanster)
import os, sys, math, random
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.dirname(HAR)
sys.path.insert(0, os.path.join(ROT, 'palett'))
from palett import Palett
P = Palett()
_cwd = os.getcwd(); os.chdir(os.path.join(ROT, 'baron2'))
exec(open('baron.py').read().split("RAD={")[0])        # Duk, MAT och baronens färger
os.chdir(_cwd)
def hx2(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
INK = os.path.join(ROT, 'inkorg')
LD = lambda p: Image.open(os.path.join(INK, p)).convert('RGBA')
TRA = ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260']
V = ['#1E3E6A', '#2E5E94', '#3E7EBA', '#6AA6D8', '#B8E0F4']
G = ['#3E6E2E', '#5A8E3A', '#6FA34A', '#86B85A', '#A2CC70']
D = ['#7A5A36', '#A07A4A', '#BE9A62', '#D6B67E', '#E8CC98']

def bakgrund():
    W, H = 320, 192
    im = Image.new('RGBA', (W, H)); p = im.load(); rnd = random.Random(13)
    for y in range(H):
        for x in range(W):
            c = '#9AD0F0' if y < 56 else ('#B8E0F4' if y < 84 else G[2])
            if 84 <= y < 87: c = G[1]
            if 150 <= y < 170: c = D[2]
            p[x, y] = hx2(c)
    for i in range(500):                                   # tuvor i gräset
        x, y = rnd.randrange(W), rnd.randrange(88, H)
        if p[x, y] == hx2(G[2]): p[x, y] = hx2(rnd.choice((G[1], G[3])))
    for i in range(160):                                   # småsten och spår i stigen
        x, y = rnd.randrange(W), rnd.randrange(151, 169)
        p[x, y] = hx2(rnd.choice((D[1], D[3])))
    for x in range(W): p[x, 150] = hx2(D[1]); p[x, 169] = hx2(D[1])
    # tre solar i en båge (stor varmgul, mellanstor vit, liten röd-orange), som sägs aldrig
    for (cx, cy, r, c, k) in [(262, 24, 6, '#F2D22E', '#FFFBEA'), (284, 15, 4, '#FFFBEA', '#FFFFFF'), (300, 25, 2, '#F08A2A', '#F08A2A')]:
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r + r * 0.6: p[cx + x, cy + y] = hx2(k if (x < 0 and y < 0 and x * x + y * y < r * r * 0.35) else c)
    for (cx, cy) in [(40, 22), (74, 16), (190, 30)]:       # moln
        for y in range(-5, 6):
            for x in range(-14, 15):
                if (x / 14) ** 2 + (y / 5) ** 2 <= 1: p[cx + x, cy + y] = hx2('#FFFFFF' if y < 1 else '#E8F2FA')
    # skogen långt bort, i samma gröna som in_i_skogen
    MAT['lov2'] = ['#14301A', '#1E4A24', '#2E6A30', '#4A8E3A', '#78B456']
    d = Duk(W, H); kronor = []
    for x in range(-10, 340, 19):
        r = rnd.randint(14, 20); kronor.append((x, r)); d.ellips(x, 70 - r * 0.4, r, r * 0.85, 'lov2', 'krona')
    d.kontur(); kr = d.bild()
    for (x, r) in kronor:                                  # stammarna under kronorna (beslut 50.2), ned till gräset
        for y in range(int(70 + r * 0.3), 87):
            for k, c in enumerate(['#24160C', '#6A4626', '#4A3018']):
                if 0 <= x - 1 + k < W: p[x - 1 + k, y] = hx2(c)
        for k in (-2, 2):                                  # små rötter
            if 0 <= x + k < W: p[x + k, 86] = hx2('#4A3018')
    im.alpha_composite(kr); p = im.load()
    # bäcken: kommer bakifrån, går under bron och svänger av åt höger bakom stigen
    def vatten(x, y):
        if 86 <= y < 128:                                  # in mot bron, smal långt bort
            t = (y - 86) / 42; mx = 216; hb = 6 + t * 28
            return abs(x - mx) <= hb
        if 128 <= y < 146:
            vk = 186 + (y - 128) * 0.6                     # västra stranden går snett
            return x >= vk
        return False
    for y in range(86, 147):
        for x in range(W):
            if vatten(x, y):
                c = V[2]
                if not vatten(x, y - 2): c = V[1]          # mörkare under stranden
                if (x * 5 + y * 11) % 37 == 0: c = V[3]
                p[x, y] = hx2(c)
            elif vatten(x + 1, y) or vatten(x - 1, y) or vatten(x, y - 1):
                p[x, y] = hx2(D[0])                        # strandkant
    for y in range(146, 150):                              # strand ned mot vattnet bakom stigen
        for x in range(184, W): p[x, y] = hx2(D[0] if y == 146 else G[1])
    for (x, y) in [(232, 133), (262, 138), (290, 131), (210, 104), (222, 116), (300, 140)]:   # glitter
        for k in range(3): p[x + k, y] = hx2(V[4])
    # bron från sidan: välvd, som bildkortet, med räcke och stolpar
    x0, x1, botten, topp = 176, 258, 126, 106
    def dack(x): t = (x - x0) / (x1 - x0); return botten - (botten - topp) * math.sin(math.pi * t)
    for x in range(x0, x1 + 1):
        y = round(dack(x))
        for k in range(4): p[x, y + k] = hx2(TRA[[0, 3, 2, 0][k]])
        p[x, y - 7] = hx2(TRA[0]); p[x, y - 6] = hx2(TRA[3]); p[x, y - 5] = hx2(TRA[0])
        if (x - x0) % 10 == 0 or x in (x0, x1):
            for yy in range(y - 7, y): p[x, yy] = hx2(TRA[2]); p[x + 1, yy] = hx2(TRA[1])
    for (fx, w) in [(x0 - 6, 10), (x1 - 4, 10)]:           # fästen av sten
        for y in range(botten - 1, botten + 12):
            for x in range(fx, fx + w):
                c = '#8E949E' if (x + y) % 5 else '#6E747F'
                if y == botten - 1 or x in (fx, fx + w - 1): c = '#3E4148'
                p[x, y] = hx2(c)
    return im

def gras_framst(im):
    # högre gräs längst ned i bilden, under stigen (inget eget lager: figurerna går på stigen ovanför)
    rnd = random.Random(31)
    for x in range(0, 320):
        h = 5 + int(3 * math.sin(x / 7.0) + 2 * math.sin(x / 2.3)) + rnd.randint(0, 2)
        for k in range(h):
            im.putpixel((x, 191 - k), hx2(G[1] if k < h - 1 else G[3]))
    for x in range(4, 320, 13):
        h = rnd.randint(9, 13)
        for k in range(h): im.putpixel((x, 191 - k), hx2(G[1] if k < h - 2 else G[3]))
    return im

# ---------- baronen läser lappen upp och ned (från sidan, åt höger) ----------
def baron_las(f=0, hjalm_ner=False):
    d = Duk(32, 36); ox, oy = 2, 12
    bob = 1 if f == 1 else 0
    def e(cx, cy, rx, ry, m, n, **k): d.ellips(cx + ox, cy + oy, rx, ry, m, n, **k)
    e(11.6, 20.4, 1.5, 1.5, 'kaki', 'benb', toner=(0, 1, 1, 2)); e(12.2, 22.0, 2.1, 1.0, 'kanga', 'kangab', toner=(0, 1, 1, 2))
    e(11.0, 14.8, 6.6, 5.9, 'jacka', 'kropp')
    e(12.6, 20.5, 1.5, 1.5, 'kaki', 'ben'); e(13.4, 22.1, 2.2, 1.1, 'kanga', 'kanga')
    e(13.2, 8.4, 4.4, 4.0, 'hud', 'huvud')
    hy = 3 if hjalm_ner else 0                              # hjälmen åker ner över ögonen
    e(12.6, 4.4 + hy, 4.2, 3.0, 'hjalm', 'kupol'); e(12.8, 6.4 + hy, 6.8, 1.5, 'hjalm', 'brätte', zbias=0.1)
    e(17.2, 9.6, 1.5, 1.2, 'nos', 'nos', zbias=0.2)
    e(15.6, 12.6 - bob, 3.0, 1.5, 'jacka', 'arm', zbias=0.05)            # armen framåt, mot lappen
    e(18.8, 11.6 - bob, 1.3, 1.1, 'hud', 'hand')
    skilj(d, 'arm', 'kropp', ton=1); skilj(d, 'huvud', 'kropp', ton=1); skilj(d, 'brätte', 'huvud', ton=1); skilj(d, 'brätte', 'kupol', ton=1)
    if not hjalm_ner: fjader(d, [(8 + ox, 4 + oy), (7 + ox, 3 + oy), (7 + ox, 2 + oy), (6 + ox, 1 + oy), (6 + ox, oy)])
    d.kontur()
    for x in range(9 + ox, 17 + ox):
        if d.del_.get((x, 5 + hy + oy)) == 'kupol': d.fast(x, 5 + hy + oy, BAND)
    if not hjalm_ner: d.fast(15 + ox, 8 + oy, OGA)
    d.fast(14 + ox, 10 + oy, KIND)
    d.fast(16 + ox, 12 + oy, MUN); d.fast(17 + ox, 11 + oy, MUN)
    for (x, y, c) in [(12, 13, '#C83A3A'), (11, 14, '#3A8A3A')]: d.fast(x + ox, y + oy, c); d.fast(x + ox, y + 1 + oy, MAS)
    im = d.bild()
    # lappen framför ansiktet: orange kant, ljust papper, och hjälmen med fjädern (underskriften) upp och ned
    lx, ly = 20 + ox, 4 + oy - bob + (1 if f == 1 else 0)
    for y in range(8):
        for x in range(7):
            c = '#E8823A' if x in (0, 6) or y in (0, 7) else '#F6DCC3'
            im.putpixel((lx + x, ly + y), hx2(c))
    for (x, y) in [(2, 2), (3, 2), (4, 2)]: im.putpixel((lx + x, ly + y), hx2('#B85E22'))        # en rad skrift
    for x in range(1, 6): im.putpixel((lx + x, ly + 4), hx2('#6B4630'))                       # hjälmens brätte
    for x in range(2, 5): im.putpixel((lx + x, ly + 5), hx2('#C9B48A'))                       # kupolen under brättet
    im.putpixel((lx + 3, ly + 6), hx2('#C9B48A')); im.putpixel((lx + 5, ly + 6), hx2('#E8823A'))  # och fjädern nedåt
    if hjalm_ner:
        sk = LD('figurer/herr_skata/herr_skata_sitta_vanster_01.png')
        im.alpha_composite(sk, (9, 5))                       # sitter på hjälmen
    return im

def bakom_busken(f=0, hjalm_ner=False):
    """Baronen sitter bakom en buske: huvudet, hjälmen, armen och lappen syns ovanför. Busken är en del av bilden,
    så att den alltid står framför honom."""
    im = Image.new('RGBA', (48, 40), (0, 0, 0, 0))
    im.alpha_composite(baron_las(f, hjalm_ner), (4, 2))
    d = Duk(48, 40)
    for (cx, cy, r) in [(22, 36, 14), (8, 36, 8), (37, 36, 9), (14, 32, 7), (30, 32, 7), (43, 37, 5)]:
        d.ellips(cx, cy, r, r * 0.6, 'lov2', 'buske')
    d.kontur(); bu = d.bild(); rnd = random.Random(4)
    for i in range(26):
        x, y = rnd.randint(3, 44), rnd.randint(29, 39)
        if bu.getpixel((x, y))[3] and bu.getpixel((x, y)) != hx2(MAT['lov2'][0]): bu.putpixel((x, y), hx2(MAT['lov2'][4] if y < 34 else MAT['lov2'][1]))
    im.alpha_composite(bu)
    return im

BILDER = {
    'sidovyer/vid_bron_bakgrund': gras_framst(bakgrund()),
    'sidovyer/vid_bron_baronen_01': bakom_busken(0),
    'sidovyer/vid_bron_baronen_02': bakom_busken(1),
    'sidovyer/vid_bron_baronen_03': bakom_busken(0, hjalm_ner=True),
    'sidovyer/vid_bron_skata_01': LD('figurer/herr_skata/herr_skata_flyga_vanster_01.png'),
    'sidovyer/vid_bron_skata_02': LD('figurer/herr_skata/herr_skata_flyga_vanster_02.png'),
}
BARON_POS = (252, 86)       # där baronens bild ritas (övre vänstra hörnet): busken står på andra stranden, nederkant y 126
SKATA_LANDAR = (265, 93)    # Herr Skatas bild när den sitter på hjälmen (bild 03 har den redan i sig)

if __name__ == '__main__':
    for k, v in BILDER.items():
        f = os.path.join(HAR, 'ut', k + '.png'); os.makedirs(os.path.dirname(f), exist_ok=True)
        P.las_bild(v, os.path.basename(k)).save(f)
    # provbild: mitt i scenen, och när Herr Skata har landat
    for i, (bar, sk) in enumerate([('vid_bron_baronen_01', (230, 60)), ('vid_bron_baronen_03', None)]):
        s = BILDER['sidovyer/vid_bron_bakgrund'].copy()
        s.alpha_composite(BILDER['sidovyer/' + bar], BARON_POS)
        if sk: s.alpha_composite(BILDER['sidovyer/vid_bron_skata_01'], sk)
        h = LD('figurer/hjalte/hjalte_ga_hoger_02.png'); u = LD('figurer/unge/unge1_ga_hoger_02.png')
        hx_ = 90 if i == 0 else 200
        s.alpha_composite(u, (hx_ - 30, 162 - 24)); s.alpha_composite(h, (hx_, 162 - 24))
        s.resize((960, 576), Image.NEAREST).save(os.path.join(HAR, f'vid_bron_prov_{i + 1}_x3.png'))
    print('klar')
