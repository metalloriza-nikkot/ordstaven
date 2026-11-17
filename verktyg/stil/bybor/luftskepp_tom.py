# Kapitel 2 (beslut 96): luftskepp_tom, 112 x 96, skeppet med tom gondol och repstegen nere.
# Samma storlek och läge som luftskepp_glider_01. Bilden i inkorgen är facit (den har senare rättelser vid
# propellern), så baronen tas bort ur den: masken är de pixlar där pass3 ritar baronen, och där tar vi
# pass3:s tomma gondol. Resten av bilden är densamma pixel för pixel.
import os, sys
import numpy as np
from PIL import Image
HAR = '/home/claude/pass3'; sys.path.insert(0, HAR); os.chdir(HAR)
import pass3
sys.path.insert(0, '/home/claude/palett'); from palett import Palett
INK = '/home/claude/inkorg/figurer/baronen/'

def luftskepp_tom():
    med = np.array(pass3.luftskepp('kikare_fel', 0))
    utan = np.array(pass3.luftskepp(None, 0))
    mask = (med != utan).any(axis=2)                       # där baronen och kikaren står
    ink = np.array(Image.open(INK + 'luftskepp_glider_01.png').convert('RGBA'))
    ut = ink.copy(); ut[mask] = utan[mask]
    return Image.fromarray(ut), int(mask.sum())

if __name__ == '__main__':
    im, n = luftskepp_tom()
    Palett().las_bild(im.copy(), 'luftskepp_tom')         # stoppar om en färg är ny
    f = '/home/claude/bybor/ut/figurer/baronen/luftskepp_tom.png'
    os.makedirs(os.path.dirname(f), exist_ok=True); im.save(f)
    g = Image.new('RGBA', (112 * 2 + 4, 96), (40, 60, 90, 255))
    g.alpha_composite(Image.open(INK + 'luftskepp_glider_01.png').convert('RGBA'), (0, 0)); g.alpha_composite(im, (116, 0))
    g.resize((g.width * 3, g.height * 3), Image.NEAREST).save('/tmp/luftskepp_tom_x3.png')
    print('klart, baronens pixlar:', n)
