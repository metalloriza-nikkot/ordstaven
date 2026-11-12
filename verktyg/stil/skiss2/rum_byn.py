# Skiss: Byn (navet, 2 × 2 skärmar, 640 × 384), i tre tillstånd: morgon (pass 1), rep (pass 2) och kväll.
# Byns byggspråk (76.7): pålhus med vasstak runt stranden, torget av plankor, runda fönster med mässingsram,
# en radiomast på det höga huset i nordost och skiffertak på torgets hus. Bryggans början syns från torget.
from bas import *
from bybor import stalla
# Svaret på skissen 12/11: dörrarna i söder (förslag till kartan), torget av kullersten, och bryggan tydligare.
SODRA = {(368, 136): (368, 136, 72, 40, 392, ROSA), (452, 152): (452, 136, 48, 40, 464, BLA)}

def mark(d):
    d.mark('gras', (0, 0, 640, 384))
    d.mark('sand', lambda x, y: y >= 334 + 3 * math.sin(x / 23.0) and x < 540)            # stranden mot sjön i söder
    d.mark('sand', lambda x, y: ((x - 590) / 50) ** 2 + ((y - 352) / 34) ** 2 <= 1)          # udden
    pensel(d, 'stig', [(0, 292), (70, 290), (150, 270), (230, 226), (300, 150), (330, 120)], 22)   # in från bron till torget
    pensel(d, 'stig', [(230, 226), (330, 250), (430, 280)], 16)                                    # till ängen och barnet
    pensel(d, 'stig', [(562, 130), (560, 220), (556, 300), (575, 330)], 20)                         # lyktstigen till udden
    pensel(d, 'stig', [(346, 0), (346, 44)], 26); pensel(d, 'stig', [(566, 0), (566, 44)], 26)     # stigarna norrut
    d.mark('kullersten', (316, 40, 288, 96))                                                         # torget: kullersten
    pensel(d, 'kullersten', [(504, 136), (504, 188), (398, 188)], 16)                               # runt husen till dörrarna i söder
    d.mark('dack', (596, 100, 44, 24))                                                               # bryggans början
    d.mark('vatten', lambda x, y: (y >= 352 and x < 520 + 4 * math.sin(y / 7.0)))
    d.mark('vatten', lambda x, y: (x >= 604 and 124 <= y < 300 + 6 * math.sin(x / 5.0)))

