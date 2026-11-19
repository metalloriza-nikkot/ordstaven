# Skissen av kapitel 3, version 2 (18/11): snett ovanifrån överallt, ett stående vattenhjul,
# pråmar i vattnet och slitna, mer vardag som har funnits länge, och sköldpaddan i EN skala (skalet ca 280 x 192,
# lika stort som ön-rummet) som en levande myt. Ingen fågel i trädet: ön har legat på flodens botten.
import math
from bas import *
DRIV = ['#3A2A18', '#5E4A36', '#7E6A52', '#A08A6E', '#D6CFA4']
SKAL = ['#24160C', '#3A2414', '#5A3C26', '#7A5638', '#9C7450', '#BCA070']   # skalets plattor: gammal sten och horn
LAV = ['#8A9A58', '#B0BC78', '#D6D8A0']                                        # lav: blek gulgrön, aldrig orange
HUD = ['#10241A', '#2E3D2E', '#3E5A4A', '#4E6E5A', '#5E806A', '#8AA890']      # gammal gråsgrön hud
TULP = ['#6E747F', '#B8BEC6', '#DCE0E4']                                       # havstulpaner
ALG = ['#14301A', '#1E4A24', '#2E6A30']
SKALSKALA = (140, 96)                                                          # skalets halva bredd och höjd, i alla vyer

