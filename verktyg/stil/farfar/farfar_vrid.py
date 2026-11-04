# Farfar åt alla håll (beslut 34.2): figurerna vänder sig mot varandra när ett samtal börjar.
# Farfar stående finns framifrån (farfar.py, figur('B') och figur_natt). Här ritas höger, vänster och bakifrån,
# på morgonen (brun kofta) och på natten (vinröd morgonrock med kakaokoppen). Samma rutnät, 16 x 24.
# Vänster är spegelvänd höger, som för hjälten.
import os, sys
HAR = os.path.dirname(os.path.abspath(__file__))
os.chdir(HAR)
exec(open('farfar.py').read().split("if __name__=='__main__':")[0])
exec("MAT['rock']=['#2A0E16','#5A1E2C','#7A2A3A','#9C4252','#C06A78']")
from PIL import Image

def huvud_sida(d):
    """Skalligt huvud från sidan, vänt åt höger: vitt hår i nacken, skägget under kinden framåt och näsan."""
    d.ellips(7.8, 7.6, 5.4, 5.6, 'hud', 'huvud', zbias=0.05)
    d.ellips(3.6, 8.8, 1.4, 2.0, 'skagg', 'har')                 # håret i nacken
    d.ellips(10.0, 12.4, 3.0, 2.1, 'skagg', 'skagg', zbias=0.15)   # skägget, under kinden och framåt
    d.ellips(13.2, 9.2, 0.9, 0.9, 'hud', 'nos', zbias=0.3)        # näsan sticker ut

def detaljer_sida(d):
    for x in (7, 8, 9): d.fast(x, 8, GLAS)                        # glasögonens skalm bak mot örat
    d.fast(10, 8, GLAS); d.fast(11, 8, OGA); d.fast(12, 8, GLAS)  # glaset runt ögat
    d.fast(11, 7, GLAS); d.fast(11, 9, GLAS)
    for x in (10, 11, 12): d.satt(x, 6, 'skagg', 3)               # det buskiga ögonbrynet
    for x in (11, 12, 13): d.satt(x, 10, 'skagg', 4)              # mustaschen
    d.fast(6, 9, '#3E7A52')                                       # örat i hudens skugga

def morgon_hoger():
    d = Duk(16, 24)
    d.ellips(7.6, 22.0, 1.9, 1.1, 'kofta', 'skob', toner=(0, 1, 1, 2))
    d.ellips(7.4, 19.6, 1.5, 2.0, 'kofta', 'benb', toner=(0, 1, 2, 2))
    d.ellips(7.6, 15.8, 3.8, 3.2, 'kofta', 'kropp')
    d.ellips(8.6, 22.1, 2.0, 1.2, 'kofta', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8.2, 19.7, 1.5, 2.0, 'kofta', 'ben', toner=(0, 1, 2, 2))
    huvud_sida(d)
    d.ellips(8.6, 15.6, 1.3, 2.3, 'kofta', 'arm')
    d.ellips(8.8, 17.8, 1.0, 0.9, 'hud', 'hand')
    skilj(d, 'skagg', 'kropp', ton=1); skilj(d, 'arm', 'kropp', ton=1); skilj(d, 'har', 'huvud', ton=2)
    d.kontur()
    detaljer_sida(d)
    for x in range(5, 11):                                          # koftans ljusa kant nertill
        if d.px.get((x, 18), ('', 0))[0] == 'kofta': d.satt(x, 18, 'kofta', 4)
    d.fast(11, 15, GLAS); d.fast(11, 16, '#C83A3A')                 # kompassen, från sidan
    return d.bild()

def morgon_upp():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 21.8, 1.9, 1.2, 'kofta', 'sko', toner=(0, 1, 1, 2))
    for cx in (6.0, 10.0): d.ellips(cx, 19.4, 1.5, 2.0, 'kofta', 'ben', toner=(0, 1, 2, 2))
    for cx in (3.3, 12.7): d.ellips(cx, 15.4, 1.3, 2.2, 'kofta', 'arm')
    d.ellips(8, 15.8, 4.4, 3.2, 'kofta', 'kropp')
    d.ellips(8, 7.6, 5.6, 5.6, 'hud', 'huvud', zbias=0.05)
    d.ellips(8, 10.4, 5.4, 2.0, 'skagg', 'har', zbias=0.1)        # hårkransen bak, lågt i nacken
    for cx in (2.8, 13.2): d.ellips(cx, 9.6, 1.0, 1.4, 'skagg', 'skagg')   # skägget syns vid kinderna
    skilj(d, 'kropp', 'arm', ton=1); skilj(d, 'har', 'huvud', ton=2)
    d.kontur()
    for x in range(5, 12):
        if d.px.get((x, 18), ('', 0))[0] == 'kofta': d.satt(x, 18, 'kofta', 4)
    for x in (4, 12): d.fast(x, 8, GLAS)                            # glasögonens skalmar bakom öronen
    return d.bild()

