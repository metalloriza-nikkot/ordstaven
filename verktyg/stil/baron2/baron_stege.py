# Kapitel 3 (beslut 106.5): baronen på repstegen i ordduellen, sakerna som trillar av honom och luftskeppet vid sandbanken.
# Samma baron som i kapitel 1–2 (baron.py: ner()), men med händerna på repstegens sidrep och fötterna på ett steg.
#   figurer/baronen/baronen_stege_<läge>_<utrustning>_<nn>.png   24 x 28. Händerna håller sidorepen i x 6 och 18,
#       fötterna står på ett steg i y 27. Repstegen läggs bakom honom, med sina sidorep i x 6 och 18 i hans bild.
#       lägen: grund 01–02, ropar 01–02, forvirrad 01–02, klattrar 01–02 (upp: 01 → 02; ned: 02 → 01), tappar 01–03
#       utrustning: hel (tre medaljer, fjädern rak), medalj (två medaljer), medalj_fjader (två medaljer, fjädern böjd)
#   figurer/baronen/repstege_lang.png        14 x 96, sidorepen i x 1 och 13, ett steg var 6:e px (y 3, 9, 15 …)
#   figurer/baronen/luftskepp_utan_stege.png 112 x 96, som luftskepp_tom men utan den korta stegen; den långa hänger
#       under gondolen med övre vänstra hörnet i (72, 74) i luftskeppets bild
#   figurer/baronen/luftskepp_baron_landar_01–02.png  112 x 96, baronen landar på huvudet i gondolen, benen sparkar
#   foremal/flod/baron_medalj_01–02.png      6 x 8, en medalj som snurrar när den faller
#   foremal/flod/medalj_plums_01–02.png      12 x 6, ringar på vattnet där medaljen plumsar
import os, sys, math
HAR = '/home/claude/baron2'; os.chdir(HAR)
_src = open('baron.py').read()
exec(_src[:_src.index('def rader():')])
from PIL import Image

MEDALJ = [(8, 13, '#C83A3A'), (10, 13, '#3A8A3A'), (9, 15, '#E0C040')]
FJ_RAK = [(16, 4), (17, 3), (17, 2), (18, 1), (18, 0)]
FJ_BOJD = [(16, 4), (17, 3), (18, 3), (19, 4), (20, 5)]

