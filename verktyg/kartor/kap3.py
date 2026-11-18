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
from kap2 import KARTOR, STIG, karta, liv, punkt, sak, utg, vagg  # noqa: E402

# Flodfolket (16 × 24) i Stils bilder (10h v0.1, 101.6): stillbilden är <namn>_ner_01, och figuren vänder sig mot den
# som pratar med <namn>_<riktning>_01. De har en skugga under sig, som byborna i kapitel 2.
FIGUR_B, FIGUR_H = 16, 24
FLODFOLKET = {'skepparen', 'flodbo_frukost', 'flodbo_skrattar', 'flodman'}

# Skalets mitt i floden (skissen version 2, 102.3): där ön stiger vid kvarnens brygga, och där den simmar i resan
ON = (500, 302)
KVALL = (210, 262)

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
    # hornet med mjöl, och rent med det målade bandet där skriften står (hornet_skrift är en del av bilden)
    'hornet': {'bild': 'hornet_mjol', 'bild_tillstand': 'rent=hornet_rent'},
    'hornet_skrift': {'i_bild_av': 'hornet'},
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


# Föremål som inte har Stils bild i ett visst rum: hornet på avsatsen ritas ovanifrån (102.3), och Stils horn från
# sidan är närbilden (regin loftet_horn)
UTAN_BILD = {'floden': {'hornet', 'hornet_skrift'}}


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
    return sak(namn, x - 7, y - 5, 14, 10, sida='alla')


