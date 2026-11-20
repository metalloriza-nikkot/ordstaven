# Fyra bildkort för det som var emoji i prologen och kapitel 1 (beslut 108.2), och sköldpaddan större i duellens kort
# (108.3). 48 x 48 som de andra korten, samma namn som datan redan har, och inga nya färger (zonen bildkort).
#   mat   "Var var vi?" i prologen pass 2 (ungen är hungrig): en träskål med bär, bröd och ett äpple
#   sol   "Var var vi?" i prologen pass 3 (det är morgon): solen som stiger över en grön kulle
#   apa   "Var var vi?" i kapitel 1 pass 2 (apan är räddad): apan ur kapitel 1 som vinkar från en gren
#   farfars_lista_sista_raden   prologens skylt (p0_skylten): Farfars lista med kompassrosen, tre rader med bock och
#         den sista raden som lyser. Inga bokstäver i bilden (texten är aldrig pixlig): orden står på läsplattan
#   skoldpadda   ordduellens kort: sköldpaddan från sidan så att den fyller kortet, med gräset och trädet på skalet
# python3 bybor/kort108.py <inkorg> <ut>
import os, sys, math
from PIL import Image
HAR = '/home/claude/bybor'
INK = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/inkorg'
UTMAPP = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HAR, 'ut_108')
_t = open(os.path.join(HAR, 'testrum_kort.py')).read()
_a = sys.argv; sys.argv = [_a[0], INK, UTMAPP]; exec(_t[:_t.rindex("if __name__ == '__main__':")]); sys.argv = _a

def mat():
    im = kort()
    for y in range(28, 42):                                            # träskålen
        w = 18 - max(0, y - 34) * 2
        rk(im, 24 - w, y, 2 * w, 1, TRA[3] if y < 33 else TRA[2])
        pix(im, [(24 + w - 1, y, TRA[1]), (24 + w - 2, y, TRA[1])])
    rk(im, 6, 28, 36, 2, TRA[4]); rk(im, 18, 42, 12, 2, TRA[1])
    ell(im, 15, 22, 8, 6, '#d8a85a', '#e8d07a', '#7a522c')             # brödet
    for k in range(3): pix(im, linje(11 + k * 4, 19, 13 + k * 4, 23, '#7a522c'))
    ell(im, 31, 20, 6.5, 6.5, '#e8443a', '#ff8a7a', '#a02828')          # äpplet
    pix(im, linje(31, 13, 32, 10, '#5a3a22') + [(33, 11, '#6fae4a'), (34, 11, '#6fae4a'), (34, 12, '#4f8a3a')])
    for (x, y) in ((20, 27), (24, 25), (27, 27), (36, 26), (39, 27), (9, 27)):   # blåbär
        ell(im, x, y, 2.4, 2.4, '#2a52c8', '#4f7ae8', '#1a3290')
    return kontur(im)

def sol():
    im = kort()
    for y in range(30, 47):                                            # den gröna kullen
        for x in range(1, 47):
            if ((x + .5 - 24) / 30) ** 2 + ((y + .5 - 50) / 20) ** 2 <= 1: pix(im, [(x, y, '#86a444' if (x * 3 + y) % 7 else '#a0b858')])
    for a in range(0, 360, 30):                                        # strålarna
        r0, r1 = 13, 19 if a % 60 == 0 else 17
        pix(im, linje(round(24 + r0 * math.cos(math.radians(a))), round(24 + r0 * math.sin(math.radians(a))),
                      round(24 + r1 * math.cos(math.radians(a))), round(24 + r1 * math.sin(math.radians(a))), '#f2c94a', 2))
    ell(im, 24, 24, 10.5, 10.5, '#f8e46a', '#fff8c8', '#f2c94a')
    for y in range(30, 47):                                            # kullen ligger framför solens nedre del
        for x in range(1, 47):
            if ((x + .5 - 24) / 30) ** 2 + ((y + .5 - 50) / 18) ** 2 <= 1: pix(im, [(x, y, '#86a444' if (x * 3 + y) % 7 else '#a0b858')])
    pix(im, [(20, 22, '#7a522c'), (28, 22, '#7a522c')] + [(x, 27 - (1 if x in (21, 27) else 0), '#7a522c') for x in range(21, 28)])
    return kontur(im)

def apa():
    im = kort()
    pix(im, linje(0, 33, 47, 29, TRA[2], 3) + linje(0, 32, 47, 28, TRA[3]))   # grenen
    for (x, y) in ((6, 28), (12, 27), (40, 24), (44, 25), (36, 26)): ell(im, x, y, 4, 3, '#4f8a3a', '#6fae4a', '#2e5a26')
    a = Image.open(os.path.join(INK, 'figurer/apa/apa_vinka_01.png')).convert('RGBA').resize((32, 32), Image.NEAREST)
    im.alpha_composite(a, (8, 2))
    return kontur(im)

