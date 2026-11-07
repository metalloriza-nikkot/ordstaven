# Ordkraftens ljus (beslut 39.2), SVÄRD som hjälten hugger med och lianerna som faller (39.3). Stil 2026-11-04.
#
# figurer/effekter/efx_ordkraft_01–04.png   32 x 32  regnbågsljuset som pulserar ut, mitt på det som blir något
# figurer/stav/svard_hand_<riktning>_01.png  16 x 32  staven som svärd i handen när han går (hjälten står 8 ned)
# figurer/stav/svard_svinga_<riktning>_01–03 48 x 48  staven som svärd när han hugger (hjältens svingbild 8 in, 4 ned)
# foremal/skog/lian_a, lian_b                  24 x 48  en lian i lianväggen, två varianter som läggs omväxlande
# foremal/skog/lian_hugg_01–02, lian_kvar      24 x 48  lianen som huggs av, faller och ligger kvar
# foremal/skog/liten_lian, _hugg_01, _kvar      28 x 28  den lilla lianen framför stubben
#
# Läser hjältens svingbilder ur hjalte2/ (hanim.py) och ritar resten själv. Allt läses till masterpaletten.
import os, sys, math, random
from PIL import Image
HJ = '/home/claude/hjalte2/'
_cwd = os.getcwd(); os.chdir(HJ)
exec(open(HJ + 'hanim.py').read().rsplit("\nif __name__=='__main__':", 1)[0])
os.chdir(_cwd)
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
def hx2(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
UT = '/home/claude/svard/ut/'
REGN = ['#F4A6B8', '#8FCBF2', '#3A5AD8', '#F2D22E', '#F08A2A', '#D9443A']   # stavens färger, som i kläckningen
BLAD = ['#8A6A20', '#C8A040', '#FFD95A', '#FFF2B0', '#FFFBEA']               # klingan: kontur, skugga, guld, ljus, högdager

# ---------- ordkraftens ljus ----------
def regn_farg(y, cy, r):
    """Kall upptill och varm nertill, som staven och som ringen runt ägget."""
    t = (y - (cy - r)) / max(1, 2 * r)
    return REGN[min(5, max(0, int(t * 6)))]

def ordkraft():
    """Fyra bilder: en gnista, en ring som växer, en glesare ring och några sista gnistor.
    Teknik visar dem efter varandra (ca 70 ms var) mitt på staven eller på det som orden blev."""
    B = []
    cx = cy = 15.5
    for steg, (r, glest, kärna) in enumerate([(3.0, 1, 2), (6.0, 1, 1), (9.5, 1, 0), (12.5, 2, 0)]):
        im = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); p = im.load()
        for y in range(32):
            for x in range(32):
                d = math.hypot(x + 0.5 - 16, y + 0.5 - 16)
                if abs(d - r) < 0.75 and (x + y) % glest == 0:
                    p[x, y] = hx2(regn_farg(y, 16, r))
                if d < kärna: p[x, y] = hx2('#FFFBEA')
        # fyra korta strålar och små gnistor mellan dem
        for (a, b) in [(0, -1), (1, 0), (0, 1), (-1, 0)]:
            for k in range(2):
                q = r + 2 + k
                x, y = int(16 + a * q - (a < 0)), int(16 + b * q - (b < 0))
                if 0 <= x < 32 and 0 <= y < 32 and (steg < 3 or k == 0): p[x, y] = hx2('#FFFBEA' if k == 0 else regn_farg(y, 16, r))
        if steg >= 1:
            for v in range(4):
                a = math.radians(45 + 90 * v + steg * 12)
                x, y = int(16 + math.cos(a) * (r + 1.5)), int(16 + math.sin(a) * (r + 1.5))
                if 0 <= x < 32 and 0 <= y < 32: p[x, y] = hx2('#FFFBEA')
        B.append(im)
    return B

# ---------- staven som svärd ----------
CW2, CH2, DX, DY = 48, 48, 8, 4          # svärdets ruta: hjältens svingbild (32 x 40) ligger 8 in och 4 ned

