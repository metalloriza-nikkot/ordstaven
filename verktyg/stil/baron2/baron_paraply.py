# Fäktas på skämt (beslut 109.7, ja 19/11): baronen hänger på repstegen och petar ned mot hjälten med ett
# paraply, en gång per kort. Vid rätt kort tänds SKÖLD, paraplyet studsar mot bubblan och vänds ut och in. Vid sista
# kortet blir paraplyet en fallskärm som han hänger i medan stegen rullas upp.
# Paraplyet är baronens: orange och vitt i ränder (orange är baronens färg), med ett krokigt handtag av trä.
#   figurer/baronen/baronen_stege_petar_<utr>_01–02.png   32 x 52   handen ned med det stängda paraplyet; i 02 petar han
#                                                       (paraplyet 3 px längre ned). Baronen står som i baronen_stege_*:
#                                                       sidorepen i x 6 och 18, fötterna på steget i y 27. Bilden är
#                                                       bredare och högre åt höger och nedåt, så samma hörn gäller
#   figurer/baronen/baronen_stege_utochin_<utr>_01.png  32 x 52   paraplyet vänt ut och in, och baronen förvirrad
#   figurer/baronen/baronen_paraply_fallskarm_01–02.png 32 x 48   han hänger i det öppna paraplyet och dinglar
#                                                       (utrustningen medalj_fjader, det som är kvar vid sista kortet)
#   foremal/flod/paraply_spets_glimt_01.png             8 x 8     en liten glimt vid spetsen när han petar (valfri)
# utr: hel, medalj, medalj_fjader (som baronen_stege_*)
import os, sys, math
HAR = '/home/claude/baron2'; os.chdir(HAR)
_s = open('baron_stege.py').read(); exec(_s[:_s.rindex("if __name__ == '__main__':")])
from PIL import Image
OR, VIT, SKUGGA, TRA, MET = '#E8823A', '#F4EFE2', '#A85418', '#7A5638', '#8A90A0'

def px(im, pts):
    p = im.load()
    for (x, y, c) in pts:
        if 0 <= x < im.width and 0 <= y < im.height: p[int(x), int(y)] = hx(c) + (255,)
def kontur(im, farg='#2A1A10'):
    p = im.load(); W, H = im.size; ut = []
    for y in range(H):
        for x in range(W):
            if p[x, y][3]: continue
            if any(0 <= x + a < W and 0 <= y + b < H and p[x + a, y + b][3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): ut.append((x, y, farg))
    px(im, ut)

def stangt(y0):
    """Det stängda paraplyet nedåt från handen: kroken, skaftet, den hopvikta duken i ränder och spetsen."""
    im = Image.new('RGBA', (32, 52), (0, 0, 0, 0)); pts = []
    pts += [(18, y0 - 1, TRA), (17, y0, TRA), (17, y0 + 1, TRA), (18, y0 + 2, TRA)]          # kroken runt handen
    for y in range(y0 + 1, y0 + 8): pts.append((19, y, TRA))
    for y in range(y0 + 8, y0 + 22):                                                       # duken, hopvikt
        w = 2 if y < y0 + 18 else 1
        for x in range(19 - w, 20 + w): pts.append((x, y, OR if ((y - y0) // 3) % 2 else VIT))
        pts.append((19 + w, y, SKUGGA))
    pts += [(19, y0 + 22, MET), (19, y0 + 23, MET)]
    px(im, pts); kontur(im); return im

def utochin():
    """Paraplyet vänt ut och in: duken uppåt som en skål, ekrarna sticker ut."""
    im = Image.new('RGBA', (32, 52), (0, 0, 0, 0)); pts = []
    y0 = 22
    for y in range(y0, y0 + 6): pts.append((19, y, TRA))
    cx, cy = 19, y0 + 12
    for y in range(cy - 7, cy + 1):
        for x in range(cx - 11, cx + 12):
            if ((x - cx) / 11) ** 2 + ((y - cy) / 7) ** 2 <= 1 and y >= cy - 7 + abs(x - cx) * 0.25:
                pts.append((x, y, OR if ((x - cx + 22) // 4) % 2 else VIT))
    for k in (-11, -6, 6, 11):                                                              # ekrarna sticker ut
        pts += [(cx + k, cy - 7 + abs(k) // 3 - 1, MET), (cx + k + (1 if k > 0 else -1), cy - 8 + abs(k) // 3 - 1, MET)]
    for y in range(y0 + 6, cy + 2): pts.append((cx, y, MET))
    pts += [(cx, cy + 2, MET)]
    px(im, pts); kontur(im); return im

def fallskarm(b):
    im = Image.new('RGBA', (32, 48), (0, 0, 0, 0)); pts = []
    sv = 0 if b == 1 else 1
    cx, cy = 16 + sv, 11
    for y in range(1, 12):                                                                  # duken, öppen, som en kupol
        for x in range(1, 31):
            u = ((x + .5 - cx) / 14.5) ** 2 + ((y + .5 - cy) / 10) ** 2
            if u <= 1 and y <= cy: pts.append((x, y, (OR if ((x - cx + 30) // 5) % 2 else VIT) if y < cy - 1 else SKUGGA))
    for k in (-14, -8, 0, 8, 14): pts.append((cx + k, cy, MET))                           # ekrarnas ändar
    for y in range(cy, cy + 7): pts.append((16, y, MET))                                    # skaftet
    pts += [(16, cy + 7, TRA), (15, cy + 8, TRA), (17, cy + 8, TRA)]                       # handtaget
    px(im, pts); kontur(im)
    bar = stege_baron('fallskarm', b, 'medalj_fjader')
    im.alpha_composite(bar, (4, cy + 6))
    return im

def glimt():
    im = Image.new('RGBA', (8, 8), (0, 0, 0, 0))
    px(im, [(4, 1, '#FFFFFF'), (4, 2, '#DCE0E4'), (4, 6, '#DCE0E4'), (1, 4, '#DCE0E4'), (2, 4, '#FFFFFF'), (6, 4, '#FFFFFF'), (4, 4, '#FFFFFF'), (3, 3, '#DCE0E4'), (5, 5, '#DCE0E4')])
    return im

def lagg_baron(bar, para):
    im = Image.new('RGBA', (32, 52), (0, 0, 0, 0)); im.alpha_composite(para, (0, 0)); im.alpha_composite(bar, (0, 0)); return im

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett
    P = Palett(); UT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/baron2/ut109'
    os.makedirs(f'{UT}/figurer/baronen', exist_ok=True); os.makedirs(f'{UT}/foremal/flod', exist_ok=True)
    n = 0
    for utr in ('hel', 'medalj', 'medalj_fjader'):
        for b in (1, 2):
            hand_y = 22 + (b - 1) * 3
            P.las_bild(lagg_baron(stege_baron('petar', b, utr), stangt(hand_y + 1)), 'p').save(f'{UT}/figurer/baronen/baronen_stege_petar_{utr}_{b:02d}.png'); n += 1
        P.las_bild(lagg_baron(stege_baron('utochin', 1, utr), utochin()), 'u').save(f'{UT}/figurer/baronen/baronen_stege_utochin_{utr}_01.png'); n += 1
    for b in (1, 2): P.las_bild(fallskarm(b), 'f').save(f'{UT}/figurer/baronen/baronen_paraply_fallskarm_{b:02d}.png'); n += 1
    P.las_bild(glimt(), 'g').save(f'{UT}/foremal/flod/paraply_spets_glimt_01.png'); n += 1
    print(n, 'bilder')
