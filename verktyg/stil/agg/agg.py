# Ägget, filten och kläckningen (beslut 36.7) och krukorna som går sönder (36.8). Stil 2026-11-04.
# Allt ritas enligt Så ritas allt (10b): snett uppifrån, ljus uppe till vänster, fyra toner och kontur i materialets färg.
#
# foremal/hus/agg_*.png    32 x 44  lådan med ägget (lada_med_agg). Alla bilder har samma ruta och samma nederkant,
#                                    så att Teknik byter bild på objektet utan att flytta det.
# foremal/hus/kruka_*.png  24 x 20  krukan som spricker och skärvorna. Nederkanten mitt = krukans nederkant mitt.
#
# Läser ungens bilder ur /home/claude/unge2/ut/ (eller inkorgens figurer/unge/) och lådan ur hus/ut/foremal/.
import os, sys, math, random
from PIL import Image
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
def hx(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
LD = lambda p: Image.open(p).convert('RGBA')
UNGE = next(d for d in ('/home/claude/unge2/ut/', '/home/claude/inkorg/figurer/unge/') if os.path.exists(d + 'unge1_glad_ner_02.png'))
LADA = next(p for p in ('/home/claude/hus/ut/foremal/lada_lang.png', '/home/claude/inkorg/foremal/hus/lada_lang.png') if os.path.exists(p))
UT = '/home/claude/agg/ut/foremal/hus/'

SKAL = ['#7E6A52', '#C8B494', '#E8D4A8', '#F2E8C8', '#FFFBEA']        # kontur, skugga, mitt, ljus, högdager
VARMT = ['#8A6A20', '#E0B07A', '#F2D27A', '#FFF0B0', '#FFFBEA']       # skalet när det lyser inifrån
FROST = ['#5FB4E8', '#A8DCF8', '#E8F0FF']
FILT = ['#6A1A14', '#A8302A', '#D9443A', '#F07A6A']                     # samma röda filt som bildkortet `filt`
HALM = ['#8A6A20', '#C8A040', '#E8C868', '#F2D27A']
PRICK = ['#56661C', '#80922A']                                          # små prickar i ungens oliv
# stavens regnbåge: kall ände (rosa, ljusblå, blå) och varm ände (gul, orange, röd), som staven i handen
REGN = ['#F4A6B8', '#8FCBF2', '#3A5AD8', '#F2D22E', '#F08A2A', '#D9443A']
L = (-0.55, -0.75, 0.45); _n = math.sqrt(sum(v * v for v in L)); L = tuple(v / _n for v in L)
W, H = 32, 40
CX, TOPP, BOTTEN = 16, 7, 31            # äggets mitt i x, översta och nedersta raden

def aggform(x, y, dx0=0, dy=0, luta=0.0):
    """Är (x, y) inne i ägget? Ägget är lite smalare upptill. luta flyttar toppen åt sidan (gungar).
    Ger (inne, dx, t) där dx och t är normerade koordinater för ljuset."""
    x -= dx0; y -= dy
    ry = (BOTTEN - TOPP) / 2; cy = TOPP + ry * 1.06
    t = (y + 0.5 - cy) / ry
    rx = 8.2 if t > 0 else 8.2 - 1.3 * (-t) ** 1.8
    cxx = CX + luta * max(0, -t)
    dx = (x + 0.5 - cxx) / rx
    return dx * dx + t * t <= 1.0, dx, t

def ton(dx, dy):
    nz = math.sqrt(max(0, 1 - dx * dx - dy * dy)); ll = dx * L[0] + dy * L[1] + nz * L[2]
    return 4 if ll > 0.80 else 3 if ll > 0.45 else 2 if ll > 0.05 else 1

def sprick(x):
    """Sprickans rad vid x: ett sicksack tvärs över ägget, ungefär på mitten."""
    return 17 + (0 if x % 3 == 0 else 1 if x % 3 == 1 else -1)

def kontur_runt(im, mangd, farg):
    p = im.load()
    for (x, y) in mangd:
        for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + a, y + b)
            if q not in mangd and 0 <= q[0] < W and 0 <= q[1] < H and p[q][3] == 0: p[q] = hx(farg)

