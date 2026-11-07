#!/usr/bin/env python3
"""Skogens kartor med Stils grafik (10b, Teknik 3).

Läser kartorna i kartor/den-gomda-dalen/ (skogsbrynet, buskarna, gläntan) och skriver tillbaka dem med
- föremålens bilder (egenskapen `bild`, och `bild_sedan` + `sedan` för det som byts: häcken med hålet,
  stubben med bären, den öppna skattlådan), och `rutor` på det som ritas i rutlagret (kullen, krönet, bäcken);
- rutlagren ur skogens rutset (assets/tiles/skog): `golv` (gräs, stigar, bäcken och kullen), `over`
  (trädridån, ovanför figurerna) och `stig_backen` (den hemliga stigen, som syns när föremålet syns).

Rummen är frysta (beslut 43): inga föremål flyttas och inga mått ändras. Rutorna väljs ur hörnen enligt 10b:
en ruta vars fyra hörn (uppe vänster, uppe höger, nere vänster, nere höger) är 1 för den andra terrängen heter
stig_<hörnen>, vatten_<hörnen> eller skog_<hörnen>. Där terränger möts vinner vatten före stig. Samma karta ger
alltid samma rutor (mönstret räknas ur rutans läge), så skriptet kan köras om.

    python3 verktyg/kartor/skog.py [--prova]
"""
import argparse
import json
import sys
from pathlib import Path

ROT = Path(__file__).resolve().parents[2]
KARTOR = ROT / 'kartor' / 'den-gomda-dalen'
RUTSET = ROT / 'assets' / 'tiles' / 'skog' / 'skog.json'
R = 16

# föremålens bilder (10b: gläntans föremål, det han läser om, skogsbrynets och buskarnas sista föremål)
BILDER = {
    'skogsbrynet': {
        'skylt_ingang': 'skylt_ingang', 'barbuske_brynet': 'barbuske', 'skylt_farfar_1': 'skylt_farfar',
        'lag_sten': 'lag_sten', 'lag_sten_2': 'lag_sten', 'lag_rund_sten': 'lag_rund_sten', 'hog_spetsig_sten': 'hog_spetsig_sten',
        'hog_sten': 'hog_sten', 'hog_rund_sten': 'hog_rund_sten', 'hack': 'hack', 'trad_med_formel': 'trad_med_formel',
        'stubbe': 'stubbe', 'skylt_bar': 'skylt_bar', 'gren': 'gren', 'ekorre_gren': 'ekorre_gren_01',
        'lianer': 'lian_gang_a',  # 5d: gången (bild_rad lian_gang_a,lian_gang_b står på föremålet)
    },
    'buskarna': {'buske_1': 'buske_gron', 'buske_2': 'buske_gul', 'buske_3': 'buske_rod', 'buske_4': 'buske_gron', 'skattlada': 'skattlada'},
    'glantan': {
        'gren': 'gren', 'apans_bo': 'apans_bo', 'stege': 'stege', 'trappa': 'trappa_vast', 'apans_trad': 'apans_trad',
        'apan_i_nat': 'apa_hanga_01', 'fossil': 'fossil', 'apan': 'apa_vinka_01', 'skylt_farfar_3': 'skylt_farfar',
        'ungt_trad': 'trad_stort_ungt', 'stort_ungt_trad': 'trad_stort_ungt', 'ungt_trad_2': 'trad_stort_ungt',
        'litet_gammalt_trad': 'trad_litet_gammalt', 'gammalt_trad': 'trad_stort_gammalt', 'stort_gammalt_trad': 'trad_stort_gammalt',
        'lovhog_1': 'lovhog', 'lovhog_2': 'lovhog', 'lovhog_3': 'lovhog', 'lovhog_4': 'lovhog', 'last_lada': 'last_lada',
        'rothal': 'rothal', 'lila_lapp': 'baronens_lapp', 'bron': 'bro', 'tavla_bron': 'tavla_bron', 'buske_vid_bron': 'buske_hjalm',
        # 5d: sydost, det som bara står där (nya id:n, inget att göra med dem)
        'dekor_stubbe': 'stubbe_svamp', 'dekor_sten_1': 'sten_mossa', 'dekor_sten_2': 'stenar_sma', 'dekor_svampar': 'svampar', 'dekor_sten_3': 'sten_mossa',
    },
}
# bilder i rad längs föremålet: de tre ugglorna i kronan (samma figur tre gånger)
RAD = {'glantan': {'ugglor': 'uggla_01,uggla_01,uggla_01'}}
# figurer som rör sig i tomgång: högst fyra bildbyten per sekund (golvets gränser, 45)
ANIM = {'glantan': {'apan_i_nat': ('apa_hanga_01,apa_hanga_02', 500), 'apan': ('apa_vinka_01,apa_vinka_02', 600)},
        'skogsbrynet': {'ekorre_gren': ('ekorre_gren_01,ekorre_gren_02', 700)}}