def skal(d, cx, cy, rx=SKALSKALA[0], ry=SKALSKALA[1], seed=1, trad=(), kvall=0.0, skadat=True):
    """Hela skalet ovanifrån: ryggen med gräs och mossa (ön), och kanten av uråldriga plattor med årsringar,
    havstulpaner, lav och gamla ärr. Allt som hamnar utanför rummet klipps av rummet (Zelda: det stora syns inte helt)."""
    irx, iry = rx * 0.82, ry * 0.78
    plattor = 15
    hojd = int(ry * 0.16)                                                # skalets sida mot betraktaren (snett ovanifrån)
    for y in range(max(0, int(cy)), min(d.H, int(cy + ry + hojd + 2))):
        for x in range(max(0, int(cx - rx)), min(d.B, int(cx + rx + 1))):
            u = ((x + .5 - cx) / rx) ** 2
            if u >= 1: continue
            kant = cy + ry * math.sqrt(1 - u)
            if kant <= y < kant + hojd:
                j = y - kant
                c = SKAL[1] if (x // 9) % 2 else SKAL[2]
                if x % 9 == 0: c = SKAL[0]
                if j > hojd - 3: c = '#1A120A'
                if brus(x // 2, y // 2, seed + 11) < 0.08: c = TULP[0]
                d.satt(x, y, c)
    for y in range(max(0, int(cy - ry - 2)), min(d.H, int(cy + ry + 6))):
        for x in range(max(0, int(cx - rx - 2)), min(d.B, int(cx + rx + 2))):
            u = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            v = ((x + .5 - cx) / irx) ** 2 + ((y + .5 - cy - 3) / iry) ** 2
            if u > 1: continue
            if v <= 1:                                                   # ryggen: gräs och mossa
                c = GRAS[2] if slat(x, y, 9, seed) > 0.45 else GRAS[1]
                if slat(x, y, 5, seed + 3) > 0.78: c = ALG[1] if brus(x, y, seed) > 0.3 else ALG[2]   # tjock mossa
                if brus(x, y, seed + 9) < 0.02: c = GRAS[4]
                d.satt(x, y, c); continue
            a = math.atan2((y - cy) / ry, (x - cx) / rx)                # kanten: plattor runt om
            pi = int((a + math.pi) / (2 * math.pi) * plattor)
            mitt = (pi + 0.5) / plattor * 2 * math.pi - math.pi
            t = (math.sqrt(u) - math.sqrt(v * 0) * 0)                    # avstånd utåt
            r_ut = math.sqrt(u)
            ring = int(r_ut * 38) % 3 == 0                               # årsringarna, parallella med kanten
            c = SKAL[4] if (pi % 2) else SKAL[3]
            if ring: c = SKAL[2]
            sida = abs(((a - mitt + math.pi) % (2 * math.pi)) - math.pi) * plattor / (2 * math.pi)
            if sida > 0.46: c = SKAL[0]                                   # sömmen mellan plattorna
            if y > cy + ry * 0.55: c = blanda(c, '#10182A', 0.35)         # skuggsidan mot betraktaren
            if y < cy - ry * 0.6: c = blanda(c, '#FFF4D0', 0.12)          # ljuset uppifrån
            if slat(x, y, 4, seed + 4) > 0.9 and brus(x, y, 2) > 0.35: c = TULP[1] if brus(x, y, 3) > 0.5 else TULP[0]   # havstulpaner i klungor
            elif slat(x, y, 6, seed + 6) > 0.84: c = LAV[0] if brus(x, y, 3) > 0.5 else LAV[1]          # lav
            if skadat and slat(x, y, 3, seed + 8) > 0.93 and not ring: c = SKAL[5]                       # gamla ärr
            d.satt(x, y, c)
    # kanten mot vattnet eller sanden: en mörk linje och en ljus kant upptill
    for a10 in range(0, 3600, 4):
        a = math.radians(a10 / 10)
        x, y = int(cx + rx * math.cos(a)), int(cy + ry * math.sin(a))
        if d.inne(x, y): d.satt(x, y, SKAL[0] if math.sin(a) > -0.6 else SKAL[5])
    # gräsets kant mot plattorna: tuvor som hänger över
    for a10 in range(0, 3600, 9):
        a = math.radians(a10 / 10)
        x, y = int(cx + irx * math.cos(a)), int(cy + 3 + iry * math.sin(a))
        if d.inne(x, y) and brus(x, y, seed) > 0.35: d.satt(x, y, GRAS[0])
    for (tx, ty, s) in trad: litet_trad(d, tx, ty, s)
    if kvall:
        for y in range(max(0, int(cy - ry)), min(d.H, int(cy + ry + 2))):
            for x in range(max(0, int(cx - rx)), min(d.B, int(cx + rx))):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: d.mork(x, y, kvall)

def litet_trad(d, x, yb, s=1.0):
    """Ett litet, vindpinat träd utan bo: stammen lutar, kronan är gles."""
    d.ellips(x + 2, yb, 8 * s, 2.5 * s, '#1E3A18')
    for k in range(int(12 * s)): d.satt(int(x + k * 0.15), yb - k, TRA[1] if k % 3 else TRA[2])
    d.ellips(x + 2, yb - 13 * s, 9 * s, 7 * s, ALG[2], ALG[0])
    d.ellips(x - 1, yb - 15 * s, 4.5 * s, 3.5 * s, '#4A8E3A')

def huvud(d, cx, cy, s=1.0, mot='vanster', oppen=False, i_vatten=False, kvall=0.0, hals=0, bara_hals=False, lage='vilar', oga='oppet'):
    """Ett uråldrigt sköldpaddshuvud snett ovanifrån, vänt åt `mot` (vanster/hoger). Byggt av mjuka former:
    en välvd hjässa med havstulpaner och mossa, en rund nos med en nött, krokig näbb, käken som syns från sidan
    med ett långt, gammalt leende, ögonen med tunga lock, och ett skägg av alger under hakan.
    hals: hur långt (px) halsen går bakåt, i veck, innan den försvinner (under skalet eller i vattnet)."""
    sg = -1 if mot == 'vanster' else 1
    def P(dx, dy): return cx + sg * dx * s, cy + dy * s
    for i in range(int(hals)):                                              # halsen i veck, bakåt
        x, y = P(-26 - i / s, 4)
        r = (15 + i * 0.05) * s
        for yy in range(int(y - r), int(y + r) + 1):                          # rund: ljus upptill, mörk nedtill
            t = (yy - (y - r)) / (2 * r)
            c = HUD[4] if t < 0.18 else HUD[3] if t < 0.5 else HUD[2] if t < 0.82 else HUD[1]
            vk = (i + 2.5 * math.sin(yy * 0.45 + i * 0.2)) % 9                 # vecken: böjda, ojämna, som gammalt läder
            if vk < 1.2 and 0.12 < t < 0.92: c = HUD[1] if t > 0.45 else HUD[2]
            elif vk < 2.2 and 0.2 < t < 0.8: c = HUD[2] if t > 0.45 else HUD[3]
            if brus(int(x) // 2, int(yy) // 2, 17) < 0.05 and 0.1 < t < 0.6: c = TULP[0]  # en och annan havstulpan
            if t > 0.96 or t < 0.03: c = HUD[0]
            d.satt(int(x), int(yy), c); d.satt(int(x) + 1, int(yy), c)
    if bara_hals: return
    x, y = P(-4, 9); d.ellips(x, y, 27 * s, 9 * s, HUD[2], HUD[0])          # käken, sedd från sidan
    x, y = P(-2, -1); d.ellips(x, y, 27 * s, 15 * s, HUD[3], HUD[0])        # hjässan
    x, y = P(-4, -5); d.ellips(x, y, 20 * s, 8 * s, HUD[4])                 # ljuset på hjässan
    x, y = P(20, 2); d.ellips(x, y, 11 * s, 11 * s, HUD[3], HUD[0])         # nosen
    x, y = P(19, -2); d.ellips(x, y, 7 * s, 5 * s, HUD[4])
    for (dx, dy) in ((-14, -9), (-10, -11), (-6, -8), (-12, -6), (-2, -12), (-17, -4)):   # havstulpaner
        x, y = P(dx, dy); d.ellips(x, y, 1.6 * s, 1.2 * s, TULP[1], TULP[0]); d.satt(int(x), int(y), TULP[2])
    x, y = P(-8, -12); d.ellips(x, y, 8 * s, 2.6 * s, ALG[2], ALG[0])       # mossa på hjässan
    for k in range(5):                                                       # rynkor i bågar bakom ögat
        for j in range(8):
            x, y = P(-10 - k * 3 + j * 0.3, -4 + j * 1.4); d.satt(int(x), int(y), HUD[1])
    # näbben: nött och krokig längst fram, och munnen bakåt längs käken med uppåtvänd mungipa
    for k in range(int(6 * s)):
        x, y = P(29 + k * 0.25, 2 + k); d.satt(int(x), int(y), '#1A1410'); d.satt(int(x - sg), int(y), '#2A2418')
    for k in range(int(34 * s)):
        dx = 28 - k / s; dy = 6 + (k / s) * 0.05 - (2 if k / s > 30 else 0)
        x, y = P(dx, dy); d.satt(int(x), int(y), '#1A1410')
        if oppen and k / s < 18:
            for jj in range(int(4 * s)): d.satt(int(x), int(y + 1 + jj), '#3A1A14')
    # ögat (det som vetter mot betraktaren): grumligt, ljust, med ett tungt lock och påsar
    ex, ey = P(8, 0)
    d.ellips(ex + sg * 1.5, ey + 1.5, 4.2 * s, 3.4 * s, '#2E3D2E')                 # ögonhålan
    d.ellips(ex + sg * 1.5, ey + 1.8, 3.0 * s, 2.4 * s, '#7E9AA8', '#1E2A30')     # det grumliga ögat
    d.ellips(ex + sg * 2.2, ey + 2.2, 1.3 * s, 1.3 * s, '#1E2A30')                # pupillen
    d.satt(int(ex + sg * 0.5), int(ey + 1), '#F2F6F8'); d.satt(int(ex + sg * 1), int(ey + 1), '#DCE8EE')   # glimten
    for k in range(-3, 7): d.satt(int(ex + sg * k), int(ey - 1 + (1 if k in (-3, 6) else 0)), HUD[0])     # det tunga locket
    for k in range(-2, 6): d.satt(int(ex + sg * k), int(ey - 2), HUD[2])
    for k in range(-1, 5): d.satt(int(ex + sg * k), int(ey + 5), HUD[1])           # påsen under
    if oga in ('halvt', 'stangt'):                                          # locket sänkt: halvsovande eller blundar
        for yy in range(int(ey - 2), int(ey + (2 if oga == 'halvt' else 5))):
            for xx in range(int(ex - 4 * s), int(ex + 6 * s) + 1):
                if ((xx + .5 - ex - sg * 1.5) / (4.4 * s)) ** 2 + ((yy + .5 - ey - 1.8) / (3.6 * s)) ** 2 <= 1: d.satt(xx, yy, HUD[2] if yy < ey + 1 else HUD[3])
        ly = int(ey + (2 if oga == 'halvt' else 4))
        for k in range(-3, 7): d.satt(int(ex + sg * k), ly, HUD[0])
    if oga == 'stort':                                                      # vaket: locket lyft, en glimt till
        for k in range(-2, 6): d.satt(int(ex + sg * k), int(ey - 1), HUD[1])
        d.satt(int(ex + sg * 2.5), int(ey + 3), '#F2F6F8')
    ox, oy = P(6, -11)                                                      # det andra ögats lock, uppe på hjässan
    for k in range(5): d.satt(int(ox + sg * k), int(oy), HUD[1]); d.satt(int(ox + sg * k), int(oy + 1), HUD[0])
    for k in range(10):                                                      # algskägget under hakan
        for j in range(int((5 + (k * 7) % 6) * s)):
            x, y = P(22 - k * 2.4 + math.sin(j * 0.7 + k) * 0.8, 17 + j)
            d.satt(int(x), int(y), ALG[(k + j // 3) % 3])
    if i_vatten:
        for k in range(-24, 25, 2):
            x, y = P(-24, k * 0.9); d.satt(int(x), int(y), VATT[4]); d.satt(int(x - sg), int(y + 1), VATT[3])

def fena(d, cx, cy, s=1.0, mot='vanster', lyft=False):
    """En framfena som vilar på sanden: en tung, gammal paddel med fjäll och två nötta klor."""
    sg = -1 if mot == 'vanster' else 1
    L, B = 26 * s, 9 * s
    for y in range(int(cy - B - 2), int(cy + B + 2)):
        for x in range(int(cx - L - 2), int(cx + L + 2)):
            lx = (x + .5 - cx) * sg; t = (lx + L) / (2 * L)
            if not 0 <= t <= 1: continue
            halv = B * math.sin(math.pi * (0.1 + 0.85 * t)) ** 0.6 * (1.1 - 0.5 * t)
            dy = y + .5 - cy + (t * 4 * s if not lyft else -t * 6 * s)
            if abs(dy) > halv: continue
            ny = dy / halv
            c = HUD[4] if ny < -0.4 else HUD[3] if ny < 0.3 else HUD[2]
            if brus(x // 2, y // 2, 7) < 0.15: c = HUD[2] if c != HUD[2] else HUD[1]
            if abs(ny) > 0.82: c = HUD[0]
            d.satt(x, y, c)
    for k in (0.55, 0.72):
        x = cx + sg * (L * (2 * k - 1)); y = cy - B * 0.7 + (k * 4 * s if not lyft else -k * 6 * s)
        d.satt(int(x), int(y), '#D6CFA4'); d.satt(int(x + sg), int(y), '#A08A6E')

def vattenhjul(d, cx, cy, r, snurrar=False, tang=True, vatten_y=None, vinkel=None):
    """Ett stående vattenhjul snett ovanifrån: hjulets framsida (mot söder) som en cirkel av drivved med ekrar,
    och skovlarnas överkanter som syns uppifrån som tvärslåar bakåt. Nedre delen står i vattnet i rännan."""
    vy = vatten_y if vatten_y is not None else cy + r * 0.45
    djup = 5                                                              # hur mycket av hjulets tjocklek som syns uppifrån
    v0 = vinkel if vinkel is not None else (10 if snurrar else 0)
    for k in range(12):                                                   # skovlarna, sedda uppifrån längs fälgen
        a = math.radians(k * 30 + v0)
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        if y > vy: continue
        for j in range(djup):
            d.satt(int(x), int(y - j), DRIV[3] if j < djup - 1 else DRIV[4])
            d.satt(int(x) + 1, int(y - j), DRIV[2])
    for y in range(int(cy - r - 1), int(min(vy, cy + r + 1))):            # fälgen och ekrarna
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            dd = math.hypot(x + .5 - cx, y + .5 - cy)
            if r - 3 <= dd <= r: d.satt(x, y, DRIV[2] if y < cy else DRIV[1])
            elif dd < r - 3:
                a = math.degrees(math.atan2(y + .5 - cy, x + .5 - cx)) - v0
                if abs(((a + 30) % 60) - 30) < 3.6 or dd < 3: d.satt(x, y, DRIV[3] if dd < 3 else DRIV[2])
    d.ellips(cx, cy, 2, 2, '#55555F')                                   # axeln, som går in i kvarnens vägg
    if tang and not snurrar:
        for (tx, ty) in ((cx - r * 0.6, cy - r * 0.4), (cx + r * 0.1, cy + r * 0.05), (cx + r * 0.55, cy - r * 0.55)):
            for j in range(16):
                for w in range(-2, 3):
                    if abs(w) + j // 6 < 3: d.satt(int(tx + w + math.sin(j * 0.5) * 1.5), int(ty - 6 + j), ALG[(j + w) % 3])
    if snurrar:
        for k in range(10):                                               # vattnet som forsar av skovlarna
            a = math.radians(200 + k * 14)
            d.satt(int(cx + (r + 2) * math.cos(a)), int(cy + (r + 2) * math.sin(a)), VATT[4])
    for x in range(int(cx - r - 3), int(cx + r + 4)):                     # skummet där hjulet går ned i vattnet
        if (x + (3 if snurrar else 0)) % 3: d.satt(x, int(vy), '#FFFFFF' if snurrar else VATT[4])

def stolpe(d, x, yb, h=12):
    """En förtöjningsstolpe av gammalt trä, nött blank upptill av rep i generationer."""
    for y in range(yb - h, yb):
        d.satt(x, y, DRIV[1]); d.satt(x + 1, y, DRIV[2]); d.satt(x + 2, y, DRIV[1])
    for k in range(3): d.satt(x + k, yb - h, DRIV[4] if k == 1 else DRIV[3])
    for k in range(3): d.satt(x + k, yb - h + 3, '#A08A6E'); d.satt(x + k, yb - h + 4, '#7E6A52')   # repet runt
def pram_sliten(d, x0, y0, b, h, seed=1, last=()):
    """En gammal arbetspråm i vattnet: plankor i olika nyanser och lagningar, tjärade skarvar, mossa i hörnen,
    en reling med blekta ränder, och skrovet ned i vattnet. Lasten står där den används."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            rad = (y - y0) // 5; i = (y - y0) % 5
            nyans = int(brus(rad, (x + rad * 7) // 18, seed) * 4)
            c = [DRIV[2], DRIV[3], TRA[3], DACK[2]][nyans]
            if i == 4 or (x + rad * 7) % 18 == 0: c = DRIV[0]
            if brus(x, y, seed + 2) < 0.03: c = '#2A2A20'                 # tjära och gamla fläckar
            if (x - x0 < 4 or x0 + b - x <= 4) and (y - y0 < 4 or y0 + h - y <= 4) and brus(x, y, 5) < 0.6: c = ALG[2]   # mossa i hörnen
            d.satt(x, y, c)
    for x in range(x0, x0 + b):                                          # relingen, med blekta ränder
        d.satt(x, y0, '#DCE0E4' if (x // 5) % 2 else '#6A84B0'); d.satt(x, y0 + 1, DRIV[1])
        for k, c in enumerate((DRIV[1], DRIV[0], '#14243A')): d.satt(x, y0 + h + k, c)   # skrovet ned i vattnet
    for y in range(y0, y0 + h + 2): d.satt(x0, y, DRIV[0]); d.satt(x0 + b - 1, y, DRIV[0])
    lx = x0 + 6 + int(brus(seed, 1) * 10); ly = y0 + 6 + int(brus(seed, 2) * 6)    # en lagning: en ny, ljusare planka
    for x in range(lx, lx + 14):
        for y in range(ly, ly + 4): d.satt(x, y, DRIV[4] if y == ly else DRIV[3])
    for (typ, x, y) in last: LAST[typ](d, x0 + x, y0 + y)
def _lada(d, x, y):
    for yy in range(y, y + 8):
        for xx in range(x, x + 10): d.satt(xx, yy, TRA[3] if yy == y else TRA[2] if (xx - x) % 5 else TRA[1])
    for xx in range(x, x + 10): d.satt(xx, y + 8, '#1E1A18')
def _sack(d, x, y):
    d.ellips(x + 5, y + 5, 5, 4, '#C8B48A', '#7E6A52'); d.satt(x + 5, y + 1, '#7E6A52')
def _tunna(d, x, y):
    d.ellips(x + 5, y + 6, 5, 6, TRA[2], TRA[0]); d.ellips(x + 5, y + 2, 4, 2, TRA[3], TRA[1])
    for xx in range(x, x + 11): d.satt(xx, y + 5, '#55555F')
def _korg(d, x, y):
    d.ellips(x + 5, y + 4, 5, 3.5, '#C0A866', '#7A6230')
    for xx in range(x + 1, x + 10, 2): d.satt(xx, y + 4, '#E8A0B8')        # rosa band: en vara från vassbyn
def _nat(d, x, y):
    for yy in range(y, y + 10):
        for xx in range(x, x + 22):
            if (xx + yy) % 3 == 0 or (xx - yy) % 3 == 0: d.satt(xx, yy, '#8A8A96' if (xx + yy) % 2 else '#B8BEC6')
def _gryta(d, x, y):
    d.ellips(x + 5, y + 6, 5, 3, '#34343C', '#1E1E24'); d.ellips(x + 5, y + 4, 4, 1.6, '#55555F')
    for k in range(10): d.satt(int(x + 5 + math.sin(k * 0.7) * 2), y + 2 - k, '#DCE0E4' if k % 3 else '#B8BEC6')   # röken
def _rep(d, x, y):
    for a in range(0, 360, 20): d.satt(int(x + 5 + 4 * math.cos(math.radians(a))), int(y + 4 + 2.4 * math.sin(math.radians(a))), '#A08A6E')
    for a in range(0, 360, 30): d.satt(int(x + 5 + 2 * math.cos(math.radians(a))), int(y + 4 + 1.2 * math.sin(math.radians(a))), '#7E6A52')
LAST = {'lada': _lada, 'sack': _sack, 'tunna': _tunna, 'korg': _korg, 'nat': _nat, 'gryta': _gryta, 'rep': _rep}

def brygga(d, x0, y0, b, h, seed=3):
    """En lång, gammal brygga av drivved längs stranden: plankor i olika längder, några nya, några nästan grå."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            kol = (x - x0) // 4; i = (x - x0) % 4
            nyans = int(brus(kol, (y + kol * 5) // 14, seed) * 3)
            c = [DRIV[2], DRIV[3], blanda(DRIV[2], DRIV[3], 0.5)][nyans]
            if i == 3: c = DRIV[1]
            if y in (y0, y0 + 1): c = DRIV[3] if y == y0 else DRIV[2]          # bärbalken längs kanten
            if y == y0 + h - 1: c = DRIV[1]
            d.satt(x, y, c)
    for x in range(x0, x0 + b):
        for k, c in enumerate((DRIV[1], DRIV[0], '#14243A')): d.satt(x, y0 + h + k, c)
    for x in range(x0 + 8, x0 + b, 40): stolpe(d, x, y0 + h + 2, 10)

def malad_sten(d, x, y, motiv=0, gammal=0.0):
    """Flodfolkets målade stenar: en rund flodsten med en målning som har bleknat olika länge.
    motiv 0: ränder, 1: en ö med ett träd, 2: en fisk, 3: ett horn."""
    d.ellips(x, y + 3, 6, 2, '#2A3A20')
    d.ellips(x, y, 6, 4.5, '#8A8A96', '#34343C'); d.ellips(x - 1, y - 1, 4, 2.5, '#9EA0AE')
    ritning = {0: [(dx, 0, '#2A52C8' if dx % 2 else '#FFFFFF') for dx in range(-3, 4)],
               1: [(-2, 1, '#5A8E3A'), (-1, 0, '#5A8E3A'), (0, 0, '#5A8E3A'), (1, 0, '#5A8E3A'), (2, 1, '#5A8E3A'), (0, -2, '#2E6A30'), (0, -1, '#4A3018')],
               2: [(-2, 0, '#2A52C8'), (-1, 0, '#2A52C8'), (0, 0, '#2A52C8'), (1, -1, '#2A52C8'), (1, 1, '#2A52C8')],
               3: [(-3, 1, '#C8963E'), (-2, 0, '#C8963E'), (-1, 0, '#C8963E'), (0, -1, '#C8963E'), (1, -1, '#E6BC66'), (2, -2, '#E6BC66')]}[motiv]
    for (dx, dy, c) in ritning: d.satt(x + dx, y + dy, blanda(c, '#8A8A96', gammal))

def anka(d, x, y, vand=1):
    d.ellips(x, y, 3, 2, '#7A5638', '#3A2414'); d.ellips(x + 2 * vand, y - 2, 1.6, 1.4, '#2E6A30')
    d.satt(x + 4 * vand, y - 2, '#E6BC66')
    for k in range(-4, 5, 2): d.satt(x + k, y + 3, VATT[4])
def fagel(d, x, y):
    for (dx, dy) in ((-2, 0), (-1, -1), (0, 0), (1, -1), (2, 0)): d.satt(x + dx, y + dy, '#DCE0E4')
def tvattlina(d, x0, x1, y):
    for x in range(x0, x1): d.satt(x, y + int(2 * math.sin((x - x0) / (x1 - x0) * math.pi)), '#A08A6E')
    for i, x in enumerate(range(x0 + 4, x1 - 6, 9)):
        c = ['#FFFFFF', '#2A52C8', '#DCE0E4', '#C23A2E'][i % 4]
        yy = y + int(2 * math.sin((x - x0) / (x1 - x0) * math.pi)) + 1
        for dx in range(5):
            for dy in range(6): d.satt(x + dx, yy + dy, c if dy < 5 else blanda(c, '#10182A', 0.4))

def ror(d, punkter, r0, r1, farg=None, veck=True, seed=0):
    """En rund, avsmalnande kroppsdel (hals eller arm) längs en linje av punkter, sedd snett ovanifrån:
    ljus på ovansidan, mörk på undersidan, böjda veck tvärs över och rundade ändar, så att den hänger ihop."""
    HU = farg or HUD
    pts = []
    for (x0, y0), (x1, y1) in zip(punkter, punkter[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n): pts.append((x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n))
    pts.append(punkter[-1])
    L = len(pts)
    for i, (x, y) in enumerate(pts):
        t = i / max(1, L - 1); r = r0 + (r1 - r0) * t
        for yy in range(int(y - r), int(y + r) + 1):
            for xx in range(int(x - r), int(x + r) + 1):
                dx, dy = xx + .5 - x, yy + .5 - y
                if dx * dx + dy * dy > r * r: continue
                ny = dy / r                                                     # -1 ovansidan, +1 undersidan
                c = HU[4] if ny < -0.55 else HU[3] if ny < 0.05 else HU[2] if ny < 0.6 else HU[1]
                if dx * dx + dy * dy > (r - 1) ** 2 and ny > -0.2: c = HU[0]
                if veck and (i // 2) % 7 == 0 and -0.7 < ny < 0.75: c = HU[1] if ny < 0.2 else HU[0]   # vecken tvärs över
                if brus(xx // 2, yy // 2, 11 + seed) < 0.06 and ny < 0.4: c = HU[2]
                d.satt(xx, yy, c)

def fena2(d, rx, ry, s=1.0, mot='vanster', lyft=False, trappa=False):
    """En framfena som sitter ihop med armen: en rund handled vid roten (rx, ry), och en lång, tung paddel ut mot spetsen.
    Framkanten är mörk och tjock, bakkanten tunnare, och två nötta klor sitter på framkanten. Lyft: spetsen höjs."""
    sg = -1 if mot == 'vanster' else 1
    L, B = 46 * s, 10 * s
    if trappa: L, B = 50 * s, 12 * s
    for y in range(int(ry - B * 2 - 10), int(ry + B * 2 + 8)):
        for x in range(int(rx - L - 4) if sg < 0 else int(rx - 6), int(rx + 6) if sg < 0 else int(rx + L + 4)):
            lx = (x + .5 - rx) * sg
            t = lx / L
            if not -0.12 <= t <= 1: continue
            tt = max(0.0, t)
            mitt = ry + (-tt * tt * 9 * s if lyft else tt * 3 * s)              # spetsen höjs när fenan lyfts
            halv = B * (0.95 - 0.15 * tt) * (1 - tt) ** 0.45 + (1.5 * s if t < 0.05 else 0)
            fram = mitt - halv * 0.9; bak = mitt + halv * 1.05
            if not fram <= y + .5 <= bak: continue
            ny = (y + .5 - mitt) / halv
            c = HUD[4] if ny < -0.5 else HUD[3] if ny < 0.2 else HUD[2]
            if trappa and ny < 0.1: c = HUD[5] if (x + y) % 5 else HUD[4]      # den nötta ovansidan där man kliver
            if (int(lx) // int(5 * s + 1)) % 2 == 0 and -0.4 < ny < 0.6 and brus(x // 2, y // 2, 5) < 0.3: c = HUD[2]   # fjäll
            if ny < -0.78: c = HUD[0]                                            # framkanten
            if ny > 0.88: c = HUD[1]
            d.satt(x, y, c)
    for k in (0.32, 0.5):                                                       # klorna på framkanten
        x = rx + sg * L * k; y = ry + (-k * k * 9 * s if lyft else k * 3 * s) - B * (0.95 - 0.15 * k) * (1 - k) ** 0.45 * 0.9
        d.satt(int(x), int(y), '#D6CFA4'); d.satt(int(x), int(y) - 1, '#A08A6E'); d.satt(int(x + sg), int(y), '#A08A6E')
