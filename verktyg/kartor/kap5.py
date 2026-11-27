#!/usr/bin/env python3
"""Kapitel 5:s kartor i gråbox (beslut 139.8), efter Innehålls anteckningar i kap-05.json (rummens `anteckning`).

Skriver fem kartor i kartor/den-gomda-dalen/: dal_molnkant (2 × 1 skärmar), dal_dimman (2 × 2), dal_roten (2 × 1),
dal_glantan (2 × 2) och dal_dalen (3 × 1). De större rummen är ett undantag för finalen (139.3), som berget i kapitel 4.
Kartorna har bara id:n, aldrig text som spelaren läser. Stil skissar ovanpå skärmdumparna när gråboxen är spelad
(kedjan i 07, steg 4), och ritar mot den kartversion som Teknik namnger.

Mästarprovet (k5_rad1–3): de fyra stigarna i gläntan ryms på en skärm (ett läsval ryms alltid på en skärm), och varje
drag syns i gråboxen: vattnet i väster vid stig A, stenarna som grå block vid stigens början, och blommorna bakom
stenarna (blå eller gula, objektFarg). Varje drag finns på tre av fyra stigar.

    python3 verktyg/kartor/kap5.py [--prova]

Med --prova skrivs ingenting, men skriptet säger om någon karta skulle ändras.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kap2 import KARTOR, ROT, karta, liv, punkt, sak, utg, vagg  # noqa: E402

RUMSBILDER = ROT / 'assets' / 'rum' / 'kap-05'


def figur(namn, x, y, b=16, h=24, **e):
    """En figur i gråbox (baronen har Stils bilder). Mamma är större (ca två och en halv gånger ungen)."""
    return ('figur', namn, x, y, b, h, e)


def trad(x, y, b=20, h=14):
    """Ett träd i dimman: en vägg vid stammen och en mörk skugga ovanför (gråboxens trad_)."""
    return [vagg(x, y, b, h), sak(f'trad_{x}_{y}', x - 4, y - 26, b + 8, 26, dekor=True)]


def stig(bokstav, cx, stenar, bla, vatten=False):
    """En av gläntans fyra stigar: stigen norrut från vägskälet (stig_<bokstav>, där han trycker), stenarna vid
    början (grå block, en eller två), och blommorna bakom dem (blå eller gula). Vattnet ritas för sig."""
    ut = [sak(f'stig_{bokstav}', cx - 9, 34, 18, 62, sida='under', golv=True)]
    xs = [cx - 22, cx + 12] if stenar == 2 else [cx + 12]
    for i, x in enumerate(xs, 1):
        ut.append(vagg(x, 86, 10, 10))
        ut.append(sak(f'stor_sten_{bokstav}{i}', x, 80, 10, 16, dekor=True))
        ut.append(sak(f'blommor_{"bla" if bla else "gul"}_{bokstav}{i}', x - 1, 70, 12, 8, dekor=True))
    return ut


RUMMEN = {
    # 2 × 1. Masten med luftskeppet i väster, klippkanten med molnhavet i söder, och skylten BARONENS DAL i öster
    # framför den grå dimman, med baronen framför skylten. Fäktningens scen är kanten: baronen backar mot skylten.
    'dal_molnkant': {
        'storlek': (40, 12),
        'objekt': [
            punkt('start', 48, 120),
            # molnhavet nedanför kanten (söder), och klipporna i norr
            vagg(0, 160, 640, 32, vatten=True), sak('moln_havet', 0, 162, 640, 30, dekor=True),
            vagg(0, 0, 640, 24),
            # den grå dimman i öster, bakom skylten
            vagg(600, 24, 40, 136), sak('dimman_ost', 596, 24, 44, 136, dekor=True),
            sak('mast_luftskepp', 40, 40, 12, 40, sida='alla'),
            sak('skylt_luftskeppet', 64, 66, 14, 12, sida='alla'),
            sak('skylt_baronens_dal', 548, 60, 16, 14, sida='under'),
            figur('baronen_molnkant', 520, 92, bild='baronen_ga_vanster_01', skugga=True, sida='alla', talare='baronen'),
            sak('bit_baronen', 500, 120, 10, 8, sida='alla'),
            # det baronen pekar på i fäktningen (bildkorten), dolda i rummet
            *(sak(n, 470 + 8 * i, 30, 6, 6, sida='alla') for i, n in enumerate(
                ('bubbla_skolan', 'spindel_baronen', 'hatten_platt', 'stovlarna_pol', 'bit_baronen_upp', 'bit_upp_och_ner'))),
            liv('fagel', 300, 40, 12, 12),
        ],
    },
    # 2 × 2, söder till norr. Han kommer in i söder. Diset (dis) är grått och disigt, och LJUS byter till ljus: då syns
    # fotspåren, baronens skylt och busken med Herr Skatas bo (hemligheten). Spåren tar slut vid hatten i norr, och
    # utgången till roten ligger där.
    'dal_dimman': {
        'storlek': (40, 24),
        'objekt': [
            punkt('start', 320, 356),
            *trad(80, 300), *trad(200, 320), *trad(470, 330), *trad(560, 280), *trad(120, 200), *trad(420, 230),
            *trad(240, 160), *trad(520, 150), *trad(90, 90), *trad(380, 90), *trad(580, 60),
            vagg(0, 0, 280, 20), vagg(340, 0, 300, 20),
            sak('fotspar', 300, 140, 40, 200, golv=True),
            sak('skylt_baronen_var_har', 268, 250, 14, 12, sida='alla'),
            sak('hatt_baronen', 304, 96, 14, 10, sida='alla'),
            # Herr Skatas bo i en buske österut (hemligheten k5s02_gomman)
            vagg(560, 196, 44, 20), sak('buske_skata', 560, 196, 44, 20, sida='under', lockradie=110),
            # sakerna i boet ligger en bit söder om busken, så att han kan stå framför den
            sak('skatbo_sked', 540, 240, 12, 10, sida='alla'),
            sak('skatbo_nyckel', 576, 248, 12, 10, sida='alla'),
            sak('skatbo_fjader', 612, 240, 12, 10, sida='alla'),
            sak('medalj_baronen', 612, 256, 10, 8, sida='alla'),
            utg('utgang_roten', 284, 0, 52, 20, golv=True, riktning='upp', till='dal_roten'),
        ],
    },
    # 2 × 1. Den jättelika roten med svart bark i öster: baronen högst uppe, vägen upp (rot_upp) och hålet under
    # (rot_under), där gången till gläntan går in. Farfars gamla läger i väster: eldstaden, duken med stenen på, och
    # ristningen i barken (hemligheten k5s03_lagret), som går att nå innan han kryper under roten.
    'dal_roten': {
        'storlek': (40, 12),
        'objekt': [
            punkt('start', 320, 176),
            vagg(0, 0, 640, 16), vagg(620, 16, 20, 176),
            # roten: en vägg av svart bark, med hålet under och vägen upp på västra sidan
            vagg(380, 16, 200, 100), sak('roten_bark', 380, 16, 200, 100, dekor=True),
            # baronen sitter högst uppe på roten, och när STEGE har fått ned honom står han vid rotens fot (plats_sedan)
            figur('baronen_rot', 470, 22, bild='baronen_ga_ner_01', skugga=True, sida='alla', talare='baronen', plats_sedan='340,104', sedan='k5_stege'),
            sak('rot_upp', 366, 60, 14, 40, sida='vanster'),
            sak('rot_under', 452, 116, 36, 12, sida='under'),
            utg('gang_glantan', 458, 104, 24, 12, golv=True, riktning='upp', till='dal_glantan'),
            # lägret i väster
            vagg(24, 40, 18, 30), sak('ristning_lagret', 24, 40, 18, 30, sida='hoger'),
            sak('lagret', 90, 84, 30, 20, sida='alla', lockradie=110),
            sak('duken', 136, 92, 26, 16, sida='alla'),
            sak('sten_duken', 142, 88, 14, 10, sida='alla'),
            sak('farfars_teckning', 140, 98, 12, 8, sida='alla'),
            liv('fagel', 260, 40, 12, 12),
        ],
    },
    # 2 × 2. Söder: en lång slingrande väg genom vit dimma (dimma), där ungen leder. Vägskälet (glantan_mitt) och
    # gläntan med de fyra stigarna i norr, inom en skärm. A går tätt intill vattnet mellan två stenar med blå blommor,
    # B två stenar och gula blommor, C en sten och blå blommor, D två stenar och blå blommor. Stig D leder ut.
    'dal_glantan': {
        'storlek': (40, 24),
        'objekt': [
            punkt('start', 560, 360),
            # den slingrande vägen: väggar av dimma och snår som gör att vägen går i S
            vagg(0, 300, 500, 20), vagg(140, 230, 500, 20), vagg(0, 160, 160, 20), vagg(480, 160, 160, 20),
            vagg(0, 0, 160, 160), vagg(480, 0, 160, 160),
            sak('glantan_mitt', 310, 132, 20, 12, sida='alla', golv=True),
            sak('bit_marken', 300, 150, 10, 8, sida='alla'),
            # vattnet i väster vid stig A
            vagg(160, 20, 20, 100, vatten=True), sak('vattnet', 160, 20, 20, 100, sida='hoger'),
            vagg(160, 0, 320, 20),
            *stig('a', 205, 2, bla=True, vatten=True),
            *stig('b', 275, 2, bla=False),
            *stig('c', 345, 1, bla=True),
            *stig('d', 415, 2, bla=True),
        ],
    },
    # 3 × 1. Ordträdet i mitten, tre bon en bit isär med var sin vuxen (grön långhals, blå taggrygg och röd hornnos),
    # och frostiga ägg längre bort. Mamma vid trädet. Hjälten går österut mot molnen (molnen_ut) i avskedet.
    'dal_dalen': {
        'storlek': (60, 12),
        'objekt': [
            punkt('start', 48, 120),
            vagg(0, 0, 960, 20), vagg(0, 172, 960, 20),
            vagg(452, 20, 60, 60), sak('ordtradet', 452, 20, 60, 60, sida='under'),
            figur('mamma', 380, 76, 56, 40, sida='alla'),
            sak('bo_langhals', 200, 70, 28, 16, sida='alla'),
            sak('bo_taggrygg', 620, 70, 28, 16, sida='alla'),
            sak('bo_hornnos', 780, 120, 28, 16, sida='alla'),
            sak('lovet', 420, 140, 10, 8, sida='alla'),
            *(sak(f'agg_frost_{i}', x, y, 10, 12, dekor=True) for i, (x, y) in enumerate(
                ((120, 40), (300, 150), (560, 140), (700, 40), (880, 60), (900, 150)), 1)),
            utg('molnen_ut', 936, 80, 24, 40, golv=True, riktning='hoger'),
        ],
    },
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    for rum, spec in RUMMEN.items():
        text = json.dumps(karta(rum, spec, rumsbilder=RUMSBILDER, i_bilden=set(), foremalsbilder={}, over_som_vagg=False), ensure_ascii=False, indent=1) + '\n'
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
