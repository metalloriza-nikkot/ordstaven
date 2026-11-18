# Kapitel 3 (beslut 100.6): hjältens och ungens nya lägen, ritade med deras egna skript (unge2/anim.py, hjalte2/hanim.py)
# så att de är exakt samma figurer. Hjältens hud och dräkt har sina skyddade toner (palettbytet fungerar).
#   unge1_simmar_<ner|hoger|vanster|upp>_01–02   ungen simmar: huvudet och ryggen över ytan, ringar på vattnet
#   unge1_ropar_ner_01–02                         ropar så högt den kan (huvudet upp, munnen vid gap)
#   unge1_ledsen_ner_01–02                        sitter och hänger med huvudet (mamma svarar inte)
#   unge1_stampar_ner_01–02                       stampar med foten (knuffen vid hornet: fem gånger)
#   hjalte_sitter_ner_01, hjalte_sitter_flaska_ner_01–02   sitter på skalet, med flaskan i händerna (POPP i bild 2)
#   hjalte_kramar_unge_ner_01–02  24 x 28          hjälten (bakifrån) kramar ungen
#   hjalte_oron_unge_ner_01       24 x 32          ungen bakom hjälten håller för hans öron med tassarna (duellen)
#   effekt_plask_01–03            24 x 16          plasket när ungen hoppar i floden
import os, sys
from PIL import Image
sys.argv = sys.argv[:1]
def ladda(mapp, fil):
    g = {'__name__': 'lagen', '__file__': os.path.join(mapp, fil)}; cwd = os.getcwd(); os.chdir(mapp)
    try: exec(open(fil).read(), g)
    finally: os.chdir(cwd)
    return g
U = ladda('/home/claude/unge2', 'anim.py')
H = ladda('/home/claude/hjalte2', 'hanim.py')
def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
VATT = ['#24407a', '#6a8ed0', '#9ac8e8', '#ffffff']
MASS = ['#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0']
def rita(im, pts):
    im = im.copy(); p = im.load()
    for (x, y, c) in pts:
        if 0 <= x < im.width and 0 <= y < im.height: p[x, y] = hx(c)
    return im

