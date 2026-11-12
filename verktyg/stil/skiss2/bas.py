# Skissen av kapitel 2 (kedjan i 07, steg 4): verktygen som alla rum delar.
# En skiss visar vad som står var, vad som är vatten och vad som stänger vägen. Den är ritad i spelets storlek
# (16 px rutor, snett uppifrån som i A Link to the Past) men grövre än den riktiga grafiken i steg 5.
# Art directorns regler (beslut 76.7): varmt och ljust är mark man kan gå på, kallt och mörkt är det inte;
# höjder har brant, skugga söderut och österut och synliga trappor; vassen är ett övre lager med en trampad gång.
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
INK = '/home/claude/inkorg'
KART = '/home/claude/ordstaven/kartor/den-gomda-dalen/'

def hx(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
def blanda(a, b, t):
    a, b = hx(a), hx(b); return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def brus(x, y, s=0):
    """Ett fast brus 0..1 per pixel, så att skissen ser likadan ut varje gång."""
    n = (x * 374761393 + y * 668265263 + s * 2246822519) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0

def slat(x, y, skala, s=0):
    """Mjukt brus (bilinjärt mellan punkter med avståndet skala): fläckar i stället för enstaka pixlar."""
    gx, gy = x / skala, y / skala; x0, y0 = int(gx), int(gy); fx, fy = gx - x0, gy - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = brus(x0, y0, s), brus(x0 + 1, y0, s); c, e = brus(x0, y0 + 1, s), brus(x0 + 1, y0 + 1, s)
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy

# ---------- färgerna (masterpaletten, låses i slutet) ----------
GRAS = ['#4E6A2C', '#6A8A36', '#86A444', '#A0B858', '#BCCC72']    # träskets gräs: varmt och ljust, man går på det
STIG = ['#7A5A36', '#A07A4A', '#BE9A62', '#D6B67E', '#E8CC98']    # trampad jord
VATT = ['#1A3458', '#24467A', '#2E5E94', '#4A7EB4', '#8AB8DE']    # vatten: kallt och mörkt
LERA = ['#241C16', '#33281E', '#43362A', '#56483A', '#7E8A8E']    # leran: mörk och blank, den sista är det våta skenet
VASS = ['#16302A', '#1E4436', '#285A44', '#347054', '#4E8A62', '#8A6A3A', '#5A3E24']  # hög vass, kall; kolvarna bruna
TRAMP = ['#8A7440', '#A68E52', '#C0A866', '#D6C07E', '#E6D498']  # trampad vass: halm, varm
TRA = ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260', '#D8B080']
DACK = ['#4A2E16', '#7A5230', '#9A6C40', '#B88850', '#D2A468']   # byns plankor: varma, man går på dem
TAK = ['#1E2A3A', '#2C3E52', '#3A5268', '#4E6A82', '#6E8CA2']    # taken: kalla skifferplattor, högt upp
TAKV = ['#5A4A2A', '#7A6436', '#96804A', '#B09C60', '#CCB87C']   # vasstak (pålhusen), mörkare än marken och med skugga
FASAD = ['#3A2414', '#6A4426', '#8A5E36', '#A87A48', '#C69A62']
MASS = ['#4A3410', '#8E6A22', '#C8963E', '#E6BC66', '#FBE2A0']   # mässing (inte stavens guld)
STEN = ['#3E4148', '#5E636C', '#7E838C', '#9EA3AA', '#C2C6CC']
ROSA = ['#7A2A4E', '#B8467A', '#E07AA6', '#F6B4CE']
BLA = ['#1A2A6A', '#2A4AA8', '#4A72D2', '#8AAAEE']
KULL = ['#6A5E50', '#8A7C68', '#A89A82', '#BCAE94', '#D6CAB0']   # torgets kullersten: varm grå
ORANGE = ['#7A3010', '#C0561A', '#F08A2A', '#FBB860']             # baronens färg
SKUGGA = 0.42                                                       # hur mycket skuggan mörknar

class Duk:
    def __init__(s, B, H):
        s.B, s.H = B, H
        s.im = Image.new('RGBA', (B, H), (0, 0, 0, 255)); s.px = s.im.load()
        s.typ = [[None] * B for _ in range(H)]   # terrängen per pixel
    def inne(s, x, y): return 0 <= x < s.B and 0 <= y < s.H
    def satt(s, x, y, c):
        if s.inne(x, y): s.px[x, y] = hx(c) if isinstance(c, str) else c
    def get(s, x, y): return '#%02x%02x%02x' % s.px[x, y][:3]
    def mark(s, typ, mask):
        """Lägg terräng: mask är en rektangel (x, y, b, h) eller en funktion (x, y) -> bool."""
        if isinstance(mask, tuple):
            x0, y0, b, h = mask
            for y in range(max(0, y0), min(s.H, y0 + h)):
                for x in range(max(0, x0), min(s.B, x0 + b)): s.typ[y][x] = typ
        else:
            for y in range(s.H):
                for x in range(s.B):
                    if mask(x, y): s.typ[y][x] = typ
    def mork(s, x, y, t=SKUGGA, mot='#10182A'):
        if s.inne(x, y): s.satt(x, y, blanda(s.get(x, y), mot, t))
    def ljus(s, x, y, t=0.3, mot='#FFF4D0'):
        if s.inne(x, y): s.satt(x, y, blanda(s.get(x, y), mot, t))
    def rekt(s, x0, y0, b, h, c):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + b): s.satt(x, y, c)
    def ellips(s, cx, cy, rx, ry, c, kant=None):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
                if d <= 1: s.satt(x, y, kant if (kant and d > 0.72) else c)
    def bild(s, im, x, y, spegel=False):
        """Klistra in en figur eller ett föremål med nederkantens mitt på (x, y), som i spelet."""
        if isinstance(im, str): im = Image.open(im).convert('RGBA')
        if spegel: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        s.im.alpha_composite(im, (int(x - im.width // 2), int(y - im.height)))
        s.px = s.im.load()
    def skugga_under(s, cx, cy, rx, ry=None):
        ry = ry or max(1.5, rx * 0.35)
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1: s.mork(x, y, 0.3)

# ---------- terrängen ----------
def rita_terrang(d, seed=1):
    for y in range(d.H):
        for x in range(d.B):
            t = d.typ[y][x] or 'gras'
            r = brus(x, y, seed); r2 = brus(x // 3, y // 3, seed + 7)
            if t == 'gras':
                f = slat(x, y, 9, seed) * 0.7 + slat(x, y, 3, seed + 1) * 0.3
                c = GRAS[2]
                if f < 0.25: c = GRAS[1]
                elif f > 0.7: c = GRAS[3]
                if r > 0.985 and f > 0.5: c = GRAS[4]
                if r < 0.012: c = GRAS[0]
            elif t == 'stig':
                c = STIG[2] if r2 > 0.3 else STIG[3]
                if r > 0.97: c = STIG[4]
                if r < 0.04: c = STIG[1]
            elif t == 'vatten':
                f = slat(x, y, 12, seed + 5)
                c = VATT[2] if f > 0.35 else VATT[1]
                if f > 0.78: c = VATT[3] if (x + y) % 2 else VATT[2]
                if y % 6 == 2 and slat(x, y, 5, seed + 6) > 0.74: c = VATT[3]   # glitter i korta streck
                if y % 6 == 2 and slat(x, y, 5, seed + 6) > 0.86: c = VATT[4]
            elif t == 'lera':
                f = slat(x, y, 6, seed + 9)
                c = LERA[2] if f > 0.45 else LERA[1]
                if f > 0.8: c = LERA[3]
                if slat(x, y, 4, seed + 10) > 0.83 and y % 3 == 0: c = LERA[4]   # det blanka, våta skenet
            elif t == 'tramp':
                c = TRAMP[2]
                if (x + y * 2) % 7 == 0: c = TRAMP[1]                           # nedtrampade strån snett
                if (x + y * 2) % 7 == 1 and r > 0.5: c = TRAMP[3]
                if r > 0.98: c = TRAMP[4]
            elif t == 'vassfalt':
                # vass han kan gå igenom: raka strån i gräsets varma gröna, toppar i halm. Ett övre lager (76.7).
                f = slat(x, y, 7, seed + 12)
                stra = (x + int(f * 3)) % 3
                c = [GRAS[2], GRAS[3], GRAS[1]][stra]
                if (y + x * 3) % 11 < 2: c = TRAMP[3] if f > 0.4 else GRAS[4]
                if r < 0.02: c = GRAS[0]
            elif t == 'dack':
                rad = y // 6; i = y % 6; off = (rad * 23) % 40
                bas = DACK[2] if (rad + (x + off) // 40) % 3 else DACK[3]
                c = DACK[0] if i == 5 else (DACK[4] if i == 0 and bas == DACK[3] else bas)
                if (x + off) % 40 == 0 and i < 5: c = DACK[0]
                if i in (2, 3) and (x + off) % 40 in (3, 36) and brus(x, rad, seed) > 0.3: c = DACK[1]   # spikar
            elif t == 'kullersten':
                # rundade stenar i förskjutna rader, ljus överkant och mörk fog: varmt grå, man går på dem
                rad = y // 5; xx = x + (rad % 2) * 3; i = xx % 6; j = y % 5
                bas = KULL[2] if brus(xx // 6, rad, seed) > 0.35 else KULL[3]
                c = bas
                if j == 0 or i == 0: c = KULL[0]
                elif j == 1 and i in (2, 3, 4): c = KULL[4]
                elif j == 4 or i == 5: c = KULL[1]
            elif t == 'sand':
                c = STIG[3] if r2 > 0.3 else STIG[4]
                if r > 0.97: c = STIG[2]
            else:
                c = '#FF00FF'
            d.satt(x, y, c)
    kanter(d)

def kanter(d):
    """Strandkanten snett uppifrån: där land slutar mot vatten nedanför syns en brant av jord (4 px) med ljus
    vattenlinje under. Mot vatten i sidled en mörk kant, och vattnet ovanför land får en smal ljus kant."""
    T = d.typ
    def t(x, y): return (T[y][x] or 'gras') if d.inne(x, y) else None
    land = ('gras', 'stig', 'sand', 'tramp', 'vassfalt', 'kullersten', 'dack')
    BRANT = [STIG[1], STIG[0], '#4A3218', '#2E1E10']
    for y in range(d.H):
        for x in range(d.B):
            a = t(x, y)
            if a == 'vatten':
                k = next((i for i in range(1, 5) if t(x, y - i) in land), None)
                if k is not None:
                    d.satt(x, y, BRANT[k - 1] if (x + k) % 5 else BRANT[min(3, k)])        # branten, med lodräta ränder
                elif t(x, y - 5) in land: d.satt(x, y, VATT[4])                            # vattnet slår mot branten
                elif t(x, y - 6) in land: d.satt(x, y, VATT[1])
                elif t(x, y + 1) in land: d.satt(x, y, VATT[4])                            # strandkanten nedanför
                elif any(t(x + dx, y) in land for dx in (-1, 1)): d.satt(x, y, VATT[3])
                elif any(t(x + dx, y) in land for dx in (-2, 2, -3, 3)) and (x + y) % 2: d.satt(x, y, VATT[1])
            elif a in land:
                if t(x + 1, y) == 'vatten' or t(x - 1, y) == 'vatten': d.satt(x, y, '#3A2818')
                elif (t(x + 2, y) == 'vatten' or t(x - 2, y) == 'vatten'): d.satt(x, y, STIG[1])
                if t(x, y - 1) == 'vatten': d.satt(x, y, STIG[3])                         # sandkant mot vattnet ovanför
                if a == 'gras' and any(t(x + dx, y + dy) == 'stig' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) and brus(x, y, 3) > 0.45:
                    d.satt(x, y, GRAS[1])
            elif a == 'lera':
                if t(x, y - 1) not in (None, 'lera'): d.satt(x, y, LERA[0])                # kanten: leran ligger lägre
                elif t(x, y - 2) not in (None, 'lera') or t(x, y - 3) not in (None, 'lera'): d.satt(x, y, blanda(LERA[0], LERA[1], 0.5))
                elif any(t(x + dx, y + dy) not in (None, 'lera') for dx, dy in ((1, 0), (-1, 0), (0, 1))): d.satt(x, y, LERA[1])
                if t(x, y + 1) not in (None, 'lera'): d.satt(x, y, LERA[3])                 # ljus läpp nedtill

def rundrekt(x0, y0, b, h, r=4):
    """En rektangel med rundade hörn: kanten följer kollisionen (det han ser är det han går på)."""
    def m(x, y):
        if not (x0 <= x < x0 + b and y0 <= y < y0 + h): return False
        cx = min(max(x + 0.5, x0 + r), x0 + b - r); cy = min(max(y + 0.5, y0 + r), y0 + h - r)
        return (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
    return m

def pensel(d, typ, punkter, bredd):
    """Markera terräng längs en bruten linje (stigar), med rundade ändar och lite ojämn kant."""
    def m(x, y):
        for (ax, ay), (bx, by) in zip(punkter, punkter[1:]):
            vx, vy = bx - ax, by - ay; L2 = vx * vx + vy * vy or 1
            t = max(0, min(1, ((x - ax) * vx + (y - ay) * vy) / L2))
            if math.hypot(x - ax - t * vx, y - ay - t * vy) < bredd / 2 + 1.5 * math.sin(x * 0.13 + y * 0.11): return True
        return False
    xs = [p[0] for p in punkter]; ys = [p[1] for p in punkter]
    for y in range(max(0, min(ys) - bredd), min(d.H, max(ys) + bredd)):
        for x in range(max(0, min(xs) - bredd), min(d.B, max(xs) + bredd)):
            if m(x, y): d.typ[y][x] = typ

def gras_tuvor(d, n, seed=3, typ='gras'):
    rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.randrange(d.B), rnd.randrange(d.H)
        if d.typ[y][x] not in (None, typ): continue
        for k in range(3):
            xx = x + k * 2 - 2; h = 3 if k == 1 else 2
            for i in range(h): d.satt(xx, y - i, GRAS[1] if i < h - 1 else GRAS[4])

# ---------- vassen ----------
def hog_vass(d, x0, y0, b, h, seed=5, kolvar=True, kant_ned=True):
    """Hög vass som stänger vägen: tät, kall och mörk, strån som lutar, kolvar överst. Ritas ovanpå marken.
    Nederkanten är en rad strån som sticker ned, så att man ser att den står upp."""
    rnd = random.Random(seed)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            r = brus(x, y // 2, seed)
            stra = (x + (y // 6) % 3) % 3
            c = [VASS[1], VASS[2], VASS[3]][stra]
            if r > 0.88: c = VASS[4]
            if r < 0.08: c = VASS[0]
            if y - y0 < 3 and r > 0.5: c = VASS[4]
            d.satt(x, y, c)
    if kant_ned:
        for x in range(x0, x0 + b):
            n = 2 + int(brus(x, 9, seed) * 4)
            for i in range(n):
                d.satt(x, y0 + h + i, VASS[2] if i < n - 1 else VASS[0])
            d.mork(x, y0 + h + n, 0.35); d.mork(x, y0 + h + n + 1, 0.2)
    if kolvar:
        for _ in range(b * h // 70):
            x = rnd.randrange(x0 + 1, x0 + b - 1); y = rnd.randrange(y0 + 2, y0 + h - 4)
            for i in range(3): d.satt(x, y + i, VASS[5] if i < 2 else VASS[6])
            d.satt(x, y - 1, VASS[3])

def vass_tuss(d, cx, by, b=14, h=16, seed=0, huggen=False):
    """En tuss hög vass (en ruta), som vassväggen huggs i (75.3). Huggen: bara stubbar och några strån på marken."""
    if huggen:
        for x in range(cx - b // 2, cx + b // 2):
            if (x + seed) % 2 == 0: d.satt(x, by - 1, VASS[5]); d.satt(x, by - 2, VASS[3])
        for k in range(4):
            x = cx - 5 + k * 3
            for i in range(4): d.satt(x + i, by + 1 - (k % 2), TRAMP[3])
        return
    d.skugga_under(cx + 2, by, b * 0.55, 2.5)
    for k in range(b):
        x = cx - b // 2 + k
        top = by - h + int(abs(k - b / 2) * 0.7) + int(brus(x, seed, 4) * 3)
        luta = (k - b / 2) / b
        for y in range(top, by):
            xx = x + int(luta * (by - y) * 0.25)
            c = [VASS[1], VASS[2], VASS[3]][(k + seed) % 3]
            if y - top < 2: c = VASS[4]
            if k in (0, b - 1): c = VASS[0]
            d.satt(xx, y, c)
    x = cx - 2 + seed % 4
    for i in range(3): d.satt(x, by - h + 2 + i, VASS[5] if i < 2 else VASS[6])

# ---------- byn ----------
def runt_fonster(d, cx, cy, r=3, natt=False):
    """Byns runda fönster med mässingsram (byggspråket, 76.7)."""
    for y in range(cy - r - 1, cy + r + 2):
        for x in range(cx - r - 1, cx + r + 2):
            dd = (x + 0.5 - cx - 0.5) ** 2 + (y + 0.5 - cy - 0.5) ** 2
            if dd <= (r + 0.9) ** 2:
                if dd > (r - 0.3) ** 2: d.satt(x, y, MASS[2] if (x + y) % 3 else MASS[3])
                else: d.satt(x, y, '#F2C860' if natt else ('#9AC8E6' if y < cy else '#4A7AA8'))
    if not natt: d.satt(cx - 1, cy - 1, '#E8F6FF')

def hus(d, x0, y0, b, h, dorrar=(), tak='skiffer', fasad_h=18, fonster=None, mast=False, natt=False, palar=False, skorsten=False):
    """Ett hus snett uppifrån som i A Link to the Past: ett sadeltak med nocken i öst–väst (den bakre sluttningen
    smal och ljus, den främre bred), takfoten som skjuter ut och kastar skugga på fasaden, gavlarna som syns i
    kanterna, fasaden längst ned med runda fönster och dörren, och skugga söderut och österut (höjdkitet, 76.6).
    dorrar: [(x, färg-ramp)] i rummets x."""
    T = TAK if tak == 'skiffer' else TAKV
    th = h - fasad_h; bak = max(3, th // 3)
    for y in range(y0 + 6, y0 + h + 7):                                   # skuggan söder och öster om huset
        for x in range(x0 + 6, x0 + b + 7):
            if (x >= x0 + b or y >= y0 + h) and d.inne(x, y): d.mork(x, y, 0.38)
    for y in range(y0, y0 + th):
        for x in range(x0, x0 + b):
            yy = y - y0
            if yy < bak:                                                   # bakre sluttningen: ljus, i solen
                c = T[4] if yy < bak - 1 else T[3]
                if tak == 'vass' and (x + yy) % 4 == 0: c = T[3]
            else:                                                          # främre sluttningen: rader, mörkare nedåt
                rad = (yy - bak) // 4; i = (yy - bak) % 4
                ned = (yy - bak) / max(1, th - bak)
                k = 3 if ned < 0.35 else (2 if ned < 0.75 else 1)
                c = T[k]
                if i == 3: c = T[k - 1]
                if tak == 'skiffer' and (x + rad * 4) % 7 == 0 and i < 3: c = T[k - 1]
                if tak == 'vass' and (x * 3 + yy) % 5 == 0: c = T[k - 1]
            # valmat tak: sidornas sluttningar syns som trianglar, den västra i solen och den östra i skugga
            hw = min(b * 0.28, th * 0.7)
            sida = hw * (yy / bak) if yy < bak else hw * (1 - (yy - bak) / max(1, th - bak))
            if x - x0 < sida: c = T[4] if (x + yy) % 3 else T[3]
            elif x0 + b - 1 - x < sida: c = T[1] if (x + yy) % 3 else T[0]
            elif x - x0 < sida + 1 or x0 + b - 1 - x < sida + 1: c = T[0]           # gratet mellan sluttningarna
            d.satt(x, y, c)
    hw = min(b * 0.28, th * 0.7)
    for x in range(int(x0 + hw), int(x0 + b - hw)):
        d.satt(x, y0 + bak, T[4] if x % 2 else '#FFF4D0' if tak == 'skiffer' else T[4])   # nocken
    for x in range(x0, x0 + b):
        d.satt(x, y0 + th - 1, T[0])                                       # takfotens kant
    for y in range(y0, y0 + th): d.satt(x0, y, T[3]); d.satt(x0 + b - 1, y, T[0])
    for x in range(x0, x0 + b): d.satt(x, y0, T[4] if x - x0 < b / 2 else T[2])
    for y in range(y0 + th, y0 + h):                                       # fasaden
        for x in range(x0 + 1, x0 + b - 1):
            i = y - y0 - th
            c = FASAD[3] if (x // 5) % 2 else FASAD[2]
            if x - x0 > b * 0.75: c = FASAD[2] if (x // 5) % 2 else FASAD[1]
            if i < 3: c = blanda(c, '#10182A', 0.45 - i * 0.12)                # skuggan under takfoten
            if i >= fasad_h - 2: c = FASAD[0] if not palar else c
            if palar and i >= fasad_h - 5:                                  # pålarna under huset, mörkt mellan dem
                c = FASAD[1] if (x - x0) % 9 in (1, 2, 3) else '#1E1A18'
                if i == fasad_h - 5: c = FASAD[0]
            d.satt(x, y, c)
    for y in range(y0 + th, y0 + h): d.satt(x0, y, FASAD[0]); d.satt(x0 + b - 1, y, FASAD[0])
    for x in range(x0 + 1, x0 + b - 1): d.satt(x, y0 + th + 3, MASS[2] if x % 4 else MASS[3])   # mässingslisten
    fy = y0 + th + 8
    xs = fonster if fonster is not None else [x0 + 9, x0 + b - 11]
    for fx in xs: runt_fonster(d, fx, fy, 3, natt)
    for (dx, ramp) in dorrar:
        dw, dh = 12, min(13, fasad_h - 3)
        for y in range(y0 + h - dh, y0 + h):
            for x in range(dx, dx + dw):
                ytter = x in (dx, dx + dw - 1) or y == y0 + h - dh
                c = MASS[2] if ytter else (ramp[2] if (x - dx) % 4 else ramp[1])
                if y == y0 + h - dh + 1 and not ytter: c = ramp[3]
                if y - (y0 + h - dh) < 4 and not ytter and (x - dx - dw // 2) ** 2 + (y - (y0 + h - dh) - 4) ** 2 > 22: c = MASS[2]
                d.satt(x, y, c)
        d.satt(dx + dw - 3, y0 + h - 6, MASS[4])
        for x in range(dx - 2, dx + dw + 2):                               # trappsten med framkant
            d.satt(x, y0 + h, STEN[4]); d.satt(x, y0 + h + 1, STEN[2]); d.satt(x, y0 + h + 2, STEN[1])
    if skorsten:
        sx = x0 + b - 14
        for y in range(y0 - 6, y0 + bak + 2):
            for x in range(sx, sx + 6): d.satt(x, y, STEN[2] if x - sx < 4 else STEN[1])
        for x in range(sx, sx + 6): d.satt(x, y0 - 6, STEN[4]); d.satt(x, y0 - 5, '#2A2A30')
    if mast:
        radiomast(d, x0 + b - 10, y0 + 2)

def radiomast(d, x, yb, h=34):
    """Byns radiomast: en smal mast av mässing med stag och en röd lampa i toppen. Den syns från hela byn."""
    for y in range(yb - h, yb + 1):
        d.satt(x, y, MASS[1]); d.satt(x + 1, y, MASS[3] if y % 6 else MASS[4])
        if (y - yb) % 8 == 0:
            for k in range(-2, 4): d.satt(x + k, y, MASS[2])
    for i in range(h // 2):
        d.satt(x - 2 - i // 3, yb - h + 6 + i, STEN[2]); d.satt(x + 3 + i // 3, yb - h + 6 + i, STEN[2])
    d.ellips(x + 1, yb - h - 1, 2, 2, '#E04030', '#7A1A10')

def forankringsmast(d, x, yb, h=40):
    """Förtöjningsmasten för luftskepp vid bryggan: ett högt gallertorn av mässing med en ring i toppen."""
    for y in range(yb - h, yb + 1):
        w = 2 + (yb - y) * 0 + max(0, (y - (yb - h)) // 10)
        for k in (-w, w): d.satt(x + k, y, MASS[1])
        if (y - yb) % 5 == 0:
            for k in range(-w, w + 1): d.satt(x + k, y, MASS[2] if k % 2 else MASS[3])
    d.ellips(x, yb - h - 3, 4, 3, MASS[3], MASS[1])

def brunn(d, x0, y0, b, h, full=True):
    """Brunnen: en stenring sedd snett uppifrån med framsidan som en mur, vattnet inuti och vevstället över."""
    cx = x0 + b / 2; ry = (h - 8) / 2.2; cy = y0 + 2 + ry; fram = 7
    d.skugga_under(cx + 4, y0 + h, b * 0.55, 3)
    for y in range(int(cy), int(cy + fram + ry) + 1):                   # muren framtill
        for x in range(x0, x0 + b):
            if ((x + 0.5 - cx) / (b / 2)) ** 2 + ((y - fram + 0.5 - cy) / ry) ** 2 <= 1 and y >= cy:
                rad = (y - int(cy)) // 3; c = STEN[2] if ((x + rad * 3) // 5) % 2 else STEN[3]
                if (y - int(cy)) % 3 == 2 or (x + rad * 3) % 5 == 0: c = STEN[1]
                if x - x0 > b * 0.7: c = blanda(c, '#10182A', 0.25)
                d.satt(x, y, c)
    d.ellips(cx, cy, b / 2, ry, STEN[3], STEN[1])                          # ovansidan
    d.ellips(cx, cy, b / 2 - 3, ry - 2.5, VATT[2] if full else '#1A1410', VATT[0] if full else '#0C0806')
    if full: d.rekt(int(cx) - 4, int(cy) - 2, 3, 1, VATT[4]); d.satt(int(cx) + 2, int(cy), VATT[3])
    for x in range(x0 + 2, x0 + b - 2):
        if ((x + 0.5 - cx) / (b / 2)) ** 2 < 0.8: d.satt(x, int(cy - ry), STEN[4])
    for y in range(y0 - 12, int(cy) + 2):                                 # vevstället med hinken
        d.satt(x0 + 2, y, TRA[3]); d.satt(x0 + 3, y, TRA[1]); d.satt(x0 + b - 4, y, TRA[2]); d.satt(x0 + b - 3, y, TRA[1])
    for x in range(x0 + 2, x0 + b - 2): d.satt(x, y0 - 12, TRA[4]); d.satt(x, y0 - 11, TRA[1])
    for y in range(y0 - 11, y0 - 5): d.satt(int(cx), y, '#C8C0A0')
    d.rekt(int(cx) - 2, y0 - 6, 5, 4, MASS[2]); d.rekt(int(cx) - 2, y0 - 6, 5, 1, MASS[4])

def lykta(d, x, yb, tand=False):
    for y in range(yb - 14, yb + 1): d.satt(x, y, TRA[1]); d.satt(x + 1, y, TRA[3])
    d.skugga_under(x + 3, yb, 3, 1.5)
    d.rekt(x - 1, yb - 19, 4, 5, MASS[2])
    d.rekt(x, yb - 18, 2, 3, '#FBE07A' if tand else '#3A4450')
    d.satt(x, yb - 20, MASS[3]); d.satt(x + 1, yb - 20, MASS[3])
    if tand:
        for y in range(yb - 30, yb - 6):
            for xx in range(x - 11, x + 13):
                dd = ((xx - x) ** 2 + (y - (yb - 17)) ** 2) ** 0.5
                if 4 < dd < 11 and brus(xx, y, 2) > 0.2 + dd / 14: d.ljus(xx, y, 0.22, '#FFD27A')

def rep(d, x0, y0, b, h, skylt=None):
    """Baronens orange rep mellan två pålar, med tropikhjälmen ritad på skylten."""
    if b >= h:
        for x in range(x0, x0 + b):
            y = y0 + 3 + int(2 * math.sin((x - x0) / b * math.pi))
            d.satt(x, y, ORANGE[2]); d.satt(x, y + 1, ORANGE[1]); d.mork(x, y + 5, 0.25)
        for px_ in (x0, x0 + b - 1):
            for y in range(y0 - 4, y0 + 8): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[3])
    else:
        for y in range(y0, y0 + h):
            x = x0 + 2 + int(2 * math.sin((y - y0) / h * math.pi))
            d.satt(x, y, ORANGE[2]); d.satt(x + 1, y, ORANGE[1])
        for py in (y0, y0 + h - 1):
            for y in range(py - 8, py + 2): d.satt(x0 + 2, y, TRA[1]); d.satt(x0 + 3, y, TRA[3])

def baronskylt(d, x, yb, utan_text=True):
    """Baronens skylt: orange plank på en påle med tropikhjälmen målad (texten står på läsplattan)."""
    for y in range(yb - 10, yb + 1): d.satt(x + 6, y, TRA[1]); d.satt(x + 7, y, TRA[2])
    d.skugga_under(x + 9, yb, 4, 1.5)
    d.rekt(x, yb - 20, 14, 10, ORANGE[2])
    for xx in range(x, x + 14): d.satt(xx, yb - 20, ORANGE[3]); d.satt(xx, yb - 11, ORANGE[0])
    for yy in range(yb - 20, yb - 10): d.satt(x, yy, ORANGE[1]); d.satt(x + 13, yy, ORANGE[0])
    # hjälmen målad på skylten
    d.ellips(x + 7, yb - 15, 3.5, 2.5, '#E8DCB0'); d.rekt(x + 2, yb - 14, 10, 1, '#C8B88A')

def traskylt(d, x, yb):
    """Farfars skylt GÅ INTE I LERAN!: samma bild som skyltarna i skogen."""
    d.skugga_under(x + 2, yb, 5, 1.6)
    d.bild(INK + '/foremal/skog/skylt_farfar.png', x, yb)

def figur(d, x, yb, kropp, hud='#C89A72', har='#3A2A1A', hatt=None, stovlar=None, sak=None, vand='ner'):
    """En bybo i skissen, 16 × 24: platshållare för figuren som ritas i steg 5 (grundställning först)."""
    d.skugga_under(x, yb, 5, 1.6)
    k = kropp
    for y in range(yb - 13, yb - 2):
        w = 4 if y > yb - 11 else 3
        for xx in range(x - w, x + w + 1):
            c = k[1] if xx > x + 1 else k[2]
            if xx in (x - w, x + w): c = k[0]
            d.satt(xx, y, c)
    for xx in (x - 2, x - 1, x + 1, x + 2):
        for y in range(yb - 3, yb): d.satt(xx, y, (stovlar or ['#3A2A1A'] * 3)[1] if xx != 0 else k[0])
    d.ellips(x, yb - 17, 4.4, 4.4, hud, blanda(hud, '#2A1A10', 0.5))
    for xx in range(x - 4, x + 5):
        for y in range(yb - 22, yb - 18):
            if (xx - x) ** 2 + (y - (yb - 17)) ** 2 < 22: d.satt(xx, y, har)
    if vand == 'ner':
        d.satt(x - 2, yb - 16, '#10141A'); d.satt(x + 2, yb - 16, '#10141A')
    if hatt:
        for xx in range(x - 7, x + 8): d.satt(xx, yb - 20, hatt[1]); d.satt(xx, yb - 19, hatt[0])
        d.ellips(x, yb - 22, 4, 2.5, hatt[2])
    if sak: sak(d, x, yb)

def _hsl(h):
    import colorsys
    r, g, b = hx(h)[:3]; return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
def _hex(hls):
    import colorsys
    r, g, b = colorsys.hls_to_rgb(*hls); return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
def flytta_ton(ton, mitt, ny):
    """Samma steg i nyans, ljus och mättnad från mitten som i förlagan (som fargbyte.js i spelet)."""
    h0, l0, s0 = _hsl(mitt); h1, l1, s1 = _hsl(ton); h, l, s = _hsl(ny)
    k = lambda v: max(0.0, min(1.0, v))
    return _hex(((h + h1 - h0) % 1.0, k(l + l1 - l0), k(s + s1 - s0)))
HUD_A = ('#2e8bd8', ['#0e2a5a', '#1e5fa8', '#2e8bd8', '#5fb4e8', '#a8dcf8'])
DRAKT_A = ('#3a3e48', ['#15171c', '#2a2d35', '#3a3e48', '#565b68'])
HJALM_A = ('#a4a9b0', ['#2a2e38', '#6e747f', '#8a90a0', '#a4a9b0', '#cdd1d6', '#eeeff4'])
SKOR_A = ('#1e4fa0', ['#0a1838', '#0a1a48', '#163a88', '#1e4fa0', '#3f6fcc', '#7fa0e8'])

def bybo(hud, drakt, hatt, skor=None, riktning='ner', brätte=0, hatt_form=None):
    """En bybo av samma folk som hjälten: hans kropp och runda huvud, hudfärgerna han själv kan välja,
    men egna kläder och huvudbonad i stället för hjälmen. Ritas i steg 5 med egna bilder."""
    im = Image.open(INK + f'/figurer/hjalte/hjalte_ga_{riktning}_01.png').convert('RGBA'); p = im.load()
    byt = {}
    for (mitt, toner), ny in ((HUD_A, hud), (DRAKT_A, drakt), (HJALM_A, hatt), (SKOR_A, skor)):
        if ny:
            for t in toner: byt[t] = flytta_ton(t, mitt, ny)
    for y in range(im.height):
        for x in range(im.width):
            c = '#%02x%02x%02x' % p[x, y][:3]
            if p[x, y][3] and c in byt: p[x, y] = hx(byt[c])
    if brätte or hatt_form:
        ny_im = Image.new('RGBA', (im.width + 2 * brätte, im.height), (0, 0, 0, 0)); ny_im.alpha_composite(im, (brätte, 0)); im = ny_im; p = im.load()
        kant = flytta_ton('#6e747f', HJALM_A[0], hatt); ljus = flytta_ton('#cdd1d6', HJALM_A[0], hatt)
        if brätte:
            y = 7
            for x in range(0, im.width):
                if x < brätte + 2 or x >= im.width - brätte - 2:
                    p[x, y] = hx(ljus); p[x, y + 1] = hx(kant)
        if hatt_form: hatt_form(im, p, kant, ljus)
    return im

def kras_ihop(d):
    """Skissen ritas med palettens närmaste färger (den låses inte hårt: nya färger läggs till i steg 5)."""
    px = d.im.load()
    for y in range(d.H):
        for x in range(d.B):
            h = P.narmast('#%02x%02x%02x' % px[x, y][:3])[0]
            px[x, y] = hx(h)
    d.px = px

def spara(d, namn, skala=3):
    os.makedirs('/home/claude/skiss2/ut', exist_ok=True)
    d.im.save(f'/home/claude/skiss2/ut/{namn}.png')
    d.im.resize((d.B * skala, d.H * skala), Image.NEAREST).save(f'/home/claude/skiss2/ut/{namn}_x{skala}.png')

def objekt(rum):
    m = json.load(open(KART + rum + '.tmj'))
    ut = {}
    for l in m['layers']:
        for o in l.get('objects', []):
            ut.setdefault(o['name'] or ('vagg_%d_%d' % (o['x'], o['y'])), o)
    return m, ut
