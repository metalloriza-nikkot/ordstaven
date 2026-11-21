# Kapitel 4, Berget som ryker: det som inte beror på rummen (beslut 114, berättelsen v0.4). Ritas före rummen, som
# kapitel 3:s figurer. Allt läses till masterpaletten 1.2. Fötterna (nederkantens mitt) är platsen om inget annat sägs.
#
# foremal/berg/
#   snomassa_01–02          96 x 48   snön som rasar och STANNAR i luften ovanför mynningen (02: smulor faller)
#   snomassa_rasar_01–02    96 x 56   när bubblan slocknar: snön rasar ned, med fartstreck och yrsnö
#   snomoln_01–02           48 x 24   yrsnön där snön landar
#   mynning_igenrasad       64 x 44   snön som stänger grottans mynning (läggs över rummet i tillståndet)
#   block_hanger            48 x 44   det största blocket på berget, med baronens orange rep i kors och en ögla överst
#                                     (repet går upp från (24, 0))
#   rep_orange              4 x 16    repet, en bit som upprepas uppåt till gondolen
#   block_slits_01–02       40 x 20   grus och snö som faller när blocket slits loss
#   block_driva             56 x 36   blocket som har tappats i en snödriva, lutar
#   isflak                  32 x 24   ett flak i bokstavsstigen. Bokstaven står på läsplattan, aldrig i bilden
#   isflak_gungar_01–02     32 x 24   fel bokstav: flaket knakar och gungar
#   isflak_spricka          32 x 24   ett flak han har gått på: en spricka, men det håller
#   isflak_sjunker_01–03    32 x 24   en återvändsgränd: flaket sjunker långsamt
#   isflak_kant_01–02       32 x 24   hjälpen: kanten lyser svagt (vitt och ljusblått, aldrig guld)
#   vak_01–02               32 x 24   en vak: mörkt vatten där isen tar slut
#   isvagg_spricka          32 x 40   isväggen med sprickan där dagsljuset syns
#   isvagg_rasar_01–02      32 x 40   isväggen rasar ut när ungen slår (02: hålet är öppet)
#   is_splitter_01–02       24 x 16   isbitar som flyger vid slaget
#   sten_varm_slat_01–02          40 x 32   varm sten utan svans (ånga i två bilder, snön har smält runt)
#   sten_varm_taggsvans_01–02     40 x 32   varm sten med en svans med taggar
#   sten_kall_klubbsvans          40 x 32   kall sten under is och snö, med en klubbsvans under isen
#   sten_hal                      40 x 32   hålet där baronens block låg
#   sten_varm_klubbsvans_01–02    40 x 32   den speciella stenen: varm, med ungens svans och klubba, pixel för pixel
#   vante                   16 x 12   Farfars gamla stickade vante under stenen
#   vante_kartbit           16 x 12   vanten med kartbit fem som sticker ut
# figurer/unge/
#   unge1_svansslag_hoger_01–03 och _vanster_01–03   24 x 24   ungen slår med klubbsvansen bakåt mot isen
# figurer/effekter/
#   skold_stor_tands_01–03 och skold_stor_bubbla_01–02   112 x 72   STOR SKÖLD, jättebubblan
import os, sys, math, random
from PIL import Image
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
P = Palett()
UT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k4/ut114'

