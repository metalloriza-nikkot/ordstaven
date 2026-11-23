# Skissen av kapitel 4:s tre rum (119.7), ovanpå gråboxens kartor på 0.102.0 (c8dcbec). Platserna är kartans.
# Mynningen ligger i nordöstra hörnet (119.5), och stig 1 går över den isiga branten upp mot den (119.14).
# Stilen efter konceptrundan: lugn snö och lugn is, och detaljerna i kanterna (klippor i avsatser med tydlig kontur).
#   skiss_k4_stigen.png      640 x 192   berget_stigen
#   skiss_k4_grottan.png     640 x 384   berget_grottan (ljus; mörkret är färgtabellen)
#   skiss_k4_stenfaltet.png  320 x 192   berget_stenfalt (dag)
#   *_karta.png              samma, med kartans väggar (rött) och platser (gult) ovanpå, för avstämningen
import os, sys, json, math, random
_k = open('/home/claude/k4/koncept_k4.py').read()
exec(_k[:_k.index("\ndef pass1():")])
from PIL import Image, ImageDraw
UTS = '/home/claude/k4/skiss'
KARTOR = '/home/claude/ordstaven/kartor/den-gomda-dalen/'

def spar(d, pts, r=5):
    """En upptrampad stig: rund pensel, ljusblå mitt, kant i snöns skugga, fotspår."""
    for (a, b) in zip(pts, pts[1:]):
        n = max(abs(b[0] - a[0]), abs(b[1] - a[1]), 1)
        for i in range(n + 1):
            x = a[0] + (b[0] - a[0]) * i / n; y = a[1] + (b[1] - a[1]) * i / n
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    q = (dx * dx + dy * dy * 1.6) ** .5
                    if q <= r:
                        px, py = int(x + dx), int(y + dy)
                        if 0 <= px < d.b and 0 <= py < d.h and d.p[px, py][:3] != hx('#c8d4ec'):
                            d.s(px, py, '#c8d4ec' if q < r - 1.5 else SNO[1])
            if i % 7 == 0: d.s(int(x) - 1, int(y), SNO[0]); d.s(int(x) + 2, int(y) + 1, SNO[0])

