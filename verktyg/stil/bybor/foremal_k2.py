# Kapitel 2: grodorna, lyktorna, lägerelden med vedhögen och vedpinnen, med bildkort (10g, steg 5, 80.5).
# Ritat enligt *Så ritas allt*. Kvällens bilder är ritade mörkare en gång (80.6), utan filter i spelet.
import os, sys, math
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('bybor.py').read().split('# ---------- gången')[0])
sys.path.insert(0, '/home/claude/palett'); from palett import Palett, lab
P = Palett()
from PIL import Image
MAT.update({
 'sten':  ['#3a3a48', '#6e6e80', '#9ea0ae', '#c8cad4', '#eeeff4'],
 'mass':  ['#4a3410', '#8e6a22', '#c8963e', '#e6bc66', '#f5e6a0'],
 'trad':  ['#24160c', '#5a3c26', '#7a5638', '#9c7450', '#c49a72'],
 'blad':  ['#123a2a', '#1e4a24', '#3e7a52', '#5e9e70', '#84be90'],
})
UT = os.path.join(HAR, 'ut')

def kvall(im, behall=()):
    """Kvällens bild: mot mörkblått och läst till paletten. Det som lyser (behall) står kvar."""
    im = im.copy(); p = im.load(); M = (20, 28, 56)
    for y in range(im.height):
        for x in range(im.width):
            c = p[x, y]
            if not c[3] or '#%02x%02x%02x' % c[:3] in behall: continue
            r, g, b = [int(c[i] * 0.52 + M[i] * 0.48) for i in range(3)]
            h = P.narmast('#%02x%02x%02x' % (r, g, b))[0]
            p[x, y] = hx(h) + (c[3],)
    return im

# ---------- grodorna ----------
def groda(w, h, cx, cy, rx, ry, farg, prick=False, kvack=False, blad=None):
    d = Duk(w, h)
    if blad:                                                             # näckrosbladet, lika stort på alla kort
        bx, by, brx, bry = blad
        d.ellips(bx, by, brx, bry, 'blad', 'blad', platt=0.6, klipp=lambda x, y: not (abs(x + 0.5 - bx) < 1.2 and y + 0.5 > by))
    for s in (-1, 1): d.ellips(cx + s * 0.78 * rx, cy + 0.42 * ry, 0.42 * rx, 0.46 * ry, farg, 'ben')
    d.ellips(cx, cy, rx, ry, farg, 'kropp', zbias=0.1)
    for s in (-1, 1): d.ellips(cx + s * 0.48 * rx, cy - 0.78 * ry, 0.34 * rx, 0.36 * rx, farg, 'oga', zbias=0.15)
    if kvack: d.ellips(cx, cy + 0.62 * ry, 0.42 * rx, 0.34 * ry, farg, 'strupe', toner=(3, 4, 4, 4), zbias=0.4)
    for s in (-1, 1): d.ellips(cx + s * 0.42 * rx, cy + 0.9 * ry, 0.2 * rx, 0.16 * ry + 0.4, farg, 'fot', zbias=0.2)
    skilj(d, 'kropp', 'ben'); skilj(d, 'oga', 'kropp'); skilj(d, 'fot', 'kropp'); skilj(d, 'strupe', 'kropp')
    if blad: skilj(d, 'ben', 'blad', 0); skilj(d, 'kropp', 'blad', 0); skilj(d, 'fot', 'blad', 0)
    d.kontur()
    for s in (-1, 1):                                                   # ögonen: vita med en stor pupill
        ex, ey = cx + s * 0.48 * rx, cy - 0.8 * ry
        r = max(0.9, 0.2 * rx)
        for y in range(int(ey - r - 1), int(ey + r + 2)):
            for x in range(int(ex - r - 1), int(ex + r + 2)):
                if ((x + 0.5 - ex) / r) ** 2 + ((y + 0.5 - ey) / r) ** 2 <= 1: d.fast(x, y, '#ffffff')
        px_, py_ = int(ex + 0.2 * s), int(ey)
        d.fast(px_, py_, OGA)
        if rx > 6: d.fast(px_, py_ + 1, OGA); d.fast(px_ - s if rx > 9 else px_, py_, OGA)
    my = int(cy + 0.22 * ry + 0.5); mb = max(2, int(0.5 * rx))           # det breda leendet
    for x in range(int(cx - mb), int(cx + mb) + 1):
        d.fast(x, my + (1 if abs(x + 0.5 - cx) < mb * 0.6 else 0), MAT[farg][0])
    if prick:                                                            # prickarna: minst 2 x 2 (10g, femsekunderstestet)
        ps = max(2, round(rx / 4.5))
        for (fx, fy) in ((-0.62, -0.05), (0.55, -0.15), (-0.18, -0.42), (0.22, 0.55), (-0.5, 0.5), (0.72, 0.42)):
            x0, y0 = int(cx + fx * rx - ps / 2), int(cy + fy * ry - ps / 2)
            if abs(y0 - my) <= 1 and abs(x0 + ps / 2 - cx) < mb: continue
            for x in range(x0, x0 + ps):
                for y in range(y0, y0 + ps):
                    if d.del_.get((x, y)) in ('kropp', 'ben'): d.fast(x, y, '#5a3c26' if farg == 'gul' else '#101c1c')
    return d.bild()

