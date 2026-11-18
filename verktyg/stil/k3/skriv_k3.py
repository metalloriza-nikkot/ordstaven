# Kapitel 3 (beslut 100.6): skriver alla figurer, föremål och bildkort till ut/, läser dem mot paletten och räknar zonen.
# Kör: python3 skriv_k3.py   (kör i sin tur flodfolket, lägena, sköldpaddan, hornen, föremålen, tecknen och korten)
import os, sys, subprocess, glob
HAR = '/home/claude/k3'; os.chdir(HAR)
sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
from PIL import Image
UT = HAR + '/ut'
# grundställningen och gången (namn som byborna: <namn>_ga_<riktning>_01–04, och <namn>_<riktning>_01 = stillbilden)
G = {}; exec(open(HAR + '/flodfolket.py').read().split("if __name__ == '__main__':")[0], G)
for namn, rikt in G['gang']().items():
    os.makedirs(f'{UT}/figurer/{namn}', exist_ok=True)
    for r, bilder in rikt.items():
        for i, im in enumerate(bilder, 1): P.las_bild(im, namn).save(f'{UT}/figurer/{namn}/{namn}_ga_{r}_{i:02d}.png')
        P.las_bild(bilder[0], namn).save(f'{UT}/figurer/{namn}/{namn}_{r}_01.png')
# hornen
Hh = {}; exec(open(HAR + '/hornen.py').read().split("if __name__ == '__main__':")[0], Hh)
os.makedirs(f'{UT}/foremal/flod', exist_ok=True)
for n, im in (('hornet_mjol', Hh['stora_hornet']('mjol')), ('hornet_rent', Hh['stora_hornet']('rent')), ('frukosthorn', Hh['frukosthorn']())):
    P.las_bild(im, n).save(f'{UT}/foremal/flod/{n}.png')
for skript in ('lagen_k3.py', 'lagen_hu.py', 'skoldpadda.py', 'foremal_k3.py', 'tecken.py', 'kort_k3.py'):
    r = subprocess.run([sys.executable, skript], capture_output=True, text=True)
    if r.returncode: sys.exit(skript + ': ' + r.stderr[-600:])
# bildkorten är en zon tillsammans med kapitel 1–2: färger som bara de nya korten har slås ihop med närmaste som redan används
Z = {}; exec(open('/home/claude/bybor/zon.py').read().split("if __name__")[0], Z)
egna = {os.path.basename(f) for f in glob.glob(f'{UT}/bildkort/*.png')}
gamla = sorted(f for f in glob.glob('/home/claude/inkorg/bildkort/*.png') if os.path.basename(f) not in egna)   # bara kapitel 1–2
n_kort, byt = Z['krymp'](sorted(glob.glob(f'{UT}/bildkort/*.png')), gamla, tak=248)
print(f'bildkorten: {n_kort} färger, {len(byt)} ihopslagna')
# zonen floden: kapitel 3:s figurer och föremål, med hjälten, ungen, staven och HUD:en (bildkorten är en egen zon)
filer = glob.glob(f'{UT}/figurer/**/*.png', recursive=True) + glob.glob(f'{UT}/foremal/**/*.png', recursive=True)
ink = '/home/claude/inkorg'
filer += glob.glob(f'{ink}/figurer/hjalte/*.png') + glob.glob(f'{ink}/figurer/unge/*.png') + glob.glob(f'{ink}/ui/*.png')
filer += glob.glob(f'{ink}/figurer/baronen/*.png') + glob.glob(f'{ink}/figurer/herr_skata/*.png')
farger = set()
for f in filer:
    im = Image.open(f).convert('RGBA')
    farger |= {c[:3] for c in im.getdata() if c[3]}
kort = set()
for f in glob.glob(f'{UT}/bildkort/*.png') + glob.glob(f'{ink}/bildkort/*.png'):
    kort |= {c[:3] for c in Image.open(f).convert('RGBA').getdata() if c[3]}
print(f'zonen floden: {len(farger)} färger av 256 ({len(filer)} bilder)   bildkorten: {len(kort)} av 256')
print('nya bilder:', len(glob.glob(f'{UT}/**/*.png', recursive=True)))
