# Stil 8 (beslut 56.4 och 57.5): apan klättrar ned för stegen från plattformen, bakifrån som apa_klattra_01–02.
#   figurer/apa/apa_klattra_ned_01–02   16 x 16
# Skillnaden mot uppåt: en fot sträcks ned mot pinnen under, den andra handen håller högt, och huvudet är sänkt
# en pixel med ett öga som tittar ned över axeln. Bild 1 och 2 är varandras spegel, ca 180 ms var, som ungens klättring.
import os, sys
_cwd = os.getcwd(); os.chdir('/home/claude/apa')
exec(open('apa.py').read().split("if __name__")[0])
os.chdir(_cwd)
sys.path.insert(0, '/home/claude/palett')
from palett import Palett

def bak_ned(spegel=False):
    d = Duk(16, 16)
    for (x, y, t) in [(9, 14, 2), (10, 15, 2), (11, 15, 3)]: d.satt(x, y, 'pals', t, 'svans')    # svansen svänger åt sidan
    d.ellips(5.4, 15.0, 1.4, 1.2, 'pals', 'ben')         # foten som söker pinnen under
    d.ellips(10.6, 12.8, 1.4, 1.4, 'pals', 'ben')        # foten som står kvar
    d.ellips(8, 11.4, 3.3, 2.8, 'pals', 'kropp')
    d.ellips(3.2, 11.8, 1.2, 1.9, 'pals', 'arm')         # handen lågt, på pinnen vid magen
    d.ellips(12.8, 7.6, 1.2, 2.0, 'pals', 'arm')         # handen högt, håller i pinnen ovanför
    for cx in (2.6, 13.4): d.ellips(cx, 6.4, 1.9, 1.9, 'pals', 'ora')
    d.ellips(8, 6.2, 4.8, 4.3, 'pals', 'huvud')          # huvudet sänkt en pixel: han tittar ned
    for (x, y, t) in [(7, 1, 4), (8, 1, 3), (8, 2, 4)]: d.satt(x, y, 'pals', t, 'tofs')
    skilj(d, 'huvud', 'kropp', ton=1); skilj(d, 'huvud', 'ora', ton=1); skilj(d, 'arm', 'kropp', ton=1)
    d.kontur()
    im = d.bild(); p = im.load()
    # ett öga och lite av det ljusa ansiktet syns vid kinden, där han tittar ned över axeln
    for (x, y, c) in [(4, 8, '#F0D8B6'), (5, 8, '#F0D8B6'), (4, 7, '#1E140C'), (5, 9, '#E2C29A')]:
        p[x, y] = tuple(int(c[i:i+2], 16) for i in (1, 3, 5)) + (255,)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if spegel else im

B = {'figurer/apa/apa_klattra_ned_01': bak_ned(False), 'figurer/apa/apa_klattra_ned_02': bak_ned(True)}

if __name__ == '__main__':
    P = Palett(); UT = '/home/claude/kap1/ut/'
    for k, im in B.items():
        os.makedirs(os.path.dirname(UT + k), exist_ok=True); P.las_bild(im, k).save(UT + k + '.png')
    from PIL import Image as I
    stg = I.open('/home/claude/inkorg/foremal/skog/stege.png').convert('RGBA')
    ims = [I.open('/home/claude/inkorg/figurer/apa/apa_klattra_0%d.png' % i).convert('RGBA') for i in (1, 2)] + [I.open(UT + k + '.png').convert('RGBA') for k in B]
    o = I.new('RGBA', (4 * 24 + 8, 40), (111, 163, 74, 255))
    for i, im in enumerate(ims):
        o.alpha_composite(stg, (4 + i * 24, 4)); o.alpha_composite(im, (4 + i * 24, 12 + (i % 2) * 4))
    o.resize((o.width * 8, o.height * 8), I.NEAREST).save('/tmp/apa_ned.png'); print('ok')
