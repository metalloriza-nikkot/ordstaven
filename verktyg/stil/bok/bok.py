# Farfars expeditionsbok (prologen s16, sagan): fyra uppslag, en bild per uppslag (110 x 70).
# Akvarell i pixel på gulnat papper (stilguiden §1): tunna laveringar med mörkare kant där färgen torkat,
# papperet syns i kanterna, och figurerna är spelets figurer i en ljusare ton.
# Uppslag 3 och 4 planterar Farfars del (granskningen C 27, 06 §2): dinon i Farfars gamla bild har samma
# mönster på nosen som ungen får i k1s13 (ljus mint, unge2/anim.py MONSTER). Mönstret står i full färg.
# Bilderna har inga ord (bildtexten står i Lexend under bilden). Allt läses till paletten i slutet.
import os, sys, math, random
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__))
exec(open('/home/claude/farfar/pix.py').read())
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
MAT.update({
 'hud': ['#16341E', '#3E7A52', '#5E9E70', '#84BE90', '#B8DEB8'],
 'kofta': ['#2A1A10', '#5A3C26', '#7A5638', '#9C7450', '#C49A72'],
 'mass': ['#4A3410', '#8E6A22', '#C8963E', '#E6BC66', '#FBE2A0'],
 'har': ['#2A1A10', '#4A2E1A', '#6E4426', '#8E5E36', '#B07E50'],
 'byxa': ['#1E2E3A', '#2E4A5A', '#3E627A', '#5A7E96', '#8AA8BA'],
 'agg': ['#7A6A4A', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFF8E8'],
})
def skilj(d, fram, bak, ton=0):
    for (x, y), nm in list(d.del_.items()):
        if nm == bak:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if d.del_.get((x + dx, y + dy)) == fram:
                    m, t = d.px[(x, y)]; d.px[(x, y)] = (m, ton); break
OGA = '#10241A'; GLAS = '#C8963E'; MUN = '#3A1A14'; ROS = '#E8909A'
MONSTER = '#A6E3CF'; MONSTER2 = '#E8FFF6'      # samma som ungens (unge2/anim.py)
W, H = 110, 70
BAYER = [[0.125, 0.625], [0.875, 0.375]]
PAPPER = '#F2E8C8'; PAPPER2 = '#E6D6A8'; FLACK = '#D6C08A'; BLACK = '#5A3A1E'

def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def hexa(c): return '#%02x%02x%02x' % tuple(c[:3])
def blanda(a, b, t):
    a, b = rgb(a), rgb(b); return hexa(tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3)))