def agg(im, ramp=SKAL, del_='hel', dx0=0, dy=0, luta=0.0, frost=False, prickar=True):
    """Ritar ägget, eller bara toppen eller botten (del_), och ger mängden pixlar det täcker."""
    p = im.load(); inne = {}
    for y in range(H):
        for x in range(W):
            ok, ddx, ddy = aggform(x, y, dx0, dy, luta)
            if not ok: continue
            yy = y - dy
            if del_ == 'topp' and yy >= sprick(x - dx0): continue
            if del_ == 'botten' and yy < sprick(x - dx0): continue
            inne[(x, y)] = ton(ddx, ddy)
    for (x, y), t in inne.items():
        c = ramp[t]
        if frost:                                                         # frosten täcker ovansidan med en ojämn kant
            ok, ddx, ddy = aggform(x, y, dx0, dy, luta)
            if ddy < -0.28 + 0.10 * math.sin(x * 1.9):
                c = FROST[2] if t >= 3 else FROST[1] if t == 2 else FROST[0]
        p[x, y] = hx(c)
    kontur_runt(im, inne, ramp[0])
    if prickar:                                                           # några olivprickar, som ungens färg
        for (x, y, c) in [(12, 21, 1), (19, 12, 0), (21, 20, 1), (11, 25, 0), (17, 24, 1), (14, 15, 0), (20, 26, 0)]:
            q = (x + dx0, y + dy)
            if q in inne and not (frost and y < 16): p[q] = hx(PRICK[c])
    if frost:
        for (x, y) in [(12, 10), (11, 12), (15, 9)]:                      # glitter i frosten
            q = (x + dx0, y + dy)
            if q in inne: p[q] = hx('#FFFFFF')
        for (x, y) in [(8, 15), (8, 16)]:                                 # en liten istapp
            q = (x + dx0, y + dy); p[q] = hx(FROST[1] if y == 15 else FROST[0])
    if del_ == 'botten':                                                  # skalets brutna kant, ljus på insidan
        for x in range(W):
            ys = [y for (xx, y) in inne if xx == x]
            if ys: p[x, min(ys)] = hx(ramp[4])
    return set(inne)

def kant_y(x): return round(18 + (x - 7) * 0.3)

def filt(im, mal, botten_rad=None):
    """Filten lindad om ägget: kanten går snett, högre till vänster, som en sjal. Den är en pixel bredare än
    skalet där den sitter tjockt, skuggas som ägget och har två veck. botten_rad = filten har glidit ned dit."""
    p = im.load(); f = {}
    for (x, y) in mal:
        k = kant_y(x) if botten_rad is None else botten_rad + (x % 3 == 0)
        if y >= k: f[(x, y)] = 1
    for (x, y) in list(f):                                                # tjockare än skalet på sidorna
        for a in (-1, 1):
            q = (x + a, y)
            if q not in f and q not in mal and y >= (kant_y(x) if botten_rad is None else botten_rad) + 2 and y < H - 12: f[q] = 1
    for (x, y) in f:
        ok, ddx, ddy = aggform(min(max(x, 8), 24), y)
        t = ton(max(-1, min(1, ddx)), ddy) if ok else 1
        c = FILT[{1: 1, 2: 2, 3: 2, 4: 3}[t]]
        if (x - y // 2) % 7 == 0 and y > (kant_y(x) if botten_rad is None else botten_rad) + 1: c = FILT[1]   # vecken
        p[x, y] = hx(c)
    for (x, y) in f:                                                      # den rullade kanten
        if (x, y - 1) not in f: p[x, y] = hx(FILT[3])
    kontur_runt(im, f, FILT[0])
    return set(f)

def flik(im):
    """Filtens hörn som hänger ut över lådans framkant."""
    p = im.load()
    for (x, y, c) in [(7, 27, 2), (8, 27, 2), (6, 28, 2), (7, 28, 3), (8, 28, 1), (6, 29, 2), (7, 29, 2), (8, 29, 1), (7, 30, 1), (6, 30, 0), (8, 30, 0), (7, 31, 0), (5, 28, 0), (5, 29, 0), (9, 28, 0), (9, 29, 0)]:
        p[x, y] = hx(FILT[c])

def glod(im, mal, steg=0):
    """Ägget lyser som staven: en ring i stavens färger runt ägget, kall upptill och varm nertill som staven,
    och en glesare yttre ring som skimrar (steg 0–2)."""
    p = im.load(); inner, yttre = set(), set()
    for (x, y) in mal:
        for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + a, y + b)
            if q not in mal and 0 <= q[0] < W and 0 <= q[1] < H: inner.add(q)
    for (x, y) in inner:
        for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            q = (x + a, y + b)
            if q not in mal and q not in inner and 0 <= q[0] < W and 0 <= q[1] < H: yttre.add(q)
    topp = min(y for (x, y) in mal); bott = H - 12
    def farg(y): return REGN[min(5, max(0, int((y - topp) / max(1, bott - topp) * 6)))]
    for (x, y) in inner:
        if y < H - 12 and p[x, y][3] == 0: p[x, y] = hx(REGN[(REGN.index(farg(y)) + (1 if (x + y + steg) % 3 == 0 else 0)) % 6])
    for (x, y) in yttre:
        if y < H - 12 and p[x, y][3] == 0 and (x + y + steg) % 3 != 1: p[x, y] = hx(farg(y))

