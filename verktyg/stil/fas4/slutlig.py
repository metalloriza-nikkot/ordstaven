# Fas 4, färdiga bilder (godkänt i stilchatten 2026-11-08): introt, startskärmen, pausmenyn och INSTÄLLNINGAR.
# Ut till kap1-mönstret: fas4/ut/ui/intro/, ui/start/ och ui/meny/. Allt låses till masterpaletten.
#   ui/intro/a_himmel_00–11, a_land_00–11   del A: morgonen i tolv steg, himlen och landet som två lager (320 x 192)
#   ui/intro/sol_stor, sol_mellan, sol_liten del A: solarna, figurer mellan lagren; vägarna står i ui/intro/intro.json
#   ui/intro/b_01–10, c_01–13               del B (kameran backar) och C (blicken ned), färdiga skärmbilder
#   ui/start/...                            startskärmens delar
#   ui/meny/...                             pausmenyn och INSTÄLLNINGAR (9-slice för fönster och knappar)
import os, json, math
import numpy as np
from PIL import Image, ImageDraw
exec(open('/home/claude/fas4/intro2.py').read().split("\nif __name__ == '__main__':")[0])
sys.path.insert(0, '/home/claude/palett')
from palett import Palett
PAL = Palett()
UTF = '/home/claude/fas4/ut/'

def lasa_palett(im, namn):
    """Lås till masterpaletten: varje färg till den närmaste (blandningar från skuggor blir palettens färger)."""
    im = im.convert('RGBA'); a = np.array(im); cache = {}
    for idx in zip(*np.nonzero(a[..., 3])):
        c = tuple(int(v) for v in a[idx][:3])
        if c not in cache: cache[c] = nar(c)[:3]
        a[idx][:3] = cache[c]
    return PAL.las_bild(Image.fromarray(a), namn)

ALLA = {}
def spara(namn, im): ALLA[namn] = lasa_palett(im, namn)

# ---------------------------------------------------------------- del A: morgonen som lager
PITCH_A, Y_A, Z_A = -6.0, 30.0, 100.0
def skarm_ur_landskap(tex, pitch=PITCH_A, f=260.0):
    """Samma avbildning som scen(): landskapet oändligt långt bort, sett med blicken pitch grader."""
    sy, sx = np.mgrid[0:H, 0:W].astype(float); p = math.radians(pitch)
    dy = -math.cos(p) * f - math.sin(p) * (96 - sy); dz = -math.sin(p) * f + math.cos(p) * (96 - sy)
    lx = np.clip(160 + f * (sx - 160) / -dy, 0, LW - 1).astype(int); ly = np.clip(LC - f * dz / -dy, 0, LH - 1).astype(int)
    return Image.fromarray(np.array(tex)[ly, lx])
def skarm_punkt(lx, ly, pitch=PITCH_A, f=260.0):
    """Var en punkt i landskapet hamnar på skärmen i del A (sökning rad för rad)."""
    p = math.radians(pitch); bast = None
    for sy in np.arange(-40, H + 40, 0.25):
        dy = -math.cos(p) * f - math.sin(p) * (96 - sy); dz = -math.sin(p) * f + math.cos(p) * (96 - sy)
        y = LC - f * dz / -dy
        if bast is None or abs(y - ly) < bast[0]: bast = (abs(y - ly), sy, dy)
    _, sy, dy = bast
    return round(160 + (lx - 160) * -dy / f, 1), round(float(sy), 1)

STEG = list(np.linspace(0, 1, 12))
sol_vagar = {'stor': [], 'mellan': [], 'liten': []}
for i, t in enumerate(STEG):
    spara('ui/intro/a_himmel_%02d' % i, skarm_ur_landskap(himmel(float(t))))
    spara('ui/intro/a_land_%02d' % i, skarm_ur_landskap(land(float(t))))
    for namn, (cx, cy, r) in zip(('stor', 'mellan', 'liten'), solar(float(t))):
        sol_vagar[namn].append(skarm_punkt(cx, cy))
for namn, r in (('stor', 13), ('mellan', 6), ('liten', 4)):
    s = ny(2 * r + 9, 2 * r + 9); d = ImageDraw.Draw(s); c = r + 4
    d.ellipse((c - r - 3, c - r - 3, c + r + 3, c + r + 3), fill=hx('#FFE8B0')); d.ellipse((c - r, c - r, c + r, c + r), fill=hx('#FFFBEA'))
    spara('ui/intro/sol_' + namn, s)

# ---------------------------------------------------------------- del B och C: färdiga skärmbilder
_, bord_t = texturer(True)
vagg_t = vagg_med_hal(1.0); land_dag = np.array(landskap(1.0))
STAN = (2.0, 262.0, 100.0)
for i in range(1, 11):
    s = ease(i / 10)
    spara('ui/intro/b_%02d' % i, scen(vagg_t, bord_t, land_dag, PITCH_A + (STAN[0] - PITCH_A) * s, Y_A + (STAN[1] - Y_A) * s, Z_A))
