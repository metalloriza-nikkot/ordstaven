# Sköldpaddan i den gemensamma skalan (beslut 102.4), ön som stiger i sex bildbyten, vattenhjulet som snurrar
# och hornet på avsatsen. Samma ritning som rummen (myt.py), så att skalet är 280 × 192 i alla vyer.
#   foremal/flod/on_floden.png               ön i floden när den har stigit, med huvudet i vattnet (480 × 320)
#   foremal/flod/on_stiger_01–06.png         ön som stiger: skuggan, vattnet välver sig, forsar av, rinner, droppar (480 × 320)
#   foremal/flod/skoldpadda_simmar_01–02.png ön som simmar i resan, fenorna växelvis (480 × 320)
#   foremal/flod/skoldpadda_huvud_*.png      huvudet på sandbanken: vilar, lyft, ropar, puffar, nickar, tittar (96 × 64)
#   foremal/flod/skoldpadda_huvud_vatten_01–02.png  huvudet ur vattnet vid ön (96 × 64)
#   foremal/flod/skoldpadda_fena_*.png       framfenan: sanden, lyft, trappa (72 × 36)
#   foremal/flod/vattenhjul_01–06.png        hjulet som snurrar, och vattenhjul_stilla.png (58 × 56)
#   foremal/flod/plats_ring_01–02.png         märket där han väljer plats: en ljus ring (18 × 10), mitt på platsen
#   foremal/flod/hornet_avsats_mjol.png, hornet_avsats_rent.png   hornet på avsatsen, uppifrån (24 × 36)
# Alla bilder i samma serie har samma storlek och samma mittpunkt, så att Teknik byter bild utan att flytta den.
import os, sys, math, random
sys.path.insert(0, '/home/claude/skiss3'); sys.path.insert(0, '/home/claude/rum3')
os.chdir('/home/claude/skiss3')
from avsats import *
import myt
from myt import TULP, ALG, SKAL, HUD
from rum3 import kras_alfa
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
UT = '/home/claude/rum3/ut/foremal/flod'
RX, RY = myt.SKALSKALA

def tom(b, h):
    d = Duk(b, h); d.im = Image.new('RGBA', (b, h), (0, 0, 0, 0)); d.px = d.im.load(); return d

def genom(d, x, y): return d.inne(x, y) and d.px[x, y][3] == 0

# ---------------- ön ----------------
OB, OH = 480, 320
OC = (250, 150)                                                            # skalets mitt i bilden
HUV = (OC[0] - 160, OC[1] - 6)                                             # huvudet i vattnet, mot väster