class Sida:
    """En bild i boken: papper, laveringar och figurer. px[(x,y)] = hex."""
    def __init__(s, fro):
        s.r = random.Random(fro); s.px = {}; s.las = set()   # las: pixlar som inte tvättas (mönstret, ögon)
        for y in range(H):
            for x in range(W): s.px[(x, y)] = PAPPER
        for _ in range(5):                                    # gamla fläckar i papperet
            cx, cy, r = s.r.randint(0, W), s.r.randint(0, H), s.r.randint(3, 8)
            for y in range(H):
                for x in range(W):
                    if (x - cx) ** 2 + (y - cy) ** 2 < r * r and s.r.random() < 0.5: s.px[(x, y)] = PAPPER2
        # målningens yta: en ojämn kant, som där penseln slutade
        s.kant = {}
        for x in range(W): s.kant[('t', x)] = 4 + round(1.3 * math.sin(x * 0.31 + fro) + s.r.choice((0, 0, 1)))
        for x in range(W): s.kant[('b', x)] = H - 5 - round(1.3 * math.sin(x * 0.27 + 2 * fro) + s.r.choice((0, 0, 1)))
        for y in range(H): s.kant[('v', y)] = 4 + round(1.2 * math.sin(y * 0.41 + fro) + s.r.choice((0, 0, 1)))
        for y in range(H): s.kant[('h', y)] = W - 5 - round(1.2 * math.sin(y * 0.37 + 3 * fro) + s.r.choice((0, 0, 1)))
    def inne(s, x, y):
        return s.kant[('t', x)] <= y <= s.kant[('b', x)] and s.kant[('v', y)] <= x <= s.kant[('h', y)]
    def lavera(s, mask, farg, kant=0.22, korn=0.0, kantfarg=None):
        """En lavering: färgen i masken, en mörkare kant där färgen torkat, och lite korn."""
        omr = {(x, y) for y in range(H) for x in range(W) if s.inne(x, y) and mask(x, y)}
        mork = kantfarg or blanda(farg, BLACK, kant)
        for (x, y) in omr:
            rand = any((x + dx, y + dy) not in omr for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if (x, y) in s.las: continue
            c = mork if rand else farg
            if korn and not rand and s.r.random() < korn: c = blanda(farg, BLACK, 0.12)
            s.px[(x, y)] = c
    def dimma(s, mask, t=0.6, farg='#FAFAF4'):
        for y in range(H):
            for x in range(W):
                if s.inne(x, y) and mask(x, y) and (x, y) not in s.las:
                    tt = t(x, y) if callable(t) else t
                    tt = min(1, max(0, tt)) * 3; steg = int(tt); rest = tt - steg
                    if rest > BAYER[y % 2][x % 2]: steg += 1
                    if steg > 0: s.px[(x, y)] = blanda(s.px[(x, y)], farg, steg / 3)
    def figur(s, im, ox, oy, ljus=0.16, las=()):
        """Spelets figur, lite ljusare (tvättad), med konturen i figurens egen färg dragen mot bläcket."""
        p = im.convert('RGBA').load(); fyllt = {(x, y) for y in range(im.height) for x in range(im.width) if p[x, y][3]}
        for (x, y) in fyllt:
            c = hexa(p[x, y]); X, Y = ox + x, oy + y
            if not (0 <= X < W and 0 <= Y < H): continue
            if c.lower() in las: s.px[(X, Y)] = c; s.las.add((X, Y)); continue
            rand = any((x + dx, y + dy) not in fyllt for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            s.px[(X, Y)] = blanda(c, BLACK, 0.25) if rand else blanda(c, PAPPER, ljus)
    def bild(s):
        im = Image.new('RGBA', (W, H)); p = im.load()
        for (x, y), c in s.px.items(): p[x, y] = rgb(c) + (255,)
        return P.las_bild(snappa(im), 'bok')

def snappa(im):
    """Laveringarna blandar färger: varje färg tas till palettens närmaste (som kartan, karta.py pf)."""
    p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            h = P.narmast(hexa(p[x, y]))[0]; p[x, y] = rgb(h) + (255,)
    return im

# ---------- figurerna ----------
def farfar_liten(stav=True):
    """Farfar som pojke, framifrån: brunt hår, runda glasögon i mässing, salviagrön hud, brun kofta och kompassen."""
    d = Duk(20, 26)
    for cx in (8.0, 12.0): d.ellips(cx, 24.0, 1.8, 1.1, 'kofta', 'sko', toner=(0, 1, 1, 2))
    for cx in (8.0, 12.0): d.ellips(cx, 21.6, 1.4, 1.8, 'byxa', 'ben', toner=(0, 1, 2, 2))
    d.ellips(10, 19.2, 3.6, 1.8, 'byxa', 'byxor')
    for cx in (5.6, 14.4): d.ellips(cx, 16.2, 1.2, 2.2, 'kofta', 'arm')
    d.ellips(5.6, 18.4, 1.0, 0.9, 'hud', 'hand'); d.ellips(14.4, 13.6 if stav else 18.4, 1.0, 0.9, 'hud', 'hand')
    d.ellips(10, 16.4, 4.0, 3.2, 'kofta', 'kropp')
    d.ellips(10, 8.2, 6.4, 6.0, 'hud', 'huvud', zbias=0.05)
    d.ellips(10, 4.2, 6.0, 3.2, 'har', 'har', zbias=0.1, klipp=lambda x, y: y < 6 or (y < 7 and x in (5, 6, 12, 13)))
    for cx in (4.2, 15.8): d.ellips(cx, 6.6, 0.9, 1.6, 'har', 'harsida')
    skilj(d, 'kropp', 'arm', ton=1); skilj(d, 'har', 'huvud', ton=1)
    d.kontur()
    for x in (6, 9, 11, 14): d.fast(x, 8, GLAS)               # glasögonen som Farfars spelfigur: mässing runt ögonen
    for x in (7, 8, 12, 13): d.fast(x, 8, GLAS); d.fast(x, 9, GLAS)
    for x in (7, 13): d.fast(x, 8, OGA); d.fast(x, 9, OGA)
    for x in (8, 12): d.fast(x, 8, '#FFFFFF'); d.fast(x, 9, OGA)
    for x in (10,): d.fast(x, 8, GLAS)
    for (x, y) in [(9, 12), (10, 12), (11, 12), (8, 11), (12, 11)]: d.fast(x, y, MUN)   # glad mun
    d.fast(5, 10, ROS); d.fast(15, 10, ROS)
    d.fast(10, 16, GLAS); d.fast(10, 17, '#C83A3A')            # kompassen
    for (x, y) in [(8, 14), (9, 15), (11, 15), (12, 14)]: d.fast(x, y, GLAS)
    return d.bild()

def stav_upp(s, x, y):
    """Ordstaven i pojkens hand, den kalla änden upp (stilguiden §5). Inget guld: det betyder rätt svar."""
    kall = ['#F2A0C0', '#7A3AA8', '#3A7AD8', '#6EC6E6']; varm = ['#8CCB4A', '#F2D22E', '#F08A2A', '#D83A2E']
    for i in range(17):
        yy = y + i
        if i < 4: c = kall[i]
        elif i > 12: c = varm[i - 13]
        else: c = '#1C1A20'
        s.px[(x, yy)] = c; s.las.add((x, yy))
        s.px[(x + 1, yy)] = c if (i < 4 or i > 12) else ('#6A6876' if i % 4 == 1 else '#1C1A20'); s.las.add((x + 1, yy))
    s.px[(x - 1, y + 8)] = '#1C1A20'; s.las.add((x - 1, y + 8))   # knölen

def prickar(d, pts, stor=True):
    """Nosmönstret: tre prickar i rad längs nosryggen (ungens tre pixlar, unge2/anim.py), mint med ljus kärna."""
    for (x, y) in pts:
        if stor:
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)): d.fast(x + dx, y + dy, MONSTER)
            d.fast(x, y, MONSTER2)
        else: d.fast(x, y, MONSTER)

