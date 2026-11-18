# Kapitel 3 (beslut 100.6): sköldpaddan, ÖN. Så gammal och stor att skalet ser ut som en ö: gräs, mossa och ett
# litet träd på ryggen, skalets plattor syns bara längs kanten. Huvudet är gammalt, rynkigt och mossigt, med vänliga
# ögon. Den får inte likna mamma (ankylosaurien, 77.6): ingen klubbsvans och inga taggar, bara ett runt skal.
# Ritad enligt *Så ritas allt* (10b): snett uppifrån, ljus uppifrån till vänster, fyra toner, kontur i egen mörk ton.
#   skoldpadda_sandbanken   176 x 128  kroppen på sandbanken: skalet, nacken, högra framfenan (huvudet och vänstra fenan är egna bilder)
#   skoldpadda_huvud_*      44 x 40    vilar, lyft, ropar, puffar, nickar, tittar (mot berget)
#   skoldpadda_fena_*       44 x 28    på sanden, lyft (med tången), trappa
#   on_floden               104 x 72   ön i floden vid kvarnens brygga: skalet ovanifrån i vattnet, huvudet under ytan
import os, sys, math, random
HAR = '/home/claude/k3'; os.chdir(HAR)
exec(open('/home/claude/k3/pix.py').read())
from PIL import Image
MAT.update({
 'skal':  ['#24160c', '#4a3018', '#6a4626', '#8a6038', '#a87c50'],
 'hud':   ['#10241a', '#3e5a4a', '#4e6e5a', '#5e806a', '#8aa890'],   # gammal gråsgrön hud
 'gras':  ['#3e6e2e', '#5a8e3a', '#6fa34a', '#86b85a', '#9ac466'],
 'lov':   ['#14301a', '#1e4a24', '#2e6a30', '#4a8e3a', '#78b456'],
 'bark':  ['#24160c', '#4a3018', '#6a4626', '#8a6038', '#a87c50'],
})
OGA = '#101c1c'; GLIMT = '#ffffff'

