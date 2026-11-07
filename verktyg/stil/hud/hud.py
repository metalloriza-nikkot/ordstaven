# HUD:en, ikonerna och dörrskyltarna i spelets stil (beslut 31.4–31.5, Stil 2026-11-03).
# Inga emoji: allt som syns i gränssnittet är pixlar ur masterpaletten, ritade som världen (ljus uppifrån till
# vänster, fyra toner och kontur i materialets egen färg). Siffror och ord står alltid i Lexend i textlagret.
# ui/hud_knapp*.png   24 x 24  runda knappar: mässingsring och mörkt läder, ikonen (16 x 16) mitt i
# ui/hud_tal.png      18 x 14  papperslappen där bärens antal står (siffran i Lexend)
# ui/ikon_<namn>.png  16 x 16  ikonerna
# ui/skylt_vagg_*.png          dörrskylten på väggen i tre delar (vänster, mitt, höger) som sätts ihop efter ordets bredd
import os, sys, math
from PIL import Image
exec(open('/home/claude/rutor/pix.py').read())
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
PAL = Palett()
def pf(h): return PAL.narmast(h.lower())[0]
def hx2(h): h = pf(h); return tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,)
LD = lambda p: Image.open(p).convert('RGBA')
MASS = ['#4A3A10', '#8A6A20', '#C8A040', '#E8C868', '#FFF0B0']        # kontur, skugga, mitt, ljus, högdager
LADER = ['#140C06', '#2E1C0E', '#3A2414', '#5A3A1E', '#7A522C']
PAPP = ['#5A4A30', '#B8A57A', '#E6D6A8', '#F2E8C8', '#FFFBEA']
MAT.update({'mass': MASS, 'lader': LADER, 'bar': ['#0E1A50', '#1E2E8A', '#3A5AD8', '#7A9AF0', '#E8F0FF'],
            'hud': ['#0E2A5A', '#1E5FA8', '#2E8BD8', '#5FB4E8', '#A8DCF8'], 'hjalm': ['#2A2E38', '#6E747F', '#A4A9B3', '#C9CCD2', '#EEF0F2'],
            'bok': ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260'], 'gron': ['#14301A', '#1E4A24', '#2E6A30', '#4A8E3A', '#78B456'],
            'mint': ['#1E6A4A', '#2E9A6A', '#6ACB8E', '#A6E3CF', '#E8FFF4']})
