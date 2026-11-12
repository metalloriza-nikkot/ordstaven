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
# Stils rum som bilder (82.7): assets/rum/kap-02/<rum>.png är rummets bild, och <rum>_over.png den höga vassen längs
# kanterna, som ritas ovanför figurerna. Där den står är det stängt för fötterna (56.3): en vägg per sträcka av rutor om
# 8 × 8 där den har en pixel, så att det som ritas ovanför aldrig ligger där han kan gå.
RUMSBILDER = ROT / 'assets' / 'rum' / 'kap-02'
OVER_RUTA = 8
# Föremål som är en del av rummets bild (Stil del 2): de ritas inte som gråboxens rutor, men id:n och zoner står kvar
I_BILDEN = {'leran', 'leran_brygga', 'lerpol_vassen', 'strand_vassen', 'brygga', 'brygga_fran_torget', 'vattnet', 'udden'}


def over_vaggar(rum):
    """Väggarna under rummets _over-bild: sträckor av rutor om 8 × 8 med minst en pixel, ihopslagna radvis och
    sedan nedåt när sträckan är densamma."""
    f = RUMSBILDER / f'{rum}_over.png'
    if not f.is_file():
        return []
    from PIL import Image
    a = Image.open(f).convert('RGBA').getchannel('A')
    C = OVER_RUTA
    rader = []
    for cy in range(a.height // C):
        rad, cx = [], 0
        while cx < a.width // C:
            if a.crop((cx * C, cy * C, cx * C + C, cy * C + C)).getbbox():
                start = cx
                while cx < a.width // C and a.crop((cx * C, cy * C, cx * C + C, cy * C + C)).getbbox():
                    cx += 1
                rad.append((start, cx - start))
            else:
                cx += 1
        rader.append(rad)
    ut, oppna = [], {}
    for cy, rad in enumerate(rader + [[]]):
        nya = {}
        for s in rad:
            if s in oppna:
                nya[s] = oppna.pop(s)
            else:
                nya[s] = cy
        for (x, b), y0 in oppna.items():
            ut.append(vagg(x * C, y0 * C, b * C, (cy - y0) * C))
        oppna = nya
    return sorted(ut, key=lambda v: (v[3], v[2]))


def utg(namn, x, y, b, h, **e):
    return ('utgang', namn, x, y, b, h, e)


def sak(namn, x, y, b, h, **e):
    return ('sak', namn, x, y, b, h, e)


# Stils bybor (steg 5 del 1): kartans id → bildernas namn. Stillbilden är <namn>_ner_01, och figuren vänder sig
# mot den som pratar med <namn>_<riktning>_01. Byborna har en skugga under sig (skugga_16x24, Tant Rosa 24 × 24).
BYBOR = {'fiskaren': 'fiskaren', 'tvatterskan': 'tvatterskan', 'barnet_drake': 'barnet', 'tant_rosa': 'tant_rosa', 'bo': 'bo'}


def figur(namn, x, y, **e):
    if namn in BYBOR:
        e.setdefault('bild', f'{BYBOR[namn]}_ner_01')
        e.setdefault('skugga', True)
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
            # 71.6, 72.3 och 75.3: en vägg av tät vass tvärs över hela rummet strax efter skogen. Efter SVÄRD hugger
            # han sig igenom själv (k2_vassvaggen): väggen delas i ett fält av tussar efter pusslets falt (tre rader
            # från väster till öster, fem tussar i varje). Den syns i tillståndet vass och är borta i oppen.
            sak('vass_tat', 72, 0, 48, 192, sida='vanster', delas='hela', visar='k2_vassvaggen'),
            sak('skylt_lera', 132, 60, 14, 14, sida='alla'),
            # 75.5: leran går att gå i, och när ungen är uppdragen är den en pöl (rummets zon)
            sak('leran', 150, 104, 80, 40, sida='alla', golv=True),
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
            # 77.4: torgets fyra hus, korsade två och två: i norr Tant Rosas lilla hus med rosa dörr och ett stort
            # med blå dörr, i söder ett stort med rosa dörr och ett litet med blå. Husets storlek är väggens storlek
            vagg(360, 0, 56, 40), vagg(416, 0, 80, 56), vagg(496, 0, 56, 40), vagg(580, 0, 60, 40), vagg(600, 40, 40, 60),
            # 80.4 (10g, Torgets södra hus): snett uppifrån syns bara husens södra sida, så alla fyra dörrar står i
            # fasaden mot söder. Söder om de södra husen går en gång av kullersten (y 176–200), som han når runt östra sidan
            vagg(368, 136, 72, 40), vagg(452, 136, 48, 40),
            # vattnet längs stranden i söder och öster
            vagg(0, 352, 520, 32, vatten=True), vagg(604, 124, 36, 176, vatten=True),
            figur('fiskaren', 88, 316, sida='alla'),
            figur('tvatterskan', 232, 236, sida='alla'),
            figur('barnet_drake', 420, 252, sida='alla'),
            # 76.4: barnets drake sitter fast på taket ovanför det, och FLYG tar ned den (frivilligt)
            vagg(392, 200, 64, 32), sak('drake_tak', 414, 192, 20, 16, sida='under', rackvidd=56, forsvinner_efter='k2_draken'),
            sak('fjader', 140, 290, 10, 10, sida='alla'),
            sak('udden', 604, 362, 30, 14),  # uddens spets, bortom lägerelden
            # 79.3, 80.2: kameran visar elden först när kvällen börjar, innan han ska hämta pinnar dit
            sak('lagereld', 572, 326, 20, 16, sida='alla', visas_forst='kvall'),
            # 78.4: tre vedpinnar på udden och ängen runt elden, bara på kvällen (innehållets syns_i). Han plockar upp
            # dem när han når dem (leta: true), och de ligger inte där han står när kvällen börjar
            sak('ved_1', 486, 290, 10, 6, sida='alla'), sak('ved_2', 618, 326, 10, 6, sida='alla'), sak('ved_3', 528, 366, 10, 6, sida='alla'),
            # 71.5: i tillståndet kvall står byborna och Tant Rosa runt elden (fötterna, regi_<figur>_kvall)
            punkt('regi_fiskaren_kvall', 556, 346), punkt('regi_tvatterskan_kvall', 582, 322),
            punkt('regi_barnet_drake_kvall', 600, 346), punkt('regi_tant_rosa_kvall', 540, 322),
            # 71.6: lyktor på pinnar längs stigen från torget ned till udden, släckta tills LJUS tänder dem
            sak('lyktor_udden', 558, 136, 8, 172, golv=True),
            # torget
            utg('dorr_rosa', 376, 24, 24, 16, riktning='upp', sida='under', till='tant_rosas_hus'),
            sak('brevram', 401, 22, 14, 12, sida='under'),
            utg('dorr_stort_bla', 444, 40, 24, 16, riktning='upp', sida='under'),
            utg('dorr_stort_rosa', 392, 160, 24, 16, riktning='upp', sida='under'),
            utg('dorr_litet_bla', 464, 160, 24, 16, riktning='upp', sida='under'),
            figur('tant_rosa', 404, 42, sida='alla', talare='tant_rosa'),
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
            sak('leran_brygga', 80, 116, 36, 24, sida='alla', golv=True),  # 75.5: en pöl som i vassen
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
            sak('tavla_stor_rund', 60, 6, 24, 24, sida='under', rackvidd=56, bild='tavla_stor_rund'),
            sak('tavla_liten_fyrkant', 112, 6, 24, 24, sida='under', rackvidd=56, bild='tavla_liten_fyrkant'),
            sak('tavla_stor_fyrkant', 164, 6, 24, 24, sida='under', rackvidd=56, bild='tavla_stor_fyrkant'),
            sak('tavla_liten_rund', 216, 6, 24, 24, sida='under', rackvidd=56, bild='tavla_liten_rund'),
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
            # Stils grodor (steg 5 del 1): <groda>_01 sitter, och _02 blåser upp strupen (KVACK)
            *[sak(g, *PLATS[p], 20, 16, sida='alla', bild=f'{g}_01') for g, p in (
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
    bild = (RUMSBILDER / f'{rum}.png').is_file()
    lista = list(spec['objekt']) + (over_vaggar(rum) if bild else [])
    for i, (typ, namn, x, y, b, h, e) in enumerate(lista, start=1):
        # det som är en del av rummets bild: Stils lista, och utgångarna (stigarna och dörrarna står i bilden)
        if bild and (namn in I_BILDEN or typ == 'utgang'):
            e = {**e, 'i_bilden': True}
        o = {'id': i, 'name': namn, 'type': '' if typ == 'punkt' else typ, 'x': x, 'y': y, 'width': b, 'height': h,
             'rotation': 0, 'visible': True}
        if typ == 'punkt':
            o['point'] = True
        if e:
            o['properties'] = egenskaper(e)
        objekt.append(o)
    props = {'rum': rum}
    if bild:
        props['bild'] = rum
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
