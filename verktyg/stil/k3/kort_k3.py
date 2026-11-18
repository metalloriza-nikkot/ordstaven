# Kapitel 3 (beslut 100.6): bildkorten, 48 x 48 som förut (bildkort/<id>.png, samma id som `bild` i datan).
# En tydlig sak per kort. Korten i ett läsval får inte gå att skilja på något annat än det som ska läsas:
#   skylten steg 1: kort_skold, kort_sko, kort_sol (alla börjar på S)   steg 2: kort_padda, kort_panna, kort_pil (alla på P)
#   fenan: under_fenan, bakom_fenan, under_huvudet, bakom_huvudet — samma bild av sköldpaddans framdel, bara platsen
#          som lyser skiljer (en ljus ring), så att kortet inte säger mer än orden
#   kvarnen: lucka_vid_vattnet, lucka_vid_dorren, pa_/vid_stora_sacken, pa_/vid_lilla_sacken, på samma sätt
#   molnets bilder: tang_hjul (k3_hjulet), ankare_faller (k3_skold), morker_kant (k3_morkret)
#   Dinoboken: malning_skal (målningen under skalets kant)     uppdragen: kort_kvarn, kort_on, kort_flaska
# Inget guld: guld betyder rätt svar. Solen är gul och skölden av trä och järn.
import os, sys, math
HAR = '/home/claude/k3'; os.chdir(HAR)
F = {}; exec(open('/home/claude/k3/foremal_k3.py').read().split("if __name__ == '__main__':")[0], F)
S = {}; exec(open('/home/claude/k3/skoldpadda.py').read().split("if __name__ == '__main__':")[0], S)
Hh = {}; exec(open('/home/claude/k3/hornen.py').read().split("if __name__ == '__main__':")[0], Hh)
Duk, MAT, H, rita, skilj = F['Duk'], F['MAT'], F['H'], F['rita'], F['skilj']
from PIL import Image
MAT['sol'] = [F['_p'].narmast(c)[0] for c in ('#8a6a10', '#d8b020', '#f2d22e', '#f8e46a', '#fff8c8')]
MAT['padda'] = [F['_p'].narmast(c)[0] for c in ('#2e3d10', '#56661c', '#80922a', '#a3b53a', '#cad86a')]
MAT['brun'] = [F['_p'].narmast(c)[0] for c in ('#3a2414', '#5a3c26', '#7a5638', '#9c7450', '#c49a72')]
def kort(): return Image.new('RGBA', (48, 48), (0, 0, 0, 0))
def mitt(im, sak, y=None):
    x = (48 - sak.width) // 2; y = (48 - sak.height) // 2 if y is None else y
    im.alpha_composite(sak, (x, y)); return im

# ---------------- S och P ----------------
def kort_skold():
    d = Duk(48, 48)
    for y in range(6, 44):
        for x in range(8, 40):
            t = (y - 6) / 38; halv = 16 * (1 - max(0, t - 0.45) ** 1.4 * 1.9)
            if abs(x + 0.5 - 24) <= halv:
                nx = (x + 0.5 - 24) / 16
                d.satt(x, y, 'tra', 4 if nx < -0.5 else 3 if nx < 0.2 else 2, 'skold')
    d.kontur(); im = d.bild(); C = MAT['jarn']; pts = []
    for (x, y), nm in d.del_.items():                                              # järnkant och ett kors av järn
        if nm != 'skold': continue
        kant = any(d.del_.get((x + a, y + b)) != 'skold' for a in (-2, 0, 2) for b in (-2, 0, 2))
        if kant or abs(x - 24) <= 1 or abs(y - 20) <= 1: pts.append((x, y, C[3] if (x < 24 and y < 30) else C[2]))
    pts += [(23, 19, C[4]), (24, 19, C[4]), (23, 20, C[3])]
    return rita(im, pts)
def kort_sko():
    """Samma sko som kapitel 1:s bildkort (bildkort/sko), så att han känner igen den."""
    return Image.open('/home/claude/inkorg/bildkort/sko.png').convert('RGBA')
def _gammal_sko():
    d = Duk(48, 48)
    d.ellips(20, 22, 7, 12, 'brun', 'skaft', zbias=0.2, klipp=lambda x, y: y <= 30)
    d.ellips(27, 32, 15, 6, 'brun', 'fot', zbias=0.2)
    skilj(d, 'skaft', 'fot', 1); d.kontur(); im = d.bild()
    pts = [(x, 37, '#24160c') for x in range(12, 43)] + [(x, 38, '#3a2414') for x in range(13, 42)]
    pts += [(22, y, '#eeeff4') for y in (15, 19, 23)] + [(19, y, '#eeeff4') for y in (17, 21)]
    return rita(im, pts)