def ljus_inne(im, mal, steg):
    """Ljuset inifrån: några pixlar i skalets mitt blir ljusast och pulserar."""
    p = im.load()
    for (x, y) in mal:
        if (x - 15) ** 2 + (y - 15 - steg) ** 2 <= 5 + steg * 2: p[x, y] = hx(VARMT[4])

def halm(im, rad=28, tat=1.0):
    """Halmen i lådan: strån som sticker upp ovanför lådans framkant."""
    p = im.load(); random.seed(11)
    for x in range(2, 30):
        h = 2 + (x * 7 % 5 == 0) + (x * 3 % 4 == 0)
        for k in range(h):
            if random.random() < tat: p[x, rad - k] = hx(HALM[1 + (k + x) % 3])
        p[x, rad + 1] = hx(HALM[0])

def lada_fram(im):
    """Lådans framsida (lada_lang utan locket) längst ned i rutan."""
    l = LD(LADA); fram = l.crop((0, 6, 30, 18))
    im.alpha_composite(fram, (1, H - 12))

def ny(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))
PAD = 4
def hog(im):
    """Lägger bilden i den slutliga rutan, 32 x 44, med samma nederkant (plats för ungen som hoppar)."""
    ut = Image.new('RGBA', (W, H + PAD), (0, 0, 0, 0)); ut.alpha_composite(im, (0, PAD)); return ut

def mossa(mal):
    return {(x, y) for (x, y) in mal}

def lock(ramp=VARMT):
    """Skalets topp som ett eget lager, för att kunna ligga på ungens huvud."""
    im = ny(); m = agg(im, ramp=ramp, del_='topp', prickar=True)
    x0 = min(x for x, y in m) - 1; y0 = min(y for x, y in m) - 1
    x1 = max(x for x, y in m) + 2; y1 = max(y for x, y in m) + 2
    return im.crop((x0, y0, x1, y1))

