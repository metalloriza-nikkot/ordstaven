# Stil 15 och 13 (beslut 67.2): ungens lägen och mellanscenerna i prologen och kapitel 1 som inte syns. Stil 2026-11-08.
#   figurer/unge/unge1_lyssnar_<håll>_01–02      24 x 24  lyssnar och spetsar öronen: borsten reser sig, huvudet lyfts (ner, hoger, vanster, upp)
#   figurer/unge/unge1_fnissar_mun_ner_01–02     24 x 24  fnissar och håller en fot för munnen
#   figurer/unge/unge1_kryper_ihop_ner_01–02     24 x 24  kryper ihop (TOK TOK): borsten slätas ut, huvudet dras in, darrar lite
#   figurer/unge/unge1_biter_<håll>_01–02        24 x 24  biter i en lian och drar (hoger, vanster, upp)
#   figurer/farfar/farfar_fatolj_skriver_01–02   30 x 28  Farfar i fåtöljen skriver lappen med pennan
#   figurer/farfar/farfar_fatolj_gaspar_01–02    30 x 28  Farfar i fåtöljen gäspar
#   figurer/effekter/efx_stav_ristas_01–08 och efx_stav_ristas.json  närbild: SVÄRD ristas i staven bredvid LJUS (gnistan går, bokstäverna glöder)
#   foremal/skog/buske_<färg>_prassel_01–02      buskarna i k1s03 som prasslar (grön, gul, röd)
# Redan ritat och används som det är: unge1_gaspar_ner, unge1_fnissar_ner, unge1_nysa_ner, apa_sucka, uggla_vrid,
# ekorre_skaka, efx_skal och efx_lov_yr.
import os, json
from PIL import Image
ROT = '/home/claude'

# ---------------------------------------------------------------- Farfar och fåtöljen (prolog5e.py, utan att spara något)
_src = open(ROT + '/kap1/prolog5e.py').read().split("\nif __name__ == '__main__':")[0]
exec(_src)
ALLA.clear()

# ---------------------------------------------------------------- ungen (unge2/anims.py)
_cwd = os.getcwd(); os.chdir(ROT + '/unge2')
U = {'__name__': 'lagen'}
exec(open('anims.py').read(), U)
os.chdir(_cwd)

# ner() med två tillägg: borsten kan resas (höjd 1–2) eller slätas ut (-1), och en framfot kan hållas för munnen.
exec('''
def borst_h(d, pts, h=0):
    for (x, y) in pts:
        if h < 0:
            d.satt(x, y, 'gra', 3, 'rygg'); d.satt(x + 1, y, 'gra', 2, 'rygg'); continue
        d.satt(x, y, 'gra', 3, 'rygg'); d.satt(x + 1, y, 'gra', 2, 'rygg'); d.satt(x, y - 1, 'gra', 4, 'rygg')
        for k in range(h):
            d.satt(x, y - 2 - k, 'gra', 4 if k == h - 1 else 3, 'rygg'); d.satt(x + 1, y - 1 - k, 'gra', 3, 'rygg')

def ner_x(oga_t='oppen', mun='le', dk=0, dh=(0, 0), borst=0, tass=False, lyft_fot=()):
    d = Duk(); hx, hy = dh
    d.ellips(18.5, 3.2 + dk, 2.9, 2.3, 'klubba', 'klubba', toner=(1, 2, 3, 4))
    for (x, y) in [(17, 5), (17, 6), (16, 7)]: d.satt(x, y + dk, 'oliv', 2, 'svans'); d.satt(x + 1, y + dk, 'oliv', 1, 'svans')
    d.ellips(12, 13.5 + dk, 9.6, 5.2, 'oliv', 'kropp')
    d.ellips(12, 9.2 + dk, 8.6, 4.6, 'gra', 'rygg', platt=0.5, zbias=-0.25)
    borst_h(d, [(5, 6 + dk), (8, 5 + dk), (11, 4 + dk), (14, 5 + dk), (17, 6 + dk)], borst)
    for i, cx in enumerate((5.5, 18.5)):
        if tass and i == 0: continue
        up = 1 if i in lyft_fot else 0
        d.ellips(cx, 17.6 - up, 2.3, 2.6, 'oliv', 'ben')
        d.ellips(cx, 19.9 - up, 2.5, 1.4, 'bla', 'fot')
    d.ellips(12 + hx, 13.2 + hy, 7.6, 6.0, 'huvud', 'huvud', zbias=0.05)
    d.ellips(12 + hx, 16.6 + hy, 3.2, 1.8, 'huvud', 'nos', toner=(2, 3, 3, 4), zbias=0.2)
    if tass:   # vänster framben böjs upp mot munnen, foten (blå) läggs över munnen
        d.ellips(7.4, 17.4, 2.0, 2.2, 'oliv', 'ben')
        d.ellips(10.6 + hx, 17.6 + hy, 2.3, 1.5, 'bla', 'fot', toner=(1, 2, 3, 4), zbias=0.25)
    skilj(d, 'huvud', 'kropp'); skilj(d, 'huvud', 'ben'); skilj(d, 'rygg', 'kropp', ton=1)
    if tass: skilj(d, 'fot', 'huvud'); skilj(d, 'fot', 'nos')
    d.kontur()
    ogon_par(d, oga_t, 7 + hx, 15 + hx, 12 + hy)
    if not tass: mun_fram(d, mun, hx, hy)
    else:      # mungiporna syns på var sida om foten, och tårna
        for (x, y) in [(13, 17), (14, 16)]: d.fast(x + hx, y + hy, MUN)
        for (x, y) in [(9, 18), (11, 18)]: d.satt(x + hx, y + hy, 'bla', 4)
    for (x, y) in [(6, 15), (17, 15)]: d.fast(x + hx, y + hy, ROS)
    for (x, y) in [(3, 11), (2, 12), (21, 11), (21, 12), (3, 15), (3, 16), (20, 15), (20, 16)]:
        if d.px.get((x, y + dk), ('', 0))[0] == 'oliv': d.satt(x, y + dk, 'oliv', 1)
    for i, cx in enumerate((5, 18)):
        if tass and i == 0: continue
        up = 1 if i in lyft_fot else 0
        for tx in (-1, 1): d.satt(cx + tx + (1 if cx == 5 else 0), 21 - up, 'bla', 4)
    return d.bild()
''', U)

