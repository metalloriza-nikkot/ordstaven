# Ankaret och SKÖLD på sandbanken (beslut 109.5): kapitlets nya formel, och det roligaste händer när han har rätt.
#   foremal/flod/ankare_faller_01–02   24 x 28  ankaret faller från luftskeppet, med fartstreck ovanför; 02 lutar lite
#                                      (det stannar i luften ovanför dem: `ankare`, som finns, med repet uppåt)
#   figurer/effekter/skold_tands_01–03 56 x 44  SKÖLD tänds: stavens regnbågsljus (01), en ring som växer (02), och
#                                      bubblan runt hjälten och ungen (03)
#   figurer/effekter/skold_bubbla_01–02 56 x 44 bubblan står kvar och skimrar (växla minst 400 ms)
#   figurer/effekter/skold_pang_01–02  24 x 16  stjärnan där ankaret slår i bubblan
#   foremal/flod/ankare_studsar_01–03  24 x 28  ankaret som studsar av bubblan och snurrar i en båge (ett kvarts varv per bild)
#   foremal/flod/ankare_borrar_01–02   24 x 28  ankaret slår ned i sanden och borrar ned sig, och sanden yr. Sedan
#                                      `ankare_sand`, som finns
# Bubblan har bara en kant och några blänk, ingen halvgenomskinlig yta (golvdatorn). Fötterna: nederkanten mitt i.
# Bubblan är aldrig guld (guld är rätt svar i läsvalen): kanten går i regnbågens färger, som stavens ljus.
import os, sys, math
_s = open('/home/claude/k3/foremal_k3.py').read(); exec(_s[:_s.rindex("if __name__ == '__main__':")] if "if __name__ == '__main__':" in _s else _s.split('ALLA = {')[0])
from PIL import Image
REGNBAGE = ['#e8443a', '#f2c94a', '#86b85a', '#4f7ae8', '#9a6ad8']

def ny(b, h): return Image.new('RGBA', (b, h), (0, 0, 0, 0))
def bas_ankare(rep=False):
    im = ankare(False)
    if not rep:
        p = im.load()
        for y in range(0, 2):
            for x in range(im.width): p[x, y] = (0, 0, 0, 0)
    return im

def ankare_faller(n):
    im = ny(24, 28); a = bas_ankare(False)
    if n == 2: a = a.rotate(-8, resample=Image.NEAREST, center=(12, 4))
    im.alpha_composite(a, (0, 0))
    for (x, y0, l) in ((6, 0, 5), (17, 1, 4), (9, 0, 2), (15, 0, 3)):                # fartstreck ovanför
        rita(im, [(x, y, '#eeeff4' if (y + n) % 2 else '#c8cad4') for y in range(y0, y0 + l) if im.getpixel((x, y))[3] == 0])
    return im

def bubbla(b, h, r_del, fas, tand=1.0):
    """En bubbla (ellips) med regnbågskant; r_del 0..1 hur stor den har vuxit."""
    im = ny(b, h); cx, cy = b / 2, h - 2 - (h - 4) / 2 * r_del
    rx, ry = (b / 2 - 1) * r_del, (h / 2 - 2) * r_del
    pts = []
    if rx < 1: return im
    for a10 in range(0, 3600, 3):
        a = math.radians(a10 / 10)
        for d in (0, 1):
            x = int(round(cx + (rx - d) * math.cos(a) - .5)); y = int(round(cy + (ry - d) * math.sin(a) - .5))
            if y > h - 2: continue
            band = int(((a10 / 10 + fas * 24) % 360) / 72)
            c = REGNBAGE[band] if d == 0 else '#eeeff4'
            pts.append((x, y, c))
    for k in range(10):                                                                # blänk uppe till vänster
        a = math.radians(200 + k * 6)
        pts.append((int(cx + (rx - 4) * math.cos(a)), int(cy + (ry - 4) * math.sin(a)), '#ffffff'))
    for k in range(4):
        a = math.radians(30 + k * 7 + fas * 3)
        pts.append((int(cx + (rx - 3) * math.cos(a)), int(cy + (ry - 3) * math.sin(a)), '#dce0e4'))
    for (x, y) in ((cx - rx * 0.5, cy - ry * 0.6), (cx + rx * 0.35, cy - ry * 0.75)):   # glitter inne i bubblan
        if r_del > 0.9: pts += [(int(x), int(y), '#ffffff'), (int(x) + 1, int(y), '#dce0e4') if fas % 2 else (int(x), int(y) + 1, '#dce0e4')]
    return rita(im, pts)

