# Skogsbrynets och buskarnas föremål (Stil 5, beslut 43): det som stod kvar efter frysningen.
# Kartorna i repot är facit: varje bild har objektets mått eller står med nederkantens mitt på objektets.
#   hack, hack_oppen        24 x 192  häcken mellan skogsbrynets två skärmar, och samma häck med hålet (y 92-116)
#   trad_med_formel         48 x 64   trädet med svärdet ristat i barken (objektet 28 x 36, läses från söder)
#   stubbe, stubbe_bar      22 x 16   stubben, och stubben med två bär när den lilla lianen har fallit
#   skattlada, _oppen       20 x 16   skattlådan i buskarna, stängd och med locket uppe
#   gren                    30 x 10   grenen som spärrar en prövad sten
#   skylt_ingang            18 x 18   Farfars tavla vid ingången ("Farfar var här.")
#   skylt_bar               18 x 16   pilskylten mot buskarna, pilen åt höger (öster)
import os, sys, random, math
from PIL import Image
HAR = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.dirname(HAR)
sys.path.insert(0, os.path.join(ROT, 'palett'))
from palett import Palett
P = Palett()
_cwd = os.getcwd(); os.chdir(os.path.join(ROT, 'rutor'))
exec(open('pix.py').read())
_src = open('../prov/glanta.py').read()
exec(_src[_src.index('MAT.update'):_src.index('img=Image.new')])
exec(_src[_src.index('def trad(typ):'):_src.index('OBJ=[]')])
os.chdir(_cwd)

TRA = ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260']
MASS = ['#4A3A10', '#8A6A20', '#C8A040', '#E8C868', '#FFF0B0']
STIG = ['#7A5A36', '#A07A4A', '#BE9A62', '#D6B67E', '#E8CC98']
BAR = ['#1A3290', '#3A5AD8', '#B8CCFF']
def ny(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def pp(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), hx2(c))

# ---------- häcken ----------
HAL = (92, 116)          # hålets rader, samma som stig_genom_hacken i kartan
def hack(oppen=False):
    rnd = random.Random(43)
    d = Duk(24, 192)
    a, b = HAL
    for y in range(-2, 196, 6):
        for cx in (6, 12, 18):
            cy = y + rnd.randint(-2, 2) + (3 if cx == 12 else 0)
            r = rnd.choice((5, 6, 6, 7))
            if oppen and a - 3 < cy < b + 3: continue
            klipp = (lambda x, yy: not (a + 1 <= yy < b - 1)) if oppen else None
            d.ellips(cx + rnd.randint(-1, 1), cy, r, r * 0.9, 'lov', 'hack', klipp=klipp)
    d.kontur()
    im = d.bild()
    # små klungor av ljusare blad, så att häcken inte blir en slät korv
    for i in range(70):
        x = rnd.randint(3, 20); y = rnd.randint(2, 189)
        if im.getpixel((x, y))[3] and im.getpixel((x, y))[:3] != hx2('#14301A')[:3]:
            pp(im, x, y, '#78B456' if x < 12 else '#4A8E3A')
    if oppen:
        # stigen genom hålet: jord med rundade kanter, mörkare under bladen och lite gräs i kanterna
        r2 = random.Random(7)
        for y in range(a, b):
            for x in range(24):
                if im.getpixel((x, y))[3]: continue
                c = STIG[2]
                if y <= a + 1: c = STIG[0]
                elif y == a + 2: c = STIG[1]
                elif r2.random() < 0.12: c = r2.choice((STIG[3], STIG[1]))
                pp(im, x, y, c)
        # bladen buktar in i hålet, så att kanten inte blir rak
        for (x, y, r) in [(2, a + 1, 3), (11, a, 3), (20, a + 1, 3), (5, b - 1, 3), (16, b - 1, 3)]:
            for yy in range(y - r, y + r + 1):
                for xx in range(x - r - 1, x + r + 2):
                    if ((xx - x) / (r + 1)) ** 2 + ((yy - y) / r) ** 2 <= 1:
                        pp(im, xx, yy, '#2E6A30' if yy < y else '#1E4A24')
    return im

