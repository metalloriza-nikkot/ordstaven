#!/usr/bin/env python3
"""Kapitel 2:s kartor i gråbox (Teknik 20, del 2), efter Innehålls anteckningar i kap-02.json (rummens `anteckning`).

Skriver sex Tiled-kartor i kartor/den-gomda-dalen/: trasket_kanten (2 × 1 skärmar), byn (2 × 2), bryggan, vassen
(2 × 1), tant_rosas_hus och dammen. Kartorna har bara id:n, aldrig text som spelaren läser. Stil skissar ovanpå
skärmdumparna (kedjan i 07, steg 4), och då ritas om det som behövs.

Hus och vatten som inte är föremål i rummet är rutor med typen `vagg` (vatten med egenskapen `vatten`): de står i
vägen och ritas i gråboxen. Repen på torget spärrar var sin utgång, och husen och vattnet runt utgångarna gör att det
inte går att gå runt dem.

    python3 verktyg/kartor/kap2.py [--prova]

Med --prova skrivs ingenting, men skriptet säger om någon karta skulle ändras (för CI eller före en commit).
"""
import argparse
import json
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parents[2]
KARTOR = ROT / 'kartor' / 'den-gomda-dalen'
R = 16


def utg(namn, x, y, b, h, **e):
    return ('utgang', namn, x, y, b, h, e)


def sak(namn, x, y, b, h, **e):
    return ('sak', namn, x, y, b, h, e)


def figur(namn, x, y, **e):
    return ('figur', namn, x, y, 16, 24, e)


def vagg(x, y, b, h, vatten=False):
    return ('vagg', '', x, y, b, h, {'vatten': True} if vatten else {})


def punkt(namn, x, y):
    return ('punkt', namn, x, y, 0, 0, {})


def liv(vad, x, y, b, h):
    """Något som lever i rummet (26.3, 72.10): fågel, häger, groda, katt eller fjäril. Det går inte att trycka på."""
    return ('omgivning', f'{vad}_{x}_{y}', x, y, b, h, {'vad': vad})


STIG = {'golv': True}

# Grodornas platser vid dammen (69.8): x, y för en ruta på 20 × 16
PLATS = {'sten': (68, 36), 'vassen': (286, 68), 'under_bladet': (140, 80), 'nackrosbladet': (236, 62)}


