# Konceptbilder av kapitel 4:s miljöer (21/11): stämning och innehåll per pass, i rummens vy snett uppifrån.
# Inte ritade mot kartan; rummen ritas när Teknik har namngett kartversionen efter gråboxen.
#   koncept_k4_pass1_stigen.png   640 x 192  bergets fot vid floden i morgondimma, gaffeln med tre skyltar, stig 1 med
#                                            isflak uppför stupet, grottans mynning med snöhögarna och Farfars sten,
#                                            stenfältets block högt upp och luftskeppet över toppen
#   koncept_k4_pass2_grottan.png  640 x 192  isgrottan i stavens regnbågsljus: isgolvet med stig 2, gåtans väggar som
#                                            glimtar, ishyllan, det sista golvet med stig 3 och vaken, och sprickan
#                                            med dagsljus. En remsa visar grottan mörk (färgtabellen)
#   koncept_k4_pass3_stenfaltet.png 320 x 192 stenfältet: fem platser, ånga och smält snö vid de varma, frost vid den
#                                            kalla, hålet med baronens rep, blocket i drivan och molnkanten i norr
import os, sys, math, random
_f = open('/home/claude/k4/foremal_k4.py').read(); _cw = os.getcwd()
exec(_f[:_f.index("\nif __name__ == '__main__':\n")])
os.chdir(_cw)
from PIL import Image
INK = '/home/claude/inkorg/'
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
TRA = ('#3a2414', '#5a3a22', '#7a5638', '#a07a50', '#c4a070')
REGNBAGE = ['#e8443a', '#f2c94a', '#86b85a', '#4f7ae8', '#9a6ad8']
UTK = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k4/koncept'
def bild(rel): return Image.open(INK + rel).convert('RGBA')
def k4(rel): return Image.open('/home/claude/k4/ut114/' + rel).convert('RGBA')
def fot(im, spr, x, y): im.alpha_composite(spr, (int(x - spr.width / 2), int(y - spr.height)))

_R = {}
def brus(x, y, sk, seed=0):
    """Mjukt värdebrus 0..1 (rutor på sk pixlar, linjärt mellan dem)."""
    def r(i, j):
        k = (i, j, seed)
        if k not in _R: _R[k] = random.Random(i * 73856093 ^ j * 19349663 ^ seed * 83492791).random()
        return _R[k]
    fx, fy = x / sk, y / sk; i, j = int(fx), int(fy); u, v = fx - i, fy - j
    u, v = u * u * (3 - 2 * u), v * v * (3 - 2 * v)
    a = r(i, j) * (1 - u) + r(i + 1, j) * u; b = r(i, j + 1) * (1 - u) + r(i + 1, j + 1) * u
    return a * (1 - v) + b * v

def snomark(d, x0, y0, b, h, seed=1):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            n = brus(x, y, 14, seed) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.18
            c = SNO[3] if n > 0.74 else SNO[2] if n > 0.2 else (SNO[1] if (x + y) % 2 else SNO[2])
            d.s(x, y, c)

def sten_yta(d, x, y, seed=2):
    n = brus(x, y, 6, seed) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.2
    return STEN[3] if n > 0.78 else STEN[2] if n > 0.5 else STEN[1] if n > 0.22 else STEN[0]

def klippa(d, x0, x1, ytop, h, seed=2, isig=False):
    """En klippkant snett uppifrån: snö på krönet och en brant mot söder med skrevor."""
    for x in range(x0, x1):
        top = ytop + int(3 * math.sin(x / 11 + seed) + 2 * math.sin(x / 4))
        for y in range(top, top + 3): d.s(x, y, SNO[3] if y == top else SNO[2])
        for y in range(top + 3, top + h):
            t = (y - top) / h
            if isig:
                n = brus(x, y, 5, seed)
                c = IS[5] if n > 0.75 else IS[4] if n > 0.5 else IS[3] if t < 0.6 else IS[2]
                if (x + seed) % 13 == 0: c = IS[2]
            else: c = sten_yta(d, x, y, seed) if t < 0.85 else STEN[0]
            d.s(x, y, c)

def dimma(im, x0, y0, b, h, seed=3):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            n = brus(x * 0.6, y * 2.0, 18, seed)
            if n > 0.62 and (x + y) % 2 == 0: im.putpixel((x, y), hx('#eeeff4') + (255,))

def stig(d, pts, bredd=4):
    for (a, b) in zip(pts, pts[1:]):
        n = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
            for k in range(-bredd, bredd + 1):
                d.s(int(x), int(y + k * 0.6), '#c8d4ec' if abs(k) < bredd - 1 else SNO[1])
            if i % 6 == 0: d.s(int(x) - 1, int(y) - 1, SNO[0]); d.s(int(x) + 1, int(y) + 1, SNO[0])   # fotspår

