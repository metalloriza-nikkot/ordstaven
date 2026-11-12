# Kapitel 2, steg 5 del 3b: figurernas lägen (10g, *Figurer*): ungen i leran, ungen som sjunker, nafsar efter bubblor,
# hoppar, piper på stocken och skakar sig, hjälten som sjunker och sitter i leran, hägern, och gåvorna som lager.
# Ungen och hjälten ritas med sina egna skript (unge2/anim.py och hjalte2/hanim.py), så att de är exakt samma figurer.
# Hjältens hud och dräkt har sina skyddade toner, så att palettbytet fungerar också här.
import os, sys, math
from PIL import Image
sys.argv = sys.argv[:1]
def ladda(mapp, fil):
    g = {'__name__': 'lagen', '__file__': os.path.join(mapp, fil)}; cwd = os.getcwd(); os.chdir(mapp)
    try: exec(open(fil).read(), g)
    finally: os.chdir(cwd)
    return g
U = ladda('/home/claude/unge2', 'anim.py')
H = ladda('/home/claude/hjalte2', 'hanim.py')
B = ladda('/home/claude/bybor', 'bybor.py') if False else None
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
P = Palett()
UT = '/home/claude/bybor/ut/figurer'
LERA = ['#241c16', '#33281e', '#43362a', '#56483a', '#7e8a8e']
VATT = ['#24407a', '#5e8cc8', '#a8c8e8', '#ffffff']
def hx(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

# ---------------- leran som täcker benen ----------------
def i_leran(fig, sjunk, mark=20, cx=None, bredd=10, b=1):
    """Figuren sjunker `sjunk` pixlar ned i en blank lerpöl vars yta ligger på raden `mark`. Allt under ytan syns inte."""
    W, Hh = 24, 24
    ut = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    ut.alpha_composite(fig, ((W - fig.width) // 2, Hh - fig.height + sjunk))
    p = ut.load(); cx = W / 2 if cx is None else cx
    for y in range(mark, Hh):
        for x in range(W): p[x, y] = (0, 0, 0, 0)
    ry = 3.2
    for y in range(int(mark - ry), Hh):
        for x in range(W):
            u = ((x + .5 - cx) / bredd) ** 2 + ((y + .5 - mark) / ry) ** 2
            if u > 1: continue
            if p[x, y][3] and y < mark: continue                          # figuren står framför pölens bakkant
            c = LERA[2] if y < mark else LERA[1]
            if u > 0.72: c = LERA[0]
            elif y == mark and abs(x + .5 - cx) < bredd * 0.7: c = LERA[3]   # leran kring figuren, uppkastad
            if y == mark - 1 and (x + b * 3) % 5 == 0 and u < 0.72: c = LERA[4]  # det våta skenet
            p[x, y] = hx(c)
    if b == 2:
        for (x, y) in ((int(cx - bredd + 3), mark + 1), (int(cx + bredd - 4), mark)): p[x, y] = hx(LERA[4])
    return ut

# ---------------- ungen ----------------
def unge_lagen():
    n, h_, u_ = U['ner'], U['hoger'], U['upp']
    lyft, darra = U['lyft_bild'], U['darra']
    A = {}
    A['unge1_lera_ner'] = [i_leran(n(oga_t='stora', mun='vagig', lyft_fot=()), 4, 20, bredd=11, b=1),
                           i_leran(darra(n(oga_t='stora', mun='o', lyft_fot=()), 1), 4, 20, bredd=11, b=2)]
    A['unge1_sjunker_ner'] = [i_leran(n(oga_t='stora', mun='o', lyft_fot=()), 2, 20, bredd=11, b=1),
                              i_leran(n(oga_t='stora', mun='vagig', lyft_fot=()), 4, 20, bredd=11, b=2),
                              i_leran(n(oga_t='stora', mun='vagig', lyft_fot=()), 7, 20, bredd=11, b=1)]
    # nafsar efter bubblor: huvudet upp, munnen gapar och smäller ihop, en bubbla framför nosen
    def bubbla(im, x, y):
        p = im.load()
        for (dx, dy, c) in ((0, 0, '#e8f8fc'), (1, 0, '#cdeff8'), (0, 1, '#cdeff8'), (1, 1, '#8ac6da'), (-1, 0, '#cdeff8'), (0, -1, '#ffffff')):
            if 0 <= x + dx < 24 and 0 <= y + dy < 24: p[x + dx, y + dy] = hx(c)
        return im
    A['unge1_nafsar_ner'] = [bubbla(lyft(n(dh=(0, -1), oga_t='glad', mun='gap'), 1), 12, 2), n(oga_t='glad', mun='tugga')]
    A['unge1_nafsar_hoger'] = [bubbla(lyft(h_(dh=(0, -1), oga_t='upp', mun='gap'), 1), 22, 7), h_(oga_t='glad', mun='tugga')]
    # jättehoppet (åt sidan): huk, i luften med benen indragna, landar. Spelet flyttar figuren i en båge.
    A['unge1_hopp_hoger'] = [h_(dk=1, dh=(0, 1), oga_t='oppen', mun='le'), lyft(h_(f=1, oga_t='glad', mun='oppen'), 2), h_(f=3, dk=1, oga_t='glad', mun='le')]
    # piper på stocken: sitter lågt, stora ögon, munnen som säger PIP
    A['unge1_piper_ner'] = [n(dk=2, dh=(0, 2), oga_t='stora', mun='o', lyft_fot=()), lyft(n(dk=1, dh=(0, 1), oga_t='stora', mun='oppen', lyft_fot=()), 1)]
    # skakar sig torr: hela kroppen åt sidorna, och vattendroppar flyger
    def droppar(im, fas):
        p = im.load()
        pts = [(2, 8), (21, 7), (4, 4), (19, 3), (1, 13), (22, 12)] if fas == 1 else [(3, 6), (20, 9), (6, 2), (17, 2), (0, 11), (23, 14)]
        for (x, y) in pts:
            p[x, y] = hx(VATT[2]);
            if y + 1 < 24: p[x, y + 1] = hx(VATT[1])
        return im
    A['unge1_skakar_ner'] = [droppar(darra(n(oga_t='stangd', mun='vagig'), -1), 1), droppar(darra(n(oga_t='stangd', mun='vagig'), 1), 2), n(oga_t='glad', mun='le')]
    for k in list(A):
        if k.endswith('_hoger'): A[k.replace('_hoger', '_vanster')] = [i.transpose(Image.FLIP_LEFT_RIGHT) for i in A[k]]
    return A

# ---------------- hjälten ----------------
def hjalte_lagen():
    hn = H['h_ner']
    A = {}
    A['hjalte_sjunker_ner'] = [i_leran(hn(oga_t='oppen', mun='o'), 2, 21, bredd=8, b=1),
                               i_leran(hn(armR=(2.6, 13.0), armL=(13.4, 13.0), oga_t='oppen', mun='o'), 5, 21, bredd=8, b=2),
                               i_leran(hn(armR=(2.4, 11.6), armL=(13.6, 11.6), oga_t='oppen', mun='oppen'), 8, 21, bredd=8, b=1)]
    A['hjalte_lera_ner'] = [i_leran(hn(armR=(2.6, 12.6), armL=(12.7, 15.2), oga_t='oppen', mun='o'), 5, 21, bredd=8, b=1),
                            i_leran(hn(armR=(3.3, 15.2), armL=(13.4, 12.6), oga_t='oppen', mun='o'), 5, 21, bredd=8, b=2)]
    return A

# ---------------- hägern (sida, 20 x 32): står på ett ben, vrider huvudet, flyger ----------------
def hagern():
    g = ladda('/home/claude/bybor', 'bybor.py')
    Duk, MAT, skilj = g['Duk'], g['MAT'], g['skilj']
    MAT['hager'] = ['#2a3038', '#5a6470', '#8e98a4', '#bcc4cc', '#e4e8ec']
    MAT['vit'] = ['#6e747f', '#b8bec6', '#dce0e4', '#eeeff4', '#ffffff']
    NABB = ('#7a5a10', '#d8a85a', '#f2c94a')                               # gul näbb, inte orange
    def sta(huvud=0):
        d = Duk(20, 32)
        for y in range(20, 31): d.satt(9, y, 'hager', 1, 'ben')            # ett ben, det andra uppdraget
        d.satt(10, 31, 'hager', 0, 'fot'); d.satt(8, 31, 'hager', 0, 'fot'); d.satt(11, 31, 'hager', 0, 'fot')
        d.ellips(9, 17, 5.2, 4.0, 'hager', 'kropp', zbias=0.05)
        d.ellips(5, 19, 2.6, 2.0, 'hager', 'stjart', toner=(0, 1, 2, 2))
        for i in range(8): d.satt(11 + (1 if i > 3 else 0) - (1 if i > 6 else 0), 12 - i, 'vit', 3 if i % 2 else 2, 'hals')
        d.ellips(12 + huvud, 4, 2.4, 2.0, 'vit', 'huvud', zbias=0.1)
        skilj(d, 'hals', 'kropp'); skilj(d, 'stjart', 'kropp', 1)
        d.kontur()
        im = d.bild(); p = im.load()
        for i in range(5): p[14 + huvud + i, 4 + (i // 3)] = hx(NABB[2] if i < 3 else NABB[1])
        p[13 + huvud, 3] = hx('#101c1c'); p[12 + huvud, 3] = hx('#ffffff')
        for i in range(4): p[10 - i + huvud, 2 + (i // 2)] = hx('#1e2230')        # den svarta tofsen bakåt
        for (x, y) in ((8, 15), (10, 16), (7, 17), (11, 18)): p[x, y] = hx('#5a6470')
        return im
    def flyga(b):
        d = Duk(32, 24)
        d.ellips(16, 13, 6, 2.6, 'hager', 'kropp', zbias=0.05)
        vy = 4 if b == 1 else 16
        for k in range(12):
            for s in (-1, 1):
                x = 16 + s * (3 + k); y = int(13 + (vy - 13) * (k / 11))
                for w in range(3): d.satt(x, y + w - (1 if b == 1 else 0), 'hager', 2 if w == 0 else 1, 'vinge')
        d.ellips(24, 11, 1.8, 1.6, 'vit', 'huvud', zbias=0.1)
        d.kontur()
        im = d.bild(); p = im.load()
        for i in range(4): p[26 + i, 11] = hx(NABB[2])
        for i in range(5): p[6 + i, 14] = hx('#5a6470')                     # benen sträckta bakåt
        p[25, 10] = hx('#101c1c')
        return im
    A = {'hager_sta_hoger': [sta(0), sta(1)], 'hager_flyger_hoger': [flyga(1), flyga(2)]}
    for k in list(A): A[k.replace('_hoger', '_vanster')] = [i.transpose(Image.FLIP_LEFT_RIGHT) for i in A[k]]
    return A

# ---------------- gåvorna som lager på hjälten (16 x 24, som taggkam och ryggsack) ----------------
def gavor():
    g = ladda('/home/claude/bybor', 'bybor.py')
    Duk, MAT, skilj = g['Duk'], g['MAT'], g['skilj']
    MAT['halm'] = ['#6a5020', '#a8863a', '#c8a858', '#e6cc7a', '#f6e6a8']
    A = {}
    # den rosa ryggsäcken: flätad av vass, med två rosa band
    def sack(rikt):
        d = Duk(16, 24)
        if rikt == 'upp':
            d.ellips(8, 16.0, 3.8, 3.6, 'halm', 'sack'); d.ellips(8, 13.8, 3.6, 1.4, 'halm', 'lock', toner=(2, 3, 3, 4))
            skilj(d, 'lock', 'sack', 1); d.kontur()
            for (x, y), nm in list(d.del_.items()):
                if nm == 'sack' and (x + y) % 2 == 0 and d.px[(x, y)][1] > 1: d.satt(x, y, 'halm', d.px[(x, y)][1] - 1)   # flätningen
            for y in range(13, 20):
                for x in (6, 10):
                    if (x, y) in d.px: d.satt(x, y, 'rosa', 3 if y < 16 else 2)
        elif rikt == 'hoger':
            d.ellips(3.0, 15.6, 2.0, 3.2, 'halm', 'sack'); d.kontur()
            for y in range(13, 19):
                if (3, y) in d.px: d.satt(3, y, 'rosa', 3 if y < 16 else 2)
        else:
            for (x, y) in [(5, 13), (5, 14), (5, 15), (10, 13), (10, 14), (10, 15)]: d.satt(x, y, 'rosa', 3 if y == 13 else 2, 'rem')
        return d.bild()
    # drakvimpeln: en liten stång på hjälmen med en röd och gul vimpel
    def vimpel(rikt):
        d = Duk(16, 24)
        x0 = {'ner': 11, 'upp': 4, 'hoger': 5}[rikt]
        for y in range(0, 4): d.satt(x0, y, 'brun', 1 if y else 3, 'stang')
        ut = -1 if rikt == 'upp' else 1
        for i in range(4):
            for y in range(0, 3 - i // 2):
                x = x0 + ut * (1 + i)
                d.satt(x, y, 'rod' if i < 2 else 'gul', 2 if y else 3, 'vimpel')
        d.kontur()
        return d.bild()
    for r in ('ner', 'hoger', 'upp'):
        A[f'ryggsack_rosa_{r}'] = [sack(r)]; A[f'drakvimpel_{r}'] = [vimpel(r)]
    for k in [k for k in A if k.endswith('_hoger')]: A[k.replace('_hoger', '_vanster')] = [A[k][0].transpose(Image.FLIP_LEFT_RIGHT)]
    return A

def skriv_alla():
    alla = {}
    for mapp, A in (('unge', unge_lagen()), ('hjalte', hjalte_lagen()), ('omgivning', hagern()), ('hjalte', gavor())):
        for namn, bilder in A.items():
            os.makedirs(f'{UT}/{mapp}', exist_ok=True)
            for i, im in enumerate(bilder, 1):
                im = im.convert('RGBA'); px = im.load()
                for yy in range(im.height):
                    for xx in range(im.width):
                        c = px[xx, yy]
                        if c[3]: px[xx, yy] = hx(P.narmast('#%02x%02x%02x' % c[:3])[0])[:3] + (c[3],)
                im = P.las_bild(im, namn)
                im.save(f'{UT}/{mapp}/{namn}_{i:02d}.png'); alla[f'{mapp}/{namn}_{i:02d}'] = im
    return alla

if __name__ == '__main__':
    alla = skriv_alla()
    vis = [k for k in alla if not k.endswith('vanster_01') and 'vanster' not in k]
    W = 4 + len(vis) * 0
    kol = 12; rad = (len(vis) + kol - 1) // kol
    o = Image.new('RGBA', (kol * 34 + 4, rad * 36 + 4), (126, 170, 74, 255))
    for i, k in enumerate(vis):
        im = alla[k]
        if k.startswith('hjalte/hjalte_') or k.startswith('hjalte/ryggsack') or k.startswith('hjalte/drakvimpel'):
            if 'ryggsack' in k or 'drakvimpel' in k:
                r = k.split('_')[-2]
                bas = Image.open(f'/home/claude/inkorg/figurer/hjalte/hjalte_ga_{r}_01.png').convert('RGBA').copy()
                if r == 'upp' and 'ryggsack' in k: bas.alpha_composite(im)
                else: bas.alpha_composite(im) if 'drakvimpel' in k or r != 'hoger' else None
                if 'ryggsack' in k and r == 'hoger': b2 = im.copy(); b2.alpha_composite(bas); bas = b2
                im = bas
        o.alpha_composite(im, (2 + (i % kol) * 34 + (32 - im.width) // 2, 2 + (i // kol) * 36 + 34 - im.height))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/lagen.png')
    print(len(alla), 'bilder')