def unge_mor_liten():
    """Mamma som liten, från sidan och vänd åt vänster: ungens form i 1,4 gånger storleken, så att mönstret syns."""
    d = Duk(36, 30); k = 1.4
    def E(cx, cy, rx, ry, m, n, **kw): d.ellips(36 - cx * k, cy * k, rx * k, ry * k, m, n, **kw)
    ben = [(6.0, 'b'), (8.8, 'n'), (13.4, 'b'), (16.4, 'n')]
    E(2.7, 5.4, 2.4, 2.0, 'klubba', 'klubba')
    for cx, s_ in ben:
        if s_ == 'b': E(cx, 17.6, 1.6, 2.4, 'oliv', 'benb', toner=(0, 1, 1, 2)); E(cx + 0.3, 19.8, 1.4, 1.0, 'bla', 'fotb', toner=(0, 1, 2, 2))
    E(11.6, 13.6, 7.0, 4.6, 'oliv', 'kropp')
    for (x, y) in [(4.4, 11), (3.6, 10), (3.0, 9), (2.4, 8), (2.2, 7)]: E(x, y, 0.8, 0.8, 'oliv', 'svans')
    E(10.8, 10.4, 6.8, 3.6, 'gra', 'rygg', platt=0.6, zbias=-0.2)
    for cx, s_ in ben:
        if s_ == 'n': E(cx, 17.8, 1.8, 2.4, 'oliv', 'ben'); E(cx + 0.4, 20.1, 1.6, 1.1, 'bla', 'fot')
    E(17.6, 12.0, 5.4, 4.9, 'huvud', 'huvud', zbias=0.05)
    E(21.0, 13.8, 2.6, 1.7, 'huvud', 'nos', toner=(2, 3, 3, 4), zbias=0.2)
    skilj(d, 'huvud', 'kropp'); skilj(d, 'huvud', 'rygg', ton=1); skilj(d, 'rygg', 'kropp', ton=1); skilj(d, 'ben', 'kropp', ton=1)
    d.kontur()
    for i in range(6): x = 36 - int((7 + 2 * i) * k); y = int(9.6 * k) - (1 if i in (2, 3) else 0); d.satt(x, y, 'gra', 4); d.satt(x, y + 1, 'gra', 3)
    for (x, y) in [(27, 19), (27, 20), (22, 20), (22, 21), (17, 20), (17, 21)]: d.satt(x, y, 'oliv', 1)
    # ögat: stort och mörkt med glans
    for dy in range(4):
        for dx in range(3): d.fast(9 + dx, 14 + dy, '#101C1C')
    d.fast(11, 14, '#FFFFFF'); d.fast(10, 14, '#FFFFFF'); d.fast(9, 17, '#9FD3DC')
    for (x, y) in [(3, 21), (4, 21), (5, 21), (6, 20)]: d.fast(x, y, MUN)
    d.fast(11, 20, ROS); d.fast(12, 20, ROS)
    prickar(d, [(2, 17), (4, 16), (6, 16)])
    return d.bild()

