# Flaskan som ett fynd (beslut 113.3): närbild av flaskan med kartbiten synlig genom glaset, bildkort 48 x 48.
#   flaska_kartbit   samma flaska som i rummet (`foremal/flod/flaska`): rund buk, smal hals och kork, och Farfars
#                    kompassros på glaset. Glaset är ljust och genomskinligt, så att den inrullade kartbiten syns
#                    inuti (gulnat papper, riven kant och vägens röda prickar). Inga bokstäver.
# Inga nya färger: allt läses till bildkortens färger.  python3 bybor/kort113.py <inkorg> <ut>
import os, sys, math
from PIL import Image
HAR = '/home/claude/bybor'
INK = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/inkorg'
UTMAPP = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HAR, 'ut_113')
_t = open(os.path.join(HAR, 'testrum_kort.py')).read()
_a = sys.argv; sys.argv = [_a[0], INK, UTMAPP]; exec(_t[:_t.rindex("if __name__ == '__main__':")]); sys.argv = _a

GLAS = ('#7a522c', '#b8862e', '#d8a85a', '#e8c878')        # bärnstensglas som flaskan i rummet        # bärnstensglas, mörkt till ljust
def flaska_kartbit():
    im = kort()
    cx = 24
    def bukbredd(y):                                     # buken 18..44, halsen 7..18
        if y < 18: return 4 if y > 8 else 5
        t = (y - 18) / 26
        return 5 + 12 * math.sin(min(1, t * 1.35) * math.pi / 2) - (5 * ((t - 0.85) / 0.15) if t > 0.85 else 0)
    for y in range(7, 45):                               # glaset: ljust i mitten, mörkare mot kanterna
        w = bukbredd(y)
        for x in range(int(cx - w), int(cx + w) + 1):
            u = abs(x + .5 - cx) / max(w, 1)
            pix(im, [(x, y, GLAS[3] if u < 0.55 else GLAS[2] if u < 0.85 else GLAS[1])])
        pix(im, [(int(cx - w), y, GLAS[0]), (int(cx + w), y, GLAS[0])])
    rk(im, cx - 6, 44, 13, 1, GLAS[0])
    # kartbiten, inrullad inne i buken: en rulle papper med riven kant och vägens röda prickar
    for y in range(22, 40):
        for x in range(cx - 8, cx + 9):
            v = (x - (cx - 8)) / 16
            c = '#fbf6e6' if 0.2 < v < 0.75 else '#f2e8c8' if v <= 0.2 else '#d6cfa4'
            if y in (22, 39) or (x + y * 3) % 17 == 0 and y in (23, 38): c = '#a08a6e'   # rivna kanter
            pix(im, [(x, y, c)])
    for y in range(22, 40): pix(im, [(cx - 9, y, '#5a3a22'), (cx + 9, y, '#5a3a22')])   # rullens kant
    for x in range(cx - 8, cx + 9): pix(im, [(x, 21, '#5a3a22'), (x, 40, '#5a3a22')])
    for k, (x, y) in enumerate(((cx - 4, 36), (cx - 2, 33), (cx, 31), (cx + 2, 28), (cx + 4, 26), (cx + 5, 24))):
        pix(im, [(x, y, '#c8453a')])                                                     # vägen
    pix(im, [(cx + 6, 24, '#2a52c8'), (cx + 6, 25, '#2a52c8')])                          # floden
    for (x, y) in ((cx - 5, 30), (cx - 1, 27)): pix(im, [(x, y, '#86a444'), (x + 1, y, '#86a444')])
    for y in range(18, 44):                                                              # glasets blänk, ovanpå
        w = bukbredd(y)
        if 20 < y < 38: pix(im, [(int(cx - w * 0.6), y, '#ffffff')])
    pix(im, [(int(cx - bukbredd(19) * 0.4), 19, '#ffffff'), (cx + 9, 30, '#ffffff'), (cx + 9, 31, GLAS[3])])
    for (dx, dy) in ((0, -3), (0, 3), (-3, 0), (3, 0), (0, 0)):                          # Farfars kompassros på glaset
        pix(im, [(cx + 7 + dx // 3 * 2, 38 + dy // 3 * 2, MAT['mass'][3] if (dx, dy) != (0, 0) else MAT['mass'][1])])
    rk(im, cx - 3, 2, 7, 6, '#8a5a34'); rk(im, cx - 3, 2, 2, 6, '#b07a48'); rk(im, cx - 3, 1, 7, 1, '#b07a48')   # korken
    for (x, y) in ((cx + 12, 10), (cx + 13, 9), (cx + 14, 10), (cx + 13, 11), (cx + 13, 8), (cx + 13, 12)):   # en glimt
        pix(im, [(x, y, '#ffffff' if (x, y) == (cx + 13, 10) or y in (9, 11) else '#dce0e4')])
    return kontur(im)

if __name__ == '__main__':
    F = kortfarger(); ut = os.path.join(UTMAPP, 'bildkort'); os.makedirs(ut, exist_ok=True)
    las_till(flaska_kartbit(), F).save(os.path.join(ut, 'flaska_kartbit.png'))
    o = Image.open(os.path.join(ut, 'flaska_kartbit.png')); o.resize((240, 240), Image.NEAREST).save('/tmp/flaska_x5.png')
    print('klart', len(F))