# det som byts (Stil 17:35): bilden efter att något har hänt (ett pussel, eller ett dolt föremål som har visats)
SEDAN = {
    'skogsbrynet': {'hack': ('hack_oppen', 'stig_genom_hacken'), 'stubbe': ('stubbe_bar', 'k1_liten_lian')},
    'buskarna': {'skattlada': ('skattlada_oppen', 'k1_busken')},
}
# liv i skogen (10e, Liv i skogen): var saken bor (x, y, bredd, höjd i pixlar). Aldrig inom fyra rutor från ett
# föremål i ett läsval (stenarna, de tre träden, lövhögarna och låset), och aldrig vid buskarna eller skattlådan.
LIVET = {
    'skogsbrynet': [('fagel', 20, 24, 24, 16), ('fagel', 44, 20, 20, 16), ('lov', 520, 0, 64, 52)],
    'buskarna': [('ekorre', 256, 16, 60, 14), ('lov', 0, 30, 40, 48)],
    'glantan': [('fjaril', 120, 200, 64, 48), ('fjaril', 392, 236, 64, 48), ('fagel', 456, 320, 24, 16)],  # 5d: liv i sydost
}
# lövhögarna sjunker ihop när han slår på dem (5d): bilderna när de slås och det som ligger kvar
HUGG = {'glantan': {f'lovhog_{i}': ('lovhog_hugg_01,lovhog_hugg_02', 'lovhog_kvar') for i in range(1, 5)}}
# det som ritas ovanpå trädkronorna (5d): ugglorna i det gamla trädets krona
OVANPA = {'glantan': {'ugglor'}}
# var han ställer sig (5d): apan hänger över plattformen, så han ställer sig till höger om trädet, på marken
SIDA = {'glantan': {'apan_i_nat': 'hoger'}}
# stegen står framför stammen (5d): den skär en öppning i trädets hinder, så att han når den
OPPNING = {'glantan': {'stege'}}
# det som ritas i rutlagret och inte som ett föremål
RUTOR = {'glantan': {'kulle', 'kronet', 'backen'}, 'skogsbrynet': {'snar_vast', 'snar_ost'}}  # 5d: snåren kring liangången
# 5d: tät skog inne i rummet (ridåns rutor, ovanför figurerna), indragen 8 px mot gången så att ingen ruta täcker lianerna
SNAR = {'skogsbrynet': ['snar_vast', 'snar_ost']}
# 5d: bäckarmen på baronens sida (vatten, bara rutor: hjälten når den aldrig) och baronens stig längs östra stranden
BIVATTEN = {'glantan': [(600, 288, 40, 0)]}
STIG_DEKOR = {'glantan': [(612, 0, 20, 384)]}
# 5d: fler blommor i gräset i sydost
BLOMMOR = {'glantan': [(336, 176, 208, 176)]}
# stigar som är dolda tills de visas får ett eget lager, som ritas när föremålet syns
EGNA_STIGAR = {'glantan': {'stig_backen': (540, 0, 8, 168)}}  # 5d: längs bäcken, mellan kullen och vattnet


