# 5d (beslut 50.2): ungen klättrar själv på stegen till apans bo. Två bilder, bakifrån som när den går uppåt:
# en klo högt upp och motsatt fot lyft, sedan tvärtom. figurer/unge/unge1_klattra_upp_01–02 (24 x 24).
# Teknik visar dem växelvis (ca 180 ms) medan ungen flyttas uppför stegen, som hjältens hjalte_klattra_upp.
import os
_cwd = os.getcwd(); os.chdir('/home/claude/unge2')
exec(open('anim.py').read().split('def lyft_bild(')[0])
os.chdir(_cwd)
import sys; sys.path.insert(0, '/home/claude/palett')
from palett import Palett
ALLA = {}
UT = '/home/claude/kap1/ut/'

def klattra(f):
    d = Duk(); vanster_upp = f == 0
    d.ellips(12, 6.0, 5.6, 4.2, 'huvud', 'huvud')
    d.ellips(12, 14.0, 9.2, 4.6, 'oliv', 'kropp')
    for i, cx in enumerate((5.5, 18.5)):                 # fötterna på pinnsteget, den ena lyft
        up = 2 if (i == 1) == vanster_upp else 0
        d.ellips(cx, 17.8 - up, 2.3, 2.4, 'oliv', 'ben')
        d.ellips(cx, 19.9 - up, 2.4, 1.3, 'bla', 'fot')
    d.ellips(12, 10.6, 8.4, 5.0, 'gra', 'rygg', platt=0.5, zbias=-0.3)
    borst(d, [(5, 8), (8, 7), (11, 6), (14, 7), (17, 8), (9, 11), (14, 11)])
    for i, cx in enumerate((4.2, 19.8)):                 # klorna: den ena högt upp mot nästa pinne
        hog = (i == 0) == vanster_upp
        cy = 4.0 if hog else 9.5
        d.ellips(cx, cy + 1.6, 1.6, 2.6 if hog else 1.8, 'oliv', 'arm')
        d.ellips(cx, cy, 1.5, 1.2, 'huvud', 'klo')
    for (x, y) in [(12, 16), (12, 17), (11, 17)]: d.satt(x, y, 'oliv', 2, 'svans')
    d.ellips(12, 19.2, 3.0, 2.2, 'klubba', 'klubba')
    skilj(d, 'rygg', 'huvud', ton=1); skilj(d, 'rygg', 'kropp', ton=1); skilj(d, 'klubba', 'rygg', ton=1); skilj(d, 'arm', 'rygg', ton=1)
    d.kontur()
    return d.bild()

for f in (0, 1): ALLA[f'figurer/unge/unge1_klattra_upp_{f+1:02d}'] = klattra(f)

if __name__ == '__main__':
    P = Palett()
    for k, im in ALLA.items():
        os.makedirs(os.path.dirname(UT + k), exist_ok=True); P.las_bild(im, k).save(UT + k + '.png')
    stg = Image.open('/home/claude/inkorg/foremal/skog/stege.png').convert('RGBA')
    o = Image.new('RGBA', (70, 40), (111, 163, 74, 255))
    for i, im in enumerate(ALLA.values()):
        o.alpha_composite(stg, (8 + i * 34 + 4, 4)); o.alpha_composite(im, (8 + i * 34, 10 - i * 4))
    o.resize((560, 320), Image.NEAREST).save('/tmp/k5d_unge.png'); print('ok')