def bild(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def ritning(im, rader, nyckel, ox=0, oy=0):
    """Ritar en ASCII-bild: varje tecken i nyckeln är en färg, '.' är genomskinligt."""
    p = im.load()
    for y, rad in enumerate(rader):
        for x, c in enumerate(rad):
            if c in nyckel and 0 <= x + ox < im.width and 0 <= y + oy < im.height: p[x + ox, y + oy] = hx2(nyckel[c])
    return im
NYCKEL = {'k': MASS[0], 'm': MASS[1], 'n': MASS[2], 'o': MASS[3], 'p': MASS[4],
          'a': PAPP[0], 'b': PAPP[1], 'c': PAPP[2], 'd': PAPP[3], 'e': PAPP[4],
          'K': '#0E1A50', 'B': '#1E2E8A', 'C': '#3A5AD8', 'D': '#7A9AF0', 'E': '#E8F0FF',
          'g': '#1E4A24', 'G': '#4A8E3A', 'H': '#78B456',
          'r': '#6A1A14', 'R': '#A8302A', 's': '#D9443A',
          'u': '#0E2A5A', 'v': '#1E5FA8', 'w': '#2E8BD8', 'x': '#5FB4E8', 'y': '#A8DCF8',
          'l': LADER[1], 'L': LADER[3], 'M': LADER[4], 'W': '#FFFFFF', 'z': '#101C1C',
          'q': '#2A2E38', 'Q': '#6E747F', 'S': '#A4A9B3', 'T': '#C9CCD2', 'U': '#EEF0F2',
          'f': '#1E6A4A', 'F': '#2E9A6A', 'h': '#6ACB8E'}

# ---------- knapparna ----------
def knapp(lage='normal'):
    """Rund knapp, 24 x 24 (48 punkter vid skala 2): en ring av mässing (ljus uppe till vänster) runt mörkt läder.
    Ikonen (16 x 16) läggs mitt i, 4 pixlar in."""
    d = Duk(24, 24)
    ring = 'mint' if lage == 'aktiv' else 'mass'
    d.ellips(12, 12, 11.6, 11.6, ring, 'ring', zbias=0.15 if lage != 'tryckt' else -0.35)
    d.ellips(12, 12 + (0.5 if lage == 'tryckt' else 0), 9.2, 9.2, 'lader', 'lader', toner=(1, 1, 2, 2), zbias=-0.4)
    d.kontur()
    im = d.bild(); p = im.load()
    for (x, y) in [(5, 5), (6, 4), (4, 6)]:                                  # blänk på ringen uppe till vänster
        if p[x, y][3]: p[x, y] = hx2(MAT[ring][4])
    return im
def tal():
    """Papperslappen för bärens antal: Farfars gulnade papper med en mässingsnit. Siffran står i textlagret."""
    im = bild(18, 14); p = im.load()
    for y in range(1, 14):
        for x in range(0, 18):
            c = PAPP[3] if y < 4 else PAPP[2]
            if x in (0, 17) or y in (1, 13): c = PAPP[0]
            elif y == 12 or x == 16: c = PAPP[1]
            p[x, y] = hx2(c)
    for (x, y) in [(0, 1), (17, 1), (0, 13), (17, 13)]: p[x, y] = (0, 0, 0, 0)
    for (x, y, c) in [(2, 0, MASS[2]), (3, 0, MASS[3]), (2, 1, MASS[1]), (3, 1, MASS[2])]: p[x, y] = hx2(c)   # niten
    return im

# ---------- ikonerna, 16 x 16 ----------
def ikon_bar():
    d = Duk(16, 16)
    for (cx, cy) in [(5.6, 7.4), (10.6, 7.4), (8.1, 11.6)]: d.ellips(cx, cy, 3.6, 3.5, 'bar', 'bar')
    d.kontur(); im = d.bild()
    ritning(im, ['.......gG.', '......gGH.', '.......g..'], NYCKEL, 3, 1)
    p = im.load()
    for (x, y) in [(4, 5), (9, 5), (7, 10)]: p[x, y] = hx2('#E8F0FF')
    return im
def ikon_nos(monster=False):
    """Ungens huvud i profil (stilguiden §6). Aktiv: nosmönstret i ljus mint."""
    src = LD('/home/claude/unge2/ut/' + ('unge1_monster_hoger_01.png' if monster else 'unge1_ga_hoger_01.png'))
    huvud = bild(16, 16); huvud.alpha_composite(src.crop((11, 3, 24, 17)), (2, 1))
    return huvud
def ikon_lapp():
    rader = ['..aaaaaaaaaa....',
             '..adddddddkna...',
             '..adddddddnoa...',
             '..acbbbbbbccma..',
             '..accccccccca...',
             '..acbbbbbccca...',
             '..accccccccca...',
             '..acbbbbbbbca...',
             '..accccccccca...',
             '..acbbbbbccca...',
             '..accccccccca...',
             '..acccccccbca...',
             '..aabbbbbbbaa...',
             '...aaaaaaaaa....']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 1)
def ikon_radio():
    im = bild(16, 16)
    exec_ns = {}
    G = ['#2E1C0E', '#5A3A1E', '#7A522C', '#9A6E40', '#BE9260']
    p = im.load()
    for y in range(3, 15):
        for x in range(0, 15):
            c = G[3] if y < 5 else G[2]
            if x in (0, 14) or y in (3, 14): c = G[0]
            if y == 4 and 0 < x < 14: c = G[4]
            p[x, y] = hx2(c)
    for x in range(3, 12): p[x, 2] = hx2(G[0])
    for x in range(4, 11): p[x, 3] = hx2(G[3])
    for y in range(6, 13):
        for x in range(2, 9):
            r = (x - 5) ** 2 + (y - 9) ** 2
            if r <= 10: p[x, y] = hx2(MASS[1] if r > 6 else (MASS[0] if (x + y) % 2 else MASS[2]))
    for (x, y) in [(11, 7), (11, 11)]:
        p[x, y] = hx2(MASS[3]); p[x + 1, y] = hx2(MASS[2]); p[x, y + 1] = hx2(MASS[1]); p[x + 1, y + 1] = hx2(MASS[0])
    return im
