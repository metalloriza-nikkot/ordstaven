# Fas 4: introt. Utsikten genom Farfars öppna fönster mot bergen där dalen ligger gömd i moln,
# och sedan blicken ned mot skrivbordet (beslut i stilchatten 2026-11-08). Stil 2026-11-08.
# Bilden är hög (320 x 352): fönstret överst, skrivbordet (bord2) nederst. Kameran börjar uppe och glider ned
# 160 px till startskärmen. Snett uppifrån som resten av spelet, men väggen med fönstret ses rakt framifrån,
# som väggarna i husets rum.
import math, random
def _utan_main(kalla):
    ut, hoppa = [], False
    for rad in kalla.splitlines():
        if rad.startswith('if __name__'): hoppa = True; continue
        if hoppa and rad and not rad[0].isspace(): hoppa = False
        if not hoppa: ut.append(rad)
    return '\n'.join(ut)
exec(_utan_main(open('/home/claude/fas4/skrivbord.py').read()))

HOG = 352; BORD_Y = 160
OX0, OY0, OX1, OY1 = 40, 8, 280, 136          # fönstrets öppning i den höga bilden
VIT = ['#5A5A66', '#9A9AA8', '#C8C8D2', '#E8E8EE', '#FFFFFF']
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def band(p, x, y, farger, t):
    """Rastrerad toning mellan färgerna i en lista, t från 0 till 1, som SNES-spelens himlar."""
    f = t * (len(farger) - 1); i = min(int(f), len(farger) - 2); r = f - i
    p[x, y] = hx(farger[i + 1] if r * 16 > BAYER[y % 4][x % 4] + 0.5 else farger[i])

