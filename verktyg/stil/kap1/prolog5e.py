# 5e (beslut 51.4): prologens nya animationer. Stil 2026-11-07.
#   figurer/farfar/farfar_morgon_<håll>_01–04      16 x 24  Farfar går (01 står, som förut; 02–04 nya), åt alla håll
#   figurer/farfar/farfar_morgon_vinka_<håll>_01–02 16 x 24  Farfar vinkar (ner, hoger, vanster)
#   figurer/hjalte/hjalte_vinka_<håll>_01–02         16 x 24  hjälten vinkar med den fria handen (staven som vanligt)
#   figurer/hjalte/hjalte_sang_01–04, hjalte_sang_morgon_01–02  64 x 44  sängen: hjälten sover MED hjälmen på
#   figurer/farfar/farfar_fatolj_ta_emot_01–02, farfar_fatolj_las_01–02  30 x 28  Farfar tar emot boken och läser
#   foremal/hus/fasad                               160 x 24  husets fasad i trädgårdens kant (ersätter berg)
# Ungen på sängen (hoppar upp, trampar runt och somnar) behöver inga nya bilder: unge1_glad_ner (hoppet, med
# läget i en båge), unge1_tomgang_ner/hoger/upp/vanster efter varandra (trampar runt) och unge1_sover_ner_01–02.
import os, sys
exec(open('/home/claude/kap1/bas.py').read())
LD = lambda p: Image.open(p).convert('RGBA')
INK = ROT + '/inkorg/'

# ---------------------------------------------------------------- Farfar (farfar.py och farfar_vrid.py)
_cwd = os.getcwd(); os.chdir(ROT + '/farfar')
_f = {'__file__': ROT + '/farfar/farfar_vrid.py'}
exec(open('farfar_vrid.py').read().split("if __name__ == '__main__':")[0], _f)
os.chdir(_cwd)
FMAT = _f['MAT']; Duk_f = _f['Duk']; skilj_f = _f['skilj']; GLAS = _f['GLAS']; OGA = _f['OGA']

def farfar_ner(f=0, vinka=None):
    """Framifrån i koftan. f: 0 står, 1 vänster fot fram, 2 står (gungar), 3 höger fot fram. vinka: 0/1 handen uppe."""
    d = Duk_f(16, 24); bob = 1 if f in (1, 3) else 0
    for i, cx in enumerate((6.0, 10.0)):
        lyft = (f == 1 and i == 0) or (f == 3 and i == 1)
        d.ellips(cx, 21.8 - lyft, 1.9, 1.2, 'kofta', 'sko', toner=(0, 1, 1, 2))
        d.ellips(cx, 19.4 - lyft, 1.5, 2.0, 'kofta', 'ben', toner=(0, 1, 2, 2))
    sv = {1: 0.8, 3: -0.8}.get(f, 0)                          # armarna pendlar motsatt benen
    arm_h = (12.7, 15.4 - bob) if vinka is None else ((13.4, 11.2) if vinka == 0 else (14.2, 11.6))
    d.ellips(3.3, 15.4 - bob + sv, 1.3, 2.2, 'kofta', 'arm')
    d.ellips(arm_h[0], arm_h[1] - (sv if vinka is None else 0), 1.3, 2.2, 'kofta', 'arm')
    d.ellips(3.3, 17.4 - bob + sv, 1.0, 0.9, 'hud', 'hand')
    if vinka is None: d.ellips(12.7, 17.4 - bob - sv, 1.0, 0.9, 'hud', 'hand')
    else: d.ellips(arm_h[0] + (0.4 if vinka == 0 else 1.2), arm_h[1] - 2.6, 1.1, 1.0, 'hud', 'hand')
    d.ellips(8, 15.8 - bob, 4.4, 3.2, 'kofta', 'kropp')
    d.ellips(8, 7.6 - bob, 5.6, 5.6, 'hud', 'huvud', zbias=0.05)
    for cx in (2.8, 13.2): d.ellips(cx, 8 - bob, 1.4, 2.0, 'skagg', 'har')
    d.ellips(8, 12.2 - bob, 3.6, 2.6, 'skagg', 'skagg', zbias=0.15)
    skilj_f(d, 'skagg', 'kropp', ton=1); skilj_f(d, 'kropp', 'arm', ton=1)
    d.kontur()
    y8 = 8 - bob
    d.fast(5, y8, GLAS); d.fast(6, y8, OGA); d.fast(7, y8, GLAS); d.fast(9, y8, GLAS); d.fast(10, y8, OGA); d.fast(11, y8, GLAS)
    for x in (5, 6, 10, 11): d.satt(x, 7 - bob, 'skagg', 3)
    for x in range(6, 11): d.satt(x, 10 - bob, 'skagg', 3)
    if vinka is not None:                                    # ler med öppen mun när han vinkar
        for x in (7, 8, 9): d.fast(x, 11 - bob, '#3A1A14')
    d.fast(8, 15 - bob, '#C8963E'); d.fast(8, 16 - bob, '#C83A3A')
    return d.bild()

