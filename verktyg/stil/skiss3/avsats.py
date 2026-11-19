# Förslag (18/11): hornet står på en avsats på kvarnens övervåning, i flodrummet, så att spelaren ser
# vad hans tut gör: tre tut ger frukost, ett tut väcker skuggan, och fem tut får ön att stiga. Samma skala som allt
# annat (som en höjd i Zelda). Flodrummet blir 2 × 2 skärmar (640 × 384), så att hela ön får plats i floden, och
# kvarnen ritas större och i skala, med två våningar. Loftet blir en del av kvarnen inne, och hornet står på avsatsen.
import sys
sys.path.insert(0, '/home/claude/skiss3')
from rum_k3 import *
import myt

B, H = 640, 384
ON = (500, 292)                                                     # öns mitt när den har stigit, vid kvarnens brygga
AVSATS = (468, 88, 150, 20)                                         # avsatsens golv (x, y, b, h), övervåningen mot söder
HORN = (588, 92)                                                    # där hornet står på avsatsen, klockan mot floden

def grund(d, tillstand, hjul=True, horn=True, ankor=True):
    d.mark('gras', (0, 0, B, H))
    d.mark('vatten', lambda x, y: (x < 80 and y >= 104) or (80 <= x < 344 and y >= 68) or (x >= 344 and y >= 196))
    d.mark('vatten', (418, 0, 20, 160)); d.mark('vatten', (438, 150, 48, 22))   # rännan och gropen under hjulet (kartan 0.92.0)
    d.mark('sand', lambda x, y: (x < 80 and 90 <= y < 104) or (80 <= x < 344 and 48 <= y < 68) or (344 <= x < 418 and 184 <= y < 196))
    pensel(d, 'stig', [(54, 0), (54, 40), (90, 34), (344, 34), (404, 44), (410, 180), (520, 186)], 18)
    d.mark('kullersten', (486, 150, 154, 46)); d.mark('kullersten', (418, 160, 92, 36)); d.mark('kullersten', (438, 172, 48, 24))
    rita_terrang(d, seed=31); gras_tuvor(d, 90, seed=4)
    myt.brygga(d, 84, 50, 262, 16)
    for (x0, y0, b, h, sd, last) in [(90, 72, 76, 28, 1, [('nat', 6, 8), ('lada', 50, 6), ('rep', 56, 18)]),
                                     (174, 72, 76, 28, 2, [('gryta', 8, 8), ('sack', 46, 6), ('sack', 56, 10), ('korg', 30, 16)]),
                                     (258, 72, 82, 28, 3, [('tunna', 6, 6), ('tunna', 18, 8), ('lada', 58, 6), ('lada', 62, 14)])]:
        myt.pram_sliten(d, x0, y0, b, h, sd, last)
    for x in (166, 250):
        for y in (78, 86):
            for k in range(8): d.satt(x + k, y, myt.DRIV[3] if k % 7 else myt.DRIV[1])
    for (x0, b) in ((104, 30), (186, 30), (296, 34)): markis(d, x0, 26, b)
    myt.tvattlina(d, 300, 344, 44); myt.stolpe(d, 300, 50, 14); myt.stolpe(d, 342, 50, 14)
    for (x, y, mo, g) in ((24, 96, 1, 0.75), (36, 100, 0, 0.5), (150, 20, 2, 0.2), (230, 18, 1, 0.55), (380, 24, 3, 0.35), (380, 120, 0, 0.1)):
        myt.malad_sten(d, x, y, mo, g)
    myt.brygga(d, 350, 178, 60, 10, seed=7)
    myt.pram_sliten(d, 352, 198, 62, 22, 4, [('rep', 46, 8), ('korg', 8, 6)])
    # kvarnen i skala: två våningar av flodsten, skiffertak, avsatsen på övervåningen och dörren på bottenvåningen
    hus(d, 440, -10, 200, 160, dorrar=(), tak="skiffer", fasad_h=102, fonster=[])
    flodsten(d, 441, 48, 198, 102)
    for (fx, fy) in ((470, 62), (520, 62), (570, 120), (612, 120)):         # små fönster med träluckor
        for y in range(fy, fy + 10):
            for x in range(fx, fx + 8): d.satt(x, y, '#1E1A18' if 1 <= x - fx < 7 and y > fy else myt.DRIV[2])
        for y in range(fy, fy + 10): d.satt(fx - 2, y, myt.DRIV[3]); d.satt(fx + 9, y, myt.DRIV[3])
    for y in range(138, 152):                                                # nischen: dörren sitter indragen i fasaden (kartan 0.92.0)
        for x in range(528, 552):
            c = ('#8A8278' if (x // 6 + y // 4) % 2 else '#9A9288') if y < 150 else '#6A645C'
            if x < 531 or x >= 549: c = '#4A4440'                              # nischens sidor i skugga
            d.satt(x, y, c)
    for y in range(112, 138):                                                # dörren
        for x in range(528, 552):
            c = myt.DRIV[1]
            if 531 <= x < 549 and y > 115: c = '#1E1A18' if y < 136 else '#2E2620'
            if y in (112, 113): c = myt.DRIV[0]
            d.satt(x, y, c)
    for x in range(526, 554): d.satt(x, 111, '#55555F')                      # överstycket av sten
    ax, ay, ab, ah = AVSATS                                                  # avsatsen: plankgolv, bärbjälkar och räcke
    for y in range(ay - 14, ay):                                             # dörren ut till avsatsen från loftet
        for x in range(500, 520): d.satt(x, y, '#1E1A18' if 502 <= x < 518 and y > ay - 13 else myt.DRIV[1])
    for y in range(ay, ay + ah):                                             # golvet: plankor på tvären, sedda uppifrån
        for x in range(ax, ax + ab):
            rad = (y - ay) // 4
            c = myt.DRIV[4] if (y - ay) % 4 == 0 else myt.DRIV[3]
            if (x + rad * 13) % 31 == 0: c = myt.DRIV[1]                     # skarvarna mellan plankorna
            if (y - ay) % 4 == 3: c = myt.DRIV[2]
            d.satt(x, y, c)
    for x in range(ax, ax + ab):                                             # golvets framkant och skuggan under
        for k, c in enumerate((myt.DRIV[2], myt.DRIV[1], myt.DRIV[0])): d.satt(x, ay + ah + k, c)
        for k in range(3, 9): d.mork(x, ay + ah + k, 0.5 - k * 0.05)
    for x in range(ax - 2, ax + ab + 2, 12):                                 # konsolerna under avsatsen
        for k in range(10): d.satt(x + k // 3, ay + ah + 3 + k, myt.DRIV[1]); d.satt(x + k // 3 + 1, ay + ah + 3 + k, myt.DRIV[0])
    for x in range(ax, ax + ab):                                             # räcket: överliggaren längs framkanten
        d.satt(x, ay + ah - 6, myt.DRIV[4]); d.satt(x, ay + ah - 5, myt.DRIV[2])
    for x in list(range(ax, ax + ab, 10)) + [ax + ab - 1]:                    # stolparna, med skugga på golvet
        for y in range(ay + ah - 6, ay + ah + 1): d.satt(x, y, myt.DRIV[3]); d.satt(x + 1, y, myt.DRIV[1])
    for y in range(ay - 2, ay + ah + 1):                                     # räcket på sidorna, in mot väggen
        for x in (ax, ax + ab - 1): d.satt(x, y, myt.DRIV[2])
    for y in range(ay - 2, ay):
        for x in range(ax, ax + ab): d.mork(x, y, 0.3)                       # skuggan där golvet möter väggen
    hx, hy = HORN                                                            # hornet på sin fot, klockan ut över räcket mot floden
    for i in (range(36) if horn else ()):
        t = i / 35; x = hx - 6 * math.sin(t * 2.4); y = hy - 4 + 26 * t
        r = 2.6 + 1.0 * t + (6 * ((t - 0.7) / 0.3) ** 1.5 if t > 0.7 else 0)
        d.ellips(x, y, r, r * 0.6, MASS[2] if i % 6 else MASS[1], MASS[0])
        d.satt(int(x - r * 0.5), int(y - 1), MASS[4])
    if horn: d.ellips(hx - 6 * math.sin(2.4), hy + 23, 7, 3, '#24160C', MASS[3])
    for y in range(0, ay - 14): d.satt(509, y + 0, '#A08A6E') if y > ay - 30 else None
    if hjul: myt.vattenhjul(d, 462, 150, 24, snurrar=(tillstand != 'morgon'), tang=(tillstand == 'morgon'), vatten_y=162)
    for x in range(438, 486):                                                # gropens kant av sten mot kajen
        for k, c in enumerate(('#9A9288', '#7A7268', '#4A4440')): d.satt(x, 172 + k, c)
    for y in range(150, 175):
        for x in (436, 437, 486, 487): d.satt(x, y, '#7A7268' if x in (437, 486) else '#4A4440')
    for y in range(176, 196):                                                # rännan går i en trumma under kajen, med en gallerlucka
        for x in range(452, 470):
            if y in (176, 177) or x in (452, 469): d.satt(x, y, '#34343C')
            elif (x - 452) % 4 == 0: d.satt(x, y, '#55555F')
            else: d.satt(x, y, '#1A3458' if (x + y) % 3 else '#2A4A78')
    for y in range(194, 202):                                                # och rinner ut i floden
        for x in range(454, 468): d.satt(x, y, '#FFFFFF' if (x + y) % 3 == 0 else '#A8C8E8')
    myt.brygga(d, 548, 196, 44, 22, seed=9)                                   # bryggan där ön lägger till
    for (x, y, v) in (((60, 160, 1), (200, 150, -1), (120, 330, 1), (300, 250, -1)) if ankor else ()): myt.anka(d, x, y, v)

def fig(d, n, x, y): d.bild(bildfil('figurer/' + n + '.png'), x, y)

def frukost():
    """Tre tut: flodborna springer fram med sina tallrikar en gång till och tittar sig omkring."""
    d = Duk(B, H); grund(d, 'hjul')
    for (n, x, y) in (('flodman/flodman_tallrik_ner_01', 128, 70), ('flodbo_frukost/flodbo_frukost_tallrik_ner_01', 204, 66),
                      ('flodbo_skrattar/flodbo_skrattar_tallrik_ner_01', 276, 66), ('flodman/flodman_tallrik_ner_02', 236, 98),
                      ('flodbo_frukost/flodbo_frukost_tallrik_ner_02', 150, 98), ('flodbo_skrattar/flodbo_skrattar_tallrik_ner_02', 318, 98)):
        fig(d, n, x, y)
    fig(d, 'skepparen/skepparen_ropar_ner_01', 384, 176)
    _hjalte_vid_hornet(d)
    kras_ihop(d); return d

def skuggan():
    """Ett tut: något jättestort glider fram under vattnet och stannar, som om det lyssnar."""
    d = Duk(B, H); grund(d, 'hjul')
    cx, cy = ON
    for y in range(H):
        for x in range(B):
            u = ((x + .5 - cx) / 132) ** 2 + ((y + .5 - cy) / 84) ** 2
            if u < 1 and d.get(x, y).upper() not in ('#000000',):
                t = 0.42 if u < 0.7 else (0.24 if (x + y) % 2 else 0)
                if t: d.mork(x, y, t, '#0A1830')
    fig(d, 'skepparen/skepparen_pekar_upp_vanster_01', 384, 176)
    fig(d, 'flodman/flodman_ner_01', 128, 70); fig(d, 'flodbo_skrattar/flodbo_skrattar_ner_01', 276, 66)
    _hjalte_vid_hornet(d)
    kras_ihop(d); return d

def on_stiger(steg=2):
    """Fem tut: ön stiger. Vattnet välver sig, forsar av skalets kant i strömmar, skummar runt, och ringar sprider
    sig över floden. Pråmarna gungar, ankorna flaxar upp, och flodborna står still och tittar."""
    d = Duk(B, H); grund(d, 'hjul')
    cx, cy = ON; rx, ry = myt.SKALSKALA
    for k, rr in enumerate((1.35, 1.6, 1.85)):                                # ringar som sprider sig
        for a10 in range(0, 3600, 6):
            a = math.radians(a10 / 10); x = int(cx + rx * rr * math.cos(a)); y = int(cy + ry * rr * math.sin(a))
            if d.inne(x, y) and d.get(x, y).upper() in [c.upper() for c in VATT] and (a10 // 6 + k) % 3:
                d.satt(x, y, VATT[4] if k else '#FFFFFF')
    myt.skal(d, cx, cy, seed=5, trad=[(cx + 30, cy - 40, 1.2)])
    for y in range(int(cy - ry), int(cy + ry)):                              # vattnet som ligger kvar på ryggen och rinner av
        for x in range(int(cx - rx), int(cx + rx)):
            u = ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2
            if u <= 1 and d.inne(x, y):
                if slat(x, y, 7, 4) > 0.62: d.satt(x, y, blanda(d.get(x, y), VATT[3], 0.55))   # pölar på gräset
                if u > 0.66 and (x * 3 + y // 2) % 9 == 0: d.satt(x, y, '#FFFFFF')            # strömmar över kanten
    for a10 in range(200, 3400, 25):                                         # strömmar som forsar ned längs skalets sida
        a = math.radians(a10 / 10)
        if math.sin(a) < 0.15: continue
        x = int(cx + rx * math.cos(a)); y0 = int(cy + ry * math.sin(a))
        for j in range(14):
            if d.inne(x, y0 + j): d.satt(x, y0 + j, '#FFFFFF' if j % 4 < 2 else VATT[4]); d.satt(x + 1, y0 + j, VATT[4])
    for a10 in range(0, 3600, 9):                                            # skummet runt skalet vid vattenytan
        a = math.radians(a10 / 10); r = 1.06 + 0.04 * math.sin(a10 / 37)
        x = int(cx + rx * r * math.cos(a)); y = int(cy + 16 + ry * r * math.sin(a))
        if d.inne(x, y) and math.sin(a) > -0.75: d.satt(x, y, '#FFFFFF'); d.satt(x + 1, y, '#DCE0E4')
    for (x, y) in ((cx - 150, cy - 70), (cx + 150, cy - 80), (cx - 100, cy - 110), (cx + 60, cy - 112), (cx - 160, cy + 10)):
        for (dx, dy) in ((0, 0), (1, -1), (-1, -1), (2, 0)): d.satt(x + dx, y + dy, '#FFFFFF')   # stänk
    myt.huvud(d, cx - 160, cy - 6, 1.2, mot='vanster', i_vatten=True)
    fig(d, 'unge/unge1_simmar_vanster_01', cx - 40, cy - 44)
    for (n, x, y) in (('flodman/flodman_ner_01', 128, 70), ('flodbo_frukost/flodbo_frukost_ner_01', 204, 66), ('flodbo_skrattar/flodbo_skrattar_ner_01', 276, 66)):
        fig(d, n, x, y)
    fig(d, 'skepparen/skepparen_hatten_av_ner_01', 384, 176)
    for (x, y) in ((300, 230), (316, 222)): myt.fagel(d, x, y)
    _hjalte_vid_hornet(d, unge=False)
    kras_ihop(d); return d

def _hjalte_vid_hornet(d, unge=True):
    hx, hy = HORN
    d.bild(Image.open(INK + '/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA'), hx - 22, AVSATS[1] + 14)
    if unge: d.bild(Image.open(INK + '/figurer/unge/unge1_lyssnar_ner_01.png').convert('RGBA'), hx - 50, AVSATS[1] + 16)

if __name__ == '__main__':
    for n, f in (('06_avsats_frukost', frukost), ('06_avsats_skuggan', skuggan), ('06_avsats_on_stiger', on_stiger)):
        spara(f(), n, 2); print(n)