GRODOR = {  # namn: (färg, storlek, prickig)
    'groda_liten_gul': ('gul', 'liten', False), 'groda_stor_gul': ('gul', 'stor', False),
    'groda_liten_gron': ('gron', 'liten', False), 'groda_stor_gron': ('gron', 'stor', False),
    'groda_gron_slat': ('gron', 'mellan', False), 'groda_gron_prickig': ('gron', 'mellan', True),
    'groda_gul_slat': ('gul', 'mellan', False), 'groda_gul_prickig': ('gul', 'mellan', True),
}
STORLEK = {'stor': (8.6, 5.8), 'mellan': (7.4, 5.0), 'liten': (5.0, 3.5)}   # stor/liten = 1,7 (stilguiden: minst 1,5)
def groda_sak(namn, kvack=False):
    farg, st, pr = GRODOR[namn]; rx, ry = STORLEK[st]
    return groda(20, 16, 10, 15.2 - ry * 1.05, rx, ry, farg, pr, kvack)
def groda_kort(namn):
    farg, st, pr = GRODOR[namn]; rx, ry = STORLEK[st]
    k = 2.3
    return groda(48, 48, 24, 33 - ry * k * 0.75, rx * k, ry * k, farg, pr, blad=(24, 36, 21, 8))

# ---------- lyktorna ----------
GLAS_TAND = ('#fff0a8', '#f4dc64', '#ffffff')
def lykta(tand=False, k=1):
    d = Duk(12 * k, 24 * k)
    d.ellips(6 * k, 22.6 * k, 2.2 * k, 0.9 * k, 'trad', 'fot', toner=(0, 1, 1, 2))
    for y in range(9 * k, 23 * k):
        for i in range(k): d.satt(5 * k - k + 1 + i, y, 'trad', 3); d.satt(6 * k + i - (k - 1) // 2, y, 'trad', 1)
    d.ellips(6 * k, 6.0 * k, 3.6 * k, 4.2 * k, 'mass', 'lykta', zbias=0.1)
    d.ellips(6 * k, 1.6 * k, 3.0 * k, 1.4 * k, 'mass', 'tak', zbias=0.3)
    skilj(d, 'tak', 'lykta', 0)
    d.kontur()
    glas = GLAS_TAND if tand else ('#3a3a48', '#4a525c', '#6e7a88')
    for y in range(4 * k, 9 * k):
        for x in range(4 * k, 9 * k):
            hx_, hy_ = (x - 4 * k) / k, (y - 4 * k) / k
            if hx_ in (0, 4) and hy_ in (0, 4): continue
            if (hx_ < 0.5 or hx_ >= 4.5 - 1 + 0.5) and (hy_ < 0.5 or hy_ >= 4) and k == 1: continue
            d.fast(x, y, glas[0] if (x // k + y // k) % 3 else glas[1])
    for y in range(5 * k, 5 * k + k):
        for x in range(5 * k, 5 * k + k): d.fast(x, y, glas[2])           # en glimt i glaset
    for y in range(4 * k, 9 * k):
        for i in range(max(1, k // 2)): d.fast(6 * k + i, y, '#8e6a22')    # spröjsen
    d.fast(6 * k, 0, '#e6bc66')
    return d.bild()

def ljus(w, h, farg='#ffd27a', styrka=0.55):
    """Ljuset runt det som lyser, som en egen bild ovanpå kvällen (80.6)."""
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load(); c = hx(P.narmast(farg)[0])
    for y in range(h):
        for x in range(w):
            dd = math.hypot((x + 0.5 - w / 2) / (w / 2), (y + 0.5 - h / 2) / (h / 2))
            if dd < 1:
                a = styrka * (1 - dd) ** 1.6
                a = round(a * 4) / 4                                      # fyra steg, inga mjuka övergångar
                if a > 0: p[x, y] = c + (int(255 * a),)
    return im

# ---------- lägerelden och vedhögen ----------
def lagereld(eld=0):
    """eld 0 = vedhögen i stenringen, utan eld. 1–3 = elden brinner (tre bilder)."""
    d = Duk(24, 22)
    stenar = [(a, 9.5 * math.cos(math.radians(a)) + 12, 3.6 * math.sin(math.radians(a)) + 17.5) for a in range(0, 360, 36)]
    for (a, x, y) in sorted(stenar, key=lambda s: s[2]):
        if y < 17.5: d.ellips(x, y, 2.0, 1.5, 'sten', 'sten%d' % a, toner=(1, 1, 2, 3), zbias=0.1)
    # vedhögen: stockar lutade mot varandra som ett tält, och två som ligger tvärs
    for (x0, y0, x1, y1, ton) in ((7, 18, 12, 7, 2), (17, 18, 12, 7, 1), (9, 19, 13, 8, 3), (15, 19, 11, 8, 2), (12, 19, 12, 7, 3)):
        n = 14
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
            d.ellips(x, y, 1.1, 1.1, 'trad', 'stock', toner=(0, ton, ton, min(4, ton + 1)))
    d.ellips(12, 18.4, 6.4, 1.3, 'trad', 'tvars', zbias=0.2)
    for (a, x, y) in sorted(stenar, key=lambda s: s[2]):
        if y >= 17.5: d.ellips(x, y, 2.0, 1.5, 'sten', 'sten%d' % a, toner=(1, 1, 2, 3), zbias=0.1)
    d.kontur()
    for (x, y) in ((6, 18), (18, 18)): d.fast(x, y, '#c49a72')             # de sågade ändarna
    if eld:
        f = eld - 1
        LAGOR = ('#c23a2e', '#e86a5a', '#f2c94a', '#fff0a8')
        for (cx, top, bredd) in ((12, 3 + f % 2, 4.2), (9, 8 - f, 2.2), (15, 7 + (f == 1), 2.2)):
            for y in range(int(top), 18):
                t = (y - top) / (18 - top)
                ww = bredd * math.sin(min(1, t * 1.3) * math.pi / 2) * (1 - 0.15 * t)
                sv = math.sin(y * 1.3 + f * 2.1) * 0.6
                for x in range(int(cx - ww + sv), int(cx + ww + sv) + 1):
                    inre = abs(x + 0.5 - cx - sv) < ww * 0.45
                    c = LAGOR[3] if inre and t > 0.45 else (LAGOR[2] if inre or t > 0.6 else (LAGOR[1] if t > 0.25 else LAGOR[0]))
                    d.fast(x, y, c)
        for (x, y) in ((8 + f * 3, 2 + f), (16 - f * 2, 4 - f % 2)): d.fast(x, y, '#f2c94a')   # gnistor
    return d.bild()

def vedpinne(kvall_=False):
    d = Duk(12, 8)
    for i in range(9):
        x = 2 + i; y = 5.2 - i * 0.32
        d.ellips(x, y, 1.3, 1.2, 'trad', 'pinne', toner=(0, 1, 2, 3))
    d.ellips(10.4, 2.5, 1.2, 1.1, 'trad', 'ande', toner=(2, 3, 4, 4), zbias=0.4)
    d.kontur()
    d.fast(10, 2, '#c49a72'); d.fast(11, 2, '#9c7450')                      # den ljusa snittytan
    d.fast(6, 3, '#24160c'); d.fast(4, 3, '#24160c')                       # knastren
    return d.bild()

def vedpinne_kort():
    d = Duk(48, 48)
    for i in range(31):
        x = 9 + i; y = 35 - i * 0.62
        d.ellips(x, y, 3.6, 3.4, 'trad', 'pinne')
    d.ellips(40.5, 15.5, 3.2, 3.2, 'trad', 'ande', toner=(2, 3, 4, 4), zbias=0.5)
    d.ellips(22, 22.5, 1.4, 3.4, 'trad', 'kvist')                            # en kvist som sticker upp
    skilj(d, 'ande', 'pinne'); skilj(d, 'kvist', 'pinne')
    d.kontur()
    for (x, y) in ((40, 15), (41, 16), (40, 16), (39, 15), (41, 14)): d.fast(x, y, '#c49a72')
    for (x, y) in ((40, 14), (39, 16)): d.fast(x, y, '#9c7450')
    d.fast(40, 15, '#7a5638')                                                # årsringen
    for (x0, y0) in ((14, 31), (20, 27), (27, 22), (33, 18)):              # barkens skåror
        d.fast(x0, y0, '#24160c'); d.fast(x0 + 1, y0 - 1, '#24160c'); d.fast(x0 + 2, y0 - 1, '#5a3c26')
    return d.bild()

def lyktor_kort():
    """Bildkortet lyktor_slackta: tre släckta lyktor längs stigen i kvällsljuset, den närmaste störst."""
    bg = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); p = bg.load()
    for y in range(20, 47):                                                # en rund bit kvällsmark med stigen
        for x in range(48):
            if ((x + 0.5 - 24) / 23.5) ** 2 + ((y + 0.5 - 37) / 10.5) ** 2 > 1: continue
            mitt = 24 + (y - 37) * 0.5; b = 2.5 + (y - 26) * 0.45
            if abs(x + 0.5 - mitt) < b: p[x, y] = hx('#9c7450' if (x + y) % 4 else '#7a5638') + (255,)
            else: p[x, y] = hx('#3e7a52' if (x * 3 + y) % 7 else '#5e9e70') + (255,)
    for (l, x, y) in ((lykta(False, 1), 22, 28), (lykta(False, 1), 9, 35), (lykta(False, 2), 36, 47)):
        bg.alpha_composite(l, (x - l.width // 2, y - l.height))
    return kvall(bg, behall=('#6e7a88',))

def skriv(im, rel):
    full = os.path.join(UT, rel); os.makedirs(os.path.dirname(full), exist_ok=True)
    P.las_bild(im, rel).save(full)

if __name__ == '__main__':
    for n in GRODOR:
        skriv(groda_sak(n), f'foremal/trask/{n}_01.png')
        skriv(groda_sak(n, kvack=True), f'foremal/trask/{n}_02.png')
        skriv(groda_kort(n), f'bildkort/{n}.png')
    skriv(lykta(False), 'foremal/trask/lykta_slackt.png')
    skriv(kvall(lykta(False)), 'foremal/trask/lykta_slackt_kvall.png')
    skriv(kvall(lykta(True), behall=GLAS_TAND), 'foremal/trask/lykta_tand_kvall.png')
    skriv(ljus(32, 24), 'foremal/trask/lykta_ljus.png')
    skriv(lagereld(0), 'foremal/trask/lagereld_slackt.png')
    skriv(kvall(lagereld(0)), 'foremal/trask/lagereld_slackt_kvall.png')
    for i in (1, 2, 3):
        skriv(kvall(lagereld(i), behall=('#c23a2e', '#e86a5a', '#f2c94a', '#fff0a8')), f'foremal/trask/lagereld_tand_kvall_{i:02d}.png')
    skriv(ljus(72, 48, '#ffb347', 0.6), 'foremal/trask/lagereld_ljus.png')
    skriv(vedpinne(), 'foremal/trask/vedpinne.png')
    vk = kvall(vedpinne()); vk.putpixel((10, 1), hx('#fff0a8') + (255,)); vk.putpixel((11, 2), hx('#ffffff') + (255,))
    skriv(vk, 'foremal/trask/vedpinne_kvall.png')                           # med en ljus glimt, så att den syns (10g, Kväll)
    skriv(vedpinne_kort(), 'bildkort/vedpinne.png')
    skriv(lyktor_kort(), 'bildkort/lyktor_slackta.png')
    print('klart')