def med_borst(fn, h, *a, **k):
    """Kör hoger()/upp() med borsten rest h pixlar (byter borst() en stund)."""
    gammal = U['borst']; U['borst'] = lambda d, pts: U['borst_h'](d, pts, h)
    try: return fn(*a, **k)
    finally: U['borst'] = gammal

spegla = lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)
darra = U['darra']; ner_x = U['ner_x']
L = {}
# lyssnar: huvudet lyfts och vrids lite, ögonen tittar upp åt sidan, borsten reser sig (öronen spetsas), sedan ett ryck till
L['lyssnar_ner'] = [ner_x(oga_t='upp', mun='le', dh=(1, -1), borst=1), ner_x(oga_t='upp', mun='o', dh=(1, -1), borst=2)]
L['lyssnar_hoger'] = [med_borst(U['hoger'], 1, oga_t='upp', dh=(0, -1)), med_borst(U['hoger'], 2, oga_t='upp', mun='o', dh=(0, -1))]
L['lyssnar_upp'] = [med_borst(U['upp'], 1, dh=(0, -1)), med_borst(U['upp'], 2, dh=(0, -2))]
L['lyssnar_vanster'] = [spegla(i) for i in L['lyssnar_hoger']]
# fnissar och håller för munnen
L['fnissar_mun_ner'] = [ner_x(oga_t='glad', tass=True), ner_x(oga_t='glad', tass=True, dk=1, dh=(0, 1))]
# kryper ihop: lägre, huvudet indraget, blundar hårt, borsten slät; darrar en pixel
_k = ner_x(oga_t='stangd', mun='vagig', dk=2, dh=(0, 3), borst=-1)
L['kryper_ihop_ner'] = [_k, darra(_k, 1)]
# biter i en lian och drar: huvudet fram och upp med gapet, sedan bakåt och skakar
L['biter_hoger'] = [U['hoger'](oga_t='stangd', mun='gap', dh=(1, -2)), darra(U['hoger'](oga_t='stangd', mun='tugga', dk=1, dh=(-1, 0)), -1)]
L['biter_vanster'] = [spegla(i) for i in L['biter_hoger']]
L['biter_upp'] = [U['upp'](f=1, dh=(0, -2)), darra(U['upp'](dk=1, dh=(0, 0)), 1)]
for k, v in L.items():
    for i, im in enumerate(v): spara(f'figurer/unge/unge1_{k}_{i+1:02d}', im)