def stege_baron(lage='grund', bild=1, utr='hel'):
    W, H = 24, 28; dy = 4                                     # baronen från ner() flyttas ned 4 px, så att händerna får plats
    d = Duk(W, H)
    vx, vy = 0, dy                                            # kroppens förskjutning
    hv, hh = (6, 11), (18, 11)                                # händerna på sidorepen
    benv, benh = 0, 0                                         # ett ben lyft
    if lage == 'klattrar':
        if bild == 1: hv, benh = (6, 5), 2
        else: hh, benv = (18, 5), 2
    if lage == 'tappar':
        if bild == 1: hh = (22, 6)                            # högra handen släpper och viftar
        if bild == 2: hh = (21, 15); vx, vy = 2, dy + 2; benv, benh = -1, 1   # hänger i vänster hand, kroppen svänger
        if bild == 3: hv, hh = (3, 5), (21, 4); vy = dy + 1   # båda händerna i luften
    if lage == 'ropar' and bild == 2: vy = dy - 1
    # benen och kängorna
    for i, cx in enumerate((9.6, 14.4)):
        upp = benv if i == 0 else benh
        d.ellips(cx + vx, 20.4 + vy - upp, 1.5, 1.5, 'kaki', 'ben')
        d.ellips(cx - 0.3 + vx, 22.0 + vy - upp, 2.1, 1.1, 'kanga', 'kanga')
    # armarna: från axeln till handen
    for (axx, axy), (hx_, hy_) in (((5.0 + vx, 13.5 + vy), hv), ((19.0 + vx, 13.5 + vy), hh)):
        n = 6
        for k in range(n + 1):
            t = k / n; x = axx + (hx_ - axx) * t; y = axy + (hy_ - axy) * t
            d.ellips(x, y, 1.7, 1.7, 'jacka', 'arm', zbias=-0.1)
    d.ellips(12 + vx, 14.8 + vy, 7.2, 5.9, 'jacka', 'kropp')
    for (hx_, hy_) in (hv, hh): d.ellips(hx_, hy_, 1.3, 1.2, 'hud', 'hand')
    d.ellips(12 + vx, 8.8 + vy, 4.7, 4.0, 'hud', 'huvud')
    d.ellips(12 + vx, 4.4 + vy, 4.3, 3.0, 'hjalm', 'kupol')
    d.ellips(12 + vx, 6.4 + vy, 6.6, 1.5, 'hjalm', 'brätte', zbias=0.1)
    d.ellips(12 + vx, 9.6 + vy, 1.6, 1.2, 'nos', 'nos', zbias=0.1)
    skilj(d, 'kropp', 'arm', ton=1); skilj(d, 'huvud', 'kropp', ton=1); skilj(d, 'brätte', 'huvud', ton=1); skilj(d, 'brätte', 'kupol', ton=1)
    fj = FJ_BOJD if utr == 'medalj_fjader' else FJ_RAK
    fjader(d, [(x + vx, y + vy) for (x, y) in fj])
    d.kontur()
    o, oy = vx, vy
    for x in range(9, 15):
        if d.px.get((x + o, 5 + oy), ('', 0))[0] == 'hjalm' and d.del_.get((x + o, 5 + oy)) == 'kupol': d.fast(x + o, 5 + oy, BAND)
    # ansiktet efter läget
    if lage == 'forvirrad':
        d.fast(10 + o, 8 + oy, OGA); d.fast(10 + o, 7 + oy, OGA); d.fast(9 + o, 8 + oy, OGA)   # ett stort öga
        d.fast(14 + o, 8 + oy, OGA)                                                         # och ett litet
        for (x, y) in [(10, 12), (11, 11), (12, 12), (13, 11), (14, 12)]: d.fast(x + o, y + oy, MUN)   # vågig mun
        if bild == 2: d.fast(17 + o, 6 + oy, '#9AB6FF'); d.fast(17 + o, 7 + oy, '#4F7AE8')       # en svettdroppe
    else:
        d.fast(10 + o, 8 + oy, OGA); d.fast(14 + o, 8 + oy, OGA)
        if lage in ('ropar', 'tappar'):
            for (x, y) in [(11, 11), (12, 11), (13, 11), (11, 12), (13, 12)]: d.fast(x + o, y + oy, MUN)
            d.fast(12 + o, 12 + oy, '#8A3A2E'); d.fast(11 + o, 13 + oy, MUN); d.fast(12 + o, 13 + oy, MUN); d.fast(13 + o, 13 + oy, MUN)
        else:
            for (x, y) in [(10, 11), (11, 12), (13, 12), (14, 11)]: d.fast(x + o, y + oy, MUN)
    d.fast(9 + o, 10 + oy, KIND); d.fast(15 + o, 10 + oy, KIND)
    for y in range(13 + oy, 20 + oy):
        if d.px.get((12 + o, y), ('', 0))[0] == 'jacka': d.fast(12 + o, y, SOM)
    for y in (14, 16, 18): d.fast(14 + o, y + oy, KNAPP)
    medaljer = MEDALJ if utr == 'hel' else MEDALJ[:2]
    for (x, y, c) in medaljer: d.fast(x + o, y + oy, c); d.fast(x + o, y + 1 + oy, MAS)
    return d.bild()

def repstege_lang(h=96):
    im = Image.new('RGBA', (14, h), (0, 0, 0, 0)); p = im.load()
    for y in range(h):
        for x in (1, 13): p[x, y] = hx('#9A6E40') + (255,)
        p[0, y] = hx('#5A4A30') + (255,) if y % 3 else (0, 0, 0, 0)
        if y % 6 == 3:
            for x in range(1, 14): p[x, y] = hx('#BE9260') + (255,)
            for x in range(2, 13): p[x, y + 1 if y + 1 < h else y] = hx('#7A5638') + (255,)
    return im