def farfar_hoger(f=0, vinka=None):
    """Från sidan åt höger. f: 0 står, 1 och 3 kliver (främre/bakre benet byter), 2 mitt i steget."""
    d = Duk_f(16, 24); bob = 1 if f in (1, 3) else 0
    steg = {1: 1.6, 3: -1.6}.get(f, 0)
    d.ellips(7.6 - steg, 22.0, 1.9, 1.1, 'kofta', 'skob', toner=(0, 1, 1, 2))
    d.ellips(7.4 - steg * 0.6, 19.6 - bob, 1.5, 2.0, 'kofta', 'benb', toner=(0, 1, 2, 2))
    d.ellips(7.6, 15.8 - bob, 3.8, 3.2, 'kofta', 'kropp')
    d.ellips(8.6 + steg, 22.1, 2.0, 1.2, 'kofta', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8.2 + steg * 0.6, 19.7 - bob, 1.5, 2.0, 'kofta', 'ben', toner=(0, 1, 2, 2))
    hy = -bob
    d.ellips(7.8, 7.6 + hy, 5.4, 5.6, 'hud', 'huvud', zbias=0.05)
    d.ellips(3.6, 8.8 + hy, 1.4, 2.0, 'skagg', 'har')
    d.ellips(10.0, 12.4 + hy, 3.0, 2.1, 'skagg', 'skagg', zbias=0.15)
    d.ellips(13.2, 9.2 + hy, 0.9, 0.9, 'hud', 'nos', zbias=0.3)
    if vinka is None:
        d.ellips(8.6 - steg * 0.5, 15.6 - bob, 1.3, 2.3, 'kofta', 'arm')
        d.ellips(8.8 - steg * 0.7, 17.8 - bob, 1.0, 0.9, 'hud', 'hand')
    else:
        d.ellips(10.4, 12.6, 1.3, 2.4, 'kofta', 'arm')
        d.ellips(11.2 + vinka, 9.6, 1.1, 1.0, 'hud', 'hand')
    skilj_f(d, 'skagg', 'kropp', ton=1); skilj_f(d, 'arm', 'kropp', ton=1); skilj_f(d, 'har', 'huvud', ton=2)
    d.kontur()
    for x in (7, 8, 9): d.fast(x, 8 + hy, GLAS)
    d.fast(10, 8 + hy, GLAS); d.fast(11, 8 + hy, OGA); d.fast(12, 8 + hy, GLAS); d.fast(11, 7 + hy, GLAS); d.fast(11, 9 + hy, GLAS)
    for x in (10, 11, 12): d.satt(x, 6 + hy, 'skagg', 3)
    for x in (11, 12, 13): d.satt(x, 10 + hy, 'skagg', 4)
    d.fast(6, 9 + hy, '#3E7A52')
    d.fast(11, 15 - bob, GLAS); d.fast(11, 16 - bob, '#C83A3A')
    return d.bild()

def farfar_upp(f=0):
    d = Duk_f(16, 24); bob = 1 if f in (1, 3) else 0
    for i, cx in enumerate((6.0, 10.0)):
        lyft = (f == 1 and i == 0) or (f == 3 and i == 1)
        d.ellips(cx, 21.8 - lyft, 1.9, 1.2, 'kofta', 'sko', toner=(0, 1, 1, 2))
        d.ellips(cx, 19.4 - lyft, 1.5, 2.0, 'kofta', 'ben', toner=(0, 1, 2, 2))
    sv = {1: 0.8, 3: -0.8}.get(f, 0)
    d.ellips(3.3, 15.4 - bob - sv, 1.3, 2.2, 'kofta', 'arm'); d.ellips(12.7, 15.4 - bob + sv, 1.3, 2.2, 'kofta', 'arm')
    d.ellips(8, 15.8 - bob, 4.4, 3.2, 'kofta', 'kropp')
    d.ellips(8, 7.6 - bob, 5.6, 5.6, 'hud', 'huvud', zbias=0.05)
    d.ellips(8, 10.4 - bob, 5.4, 2.0, 'skagg', 'har', zbias=0.1)
    for cx in (2.8, 13.2): d.ellips(cx, 9.6 - bob, 1.0, 1.4, 'skagg', 'skagg')
    skilj_f(d, 'kropp', 'arm', ton=1); skilj_f(d, 'har', 'huvud', ton=2)
    d.kontur()
    for x in range(5, 12):
        if d.px.get((x, 18 - bob), ('', 0))[0] == 'kofta': d.satt(x, 18 - bob, 'kofta', 4)
    for x in (4, 12): d.fast(x, 8 - bob, GLAS)
    return d.bild()

