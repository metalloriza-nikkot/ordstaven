# Fas 4: introt, tredje försöket (beslut i stilchatten 2026-11-08).
#   A. Man ser bara ut: landskapet fyller skärmen. Natten blir sakta morgon, steg för steg som SNES-spelens
#      palettoningar: stjärnorna slocknar, himlen ljusnar i band, de tre solarna stiger, bergen får ljus.
#      ORDSTAVEN kommer fram över bergen.
#   B. Kameran backar lätt, och fönstrets karm, bågarna och väggen kommer in från kanterna.
#   C. Kameran vrider blicken ned mot skrivbordet (Mode 7-tilten).
# Landskapet ligger "oändligt långt bort", så det står still när kameran backar och flyttar sig bara när blicken
# vrids, som bakgrundslagren i ett SNES-spel. I spelet blir det tre lager: himlen, solarna och landet.
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
exec(open('/home/claude/fas4/tilt.py').read().split("\nif __name__ == '__main__':")[0])

LW, LH, LC = 320, 260, 130          # landskapets storlek, och raden som ligger i ögonhöjd
NATT = {'himmel': ['#0A0C20', '#10142E', '#1A1E4A', '#22285A', '#2A2E6A', '#3A3A72', '#4A4280'],
        'berg': ['#3E3A6A', '#30305A', '#24244A', '#8A8AAA'], 'moln': ['#4A4A78', '#5A5A88', '#6E6E9A', '#6E6E9A'],
        'nara': ['#2A3050', '#1E2440', '#161A34'], 'gras': ['#14281A', '#1E3A24', '#2A4E30', '#2A4E30'],
        'staket': ['#5A5A66', '#9A9AA8'], 'stam': '#2A1A10'}
DAG = {'himmel': ['#2A2E6A', '#4A3E8A', '#8A5AA8', '#D87A8A', '#F0A070', '#F8D090', '#FFF0C0'],
       'berg': ['#A8A2C8', '#8A86B4', '#6A6A9A', '#E8E8EE'], 'moln': ['#B8B8D0', '#E8E8EE', '#FFFFFF', '#F8D0D0'],
       'nara': ['#4E6278', '#3E4E6A', '#2E3A5A'], 'gras': ['#2A4E30', '#36623A', '#4A7A48', '#78AA6A'],
       'staket': ['#9A9AA8', '#E8E8EE'], 'stam': '#5A3A1E'}

def blanda(a, b, t):
    ca, cb = hx(a), hx(b)
    return '#%02x%02x%02x' % tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
def pal(t):
    """Paletten vid tiden t (0 natt, 1 morgon), varje färg låst till masterpaletten."""
    ut = {}
    for k in NATT:
        if isinstance(NATT[k], list): ut[k] = ['#%02x%02x%02x' % nar(hx(blanda(a, b, t)))[:3] for a, b in zip(NATT[k], DAG[k])]
        else: ut[k] = '#%02x%02x%02x' % nar(hx(blanda(NATT[k], DAG[k], t)))[:3]
    return ut

def kam(w, bas, amp, fas, skala, fin=0.15):
    return [bas - amp * (0.55 * math.sin(x / skala + fas) + 0.3 * math.sin(x / (skala * 0.43) + fas * 2.1)
                         + fin * math.sin(x / (skala * 0.19) + fas * 3.7)) for x in range(w)]

def himmel(t):
    P = pal(t); im = ny(LW, LH); p = im.load(); rnd = random.Random(11)
    for y in range(LH):
        for x in range(LW): band(p, x, y, P['himmel'], min(1, y / 128))
    for i in range(70):                                               # stjärnorna slocknar en i taget
        x, y = rnd.randrange(LW), rnd.randrange(90); grans = rnd.random()
        if t < 0.55 * grans + 0.05: p[x, y] = hx('#E8E8EE' if rnd.random() < .5 else '#A8B4E8')
    return im

def solar(t):
    """De tre solarna: de stiger efter varandra bakom bergen (i spelet egna figurer som flyttas mjukt)."""
    out = []
    for (cx, y_slut, r, start) in ((166, 92, 13, 0.25), (138, 84, 6, 0.40), (194, 82, 4, 0.55)):
        s = min(1, max(0, (t - start) / (1 - start)))
        out.append((cx, 128 + (y_slut - 128) * s, r))
    return out