RUMMEN = {
    # Västra skärmen: in från väster, skylten och leran. Östra: vattnet, och byn på andra sidan. Övergången skär
    # igenom vattnet när den syns (efter k2_over).
    'trasket_kanten': {
        'storlek': (40, 12),
        'objekt': [
            utg('stig_skogen', 0, 84, 40, 24, **STIG, riktning='vanster'),
            punkt('start', 48, 100),
            # 71.6 och 72.3: en vägg av tät vass tvärs över hela rummet strax efter skogen. Efter SVÄRD hugger han sig
            # igenom själv (k2_vassvaggen): väggen delas i lika många lager som pusslet har (fem), från väster till
            # öster, och den västra står närmast honom. Den syns i tillståndet vass och är borta i oppen.
            sak('vass_tat', 70, 0, 50, 192, sida='vanster', delas='hela', visar='k2_vassvaggen'),
            sak('skylt_lera', 132, 60, 14, 14, sida='alla'),
            sak('leran', 150, 104, 80, 40, sida='alla'),
            sak('stubbe_trask', 36, 150, 20, 14, sida='alla'),
            sak('trollslanda', 276, 44, 12, 10, sida='alla'),
            # 72.10: en fågel i vassen vid vattnet och en groda vid stranden
            liv('fagel', 430, 48, 12, 12), liv('groda', 444, 126, 10, 8),
            vagg(464, 0, 96, 72, vatten=True),
            sak('vattnet', 464, 72, 96, 40, sida='vanster'),
            vagg(464, 112, 96, 80, vatten=True),
            sak('overgang', 464, 84, 96, 24, golv=True, oppning=True),
            utg('stig_byn', 600, 84, 40, 24, **STIG, riktning='hoger', till='byn'),
        ],
    },
    # Navet, 2 × 2 skärmar. SV: in från bron, fiskaren och tvätterskan. SO: barnet med draken och udden med
    # lägerelden. NV: pålhusen. NO: torget med Tant Rosas hus, brunnen och de tre utgångarna, med repen.
    'byn': {
        'storlek': (40, 24),
        'objekt': [
            utg('stig_kanten', 0, 280, 40, 24, **STIG, riktning='vanster', till='trasket_kanten'),
            punkt('start', 48, 296),
            # pålhusen i NV, och raden av hus längs norra kanten som bara öppnar sig vid stigarna
            vagg(0, 0, 330, 40), vagg(24, 64, 64, 40), liv('fagel', 48, 52, 12, 12), vagg(128, 64, 72, 48), vagg(40, 136, 56, 40), vagg(208, 128, 64, 40),
            vagg(360, 0, 136, 40), vagg(496, 0, 56, 40), vagg(580, 0, 60, 40), vagg(600, 40, 40, 60),
            # vattnet längs stranden i söder och öster
            vagg(0, 352, 520, 32, vatten=True), vagg(604, 124, 36, 176, vatten=True),
            figur('fiskaren', 88, 316, sida='alla'),
            figur('tvatterskan', 232, 236, sida='alla'),
            figur('barnet_drake', 420, 252, sida='alla'),
            sak('fjader', 140, 290, 10, 10, sida='alla'),
            sak('udden', 604, 362, 30, 14),  # uddens spets, bortom lägerelden
            sak('lagereld', 572, 326, 20, 16, sida='alla'),
            # 71.5: i tillståndet kvall står byborna och Tant Rosa runt elden (fötterna, regi_<figur>_kvall)
            punkt('regi_fiskaren_kvall', 556, 346), punkt('regi_tvatterskan_kvall', 582, 322),
            punkt('regi_barnet_drake_kvall', 600, 346), punkt('regi_tant_rosa_kvall', 540, 322),
            # 71.6: lyktor på pinnar längs stigen från torget ned till udden, släckta tills LJUS tänder dem
            sak('lyktor_udden', 558, 136, 8, 172, golv=True),
            # torget
            utg('dorr_rosa', 404, 24, 24, 16, riktning='upp', sida='under', till='tant_rosas_hus'),
            sak('brevram', 436, 22, 14, 12, sida='under'),
            figur('tant_rosa', 464, 42, sida='alla', talare='tant_rosa'),
            sak('brunnen', 488, 100, 28, 24, sida='alla'),
            utg('stig_vassen', 332, 0, 28, 40, **STIG, riktning='upp', till='vassen'),
            utg('stig_dammen', 552, 0, 28, 40, **STIG, riktning='upp', till='dammen'),
            utg('stig_bryggan', 600, 100, 40, 24, **STIG, riktning='hoger', till='bryggan'),
            sak('brygga_fran_torget', 604, 124, 36, 10),  # på vattnet: syns från torget, gammal men hel
            sak('rep_vassen', 326, 40, 40, 6),
            sak('skylt_vassen', 368, 48, 14, 12, sida='alla'),
            sak('rep_brunnen', 546, 40, 40, 6),
            sak('skylt_brunnen', 528, 48, 14, 12, sida='alla'),
            sak('rep_bryggan', 592, 96, 6, 32),
            sak('skylt_bryggan', 574, 106, 14, 12, sida='alla'),
        ],
    },
    # En skärm: stranden i väster och bryggan ut i vattnet. Halvan landar på bryggan.
    'bryggan': {
        'storlek': (20, 12),
        'objekt': [
            utg('stig_byn_bryggan', 0, 84, 40, 24, **STIG, riktning='vanster', till='byn'),
            punkt('start', 48, 96),
            vagg(120, 0, 200, 84, vatten=True), vagg(120, 112, 200, 80, vatten=True),
            sak('brygga', 120, 84, 200, 28, golv=True),
            sak('brev_halva_1', 256, 92, 10, 10, sida='alla'),
            sak('fisk_hopp', 180, 124, 14, 10, sida='alla'),
            # 72.7: leran vid bryggans landände, och Farfars skylt GÅ INTE I LERAN! (han läser den utan val)
            sak('leran_brygga', 80, 116, 36, 24, sida='alla'),
            sak('skylt_lera_brygga', 96, 62, 14, 14, sida='alla'),
            liv('fagel', 214, 62, 12, 12),  # en mås på en påle
        ],
    },
    # 2 × 1 skärmar. Västra: vassen och bubbelblommorna längs stigen. Östra: stranden med stocken, och ute i vattnet,
    # utom räckhåll, brevets halva som flyter (69.5, 71.2–71.3).
    'vassen': {
        'storlek': (40, 12),
        'objekt': [
            utg('stig_byn_vassen', 40, 152, 28, 40, **STIG, riktning='ned', till='byn'),
            punkt('start', 54, 146),
            sak('bubbelblommor', 100, 56, 40, 20, sida='alla'),
            # 72.8: lerpölen mitt på stigen, med Farfars skylt framför. Det går att gå runt den, och går han i den
            # sjunker han (rummets zon med samma id)
            sak('skylt_lera_vassen', 154, 96, 14, 12, sida='alla'),
            sak('lerpol_vassen', 178, 100, 44, 40, golv=True),
            sak('stubbe_vassen', 250, 36, 20, 14, sida='alla'),
            liv('hager', 296, 112, 12, 24), liv('groda', 508, 70, 10, 8), liv('groda', 508, 132, 10, 8),
            sak('strand_vassen', 480, 72, 40, 48, golv=True),
            # halvan ute i vattnet (71.2): han når den aldrig, så det räcker att gå nära (nas_nara)
            sak('brev_halva_vatten', 560, 52, 10, 8, sida='alla', nas_nara=True, rackvidd=56),
            vagg(520, 0, 120, 192, vatten=True),
            # stocken i strandkanten som ungen hoppar upp på (71.3), och där den stannar långt ute (72.5)
            sak('stock_vassen', 520, 104, 28, 10, sida='alla'),
            punkt('regi_stock_ute', 604, 150),
        ],
    },
    # Inomhus: fyra tavlor högt upp på bakväggen, i blandad ordning (lika stora rutor, gråboxen ritar storleken
    # och formen i rutan).
    'tant_rosas_hus': {
        'storlek': (20, 12),
        'inomhus': True,
        'vagg_bak': 72,  # en hög bakvägg, så att tavlorna hänger högt med luft under (71.4)
        'objekt': [
            utg('dorr_ut', 146, 176, 28, 16, riktning='ned', sida='over', till='byn'),
            punkt('start', 160, 150),
            figur('tant_rosa', 232, 96, sida='alla', talare='tant_rosa'),
            sak('soffa', 48, 112, 56, 22, sida='alla'),
            liv('katt', 52, 100, 16, 10),  # 72.10: sover på soffan, aldrig nära tavlorna
            # högt på väggen med luft under (71.4): ingen når dem utan staven
            sak('tavla_stor_rund', 60, 6, 24, 24, sida='under', rackvidd=56),
            sak('tavla_liten_fyrkant', 112, 6, 24, 24, sida='under', rackvidd=56),
            sak('tavla_stor_fyrkant', 164, 6, 24, 24, sida='under', rackvidd=56),
            sak('tavla_liten_rund', 216, 6, 24, 24, sida='under', rackvidd=56),
            sak('kartbit_3', 144, 64, 14, 10, sida='alla'),
        ],
    },
    # Sidogren, en skärm: dammen med fyra grodor utspridda (69.8): på en sten i väster, i vassen i öster, under ett blad
    # vid södra kanten och på ett näckrosblad. L3 och L4 har var sina grodor på samma platser (bara varianten han får
    # syns), efter Innehålls anteckning i rummet.
    'dammen': {
        'storlek': (20, 12),
        'objekt': [
            utg('stig_byn_dammen', 146, 152, 28, 40, **STIG, riktning='ned', till='byn'),
            punkt('start', 160, 146),
            vagg(96, 16, 208, 64, vatten=True),
            figur('bo', 48, 80, sida='alla', talare='bo'),
            liv('fjaril', 170, 14, 48, 30), liv('fagel', 300, 96, 12, 12),
            *[sak(g, *PLATS[p], 20, 16, sida='alla') for g, p in (
                ('groda_liten_gron', 'sten'), ('groda_liten_gul', 'vassen'), ('groda_stor_gron', 'under_bladet'), ('groda_stor_gul', 'nackrosbladet'),
                ('groda_gron_slat', 'sten'), ('groda_gul_slat', 'vassen'), ('groda_gron_prickig', 'under_bladet'), ('groda_gul_prickig', 'nackrosbladet'))],
        ],
    },
}


