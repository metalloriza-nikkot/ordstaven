# Kapitel 2:s rum som färdiga bilder (10g, steg 5): marken, vattnet, husen och det som står still,
# ritade en gång per rum, som inomhusrummen (karta `bild`, 27.6). Samma ritning som den godkända skissen (skiss2/),
# men utan figurer och utan föremål som spelet ritar själv (skyltar, rep, lyktor, elden, brunnen, grodor, tussar ...).
#   rum/kap-02/<rum>.png          marken på dagen
#   rum/kap-02/byn_kvall.png      byn på kvällen, mörkare och ritad en gång (80.6), med fönstren tända
#   rum/kap-02/<rum>_over.png     det som står ovanför figurerna (den höga vassen längs kanterna)
#   rum/kap-02/vassen_falt.png    var vassfältets toppar täcker fötterna (en mask, se figurer/omgivning/vass_fotter)
import os, sys, math, random
sys.path.insert(0, '/home/claude/skiss2')
os.chdir('/home/claude/skiss2')
from bas import *
import rum_byn
UT = '/home/claude/rum2/ut/rum/kap-02'
os.makedirs(UT, exist_ok=True)

def tom(b, h):
    d = Duk(b, h); d.im = Image.new('RGBA', (b, h), (0, 0, 0, 0)); d.px = d.im.load(); return d

def over_kant(b, h, kanter, seed):
    """Den höga vassen längs rummets kanter, som ett eget lager ovanför figurerna (som ridån i skogen)."""
    d = Duk(b, h)
    d.im = Image.new('RGBA', (b, h), (0, 0, 0, 0)); d.px = d.im.load()
    for i, (x0, y0, bb, hh, ned) in enumerate(kanter):
        hog_vass(d, x0, y0, bb, hh, seed=seed + i, kant_ned=ned)
    return d

# ---------------- träskkanten ----------------
def trasket():
    import rum_trasket as T
    m, o = objekt('trasket_kanten')
    d = Duk(640, 192)
    d.mark('gras', (0, 0, 640, 192)); d.mark('stig', T.stig_mask)
    L = o['leran']; d.mark('lera', rundrekt(int(L['x']), int(L['y']), int(L['width']), int(L['height']), 8))
    d.mark('vatten', lambda x, y: 464 + 2 * math.sin(y / 9.0) <= x < 560 + 2 * math.sin(y / 11.0 + 2))
    rita_terrang(d, seed=11); gras_tuvor(d, 220, seed=4)
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.randrange(130, 460), rnd.randrange(20, 176)
        if T.stig_mask(x, y) or d.typ[y][x] == 'lera' or abs(y - 96) < 22: continue
        if 72 <= x < 124: continue                                         # vassväggen är föremål (tussarna)
        for k in range(4):
            for i in range(5 + k % 2): d.satt(x + k, y - i, VASS[3] if i < 3 else TRAMP[2])
    for (x, y) in [(452, 30), (448, 160), (566, 150), (570, 30)]: vass_tuss(d, x, y, 12, 18, seed=x)
    hus(d, 588, 6, 52, 40, dorrar=(), tak='vass', fasad_h=16, fonster=[608], palar=True)
    for k, (x, y) in enumerate([(606, 2), (610, -4), (604, -9)]): d.ellips(x, y + 8, 4 + k, 3, '#D8D8D0', '#A8AAA8')
    kras_ihop(d)
    kant = [(0, 0, 464, 10, True), (0, 184, 464, 8, False), (560, 0, 80, 8, True), (560, 184, 80, 8, False)]
    ov = over_kant(640, 192, kant, 21); kras_ihop_alfa(ov)
    return d, ov

