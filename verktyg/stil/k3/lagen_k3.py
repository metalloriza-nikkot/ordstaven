# Kapitel 3 (beslut 100.6): skepparens och flodbornas lägen, och skepparens porträtt.
# Samma figurer som grundställningen (flodfolket.py) och samma mekanik för en lyft arm som byborna (bybor/rorelser.py).
#   skepparen:  sitter_ner_01–02, sitter_ledsen_ner_01 (tittar ner i däcket), pekar_upp_hoger/vanster_01,
#               ropar_ner_01–02 (händerna kring munnen), hatten_av_ner_01–02, blaser_hoger/vanster_01–02 (vid hornet),
#               vinka_ner/hoger/vanster_01–02, portratt_glad/ledsen/ivrig (48 x 48)
#   flodborna:  <namn>_tallrik_ner_01–02 (alla tre, frukost), <namn>_vinka_*, <namn>_jubel_ner_01–02,
#               flodbo_frukost_blaser_ner_01–02 (frukosthornet), flodbo_skrattar_skrattar_ner/hoger/vanster_01–02
import os, sys
HAR = '/home/claude/k3'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('/home/claude/k3/flodfolket.py').read().split("if __name__ == '__main__':")[0])
_r = open('/home/claude/bybor/rorelser.py').read()
exec(_r[_r.index("ARM = {"):_r.index("# ---------- föremålen")])
from PIL import Image

LILA = MAT['lila']
def C(i): return LILA[i]
def ror(im, dx=0, dy=0):
    ny = Image.new('RGBA', im.size, (0, 0, 0, 0)); ny.alpha_composite(im, (dx, dy)); return ny

# ---------- skepparen ----------
def sk_sitter(ledsen=False, bild=1):
    """Sitter på kanten av pråmen: överkroppen 3 px ned, korta ben med knäna mot betraktaren."""
    im = sk_fram(); ut = Image.new('RGBA', (16, 24), (0, 0, 0, 0))
    ut.alpha_composite(im.crop((0, 0, 16, 18)), (0, 3 + (1 if bild == 2 else 0)))
    pts = []
    for cx in (6, 10):
        for (x, y, c) in ((cx - 1, 21, '#1e1e24'), (cx, 21, '#3a3a48'), (cx + 1, 21, '#2a2e38'), (cx - 1, 22, '#1e1e24'),
                          (cx, 22, '#2a2e38'), (cx + 1, 22, '#1e1e24'), (cx - 1, 23, '#3a2414'), (cx, 23, '#5a3c26'), (cx + 1, 23, '#3a2414')):
            pts.append((x, y, c))
    ut = rita(ut, pts)
    if ledsen:                                                                 # tittar ner i däcket: ögonen ned, munnen rak
        y0 = 3 + (1 if bild == 2 else 0)
        p = ut.load()
        for x in range(4, 12):
            for y in range(y0 + 8, y0 + 11):
                if p[x, y][3] and '#%02x%02x%02x' % p[x, y][:3] in ('#101010', '#ffffff', '#1a1a1a') or (p[x, y][3] and p[x, y][:3] == (0x0e, 0x0e, 0x12)):
                    pass
        ut = rita(ut, [(x, y0 + 9, C(2)) for x in range(5, 12)] + [(x, y0 + 10, C(2)) for x in range(5, 12)] +
                      [(7, y0 + 10, '#24160c'), (8, y0 + 10, '#24160c'), (9, y0 + 10, '#24160c')] +
                      [(x, y0 + 6, C(3)) for x in range(5, 12)] + [(6, y0 + 7, '#101010'), (10, y0 + 7, '#101010')])
    return ut

def sk_ropar(bild=1):
    """Händerna kring munnen (AHOJ!): två händer vid mungiporna och munnen öppen."""
    im = sk_fram()
    pts = [(x, y, '#3a1a14') for x in range(7, 10) for y in (9, 10)] + [(8, 11, '#3a1a14')]
    if bild == 2: pts += [(6, 9, '#3a1a14'), (10, 9, '#3a1a14')]
    for hx_ in (4, 11):
        pts += [(hx_, 9, C(3)), (hx_ + 1, 9, C(2)), (hx_, 10, C(2)), (hx_ + 1, 10, C(1)), (hx_ - 1 if hx_ == 4 else hx_ + 2, 10, C(0))]
    return rita(im, pts)

