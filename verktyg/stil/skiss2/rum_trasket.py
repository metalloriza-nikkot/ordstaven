# Skiss: Träskkanten (2 × 1 skärmar, 640 × 192).
from bas import *

def stig_mask(x, y):
    """Stigen in från skogen till vattnet, och på andra sidan vidare mot byn. Mjukt böljande kanter."""
    m = 96 + 3 * math.sin(x / 37.0)
    bredd = 13 + 2 * math.sin(x / 19.0 + 1)
    return abs(y - m) < bredd and not (464 <= x < 560)

def rita(efter=False):
    m, o = objekt('trasket_kanten')
    d = Duk(640, 192)
    d.mark('gras', (0, 0, 640, 192))
    d.mark('stig', stig_mask)
    # leran bredvid stigen: en blank, mörk pöl med rundade kanter
    L = o['leran']; lx, ly, lb, lh = L['x'], L['y'], L['width'], L['height']
    d.mark('lera', rundrekt(int(lx), int(ly), int(lb), int(lh), 8))
    # vattnet mellan stranden och byn, med mjuk strandlinje
    d.mark('vatten', lambda x, y: 464 + 2 * math.sin(y / 9.0) <= x < 560 + 2 * math.sin(y / 11.0 + 2))
    rita_terrang(d, seed=11)
    gras_tuvor(d, 220, seed=4)
    # rummets kant: hög vass längs norra och södra kanten (där världen slutar), aldrig där han går
    hog_vass(d, 0, 0, 464, 10, seed=21)
    hog_vass(d, 0, 184, 464, 8, seed=22, kant_ned=False)
    hog_vass(d, 560, 0, 80, 8, seed=23)
    hog_vass(d, 560, 184, 80, 8, seed=24, kant_ned=False)
    # små vasstuvor i gräset (låga, varma toppar: man går förbi dem)
    rnd = random.Random(7)
    for _ in range(26):
        x, y = rnd.randrange(130, 460), rnd.randrange(20, 176)
        if stig_mask(x, y) or d.typ[y][x] == 'lera' or abs(y - 96) < 22: continue
        for k in range(4):
            for i in range(5 + k % 2): d.satt(x + k, y - i, VASS[3] if i < 3 else TRAMP[2])
    # vassen vid vattnet, som ett övre lager i strandkanten
    for (x, y) in [(452, 30), (448, 160), (566, 150), (570, 30)]:
        vass_tuss(d, x, y, 12, 18, seed=x)
    # stubben med två bär
    d.skugga_under(46 + 3, 164, 8, 2)
    d.bild(INK + '/foremal/skog/stubbe.png', 46, 164)
    # Farfars skylt om leran
    S = o['skylt_lera']; traskylt(d, S['x'] + 7, S['y'] + S['height'])
    # byn på andra sidan: ett pålhus med vasstak och rök (det syns att byn är där)
    hus(d, 588, 6, 52, 40, dorrar=(), tak='vass', fasad_h=16, fonster=[608], palar=True)
    for k, (x, y) in enumerate([(606, 2), (610, -4), (604, -9)]):
        d.ellips(x, y + 8, 4 + k, 3, '#D8D8D0', '#A8AAA8')
    # vassväggen: 15 tussar i tre kolumner och fem rader (k2_vassvaggen), gången i rad 3–4
    V = o['vass_tat']; inn = ["tom", "bar", "gang", "gang", "tom", "tom", "tom", "gang", "gang", "bar", "bar", "tom", "gang", "gang", "tom"]
    for i, typ in enumerate(inn):
        kol, rad = i // 5, i % 5
        cx = V['x'] + 8 + kol * 16; by = int((rad + 1) * V['height'] / 5) - 6
        if efter and typ == 'gang': vass_tuss(d, cx, by, 14, 22, seed=i, huggen=True); continue
        if efter and typ == 'bar':
            vass_tuss(d, cx, by, 14, 22, seed=i, huggen=True)
            d.ellips(cx, by - 3, 2, 2, '#4A72D2', '#1A2A6A'); continue
        vass_tuss(d, cx, by, 14, 24, seed=i)
    # övergången: ordet han skrev blir en bro (här BRO; STEGE, REP och FLOTTE ritas i steg 5)
    if efter:
        for y in range(86, 107):
            for x in range(462, 563):
                i = (x - 462) % 6
                c = TRA[3] if i else TRA[1]
                if y in (86, 87, 105, 106): c = TRA[2]
                if y == 86: c = TRA[4]
                d.satt(x, y, c)
        for x in range(462, 563): d.mork(x, 107, 0.5); d.mork(x, 108, 0.3)
        for px_ in range(466, 560, 24):
            for y in range(80, 87): d.satt(px_, y, TRA[1]); d.satt(px_ + 1, y, TRA[3])
        for x in range(466, 560): d.satt(x, 81, TRA[3])
    # liv: trollsländan, fågeln i vassen och grodan vid stranden
    T = o['trollslanda']; tx, ty = T['x'] + 6, T['y'] + 5
    for k in range(-3, 4): d.satt(tx + k, ty, '#4AA8D8')
    for k in (-2, -1, 1, 2): d.satt(tx + k, ty - 1, '#BFE6F6'); d.satt(tx + k, ty + 1, '#BFE6F6')
    d.bild(INK + '/figurer/omgivning/fagel_sitta_01.png', 436, 60)
    d.ellips(449, 130, 3, 2, '#5E9E40', '#2A4A1A')
    # hjälten och ungen vid starten
    d.skugga_under(56, 108, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_hoger_01.png', 56, 108)
    d.skugga_under(36, 108, 8, 2); d.bild(INK + '/figurer/unge/unge1_ga_hoger_01.png', 36, 110)
    kras_ihop(d)
    return d

if __name__ == '__main__':
    spara(rita(False), '01_trasket_fore')
    spara(rita(True), '01_trasket_efter')
    print('klart')
