# Ritar en karta ur repot som spelet gör: rutlagren (golv, eget lager, over) och föremålen med regeln om
# nederkantens mitt. Bilderna tas ur inkorgen (och ur 5d:s nya bilder i kap1/ut/ om de finns).
# Användning: python3 kap1/rendera.py glantan [ut.png] [skala]   (bara en provbild, inget till spelet)
import os, sys, json
from PIL import Image
ROT = '/home/claude'
REPO = os.path.join(ROT, 'ordstaven')
SOK = [os.path.join(ROT, 'kap1', 'ut'), os.path.join(ROT, 'inkorg')]

OVANPA = {'ugglor'}   # förslag 5d: ugglorna ritas ovanpå det gamla trädets krona

def hitta(namn):
    for bas in SOK:
        for d, _, fs in os.walk(bas):
            if namn + '.png' in fs: return Image.open(os.path.join(d, namn + '.png')).convert('RGBA')
    return None

def rendera(karta, kartfil=None, dolda=True):
    m = json.load(open(kartfil or os.path.join(REPO, 'kartor', 'den-gomda-dalen', karta + '.tmj')))
    ts = Image.open(os.path.join(REPO, 'assets', 'tiles', 'skog', 'skog.png')).convert('RGBA')
    W, H = m['width'] * 16, m['height'] * 16
    def ruta(gid):
        i = gid - 1; return ts.crop(((i % 8) * 16, (i // 8) * 16, (i % 8) * 16 + 16, (i // 8) * 16 + 16))
    def lager(L, im):
        for k, gid in enumerate(L['data']):
            if gid: im.alpha_composite(ruta(gid & 0x0FFFFFFF), ((k % m['width']) * 16, (k // m['width']) * 16))
    im = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    over = []
    for L in m['layers']:
        if L['type'] == 'tilelayer':
            if L['name'] == 'over': over.append(L)
            elif L['name'] == 'golv' or dolda: lager(L, im)
    ytor, platt, hoga, ovanpa = [], [], [], []
    for L in m['layers']:
        if L['type'] != 'objectgroup': continue
        for o in L['objects']:
            p = {q['name']: q['value'] for q in o.get('properties', [])}
            if p.get('rutor') or o.get('type') in ('utgang', 'omgivning', '') and 'bild' not in p: continue
            rad = p.get('bild_rad', '').split(',') if p.get('bild_rad') else None
            namn = p.get('bild') or (rad[0] if rad else None)
            if not namn: continue
            if rad and p.get('delas') == 'djup':            # liangången: sex delar på djupet, en bild per del
                n = 6
                for i in range(n):
                    y1 = o['y'] + round((i + 1) * o['height'] / n); b = hitta(rad[i % len(rad)])
                    platt.append((b, int(o['x'] + o['width'] / 2 - b.width / 2), int(y1 - b.height)))
                continue
            if rad and len(rad) > 1 and p.get('delas') != 'hela':   # en rad bilder längs föremålet
                b0 = hitta(rad[0]); n = max(1, int(o['width'] // b0.width))
                for i in range(len(rad)):
                    b = hitta(rad[i]); x = int(o['x'] + i * o['width'] / len(rad) + (o['width'] / len(rad) - b.width) / 2)
                    (ovanpa if o['name'] in OVANPA else platt).append((b, x, int(o['y'] + o['height'] - b.height)))
                continue
            b = hitta(namn)
            if b is None: print('saknas', o['name'], namn); continue
            x = int(o['x'] + o['width'] / 2 - b.width / 2); y = int(o['y'] + o['height'] - b.height)
            if o.get('type') == 'yta': ytor.append((b, x, y))
            elif b.height > o['height'] + 6: hoga.append((o['y'] + o['height'], b, x, y))
            else: platt.append((b, x, y))
    # som spelet: ytorna, sedan de låga föremålen, sedan de höga bilderna bland figurerna (efter foten), sist ridån
    for b, x, y in ytor + platt: im.alpha_composite(b, (x, y))
    for _, b, x, y in sorted(hoga, key=lambda t: t[0]): im.alpha_composite(b, (x, y))
    for b, x, y in ovanpa: im.alpha_composite(b, (x, y))
    for L in over: lager(L, im)
    return im

if __name__ == '__main__':
    k = sys.argv[1]; ut = sys.argv[2] if len(sys.argv) > 2 else f'/tmp/{k}.png'; s = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    im = rendera(k); im.resize((im.width * s, im.height * s), Image.NEAREST).save(ut); print(ut, im.size)