for f in range(1, 4):                                         # 01 finns (står); 02–04 är stegen
    spara(f'figurer/farfar/farfar_morgon_ner_{f+1:02d}', farfar_ner(f))
    spara(f'figurer/farfar/farfar_morgon_upp_{f+1:02d}', farfar_upp(f))
    h = farfar_hoger(f); spara(f'figurer/farfar/farfar_morgon_hoger_{f+1:02d}', h)
    spara(f'figurer/farfar/farfar_morgon_vanster_{f+1:02d}', h.transpose(Image.FLIP_LEFT_RIGHT))
for v in (0, 1):
    spara(f'figurer/farfar/farfar_morgon_vinka_ner_{v+1:02d}', farfar_ner(0, vinka=v))
    h = farfar_hoger(0, vinka=v); spara(f'figurer/farfar/farfar_morgon_vinka_hoger_{v+1:02d}', h)
    spara(f'figurer/farfar/farfar_morgon_vinka_vanster_{v+1:02d}', h.transpose(Image.FLIP_LEFT_RIGHT))

# ---------------------------------------------------------------- hjälten vinkar (hjalte2/hanim.py)
_cwd = os.getcwd(); os.chdir(ROT + '/hjalte2')
_h = {'__file__': ROT + '/hjalte2/hanim.py'}
exec(open('hanim.py').read().rsplit("\nF={}", 1)[0], _h)
os.chdir(_cwd)
# den fria handen (inte stavens): framifrån vänster sida av bilden är stavens (armR), så den andra armen vinkar
for v, (arm, hand) in enumerate([((13.2, 11.0), (13.6, 8.6)), ((13.8, 11.6), (14.6, 9.2))]):
    im = _h['h_ner'](armL=arm, mun='oppen', oga_t='glad'); p = im.load()
    for (a, b, t) in [(0, 0, 3), (1, 0, 2), (0, 1, 2), (1, 1, 1), (0, -1, 3)]:
        x, y = int(hand[0]) + a, int(hand[1]) + b
        if 0 <= x < 16: p[x, y] = hx2(_h['MAT']['hud'][t])
    spara(f'figurer/hjalte/hjalte_vinka_ner_{v+1:02d}', im)
    im = _h['h_upp'](armL=(2.2 - v * 0.6, 11.4)); p = im.load()           # bakifrån: handen ute vid hjälmens kant
    hx_, hy_ = 1 - v, 6 + v
    for (a, b) in [(-1, 0), (2, 0), (0, -1), (1, -1), (-1, 1), (2, 1), (0, 2), (1, 2)]:
        if 0 <= hx_ + a < 16 and not p[hx_ + a, hy_ + b][3]: p[hx_ + a, hy_ + b] = hx2('#0E2A5A')
    for (a, b, t) in [(0, 0, 3), (1, 0, 2), (0, 1, 2), (1, 1, 1)]:
        if 0 <= hx_ + a < 16: p[hx_ + a, hy_ + b] = hx2(_h['MAT']['hud'][t])
    spara(f'figurer/hjalte/hjalte_vinka_upp_{v+1:02d}', im)
    im = _h['h_hoger'](arm=(9.6 + v * 0.6, 11.6)); p = im.load()          # från sidan: armen upp framför
    for (a, b, t) in [(0, 0, 3), (1, 0, 2), (0, 1, 2), (0, -1, 3)]: p[int(10 + v) + a, 9 + b] = hx2(_h['MAT']['hud'][t])
    spara(f'figurer/hjalte/hjalte_vinka_hoger_{v+1:02d}', im)
    spara(f'figurer/hjalte/hjalte_vinka_vanster_{v+1:02d}', im.transpose(Image.FLIP_LEFT_RIGHT))

