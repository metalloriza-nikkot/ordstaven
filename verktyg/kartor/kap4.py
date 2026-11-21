#!/usr/bin/env python3
"""Kapitel 4:s kartor i gråbox (beslut 118.4), efter Innehålls anteckningar i kap-04.json v0.1 (rummens `anteckning`).

Skriver tre Tiled-kartor i kartor/den-gomda-dalen/: berget_stigen (2 × 1 skärmar), berget_grottan (2 × 2 skärmar) och
berget_stenfalt (en skärm). Kartorna har bara id:n, aldrig text som spelaren läser. Bokstavsstigarna står där kartan har
stig_<pusslets id> (rutnätets mitt), och en ravin eller vak går tvärs över rummet där, så att han bara kommer över på
stigen. Rutnätet är 40 pixlar per kolumn och 26 per rad (Rum.visaStig), med stranden 17 pixlar utanför på båda sidor.
Isgrottan är 2 × 2 skärmar (ett rum är högst så stort): stig 2 och gåtans väggar i den övre halvan, och ishyllan och stig 3
(sex kolumner) i den nedre, eftersom de inte ryms bredvid varandra.
Hjälparna är desamma som i kap2.py. Stil skissar ovanpå skärmdumparna när gråboxen är spelad (kedjan i 07, steg 4).

    python3 verktyg/kartor/kap4.py [--prova]

Med --prova skrivs ingenting, men skriptet säger om någon karta skulle ändras.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kap2 import KARTOR, ROT, karta, liv, punkt, sak, vagg  # noqa: E402

RUMSBILDER = ROT / 'assets' / 'rum' / 'kap-04'
I_BILDEN = set()

# Stils föremål för kapitel 4 (LASMIG_114 och 118): kartans id → bildens egenskaper. Bilden står på föremålets
# nederkant, mitt i. Rummen är gråbox tills Stil ritar dem mot kartversionen, så bilderna sätts här (som i kap3.py).
FOREMALSBILDER = {
    # de fem platserna på stenfältet (40 × 32): de varma ångar, ca 500 ms per bild
    'sten_varm': {'bild': 'sten_varm_slat_01', 'bild_anim': 'sten_varm_slat_01,sten_varm_slat_02', 'anim_ms': 500},
    'sten_taggar': {'bild': 'sten_varm_taggsvans_01', 'bild_anim': 'sten_varm_taggsvans_01,sten_varm_taggsvans_02', 'anim_ms': 500},
    'sten_is': {'bild': 'sten_kall_klubbsvans'},
    'halet': {'bild': 'sten_hal'},
    'sten_klubba': {'bild': 'sten_varm_klubbsvans_01', 'bild_anim': 'sten_varm_klubbsvans_01,sten_varm_klubbsvans_02', 'anim_ms': 500},
    # Farfars låda under den speciella stenen (118.5)
    'lada_farfar': {'bild': 'lada_farfar_stangd'},
    # ishyllan: det tunga isblocket som glittrar, och avtrycket under det (118.5)
    'isblock': {'bild': 'isblock_hylla_01', 'bild_anim': 'isblock_hylla_01,isblock_hylla_02', 'anim_ms': 500},
    'fotavtryck': {'bild': 'fotavtryck_is'},
    # grottans utgång: isväggen med sprickan och dagsljuset
    'spricka': {'bild': 'isvagg_spricka'},
    # snön som har rasat över mynningen (tillståndet ras)
    'ras_mynningen': {'bild': 'mynning_igenrasad'},
}


def med_bilder(spec):
    """Rummets objekt med Stils bilder (FOREMALSBILDER) inlagda."""
    return {**spec, 'objekt': [(t, n, x, y, b, h, {**e, **FOREMALSBILDER.get(n, {})}) for t, n, x, y, b, h, e in spec['objekt']]}

# Bokstavsstigens mått i rummet (Rum.visaStig): 40 pixlar per steg och 26 per rad, och stranden 17 pixlar utanför
STEG_B, RAD_H = 40, 26


def stig(pid, mitt, steg, rader, y0=0, y1=192, upp=False, x0=0, x1=640):
    """Bokstavsstigen: ankaret (rutnätets mitt) och en ravin tvärs över rummet under rutnätet, så att han bara kommer
    över på flaken. Han står på stranden till vänster när stigen börjar och på andra sidan när den är klar. Med upp
    (119.4) går stigen uppför: stegen ligger nedifrån och upp (26 pixlar per steg), raderna sida vid sida (40 per rad),
    och stupet går tvärs över rummet från x0 till x1. Han börjar nedanför och kommer upp ovanför."""
    if upp:
        ytop = mitt[1] - steg * RAD_H // 2
        return [
            sak(f'stig_{pid}', mitt[0] - 4, mitt[1] - 4, 8, 8, dekor=True, ankare=True, upp=True),
            vagg(x0, ytop - 4, x1 - x0, steg * RAD_H + 8, vatten=True),
        ]
    xa = mitt[0] - steg * STEG_B // 2
    return [
        sak(f'stig_{pid}', mitt[0] - 4, mitt[1] - 4, 8, 8, dekor=True, ankare=True),
        vagg(xa - 4, y0, steg * STEG_B + 8, y1 - y0, vatten=True),
    ]


RUMMEN = {
    # 2 × 1 skärmar (manus 21 v0.3.1): bergets fot vid floden i väster, där sköldpaddan lägger till, och stigen upp mot
    # öster. Vid gaffeln tre gamla skyltar (läsvalet i rummet), med var sin stig bakom. Stig 1 (UPP) är isade flak
    # uppför branten, med ordet på en gammal stolpe. Bakom den grottans mynning i norr, med fyra snöhögar framför. Farfars
    # sten ligger under den tredje han lyfter (sak_vid), och syns när han har lyft den. Snön rasar över mynningen (ras).
    'berget_stigen': {
        # 119.4 (granskning 10 punkt 5 och 14): två skärmar högt. Nedre halvan: floden i väster och gaffeln med de tre
        # skyltarna. Tvärs över rummet går det isade stupet, och stig 1 (UPP) går uppför det. Övre halvan: snöhögarna,
        # Farfars sten och grottans mynning i nordöstra hörnet, och ovanför mynningen sluttningen upp mot stenfältet,
        # där baronens block står. Snöraset syns i ett svep från blocket till snön över mynningen.
        'storlek': (40, 20),
        'objekt': [
            punkt('start', 48, 280),
            punkt('regi_floden', 16, 296),
            punkt('regi_toppen', 470, 6),
            punkt('regi_block', 540, 32),
            punkt('regi_snon', 584, 40),
            # floden i väster
            vagg(0, 0, 24, 320, vatten=True),
            sak('stig_floden', 24, 280, 20, 30, dekor=True),
            # gaffeln: tre skyltar, ISGROTTAN mot stupet och de andra två mot var sitt håll
            sak('skylt_isgrottan', 170, 236, 22, 18, sida='under'),
            sak('skylt_issjon', 150, 292, 22, 18, sida='over'),
            sak('skylt_eldgrottan', 96, 206, 22, 18, sida='under'),
            # stig 1 (UPP): tre steg uppför stupet och två rader sida vid sida, stupet tvärs över rummet (y 116–202)
            *stig('k4_stig1', (300, 159), 3, 2, upp=True, x0=24, x1=640),
            # övre halvan: sluttningen mot stenfältet (där blocket står) är brant, och mynningen ligger i nordöstra
            # hörnet under den, med snöhögarna framför. Farfars sten under den tredje (dold tills han har lyft den)
            vagg(24, 0, 616, 44),
            vagg(24, 44, 504, 20),
            sak('mynningen', 552, 48, 64, 28, sida='under'),
            sak('ras_mynningen', 552, 50, 64, 26, sida='under'),
            sak('snohog_1', 380, 74, 24, 16, sida='alla'),
            sak('snohog_2', 450, 92, 24, 16, sida='alla'),
            sak('snohog_3', 540, 92, 24, 16, sida='alla'),
            sak('snohog_4', 600, 96, 24, 16, sida='alla'),
            sak('sten_farfar', 470, 70, 22, 14, sida='alla'),
            liv('fagel', 200, 236, 12, 12),
        ],
    },
    # 2 × 2 skärmar: i mörkret syns bara hjälten, ungen och stavens glimt (färgtabellen, 113.8), och LJUS stänger av
    # den. Övre halvan: stig 2 (TAVLA, fem steg) är golvet över en vak, och bortom den står Farfars tre skrifter på
    # norra väggen. En öppning mitt i golvet leder ned. Nedre halvan: ishyllan med isblocket (och fotavtrycket under)
    # i väster, väggen med GÅ PÅ DET SOM SVANSEN HAR. (gåtans rad kommer i hjälptrappan, 119.4), och stig 3 (klubba, sex
    # steg) över den sista vaken till sprickan i sydost, där ungen slår upp isen. Sprickan nås bara över stig 3.
    'berget_grottan': {
        'storlek': (40, 24),
        'objekt': [
            punkt('start', 40, 110),
            punkt('regi_spricka', 616, 290),
            # övre halvan: stig 2 (TAVLA), fem steg och tre rader, mitt i x 200 (vaken x 96–304)
            *stig('k4_stig2', (200, 96), 5, 3, 0, 184),
            # gåtans tre skrifter på norra väggen, glimtar i isen (texten står på läsplattan)
            vagg(304, 0, 336, 14),
            sak('gata_1', 352, 14, 24, 10, sida='under'),
            sak('gata_2', 436, 14, 24, 10, sida='under'),
            sak('gata_3', 520, 14, 24, 10, sida='under'),
            # golvet mellan halvorna, med en öppning ned vid x 304–336
            vagg(0, 184, 304, 16), vagg(336, 184, 304, 16),
            # nedre halvan: ishyllan i sydväst med isblocket, och fotavtrycket under blocket (hemligheten)
            vagg(0, 368, 336, 16),
            sak('ishylla', 60, 344, 72, 16, sida='over'),
            sak('isblock', 84, 320, 24, 18, sida='alla'),
            sak('fotavtryck', 80, 324, 28, 14, sida='alla'),
            # vid stig 3: väggen med vägen ut. Gåtans rad står inte längre bredvid (119.4): den kommer i hjälptrappan
            sak('vagg_ut', 220, 200, 24, 10, sida='under'),
            # gåtans rad igen: dold från början (Innehåll pass 119), och hjälptrappan visar den efter två fel
            sak('gata_3_igen', 268, 200, 24, 10, sida='under'),
            # stig 3 (klubba): sex steg och tre rader, mitt i x 460 (vaken x 336–584)
            *stig('k4_stig3', (460, 290), 6, 3, 200, 384),
            # sprickan i sydost, i en ficka som bara nås över stig 3, och utgången när isen är uppslagen (ut)
            sak('spricka', 624, 270, 16, 40, sida='vanster'),
            sak('utgang_stenfalt', 620, 266, 20, 48, sida='vanster'),
        ],
    },
    # En skärm: fyra stenar och hålet där baronens block stod, med hans orange rep vid kanten (116.5). Lådan ligger
    # dold under den speciella stenen (sten_klubba) tills han har valt den. Luftskeppet hänger i snön i nordost, och
    # stigen mot molnkanten går upp längs bergskammen i norr.
    'berget_stenfalt': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 30, 150),
            punkt('regi_luftskepp', 250, 30),
            punkt('regi_driva', 270, 70),
            vagg(0, 0, 320, 12),
            sak('sten_varm', 70, 60, 26, 20, sida='alla'),
            sak('sten_taggar', 140, 46, 26, 20, sida='alla'),
            sak('sten_is', 210, 70, 26, 20, sida='alla'),
            sak('halet', 240, 130, 30, 18, sida='alla'),
            sak('sten_klubba', 110, 120, 26, 20, sida='alla'),
            sak('lada_farfar', 114, 148, 18, 12, sida='alla'),
            sak('luftskepp_borta', 262, 14, 40, 20, dekor=True, ankare=True),
            sak('stig_molnkanten', 160, 12, 30, 16, sida='under'),
        ],
    },
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    for rum, spec in RUMMEN.items():
        text = json.dumps(karta(rum, med_bilder(spec), rumsbilder=RUMSBILDER, i_bilden=I_BILDEN, foremalsbilder={}, over_som_vagg=False), ensure_ascii=False, indent=1) + '\n'
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
