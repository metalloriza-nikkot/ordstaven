# 5d (beslut 50.2): Stils förslag till kapitel 1:s kartor. Läser repots kartor (skrivskyddad klon), flyttar och
# lägger till föremål, och skriver kopior i kap1/kartor/. Sedan ritar skog_forslag.py rutlagren och rendera.py en provbild.
# Teknik gör de riktiga kartorna; det här är ritningen, så att vi inte gör samma sak två gånger.
#   python3 kap1/kartor5d.py      -> kap1/kartor/*.tmj och /tmp/forslag_<rum>.png
import json, os, subprocess, sys
REPO = '/home/claude/ordstaven/kartor/den-gomda-dalen'
UT = '/home/claude/kap1/kartor'

def satt(o, namn, varde):
    props = [p for p in o.get('properties', []) if p['name'] != namn]
    if varde is not None:
        typ = 'bool' if isinstance(varde, bool) else 'int' if isinstance(varde, int) else 'string'
        props.append({'name': namn, 'type': typ, 'value': varde})
    o['properties'] = sorted(props, key=lambda p: p['name'])

# ändringar: id -> (x, y, bredd, höjd) eller None (läget står kvar), och egenskaper (None tar bort)
ANDRA = {
    'skogsbrynet': {
        # liangången: sex lianer i en gång (2 rutor bred) rakt under stig_glantan, delas på djupet (ny i motorn)
        'lianer': ((448, 40, 32, 48), {'delas': 'djup', 'bild_rad': 'lian_gang_a,lian_gang_b', 'bild_hugg': 'lian_gang_hugg_01,lian_gang_hugg_02', 'bild_kvar': 'lian_gang_kvar'}),
        'stig_buskarna': ((600, 8, 40, 26), {}),
        'skylt_bar': ((568, 22, 14, 14), {}),
        'ekorre_gren': ((536, 90, 16, 14), {}),
        'trad_med_formel': ((400, 120, 28, 36), {}),             # ned en bit, så att kronan inte hamnar under snåret
    },
    'glantan': {
        'kulle': ((320, 0, 208, 144), {}),                       # 16 px smalare: plats för den hemliga stigen
        'backen': ((568, 0, 32, 384), {}),                       # smalare bäck, en östra strand innanför kartan
        'stig_backen': ((536, 0, 24, 40), {}),
        'apans_trad': ((40, 236, 56, 24), {}),                   # marken under plattformen; bilden är kronan och stammen
        'apan_i_nat': ((74, 190, 22, 24), {}),                    # från grenen över plattformens främre högra del
        'apan': ((96, 262, 16, 20), {}),
        'bron': ((606, 264, 28, 42), {}),                        # över bäckarmen, nord–syd, på baronens strand
        'buske_vid_bron': ((600, 242, 24, 18), {}),
        'tavla_bron': ((540, 266, 16, 12), {}),                  # på hjältens sida, vid vattnet
        'ugglor': ((278, 22, 30, 12), {}),                       # i det gamla trädets krona (ritas ovanpå kronan)
    },
}
NYA = {
    'skogsbrynet': [
        ('snar_vast', 'sak', 320, 40, 128, 48, {'rutor': True}),
        ('snar_ost', 'sak', 480, 40, 160, 48, {'rutor': True}),
    ],
    'glantan': [
        ('dekor_stubbe', 'sak', 404, 212, 22, 14, {}),
        ('dekor_svampar', 'sak', 432, 222, 14, 8, {}),
        ('dekor_sten_1', 'sak', 360, 300, 18, 10, {}),
        ('dekor_sten_2', 'sak', 488, 268, 16, 8, {}),
        ('dekor_sten_3', 'sak', 496, 344, 18, 10, {}),
    ],
}

def gor(rum):
    m = json.load(open(f'{REPO}/{rum}.tmj'))
    obj = next(l for l in m['layers'] if l['type'] == 'objectgroup')['objects']
    by = {o['name']: o for o in obj}
    for namn, (rekt, props) in ANDRA.get(rum, {}).items():
        o = by[namn]
        if rekt: o['x'], o['y'], o['width'], o['height'] = rekt
        for k, v in props.items(): satt(o, k, v)
    nid = m.get('nextobjectid', max(o['id'] for o in obj) + 1)
    for (namn, typ, x, y, b, h, props) in NYA.get(rum, []):
        o = {'id': nid, 'name': namn, 'type': typ, 'x': x, 'y': y, 'width': b, 'height': h, 'rotation': 0, 'visible': True, 'properties': []}
        for k, v in props.items(): satt(o, k, v)
        obj.append(o); nid += 1
    m['nextobjectid'] = nid
    os.makedirs(UT, exist_ok=True)
    json.dump(m, open(f'{UT}/{rum}.tmj', 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    for rum in ('skogsbrynet', 'buskarna', 'glantan'): gor(rum)
    subprocess.run([sys.executable, '/home/claude/kap1/skog_forslag.py'], check=True)
    sys.path.insert(0, '/home/claude/kap1')
    from rendera import rendera
    from PIL import Image
    for rum in ('skogsbrynet', 'glantan', 'buskarna'):
        im = rendera(rum, f'{UT}/{rum}.tmj'); im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f'/tmp/forslag_{rum}.png')
        print('/tmp/forslag_' + rum + '.png')
