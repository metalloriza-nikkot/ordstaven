# Stil 16 (beslut 76.6): höjdkitet i gläntan. Ett förslag till kartan, som i 5d: kullen får sina nya rutor,
# trappan flyttas till framsidan (där molnets bild visar den, två rutor bred mellan de södra lövhögarna),
# och skuggan läggs på marken söder och öster om kullen. Teknik gör den riktiga kartan i verktyg/kartor/skog.py.
# Användning: python3 kap1/hojd16.py   -> kap1/ut/rum/kap1_forslag/glantan_hojd.tmj och provbilder i /tmp
import os, sys, json, copy
from PIL import Image
ROT = '/home/claude'
REPO = os.path.join(ROT, 'ordstaven')
TSJ = os.path.join(ROT, 'rutor', 'ut', 'rutor', 'skog.tsj')
PNG = '/tmp/skog_last.png'                       # det nya rutsetet, låst till paletten
TRAPPA_KOL = (24, 25)                            # x 384–416, mellan lövhög_3 och lövhög_4

def forslag():
    m = json.load(open(os.path.join(REPO, 'kartor', 'den-gomda-dalen', 'glantan.tmj')))
    t = json.load(open(TSJ))
    nr = {x['properties'][0]['value']: x['id'] + 1 for x in t['tiles']}
    B = m['width']
    by = {o['name']: o for L in m['layers'] if L['type'] == 'objectgroup' for o in L['objects']}
    k = by['kulle']; kx0, ky0 = int(k['x'] // 16), int(k['y'] // 16); kb, kh = int(k['width'] // 16), int(k['height'] // 16)
    golv = next(L for L in m['layers'] if L['name'] == 'golv')
    def satt(x, y, namn): golv['data'][y * B + x] = nr[namn]
    fy, sy, mark = ky0 + kh - 1, ky0 + kh - 2, ky0 + kh
    for x in range(kx0, kx0 + kb):                        # skuggan under framsidan
        satt(x, mark, 'skugga_S')
    for y in range(ky0, ky0 + kh):                        # och öster om östra sidan
        satt(kx0 + kb, y, 'skugga_NE' if y == ky0 and ky0 > 0 else 'skugga_E')
    satt(kx0 + kb, mark, 'skugga_SE')
    for x, h in zip(TRAPPA_KOL, 'VH'):                    # trappan i framsidan
        satt(x, sy, f'trappa_S_{h}'); satt(x, fy, f'trappa_F_{h}'); satt(x, mark, f'trappa_fot_{h}')
    for L in m['layers']:
        if L['type'] == 'objectgroup':
            for o in L['objects']:
                if o['name'] == 'trappa':                 # trappans ruta: hela trappan, från krönet ned på marken
                    o['x'], o['y'], o['width'], o['height'] = TRAPPA_KOL[0] * 16, sy * 16 + 12, 32, 16 + 4 + 6
                    # ritad i rutlagret som kullen: ingen egen bild, bara en osynlig ruta (rutor: true)
                    o['properties'] = [p for p in o.get('properties', []) if p['name'] not in ('bild', 'rutor')]
                    o['properties'].append({'name': 'rutor', 'type': 'bool', 'value': True})
    return m

if __name__ == '__main__':
    m = forslag()
    ut = os.path.join(ROT, 'kap1', 'ut', 'rum', 'kap1_forslag'); os.makedirs(ut, exist_ok=True)
    json.dump(m, open(os.path.join(ut, 'glantan_hojd.tmj'), 'w'), ensure_ascii=False, indent=1)
    # provbild med rendera.py, men med det nya rutsetet
    src = open(os.path.join(ROT, 'kap1', 'rendera.py')).read().split("\nif __name__")[0]
    src = src.replace("os.path.join(REPO, 'assets', 'tiles', 'skog', 'skog.png')", repr(PNG))
    g = {'__name__': 'r'}; exec(src, g)
    im = g['rendera']('glantan', os.path.join(ut, 'glantan_hojd.tmj'))
    im.save('/tmp/glantan_hojd.png')
    fore = g['rendera']('glantan')
    print('klart', im.size)