def land(t):
    P = pal(t); im = ny(LW, LH); p = im.load(); d = ImageDraw.Draw(im)
    def berg(rand, farger, botten, snolinje=None, kantljus=None):
        lj, me, mo, sno = farger
        for x in range(LW):
            if rand[x] is None: continue
            lut = ((rand[min(LW - 1, x + 3)] or rand[x]) - (rand[max(0, x - 3)] or rand[x])) / 3
            for y in range(int(rand[x]), botten):
                c = lj if lut > 0.15 else mo if lut < -0.15 else me
                if snolinje is not None and y < snolinje and y < rand[x] + 6: c = sno
                p[x, y] = hx(c)
            if kantljus: p[x, int(rand[x])] = hx(kantljus)
    fj = kam(LW, 112, 30, 0.6, 26)
    berg(fj, P['berg'], 130, snolinje=94, kantljus='#FFF0C0' if t > 0.6 else None)
    M = P['moln']
    for x in range(LW):
        for y in range(124, 150): p[x, y] = hx(M[0] if y > 142 and (x + y) % 2 else M[1])
    rnd2 = random.Random(5)
    for i in range(44):
        cx = rnd2.uniform(-6, LW + 6); r = rnd2.uniform(5, 11); cy = 124 + rnd2.uniform(-2, 3)
        d.ellipse((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), fill=hx(M[1]))
        d.arc((cx - r, cy - r * 0.8, cx + r, cy + r * 0.8), 190, 350, fill=hx(M[3] if 110 < cx < 230 else M[2]))
    for (sida, fas) in ((-1, 1.7), (1, 4.1)):
        rand = kam(LW, 134, 22, fas, 19, fin=0.0)
        for x in range(LW):
            mitt = (x - LW / 2) * sida
            top = rand[x] - min(24, max(0, mitt - 58) * 0.45) + max(0, 58 - mitt) * 0.9
            rand[x] = None if top >= 150 else top
        berg(rand, P['nara'] + [None], 152, kantljus='#8A86B4' if t > 0.6 else None)
    G = P['gras']
    for x in range(LW):
        top = 148 + 5 * math.sin(x / 23 + 1) + 2 * math.sin(x / 8)
        for y in range(int(top), LH):
            c = G[2] if y < top + 2 else G[1] if (x * 3 + y * 5) % 11 else G[0]
            if y < top + 1: c = G[3]
            p[x, y] = hx(c)
    for sx in range(4, LW, 16):
        ty = 160 + int(2 * math.sin(sx / 23 + 1))
        d.rectangle((sx, ty, sx + 2, ty + 11), fill=hx(P['staket'][1]), outline=hx(P['staket'][0]))
    d.line((0, 164, LW, 164), fill=hx(P['staket'][1])); d.line((0, 165, LW, 165), fill=hx(P['staket'][0]))
    for (cx, cy, r) in ((22, 138, 15), (296, 140, 17), (60, 146, 9)):
        d.rectangle((cx - 1, cy, cx + 2, cy + 28), fill=hx(P['stam']))
        for (dx, dy, rr) in ((0, 0, r), (-r * .5, -r * .4, r * .6), (r * .4, -r * .5, r * .55)):
            d.ellipse((cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr), fill=hx(G[1]), outline=hx(G[0]))
            d.ellipse((cx + dx - rr * .6, cy + dy - rr * .8, cx + dx + rr * .2, cy + dy - rr * .1), fill=hx(G[2]))
    return im

def landskap(t):
    im = himmel(t); d = ImageDraw.Draw(im)
    for (cx, cy, r) in solar(t):
        d.ellipse((cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3), fill=hx('#FFE8B0'))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hx('#FFFBEA'))
    im.alpha_composite(land(t)); return im

def vagg_med_hal(t):
    """Väggen med fönstret, men med ett hål där utsikten är (landskapet ritas bakom, långt borta)."""
    global utsikt
    gammal = utsikt
    utsikt = lambda w, h, solupp=True: Image.new('RGBA', (w, h), (255, 0, 255, 255))
    try: hog = fonstret(True)
    finally: utsikt = gammal
    a = np.array(hog)
    hal = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255); a[hal, 3] = 0
    hog = Image.fromarray(a)
    if t < 1: hog = gryning(hog, 0.45 * (1 - t))
    KANT = 160
    bred = vagg(W + 2 * KANT, BORD_Y + 80)
    if t < 1: bred = gryning(bred, 0.45 * (1 - t))
    lag = ny(W + 2 * KANT, BORD_Y + 80); lag.alpha_composite(bred)
    yta = np.array(lag); yta[80:80 + BORD_Y, KANT:KANT + W] = np.array(hog.crop((0, 0, W, BORD_Y)))
    return yta

