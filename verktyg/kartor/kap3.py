#!/usr/bin/env python3
"""Kapitel 3:s kartor i gråbox (beslut 87.9.3, steg 1), efter Innehålls anteckningar i kap-03.json (rummens `anteckning`).

Skriver tre Tiled-kartor i kartor/den-gomda-dalen/: floden (2 × 1 skärmar), on (ön, en skärm) och sandbanken (en
skärm). Kartorna har bara id:n, aldrig text som spelaren läser. Hjälparna (utg, sak, figur, vagg, punkt, liv och
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
    # Västra skärmen: stigen från träsket in från norr, sand och gräs, och floden bred och tom i söder. Östra skärmen:
    # pråmarna i rad ute i vattnet med plankor emellan (golv), skepparens pråm längst ut med hornet i aktern och den
    # målade stenen bredvid. I tillståndet on ligger ön vid pråmen med tången som en gardin från kanten, och plankan
    # till ön syns när tången är huggen. Kameran glider över hornet och stenen när han kommer in (79.3).
    'floden': {
        'storlek': (40, 12),
        'objekt': [
            utg('stig_trasket', 40, 0, 28, 36, **STIG, riktning='upp'),
            punkt('start', 54, 56),
            # floden: hela södra halvan, utom pråmarna
            vagg(0, 104, 344, 88, vatten=True),
            vagg(344, 152, 296, 40, vatten=True),
            vagg(600, 104, 40, 48, vatten=True),
            # pråmarna i rad med plankor emellan: golv ute i vattnet, från stranden
            sak('pramarna', 344, 104, 256, 48, golv=True),
            figur('flodman', 396, 108, sida='alla'),
            figur('skepparen', 548, 104, sida='alla', talare='skepparen'),
            sak('hornet', 576, 112, 14, 12, sida='alla', visas_forst='morgon'),
            sak('sten_horn', 520, 92, 14, 12, sida='alla'),
            # ön stiger söder om skepparens pråm (tillståndet on): i vattnet, och tången hänger från kanten mot pråmen
            sak('on', 472, 160, 120, 32, sida='over'),
            sak('tang_gardin', 512, 152, 56, 8, sida='over', golv=True),
            sak('planka_on', 532, 152, 16, 8, golv=True),
            # resan (kvall, pass 3): flaskan han håller när han sitter på skalet ute på floden
            sak('flaska_i_handen', 300, 160, 10, 10, sida='alla'),
            liv('fagel', 210, 132, 12, 12),
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
            sak('tuva_5', 148, 96, 24, 16, sida='alla'),
            sak('litet_trad', 148, 30, 24, 28, sida='under'),
            sak('skylt_skal', 152, 64, 18, 12, sida='alla'),
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
            sak('skoldpadda', 160, 24, 136, 104, golv=True),
            sak('skylt_skal', 214, 52, 18, 12, sida='alla'),
            sak('snacka_1', 210, 66, 6, 6, sida='alla'), sak('snacka_2', 218, 66, 6, 6, sida='alla'),
            sak('snacka_3', 226, 66, 6, 6, sida='alla'), sak('snacka_4', 234, 66, 6, 6, sida='alla'),
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