def klinga(p, x0, y0, dx, dy, langd=9, w=CW2, h=CH2):
    """Klingan av guld som växer ur stavens kalla ände: två pixlar bred, ljus kärna, spets."""
    n = math.hypot(dx, dy); dx /= n; dy /= n
    nx, ny = -dy, dx
    if nx + ny < 0: nx, ny = -nx, -ny                                    # skuggsidan nedåt höger
    pix = {}
    for s in range(langd * 2 + 1):
        t = s / 2
        x, y = x0 + dx * t, y0 + dy * t
        X, Y = int(round(x)), int(round(y))
        spets = t > langd - 1.5
        pix[(X, Y)] = BLAD[3] if not spets else BLAD[4]
        if not spets:
            X2, Y2 = int(round(x + nx)), int(round(y + ny)); pix.setdefault((X2, Y2), BLAD[1])
            X3, Y3 = int(round(x - nx)), int(round(y - ny)); pix.setdefault((X3, Y3), BLAD[2])
    kant = set()
    for (X, Y) in pix:
        for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (X + a, Y + b)
            if q not in pix: kant.add(q)
    for q in kant:
        if 0 <= q[0] < w and 0 <= q[1] < h and p[q][3] == 0: p[q] = hx2(BLAD[0])
    for (X, Y), c in pix.items():
        if 0 <= X < w and 0 <= Y < h: p[X, Y] = hx2(c)
    return (int(round(x0 + dx * langd)), int(round(y0 + dy * langd)))

def svep(p, cx, cy, r, fran, till):
    """Svepet efter klingan: en båge av ljust guld och vitt, glesare längst bak."""
    steg = 22
    for i in range(steg + 1):
        a = math.radians(fran + (till - fran) * i / steg)
        x, y = int(round(cx + math.cos(a) * r)), int(round(cy + math.sin(a) * r))
        if 0 <= x < CW2 and 0 <= y < CH2 and (i > steg * 0.35 or i % 2 == 0):
            p[x, y] = hx2(BLAD[4] if i > steg * 0.6 else BLAD[3])
            x2, y2 = int(round(cx + math.cos(a) * (r - 1))), int(round(cy + math.sin(a) * (r - 1)))
            if i > steg * 0.5 and p[x2, y2][3] == 0: p[x2, y2] = hx2(BLAD[2])

SVING = {'ner': [((2, 12), (-0.35, -1)), ((5, 17), (1, -0.15)), ((10, 18), (0.9, 0.42))],
         'hoger': [((7, 12), (-0.45, -1)), ((11, 15), (1, -0.25)), ((11, 17), (0.9, 0.42))],
         'upp': [((14, 12), (0.3, -1)), ((11, 12), (-0.8, -0.75)), ((6, 14), (-1, 0.1))]}
SVEP = {'ner': (8, 8, 200, 330), 'hoger': (11, 10, 250, 380), 'upp': (11, 9, 300, 170)}

def svard_svinga():
    """Samma sving som med staven (hanim.py), men stavens lager har en klinga av guld och bild 2 har ett svep."""
    B = {}
    for rikt, rad in SVING.items():
        for i, (hand, r) in enumerate(rad):
            s = stav_linje(hand, r); hand_pix(s, hand)
            im = Image.new('RGBA', (CW2, CH2), (0, 0, 0, 0)); im.alpha_composite(s, (DX, DY)); p = im.load()
            n = math.hypot(*r); ux, uy = r[0] / n, r[1] / n
            tx, ty = hand[0] + OX + DX + ux * 14.5, hand[1] + OY + DY + uy * 14.5
            klinga(p, tx, ty, ux, uy)
            if i == 1:
                hcx, hcy, a0, a1 = SVEP[rikt]
                svep(p, hand[0] + OX + DX, hand[1] + OY + DY, 21, a0, a1)
            B[f'svard_svinga_{rikt}_{i+1:02d}'] = im
    for i in range(1, 4):
        B[f'svard_svinga_vanster_{i:02d}'] = B[f'svard_svinga_hoger_{i:02d}'].transpose(Image.FLIP_LEFT_RIGHT)
    return B

def svard_hand():
    """Staven i handen med klingan uppåt ur den kalla änden, i en ruta som är 8 högre än hjältens."""
    kod = open(HJ + 'stav.py').read().split('\n', 1)[1].rsplit("\nif __name__=='__main__':", 1)[0]   # hjalte.py är redan läst
    exec(kod, globals())
    B = {}
    for rikt in ('ner', 'hoger', 'upp', 'vanster'):
        s = STAV[rikt]
        im = Image.new('RGBA', (16, 32), (0, 0, 0, 0)); im.alpha_composite(s, (0, 8)); p = im.load()
        xs = [x for x in range(16) for y in range(24) if s.getpixel((x, y))[3] and y == 3]
        x0 = sum(xs) / len(xs)
        klinga(p, x0, 10.5, 0, -1, langd=8, w=16, h=32)
        B[f'svard_hand_{rikt}_01'] = im
    return B

