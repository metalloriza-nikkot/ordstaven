# Kapitel 4, beslut 118.5: Farfars låda av mässing med kompassrosen och ordlåset (i stället för vanten),
# och hemligheten under ishyllan: isblocket, fotavtrycket av en stor fot och ungen som sätter sina fötter i det.
# Allt läses till masterpaletten 1.2. Inga bokstäver i bilderna: locket och låsets ord står på läsplattan.
#
# foremal/berg/   (fötterna = nederkantens mitt, om inget annat sägs)
#   lada_farfar_stangd        20 x 20  lådan under stenen, stängd, lite snö på locket. Låset: fyra tomma rutor
#   lada_farfar_klick         20 x 20  rätt ord: låset klickar (en glimt i guld, för det är rätt svar)
#   lada_farfar_oppnas        20 x 20  locket fjädrar upp till hälften
#   lada_farfar_oppen         20 x 20  locket uppe, kartbit fem inrullad på röd filt
#   lada_farfar_oppen_tom     20 x 20  samma, när kartbiten är tagen
#   isblock_hylla_01–02       32 x 28  det tunga isblocket under ishyllan, glittrar (två bilder)
#   isblock_flyg_01–02        32 x 28  FLYG: blocket med stavens regnbågsglitter runt kanten
#   isblock_skugga            28 x 8   skuggan under blocket när det svävar (läggs på golvet)
#   fotavtryck_is             52 x 48  avtrycket av en stor fot i isgolvet, tårna mot norr
# figurer/unge/
#   unge1_fot_avtryck_ner_01–03  24 x 24  01 lyfter en fot, 02, ställer den i avtrycket och tittar ned, 03 står stilla
#                                          med slutna ögon. Läggs så att ungens fötter står mitt i avtrycket
# bildkort/   (48 x 48)
#   lada_farfar               Farfars låda i närbild, stängd: kompassrosen på locket och låset med fyra tomma rutor
#   lada_farfar_oppen         öppen, med kartbit fem inrullad
#   fotavtryck_stor           Dinobokens sida och vid_ratt-bilden: avtrycket i isen med ungens två små fötter i
import os, sys, math, random
from PIL import Image
_f = open('/home/claude/k4/foremal_k4.py').read()
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else '/home/claude/k4/ut118']
exec(_f[:_f.index("\ndef snoklump(")])
exec(_f[_f.index("\n_cache = {}"):_f.index("\nif __name__ == '__main__':\n")])

MASS = ('#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0')
FILT = ('#5a1414', '#7a1a18', '#a02828')
PAPP = ('#a08a6e', '#d6cfa4', '#f2e8c8')
GULD = ('#c8a040', '#f2c94a', '#fff8c8')

# ---------- Farfars låda, i rummet ----------
def ros(d, cx, cy, r, ljus, mork):
    """Kompassrosen: fyra spetsar och en prick i mitten."""
    for k in range(1, r + 1):
        for (a, b) in ((0, -k), (0, k), (-k, 0), (k, 0)): d.s(cx + a, cy + b, ljus)
    for (a, b) in ((1, 1), (-1, -1), (1, -1), (-1, 1)): d.s(cx + a, cy + b, mork)
    d.s(cx, cy, mork)

