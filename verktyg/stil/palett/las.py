# Låser bilderna till masterpaletten (stilguiden §2, beslut 28.4). Sista steget innan något läggs i inkorgen.
# Körning:  python3 palett/las.py <mapp> [<mapp> ...]   (skriver om bilderna på plats)
#           python3 palett/las.py --prova <mapp>        (skriver inget, säger bara vad som är fel)
# Färger som inte syns skilja från en palettfärg (deltaE < 3) byts mot den. En ny färg stoppar körningen:
# antingen ritas den om med en palettfärg, eller så lägger Stil in den i palett.json under "tillagg" med ett skäl.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palett import Palett
from PIL import Image

def main(arg):
    prova = '--prova' in arg; mappar = [a for a in arg if a != '--prova']
    P = Palett(); fel = []; n = 0
    for m in mappar:
        for r, ds, fs in os.walk(m):
            for f in sorted(fs):
                if not f.endswith('.png'): continue
                p = os.path.join(r, f)
                try:
                    im = P.las_bild(Image.open(p), p)
                    if not prova: im.save(p)
                    n += 1
                except ValueError as e:
                    fel.append(str(e))
    print(f'{n} bilder ur paletten ({len(P.farger)} färger)' + (' (provkörning)' if prova else ''))
    for e in fel: print('NY FÄRG:', e)
    return 1 if fel else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