def i_vattnet(fig, sjunk, yta=16, b=1, bredd=10):
    """Figuren ligger `sjunk` pixlar ned i vattnet, med ytan på raden `yta`. Under ytan syns inget (rummets vatten syns),
    och runt figuren går en ring av ljusa krusningar."""
    W, Hh = 24, 24
    ut = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); ut.alpha_composite(fig, ((W - fig.width) // 2, Hh - fig.height + sjunk))
    p = ut.load()
    for y in range(yta, Hh):
        for x in range(W): p[x, y] = (0, 0, 0, 0)
    cx = W / 2
    for x in range(W):
        u = abs(x + 0.5 - cx) / bredd
        if u > 1: continue
        y = yta + (0 if u < 0.6 else 1)
        if (x + b) % 3: p[x, y] = hx(VATT[3] if u < 0.5 else VATT[2])
    for (x, y) in (((2, yta + 2), (21, yta + 1)) if b == 1 else ((4, yta + 3), (19, yta + 2))):
        p[x, y] = hx(VATT[2]); p[x + 1, y] = hx(VATT[2])
    return ut

def unge():
    n, h_, u_ = U['ner'], U['hoger'], U['upp']; lyft, darra = U['lyft_bild'], U['darra']
    A = {}
    A['unge1_simmar_ner'] = [i_vattnet(n(oga_t='glad', mun='le', lyft_fot=()), 4, 19, b) for b in (1, 2)]
    A['unge1_simmar_hoger'] = [i_vattnet(h_(f=b, oga_t='oppen', mun='le'), 4, 19, b) for b in (1, 2)]
    A['unge1_simmar_upp'] = [i_vattnet(u_(f=b), 4, 19, b) for b in (1, 2)]
    A['unge1_ropar_ner'] = [lyft(n(dh=(0, -1), oga_t='stangd', mun='gap', lyft_fot=()), 1), lyft(n(dh=(0, -2), oga_t='stangd', mun='gap', lyft_fot=()), 2)]
    A['unge1_ledsen_ner'] = [n(dk=2, dh=(0, 2), oga_t='stangd', mun='vagig', lyft_fot=()), n(dk=2, dh=(0, 3), oga_t='stangd', mun='vagig', lyft_fot=())]
    A['unge1_stampar_ner'] = [n(oga_t='glad', mun='oppen', lyft_fot=(0,)), darra(n(oga_t='glad', mun='le', lyft_fot=()), 0)]
    A['unge1_stampar_ner'][1] = rita(A['unge1_stampar_ner'][1], [(3, 23, '#d6cfa4'), (4, 22, '#d6cfa4'), (20, 23, '#d6cfa4'), (19, 22, '#d6cfa4')])   # dammet vid stampen
    A['unge1_simmar_vanster'] = [i.transpose(Image.FLIP_LEFT_RIGHT) for i in A['unge1_simmar_hoger']]
    return A

def flaska(x, y, popp=False):
    """Farfars lilla flaska av mässing (5 x 7) med kork, och kompassrosen som en ljus prick."""
    pts = [(x + 1, y, '#5e4a36'), (x + 2, y, '#7e6a52'), (x + 1, y + 1, MASS[1]), (x + 2, y + 1, MASS[2])]
    for yy in range(y + 2, y + 7):
        for xx in range(x, x + 4): pts.append((xx, yy, MASS[0] if xx in (x, x + 3) or yy == y + 6 else MASS[2 if xx == x + 1 else 3 if xx == x + 2 else 1]))
    pts.append((x + 2, y + 4, MASS[4]))
    if popp:
        pts = [q for q in pts if q[1] > y] + [(x + 2, y - 2, '#7e6a52'), (x + 3, y - 3, '#5e4a36'), (x, y - 2, '#ffffff'), (x + 4, y - 1, '#ffffff')]
    return pts

def hjalte():
    hn, hu = H['h_ner'], H['h_upp']
    A = {}
    def sitter(armar=None, **kw):
        im = hn(**kw) if armar is None else hn(armR=armar[0], armL=armar[1], **kw)
        ut = Image.new('RGBA', (16, 24), (0, 0, 0, 0)); ut.alpha_composite(im.crop((0, 0, 16, 19)), (0, 3))
        ben = []
        for cx in (5, 10):
            ben += [(cx, 21, '#3a3a48'), (cx + 1, 21, '#565b68'), (cx, 22, '#2a2e38'), (cx + 1, 22, '#3a3a48'), (cx - 1, 22, '#1e1e24'), (cx + 2, 22, '#1e1e24')]
        return rita(ut, ben)
    A['hjalte_sitter_ner'] = [sitter(oga_t='oppen', mun='le')]
    A['hjalte_sitter_flaska_ner'] = [rita(sitter(((5.6, 15.4), (10.4, 15.4)), oga_t='oppen', mun='le'), flaska(6, 13)),
                                     rita(sitter(((5.6, 15.4), (10.4, 15.4)), oga_t='glad', mun='oppen'), flaska(6, 13, popp=True))]
    # kramen: ungen framifrån med slutna glada ögon, hjälten bakifrån framför med armarna om den
    for b in (1, 2):
        ut = Image.new('RGBA', (24, 28), (0, 0, 0, 0))
        ut.alpha_composite(U['ner'](oga_t='glad', mun='le', lyft_fot=()), (0, 0))
        ut.alpha_composite(hu(armR=(14.6, 13.6 - (b - 1) * 0.4), armL=(1.4, 13.6 - (b - 1) * 0.4)), (4 + (b - 1), 4))
        A.setdefault('hjalte_kramar_unge_ner', []).append(ut)
    # ungen bakom hjälten håller för hans öron: ungens huvud över hjälmen och två tassar på hjälmens sidor
    ut = Image.new('RGBA', (24, 32), (0, 0, 0, 0))
    ut.alpha_composite(U['ner'](oga_t='oppen', mun='le', lyft_fot=()), (0, 0))
    ut.alpha_composite(hn(oga_t='oppen', mun='le'), (4, 8))
    tass = []
    for x0 in (3, 18):
        tass += [(x0, 15, '#56661c'), (x0 + 1, 15, '#80922a'), (x0 + 2, 15, '#56661c'), (x0, 16, '#2e3d10'), (x0 + 1, 16, '#56661c'), (x0 + 2, 16, '#2e3d10'),
                 (x0, 17, '#2e3d10'), (x0 + 1, 17, '#2e3d10'), (x0 + 2, 17, '#2e3d10')]
    A['hjalte_oron_unge_ner'] = [rita(ut, tass)]
    return A

def plask():
    A = []
    for b in (1, 2, 3):
        im = Image.new('RGBA', (24, 16), (0, 0, 0, 0)); p = im.load()
        h = (4, 10, 6)[b - 1]; w = (5, 8, 10)[b - 1]
        for x in range(12 - w, 12 + w):
            top = 15 - int(h * (1 - abs(x + 0.5 - 12) / w) ** 0.6)
            for y in range(top, 16):
                c = VATT[3] if y == top else VATT[2] if y < top + 3 else VATT[1]
                if b == 3 and (x + y) % 3 == 0: continue
                p[x, y] = hx(c)
        for (x, y) in ((3, 4 + b), (20, 3 + b), (7, 2 + b), (16, 1 + b)) if b > 1 else ():
            p[x, y] = hx(VATT[3])
        A.append(im)
    return {'effekt_plask': A}

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    UT = '/home/claude/k3/ut/figurer'
    alla = {}
    for grupp, fig in ((unge(), 'unge'), (hjalte(), 'hjalte'), (plask(), 'effekter')):
        for namn, bilder in grupp.items():
            os.makedirs(f'{UT}/{fig}', exist_ok=True)
            for i, im in enumerate(bilder, 1):
                im = P.las_bild(im, namn); im.save(f'{UT}/{fig}/{namn}_{i:02d}.png'); alla.setdefault(namn, []).append(im)
    o = Image.new('RGBA', (4 * 80, ((len(alla) + 3) // 4) * 36 + 4), (62, 126, 186, 255))
    for i, (namn, bilder) in enumerate(alla.items()):
        x0 = 4 + (i % 4) * 80; y0 = 2 + (i // 4) * 36
        for j, im in enumerate(bilder): o.alpha_composite(im, (x0 + j * 26, y0))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/lagen_hu_x4.png'); print(len(alla))
