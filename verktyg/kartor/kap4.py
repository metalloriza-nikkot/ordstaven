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
from kap2 import KARTOR, ROT, karta, liv, punkt, sak, utg, vagg  # noqa: E402

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

def golv_vaggar(bredd, hojd, golv, vatten=(), ruta=2):
    """Rummet som golv i rutor (x, y, b, h): allt som inte är golv eller vatten blir väggar i rutor om `ruta` pixlar
    (sammanslagna i rader och sedan i block), och vattnet blir vak (vatten). Isgrottan efter Stils plan (120.2)."""
    def inne(px, py, rutor):
        return any(x <= px < x + b and y <= py < y + h for x, y, b, h in rutor)
    rader = []
    for y in range(0, hojd, ruta):
        lopp, x0 = [], None
        for x in range(0, bredd + ruta, ruta):
            fri = x >= bredd or inne(x + ruta / 2, y + ruta / 2, golv) or inne(x + ruta / 2, y + ruta / 2, vatten)
            if not fri and x0 is None:
                x0 = x
            if fri and x0 is not None:
                lopp.append((x0, x - x0)); x0 = None
        rader.append((y, tuple(lopp)))
    ut, i = [], 0
    while i < len(rader):
        y, lopp = rader[i]
        j = i
        while j + 1 < len(rader) and rader[j + 1][1] == lopp:
            j += 1
        for x0, b in lopp:
            ut.append(vagg(x0, y, b, (j - i + 1) * ruta))
        i = j + 1
    ut += [vagg(x, y, b, h, vatten=True) for x, y, b, h in vatten]
    return ut


# Bokstavsstigens mått i rummet (Rum.visaStig): 40 pixlar per steg och 26 per rad, och stranden 17 pixlar utanför
STEG_B, RAD_H = 40, 26


def ned(dy, objekt):
    """Objekten flyttade dy pixlar nedåt."""
    return [(t, n, x, y + dy, b, h, e) for t, n, x, y, b, h, e in objekt]


def stig(pid, mitt, steg, rader, y0=0, y1=192, upp=False, x0=0, x1=640, **extra):
    """Bokstavsstigen: ankaret (rutnätets mitt) och en ravin tvärs över rummet under rutnätet, så att han bara kommer
    över på flaken. Han står på stranden till vänster när stigen börjar och på andra sidan när den är klar. Med upp
    (119.4) går stigen uppför: stegen ligger nedifrån och upp (26 pixlar per steg), raderna sida vid sida (40 per rad),
    och stupet går tvärs över rummet från x0 till x1. Han börjar nedanför och kommer upp ovanför."""
    if upp:
        ytop = mitt[1] - steg * RAD_H // 2
        return [
            sak(f'stig_{pid}', mitt[0] - 4, mitt[1] - 4, 8, 8, dekor=True, ankare=True, upp=True, **extra),
            vagg(x0, ytop - 4, x1 - x0, steg * RAD_H + 8, vatten=True),
        ]
    xa = mitt[0] - steg * STEG_B // 2
    return [
        sak(f'stig_{pid}', mitt[0] - 4, mitt[1] - 4, 8, 8, dekor=True, ankare=True, **extra),
        vagg(xa - 4, y0, steg * STEG_B + 8, y1 - y0, vatten=True),
    ]


