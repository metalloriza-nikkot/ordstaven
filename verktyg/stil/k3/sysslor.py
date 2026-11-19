# Kapitel 3 (beslut 103.3): flodfolkets sysslor och hjälten som blåser i det stora hornet.
# Samma figurer som grundställningen (flodfolket.py, hjalte2/hanim.py). Två bilder per syssla, minst 400 ms per bild.
#   flodman_lastar_<hoger|vanster>_01–02          16 x 24  böjer sig efter en säck (01) och bär den på axeln (02)
#   flodbo_skrattar_fiskar_<hoger|vanster>_01–02  24 x 24  fiskar från pråmen, spöet ut och toppen gungar
#   flodbo_frukost_ror_<hoger|vanster>_01–02      24 x 24  rör i grytan med en lång slev; i _vanster står slevens spets i (3, 19)
#                                                          i bilden, så att den hamnar i rummets gryta
#   hjalte_blaser_<ner|hoger|vanster|upp>_01–02   16 x 24  händerna vid munstycket (01) och kinderna fulla (02)
import os, sys
HAR = '/home/claude/k3'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('/home/claude/k3/lagen_k3.py').read().split("# ---------- skepparens porträtt")[0])
from PIL import Image
_H = {'__name__': 'sysslor', '__file__': '/home/claude/hjalte2/hanim.py'}
_cwd = os.getcwd(); os.chdir('/home/claude/hjalte2')
try: exec(open('hanim.py').read(), _H)
finally: os.chdir(_cwd)

def linje(x0, y0, x1, y1, farg):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), farg) for i in range(n + 1)]

JUTE = ('#3a2414', '#5a3c26', '#9c7450', '#c49a72')
MASS = ('#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0')
def spegla(lista): return [im.transpose(Image.FLIP_LEFT_RIGHT) for im in lista]
def bred(im, x=4):
    ny = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); ny.alpha_composite(im, (x, 0)); return ny

def sack(x0, y0, b=7, h=6):
    """En mjölsäck av jute: rundade hörn, knuten upptill och mjöl i sömmen."""
    pts = []
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            if (y in (y0, y0 + h - 1)) and x in (x0, x0 + b - 1): continue          # rundade hörn
            kant = y == y0 + h - 1 or x in (x0, x0 + b - 1)
            c = JUTE[1] if kant else (JUTE[3] if y < y0 + 2 else JUTE[2])
            pts.append((x, y, c))
    m = x0 + b // 2
    pts += [(m, y0 - 1, JUTE[2]), (m - 1, y0 - 2, JUTE[3]), (m + 1, y0 - 2, JUTE[3]), (m - 1, y0 + 1, '#ffffff'), (m + 1, y0 + 2, '#e8e4dc')]
    return pts

def flodman_lastar():
    ut = []
    im = ror(med(man_hoger, 'h', 1, 'sida', hoj=1.5), 0, 1)                   # 01: böjd framåt, händerna nere vid säcken
    ut.append(rita(im, sack(9, 17, 7, 6)))
    im = med(man_hoger, 'h', 1, 'sida', hoj=-1.5)                            # 02: säcken uppe på axeln
    ut.append(rita(im, sack(0, 10, 7, 5)))
    return ut

def skrattar_fiskar():
    ut = []
    for b in (1, 2):
        im = bred(skr_hoger())
        spo = linje(14, 16, 22, 5 + (b - 1), '#7a5638') + linje(15, 15, 21, 6 + (b - 1), '#c49a72')[1:-1]
        lina = [(23, y, '#eeeff4') for y in range(6 + (b - 1), 13 + (b - 1))]
        ring = [(22, 14 + (b - 1), '#ffffff'), (23, 14 + (b - 1), '#ffffff')] if b == 2 else []
        ut.append(rita(im, spo + lina + ring))
    return ut