def bygg():
    B = {}
    # --- s04: det frostiga ägget i halmen, knuffen (hackar tänder) och efter 3 fel (gungar mot rätt låda)
    for namn, kw in [('agg_01', {}), ('agg_frys_01', dict(dx0=-1)), ('agg_frys_02', dict(dx0=1)),
                     ('agg_gungar_vanster', dict(luta=-2.4)), ('agg_gungar_hoger', dict(luta=2.4))]:
        im = ny(); agg(im, frost=True, **kw); halm(im); lada_fram(im)
        if 'frys' in namn:                                                # snöflingor som skakas loss
            pp = im.load()
            for (x, y) in ([(5, 11), (27, 15), (4, 18)] if namn.endswith('1') else [(6, 14), (26, 10), (28, 19)]): pp[x, y] = hx(FROST[2])
        B[namn] = im
    # --- filten om ägget: först med frost, sedan har frosten smält
    for namn, fr in [('agg_filt_frost', True), ('agg_filt', False)]:
        im = ny(); m = agg(im, frost=fr); filt(im, m); halm(im); lada_fram(im); flik(im); B[namn] = im
    # --- s05: ägget blir varmt och lyser i stavens färger (tre bilder som växlar)
    def varm(s, spricka=None):
        im = ny(); m = agg(im, ramp=VARMT); ljus_inne(im, m, s % 2)
        if spricka:
            pp = im.load()
            for (x, y) in spricka:
                if (x, y) in m: pp[x, y] = hx(SKAL[0])
        f = filt(im, m); glod(im, m | f, s); halm(im); lada_fram(im); flik(im); return im
    for s in range(3): B[f'agg_lyser_{s+1:02d}'] = varm(s)
    # --- KNACK, KNACK: sprickan växer längs sicksacken
    B['agg_knack_01'] = varm(0, [(x, sprick(x)) for x in range(12, 18)])
    B['agg_knack_02'] = varm(1, [(x, sprick(x)) for x in range(8, 25)] + [(16, 15), (16, 14), (20, 16)])
    # --- KRAS: toppen lyfter, och ungens ögon syns i springan
    def unge_klippt(im, namn, uy, xmin=8, xmax=24, ymax=H - 12):
        u = LD(UNGE + namn + '.png'); lag = ny(); lag.alpha_composite(u, (4, uy)); q = lag.load(); pp = im.load()
        for y in range(H):
            for x in range(W):
                if q[x, y][3] and xmin <= x <= xmax and y < ymax and aggform(x, max(y, TOPP + 6))[0]: pp[x, y] = q[x, y]
    im = ny(); pp = im.load()
    for x in range(8, 25):                                                # mörkt inne i ägget
        for y in range(sprick(x) - 4, sprick(x) + 2):
            if aggform(x, y)[0]: pp[x, y] = hx('#2E3D10')
    unge_klippt(im, 'unge1_ga_ner_01', 2)
    skal = ny(); m = agg(skal, ramp=VARMT, del_='botten'); im.alpha_composite(skal)
    topp = ny(); mt = agg(topp, ramp=VARMT, del_='topp', dy=-4, dx0=1); im.alpha_composite(topp)
    f = filt(im, m); glod(im, m | f | mt, 2); halm(im); lada_fram(im); flik(im); B['agg_kras_01'] = im
    # --- nosen och ut: toppen sitter som en mössa på ungens huvud
    LOCK = lock(); LOCK_KALL = lock(SKAL)
    def i_skalet(unge, uy, lock_bild=None, lock_xy=None, varmt=True, gl=None, filt_ned=False, klipp=True):
        im = ny()
        if klipp: unge_klippt(im, unge, uy)
        else: im.alpha_composite(LD(UNGE + unge + '.png'), (4, uy))
        skal = ny(); m = agg(skal, ramp=VARMT if varmt else SKAL, del_='botten', prickar=not varmt)
        im.alpha_composite(skal)
        f = filt(im, m, botten_rad=24 if filt_ned else 22)
        if gl is not None: glod(im, m | f, gl)
        halm(im); lada_fram(im); flik(im)
        im = hog(im)
        if lock_bild is not None: im.alpha_composite(lock_bild, (lock_xy[0], lock_xy[1] + PAD))
        return im
    B['agg_nos_01'] = i_skalet('unge1_ga_ner_01', 1, LOCK, (8, -1), gl=0)
    B['agg_ute_01'] = i_skalet('unge1_blinka_ner_01', -1, LOCK, (8, -4), gl=1, klipp=False)
    B['agg_ute_02'] = i_skalet('unge1_glad_ner_01', -1, LOCK_KALL.rotate(-30, expand=True, resample=Image.NEAREST), (19, 14), varmt=False, filt_ned=True, klipp=False)
    # hoppar: ungen i luften över skalet, glad, och toppen har trillat ned i halmen
    im = ny(); skal = ny(); m = agg(skal, ramp=SKAL, del_='botten'); im.alpha_composite(skal)
    filt(im, m, botten_rad=24); halm(im); im.alpha_composite(LOCK_KALL.rotate(180, resample=Image.NEAREST), (19, 22))
    lada_fram(im); flik(im); im = hog(im); im.alpha_composite(LD(UNGE + 'unge1_glad_ner_02.png'), (4, 0)); B['agg_hopp_01'] = im
    # kvar i lådan: skalets botten, toppen och filten
    im = ny(); skal = ny(); m = agg(skal, ramp=SKAL, del_='botten'); im.alpha_composite(skal)
    filt(im, m, botten_rad=24); halm(im); im.alpha_composite(LOCK_KALL.rotate(180, resample=Image.NEAREST), (19, 22))
    lada_fram(im); flik(im); B['agg_skal'] = im
    for k in B:                                                           # alla bilder får samma ruta, 32 x 44
        if B[k].height == H: B[k] = hog(B[k])
    return B

# ---------- krukan ----------
LERA = ['#3A1A0E', '#7A3A20', '#A8522E', '#C8704A', '#E09A6E']
def kruka_hel():
    return LD('/home/claude/inkorg/foremal/hus/kruka.png') if not os.path.exists('/home/claude/hus/ut/foremal/kruka.png') else LD('/home/claude/hus/ut/foremal/kruka.png')