def skold_tands(n):
    if n == 1:                                                                         # stavens ljus: en regnbågsgnista mitt i
        im = ny(56, 44); cx, cy = 28, 26
        pts = [(cx, cy, '#ffffff')]
        for i, c in enumerate(REGNBAGE):
            a = math.radians(i * 72 + 18)
            for r in (2, 3, 4): pts.append((int(round(cx + r * math.cos(a))), int(round(cy + r * math.sin(a))), c))
        for a in range(0, 360, 45): pts.append((int(round(cx + 6 * math.cos(math.radians(a)))), int(round(cy + 6 * math.sin(math.radians(a)))), '#eeeff4'))
        return rita(im, pts)
    return bubbla(56, 44, 0.55 if n == 2 else 1.0, n)

def skold_bubbla(n): return bubbla(56, 44, 1.0, 3 + n)

def skold_pang(n):
    im = ny(24, 16); cx, cy = 12, 9; pts = []
    for a in range(0, 360, 45):
        l = (7 if a % 90 == 0 else 4) + (1 if n == 2 else 0)
        for r in range(1, l):
            pts.append((int(round(cx + r * math.cos(math.radians(a + (22 if n == 2 else 0))))), int(round(cy + r * 0.7 * math.sin(math.radians(a + (22 if n == 2 else 0))))), '#ffffff' if r < 3 else '#f2c94a' if a % 90 == 0 else '#dce0e4'))
    pts.append((cx, cy, '#ffffff'))
    return rita(im, pts)

def ankare_studsar(n):
    im = ny(24, 28); a = bas_ankare(False)
    im.alpha_composite(a.transpose((Image.Transpose.ROTATE_270, Image.Transpose.ROTATE_180, Image.Transpose.ROTATE_90)[n - 1]).crop((0, 0, 24, 28)) if n != 2 else a.transpose(Image.Transpose.ROTATE_180), (0, 0) if n == 2 else (-2, 0))
    return im

def ankare_borrar(n):
    im = ny(24, 28); a = bas_ankare(False)
    djup = (-4, 0)[n - 1]                                                              # 01: armarna slår i sanden, 02: nere
    im.alpha_composite(a, (0, djup))
    p = im.load()
    for y in range(21, 28):                                                            # under sanden syns inget
        for x in range(24): p[x, y] = (0, 0, 0, 0)
    pts = [(x, 20, '#c49a72') for x in range(5, 19)] + [(x, 21, '#a08a6e') for x in range(4, 20)]
    for (x, y, c) in ((3, 16, '#e8d2b0'), (2, 14, '#c49a72'), (20, 15, '#e8d2b0'), (21, 13, '#c49a72'), (5, 12, '#e8d2b0'),
                      (19, 11, '#c49a72'), (1, 18, '#a08a6e'), (22, 18, '#a08a6e')):        # sanden yr
        if n == 2: y -= 3; x += -1 if x < 12 else 1
        pts.append((x, y, c))
    return rita(im, pts)

UT_ALLA = {
    'foremal/flod/ankare_faller_01': lambda: ankare_faller(1), 'foremal/flod/ankare_faller_02': lambda: ankare_faller(2),
    **{f'figurer/effekter/skold_tands_0{n}': (lambda n=n: skold_tands(n)) for n in (1, 2, 3)},
    **{f'figurer/effekter/skold_bubbla_0{n}': (lambda n=n: skold_bubbla(n)) for n in (1, 2)},
    **{f'figurer/effekter/skold_pang_0{n}': (lambda n=n: skold_pang(n)) for n in (1, 2)},
    **{f'foremal/flod/ankare_studsar_0{n}': (lambda n=n: ankare_studsar(n)) for n in (1, 2, 3)},
    **{f'foremal/flod/ankare_borrar_0{n}': (lambda n=n: ankare_borrar(n)) for n in (1, 2)},
}

if __name__ == '__main__':
    UT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k3/ut109'
    for rel, fn in UT_ALLA.items():
        os.makedirs(os.path.dirname(f'{UT}/{rel}'), exist_ok=True); _p.las_bild(fn(), rel).save(f'{UT}/{rel}.png')
    print(len(UT_ALLA), 'bilder')