def utsikt(w, h, solupp=True):
    im = ny(w, h); p = im.load(); rnd = random.Random(11)
    himmel = (['#2A2E6A', '#4A3E8A', '#8A5AA8', '#D87A8A', '#F0A070', '#F8D090', '#FFF0C0'] if solupp
              else ['#10142E', '#1A1E4A', '#2A2E6A', '#3E3A78', '#5A4A88', '#7A5A90'])
    horisont = 74
    for y in range(h):
        for x in range(w): band(p, x, y, himmel, min(1, y / horisont))
    if not solupp:                                                    # stjärnor före gryningen
        for _ in range(40):
            x, y = rnd.randrange(w), rnd.randrange(50); p[x, y] = hx('#E8E8EE' if rnd.random() < .5 else '#A8B4E8')
    d = ImageDraw.Draw(im)
    if solupp:                                                        # de tre solarna stiger bakom bergen
        for (cx, cy, r) in ((124, 60, 13), (98, 52, 6), (150, 50, 4)):
            d.ellipse((cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), fill=hx('#FFE8B0'))
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hx('#FFFBEA'))
    def kam(bas, amp, fas, skala, fin=0.15):
        return [bas - amp * (0.55 * math.sin(x / skala + fas) + 0.3 * math.sin(x / (skala * 0.43) + fas * 2.1)
                             + fin * math.sin(x / (skala * 0.19) + fas * 3.7)) for x in range(w)]
    def berg(rand, farger, botten, snolinje=None, kantljus=None):
        """Berg i stora plan som i SNES-spelen: ljus sida mot solen, mörk sida bort, en ljus kam i motljus."""
        lj, me, mo, sno = farger
        for x in range(w):
            if rand[x] is None: continue
            lut = ((rand[min(w - 1, x + 3)] or rand[x]) - (rand[max(0, x - 3)] or rand[x])) / 3
            for y in range(int(rand[x]), botten):
                t = lj if lut > 0.15 else mo if lut < -0.15 else me
                if snolinje is not None and y < snolinje and y < rand[x] + 6: t = sno
                p[x, y] = hx(t)
            if kantljus: p[x, int(rand[x])] = hx(kantljus)
    fjarran = kam(66, 24, 0.6, 22)
    berg(fjarran, ['#A8A2C8', '#8A86B4', '#6A6A9A', '#E8E8EE'] if solupp else ['#3E3A6A', '#30305A', '#24244A', '#8A8AAA'],
         84, snolinje=52, kantljus='#FFF0C0' if solupp else None)
    moln = ['#B8B8D0', '#E8E8EE', '#FFFFFF', '#F8D0D0'] if solupp else ['#4A4A78', '#5A5A88', '#6E6E9A', '#7A6A98']
    for x in range(w):                                                # molnhavet som döljer dalen
        for y in range(80, 104): p[x, y] = hx(moln[0] if y > 96 and (x + y) % 2 else moln[1])
    rnd2 = random.Random(5)
    for i in range(34):                                               # molnens runda ovansidor
        cx = rnd2.uniform(-6, w + 6); r = rnd2.uniform(4, 9); cy = 80 + rnd2.uniform(-2, 3)
        d.ellipse((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), fill=hx(moln[1]))
        d.arc((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), 190, 350, fill=hx(moln[3] if solupp and 70 < cx < 180 else moln[2]))
    for (sida, fas) in ((-1, 1.7), (1, 4.1)):                         # de närmare bergen som ramar in dalen
        rand = kam(88, 18, fas, 15, fin=0.0)
        for x in range(w):
            mitt = (x - w / 2) * sida
            top = rand[x] - min(20, max(0, mitt - 46) * 0.45) + max(0, 46 - mitt) * 0.9   # sluttar ned mot molnen
            rand[x] = None if top >= 100 else top
        berg(rand, ['#4E6278', '#3E4E6A', '#2E3A5A', None] if solupp else ['#2A3050', '#1E2440', '#161A34', None], 106,
             kantljus='#8A86B4' if solupp else None)
    gras = ['#2A4E30', '#36623A', '#4A7A48', '#78AA6A'] if solupp else ['#14281A', '#1E3A24', '#2A4E30', '#36623A']
    for x in range(w):                                                # trädgårdens kulle och staketet
        top = 100 + 4 * math.sin(x / 19 + 1) + 2 * math.sin(x / 7)
        for y in range(int(top), h):
            t = gras[2] if y < top + 2 else gras[1] if (x * 3 + y * 5) % 11 else gras[0]
            if solupp and y < top + 1: t = gras[3]
            p[x, y] = hx(t)
    for sx in range(6, w, 14):                                        # staketet längs trädgården
        ty = 106 + int(2 * math.sin(sx / 19 + 1))
        d.rectangle((sx, ty, sx + 2, ty + 9), fill=hx(VIT[3] if solupp else VIT[1]), outline=hx(VIT[0]))
    d.line((0, 109, w, 109), fill=hx(VIT[2] if solupp else VIT[1])); d.line((0, 110, w, 110), fill=hx(VIT[0]))
    for (cx, cy, r) in ((14, 92, 12), (226, 94, 14)):                 # två runda träd i hörnen
        d.rectangle((cx - 1, cy, cx + 2, cy + 22), fill=hx('#5A3A1E'))
        for (dx, dy, rr) in ((0, 0, r), (-r * .5, -r * .4, r * .6), (r * .4, -r * .5, r * .55)):
            d.ellipse((cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr), fill=hx(gras[1]), outline=hx(gras[0]))
            d.ellipse((cx + dx - rr * .6, cy + dy - rr * .8, cx + dx + rr * .2, cy + dy - rr * .1), fill=hx(gras[2]))
    return im

def vagg(w, h, morkt=False):
    k = las(IN + 'rum/hus/kontoret.png').crop((40, 6, 120, 38))     # samma tapet som i Farfars kontor
    im = ny(w, h)
    for y in range(0, h, k.height):
        for x in range(0, w, k.width): im.alpha_composite(k, (x, y))
    return im