def mor_vuxen():
    """Mamma som vuxen (beslut 76.9): en vuxen av ungens art, ankylosaurusinspirerad, från sidan och vänd åt vänster.
    Siluetten är den som kartbitarna visar som skugga och ska kännas igen i finalen: låg bred kropp, en rygg av
    pansar med en rad taggar längs kammen, klubbsvansen högt bakom ryggen, och huvudet lågt fram. Färgerna och
    ansiktet är ungens (grå rygg, oliv, blå fötter, stort mörkt öga och mönstret på nosen), proportionerna en vuxens:
    längre kropp, mindre huvud, tjockare ben. Hon sänker nosen mot ägget."""
    k = 2.15; B_, H_ = 62, 45
    d = Duk(B_, H_)
    def E(cx, cy, rx, ry, m, n, **kw): d.ellips(B_ - cx * k, cy * k, rx * k, ry * k, m, n, **kw)
    ben = [(6.4, 'b'), (9.4, 'n'), (15.0, 'b'), (17.8, 'n')]
    # svansen: från bakdelen uppåt bakåt, och klubban högt (som skuggan på kartbit 1)
    E(1.9, 4.6, 2.5, 2.0, 'klubba', 'klubba')
    for (x, y, r) in [(4.6, 11.4, 1.3), (3.8, 10.2, 1.1), (3.2, 8.9, 1.0), (2.7, 7.6, 0.9), (2.3, 6.4, 0.8)]: E(x, y, r, r, 'oliv', 'svans')
    for cx, s_ in ben:
        if s_ == 'b': E(cx, 17.4, 1.9, 2.3, 'oliv', 'benb', toner=(0, 1, 1, 2)); E(cx + 0.3, 19.4, 1.7, 0.9, 'bla', 'fotb', toner=(0, 1, 2, 2))
    E(12.2, 14.0, 8.6, 4.4, 'oliv', 'kropp')
    # taggarna längs kammen, före ryggen så att ryggen täcker deras fot
    for x in (5.6, 7.6, 9.6, 11.6, 13.6, 15.6, 17.4):
        top = 10.6 - 3.7 * math.sqrt(max(0.0, 1 - ((x - 11.6) / 8.4) ** 2))
        E(x, top - 0.5, 0.55, 1.0, 'gra', 'tagg', toner=(1, 2, 3, 4), zbias=-0.1)
    E(11.6, 10.8, 8.4, 3.7, 'gra', 'rygg', platt=0.6, zbias=-0.2)
    for cx, s_ in ben:
        if s_ == 'n': E(cx, 17.6, 2.1, 2.3, 'oliv', 'ben'); E(cx + 0.4, 19.6, 1.9, 1.0, 'bla', 'fot')
    E(20.4, 14.6, 4.3, 3.9, 'huvud', 'huvud', zbias=0.05)
    E(23.4, 16.6, 2.4, 1.6, 'huvud', 'nos', toner=(2, 3, 3, 4), zbias=0.2)
    skilj(d, 'huvud', 'kropp'); skilj(d, 'huvud', 'rygg', ton=1); skilj(d, 'rygg', 'kropp', ton=1); skilj(d, 'ben', 'kropp', ton=1)
    skilj(d, 'rygg', 'tagg', ton=1)
    d.kontur()
    # pansarplattorna på ryggen: korta ljusa streck i klungor, och ränderna på sidan som ungens
    for i in range(7):
        x = B_ - int((6 + 2.2 * i) * k); y = int(9.8 * k) - (1 if i in (2, 3, 4) else 0)
        d.satt(x, y, 'gra', 4); d.satt(x + 1, y, 'gra', 3); d.satt(x, y + 2, 'gra', 3)
    for (cx, cy) in [(8.2, 15.4), (11.6, 16.0), (15.0, 15.4)]:
        x, y = B_ - int(cx * k), int(cy * k); d.satt(x, y, 'oliv', 1); d.satt(x + 1, y, 'oliv', 1)
    # ögat: mörkt med glans, mindre än ungens (vuxen), och ett milt leende
    ox, oy = B_ - int(20.6 * k), int(13.0 * k)
    for dy in range(3):
        for dx in range(2): d.fast(ox + dx, oy + dy, '#101C1C')
    d.fast(ox, oy, '#FFFFFF'); d.fast(ox + 1, oy + 2, '#9FD3DC')
    mx, my = B_ - int(23.8 * k), int(17.6 * k)
    for (x, y) in [(mx, my), (mx + 1, my + 1), (mx + 2, my + 1), (mx + 3, my)]: d.fast(x, y, MUN)
    d.fast(ox + 3, oy + 4, ROS)
    prickar(d, [(B_ - int(24.6 * k), int(15.4 * k)), (B_ - int(23.2 * k), int(14.8 * k)), (B_ - int(21.8 * k), int(14.6 * k))])
    return d.bild()