def ikon_paus():
    rader = ['................', '...kkkk..kkkk...', '...kpok..kpok...', '...kon k.kon k..']
    im = bild(16, 16); p = im.load()
    for bx in (3, 9):
        for y in range(2, 14):
            for x in range(bx, bx + 4):
                c = MASS[2]
                if x == bx + 1: c = MASS[3]
                if x == bx + 2: c = MASS[1]
                if x in (bx, bx + 3) or y in (2, 13): c = MASS[0]
                if y == 3 and bx < x < bx + 3: c = MASS[4] if x == bx + 1 else MASS[3]
                p[x, y] = hx2(c)
    return im
def ikon_hogtalare():
    rader = ['................',
             '.........k......',
             '........kok...k.',
             '.......knm..k..k',
             '..kkk.knnm.k.k.k',
             '..kopknonm..k..k',
             '..knnonnnm..k..k',
             '..knnonnnm..k..k',
             '..kmmknnnm..k..k',
             '..kkk.knnm.k.k.k',
             '.......knm..k..k',
             '........kmk...k.',
             '.........k......']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 1)
def ikon_hand():
    """En öppen hand i hjältens blå: handen betyder alltid "tryck så händer det"."""
    rader = ['......u.........',
             '.....uxu.u......',
             '...u.uwuuxu.....',
             '..uxuuwuuwu.u...',
             '..uwuuwuuwuuxu..',
             '..uwuuwuuwuuwu..',
             '..uwxxwxxwxxwu..',
             '..uwwwwwwwwwwu.u',
             '..uwwwwwwwwwwuxu',
             '..uwwwwwwwwwwwwu',
             '..uvwwwwwwwwwvu.',
             '...uvwwwwwwwvu..',
             '....uvvvvvvvu...',
             '.....uuuuuuu....']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 1)
def ikon_stjarna():
    im = bild(16, 16); p = im.load()
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; r = 7.5 if i % 2 == 0 else 3.2
        pts.append((8 + r * math.cos(a), 8.3 + r * math.sin(a)))
    def inne(x, y):
        c = False
        for i in range(10):
            (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % 10]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
        return c
    for y in range(16):
        for x in range(16):
            if inne(x + 0.5, y + 0.5):
                c = '#FFD95A' if x + y < 14 else '#E8C868'
                if x + y < 9: c = '#FFF0B0'
                p[x, y] = hx2(c)
    for y in range(16):
        for x in range(16):
            if p[x, y][3] == 0 and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and p[x + dx, y + dy][3] and p[x + dx, y + dy] != hx2(MASS[0]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                p[x, y] = hx2(MASS[0])
    return im
def ikon_glitter():
    im = bild(16, 16); p = im.load()
    for (cx, cy, r) in [(5, 5, 4), (11, 9, 3), (5, 12, 2)]:
        for i in range(-r, r + 1):
            c = '#FFFFFF' if i == 0 else ('#FFD95A' if abs(i) < r else '#C8A040')
            p[cx + i, cy] = hx2(c); p[cx, cy + i] = hx2(c)
    return im
def ikon_bok():
    rader = ['.llllllllllll...',
             '.lLLLLLLLLLLMl..',
             '.lLMMMMMMMMLLld.',
             '.lLMooooooMLLldd',
             '.lLMonnnnoMLLldc',
             '.lLMoooooomLLldc',
             '.lLMMMMMMMMLLldc',
             '.lLLLLLLLLLLnokc',
             '.lLLLLLLLLLLmkkc',
             '.lLLLLLLLLLLLldc',
             '.lLLLLLLLLLLLldc',
             '.loLLLLLLLLLoldc',
             '.lllllllllllllcb',
             '..ddddddddddddb.']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 1)
def ikon_dinobok():
    src = LD('/home/claude/unge2/ut/unge1_ga_ner_01.png')
    return src.crop((4, 2, 20, 18))
