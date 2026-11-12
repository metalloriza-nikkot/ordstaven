# Tant Rosas porträtt, 48 x 48, som Farfars och baronens: glad och fundersam.
import os, sys
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('bybor.py').read().split('# ---------- gången')[0])
import math
def rosa_portratt(uttryck='glad'):
    d = Duk(48, 48)
    d.ellips(24, 48, 20, 10, 'rosa', 'klanning')
    for cx in (7, 41): d.ellips(cx, 42, 6, 5, 'rosa', 'arm', zbias=0.05)
    d.ellips(24, 47, 8, 6.5, 'vit', 'forklade', zbias=0.1)
    d.ellips(24, 25, 14.5, 13.5, 'ockra', 'huvud', zbias=0.22)
    for (cx, cy) in ((9, 22), (8, 28), (10, 33), (39, 22), (40, 28), (38, 33)):
        d.ellips(cx, cy, 3.6, 3.2, 'vit', 'lock', zbias=0.1)
    d.ellips(24, 13.5, 23.2, 4.6, 'stra', 'bratte', zbias=0.15, platt=0.5)
    d.ellips(24, 8.5, 11, 7.5, 'stra', 'krona', zbias=-0.05)
    skilj(d, 'forklade', 'klanning'); skilj(d, 'arm', 'klanning'); skilj(d, 'krona', 'bratte')
    skilj(d, 'bratte', 'huvud', 1); skilj(d, 'lock', 'huvud'); skilj(d, 'huvud', 'klanning', 1)
    d.kontur()
    for (x, y), nm in list(d.del_.items()):                                 # bandet och flätningen i stråt
        if nm == 'krona' and y in (11, 12): d.satt(x, y, 'rosa', 3 if x < 24 else 2)
        if nm == 'krona' and y == 13: d.satt(x, y, 'rosa', 1)
        if nm in ('krona', 'bratte') and y not in (11, 12, 13) and (x + y) % 4 == 0 and d.px[(x, y)][1] > 1:
            d.satt(x, y, 'stra', d.px[(x, y)][1] - 1)
        if nm == 'lock' and (x * 3 + y) % 5 == 0: d.satt(x, y, 'vit', 1)
        if nm == 'forklade' and y == 41 and x % 2: d.satt(x, y, 'vit', 4)  # krås
    for (cx, cy, r) in ((33, 9, 3.2),):                                     # blomman
        for a in range(0, 360, 72):
            px_, py_ = cx + 2.0 * math.cos(math.radians(a)), cy + 2.0 * math.sin(math.radians(a))
            for dx in (-1, 0):
                for dy in (-1, 0):
                    d.fast(int(px_) + dx, int(py_) + dy, '#f6b4ce' if a < 180 else '#e07aa6')
        d.fast(cx, cy, '#f2d22e'); d.fast(cx - 1, cy, '#f2d22e'); d.fast(cx, cy - 1, '#f4dc64'); d.fast(cx - 1, cy - 1, '#f2d22e')
    for (x, y) in ((24, 44), (24, 46)): d.fast(x, y, '#b8467a')              # knappar
    # ansiktet: samma folk som hjälten (ögon med glimt, brett leende), rosiga kinder och vita ögonbryn
    for ex in (18, 30):
        for (x, y) in ((ex, 23), (ex + 1, 23), (ex, 24), (ex + 1, 24), (ex, 25), (ex + 1, 25)): d.fast(x, y, OGA)
        d.fast(ex + 1 if uttryck == 'fundersam' else ex, 23, GLIMT)   # fundersam: blicken uppåt åt sidan
    by = {'glad': (20, 20), 'fundersam': (20, 19)}[uttryck]
    for i, x in enumerate(range(16, 21)): d.satt(x, by[0] + (1 if i in (0, 4) else 0), 'vit', 3)
    for i, x in enumerate(range(28, 33)):
        yy = by[1] + (1 if i in (0, 4) else 0) - (1 if uttryck == 'fundersam' and i < 3 else 0)
        d.satt(x, yy, 'vit', 3)
    for cx in (13, 35):
        for (x, y) in ((cx - 1, 29), (cx, 29), (cx + 1, 29), (cx, 30), (cx - 1, 30), (cx + 1, 30)): d.fast(x, y, KIND)
    d.fast(24, 27, '#bb8e27'); d.fast(23, 28, '#bb8e27')                     # en liten näsa
    if uttryck == 'glad':
        for (x, y) in ((17, 30), (18, 31), (19, 32), (20, 32), (21, 33), (22, 33), (23, 33), (24, 33), (25, 33), (26, 33),
                       (27, 32), (28, 32), (29, 31), (30, 30)): d.fast(x, y, OGA)
        for x in range(19, 29): d.fast(x, 31, OGA) if x in (19, 28) else None
        for x in range(20, 28): d.fast(x, 32, '#e86a5a') if x not in (20, 27) else None
    else:
        for (x, y) in ((21, 32), (22, 32), (23, 32), (24, 31), (25, 31), (26, 31)): d.fast(x, y, OGA)
    return d.bild()
if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    os.makedirs('ut/figurer/tant_rosa', exist_ok=True)
    o = Image.new('RGBA', (100, 50), (232, 214, 180, 255))
    for i, u in enumerate(('glad', 'fundersam')):
        im = P.las_bild(rosa_portratt(u), u); im.save(f'ut/figurer/tant_rosa/tant_rosa_portratt_{u}.png')
        o.alpha_composite(im, (1 + i * 50, 1))
    o.resize((1000, 500), Image.NEAREST).save('/tmp/rosa_port.png')