def kort_sol():
    d = Duk(48, 48); d.ellips(24, 24, 10, 10, 'sol', 'sol', zbias=0.3); d.kontur(); im = d.bild(); pts = []
    for k in range(12):
        a = math.radians(k * 30)
        for r in range(13, 19 if k % 2 == 0 else 16):
            pts.append((int(24 + r * math.cos(a)), int(24 + r * math.sin(a)), '#f2d22e' if r < 16 else '#d8b020'))
    return rita(im, pts)
def kort_padda():
    d = Duk(48, 48)
    for s in (-1, 1): d.ellips(24 + s * 12, 34, 6, 3.4, 'padda', f'ben{s}', zbias=0.1)
    d.ellips(24, 28, 15, 10, 'padda', 'kropp', zbias=0.25)
    for s in (-1, 1): d.ellips(24 + s * 7, 18, 4, 3.6, 'padda', f'oga{s}', zbias=0.35)
    for s in (-1, 1): skilj(d, f'oga{s}', 'kropp', 1); skilj(d, 'kropp', f'ben{s}', 1)
    d.kontur(); im = d.bild(); pts = []
    for (x, y), nm in d.del_.items():
        if nm == 'kropp' and F['brus'](x // 2, y // 2, 8) < 0.12: pts.append((x, y, MAT['padda'][1]))   # vårtor
    for s in (-1, 1): pts += [(24 + s * 7, 18, '#101010'), (24 + s * 7 + 1, 18, '#101010'), (24 + s * 7, 17, '#ffffff')]
    pts += [(x, 30, MAT['padda'][0]) for x in range(17, 32)]
    return rita(im, pts)
def kort_panna():
    d = Duk(48, 48); d.ellips(20, 28, 14, 9, 'jarn', 'panna', zbias=0.1)
    d.kontur(); im = d.bild(); C = MAT['jarn']; pts = []
    for (x, y), nm in d.del_.items():
        if nm == 'panna' and ((x - 20) / 11) ** 2 + ((y - 27.5) / 6.5) ** 2 < 1: pts.append((x, y, C[1]))   # insidan
    for k in range(14): pts += [(33 + k, 24 - k // 3, '#24160c'), (33 + k, 25 - k // 3, '#4a3018')]          # skaftet av trä
    return rita(im, pts)
def kort_pil():
    im = kort(); pts = []
    for k in range(30): pts += [(9 + k, 34 - k * 0.66, '#6a4626'), (9 + k, 35 - k * 0.66, '#4a3018')]
    pts = [(int(x), int(y), c) for (x, y, c) in pts]
    for (dx, dy) in ((0, 0), (-1, 0), (-2, 0), (0, 1), (-1, 1), (0, 2), (1, -1), (2, -2), (-3, 0), (0, 3)):
        pts.append((39 + dx, 14 + dy, '#8a8a96' if dx + dy < 0 else '#55555f'))
    for k in range(5): pts += [(7 + k, 31 + k, '#c23a2e'), (5 + k, 33 + k, '#e86a5a'), (9 + k, 37 + k // 2, '#c23a2e')]   # fjädrarna
    return rita(im, pts)

# ---------------- platserna ----------------
def ring(im, cx, cy, rx=6, ry=4):
    pts = []
    for a in range(0, 360, 10):
        pts.append((int(cx + rx * math.cos(math.radians(a))), int(cy + ry * math.sin(math.radians(a))), '#ffffff' if a % 20 else '#eeeff4'))
    return rita(im, pts)
def framdel():
    """Sköldpaddans framdel i liten skala: skalets kant upptill, huvudet i mitten och vänstra fenan."""
    im = kort()
    k = S['kropp_sandbanken']().crop((24, 70, 152, 128)).resize((64, 29), Image.NEAREST)
    im.alpha_composite(k, (-8, 2))
    im.alpha_composite(S['fena']('sanden').resize((22, 14), Image.NEAREST), (2, 22))
    im.alpha_composite(S['huvud']('vilar').resize((22, 20), Image.NEAREST), (22, 22))
    return im
PLATS = {'under_fenan': (12, 34), 'bakom_fenan': (12, 22), 'under_huvudet': (33, 44), 'bakom_huvudet': (33, 22)}
def plats(n): return ring(framdel(), *PLATS[n])

def kvarn_bild():
    im = kort()
    for y in range(48):
        for x in range(48): im.putpixel((x, y), H('#c49a72' if y > 18 else '#7a5638'))   # golv och vägg
    return im
def kvarn_plats(n):
    im = kvarn_bild()
    luckor = {'lucka_vid_vattnet': (4, 22), 'lucka_vid_dorren': (26, 34)}
    if n.startswith('lucka'):
        for y in range(19, 30):                                                        # vattenrännan till vänster, dörren till höger
            for x in range(0, 10): im.putpixel((x, y), H('#2a52c8' if (x + y) % 4 else '#9ac8e8'))
        for y in range(4, 20):
            for x in range(36, 46): im.putpixel((x, y), H('#4a3018' if x in (36, 45) else '#6a4626'))
        for (lx, ly) in luckor.values(): im.alpha_composite(F['lucka'](False).resize((14, 10), Image.NEAREST), (lx, ly))
        lx, ly = luckor[n]; return ring(im, lx + 7, ly + 5, 9, 7)
    im.alpha_composite(F['sack'](True), (3, 16)); im.alpha_composite(F['sack'](False), (30, 28))
    pos = {'pa_stora_sacken': (14, 19), 'vid_stora_sacken': (14, 44), 'pa_lilla_sacken': (37, 31), 'vid_lilla_sacken': (37, 45)}
    return ring(im, *pos[n], 6, 3)

# ---------------- molnets bilder ----------------
def sten(x, y):
    """Flodsten i murade block: rader om 5 px, förskjutna, med mörka fogar och en ljus överkant."""
    rad = y // 5; xx = x + (4 if rad % 2 else 0)
    if y % 5 == 0 or xx % 9 == 0: return '#34343c'
    if y % 5 == 1: return '#9ea0ae'
    return '#6e6e80' if (xx // 9 + rad) % 3 else '#55555f'
def tang_hjul():
    """Vattenhjulet insnott i tjock tång, och hornet som blänker högst upp på kvarnen."""
    im = kort()
    for y in range(0, 30):                                                         # kvarnens vägg av flodsten
        for x in range(26, 48): im.putpixel((x, y), H(sten(x, y)))
    for y in range(30, 48):
        for x in range(48): im.putpixel((x, y), H('#2a52c8' if (x + y) % 5 else '#4f7ae8'))   # vattnet
    d = Duk(32, 32); d.ellips(16, 16, 14, 14, 'tra', 'hjul', toner=(1, 2, 3, 3), zbias=0.1); d.ellips(16, 16, 9, 9, 'tra', 'inne', toner=(0, 1, 1, 1))
    d.kontur(); hj = d.bild()
    for k in range(8):
        a = math.radians(k * 45)
        for r in range(4, 14): hj.putpixel((int(16 + r * math.cos(a)), int(16 + r * math.sin(a))), H('#6a4626'))
    im.alpha_composite(hj, (2, 16))
    for (x, y) in ((4, 18), (14, 14), (24, 22)): im.alpha_composite(F['tang_tuss'](False), (x, y))
    im.alpha_composite(Hh['stora_hornet']('rent').resize((22, 14), Image.NEAREST), (26, 0))
    return im
def ankare_faller():
    im = kort(); a = F['ankare'](False); im.alpha_composite(a, (12, 14))
    for y in range(0, 14): im.putpixel((23, y), H('#a08a6e')); im.putpixel((24, y), H('#7e6a52'))
    for (x, y) in ((8, 6), (36, 4), (6, 18), (38, 16)): im.putpixel((x, y), H('#dce0e4')); im.putpixel((x, y + 1), H('#b8bec6'))   # fartstreck
    return im
def morker_kant():
    im = kort()
    k = S['kropp_sandbanken']().crop((60, 70, 120, 110)).resize((48, 32), Image.NEAREST)
    im.alpha_composite(k, (0, 0))
    im.alpha_composite(F['skalkant']().resize((40, 14), Image.NEAREST), (4, 26))
    for y in range(40, 48):
        for x in range(48): im.putpixel((x, y), H('#e8d2b0' if (x + y) % 6 else '#c49a72'))
    return im

def malning_skal():
    """Den gamla målningen på skalets insida: jordfärger på skalets plattor. En stor dinosaurie med klubbsvans (mammas
    siluett, 77.6), tre små människor där den tredje håller ett horn, och fem streck bredvid hornet."""
    im = kort(); p = im.load()
    fx = [(8, 8), (30, 6), (44, 20), (20, 24), (6, 34), (34, 36), (16, 46), (44, 44)]
    for y in range(48):
        for x in range(48):
            ds = sorted(math.hypot(x - a, y - b) for a, b in fx)
            p[x, y] = H('#3a2414' if ds[1] - ds[0] < 1.2 else '#7a5638' if (x * 3 + y) % 11 else '#6a4626')
    O = H('#e8d2b0'); R = H('#c23a2e')
    def ell(cx, cy, rx, ry, c):
        for y in range(48):
            for x in range(48):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: p[x, y] = c
    ell(23, 15, 12, 5.5, O)                                                          # kroppen, låg och bred
    ell(37, 16, 3.6, 2.6, O)                                                         # huvudet
    for k in range(9): p[11 - k, 14 - k // 3] = O; p[11 - k, 15 - k // 3] = O          # svansen
    ell(3, 10.5, 2.6, 2.2, O)                                                        # klubban
    for x0 in (14, 18, 27, 31):                                                      # fyra ben
        for y in range(19, 24): p[x0, y] = O; p[x0 + 1, y] = O
    for k in range(6):                                                               # plattor på ryggen
        x = 14 + k * 3; p[x, 9] = R; p[x + 1, 9] = R; p[x, 8] = R
    for i, x0 in enumerate((12, 19, 26)):                                            # tre små människor
        for (dx, dy) in ((0, 0), (0, 1), (0, 2), (-1, 2), (1, 2), (0, 3), (0, 4), (-1, 5), (1, 5), (-1, 6), (1, 6)): p[x0 + dx, 31 + dy] = O
        p[x0, 30] = O; p[x0 - 1, 30] = O
    for k in range(6): p[27 + k, 32 - k // 2] = R                                   # hornet i den tredjes händer
    for y in range(28, 31): p[33, y] = R; p[34, y] = R
    for k in range(5):                                                               # fem streck bredvid hornet
        for y in range(29, 35): p[37 + k * 2, y] = O
    return im

# ---------------- uppdragen ----------------
def kort_kvarn():
    im = kort()
    for y in range(36, 48):
        for x in range(48): im.putpixel((x, y), H('#2a52c8' if (x + y) % 5 else '#4f7ae8'))
    for y in range(8, 38):
        for x in range(14, 40): im.putpixel((x, y), H(sten(x, y)))
    for x in range(10, 44):
        for y in range(4, 10):
            if abs(x - 27) * 0.4 + (9 - y) < 6: im.putpixel((x, y), H('#4a3018' if y > 6 else '#6a4626'))   # taket
    im.alpha_composite(Hh['stora_hornet']('rent').resize((20, 13), Image.NEAREST), (28, 10))
    d = Duk(20, 20); d.ellips(10, 10, 9, 9, 'tra', 'hjul', toner=(1, 2, 3, 3)); d.kontur(); hj = d.bild()
    for k in range(6):
        a = math.radians(k * 60)
        for r in range(2, 9): hj.putpixel((int(10 + r * math.cos(a)), int(10 + r * math.sin(a))), H('#4a3018'))
    im.alpha_composite(hj, (2, 26))
    for y in range(26, 38):
        for x in range(23, 29): im.putpixel((x, y), H('#24160c' if x in (23, 28) or y == 26 else '#4a3018'))   # dörren
    return im
def kort_on():
    im = kort()
    for y in range(48):
        for x in range(48): im.putpixel((x, y), H('#2a52c8' if (x + y) % 5 else '#4f7ae8'))
    im.alpha_composite(S['on_floden']().resize((44, 30), Image.NEAREST), (2, 9)); return im
def kort_flaska():
    im = kort(); fl = F['flaska']().resize((20, 28), Image.NEAREST); im.alpha_composite(fl, (14, 8))
    for x in range(8, 40): im.putpixel((x, 38), H('#c49a72')); im.putpixel((x, 39), H('#a08a6e'))
    return im

ALLA = {'kort_skold': kort_skold, 'kort_sko': kort_sko, 'kort_sol': kort_sol, 'kort_padda': kort_padda, 'kort_panna': kort_panna,
        'kort_pil': kort_pil, 'tang_hjul': tang_hjul, 'ankare_faller': ankare_faller, 'morker_kant': morker_kant,
        'malning_skal': malning_skal, 'kort_kvarn': kort_kvarn, 'kort_on': kort_on, 'kort_flaska': kort_flaska}
for _n in PLATS: ALLA[_n] = (lambda n: (lambda: plats(n)))(_n)
for _n in ('lucka_vid_vattnet', 'lucka_vid_dorren', 'pa_stora_sacken', 'vid_stora_sacken', 'pa_lilla_sacken', 'vid_lilla_sacken'):
    ALLA[_n] = (lambda n: (lambda: kvarn_plats(n)))(_n)

if __name__ == '__main__':
    P = F['_p']; UT = '/home/claude/k3/ut/bildkort'; os.makedirs(UT, exist_ok=True)
    o = Image.new('RGBA', (8 * 50 + 2, ((len(ALLA) + 7) // 8) * 50 + 2), (242, 232, 200, 255))
    for i, (n, f) in enumerate(ALLA.items()):
        im = P.las_bild(f(), n); im.save(f'{UT}/{n}.png'); o.alpha_composite(im, (2 + (i % 8) * 50, 2 + (i // 8) * 50))
    o.resize((o.width * 3, o.height * 3), Image.NEAREST).save('/tmp/kort_k3_x3.png'); print(len(ALLA))