# ---------------------------------------------------------------- Farfar i fåtöljen skriver och gäspar
PAPPER = ['#8A7A50', '#C8B27A', '#E8D9A8', '#F6EED0']
def skriver(steg):
    def r(im):
        p = im.load()
        for x in range(10, 19):                                   # lappen på en skrivskiva i knät, gulnad med mörkare kant
            for y in range(16, 21):
                kant = x in (10, 18) or y in (16, 20)
                p[x, y] = hx2(PAPPER[1] if kant else PAPPER[2 if (x + y) % 5 else 3])
        for x in range(11, 18): p[x, 21] = hx2('#5A3A20')          # skrivskivan
        rader = [(12, 15, 17), (12, 14, 19)] if steg == 0 else [(12, 16, 17), (12, 16, 19)]
        for (x0, x1, y) in rader[:1 + steg]:
            for x in range(x0, x1 + 1): p[x, y] = hx2('#5A4A30')
        p[16, 18] = hx2('#C8963E')                                 # kompassrosen i hörnet (en prick guld)
        px = 15 + steg * 2                                          # pennan i högra handen, snett upp åt höger
        for i in range(4): p[px + i, 18 - i] = hx2('#3A2A1A' if i else '#101010')
        for (a, b) in [(1, 1), (2, 1), (1, 2)]: p[px + a, 18 - 1 + b - 1] = hx2('#E8B89A')
        for x in (13, 17): p[x, 11] = hx2('#3A1A14')               # tittar ned på lappen
        for (a, b) in [(9, 18), (9, 19)]: p[a, b] = hx2('#E8B89A')  # vänstra handen håller lappen
    return r
def gaspar(steg):
    def r(im):
        p = im.load()
        for x in (12, 13, 16, 17): p[x, 11] = hx2('#3A1A14')        # blundar: två streck bakom glasögonen
        if steg == 0:                                               # stort gap i skägget
            for (x, y) in [(14, 14), (15, 14), (13, 15), (16, 15), (13, 16), (16, 16), (14, 17), (15, 17)]: p[x, y] = hx2('#3A1A14')
            for (x, y) in [(14, 15), (15, 15), (14, 16), (15, 16)]: p[x, y] = hx2('#8A2420')
            for (x, y) in [(8, 9), (8, 10), (9, 8), (21, 9), (21, 10), (20, 8)]: p[x, y] = hx2(FMAT['rock'][2])   # armarna sträcks upp
            for (x, y) in [(9, 7), (20, 7)]: p[x, y] = hx2(FMAT['hud'][3])
        else:                                                       # munnen sluts till ett litet o
            for (x, y) in [(14, 15), (15, 15), (14, 16), (15, 16)]: p[x, y] = hx2('#3A1A14')
    return r
ff = farfar_natt_utan_kopp()
for s in (0, 1):
    spara(f'figurer/farfar/farfar_fatolj_skriver_{s+1:02d}', i_fatolj(ff, skriver(s)))
    spara(f'figurer/farfar/farfar_fatolj_gaspar_{s+1:02d}', i_fatolj(ff, gaspar(s)))

# ---------------------------------------------------------------- SVÄRD ristas i staven (närbild)
STAV = Image.open(ROT + '/inkorg/ui/start/stav.png').convert('RGBA')
TECKEN = {'S': [(1, 0), (2, 0), (1, 1), (0, 2), (1, 2)], 'V': [(0, 0), (2, 0), (0, 1), (2, 1), (1, 2)],
          'Ä': [(1, 0), (0, 1), (1, 1), (2, 1), (0, 2), (2, 2), (0, -1), (2, -1)],
          'R': [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (2, 2)], 'D': [(0, 0), (1, 0), (0, 1), (2, 1), (0, 2), (1, 2)]}