def lada(lage):
    d = Bild(20, 20)
    for x in range(3, 18):                                                   # skuggan i snön
        d.s(x, 19, SNO[0]);
        if 4 < x < 16: d.s(x, 18, SNO[0])
    # kroppen: framsidan
    d.rk(2, 11, 16, 7, MASS[2]); d.rk(2, 16, 16, 2, MASS[1]); d.rk(2, 11, 1, 7, MASS[3]); d.rk(17, 11, 1, 7, MASS[1])
    for x in (3, 16): d.s(x, 12, MASS[4]); d.s(x, 16, MASS[3])                # nitar i hörnen
    # låset: en platta med fyra tomma rutor (orden läggs på läsplattan)
    d.rk(5, 12, 10, 4, MASS[0])
    for i in range(4): d.rk(6 + i * 2, 13, 1, 2, MASS[4])
    if lage == 'klick':
        for (a, b, c) in ((10, 11, GULD[2]), (9, 10, GULD[1]), (11, 10, GULD[1]), (10, 9, GULD[1]), (8, 11, GULD[0]), (12, 11, GULD[0])): d.s(a, b, c)
        for i in range(4): d.rk(6 + i * 2, 13, 1, 2, GULD[1])
    if lage in ('stangd', 'klick'):
        d.rk(2, 5, 16, 6, MASS[3]); d.rk(2, 5, 16, 1, MASS[4]); d.rk(2, 10, 16, 1, MASS[1])   # locket uppifrån
        d.rk(2, 5, 1, 6, MASS[4]); d.rk(17, 5, 1, 6, MASS[2])
        ros(d, 10, 7, 2, MASS[4], MASS[1])
        for (a, b) in ((3, 5), (4, 5), (3, 6), (16, 5), (15, 5)): d.s(a, b, SNO[3] if (a + b) % 2 else SNO[2])   # snö från stenen
    else:
        d.rk(3, 8, 14, 3, FILT[1]); d.rk(3, 8, 14, 1, FILT[0]); d.rk(2, 8, 1, 3, MASS[3]); d.rk(17, 8, 1, 3, MASS[1])  # insidan
        d.rk(2, 10, 16, 1, MASS[2])
        if lage == 'oppnas':                                                 # locket snett, halvvägs upp
            d.rk(2, 4, 16, 4, MASS[2]); d.rk(2, 4, 16, 1, MASS[4]); d.rk(2, 7, 16, 1, MASS[0])
            ros(d, 10, 5, 1, MASS[4], MASS[1])
        else:                                                                # locket rakt upp, insidan med filt
            d.rk(2, 0, 16, 8, MASS[1]); d.rk(3, 1, 14, 6, FILT[2]); d.rk(3, 1, 14, 1, FILT[1]); d.rk(2, 7, 16, 1, MASS[0])
            d.rk(2, 0, 16, 1, MASS[3])
        if lage == 'oppen':                                                  # kartbit fem, inrullad, med ett rött snöre
            d.rk(5, 8, 10, 2, PAPP[2]); d.rk(5, 9, 10, 1, PAPP[1]); d.s(5, 8, PAPP[0]); d.s(5, 9, PAPP[0]); d.s(14, 8, PAPP[1])
            d.s(10, 8, FILT[2]); d.s(10, 9, FILT[1]); d.s(7, 8, '#c8453a'); d.s(12, 8, '#4f7ae8')
    return d.kontur('#1a1a20').im

# ---------- Farfars låda, närbild 48 x 48 ----------
def lada_nara(oppen):
    d = Bild(48, 48)
    for y in range(40, 46):                                                  # skuggan
        for x in range(4, 44):
            if ((x - 24) / 21) ** 2 + ((y - 43) / 3) ** 2 <= 1: d.s(x, y, SNO[0])
    d.rk(4, 26, 40, 16, MASS[2]); d.rk(4, 37, 40, 5, MASS[1]); d.rk(4, 26, 2, 16, MASS[3]); d.rk(42, 26, 2, 16, MASS[1])
    for x in range(4, 44, 3): d.s(x, 41, MASS[0])                            # nött kant
    for (a, b) in ((7, 29), (40, 29), (7, 38), (40, 38)): d.s(a, b, MASS[4]); d.s(a + 1, b + 1, MASS[0])   # nitar
    d.rk(11, 28, 26, 10, MASS[0]); d.rk(12, 29, 24, 8, MASS[1])              # låsplattan
    for i in range(4):                                                       # fyra tomma rutor där bokstäverna läggs
        x = 13 + i * 6; d.rk(x, 30, 4, 6, MASS[4]); d.rk(x, 35, 4, 1, MASS[3]); d.rk(x + 3, 30, 1, 6, MASS[3])
    if not oppen:
        d.rk(4, 10, 40, 16, MASS[3]); d.rk(4, 10, 40, 2, MASS[4]); d.rk(4, 24, 40, 2, MASS[1]); d.rk(4, 10, 2, 16, MASS[4]); d.rk(42, 10, 2, 16, MASS[2])
        d.rk(4, 25, 40, 1, MASS[0])
        for k in range(1, 7):                                                # kompassrosen, ingraverad
            for (a, b) in ((0, -k), (0, k), (-k * 1.6, 0), (k * 1.6, 0)): d.s(24 + a, 17 + b, MASS[4] if k < 6 else MASS[2])
            if k < 3:
                for (a, b) in ((1, -k), (-1, k), (-k * 1.6, 1), (k * 1.6, -1)): d.s(24 + a, 17 + b, MASS[1])
        for (a, b) in ((2, 2), (-2, -2), (3, -2), (-3, 2)): d.s(24 + a, 17 + b, MASS[1])
        d.ell(24, 17, 1.6, 1.6, MASS[4]); d.s(24, 17, MASS[0])
        for (a, b) in ((6, 11), (8, 11), (41, 11), (39, 12), (6, 12)): d.s(a, b, SNO[3])
    else:
        d.rk(4, 0, 40, 18, MASS[1]); d.rk(6, 2, 36, 15, FILT[2]); d.rk(6, 2, 36, 2, FILT[1]); d.rk(4, 0, 40, 1, MASS[3])   # locket uppe
        d.rk(4, 17, 40, 2, MASS[0])
        d.rk(4, 19, 40, 7, FILT[1]); d.rk(4, 19, 40, 2, FILT[0]); d.rk(4, 19, 2, 7, MASS[3]); d.rk(42, 19, 2, 7, MASS[1])
        d.rk(4, 25, 40, 1, MASS[2])
        for y in range(19, 25):                                              # kartbit fem, inrullad, med snöre
            for x in range(10, 38):
                d.s(x, y, PAPP[2] if y < 22 else PAPP[1])
        d.rk(10, 19, 2, 6, PAPP[0]); d.ell(37, 22, 1.6, 3, PAPP[1]); d.s(37, 22, PAPP[0])
        d.rk(23, 19, 2, 6, FILT[2]); d.s(25, 24, FILT[2]); d.s(26, 25, FILT[1])
        for (a, b, c) in ((14, 21, '#c8453a'), (16, 22, '#c8453a'), (18, 21, '#c8453a'), (30, 21, '#4f7ae8'), (31, 21, '#4f7ae8'), (33, 22, '#86b85a')): d.s(a, b, c)
    return d.kontur('#1a1a20').im

