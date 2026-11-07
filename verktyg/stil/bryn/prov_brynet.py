# Provbild: skogsbrynet (40 x 12 rutor) med gräs, och alla föremål placerade efter kartan i repot
# (bildens nederkant mitt på objektets nederkant mitt). L2-varianten. Bara för att se att allt passar.
import os, json, random
from PIL import Image
ROT = '/home/claude'
os.chdir(os.path.join(ROT, 'rutor'))
exec(open('rutor.py').read().split("if __name__=='__main__':")[0])
os.chdir(ROT)
m = json.load(open('ordstaven/kartor/den-gomda-dalen/skogsbrynet.tmj'))
W, H = m['width'] * 16, m['height'] * 16
img = Image.new('RGBA', (W, H)); rnd = random.Random(5)
for ty in range(m['height']):
    for tx in range(m['width']):
        r = rnd.random()
        n = 'gras_blommor_' + str(rnd.randint(1, 2)) if r < 0.08 else ('gras_flack_' + str(rnd.randint(1, 2)) if r < 0.2 else 'gras_' + str(rnd.randint(1, 4)))
        img.paste(rutor[INDEX[n]][1], (tx * 16, ty * 16))
INK = 'inkorg/foremal/skog/'; NY = 'bryn/ut/foremal/skog/'
def bild(n):
    for d in (NY, INK, 'inkorg/figurer/djur/'):
        if os.path.exists(d + n + '.png'): return Image.open(d + n + '.png').convert('RGBA')
    return None
BILD = {'skylt_farfar_1': 'skylt_farfar', 'barbuske_brynet': 'barbuske', 'lag_sten_2': 'lag_sten', 'ekorre_gren': 'ekorre_gren_01'}
VISA = ['hack_oppen', 'skylt_ingang', 'skylt_farfar_1', 'barbuske_brynet', 'hog_sten', 'lag_sten', 'lag_sten_2', 'trad_med_formel',
        'stubbe', 'liten_lian', 'skylt_bar', 'ekorre_gren', 'gren']
obj = {o['name']: o for L in m['layers'] if L['type'] == 'objectgroup' for o in L['objects']}
lager = []
for n in VISA:
    o = obj['hack' if n == 'hack_oppen' else n]; b = bild(BILD.get(n, n))
    if n == 'gren': o = dict(o, x=84, y=114, width=26, height=6)   # som den ligger framför en prövad sten
    if b is None: print('saknas', n); continue
    x = int(o['x'] + o['width'] / 2 - b.width / 2); y = int(o['y'] + o['height'] - b.height)
    lager.append((y + b.height, b, x, y))
o = obj['lianer']; a, bb = bild('lian_a'), bild('lian_b')
for i, x in enumerate(range(int(o['x']), int(o['x'] + o['width']), 24)):
    b = a if i % 2 == 0 else bb; lager.append((o['y'] + o['height'], b, x, int(o['y'] + o['height'] - b.height)))
h = Image.open('hjalte2/ut/hjalte/hjalte_ga_upp_01.png').convert('RGBA') if os.path.exists('hjalte2/ut/hjalte/hjalte_ga_upp_01.png') else None
if h: lager.append((184, h, 56, 160))
for _, b, x, y in sorted(lager, key=lambda t: t[0]): img.alpha_composite(b, (x, y))
img.save('bryn/prov_brynet.png')
img.resize((W * 2, H * 2), Image.NEAREST).save('bryn/prov_brynet_x2.png')
print('ok')
