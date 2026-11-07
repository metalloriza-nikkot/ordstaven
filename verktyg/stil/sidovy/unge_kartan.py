# Ungen i detaljerad sidovy (grafiklistan steg 9) till kartbit 2 i närbilden (k1s11): ungen sätter nosen på
# mammas skugga mitt i dalen och viftar med svansklubban. Samma figur som i spelet, ritad i dubbel storlek
# med fler detaljer (borsten på ryggen, ränderna, tårna), åt höger.
#   sidovyer/kartbit_unge_01.png, _02.png   52 x 44: nosen nere och glada ögon, klubban uppe / nere
import os, sys
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.dirname(HAR)
sys.path.insert(0, os.path.join(ROT, 'palett'))
from palett import Palett
P = Palett()
_cwd = os.getcwd(); os.chdir(os.path.join(ROT, 'unge2'))
exec(open('anim.py').read().split('def ner(')[0])     # Duk, MAT, färgerna och borst/skilj
os.chdir(_cwd)

def unge_stor(f=0):
    S = 2; ox, oy = 2, 0
    d = Duk(52, 44)
    def e(cx, cy, rx, ry, m, n, **k): d.ellips(cx * S + ox, cy * S + oy, rx * S, ry * S, m, n, **k)
    kl = -1.2 if f == 0 else 0.8                          # svansklubban uppe / nere
    hy = 2.2                                              # huvudet nere mot kartan
    e(1.6, 9.2 + kl, 2.3, 1.9, 'klubba', 'klubba')
    for cx in (6.0, 13.4):                                # bortre benen
        e(cx, 17.4, 1.6, 2.4, 'oliv', 'benb', toner=(0, 1, 1, 2)); e(cx + 0.3, 19.7, 1.4, 1.0, 'bla', 'fotb', toner=(0, 1, 2, 2))
    e(11.6, 13.6, 7.0, 4.6, 'oliv', 'kropp')
    # en kort svans snett bakåt upp till klubban
    for i in range(6):
        t = i / 5; x = 5.2 - t * 3.0; y = 13.0 + (9.2 + kl + 0.8 - 13.0) * t
        e(x, y, 1.2 - t * 0.4, 1.0 - t * 0.2, 'oliv', 'svans')
    e(10.8, 10.4, 6.8, 3.6, 'gra', 'rygg', platt=0.6, zbias=-0.2)
    for cx in (8.8, 16.4):                                # närmre benen
        e(cx, 17.8, 1.8, 2.4, 'oliv', 'ben'); e(cx + 0.4, 20.1, 1.6, 1.1, 'bla', 'fot')
    e(18.2, 12.6 + hy, 5.4, 4.9, 'huvud', 'huvud', zbias=0.05)
    e(21.4, 14.8 + hy, 2.4, 1.6, 'huvud', 'nos', toner=(2, 3, 3, 4), zbias=0.2)
    skilj(d, 'huvud', 'kropp'); skilj(d, 'huvud', 'rygg', ton=1); skilj(d, 'rygg', 'kropp', ton=1); skilj(d, 'ben', 'kropp', ton=1)
    d.kontur()
    # borsten på ryggen: små tofsar med ljus topp längs ryggens överkant
    for x in range(9, 40, 3):
        topp = next((y for y in range(44) if d.del_.get((x, y)) == 'rygg' and d.px[(x, y)][1] != 0), None)
        if topp is None: continue
        d.satt(x, topp - 1, 'gra', 3, 'tofs'); d.satt(x + 1, topp - 1, 'gra', 2, 'tofs')
        d.satt(x, topp - 2, 'gra', 4, 'tofs'); d.satt(x, topp - 3, 'gra', 0, 'tofs'); d.satt(x + 1, topp - 2, 'gra', 0, 'tofs')
        d.satt(x - 1, topp - 2, 'gra', 0, 'tofs'); d.satt(x - 1, topp - 1, 'gra', 0, 'tofs'); d.satt(x + 2, topp - 1, 'gra', 0, 'tofs')
        d.satt(x, topp + 2, 'gra', 1); d.satt(x + 1, topp + 3, 'gra', 1)
    # ränder på kroppen i skuggtonen
    for (x, y) in [(12, 26), (12, 27), (13, 28), (18, 28), (18, 29), (19, 30), (24, 28), (24, 29), (25, 30)]:
        if d.px.get((x, y), ('', 0))[0] == 'oliv': d.satt(x, y, 'oliv', 1)
    # tår: ljusa pixlar framme på fötterna
    for cx in (8.8, 16.4):
        fx, fy = round((cx + 0.4) * S + ox + 2), round(20.1 * S + 1)
        for k in (0, 2):
            if d.px.get((fx - k, fy), ('', 0))[0] == 'bla': d.satt(fx - k, fy, 'bla', 4)
    im = d.bild()
    # glada ögon (^), rosa kind, liten mun och glans på nosen
    x, y = 36 + ox, 22 + round(hy * S) - 4
    for (a, b) in [(0, 2), (1, 1), (2, 0), (3, 0), (4, 1), (5, 2)]: im.putpixel((x + a - 2, y + b), hx(EYE) + (255,))
    for (a, b) in [(0, 0), (1, 0), (0, 1), (1, 1)]: im.putpixel((x - 1 + a, y + 5 + b), hx(ROS) + (255,))
    for (a, b) in [(6, 7), (7, 7), (8, 7)]: im.putpixel((x + a, y + b), hx(MUN) + (255,))
    return im

BILDER = {'sidovyer/kartbit_unge_01': unge_stor(0), 'sidovyer/kartbit_unge_02': unge_stor(1)}
if __name__ == '__main__':
    for k, v in BILDER.items():
        f = os.path.join(HAR, 'ut', k + '.png'); os.makedirs(os.path.dirname(f), exist_ok=True)
        P.las_bild(v, os.path.basename(k)).save(f)
    kb = Image.open(os.path.join(ROT, 'inkorg', 'karta', 'kartbit_2.png')).convert('RGBA')
    c = Image.new('RGBA', (kb.width + 120, max(kb.height, 48) + 8), (244, 236, 215, 255))
    c.alpha_composite(kb, (4, 4))
    c.alpha_composite(BILDER['sidovyer/kartbit_unge_01'], (kb.width + 10, 4))
    c.alpha_composite(BILDER['sidovyer/kartbit_unge_02'], (kb.width + 64, 4))
    c.resize((c.width * 4, c.height * 4), Image.NEAREST).save(os.path.join(HAR, 'kartbit_unge_x4.png'))
    print('klar', kb.size)
