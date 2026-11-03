# Masterpaletten (stilguiden §2, beslut 28.4). Paletten är sluten: alla bilder ritas ur palett.json.
# las_bild() byter varje färg mot palettens närmaste om skillnaden inte syns (deltaE < GRANS),
# och stoppar med ett fel om en färg är ny. En ny färg kommer bara genom Stil: lägg den i palett.json med ett skäl.
import json, math, os
from PIL import Image
GRANS = 3.0          # deltaE (CIE76) under ca 2,3 syns inte bredvid varandra. 3 är taket för en tyst sammanslagning.
HAR = os.path.dirname(os.path.abspath(__file__))
SKYDDADE = {         # rörs aldrig: hjältens palettbyte (fargbyte.js HUD_A, DRAKT_A), stavens guld (rätt svar)
    'hud_a': ['#0e2a5a', '#1e5fa8', '#2e8bd8', '#5fb4e8', '#a8dcf8'],
    'drakt_a': ['#15171c', '#2a2d35', '#3a3e48', '#565b68'],
    'guld': ['#ffd95a'],
}
def lab(h):
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
    r, g, b = f(r), f(g), f(b)
    X = (0.4124*r + 0.3576*g + 0.1805*b) / 0.95047; Y = 0.2126*r + 0.7152*g + 0.0722*b; Z = (0.0193*r + 0.1192*g + 0.9505*b) / 1.08883
    q = lambda t: t ** (1/3) if t > 0.008856 else 7.787*t + 16/116
    return (116*q(Y) - 16, 500*(q(X) - q(Y)), 200*(q(Y) - q(Z)))
def hexa(c): return '#%02x%02x%02x' % tuple(c[:3])
class Palett:
    def __init__(s, fil=os.path.join(HAR, 'palett.json')):
        d = json.load(open(fil)); s.data = d
        s.farger = [f['hex'] for f in d['farger']]
        s.lab = {h: lab(h) for h in s.farger}
        s.skyddade = {f['hex'] for f in d['farger'] if f.get('skyddad')}
        s.valbara = [h for h in s.farger if h not in s.skyddade]
        s.cache = {}
    def narmast(s, h):
        if h in s.cache: return s.cache[h]
        if h in s.lab: s.cache[h] = (h, 0.0); return s.cache[h]
        # en färg byts aldrig mot en skyddad (hjältens hud och dräkt byts med palettbytet, guldet betyder rätt svar)
        L = lab(h); best = min(s.valbara, key=lambda p: math.dist(L, s.lab[p]))
        s.cache[h] = (best, math.dist(L, s.lab[best])); return s.cache[h]
    def las_bild(s, im, namn='bild'):
        """Bilden ritad ur paletten. Fel om en färg är ny (längre än GRANS från paletten)."""
        im = im.convert('RGBA'); px = im.load(); nya = {}
        for y in range(im.height):
            for x in range(im.width):
                c = px[x, y]
                if c[3] == 0: px[x, y] = (0, 0, 0, 0); continue
                h, d = s.narmast(hexa(c))
                if d >= GRANS: nya[hexa(c)] = (h, round(d, 1)); continue
                px[x, y] = tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (c[3],)
        if nya:
            raise ValueError(f'{namn}: {len(nya)} nya färger utanför paletten: ' + ', '.join(f'{k} (närmast {v[0]}, deltaE {v[1]})' for k, v in list(nya.items())[:8]))
        return im