for i in range(1, 14):
    s = ease(i / 13)
    spara('ui/intro/c_%02d' % i, scen(vagg_t, bord_t, land_dag, STAN[0] + (90 - STAN[0]) * s, STAN[1] + (96 - STAN[1]) * s, STAN[2] + (260 - STAN[2]) * s))

# ---------------------------------------------------------------- startskärmen
bord = skrivbord(); bord.alpha_composite(Image.open(UT + 'stav_bord_skugga.png'), (108, 29)); bord.alpha_composite(Image.open(UT + 'skylt.png'), (94, 6))
spara('ui/start/bord', bord)
spara('ui/start/skylt', Image.open(UT + 'skylt.png'))
spara('ui/start/stav', Image.open(UT + 'stav_bord_skugga.png'))
fram = ny(170, 106); fram.alpha_composite(foto(UT + 'bord2.png', 0, 0)); a = np.array(fram); a[4:100, 4:164, 3] = 0   # hålet för rummets bild
spara('ui/start/foto_ram', Image.fromarray(a))
spara('ui/start/pil', Image.open(UT + 'ring32_aktiv.png')); spara('ui/start/pil_vilar', Image.open(UT + 'ring32.png'))
spara('ui/start/bock', Image.open(UT + 'ring32_klar.png')); spara('ui/start/bak', Image.open(UT + 'ring24_bak.png'))
spara('ui/start/plus', Image.open(UT + 'portratt_ny.png'))
spara('ui/start/bok_ny', Image.open(UT + 'bok_ny.png')); spara('ui/start/bok_ny_stor', Image.open(UT + 'bok_stor.png'))
for namn, aktiv in (('spelare_ram', False), ('spelare_ram_vald', True)):
    im = ring(28, aktiv); p = im.load()
    for y in range(28):
        for x in range(28):
            if math.hypot(x - 13.5, y - 13.5) < 9.3: p[x, y] = hx('#A8DCF8' if y < 17 else '#78B456')
    spara('ui/start/' + namn, im)
mask = Image.new('RGBA', (28, 28), (0, 0, 0, 0)); ImageDraw.Draw(mask).ellipse((5, 5, 22, 22), fill=hx('#FFFFFF'))
spara('ui/start/spelare_mask', mask)

# ---------------------------------------------------------------- pausmenyn och INSTÄLLNINGAR
spara('ui/meny/paus_panel', panel(248, 100)); spara('ui/meny/paus_kort', kort(64, 72))
spara('ui/meny/fonster9', fonster(24, 24).crop((0, 0, 24, 24))); spara('ui/meny/fonster9_rubrik', fonster(24, 24, True).crop((0, 0, 24, 24)))
spara('ui/meny/pip_1', pip(True)); spara('ui/meny/pip_0', pip(False)); spara('ui/meny/markor', markor())
def knapp9(pa):
    im = ny(12, 12); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 11, 11), fill=hx(MASS[0])); d.rectangle((1, 1, 10, 10), fill=hx(MASS[2] if pa else MASS[1]))
    d.rectangle((2, 2, 9, 9), fill=hx(MASS[3] if pa else LADER[0])); d.line((2, 2, 9, 2), fill=hx(MASS[4] if pa else LADER[2]))
    return im
spara('ui/meny/knapp9', knapp9(False)); spara('ui/meny/knapp9_pa', knapp9(True))

if __name__ == '__main__':
    ALLA['ui/intro/c_13'] = ALLA['ui/start/bord']                   # sista bilden ÄR startskärmens bord
    for n, im in ALLA.items():
        os.makedirs(os.path.dirname(UTF + n), exist_ok=True); im.save(UTF + n + '.png')
    info = {'storlek': [W, H], 'del_a': {'steg': len(STEG), 'ms_per_steg': 340, 'forsta_steget_vantar_pa_tryck': True,
            'lager': 'a_himmel_NN under solarna under a_land_NN',
            'solar': {n: {'bild': 'sol_' + n, 'mitt_per_steg': v} for n, v in sol_vagar.items()},
            'titel': {'text': 'ORDSTAVEN', 'overkant_y': 26, 'storlek_px': 15, 'en_bokstav_per_ms': 170}},
            'del_b': {'bilder': 'b_01–b_10', 'ms': 90}, 'del_c': {'bilder': 'c_01–c_13', 'ms': 90,
            'sista_bilden': 'samma som ui/start/bord', 'titeln_landar_pa': 'skylten, x 94–226, y 6–28'}}
    with open(UTF + 'ui/intro/intro.json', 'w') as fil: json.dump(info, fil, ensure_ascii=False, indent=1)
    c13 = np.array(ALLA['ui/intro/c_13'].convert('RGB')).astype(int); st = np.array(ALLA['ui/start/bord'].convert('RGB')).astype(int)
    print(len(ALLA), 'bilder i', UTF, '| c_13 mot bordet, olika pixlar:', int((np.abs(c13 - st).sum(-1) > 0).sum()))