def brus(x, y, s=7):
    return ((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) % 1000 / 1000.0

def plattor(d, namn, frön, mork='#24160c'):
    """Skalets plattor: gränsen mellan två närmaste frön blir en mörk söm."""
    for (x, y), nm in list(d.del_.items()):
        if nm != namn: continue
        ds = sorted(math.hypot(x - fx, (y - fy) * 1.4) for fx, fy in frön)
        if len(ds) > 1 and ds[1] - ds[0] < 1.3: d.fast(x, y, mork, namn)

def ryggen(d, cx, cy, rx, ry, trad_vid, frö=3):
    """Gräs och mossa på skalets rygg, med ojämn kant, och ett litet träd."""
    d.ellips(cx, cy, rx, ry, 'gras', 'gras', klipp=lambda x, y: brus(x // 4, y // 3, frö) > 0.22 or
             ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.72, zbias=0.05)
    random.seed(frö)
    for _ in range(int(rx * ry / 120)):
        a = random.uniform(0, 2 * math.pi); r = random.uniform(0.15, 0.8)
        mx, my = cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r
        d.ellips(mx, my, random.uniform(3.5, 6), random.uniform(2.4, 3.6), 'lov', 'mossa', zbias=0.12)
    tx, ty = trad_vid
    d.ellips(tx, ty + 6, 1.6, 4.0, 'bark', 'stam', toner=(1, 2, 2, 3))
    d.ellips(tx, ty - 2, 8.5, 7.0, 'lov', 'krona', zbias=0.18)
    d.ellips(tx - 3, ty - 5, 4.0, 3.4, 'lov', 'krona2', zbias=0.3)

def detaljer_gras(d):
    for (x, y), nm in list(d.del_.items()):
        if nm == 'gras' and brus(x, y, 11) < 0.025 and d.del_.get((x, y - 1)) == 'gras':   # små grästuvor: ett ljust strå över ett mörkt
            d.satt(x, y - 1, 'gras', 4); d.satt(x, y, 'gras', 1)
        if nm == 'mossa' and brus(x, y, 13) < 0.06: d.satt(x, y, 'lov', 4)

# ---------------------------------------------------------------------------------- på sandbanken
def kropp_sandbanken():
    W, H = 176, 128
    d = Duk(W, H)
    cx = 88
    d.ellips(cx + 36, 104, 15, 7, 'hud', 'fenah', zbias=0.1)                 # högra framfenan på sanden
    d.ellips(cx, 98, 13, 12, 'hud', 'nacke', zbias=0.15)                       # nacken ut under skalets framkant
    d.ellips(cx, 62, 82, 46, 'skal', 'kant', toner=(1, 1, 2, 2))               # skalets nedre kant (randen)
    d.ellips(cx, 56, 78, 43, 'skal', 'skal', zbias=0.05)
    ryggen(d, cx - 2, 48, 64, 31, (cx + 26, 30))
    for nm in ('skal',):
        pass
    random.seed(4)
    fron = [(cx + math.cos(a) * 70, 56 + math.sin(a) * 38) for a in [i * 2 * math.pi / 16 for i in range(16)]]
    fron += [(cx + math.cos(a) * 52, 56 + math.sin(a) * 26) for a in [i * 2 * math.pi / 12 + 0.2 for i in range(12)]]
    plattor(d, 'skal', fron)
    from bybor_hjalp import skilj
    skilj(d, 'skal', 'kant', 0); skilj(d, 'gras', 'skal', 1); skilj(d, 'mossa', 'gras', 1)
    skilj(d, 'krona', 'gras', 0); skilj(d, 'nacke', 'kant', 0); skilj(d, 'fenah', 'kant', 0)
    d.kontur()
    detaljer_gras(d)
    for (x, y), nm in list(d.del_.items()):                                     # rynkor på nacken
        if nm == 'nacke' and y % 3 == 0 and brus(x, y, 5) < 0.5: d.satt(x, y, 'hud', 1)
    return d.bild()

def huvud(lage='vilar'):
    """44 x 40, sett snett uppifrån med nosen mot betraktaren: halsen kommer ovanifrån (från skalet), hjässan är
    rund med plattor och mossa, och huvudet smalnar till en krokig näbb nedåt. Ögonen sitter på sidorna, med tunga lock.
    lage: vilar, lyft, ropar, puffar (nosen fram), nickar (ögonen slutna, huvudet ned), tittar (vänt åt höger, mot berget)."""
    d = Duk(44, 40)
    cy = {'vilar': 22, 'lyft': 18, 'ropar': 17, 'puffar': 24, 'nickar': 25, 'tittar': 20}[lage]
    cx = 22 + (4 if lage == 'tittar' else 0)
    d.ellips(22, cy - 12, 8.0, 9.0, 'hud', 'hals', toner=(1, 1, 2, 2), zbias=0.0, klipp=lambda x, y: y < cy - 4)
    def agg(x, y):                                                               # bredast upptill, smalnar mot näbben
        t = (y + 0.5 - (cy - 9)) / 18.0
        return 0 <= t <= 1 and abs(x + 0.5 - cx) <= 11.5 * (1 - 0.55 * t ** 1.6) * min(1, 0.55 + 2.2 * t)
    for y in range(40):
        for x in range(44):
            if agg(x, y):
                ny = (y + 0.5 - (cy - 9)) / 18.0; nx = (x + 0.5 - cx) / 11.5
                ll = -0.6 * nx - 0.7 * (ny - 0.35) + 0.25
                d.satt(x, y, 'hud', 4 if ll > 0.6 else 3 if ll > 0.1 else 2 if ll > -0.35 else 1, 'huvud')
    d.ellips(cx - 2, cy - 6, 5.5, 2.4, 'lov', 'mossa', zbias=0.25)
    d.ellips(cx + 4, cy - 5, 3.0, 1.7, 'lov', 'mossa2', zbias=0.3)
    from bybor_hjalp import skilj
    skilj(d, 'huvud', 'hals', 0); skilj(d, 'mossa', 'huvud', 1); skilj(d, 'mossa2', 'huvud', 1)
    d.kontur()
    topp = min(y for (x, y), nm in d.del_.items() if nm == 'hals')
    for (x, y), nm in list(d.del_.items()):                                     # halsen kommer ut ur skuggan under skalet
        if nm == 'hals':
            t = y - topp
            if t < 3: d.satt(x, y, 'hud', 0)
            elif t < 6: d.satt(x, y, 'hud', 1)
            elif (y - cy) % 4 == 0 and 3 < abs(x - 22) < 6: d.satt(x, y, 'hud', 1)
    for (a, b) in ((cx - 6, cy - 2), (cx + 6, cy - 2), (cx, cy + 1)):         # hjässans plattor: tre små sömmar
        for k in range(3): d.fast(a + (k - 1), b - (1 if k != 1 else 0), '#3e5a4a')
    ey = cy + 1
    ex = (cx - 7, cx + 6) if lage != 'tittar' else (cx - 4, cx + 8)
    for x in ex:
        for (a, b) in ((-1, 0), (2, 0), (-1, 1), (2, 1), (0, 2), (1, 2)): d.fast(x + a, ey + b, '#8aa890')   # ljus hud runt ögat
        for k in (-1, 0, 1, 2): d.fast(x + k, ey - 1, '#10241a')                  # tunga lock
        if lage == 'nickar':
            d.fast(x, ey, '#10241a'); d.fast(x + 1, ey, '#10241a')
        else:
            d.fast(x, ey, GLIMT); d.fast(x + 1, ey, OGA); d.fast(x, ey + 1, OGA); d.fast(x + 1, ey + 1, OGA)
    by = cy + 7                                                                  # munnen: ett V som följer näbben, med uppåtvända mungipor
    if lage == 'ropar':
        for x in range(cx - 4, cx + 5):
            for y in range(by - 1, by + 3):
                if abs(x - cx) <= 4 - (y - by): d.fast(x, y, '#3a1a14')
        for x in range(cx - 5, cx + 6): d.fast(x, by - 2, '#10241a')
    else:
        for k in range(1, 7):
            d.fast(cx - k, by - k // 2, '#10241a'); d.fast(cx + k, by - k // 2, '#10241a')
        d.fast(cx, by, '#10241a'); d.fast(cx, by + 1, '#10241a')                # näbbens krok
    for x in (cx - 2, cx + 2): d.fast(x, cy + 4, '#10241a')                    # näsborrarna
    return d.bild()

def fena(lage='sanden'):
    """44 x 28, vänstra framfenan, en platt paddel som smalnar mot spetsen, med två klor.
    lage: sanden (vilar), lyft (lyft från sanden, tången hänger under), trappa (lagd framåt som ett trappsteg)."""
    d = Duk(44, 28)
    rot = {'sanden': (34, 19), 'lyft': (34, 13), 'trappa': (34, 17)}[lage]
    langd, tjock = (28, 7.5) if lage != 'trappa' else (32, 9.5)
    spets = rot[0] - langd
    lyft = -6 if lage == 'lyft' else 0
    for y in range(28):
        for x in range(44):
            t = (rot[0] - x) / langd                                             # 0 vid roten, 1 vid spetsen
            if 0 <= t <= 1:
                cy = rot[1] + lyft * t + 2 * t
                halv = tjock * math.sin(math.pi * (0.12 + 0.88 * t)) ** 0.55 * (1.05 - 0.45 * t)   # rund rot, bred mitt, rund spets
                if abs(y + 0.5 - cy) <= halv:
                    ny = (y + 0.5 - cy) / max(halv, 0.5)
                    ton = 3 if ny < -0.35 else (2 if ny < 0.4 else 1)
                    if t > 0.85: ton = max(1, ton - 1)
                    d.satt(x, y, 'hud', ton, 'fena')
    d.kontur()
    for (x, y), nm in list(d.del_.items()):                                     # fjäll i rader längs fenan
        if nm == 'fena' and brus(x // 2, y // 2, 6) < 0.16 and d.px[(x, y)][1] >= 2: d.satt(x, y, 'hud', d.px[(x, y)][1] - 1)
    for k in (0, 1):                                                             # två klor vid framkanten
        x = rot[0] - 10 - k * 6; y = rot[1] + (lyft * (10 + k * 6) / langd) + 2 * ((10 + k * 6) / langd) - tjock * 0.9
        d.fast(int(x), int(y), '#d6cfa4'); d.fast(int(x) - 1, int(y), '#10241a')
    return d.bild()

def on_floden():
    """104 x 72: ön i floden, skalet ovanifrån med gräs, mossa och trädet. Huvudet är under ytan."""
    d = Duk(104, 72)
    d.ellips(52, 38, 50, 32, 'skal', 'kant', toner=(1, 1, 2, 2))
    d.ellips(52, 34, 47, 29, 'skal', 'skal', zbias=0.05)
    ryggen(d, 51, 30, 40, 22, (66, 18), frö=5)
    fron = [(52 + math.cos(a) * 44, 34 + math.sin(a) * 26) for a in [i * 2 * math.pi / 14 for i in range(14)]]
    plattor(d, 'skal', fron)
    from bybor_hjalp import skilj
    skilj(d, 'skal', 'kant', 0); skilj(d, 'gras', 'skal', 1); skilj(d, 'mossa', 'gras', 1); skilj(d, 'krona', 'gras', 0)
    d.kontur()
    detaljer_gras(d)
    return d.bild()

VATT = ['#24407a', '#6a8ed0', '#9ac8e8', '#ffffff']
def _hx(h): return tuple(int(h[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
def skum(im, cx, cy, rx, ry, b=1):
    """En ring av ljusa krusningar runt något som ligger i vattnet."""
    p = im.load()
    for a in range(0, 360, 4):
        x = int(cx + rx * math.cos(math.radians(a))); y = int(cy + ry * math.sin(math.radians(a)))
        if 0 <= x < im.width and 0 <= y < im.height and (a // 4 + b) % 3 and math.sin(math.radians(a)) > -0.2:
            p[x, y] = _hx(VATT[3] if (a // 4) % 2 else VATT[2])
    return im

def on_stiger(steg):
    """Ön stiger upp ur floden i tre steg: först trädkronan och lite gräs, sedan halva, sedan hela med skum runt."""
    o = on_floden(); W, H = o.size
    ut = Image.new('RGBA', (W, H + 4), (0, 0, 0, 0))
    syns = {1: 22, 2: 46, 3: H}[steg]
    ut.alpha_composite(o.crop((0, 0, W, syns)), (0, H - syns + (0 if steg == 3 else 2)))
    return skum(ut, W / 2, H - 2, W / 2 - 1, 5, steg)

def huvud_vatten(b=1):
    """Huvudet lyfts upp ur floden bredvid ön: halsen försvinner i vattnet, med krusningar."""
    h = huvud('lyft'); W, Hh = h.size
    ut = Image.new('RGBA', (W, Hh), (0, 0, 0, 0)); ut.alpha_composite(h, (0, 0))
    p = ut.load()
    for y in range(0, 12):
        for x in range(W): p[x, y] = (0, 0, 0, 0)
    for x in range(10, 34):
        if (x + b) % 3: p[x, 12] = _hx(VATT[3] if 16 < x < 28 else VATT[2])
    return ut

def simmar(b=1):
    """Resan: sköldpaddan simmar nedströms (mot betraktaren) med ön på ryggen, huvudet ute och framfenorna som paddlar."""
    o = on_floden(); W, H = o.size
    ut = Image.new('RGBA', (W + 24, H + 30), (0, 0, 0, 0))
    for sx, flip in ((0, True), (W, False)):
        f = fena('sanden' if b == 1 else 'lyft')
        f = f.transpose(Image.FLIP_LEFT_RIGHT) if not flip else f
        ut.alpha_composite(f, (sx - 4 if flip else sx - 16, H - 16 + (0 if b == 1 else -3)))
    ut.alpha_composite(o, (12, 0))
    h = huvud('vilar' if b == 1 else 'lyft'); ut.alpha_composite(h, (12 + W // 2 - 22, H - 14))
    return skum(ut, ut.width / 2, H + 8, W / 2 + 6, 9, b)

FOREMAL = '/home/claude/k3/ut/foremal/flod'
def skriv_alla(P):
    os.makedirs(FOREMAL, exist_ok=True)
    ut = {'skoldpadda_sandbanken': kropp_sandbanken(), 'on_floden': on_floden()}
    for l in ('vilar', 'lyft', 'ropar', 'puffar', 'nickar', 'tittar'): ut[f'skoldpadda_huvud_{l}'] = huvud(l)
    for l in ('sanden', 'lyft', 'trappa'): ut[f'skoldpadda_fena_{l}'] = fena(l)
    for k in (1, 2, 3): ut[f'on_stiger_{k:02d}'] = on_stiger(k)
    for k in (1, 2): ut[f'skoldpadda_huvud_vatten_{k:02d}'] = huvud_vatten(k); ut[f'skoldpadda_simmar_{k:02d}'] = simmar(k)
    for n, im in ut.items(): P.las_bild(im, n).save(f'{FOREMAL}/{n}.png')
    return ut

if __name__ == '__main__':
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    UTB = skriv_alla(P)
    o2 = Image.new('RGBA', (600, 130), (62, 126, 186, 255)); xx = 2
    for n in ('on_stiger_01', 'on_stiger_02', 'on_stiger_03', 'skoldpadda_simmar_01', 'skoldpadda_simmar_02', 'skoldpadda_huvud_vatten_01'):
        o2.alpha_composite(UTB[n], (xx, 2)); xx += UTB[n].width + 4
    o2.resize((o2.width * 2, o2.height * 2), Image.NEAREST).save('/tmp/skold2_x2.png')
    k = P.las_bild(kropp_sandbanken(), 'kropp')
    hs = [P.las_bild(huvud(l), l) for l in ('vilar', 'lyft', 'ropar', 'puffar', 'nickar', 'tittar')]
    fs = [P.las_bild(fena(l), l) for l in ('sanden', 'lyft', 'trappa')]
    o = P.las_bild(on_floden(), 'on')
    S = Image.new('RGBA', (176 + 8, 150), (226, 206, 150, 255))
    for y in range(0, 60):                                                       # vatten bakom
        for x in range(S.width): S.putpixel((x, y), (62, 126, 186, 255))
    S.alpha_composite(k, (4, 4)); S.alpha_composite(fs[0], (4 + 88 - 36 - 22, 4 + 104 - 20)); S.alpha_composite(hs[0], (4 + 88 - 22, 4 + 98))
    hj = Image.open('/home/claude/inkorg/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA')
    S.alpha_composite(hj, (150, 110))
    rad = Image.new('RGBA', (6 * 48 + 3 * 48 + 112, 76), (226, 206, 150, 255))
    for i, h in enumerate(hs): rad.alpha_composite(h, (2 + i * 48, 2))
    for i, f in enumerate(fs): rad.alpha_composite(f, (2 + 6 * 48 + i * 48, 10))
    W2 = Image.new('RGBA', (112, 76), (62, 126, 186, 255)); W2.alpha_composite(o, (4, 2)); rad.alpha_composite(W2, (6 * 48 + 3 * 48, 0))
    big = Image.new('RGBA', (max(S.width, rad.width), S.height + rad.height + 4), (250, 246, 236, 255))
    big.alpha_composite(S, (0, 0)); big.alpha_composite(rad, (0, S.height + 4))
    big.resize((big.width * 3, big.height * 3), Image.NEAREST).save('/tmp/skoldpadda_x3.png')
    print('klart')