def fonstret(solupp=True):
    im = ny(W, HOG)
    im.alpha_composite(vagg(W, BORD_Y), (0, 0))
    im.alpha_composite(utsikt(OX1 - OX0, OY1 - OY0, solupp), (OX0, OY0))
    d = ImageDraw.Draw(im)
    # fönsterkarmen, vitmålad som husets knutar
    for i, t in enumerate((0, 2, 3, 3, 1)):
        d.rectangle((OX0 - 5 + i, OY0 - 5 + i, OX1 + 4 - i, OY1 + 4 - i), outline=hx(VIT[t]))
    # de två fönsterbågarna står öppna inåt, snett sedda, med himlen i glaset
    for sida in (-1, 1):
        kx = OX0 - 5 if sida < 0 else OX1 + 4
        pts = [(kx, OY0 - 3), (kx + sida * 26, OY0 + 8), (kx + sida * 26, OY1 - 6), (kx, OY1 + 3)]
        d.polygon(pts, fill=hx(VIT[3]), outline=hx(VIT[0]))
        inner = [(kx + sida * 4, OY0 + 3), (kx + sida * 22, OY0 + 12), (kx + sida * 22, OY1 - 10), (kx + sida * 4, OY1 - 3)]
        d.polygon(inner, fill=hx('#A8D0DE' if solupp else '#3A4A6A'), outline=hx(VIT[1]))
        my = (OY0 + OY1) // 2; d.line((kx + sida * 4, my, kx + sida * 22, my + 2), fill=hx(VIT[3]), width=2)
        d.line((kx + sida * 8, OY0 + 10, kx + sida * 12, OY0 + 24), fill=hx('#E8F6FA' if solupp else '#5A6A8A'))
    # fönsterbrädan och en kruka med en pelargon
    d.rectangle((OX0 - 10, OY1 + 5, OX1 + 9, OY1 + 11), fill=hx(VIT[3]), outline=hx(VIT[0])); d.line((OX0 - 9, OY1 + 6, OX1 + 8, OY1 + 6), fill=hx(VIT[4]))
    d.rectangle((OX0 - 9, OY1 + 12, OX1 + 8, OY1 + 13), fill=(30, 14, 6, 120))
    kx, ky = OX1 - 30, OY1 - 6
    d.polygon([(kx, ky), (kx + 12, ky), (kx + 10, ky + 11), (kx + 2, ky + 11)], fill=hx('#A8603A'), outline=hx('#4A2618'))
    for (bx, by) in ((kx + 2, ky - 6), (kx + 7, ky - 9), (kx + 10, ky - 4)):
        d.ellipse((bx - 3, by - 3, bx + 3, by + 3), fill=hx('#36623A'), outline=hx('#1E3A24'))
    for (bx, by) in ((kx + 5, ky - 12), (kx + 9, ky - 13)):
        d.ellipse((bx - 2, by - 2, bx + 2, by + 2), fill=hx('#D83A2E'), outline=hx('#6A1A14'))
    # bordets bakkant mot väggen
    bord = skrivbord()
    if not solupp: bord = gryning(skrivbord(ljus=False))
    im.alpha_composite(bord, (0, BORD_Y))
    d.rectangle((0, BORD_Y - 4, W, BORD_Y - 1), fill=hx(TRA[1])); d.line((0, BORD_Y - 4, W, BORD_Y - 4), fill=hx(TRA[3]))
    d.rectangle((0, BORD_Y, W, BORD_Y + 2), fill=(26, 10, 4, 120))
    if not solupp:
        top = gryning(im.crop((0, 0, W, BORD_Y)), 0.3); im.paste(top, (0, 0))
    return im

if __name__ == '__main__':
    for n, solupp in (('intro_hog', True), ('intro_hog_gryning', False)):
        im = fonstret(solupp); im.save(UT + n + '.png')
    o = Image.open(UT + 'intro_hog.png'); o.resize((W * 2, HOG * 2), Image.NEAREST).save('/tmp/intro_hog.png')
    print('klart')