def sandens_kant(steg=10):
    """Vattnet runt sanden som trappsteg: sanden är ellipsen i skissen (mitt 190, 80, radier 204 och 120), och vattnet
    börjar vid y 188 i söder, så att det går att gå runt tången under fenan."""
    ut = []
    for y0 in range(0, 188, steg):
        y1 = min(188, y0 + steg)
        dy = max(abs(y0 - 80), abs(y1 - 80))
        k = max(0.0, 1 - (dy / 120) ** 2) ** 0.5
        x0 = max(8, round(190 - 204 * k))
        ut.append(vagg(0, y0, x0, y1 - y0, vatten=True))
        x1 = min(320, round(190 + 204 * k))
        if x1 < 320:
            ut.append(vagg(x1, y0, 320 - x1, y1 - y0, vatten=True))
    ut.append(vagg(0, 188, 320, 4, vatten=True))
    return ut


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
            punkt('regi_hjalte_k3s07_resan', 206, 214),
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
            # kvarnen: väggarna runt avsatsen, så att den bara nås med hissen
            vagg(440, 0, 200, 88), vagg(440, 88, 28, 62), vagg(618, 88, 22, 62),
            # fasaden under avsatsen, med en nisch för dörren (så att vägen längs kajen inte går genom den)
            vagg(468, 104, 60, 46), vagg(552, 104, 66, 46), vagg(528, 104, 24, 34),
            # bryggorna, däcken och avsatsen ritas i gråboxen (dekor), och man går på dem där inget vatten är
            sak('brygga_lang', 84, 50, 262, 16, dekor=True),
            sak('pram_1', 90, 68, 76, 32, dekor=True),
            sak('pram_2', 174, 68, 76, 32, dekor=True),
            sak('pram_3', 258, 68, 82, 32, dekor=True),
            sak('planka_pram_1', 166, 76, 8, 16, dekor=True),
            sak('planka_pram_2', 250, 76, 8, 16, dekor=True),
            sak('brygga_skepparen', 350, 178, 60, 10, dekor=True),
            sak('avsats', 468, 88, 150, 16, dekor=True),
            # pråmarna (rummets innehåll): västra pråmens däck, där ingen står
            sak('pramarna', 92, 70, 30, 28, golv=True),
            sak('frukosthorn', 222, 84, 16, 12, sida='alla'),
            figur('flodman', 128, 70, sida='alla'),
            figur('flodbo_frukost', 204, 66, sida='alla'),
            figur('flodbo_skrattar', 276, 66, sida='alla'),
            figur('skepparen', 384, 170, sida='alla', talare='skepparen'),
            utg('dorr_kvarn', 528, 128, 24, 10, riktning='upp', sida='under', till='kvarnen'),
            # hjulet står i rännan framför kvarnens västra del, med tången på framsidan (han hugger från stigen nedanför)
            sak('hjul', 440, 128, 44, 44, sida='under', visas_forst='morgon'),
            sak('tang_hjul_1', 438, 158, 16, 14, sida='under'),
            sak('tang_hjul_2', 454, 160, 16, 14, sida='under'),
            sak('tang_hjul_3', 470, 158, 16, 14, sida='under'),
            # hornet på avsatsen: han står väster om det, och skriften står på det. Kameran glider ut över floden när han
            # tutar (utsikt), så att han ser verkan
            sak('hornet', 580, 88, 16, 14, sida='vanster', utsikt='on'),
            # där hissen kommer upp: dörren ut till avsatsen (hissen själv står inne i kvarnen)
            sak('sackhiss', 500, 74, 20, 14, sida='under'),
            sak('hornet_skrift', 580, 88, 16, 8, sida='vanster', rackvidd=56),
            # ön vid kvarnens brygga (tillståndet on): skalet i den gemensamma skalan (280 × 192, myt.SKALSKALA), och
            # plankan från bryggan
            sak('on', ON[0] - 140, ON[1] - 82, 280, 164, sida='over', rund=True),
            sak('brygga_kvarn', 548, 196, 44, 22, golv=True),
            sak('planka_on', 560, 218, 24, 10, sida='over'),
            # resan (kvall, pass 3): ön simmar ute på floden, och flaskan han håller när han sitter på skalet
            sak('skal_kvall', KVALL[0] - 140, KVALL[1] - 96, 280, 192, rund=True, dekor=True, bara_i='kvall'),
            sak('flaska_i_handen', 214, 200, 10, 10, sida='alla'),
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
            sak('tavla_kvarn', 128, 8, 64, 34, sida='under', rackvidd=56),
            vagg(32, 48, 16, 56, vatten=True),
            sak('lucka_vatten', 48, 72, 20, 14, sida='hoger'),
            sak('lucka_dorr', 96, 152, 20, 14, sida='alla'),
            sak('sackhiss', 256, 48, 28, 40, sida='vanster'),
            sak('sack_stor', 244, 104, 22, 22),
            sak('pa_stora', 249, 92, 12, 10, sida='alla'),
            sak('vid_stora', 222, 110, 12, 10, sida='alla'),
            sak('sack_liten', 162, 104, 14, 14),
            sak('pa_lilla', 163, 94, 12, 8, sida='alla'),
            sak('vid_lilla', 142, 106, 12, 10, sida='alla'),
        ],
    },
    # En skärm: skalet ovanifrån, med gräs, fem tuvor av mossa och ett litet träd. Vatten runt om, och ingen utgång.
    # Skylten ligger dold vid tuvorna tills han har lyft den fjärde (sak_vid).
    'on': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 160, 160),
            vagg(0, 0, 320, 24, vatten=True), vagg(0, 24, 40, 168, vatten=True),
            vagg(280, 24, 40, 168, vatten=True), vagg(40, 176, 104, 16, vatten=True), vagg(176, 176, 104, 16, vatten=True),
            sak('tuva_1', 60, 50, 24, 18, sida='alla'),
            sak('tuva_2', 236, 72, 24, 18, sida='alla'),
            sak('tuva_3', 76, 128, 24, 18, sida='alla'),
            sak('tuva_4', 232, 124, 24, 18, sida='alla'),
            sak('tuva_5', 150, 136, 24, 18, sida='alla'),
            sak('litet_trad', 240, 30, 24, 28, sida='under'),
            # Stils skylt är 72 × 36 och står på rutans nederkant
            sak('skylt_skal', 124, 56, 72, 24, sida='under'),
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
            *sandens_kant(),
            *skalets_kant(),
            vagg(186, 80, 46, 34),                      # nacken, från huvudet in under skalet
            vagg(288, 150, 32, 14),                     # den andra framfenan, delvis utanför bild
            # skalet i gråboxen (dekor), och sköldpaddan (rummets innehåll) som en markör baktill på skalet
            sak('skal', SB['skal'][0] - 140, SB['skal'][1] - 96, 280, 192, rund=True, dekor=True),
            sak('skoldpadda', 262, 24, 30, 14),
            sak('skylt_skal', 262, 60, 36, 18, sida='alla'),
            sak('skoldpadda_huvud', 114, 72, 72, 42, sida='alla'),
            sak('skoldpadda_fena', 192, 138, 60, 16, sida='alla'),
            plats('under_fenan', 222, 162), plats('bakom_fenan', 236, 130),
            plats('under_huvudet', 148, 128), plats('bakom_huvudet', 160, 60),
            # tången under fenan, med plats att gå runt tussarna (Stils tussar är 16 breda)
            sak('tang_1', 176, 172, 16, 14, sida='alla'), sak('tang_2', 244, 172, 16, 14, sida='alla'),
            sak('tang_3', 268, 170, 16, 14, sida='alla'),
            sak('skalkant', 250, 128, 34, 12, sida='under'),
            sak('fena_trappa', 248, 118, 16, 10, sida='under'),
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
        text = json.dumps(karta(rum, med_bilder(rum, spec)), ensure_ascii=False, indent=1) + '\n'
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
