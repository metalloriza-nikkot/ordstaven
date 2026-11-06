# Resten av prologens grafik (12, Stil 7, beslut 31.7, 31.8 och 34.4), 2026-11-04:
# - dörrar som öppnas (2–3 bilder) i bakväggen,
# - dörrar och fönster i sidoväggarna, så att dörrar och fönster kan sitta i alla fyra väggarna,
# - nya möbler till hjältens rum och en skiss av rummet som godkänns först,
# - prologens bildkort som saknades (lappen, boken och sängen i tankebubblorna, dinomatens lådor).
# Läser husets föremål ur hus.py. Allt läses till paletten i slutet.
import os, sys
from PIL import Image, ImageDraw
HAR = os.path.dirname(os.path.abspath(__file__))
os.chdir(HAR)
exec(open('hus.py').read().rsplit("\nif __name__=='__main__':", 1)[0])
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
MORK = '#1E140A'; MORK2 = '#2E1C0E'

# ---------- dörrar som öppnas (bakväggen, 26 x 36, samma ruta som dorr) ----------
def dorr_oppnas(steg):
    """Bild 1: dörren glänter. Bild 2: halvöppen, dörrbladet ses snett. Bild 3: öppen, bara kanten syns vid gångjärnet."""
    im = dorr(); px = im.load()
    bredd = {1: 15, 2: 8, 3: 3}[steg]                   # dörrbladets synliga bredd från gångjärnet till vänster
    for y in range(3, 36):
        for x in range(3, 23):
            if x >= 3 + bredd:                          # öppningen: mörkt rum bakom, golvet ljusare längst ned
                c = MORK if y < 28 else (MORK2 if y < 33 else GOLV[1])
                px[x, y] = hx2(c)
    for y in range(3, 36):                              # dörrbladet, smalare ju mer det öppnas
        for x in range(3, 3 + bredd):
            c = TRA[3] if steg < 3 else TRA[2]
            if x == 3 + bredd - 1: c = TRA[0]
            if steg == 2 and (y in (6, 15, 19, 31)): c = TRA[1]
            px[x, y] = hx2(c)
    if steg == 1:
        px[3 + bredd - 3, 20] = hx2('#E8D07A')          # handtaget följer med
    for x in range(3 + bredd, 23): px[x, 3] = hx2(TRA[0])
    return im

# ---------- sidoväggarna: dörr och fönster (vänster vägg, höger är spegelvänd) ----------
SIDA = 32
def dorr_sida():
    """En öppning i vänster sidovägg: karm upptill och nertill, mörkt bakom och golvet som fortsätter ut (A Link to the Past)."""
    im = bild(SIDA, 40); px = im.load()
    for y in range(40):
        for x in range(SIDA):
            c = MORK
            if y >= 30: c = GOLV[2] if x > 8 else MORK2            # golvremsan fram till kanten
            if y in (0, 1, 2): c = TRA[1] if y else TRA[0]          # överkarm
            if y in (37, 38, 39): c = TRA[2] if y < 39 else TRA[0]  # tröskel
            if x == SIDA - 1 or x == SIDA - 2: c = TRA[3] if x == SIDA - 2 else TRA[0]   # karmen mot rummet
            px[x, y] = hx2(c)
    for x in range(SIDA - 2): px[x, 3] = hx2(TRA[4])                # ljus kant på överkarmen (ljuset uppifrån)
    return im

def fonster_sida():
    """Ett fönster i vänster sidovägg: rutan syns snett, med spröjs och en smal bräda mot rummet."""
    im = bild(SIDA, 24); px = im.load()
    for y in range(24):
        for x in range(SIDA):
            c = TRA[2]
            if 3 <= y <= 19 and 4 <= x <= SIDA - 6:
                c = '#9AC8E8' if y < 11 else '#6AA6D8'
                if y == 11 or x == (SIDA - 2) // 2: c = TRA[2]
            if x >= SIDA - 4: c = TRA[3] if x < SIDA - 1 else TRA[0]   # brädan mot rummet
            if y in (0, 23) or x == 0: c = TRA[0]
            px[x, y] = hx2(c)
    px[6, 5] = hx2('#E8F6FF'); px[7, 4] = hx2('#FFFFFF')
    return im