def agg(s, cx, cy):
    """Ägget: krämvitt med fläckar i ungens oliv."""
    d = Duk(12, 14); d.ellips(6, 7.4, 4.8, 6.0, 'agg', 'agg', zbias=0.1); d.kontur()
    for (x, y) in [(4, 5), (7, 4), (5, 9), (8, 8), (6, 11)]: d.fast(x, y, '#A3B53A')
    s.figur(d.bild(), cx - 6, cy - 7, ljus=0.05)

# ---------- bakgrunderna ----------
def himmel(s, ovan='#BFDCE8', under='#F6E8C8', till=40):
    s.lavera(lambda x, y: y < till, ovan, kant=0.0)
    s.dimma(lambda x, y: y < till, lambda x, y: (y - till * 0.45) / 5, under)   # en kort övergång, sedan platt
def berg(s, bas, hojd, farg, fro, spetsar=3):
    r = random.Random(fro); top = []
    for x in range(W):
        v = bas - hojd * abs(math.sin(x * math.pi * spetsar / W + fro)) - r.choice((0, 0, 1))
        top.append(v)
    s.lavera(lambda x, y: y >= top[x], farg, kant=0.18)
    return top
def solar(s):
    """Tre solar i en båge (briefen §4): stor varmgul, mellanstor vit och liten röd-orange. Syns, sägs aldrig."""
    for (cx, cy, r, c) in [(22, 13, 3.6, '#F2D27A'), (33, 10, 2.4, '#FFFFFF'), (41, 12, 1.5, '#F08A5A')]:
        for y in range(H):
            for x in range(W):
                if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r and s.inne(x, y): s.px[(x, y)] = c