def hatt_i_handen(x, y):
    """Den platta hatten som han håller upp: brätte och kulle, med det blå bandet."""
    pts = [(x + k, y, '#d8a85a') for k in range(-3, 4)] + [(x + k, y - 1, '#e8d07a') for k in range(-2, 3)]
    pts += [(x + k, y - 2, '#fff0b0') for k in range(-1, 2)] + [(x - 1, y - 1, '#2a52c8'), (x, y - 1, '#2a52c8'), (x + 1, y - 1, '#1a3290')]
    pts += [(x - 4, y, '#7a522c'), (x + 4, y, '#7a522c')]
    return pts

def sk_hatten_av(bild=1):
    im = med(lambda: sk_fram(hatt=False), 'h', 1, hoj=0.6 * (bild - 1))
    return rita(im, hatt_i_handen(14, 1 - (bild - 1)))

def sk_blaser(bild=1):
    """Vid hornet, från sidan: båda händerna upp vid munnen och kinderna fulla."""
    im = med(sk_hoger, 'h', 1, 'sida', hoj=-2.5)
    pts = [(12, 9, C(4)), (13, 9, C(3)), (12, 10, C(3)), (13, 10, C(2)), (11, 10, C(2))]
    if bild == 2: pts += [(14, 9, C(2)), (14, 10, C(1))]
    return rita(im, pts)

def sk_pekar():
    """Pekar snett uppåt framåt (mot hjulet och hornet): armen ut från kroppen och ett pekfinger."""
    im = sk_hoger()
    pts = [(10, 14, '#ffffff'), (11, 14, '#eeeff4'), (12, 13, '#ffffff'), (13, 13, '#eeeff4'),
           (10, 15, '#1a3290'), (11, 15, '#2a52c8'), (12, 14, '#1a3290'), (13, 14, '#2a52c8'),
           (14, 12, LILA[3]), (14, 13, LILA[2]), (15, 11, LILA[3]), (15, 12, LILA[1])]
    p = im.load()
    for y in range(13, 19):                                                    # armen som hängde: bort, tröjan syns
        for x in (9, 10):
            if p[x, y][3] and p[x, y][:3] in ((0x8a, 0x5c, 0xd0), (0x6c, 0x34, 0xb0)): pass
    return rita(im, pts)

# ---------- flodborna ----------
def tallrik(im, x0=4, y0=14, bild=1):
    """En vit tallrik framför bröstet, med en limpa på (frukost)."""
    pts = [(x, y0 + 1, '#dce0e4') for x in range(x0, x0 + 9)] + [(x, y0, '#ffffff') for x in range(x0 + 1, x0 + 8)]
    pts += [(x0, y0, '#b8bec6'), (x0 + 8, y0, '#b8bec6'), (x0 + 1, y0 + 2, '#b8bec6'), (x0 + 7, y0 + 2, '#b8bec6')]
    pts += [(x0 + 3, y0 - 1, '#c8963e'), (x0 + 4, y0 - 1, '#e6bc66'), (x0 + 5, y0 - 1, '#c8963e'), (x0 + 4, y0 - 2, '#8e6a22')]
    return rita(im if bild == 1 else hopp(im), pts if bild == 1 else [(x, y - 1, c) for (x, y, c) in pts])

def fru_blaser(bild=1):
    """Blåser det lilla hornet: handen vid munnen och hornet ut åt höger."""
    im = med(fru_fram, 'h', 1, hoj=-3.6)
    pts = [(9, 11, '#5e4a36'), (10, 11, '#d6cfa4'), (11, 10, '#f2e8c8'), (12, 10, '#d6cfa4'), (13, 9, '#f2e8c8'), (14, 9, '#a08a6e'),
           (14, 8, '#d6cfa4'), (15, 8, '#5e4a36'), (11, 11, '#2a52c8'), (12, 11, '#ffffff')]
    if bild == 2: pts += [(15, 6, '#eeeff4'), (14, 5, '#eeeff4'), (15, 4, '#dce0e4')]   # tutet: små vita streck
    return rita(im, pts)