# ---------- trädet med formeln ----------
def trad_med_formel():
    d = Duk(48, 64)
    for (cx, cy, rx, ry) in [(14, 60, 5, 3), (34, 60, 5, 3)]: d.ellips(cx, cy, rx, ry, 'bark', 'rot')
    d.ellips(24, 50, 9, 13, 'bark', 'stam', platt=0.3)
    for (cx, cy, r) in [(24, 18, 17), (11, 24, 9), (37, 24, 9), (18, 9, 9), (31, 9, 9), (24, 30, 11)]:
        d.ellips(cx, cy, r, r * 0.82, 'lovgam', 'krona')
    d.kontur(); im = d.bild()
    # svärdet ristat i barken på framsidan: ljust trä i skårorna, mörk kant till höger och under (ljus uppe vänster)
    ljus, mitt, kant = '#C8A87A', '#A8885C', '#24160C'
    x0 = 23
    for y in range(40, 52):                        # klingan
        pp(im, x0, y, ljus); pp(im, x0 + 1, y, mitt); pp(im, x0 + 2, y, kant)
    pp(im, x0, 39, ljus); pp(im, x0 + 1, 39, kant)  # spetsen
    for x in range(x0 - 3, x0 + 5):                # parerstången
        pp(im, x, 52, ljus if x < x0 + 4 else mitt); pp(im, x, 53, kant)
    for y in (54, 55):                             # greppet
        pp(im, x0, y, mitt); pp(im, x0 + 1, y, mitt); pp(im, x0 + 2, y, kant)
    pp(im, x0, 56, ljus); pp(im, x0 + 1, 56, ljus); pp(im, x0 + 2, 56, kant)   # knappen
    for (x, y) in [(18, 44), (30, 50), (19, 55)]: pp(im, x, y, '#24160C')      # knotor
    return im

# ---------- stubben ----------
def stubbe(med_bar=False):
    d = Duk(22, 16)
    for (cx, cy, rx, ry) in [(4, 13, 3, 2), (18, 13, 3, 2)]: d.ellips(cx, cy, rx, ry, 'bark', 'rot')
    d.ellips(11, 10, 8, 5, 'bark', 'sida', platt=0.2)
    d.kontur(); im = d.bild()
    # snittytan uppifrån: ljust trä med två hela årsringar och mörk kärna
    for y in range(1, 10):
        for x in range(3, 19):
            r = math.sqrt(((x + 0.5 - 11) / 7.5) ** 2 + ((y + 0.5 - 5) / 3.4) ** 2)
            if r > 1: continue
            if r > 0.86: c = '#8A6C46'
            elif 0.56 < r <= 0.68 or 0.24 < r <= 0.34: c = '#A8885C'
            elif r <= 0.12: c = '#6A5032'
            else: c = '#C8A87A'
            pp(im, x, y, c)
    for x in range(4, 18):
        if im.getpixel((x, 1))[3] == 0: pp(im, x, 1, '#3A2A18')
    if med_bar:
        for (bx, by) in [(8, 4), (13, 5)]:
            pp(im, bx, by, BAR[1]); pp(im, bx + 1, by, BAR[1]); pp(im, bx, by + 1, BAR[0]); pp(im, bx + 1, by + 1, BAR[1])
            pp(im, bx, by - 1, BAR[0]); pp(im, bx + 1, by - 1, BAR[0]); pp(im, bx, by, BAR[2])
    return im

# ---------- skattlådan ----------
def skattlada(oppen=False):
    H = 18 if oppen else 16
    im = ny(20, H); o = H - 16
    for y in range(16):
        for x in range(20):
            if oppen and y < 6: continue
            if x in (0, 19) or y in (0, 15): c = TRA[0]
            elif y < 6:                                  # välvt lock uppifrån
                c = TRA[4] if y < 2 else (TRA[3] if y < 4 else TRA[2])
            elif y == 6: c = TRA[0]
            else: c = TRA[2] if y < 12 else TRA[1]
            if (x, y) in [(0, 0), (19, 0), (0, 15), (19, 15)]: continue
            pp(im, x, y + o, c)
    for bx in (4, 15):                                   # mässingsband
        for y in range(0 if not oppen else 6, 16):
            if y in (0, 6, 15): continue
            pp(im, bx, y + o, MASS[3] if y < 6 else MASS[2]); pp(im, bx + 1, y + o, MASS[1])
    if not oppen:
        for (x, y, c) in [(9, 6, MASS[0]), (10, 6, MASS[0]), (9, 7, MASS[3]), (10, 7, MASS[2]), (9, 8, MASS[2]), (10, 8, MASS[1]), (9, 9, '#3A2A18'), (10, 9, MASS[1])]:
            pp(im, x, y + o, c)
    else:
        # locket står uppe bakom lådan (vi ser dess insida), och lådan är mörk inuti med en vit glimt
        for y in range(0, 7):
            for x in range(1, 19):
                c = TRA[1] if y < 6 else TRA[0]
                if y == 0: c = TRA[0]
                pp(im, x, y, c)
        for x in (4, 5, 15, 16): pp(im, x, 2, MASS[1])
        for y in range(7, 11):
            for x in range(2, 18): pp(im, x, y + o - 1, '#1A1008')
        for (x, y) in [(11, 8), (10, 9), (11, 9), (12, 9), (11, 10)]: pp(im, x, y, '#FFFFFF')
    return im

