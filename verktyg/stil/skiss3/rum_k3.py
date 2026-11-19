# Skissen av kapitel 3:s rum (beslut 101.10, kedjan i 07, steg 4), ovanpå gråboxens kartor på 0.90.0.
# Samma regler som kapitel 2 (bas.py): varmt och ljust går man på, kallt och mörkt inte; höjder har brant och skugga
# söderut och österut. Flodfolkets byggspråk (16 §9): flodsten, drivved och mässing (bara det stora hornet),
# blå och vita ränder på markiser och tyg. Figurerna och föremålen är de ritade (10h), så skissen visar dem som de blir.
import sys
sys.path.insert(0, '/home/claude/skiss3')
from bas import *
K3 = '/home/claude/k3/ut/'
def bildfil(rel): return Image.open(K3 + rel).convert('RGBA') if os.path.exists(K3 + rel) else Image.open(INK + '/' + rel).convert('RGBA')
DRIV = ['#3A2A18', '#5E4A36', '#7E6A52', '#A08A6E', '#D6CFA4']    # drivved: grå och urlakad
MJOL = ['#B8BEC6', '#DCE0E4', '#EEEFF4', '#FFFFFF']
FLODSTEN = ['#34343C', '#55555F', '#6E6E80', '#8A8A96', '#9EA0AE']
def flodsten(d, x0, y0, b, h, mork_t=0.0):
    """En mur av flodsten: rundade stenar i förskjutna rader, ljus överkant och mörk fog."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            rad = (y - y0) // 5; xx = x + (rad % 2) * 4
            c = FLODSTEN[2] if brus(xx // 8, rad, 3) > 0.4 else FLODSTEN[3]
            if (y - y0) % 5 == 0 or xx % 8 == 0: c = FLODSTEN[0]
            elif (y - y0) % 5 == 1: c = FLODSTEN[4]
            d.satt(x, y, c)
            if mork_t: d.mork(x, y, mork_t)
def plankgolv(d, x0, y0, b, h, ramp=DACK, mjol=0.0, seed=1):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            rad = (y - y0) // 6; i = (y - y0) % 6; off = (rad * 23) % 40
            c = ramp[2] if (rad + (x + off) // 40) % 3 else ramp[3]
            if i == 5: c = ramp[0]
            if (x + off) % 40 == 0 and i < 5: c = ramp[0]
            if mjol and slat(x, y, 9, seed) > 1 - mjol and i < 5 and brus(x, y, seed) > 0.45: c = blanda(c, MJOL[2], 0.65)   # mjöl som dammar, inte block
            d.satt(x, y, c)
def markis(d, x0, y0, b, h=10):
    """Ett stånd med randig markis (flodfolkets blå och vita ränder) och en disk av drivved under."""
    for y in range(y0 + h, y0 + h + 8):
        for x in range(x0 + 2, x0 + b - 2): d.satt(x, y, DRIV[3] if y == y0 + h else DRIV[2] if y < y0 + h + 6 else DRIV[0])
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            c = '#2A52C8' if ((x - x0) // 4) % 2 else '#FFFFFF'
            if y == y0 + h - 1: c = '#1A3290' if ((x - x0) // 4) % 2 else '#B8BEC6'
            if y < y0 + 2: c = blanda(c, '#FFFFFF', 0.2)
            d.satt(x, y, c)
    for x in range(x0 + 2, x0 + b + 4):
        for y in range(y0 + h + 8, y0 + h + 11): d.mork(x, y, 0.3)
def pram(d, x0, y0, b, h):
    """En pråm vid stranden: däck av plankor som man går på, och skrovet som syns mot vattnet nedanför."""
    plankgolv(d, x0, y0, b, h, DACK)
    for x in range(x0, x0 + b):
        for k, c in enumerate((TRA[1], TRA[1], TRA[0], '#1A2A40')): d.satt(x, y0 + h + k, c)
    for y in range(y0, y0 + h + 3): d.satt(x0, y, TRA[1]); d.satt(x0 + b - 1, y, TRA[0])
    for x in range(x0, x0 + b, 6): d.satt(x, y0 + h + 1, '#FFFFFF' if (x // 6) % 2 else '#2A52C8')   # ränderna på relingen
def text(d, x, y, s, c='#FFF4D0'):
    pass
def vattenhjul(d, x0, y0, b, h, snurrar=False, tang=True):
    """Hjulet i kvarnens ränna, sett från sidan (som i A Link to the Past): ett hjul av drivved med skovlar."""
    cx, cy = x0 + b / 2, y0 + h / 2
    d.ellips(cx, cy, b / 2, h / 2, DRIV[2], DRIV[0])
    d.ellips(cx, cy, b / 2 - 4, h / 2 - 5, '#1A2A40')
    for k in range(8):
        a = math.radians(k * 45 + (22 if snurrar else 0))
        for r in range(0, int(h / 2)):
            d.satt(int(cx + math.cos(a) * r * b / h), int(cy + math.sin(a) * r), DRIV[3])
    d.ellips(cx, cy, 2.5, 2.5, DRIV[1])
    if snurrar:
        for (dx, dy) in ((-14, -20), (-15, -6), (-14, 10), (-12, 22)):
            for i in range(3): d.satt(int(cx + dx), int(cy + dy + i), VATT[4])

# ---------------- 1 floden (2 × 1) ----------------
import myt
SK_RX, SK_RY = myt.SKALSKALA
def floden(tillstand='morgon'):
    """Version 2: pråmarna ligger i vattnet längs en lång, gammal brygga, och kvarnens hjul står i rännan framför
    kvarnens västra del, med framsidan mot betraktaren. Sköldpaddan har samma storlek som i ön-rummet."""
    m, o = objekt('floden')
    d = Duk(640, 192)
    d.mark('gras', (0, 0, 640, 192))
    d.mark('vatten', lambda x, y: (x < 80 and y >= 104) or (80 <= x < 344 and y >= 68) or (x >= 344 and y >= 120))
    d.mark('vatten', (488, 0, 20, 92)); d.mark('vatten', (470, 72, 82, 20)); d.mark('vatten', (516, 92, 30, 40))   # rännan: ned längs väggen, under hjulet och ut i floden
    d.mark('sand', lambda x, y: (x < 80 and 90 <= y < 104) or (80 <= x < 344 and 48 <= y < 68) or (344 <= x < 470 and 108 <= y < 120))
    pensel(d, 'stig', [(54, 0), (54, 40), (90, 34), (344, 34), (470, 40), (476, 100), (548, 104)], 18)
    d.mark('kullersten', (548, 72, 92, 48))
    rita_terrang(d, seed=31); gras_tuvor(d, 70, seed=4)
    # den långa bryggan och pråmarna i vattnet, med plankor emellan
    myt.brygga(d, 84, 50, 262, 16)
    pramar = [(90, 72, 76, 28, 1, [('nat', 6, 8), ('lada', 50, 6), ('rep', 56, 18)]),
              (174, 72, 76, 28, 2, [('gryta', 8, 8), ('sack', 46, 6), ('sack', 56, 10), ('korg', 30, 16)]),
              (258, 72, 82, 28, 3, [('tunna', 6, 6), ('tunna', 18, 8), ('lada', 58, 6), ('lada', 62, 14)])]
    for (x0, y0, b, h, sd, last) in pramar: myt.pram_sliten(d, x0, y0, b, h, sd, last)
    for x in (166, 250):
        for y in (78, 86):
            for k in range(8): d.satt(x + k, y, myt.DRIV[3] if k % 7 else myt.DRIV[1])   # plankor emellan
    for (x0, b) in ((104, 30), (186, 30), (296, 34)): markis(d, x0, 26, b)       # stånden på stranden, mot bryggan
    myt.tvattlina(d, 300, 344, 44); myt.stolpe(d, 300, 50, 14); myt.stolpe(d, 342, 50, 14)
    for (x, y, mo, g) in ((24, 96, 1, 0.75), (36, 100, 0, 0.5), (150, 20, 2, 0.2), (230, 18, 1, 0.55), (380, 24, 3, 0.35), (420, 26, 0, 0.1)):
        myt.malad_sten(d, x, y, mo, g)                                          # stenar från många generationer
    # skepparens lilla brygga och hans pråm, för sig själv närmast kvarnen
    myt.brygga(d, 390, 104, 70, 10, seed=7)
    myt.pram_sliten(d, 392, 124, 70, 22, 4, [('rep', 52, 8), ('korg', 8, 6)])
    # kvarnen: flodsten, skiffertak, dörren mot kajen och hornet i takluckan
    hus(d, 512, -8, 112, 80, dorrar=(), tak='skiffer', fasad_h=34, fonster=[600])
    flodsten(d, 513, 38, 110, 34)
    for y in range(52, 72):
        for x in range(556, 580): d.satt(x, y, '#1E1A18' if y > 54 and 558 <= x < 578 else myt.DRIV[1])
    for y in range(4, 22):
        for x in range(578, 606): d.satt(x, y, '#1E1A18' if 4 < y and 580 <= x < 604 else myt.DRIV[0])
    for k in range(12): d.ellips(592, 8 + k, 1.2 + k * 0.45, 1.0, MASS[3] if k % 3 else MASS[2], MASS[1])
    d.ellips(592, 20, 6.5, 2.4, '#24160C', MASS[3])
    for y in range(22, 38): d.satt(582, y, '#A08A6E'); d.satt(583, y, '#7E6A52')   # säckhissens rep
    myt.vattenhjul(d, 530, 70, 24, snurrar=(tillstand != 'morgon'), tang=(tillstand == 'morgon'), vatten_y=80)
    for y in range(100, 112):                                                  # bron över rännans utlopp
        for x in range(512, 552): d.satt(x, y, myt.DRIV[3] if (x - 512) % 5 else myt.DRIV[1])
    myt.brygga(d, 560, 120, 48, 18, seed=9)                                    # bryggan där ön lägger till
    for (x, y, v) in ((60, 150, 1), (200, 130, -1), (430, 170, 1)): myt.anka(d, x, y, v)
    for (x, y) in ((140, 112), (156, 118), (380, 160)): myt.fagel(d, x, y)
    hj = Image.open(INK + '/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA')
    def fig(n, x, y, kv=False): d.bild(bildfil('figurer/' + n + '.png'), x, y)
    if tillstand in ('morgon', 'hjul', 'on'):
        fig('flodman/flodman_ga_upp_01', 214, 98)                             # lastar på pråmen
        fig('flodbo_skrattar/flodbo_skrattar_upp_01', 336, 66)                # fiskar vid bryggans ände
        for k in range(10): d.satt(340 + k // 3, 62 + k, '#7E6A52')
    if tillstand in ('morgon', 'hjul'):
        fig('flodman/flodman_vinka_ner_01', 128, 70)
        fig('flodbo_frukost/flodbo_frukost_blaser_ner_01', 204, 66)
        fig('flodbo_skrattar/flodbo_skrattar_skrattar_ner_01', 276, 66)
        fig('skepparen/skepparen_sitter_ner_01', 428, 118)
        d.bild(hj, 54, 64); d.bild(Image.open(INK + '/figurer/unge/unge1_ater_ner_01.png').convert('RGBA'), 72, 66)
    if tillstand == 'on':
        myt.skal(d, 600, 152 + SK_RY, seed=5, trad=[(602, 180, 1.1)])
        for y in range(138, 154):
            for x in range(578, 594): d.satt(x, y, TRA[3] if (x - 578) % 5 else TRA[1])   # plankan
        fig('skepparen/skepparen_hatten_av_ner_01', 540, 100)
        d.bild(hj, 586, 136)
        fig('flodbo_frukost/flodbo_frukost_jubel_ner_01', 204, 66); fig('flodman/flodman_jubel_ner_01', 128, 70)
    if tillstand == 'kvall':
        im = d.im; px = im.load()
        for y in range(192):
            for x in range(640):
                r, g, b, a = px[x, y]; px[x, y] = (int(r * 0.55 + 20), int(g * 0.5 + 14), int(b * 0.62 + 30), 255)
        d.px = px
        myt.skal(d, 250, 146 + SK_RY, seed=5, trad=[(214, 176, 1.1)], kvall=0.25)   # en ö som simmar: bara ryggen syns
        myt.huvud(d, 420, 172, 1.0, mot='hoger', i_vatten=True)
        d.bild(bildfil('figurer/hjalte/hjalte_sitter_flaska_ner_01.png'), 246, 176)
        d.bild(Image.open(INK + '/figurer/unge/unge1_sover_ner_01.png').convert('RGBA'), 266, 180)
        for (x, y) in ((120, 130), (160, 150), (60, 170), (470, 150), (520, 176), (360, 128)): d.bild(bildfil('foremal/flod/ljusbat_01.png'), x, y)
        fig('skepparen/skepparen_blaser_vanster_01', 600, 30)
        for (n, x, y) in (('flodman/flodman_ner_01', 128, 70), ('flodbo_frukost/flodbo_frukost_ner_01', 204, 66), ('flodbo_skrattar/flodbo_skrattar_ner_01', 276, 66)):
            fig(n, x, y)
    kras_ihop(d)
    return d

# ---------------- 2 kvarnen (inne) ----------------
TAVLA_NY = (176, 126, 64, 34)     # förslaget (101.5): tavlan på ett stöd av drivved precis innanför dörren
def kvarnen(rum=False):
    m, o = objekt('kvarnen')
    d = Duk(320, 192)
    plankgolv(d, 0, 0, 320, 192, DACK, mjol=(0.0 if rum else 0.22), seed=5)
    # norra väggen av flodsten, med kugghjulen och hålet i taket ovanför säckhissen
    flodsten(d, 0, 0, 320, 40)
    for x in range(320):
        for k in range(4): d.mork(x, 40 + k, 0.45 - k * 0.1)
    for (cx, cy, r) in ((140, 20, 15), (168, 26, 9), (188, 16, 11)):          # kugghjulen av trä
        d.ellips(cx, cy, r, r, DRIV[2], DRIV[0]); d.ellips(cx, cy, r * 0.45, r * 0.45, DRIV[1])
        for k in range(10):
            a = math.radians(k * 36)
            for rr in (r, r + 1): d.satt(int(cx + rr * math.cos(a)), int(cy + rr * math.sin(a)), DRIV[3])
    for y in range(0, 44):                                                    # hålet i taket: mörkt, med en ljusstrimma
        for x in range(250, 288): d.satt(x, y, '#1E1A18' if y < 30 else blanda(d.get(x, y), '#1E1A18', 0.5))
    for x in range(250, 288): d.satt(x, 30, DRIV[3]); d.satt(x, 31, DRIV[1])
    # vattenrännan längs västra väggen, med vagg (32, 48) som dess kant
    for y in range(44, 140):
        for x in range(0, 32):
            c = VATT[2] if slat(x, y, 6, 3) > 0.4 else VATT[1]
            if y % 5 == 0 and slat(x, y, 4, 4) > 0.6: c = VATT[4]
            d.satt(x, y, c)
        for x in range(32, 48): d.satt(x, y, FLODSTEN[3] if (y // 5) % 2 else FLODSTEN[2])
    for x in range(0, 48): d.satt(x, 140, FLODSTEN[0])
    # solstrimmor genom hålen i taket
    for (sx, sy) in ((96, 60), (210, 88)):
        for i in range(36):
            for k in range(6): d.ljus(sx + i // 2 + k, sy + i, 0.18)
    if rum:                                                                   # rummet utan det som spelet ritar själv
        for y in range(176, 192):
            for x in range(146, 174): d.satt(x, y, '#E0C890' if y > 182 else '#C8A870')
        for x in range(140, 180): d.satt(x, 175, DRIV[0])
        kras_ihop(d); return d
    # luckorna
    d.bild(bildfil('foremal/flod/lucka_stangd.png'), 55, 90)
    d.bild(bildfil('foremal/flod/lucka_stangd.png'), 107, 166)
    # säckhissen under hålet, med repen upp
    d.bild(bildfil('foremal/flod/sackhiss.png'), 268, 76)
    # säckarna, med de markerade platserna (ringar av krita i skissen)
    d.bild(bildfil('foremal/flod/sack_stor.png'), 256, 128)
    d.bild(bildfil('foremal/flod/sack_liten.png'), 169, 120)
    for nm in ('pa_stora', 'vid_stora', 'pa_lilla', 'vid_lilla'):
        ob = o[nm]; cx, cy = ob['x'] + ob['width'] / 2, ob['y'] + ob['height'] / 2
        for a in range(0, 360, 30): d.satt(int(cx + 6 * math.cos(math.radians(a))), int(cy + 3 * math.sin(math.radians(a))), '#FFFFFF')
    # tavlan på ett stöd, precis innanför dörren (förslaget i 101.5)
    x0, y0, b, h = TAVLA_NY
    for y in range(y0 + h - 2, y0 + h + 10):
        for x in (x0 + 8, x0 + b - 9): d.satt(x, y, DRIV[1]); d.satt(x + 1, y, DRIV[2])
    d.skugga_under(x0 + b / 2 + 3, y0 + h + 10, b / 2, 3)
    d.bild(bildfil('foremal/flod/tavla_kvarn.png'), x0 + b // 2, y0 + h)
    # den gamla platsen på norra väggen: tom (bara stenen)
    # dörren ut, i södra väggen
    for y in range(176, 192):
        for x in range(146, 174): d.satt(x, y, '#E0C890' if y > 182 else '#C8A870')
    for x in range(140, 180): d.satt(x, 175, DRIV[0])
    d.bild(Image.open(INK + '/figurer/hjalte/hjalte_ga_upp_01.png').convert('RGBA'), 160, 172)
    kras_ihop(d)
    return d

# ---------------- 3 loftet ----------------
def loftet(rent=False):
    m, o = objekt('loftet')
    d = Duk(320, 192)
    plankgolv(d, 0, 0, 320, 192, DACK, mjol=0.0 if rent else 0.35, seed=8)
    # norra väggen: brädor av drivved, och luckan mot floden med floden långt nedanför
    for y in range(0, 62):
        for x in range(320): d.satt(x, y, DRIV[2] if (x // 6) % 2 else DRIV[1])
    for x in range(320):
        for k in range(4): d.mork(x, 62 + k, 0.45 - k * 0.1)
    lx, ly, lb, lh = 168, 6, 80, 54
    for y in range(ly, ly + lh):
        for x in range(lx, lx + lb):
            c = '#8AB8DE' if y < ly + 14 else (VATT[2] if slat(x, y, 8, 2) > 0.4 else VATT[3])   # himmel, sedan floden nedanför
            if ly + 32 <= y < ly + 35 and (x - lx) % 26 < 10: c = '#7A5230' if y > ly + 32 else ('#2A52C8' if (x // 2) % 2 else '#FFFFFF')   # små pråmar långt nere
            d.satt(x, y, c)
    for x in range(lx - 2, lx + lb + 2): d.satt(x, ly - 1, DRIV[0]); d.satt(x, ly + lh, DRIV[0]); d.satt(x, ly + lh + 1, DRIV[3])
    for y in range(ly, ly + lh): d.satt(lx - 1, y, DRIV[0]); d.satt(lx + lb, y, DRIV[0])
    # hornet ovanifrån: röret från munstycket (mot spelaren) upp till klockan i luckan
    for i in range(48):
        t = i / 47; x = 212 - 5 * math.sin(t * 2.6); y = 92 - 34 * t
        r = 3.2 + 1.2 * t + (6.5 * ((t - 0.72) / 0.28) ** 1.5 if t > 0.72 else 0)   # rör som vidgar sig till en trumpetklocka
        d.ellips(x, y, r, r * 0.55, MASS[2] if i % 7 else MASS[1], MASS[0])
        d.satt(int(x - r * 0.5), int(y - 1), MASS[4])
        if i % 7 == 3 and t < 0.7: d.satt(int(x), int(y - r * 0.55 - 1), MASS[3])     # kammen: små taggar längs ovansidan
    d.ellips(212 - 5 * math.sin(2.6), 58, 9.5, 3.2, '#24160C', MASS[3])                     # klockans öppning, mot luckan
    if not rent:
        for i in range(40):
            t = i / 39; x = 212 - 6 * math.sin(t * 2.6); y = 90 - 40 * t
            d.satt(int(x), int(y - 1), MJOL[3]); d.satt(int(x) + 1, int(y - 1), MJOL[2])
    else:                                                                       # det målade bandet med streck
        for i in range(10, 26):
            t = i / 39; x = 212 - 6 * math.sin(t * 2.6); y = 90 - 40 * t
            d.satt(int(x) - 1, int(y), '#F2E8C8'); d.satt(int(x), int(y), '#3A2A18' if i % 3 else '#F2E8C8'); d.satt(int(x) + 1, int(y), '#F2E8C8')
    for (x0, y0) in ((198, 84), (220, 84)):                                     # foten av drivved
        for y in range(y0, y0 + 10): d.satt(x0, y, DRIV[1]); d.satt(x0 + 1, y, DRIV[3])
    # säckhissen och hålet i golvet ned till kvarnen
    for y in range(96, 136):
        for x in range(60, 92): d.satt(x, y, '#1E1A18' if 62 <= x < 90 and 98 <= y < 134 else DRIV[0])
    d.bild(bildfil('foremal/flod/sackhiss.png'), 76, 132)
    for y in range(0, 96): d.satt(66, y, '#A08A6E'); d.satt(86, y, '#A08A6E')
    d.bild(Image.open(INK + '/figurer/hjalte/hjalte_ga_upp_01.png').convert('RGBA'), 120, 128)
    d.bild(Image.open(INK + '/figurer/unge/unge1_lyssnar_ner_01.png').convert('RGBA') if os.path.exists(INK + '/figurer/unge/unge1_lyssnar_ner_01.png') else Image.open(INK + '/figurer/unge/unge1_ater_ner_01.png').convert('RGBA'), 150, 108)
    kras_ihop(d)
    return d

# ---------------- 4 ön (skalet ovanifrån) ----------------
def on(rum=False):
    """Version 2: skalet i samma storlek som i floden och på sandbanken (myt.SKALSKALA). Uråldriga plattor med
    årsringar, havstulpaner, lav och ärr runt gräset. Inget bo i trädet: ön har legat på flodens botten."""
    m, o = objekt('on')
    d = Duk(320, 192)
    d.mark('vatten', (0, 0, 320, 192)); rita_terrang(d, seed=61)
    t = o['litet_trad']
    myt.skal(d, 160, 98, seed=7, trad=[(t['x'] + 10, t['y'] + 28, 1.3)])
    if rum:
        for y in range(178, 192):
            for x in range(148, 172): d.satt(x, y, TRA[3] if (x - 148) % 6 else TRA[1])
        kras_ihop(d); return d
    for nm in ('tuva_1', 'tuva_2', 'tuva_3', 'tuva_4', 'tuva_5'):
        ob = o[nm]; d.bild(bildfil('foremal/flod/tuva_hel.png'), ob['x'] + 12, ob['y'] + 16)
    d.bild(bildfil('foremal/flod/skylt_skal.png').resize((36, 18), Image.NEAREST), 161, 84)
    for nm in ('snacka_1', 'snacka_2', 'snacka_3', 'snacka_4'):
        ob = o[nm]; d.bild(bildfil('foremal/flod/snacka_klump.png').resize((8, 6), Image.NEAREST), ob['x'] + 3, ob['y'] + 6)
    for y in range(178, 192):
        for x in range(148, 172): d.satt(x, y, TRA[3] if (x - 148) % 6 else TRA[1])
    d.bild(Image.open(INK + '/figurer/hjalte/hjalte_ga_upp_01.png').convert('RGBA'), 160, 172)
    kras_ihop(d)
    return d

# ---------------- 5 sandbanken ----------------
SB = {'skal': (340, 36), 'huvud': (150, 92), 'fena': (222, 150), 'skalkant': (250, 128, 48, 14),
      'under_fenan': (222, 166), 'bakom_fenan': (236, 136), 'under_huvudet': (148, 128), 'bakom_huvudet': (160, 60)}
def sandbanken(luftskepp=False, rum=False):
    """Version 2, samma skala: bara framdelen syns. Skalet fyller nordöstra hörnet och går ut ur bild, nacken och
    det stora huvudet ligger mot väster, framfenan på sanden. Mörkret under skalets kant är där kanten möter sanden."""
    m, o = objekt('sandbanken')
    d = Duk(320, 192)
    d.mark('vatten', (0, 0, 320, 192))
    d.mark('sand', lambda x, y: y < 180 and x >= 8 and ((x + .5 - 190) / 200) ** 2 + ((y + .5 - 70) / 118) ** 2 <= 1)
    rita_terrang(d, seed=71)
    for (x, y) in ((40, 70), (70, 160), (300, 170), (110, 26)):
        for k in range(4): d.satt(x + k, y + (k % 2), '#3E5A4A')
    cx, cy = SB['skal']
    x0, y0, b, h = SB['skalkant']                                               # mörkret under kanten, före skalet
    for y in range(y0, y0 + h + 4):
        for x in range(x0 - 10, x0 + b + 30):
            if d.inne(x, y): d.mork(x, y, 0.55)
    hx_, hy = SB['huvud']
    myt.huvud(d, hx_, hy, 1.2, mot='vanster', hals=110, bara_hals=rum)          # halsen först, så att skalet ligger över den
    myt.skal(d, cx, cy, seed=9, trad=[(300, 34, 1.2)])
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            if ((x + .5 - (x0 + b / 2)) / (b / 2)) ** 2 + ((y + .5 - y0) / h) ** 2 <= 1: d.satt(x, y, '#0E0E12')
    if rum:
        myt.fena(d, 312, 158, 1.0, mot='hoger')                                 # den andra framfenan står still
        kras_ihop(d); return d
    myt.huvud(d, hx_, hy, 1.2, mot='vanster')
    fx, fy = SB['fena']; myt.fena(d, fx, fy, 1.15, mot='vanster')
    myt.fena(d, 312, 158, 1.0, mot='hoger')                                     # den andra framfenan, delvis utanför
    d.bild(bildfil('foremal/flod/skylt_skal.png').resize((36, 18), Image.NEAREST), 262, 60)
    for k, x in enumerate((206, 220, 234)): d.bild(bildfil('foremal/flod/tang_tuss_hel.png').resize((10, 14), Image.NEAREST), x, 176)
    for nm in ('under_fenan', 'bakom_fenan', 'under_huvudet', 'bakom_huvudet'):
        px_, py_ = SB[nm]
        for a in range(0, 360, 30): d.satt(int(px_ + 7 * math.cos(math.radians(a))), int(py_ + 4 * math.sin(math.radians(a))), '#FFFFFF')
    d.bild(Image.open(INK + '/figurer/hjalte/hjalte_ga_hoger_01.png').convert('RGBA'), 60, 172)
    d.bild(Image.open(INK + '/figurer/unge/unge1_ater_ner_01.png').convert('RGBA'), 84, 174)
    if luftskepp:
        for y in range(100, 140):
            for x in range(20, 130):
                if ((x - 75) / 52) ** 2 + ((y - 120) / 17) ** 2 <= 1: d.mork(x, y, 0.35)
        d.bild(bildfil('foremal/flod/ankare_sand.png'), 76, 142)
    kras_ihop(d)
    return d

if __name__ == '__main__':
    for n, f in (('01_floden_morgon', lambda: floden('morgon')), ('01_floden_on', lambda: floden('on')),
                 ('01_floden_kvall', lambda: floden('kvall')), ('02_kvarnen', kvarnen), ('03_loftet_mjol', lambda: loftet(False)),
                 ('03_loftet_rent', lambda: loftet(True)), ('04_on', on), ('05_sandbanken', lambda: sandbanken(False)),
                 ('05_sandbanken_luftskepp', lambda: sandbanken(True))):
        spara(f(), n, 3); print(n)