def skrattar(fn, sida=False, bild=1):
    """Ögonen ihopknipna av skratt och munnen öppen. Bild 2 skakar av skratt (ett litet hopp)."""
    im = fn() if bild == 1 else hopp(fn())
    dy = 0 if bild == 1 else -1
    if sida:
        pts = [(11, 8 + dy, '#101010'), (12, 7 + dy, '#101010'), (10, 7 + dy, MAT['ockra'][3])]
        pts += [(12, 11 + dy, '#3a1a14'), (13, 11 + dy, '#3a1a14'), (12, 12 + dy, '#3a1a14')]
    else:
        pts = []
        for ex in (5, 10):
            pts += [(ex, 8 + dy, '#101010'), (ex + 1, 7 + dy, '#101010'), (ex + 2, 8 + dy, '#101010'),
                    (ex, 7 + dy, MAT['ockra'][3]), (ex + 1, 8 + dy, MAT['ockra'][3]), (ex + 2, 7 + dy, MAT['ockra'][3])]
        pts += [(x, y + dy, '#3a1a14') for x in range(6, 11) for y in (11, 12)] + [(x, 13 + dy, '#3a1a14') for x in range(7, 10)]
        pts += [(x, 11 + dy, '#ffffff') for x in (7, 8, 9)]
    return rita(im, pts)

def alla():
    R = {}
    R['skepparen_sitter_ner'] = [sk_sitter(bild=1), sk_sitter(bild=2)]
    R['skepparen_sitter_ledsen_ner'] = [sk_sitter(ledsen=True)]
    R['skepparen_pekar_upp_hoger'] = [sk_pekar()]
    R['skepparen_ropar_ner'] = [sk_ropar(1), sk_ropar(2)]
    R['skepparen_hatten_av_ner'] = [sk_hatten_av(1), sk_hatten_av(2)]
    R['skepparen_blaser_hoger'] = [sk_blaser(1), sk_blaser(2)]
    for n in FIGURER:
        f, h, u = FIGURER[n]
        R[f'{n}_vinka_ner'] = [med(f, 'h', b) for b in (1, 2)]
        R[f'{n}_vinka_hoger'] = [med(h, 'h', b, 'sida') for b in (1, 2)]
        if n != 'skepparen':
            R[f'{n}_jubel_ner'] = [med(f, 'vh', 1), hopp(med(f, 'vh', 2, hoj=0.6))]
            y0 = {'flodbo_frukost': 15, 'flodbo_skrattar': 15, 'flodman': 15}[n]
            R[f'{n}_tallrik_ner'] = [tallrik(f(), 4, y0, 1), tallrik(f(), 4, y0, 2)]
    R['flodbo_frukost_blaser_ner'] = [fru_blaser(1), fru_blaser(2)]
    R['flodbo_skrattar_skrattar_ner'] = [skrattar(skr_fram, False, 1), skrattar(skr_fram, False, 2)]
    R['flodbo_skrattar_skrattar_hoger'] = [skrattar(skr_hoger, True, 1), skrattar(skr_hoger, True, 2)]
    return R