def langhals(s, x0, y0, h, vand=1, farg='#8494A8'):
    """En långhals som skymtar i molnen: halsen i en båge och ett litet huvud."""
    for i in range(h):
        x = x0 + vand * round(2.2 * math.sin(i / h * 1.6)); y = y0 - i
        for dx in (0, 1): s.px[(x + dx, y)] = farg
    hx_ = x0 + vand * round(2.2 * math.sin(1.6)); hy = y0 - h
    for (dx, dy) in ((0, 0), (1, 0), (2 * vand, 0), (3 * vand, 1), (2 * vand, 1), (1, 1), (0, 1)): s.px[(hx_ + dx, hy + dy)] = farg

def moln(s, cx, cy, rx, ry):
    s.lavera(lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + 0.12 * math.sin(x * 0.9), '#FBF8F0', kantfarg='#D8DEE6')

def uppslag_dal():
    """Uppslag 1: berg runt en dal full av moln, där dinosaurierna lever kvar. Tre solar på himlen."""
    s = Sida(1)
    himmel(s); solar(s)
    berg(s, 42, 26, '#A2AECB', 2.0, 3)
    berg(s, 50, 14, '#7E96A8', 0.6, 2)
    langhals(s, 42, 47, 17, 1, '#5E7084'); langhals(s, 68, 48, 13, -1, '#6E8296')
    for (cx, cy, rx, ry) in [(24, 46, 15, 5), (52, 43, 19, 6), (84, 47, 15, 5), (40, 52, 18, 5), (70, 53, 17, 5)]: moln(s, cx, cy, rx, ry)
    s.lavera(lambda x, y: y > 60 - 3 * math.sin(x * 0.08), '#8DB060', korn=0.15)
    return s.bild()