def scen(vagg_t, bord_t, land_t, pitch, cy, cz, f=260.0):
    sy, sx = np.mgrid[0:H, 0:W].astype(float)
    p = math.radians(pitch)
    fram = np.array([0, -math.cos(p), -math.sin(p)]); upp = np.array([0, -math.sin(p), math.cos(p)])
    d = (fram[None, None, :] * f + np.stack([sx - 160, np.zeros_like(sx), np.zeros_like(sx)], -1)
         + upp[None, None, :] * (96 - sy)[..., None])
    ut = np.zeros((H, W, 4), np.uint8); ut[..., 3] = 255
    with np.errstate(divide='ignore', invalid='ignore'):
        lx = np.clip(np.nan_to_num(160 + f * d[..., 0] / -d[..., 1], posinf=0, neginf=0), 0, LW - 1).astype(int)   # landskapet, oändligt långt bort
        ly = np.clip(np.nan_to_num(LC - f * d[..., 2] / -d[..., 1], posinf=LH - 1, neginf=LH - 1), 0, LH - 1).astype(int)
        ut[:] = land_t[ly, lx]
        tb = np.where(d[..., 2] < 0, -cz / d[..., 2], np.inf)
        bx = 160 + tb * d[..., 0] + 1e-6; by = cy + tb * d[..., 1] + 1e-6
        okb = (tb > 0) & (bx >= 0) & (bx < W) & (by >= 0) & (by < H)
        tv = np.where(d[..., 1] < 0, -cy / d[..., 1], np.inf)
        vx = 160 + tv * d[..., 0] + 160; vz = cz + tv * d[..., 2]
        rad = vagg_t.shape[0] - 1 - vz
        okv = (tv > 0) & (vx >= 0) & (vx < vagg_t.shape[1]) & (vz >= 0) & (rad >= 0)
        rv = np.clip(np.nan_to_num(rad, posinf=0, neginf=0), 0, vagg_t.shape[0] - 1).astype(int)
        cv = np.clip(np.nan_to_num(vx, posinf=0, neginf=0), 0, vagg_t.shape[1] - 1).astype(int)
        okv = okv & (vagg_t[rv, cv][..., 3] > 0)                                     # genom hålet ser man landskapet
    vagg_vinner = okv & (~okb | (tv < tb)); bord_vinner = okb & ~vagg_vinner
    ut[bord_vinner] = bord_t[by[bord_vinner].astype(int), bx[bord_vinner].astype(int)]
    ut[vagg_vinner] = vagg_t[rv[vagg_vinner], cv[vagg_vinner]]
    return Image.fromarray(ut)

def ease(s): return s * s * (3 - 2 * s)

if __name__ == '__main__':
    _, bord_t = texturer(True)
    vagg_t = vagg_med_hal(1.0)
    land_dag = np.array(landskap(1.0))
    STAN = (2.0, 262.0, 100.0)
    bilder, tider = [], []
    # A: gryningen blir morgon, utsikten fyller skärmen (kameran nära fönstret)
    for i, t in enumerate(np.linspace(0, 1, 12)):
        lt = np.array(landskap(float(t)))
        im = scen(vagg_med_hal(float(t)), bord_t, lt, -6.0, 30.0, 100.0)
        if i == 0:                                                     # natten väntar på första trycket
            im = im.copy(); im.alpha_composite(Image.open(UT + 'ring32_aktiv.png'), (144, 80))
        bilder.append(im); tider.append(1800 if i == 0 else 340)
    # ORDSTAVEN kommer fram (textlagret i spelet; här ritat i Lexend för filmen)
    font = ImageFont.truetype('/home/claude/fas4/lexend-700.ttf', 15)
    def med_titel(im, n, y=26, alfa=255):
        im = im.copy(); lag = ny(W, H); dd = ImageDraw.Draw(lag); text = 'ORDSTAVEN'[:n]
        full = dd.textlength('ORDSTAVEN', font=font) + 8 * 2.2; x = 160 - full / 2
        for i, c in enumerate(text):
            for (ox, oy, col) in ((1, 1, (60, 30, 60, alfa)), (0, 0, (255, 251, 234, alfa))):
                dd.text((x + ox, y + oy), c, font=font, fill=col)
            x += dd.textlength(c, font=font) + 2.2
        im.alpha_composite(lag); return im
    sista = bilder[-1]
    for n in range(1, 10): bilder.append(med_titel(sista, n)); tider.append(170)
    tider[-1] = 1400
    # B: kameran backar lätt, fönstret kommer in från kanterna
    for i in range(1, 11):
        s = ease(i / 10)
        im = scen(vagg_t, bord_t, land_dag, -6.0 + (STAN[0] + 6.0) * s, 30 + (STAN[1] - 30) * s, 100.0)
        bilder.append(med_titel(im, 9, y=26)); tider.append(90)
    tider[-1] = 900
    # C: blicken ned mot skrivbordet, bokstäverna faller med till skylten
    N = 14
    for i in range(1, N):
        s = ease(i / (N - 1))
        im = scen(vagg_t, bord_t, land_dag, STAN[0] + (90 - STAN[0]) * s, STAN[1] + (96 - STAN[1]) * s, STAN[2] + (260 - STAN[2]) * s)
        bilder.append(med_titel(im, 9, y=26 + (8 - 26) * s if i < N - 1 else 8, alfa=255)); tider.append(90)
    tider[-1] = 2000
    for k, im in enumerate(bilder): im.save(UT + 'intro3_%02d.png' % k)
    G = [b.convert('RGB').resize((W * 3, H * 3), Image.NEAREST) for b in bilder]
    G[0].save('/tmp/intro3.gif', save_all=True, append_images=G[1:], duration=tider, loop=0)
    val = [0, 4, 8, 11, 20, 24, 28, 34, len(bilder) - 1]
    ark = Image.new('RGBA', (W * 3 + 20, H * 3 + 20), (42, 26, 16, 255))
    for k, i in enumerate(val): ark.alpha_composite(bilder[i], ((k % 3) * (W + 10), (k // 3) * (H + 10)))
    ark.resize((ark.width * 2, ark.height * 2), Image.NEAREST).save('/tmp/intro3_ark.png')
    print(len(bilder), 'bilder,', sum(tider) / 1000, 's')