def medalj(b):
    d = Duk(6, 8)
    if b == 1:
        d.fast(2, 0, '#C83A3A'); d.fast(3, 0, '#C83A3A'); d.fast(2, 1, '#C83A3A'); d.fast(3, 1, '#C83A3A')
        d.ellips(3, 4.5, 2.6, 2.6, 'gra', 'medalj')
    else:
        d.fast(2, 0, '#C83A3A'); d.fast(2, 1, '#C83A3A'); d.ellips(2.5, 4.5, 1.2, 2.6, 'gra', 'medalj')   # på kant när den snurrar
    d.kontur(); return d.bild()

def plums(b):
    im = Image.new('RGBA', (12, 6), (0, 0, 0, 0)); p = im.load()
    r = (2.5, 1.2) if b == 1 else (5.2, 2.4)
    for a in range(0, 360, 12):
        x = int(6 + r[0] * math.cos(math.radians(a))); y = int(3 + r[1] * math.sin(math.radians(a)))
        if 0 <= x < 12 and 0 <= y < 6: p[x, y] = hx('#FFFFFF' if b == 1 or a % 24 else '#9AB6FF') + (255,)
    return im

def luftskeppen():
    """luftskepp_utan_stege: inkorgens luftskepp_tom är facit; stegens pixlar ersätts med pass3:s skepp utan stege."""
    import numpy as np
    sys.path.insert(0, '/home/claude/pass3'); _cwd = os.getcwd(); os.chdir('/home/claude/pass3')
    import pass3
    med = np.array(pass3.luftskepp(None, 0))
    gammal = pass3.repstege; pass3.repstege = lambda trasslad=False: Image.new('RGBA', (22, 30), (0, 0, 0, 0))
    utan = np.array(pass3.luftskepp(None, 0)); pass3.repstege = gammal; os.chdir(_cwd)
    mask = (med != utan).any(axis=2)
    ink = np.array(Image.open('/home/claude/inkorg/figurer/baronen/luftskepp_tom.png').convert('RGBA'))
    ut = ink.copy(); ut[mask] = utan[mask]; tom = Image.fromarray(ut)
    landar = []
    for b in (1, 2):                                          # benen sticker upp ur gondolen, och de sparkar
        im = tom.copy(); d = Duk(16, 22)
        sp = 0 if b == 1 else 1
        for i, cx in enumerate((5.5, 10.5)):
            up = sp if i == 0 else -sp
            for yy in range(8, 20): d.ellips(cx, yy - up, 1.4, 1.0, 'kaki', 'ben')
            d.ellips(cx + 0.3, 5.5 - up, 2.1, 1.2, 'kanga', 'kanga')
        d.kontur(); im.alpha_composite(d.bild(), (62, 42))
        landar.append(im)
    return tom, landar

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett
    P = Palett(); UT = '/home/claude/baron2/ut106'
    os.makedirs(f'{UT}/figurer/baronen', exist_ok=True); os.makedirs(f'{UT}/foremal/flod', exist_ok=True)
    LAGEN = {'grund': 2, 'ropar': 2, 'forvirrad': 2, 'klattrar': 2, 'tappar': 3}
    n = 0
    for utr in ('hel', 'medalj', 'medalj_fjader'):
        for l, k in LAGEN.items():
            for b in range(1, k + 1):
                P.las_bild(stege_baron(l, b, utr), l).save(f'{UT}/figurer/baronen/baronen_stege_{l}_{utr}_{b:02d}.png'); n += 1
    P.las_bild(repstege_lang(), 'repstege').save(f'{UT}/figurer/baronen/repstege_lang.png')
    tom, landar = luftskeppen()
    P.las_bild(tom, 'luftskepp').save(f'{UT}/figurer/baronen/luftskepp_utan_stege.png')
    for i, im in enumerate(landar, 1): P.las_bild(im, 'landar').save(f'{UT}/figurer/baronen/luftskepp_baron_landar_{i:02d}.png')
    for b in (1, 2):
        P.las_bild(medalj(b), 'medalj').save(f'{UT}/foremal/flod/baron_medalj_{b:02d}.png')
        P.las_bild(plums(b), 'plums').save(f'{UT}/foremal/flod/medalj_plums_{b:02d}.png')
    print(n + 8, 'bilder')