# ---------- grenen ----------
def gren():
    d = Duk(30, 12)
    for (cx, cy) in [(6, 4), (23, 3)]: d.ellips(cx, cy, 4, 3, 'lov', 'blad')
    d.kontur(); im = d.bild()
    for x in range(2, 29):                              # grenen ligger snett, tjockast till vänster
        y = 8 - (x * 4) // 29
        tj = 3 if x < 18 else 2
        pp(im, x, y - 1, '#24160C')
        for k in range(tj): pp(im, x, y + k, ['#A87C50', '#6A4626', '#4A3018'][k if tj == 3 else k + 1])
        pp(im, x, y + tj, '#24160C')
    for (x0, y0, dx) in [(9, 6, 1), (16, 5, 1), (20, 4, -1)]:   # kvistar uppåt
        for k in range(1, 4): pp(im, x0 + dx * (k // 2), y0 - k, '#4A3018')
    for x in range(3, 28):                              # skugga på marken
        y = 8 - (x * 4) // 29 + (3 if x < 18 else 2) + 1
        if y < 12 and im.getpixel((x, y))[3] == 0: pp(im, x, y, '#3E6E2E')
    return im

# ---------- skyltarna ----------
def skylt_ingang():
    im = ny(18, 18); s = skylt(True, 18, 16)
    im.alpha_composite(s, (0, 2))
    for x in range(2, 7): pp(im, x, 2, '#4A8E3A')         # lite mossa på brädan
    pp(im, 3, 1, '#78B456'); pp(im, 4, 1, '#4A8E3A')
    return im

def skylt_bar():
    im = ny(18, 16)
    T = TRA
    for y in range(9, 15): pp(im, 4, y, T[2]); pp(im, 5, y, T[1])  # stolpen
    pp(im, 4, 15, T[0]); pp(im, 5, 15, T[0])
    # pilen åt höger: rak bräda och en spets
    for y in range(1, 10):
        spets = 12 + (4 - abs(y - 5))
        for x in range(1, spets + 1):
            c = T[4] if y < 3 else (T[3] if y < 8 else T[2])
            if x == 1 or y in (1, 9) or x == spets: c = T[0]
            pp(im, x, y, c)
    for (x, y) in [(3, 3), (3, 6)]: pp(im, x, y, '#3E4148')       # spikar
    # ett blått bär målat på pilen, så att den känns igen utan att läsas
    for (x, y, c) in [(12, 4, BAR[1]), (13, 4, BAR[1]), (12, 5, BAR[0]), (13, 5, BAR[1]), (12, 4, BAR[2])]: pp(im, x, y, c)
    return im

BILDER = {
    'foremal/skog/hack': hack(False),
    'foremal/skog/hack_oppen': hack(True),
    'foremal/skog/trad_med_formel': trad_med_formel(),
    'foremal/skog/stubbe': stubbe(False),
    'foremal/skog/stubbe_bar': stubbe(True),
    'foremal/skog/skattlada': skattlada(False),
    'foremal/skog/skattlada_oppen': skattlada(True),
    'foremal/skog/gren': gren(),
    'foremal/skog/skylt_ingang': skylt_ingang(),
    'foremal/skog/skylt_bar': skylt_bar(),
}

if __name__ == '__main__':
    for k, v in BILDER.items():
        f = os.path.join(HAR, 'ut', k + '.png'); os.makedirs(os.path.dirname(f), exist_ok=True)
        P.las_bild(v, os.path.basename(k)).save(f)
    print('klar', len(BILDER))