def kruka_bilder():
    """Krukan (16 x 18) i en ruta på 24 x 20 med samma nederkant mitt: spricka, spricker isär, faller isär
    och skärvorna som ligger kvar. Lerans färger är en ramp, så samma bilder kan färgas om i byarna och på marknaden."""
    k = kruka_hel(); KX, KY = 4, 2
    B = {}
    def bas():
        im = Image.new('RGBA', (24, 20), (0, 0, 0, 0)); im.alpha_composite(k, (KX, KY)); return im
    # 1: en spricka från kanten och ned
    im = bas(); p = im.load()
    for (x, y) in [(10, 7), (10, 8), (11, 9), (11, 10), (10, 11), (11, 12), (12, 13), (9, 10), (8, 11)]: p[x, y] = hx(LERA[0])
    B['kruka_spricker_01'] = im
    # 2: krukan delar sig i tre bitar som glider isär, ett litet dammoln
    im = Image.new('RGBA', (24, 20), (0, 0, 0, 0))
    vanster = k.crop((0, 0, 7, 18)); hoger = k.crop((7, 0, 16, 18)); topp = k.crop((0, 0, 16, 6))
    im.alpha_composite(vanster, (KX - 1, KY + 1)); im.alpha_composite(hoger, (KX + 8, KY))
    p = im.load()
    for (x, y) in [(2, 16), (21, 15), (3, 13), (20, 12)]: p[x, y] = hx('#C8B494')
    B['kruka_spricker_02'] = im
    # 3: bitarna faller, skärvor flyger åt sidorna
    im = Image.new('RGBA', (24, 20), (0, 0, 0, 0))
    im.alpha_composite(vanster.rotate(18, expand=True, resample=Image.NEAREST).crop((0, 4, 12, 22)), (0, 4))
    im.alpha_composite(hoger.rotate(-18, expand=True, resample=Image.NEAREST).crop((0, 4, 14, 22)), (11, 4))
    p = im.load()
    for (x, y, c) in [(1, 3, 2), (2, 3, 3), (21, 2, 2), (22, 3, 3), (6, 1, 3), (17, 0, 2), (12, 2, 3), (11, 2, 2)]: p[x, y] = hx(LERA[c])
    B['kruka_spricker_03'] = im
    # skärvorna: platta bitar på golvet, låga så att han kan gå förbi
    im = Image.new('RGBA', (24, 20), (0, 0, 0, 0)); p = im.load()
    bitar = [  # (x, y, form): välvda bitar av krukan, ljus ovansida, mörk underkant
        (3, 16, ['.ooo.', 'onnnm', '.mmm.']), (10, 17, ['oooo.', 'nnnnm', '.mmm.']), (16, 15, ['.oo', 'onn', 'nnm', '.m.']),
        (19, 18, ['oo', 'nm']), (8, 15, ['o', 'm']), (14, 19, ['on'])]
    for (bx, by, form) in bitar:
        for yy, rad in enumerate(form):
            for xx, c in enumerate(rad):
                if c != '.': p[bx + xx, by + yy] = hx({'o': LERA[4], 'n': LERA[2], 'm': LERA[1]}[c])
        for yy, rad in enumerate(form):                                   # mörk kontur under biten
            for xx, c in enumerate(rad):
                if c != '.' and (yy + 1 >= len(form) or form[yy + 1][xx] == '.') and by + yy + 1 < 20 and p[bx + xx, by + yy + 1][3] == 0:
                    p[bx + xx, by + yy + 1] = hx(LERA[0])
    B['kruka_skarvor'] = im
    return B

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    alla = {**bygg(), **kruka_bilder()}
    for n, im in alla.items():
        P.las_bild(im, n).save(UT + n + ".png")
    # översikt
    rad1 = [n for n in alla if n.startswith('agg')]; rad2 = [n for n in alla if n.startswith('kruka')]
    ov = Image.new('RGBA', (max(len(rad1) * 34, 4 * 34) + 4, 44 + 26 + 6), (58, 44, 34, 255))
    for i, n in enumerate(rad1): ov.alpha_composite(alla[n], (2 + i * 34, 2))
    for i, n in enumerate(rad2): ov.alpha_composite(alla[n], (2 + i * 34, 50))
    ov.resize((ov.width * 5, ov.height * 5), Image.NEAREST).save('/home/claude/agg/agg_krukor_x5.png')
    print(len(alla), 'bilder')
