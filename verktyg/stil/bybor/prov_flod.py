# Prov (inte leverans): flodfolket i 16 x 24 bredvid vassbyn, för beslut 81.6.
import os, sys
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('bybor.py').read().split('# ---------- gången')[0])
MAT['marin'] = ['#0e1a50', '#1a3290', '#2a52c8', '#4f7ae8', '#9ab6ff']
MAT['blek'] = ['#7a522c', '#d8a85a', '#e8d07a', '#fff0b0', '#ffffff']
def flodbo(hud, rand=2, hatt='kask', vy='fram'):
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.0, 1.9, 1.2, 'brun', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.0, 10.0): d.ellips(cx, 19.6, 1.4, 1.8, 'jacka', 'ben', toner=(0, 1, 1, 2))
    d.ellips(8, 15.8, 4.4, 3.4, 'vit', 'kropp')
    for cx in (3.1, 12.9): d.ellips(cx, 15.6, 1.3, 2.4, 'vit', 'arm')
    for cx in (3.1, 12.9): d.ellips(cx, 18.0, 1.0, 0.9, hud, 'hand')
    d.ellips(8, 9.0, 5.8, 5.0, hud, 'huvud', zbias=0.22)
    if hatt == 'platt':
        d.ellips(8, 5.6, 7.9, 1.5, 'blek', 'bratte', zbias=0.2, platt=0.6)
        d.ellips(8, 3.6, 4.2, 2.2, 'blek', 'krona', zbias=-0.05, klipp=lambda x, y: y >= 2)
    skilj(d, 'arm', 'kropp'); skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud')
    d.kontur()
    for (x, y), nm in list(d.del_.items()):
        if nm in ('kropp', 'arm') and (y // rand) % 2 == (12 // rand) % 2 and d.px[(x, y)][1] > 0:
            d.satt(x, y, 'marin', min(4, d.px[(x, y)][1]))
        if nm == 'krona' and y == 4: d.satt(x, y, 'marin', 2 if x % 2 else 4)
    ogon_fram(d, 8, 8 if hatt else 9); leende_fram(d, 8, 11, 2)
    return d.bild()
from PIL import ImageDraw, ImageFont
ny = Image.open('ut/figurer/tant_rosa/tant_rosa_ner_01.png')
fig = [('Tant Rosa', ny)] + [(n, Image.open(f'ut/figurer/{n}/{n}_ner_01.png')) for n in ('tvatterskan', 'bo')]
fig += [('ränder 1 px', flodbo('gron', 1, 'platt')), ('ränder 2 px', flodbo('ockra', 2, 'platt')),
        ('2 px, lila hud', flodbo('lila', 2, 'platt')), ('2 px, blå hud', flodbo('blahud', 2, 'platt'))]
W = len(fig) * 28 + 4
o = Image.new('RGBA', (W, 30), (126, 170, 74, 255))
for i, (n, im) in enumerate(fig): o.alpha_composite(im, (4 + i * 28 - (im.width - 16) // 2, 3))
big = o.resize((W * 6, 180), Image.NEAREST)
ram = Image.new('RGBA', (big.width, 220), (250, 246, 236, 255)); ram.alpha_composite(big, (0, 0))
dr = ImageDraw.Draw(ram); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
for i, (n, im) in enumerate(fig): dr.text((6 * (2 + i * 28), 188), n, fill=(50, 40, 30), font=f)
ram.save('/mnt/user-data/outputs/prov_flodfolket_x6.png')

# Förslag: vassbyn släpper blått och ränder till flodfolket
def byt(im, fran, till, rader=None):
    im = im.copy(); p = im.load(); m = {hx(a): hx(b) for a, b in zip(MAT[fran], MAT[till])}
    for y in range(im.height if rader is None else rader):
        for x in range(im.width):
            c = p[x, y]
            if c[3] and c[:3] in m: p[x, y] = m[c[:3]] + (255,)
    return im
sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
tv = P.las_bild(byt(Image.open('ut/figurer/tvatterskan/tvatterskan_ner_01.png').convert('RGBA'), 'jacka', 'rosa'))
bo = P.las_bild(byt(Image.open('ut/figurer/bo/bo_ner_01.png').convert('RGBA'), 'vit', 'rod', rader=8))
fig2 = [('tvätterskan nu', fig[1][1]), ('förslag', tv), ('Bo nu', fig[2][1]), ('förslag', bo), ('flodfolket', fig[4][1]), ('Tant Rosa', ny)]
W = len(fig2) * 28 + 4
o = Image.new('RGBA', (W, 30), (126, 170, 74, 255))
for i, (n, im) in enumerate(fig2): o.alpha_composite(im, (4 + i * 28 - (im.width - 16) // 2, 3))
big = o.resize((W * 6, 180), Image.NEAREST)
ram = Image.new('RGBA', (big.width, 220), (250, 246, 236, 255)); ram.alpha_composite(big, (0, 0))
dr = ImageDraw.Draw(ram)
for i, (n, im) in enumerate(fig2): dr.text((6 * (2 + i * 28), 188), n, fill=(50, 40, 30), font=f)
ram.save('/mnt/user-data/outputs/prov_vassbyn_forslag_x6.png')
