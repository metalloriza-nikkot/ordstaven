# Byborna i rörelse (10g, steg 5): vinka, jubla, sysslorna och Tant Rosas lägen.
# Samma figurer som grundställningen (bybor.py). En lyft arm ritas sist, strax före konturen,
# så att handen syns bredvid huvudet. Det som de håller i ritas efteråt.
import os, sys
HAR = '/home/claude/bybor'; os.chdir(HAR); sys.argv = sys.argv[:1]
exec(open('bybor.py').read())

ARM = {'lyft': set(), 'bild': 1, 'vy': 'fram', 'hoj': 0}   # lyft: {'v', 'h'} = arm till vänster/höger i bilden
_ell = Duk.ellips
_kontur = Duk.kontur
def _ell_arm(s, cx, cy, rx, ry, mat, namn, *a, **k):
    if ARM['lyft'] and namn in ('arm', 'hand'):
        mitt = s.w / 2
        sida = 'h' if cx >= mitt else 'v'
        if ARM['vy'] == 'sida': sida = 'h'
        if sida in ARM['lyft']:
            ut = 1 if sida == 'h' else -1
            vag = 0.9 * ut if ARM['bild'] == 2 else 0.0
            hoj = ARM['hoj']
            if ARM['vy'] == 'sida':
                if namn == 'arm': s._sen.append((cx + 1.0, cy - 2.4 - hoj, rx, ry * 0.9, mat, namn, a, k))
                else: s._sen.append((cx + 2.4 + vag * 0.6, cy - 6.6 - hoj - (0.8 if ARM['bild'] == 2 else 0), rx, ry, mat, namn, a, k))
            elif mat == 'rosa' and namn == 'arm':                            # Tant Rosas puffärm står kvar
                s._sen.append((cx, cy, rx, ry, mat, namn, a, k))
                s._sen.append((cx + 1.8 * ut, cy - 2.4 - hoj, 0.9, 1.8, 'ockra', 'underarm', (), {}))
            elif namn == 'arm':
                s._sen.append((cx + 0.6 * ut, cy - 2.8 - hoj, rx * 0.9, ry * 0.8, mat, namn, a, k))
            elif mat == 'ockra' and s.w == 24:
                s._sen.append((cx + 2.8 * ut + vag, cy - 6.6 - hoj, rx, ry, mat, namn, a, k))
            else:
                s._sen.append((cx + 1.1 * ut + vag * 0.7, cy - 7.6 - hoj - (0.6 if ARM['bild'] == 2 else 0), rx, ry, mat, namn, a, k))
            return
    return _ell(s, cx, cy, rx, ry, mat, namn, *a, **k)
def _kontur_sen(s, *a, **k):
    fore = set(s.px)
    for (cx, cy, rx, ry, mat, namn, aa, kk) in getattr(s, '_sen', []):
        _ell(s, cx, cy, rx, ry, mat, namn + '_lyft', *aa, **kk)
    lyft = {q for q, nm in s.del_.items() if nm.endswith('_lyft')}
    for (x, y) in lyft:                                  # en kontur mellan den lyfta armen och det bakom
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q in fore and q not in lyft and s.px[q][0] in MAT: s.px[q] = (s.px[q][0], 0)
    s._sen = []
    return _kontur(s, *a, **k)
_init = Duk.__init__
def _init_sen(s, *a, **k):
    _init(s, *a, **k); s._sen = []
Duk.__init__ = _init_sen
Duk.ellips = _ell_arm
Duk.kontur = _kontur_sen

FRAM = {n: f for n, (f, h, u) in FIGURER.items()}
SIDA = {n: h for n, (f, h, u) in FIGURER.items()}
BAK = {n: u for n, (f, h, u) in FIGURER.items()}

def med(fn, lyft=(), bild=1, vy='fram', hoj=0):
    ARM.update(lyft=set(lyft), bild=bild, vy=vy, hoj=hoj)
    try: return fn()
    finally: ARM.update(lyft=set(), bild=1, hoj=0)
def hopp(im, dy=1):
    ny = Image.new('RGBA', im.size, (0, 0, 0, 0)); ny.alpha_composite(im.crop((0, dy, im.width, im.height)), (0, 0)); return ny
def rita(im, punkter):
    im = im.copy(); p = im.load()
    for (x, y, c) in punkter:
        if 0 <= x < im.width and 0 <= y < im.height: p[x, y] = hx(c) + (255,)
    return im
def hitta(im, farg):
    """Var ritades handen? Mitten av de pixlar som har handens färg (ljuset) högst upp i bilden."""
    p = im.load(); pts = [(x, y) for y in range(im.height) for x in range(im.width) if p[x, y][3] and '#%02x%02x%02x' % p[x, y][:3] == farg]
    return pts

# ---------- föremålen de håller i ----------
TRA = ('#5a3c26', '#7a5638', '#9c7450')
def vippa(x, y, upp=True):
    """Dammvippan: ett skaft och en rosa fjäderboll i toppen (x, y = handen)."""
    pts = []
    for i in range(1, 6): pts.append((x, y - i if upp else y + i, TRA[1 if i % 2 else 0]))
    tx, ty = x, (y - 7 if upp else y + 7)
    for (dx, dy, c) in ((-1, -1, '#e07aa6'), (0, -1, '#f6b4ce'), (1, -1, '#e07aa6'), (-1, 0, '#f6b4ce'), (0, 0, '#f6b4ce'),
                        (1, 0, '#b8467a'), (0, -2, '#f6b4ce'), (-2, 0, '#e07aa6'), (2, -1, '#b8467a'), (0, 1, '#b8467a')):
        pts.append((tx + dx, ty + dy, c))
    return pts
