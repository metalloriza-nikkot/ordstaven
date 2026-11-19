#!/usr/bin/env python3
"""Kapitel 3:s kartor i gråbox (beslut 87.9.3, steg 1), efter Innehålls anteckningar i kap-03.json (rummens `anteckning`).

Skriver fyra Tiled-kartor i kartor/den-gomda-dalen/: floden (2 × 2 skärmar med avsatsen, beslut 102.3), kvarnen (inne,
en skärm), on (ön, en skärm) och sandbanken (en skärm). Loftet har utgått som rum (102.3): hornet står på avsatsen i
floden. Kartorna följer kap-03 v0.3.2, och floden och sandbanken Stils skiss version 2 (`skiss3/avsats.py` och
`skiss3/rum_k3.py`). Kartorna har bara id:n, aldrig text som spelaren läser. Hjälparna (utg, sak, figur, vagg, punkt, liv och
karta) är desamma som i kap2.py. Stil skissar ovanpå skärmdumparna när gråboxen är spelad (kedjan i 07, steg 4).

    python3 verktyg/kartor/kap3.py [--prova]

Med --prova skrivs ingenting, men skriptet säger om någon karta skulle ändras.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kap2 import KARTOR, ROT, STIG, karta, liv, punkt, sak, utg, vagg  # noqa: E402

# Flodfolket (16 × 24) i Stils bilder (10h v0.1, 101.6): stillbilden är <namn>_ner_01, och figuren vänder sig mot den
# som pratar med <namn>_<riktning>_01. De har en skugga under sig, som byborna i kapitel 2.
FIGUR_B, FIGUR_H = 16, 24
FLODFOLKET = {'skepparen', 'flodbo_frukost', 'flodbo_skrattar', 'flodman'}

# Skalets mitt i floden (Stils rum, 10h v0.4, 103.2): där ön stiger vid kvarnens brygga, och där den simmar i resan.
# Sköldpaddans bilder är 480 × 320 med skalets mitt i (250, 150).
ON = (500, 292)
KVALL = (230, 270)
SKALBILD = (480, 320, 250, 150)

# Kapitel 3:s rum som Stils bilder (103.2). Rummets _over-bild ligger ovanför föremålen men under figurerna: i floden är
# det kvarnens brygga, skepparens pråm och strandkanten, så att ön ligger under dem (103.2). Den är inga väggar.
RUMSBILDER = ROT / 'assets' / 'rum' / 'kap-03'
# Det som står i rummets bild: de går man på eller till, men de ritas inte
# Platserna i kvarnens och sandbankens läsval är ställen han går till vid säckarna, fenan och huvudet, utan egen bild.
I_BILDEN = {'pramarna', 'brygga_kvarn', 'skoldpadda', 'skalkant', 'litet_trad',
            'pa_stora', 'vid_stora', 'pa_lilla', 'vid_lilla', 'under_fenan', 'bakom_fenan', 'under_huvudet', 'bakom_huvudet'}

# Stils föremål för kapitel 3 (10h v0.1, 101.6): kartans id → bildens egenskaper. Bilden står på föremålets nederkant,
# mitt i. Rummen är gråbox tills skissen är klar, så bilderna sätts här och inte bara i rum som är bilder (som i kap2.py).
# Sköldpaddan på sandbanken och ön väntar på skissen: Stil har ritat den som en bild med huvudet och fenan på bestämda
# platser, och den avgör var rummets saker står.
FOREMALSBILDER = {
    'frukosthorn': {'bild': 'frukosthorn'},
    **{f'tang_hjul_{i}': {'bild': 'tang_tuss_hel', 'bild_hugg': 'tang_tuss_huggen', 'bild_kvar': 'tang_tuss_huggen'} for i in (1, 2, 3)},
    'planka_on': {'bild': 'planka_on'},
    'flaska_i_handen': {'bild': 'flaska'},
    'tavla_kvarn': {'bild': 'tavla_kvarn'},
    'lucka_vatten': {'bild': 'lucka_stangd', 'bild_sedan': 'lucka_oppen', 'sedan': 'k3_kvarn_1'},
    'lucka_dorr': {'bild': 'lucka_stangd'},
    'sack_stor': {'bild': 'sack_stor'},
    'sack_liten': {'bild': 'sack_liten'},
    'sackhiss': {'bild': 'sackhiss'},
    # hornet på avsatsen uppifrån (103.2), med mjöl och rent med det målade bandet där skriften står (hornet_skrift är
    # en del av bilden). Bilden står där Stil ritade den (hornet_plats), och hornet självt är det han står vid
    'hornet': {'bild': 'hornet_avsats_mjol', 'bild_tillstand': 'rent=hornet_avsats_rent,on=hornet_avsats_rent,kvall=hornet_avsats_rent',
               'bild_pa': 'hornet_plats'},
    'hornet_skrift': {'i_bild_av': 'hornet'},
    # vattenhjulet (103.2): stilla på morgonen, och sedan ett varv i sex bilder, 250 ms per bild (golvets gräns, 45)
    'hjul': {'bild': 'vattenhjul_01', 'bild_tillstand': 'morgon=vattenhjul_stilla', 'bild_pa': 'hjul_plats',
             'bild_anim': ','.join(f'vattenhjul_0{i}' for i in range(1, 7)), 'anim_ms': 250, 'anim_i': 'hjul,rent,on,kvall'},
    # ön vid kvarnens brygga (103.2), under bryggan och figurerna
    'on': {'bild': 'on_floden', 'bild_pa': 'on_plats', 'under': True},
    # sköldpaddans huvud och fena på sandbanken, där Stil ritade dem (halsen står i rummets bild)
    'skoldpadda_huvud': {'bild': 'skoldpadda_huvud_vilar', 'bild_pa': 'huvud_plats'},
    'skoldpadda_fena': {'bild': 'skoldpadda_fena_sanden', 'bild_tillstand': 'fena_uppe=skoldpadda_fena_lyft,luftskepp=skoldpadda_fena_lyft',
                        'bild_pa': 'fena_plats'},
    'fena_trappa': {'bild': 'skoldpadda_fena_trappa', 'bild_pa': 'fena_plats'},
    **{f'tuva_{i}': {'bild': 'tuva_hel', 'bild_hugg': 'tuva_lyft', 'bild_kvar': 'tuva_lyft'} for i in range(1, 6)},
    'skylt_skal': {'bild': 'skylt_skal'},
    **{f'snacka_{i}': {'bild': 'snacka_klump', 'bild_hugg': 'snacka_bort_01,snacka_bort_02', 'bild_kvar': 'snacka_bort_02'} for i in range(1, 5)},
    **{f'tang_{i}': {'bild': 'tang_tuss_hel', 'bild_hugg': 'tang_tuss_huggen', 'bild_kvar': 'tang_tuss_huggen'} for i in (1, 2, 3)},
    'ankare': {'bild': 'ankare_sand'},
}


def figur(namn, x, y, **e):
    if namn in FLODFOLKET:
        e.setdefault('bild', f'{namn}_ner_01')
        e.setdefault('skugga', True)
    return ('figur', namn, x, y, FIGUR_B, FIGUR_H, e)


# Föremål som inte har Stils bild i ett visst rum
UTAN_BILD = {}


def vatten_093(rum):
    """Vattnet i kvarnen och på sandbanken som kartan hade det i 0.93.0 (105.1: kartan i den senaste publicerade
    versionen gäller, och Stil ritar mot den). Det lästes då ur Stils bild (vattenmask), och står nu fast i
    vatten_k3.json, så att en ny bild inte flyttar kartan."""
    return [vagg(x, y, b, h, vatten=True) for x, y, b, h in json.loads((Path(__file__).parent / 'vatten_k3.json').read_text())[rum]]


def bildplats(namn, x, y, b, h, **e):
    """Var en bild står som inte ryms i föremålets ruta (bild_pa): en osynlig dekor i rummets bild."""
    return sak(namn, x, y, b, h, dekor=True, i_bilden=True, **e)


def skalplats(namn, mitt, **e):
    """Sköldpaddans bild (480 × 320) med skalets mitt i `mitt`. Den får gå ut ur bild (rund)."""
    b, h, mx, my = SKALBILD
    return sak(namn, mitt[0] - mx, mitt[1] - my, b, h, rund=True, **e)


def vattenmask(rum, ruta=8):
    """Vattnet i Stils bild av rummet, i rutor om 8 × 8 där minst halva rutan är vatten (blått), som rader av sträckor."""
    from PIL import Image
    im = Image.open(RUMSBILDER / f'{rum}.png').convert('RGBA')
    W, H = im.size
    px = im.load()
    rader = []
    for y0 in range(0, H, ruta):
        rad = []
        for x0 in range(0, W, ruta):
            n = sum(1 for x in range(x0, min(W, x0 + ruta)) for y in range(y0, min(H, y0 + ruta))
                    if px[x, y][3] > 0 and px[x, y][2] > px[x, y][0] + 25 and px[x, y][2] >= px[x, y][1])
            rad.append(n * 2 >= ruta * ruta)
        rader.append(rad)
    return rader


def strackor(rader, ruta=8, undantag=lambda x, y: False):
    """Väggar av vatten ur en mask: sträckor i varje rad, utom rutor där undantag(x, y) säger att han ska kunna gå."""
    ut = []
    for j, rad in enumerate(rader):
        i = 0
        while i < len(rad):
            if rad[i] and not undantag(i * ruta, j * ruta):
                k = i
                while k < len(rad) and rad[k] and not undantag(k * ruta, j * ruta):
                    k += 1
                ut.append(vagg(i * ruta, j * ruta, (k - i) * ruta, ruta, vatten=True))
                i = k
            else:
                i += 1
    return ut


def ellipsvagg(cx, cy, rx, ry, bredd, hojd, steg=8, oppning=None):
    """Vatten runt en ellips man går på (skalet ovanifrån på ön), som trappsteg rad för rad. oppning = (x0, x1, y0)
    är plankan in, där vattnet inte når."""
    ut = []
    for y0 in range(0, hojd, steg):
        y1 = min(hojd, y0 + steg)
        dy = max(abs(y0 - cy), abs(y1 - cy))
        k = max(0.0, 1 - (dy / ry) ** 2) ** 0.5 if dy < ry else 0.0
        x0, x1 = round(cx - rx * k), round(cx + rx * k)
        if k == 0:
            x0 = x1 = cx
        if oppning and y0 >= oppning[2]:
            ut += [vagg(0, y0, oppning[0], y1 - y0, vatten=True), vagg(oppning[1], y0, bredd - oppning[1], y1 - y0, vatten=True)]
            continue
        if x0 > 0:
            ut.append(vagg(0, y0, x0, y1 - y0, vatten=True))
        if x1 < bredd:
            ut.append(vagg(x1, y0, bredd - x1, y1 - y0, vatten=True))
    return ut


def med_bilder(rum, spec):
    """Rummets objekt med Stils bilder (FOREMALSBILDER) inlagda."""
    ut = []
    for typ, namn, x, y, b, h, e in spec['objekt']:
        if namn in FOREMALSBILDER and namn not in UTAN_BILD.get(rum, ()):
            e = {**e, **FOREMALSBILDER[namn]}
        ut.append((typ, namn, x, y, b, h, e))
    return {**spec, 'objekt': ut}


# Sandbanken (skissen version 2, `skiss3/rum_k3.py`): skalets mitt, och platsernas mitt
SB = {'skal': (340, 36)}


def plats(namn, x, y):
    """En av de fyra platserna i k3_fenan, med mitten där Stil har ritat den."""
    return sak(namn, x - 7, y - 5, 14, 10, sida='alla', ring=True)


def skalets_kant(steg=8):
    """Skalet som ett hinder i kolumner: varje kolumn går ned till skalets kant (i skalets skala, 140 × 96)."""
    cx, cy = SB['skal']
    ut = []
    for x0 in range(200, 320, steg):
        x1 = min(320, x0 + steg)
        dx = min(abs(x0 - cx), abs(x1 - cx))
        k = max(0.0, 1 - (dx / 140) ** 2) ** 0.5
        ut.append(vagg(x0, 0, x1 - x0, round(cy + 96 * k)))
    return ut


RUMMEN = {
    # 2 × 2 skärmar (102.3), efter Stils skiss version 2 med avsatsen (`skiss3/avsats.py`, 18/11). Den långa bryggan av
    # drivved i norr med pråmarna i vattnet under (man går på däcken och plankorna emellan), stånden på stranden,
    # frukosthornet på mittpråmen, rännan ned längs kvarnens västra sida, och skepparens lilla brygga vid stigen.
    # Kvarnen i skala, två våningar, i nordost: vattenhjulet står i rännan framför västra delen (tången på framsidan),
    # dörren på bottenvåningen mot kajen, och avsatsen på övervåningen mot söder, där hornet står med klockan ut över
    # floden. Avsatsen nås bara med säckhissen: väggarna står runt den, och dörren ut till den (regi_hiss) är där hissen
    # kommer upp (in_hissen). Floden är bred i söder, så att hela ön får plats när den stiger vid kvarnens brygga
    # (regi_on), och han ser från avsatsen vad hans tut gör (utsikt). På kvällen simmar ön ute på floden med hjälten på
    # skalet (regi_hjalte_k3s07_resan), och skepparen står vid hornet (regi_skepparen_kvall).
    'floden': {
        'storlek': (40, 24),
        'objekt': [
            utg('stig_trasket', 40, 0, 28, 36, **STIG, riktning='upp'),
            punkt('start', 54, 56),
            punkt('regi_hiss', 510, 98),
            punkt('regi_on', ON[0], ON[1]),
            punkt('regi_pramar', 215, 84),
            punkt('regi_hjalte_k3s02_loftet', 520, 98),
            punkt('regi_hjalte_k3s03_hornet', 566, 98),
            punkt('regi_hjalte_k3s07_resan', KVALL[0] + 6, KVALL[1] - 8),
            punkt('regi_skepparen_kvall', 566, 102),
            punkt('regi_skepparen_on', 532, 192),
            # vattnet: väster om bryggan, under pråmarna (plankorna emellan går att gå på), och söder om kajen
            vagg(0, 104, 80, 280, vatten=True),
            vagg(80, 68, 10, 316, vatten=True), vagg(340, 68, 4, 32, vatten=True), vagg(90, 100, 254, 284, vatten=True),
            vagg(166, 68, 8, 8, vatten=True), vagg(166, 92, 8, 8, vatten=True),
            vagg(250, 68, 8, 8, vatten=True), vagg(250, 92, 8, 8, vatten=True),
            vagg(344, 196, 204, 188, vatten=True), vagg(548, 218, 44, 166, vatten=True), vagg(592, 196, 48, 188, vatten=True),
            # rännan ned längs kvarnens västra sida
            vagg(418, 0, 20, 160, vatten=True),
            # kvarnen: väggarna runt avsatsen (Stils golv, 150 × 20), så att den bara nås med hissen
            vagg(440, 0, 200, 88), vagg(440, 88, 28, 62), vagg(618, 88, 22, 62),
            # fasaden under avsatsen, med en nisch för dörren (så att vägen längs kajen inte går genom den)
            vagg(468, 108, 60, 42), vagg(552, 108, 66, 42), vagg(528, 108, 24, 30),
            # bilderna som inte ryms i föremålens rutor (bild_pa): ön vid bryggan, hjulet och hornet, där Stil ritade dem
            skalplats('on_plats', ON, dekor=True, i_bilden=True),
            bildplats('hjul_plats', 433, 124, 58, 56),
            bildplats('hornet_plats', 572, 87, 24, 36),
            # ön ligger under bryggan, figurerna och plankan (103.2), så den ritas först
            sak('on', 360, 220, 280, 164, sida='over'),
            # pråmarna (rummets innehåll): västra pråmens däck, där ingen står
            sak('pramarna', 92, 70, 30, 28, golv=True),
            sak('frukosthorn', 222, 84, 16, 12, sida='alla'),
            # flodfolket lever (103.3.6): var och en har en syssla i två bilder (500 ms per bild, högst två rör sig på
            # skärmen), och vinkar när han kommer nära. Kvinnan står vid grytan, så att sleven hamnar i den (Stil 10h v0.5)
            figur('flodman', 128, 70, sida='alla', syssla='flodman_lastar_hoger_01,flodman_lastar_hoger_02', nara=True),
            figur('flodbo_frukost', 188, 66, sida='alla', syssla='flodbo_frukost_ror_vanster_01,flodbo_frukost_ror_vanster_02', nara=True),
            figur('flodbo_skrattar', 276, 66, sida='alla', syssla='flodbo_skrattar_fiskar_hoger_01,flodbo_skrattar_fiskar_hoger_02', nara=True),
            figur('skepparen', 384, 170, sida='alla', talare='skepparen'),
            utg('dorr_kvarn', 528, 128, 24, 10, riktning='upp', sida='under', till='kvarnen'),
            # hjulet står i rännan framför kvarnens västra del, med tången på framsidan (han hugger från stigen nedanför)
            sak('hjul', 440, 128, 44, 44, sida='under', visas_forst='morgon', ljud_slinga='vattenhjul'),
            sak('tang_hjul_1', 438, 158, 16, 14, sida='under'),
            sak('tang_hjul_2', 454, 160, 16, 14, sida='under'),
            sak('tang_hjul_3', 470, 158, 16, 14, sida='under'),
            # hornet på avsatsen: han står väster om det, och skriften står på det. Kameran glider ut över floden när han
            # tutar (utsikt), så att han ser verkan
            # 109.3: hornet (där han blåser, västra änden) och skriften (bandet på hornets östra del) är två saker bredvid
            # varandra, så att ett tryck vid skriften läser den och ett tryck vid hornet tutar. Förut låg de på samma
            # ruta, och ett tryck gick alltid till hornet: skriften gick bara att öppna med musen
            sak('hornet', 572, 88, 12, 6, sida='vanster', utsikt='on', blas=True),
            # där hissen kommer upp: dörren ut till avsatsen (hissen själv står inne i kvarnen)
            sak('sackhiss', 500, 74, 20, 14, sida='under'),
            sak('hornet_skrift', 584, 88, 12, 6, sida='under'),
            # kvarnens brygga, och plankan från bryggan upp på ön (tillståndet on)
            sak('brygga_kvarn', 548, 196, 44, 22, golv=True),
            sak('planka_on', 560, 218, 24, 10, sida='over'),
            # resan (kvall, pass 3): ön simmar ute på floden, och flaskan han håller när han sitter på skalet
            skalplats('skal_kvall', KVALL, dekor=True, bara_i='kvall', under=True, bild='skoldpadda_simmar_01',
                      bild_anim='skoldpadda_simmar_01,skoldpadda_simmar_02', anim_ms=600),
            sak('flaska_i_handen', KVALL[0] + 12, KVALL[1] - 24, 10, 10, sida='alla'),
            liv('fagel', 150, 132, 12, 12),
            liv('fagel', 300, 250, 12, 12),
        ],
    },
    # En skärm, inne (Rummen 2): tavlan på bakväggen, luckan vid vattenrännan i väster och luckan i golvet vid dörren,
    # den stora säcken under säckhissen och den lilla i mitten, med en plats på (ovanpå säcken) och vid (väster om
    # den) var och en. Platserna är små markeringar, och Stil ritar dem i skissen. Säckhissen går upp till avsatsen i floden (scenbytet, 102.3).
    'kvarnen': {
        'storlek': (20, 12),
        'inomhus': True,
        'objekt': [
            utg('dorr_ut_kvarn', 146, 176, 28, 16, riktning='ned', sida='over', till='floden'),
            punkt('start', 160, 150),
            # tavlan på vägen in (101.5, Stil 18/11), öster om gången från dörren. Bilden (64 × 34) står på stödet, och
            # bara stödet är ett hinder, så att han kan gå bakom tavlan till säckarna
            sak('tavla_kvarn', 180, 148, 56, 12, sida='under'),
            # Stils kvarn (103.2): vattenrännan i väster med stenkanten, kvarnstenen, säckarna i nordost och tunnorna i
            # sydost. Hissens schakt står i norra väggen
            *vatten_093('kvarnen'), vagg(32, 44, 16, 96),
            vagg(76, 54, 58, 36), vagg(288, 40, 32, 52), vagg(286, 136, 34, 38),
            # kvarnstenen maler och axeln dunkar (103.3.4), i hela rummet
            bildplats('kvarnsten', 76, 54, 58, 36, ljud_slinga='kvarn_dunk', ljud_radie=420),
            sak('lucka_vatten', 48, 72, 20, 14, sida='hoger'),
            sak('lucka_dorr', 96, 152, 20, 14, sida='alla'),
            sak('sackhiss', 256, 48, 28, 40, sida='vanster'),
            sak('sack_stor', 244, 104, 22, 22),
            # Stils ring (plats_ring_01–02, 104.7) visar var han kan ställa sig medan läsvalet pågår, likadan vid varje plats
            sak('pa_stora', 249, 92, 12, 10, sida='alla', ring=True),
            sak('vid_stora', 222, 110, 12, 10, sida='alla', ring=True),
            sak('sack_liten', 162, 104, 14, 14),
            sak('pa_lilla', 163, 94, 12, 8, sida='alla', ring=True),
            sak('vid_lilla', 142, 106, 12, 10, sida='alla', ring=True),
        ],
    },
    # En skärm: skalet ovanifrån, med gräs, fem tuvor av mossa och ett litet träd. Vatten runt om, och ingen utgång.
    # Skylten ligger dold vid tuvorna tills han har lyft den fjärde (sak_vid).
    'on': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 160, 160),
            # gräset innanför skalets kant i Stils bild (skalet 280 × 192, mitt 160, 98), och plankan in från söder
            *ellipsvagg(161, 98, 122, 74, 320, 192, oppning=(144, 176, 168)),
            sak('tuva_1', 60, 50, 24, 18, sida='alla'),
            sak('tuva_2', 236, 72, 24, 18, sida='alla'),
            sak('tuva_3', 76, 128, 24, 18, sida='alla'),
            sak('tuva_4', 232, 124, 24, 18, sida='alla'),
            sak('tuva_5', 150, 136, 24, 18, sida='alla'),
            sak('litet_trad', 240, 30, 24, 28, sida='under'),
            # Stils skylt är 72 × 36 och står på rutans nederkant
            # 109.3: snäckorna ligger under skylten, så underifrån når han den inte med vanlig räckvidd. Räckvidden
            # räcker förbi snäckorna, och handen syns lika långt bort
            sak('skylt_skal', 124, 56, 72, 24, sida='under', rackvidd=40),
            # snäckorna under skylten, glest så att de inte blir en vägg (manus 19 v0.4.1: på ön i pass 2)
            sak('snacka_1', 126, 88, 16, 12, sida='alla'), sak('snacka_2', 146, 88, 16, 12, sida='alla'),
            sak('snacka_3', 166, 88, 16, 12, sida='alla'), sak('snacka_4', 186, 88, 16, 12, sida='alla'),
        ],
    },
    # En skärm (skissen version 2, 102.3): sanden är en bred ö med vatten runt, och bara sköldpaddans framdel syns i
    # den gemensamma skalan. Skalet fyller nordöstra hörnet och går ut ur bild (SB['skal']), nacken och det stora
    # huvudet ligger mot väster, och framfenan på sanden. De fyra platserna i k3_fenan är korsade: under och bakom
    # fenan, under och bakom huvudet. Mörkret under skalets kant (skalkant) är där kanten möter sanden. Tången ligger
    # under fenan (fena_uppe), och efter duellen lägger sköldpaddan fram fenan som en trappa upp på skalet. I
    # tillståndet luftskepp ligger ankaret i sanden i luftskeppets skugga.
    'sandbanken': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 96, 166),
            # vattnet i Stils bild, utom i söder under fenan, där sanden går ned till y 188 så att han kommer runt tången
            *vatten_093('sandbanken'),
            *skalets_kant(),
            vagg(186, 80, 46, 34),                      # nacken, från huvudet in under skalet
            vagg(288, 150, 32, 14),                     # den andra framfenan, delvis utanför bild
            # skalet och halsen står i rummets bild, och sköldpaddan (rummets innehåll) är en markör baktill på skalet
            sak('skoldpadda', 262, 24, 30, 14),
            # huvudet och fenan där Stil ritade dem (mitt 150, 92 och 222, 150)
            bildplats('huvud_plats', 98, 64, 96, 64),
            bildplats('fena_plats', 186, 132, 72, 36),
            sak('skylt_skal', 262, 60, 36, 18, sida='alla'),
            sak('skoldpadda_huvud', 114, 72, 72, 42, sida='alla'),
            sak('skoldpadda_fena', 192, 138, 60, 16, sida='alla'),
            plats('under_fenan', 222, 162), plats('bakom_fenan', 236, 130),
            plats('under_huvudet', 148, 128), plats('bakom_huvudet', 160, 60),
            # tången under fenan, med plats att gå runt tussarna (Stils tussar är 16 breda)
            sak('tang_1', 176, 172, 16, 14, sida='alla'), sak('tang_2', 244, 172, 16, 14, sida='alla'),
            sak('tang_3', 268, 170, 16, 14, sida='alla'),
            sak('skalkant', 250, 128, 34, 12, sida='under'),
            # fenan som trappa: målet står vid fenans framkant, där Stils bild visar den (fena_plats 186, 132, 72 × 36).
            # Förut stod det vid handleden bakom skalkanten, och han fick gå runt för att nå det (den vuxnes spelning 19/11). Hindren
            # är desamma: rutan ligger inne i fenan, som redan är ett hinder.
            sak('fena_trappa', 206, 146, 32, 10, sida='under'),
            sak('ankare', 76, 142, 24, 22, sida='alla'),
        ],
    },
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    for rum, spec in RUMMEN.items():
        text = json.dumps(karta(rum, med_bilder(rum, spec), rumsbilder=RUMSBILDER, i_bilden=I_BILDEN, foremalsbilder={}, over_som_vagg=False), ensure_ascii=False, indent=1) + '\n'
        f = KARTOR / f'{rum}.tmj'
        if f.exists() and f.read_text(encoding='utf-8') == text:
            continue
        andrade.append(f.name)
        if not a.prova:
            f.write_text(text, encoding='utf-8')
    if a.prova and andrade:
        sys.exit('Kartorna skulle ändras: ' + ', '.join(andrade))
    print(('Skrev ' if andrade else 'Inget att ändra') + (': ' + ', '.join(andrade) if andrade else '.'))


if __name__ == '__main__':
    main()