def frukost_ror():
    """Kvinnan står till höger och rör med en lång slev ned åt vänster, i grytan som står i rummet."""
    ut = []
    for b in (1, 2):
        im = Image.new('RGBA', (24, 24), (0, 0, 0, 0))
        im.alpha_composite(med(fru_hoger, 'h', 1, 'sida', hoj=0.6), (8, 0))
        im = im.transpose(Image.FLIP_LEFT_RIGHT)                               # vänd mot grytan (vänster)
        im2 = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); im2.alpha_composite(im, (8, 0))
        spets = (3, 19) if b == 1 else (5, 18)
        slev = linje(11, 15, spets[0] + 1, spets[1] - 1, '#7a5638') + linje(12, 15, spets[0] + 2, spets[1] - 1, '#9c7450')[1:-1]
        slev += [(spets[0], spets[1], '#55555f'), (spets[0] + 1, spets[1], '#34343c')]
        anga = [(spets[0] + (0 if b == 1 else 1), spets[1] - 5, '#dce0e4'), (spets[0] + (1 if b == 1 else 0), spets[1] - 7, '#b8bec6')]
        ut.append(rita(im2, slev + anga))
    return ut

def hjalte_blaser():
    """Hjälten blåser i det stora hornet: händerna vid munstycket och kinderna fulla i bild 2."""
    hn, hu, hh = _H['h_ner'], _H['h_upp'], _H['h_hoger']
    R = {}
    def puffa(im, x0, x1, y0, y1, ut_v=True, ut_h=True):
        """Kinderna fulla: ansiktets kanter flyttas ut en pixel."""
        im = im.copy(); p = im.load(); src = im.copy().load()
        for y in range(y0, y1):
            if ut_v: p[x0 - 1, y] = src[x0, y]; p[x0, y] = src[x0 + 1, y]
            if ut_h: p[x1 + 1, y] = src[x1, y]; p[x1, y] = src[x1 - 1, y]
        return im
    mun = [(7, 11, MASS[2]), (8, 11, MASS[3]), (7, 12, MASS[1]), (8, 12, MASS[2])]
    a = hn(armR=(6.0, 12.0), armL=(10.0, 12.0), oga_t='oppen', mun='o')
    b = hn(armR=(6.0, 11.6), armL=(10.0, 11.6), oga_t='glad', mun='o')
    R['hjalte_blaser_ner'] = [rita(a, mun), rita(puffa(b, 3, 12, 8, 12), mun)]
    a = hh(arm=(11.6, 11.4)); b = hh(arm=(11.8, 11.0))
    sida = [(14, 10, MASS[3]), (15, 10, MASS[2]), (14, 11, MASS[1]), (15, 11, MASS[1])]
    R['hjalte_blaser_hoger'] = [rita(a, sida), rita(puffa(b, 9, 14, 8, 11, ut_v=False), sida)]
    R['hjalte_blaser_vanster'] = spegla(R['hjalte_blaser_hoger'])
    R['hjalte_blaser_upp'] = [hu(armR=(11.6, 12.0), armL=(4.4, 12.0)), hu(armR=(11.8, 11.4), armL=(4.2, 11.4))]
    return R

def alla_sysslor():
    R = {}
    R['flodman_lastar_hoger'] = flodman_lastar(); R['flodman_lastar_vanster'] = spegla(R['flodman_lastar_hoger'])
    R['flodbo_skrattar_fiskar_hoger'] = skrattar_fiskar(); R['flodbo_skrattar_fiskar_vanster'] = spegla(R['flodbo_skrattar_fiskar_hoger'])
    R['flodbo_frukost_ror_vanster'] = frukost_ror(); R['flodbo_frukost_ror_hoger'] = spegla(R['flodbo_frukost_ror_vanster'])
    R.update(hjalte_blaser())
    return R

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett
    P = Palett(); UT = '/home/claude/k3/ut103'
    R = alla_sysslor(); n = 0
    for namn, bilder in R.items():
        mapp = 'hjalte' if namn.startswith('hjalte') else namn.split('_')[0] if namn.startswith('flodman') else '_'.join(namn.split('_')[:2])
        os.makedirs(f'{UT}/figurer/{mapp}', exist_ok=True)
        for i, im in enumerate(bilder, 1):
            P.las_bild(im, namn).save(f'{UT}/figurer/{mapp}/{namn}_{i:02d}.png'); n += 1
    print(n, 'bilder')
