# Bildkort för krönet (48 x 48): kullen med klippkanten, en trappa upp mitt i klippan
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
STEN = ['#3E4148', '#6E747F', '#7E838C', '#8E949E', '#A4A9B0', '#B8BEC6']  # trappans sten, mörk -> ljus
INK = os.path.join(ROT, 'inkorg')

def kron():
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    # Kullen: platåns nordkant, sydkant med ljus kant och klippans framsida, tre rutor bred.
    for ry, rad in enumerate(['N', 'S', 'F']):
        for rx, kol in enumerate(['W', '', 'E']):
            n = (rad + kol) if rad != 'S' or kol else 'S'
            im.paste(rutor[INDEX['kulle_' + n]][1], (rx * 16, ry * 16))
    px = im.load()
    # Trappan: huggen i klippan mitt fram, fyra steg ned mot oss. Ljuset uppifrån till vänster.
    x0, x1, y0 = 17, 30, 32
    for y in range(y0, 48):
        for x in range(x0, x1 + 1):
            if x in (x0, x1):
                px[x, y] = hx(STEN[0]); continue           # sidomurarna, mörk kontur
            k = (y - y0) % 4
            if k == 0:   c = STEN[0]                         # stegets framkant
            elif k == 1: c = STEN[5] if x < x0 + 5 else STEN[4]  # stegets ovansida, ljusast till vänster
            elif k == 2: c = STEN[4] if x < x0 + 5 else STEN[3]
            else:        c = STEN[2]                         # sättsteget
            if x == x1 - 1 and k != 0: c = STEN[1]           # skugga mot högra muren
            px[x, y] = hx(c)
    # Ljus kant där trappan möter platån.
    for x in range(x0 + 1, x1):
        px[x, y0 - 1] = hx(STEN[5])
    # Lövhögen uppe på krönet, lite till vänster så att trappan syns fri.
    lov = Image.open(os.path.join(INK, 'foremal/skog/lovhog.png')).convert('RGBA')
    im.alpha_composite(lov, (8, 8))
    # Kortet: kullen flyttas upp 6 pixlar, och en remsa gräs nedanför visar att trappan börjar på marken.
    kort = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    kort.paste(im.crop((0, 6, 48, 48)), (0, 0))
    gras = rutor[INDEX['gras_1']][1]
    for rx in range(3):
        kort.paste(gras.crop((0, 0, 16, 6)), (rx * 16, 42))
    return kort

if __name__ == '__main__':
    ut = os.path.join(HAR, 'ut', 'bildkort'); os.makedirs(ut, exist_ok=True)
    k = P.las_bild(kron(), 'uppdrag_kullen')
    k.save(os.path.join(ut, 'uppdrag_kullen.png'))
    k.resize((48 * 6, 48 * 6), Image.NEAREST).save(os.path.join(HAR, 'kron_x6.png'))
    print('klar')
