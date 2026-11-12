# Håll en zon under 256 färger: färger som bara de nya bilderna använder slås ihop med närmaste färg som redan används.
import sys, glob
sys.path.insert(0, '/home/claude/palett'); from palett import Palett, lab
from PIL import Image
def hexa(c): return '#%02x%02x%02x' % c[:3]
def farger(filer):
    s = {}
    for f in filer:
        for n, c in Image.open(f).convert('RGBA').getcolors(1 << 20):
            if c[3]: s[hexa(c)] = s.get(hexa(c), 0) + n
    return s
def krymp(nya, gamla, tak=248):
    G = farger(gamla); N = farger(nya)
    alla = dict(G); [alla.__setitem__(k, alla.get(k, 0) + v) for k, v in N.items()]
    egna = sorted([k for k in N if k not in G], key=lambda k: N[k])     # de ovanligaste först
    byt = {}
    while len(alla) > tak and egna:
        k = egna.pop(0)
        kandidater = [g for g in alla if g != k and g not in byt]
        bast = min(kandidater, key=lambda g: sum((a - b) ** 2 for a, b in zip(lab(g), lab(k))))
        byt[k] = bast; alla.pop(k)
    for f in nya:
        im = Image.open(f).convert('RGBA'); p = im.load()
        for y in range(im.height):
            for x in range(im.width):
                c = p[x, y]
                if c[3] and hexa(c) in byt:
                    b = byt[hexa(c)]; p[x, y] = tuple(int(b[i:i + 2], 16) for i in (1, 3, 5)) + (c[3],)
        im.save(f)
    return len(alla), byt
if __name__ == '__main__':
    n, byt = krymp(sorted(glob.glob('/home/claude/bybor/ut/bildkort/*.png')), sorted(glob.glob('/home/claude/inkorg/bildkort/*.png')))
    print('bildkort', n, 'färger,', len(byt), 'ihopslagna')
