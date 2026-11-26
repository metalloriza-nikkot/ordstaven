#!/usr/bin/env python3
"""Kapitel 4:s kartor i gråbox (beslut 118.4), efter Innehålls anteckningar i kap-04.json v0.1 (rummens `anteckning`).

Skriver kapitlets kartor i kartor/den-gomda-dalen/: berget_stigen, grottans fem rum i följd (berget_gangen, berget_salen,
berget_valvet, berget_galleriet och berget_sprickan, 124.2), stig 4:s lilla rum berget_tandgrottan, och berget_stenfalt.
Kartorna har bara id:n, aldrig text som spelaren läser. Bokstavsstigarna står där kartan har stig_<pusslets id>
(rutnätets mitt), och en ravin eller vak går tvärs över rummet där, så att han bara kommer över på stigen. Rutnätet är 40
pixlar per kolumn och 26 per rad (Rum.visaStig), med stranden 17 pixlar utanför på båda sidor. Ett rum är högst 2 × 2
skärmar.
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
# Det som är målat i rummens bilder (LASMIG_127): kartan har kvar platserna, men gråboxen ritar dem inte
I_BILDEN = {
    # stigen: bron, stigspåren, skyltstolparna (orden står på läsplattan), snöhögarna, Farfars sten och valvet i branten
    'stig_floden', 'stigspar_in', *(f'stigspar_isgrottan_{i}' for i in range(1, 5)), 'stigspar_issjon_1', 'stigspar_issjon_2',
    *(f'stigspar_eldgrottan_{i}' for i in range(1, 4)), 'skylt_isgrottan', 'skylt_issjon', 'skylt_eldgrottan',
    *(f'snohog_{i}' for i in range(1, 5)), 'sten_farfar', 'mynningen',
    # grottan
    'vagg_gemener', 'vagg_valvet', 'gata_1', 'gata_2', 'gata_3', 'ishylla', 'tand_genom_isen',
    'vagg_ut', 'gata_3_igen', 'ljussken_sprickan',
    # också i bilderna (Tekniks läsning av lev127): mynningen inifrån, isfickan, utgången och stigen mot stenfältet
    'mynningen_inifran', 'isficka', 'utgang_stenfalt', 'stig_molnkanten', 'klippan_uppe', 'hylla',
    # stenfältet
    'istappar_klippan', 'klippa', 'moln_under_hyllan', 'dalen_langt_ned', 'flod_i_dalen',
}

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
    # stig 4 (LASMIG_122): tanden som glimtar genom isen (ca 500 ms per bild), och Farfars ristning av en tand
    'tand_isen': {'bild': 'tand_isen_01', 'bild_anim': 'tand_isen_01,tand_isen_02', 'anim_ms': 500},
    'ristning_tand': {'bild': 'ristning_tand'},
    # F1 (LASMIG_124 och 126): tre isklumpar att lyfta, och Farfars kompass under den sista, som glimtar
    **{f'isklump_{i}': {'bild': f'isklump_0{i}', 'bild_hugg': 'isklump_lyft', 'bild_kvar': 'isklump_skugga'} for i in (1, 2, 3)},
    'farfars_kompass': {'bild': 'farfars_kompass', 'bild_anim': 'farfars_kompass,farfars_kompass_glimt', 'anim_ms': 500},
    # F1:s varma ljus från sprickan i taket ligger ovanför mörkret, så att det syns och lockar från gången
    'f1_ljus': {'bild': 'f1_ljus_01', 'bild_anim': 'f1_ljus_01,f1_ljus_02', 'anim_ms': 400, 'lyser': True},
    'f1_spricka': {'bild': 'f1_spricka', 'lyser': True},
    # Farfars tavla av trä med kompassrosen och en pil (LASMIG_126)
    'tavla_farfar': {'bild': 'tavla_farfar'},
    # snödrivorna som ligger över stenarnas fot (LASMIG_127)
    'snodriva_taggar': {'bild': 'snodriva'},
    'snodriva_is': {'bild': 'snodriva'},
    # det enda som rör sig i varje sal (LASMIG_127)
    'orgel_blank': {'bild': 'orgel_blank_01', 'bild_anim': 'orgel_blank_01,orgel_blank_02,orgel_blank_03', 'anim_ms': 150, 'anim_paus': '2000-4000'},
    'valv_ljus': {'bild': 'valv_ljus_01', 'bild_anim': 'valv_ljus_01,valv_ljus_02', 'anim_ms': 900},
    'tand_gloria': {'bild': 'tand_gloria_01', 'bild_anim': 'tand_gloria_01,tand_gloria_02,tand_gloria_03,tand_gloria_02', 'anim_ms': 400},
    'snoflingor': {'bild': 'snoflingor_01', 'bild_anim': 'snoflingor_01,snoflingor_02,snoflingor_03', 'anim_ms': 300},
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
                # 133.2: vägarnas mål vid gaffeln. Kameran visar dem lika länge före läsvalet, från väster: ELDGROTTAN
                # längst bort i nordväst, ISSJÖN i öster längs branten och ISGROTTAN vid mynningen. Stils skiss sätter
                # målen i den nya stigen (133.13.3), och då flyttar punkterna dit
                punkt('regi_vag_eldgrottan', 56, 220),
                punkt('regi_vag_issjon', 350, 298),
                punkt('regi_vag_isgrottan', 584, 62),
                # floden i väster
                vagg(0, 0, 24, 320, vatten=True),
                sak('stig_floden', 24, 280, 20, 30, dekor=True),
                # 122.2: stigarna vid gaffeln, i gråbox spår i snön (dekor, under figurerna): in från floden, och tre
                # som syns gå åt var sitt håll. ISGROTTAN nordost mot stupet och stig 1, ISSJÖN österut längs branten i
                # söder, och ELDGROTTAN nordväst mot stupets västra del. Stil gör dem till riktiga stigar i rummet
                sak('stigspar_in', 44, 276, 110, 8, dekor=True),
                sak('stigspar_isgrottan_1', 172, 242, 40, 8, dekor=True),
                sak('stigspar_isgrottan_2', 206, 232, 40, 8, dekor=True),
                sak('stigspar_isgrottan_3', 240, 222, 50, 8, dekor=True),
                sak('stigspar_isgrottan_4', 284, 212, 30, 8, dekor=True),
                sak('stigspar_issjon_1', 168, 286, 44, 8, dekor=True),
                sak('stigspar_issjon_2', 206, 294, 150, 8, dekor=True),
                sak('stigspar_eldgrottan_1', 120, 236, 40, 8, dekor=True),
                sak('stigspar_eldgrottan_2', 90, 226, 36, 8, dekor=True),
                sak('stigspar_eldgrottan_3', 60, 216, 36, 8, dekor=True),
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
    # 124.2 (granskning 11): grottan är fem rum i följd med en kort gång mellan varje, och ingen sal syns från en annan.
    # R1 gången (320 × 384): de kommer in genom mynningen i söder, som snön har täppt till. Gången slingrar sig västerut,
    # norrut och österut, och F1 (isfickan med isklumparna) ligger norr om gången vid svängen, framåt i gångriktningen,
    # med ett varmt sken som lockar. Farfars vägg med paren står sist, i kammaren i norr vid gången till salen.
    'berget_gangen': {
        'storlek': (20, 24),
        'objekt': [
            punkt('start', 160, 336),
            *golv_vaggar(320, 384, golv=[
                (112, 296, 96, 64), (40, 296, 72, 28), (40, 160, 28, 164), (40, 160, 200, 28),
                # F1, isfickan norr om gången
                (108, 96, 88, 64),
                (212, 64, 28, 124), (176, 24, 128, 48),
            ]),
            sak('mynningen_inifran', 132, 348, 56, 12, sida='over'),
            sak('isficka', 142, 96, 20, 8, sida='under', lockradie=90),
            # F1:s ljus: fläcken på golvet där klumparna ligger, och sprickan i taket ovanför (LASMIG_124)
            sak('f1_ljus', 122, 104, 56, 48, dekor=True),
            sak('f1_spricka', 142, 90, 16, 10, dekor=True),
            sak('isklump_1', 114, 108, 14, 12, sida='alla'),
            sak('isklump_2', 176, 106, 14, 12, sida='alla'),
            sak('isklump_3', 118, 138, 14, 12, sida='alla'),
            sak('farfars_kompass', 119, 140, 12, 10, sida='alla'),
            sak('vagg_gemener', 186, 24, 40, 10, sida='under'),
            utg('gang_salen_in', 264, 24, 28, 8, golv=True, riktning='upp', till='berget_salen'),
        ],
    },
    # Utgångarna tillbaka till rummet innan finns inte i datan, så han kommer in i varje rum vid dess start (vid gången in).
    # R2 salen (480 × 192): han kommer in i sydväst. Stig 2 (TAVLA) går över vattnet, och Farfars tavla står på andra
    # stranden och syns redan från ingången. Gången till valvet ligger på östra stranden och nås bara över stigen.
    'berget_salen': {
        'storlek': (30, 12),
        'objekt': [
            punkt('start', 40, 170),
            *golv_vaggar(480, 192, golv=[(16, 36, 48, 140), (274, 36, 190, 140)], vatten=[(66, 36, 208, 140)]),
            sak('stig_k4_stig2', 166, 102, 8, 8, dekor=True, ankare=True, stig_ton='orgel_ton', stig_ackord='orgel_ackord'),  # orgeln (127.6)
            sak('tavla_farfar', 280, 36, 24, 22, sida='under'),
            sak('orgel_blank', 118, 0, 8, 36, dekor=True),
            utg('gang_valvet', 420, 36, 28, 8, golv=True, riktning='upp', till='berget_valvet'),
        ],
    },
    # R3 valvet (122.11, 2 × 1 skärmar) mellan salen och galleriet. Han kommer upp från salen i sydväst (gang_salen),
    # läser Farfars mening på väggen före vaken (vagg_valvet) och hoppar stigen (skatt, fem steg och tre rader) över
    # vaken. Gången ned till galleriet (gang_galleriet) i sydost nås bara över stigen.
    'berget_valvet': {
        'storlek': (40, 12),
        'objekt': [
            punkt('start', 56, 168),
            *golv_vaggar(640, 192, golv=[(16, 36, 248, 140), (472, 36, 152, 140), (40, 176, 32, 16), (568, 176, 32, 16)]),
            utg('gang_salen', 40, 184, 32, 8, golv=True, riktning='ned', till='berget_salen'),
            utg('gang_galleriet', 568, 184, 32, 8, golv=True, riktning='ned', till='berget_galleriet'),
            sak('vagg_valvet', 196, 36, 44, 8, sida='under'),
            sak('valv_ljus', 0, 0, 640, 40, dekor=True),
            *stig('k4_stig_valv', (364, 100), 5, 3, 36, 164),
        ],
    },
    # R4 galleriet (640 × 384): han kommer ned från valvet i nordväst. Gåtans tre rader står på var sin vägg (västra
    # väggen, norra väggen och gången söderut). F2 ligger i en nisch i norr, och isblocket syns från ingången. Söderut
    # går gången till den nedre hallen, där tanden syns genom isen vid öppningen till tandgrottan, och gången till
    # sprickan går ut österut.
    'berget_galleriet': {
        'storlek': (40, 24),
        'objekt': [
            punkt('start', 64, 48),
            punkt('regi_hjalte_k4s03_galleriet', 64, 48),
            *golv_vaggar(640, 384, golv=[
                (16, 32, 420, 128), (196, 12, 84, 20), (400, 160, 36, 100),
                (120, 260, 504, 100), (196, 360, 28, 24),
            ]),
            sak('gata_1', 16, 84, 10, 22, sida='hoger'),
            sak('gata_2', 330, 32, 22, 10, sida='under'),
            sak('gata_3', 426, 190, 10, 22, sida='vanster'),
            # F2: ishyllan med isblocket i nischen, och fotavtrycket under blocket (hemligheten)
            sak('ishylla', 200, 12, 76, 8, sida='under'),
            sak('isblock', 226, 16, 24, 14, sida='alla'),
            sak('fotavtryck', 224, 18, 28, 14, sida='alla'),
            # tanden genom den klara isen, och öppningen till tandgrottan där det lockar (ungen nosar, det glimtar)
            sak('tand_genom_isen', 236, 352, 28, 8, dekor=True),
            utg('oppning_tandgrottan', 196, 376, 28, 8, golv=True, riktning='ned', till='berget_tandgrottan', lockradie=100),
            utg('gang_sprickan', 616, 296, 8, 32, golv=True, riktning='hoger', till='berget_sprickan'),
        ],
    },
    # Stig 4:s lilla rum (320 × 192), med öppningen i galleriet: Farfars ristning av en tand på västra stranden, stig 4
    # (tand) österut över vaken, och tanden i isväggen längst in. När stigen är klar hoppar han tillbaka (tillbaka).
    'berget_tandgrottan': {
        'storlek': (20, 12),
        'objekt': [
            punkt('start', 36, 60),
            *golv_vaggar(320, 192, golv=[(16, 24, 48, 152), (240, 24, 64, 152)], vatten=[(72, 24, 168, 152)]),
            utg('gang_galleriet_tillbaka', 24, 24, 28, 8, golv=True, riktning='upp', till='berget_galleriet'),
            sak('ristning_tand', 16, 100, 6, 18, sida='hoger'),
            sak('stig_k4_stig4', 152, 96, 8, 8, dekor=True, ankare=True, tillbaka=True),
            sak('tand_gloria', 268, 18, 36, 24, dekor=True),
            sak('tand_isen', 276, 24, 20, 12, sida='under'),
        ],
    },
    # R5 sprickan (320 × 384): han kommer in i sydväst på landningen. Stig 3 (klubba) går uppåt över vattnet till
    # hyllan vid sprickan i norr. Dagsljuset från sprickan ligger på norra stranden (127.2, Stils skiss 4), aldrig över ett flak.
    'berget_sprickan': {
        'storlek': (20, 24),
        'objekt': [
            punkt('start', 40, 330),
            punkt('regi_spricka', 160, 26),
            *golv_vaggar(320, 384, golv=[(16, 286, 288, 82), (16, 40, 288, 82), (138, 10, 44, 30)],
                         vatten=[(16, 122, 288, 164)]),
            sak('ljussken_sprickan', 132, 84, 68, 32, dekor=True),
            sak('snoflingor', 142, 12, 48, 90, dekor=True),
            sak('vagg_ut', 40, 360, 24, 8, sida='over'),
            sak('gata_3_igen', 72, 360, 24, 8, sida='over'),
            sak('stig_k4_stig3', 156, 196, 8, 8, dekor=True, ankare=True, upp=True),
            sak('spricka', 148, 10, 24, 16, sida='under'),
            sak('utgang_stenfalt', 148, 0, 24, 14, sida='under'),
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
VANTAR_PA_DATA = {'hylla', 'klippa', 'klippan_uppe'}


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
    # 124.8–124.9 (0.107.0): 640 × 384. Uppe stenfältet, sedan klippan (104 px hög, blank is med istappar längs
    # kanten), hyllan där han kommer ut ur sprickan, och nedanför hyllan molnen och dalen långt ned, med floden som en
    # tunn linje. Han kommer upp mitt på klippan. Den speciella stenen (sten_klubba) står längst bort i nordost, och en
    # varm sten utan klubba (sten_varm) står närmast. Varje sten har sitt kännemärke, och snödrivorna täcker bara
    # stenarnas fot. Stigen mot molnkanten syns först när kartbiten är tagen (Innehålls dolda stig_molnkanten). Ett
    # undantag från regeln att ett läsval ryms på en skärm: varje sten avgörs för sig mot gåtan, som han har på sin lapp.
    'storlek': (40, 24),
    'objekt': [
        punkt('start', 60, 312),
        punkt('regi_luftskepp', 200, 30),
        punkt('regi_driva', 230, 100),
        punkt('regi_klippan', 316, 312),
        # uppe på stenfältet när scenen efter klippan börjar (omstart)
        punkt('regi_hjalte_k4s05_stenfaltet', 316, 164),
        # molnhavet i norr, kanten i öster och branten i väster (Stils väggar, 120.1)
        vagg(0, 0, 640, 26), vagg(624, 26, 16, 310), vagg(0, 56, 40, 80),
        sak('sten_varm', 380, 130, 26, 20, sida='alla'),
        sak('sten_taggar', 110, 100, 26, 20, sida='alla'),
        sak('sten_is', 250, 56, 26, 20, sida='alla'),
        sak('halet', 470, 120, 30, 18, sida='alla'),
        sak('sten_klubba', 560, 44, 26, 20, sida='alla'),
        # lådan ligger tätt under stenen (ingen glipa att klämmas in i), och han står framför den
        sak('lada_farfar', 564, 64, 18, 12, sida='under'),
        # snödrivorna täcker bara stenarnas fot (gråbox, ritas ovanpå), så att ingen sten är dold
        sak('snodriva_taggar', 106, 114, 34, 8, dekor=True, ovanpa=True),
        sak('snodriva_is', 246, 70, 34, 8, dekor=True, ovanpa=True),
        sak('luftskepp_borta', 300, 8, 40, 20, dekor=True, ankare=True),
        sak('stig_molnkanten', 480, 26, 30, 16, sida='under'),
        # den isade klippan tvärs över (y 180–284), istapparna längs kanten, och vägen upp när ordet är skrivet
        sak('klippa', 0, 180, 624, 104, sida='under'),
        sak('istappar_klippan', 0, 180, 624, 6, dekor=True),
        sak('klippan_uppe', 300, 176, 32, 112, golv=True, oppning=True),
        # nere: hyllan, och nedanför den molnen och dalen långt ned med floden
        sak('hylla', 0, 284, 624, 52, golv=True),
        vagg(0, 336, 640, 48),
        sak('moln_under_hyllan', 0, 338, 640, 16, dekor=True),
        sak('dalen_langt_ned', 0, 354, 640, 30, dekor=True),
        sak('flod_i_dalen', 0, 368, 640, 3, dekor=True),
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
