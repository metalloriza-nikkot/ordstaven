# Kapitel 2 (beslut 86.3 och 86.10): det sista som stod i gråbox, små och billiga.
# - Trollsländan i träskkanten (`trollslanda`, 12 x 10, frivillig): trollslanda_01–02 svävar med vingarna upp och ned.
#   Den surrar tre varv runt hjälmen och landar på ungens nos: unge1_trollslanda_ner_01–02 (ungen skelögd).
#   Den är turkos med glasvingar: aldrig guld (rätt svar) och aldrig orange (baronen).
# - De små grodorna (`omgivning`, vad: groda, 10 x 8) i träskkanten och vassen: groda_vilar_01–02 (sitter och
#   blåser upp strupen ibland), groda_hopp_01 och groda_plums_01–02 (ringar på vattnet). Teknik flyttar grodan i
#   två skutt som i gråboxen. De är mindre och mörkare än läsvalets grodor i dammen, så de förväxlas inte.
import os, sys, math
HAR = '/home/claude/bybor'; os.chdir(HAR)
src = open('foremal_k2b.py').read().split("if __name__ == '__main__':")[0]
G = {'__name__': 'foremal_k2b', '__file__': os.path.join(HAR, 'foremal_k2b.py')}; exec(src, G)
for k in ('MAT', 'ny', 'pix', 'kontur', 'skriv', 'P'): globals()[k] = G[k]
from PIL import Image
U = {'__name__': 'anim'}; cwd = os.getcwd(); os.chdir('/home/claude/unge2')
exec(open('anim.py').read(), U); os.chdir(cwd)

TURK = ['#16302a', '#1e6a6a', '#2a9a94', '#5ec8bc', '#b0ece4']      # trollsländans kropp
VINGE = ('#dce0e4', '#a8b4c0')                                       # glasvingarna
GRON = ['#16302a', '#285a44', '#3a8354', '#4fae6a', '#b0e7ba']       # de små grodorna, mörkare än dammens

def trollslanda(b, liten=False):
    """Sedd snett ovanifrån: kroppen tvärs (huvudet åt vänster) och två par glasvingar som slår upp (b=1) och ned (b=2).
    liten: den som sitter på ungens nos, 6 x 4 med vingarna ihopfällda."""
    if liten:
        im = ny(6, 4)
        pix(im, [(0, 1, TURK[4]), (1, 1, TURK[3])] + [(x, 1, TURK[2] if x % 2 else TURK[1]) for x in range(2, 6)])
        pix(im, [(2, 0, VINGE[0]), (3, 0, VINGE[0]), (2, 2, VINGE[1]), (3, 2, VINGE[1])])
        return im
    im = ny(12, 10); y0 = 5
    pix(im, [(1, y0, TURK[4]), (2, y0, TURK[3]), (1, y0 - 1, TURK[3]), (2, y0 - 1, TURK[3]), (3, y0, TURK[3])])   # huvud och bröst
    pix(im, [(x, y0, TURK[2] if x % 2 else TURK[1]) for x in range(4, 11)])                                    # bakkroppen
    if b == 1:   # vingarna uppåt, bakåtsvepta
        vingar = [(3, 4), (4, 3), (5, 2), (4, 4), (5, 3), (6, 2), (6, 4), (7, 3), (8, 2)]
        vingar += [(3, 6), (4, 7), (4, 6), (5, 7)]
    else:        # vingarna nedåt
        vingar = [(3, 6), (4, 7), (5, 8), (4, 6), (5, 7), (6, 8), (6, 6), (7, 7), (8, 8)]
        vingar += [(3, 4), (4, 3), (4, 4), (5, 3)]
    kropp = kontur(im.copy(), farg=None)                           # kontur bara runt kroppen, vingarna är glas
    for (x, y) in vingar:
        if kropp.getpixel((x, y))[3] == 0 or im.getpixel((x, y))[3] == 0: pix(kropp, [(x, y, VINGE[0] if (x + y) % 3 else VINGE[1])])
    return kropp

def unge_trollslanda(b):
    """Ungen framifrån, skelögd mot nosen, med trollsländan som sitter på nosen (vingarna fälls i bild 2)."""
    im = U['ner'](0, oga_t='stora', mun='o').convert('RGBA'); p = im.load()
    # pupillerna mot mitten: vänster öga tittar åt höger, höger öga åt vänster
    for (ex, inre) in ((7, 8), (15, 15)):
        for y in (12, 13, 14):
            for x in (ex, ex + 1): p[x, y] = (255, 255, 255, 255)
        p[inre, 13] = (16, 28, 28, 255); p[inre, 14] = (16, 28, 28, 255)
    t = trollslanda(1, liten=True)
    if b == 2: t = t.transpose(Image.FLIP_TOP_BOTTOM)              # vingarna vippar
    im.alpha_composite(t, (11, 15))                                # på nostippen, mellan ögonen och munnen
    return im