def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
class Bild:
    def __init__(s, b, h): s.im = Image.new('RGBA', (b, h), (0, 0, 0, 0)); s.p = s.im.load(); s.b, s.h = b, h
    def s(s, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < s.b and 0 <= y < s.h: s.p[x, y] = hx(c) + (255,) if isinstance(c, str) else c
    def g(s, x, y): return s.p[x, y][3] if 0 <= x < s.b and 0 <= y < s.h else 0
    def ell(s, cx, cy, rx, ry, c, ljus=None, mork=None, skugga=None):
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                u = (x + .5 - cx) / rx; v = (y + .5 - cy) / ry
                if u * u + v * v <= 1:
                    f = c
                    if mork and u + v > 0.7: f = mork
                    if skugga and v > 0.55: f = skugga
                    if ljus and u + v < -0.7: f = ljus
                    s.s(x, y, f)
    def rk(s, x0, y0, b, h, c):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + b): s.s(x, y, c)
    def linje(s, x0, y0, x1, y1, c, t=1):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
            for k in range(t): s.s(round(x) + (k if abs(y1 - y0) > abs(x1 - x0) else 0), round(y) + (0 if abs(y1 - y0) > abs(x1 - x0) else k), c)
    def kontur(s, c='#1a1a20'):
        ut = []
        for y in range(s.h):
            for x in range(s.b):
                if s.p[x, y][3]: continue
                if any(s.g(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): ut.append((x, y))
        for (x, y) in ut: s.s(x, y, c)
        return s

SNO = ('#8e9fcc', '#b4c4e6', '#e8f2fa', '#ffffff')
IS = ('#123248', '#1e4e6c', '#2f7498', '#4e9ec2', '#6ec6e6', '#a0d9ee', '#bfe3ef', '#e8f2fa')
STEN = ('#2e2a36', '#4a4450', '#6e6a78', '#8e8aa8')
BEN = ('#5a4a36', '#a08a6e', '#d8ccb0', '#f2e8c8')
ANGA = ('#b8bec6', '#dce0e4', '#eeeff4')
OR = ('#A85418', '#E8823A')

def snoklump(d, cx, cy, rx, ry, rnd):
    d.ell(cx, cy, rx, ry, SNO[2], SNO[3], SNO[1], SNO[0])
    for _ in range(int(rx)):                                           # knölar i kanten
        a = rnd.random() * math.pi * 2
        d.ell(cx + math.cos(a) * rx * 0.9, cy + math.sin(a) * ry * 0.9, 2.5, 2, SNO[2], SNO[3], SNO[1])

# ---------------- snöraset ----------------
def snomassa(n, rasar=False):
    d = Bild(96, 56 if rasar else 48); rnd = random.Random(41)
    oy = 6 if rasar else 0
    for k in range(9):
        snoklump(d, 10 + k * 9.5, 18 + oy + rnd.randint(-4, 4), 9 + rnd.random() * 3, 9 + rnd.random() * 4, rnd)
    for x in range(4, 92):                                             # undersidan i blå skugga
        for y in range(int(26 + oy + 4 * math.sin(x / 7)), int(31 + oy + 3 * math.sin(x / 5))):
            if d.g(x, y): d.s(x, y, SNO[0] if (x + y) % 3 else SNO[1])
    rnd2 = random.Random(70 + n)
    if rasar:
        for _ in range(16):                                            # fartstreck och yrsnö
            x = rnd2.randrange(6, 90); y = rnd2.randrange(0, 6)
            d.linje(x, y, x, y + 4, SNO[2] if n == 1 else SNO[1])
        for _ in range(14): d.s(rnd2.randrange(96), rnd2.randrange(44, 56), SNO[3])
    else:
        for _ in range(10):                                            # smulor som faller medan den står still
            x = rnd2.randrange(8, 88); y = 36 + rnd2.randrange(0, 10) + (2 if n == 2 else 0)
            d.s(x, y, SNO[3]); d.s(x, y + 1, SNO[1])
    return d.kontur('#3e4a6a').im

def snomoln(n):
    d = Bild(48, 24); rnd = random.Random(80 + n)
    for k in range(5): snoklump(d, 8 + k * 8, 16 - (k % 2) * 3 - (2 if n == 2 else 0), 6 + n, 5 + n, rnd)
    for _ in range(10): d.s(rnd.randrange(48), rnd.randrange(0, 8), SNO[3])
    return d.im

def mynning_igenrasad():
    d = Bild(64, 44); rnd = random.Random(12)
    for k in range(10):
        snoklump(d, 6 + k * 5.8, 26 - abs(k - 4.5) * 2 + rnd.randint(-2, 2), 7, 9, rnd)
    snoklump(d, 32, 34, 30, 9, rnd)
    for (x, y) in ((14, 30), (40, 22), (50, 34)): d.ell(x, y, 4, 3, IS[5], IS[7], IS[3])   # isbitar i snön
    return d.kontur('#3e4a6a').im

# ---------------- baronens block ----------------
def block(d, ox, oy, b=40, h=30, lut=0):
    rnd = random.Random(5)
    for y in range(h):
        for x in range(b):
            u = (x - b / 2) / (b / 2); v = (y - h / 2) / (h / 2)
            if abs(u) ** 2.6 + abs(v) ** 2.6 <= 1:
                c = STEN[2] if u + v < 0 else STEN[1]
                if u + v < -0.9: c = STEN[3]
                if (x * 7 + y * 3) % 23 == 0: c = STEN[0]                  # sprickor och prickar
                d.s(ox + x, oy + y + int(lut * u * 4), c)
    for x in range(4, b - 4):                                          # snö på toppen
        for y in range(0, 4 + int(2 * math.sin(x / 4))):
            if d.g(ox + x, oy + y + 2): d.s(ox + x, oy + y + 2, SNO[2] if y < 3 else SNO[1])

def block_hanger():
    d = Bild(48, 44)
    block(d, 4, 12)
    for x in range(4, 44): d.s(x, 26, OR[1]); d.s(x, 27, OR[0])         # repet i kors runt blocket
    for y in range(12, 42): d.s(23, y, OR[1]); d.s(24, y, OR[0])
    for y in range(0, 12):                                             # öglan upp mot luftskeppet
        d.s(23 - (1 if 3 < y < 10 else 0), y, OR[1]); d.s(25 + (1 if 3 < y < 10 else 0), y, OR[0])
    d.s(24, 0, OR[1]); d.s(24, 1, OR[0])
    return d.kontur().im

def rep_orange():
    d = Bild(4, 16)
    for y in range(16): d.s(1, y, OR[1] if (y // 2) % 2 else OR[0]); d.s(2, y, OR[0] if (y // 2) % 2 else OR[1])
    return d.im

def block_slits(n):
    d = Bild(40, 20); rnd = random.Random(90 + n)
    for _ in range(14):
        x = rnd.randrange(2, 38); y = rnd.randrange(0, 18) + (2 if n == 2 else 0)
        if rnd.random() < 0.5: d.ell(x, y, 1.6, 1.4, STEN[2], STEN[3], STEN[1])
        else: d.s(x, y, SNO[3]); d.s(x + 1, y, SNO[2])
    return d.im

def block_driva():
    d = Bild(56, 36); rnd = random.Random(3)
    block(d, 8, 2, 40, 28, lut=0.6)
    for k in range(8): snoklump(d, 4 + k * 7, 30 - abs(k - 3.5), 7, 5, rnd)   # drivan framför och runt
    for x in range(10, 46, 3): d.s(x, 30 - int(abs(x - 28) / 6), OR[1])     # repets ände ligger kvar
    return d.kontur().im

# ---------------- isflaken ----------------
def isflak(lage='hel', n=1):
    d = Bild(32, 24); dy = 0; tilt = 0
    if lage == 'gungar': tilt = 1 if n == 1 else -1
    if lage == 'sjunker': dy = (2, 4, 7)[n - 1]
    top, tjock = 14, 4
    for y in range(4, 4 + top + tjock):
        for x in range(2, 30):
            u = (x - 16) / 14; v = (y - 4 - top / 2) / (top / 2)
            if abs(u) ** 3 + abs(min(v, 1)) ** 3 > 1 and y < 4 + top: continue
            if y >= 4 + top and abs(u) ** 3 > 0.9: continue
            yy = y + dy + int(tilt * u * 2)
            c = (IS[6] if u + v < 0.2 else IS[5]) if y < 4 + top else (IS[3] if y < 4 + top + 2 else IS[2])
            if y < 4 + top and u + v < -0.9: c = IS[7]
            d.s(x, yy, c)
    if lage == 'sjunker':                                              # vattnet sköljer över det som sjunker
        for x in range(0, 32):
            for y in range(22 - (n - 1) * 3, 24): d.s(x, y, IS[1] if (x + y) % 3 else IS[2])
            if (x + n) % 5 == 0: d.s(x, 21 - (n - 1) * 3, IS[5])
    if lage == 'spricka':
        for (x, y) in ((9, 8), (10, 9), (11, 9), (12, 10), (13, 11), (14, 11), (15, 12), (16, 12), (17, 13), (13, 12), (12, 13), (11, 14), (19, 12), (20, 11)):
            d.s(x, y, IS[2])
    if lage == 'gungar':
        for (x, y) in ((4, 2), (6, 1), (26, 1), (28, 2)): d.s(x, y, IS[7])    # knaket: små streck vid kanterna
    d.kontur(IS[0])
    if lage == 'kant':                                                 # hjälpen: kanten lyser, vitt och ljusblått
        for y in range(24):
            for x in range(32):
                if d.p[x, y][:3] == hx(IS[0]) and (x + y + n) % 2 == 0: d.s(x, y, '#ffffff')
                elif d.p[x, y][:3] == hx(IS[0]): d.s(x, y, IS[6])
    return d.im

def vak(n):
    d = Bild(32, 24)
    d.ell(16, 12, 14, 8, IS[0], None, None, None); d.ell(16, 12, 11, 6, IS[1], None, IS[0])
    for k in range(3): d.ell(16, 12, 4 + k * 3 + n, 2 + k * 1.6 + n * 0.5, IS[1]) if False else None
    for a in range(0, 360, 20):                                        # ringar på vattnet
        r = 5 + (n - 1) * 2
        d.s(16 + r * math.cos(math.radians(a)), 12 + r * 0.55 * math.sin(math.radians(a)), IS[2])
    for x in range(3, 30):                                             # iskanten runt vaken
        y0 = 12 - int(8 * math.sqrt(max(0, 1 - ((x - 16) / 14) ** 2)))
        d.s(x, y0, IS[6]); d.s(x, y0 + 1, IS[4])
    return d.im

def isvagg(lage, n=1):
    d = Bild(32, 40)
    for y in range(40):
        for x in range(32):
            c = IS[3] if (x // 6 + y // 9) % 2 else IS[4]
            if (x * 5 + y * 3) % 17 == 0: c = IS[5]
            if x < 2 or x > 29: c = IS[2]
            d.s(x, y, c)
    if lage == 'spricka':
        pts = [(16, 4), (15, 8), (17, 12), (15, 17), (17, 22), (16, 27), (18, 32), (16, 37)]
        for (a, b) in zip(pts, pts[1:]):
            d.linje(a[0], a[1], b[0], b[1], '#fff8c8'); d.linje(a[0] + 1, a[1], b[0] + 1, b[1], IS[1])
        for y in range(12, 28, 3): d.s(16, y, '#ffffff')                 # dagsljuset genom sprickan
    else:
        if n == 1:
            for (a, b) in ((3, 4), (28, 6), (4, 34), (27, 36), (16, 1), (1, 20), (30, 22), (15, 39)):
                d.linje(16, 20, a, b, IS[1])
            d.ell(16, 20, 3, 3, '#fff8c8', '#ffffff')
        else:                                                          # hålet är öppet, dagsljuset strömmar in
            d.ell(16, 22, 11, 15, '#fff8c8', '#ffffff', '#f2e8c8')
            for k in range(6): d.s(16 + k * 2 - 6, 4 + k % 2, IS[5])
    return d.kontur(IS[0]).im

def is_splitter(n):
    d = Bild(24, 16); rnd = random.Random(30 + n)
    for _ in range(9):
        x = rnd.randrange(2, 22) + (rnd.randint(-2, 2) if n == 2 else 0); y = rnd.randrange(1, 14) - (2 if n == 2 else 0)
        d.s(x, y, IS[7]); d.s(x + 1, y, IS[5]); d.s(x, y + 1, IS[4])
    return d.im

# ---------------- ungens svans och fossilet ----------------
sys.path.insert(0, '/home/claude/unge2'); _cwd = os.getcwd(); os.chdir('/home/claude/unge2')
_src = open('anim.py').read(); _g = {}
exec(_src[:_src.index('def upp(')], _g); os.chdir(_cwd)
_hsrc = _src[_src.index('def hoger('):_src.index('def upp(')]
def unge_hoger_svans(fas):
    """Ungen åt höger, med svansen och klubban flyttade (fas 1: upp, 2: slår bakåt, 3: träffar)."""
    kl = {1: (3.2, 1.6), 2: (1.6, 9.2), 3: (1.4, 12.5)}[fas]
    sv = {1: [(4, 9, 2), (4, 8, 3), (3, 6, 2), (3, 4, 3)], 2: [(4, 11, 2), (3, 11, 3), (2, 10, 2), (2, 10, 3)], 3: [(4, 12, 2), (3, 12, 3), (2, 12, 2), (2, 13, 3)]}[fas]
    s = _hsrc.replace("def hoger(", "def _h(").replace("d.ellips(2.7,5.4+dk,2.4,2.0,'klubba','klubba')", f"d.ellips({kl[0]},{kl[1]}+dk,2.4,2.0,'klubba','klubba')")
    s = s.replace("for (x,y,t) in [(4,11,2),(3,10,3),(3,9,2),(2,8,3)]: d.satt(x,y+dk,'oliv',t,'svans')", f"for (x,y,t) in {sv}: d.satt(x,y+dk,'oliv',t,'svans')")
    g = dict(_g); exec(s, g)
    return g['_h'](0, 'glad' if fas == 3 else 'oppen', 'oppen' if fas == 2 else 'le', dk=(1 if fas == 2 else 0))

def svans_mask():
    """Ungens svans och klubba ur bilden åt höger, pixel för pixel: (x, y, ton) relativt klubbans mitt."""
    g = dict(_g); s = _hsrc.replace("    d.kontur()", "    return d").replace("def hoger(", "def _m(")
    exec(s, g); d = g['_m']()
    pts = [((x, y), d.px[(x, y)][1]) for (x, y), nm in d.del_.items() if nm in ('svans', 'klubba')]
    return pts

def fossil(d, ox, oy, typ):
    """Fossilet i stenen. 'klubba' är ungens svans exakt; 'taggar' en annan svans med taggar och utan klubba."""
    if typ == 'klubba':
        # ungens svans och klubba, pixel för pixel, i dubbel storlek så att formen syns i rummet
        m = svans_mask(); x0 = min(x for (x, y), _ in m); y0 = min(y for (x, y), _ in m)
        cel = set()
        for (x, y), ton in m:
            for a in (0, 1):
                for b in (0, 1):
                    X, Y = ox + (x - x0) * 2 + a, oy + (y - y0) * 2 + b; cel.add((X, Y))
                    d.s(X, Y, BEN[3] if ton <= 1 else BEN[2] if ton <= 2 else BEN[1])
        for (X, Y) in cel:                                             # konturen runt fossilet
            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (X + a, Y + b) not in cel: d.s(X + a, Y + b, BEN[0])
    else:
        pts = [(0, 12), (3, 10), (6, 9), (9, 8), (12, 8), (15, 9), (18, 11)]   # en annan svans: lång, med taggar, ingen klubba
        for (a, b) in zip(pts, pts[1:]): d.linje(ox + a[0], oy + a[1], ox + b[0], oy + b[1], BEN[2], 2)
        for (x, y) in pts[1:-1]: d.s(ox + x, oy + y - 1, BEN[2]); d.s(ox + x, oy + y - 2, BEN[3]); d.s(ox + x, oy + y - 3, BEN[3])
        for (a, b) in zip(pts, pts[1:]): d.linje(ox + a[0], oy + a[1] + 2, ox + b[0], oy + b[1] + 2, BEN[0])

def sten(typ, n=1):
    d = Bild(40, 32); rnd = random.Random({'varm_slat': 1, 'varm_taggsvans': 2, 'kall_klubbsvans': 3, 'varm_klubbsvans': 4}.get(typ, 5))
    if typ == 'hal':
        for x in range(40):                                            # snön som är undanskuffad runt hålet
            for y in range(32):
                u = (x - 20) / 18; v = (y - 20) / 9
                if u * u + v * v <= 1: d.s(x, y, SNO[2] if u + v < 0 else SNO[1])
        d.ell(20, 21, 12, 5.5, STEN[0], None, None); d.ell(20, 22, 9, 3.5, '#1a1a20')
        for x in range(9, 32, 4): d.s(x, 16, SNO[3])
        for (x, y) in ((6, 22), (8, 26), (33, 20), (31, 26), (12, 15), (28, 15), (35, 23)):   # grus som blocket drog med sig
            d.ell(x, y, 1.5, 1.2, STEN[2], STEN[3], STEN[1])
        d.kontur('#3e4a6a')
        for t in range(16):                                            # baronens orange rep ligger kvar vid kanten
            x = 22 + t; y = 25 + int(2 * math.sin(t / 2.5))
            d.s(x, y, OR[1] if (t // 2) % 2 else OR[0]); d.s(x, y + 1, OR[0])
        d.s(38, 26, OR[1]); d.s(38, 27, OR[0]); d.s(39, 27, OR[1])
        return d.im
    varm = typ.startswith('varm')
    if varm:                                                           # smält snö: mörk våt mark runt
        d.ell(20, 27, 19, 4.5, '#4a4450', None, None); d.ell(20, 27, 16, 3, '#5a4a36')
    else:
        d.ell(20, 27, 19, 4.5, SNO[1], SNO[2], SNO[0])
    for y in range(4, 29):                                             # stenen
        for x in range(3, 37):
            u = (x - 20) / 17; v = (y - 17) / 12
            if u * u + v * v <= 1 and not (y > 26 and abs(u) > 0.7):
                c = STEN[2] if u + v < 0 else STEN[1]
                if u + v < -0.85: c = STEN[3]
                if v > 0.6: c = STEN[0] if (x + y) % 2 else STEN[1]
                d.s(x, y, c)
    if typ.endswith('klubbsvans'): fossil(d, 12, 9, 'klubba')
    if typ.endswith('taggsvans'): fossil(d, 10, 8, 'taggar')
    if varm:
        for (x, y) in ((8, 14), (30, 18), (14, 24)): d.s(x, y, '#c8453a')  # små glödande sprickor
    if typ == 'kall_klubbsvans':                                       # frost: rimfrost över stenen, kristaller och istappar
        rf = random.Random(17)
        for y in range(4, 29):
            for x in range(3, 37):
                if not d.g(x, y): continue
                c = d.p[x, y][:3]
                if c in (hx(BEN[0]), hx(BEN[1]), hx(BEN[2]), hx(BEN[3])):
                    if (x + 2 * y) % 5 == 0: d.s(x, y, IS[7])      # tunn is över fossilet, det syns igenom
                    continue
                r = rf.random()
                if r < 0.45: d.s(x, y, '#b4c4e6' if c == hx(STEN[1]) or c == hx(STEN[0]) else IS[6])
                elif r < 0.55: d.s(x, y, IS[7])
        for x in range(6, 34): d.s(x, 5 + int(2 * math.sin(x / 3)), SNO[3]); d.s(x, 6 + int(2 * math.sin(x / 3)), SNO[2])
        for x in (8, 13, 19, 25, 30): d.linje(x, 26, x, 28 + (x % 3), IS[6]); d.s(x, 29 + (x % 3), IS[7])   # istappar
        for (cx, cy) in ((7, 12), (31, 10), (34, 19), (5, 20), (20, 4)):    # frostkristaller i kanten
            for (a, b) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)): d.s(cx + a, cy + b, '#ffffff' if (a, b) == (0, 0) else IS[7])
    d.kontur()
    if varm:                                                           # ångan, två bilder
        for k in range(3):
            for j in range(2):
                x = 11 + k * 9 + (1 if (j + n + k) % 2 else -1); y = 5 - j * 3 - (1 if n == 2 else 0)
                for (a, b) in ((0, 0), (1, 0), (0, -1), (1, -1), (-1, 0)):
                    if y + b >= 0 and not d.g(x + a, y + b): d.s(x + a, y + b, ANGA[j + (1 if (a + b) % 2 else 0)])
    return d.im

def vante(med_bit=False):
    d = Bild(16, 12)
    R = ('#7a1a18', '#a02828', '#c8453a', '#e8908a')
    d.ell(9, 7, 6.5, 4.2, R[2], R[3], R[1], R[1])                      # handen
    d.ell(3.5, 5.5, 2.2, 1.8, R[2], R[3], R[1])                        # tummen
    for x in range(4, 15, 2): d.s(x, 7, '#f2e8c8')                       # det stickade mönstret
    for x in range(5, 15, 2): d.s(x, 6, R[1])
    d.rk(13, 4, 3, 7, '#f2e8c8'); d.rk(14, 4, 1, 7, '#d6cfa4')          # muddens kant
    if med_bit:
        for y in range(1, 6):
            for x in range(9, 15):
                if x - 9 + (5 - y) < 8: d.s(x, y, '#f2e8c8' if (x + y) % 5 else '#d6cfa4')
        d.s(11, 3, '#c8453a'); d.s(12, 2, '#c8453a'); d.s(13, 1, '#a08a6e')
    return d.kontur().im

_cache = {}
def las(im):
    """Varje synlig pixel till närmaste färg i masterpaletten; halvgenomskinligt blir helt genomskinligt."""
    im = im.convert('RGBA'); q = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = q[x, y]
            if a < 128: q[x, y] = (0, 0, 0, 0); continue
            k = '#%02x%02x%02x' % (r, g, b)
            if k not in _cache: _cache[k] = hx(P.narmast(k)[0])
            q[x, y] = _cache[k] + (255,)
    return im
def spara(rel, im):
    os.makedirs(os.path.dirname(f'{UT}/{rel}.png'), exist_ok=True); P.las_bild(las(im), rel).save(f'{UT}/{rel}.png')

if __name__ == '__main__':
    F = 'foremal/berg/'; n = 0
    for k in (1, 2):
        spara(F + f'snomassa_0{k}', snomassa(k)); spara(F + f'snomassa_rasar_0{k}', snomassa(k, True)); spara(F + f'snomoln_0{k}', snomoln(k))
        spara(F + f'block_slits_0{k}', block_slits(k)); spara(F + f'isflak_gungar_0{k}', isflak('gungar', k))
        spara(F + f'isflak_kant_0{k}', isflak('kant', k)); spara(F + f'vak_0{k}', vak(k)); spara(F + f'is_splitter_0{k}', is_splitter(k))
        spara(F + f'isvagg_rasar_0{k}', isvagg('rasar', k))
        for t in ('varm_slat', 'varm_taggsvans', 'varm_klubbsvans'): spara(F + f'sten_{t}_0{k}', sten(t, k))
        n += 12
    for k in (1, 2, 3): spara(F + f'isflak_sjunker_0{k}', isflak('sjunker', k))
    for rel, fn in ((F + 'mynning_igenrasad', mynning_igenrasad), (F + 'block_hanger', block_hanger), (F + 'rep_orange', rep_orange),
                    (F + 'block_driva', block_driva), (F + 'isflak', isflak), (F + 'isflak_spricka', lambda: isflak('spricka')),
                    (F + 'isvagg_spricka', lambda: isvagg('spricka')), (F + 'sten_kall_klubbsvans', lambda: sten('kall_klubbsvans')),
                    (F + 'sten_hal', lambda: sten('hal')), (F + 'vante', vante), (F + 'vante_kartbit', lambda: vante(True))):
        spara(rel, fn())
    for k in (1, 2, 3):
        im = unge_hoger_svans(k); spara(f'figurer/unge/unge1_svansslag_hoger_0{k}', im)
        spara(f'figurer/unge/unge1_svansslag_vanster_0{k}', im.transpose(Image.Transpose.FLIP_LEFT_RIGHT))
    # STOR SKÖLD: samma bubbla som SKÖLD i kapitel 3, större (k3/ankare_skold.py)
    _a = open('/home/claude/k3/ankare_skold.py').read(); ga = {'__name__': 'x'}; os.chdir('/home/claude/k3'); sys.path[:0] = ['/home/claude/k3', '/home/claude/bybor']
    exec(_a[:_a.rindex("if __name__ == '__main__':")], ga); os.chdir(_cwd)
    spara('figurer/effekter/skold_stor_tands_01', ga['skold_tands'](1).resize((112, 72), Image.NEAREST) if False else ga['bubbla'](112, 72, 0.15, 1))
    spara('figurer/effekter/skold_stor_tands_02', ga['bubbla'](112, 72, 0.55, 2))
    spara('figurer/effekter/skold_stor_tands_03', ga['bubbla'](112, 72, 1.0, 3))
    for k in (1, 2): spara(f'figurer/effekter/skold_stor_bubbla_0{k}', ga['bubbla'](112, 72, 1.0, 3 + k))
    print('klart')