def ikon_karta():
    rader = ['..aaaaaaaaaaaa..',
             '..adddddddddda..',
             '..adcRccccccda..',
             '..adcccRcccccaa.',
             '.aacccccRccccca.',
             '.accccccccRccca.',
             '.acccccRcccccca.',
             '.accccRcccknkca.',
             '.accRccccknpnka.',
             '.acRcccccknmnca.',
             '.accccccccckcca.',
             '.abbbbbbbbbbbba.',
             '..aaaaaaaaaaaa..']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 2)
def ikon_ryggsack():
    rader = ['....H....G......',
             '....lllllllll...',
             '...lMMMMMMMMMl..',
             '..lMLLLLLLLLLMl.',
             '..lLLLLLLLLLLLl.',
             '..llllllnllllll.',
             '..lMLLLLkLLLLLl.',
             '..lLLlllllllLLl.',
             '..lLLlMMMMMlLLl.',
             '..lLLlLLLLLlLLl.',
             '..lLLlllllllLLl.',
             '..lLLLLLLLLLLLl.',
             '...lllllllllll..']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 2)
def ikon_kladar():
    """KLÄDER: hjältens runda hjälm med en fjäder (hjälmdekor). Fjädern är blågrön, inte orange (baronens färg)."""
    rader = ['..........F.....',
             '.........FhF....',
             '........FhF.....',
             '.......FhF......',
             '.....qqfFqq.....',
             '...qqTUUTTSqq...',
             '..qTUUTTTSSSQq..',
             '..qUUTTTSSSSQq..',
             '.qTUTTTSSSSQQQq.',
             '.qTTTTSSSSQQQQq.',
             '.qTTTSSSSSQQQQq.',
             '.qQQQQQQQQQQQQq.',
             '.qSSSSSSQQQQQQq.',
             '..qqqqqqqqqqqq..']
    return ritning(bild(16, 16), rader, NYCKEL, 0, 1)