def pass1():
    d = Bild(640, 192)
    snomark(d, 0, 0, 640, 192)
    for x in range(640):                                                     # bergväggen i norr, med snöfläckar
        kant = 56 + int(5 * math.sin(x / 37) + 3 * math.sin(x / 9))
        for y in range(0, kant):
            c = sten_yta(d, x, y, 4)
            if brus(x, y, 9, 11) > 0.66: c = SNO[2] if brus(x, y, 3, 12) > 0.4 else SNO[1]
            if y > kant - 4: c = STEN[0]
            d.s(x, y, c)
    for x in range(404, 468):                                                # grottans mynning i väggen
        for y in range(20, 60):
            u = (x - 436) / 30; v = (y - 60) / 38
            if u * u + v * v <= 1: d.s(x, y, IS[0] if u * u + v * v < 0.7 else IS[1])
            elif u * u + v * v <= 1.18 and y < 60: d.s(x, y, IS[5] if (x + y) % 3 else IS[6])
    klippa(d, 270, 640, 88, 22, 5, isig=True)                                 # det isade stupet
    for y in range(162, 192):                                                # floden och stranden
        for x in range(640):
            st = 166 + int(3 * math.sin(x / 17))
            if y > st: d.s(x, y, IS[2] if brus(x, y, 7, 30) > 0.45 else IS[3])
            elif y > st - 3: d.s(x, y, '#c4ac82')
    stig(d, [(60, 166), (110, 140), (150, 124)])                             # stigen från stranden till gaffeln
    stig(d, [(150, 124), (80, 108), (20, 104)]); stig(d, [(150, 124), (250, 128), (300, 136)]); stig(d, [(150, 124), (300, 118), (350, 118)])
    for (sx, rikt) in ((132, -1), (150, 0), (168, 1)):                       # tre gamla skyltar, var och en pekar åt sitt håll
        d.rk(sx, 102, 2, 18, TRA[1])
        bx = sx - 1 + rikt * 6; d.rk(bx - 5, 101 - abs(rikt) * 3, 12, 5, TRA[3]); d.rk(bx - 5, 105 - abs(rikt) * 3, 12, 1, TRA[1])
        if rikt: d.s(bx + 6 * rikt, 103 - abs(rikt) * 3, TRA[3])
    rr = random.Random(7)
    for (x, y) in ((400, 72), (420, 78), (454, 77), (474, 70)): snoklump(d, x, y, 7, 5, rr)   # snöhögarna vid mynningen
    d.ell(437, 76, 8, 5, STEN[2], STEN[3], STEN[1]); d.s(437, 74, '#f2c94a'); d.s(436, 75, '#c8a040'); d.s(438, 75, '#c8a040')  # Farfars sten
    d.kontur('#2a2a3a')
    im = d.im
    for r in range(3):                                                       # stig 1: isflak uppför stupet, två per steg
        for k in range(2):
            fot(im, k4('foremal/berg/isflak.png'), 352 + k * 32 + r * 10, 132 - r * 15)
    im.alpha_composite(k4('foremal/berg/block_hanger.png').crop((0, 12, 48, 44)), (566, 4))   # blocket på stenfältet högt upp
    im.alpha_composite(bild('figurer/baronen/luftskepp_glider_01.png'), (510, -22))
    fot(im, bild('figurer/hjalte/hjalte_ga_ner_01.png'), 68, 164); fot(im, bild('figurer/unge/unge1_ga_ner_01.png'), 90, 166)
    sp = bild('foremal/flod/skoldpadda_simmar_01.png'); sp = sp.resize((sp.width // 3, sp.height // 3), Image.NEAREST)
    im.alpha_composite(sp.crop((0, 0, sp.width, 44)), (170, 150))
    dimma(im, 0, 128, 640, 64, 3)
    return im

def pass2():
    d = Bild(640, 192)
    for y in range(192):                                                     # mörkt vatten under isflaken
        for x in range(640):
            n = brus(x, y * 2, 12, 21) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.2
            d.s(x, y, IS[1] if n > 0.62 else IS[0])
            if (y + int(4 * math.sin(x / 9))) % 9 == 0 and n > 0.5: d.s(x, y, IS[2])
    def avsats(x0, x1, y0, y1):                                              # fast is att stå på
        for y in range(y0, y1):
            for x in range(x0, x1):
                n = brus(x, y, 8, 22) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.2
                d.s(x, y, IS[6] if n > 0.7 else IS[5] if n > 0.35 else IS[4])
        for x in range(x0, x1): d.s(x, y1, IS[3]); d.s(x, y1 + 1, IS[2]); d.s(x, y1 + 2, IS[1])
    klippa(d, 0, 640, 0, 46, 8, isig=True)                                    # norra isväggen
    avsats(0, 640, 46, 66)                                                   # hyllan längs väggen, där han läser
    avsats(0, 44, 66, 176); avsats(196, 344, 66, 176); avsats(580, 640, 66, 176)
    for x in range(640):                                                     # södra isväggen
        for y in range(174, 192): d.s(x, y, IS[3] if brus(x, y, 6, 23) > 0.5 else IS[2])
    for (gx, gy) in ((210, 22), (262, 26), (318, 20)):                       # gåtans tre väggar: skrift som glimtar, utan bokstäver
        for k in range(14):
            for j in range(3):
                if (k + j) % 3: d.s(gx + k, gy + j * 2, '#fff8c8' if j == 1 else '#ffffff')
        for k in range(-2, 17): d.s(gx + k, gy - 2, IS[7]); d.s(gx + k, gy + 7, IS[7])
    d.rk(420, 8, 40, 3, IS[7]); d.rk(420, 11, 40, 2, IS[3])                   # ishyllan, högt upp, något glittrar
    for (a, b2) in ((436, 5), (440, 4), (444, 6)): d.s(a, b2, '#ffffff')
    d.kontur(IS[0])
    im = d.im
    for r in range(4):                                                       # stig 2: rutnät 3 x 4
        for k in range(3): fot(im, k4('foremal/berg/isflak.png'), 64 + r * 34, 90 + k * 28 + 4)
    for r in range(6):                                                       # stig 3: rutnät 3 x 6, med en vak
        for k in range(3):
            if (r, k) == (3, 0): continue
            n = 'isflak_spricka' if r < 2 and k == 1 else 'isflak'
            fot(im, k4(f'foremal/berg/{n}.png'), 366 + r * 34, 90 + k * 28 + 4)
    im.alpha_composite(k4('foremal/berg/isvagg_spricka.png'), (604, 26))     # sprickan med dagsljus i östra väggen
    # stavens regnbågsljus: strålar från staven som bryts i isväggen och i flaken
    sx, sy = 34, 104
    for i, c in enumerate(['#e8443a', '#f2c94a', '#86b85a', '#4f7ae8', '#9a6ad8'] * 3):
        vinkel = -0.95 + i * 0.075
        for t in range(40, 700, 2):
            x = int(sx + t * math.cos(vinkel)); y = int(sy + t * math.sin(vinkel) * 0.55)
            if not (0 <= x < 640 and 0 <= y < 192): break
            px = im.getpixel((x, y))[:3]
            if px in (hx(IS[4]), hx(IS[5]), hx(IS[6]), hx(IS[3])) and (x + y + i) % 3 == 0: im.putpixel((x, y), hx(c) + (255,))
    rnd = random.Random(9)
    for _ in range(140):                                                     # glitter
        x, y = rnd.randrange(640), rnd.randrange(170)
        if im.getpixel((x, y))[:3] in (hx(IS[4]), hx(IS[5]), hx(IS[6]), hx(IS[7])): im.putpixel((x, y), hx('#ffffff') + (255,))
    fot(im, bild('figurer/hjalte/hjalte_ga_hoger_01.png'), 30, 120); fot(im, bild('figurer/unge/unge1_ga_hoger_01.png'), 14, 128)
    for y in range(150, 192):                                                # remsan längst ned: samma grotta mörk (färgtabellen)
        for x in range(640):
            r, g, b, a = im.getpixel((x, y))
            if y > 153: im.putpixel((x, y), (r // 6, g // 6, b // 4, 255))
            else: im.putpixel((x, y), (20, 20, 30, 255))
    for (a, b2) in ((34, 158), (35, 158), (34, 157)): im.putpixel((a, b2), hx('#fff8c8') + (255,))   # bara stavens glimt i mörkret
    return im

def pass3():
    d = Bild(320, 192)
    snomark(d, 0, 0, 320, 192, 5)
    for x in range(320):                                                     # molnkanten långt borta i norr: kanten och molnen
        for y in range(0, 28):
            top = 14 + int(4 * math.sin(x / 19) + 2 * math.sin(x / 6))
            if y < top: d.s(x, y, '#ffffff' if (x + y) % 3 else '#fff8c8') if y > top - 8 else d.s(x, y, '#e8f0ff')
    klippa(d, 0, 320, 26, 8, 6)
    im = d.im
    for (x, y) in ((70, 110), (250, 100), (190, 160)):                       # smält snö runt varma stenar
        pass
    platser = [('sten_varm_slat_01', 60, 96), ('sten_varm_taggsvans_01', 150, 78), ('sten_kall_klubbsvans', 250, 96),
               ('sten_hal', 96, 150), ('sten_varm_klubbsvans_01', 220, 154)]
    for (n, x, y) in platser: fot(im, k4(f'foremal/berg/{n}.png'), x, y)
    fot(im, k4('foremal/berg/block_driva.png').resize((28, 18), Image.NEAREST), 40, 50)   # blocket i drivan, långt borta
    fot(im, bild('figurer/hjalte/hjalte_ga_upp_01.png') if os.path.exists(INK + 'figurer/hjalte/hjalte_ga_upp_01.png') else bild('figurer/hjalte/hjalte_ga_ner_01.png'), 160, 188)
    fot(im, bild('figurer/unge/unge1_ga_ner_01.png'), 180, 190)
    return im

if __name__ == '__main__':
    os.makedirs(UTK, exist_ok=True)
    for namn, fn in (('pass1_stigen', pass1), ('pass2_grottan', pass2), ('pass3_stenfaltet', pass3)):
        im = las(fn()); im.save(f'{UTK}/koncept_k4_{namn}.png'); im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f'{UTK}/koncept_k4_{namn}_x2.png')
    print('klart')