def uppslag_trad():
    """Uppslag 2: Ordträdet i dalen: svart bark och löv i regnbågens färger, som staven (Stils förslag, inte beslutat)."""
    s = Sida(2)
    himmel(s); berg(s, 46, 14, '#A8B4CC', 1.3, 2)
    s.dimma(lambda x, y: 40 < y < 58, lambda x, y: 0.34 - abs(y - 50) * 0.03)
    s.lavera(lambda x, y: y > 58 - 2 * math.sin(x * 0.1), '#9DBB72', korn=0.12)
    # stammen: svart, knölig, smalare upptill, med rötter och blanka streck som stavens
    for y in range(28, 61):
        w = 2 + (y - 28) // 14 + (2 if y > 56 else 0)
        for x in range(55 - w, 56 + w):
            s.px[(x, y)] = '#6A6876' if (x == 55 - w + 1 and 32 < y < 54) else '#1C1A20'
    for (x0, y0, dx, n) in [(53, 34, -1, 13), (57, 32, 1, 14), (54, 29, -1, 8), (56, 28, 1, 8)]:
        for i in range(n):
            s.px[(x0 + dx * i, y0 - i // 2)] = '#1C1A20'; s.px[(x0 + dx * i, y0 - i // 2 + 1)] = '#1C1A20'
    # kronan: klickar av regnbågens färger, varm till vänster och kall till höger, som stavens ändar
    farger = ['#D83A2E', '#F08A2A', '#F2D22E', '#8CCB4A', '#6EC6E6', '#3A7AD8', '#7A3AA8', '#F2A0C0']
    klickar = [(32, 20, 7, 5), (38, 13, 7, 5), (45, 8, 8, 5), (55, 6, 9, 5), (65, 8, 8, 5), (72, 13, 7, 5), (78, 20, 7, 5),
               (42, 20, 7, 5), (55, 16, 9, 6), (68, 20, 7, 5), (49, 24, 6, 4), (62, 24, 6, 4)]
    for (cx, cy, rx, ry) in klickar:
        c = farger[min(7, max(0, int((cx - 30) / 50 * 8)))]
        s.lavera(lambda x, y, cx=cx, cy=cy, rx=rx, ry=ry: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + 0.15 * math.sin(x * 1.3 + y), blanda(c, PAPPER, 0.3), kant=0.3)
    s.dimma(lambda x, y: y > 54, lambda x, y: (y - 54) * 0.08)
    return s.bild()

def uppslag_med_dino():
    """Uppslag 3: Farfar som pojke med staven, och hans vän i dalen, en liten dinosaurie i dimma."""
    s = Sida(3)
    himmel(s, till=44)
    berg(s, 40, 18, '#A4B2CC', 1.1, 2); berg(s, 47, 9, '#86A0A8', 2.4, 3)
    s.dimma(lambda x, y: 38 < y < 54, lambda x, y: 0.5 - abs(y - 46) * 0.06)
    s.lavera(lambda x, y: y > 54 + 3 * math.sin(x * 0.07 + 1) - (4 if 30 < x < 80 else 0), '#9CC266', korn=0.14)
    s.figur(farfar_liten(), 32, 34)
    stav_upp(s, 46, 30)
    s.figur(unge_mor_liten(), 54, 31, las=(MONSTER.lower(), MONSTER2.lower(), '#101c1c', '#ffffff', '#9fd3dc'))
    # dimma kring fötterna
    s.dimma(lambda x, y: y > 57, lambda x, y: 0.15 + (y - 57) * 0.09)
    return s.bild()

def uppslag_far_agg():
    """Uppslag 4: vännen har vuxit. Hela hon syns, med samma siluett som skuggan på kartbitarna (76.9), och hon
    puttar sitt ägg mot pojken med nosen. Mönstret syns på nosen."""
    s = Sida(4)
    himmel(s, '#C8D8EC', '#F6E4C4', 46)
    berg(s, 42, 14, '#A8AECC', 0.3, 2)
    s.dimma(lambda x, y: 36 < y < 56, lambda x, y: 0.5 - abs(y - 46) * 0.06)
    s.lavera(lambda x, y: y > 56 + 2 * math.sin(x * 0.09), '#9CC266', korn=0.14)
    s.figur(farfar_liten(stav=False), 12, 34)
    agg(s, 44, 54)
    s.figur(mor_vuxen(), 42, 14, las=(MONSTER.lower(), MONSTER2.lower(), '#101c1c', '#ffffff', '#9fd3dc'))
    s.dimma(lambda x, y: y > 58, lambda x, y: 0.15 + (y - 58) * 0.09)
    return s.bild()

UPPSLAG = [('dal_i_moln', uppslag_dal), ('ordtradet', uppslag_trad), ('unge_farfar_med_dino', uppslag_med_dino), ('unge_farfar_far_agg', uppslag_far_agg)]
if __name__ == '__main__':
    ut = os.path.join(HAR, 'ut', 'bildkort'); os.makedirs(ut, exist_ok=True)
    bilder = []
    for namn, f in UPPSLAG:
        im = f(); im.save(os.path.join(ut, namn + '.png')); bilder.append(im)
    over = Image.new('RGBA', (W * 4 * 2 + 30, H * 4 * 2 + 30), (200, 191, 174, 255))
    for i, im in enumerate(bilder):
        over.paste(im.resize((W * 4, H * 4), Image.NEAREST), (10 + (i % 2) * (W * 4 + 10), 10 + (i // 2) * (H * 4 + 10)))
    over.save(os.path.join(HAR, 'bok_x4.png'))
    print('klart', [n for n, _ in UPPSLAG])
