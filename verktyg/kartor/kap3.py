#!/usr/bin/env python3
"""Kapitel 3:s kartor i gråbox (beslut 87.9.3, steg 1), efter Innehålls anteckningar i kap-03.json (rummens `anteckning`).

Skriver fem Tiled-kartor i kartor/den-gomda-dalen/: floden (2 × 1 skärmar), kvarnen och loftet (inne, en skärm
var), on (ön, en skärm) och sandbanken (en skärm). Kartorna följer kap-03 v0.3 (manus 19 v0.4.1, beslut 100.4). Kartorna har bara id:n, aldrig text som spelaren läser. Hjälparna (utg, sak, figur, vagg, punkt, liv och
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

# Stils föremål för kapitel 3 (10h v0.1, 101.6): kartans id → bildens egenskaper. Bilden står på föremålets nederkant,
# mitt i. Rummen är gråbox tills skissen är klar, så bilderna sätts här och inte bara i rum som är bilder (som i kap2.py).
# Sköldpaddan på sandbanken och ön väntar på skissen: Stil har ritat den som en bild med huvudet och fenan på bestämda
# platser, och den avgör var rummets saker står.
FOREMALSBILDER = {
    'frukosthorn': {'bild': 'frukosthorn'},
    **{f'tang_hjul_{i}': {'bild': 'tang_tuss_hel', 'bild_hugg': 'tang_tuss_huggen', 'bild_kvar': 'tang_tuss_huggen'} for i in (1, 2, 3)},
    'on': {'bild': 'on_floden'},
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


def med_bilder(spec):
    """Rummets objekt med Stils bilder (FOREMALSBILDER) inlagda."""
    ut = []
    for typ, namn, x, y, b, h, e in spec['objekt']:
        if namn in FOREMALSBILDER:
            e = {**e, **FOREMALSBILDER[namn]}
        ut.append((typ, namn, x, y, b, h, e))
    return {**spec, 'objekt': ut}


RUMMEN = {
    # Manus 19 v0.4.1 (kap-03 v0.3). Västra skärmen: stigen från träsket in från norr, pråmarna med stånden längs
    # stranden, frukosthornet på en pråm och två flodbor, och floden bred och tom i söder. Östra skärmen: skepparen på
    # sin pråm närmast kvarnen, och kvarnen på stenfot i nordost med vattenhjulet på västra sidan, tre tussar tång runt
    # hjulet (morgon), dörren i söder och bryggan där ön lägger till. Kameran glider över hjulet när han kommer in (79.3).
    # Hornet sitter högt uppe på kvarnen och står i loftet. Från loftet kommer han ned vid bryggan (in_loftet).
    'floden': {
        'storlek': (40, 12),
        'objekt': [
            utg('stig_trasket', 40, 0, 28, 36, **STIG, riktning='upp'),
            punkt('start', 54, 56),
            punkt('in_loftet', 580, 100),
            # floden: hela södra delen
            vagg(0, 104, 344, 88, vatten=True),
            vagg(344, 132, 296, 60, vatten=True),
            # pråmarna längs stranden, en liten markör så att inget står i vägen (Stil ritar dem i skissen)
            sak('pramarna', 352, 116, 24, 10),
            sak('frukosthorn', 224, 80, 16, 12, sida='alla'),
            figur('flodbo_frukost', 196, 58, sida='alla'),
            figur('flodbo_skrattar', 268, 50, sida='alla'),
            figur('flodman', 120, 64, sida='alla'),
            figur('skepparen', 420, 92, sida='alla', talare='skepparen'),
            # kvarnen på stenfot, med dörren i söder och hjulet på västra sidan
            vagg(512, 0, 112, 72),
            utg('dorr_kvarn', 556, 72, 24, 16, riktning='upp', sida='under', till='kvarnen'),
            sak('hjul', 488, 16, 24, 56, sida='vanster', visas_forst='morgon'),
            sak('tang_hjul_1', 470, 16, 16, 16, sida='vanster'),
            sak('tang_hjul_2', 470, 36, 16, 16, sida='vanster'),
            sak('tang_hjul_3', 470, 56, 16, 16, sida='vanster'),
            sak('brygga_kvarn', 560, 100, 48, 24, golv=True),
            # ön lägger till vid bryggan (tillståndet on), och plankan syns när scenen visar den
            sak('on', 532, 148, 104, 40, sida='over'),
            sak('planka_on', 564, 124, 40, 8),
            # resan (kvall, pass 3): flaskan han håller när han sitter på skalet ute på floden
            sak('flaska_i_handen', 300, 160, 10, 10, sida='alla'),
            liv('fagel', 150, 132, 12, 12),
        ],
    },
    # En skärm, inne (Rummen 2): tavlan på bakväggen, luckan vid vattenrännan i väster och luckan i golvet vid dörren,
    # den stora säcken under säckhissen och den lilla i mitten, med en plats på (ovanpå säcken) och vid (väster om
    # den) var och en. Platserna är små markeringar, och Stil ritar dem i skissen. Säckhissen går upp till loftet (scenbytet).
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
    # Ett litet rum (99.6): luckan mot floden i bakväggen, med floden långt nedanför (där syns skuggan och ungen som
    # simmar), det stora hornet framför den och den målade skriften bredvid, och säckhissen i väster där han kommer
    # upp. Tjocka väggar, så att han står nästan stilla. hornet_skrift syns i tillståndet rent.
    'loftet': {
        'storlek': (20, 12),
        'inomhus': True,
        'vagg_bak': 64,
        'vagg_sida': 64,
        'objekt': [
            punkt('start', 120, 120),
            punkt('in_kvarnen', 104, 120),
            sak('sackhiss', 64, 96, 28, 40, sida='hoger'),
            sak('lucka_floden', 168, 6, 80, 54, sida='under', rackvidd=56),
            # Stils horn är 88 × 56 och står på rutans nederkant: klockan mot luckan, och bandet med skriften i bilden
            # på (20, 11), 31 × 8. Där står hornet_skrift, så att skylten öppnas när han går förbi hornet.
            # Hornet står så långt ned att luckan i bakväggen syns hel (skuggan och ungen som simmar syns i den).
            sak('hornet', 164, 98, 88, 22, sida='under'),
            sak('hornet_skrift', 184, 75, 31, 8, sida='under', rackvidd=56),
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
    # En skärm: sandbanken i söder och väster, och sköldpaddan som vilar i nordost med framfenan på sanden och huvudet
    # mot väster. De fyra platserna i k3_fenan är korsade: under och bakom fenan, under och bakom huvudet. Hjälten går
    # runt framdelen på sanden och upp på skalet (golv). Skalets bakre kant i öster är mörk (skalkant). I tillståndet
    # luftskepp ligger ankaret i sanden.
    'sandbanken': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 48, 150),
            vagg(0, 0, 320, 16, vatten=True), vagg(304, 16, 16, 176, vatten=True), vagg(0, 180, 304, 12, vatten=True),
            # skalet är marken han går på: i gråboxen en liten markör baktill, så att skylten och snäckorna går att nå
            sak('skoldpadda', 262, 24, 30, 14),
            sak('skylt_skal', 214, 52, 18, 12, sida='alla'),
            sak('skoldpadda_huvud', 120, 52, 36, 28, sida='alla'),
            sak('skoldpadda_fena', 150, 120, 32, 18, sida='alla'),
            sak('under_fenan', 156, 140, 16, 10, sida='alla'),
            sak('bakom_fenan', 186, 128, 14, 12, sida='alla'),
            sak('under_huvudet', 126, 84, 16, 10, sida='alla'),
            sak('bakom_huvudet', 140, 30, 14, 12, sida='alla'),
            # tången under fenan: Stils tussar är 16 breda, så de står glest (12 px emellan), så att han kan gå mellan dem
            sak('tang_1', 126, 158, 16, 14, sida='alla'), sak('tang_2', 154, 160, 16, 14, sida='alla'),
            sak('tang_3', 182, 158, 16, 14, sida='alla'),
            sak('skalkant', 284, 64, 14, 30, sida='vanster'),
            sak('fena_trappa', 182, 112, 16, 16, golv=True),
            sak('ankare', 80, 112, 24, 22, sida='alla'),
        ],
    },
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    for rum, spec in RUMMEN.items():
        text = json.dumps(karta(rum, med_bilder(spec)), ensure_ascii=False, indent=1) + '\n'
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