# ---------------- byn ----------------
def byn(kvall=False):
    m, o = objekt('byn')
    d = Duk(640, 384)
    rum_byn.mark(d); rita_terrang(d, seed=31); gras_tuvor(d, 260, seed=8)
    for x in range(316, 604): d.satt(x, 136, DACK[0]); d.mork(x, 137, 0.3)
    for y in range(100, 124):                                             # bryggans början från torget
        for x in range(596, 640):
            c = TRA[3] if (x - 596) % 6 else TRA[1]
            if (x // 6) % 4 == 1 and (x - 596) % 6: c = TRA[2]
            if y in (100, 101): c = TRA[4]
            d.satt(x, y, c)
    for x in range(596, 640):
        for i, c in enumerate((TRA[2], TRA[1], TRA[1], TRA[0])): d.satt(x, 124 + i, c)
        d.mork(x, 128, 0.5); d.mork(x, 129, 0.3)
    for px_ in (600, 618, 636):
        for y in range(128, 142): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[2]); d.satt(px_ + 2, y, TRA[0])
        d.satt(px_ - 1, 142, VATT[4]); d.satt(px_ + 3, 142, VATT[4])
        for y in range(92, 101): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[3])
    for x in range(598, 640): d.satt(x, 92, TRA[4]); d.satt(x, 93, TRA[2])
    vagg = [v for k, v in o.items() if k.startswith('vagg_') and not any(p['name'] == 'vatten' for p in v.get('properties', []))]
    torg_dorr = {(360, 0): [(382, ROSA)], (416, 0): [(450, BLA)]}
    for v in sorted(vagg, key=lambda v: v['y'] + v['height']):
        x0, y0, b, h = int(v['x']), int(v['y']), int(v['width']), int(v['height'])
        if (x0, y0) == (0, 0):
            for k, (xx, bb) in enumerate([(0, 110), (110, 104), (214, 116)]):
                hus(d, xx, 0, bb - 2, 40, tak='vass', fasad_h=18, fonster=[xx + 20, xx + bb - 24], palar=True, natt=kvall, skorsten=k == 1)
            continue
        if x0 >= 316 and y0 < 120:
            hus(d, x0, y0, b, h, dorrar=torg_dorr.get((x0, y0), ()), tak='skiffer', fasad_h=18,
                fonster=[x0 + 10, x0 + b - 12] if b > 40 else [x0 + b // 2], mast=False, natt=kvall, skorsten=(x0, y0) == (416, 0))
            if (x0, y0) == (600, 40): radiomast(d, 626, 66, 40)
            continue
        if (x0, y0) in rum_byn.SODRA or (x0, y0) in [(v_[0], v_[1]) for v_ in rum_byn.SODRA.values()]:
            nx, ny_, nb, nh, dx, ramp = rum_byn.SODRA.get((x0, y0)) or next(v_ for v_ in rum_byn.SODRA.values() if (v_[0], v_[1]) == (x0, y0))
            hus(d, nx, ny_, nb, nh, dorrar=[(dx + 6, ramp)], tak='skiffer', fasad_h=18, fonster=[nx + 9, nx + nb - 11], natt=kvall)
            continue
        if (x0, y0) == (392, 200):
            hus(d, x0, y0, b, h, tak='vass', fasad_h=14, fonster=[x0 + 12, x0 + b - 14], natt=kvall)
            continue
        hus(d, x0, y0, b, h, tak='vass', fasad_h=18, fonster=[x0 + 10, x0 + b - 12] if b > 50 else [x0 + b // 2], palar=True, natt=kvall)
    hog_vass(d, 330, 0, 30, 6, seed=41, kolvar=False, kant_ned=False)
    for x, h in ((335, 22), (357, 20), (346, 12)): vass_tuss(d, x, h, 9, h, seed=x)
    # fiskarens nät på pinnar och tvättstrecket står still i rummet
    for x in range(60, 118):
        for y in range(300, 318):
            if (x - 60) % 4 == 0 or (y - 300) % 4 == 0: d.satt(x, y, '#C8C0A0' if (x + y) % 3 else '#8A8470')
    for xx in (58, 118):
        for y in range(296, 320): d.satt(xx, y, TRA[1]); d.satt(xx + 1, y, TRA[3])
    for xx in (200, 270):
        for y in range(214, 236): d.satt(xx, y, TRA[1]); d.satt(xx + 1, y, TRA[3])
    for x in range(200, 271): d.satt(x, 215 + int(2 * math.sin((x - 200) / 70 * math.pi)), '#E8E4D8')
    for (x, c) in ((210, '#E07AA6'), (224, '#F2E8C8'), (240, '#E8E4D8'), (254, '#F2D22E')):   # ingen blå skjorta: blått är flodfolkets
        d.rekt(x, 217, 8, 9, c); d.mork(x + 7, 217, 0.2)
    if kvall: rum_byn.kvallsljus(d, [])
    kras_ihop(d)
    return d

# ---------------- bryggan ----------------
def bryggan():
    m, o = objekt('bryggan')
    d = Duk(320, 192)
    d.mark('gras', (0, 0, 320, 192)); pensel(d, 'stig', [(0, 96), (60, 96), (122, 98)], 24)
    L = o['leran_brygga']; d.mark('lera', rundrekt(int(L['x']), int(L['y']), int(L['width']), int(L['height']), 6))
    d.mark('vatten', lambda x, y: x >= 120 + 2 * math.sin(y / 8.0))
    rita_terrang(d, seed=51); gras_tuvor(d, 60, seed=9)
    for y in range(84, 112):
        for x in range(118, 320):
            i = (x - 118) % 7
            c = TRA[3] if i else TRA[1]
            if (x // 7) % 5 == 2 and i: c = TRA[2]
            if y in (84, 85): c = TRA[4]
            if y in (110, 111): c = TRA[1]
            d.satt(x, y, c)
    for x in range(118, 320): d.mork(x, 112, 0.55); d.mork(x, 113, 0.4); d.mork(x, 114, 0.2)
    for px_ in range(124, 320, 28):
        for y in range(112, 122): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[2])
        for y in range(76, 86): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[3])
        d.satt(px_, 122, VATT[4]); d.satt(px_ + 2, 122, VATT[4])
    forankringsmast(d, 304, 92, 52)                                       # luftskeppet är baronens figur, inte marken
    kras_ihop(d)
    ov = over_kant(320, 192, [(0, 0, 120, 8, True), (0, 184, 120, 8, False)], 52); kras_ihop_alfa(ov)
    return d, ov

# ---------------- vassen ----------------
def vassen():
    m, o = objekt('vassen')
    d = Duk(640, 192)
    d.mark('vassfalt', (0, 0, 640, 192))
    gang = [(54, 192), (54, 140), (100, 116), (160, 128), (200, 150), (240, 128), (330, 104), (420, 98), (486, 96)]
    pensel(d, 'tramp', gang, 30)
    d.mark('sand', lambda x, y: ((x - 500) / 30) ** 2 + ((y - 96) / 30) ** 2 <= 1 and x < 522)
    P_ = o['lerpol_vassen']; d.mark('lera', rundrekt(int(P_['x']), int(P_['y']), int(P_['width']), int(P_['height']), 8))
    d.mark('vatten', lambda x, y: x >= 520 + 3 * math.sin(y / 9.0))
    rita_terrang(d, seed=61)
    for y in range(192):
        for x in range(520):
            if d.typ[y][x] in (None, 'gras') and (x * 5 + y) % 9 == 0 and brus(x, y, 6) > 0.4:
                d.satt(x, y, GRAS[3]); d.satt(x, y - 1, GRAS[4])
    # masken för fötterna: där vassfältet är (inte gången, stranden, leran eller vattnet)
    mask = Image.new('L', (640, 192), 0); mp = mask.load()
    for y in range(192):
        for x in range(640):
            if d.typ[y][x] == 'vassfalt': mp[x, y] = 255
    kras_ihop(d)
    kant = [(0, 0, 520, 22, True), (76, 176, 444, 16, False), (0, 176, 36, 16, False)]
    ov = over_kant(640, 192, kant, 62); kras_ihop_alfa(ov)
    return d, ov, mask

# ---------------- dammen ----------------
def dammen():
    d = Duk(320, 192)
    d.mark('gras', (0, 0, 320, 192)); pensel(d, 'stig', [(160, 192), (160, 140), (120, 110), (70, 104)], 22)
    d.mark('vatten', rundrekt(96, 16, 208, 64, 6))
    rita_terrang(d, seed=71); gras_tuvor(d, 70, seed=10)
    for (x, y, r) in ((130, 30, 6), (176, 56, 5), (236, 66, 8), (262, 34, 6), (210, 24, 5)):   # näckrosbladen
        d.ellips(x, y, r, r * 0.65, '#5E9E40', '#2E5E24')
        d.satt(int(x), int(y - r * 0.3), '#2E5E24'); d.satt(int(x) + 1, int(y - r * 0.3) + 1, '#2E5E24')
    d.ellips(212, 22, 2, 1.6, '#F6B4CE', '#B8467A')
    for (x, y) in ((292, 76), (298, 60), (104, 72)): vass_tuss(d, x, y, 12, 18, seed=x)
    d.skugga_under(80, 52, 9, 2); d.bild(INK + '/foremal/skog/sten_mossa.png', 78, 52)
    d.bild(INK + '/foremal/skog/trad_litet_gammalt.png', 300, 112)
    kras_ihop(d)
    ov = over_kant(320, 192, [(0, 0, 92, 8, True), (300, 0, 20, 8, True)], 72); kras_ihop_alfa(ov)
    return d, ov

# ---------------- Tant Rosas hus ----------------
def tant_rosas_hus():
    os.chdir('/home/claude/hus')
    src = open('/home/claude/hus/hus.py').read().split("\nif __name__=='__main__':")[0]
    g = {'__name__': 'hus'}; exec(src, g)
    g['TAPET']['tant_rosas_hus'] = ['#6A3A4A', '#8A4E60', '#A86278', '#E0A0B4']
    im = g['rum_bild']('tant_rosas_hus')
    os.chdir('/home/claude/skiss2')
    d = Duk(320, 192); d.im = im.convert('RGBA'); d.px = d.im.load()
    for x in range(34, 110):                                              # fiskenätet uppe i hörnet
        for y in range(6, 22 - (x - 34) // 6):
            if (x + y) % 5 == 0 or (x - y) % 5 == 0: d.satt(x, y, '#C8C0A0')
    d.rekt(258, 40, 26, 30, '#3A3A44'); d.rekt(258, 40, 26, 3, '#5A5A66'); d.ellips(271, 60, 5, 4, '#F08A2A', '#7A3010')   # spisen
    for y in range(4, 40): d.satt(266, y, '#3A3A44'); d.satt(267, y, '#5A5A66')
    d.bild(INK + '/foremal/hus/fatolj_hoger.png', 230, 84)                  # gungstolen
    kras_ihop(d)
    return d

def kras_ihop_alfa(d):
    """Som kras_ihop, men det genomskinliga står kvar genomskinligt."""
    px = d.im.load()
    for y in range(d.im.height):
        for x in range(d.im.width):
            c = px[x, y]
            if c[3] == 0: continue
            px[x, y] = tuple(hx(P.narmast('#%02x%02x%02x' % c[:3])[0])[:3]) + (255,)

if __name__ == '__main__':
    t, tov = trasket(); t.im.save(f'{UT}/trasket_kanten.png'); tov.im.save(f'{UT}/trasket_kanten_over.png')
    byn().im.save(f'{UT}/byn.png'); byn(kvall=True).im.save(f'{UT}/byn_kvall.png')
    b, bov = bryggan(); b.im.save(f'{UT}/bryggan.png'); bov.im.save(f'{UT}/bryggan_over.png')
    v, vov, vm = vassen(); v.im.save(f'{UT}/vassen.png'); vov.im.save(f'{UT}/vassen_over.png'); vm.save(f'{UT}/vassen_falt.png')
    dm, dov = dammen(); dm.im.save(f'{UT}/dammen.png'); dov.im.save(f'{UT}/dammen_over.png')
    tant_rosas_hus().im.save(f'{UT}/tant_rosas_hus.png')
    print('klart')