def ristning(ord_, x0, y0, upp_till=None, glod=None):
    """Bokstäverna i ord_ med 4 px mellan, från x0. upp_till: bara pixlar till vänster om den. glod: x för gnistan."""
    im = STAV.copy(); p = im.load(); x = x0
    for ch in ord_:
        for (a, b) in TECKEN[ch]:
            X, Y = x + a, y0 + b
            if upp_till is not None and X > upp_till: continue
            nyss = upp_till is not None and X > upp_till - 3
            p[X, Y] = hx2('#FFF2B8' if nyss else '#FFD95A')
        x += 4
    if glod is not None:                                          # gnistan: vit kärna, guld runt, två strålar
        for (a, b, c) in [(0, 0, '#FFFFFF'), (1, 0, '#FFF2B8'), (-1, 0, '#FFF2B8'), (0, 1, '#FFF2B8'), (0, -1, '#FFF2B8'),
                          (0, -3, '#FFD95A'), (0, 3, '#FFD95A'), (2, -2, '#F2D22E'), (-2, 2, '#F2D22E')]:
            X, Y = glod + a, y0 + 1 + b
            if 0 <= X < im.width and 0 <= Y < im.height: p[X, Y] = hx2(c)
    return im
ORD, X0, Y0 = 'SVÄRD', 23, 5
X1 = X0 + 4 * len(ORD) - 2
bilder = []
for i in range(6):                                                # gnistan går från vänster till höger och lämnar ordet efter sig
    g = X0 + round(i * (X1 - X0) / 5)
    bilder.append(ristning(ORD, X0, Y0, upp_till=g, glod=g))
klar = ristning(ORD, X0, Y0)
glimt = klar.copy(); p = glimt.load()
for (a, b, c) in [(X0 + 9, Y0 - 2, '#FFFFFF'), (X0 + 9, Y0 - 3, '#FFF2B8'), (X0 + 8, Y0 - 2, '#FFF2B8'), (X0 + 10, Y0 - 2, '#FFF2B8')]: p[a, b] = hx2(c)
bilder += [glimt, klar]
for i, im in enumerate(bilder): spara(f'figurer/effekter/efx_stav_ristas_{i+1:02d}', im)
RISTAS = {'storlek': list(STAV.size), 'ord': ORD, 'ord_ruta': [X0, Y0 - 1, X1 - X0 + 1, 4],
          'ljus_ruta': [60, 5, 13, 3], 'ms_per_bild': 120, 'bilder': [f'efx_stav_ristas_{i+1:02d}' for i in range(8)],
          'slinga': ['efx_stav_ristas_07', 'efx_stav_ristas_08'], 'ljud': 'formel_ristas',
          'anteckning': 'Bild 1–6 en gång (gnistan ristar SVÄRD från vänster), sedan 7–8 växelvis ca 300 ms medan ordet står kvar. '
                        'Ordet står också i textlagret i Lexend ovanför närbilden, så att det går att läsa.'}

# ---------------------------------------------------------------- buskarna prasslar (k1s03)
def prassel(namn):
    src = Image.open(ROT + f'/inkorg/foremal/skog/{namn}.png').convert('RGBA'); w, h = src.size
    ut = []
    for dx in (1, -1):
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        topp = src.crop((0, 0, w, h * 3 // 5)); bott = src.crop((0, h * 3 // 5, w, h))
        im.alpha_composite(bott, (0, h * 3 // 5)); im.alpha_composite(topp, (dx, 0 if dx > 0 else 1))
        p = im.load(); s = src.load()
        for (a, b) in ([(w // 3, 1), (2 * w // 3 + 1, 2)] if dx > 0 else [(w // 2, 0), (w // 4, 2)]):   # två löv som lyfter
            for (c, e) in [(0, 0), (1, 0)]:
                if 0 <= a + c < w and 0 <= b + e < h: p[a + c, b + e] = hx2('#80922A' if c else '#A3B53A')
        ut.append(im)
    return ut
for n in ('buske_gron', 'buske_gul', 'buske_rod'):
    for i, im in enumerate(prassel(n)): spara(f'foremal/skog/{n}_prassel_{i+1:02d}', im)

if __name__ == '__main__':
    skriv()
    json.dump(RISTAS, open(UT + 'figurer/effekter/efx_stav_ristas.json', 'w'), ensure_ascii=False, indent=1)
    ark('/tmp/l13_unge.png', [v for k, v in ALLA.items() if 'unge1' in k], 6)
    ark('/tmp/l13_farfar.png', [v for k, v in ALLA.items() if 'fatolj' in k], 6, bg=(138, 92, 48, 255))
    ark('/tmp/l13_stav.png', [v for k, v in ALLA.items() if 'stav_ristas' in k][:8:2] + [ALLA['figurer/effekter/efx_stav_ristas_08']], 5, bg=(60, 40, 30, 255))
    ark('/tmp/l13_buskar.png', [v for k, v in ALLA.items() if 'prassel' in k], 5)