# ---------------------------------------------------------------- sängen: hjälten sover med hjälmen på
SANG = LD(ROT + '/hus/ut/foremal/sang.png')
HJ = ['#2A2E38', '#6E737C', '#9AA0AA', '#C4C9D0', '#E8ECF0']
HUD = ['#0E2A5A', '#1E5FA8', '#2E8BD8', '#5FB4E8', '#A8DCF8']
def huvud_hjalm(oga='sover', mun='le'):
    """Huvudet på kudden med hjälmen på, som när han går (h_ner): hjälmen över pannan, ansiktet under."""
    MAT['hjalm2'] = HJ; MAT['hud2'] = HUD
    d = Duk(16, 14)
    d.ellips(8, 6.0, 6.6, 5.6, 'hjalm2', 'hjalm', zbias=-0.12)
    d.ellips(8, 8.4, 4.8, 3.6, 'hud2', 'ansikte', zbias=0.1)
    _h['skilj'](d, 'ansikte', 'hjalm', ton=1)
    d.kontur(); im = d.bild(); p = im.load()
    if oga == 'sover':
        for (x, y) in [(5, 8), (6, 8), (10, 8), (11, 8)]: p[x, y] = hx2('#101C1C')
    else:                                                     # vaken och skrattar: glada ögon
        for (x, y) in [(5, 8), (6, 7), (7, 8), (9, 8), (10, 7), (11, 8)]: p[x, y] = hx2('#101C1C')
    if mun == 'le':
        for (x, y) in [(7, 10), (8, 11), (9, 10)]: p[x, y] = hx2(HUD[0])
    else:
        for x in range(6, 11): p[x, 10] = hx2(HUD[0])
        for x in range(7, 10): p[x, 11] = hx2('#E8707A')
    return im

def tacke(lyft=0):
    d = Duk(64, 44); MAT['tacke'] = ['#1E2E5A', '#2A4A8A', '#3E66AE', '#6A8ED0', '#A8C4F0']
    d.ellips(33, 31 - lyft, 27, 10 + lyft, 'tacke', 'tacke', platt=0.7); d.kontur(); return d.bild()

def i_sangen(bild):
    """0 = sätter sig på sängkanten, 1 = har krupit ned och drar upp täcket, 2–3 = sover och andas."""
    s = SANG.copy()
    if bild == 0:
        s.alpha_composite(LD(INK + 'figurer/hjalte/hjalte_ga_ner_01.png'), (42, 14)); return s
    s.alpha_composite(huvud_hjalm(), (12, 4))
    s.alpha_composite(tacke(1 if bild == 3 else 0)); px = s.load()
    if bild == 1:
        for y in range(22, 32):
            for x in range(8, 14):
                if s.getpixel((x, y))[3]: px[x, y] = hx2('#A8C4F0' if x == 8 else '#6A8ED0')
    if bild == 3: px[27, 3] = hx2('#FFFFFF')                   # ett litet glitter när han andas ut
    return s

def morgon(bild):
    """Ungen slickar hjälten på näsan (s19), nu med hjälmen på."""
    s = SANG.copy()
    s.alpha_composite(huvud_hjalm('glad', 'skrattar' if bild == 1 else 'le'), (12, 4))
    s.alpha_composite(tacke())
    s.alpha_composite(LD(ROT + '/unge2/ut/unge1_ga_vanster_01.png'), (22 if bild == 0 else 20, 4))
    if bild == 1:
        p = s.load()
        for (x, y) in [(21, 13), (20, 13), (20, 14)]: p[x, y] = hx2('#E8707A')
    return s

for i in range(4): spara(f'figurer/hjalte/hjalte_sang_{i+1:02d}', i_sangen(i))
for i in range(2): spara(f'figurer/hjalte/hjalte_sang_morgon_{i+1:02d}', morgon(i))