def h(x, y, s=0):
    """Ett tal ur läget, samma varje gång."""
    v = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return (v ^ (v >> 16)) & 0xFFFF


def egen(o):
    return {p['name']: p['value'] for p in o.get('properties', [])}


def satt(o, namn, varde):
    props = [p for p in o.get('properties', []) if p['name'] != namn]
    typ = 'bool' if isinstance(varde, bool) else 'int' if isinstance(varde, int) else 'string'
    props.append({'name': namn, 'type': typ, 'value': varde})
    o['properties'] = sorted(props, key=lambda p: p['name'])


def rita(rum, karta, rutnr, storlek):
    B, H = karta['width'], karta['height']
    obj = next(l for l in karta['layers'] if l['type'] == 'objectgroup')['objects']
    by = {o['name']: o for o in obj}
    W, Hh = B + 1, H + 1  # hörnen

    def horn_i(rekt):
        x, y, b, hh = rekt
        return {(cx, cy) for cy in range(Hh) for cx in range(W) if x <= cx * R <= x + b and y <= cy * R <= y + hh}

    # stigarna (utgångar på marken, utom de dolda med eget lager)
    stig = set()
    for o in obj:
        e = egen(o)
        if o.get('type') == 'utgang' and e.get('golv') and o['name'] not in EGNA_STIGAR.get(rum, {}):
            stig |= horn_i((o['x'], o['y'], o['width'], o['height']))
    # bäcken: vatten från rutgränsen innanför bäckens västra kant (10b: x 568 ger vatten från 576)
    vatten = set()
    if 'backen' in by:
        o = by['backen']
        x0 = -(-int(o['x']) // R) * R
        vatten = {(cx, cy) for cy in range(Hh) for cx in range(W) if x0 <= cx * R <= o['x'] + o['width'] and o['y'] <= cy * R <= o['y'] + o['height']}
    for (x, y, b, hh) in BIVATTEN.get(rum, []):  # 5d
        vatten |= horn_i((x, y, b, hh))
    for rekt in STIG_DEKOR.get(rum, []):  # 5d
        stig |= horn_i(rekt)
    kulle = by.get('kulle') if rum == 'glantan' else None

    def wang(sort, mangd, x, y):
        k = ''.join('1' if c in mangd else '0' for c in [(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)])
        return None if k == '0000' else f'{sort}_{k}'

    gras = ['gras_1', 'gras_2', 'gras_3', 'gras_4'] * 3 + ['gras_blommor_1', 'gras_flack_1', 'gras_blommor_2', 'gras_flack_2']
    golv = []
    for y in range(H):
        for x in range(B):
            namn = None
            if kulle and kulle['x'] <= x * R < kulle['x'] + kulle['width'] and kulle['y'] <= y * R < kulle['y'] + kulle['height']:
                kx0, ky0 = int(kulle['x'] // R), int(kulle['y'] // R)
                kb, kh = int(kulle['width'] // R), int(kulle['height'] // R)
                kol = 'W' if x == kx0 else 'E' if x == kx0 + kb - 1 else ''
                rad = 'N' if y == ky0 else 'F' if y == ky0 + kh - 1 else 'S' if y == ky0 + kh - 2 else ''
                if rad == '' and kol == '':
                    # krönets yta: mest kullens mitt, ibland platån med blommor
                    namn = ['kulle_C', 'kulle_C', 'kulle_C', 'platå_1', 'platå_2', 'platå_blommor'][h(x, y, 3) % 6]
                else:
                    namn = f'kulle_{rad}{kol}' if rad else f'kulle_{kol}'
            if namn is None:
                blom = any(bx <= x * R < bx + bb and by_ <= y * R < by_ + bh for (bx, by_, bb, bh) in BLOMMOR.get(rum, []))  # 5d
                g = gras[h(x, y) % len(gras)]
                if blom and h(x, y, 5) % 3 == 0: g = ['gras_blommor_1', 'gras_blommor_2'][h(x, y, 6) % 2]
                namn = wang('vatten', vatten, x, y) or wang('stig', stig, x, y) or g
            golv.append(rutnr[namn])
    # trädridån längs kanterna (ovanför figurerna), med öppningar vid utgångar, starten och bäcken
    oppet = set()
    for o in obj:
        e = egen(o)
        if o.get('type') == 'utgang' or o['name'] == 'start':
            x, y, b, hh = o['x'], o['y'], o.get('width', 0), o.get('height', 0)
            oppet |= horn_i((x - 24, y - 24, b + 48, hh + 48))
    for o in obj:  # föremål nära kanten ska synas, också en trädkrona som sticker upp: ridån går inte över dem
        if o.get('type') in ('sak', 'figur') and o['name'] not in RUTOR.get(rum, set()) and o['name'] not in ('hack', 'lianer', 'backen'):
            bw, bh = storlek.get(BILDER.get(rum, {}).get(o['name']), (o['width'], o['height']))
            x = min(o['x'], o['x'] + o['width'] / 2 - bw / 2); y = min(o['y'], o['y'] + o['height'] - bh)
            oppet |= horn_i((x - 8, y - 8, max(o['width'], bw) + 16, max(o['height'], o['y'] + o['height'] - y) + 16))
    for (x, y, b, hh) in STIG_DEKOR.get(rum, []):  # 5d: baronens stig syns
        oppet |= horn_i((x - 8, y, b + 16, hh))
    if kulle:  # kullen är öppen upptill (krönet når kanten), ridån står inte på den
        oppet |= horn_i((kulle['x'], kulle['y'], kulle['width'], kulle['height']))
    skog = set()
    for cy in range(Hh):
        for cx in range(W):
            kant = min(cx, cy, W - 1 - cx, Hh - 1 - cy)
            if (cx, cy) in oppet or (cx, cy) in vatten or (cx + 1, cy) in vatten:
                continue
            if kant == 0 or (kant == 1 and h(cx, cy, 7) % 3 != 0):
                skog.add((cx, cy))
    for namn_ in SNAR.get(rum, []):  # 5d: snåren
        o = by[namn_]
        skog |= horn_i((o['x'] + 8, o['y'], o['width'] - 16, o['height']))
    over = [rutnr[n] + 1 if (n := wang('skog', skog, x, y)) else 0 for y in range(H) for x in range(B)]
    lager = [{'namn': 'golv', 'data': [n + 1 for n in golv]}, {'namn': 'over', 'data': over}]
    for oid, rekt in EGNA_STIGAR.get(rum, {}).items():
        egna = horn_i(rekt)
        data = [rutnr[n] + 1 if (n := wang('stig', egna, x, y)) else 0 for y in range(H) for x in range(B)]
        lager.append({'namn': oid, 'data': data, 'visas_med': oid})
    return lager


def kor(prova=False):
    rutset = json.loads(RUTSET.read_text())
    # bildernas storlek (föremålen och figurerna), så att ridån inte täcker en krona som sticker upp
    storlek = {}
    for atlas in [ROT / 'assets' / 'foremal' / 'skog' / 'skog.json', *(ROT / 'assets' / 'sprites').glob('*/*.json')]:
        for n, f in json.loads(atlas.read_text())['frames'].items():
            storlek.setdefault(n, (f['frame']['w'], f['frame']['h']))
    rutnr = {next(p['value'] for p in t.get('properties', []) if p['name'] == 'namn'): t['id'] for t in rutset['tiles']}
    for rum in ('skogsbrynet', 'buskarna', 'glantan'):
        fil = KARTOR / f'{rum}.tmj'
        karta = json.loads(fil.read_text())
        satt(karta, 'mark', 'skog')
        obj = next(l for l in karta['layers'] if l['type'] == 'objectgroup')['objects']
        for o in obj:
            n = o['name']
            if n in BILDER.get(rum, {}):
                satt(o, 'bild', BILDER[rum][n])
            if n in RAD.get(rum, {}):
                satt(o, 'bild_rad', RAD[rum][n])
            if n in ANIM.get(rum, {}):
                satt(o, 'bild_anim', ANIM[rum][n][0]); satt(o, 'anim_ms', ANIM[rum][n][1])
            if n in SEDAN.get(rum, {}):
                satt(o, 'bild_sedan', SEDAN[rum][n][0]); satt(o, 'sedan', SEDAN[rum][n][1])
            if n in RUTOR.get(rum, set()):
                satt(o, 'rutor', True)
            if n in HUGG.get(rum, {}):
                satt(o, 'bild_hugg', HUGG[rum][n][0]); satt(o, 'bild_kvar', HUGG[rum][n][1])
            if n in OVANPA.get(rum, set()):
                satt(o, 'ovanpa', True)
            if n in SIDA.get(rum, {}):
                satt(o, 'sida', SIDA[rum][n])
            if n in OPPNING.get(rum, set()):
                satt(o, 'oppning', True)
        # liv i skogen: objekt med typen omgivning (tas bort och läggs till på nytt, så att skriptet kan köras om)
        obj[:] = [o for o in obj if o.get('type') != 'omgivning']
        nasta = max([o.get('id', 0) for o in obj] + [karta.get('nextobjectid', 1) - 1]) + 1
        for i, (vad, x, y, b, hh) in enumerate(LIVET.get(rum, [])):
            obj.append({'id': nasta + i, 'name': f'omgivning_{vad}_{i + 1}', 'type': 'omgivning', 'x': x, 'y': y, 'width': b, 'height': hh,
                        'rotation': 0, 'visible': True, 'properties': [{'name': 'vad', 'type': 'string', 'value': vad}]})
        karta['nextobjectid'] = nasta + len(LIVET.get(rum, []))
        # rutlagren före objektlagret, i Tileds format (gid = rutans nummer + 1)
        lager = rita(rum, karta, rutnr, storlek)
        objlager = [l for l in karta['layers'] if l['type'] == 'objectgroup']
        nid = max([l.get('id', 0) for l in karta['layers']] + [0]) + 1
        rutl = []
        for i, l in enumerate(lager):
            tl = {'type': 'tilelayer', 'id': nid + i, 'name': l['namn'], 'width': karta['width'], 'height': karta['height'],
                  'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'data': l['data']}
            if l.get('visas_med'):
                tl['properties'] = [{'name': 'visas_med', 'type': 'string', 'value': l['visas_med']}]
            rutl.append(tl)
        karta['layers'] = [*rutl, *objlager]
        karta['nextlayerid'] = nid + len(rutl)
        karta['tilesets'] = [{'firstgid': 1, 'source': '../../assets/tiles/skog/skog.json'}]
        # rutornas data skrivs en kartrad per rad, som Tiled läser, i stället för ett tal per rad
        data = {}
        for i, tl in enumerate(rutl):
            data[f'@@DATA{i}@@'] = tl['data']; tl['data'] = f'@@DATA{i}@@'
        ut = json.dumps(karta, ensure_ascii=False, indent=1) + '\n'
        for k, d in data.items():
            b = karta['width']
            rader = ',\n    '.join(','.join(str(v) for v in d[j:j + b]) for j in range(0, len(d), b))
            ut = ut.replace(f'"{k}"', f'[\n    {rader}\n   ]')
        json.loads(ut)
        if prova:
            print(f'{rum}: {len(rutl)} rutlager, {sum(1 for o in obj if egen(o).get("bild"))} föremål med bild')
        else:
            fil.write_text(ut)
            print(f'{fil.relative_to(ROT)}: {len(rutl)} rutlager')


if __name__ == '__main__':
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--prova', action='store_true', help='skriv inget, säg bara vad som skulle göras')
    kor(a.parse_args().prova)