def rita(tillstand='rep'):
    m, o = objekt('byn')
    kvall = tillstand in ('kvall', 'eld'); eld = tillstand == 'eld'
    d = Duk(640, 384)
    mark(d); rita_terrang(d, seed=31)
    gras_tuvor(d, 260, seed=8)
    for x in range(316, 604):
        d.satt(x, 136, DACK[0]); d.mork(x, 137, 0.3)
    # bryggans början från torget: plankor på tvären, en bjälke framtill, pålar ned i vattnet och ett räcke.
    # Den ser ut som bryggan i bryggans rum, så att det syns vilken brygga skylten menar.
    for y in range(100, 124):
        for x in range(596, 640):
            c = TRA[3] if (x - 596) % 6 else TRA[1]
            if (x // 6) % 4 == 1 and (x - 596) % 6: c = TRA[2]
            if y in (100, 101): c = TRA[4]
            d.satt(x, y, c)
    for x in range(596, 640):
        for i, c in enumerate((TRA[2], TRA[1], TRA[1], TRA[0])): d.satt(x, 124 + i, c)   # bjälken framtill
        d.mork(x, 128, 0.5); d.mork(x, 129, 0.3)
    for px_ in (600, 618, 636):
        for y in range(128, 142): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[2]); d.satt(px_ + 2, y, TRA[0])
        d.satt(px_ - 1, 142, VATT[4]); d.satt(px_ + 3, 142, VATT[4])
        for y in range(92, 101): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[3])   # räckets stolpar
    for x in range(598, 640): d.satt(x, 92, TRA[4]); d.satt(x, 93, TRA[2])
    # husen (väggarna i kartan): pålhus med vasstak runt stranden i väster, skiffertak runt torget
    vagg = [v for k, v in o.items() if k.startswith('vagg_') and not any(p['name'] == 'vatten' for p in v.get('properties', []))]
    torg_dorr = {(360, 0): [(382, ROSA)], (416, 0): [(450, BLA)]}
    for v in sorted(vagg, key=lambda v: v['y'] + v['height']):
        x0, y0, b, h = int(v['x']), int(v['y']), int(v['width']), int(v['height'])
        if (x0, y0) == (0, 0):                      # raden av pålhus längs norra kanten i väster
            for k, (xx, bb) in enumerate([(0, 110), (110, 104), (214, 116)]):
                hus(d, xx, 0, bb - 2, 40, tak='vass', fasad_h=18, fonster=[xx + 20, xx + bb - 24], palar=True, natt=kvall, skorsten=k == 1)
            continue
        if x0 >= 316 and y0 < 120:                 # torgets norra rad och huset i nordost
            hus(d, x0, y0, b, h, dorrar=torg_dorr.get((x0, y0), ()), tak='skiffer', fasad_h=18,
                fonster=[x0 + 10, x0 + b - 12] if b > 40 else [x0 + b // 2], mast=False, natt=kvall, skorsten=(x0, y0) == (416, 0))
            if (x0, y0) == (600, 40): radiomast(d, 626, 66, 40)
            continue
        if (x0, y0) in SODRA:                       # torgets södra rad: förslaget, dörren i fasaden mot söder
            nx, ny_, nb, nh, dx, ramp = SODRA[(x0, y0)]
            hus(d, nx, ny_, nb, nh, dorrar=[(dx + 6, ramp)], tak='skiffer', fasad_h=18, fonster=[nx + 9, nx + nb - 11], natt=kvall)
            continue
        if (x0, y0) == (392, 200):                 # huset vid ängen, där draken sitter på taket
            hus(d, x0, y0, b, h, tak='vass', fasad_h=14, fonster=[x0 + 12, x0 + b - 14], natt=kvall)
            continue
        hus(d, x0, y0, b, h, tak='vass', fasad_h=18, fonster=[x0 + 10, x0 + b - 12] if b > 50 else [x0 + b // 2], palar=True, natt=kvall)
    # vassen syns hög och grön norr om torget, bortom stigen (torgets test: "vassen är hög och grön")
    hog_vass(d, 330, 0, 30, 6, seed=41, kolvar=False, kant_ned=False)
    for x, h in ((335, 22), (357, 20), (346, 12)): vass_tuss(d, x, h, 9, h, seed=x)
    # brunnen mitt på torget: rund och full (torgets test)
    B_ = o['brunnen']; brunn(d, int(B_['x']), int(B_['y']), int(B_['width']), int(B_['height']), full=True)
    # lyktorna längs stigen till udden
    L = o['lyktor_udden']
    for y in range(int(L['y']) + 16, int(L['y'] + L['height']), 30): lykta(d, int(L['x']) + 2, y, tand=eld)
    # udden med lägerelden
    E = o['lagereld']; ex, ey = int(E['x'] + 10), int(E['y'] + 14)
    for k in range(8):
        a = k / 8 * math.tau; d.ellips(ex + 8 * math.cos(a), ey - 3 + 4 * math.sin(a), 2.2, 1.8, STEN[3], STEN[1])
    for (dx_, dy_) in ((-5, -2), (0, 0), (4, -3)):
        for i in range(7): d.satt(ex + dx_ + i - 3, ey - 3 + dy_ + i // 3, TRA[2] if i % 2 else TRA[1])
    if eld:
        for (dx_, dy_, r, c) in ((0, -8, 4, '#F08A2A'), (0, -10, 3, '#FBC04A'), (1, -12, 1.6, '#FFF2B0')):
            d.ellips(ex + dx_, ey + dy_, r, r * 1.4, c)
    # stranden i sydväst: fiskarens nät på pinnar, och tvättstrecket
    for x in range(60, 118):
        for y in range(300, 318):
            if (x - 60) % 4 == 0 or (y - 300) % 4 == 0: d.satt(x, y, '#C8C0A0' if (x + y) % 3 else '#8A8470')
    for xx in (58, 118):
        for y in range(296, 320): d.satt(xx, y, TRA[1]); d.satt(xx + 1, y, TRA[3])
    for xx in (200, 270):
        for y in range(214, 236): d.satt(xx, y, TRA[1]); d.satt(xx + 1, y, TRA[3])
    for x in range(200, 271): d.satt(x, 215 + int(2 * math.sin((x - 200) / 70 * math.pi)), '#E8E4D8')
    for (x, c) in ((210, '#E07AA6'), (224, '#F2E8C8'), (240, '#6A9AD8'), (254, '#F2D22E')):
        d.rekt(x, 217, 8, 9, c); d.mork(x + 7, 217, 0.2)
    # draken på taket (frivillig FLYG, 76.4): röd och gul, med svans av rosetter, fast i takfoten
    if not kvall:
        K = o['drake_tak']; kx, ky = int(K['x'] + 10), int(K['y'] + 7)
        for y in range(-7, 8):
            for x in range(-6, 7):
                if abs(x) / 6 + abs(y) / 7 <= 1: d.satt(kx + x, ky + y, '#D83A2E' if (x < 0) == (y < 0) else '#F2D22E')
        for i in range(14): d.satt(kx + 6 + i, ky + 7 + i // 2, '#3A2A1A')
        for (x, y) in ((kx + 9, ky + 9), (kx + 14, ky + 11)): d.rekt(x, y, 3, 2, '#4A72D2')
    # repen och baronens skyltar (bara i tillståndet rep)
    if tillstand == 'rep':
        for k in ('rep_vassen', 'rep_brunnen', 'rep_bryggan'):
            R_ = o[k]; rep(d, int(R_['x']), int(R_['y']), int(R_['width']), int(R_['height']))
        for k in ('skylt_vassen', 'skylt_brunnen', 'skylt_bryggan'):
            S_ = o[k]; baronskylt(d, int(S_['x']), int(S_['y'] + S_['height']))
        # vassen syns hög och grön bortom repet (torgets test)

    # vedpinnarna på kvällen
    if tillstand == 'kvall':
        for k in ('ved_1', 'ved_2', 'ved_3'):
            V_ = o[k]; vx, vy = int(V_['x']), int(V_['y'] + 6)
            d.skugga_under(vx + 6, vy + 2, 6, 1.5)
            for i in range(10): d.satt(vx + i, vy - i // 4, TRA[5] if i % 3 else TRA[4]); d.satt(vx + i, vy + 1 - i // 4, TRA[2])
            d.satt(vx + 9, vy - 3, '#FFF4D0')                     # en liten glimt, så att de syns i kvällsljuset
    # byborna: samma folk som hjälten, med sina kläder (bybor.py)
    plats = {k: (int(o[k]['x'] + 8), int(o[k]['y'] + 24)) for k in ('fiskaren', 'tvatterskan', 'barnet_drake', 'tant_rosa')}
    plats['tant_rosa'] = (388, 66)                                 # på trappan vid sin dörr
    if eld:
        plats = {'fiskaren': (556, 346), 'tvatterskan': (582, 322), 'barnet_drake': (600, 346), 'tant_rosa': (540, 322)}
    elif kvall:
        plats = {'fiskaren': (430, 110), 'tvatterskan': (460, 96), 'barnet_drake': (530, 118), 'tant_rosa': (404, 76)}
    for k, (x, y) in sorted(plats.items(), key=lambda kv: kv[1][1]):
        if k == 'tant_rosa' and tillstand == 'morgon': continue
        stalla(d, k, x, y)
    if tillstand == 'morgon':
        F = o['fjader']; fx, fy = int(F['x'] + 5), int(F['y'] + 8)
        for i in range(9): d.satt(fx - 4 + i, fy - i // 2, '#F2F2F2' if i > 3 else '#1A1A20'); d.satt(fx - 4 + i, fy + 1 - i // 2, '#2A2A30')
    # fågeln på ett pålhustak i nordväst
    d.bild(INK + '/figurer/omgivning/fagel_sitta_01.png', 60, 70)
    # hjälten och ungen
    if eld:
        d.skugga_under(530, 300, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_ner_01.png', 530, 300)
        d.skugga_under(512, 302, 8, 2); d.bild(INK + '/figurer/unge/unge1_tomgang_ner_01.png', 512, 304)
    else:
        sx, sy = (int(o['start']['x']), int(o['start']['y'])) if tillstand == 'morgon' else (440, 100)
        d.skugga_under(sx + 8, sy + 8, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_hoger_01.png', sx + 8, sy + 8)
        d.skugga_under(sx - 12, sy + 8, 8, 2); d.bild(INK + '/figurer/unge/unge1_ga_hoger_01.png', sx - 12, sy + 10)
    if kvall:
        kallor = [(582, 328, 70)] if eld else []
        if eld: kallor += [(int(L['x']) + 3, y - 17, 22) for y in range(int(L['y']) + 16, int(L['y'] + L['height']), 30)]
        kvallsljus(d, kallor)
    kras_ihop(d)
    return d

def kvallsljus(d, kallor):
    """Kväll: allt mörknar mot blått, utom ljuset runt elden och lyktorna och fönstren, som lyser."""
    px = d.im.load(); fonster = hx('#F2C860')
    for y in range(d.H):
        for x in range(d.B):
            r, g, b, a = px[x, y]
            if (r, g, b, a) == fonster: continue
            t = 0.5
            for (kx, ky, R) in kallor:
                dd = math.hypot(x - kx, (y - ky) * 1.3)
                if dd < R: t = min(t, 0.5 * max(0.0, (dd - R * 0.25) / (R * 0.75)))
            px[x, y] = (int(r * (1 - t) + 20 * t), int(g * (1 - t) + 26 * t), int(b * (1 - t) + 58 * t), 255)
    d.px = px

if __name__ == '__main__':
    for t in ('morgon', 'rep', 'kvall', 'eld'):
        d = rita(t); spara(d, '02_byn_' + t, 2)
        if t == 'rep':
            torg = d.im.crop((320, 0, 640, 192))
            torg.resize((960, 576), Image.NEAREST).save('/home/claude/skiss2/ut/03_torget_utan_text_x3.png')
    print('klart')