RUMMEN = {
    # 2 × 1 skärmar (manus 21 v0.3.1): bergets fot vid floden i väster, där sköldpaddan lägger till, och stigen upp mot
    # öster. Vid gaffeln tre gamla skyltar (läsvalet i rummet), med var sin stig bakom. Stig 1 (UPP) är isade flak
    # uppför branten, med ordet på en gammal stolpe. Bakom den grottans mynning i norr, med fyra snöhögar framför. Farfars
    # sten ligger under den tredje han lyfter (sak_vid), och syns när han har lyft den. Snön rasar över mynningen (ras).
    'berget_stigen': {
        # 121.2 (0.105.0): 2 × 2 skärmar. Sluttningen ovanför mynningen är högre (y 0–108), så att luftskeppet ryms
        # ovanför blocket när Herr Skata knyter repet. Allt annat ligger som i 0.104.0, 64 pixlar längre ned.
        'storlek': (40, 24),
        'objekt': [
            vagg(0, 0, 24, 64, vatten=True), vagg(24, 0, 616, 64),
            *ned(64, [
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
                sak('skylt_issjon', 150, 284, 22, 18, sida='over'),
                # branten ned mot dalen i söder (Stil, LASMIG_skiss2, 120.1)
                vagg(24, 306, 616, 14),
                sak('skylt_eldgrottan', 96, 206, 22, 18, sida='under'),
                # stig 1 (UPP): tre steg uppför stupet och två rader sida vid sida, stupet tvärs över rummet (y 116–202)
                *stig('k4_stig1', (300, 159), 3, 2, upp=True, x0=24, x1=640, luftskepp=True),
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
            ]),
        ],
    },
    # 2 × 2 skärmar efter Stils plan A–E (120.2, `skisser/kap-04/LASMIG_skiss2.md`), kartan byggs efter planen (120.4).
    # I mörkret syns bara hjälten, ungen och stavens glimt (färgtabellen), och LJUS stänger av den.
    # A: den smala gången från starten i sydväst upp mot norr, där han skriver LJUS. F1: en kammare med bär från gången.
    # B: gemenernas vägg i en kammare i nordväst. C: salen med stig 2 (TAVLA) över vattnet, från västra stranden till D.
    # D: gåtans galleri med de tre raderna på norra väggen. F2: gången under sjön till ishyllan med isblocket och
    # fotavtrycket. E: landningen öster om D, och stig 3 (klubba) uppåt över vattnet till hyllan vid sprickan i norr.
    # F3 (121.3): istappsgrottan söder om galleriet och landningen, med Farfars ristning på västra stranden och stig 4
    # (fyra steg, tre rader) österut till tanden i isen. Den är en återvändsgränd: när stigen är klar hoppar han
    # tillbaka (tillbaka), och östra stranden når han inte från landningen.
    'berget_grottan': {
        'storlek': (40, 24),
        'objekt': [
            punkt('start', 42, 372),
            punkt('regi_spricka', 558, 22),
            # där han står när pass 3 börjar (landningen vid stig 3), och vid ristningen i F3 efter en omstart
            punkt('regi_hjalte_k4s04_utvagen', 540, 280),
            punkt('regi_hjalte_k4s03_tanden', 424, 330),
            *golv_vaggar(640, 384, golv=[
                # A, gången
                (24, 330, 36, 54), (28, 200, 28, 132), (28, 196, 96, 26), (96, 120, 28, 100),
                # F1
                (56, 272, 48, 22), (100, 250, 44, 60),
                # B
                (52, 62, 130, 62),
                # C, västra stranden
                (160, 90, 22, 220),
                # D
                (378, 64, 108, 232),
                # F2
                (382, 296, 28, 70), (214, 340, 196, 26), (214, 322, 90, 20),
                # E, landningen, hyllan vid sprickan och nischen
                (486, 246, 140, 50), (494, 30, 132, 52), (536, 10, 44, 20),
                # F3: västra stranden (från galleriet) och östra stranden (vägg mot landningen)
                (414, 296, 22, 88), (600, 302, 26, 82),
            ], vatten=[
                # C, salen: stig 2 tvärs över, och E: stig 3 uppåt (vattnet är rutnätets höjd, 119.4)
                (182, 96, 196, 214), (486, 82, 140, 164),
            ]),
            # B: gemenernas vägg (Farfars par, versal och gemen, på läsplattan)
            sak('vagg_gemener', 96, 62, 40, 10, sida='under'),
            # F1: isfickan med frusna bär (Innehålls isficka_bar, frivilligt)
            sak('isficka_bar', 116, 286, 12, 10, sida='alla'),
            # C: stig 2 (TAVLA), fem steg och tre rader, från västra stranden till galleriet
            sak('stig_k4_stig2', 276, 196, 8, 8, dekor=True, ankare=True),
            # D: gåtans tre rader på norra väggen, glimtar i isen (texten står på läsplattan)
            sak('gata_1', 386, 64, 24, 10, sida='under'),
            sak('gata_2', 422, 64, 24, 10, sida='under'),
            sak('gata_3', 458, 64, 24, 10, sida='under'),
            # F2: ishyllan med isblocket, och fotavtrycket under blocket (hemligheten)
            sak('ishylla', 222, 322, 74, 8, sida='under'),
            sak('isblock', 246, 326, 24, 14, sida='alla'),
            sak('fotavtryck', 244, 328, 28, 14, sida='alla'),
            # E: väggen med vägen ut, och gåtans rad igen (dold, hjälptrappan visar den)
            sak('vagg_ut', 492, 288, 24, 8, sida='over'),
            sak('gata_3_igen', 520, 288, 24, 8, sida='over'),
            # E: stig 3 (klubba) uppåt, sex steg och tre rader, från landningen till hyllan vid sprickan
            sak('stig_k4_stig3', 552, 160, 8, 8, dekor=True, ankare=True, upp=True),
            # sprickan i nischen i norr, och utgången när isen är uppslagen (ut)
            sak('spricka', 548, 10, 24, 16, sida='under'),
            sak('utgang_stenfalt', 548, 0, 24, 14, sida='under'),
            # F3: Farfars ristning av en tand på västra stranden, stig 4 (tand) österut, och tanden i isen längst in
            sak('ristning_tand', 408, 318, 6, 18, sida='hoger'),
            *stig('k4_stig4', (520, 342), 4, 3, 296, 384, tillbaka=True),
            sak('tand_isen', 604, 304, 20, 12, sida='under'),
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
            # Stils väggar (LASMIG_skiss2, 120.1): molnhavet i norr, kanten i öster och söder, och klippan i väster
            vagg(0, 0, 320, 26), vagg(304, 26, 16, 166), vagg(0, 176, 304, 16), vagg(0, 56, 46, 66),
            sak('sten_varm', 70, 60, 26, 20, sida='alla'),
            sak('sten_taggar', 140, 46, 26, 20, sida='alla'),
            sak('sten_is', 210, 70, 26, 20, sida='alla'),
            sak('halet', 240, 130, 30, 18, sida='alla'),
            sak('sten_klubba', 110, 120, 26, 20, sida='alla'),
            sak('lada_farfar', 114, 148, 18, 12, sida='alla'),
            sak('luftskepp_borta', 262, 14, 40, 20, dekor=True, ankare=True),
            sak('stig_molnkanten', 160, 26, 30, 16, sida='under'),
        ],
    },
}


