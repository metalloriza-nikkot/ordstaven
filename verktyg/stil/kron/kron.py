# Bildkort för krönet (48 x 48): kullen med klippkanten, trappan ur höjdkitet mitt i sydsidan
# och en lövhög uppe på platån. Används i molnet vid "GÅ UPP PÅ KULLEN!" (k1s08).
import os, sys
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__))
ROT = os.path.dirname(HAR)
sys.path.insert(0, os.path.join(ROT, 'palett'))
from palett import Palett
P = Palett()

# Rutorna ur skogens rutset (samma kod som rutset och glänta).
_cwd = os.getcwd(); os.chdir(os.path.join(ROT, 'rutor'))
exec(open('rutor.py').read().split("if __name__=='__main__':")[0])
os.chdir(_cwd)

def hx(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
INK = os.path.join(ROT, 'inkorg')

def kron():
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    # Kullen: platåns nordkant, sydkant med ljus kant och klippans framsida, tre rutor bred.
    for ry, rad in enumerate(['N', 'S', 'F']):
        for rx, kol in enumerate(['W', '', 'E']):
            n = (rad + kol) if rad != 'S' or kol else 'S'
            im.paste(rutor[INDEX['kulle_' + n]][1], (rx * 16, ry * 16))
    # Trappan: samma rutor som i rummet (höjdkitet, 10b), mitt i sydsidan. Kortet är bara tre rutor
    # brett, så trappan smalnas till en ruta: vänster halva av V-rutan och höger halva av H-rutan.
    def halvor(rad, y, h=16):
        for i, s in enumerate('VH'):
            r = rutor[INDEX[f'trappa_{rad}_{s}']][1].crop((i * 8, 0, i * 8 + 8, h))
            yield r, (16 + i * 8, y)
    for ry, rad in ((1, 'S'), (2, 'F')):
        for r, xy in halvor(rad, ry * 16):
            im.alpha_composite(r, xy)
    # Lövhögen uppe på krönet, lite till vänster så att trappan syns fri.
    lov = Image.open(os.path.join(INK, 'foremal/skog/lovhog.png')).convert('RGBA')
    im.alpha_composite(lov, (8, 8))
    # Kortet: kullen flyttas upp 6 pixlar, och en remsa gräs nedanför visar att trappan börjar på marken.
    kort = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    kort.paste(im.crop((0, 6, 48, 48)), (0, 0))
    # Marken nedanför: kullens skugga söderut och trappans nedersta steg.
    skugga = rutor[INDEX['skugga_S']][1]
    for rx in range(3):
        kort.paste(skugga.crop((0, 0, 16, 6)), (rx * 16, 42))
    for r, (x, _) in halvor('fot', 0, 6):
        kort.paste(r, (x, 42))
    return kort

if __name__ == '__main__':
    ut = os.path.join(HAR, 'ut', 'bildkort'); os.makedirs(ut, exist_ok=True)
    k = P.las_bild(kron(), 'uppdrag_kullen')
    k.save(os.path.join(ut, 'uppdrag_kullen.png'))
    k.resize((48 * 6, 48 * 6), Image.NEAREST).save(os.path.join(HAR, 'kron_x6.png'))
    print('klar')