# ---------------------------------------------------------------- Farfar i fåtöljen: tar emot boken och läser
FAT = LD(ROT + '/hus/ut/foremal/fatolj_hoger.png') if os.path.exists(ROT + '/hus/ut/foremal/fatolj_hoger.png') else None
BOK = ['#0E2A14', '#1E4A24', '#2E6A30', '#4A8E3A']           # expeditionsbokens gröna pärm
def farfar_natt_utan_kopp():
    """Farfar i morgonrocken framifrån, med båda händerna fria (koppen står kvar i köket)."""
    d = Duk_f(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.0, 1.9, 1.1, 'kofta', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 17.6, 4.6, 5.0, 'rock', 'rock')
    for cx in (3.3, 12.7): d.ellips(cx, 15.4, 1.4, 2.3, 'rock', 'arm')
    d.ellips(8, 7.6, 5.6, 5.6, 'hud', 'huvud', zbias=0.05)
    for cx in (2.8, 13.2): d.ellips(cx, 8, 1.4, 2.0, 'skagg', 'har')
    d.ellips(8, 12.2, 3.6, 2.6, 'skagg', 'skagg', zbias=0.15)
    skilj_f(d, 'skagg', 'rock', ton=1); skilj_f(d, 'rock', 'arm', ton=1)
    d.kontur()
    d.fast(5, 8, GLAS); d.fast(6, 8, OGA); d.fast(7, 8, GLAS); d.fast(9, 8, GLAS); d.fast(10, 8, OGA); d.fast(11, 8, GLAS)
    for x in (5, 6, 10, 11): d.satt(x, 7, 'skagg', 3)
    for x in range(6, 11): d.satt(x, 10, 'skagg', 3)
    return d.bild()

def i_fatolj(fig, efter=None):
    """Som f4fig.py: Farfar sitter i fåtöljen (spegelvänd), armstöden framför honom. efter(im) ritar ovanpå."""
    f = FAT.copy()
    s = Image.new('RGBA', (16, 22), (0, 0, 0, 0)); s.alpha_composite(fig.crop((0, 0, 16, 17)), (0, 0)); s.alpha_composite(fig.crop((0, 19, 16, 24)), (0, 17))
    f.alpha_composite(s, (7, 3))
    arm = FAT.copy(); ap = arm.load()
    for y in range(arm.height):
        for x in range(arm.width):
            if 8 <= x <= 21: ap[x, y] = (0, 0, 0, 0)
    f.alpha_composite(arm)
    if efter: efter(f)
    return f

def bok_oppen(p, x0, y0, blad=False):
    """En öppen bok sedd snett ovanifrån: grön pärm, två ljusa sidor med rader, ett blad som vänds (blad)."""
    for x in range(x0, x0 + 12):
        for y in range(y0, y0 + 6):
            p[x, y] = hx2(BOK[0] if y == y0 + 5 or x in (x0, x0 + 11) else BOK[2])
    for x in range(x0 + 1, x0 + 11):
        for y in range(y0, y0 + 5):
            p[x, y] = hx2('#F2E8C8' if x != x0 + 6 else '#B8A57A')
    for y in (y0 + 1, y0 + 3):
        for x in list(range(x0 + 2, x0 + 5)) + list(range(x0 + 8, x0 + 10)): p[x, y] = hx2('#9A8A6A')
    if blad:                                                   # bladet står upp på mitten
        for y in range(y0 - 3, y0 + 1): p[x0 + 7, y] = hx2('#FFFBEA'); p[x0 + 8, y] = hx2('#E6D6A8')
        p[x0 + 7, y0 - 4] = hx2('#5A4A30')
    for (x, y) in [(x0 - 1, y0 + 3), (x0 + 12, y0 + 3)]:      # händerna håller boken
        for (a, b, c) in [(0, 0, '#E8B89A'), (0, 1, '#C8906E')]:
            if 0 <= x < 30: p[x, y + b] = hx2(c)

def bok_stangd(p, x0, y0):
    for x in range(x0, x0 + 7):
        for y in range(y0, y0 + 5): p[x, y] = hx2(BOK[0] if x in (x0, x0 + 6) or y in (y0, y0 + 4) else BOK[2])
    for (x, y) in [(x0 + 3, y0 + 2), (x0 + 2, y0 + 2), (x0 + 4, y0 + 2), (x0 + 3, y0 + 1), (x0 + 3, y0 + 3)]: p[x, y] = hx2('#F2D22E')