# Föremål som kartan har innan Innehålls data har dem: de skrivs i kartan först när kap-04.json har dem (föremålet i
# rummets innehåll), så att kontrollen är grön.
VANTAR_PA_DATA = {'vagg_gemener', 'isficka_bar', 'ristning_tand', 'tand_isen', 'stig_k4_stig4', 'hylla', 'klippa', 'klippan_uppe'}


def finns_i_datan():
    """Id:n i kap-04.json: föremålen i rummens innehåll, rummen (som in_<rum>) och utgångarna."""
    d = json.loads((ROT / 'content' / 'den-gomda-dalen' / 'kap-04.json').read_text(encoding='utf-8'))
    ids = set()
    for r in d.get('rum', []):
        ids.add('in_' + r['id'])
        for x in r.get('innehall', []):
            ids.add(x['id'] if isinstance(x, dict) else x)
    ids |= {f"stig_{p['id']}" for p in d.get('pussel', [])}
    return ids, {r['id'] for r in d.get('rum', [])}


# 121.4: stenfältet uppe på en klippa (320 × 320). Nere: hyllan (hylla) där han kommer ut ur sprickan (start), under
# en hög klippa av blank is (klippa, ett hinder). Han skriver en formel (STEGE, REP eller TRAPPA, Innehålls k4_klippan),
# rummet byter till dag, och vägen upp (klippan_uppe, syns i dag och kvall) skär igenom klippan. Uppe: stenfältet som
# förut, med Stils väggar. Skrivs i stället för stenfältet ovan när kap-04 har klippan_uppe.
STENFALT_KLIPPA = {
    'storlek': (20, 20),
    'objekt': [
        punkt('start', 40, 290),
        punkt('regi_luftskepp', 250, 30),
        punkt('regi_driva', 270, 70),
        punkt('regi_klippan', 156, 206),
        # uppe på stenfältet när scenen efter klippan börjar (omstart)
        punkt('regi_hjalte_k4s05_stenfaltet', 60, 150),
        # uppe: molnhavet i norr, kanten i öster och klippan i väster (Stils väggar, 120.1)
        vagg(0, 0, 320, 26), vagg(304, 26, 16, 294), vagg(0, 56, 46, 66),
        sak('sten_varm', 70, 60, 26, 20, sida='alla'),
        sak('sten_taggar', 140, 46, 26, 20, sida='alla'),
        sak('sten_is', 210, 70, 26, 20, sida='alla'),
        sak('halet', 240, 130, 30, 18, sida='alla'),
        sak('sten_klubba', 110, 120, 26, 20, sida='alla'),
        sak('lada_farfar', 114, 148, 18, 12, sida='alla'),
        sak('luftskepp_borta', 262, 14, 40, 20, dekor=True, ankare=True),
        sak('stig_molnkanten', 160, 26, 30, 16, sida='under'),
        # den isade klippan tvärs över (y 180–240), och vägen upp när formeln är skriven
        sak('klippa', 0, 180, 304, 60, sida='under'),
        sak('klippan_uppe', 140, 176, 32, 68, golv=True, oppning=True),
        # nere: hyllan, och branten ned mot dalen i söder
        sak('hylla', 0, 240, 304, 64, golv=True),
        vagg(0, 304, 304, 16),
    ],
}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--prova', action='store_true', help='skriv ingenting, säg bara om något skulle ändras')
    a = ap.parse_args()
    andrade = []
    ids, rummen = finns_i_datan()
    alla = dict(RUMMEN)
    if 'klippan_uppe' in ids:
        alla['berget_stenfalt'] = STENFALT_KLIPPA
    for rum, spec in alla.items():
        if rum not in rummen and rum != 'berget_stigen':
            continue
        spec = {**spec, 'objekt': [o for o in spec['objekt'] if o[1] not in VANTAR_PA_DATA or o[1] in ids]}
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