# ---------- hjältens rum: nya möbler ----------
def nattduksbord():
    """Ett litet nattduksbord med ljuset i en ljusstake (nattljuset, stilguiden §1)."""
    im = bild(18, 26); px = im.load()
    rekt(px, 1, 10, 16, 25, TRA[2], TRA[0])
    for x in range(2, 16): px[x, 11] = hx2(TRA[4])
    rekt(px, 4, 16, 13, 21, TRA[1], TRA[0]); px[8, 18] = hx2('#E8D07A'); px[9, 18] = hx2('#E8D07A')   # lådan
    for x in range(5, 12): px[x, 9] = hx2('#B89A3A'); px[x, 10] = hx2('#8E6A22')                   # ljusstaken i mässing
    for y in range(3, 9): px[8, y] = hx2('#F4F0E4'); px[9, y] = hx2('#DCD6C4')                      # ljuset
    px[8, 1] = hx2('#FFF2B8'); px[8, 2] = hx2('#F2D88A'); px[9, 2] = hx2('#F2D88A')                 # lågan
    return im

def kista():
    """Klädkistan där hjälmdekoren och ryggsäckarna ligger (garderoben)."""
    im = bild(34, 24); px = im.load()
    rekt(px, 0, 6, 33, 23, TRA[2], TRA[0])
    rekt(px, 0, 0, 33, 7, TRA[3], TRA[0])
    for x in range(1, 33): px[x, 1] = hx2(TRA[4])
    for y in range(1, 23):
        for x in (6, 27): px[x, y] = hx2('#8E6A22' if y > 0 else TRA[0])   # beslag i mässing
    for (x, y) in [(16, 9), (17, 9), (16, 10), (17, 10)]: px[x, y] = hx2('#E8D07A')
    return im

def matta():
    """En rund trasmatta mitt på golvet (ligger på golvet, inget hinder)."""
    im = bild(72, 40); px = im.load()
    farg = ['#8A3A2E', '#C8B48A', '#3E66AE', '#C8B48A', '#6FA34A', '#C8B48A']
    for y in range(40):
        for x in range(72):
            dx = (x + 0.5 - 36) / 36; dy = (y + 0.5 - 20) / 20; r = (dx * dx + dy * dy) ** 0.5
            if r <= 1:
                c = farg[int(r * 6) % 6]
                if r > 0.93: c = '#5A2018'
                px[x, y] = hx2(c)
    return im

def klader_krok():
    """Krokar på väggen med hjältens ryggsäck (där kläderna hänger, bakväggen)."""
    im = bild(20, 22); px = im.load()
    rekt(px, 0, 2, 19, 5, TRA[2], TRA[0])
    for x in (4, 15): px[x, 6] = hx2('#8E6A22'); px[x, 7] = hx2('#8E6A22')
    rekt(px, 9, 7, 18, 20, '#7A5638', '#2A1A10')                       # ryggsäcken
    for x in range(10, 18): px[x, 8] = hx2('#9C7450')
    rekt(px, 11, 12, 16, 15, '#5A3C26', '#2A1A10')
    return im

