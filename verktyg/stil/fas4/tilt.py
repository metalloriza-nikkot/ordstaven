# Fas 4: introts blick från fönstret ned mot skrivbordet, som en Mode 7-tilt (SNES).
# Väggen med fönstret och bordsskivan är två plan i rummet. Kameran står vid bordet, tittar ut genom fönstret
# och vrider sedan blicken nedåt tills den ser rakt ned på skivan. Varje bild räknas ut i förväg med närmaste
# pixel, så kanterna blir hackiga på samma sätt som i SNES-spelens Mode 7, och spelet bara byter bild.
# Ut: mock/tilt_00..NN.png (320 x 192), sista bilden är startskärmens bord pixel för pixel.
import math
import numpy as np
from PIL import Image
exec(open('/home/claude/fas4/intro.py').read().split("if __name__ == '__main__':")[0])

def texturer(solupp=True):
    hog = fonstret(solupp)
    KANT = 160                                                         # tapet på sidorna, så att väggen fyller bilden
    bred = vagg(W + 2 * KANT, BORD_Y + 80); bred = gryning(bred, 0.3) if not solupp else bred
    bred.alpha_composite(hog.crop((0, 0, W, BORD_Y)), (KANT, 80))
    vagg_t = np.array(bred)                                            # rad 0 = överst, 80 rader tapet ovanför
    bord = skrivbord() if solupp else gryning(skrivbord(ljus=False))
    bord.alpha_composite(Image.open(UT + ('stav_bord_skugga.png' if solupp else 'stav_gryning.png')), (108, 29))
    bord.alpha_composite(Image.open(UT + 'skylt.png'), (94, 6))
    return vagg_t, np.array(bord)

def bild(vagg_t, bord_t, pitch, cy, cz, f=260.0):
    sy, sx = np.mgrid[0:H, 0:W].astype(float)
    p = math.radians(pitch)
    fram = np.array([0, -math.cos(p), -math.sin(p)]); upp = np.array([0, -math.sin(p), math.cos(p)])
    d = (fram[None, None, :] * f + np.stack([sx - 160, np.zeros_like(sx), np.zeros_like(sx)], -1)
         + upp[None, None, :] * (96 - sy)[..., None])
    ut = np.zeros((H, W, 4), np.uint8); ut[..., 3] = 255; ut[..., :3] = (20, 12, 6)
    # skivan, z = 0, y från 0 (vid väggen) till 192 (framkanten)
    with np.errstate(divide='ignore', invalid='ignore'):
        tb = np.where(d[..., 2] < 0, -cz / d[..., 2], np.inf)
        bx = 160 + tb * d[..., 0]; by = cy + tb * d[..., 1]
        okb = (tb > 0) & (bx >= 0) & (bx < W) & (by >= 0) & (by < H)
        tv = np.where(d[..., 1] < 0, -cy / d[..., 1], np.inf)          # väggen, y = 0
        vx = 160 + tv * d[..., 0] + 160; vz = cz + tv * d[..., 2]
        rad = vagg_t.shape[0] - 1 - vz
        okv = (tv > 0) & (vx >= 0) & (vx < vagg_t.shape[1]) & (vz >= 0) & (rad >= 0)
    vagg_vinner = okv & (~okb | (tv < tb))
    bord_vinner = okb & ~vagg_vinner
    ut[bord_vinner] = bord_t[by[bord_vinner].astype(int), bx[bord_vinner].astype(int)]
    ut[vagg_vinner] = vagg_t[rad[vagg_vinner].astype(int), vx[vagg_vinner].astype(int)]
    return Image.fromarray(ut)

def bana(n=14, solupp=True, start=(2.0, 262.0, 100.0)):
    vagg_t, bord_t = texturer(solupp)
    p0, y0, z0 = start
    bilder = []
    for i in range(n):
        s = i / (n - 1); s = s * s * (3 - 2 * s)                       # mjuk start och mjukt slut
        bilder.append(bild(vagg_t, bord_t, p0 + (90 - p0) * s, y0 + (96 - y0) * s, z0 + (260 - z0) * s))
    return bilder

if __name__ == '__main__':
    import sys
    B = bana()
    for i, im in enumerate(B): im.save(UT + 'tilt_%02d.png' % i)
    vagg_t, bord_t = texturer(False)
    bild(vagg_t, bord_t, 2.0, 262.0, 100.0).save(UT + 'tilt_gryning.png')
    val = [0, 3, 5, 7, 9, 10, 12, 13]
    ark = Image.new('RGBA', (W * 4 + 30, H * 2 + 10), (42, 26, 16, 255))
    for k, i in enumerate(val):
        ark.alpha_composite(B[i], ((k % 4) * (W + 10), (k // 4) * (H + 10)))
    ark.resize((ark.width * 2, ark.height * 2), Image.NEAREST).save('/tmp/tilt_ark.png')
    # en film av tilten att titta på: gryning, soluppgång, tilten och startskärmen, tre gånger större
    G = [Image.open(UT + 'tilt_gryning.png')] + B
    tider = [900] + [700] + [90] * (len(B) - 2) + [1200]
    G = [g.convert('RGB').resize((W * 3, H * 3), Image.NEAREST) for g in G]
    G[0].save('/tmp/tilt.gif', save_all=True, append_images=G[1:], duration=tider, loop=0)
    print(len(B), 'bilder')