# ---------- lianerna ----------
GRON = ['#14301A', '#1E4A24', '#2E6A30', '#4A8E3A', '#78B456']
def lian(variant=0, w=24, h=48, klipp=None, fall=0, ligger=False):
    """En lian: tre slingrande strängar som hänger från trädkronan, med blad i klungor. klipp = raden där den
    huggs av. Det som är under klippet faller fall pixlar, eller ligger i en hög på marken (ligger)."""
    random.seed(20 + variant)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    sk = w / 24
    strängar = [(int((3 + variant) * sk), 1.6, 0.0, h - 3), (int(9 * sk), 2.2, 1.3, h - 9 - 3 * variant),
                (int(14 * sk), 1.8, 2.1, h - 2), (int((20 - variant) * sk), 1.4, 3.0, h - 6)]
    pix = {}
    def xs(bx, amp, fas, y): return int(round(bx + amp * math.sin(y / 5.5 + fas) + 0.8 * math.sin(y / 2.3 + fas * 2)))
    for (bx, amp, fas, slut) in strängar:
        for y in range(slut):
            x = xs(bx, amp, fas, y)
            ljus = math.cos(y / 5.5 + fas) > 0
            pix[(x, y)] = 3 if ljus else 2
            pix.setdefault((x + 1, y), 1)
        for (a, b, t) in [(0, slut, 3), (-1, slut, 2), (1, slut + 1, 2)]:      # en liten tofs längst ned
            pix[(xs(bx, amp, fas, slut) + a, b)] = t
    for (bx, amp, fas, slut) in strängar:                                   # blad, omväxlande åt vänster och höger
        y = 5 + random.randint(0, 4); sida = random.choice((-1, 1))
        while y < slut - 2:
            x = xs(bx, amp, fas, y) + sida * 2
            for (a, b, t) in [(0, 0, 3), (sida, 0, 4), (0, 1, 2), (sida, 1, 3), (sida * 2, 1, 2)]:
                pix[(x + a, y + b)] = t
            y += random.randint(4, 7); sida = -sida
    for x in range(w):                                                      # kronan: oregelbunden nederkant
        botten = 2 + int(1.5 + 1.5 * math.sin(x * 0.9 + variant)) + (x * 5 % 3 == 0)
        for y in range(0, botten):
            pix[(x, y)] = 1 if (x * 3 + y) % 4 else 2
        if x % 5 == 2: pix[(x, 0)] = 3
    over, under = {}, {}
    for (x, y), t in pix.items():
        if not (0 <= x < w and 0 <= y < h): continue
        (under if klipp is not None and y > klipp else over)[(x, y)] = t
    def rita(m, ox=0, oy=0):
        kant = set()
        for (x, y) in m:
            for (a, b) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + a, y + b) not in m: kant.add((x + a + ox, y + b + oy))
        for q in kant:
            if 0 <= q[0] < w and 0 <= q[1] < h and p[q][3] == 0: p[q] = hx2(GRON[0])
        for (x, y), t in m.items():
            X, Y = x + ox, y + oy
            if 0 <= X < w and 0 <= Y < h: p[X, Y] = hx2(GRON[t])
    rita(over)
    if klipp is not None:
        for (x, y) in list(over):                                           # snittet är ljust, färskt
            if y == klipp and p[x, y][3]: p[x, y] = hx2('#C8E36A')
        if ligger:                                                          # en hög av strängar och blad på marken
            hog = {}
            for (x, y), t in under.items():
                X = x; Y = h - 3 - int((y - klipp) / (h - klipp) * 4)
                hog[(X, Y)] = t
            rita(hog)
        else:
            rita(under, 1 if fall > 4 else 0, fall)
    return im

if __name__ == '__main__':
    alla = {}
    for i, im in enumerate(ordkraft()): alla[f'figurer/effekter/efx_ordkraft_{i+1:02d}'] = im
    for k, im in svard_svinga().items(): alla['figurer/stav/' + k] = im
    for k, im in svard_hand().items(): alla['figurer/stav/' + k] = im
    alla['foremal/skog/lian_a'] = lian(0); alla['foremal/skog/lian_b'] = lian(1)
    alla['foremal/skog/lian_hugg_01'] = lian(0, klipp=22, fall=3)
    alla['foremal/skog/lian_hugg_02'] = lian(0, klipp=22, fall=12)
    alla['foremal/skog/lian_kvar'] = lian(0, klipp=22, ligger=True)
    alla['foremal/skog/liten_lian'] = lian(2, w=28, h=28)
    alla['foremal/skog/liten_lian_hugg_01'] = lian(2, w=28, h=28, klipp=12, fall=6)
    alla['foremal/skog/liten_lian_kvar'] = lian(2, w=28, h=28, klipp=12, ligger=True)
    for k, im in alla.items():
        os.makedirs(os.path.dirname(UT + k), exist_ok=True); P.las_bild(im, k).save(UT + k + '.png')
    print(len(alla), 'bilder')