def ringar(d, radier, glest=3, farg=None):
    cx, cy = OC
    for k, rr in enumerate(radier):
        for a10 in range(0, 3600, 5):
            a = math.radians(a10 / 10); x = int(cx + RX * rr * math.cos(a)); y = int(cy + 14 + RY * rr * math.sin(a))
            if genom(d, x, y) and (a10 // 5 + k) % glest: d.satt(x, y, farg or (VATT[4] if k else '#FFFFFF'))

def skum(d, tat=1.0, dy=16):
    cx, cy = OC
    for a10 in range(0, 3600, 6):
        a = math.radians(a10 / 10)
        if math.sin(a) < -0.8 or brus(a10, 3, 5) > tat: continue
        r = 1.05 + 0.05 * math.sin(a10 / 37)
        x = int(cx + RX * r * math.cos(a)); y = int(cy + dy + RY * r * math.sin(a))
        d.satt(x, y, '#FFFFFF'); d.satt(x + 1, y, '#DCE0E4')
        if brus(a10, 7, 2) < tat * 0.5: d.satt(x, y + 1, VATT[4])

def strommar(d, langd, tat=1.0):
    """Vatten som forsar av skalets kant och ned längs sidan."""
    cx, cy = OC
    for a10 in range(150, 3450, 22):
        a = math.radians(a10 / 10)
        if math.sin(a) < 0.1 or brus(a10, 1, 9) > tat: continue
        x = int(cx + RX * math.cos(a)); y0 = int(cy + RY * math.sin(a)) - 2
        for j in range(langd):
            d.satt(x, y0 + j, '#FFFFFF' if (j + a10) % 5 < 2 else VATT[4]); d.satt(x + 1, y0 + j, VATT[4])
        d.satt(x - 1, y0 + langd, '#FFFFFF'); d.satt(x + 2, y0 + langd, '#FFFFFF')

def ryggen_blot(d, vatten, poler=True, glitter=True):
    """Vatten som ligger kvar på ryggen: en blank hinna (vatten 0–1), pölar och glitter."""
    cx, cy = OC
    for y in range(int(cy - RY), int(cy + RY)):
        for x in range(int(cx - RX), int(cx + RX)):
            u = ((x + .5 - cx) / RX) ** 2 + ((y + .5 - cy) / RY) ** 2
            if u > 1 or genom(d, x, y): continue
            if vatten > 0 and slat(x, y, 9, 4) < vatten: d.satt(x, y, blanda(d.get(x, y), VATT[3], 0.6)); continue
            if poler and slat(x, y, 7, 4) > 0.66: d.satt(x, y, blanda(d.get(x, y), VATT[3], 0.55))
            if glitter and u > 0.66 and (x * 3 + y // 2) % 11 == 0: d.satt(x, y, '#FFFFFF')

def stank(d, punkter):
    for (x, y) in punkter:
        for (dx, dy) in ((0, 0), (1, -1), (-1, -1), (2, 0), (0, -2)): d.satt(x + dx, y + dy, '#FFFFFF')

def on_bild(steg):
    """steg: 'floden' (lugn), 1–6 (stiger), 'simmar1', 'simmar2'."""
    d = tom(OB, OH); cx, cy = OC
    if steg == 1:                                                           # ett mörkt jätteskal under ytan, och bubblor
        for y in range(OH):
            for x in range(OB):
                u = ((x + .5 - cx) / (RX * 0.95)) ** 2 + ((y + .5 - cy - 10) / (RY * 0.92)) ** 2
                if u < 1 and ((x + y) % 2 == 0 or u < 0.55) and (x % 2 == 0 or u < 0.8): d.satt(x, y, VATT[0])
        for k in range(12):                                                 # stora bubblor som stiger
            a = k * 2.3; r = 0.2 + (k * 37 % 70) / 100
            x, y = int(cx + RX * r * math.cos(a)), int(cy + RY * r * math.sin(a))
            d.ellips(x, y, 2.6, 2.2, VATT[3], '#FFFFFF'); d.satt(x - 1, y - 1, '#FFFFFF')
        ringar(d, (1.1,), glest=4)
        return d
    if steg == 2:                                                           # vattnet välver sig: skalet strax under, plattorna anas
        myt.skal(d, cx, cy, seed=5, trad=[(cx + 30, cy - 40, 1.2)])
        for y in range(OH):
            for x in range(OB):
                if not genom(d, x, y): d.satt(x, y, blanda(d.get(x, y), VATT[2], 0.72 if slat(x, y, 8, 3) > 0.35 else 0.58))
        skum(d, 0.55, 8); ringar(d, (1.15, 1.3), glest=3)
        stank(d, [(cx - 90, cy - 80), (cx + 110, cy - 70)])
        return d
    if steg in (3, 4, 5, 6, 'floden', 'simmar1', 'simmar2'):
        myt.skal(d, cx, cy, seed=5, trad=[(cx + 30, cy - 40, 1.2)])
    if steg == 3:                                                           # ryggen bryter ytan: vattnet täcker den och forsar av
        ryggen_blot(d, 0.62); strommar(d, 18, 1.0); skum(d, 1.0)
        ringar(d, (1.2, 1.4), glest=3)
        stank(d, [(cx - 150, cy - 70), (cx + 150, cy - 80), (cx - 100, cy - 110), (cx + 60, cy - 112), (cx - 160, cy + 10), (cx + 170, cy - 20)])
    elif steg == 4:                                                         # vattnet rinner av i strömmar, pölar blir kvar
        ryggen_blot(d, 0.25); strommar(d, 14, 0.8); skum(d, 0.9)
        ringar(d, (1.3, 1.5), glest=3)
        stank(d, [(cx - 130, cy - 90), (cx + 140, cy - 90)])
    elif steg in (5, 6):                                                    # det droppar, och skummet lägger sig (5 och 6 växlar)
        ryggen_blot(d, 0.0); strommar(d, 6 if steg == 5 else 9, 0.45 if steg == 5 else 0.35); skum(d, 0.55)
        ringar(d, ((1.42,) if steg == 5 else (1.5,)), glest=4, farg=VATT[4])
    elif steg == 'floden':                                                  # lugn: en smal ljus vattenlinje och en ring
        ryggen_blot(d, 0.0, poler=True, glitter=False)                     # torr kant: inga glittrande prickar, de såg ut som snö
        skum(d, 0.3)
    if steg in (2, 3, 4, 5, 6, 'floden'):
        hx_, hy = HUV
        myt.huvud(d, hx_, hy + (6 if steg == 2 else 0), 1.2, mot='vanster', i_vatten=True, oga=('stangt' if steg in (2, 3) else 'oppet'))
    if steg in ('simmar1', 'simmar2'):                                      # framåt mot väster, fenorna växelvis, kölvatten bakåt
        a = steg == 'simmar1'
        myt.fena(d, cx - 132 - (6 if a else 0), cy + 62, 1.3, mot='vanster', lyft=a)          # framfenorna
        myt.fena(d, cx - 128 - (0 if a else 6), cy - 50, 1.1, mot='vanster', lyft=not a)
        myt.fena(d, cx + 128 + (4 if a else 0), cy + 58, 0.7, mot='hoger', lyft=not a)          # bakfenorna, små
        myt.fena(d, cx + 124 + (0 if a else 4), cy - 52, 0.6, mot='hoger', lyft=a)
        myt.skal(d, cx, cy, seed=5, trad=[(cx + 30, cy - 40, 1.2)])
        myt.huvud(d, HUV[0] + 4, HUV[1], 1.2, mot='vanster', i_vatten=True, oga='oppet')
        for k in range(2):                                                  # kölvattnet i ett V bakåt
            for i in range(70):
                for sg in (-1, 1):
                    x = int(cx + RX * 0.9 + i * 1.6); y = int(cy + 14 + sg * (RY * 0.7 + i * 0.7)) + k * 3 * sg
                    if (i + k + (0 if a else 2)) % 4 and genom(d, x, y): d.satt(x, y, '#FFFFFF' if k == 0 else VATT[4])
        for i in range(20):                                                 # bogvågen framför huvudet
            yy = HUV[1] - 20 + i * 2
            x = int(HUV[0] - 42 - 6 * math.sin(i / 19 * math.pi) - (2 if a else 0))
            if genom(d, x, yy): d.satt(x, yy, '#FFFFFF')
    return d

# ---------------- huvudet och fenan ----------------
def huvud_bild(lage):
    d = tom(96, 64)
    cx, cy = 52, 28
    opts = {'vilar': dict(oga='halvt'), 'lyft': dict(dy=-4, oga='oppet'), 'ropar': dict(oppen=True, oga='stort'),
            'puffar': dict(dx=-3, oga='stangt'), 'nickar': dict(dy=4, oga='stangt'), 'tittar': dict(oga='stort')}
    if lage.startswith('vatten'):
        b = int(lage[-1])
        myt.huvud(d, cx, cy + (1 if b == 2 else 0), 1.2, mot='vanster', oga='oppet')
        for y in range(46, 64):                                              # under vattenytan: bara ringar och skum
            for x in range(96): d.px[x, y] = (0, 0, 0, 0)
        for x in range(4, 92):
            if (x + b * 2) % 3: d.satt(x, 46, '#FFFFFF')
            if (x + b) % 4 == 0: d.satt(x, 48, VATT[4])
        for (x, y) in ((28, 50), (60, 50), (14, 52)) if b == 1 else ((32, 52), (64, 51), (20, 50)):
            d.satt(x, y, '#FFFFFF'); d.satt(x + 1, y, VATT[4])                 # droppar från skägget
        return d
    o = opts[lage]
    myt.huvud(d, cx + o.get('dx', 0), cy + o.get('dy', 0), 1.2, mot='vanster', oppen=o.get('oppen', False), oga=o['oga'])
    return d

def fena_bild(lage):
    """Vänstra framfenan, 72 x 36. Handleden (roten) står i (65, 16), där armen i rummets bild slutar
    (kartans fena_plats 186, 132 + 65, 16 = 251, 148). Spetsen pekar mot väster."""
    d = tom(72, 36)
    if lage == 'trappa': myt.fena2(d, 65, 18, 1.15, mot='vanster', trappa=True)
    else: myt.fena2(d, 65, 16, 1.15, mot='vanster', lyft=(lage == 'lyft'))
    for (x, y) in ((64, 14), (65, 16), (66, 18)): pass
    return d

# ---------------- hjulet och hornet ----------------
def plats_ring(b):
    """Märket där han väljer plats (säckarna, fenan och huvudet): en ljus ring på marken, samma ring som i bildkorten.
    Aldrig guld, som är rätt svar. Bild 2 är lite ljusare, så att ringen andas (minst 400 ms per bild)."""
    d = tom(18, 10)
    for a10 in range(0, 3600, 4):
        a = math.radians(a10 / 10); x = int(round(9 + 7.5 * math.cos(a) - .5)); y = int(round(5 + 3.6 * math.sin(a) - .5))
        uppe = math.sin(a) < 0
        if not uppe and genom(d, x, y + 1): d.satt(x, y + 1, '#5A4A36')            # en mörk kant under, så att ringen syns på ljus sand
        d.satt(x, y, ('#F2F6F8' if b == 2 else '#DCE0E4') if not uppe else ('#DCE0E4' if b == 2 else '#B8BEC6'))
    for (x, y) in ((2, 5), (16, 5)): d.satt(x, y, '#F2F6F8')
    return d

def hjul_bild(steg):
    d = tom(58, 56)
    myt.vattenhjul(d, 29, 26, 24, snurrar=steg > 0, tang=False, vatten_y=38, vinkel=(steg - 1) * 10 if steg else 0)
    return d

def horn_bild(mjol):
    """Hornet uppifrån på avsatsen: foten bak mot väggen (norr), röret böjer sig söderut och klockan sticker ut över räcket."""
    d = tom(24, 36)                                                          # kartans hornet_plats på 0.94.1 (572, 87, 24 x 36)
    hx, hy = 19, 3
    for y in range(2, 9):                                                    # foten av drivved, som sticker fram under munstycket
        for x in range(hx - 4, hx + 4): d.satt(x, y, DRIV[2] if x < hx else DRIV[1])
    for x in range(hx - 4, hx + 4): d.satt(x, 9, DRIV[0])
    for i in range(36):
        t = i / 35; x = hx - 6 * math.sin(t * 2.4); y = hy - 2 + 22 * t
        r = 2.4 + 1.0 * t + (5.5 * ((t - 0.7) / 0.3) ** 1.5 if t > 0.7 else 0)
        d.ellips(x, y, r, r * 0.6, MASS[2] if i % 6 else MASS[1], MASS[0])
        d.satt(int(x - r * 0.5), int(y - 1), MASS[4])
    d.ellips(hx - 6 * math.sin(2.4), hy + 21, 6.5, 3, '#24160C', MASS[3])    # klockans öppning mot floden
    if mjol:
        for y in range(36):
            for x in range(24):
                if not genom(d, x, y) and d.get(x, y).upper() in {c.upper() for c in MASS} and brus(x, y, 6) < 0.3:
                    d.satt(x, y, MJOL[1] if brus(x, y, 2) < 0.5 else MJOL[0])
    return d

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    P = Palett()
    ut = {}
    ut['on_floden'] = on_bild('floden')
    for k in range(1, 7): ut[f'on_stiger_{k:02d}'] = on_bild(k)
    ut['skoldpadda_simmar_01'] = on_bild('simmar1'); ut['skoldpadda_simmar_02'] = on_bild('simmar2')
    for l in ('vilar', 'lyft', 'ropar', 'puffar', 'nickar', 'tittar'): ut[f'skoldpadda_huvud_{l}'] = huvud_bild(l)
    for k in (1, 2): ut[f'skoldpadda_huvud_vatten_{k:02d}'] = huvud_bild(f'vatten{k}')
    for l in ('sanden', 'lyft', 'trappa'): ut[f'skoldpadda_fena_{l}'] = fena_bild(l)
    ut['vattenhjul_stilla'] = hjul_bild(0)
    for k in range(1, 7): ut[f'vattenhjul_{k:02d}'] = hjul_bild(k)
    ut['plats_ring_01'] = plats_ring(1); ut['plats_ring_02'] = plats_ring(2)
    ut['hornet_avsats_mjol'] = horn_bild(True); ut['hornet_avsats_rent'] = horn_bild(False)
    for n, d in ut.items():
        im = kras_alfa(d.im)
        P.las_bild(im, n).save(f'{UT}/{n}.png')
    print(len(ut), 'bilder')