def lugn_sno(d, x0, y0, b, h, seed=1):
    """Lugn snö: nästan en ton, med svaga blålila skuggstråk och några ljusa fläckar."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            n = brus(x, y * 1.4, 26, seed)
            c = SNO[2]
            if n < 0.14 and (x + y) % 2 == 0: c = SNO[1]
            elif n > 0.86 and (x + y) % 3 == 0: c = SNO[3]
            d.s(x, y, c)

def lugn_is(d, x0, y0, b, h, seed=5):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            n = brus(x, y, 22, seed)
            c = IS[5]
            if n < 0.14 and (x + y) % 2 == 0: c = IS[4]
            elif n > 0.8 and (x + 2 * y) % 3 == 0: c = IS[6]
            d.s(x, y, c)

def vatten(d, x0, y0, b, h, seed=7):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + b):
            n = brus(x, y * 2, 14, seed)
            c = IS[0] if n < 0.55 else IS[1]
            if (y + int(3 * math.sin(x / 7))) % 8 == 0 and n > 0.6: c = IS[2]
            d.s(x, y, c)

def bergvagg(d, x0, x1, y0, h, seed=3, sno_topp=True):
    """En brant mot söder: snö på krönet, avsatser av sten med snö på hyllorna, mörk fot."""
    for x in range(x0, x1):
        topp = y0 + int(2 * math.sin(x / 9 + seed))
        fot_y = y0 + h + int(2 * math.sin(x / 13 + seed * 2))
        for y in range(max(0, topp), fot_y):
            t = (y - topp) / max(1, fot_y - topp)
            band = int((y - topp + 2 * math.sin(x / 6)) // 7)
            ry = (y - topp + 2 * math.sin(x / 6)) % 7
            c = sten_yta(d, x, y, seed)
            if ry < 1.2 and band > 0: c = SNO[2] if (x + band) % 5 else SNO[1]      # snö på varje avsats
            if (x + band * 3) % 17 == 0: c = STEN[0]                                 # skrevor
            if sno_topp and y < topp + 3: c = SNO[3] if y == topp else SNO[2]
            if y >= fot_y - 2: c = STEN[0]
            d.s(x, y, c)

def isvagg(d, x0, x1, y0, h, seed=9):
    """En isvägg i grottan: ljus krön, blå yta med lodräta ränder och istappar, mörk fot."""
    for x in range(x0, x1):
        for y in range(y0, y0 + h):
            t = (y - y0) / h
            n = brus(x * 3, y * 0.4, 9, seed)
            c = IS[6] if t < 0.15 else (IS[4] if n > 0.55 else IS[3]) if t < 0.7 else IS[2]
            if (x + seed) % 11 == 0 and t > 0.2: c = IS[5]
            if y >= y0 + h - 2: c = IS[1]
            d.s(x, y, c)
        if (x * 7 + seed) % 5 == 0:                                               # istappar under krönet
            for k in range(1 + (x * 13) % 4): d.s(x, y0 + 2 + k, IS[7])

def kant_ner(d, x0, x1, y, mork):
    for x in range(x0, x1): d.s(x, y, mork)

# ---------------------------------------------------------------- rum 1: stigen
def stigen():
    d = Bild(640, 192)
    lugn_sno(d, 0, 0, 640, 192, 1)
    # floden i väster (kartans vägg 0–24)
    for y in range(192):
        st = 20 + int(2 * math.sin(y / 9))
        for x in range(0, st): d.s(x, y, IS[2] if brus(x, y * 2, 8, 30) > 0.5 else IS[3])
        d.s(st, y, '#c8d4ec'); d.s(st + 1, y, SNO[1])
    # östra sidan är högre: bergets sluttning upp mot mynningen. Väggen i norr (368–640, 0–16) är berget
    bergvagg(d, 364, 640, -4, 30, 4)
    # mynningen i nordöstra hörnet (520–576)
    for x in range(514, 582):
        for y in range(0, 46):
            u = (x - 548) / 30; v = (y - 44) / 42
            r = u * u + v * v
            if r <= 0.62: d.s(x, y, IS[0] if r < 0.45 else IS[1])
            elif r <= 1.0: d.s(x, y, IS[5] if (x + y) % 4 else IS[6])
            elif r <= 1.16: d.s(x, y, IS[3])
    for x in range(522, 576, 4):                                             # istappar i valvet
        for k in range(2 + (x % 3)): d.s(x, 6 + k + abs(x - 548) // 6, IS[7])
    # avsatsen framför mynningen och en kant ned mot sluttningen
    for x in range(364, 640):
        y = 58 + int(4 * math.sin(x / 23))
        if x < 500: y += (500 - x) // 6
        for k in range(4): d.s(x, y + k, STEN[1] if k else SNO[1])
        d.s(x, y + 4, STEN[0])
    for (sx, sy) in ((404, 64), (452, 74), (488, 84)): d.rk(sx, sy, 10, 4, SNO[2])   # trappsteg i kanten
    # den isiga branten (236–364): stig 1 går över den
    for x in range(236, 364):
        for y in range(192):
            t = min(x - 236, 364 - x) / 64
            n = brus(x * 2.5, y * 0.15, 8, 41)
            if t < 0.1: c = IS[6] if (x + y) % 3 else IS[7]
            elif t < 0.3: c = IS[4] if n > 0.45 else IS[3]
            elif t < 0.55: c = IS[2] if n > 0.5 else IS[1]
            else: c = IS[1] if n > 0.6 else IS[0]
            d.s(x, y, c)
        d.s(x, 0, IS[0])
    for y in range(192):
        d.s(236, y, SNO[0]); d.s(363, y, STEN[0]); d.s(364, y, STEN[1])
    # stigarna från floden till gaffeln och vidare
    spar(d, [(30, 150), (60, 128), (110, 110), (140, 96)])
    spar(d, [(140, 96), (110, 70), (100, 46), (102, 10)])                  # mot ELDGROTTAN, upp i norr
    spar(d, [(140, 96), (175, 84), (236, 96)])                            # mot ISGROTTAN, till branten
    spar(d, [(140, 96), (170, 140), (190, 190)])                          # mot ISSJÖN, söderut
    spar(d, [(364, 96), (420, 92), (470, 80), (520, 60), (548, 46)])      # andra sidan: upp till mynningen
    # ånga från ELDGROTTANS håll vid norra kanten, och issjöns blanka kant i söder
    for y in range(176, 192):
        for x in range(150, 236):
            if ((x - 196) / 46) ** 2 + ((y - 196) / 16) ** 2 <= 1: d.s(x, y, IS[6] if (x + y) % 5 else IS[7])
    rr = random.Random(4)
    for (x, y) in ((40, 30), (52, 176), (214, 40), (226, 130), (620, 120), (388, 170)):   # några stenar i snön
        d.ell(x, y, 4, 2.6, STEN[2], STEN[3], STEN[1], STEN[0])
    d.kontur('#2a2a3a')
    im = d.im
    for (bx, by) in ((116, 2), (34, 70), (58, 172), (222, 168), (206, 6)):     # granar med snö på grenarna
        for k in range(5):
            w = 2 + k * 2
            for j in range(3):
                for x in range(-w + (2 - j), w - (2 - j) + 1):
                    px, py = bx + x, by + k * 3 + j
                    if 0 <= px < 640 and 0 <= py < 192:
                        c = SNO[3] if j == 0 and x % 2 == 0 else '#2e5a3a' if (x + j) % 4 else '#1e3a28'
                        im.putpixel((px, py), hx(c) + (255,))
        for j in range(3):
            if by + 15 + j < 192: im.putpixel((bx, by + 15 + j), hx(TRA[1]) + (255,))
    # gamla skyltstolpar (kartans tre skyltar) – bara trä, orden står på läsplattan
    for (sx, sy) in ((161, 88), (161, 168), (107, 58)):
        dd = ImageDraw.Draw(im)
        dd.rectangle((sx - 1, sy - 16, sx, sy), fill=hx(TRA[1])); dd.rectangle((sx - 9, sy - 16, sx + 8, sy - 10), fill=hx(TRA[3]))
        dd.line((sx - 9, sy - 10, sx + 8, sy - 10), fill=hx(TRA[1]))
    # stolpen vid stig 1 och flaken i rutnätet (2 x 3) över branten
    dd = ImageDraw.Draw(im); dd.rectangle((240, 70, 241, 92), fill=hx(TRA[1])); dd.rectangle((236, 66, 246, 71), fill=hx(TRA[3]))
    fl = k4('foremal/berg/isflak.png')
    for r in range(2):
        for k in range(3): fot(im, fl, 260 + k * 40, 96 + r * 26 + 4)
    rr = random.Random(9)
    for (x, y) in ((424, 86), (482, 116), (572, 104), (612, 156)): snoklump(Bild(1, 1), 0, 0, 1, 1, rr)
    sn = Bild(640, 192)
    for (x, y) in ((424, 78), (482, 108), (572, 96), (612, 148)): snoklump(sn, x, y, 9, 6, rr)
    im.alpha_composite(sn.kontur('#2a2a3a').im)
    s2 = Bild(640, 192); s2.ell(511, 150, 9, 6, STEN[2], STEN[3], STEN[1], STEN[0]); s2.kontur('#2a2a3a'); im.alpha_composite(s2.im)
    im.putpixel((511, 148), hx(MASS3) + (255,))
    return im

MASS3 = '#c8963e'

# ---------------------------------------------------------------- rum 2: isgrottan
def grottan():
    d = Bild(640, 384)
    lugn_is(d, 0, 0, 640, 384, 5)
    vatten(d, 96, 14, 208, 170, 7)                                           # stig 2 över vattnet (uppe)
    vatten(d, 336, 214, 248, 154, 8)                                         # stig 3 över vattnet (nere)
    for (x0, y0, b, h) in ((96, 14, 208, 170), (336, 214, 248, 154)):
        for x in range(x0, x0 + b): d.s(x, y0, IS[3]); d.s(x, y0 + 1, IS[2])
        for y in range(y0, y0 + h): d.s(x0, y, IS[6]); d.s(x0 + b - 1, y, IS[6])
    isvagg(d, 0, 640, 0, 16, 9)                                              # norra väggen uppe
    isvagg(d, 0, 304, 184, 18, 10); isvagg(d, 336, 640, 184, 18, 11)        # mittväggen, med en öppning (304–336)
    isvagg(d, 0, 640, 366, 18, 12)                                           # södra väggen
    for y in range(384):
        for x in list(range(0, 4)) + list(range(636, 640)): d.s(x, y, IS[2] if x in (3, 636) else IS[1])
    # gåtans tre skrifter i norra väggen: glimt av skrift, utan bokstäver
    for gx in (352, 436, 520):
        for k in range(22):
            for j in range(3):
                if (k + j * 2) % 4: d.s(gx + 1 + k, 4 + j * 3, '#fff8c8' if j == 1 else '#ffffff')
    for gx in (220, 268):                                                    # väggen med vägen ut och gåtans rad igen
        for k in range(22):
            for j in range(2):
                if (k + j) % 3: d.s(gx + 1 + k, 190 + j * 4, '#fff8c8' if j else '#ffffff')
    # ishyllan vid södra väggen, med isblocket under (fotavtrycket ligger under blocket)
    for x in range(56, 136):                                                 # hyllan sticker ut från södra väggen
        top = 342 + (2 if x in (56, 57, 134, 135) else 0)
        for y in range(top, 366):
            c = IS[7] if y < top + 3 else IS[6] if y < top + 5 else IS[4] if (x + y) % 7 else IS[5]
            if y > 360: c = IS[3]
            d.s(x, y, c)
    for x in range(58, 134, 4):
        for k in range(1 + x % 3): d.s(x, 347 + k, IS[5])
    # sprickan i östra väggen med dagsljus
    for y in range(266, 314):
        w = 3 - abs(y - 290) // 9
        for x in range(636 - w, 640): d.s(x, y, '#fff8c8' if x > 637 else '#ffffff')
    for i in range(70):                                                      # ljuset faller in på golvet
        for j in range(-6 - i // 8, 7 + i // 8):
            x, y = 634 - i, 290 + j
            if d.g(x, y) and (x + y) % 3 == 0 and d.p[x, y][:3] == hx(IS[5]): d.s(x, y, IS[7])
    d.kontur(IS[0])
    im = d.im
    fl = k4('foremal/berg/isflak.png')
    for r in range(3):                                                       # stig 2: 3 x 5 (rutnätets mitt där kartan har stigen)
        for k in range(5): fot(im, fl, 120 + k * 40, 70 + r * 26)
    for r in range(3):                                                       # stig 3: 3 x 6
        for k in range(6):
            if (r, k) == (2, 3): continue                                    # vaken (~)
            fot(im, fl, 360 + k * 40, 262 + r * 26)
    im.alpha_composite(k4('foremal/berg/vak_01.png'), (360 + 3 * 40 - 14, 262 + 2 * 26 - 16))
    ib = Image.open('/home/claude/k4/ut118/foremal/berg/isblock_hylla_01.png'); fot(im, ib, 96, 340)
    # stavens regnbågsljus som speglar sig här och där i väggarna
    rr = random.Random(3)
    for _ in range(60):
        x, y = rr.randrange(640), rr.randrange(384)
        if im.getpixel((x, y))[:3] in (hx(IS[3]), hx(IS[4])): im.putpixel((x, y), hx(REGNBAGE[rr.randrange(5)]) + (255,))
    fot(im, bild('figurer/hjalte/hjalte_ga_hoger_01.png'), 46, 116); fot(im, bild('figurer/unge/unge1_ga_hoger_01.png'), 26, 120)
    return im

# ---------------------------------------------------------------- rum 3: stenfältet
def stenfaltet():
    d = Bild(320, 192)
    lugn_sno(d, 0, 0, 320, 192, 21)
    for y in range(0, 14):                                                   # bortom norra kanten: molnhavet långt nedanför
        for x in range(320):
            n = brus(x, y * 3, 12, 22)
            d.s(x, y, '#ffffff' if n > 0.55 else '#e8f2fa' if n > 0.3 else '#dce0e4')
    for x in range(320):
        if not 156 <= x < 194: d.s(x, 12, SNO[0]); d.s(x, 13, STEN[1])        # kanten, utom där stigen går mot molnkanten
    spar(d, [(30, 150), (90, 150), (130, 100), (176, 40), (176, 12)])
    for y in range(176, 192):                                                # sluttningen ned mot grottan i söder
        for x in range(320):
            t = y - 176 - int(2 * math.sin(x / 11))
            if t >= 0: d.s(x, y, sten_yta(d, x, y, 23) if t > 2 else SNO[1])
    for y in range(126, 176):                                                # grottans utgång i väster
        for x in range(0, 22):
            u = x / 22; v = (y - 150) / 24
            if u * u + v * v <= 1: d.s(x, y, IS[1] if u * u + v * v < 0.6 else IS[4])
    d.kontur('#2a2a3a')
    im = d.im
    for (n, (x, y, b, h)) in (('sten_varm_slat_01', (70, 60, 26, 20)), ('sten_varm_taggsvans_01', (140, 46, 26, 20)),
                              ('sten_kall_klubbsvans', (210, 70, 26, 20)), ('sten_hal', (240, 130, 30, 18)),
                              ('sten_varm_klubbsvans_01', (110, 120, 26, 20))):
        fot(im, k4('foremal/berg/' + n + '.png'), x + b / 2, y + h + 4)
    fot(im, k4('foremal/berg/block_driva.png'), 282, 96)
    fot(im, bild('figurer/hjalte/hjalte_ga_hoger_01.png'), 40, 160); fot(im, bild('figurer/unge/unge1_ga_hoger_01.png'), 22, 164)
    return im

def karta(im, rum):
    m = json.load(open(KARTOR + rum + '.tmj')); k = im.copy(); dd = ImageDraw.Draw(k)
    for L in m['layers']:
        for o in L.get('objects', []):
            x, y, b, h = o['x'], o['y'], o.get('width', 0), o.get('height', 0)
            if b and h: dd.rectangle((x, y, x + b - 1, y + h - 1), outline=(230, 40, 40, 255) if o.get('type') == 'vagg' else (250, 210, 40, 255))
            else: dd.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(250, 210, 40, 255))
    return k

if __name__ == '__main__':
    os.makedirs(UTS, exist_ok=True)
    for namn, f, rum in (('stigen', stigen, 'berget_stigen'), ('grottan', grottan, 'berget_grottan'), ('stenfaltet', stenfaltet, 'berget_stenfalt')):
        im = las(f())
        im.save(f'{UTS}/skiss_k4_{namn}.png'); im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f'{UTS}/skiss_k4_{namn}_x2.png')
        k = karta(im, rum); k.resize((k.width * 2, k.height * 2), Image.NEAREST).save(f'{UTS}/skiss_k4_{namn}_karta_x2.png')
    print('klart')
