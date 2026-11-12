# Skisser: bryggan, vassen, dammen och Tant Rosas hus.
from bas import *
from bybor import stalla

# ---------------- bryggan (1 skärm) ----------------
def bryggan():
    m, o = objekt('bryggan')
    d = Duk(320, 192)
    d.mark('gras', (0, 0, 320, 192))
    pensel(d, 'stig', [(0, 96), (60, 96), (122, 98)], 24)
    L = o['leran_brygga']; lx, ly, lb, lh = L['x'], L['y'], L['width'], L['height']
    d.mark('lera', rundrekt(int(lx), int(ly), int(lb), int(lh), 6))
    d.mark('vatten', lambda x, y: x >= 120 + 2 * math.sin(y / 8.0))
    rita_terrang(d, seed=51); gras_tuvor(d, 60, seed=9)
    hog_vass(d, 0, 0, 120, 8, seed=52); hog_vass(d, 0, 184, 120, 8, seed=53, kant_ned=False)
    # bryggan: plankor på tvären (nord–syd), pålar längs båda kanterna, gammal men hel
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
    # förtöjningsmasten vid änden (byns byggspråk, 76.7) och luftskeppet förtöjt vid den
    forankringsmast(d, 304, 92, 52)
    sk = Image.open(INK + '/figurer/baronen/luftskepp_glider_01.png').convert('RGBA')
    d.bild(sk.crop((0, 0, 80, 70)), 284, 40)
    for i in range(24): d.satt(286 + i // 2, 34 + i, '#5A4A3A')            # förtöjningslinan
    # Farfars skylt om leran, och halvan på bryggan
    S = o['skylt_lera_brygga']; traskylt(d, S['x'] + 7, S['y'] + S['height'])
    H_ = o['brev_halva_1']; hx_, hy_ = int(H_['x']), int(H_['y'])
    for y in range(hy_, hy_ + 9):
        for x in range(hx_, hx_ + 10 - (y - hy_) // 3):
            d.satt(x, y, '#F2E8C8' if (x + y) % 5 else '#D6C08A')
    d.ellips(hx_ + 2, hy_ + 6, 2.2, 2.2, MASS[2], MASS[1])                   # sigillets halva
    # liv: måsen på en påle, fisken som hoppar
    d.bild(INK + '/figurer/omgivning/fagel_sitta_01.png', 222, 78)
    d.ellips(186, 128, 4, 2, '#8AA0B0', '#3A4A58'); d.satt(181, 128, '#3A4A58')
    d.skugga_under(56, 104, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_hoger_01.png', 56, 104)
    d.skugga_under(36, 104, 8, 2); d.bild(INK + '/figurer/unge/unge1_ga_hoger_01.png', 36, 106)
    kras_ihop(d); return d

# ---------------- vassen (2 × 1 skärmar) ----------------
def vassen(efter=False):
    m, o = objekt('vassen')
    d = Duk(640, 192)
    d.mark('vassfalt', (0, 0, 640, 192))
    # den trampade gången: från byn i söder, norrut och sedan österut till stranden (runt lerpölen)
    pensel(d, 'tramp', [(54, 192), (54, 140), (100, 116), (160, 128), (200, 150), (240, 128), (330, 104), (420, 98), (486, 96)], 30)
    d.mark('sand', lambda x, y: ((x - 500) / 30) ** 2 + ((y - 96) / 30) ** 2 <= 1 and x < 522)
    P_ = o['lerpol_vassen']; lx, ly, lb, lh = P_['x'], P_['y'], P_['width'], P_['height']
    d.mark('lera', rundrekt(int(lx), int(ly), int(lb), int(lh), 8))
    d.mark('vatten', lambda x, y: x >= 520 + 3 * math.sin(y / 9.0))
    rita_terrang(d, seed=61)
    # \"låg vass\" där han kan gå: gräset med raka strån, varmare än den höga vassen
    for y in range(192):
        for x in range(520):
            if d.typ[y][x] in (None, 'gras') and (x * 5 + y) % 9 == 0 and brus(x, y, 6) > 0.4:
                d.satt(x, y, GRAS[3]); d.satt(x, y - 1, GRAS[4])
    # den höga vassen längs rummets kanter (där världen slutar): kall, tät och mörk
    hog_vass(d, 0, 0, 520, 22, seed=62)
    hog_vass(d, 76, 176, 444, 16, seed=63, kant_ned=False); hog_vass(d, 0, 176, 36, 16, seed=64, kant_ned=False)
    # bubbelblommorna: gula blommor som blåser bubblor
    B_ = o['bubbelblommor']
    for k in range(6):
        bx, by = int(B_['x']) + 4 + k * 7, int(B_['y']) + 14 + (k % 2) * 4
        for i in range(8): d.satt(bx, by - i, VASS[3])
        d.ellips(bx, by - 9, 3, 2.5, '#F2D22E', '#C89A1A')
    for (x, y, r) in ((110, 40, 3), (126, 30, 2.5), (140, 44, 2), (98, 26, 2)):
        d.ellips(x, y, r, r, '#CDEFF8', '#8AC6DA'); d.satt(int(x) - 1, int(y) - 1, '#FFFFFF')
    # Farfars skylt och lerpölen, stubben med bär
    S = o['skylt_lera_vassen']; traskylt(d, S['x'] + 7, S['y'] + S['height'])
    d.skugga_under(263, 50, 8, 2); d.bild(INK + '/foremal/skog/stubbe_bar.png', 260, 50)
    # hägern på ett ben och två grodor på strandkanten
    hx_, hy_ = 302, 136
    for i in range(10): d.satt(hx_, hy_ - i, '#6A6E78')
    d.ellips(hx_ + 1, hy_ - 14, 4, 5, '#A8B0BC', '#5A6070')
    for i in range(6): d.satt(hx_ + 2 + i // 3, hy_ - 20 - i, '#A8B0BC')
    d.ellips(hx_ + 4, hy_ - 26, 2, 2, '#C8CED8', '#5A6070'); d.rekt(hx_ + 6, hy_ - 26, 4, 1, '#F2B42E')
    for (gx, gy) in ((513, 76), (513, 138)): d.ellips(gx, gy, 3.5, 2.5, '#5E9E40', '#2A4A1A'); d.satt(gx - 1, gy - 2, '#F2F2E8')
    # stocken i strandkanten och halvan i vattnet, utom räckhåll
    St = o['stock_vassen']; sx, sy = (int(St['x']), int(St['y'])) if not efter else (594, 144)
    for y in range(sy, sy + 9):
        for x in range(sx, sx + 28):
            d.satt(x, y, TRA[2] if y - sy in (1, 2) else (TRA[1] if y - sy < 7 else TRA[0]))
    d.ellips(sx + 27, sy + 4, 2, 4, TRA[4], TRA[1])
    if efter:
        d.bild(INK + '/figurer/unge/unge1_tomgang_ner_01.png', sx + 12, sy + 4)
    H_ = o['brev_halva_vatten']; hx2_, hy2_ = int(H_['x']), int(H_['y'])
    for y in range(hy2_, hy2_ + 8):
        for x in range(hx2_, hx2_ + 10 - (y - hy2_) // 2):
            d.satt(x, y, '#C8C2A8' if (x + y) % 3 else '#A8A288')            # blöt och suddig
    for x in range(hx2_ - 3, hx2_ + 13): d.satt(x, hy2_ + 9, VATT[4])
    # hjälten i gången, med en hög vasstuss framför sig: vassen är ett övre lager (76.7)
    d.skugga_under(130, 126, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_hoger_01.png', 130, 126)
    # ungen ute i vassen efter bubblorna: vassens toppar täcker benen, som gräset i A Link to the Past
    ux, uy = 116, 62
    d.bild(INK + '/figurer/unge/unge1_ga_hoger_01.png', ux, uy)
    for x in range(ux - 13, ux + 13):
        for y in range(uy - 7, uy + 1):
            if (x + (y // 2)) % 3 != 1: d.satt(x, y, [GRAS[2], GRAS[3]][(x // 2) % 2] if y > uy - 6 else TRAMP[3])
    kras_ihop(d); return d

# ---------------- dammen (1 skärm) ----------------
def dammen():
    m, o = objekt('dammen')
    d = Duk(320, 192)
    d.mark('gras', (0, 0, 320, 192))
    pensel(d, 'stig', [(160, 192), (160, 140), (120, 110), (70, 104)], 22)
    d.mark('vatten', rundrekt(96, 16, 208, 64, 6))
    rita_terrang(d, seed=71); gras_tuvor(d, 70, seed=10)
    hog_vass(d, 0, 0, 92, 8, seed=72); hog_vass(d, 300, 0, 20, 8, seed=73)
    # näckrosblad och vass i dammens kant
    for (x, y, r) in ((130, 30, 6), (176, 56, 5), (236, 66, 8), (262, 34, 6), (210, 24, 5)):
        d.ellips(x, y, r, r * 0.65, '#5E9E40', '#2E5E24')
        d.satt(int(x), int(y - r * 0.3), '#2E5E24'); d.satt(int(x) + 1, int(y - r * 0.3) + 1, '#2E5E24')
    d.ellips(212, 22, 2, 1.6, '#F6B4CE', '#B8467A')
    for (x, y) in ((292, 76), (298, 60), (104, 72)): vass_tuss(d, x, y, 12, 18, seed=x)
    # stenen till vänster, trädet med fågeln
    d.skugga_under(80, 52, 9, 2); d.bild(INK + '/foremal/skog/sten_mossa.png', 78, 52)
    d.bild(INK + '/foremal/skog/trad_litet_gammalt.png', 300, 112)
    # grodorna i L3: liten grön på stenen, stor grön under bladet, stor gul på näckrosbladet, liten gul i vassen
    def groda(x, y, stor, gul):
        r = 4.5 if stor else 3
        kr = ('#F2D22E', '#B8961A') if gul else ('#5E9E40', '#2A4A1A')
        d.ellips(x, y, r * 1.2, r, kr[0], kr[1])
        for dx in (-r * 0.5, r * 0.5): d.ellips(x + dx, y - r * 0.8, r * 0.38, r * 0.38, '#FFFFFF', '#1A1A10')
    groda(78, 40, False, False); groda(150, 86, True, False); groda(246, 62, True, True); groda(296, 70, False, True)
    # Bo vid kanten med sin SAKNAS-lapp, i för stora stövlar
    def lapp(dd, x, yb):
        dd.rekt(x + 6, yb - 17, 8, 9, '#F2E8C8'); dd.rekt(x + 6, yb - 17, 8, 1, '#D6C08A'); dd.satt(x + 10, yb - 13, '#5E9E40')
    stalla(d, 'bo', 56, 104, sak=lapp)
    d.bild(INK + '/figurer/omgivning/fjaril_01.png', 184, 22)
    d.skugga_under(166, 160, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_upp_01.png', 166, 160)
    d.skugga_under(146, 162, 8, 2); d.bild(INK + '/figurer/unge/unge1_ga_upp_01.png', 146, 164)
    kras_ihop(d); return d

# ---------------- Tant Rosas hus (inomhus, en bild) ----------------
def tant_rosas_hus():
    src = open('/home/claude/hus/hus.py').read().split("\nif __name__=='__main__':")[0]
    g = {'__name__': 'hus'}; exec(src, g)
    g['TAPET']['tant_rosas_hus'] = ['#6A3A4A', '#8A4E60', '#A86278', '#E0A0B4']   # rosa tapet med små blad
    im = g['rum_bild']('tant_rosas_hus')
    d = Duk(320, 192); d.im = im.convert('RGBA'); d.px = d.im.load()
    m, o = objekt('tant_rosas_hus')
    # fiskenätet uppe i hörnet och spisen och gungstolen mot bakväggen
    for x in range(34, 110):
        for y in range(6, 22 - (x - 34) // 6):
            if (x + y) % 5 == 0 or (x - y) % 5 == 0: d.satt(x, y, '#C8C0A0')
    d.rekt(258, 40, 26, 30, '#3A3A44'); d.rekt(258, 40, 26, 3, '#5A5A66'); d.ellips(271, 60, 5, 4, '#F08A2A', '#7A3010')
    for y in range(4, 40): d.satt(266, y, '#3A3A44'); d.satt(267, y, '#5A5A66')
    d.bild(INK + '/foremal/hus/fatolj_hoger.png', 230, 84)
    # tavlorna högt upp: stor rund, liten fyrkantig, stor fyrkantig, liten rund (stor och liten, rund och fyrkantig)
    for k, (namn, stor, rund) in enumerate([('tavla_stor_rund', 1, 1), ('tavla_liten_fyrkant', 0, 0), ('tavla_stor_fyrkant', 1, 0), ('tavla_liten_rund', 0, 1)]):
        T = o[namn]; cx, cy = int(T['x'] + 12), int(T['y'] + 12)
        r = 11 if stor else 6
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                inne = (x - cx) ** 2 + (y - cy) ** 2 <= r * r if rund else True
                kant = ((x - cx) ** 2 + (y - cy) ** 2 > (r - 2) ** 2) if rund else (abs(x - cx) > r - 2 or abs(y - cy) > r - 2)
                if inne: d.satt(x, y, MASS[2] if kant else ('#8AC0E8' if y < cy else '#5E9E40'))
        d.mork(cx + 1, cy + r + 1, 0.4)
    # soffan med katten, Tant Rosa med dammvippan, hjälten och ungen
    S = o['soffa']; sx, sy, sb, sh = int(S['x']), int(S['y']), int(S['width']), int(S['height'])
    d.skugga_under(sx + sb / 2 + 2, sy + sh, sb / 2, 3)
    d.rekt(sx, sy, sb, sh, ROSA[1]); d.rekt(sx, sy, sb, 8, ROSA[2]); d.rekt(sx + 2, sy + 9, sb - 4, 8, ROSA[3])
    d.rekt(sx, sy + sh - 2, sb, 2, ROSA[0])
    d.ellips(62, 114, 6, 3.5, '#E8A050', '#7A4A1A'); d.satt(57, 112, '#7A4A1A'); d.satt(58, 111, '#E8A050')
    def vippa(dd, x, yb):
        for i in range(14): dd.satt(x + 9, yb - 8 - i, TRA[3])
        dd.ellips(x + 9, yb - 24, 3, 4, '#F6B4CE', '#B8467A')
    stalla(d, 'tant_rosa', 240, 120, sak=vippa)
    d.skugga_under(166, 166, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_upp_01.png', 166, 166)
    d.skugga_under(146, 168, 8, 2); d.bild(INK + '/figurer/unge/unge1_ga_upp_01.png', 146, 170)
    kras_ihop(d); return d

if __name__ == '__main__':
    spara(bryggan(), '04_bryggan')
    spara(vassen(False), '05_vassen'); spara(vassen(True), '05_vassen_stocken')
    spara(dammen(), '06_dammen')
    spara(tant_rosas_hus(), '07_tant_rosas_hus')
    print('klart')
