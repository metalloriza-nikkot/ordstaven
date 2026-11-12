# Skissens detaljark: det som 12 bad att skissen tar med och som inte syns i rummen
# (63.10, 71.1, 72.4, 72.11, 75.3, 75.5 och 76.4). Varje ruta är 64 × 64 i spelets pixlar.
from bas import *

FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
FONTB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
PAPP = ['#7A6A4A', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFF8E8']

def ny(): d = Duk(64, 64); d.im = Image.new('RGBA', (64, 64), (0, 0, 0, 0)); d.px = d.im.load(); return d

def halva(d, x0, y0, vanster=True, blot=False, b=18, h=24):
    """En halva av Farfars brev: rivet i sicksack på ena sidan, sigillets halva i mässing vid rivkanten."""
    for y in range(h):
        riv = (3 if (y // 3) % 2 else 0) + (1 if y % 3 == 1 else 0)
        for x in range(b):
            inne = x < b - riv if vanster else x >= riv
            if not inne: continue
            c = PAPP[3] if blot is False else ('#C8C2A8' if (x + y) % 3 else '#A8A288')
            if y in (0, h - 1) or (x == 0 and vanster) or (x == b - 1 and not vanster): c = PAPP[1]
            if 4 <= y <= h - 6 and y % 4 == 0 and 3 <= x <= b - 5 and not blot: c = PAPP[0]     # skriften som streck
            if blot and y % 4 == 0 and 3 <= x <= b - 5 and (x + y) % 2: c = '#8A8A80'
            d.satt(x0 + x, y0 + y, c)
    cx = x0 + (b - 1 if vanster else 0); cy = y0 + h // 2 + 2
    for y in range(cy - 4, cy + 5):
        for x in range(cx - 4, cx + 5):
            if (x - cx) ** 2 + (y - cy) ** 2 <= 16 and ((x <= cx) if vanster else (x >= cx)):
                d.satt(x, y, MASS[2] if (x - cx) ** 2 + (y - cy) ** 2 > 6 else MASS[3])
    d.satt(cx, cy - 2, MASS[1]); d.satt(cx, cy + 2, MASS[1])

def brevram(d, x0, y0, steg):
    """Brevramen på Tant Rosas dörr: mässingsram med två tomma platser i form av rivna halvor."""
    d.rekt(x0, y0, 44, 32, MASS[1]); d.rekt(x0 + 1, y0 + 1, 42, 30, MASS[2])
    for x in range(x0 + 1, x0 + 43): d.satt(x, y0 + 1, MASS[4])
    d.rekt(x0 + 3, y0 + 3, 38, 26, ROSA[0])
    for y in range(24):                                          # de rivna konturerna (streckade)
        riv = (3 if (y // 3) % 2 else 0) + (1 if y % 3 == 1 else 0)
        if y % 2 == 0:
            d.satt(x0 + 4 + 18 - riv, y0 + 4 + y, ROSA[2]); d.satt(x0 + 4 + 18 - riv + 2, y0 + 4 + y, ROSA[2])
    if steg >= 1: halva(d, x0 + 4, y0 + 4, True)
    if steg >= 2: halva(d, x0 + 4 + 18 - 1, y0 + 4, False)

def rubrik(c, x, y, txt, fet=False):
    ImageDraw.Draw(c).text((x, y), txt, fill=(240, 236, 224), font=FONTB if fet else FONT)

def rutor():
    R = []
    # 1–3: brevramen tom, en halva, hel
    for steg, t in ((0, 'Brevramen: tom'), (1, 'en halva'), (2, 'hel (sigillet helt)')):
        d = ny(); brevram(d, 10, 16, steg); R.append((t, d))
    # 4: halvorna: torr (bryggan) och blöt och suddig (vassen)
    d = ny(); halva(d, 6, 18, True); halva(d, 36, 18, False, blot=True); R.append(('Halvorna: torr och blöt', d))
    # 5: Herr Skatas fjäder (svartvit, blank)
    d = ny()
    for i in range(30):
        x = 16 + i; y = 44 - int(i * 0.8) + int(2 * math.sin(i / 5))
        for k in range(-3, 4):
            if abs(k) <= 3 - i // 12: d.satt(x + k // 2, y + k, '#F2F2F2' if i > 16 else '#1A1A22')
        d.satt(x, y, '#4A4A58' if i > 16 else '#3A5A8A')
    R.append(('Herr Skatas fjäder', d))
    # 6: bilden vid vattnet: bara problemet, vattnet och en prickad båge (72.4)
    d = ny(); d.mark('gras', (0, 0, 64, 64)); d.mark('vatten', rundrekt(20, 8, 24, 52, 3))
    rita_terrang(d, 81)
    for i in range(0, 36, 3):
        a = math.pi * (1 - i / 34); x = 32 + 22 * math.cos(a); y = 34 - 16 * math.sin(a)
        d.rekt(int(x), int(y), 2, 2, '#FFF4D0')
    d.im = d.im.copy(); R.append(('over_vattnet: prickad båge', d))
    # 7–8: uppdragslappens ringar: bryggan och vassen (63.10)
    for namn in ('bryggan', 'vassen'):
        d = ny()
        for y in range(64):
            for x in range(64):
                dd = math.hypot(x - 31.5, y - 31.5)
                if dd <= 25:
                    if namn == 'bryggan':
                        c = VATT[2] if y > 24 else '#BFDCE8'
                        if 30 <= y <= 36 and x > 14: c = TRA[3] if (x % 5) else TRA[1]
                        if y > 36 and x > 14 and x % 10 == 4 and y < 44: c = TRA[1]
                    else:
                        c = '#BFDCE8' if y < 20 else ([VASS[2], VASS[3], VASS[4]][(x + y // 5) % 3] if y < 44 else VATT[2])
                        if y < 44 and y >= 20 and (x * 7 + y) % 13 == 0: c = VASS[5]
                    d.satt(x, y, c)
                elif dd <= 28: d.satt(x, y, MASS[2] if dd < 27 else MASS[1])
        if namn == 'vassen':
            d.ellips(40, 16, 6, 6, '#CDEFF8', '#8AC6DA'); halva(d, 36, 11, True, b=8, h=10)
        R.append((f'uppdrag_{namn} (ringen)', d))
    # 9: vasstussen hel och huggen (75.3)
    d = ny(); d.mark('vassfalt', (0, 0, 64, 64)); rita_terrang(d, 82)
    vass_tuss(d, 18, 48, 14, 26, seed=1); vass_tuss(d, 46, 48, 14, 26, seed=2, huggen=True)
    R.append(('Vasstussen: hel och huggen', d))
    # 10: hjälten i leran till knäna, med ungen som biter i ryggsäcken (75.5: samma bilder i alla tre lerorna)
    d = ny(); d.mark('lera', rundrekt(4, 30, 56, 30, 6)); d.mark('gras', (0, 0, 64, 30)); rita_terrang(d, 83)
    h = Image.open(INK + '/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA').crop((0, 0, 16, 17))
    d.bild(h, 30, 47)
    for x in range(20, 42): d.satt(x, 47, LERA[0]); d.satt(x, 46, LERA[3] if x % 3 else LERA[1])
    d.bild(INK + '/figurer/unge/unge1_tomgang_ner_01.png', 30, 30)
    R.append(('Hjälten i leran (alla tre)', d))
    # 11: gåvorna på hjälten: den grodgröna dräkten, den rosa ryggsäcken och drakvimpeln (72.11, 76.4)
    d = ny(); d.mark('gras', (0, 0, 32, 64)); d.mark('vassfalt', (32, 0, 32, 64)); rita_terrang(d, 84)
    GROD = ['#0E3E2E', '#16664A', '#20946A', '#5CC898']          # grodgrön: mättad och lite blå, syns mot gräs och vass
    byt = {t: flytta_ton(t, DRAKT_A[0], '#20946A') for t in DRAKT_A[1]}   # dräktens mitt #20946A, tonerna som i fargbyte.js
    for k, (fil, x) in enumerate((('hjalte_ga_ner_01', 16), ('hjalte_ga_upp_01', 48))):
        im = Image.open(INK + f'/figurer/hjalte/{fil}.png').convert('RGBA'); p = im.load()
        for yy in range(im.height):
            for xx in range(im.width):
                c = '#%02x%02x%02x' % p[xx, yy][:3]
                if p[xx, yy][3] and c in byt: p[xx, yy] = hx(byt[c])
        if k == 1:                                               # ryggsäcken bakifrån: flätad vass med rosa band
            for yy in range(9, 19):
                for xx in range(4, 12):
                    p[xx, yy] = hx(TRAMP[2] if (xx + yy) % 3 else TRAMP[1])
                p[4, yy] = hx(TRAMP[0]); p[11, yy] = hx(TRAMP[0])
            for xx in range(4, 12): p[xx, 12] = hx(ROSA[2]); p[xx, 16] = hx(ROSA[2])
        for (xx, yy, c) in ((11, 0, '#D83A2E'), (12, 0, '#D83A2E'), (13, 1, '#F2D22E'), (11, 1, '#D83A2E'), (10, 1, '#5A4A3A'), (10, 2, '#5A4A3A')):
            p[xx, yy] = hx(c)                                     # drakvimpeln på hjälmen
        d.skugga_under(x, 46, 6, 2); d.bild(im, x, 46)
    R.append(('Gåvorna: dräkt, säck, vimpel', d))
    # 12: grodorna i L3 och L4
    d = ny(); d.mark('gras', (0, 0, 64, 64)); rita_terrang(d, 85)
    def groda(x, y, stor, gul, prick=False):
        r = 5 if stor else 3.2
        kr = ('#F2D22E', '#B8961A') if gul else ('#5E9E40', '#2A4A1A')
        d.ellips(x, y, r * 1.2, r, kr[0], kr[1])
        for dx in (-r * 0.5, r * 0.5): d.ellips(x + dx, y - r * 0.8, max(1.2, r * 0.38), max(1.2, r * 0.38), '#FFFFFF', '#1A1A10')
        if prick:
            for (px_, py_) in ((-2, 1), (2, 0), (0, 2), (3, 2)): d.satt(int(x + px_), int(y + py_), '#3A2A10' if gul else '#1A3A10')
    groda(14, 18, True, False); groda(34, 18, False, False); groda(50, 18, False, True); groda(14 + 0, 34, True, True)
    groda(14, 52, False, False, False); groda(30, 52, False, False, True); groda(44, 52, False, True, False); groda(56, 52, False, True, True)
    R.append(('Grodorna: L3 överst, L4 nederst', d))
    return R

if __name__ == '__main__':
    R = rutor(); S = 4; K = 4; cell = 64 * S
    c = Image.new('RGBA', (K * (cell + 16) + 16, ((len(R) + K - 1) // K) * (cell + 40) + 16), (44, 40, 36, 255))
    for i, (t, d) in enumerate(R):
        kras_ihop(d) if False else None
        x = 16 + (i % K) * (cell + 16); y = 16 + (i // K) * (cell + 40)
        bg = Image.new('RGBA', (cell, cell), (64, 58, 52, 255)); c.alpha_composite(bg, (x, y))
        c.alpha_composite(d.im.resize((cell, cell), Image.NEAREST), (x, y))
        rubrik(c, x, y + cell + 4, f'{i + 1}. {t}')
    c.save('/home/claude/skiss2/ut/08_detaljer_x4.png'); print('klart', c.size)
