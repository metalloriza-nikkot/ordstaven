# Kapitel 3 (Stil, efter 0.94.0): bildkorten för platserna ritas om ur rummen som de ser ut i spelet.
# De gamla korten visade sköldpaddan som den såg ut före den gemensamma skalan (huvudet mot söder och fenan till vänster),
# och kvarnen med säckarna och dörren åt andra hållet än i rummet. Ett kort som ska para ihop ord och plats måste visa
# platsen som han ser den, med samma ljusa ring som i rummet (plats_ring).
# Korten är utsnitt ur rummets bild med figurerna på, förminskade och lästa till de färger som bildkorten redan har.
#   under_fenan, bakom_fenan, under_huvudet, bakom_huvudet            sandbanken, huvudet mot väster
#   pa_stora_sacken, vid_stora_sacken, pa_lilla_sacken, vid_lilla_sacken, lucka_vid_vattnet, lucka_vid_dorren   kvarnen
#   kort_kvarn   kvarnen med hjulet och hornet på avsatsen (uppdragets kort)
#   skoldpadda   sköldpaddan uppifrån, för ordduellens kort (pekar_pa), i stället för ordlistans emoji
import os, sys, glob, math
from PIL import Image
_k = open('/home/claude/k3/kort_k3.py').read(); K = {}; exec(_k[:_k.rindex("\nif __name__ == '__main__':")], K)
os.chdir('/home/claude/k3')
RUM = '/home/claude/rum3/ut/rum/kap-03/'; FOR = '/home/claude/rum3/ut/foremal/flod/'; INK = '/home/claude/inkorg/'
UT = '/home/claude/k3/kort105/bildkort/'

def tillgangliga_farger():
    """Färgerna som bildkorten redan har (zonen bildkort), så att korten inte lägger till någon."""
    T = set()
    for f in glob.glob(INK + 'bildkort/*.png'):
        if os.path.basename(f)[:-4] in ALLA: continue
        T |= {c[1][:3] for c in Image.open(f).convert('RGBA').getcolors(1 << 20) if c[1][3]}
    return sorted(T)

def las(im, farger):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 128: px[x, y] = (0, 0, 0, 0); continue
            c = min(farger, key=lambda f: (f[0] - r) ** 2 * 2 + (f[1] - g) ** 2 * 3 + (f[2] - b) ** 2)
            px[x, y] = (*c, 255)
    return im

def lagg(bas, bild, cx=None, cy=None, x=None, y=None, botten=None):
    s = Image.open(bild).convert('RGBA')
    if botten: x, y = botten[0] - s.width // 2, botten[1] - s.height
    elif cx is not None: x, y = cx - s.width // 2, cy - s.height // 2
    bas.alpha_composite(s, (x, y))

def kort_ur(scen, box, ring=None):
    """Ett utsnitt (box) förminskat till 48 x 48, och ringen ritad i kortets storlek efteråt, så att den är skarp."""
    x0, y0, x1, y1 = box
    k = scen.crop(box).resize((48, 48), Image.BOX)
    if ring:
        rx, ry = (ring[0] - x0) * 48 / (x1 - x0), (ring[1] - y0) * 48 / (y1 - y0)
        R = Image.open(FOR + 'plats_ring_02.png').convert('RGBA')
        R = R.resize((14, 8), Image.NEAREST)
        k.alpha_composite(R, (int(rx - 7), int(ry - 4)))
    return k

def sandbanken():
    s = Image.open(RUM + 'sandbanken.png').convert('RGBA')
    lagg(s, FOR + 'skoldpadda_huvud_vilar.png', x=98, y=64); lagg(s, FOR + 'skoldpadda_fena_sanden.png', x=186, y=132)   # kartans huvud_plats och fena_plats (0.94.1)
    return s
SB_BOX = (104, 28, 264, 188)
SB = {'under_fenan': (222, 162), 'bakom_fenan': (236, 130), 'under_huvudet': (148, 128), 'bakom_huvudet': (160, 60)}

