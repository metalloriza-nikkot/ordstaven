# 5d (beslut 50.3): tangenten som handen visar på datorn. En ritad tangent som ser ut som en tangent: en ljus
# ovansida med ett tecken, en mörkare sida under, och nedtryckt i bild 02 (ovansidan två pixlar ned). På iPaden
# visas bara handen (ikon_hand), som förut.
#   ui/tangent_mellanslag_01–02   48 x 16   mellanslag med tecknet ⎵
#   ui/tangent_tab_01–02          24 x 16   Tab med pilen mot strecket ⇥
#   ui/tangent_pil_<håll>_01–02   16 x 16   piltangenterna (upp, ner, vanster, hoger)
#   ui/tangent_mellanslag_hand_01–02  48 x 30  handen trycker på mellanslaget (bild 01 ovanför, 02 trycker)
# Skalas i heltal som HUD:en (3× eller 4×).
exec(open('/home/claude/kap1/bas.py').read())
KANT, SIDA, SIDA2, YTA, YTA_LJ, TECKEN = '#2B241E', '#B7A98A', '#8E7E62', '#F5ECD7', '#FFFBEA', '#6E5A3A'
HUD = ['#0E2A5A', '#1E5FA8', '#2E8BD8', '#5FB4E8', '#A8DCF8']

def tangent(w, h, nere=False, tecken=None):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    dy = 2 if nere else 0
    def rund(x, y, x0, y0, x1, y1):   # rundade hörn: en pixel bort i varje hörn
        return not ((x in (x0, x1) and y in (y0, y1)))
    # sidan (det mörka under ovansidan) står still
    for y in range(4, h):
        for x in range(w):
            if rund(x, y, 0, 4, w - 1, h - 1): p[x, y] = hx2(SIDA2 if y >= h - 2 else SIDA)
    # ovansidan
    for y in range(dy, h - 4 + dy):
        for x in range(1, w - 1):
            if rund(x, y, 1, dy, w - 2, h - 5 + dy): p[x, y] = hx2(YTA)
    for x in range(2, w - 3): p[x, dy + 1] = hx2(YTA_LJ)       # ljuset uppe
    for y in range(dy + 1, h - 6 + dy): p[2, y] = hx2(YTA_LJ)
    kontur_runt(im, KANT)
    if tecken: tecken(p, w, dy)
    return im

def mellanslag(p, w, dy):
    x0, x1, y0, y1 = w // 2 - 8, w // 2 + 8, 4 + dy, 8 + dy
    for y in range(y0, y1 + 1): p[x0, y] = hx2(TECKEN); p[x1, y] = hx2(TECKEN); p[x0 + 1, y] = hx2(TECKEN); p[x1 - 1, y] = hx2(TECKEN)
    for x in range(x0, x1 + 1): p[x, y1] = hx2(TECKEN); p[x, y1 - 1] = hx2(TECKEN)

def tab(p, w, dy):
    y = 6 + dy
    for x in range(6, 16): p[x, y] = hx2(TECKEN)
    for k in range(1, 4): p[15 - k, y - k] = hx2(TECKEN); p[15 - k, y + k] = hx2(TECKEN)
    for yy in range(y - 4, y + 5): p[17, yy] = hx2(TECKEN); p[18, yy] = hx2(TECKEN)

def pil(hall):
    def rita(p, w, dy):
        cx, cy = 7, 5 + dy
        pts = []
        for k in range(4):
            for j in range(-k, k + 1): pts.append((j, k - 2))       # en triangel med spetsen uppåt
        for (a, b) in pts:
            if hall == 'upp': x, y = a, b
            elif hall == 'ner': x, y = a, -b
            elif hall == 'vanster': x, y = b, a
            else: x, y = -b, a
            p[cx + x + (1 if hall in ('ner', 'upp') else 0), cy + y] = hx2(TECKEN)
    return rita

def pekhand():
    """Hjältens blå hand som en knytnäve med pekfingret nedåt, som trycker."""
    d = Duk(16, 16)
    MAT['hudblå'] = HUD
    d.ellips(9, 5, 5.6, 4.4, 'hudblå', 'hand')
    for cx in (5.4, 8.6, 11.8): d.ellips(cx, 8.4, 1.8, 1.6, 'hudblå', 'knoge')
    d.ellips(3.6, 4.6, 1.8, 2.6, 'hudblå', 'tumme')
    d.ellips(5.4, 11.6, 1.7, 3.8, 'hudblå', 'finger')
    d.kontur(); im = d.bild(); p = im.load()
    for (x, y) in [(7, 9), (10, 9)]: p[x, y] = hx2(HUD[0])            # skåran mellan knogarna
    return im

for f, nere in ((1, False), (2, True)):
    spara(f'ui/tangent_mellanslag_{f:02d}', tangent(48, 16, nere, mellanslag))
    spara(f'ui/tangent_tab_{f:02d}', tangent(24, 16, nere, tab))
    for h in ('upp', 'ner', 'vanster', 'hoger'): spara(f'ui/tangent_pil_{h}_{f:02d}', tangent(16, 16, nere, pil(h)))
    im = Image.new('RGBA', (48, 30), (0, 0, 0, 0))
    im.alpha_composite(ALLA[f'ui/tangent_mellanslag_{f:02d}'], (0, 14))
    im.alpha_composite(pekhand(), (26, 0 if not nere else 3))
    spara(f'ui/tangent_mellanslag_hand_{f:02d}', im)

if __name__ == '__main__':
    skriv()
    ark('/tmp/k5d_tangent.png', list(ALLA.values()), 5, bg=(42, 29, 22, 255))