def linje(x0, y0, x1, y1, farg):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    return [(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), farg) for i in range(n + 1)]

def alla_rorelser():
    R = {}
    # vinka (ner och höger, två bilder) och jubel (ner, två bilder: armarna upp, och ett litet hopp)
    for n in FIGURER:
        R[f'{n}_vinka_ner'] = [med(FRAM[n], 'h', b) for b in (1, 2)]
        R[f'{n}_vinka_hoger'] = [med(SIDA[n], 'h', b, 'sida') for b in (1, 2)]
        R[f'{n}_jubel_ner'] = [med(FRAM[n], 'vh', 1), hopp(med(FRAM[n], 'vh', 2, hoj=0.6))]
    # fiskaren fiskar: 24 bred (figuren i mitten), spöet ut åt höger och toppen gungar
    def bred(im):
        ny = Image.new('RGBA', (24, 24), (0, 0, 0, 0)); ny.alpha_composite(im, (4, 0)); return ny
    for b in (1, 2):
        im = bred(SIDA['fiskaren']())
        spo = linje(14, 17, 22, 5 + (b - 1), '#7a5638') + linje(15, 16, 21, 6 + (b - 1), '#c49a72')[1:-1]
        lina = [(23, y, '#eeeff4') for y in range(6 + (b - 1), 12 + (b - 1))]
        R.setdefault('fiskaren_fiskar_hoger', []).append(rita(im, spo + lina))
    # tvätterskan med tvättkorgen på höften, och en vit skjorta som hon lyfter ur korgen i bild 2
    KORG = ('#5a3c26', '#9c7450', '#c49a72')
    for b in (1, 2):
        im = med(FRAM['tvatterskan'], 'h' if b == 2 else '', 1, hoj=0.4)
        korg = []
        for x in range(3, 13):
            for y in range(16, 20):
                c = KORG[0] if (y == 19 or x in (3, 12)) else (KORG[2] if (x + y) % 2 else KORG[1])
                korg.append((x, y, c))
        korg += [(x, 15, '#eeeff4' if x % 3 else '#dce0e4') for x in range(4, 12)] + [(x, 16, KORG[0]) for x in range(3, 13) if x in (3, 12)]
        if b == 2: korg += [(14, 7, '#eeeff4'), (15, 7, '#ffffff'), (14, 8, '#dce0e4'), (15, 8, '#eeeff4'), (15, 9, '#dce0e4')]
        R.setdefault('tvatterskan_korg_ner', []).append(rita(im, korg))
    # barnet med draken: en arm uppe med snöret, som går upp ur bilden
    for b in (1, 2):
        im = med(FRAM['barnet'], 'h', 1, hoj=0.4 * (b - 1))
        R.setdefault('barnet_drake_ner', []).append(rita(im, linje(14, 9 - (b - 1), 15, 0, '#eeeff4')))
    # Tant Rosa med dammvippan (ner och höger), sträcker upp den mot tavlan (bakifrån, på tå),
    # flätar vass (ner) och lyfter på lyktan (höger)
    R['tant_rosa_vippa_ner'] = [rita(FRAM['tant_rosa'](), vippa(17, 17))]
    R['tant_rosa_vippa_hoger'] = [rita(SIDA['tant_rosa'](), vippa(14, 17))]
    R['tant_rosa_strack_upp'] = [rita(med(BAK['tant_rosa'], 'h', 1), vippa(19, 10)),
                                  rita(hopp(med(BAK['tant_rosa'], 'h', 1, hoj=0.8)), vippa(19, 8))]
    for b in (1, 2):
        im = FRAM['tant_rosa']()
        vass = [(x, 17 + (x + b) % 2, '#75c987' if (x + b) % 2 else '#b0e7ba') for x in range(5, 20)]
        vass += [(x, 19, '#1c432e') for x in range(5, 20) if (x + b) % 2 == 0] + [(4, 18, '#3a8354'), (20, 17 + b, '#3a8354'), (21, 17 + b, '#75c987')]
        R.setdefault('tant_rosa_flatar_ner', []).append(rita(im, vass))
    R['tant_rosa_lyfter_hoger'] = [med(SIDA['tant_rosa'], 'h', 1, 'sida'), med(SIDA['tant_rosa'], 'h', 1, 'sida', hoj=1.0)]
    return R

if __name__ == '__main__':
    R = alla_rorelser()
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    for namn, bilder in R.items():
        fig = namn.split('_')[0] if not namn.startswith('tant_rosa') else 'tant_rosa'
        os.makedirs(f'ut/figurer/{fig}', exist_ok=True)
        for i, im in enumerate(bilder, 1):
            im = P.las_bild(im, namn); im.save(f'ut/figurer/{fig}/{namn}_{i:02d}.png')
            if '_hoger' in namn:
                v = namn.replace('_hoger', '_vanster')
                im.transpose(Image.FLIP_LEFT_RIGHT).save(f'ut/figurer/{fig}/{v}_{i:02d}.png')
    # översikt
    rader = list(R.items()); B = 8 * 28 + 8
    o = Image.new('RGBA', (B, ((len(rader) + 3) // 4) * 28 + 4), (126, 170, 74, 255))
    for i, (namn, bilder) in enumerate(rader):
        x0 = 4 + (i % 4) * 56; y0 = 2 + (i // 4) * 28
        for j, im in enumerate(bilder): o.alpha_composite(im, (x0 + j * 26 - (im.width - 16) // 2 + 2, y0))
    o.resize((o.width * 4, o.height * 4), Image.NEAREST).save('/tmp/rorelser.png')
    print(len(R), 'rörelser')