def natt_hoger():
    d = Duk(16, 24)
    d.ellips(7.6, 22.2, 1.9, 1.0, 'kofta', 'skob', toner=(0, 1, 1, 2))
    d.ellips(8.6, 22.3, 2.0, 1.0, 'kofta', 'sko', toner=(0, 1, 1, 2))
    d.ellips(7.8, 17.6, 4.0, 5.0, 'rock', 'rock')
    huvud_sida(d)
    d.ellips(10.0, 15.6, 1.4, 2.0, 'rock', 'arm')
    d.ellips(11.6, 16.8, 1.0, 0.9, 'hud', 'hand')
    skilj(d, 'skagg', 'rock', ton=1); skilj(d, 'arm', 'rock', ton=1); skilj(d, 'har', 'huvud', ton=2)
    d.kontur()
    detaljer_sida(d)
    for x in range(4, 12):                                          # skärpet
        if d.px.get((x, 18), ('', 0))[0] == 'rock': d.satt(x, 18, 'rock', 4)
    for (x, y, c) in [(12, 15, '#F2F4F6'), (13, 15, '#F2F4F6'), (12, 16, '#DCE0E4'), (13, 16, '#DCE0E4'), (14, 15, '#B8BEC6'),
                      (12, 14, '#6B4630'), (13, 14, '#8A6044')]:   # kakaokoppen framför honom
        d.fast(x, y, c)
    return d.bild()

def natt_upp():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.0, 1.9, 1.1, 'kofta', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 17.6, 4.6, 5.0, 'rock', 'rock')
    for cx in (3.3, 12.7): d.ellips(cx, 15.4, 1.4, 2.3, 'rock', 'arm')
    d.ellips(8, 7.6, 5.6, 5.6, 'hud', 'huvud', zbias=0.05)
    d.ellips(8, 10.4, 5.4, 2.0, 'skagg', 'har', zbias=0.1)
    for cx in (2.8, 13.2): d.ellips(cx, 9.6, 1.0, 1.4, 'skagg', 'skagg')
    skilj(d, 'rock', 'arm', ton=1); skilj(d, 'har', 'huvud', ton=2)
    d.kontur()
    for x in range(4, 13):
        if d.px.get((x, 18), ('', 0))[0] == 'rock': d.satt(x, 18, 'rock', 4)
    for x in (4, 12): d.fast(x, 8, GLAS)
    return d.bild()

if __name__ == '__main__':
    ut = os.path.join(HAR, 'ut'); os.makedirs(ut, exist_ok=True)
    bilder = {}
    for tid, h, u in (('morgon', morgon_hoger, morgon_upp), ('natt', natt_hoger, natt_upp)):
        hh = h(); bilder[f'farfar_{tid}_hoger_01'] = hh
        bilder[f'farfar_{tid}_vanster_01'] = hh.transpose(Image.FLIP_LEFT_RIGHT)
        bilder[f'farfar_{tid}_upp_01'] = u()
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett
    P = Palett()
    for n, im in bilder.items(): P.las_bild(im, n).save(os.path.join(ut, n + '.png'))   # läses till paletten
    # översikt: ner (befintlig), höger, vänster, upp – morgon och natt
    BG = (196, 150, 98, 255); ov = Image.new('RGBA', (4 * 20 + 4, 2 * 28 + 4), BG)
    for r, tid in enumerate(('morgon', 'natt')):
        for c, rikt in enumerate(('ner', 'hoger', 'vanster', 'upp')):
            ov.alpha_composite(Image.open(os.path.join(ut, f'farfar_{tid}_{rikt}_01.png')).convert('RGBA'), (4 + c * 20, 4 + r * 28))
    ov.resize((ov.width * 8, ov.height * 8), Image.NEAREST).save(os.path.join(HAR, 'farfar_vrid_x8.png'))
    print('klart', sorted(bilder))