# ---------- skepparens porträtt, 48 x 48 ----------
def sk_portratt(uttryck='glad'):
    d = Duk(48, 48)
    d.ellips(24, 50, 19, 11, 'vit', 'trojan')
    d.ellips(24, 26, 14, 13, 'lila', 'huvud', zbias=0.22)
    d.ellips(24, 42.5, 10.5, 2.0, 'rod', 'halsduk', zbias=0.2, platt=0.5)
    d.ellips(24, 13.5, 22.5, 3.6, 'blek', 'bratte', zbias=0.15, platt=0.5)
    d.ellips(24, 7.5, 12, 6.0, 'blek', 'krona', zbias=-0.05, klipp=lambda x, y: y >= 2)
    skilj(d, 'halsduk', 'trojan'); skilj(d, 'huvud', 'trojan', 1); skilj(d, 'halsduk', 'huvud')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud', 1)
    d.kontur()
    for (x, y), nm in list(d.del_.items()):
        if nm == 'trojan' and ((y - 40) // 3) % 2 == 1: d.satt(x, y, 'marin', min(3, d.px[(x, y)][1]))   # ränderna, 3 px i porträttet
        if nm == 'krona' and y in (10, 11, 12): d.satt(x, y, 'marin', 2 if x > 24 else 3)                  # det blå bandet
        if nm in ('krona', 'bratte') and y not in (10, 11, 12) and (x + y) % 4 == 0 and d.px[(x, y)][1] > 1:
            d.satt(x, y, 'blek', d.px[(x, y)][1] - 1)
    for (x, y) in ((14, 17), (15, 17), (16, 17), (15, 18), (16, 18), (17, 17), (31, 17), (32, 17), (32, 18), (33, 17)):
        d.fast(x, y, '#3a2414')                                                # luggen under brättet
    for (x, y, c) in ((32, 44, '#8a2420'), (33, 44, '#c23a2e'), (33, 45, '#c23a2e'), (34, 45, '#8a2420'), (32, 45, '#8a2420'), (34, 46, '#8a2420')): d.fast(x, y, c)   # knuten åt sidan
    oy = {'glad': 0, 'ledsen': 2, 'ivrig': -1}[uttryck]
    for ex in (18, 29):
        for (x, y) in ((ex, 24), (ex + 1, 24), (ex, 25), (ex + 1, 25), (ex, 26), (ex + 1, 26)): d.fast(x, y + (1 if uttryck == 'ledsen' else 0), OGA)
        if uttryck != 'ledsen': d.fast(ex, 24, GLIMT)
        bry = 21 if uttryck != 'ivrig' else 20
        for k in range(-1, 3):                                                 # ögonbrynen
            yy = bry + (1 if uttryck == 'ledsen' and ((ex < 24 and k > 0) or (ex > 24 and k < 1)) else 0)
            d.fast(ex + k, yy, '#3a2414')
    d.fast(24, 29, MAT['lila'][1]); d.fast(23, 30, MAT['lila'][1])                     # näsan
    if uttryck == 'glad':
        for (x, y) in ((19, 32), (20, 33), (21, 34), (22, 34), (23, 34), (24, 34), (25, 34), (26, 34), (27, 33), (28, 32)): d.fast(x, y, OGA)
    elif uttryck == 'ledsen':
        for (x, y) in ((21, 35), (22, 34), (23, 34), (24, 34), (25, 34), (26, 35)): d.fast(x, y, OGA)
    else:
        for x in range(20, 28):
            for y in range(32, 36):
                if abs(x - 23.5) + abs(y - 33.5) * 1.6 < 5: d.fast(x, y, '#3a1a14' if y > 32 else OGA)
        for x in range(21, 27): d.fast(x, 32, OGA)
    return d.bild()

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    R = alla(); UT = '/home/claude/k3/ut/figurer'
    for namn, bilder in R.items():
        fig = next(n for n in FIGURER if namn.startswith(n))
        os.makedirs(f'{UT}/{fig}', exist_ok=True)
        for i, im in enumerate(bilder, 1):
            im = P.las_bild(im, namn); im.save(f'{UT}/{fig}/{namn}_{i:02d}.png')
            if '_hoger' in namn: im.transpose(Image.FLIP_LEFT_RIGHT).save(f'{UT}/{fig}/{namn.replace("_hoger", "_vanster")}_{i:02d}.png')
    for u in ('glad', 'ledsen', 'ivrig'):
        P.las_bild(sk_portratt(u), u).save(f'{UT}/skepparen/skepparen_portratt_{u}.png')
    # översikt
    rader = list(R.items())
    o = Image.new('RGBA', (4 * 60 + 8, ((len(rader) + 3) // 4) * 28 + 56), (206, 186, 140, 255))
    for i, (namn, bilder) in enumerate(rader):
        x0 = 4 + (i % 4) * 60; y0 = 2 + (i // 4) * 28
        for j, im in enumerate(bilder): o.alpha_composite(P.las_bild(im), (x0 + j * 20, y0))
    for j, u in enumerate(('glad', 'ledsen', 'ivrig')):
        o.alpha_composite(Image.open(f'{UT}/skepparen/skepparen_portratt_{u}.png'), (4 + j * 50, o.height - 50))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/lagen_k3_x4.png')
    print(len(R), 'lägen')