if FAT is not None:
    ff = farfar_natt_utan_kopp()
    hud_f = FMAT['hud']
    def ta_emot(steg):
        def r(im):
            p = im.load()
            for i in range(7):                                   # armen sträcks ut åt höger, mot hjälten
                x, y = 20 + i, 16 - i // 3
                p[x, y] = hx2(FMAT['rock'][2]); p[x, y + 1] = hx2(FMAT['rock'][1]); p[x, y - 1] = hx2(FMAT['rock'][0]); p[x, y + 2] = hx2(FMAT['rock'][0])
            for (a, b) in [(0, 0), (1, 0), (0, 1), (1, 1)]: p[27 + a, 13 + b] = hx2(hud_f[3] if b == 0 else hud_f[2])
            if steg == 1: bok_stangd(p, 22, 8)
        return r
    def las(blad):
        def r(im):
            p = im.load()
            bok_oppen(p, 9, 15, blad)
            for x in (13, 17): p[x, 11] = hx2('#3A1A14')        # tittar ned i boken
        return r
    spara('figurer/farfar/farfar_fatolj_ta_emot_01', i_fatolj(ff, ta_emot(0)))
    spara('figurer/farfar/farfar_fatolj_ta_emot_02', i_fatolj(ff, ta_emot(1)))
    spara('figurer/farfar/farfar_fatolj_las_01', i_fatolj(ff, las(False)))
    spara('figurer/farfar/farfar_fatolj_las_02', i_fatolj(ff, las(True)))

# ---------------------------------------------------------------- husets fasad i trädgårdens kant
FALU = ['#4A1010', '#8A2420', '#A8342C', '#D8483A']
def fasad():
    """Farfars hus från trädgården: röd panel med vita knutar, takfoten överst, tre fönster och ytterdörren där
    hjälten kommer ut (in_hallen i 60,44 = x 40 i bilden). 160 x 24 med nederkanten på y 22 i kartan."""
    w, h = 160, 24
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    for y in range(h):
        for x in range(w):
            if y < 4: c = ['#2A2E38', '#3E4148', '#55555F', '#2A2E38'][y]          # takfoten
            elif y == 4: c = '#1E1E24'
            else:
                c = FALU[2] if x % 5 else FALU[1]                                    # stående panel
                if x % 5 == 1: c = FALU[3]
                if y >= h - 2: c = FALU[0]                                           # sockeln i skugga
            p[x, y] = hx2(c)
    for x0 in (0, w - 3):                                                            # vita knutar
        for y in range(5, h):
            for k in range(3): p[x0 + k, y] = hx2(['#F2E8C8', '#FFFBEA', '#C9B48A'][k])
    def fonster(x0):
        for y in range(7, 17):
            for x in range(x0, x0 + 14):
                ram = x in (x0, x0 + 1, x0 + 12, x0 + 13) or y in (7, 8, 16) or x in (x0 + 6, x0 + 7) or y == 12
                c = '#F2E8C8' if ram else ('#B8E0F4' if (x - x0) + (y - 7) < 7 else '#6AA6D8')
                p[x, y] = hx2(c)
        for x in range(x0 - 1, x0 + 15): p[x, 17] = hx2('#C9B48A')                   # fönsterbläck
    for x0 in (10, 76, 104, 132): fonster(x0)
    dx = 33                                                                          # ytterdörren
    for y in range(6, h):
        for x in range(dx, dx + 14):
            c = '#F2E8C8' if x in (dx, dx + 13) or y == 6 else (TRA_[2] if (x - dx) % 4 else TRA_[1])
            p[x, y] = hx2(c)
    for y in range(9, 14):                                                           # ett litet fönster i dörren
        for x in range(dx + 4, dx + 10): p[x, y] = hx2('#B8E0F4' if y < 11 else '#6AA6D8')
    p[dx + 10, 16] = hx2('#F2D22E'); p[dx + 10, 17] = hx2('#C8963E')               # handtaget
    for x in range(dx - 2, dx + 16): p[x, h - 1] = hx2('#8E949E'); p[x, h - 2] = hx2('#B4B8C0')   # trappsteget av sten
    for (x, y, c) in [(dx + 16, 9, '#3E4148'), (dx + 16, 10, '#F2D88A'), (dx + 17, 10, '#FFF2B8'), (dx + 16, 11, '#C8A040')]: p[x, y] = hx2(c)  # lampan
    return im
TRA_ = MAT['tra']
spara('foremal/hus/fasad', fasad())

if __name__ == '__main__':
    skriv()
    ark('/tmp/k5e_figurer.png', [v for k, v in ALLA.items() if 'farfar_morgon' in k or 'vinka' in k], 5, bg=(196, 150, 98, 255))
    ark('/tmp/k5e_sang.png', [v for k, v in ALLA.items() if 'sang' in k or 'fatolj' in k], 4, bg=(138, 92, 48, 255))
    ark('/tmp/k5e_fasad.png', [ALLA['foremal/hus/fasad']], 5)