# ---------- hemligheten under ishyllan ----------
def isblock(n, flyg=False):
    d = Bild(32, 28)
    for y in range(4, 24):
        for x in range(3, 29):
            topp = y < 11
            c = IS[6] if topp else IS[4] if x < 20 else IS[3]
            if not topp and (x + 2 * y) % 11 == 0: c = IS[5]
            if topp and (x - y) % 9 == 0: c = IS[7]
            d.s(x, y, c)
    for x in range(3, 29): d.s(x, 11, IS[7]); d.s(x, 23, IS[2])
    d.linje(9, 13, 13, 19, IS[2]); d.linje(13, 19, 12, 22, IS[2]); d.linje(22, 6, 25, 9, IS[5])   # sprickor i blocket
    for (a, b) in ((3, 4), (28, 4), (3, 23), (28, 23)): d.s(a, b, (0, 0, 0, 0))          # rundade hörn
    gl = [(6, 6), (24, 15), (16, 8)] if n == 1 else [(20, 5), (8, 17), (26, 20)]
    for (a, b) in gl:
        d.s(a, b, '#ffffff'); d.s(a - 1, b, IS[7]); d.s(a + 1, b, IS[7]); d.s(a, b - 1, IS[7]); d.s(a, b + 1, IS[7])
    d.kontur(IS[0])
    if flyg:
        RB = ['#e8443a', '#f2c94a', '#86b85a', '#4f7ae8', '#9a6ad8']
        rr = random.Random(n)
        for i in range(22):
            a = rr.random() * 2 * math.pi; x = 16 + 15 * math.cos(a); y = 14 + 13 * math.sin(a)
            if d.g(int(x), int(y)) == 0: d.s(x, y, RB[(i + n) % 5])
    return d.im

def isblock_skugga():
    d = Bild(28, 8)
    for y in range(8):
        for x in range(28):
            if ((x - 13.5) / 13) ** 2 + ((y - 3.5) / 3.6) ** 2 <= 1 and (x + y) % 2 == 0: d.s(x, y, IS[1])
    return d.im

def fot_form(cx, cy, s):
    """Den stora foten: en bred, nästan rund trampyta som är bredast framtill, med en kort kant av tre tår (norr)."""
    def inne(x, y, krymp=0.0):
        v = (y - cy) / (10 * s - krymp)
        rx = (11 * s - krymp) * (1 + 0.16 * max(-v, 0) - 0.12 * max(v, 0))
        u = (x - cx) / rx
        if u * u + v * v <= 1: return True
        for tx in (-6.5, 0, 6.5):                                            # tårnas korta kanter sticker ut lite
            u = (x - (cx + tx * s)) / (3.4 * s - krymp * .6); v2 = (y - (cy - (8.6 if tx else 9.6) * s)) / (2.2 * s - krymp * .6)
            if u * u + v2 * v2 <= 1: return True
        return False
    def ta(x, y):                                                            # tårnas djupa gropar innanför kanten
        for tx in (-6.5, 0, 6.5):
            u = (x - (cx + tx * s)) / (2.6 * s); v2 = (y - (cy - (6.4 if tx else 7.4) * s)) / (2.2 * s)
            if u * u + v2 * v2 <= 1: return True
        return False
    inne.ta = ta
    return inne

