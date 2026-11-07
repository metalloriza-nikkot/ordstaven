# Gemensam början för 5d:s skript (kapitel 1:s rättelser, beslut 50–51). Läses med exec(open(...).read()).
# Duk och materialen kommer från stilprovet (rutor/pix.py, prov/glanta.py). Allt låses till masterpaletten när det sparas.
import os, sys, math, random
from PIL import Image
ROT = '/home/claude'
exec(open(ROT + '/rutor/pix.py').read())
_src = open(ROT + '/prov/glanta.py').read()
exec(_src[_src.index('MAT.update'):_src.index('def hx2')])
sys.path.insert(0, ROT + '/palett')
from palett import Palett
P = Palett()
def hx2(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
UT = ROT + '/kap1/ut/'
ALLA = {}
def spara(namn, im):
    """namn är sökvägen i inkorgen utan .png, t.ex. foremal/skog/lian_gang_a."""
    ALLA[namn] = im
def skriv():
    for k, im in ALLA.items():
        os.makedirs(os.path.dirname(UT + k), exist_ok=True)
        P.las_bild(im, k).save(UT + k + '.png')
    print(len(ALLA), 'bilder i', UT)
def ark(namn, bilder, skala=4, bg=(111, 163, 74, 255)):
    """En översikt av bilderna på gräs, för att titta på dem."""
    W = sum(b.width + 4 for b in bilder) + 4; H = max(b.height for b in bilder) + 8
    o = Image.new('RGBA', (W, H), bg); x = 4
    for b in bilder: o.alpha_composite(b, (x, H - 4 - b.height)); x += b.width + 4
    o.resize((W * skala, H * skala), Image.NEAREST).save(namn)
def pixlar(im, punkter, farg):
    p = im.load()
    for (x, y) in punkter:
        if 0 <= x < im.width and 0 <= y < im.height: p[x, y] = hx2(farg)
def kontur_runt(im, farg, bara_genomskinlig=True):
    """En pixels kontur runt allt som är fyllt."""
    p = im.load(); W, H = im.size; ny = []
    for y in range(H):
        for x in range(W):
            if p[x, y][3]: continue
            if any(0 <= x + a < W and 0 <= y + b < H and p[x + a, y + b][3] for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))): ny.append((x, y))
    for q in ny: p[q] = hx2(farg)
    return im