def egenskaper(e):
    ut = []
    for k in sorted(e):
        v = e[k]
        typ = 'bool' if isinstance(v, bool) else 'int' if isinstance(v, int) else 'string'
        ut.append({'name': k, 'type': typ, 'value': v})
    return ut


def karta(rum, spec):
    bredd, hojd = spec['storlek']
    objekt = []
    for i, (typ, namn, x, y, b, h, e) in enumerate(spec['objekt'], start=1):
        o = {'id': i, 'name': namn, 'type': '' if typ == 'punkt' else typ, 'x': x, 'y': y, 'width': b, 'height': h,
             'rotation': 0, 'visible': True}
        if typ == 'punkt':
            o['point'] = True
        if e:
            o['properties'] = egenskaper(e)
        objekt.append(o)
    props = {'rum': rum}
    if spec.get('inomhus'):
        props['inomhus'] = True
    if spec.get('vagg_bak'):
        props['vagg_bak'] = spec['vagg_bak']
    return {
        'type': 'map', 'version': '1.10', 'tiledversion': '1.11.0', 'orientation': 'orthogonal', 'renderorder': 'right-down',
        'width': bredd, 'height': hojd, 'tilewidth': R, 'tileheight': R, 'infinite': False, 'compressionlevel': -1,
        'nextlayerid': 2, 'nextobjectid': len(objekt) + 1, 'properties': egenskaper(props), 'tilesets': [],
        'layers': [{'id': 1, 'name': 'foremal', 'type': 'objectgroup', 'draworder': 'index', 'opacity': 1, 'visible': True,
                    'x': 0, 'y': 0, 'objects': objekt}],
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
