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

# Flodfolket (16 × 24) som figurer utan Stils bilder än: skepparen och en flodman på pråmarna.
FIGUR_B, FIGUR_H = 16, 24


def figur(namn, x, y, **e):
    return ('figur', namn, x, y, FIGUR_B, FIGUR_H, e)


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
            sak('frukosthorn', 226, 82, 12, 10, sida='alla'),
            figur('flodbo_frukost', 196, 58, sida='alla'),
            figur('flodbo_skrattar', 268, 50, sida='alla'),
            figur('flodman', 120, 64, sida='alla'),
            figur('skepparen', 420, 92, sida='alla', talare='skepparen'),
            # kvarnen på stenfot, med dörren i söder och hjulet på västra sidan
            vagg(512, 0, 112, 72),
            utg('dorr_kvarn', 556, 72, 24, 16, riktning='upp', sida='under', till='kvarnen'),
            sak('hjul', 488, 16, 24, 56, sida='vanster', visas_forst='morgon'),
            sak('tang_hjul_1', 470, 20, 14, 12, sida='vanster'),
            sak('tang_hjul_2', 470, 38, 14, 12, sida='vanster'),
            sak('tang_hjul_3', 470, 56, 14, 12, sida='vanster'),
            sak('brygga_kvarn', 560, 100, 48, 24, golv=True),
            # ön lägger till vid bryggan (tillståndet on), och plankan syns när scenen visar den
            sak('on', 528, 148, 112, 40, sida='over'),
            sak('planka_on', 576, 124, 16, 8),
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
            sak('tavla_kvarn', 128, 8, 64, 30, sida='under', rackvidd=56),
            vagg(32, 48, 16, 56, vatten=True),
            sak('lucka_vatten', 48, 72, 14, 18, sida='hoger'),
            sak('lucka_dorr', 96, 152, 22, 14, sida='alla'),
            sak('sackhiss', 248, 48, 40, 24, sida='under'),
            sak('sack_stor', 240, 104, 32, 22),
            sak('pa_stora', 250, 92, 12, 10, sida='alla'),
            sak('vid_stora', 222, 110, 12, 10, sida='alla'),
            sak('sack_liten', 160, 104, 18, 14),
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
            sak('sackhiss', 64, 96, 24, 40, sida='hoger'),
            sak('lucka_floden', 168, 6, 80, 54, sida='under', rackvidd=56),
            sak('hornet', 192, 66, 40, 26, sida='under'),
            sak('hornet_skrift', 156, 72, 28, 12, sida='alla'),
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
            sak('tuva_1', 64, 48, 24, 16, sida='alla'),
            sak('tuva_2', 220, 44, 24, 16, sida='alla'),
            sak('tuva_3', 76, 128, 24, 16, sida='alla'),
            sak('tuva_4', 232, 120, 24, 16, sida='alla'),
            sak('tuva_5', 148, 132, 24, 16, sida='alla'),
            sak('litet_trad', 148, 30, 24, 28, sida='under'),
            sak('skylt_skal', 152, 64, 18, 12, sida='alla'),
            # snäckorna under ordet på skylten (manus 19 v0.4.1: på ön i pass 2)
            sak('snacka_1', 146, 80, 6, 6, sida='alla'), sak('snacka_2', 154, 80, 6, 6, sida='alla'),
            sak('snacka_3', 162, 80, 6, 6, sida='alla'), sak('snacka_4', 170, 80, 6, 6, sida='alla'),
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
            sak('tang_1', 140, 156, 10, 10, sida='alla'), sak('tang_2', 158, 158, 10, 10, sida='alla'),
            sak('tang_3', 176, 156, 10, 10, sida='alla'),
            sak('skalkant', 284, 64, 14, 30, sida='vanster'),
            sak('fena_trappa', 182, 112, 16, 16, golv=True),
            sak('ankare', 84, 120, 14, 14, sida='alla'),
        ],
    },
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    for rum, spec in RUMMEN.items():
        text = json.dumps(karta(rum, spec), ensure_ascii=False, indent=1) + '\n'
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
