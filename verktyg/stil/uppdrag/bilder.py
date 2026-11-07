# Uppdragslappens bilder (beslut 37.3 och 40.1, Stil 2026-11-04). En bild per uppdrag, 48 x 48 som bildkorten.
# Regeln: bilden är samma sak som han ser i världen, så att han känner igen den. Små föremål ritas i dubbel storlek
# (hela pixlar, inga mellantoner), och det som redan finns som bildkort används som det är.
# Nytt: månen (DAGS ATT SOVA) och ungen som lyssnar (VEM GRÅTER?).
import os, sys, math
from PIL import Image
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
P = Palett()
def hx(h): h = P.narmast(h.lower())[0]; return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
IN = '/home/claude/inkorg/'
LD = lambda p: Image.open(IN + p).convert('RGBA')
UT = '/home/claude/uppdrag/ut/bildkort/'

def kort(src, skala=None, dy=0):
    """Lägger en bild mitt på ett kort på 48 x 48, beskuren till det som syns och förstorad i hela steg."""
    bb = src.getbbox(); s = src.crop(bb)
    if skala is None: skala = max(1, min(3, 46 // max(s.width, s.height)))
    s = s.resize((s.width * skala, s.height * skala), Image.NEAREST)
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    im.alpha_composite(s, ((48 - s.width) // 2, (48 - s.height) // 2 + dy))
    return im

def manen():
    """Två månar, som i vindsfönstret: den stora ljusa och den lilla blåaktiga, och två stjärnor."""
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); p = im.load()
    STOR = ['#8A7A3A', '#D8C88A', '#F2E8B0', '#FFF8D8', '#FFFFFF']
    LITEN = ['#2E4A7A', '#6E8EC8', '#A8C4F0', '#D8E8FF']
    def mane(cx, cy, r, ramp, krater):
        for y in range(48):
            for x in range(48):
                dx, dy = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
                d = dx * dx + dy * dy
                if d <= 1:
                    nz = math.sqrt(1 - d); ll = -0.55 * dx - 0.75 * dy + 0.45 * nz
                    t = 3 if ll > 0.55 else 2 if ll > 0.2 else 1
                    p[x, y] = hx(ramp[t])
                elif d <= (1 + 1.4 / r) ** 2: p[x, y] = hx(ramp[0])
        for (x, y, rr) in krater:
            for yy in range(y - rr, y + rr + 1):
                for xx in range(x - rr, x + rr + 1):
                    if (xx - x) ** 2 + (yy - y) ** 2 <= rr * rr and p[xx, yy][3]: p[xx, yy] = hx(ramp[1])
            if p[x - rr, y - rr][3]: p[x - rr, y - rr] = hx(ramp[0])
    mane(19, 24, 14, STOR, [(14, 20, 2), (24, 30, 3), (22, 17, 1)])
    mane(38, 12, 6, LITEN, [(37, 13, 1)])
    for (x, y) in [(40, 32), (7, 6)]:                                      # stjärnor, vita (inte guld)
        for (a, b) in [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]: p[x + a, y + b] = hx('#E8F0FF' if (a, b) != (0, 0) else '#FFFFFF')
    return im

def unge_lyssnar():
    """Ungen lutar huvudet och lyssnar, och gråten hörs från sidan som tre ljusblå bågar (BUHU:s färg)."""
    u = LD('figurer/unge/unge1_fragar_ner_01.png')
    im = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); s = u.crop(u.getbbox()); s = s.resize((s.width * 2, s.height * 2), Image.NEAREST)
    im.alpha_composite(s, (0, 48 - s.height)); p = im.load()
    for k, r in enumerate((3, 6, 9)):                                      # bågar till höger, där gråten hörs ifrån
        for a in range(-60, 61, 5):
            x = int(round(37 + r * math.cos(math.radians(a)))); y = int(round(12 + r * math.sin(math.radians(a))))
            if 0 <= x < 48 and 0 <= y < 48 and p[x, y][3] == 0: p[x, y] = hx('#5FB4E8' if k < 2 else '#8FCBF2')
    for (x, y) in [(44, 25), (44, 26), (43, 27), (44, 27), (45, 27), (44, 28)]:   # en liten tår
        if p[x, y][3] == 0: p[x, y] = hx('#8FCBF2')
    return im

def agg_kort():
    """Ägget med frosten, ritat med äggets egen form från agg.py men i kortets storlek."""
    g = {}
    kod = open('/home/claude/agg/agg.py').read().rsplit("\nif __name__ == '__main__':", 1)[0]
    kod = kod.replace("rx = 8.2 if t > 0 else 8.2 - 1.3 * (-t) ** 1.8", "rx = RX if t > 0 else RX - 1.3 * RX / 8.2 * (-t) ** 1.8")
    exec(kod, g)
    g.update(W=48, H=48, CX=24, TOPP=3, BOTTEN=45, RX=14.5)
    im = g['ny'](); g['agg'](im, frost=True, prickar=False)
    p = im.load()
    for (x, y) in [(8, 15), (8, 16)]: p[x, y] = (0, 0, 0, 0)                 # istappen hör till den lilla bilden
    return im

def bilder():
    B = {}
    B['uppdrag_stegen'] = kort(LD('foremal/hus/stege_upp.png').crop((0, 0, 24, 46)), 1)
    B['uppdrag_agget'] = agg_kort()
    B['uppdrag_ungen'] = kort(LD('figurer/unge/unge1_glad_ner_01.png'), 2)
    B['uppdrag_farfar_natt'] = kort(LD('figurer/farfar/farfar_natt_ner_01.png'), 2)
    B['uppdrag_farfar_morgon'] = kort(LD('figurer/farfar/farfar_morgon_ner_01.png'), 2)
    B['uppdrag_kruka'] = kort(LD('foremal/hus/kruka.png'), 2)
    kb = LD('karta/kartbit_1.png'); B['uppdrag_kartbit'] = kort(kb.crop((19, 4, 67, 52)), 1)
    B['uppdrag_manen'] = manen()
    B['uppdrag_ryggsacken'] = kort(LD('ui/ikon_ryggsack.png'), 3)
    B['uppdrag_traskylt'] = kort(LD('foremal/skog/skylt_farfar.png'), 2)
    B['uppdrag_unge_lyssnar'] = unge_lyssnar()
    B['uppdrag_lovhog'] = kort(LD('foremal/skog/lovhog.png'), 2)
    B['uppdrag_ladan'] = kort(LD('foremal/skog/last_lada.png'), 2)
    B['uppdrag_baronens_lapp'] = kort(LD('foremal/skog/baronens_lapp.png'), 3)
    B['uppdrag_unge_pekar'] = kort(LD('figurer/unge/unge1_pekar_ner_01.png'), 2)
    return B

# Vilken bild varje uppdrag har (Innehålls indelning, 37.3). Befintliga bildkort används som de är.
TABELL = [
    ('prologen', 1, 'TITTA PÅ VINDEN', 'uppdrag_stegen'), ('prologen', 1, 'HJÄLP ÄGGET', 'uppdrag_agget'),
    ('prologen', 1, 'DÖP UNGEN', 'uppdrag_ungen'), ('prologen', 1, 'HITTA FARFAR', 'uppdrag_farfar_natt'),
    ('prologen', 2, 'MATA {UNGE}', 'bar'), ('prologen', 2, 'LETA I KRUKORNA', 'uppdrag_kruka'),
    ('prologen', 2, 'VISA FARFAR', 'uppdrag_kartbit'), ('prologen', 2, 'FARFARS SAGA', 'bok'),
    ('prologen', 2, 'DAGS ATT SOVA', 'uppdrag_manen'), ('prologen', 3, 'KOM TILL FARFAR', 'uppdrag_farfar_morgon'),
    ('prologen', 3, 'PACKA', 'uppdrag_ryggsacken'), ('prologen', 3, 'FÖLJ LISTAN', 'lapp'),
    ('kapitel 1', 1, 'IN I SKOGEN', 'uppdrag_traskylt'), ('kapitel 1', 1, 'GENOM LIANERNA', 'svard_ristat'),
    ('kapitel 1', 1, 'VEM GRÅTER?', 'uppdrag_unge_lyssnar'), ('kapitel 1', 2, 'VAR ÄR KARTBITEN?', 'uppdrag_kartbit'),
    ('kapitel 1', 2, 'LETA PÅ KULLEN', 'uppdrag_lovhog'), ('kapitel 1', 2, 'ÖPPNA LÅDAN', 'uppdrag_ladan'),
    ('kapitel 1', 2, 'BARONENS LAPP', 'uppdrag_baronens_lapp'), ('kapitel 1', 2, 'HJÄLP {UNGE}', 'uppdrag_unge_pekar')]

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    B = bilder()
    for k, im in B.items(): P.las_bild(im, k).save(UT + k + '.png')
    # översikt: alla tjugo uppdrag i ordning, på lappens papper
    ov = Image.new('RGBA', (10 * 52 + 4, 2 * 52 + 4), (58, 44, 34, 255))
    for i, (_, _, _, bid) in enumerate(TABELL):
        src = UT + bid + '.png' if os.path.exists(UT + bid + '.png') else IN + 'bildkort/' + bid + '.png'
        pap = Image.new('RGBA', (50, 50), hx('#F2E8C8')); pap.alpha_composite(Image.open(src).convert('RGBA'), (1, 1))
        ov.alpha_composite(pap, (3 + (i % 10) * 52, 3 + (i // 10) * 52))
    ov.resize((ov.width * 3, ov.height * 3), Image.NEAREST).save('/home/claude/uppdrag/uppdragsbilder_x3.png')
    print(len(B), 'nya bilder')
