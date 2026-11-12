# Byborna i skissen: samma folk som hjälten (hans kropp och huvud, de hudfärger han själv kan välja),
# men egna kläder och huvudbonader som säger vad de gör. Platshållare tills de ritas i steg 5.
from bas import *
GRON, OCKRA, LILA, BLAH = '#4fae6a', '#d8a24a', '#9a6ad8', '#2e8bd8'

def sydvast(im, p, kant, ljus):
    for x in range(im.width - 5, im.width):                 # sydvästens nackskydd, bakåt till höger
        p[x, 8] = hx(kant); p[x, 9] = hx(kant)
def schalett(im, p, kant, ljus):
    for (x, y) in ((4, 2), (7, 2), (10, 2), (13, 2), (5, 4), (9, 4), (12, 4)):
        if p[x, y][3]: p[x, y] = hx('#F2E8C8')               # prickar på huvudduken
def keps(im, p, kant, ljus):
    for x in range(3, 13): p[x, 7] = hx(kant)

def tant_rosa(riktning='ner'):
    """Tant Rosa, handritad: samma folk (det runda huvudet och ögonen), men gammal och egen, som Farfar:
    vita lockar under en stor stråhatt med rosa band och en blomma, rosiga kinder, en rund kropp i en lång rosa
    klänning med vitt förkläde och puffärmar. Inga ben syns, så siluetten skiljer sig från hjältens."""
    B, H = 24, 30
    d = Duk(B, H); d.im = Image.new('RGBA', (B, H), (0, 0, 0, 0)); d.px = d.im.load()
    HUD = ['#705d14', '#bb8e27', '#d8a24a', '#e8b77b', '#f9dfc3']
    KL = ['#5A1A34', '#8A2E56', '#B8467A', '#E07AA6', '#F6B4CE']
    STRA = ['#6A5020', '#A8863A', '#C8A858', '#E6CC7A', '#F6E6A8']
    VIT = ['#8A8A96', '#C8CAD4', '#EEEFF4']
    # klänningen: lång och vid nedtill (en klocka), puffärmar, vitt förkläde
    for y in range(17, 29):
        w = 5 + (y - 17) * 0.45
        for x in range(int(12 - w), int(12 + w) + 1):
            c = KL[2] if x < 13 else KL[1]
            if x in (int(12 - w), int(12 + w)) or y == 28: c = KL[0]
            if y in (22, 25) and x % 3 == 0: c = KL[3]
            d.satt(x, y, c)
    for y in range(19, 27):
        w = 2 if y < 20 else 3
        for x in range(12 - w, 13 + w):
            c = VIT[2] if x < 13 else VIT[1]
            if y == 19 and x % 2: c = VIT[1]
            if x in (12 - w, 12 + w) or y == 26: c = VIT[0]
            d.satt(x, y, c)
    for (cx, s_) in ((6.5, 1), (17.5, -1)):
        d.ellips(cx, 18.5, 2.6, 2.3, KL[3] if s_ > 0 else KL[2], KL[0])
        d.ellips(cx - s_ * 0.5, 21.5, 1.4, 1.3, HUD[3], HUD[1])
    d.satt(10, 28, '#3A2414'); d.satt(14, 28, '#3A2414')
    # huvudet: rundare och större, som hjältens, med en tunn kontur, ljus upptill till vänster
    cx, cy, rx, ry = 12, 11.5, 6.6, 6.0
    def inne(x, y): return ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1
    for y in range(4, 19):
        for x in range(3, 22):
            if not inne(x, y): continue
            kant = not all(inne(xx, yy) for xx, yy in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            c = HUD[0] if kant else (HUD[3] if (x < 11 and y < 12) else (HUD[1] if x > 16 or y > 15 else HUD[2]))
            d.satt(x, y, c)
    for (ccx, ccy) in ((5.4, 10.5), (5.0, 13), (18.6, 10.5), (19.0, 13)):    # vita lockar på sidorna
        d.ellips(ccx, ccy, 1.8, 1.5, VIT[2], VIT[0])
    for (x, y) in ((9, 11), (9, 12), (15, 11), (15, 12)): d.satt(x, y, '#1A1410')   # ögonen, som hjältens
    d.satt(9, 11, '#FFFFFF') if False else None
    d.satt(10, 11, '#4A3A2A'); d.satt(14, 11, '#4A3A2A')
    for x in (7, 8, 16, 17): d.satt(x, 14, '#E8909A')                          # rosiga kinder
    for (x, y) in ((10, 14), (11, 15), (12, 15), (13, 15), (14, 14)): d.satt(x, y, '#5A1A14')   # leendet
    # den stora stråhatten med rosa band och en blomma
    for x in range(0, B):
        d.satt(x, 7, STRA[3] if x < 12 else STRA[2]); d.satt(x, 8, STRA[1] if 2 < x < 21 else STRA[0])
        if (x + 1) % 3 == 0: d.satt(x, 7, STRA[4])
    d.ellips(12, 4.4, 5, 3.4, STRA[3], STRA[1])
    for x in range(7, 17): d.satt(x, 6, KL[2]); d.satt(x, 5, KL[3] if x < 12 else KL[2])
    d.ellips(16.5, 5, 1.8, 1.6, '#F6B4CE', '#B8467A'); d.satt(16, 5, '#F2D22E')
    return d.im

def fiskaren(riktning='ner'):
    im = bybo(GRON, '#E8B82E', '#E8B82E', '#2E4A2A', riktning, brätte=1, hatt_form=sydvast)    # gul sydväst och oljerock
    p = im.load(); o = 1
    for (x, y) in [(5, 12), (6, 12), (7, 13), (8, 13), (9, 13), (10, 13), (11, 12), (12, 12), (6, 13), (11, 13), (8, 14), (9, 14)]:
        p[x + o, y - 1] = hx('#C8CAD4' if (x + y) % 3 else '#EEEFF4')                         # ett grått skägg
    for y in range(16, 20):                                                                     # rocken går ned över knäna
        for x in range(4 + o, 12 + o):
            if p[x, y][3]: p[x, y] = hx('#E8B82E' if x < 9 + o else '#B8901A')
    return im
def tvatterskan(riktning='ner'):
    im = bybo(LILA, '#4E8A62', '#C83A2E', '#5A3A1E', riktning, hatt_form=schalett)  # röd huvudduk med prickar, grönt förkläde
    ny = Image.new('RGBA', (im.width + 2, im.height), (0, 0, 0, 0)); ny.alpha_composite(im, (1, 0)); p = ny.load()
    for y in range(16, 23):                                                                 # en vid kjol i stället för byxor
        w = 5 + (y - 16) // 2
        for x in range(9 - w, 9 + w + 1):
            p[x, y] = hx('#2E5A3A' if x in (9 - w, 9 + w) or y == 22 else ('#4E8A62' if x < 10 else '#3E6E4E'))
    return ny
def kortare(im, fran=13, rader=4):
    """Ett barn: samma stora huvud, men kortare kropp."""
    ny = Image.new('RGBA', (im.width, im.height - rader), (0, 0, 0, 0))
    ny.alpha_composite(im.crop((0, 0, im.width, fran)), (0, 0)); ny.alpha_composite(im.crop((0, fran + rader, im.width, im.height)), (0, fran))
    return ny
def barnet(riktning='ner'):
    return kortare(bybo(BLAH, '#F2D22E', '#D83A2E', '#3A2A1A', riktning, hatt_form=keps))    # röd keps och gul tröja
def bo(riktning='ner'):
    im = kortare(bybo(GRON, '#2A4AA8', '#C87A2A', '#3E5A2A', riktning), rader=3)   # mössa, och för stora stövlar:
    ny = Image.new('RGBA', (im.width + 4, im.height + 1), (0, 0, 0, 0)); ny.alpha_composite(im, (2, 0)); p = ny.load()
    H_ = ny.height; mid = ny.width // 2
    for (x0, x1) in ((mid - 7, mid - 1), (mid + 1, mid + 7)):          # två röda gummistövlar, för stora
        for y in range(H_ - 7, H_):
            for x in range(x0, x1):
                c = '#B83A2E'
                if x == x0 or x == x1 - 1 or y == H_ - 1: c = '#5A1A14'
                elif y == H_ - 7: c = '#E07060'
                elif x == x0 + 1: c = '#D85A4A'
                p[x, y] = hx(c)
    return ny

FIGURER = {'tant_rosa': tant_rosa, 'fiskaren': fiskaren, 'tvatterskan': tvatterskan, 'barnet_drake': barnet, 'bo': bo}

def stalla(d, namn, x, yb, riktning='ner', sak=None):
    d.skugga_under(x, yb, 6, 2)
    d.bild(FIGURER[namn](riktning), x, yb)
    if sak: sak(d, x, yb)

if __name__ == '__main__':
    d = Duk(220, 40); d.mark('gras', (0, 0, 220, 40)); rita_terrang(d, 3)
    d.skugga_under(16, 34, 6, 2); d.bild(INK + '/figurer/hjalte/hjalte_ga_ner_01.png', 16, 34)
    d.skugga_under(46, 34, 6, 2); d.bild(INK + '/figurer/farfar/farfar_morgon_ner_01.png', 46, 34)
    for i, n in enumerate(FIGURER): stalla(d, n, 80 + i * 30, 34)
    d.im.resize((220 * 6, 40 * 6), Image.NEAREST).save('/home/claude/skiss2/ut/bybor_x6.png')