def fotavtryck(d, cx, cy, s, kant=True):
    inne = fot_form(cx, cy, s)
    for y in range(d.h):
        for x in range(d.b):
            if not inne(x + .5, y + .5): continue
            djup = inne(x + .5, y + .5, 1.6 * s)
            c = IS[3] if djup else IS[4]
            if djup and not inne(x + .5 - 1.5, y + .5 - 1.5, 1.6 * s): c = IS[2]
            if not djup and not inne(x + .5 + 1, y + .5 + 1): c = IS[6]
            if inne.ta(x + .5, y + .5): c = IS[2] if inne.ta(x + .5 + 1, y + .5 + 1.2) else IS[4]
            d.s(x, y, c)
    for y in range(d.h):
        for x in range(d.b):
            if not inne(x + .5, y + .5) and any(inne(x + .5 + a, y + .5 + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                if kant and (x * 3 + y) % 4: d.s(x, y, IS[7])

def fotavtryck_is():
    d = Bild(52, 48); fotavtryck(d, 26, 25, 2.0)
    for (a, b) in ((10, 34), (42, 30), (26, 12), (18, 26)): d.s(a, b, '#ffffff')
    return d.im

def unge_fot(f):
    os.chdir('/home/claude/unge2'); g = {'__name__': 'u'}
    exec(open('anim.py').read().split("\ndef lyft_bild")[0], g); os.chdir('/home/claude/k4')
    if f == 1: return g['ner'](dh=(0, 1), oga_t='oppen', lyft_fot=(1,))
    if f == 2: return g['ner'](dh=(0, 2), oga_t='oppen', mun='o', lyft_fot=())
    return g['ner'](dh=(0, 2), oga_t='stangd', mun='le', lyft_fot=())

def fotavtryck_kort():
    d = Bild(48, 48)
    for y in range(4, 46):                                                   # en bit isgolv
        for x in range(2, 46):
            if ((x - 24) / 22) ** 2 + ((y - 25) / 21) ** 2 <= 1:
                d.s(x, y, IS[5] if (x + 2 * y) % 13 else IS[6])
    fotavtryck(d, 24, 25, 1.75)
    def fot(cx, cy):                                                         # ungens lilla blå fot uppifrån
        for y in range(cy - 3, cy + 3):
            for x in range(cx - 3, cx + 4):
                if ((x - cx) / 3.2) ** 2 + ((y - cy) / 2.6) ** 2 <= 1: d.s(x, y, '#2A52C8' if y > cy - 1 else '#4F7AE8')
        for tx in (-2, 0, 2): d.s(cx + tx, cy - 3, '#9AB6FF')
        d.s(cx - 1, cy - 1, '#9AB6FF')
    for (cx, cy) in ((20, 30), (28, 30)):                                     # mörk kant runt fötterna, så att de syns
        for y in range(cy - 5, cy + 4):
            for x in range(cx - 5, cx + 6):
                if ((x - cx) / 4.3) ** 2 + ((y - cy + 0.3) / 3.7) ** 2 <= 1: d.s(x, y, '#0E1A50')
    fot(20, 30); fot(28, 30)
    for (a, b) in ((8, 12), (40, 16), (36, 41), (10, 38)): d.s(a, b, '#ffffff')
    return d.kontur(IS[0]).im

def till_zon(rel):
    """Bildkortens zon är full (252 av 256): färger som inte redan finns i korten byts mot närmaste som finns."""
    import glob
    gam = set()
    for f in glob.glob('/home/claude/inkorg/bildkort/*.png'):
        for (n, c) in Image.open(f).convert('RGBA').getcolors(100000):
            if c[3]: gam.add(c[:3])
    G = list(gam); f = f'{UT}/{rel}.png'; im = Image.open(f).convert('RGBA'); q = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = q[x, y]
            if a and (r, g, b) not in gam: q[x, y] = min(G, key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2) + (255,)
    im.save(f)

if __name__ == '__main__':
    F = 'foremal/berg/'
    for l in ('stangd', 'klick', 'oppnas', 'oppen', 'oppen_tom'): spara(F + f'lada_farfar_{l}', lada(l))
    for k in (1, 2):
        spara(F + f'isblock_hylla_0{k}', isblock(k)); spara(F + f'isblock_flyg_0{k}', isblock(k, True))
    spara(F + 'isblock_skugga', isblock_skugga()); spara(F + 'fotavtryck_is', fotavtryck_is())
    for k in (1, 2, 3): spara(f'figurer/unge/unge1_fot_avtryck_ner_0{k}', unge_fot(k))
    spara('bildkort/lada_farfar', lada_nara(False)); spara('bildkort/lada_farfar_oppen', lada_nara(True))
    spara('bildkort/fotavtryck_stor', fotavtryck_kort())
    for n in ('lada_farfar', 'lada_farfar_oppen', 'fotavtryck_stor'): till_zon('bildkort/' + n)
    print('klart')