# ---------- prologens bildkort som saknades (48 x 48, genomskinliga, ingen text) ----------
def kort_av(im, skala_lika=False):
    """Föremålets egen bild mitt på ett bildkort, i sin egen storlek (stor och liten ska synas)."""
    k = bild(48, 48); k.alpha_composite(im, ((48 - im.width) // 2, 40 - im.height)); return k

def kort_lapp():
    """Farfars lapp om dinomaten: gulnat papper med klotter och kompassrosen i hörnet."""
    k = bild(48, 48); px = k.load()
    d = ImageDraw.Draw(k)
    d.polygon([(8, 6), (40, 4), (42, 42), (6, 44)], fill=hx2('#E6D6A8'))
    d.polygon([(8, 6), (40, 4), (42, 42), (6, 44)], outline=hx2('#8A6C46'))
    for (y, l) in [(12, 26), (18, 22), (24, 24), (30, 18)]:
        for x in range(12, 12 + l):
            if (x // 3) % 3 != 2: px[x, y] = hx2('#4A3018')
    for (x, y) in [(35, 37), (35, 35), (35, 39), (33, 37), (37, 37), (35, 36), (34, 37), (36, 37), (35, 38)]: px[x, y] = hx2('#8E6A22')
    px[35, 37] = hx2('#E8D07A')
    return k

def kort_bok():
    """Farfars gröna expeditionsbok med kompassrosen, större än i bokhyllan."""
    k = bild(48, 48); px = k.load()
    rekt(px, 8, 8, 39, 41, '#3E7634', '#1E3A18')
    for x in range(9, 39): px[x, 9] = hx2('#5A9A48')
    for y in range(9, 41): px[10, y] = hx2('#1E3A18'); px[11, y] = hx2('#285A2C')
    for y in range(10, 40): px[39, y] = hx2('#E6D6A8') if y % 2 else hx2('#C8B48A')   # sidorna
    for (x, y) in [(25, 18), (25, 19), (25, 29), (25, 30), (19, 24), (20, 24), (30, 24), (31, 24)]: px[x, y] = hx2('#C8963E')
    for (x, y) in [(25, 21), (25, 22), (25, 23), (25, 25), (25, 26), (25, 27), (22, 24), (23, 24), (24, 24), (26, 24), (27, 24), (28, 24)]: px[x, y] = hx2('#E6BC66')
    px[25, 24] = hx2('#F5E6A0')
    return k

def kort_sang():
    """Sängen som bildkort: samma säng som i rummet (gaveln upptill, kudden och det blå täcket), ritad mindre."""
    d = Duk(40, 34); MAT['tacke'] = ['#1E2E5A', '#2A4A8A', '#3E66AE', '#6A8ED0', '#A8C4F0']
    MAT['kudde'] = ['#8A8070', '#C8C0B0', '#E8E2D6', '#F6F2EA', '#FFFFFF']
    im = bild(40, 34); px = im.load()
    rekt(px, 0, 0, 39, 8, TRA[2], TRA[0])
    for x in range(1, 39): px[x, 1] = hx2(TRA[4])
    rekt(px, 2, 8, 37, 33, TRA[1], TRA[0])
    d.ellips(20, 21, 17, 11, 'tacke', 'tacke', platt=0.7)
    d.ellips(13, 11, 7, 3, 'kudde', 'kudde', platt=0.4)
    d.kontur(); im.alpha_composite(d.bild())
    k = bild(48, 48); k.alpha_composite(im, (4, 7)); return k

BILDKORT = {
    'lapp': kort_lapp(), 'bok': kort_bok(), 'sang': kort_sang(),
    'lada_rod': kort_av(FOREMAL['lada_rod']), 'lada_bla': kort_av(FOREMAL['lada_bla']), 'lada_gul': kort_av(FOREMAL['lada_gul']),
    'lada_rod_stor': kort_av(FOREMAL['lada_rod_stor']), 'lada_rod_liten': kort_av(FOREMAL['lada_rod_liten']),
    'lada_bla_stor': kort_av(FOREMAL['lada_bla_stor']),
}
NYA = {
    'dorr_oppnas_01': dorr_oppnas(1), 'dorr_oppnas_02': dorr_oppnas(2), 'dorr_oppnas_03': dorr_oppnas(3),
    'dorr_sida_vanster': dorr_sida(), 'dorr_sida_hoger': dorr_sida().transpose(Image.FLIP_LEFT_RIGHT),
    'fonster_sida_vanster': fonster_sida(), 'fonster_sida_hoger': fonster_sida().transpose(Image.FLIP_LEFT_RIGHT),
    'nattduksbord': nattduksbord(), 'kista': kista(), 'matta': matta(), 'klader_krok': klader_krok(),
}

def placera(rum, im, x, y, w, h):
    """Regeln: bildens nederkant mitt på objektets nederkant mitt."""
    rum.alpha_composite(im, (int(x + w / 2 - im.width / 2), int(y + h - im.height)))

def skiss_sovrummet():
    """Hjältens rum i dag och förslaget (31.8). Visas som skiss, och läggs inte i inkorgen."""
    fore = rum_bild('sovrummet'); efter = rum_bild('sovrummet')
    hj = Image.open('/home/claude/hjalte2/ut/hjalte/hjalte_ga_ner_01.png').convert('RGBA')
    un = Image.open('/home/claude/unge2/ut/unge1_ga_ner_01.png').convert('RGBA')
    # i dag: dörren mitt i bakväggen, fönstret i södra väggen, sängen fritt i rummet
    placera(fore, FOREMAL['dorr'], 146, 12, 26, 36); placera(fore, FOREMAL['fonster_fram'], 60, 176, 40, 16)
    placera(fore, FOREMAL['sang'], 220, 90, 64, 44); placera(fore, hj, 192, 126, 16, 24)
    # förslaget: sängen i nordvästra hörnet med gaveln mot bakväggen och långsidan mot västra väggen,
    # nattduksbordet med ljuset bredvid gaveln, kistan i det östra hörnet, krokarna vid dörren och mattan mitt på golvet
    placera(efter, NYA['matta'], 124, 96, 72, 40)
    placera(efter, FOREMAL['dorr'], 146, 12, 26, 36); placera(efter, FOREMAL['fonster_fram'], 60, 176, 40, 16)
    placera(efter, NYA['klader_krok'], 182, 20, 20, 22)
    placera(efter, FOREMAL['sang'], 34, 52, 64, 44)
    placera(efter, NYA['nattduksbord'], 102, 48, 18, 26)
    placera(efter, NYA['kista'], 250, 44, 34, 24)
    placera(efter, FOREMAL['stol'], 260, 120, 16, 22) if 'stol' in FOREMAL else None
    placera(efter, hj, 150, 110, 16, 24); placera(efter, un, 170, 116, 24, 24)
    # siffror som förklaras i chatten
    for (rum, nr) in ((fore, []), (efter, [(1, 64, 50), (2, 110, 30), (3, 266, 42), (4, 192, 18), (5, 160, 130)])):
        d = ImageDraw.Draw(rum)
        for (n, x, y) in nr:
            d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 217, 90, 255), outline=(40, 30, 20, 255))
            for (i, rad) in enumerate(SIFFROR[n]):
                for (j, ch) in enumerate(rad):
                    if ch == '#': d.point((x - 1 + j, y - 2 + i), fill=(40, 30, 20, 255))
    s = 3; ut = Image.new('RGBA', (320 * 2 * s + 30, 192 * s + 20), (200, 191, 174, 255))
    ut.paste(fore.resize((320 * s, 192 * s), Image.NEAREST), (10, 10)); ut.paste(efter.resize((320 * s, 192 * s), Image.NEAREST), (320 * s + 20, 10))
    return ut
SIFFROR = {1: ['.#', '##', '.#', '.#', '.#'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
           4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.']}

if __name__ == '__main__':
    os.makedirs('ut/foremal', exist_ok=True); os.makedirs('ut/bildkort', exist_ok=True)
    for n, im in NYA.items(): P.las_bild(im, n).save(f'ut/foremal/{n}.png')
    for n, im in BILDKORT.items(): P.las_bild(im, n).save(f'ut/bildkort/{n}.png')
    skiss_sovrummet().save('sovrummet_skiss.png')
    ov = Image.new('RGBA', (360, 60), (200, 191, 174, 255)); x = 4
    for n in ['dorr', 'dorr_oppnas_01', 'dorr_oppnas_02', 'dorr_oppnas_03']:
        im = FOREMAL['dorr'] if n == 'dorr' else NYA[n]; ov.alpha_composite(im, (x, 4)); x += 30
    for n in ['dorr_sida_vanster', 'fonster_sida_vanster', 'nattduksbord', 'kista', 'klader_krok']:
        ov.alpha_composite(NYA[n], (x, 4)); x += NYA[n].width + 4
    ov.resize((ov.width * 4, ov.height * 4), Image.NEAREST).save('hus7_foremal_x4.png')
    kk = Image.new('RGBA', (9 * 52 + 4, 56), (243, 230, 200, 255))
    for i, (n, im) in enumerate(BILDKORT.items()): kk.alpha_composite(im, (4 + i * 52, 4))
    kk.resize((kk.width * 3, kk.height * 3), Image.NEAREST).save('hus7_bildkort_x3.png')
    print('klart', len(NYA), len(BILDKORT))