def pil(riktning):
    im = bild(16, 16); p = im.load()
    for y in range(3, 13):
        w = 6 - abs(y - 7.5)
        for x in range(4, 4 + int(w * 1.6) + 1):
            c = MASS[3] if y < 7 else MASS[2]
            if y == 3 or y == 12: c = MASS[0]
            p[x, y] = hx2(c)
    for y in range(16):
        for x in range(16):
            if p[x, y][3] == 0 and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and p[x + dx, y + dy][3] and p[x + dx, y + dy] != hx2(MASS[0]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                p[x, y] = hx2(MASS[0])
    return im if riktning == 'fram' else im.transpose(Image.FLIP_LEFT_RIGHT)
def ikon_klar():
    rader = ['............kk..',
             '...........kook.',
             '..........konk..',
             '.kk......konk...',
             'kook....konk....',
             '.konk..konk.....',
             '..konkkonk......',
             '...konnnk.......',
             '....konk........',
             '.....kk.........']
    return ritning(bild(16, 16), rader, NYCKEL, 1, 3)
def ikon_igen():
    im = bild(16, 16); p = im.load()
    for t in range(40, 330, 3):
        a = math.radians(t)
        for r, c in [(5.6, MASS[0]), (4.6, MASS[3]), (3.6, MASS[2]), (2.7, MASS[0])]:
            x, y = round(8 + r * math.cos(a)), round(8.5 - r * math.sin(a))
            p[x, y] = hx2(c)
    ritning(im, ['kkkkk.', 'koook.', '.kook.', '..kok.', '...kk.'], NYCKEL, 9, 1)
    return im

IKON = {'bar': ikon_bar(), 'nos': ikon_nos(), 'nos_aktiv': ikon_nos(True), 'lapp': ikon_lapp(), 'radio': ikon_radio(),
        'paus': ikon_paus(), 'hogtalare': ikon_hogtalare(), 'hand': ikon_hand(), 'stjarna': ikon_stjarna(),
        'glitter': ikon_glitter(), 'bok': ikon_bok(), 'dinobok': ikon_dinobok(), 'karta': ikon_karta(),
        'ryggsack': ikon_ryggsack(), 'klader': ikon_kladar(), 'fram': pil('fram'), 'bak': pil('bak'),
        'klar': ikon_klar(), 'igen': ikon_igen()}

# ---------- dörrskylten på väggen ----------
SKYLT_H = 10
def skylt_del(del_):
    """En träskylt med två spikar, i tre delar: vänster (4), mitt (1, upprepas) och höger (4) pixlar breda.
    Ljust trä (beslut 36.9, 2026-11-04): alla rader där ordet kan stå (1–8) har minst 7:1 mot texten #2B2420,
    som läsplattans papper. Ytan #E2C29A ger 9,0:1, den ljusa raden 11:1 och skuggraden 8,4:1. Bara konturen
    och kanterna utanför ordet är mörka, så att skylten syns mot ljusa tapeter (köket)."""
    G = ['#6E4624', '#D8BC90', '#E2C29A', '#E8CC98', '#F0D8B6']     # kontur, skugga, yta, ljus, högdager
    w = {'vanster': 4, 'mitt': 1, 'hoger': 4}[del_]
    im = bild(w, SKYLT_H); p = im.load()
    for y in range(SKYLT_H):
        for x in range(w):
            c = G[3] if y < 3 else G[2]
            if y == 1: c = G[4]
            if y == 6: c = G[1] if x % 2 == 0 else G[2]                    # en svag ådring, fortfarande över 8:1
            if y == SKYLT_H - 2: c = G[1]
            if y in (0, SKYLT_H - 1): c = G[0]
            if del_ == 'vanster' and x == 0 or del_ == 'hoger' and x == w - 1: c = G[0]
            if del_ == 'vanster' and x == 1 and 0 < y < SKYLT_H - 1: c = G[4] if y < 5 else G[3]
            if del_ == 'hoger' and x == w - 2 and 0 < y < SKYLT_H - 1: c = G[1]
            p[x, y] = hx2(c)
    if del_ in ('vanster', 'hoger'):                                   # spiken: mörk på det ljusa träet
        sx = 2 if del_ == 'vanster' else 1
        p[sx, 4] = hx2('#A4A9B3'); p[sx, 5] = hx2('#4A4E58')
    for (x, y) in [(0, 0), (0, SKYLT_H - 1)] if del_ == 'vanster' else ([(w - 1, 0), (w - 1, SKYLT_H - 1)] if del_ == 'hoger' else []):
        p[x, y] = (0, 0, 0, 0)
    return im
def skylt(bredd):
    im = bild(bredd, SKYLT_H)
    im.alpha_composite(skylt_del('vanster'), (0, 0))
    for x in range(4, bredd - 4): im.alpha_composite(skylt_del('mitt'), (x, 0))
    im.alpha_composite(skylt_del('hoger'), (bredd - 4, 0))
    return im

UT = {f'ui/ikon_{k}.png': v for k, v in IKON.items()}
UT.update({'ui/hud_knapp.png': knapp(), 'ui/hud_knapp_tryckt.png': knapp('tryckt'), 'ui/hud_knapp_aktiv.png': knapp('aktiv'),
           'ui/hud_tal.png': tal()})
UT.update({f'ui/skylt_vagg_{d}.png': skylt_del(d) for d in ('vanster', 'mitt', 'hoger')})
if __name__ == '__main__':
    for k, v in UT.items():
        os.makedirs('/home/claude/hud/ut/' + os.path.dirname(k), exist_ok=True); v.save('/home/claude/hud/ut/' + k)
    # översikt: ikonerna på knappar och på papper
    a = Image.new('RGBA', (len(IKON) * 24 + 8, 60), (40, 30, 24, 255))
    for i, (k, v) in enumerate(IKON.items()):
        kn = knapp('aktiv' if k == 'nos_aktiv' else 'normal'); kn.alpha_composite(v, (4, 4)); a.alpha_composite(kn, (3 + i * 24, 3))
        pa = Image.new('RGBA', (20, 20), hx2(PAPP[3])); pa.alpha_composite(v, (2, 2)); a.alpha_composite(pa, (5 + i * 24, 32))
    a.resize((a.width * 4, a.height * 4), Image.NEAREST).save('/home/claude/hud/ikoner_x4.png')