def kvarnen():
    k = Image.open(RUM + 'kvarnen.png').convert('RGBA')
    for n, (x, y, w, h) in {'sack_stor': (244, 104, 22, 22), 'sack_liten': (162, 104, 14, 14)}.items():
        lagg(k, INK + 'foremal/flod/%s.png' % n, botten=(x + w // 2, y + h))
    for n, (x, y, w, h) in {'lucka_stangd': (48, 72, 20, 14), 'lucka_stangd ': (96, 152, 20, 14)}.items():
        lagg(k, INK + 'foremal/flod/lucka_stangd.png', x=x, y=y)
    return k
SACK_BOX = (128, 64, 288, 144)                                                # säckarna, bredare än högt, med golv runt om
KV = {'pa_stora_sacken': (255, 97), 'vid_stora_sacken': (228, 115), 'pa_lilla_sacken': (169, 98), 'vid_lilla_sacken': (148, 111)}
LUCKA_BOX = (16, 40, 196, 192)
LU = {'lucka_vid_vattnet': (58, 79), 'lucka_vid_dorren': (106, 159)}

def kvadrat(box):
    """Gör ett utsnitt kvadratiskt runt sin mitt, så att inget förvrids."""
    x0, y0, x1, y1 = box; s = max(x1 - x0, y1 - y0); cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    return (cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s)

def kort_kvarn():
    f = Image.open(RUM + 'floden.png').convert('RGBA')
    lagg(f, FOR + 'vattenhjul_02.png', x=433, y=124); lagg(f, FOR + 'hornet_avsats_rent.png', x=576, y=86)
    return f.crop((428, 0, 640, 212)).resize((48, 48), Image.BOX)

def skoldpadda():
    s = Image.open(FOR + 'on_floden.png').convert('RGBA')
    s = s.crop(s.getbbox())
    b = 46; h = round(s.height * b / s.width)
    k = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); k.alpha_composite(s.resize((b, h), Image.BOX), (1, (48 - h) // 2)); return k

def ringa(im, cx, cy):
    R = Image.open(FOR + 'plats_ring_02.png').convert('RGBA').resize((14, 8), Image.NEAREST)
    im.alpha_composite(R, (int(cx - 7), int(cy - 4))); return im

def sack_kort(n):
    """Som i rummet: den lilla säcken till vänster och den stora till höger. VID är bredvid säcken till vänster, PÅ är ovanpå."""
    im = K['kvarn_bild']()
    liten, stor = K['F']['sack'](False), K['F']['sack'](True)
    lx, ly = 8, 46 - liten.height; sx, sy = 26, 46 - stor.height
    im.alpha_composite(liten, (lx, ly)); im.alpha_composite(stor, (sx, sy))
    pos = {'pa_lilla_sacken': (lx + liten.width // 2, ly + 2), 'vid_lilla_sacken': (lx - 3, 43),
           'pa_stora_sacken': (sx + stor.width // 2, sy + 2), 'vid_stora_sacken': (sx - 3, 43)}
    return ringa(im, *pos[n])

def lucka_kort(n):
    """Som i rummet: vattenrännan längs västra väggen med luckan bredvid, och dörren i södra väggen med luckan till vänster om den."""
    H = K['H']; im = K['kvarn_bild']()
    for y in range(19, 48):
        for x in range(0, 9): im.putpixel((x, y), H('#2a52c8' if (x + y) % 4 else '#9ac8e8'))
    for y in range(42, 48):
        for x in range(34, 46): im.putpixel((x, y), H('#24160c' if x in (34, 45) or y == 42 else '#e0c890'))   # dörren ut, ljust ute
    lucka = K['F']['lucka'](False).resize((14, 10), Image.NEAREST)
    pos = {'lucka_vid_vattnet': (10, 22), 'lucka_vid_dorren': (21, 33)}
    for p in pos.values(): im.alpha_composite(lucka, p)
    x, y = pos[n]; return ringa(im, x + 7, y + 5)

def kort_kvarn_ny():
    """Uppdragets kort: kvarnen av flodsten, hjulet framför och hornet på avsatsen (inte i taket längre)."""
    H = K['H']; im = K['kort']()
    for y in range(36, 48):
        for x in range(48): im.putpixel((x, y), H('#2a52c8' if (x + y) % 5 else '#4f7ae8'))
    for y in range(8, 38):
        for x in range(12, 44): im.putpixel((x, y), H(K['sten'](x, y)))
    for x in range(8, 48):
        for y in range(3, 10):
            if abs(x - 28) * 0.4 + (9 - y) < 7: im.putpixel((x, y), H('#4a3018' if y > 6 else '#6a4626'))   # taket
    for x in range(14, 44):                                                   # avsatsen med räcket
        for y, c in ((17, '#c49a72'), (18, '#c49a72'), (19, '#9c7450'), (20, '#5a3c26')): im.putpixel((x, y), H(c))
        if x % 4 == 0: im.putpixel((x, 16), H('#7a5638'))
    for x in range(14, 44): im.putpixel((x, 15), H('#9c7450'))
    for y in range(11, 16):
        for x in range(22, 27): im.putpixel((x, y), H('#24160c'))           # dörren ut på avsatsen
    horn = Image.open(FOR + 'hornet_avsats_rent.png').convert('RGBA'); horn = horn.crop(horn.getbbox()).resize((9, 12), Image.BOX)
    im.alpha_composite(horn, (34, 9))
    d = K['Duk'](20, 20); d.ellips(10, 10, 9, 9, 'tra', 'hjul', toner=(1, 2, 3, 3)); d.kontur(); hj = d.bild()
    for k in range(6):
        a = math.radians(k * 60)
        for r in range(2, 9): hj.putpixel((int(10 + r * math.cos(a)), int(10 + r * math.sin(a))), H('#4a3018'))
    im.alpha_composite(hj, (1, 24))
    for y in range(26, 38):
        for x in range(26, 32): im.putpixel((x, y), H('#24160c' if x in (26, 31) or y == 26 else '#4a3018'))   # dörren nere
    return im

def skoldpadda_ny():
    """Ordduellens kort: den stora sköldpaddan, skalet med gräs och trädet, och huvudet tydligt ute åt vänster."""
    s = Image.open(FOR + 'on_floden.png').convert('RGBA')
    skal = s.crop((250 - 146, 150 - 100, 250 + 146, 150 + 120)); skal = skal.resize((36, 27), Image.BOX)
    k = Image.new('RGBA', (48, 48), (0, 0, 0, 0)); k.alpha_composite(skal, (11, 11))
    h = Image.open(FOR + 'skoldpadda_huvud_tittar.png').convert('RGBA'); h = h.crop(h.getbbox()).resize((18, 13), Image.BOX)
    k.alpha_composite(h, (0, 20)); return k

ALLA = {}
def bygg():
    sb = sandbanken()
    for n, p in SB.items(): ALLA[n] = kort_ur(sb, SB_BOX, p)
    for n in KV: ALLA[n] = sack_kort(n)
    for n in LU: ALLA[n] = lucka_kort(n)
    ALLA['kort_kvarn'] = kort_kvarn_ny(); ALLA['skoldpadda'] = skoldpadda_ny()

if __name__ == '__main__':
    ALLA.update({n: None for n in list(SB) + list(KV) + list(LU) + ['kort_kvarn', 'skoldpadda']})
    farger = tillgangliga_farger(); bygg()
    os.makedirs(UT, exist_ok=True)
    for n, im in ALLA.items(): las(im, farger).save(UT + n + '.png')
    print(len(ALLA), 'kort,', len(farger), 'färger att välja bland')