def farfars_lista_sista_raden():
    im = kort()
    P_ = ('#8a7458', '#d8c8a8', '#ece0c4', '#f8f0dc')
    for y in range(3, 46):                                             # papperet, lite snett, med ett vikt hörn
        for x in range(8, 41):
            if x + y > 82: continue
            pix(im, [(x + (y // 16), y, P_[3] if (x * 7 + y * 3) % 13 else P_[2])])
    tri(im, [(42, 40), (36, 46), (42, 46)], P_[1])
    lapp = Image.open(os.path.join(INK, 'ui/lapp_kompassros.png')).convert('RGBA'); im.alpha_composite(lapp, (12, 5))
    for i, y in enumerate((18, 24, 30)):                               # tre rader skrivna, med bock (inga bokstäver)
        for x in range(13 + (y // 16), 33 + (y // 16), 1):
            if (x * 5 + i * 3) % 7 in (0, 3): continue
            pix(im, [(x, y, '#3a3f48'), (x, y + 1, '#55555f') if x % 3 == 0 else (x, y, '#3a3f48')])
        b = 35 + (y // 16)
        pix(im, [(b, y, '#4f8a3a'), (b + 1, y + 1, '#4f8a3a'), (b + 2, y, '#4f8a3a'), (b + 3, y - 1, '#4f8a3a'), (b + 4, y - 2, '#4f8a3a')])
    y = 38                                                             # sista raden lyser (vitt och ljusblått, inte guld)
    for yy in range(y - 3, y + 4):
        for x in range(10, 40):
            if (x + yy) % 2 == 0 or abs(yy - y) < 2: pix(im, [(x + 2, yy, '#dce0e4' if abs(yy - y) > 1 else '#ffffff')])
    for x in range(14, 36):
        if (x * 5) % 7 in (0, 3): continue
        pix(im, [(x + 2, y, '#1a1a20'), (x + 2, y + 1, '#3a3f48') if x % 2 else (x + 2, y, '#1a1a20')])
    pix(im, linje(37, y - 1, 41, y + 2, '#2a52c8', 2) + linje(41, y + 2, 38, y + 4, '#2a52c8', 2))   # en pil åt sidan: gå
    return kontur(im)

def skoldpadda():
    im = kort()
    for y in range(36, 47):                                            # vattnet
        for x in range(1, 47):
            if ((x + .5 - 24) / 23) ** 2 + ((y + .5 - 42) / 6) ** 2 <= 1: pix(im, [(x, y, VAT[2] if (x + 2 * y) % 9 else VAT[3])])
    for (cx, cy, r) in ((12, 37, 4), (33, 37, 4)):                    # benen/fenorna i vattenbrynet
        ell(im, cx, cy, r + 1, 2.5, '#2e5a48', '#40705a')
    cx, cy = 22, 37
    for y in range(12, 37):                                            # skalet: högt och välvt, med plattor och gräs
        for x in range(1, 44):
            u = ((x + .5 - cx) / 20) ** 2 + ((y + .5 - cy) / 23) ** 2
            if u <= 1:
                if u > 0.84: c = TRA[2] if (x // 5 + (y > 32)) % 2 else TRA[1]
                elif u > 0.7: c = '#56661c'
                else: c = '#80922a' if (x * 7 + y * 3) % 9 else '#a3b53a'
                if y > 32 and (x - 2) % 5 == 0: c = '#2a1a10'
                pix(im, [(x, y, c)])
    pix(im, [(27, y, TRA[1]) for y in range(9, 16)])                   # det lilla trädet
    ell(im, 27, 8, 5, 4, '#4f8a3a', '#6fae4a', '#2e5a26')
    for i in range(10):                                                 # halsen och huvudet till höger
        t = i / 9; x = 38 + t * 5; y = 33 - t * 8; r = 4 - t
        ell(im, x, y, r, r, '#40705a', '#5a8a70', '#2e5a48')
    ell(im, 42, 23, 5.5, 4.2, '#40705a', '#5a8a70', '#2e5a48')
    pix(im, [(44, 22, '#0e0e12'), (44, 21, '#5a8a70')] + [(x, 25, '#1e3a30') for x in range(42, 47)])
    return kontur(im)

ALLA = {'mat': mat, 'sol': sol, 'apa': apa, 'farfars_lista_sista_raden': farfars_lista_sista_raden, 'skoldpadda': skoldpadda}

if __name__ == '__main__':
    F = kortfarger(); ut = os.path.join(UTMAPP, 'bildkort'); os.makedirs(ut, exist_ok=True)
    for namn, fn in ALLA.items(): las_till(fn(), F).save(os.path.join(ut, namn + '.png'))
    o = Image.new('RGBA', (len(ALLA) * 50, 50), (250, 246, 236, 255))
    for i, namn in enumerate(ALLA): o.alpha_composite(Image.open(os.path.join(ut, namn + '.png')), (1 + i * 50, 1))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/kort108_x4.png')
    print(len(ALLA), 'kort,', len(F), 'färger')