def groda_liten(lage, b=1):
    """lage: vilar (b=2 blåser upp strupen), hopp, plums (b=1 liten ring, b=2 större)."""
    if lage == 'plums':
        im = ny(12, 6); rx, ry = (3, 1) if b == 1 else (5, 2)
        for a in range(0, 360, 10):
            x = round(6 + rx * math.cos(math.radians(a))); y = round(3 + ry * math.sin(math.radians(a)))
            pix(im, [(x, y, MAT['vatten'][4])])
        if b == 1: pix(im, [(6, 1, MAT['vatten'][4]), (6, 0, '#ffffff')])
        return im
    im = ny(10, 8); oy = 0 if lage == 'vilar' else -2
    for y in range(8):
        for x in range(10):
            dx, dy = (x + 0.5 - 5) / 3.4, (y + 0.5 - (5.2 + oy)) / 2.3
            if dx * dx + dy * dy <= 1:
                c = GRON[3] if dy < -0.2 else GRON[2]
                if dx < -0.4 and dy < 0: c = GRON[4] if dx * dx + dy * dy < 0.5 else GRON[3]
                pix(im, [(x, y, c)])
    for ox in (3, 6):                                             # ögonen på toppen
        pix(im, [(ox, 2 + oy, GRON[3]), (ox + 1, 2 + oy, GRON[2]), (ox, 3 + oy, '#101c1c'), (ox + 1, 3 + oy, '#ffffff')])
    if lage == 'vilar':
        for x in (1, 8): pix(im, [(x, 7, GRON[2])])                # fötterna
        if b == 2: pix(im, [(4, 7, '#e8f0c0'), (5, 7, '#e8f0c0'), (4, 6, '#d0e0a0'), (5, 6, '#d0e0a0')])   # strupen blåses upp
    else:
        for (x, y) in ((1, 5), (0, 6), (8, 5), (9, 6)): pix(im, [(x, y, GRON[2])])   # benen sträcks bakåt
    return kontur(im)

def alla():
    ut = {}
    for b in (1, 2): ut[f'foremal/trask/trollslanda_0{b}.png'] = trollslanda(b)
    for b in (1, 2): ut[f'figurer/unge/unge1_trollslanda_ner_0{b}.png'] = unge_trollslanda(b)
    for b in (1, 2): ut[f'figurer/omgivning/groda_vilar_0{b}.png'] = groda_liten('vilar', b)
    ut['figurer/omgivning/groda_hopp_01.png'] = groda_liten('hopp')
    for b in (1, 2): ut[f'figurer/omgivning/groda_plums_0{b}.png'] = groda_liten('plums', b)
    return ut

def zonens_farger():
    """Färgerna som redan finns i träskets zon (som i kvall/kvall.py), så att de små djuren inte lägger till några."""
    import glob
    I = '/home/claude/inkorg/'; T = set()
    for m in ['rum/kap-02/*', 'foremal/trask/*', 'figurer/tant_rosa/*', 'figurer/fiskaren/*', 'figurer/tvatterskan/*',
              'figurer/barnet/*', 'figurer/bo/*', 'figurer/omgivning/*', 'figurer/hjalte/*', 'figurer/unge/*', 'figurer/stav/*']:
        for f in glob.glob(I + m):
            if f.endswith('.png') and 'portratt' not in f and 'trollslanda' not in f and 'groda_' not in f.split('/')[-1][:6]:
                T |= {c[1][:3] for c in Image.open(f).convert('RGBA').getcolors(1 << 20) if c[1][3]}
    return list(T)
def begransa(im, T):
    im = G['las'](im, 'x'); p = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if c[3] and c[:3] not in TS:
                n = min(T, key=lambda t: sum((a - b) ** 2 * w for a, b, w in zip(c, t, (3, 4, 2)))); p[x, y] = n + (c[3],)
    return im

if __name__ == '__main__':
    A = alla(); T = zonens_farger(); TS = set(T)
    for rel, im in A.items():
        A[rel] = begransa(im, T); full = os.path.join(G['UT'], rel); os.makedirs(os.path.dirname(full), exist_ok=True); A[rel].save(full)
    bg = Image.open('/home/claude/inkorg/rum/kap-02/trasket_kanten.png').convert('RGBA').crop((400, 96, 520, 156))
    g = bg.copy(); x = 4
    for rel in A:
        im = G['las'](A[rel], 'x'); g.alpha_composite(im, (x, 20 if im.height < 20 else 8)); x += im.width + 4
    g.resize((g.width * 8, g.height * 8), Image.NEAREST).save('/tmp/smadjur_prov.png')
    print('klart', len(A))
