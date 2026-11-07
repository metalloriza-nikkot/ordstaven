# 5d (beslut 51.5): tre hugg med svärdet som växlar. Stil 2026-11-07.
#  1. från sidan  = det som finns: hjalte_svinga_<riktning>_01–03 med svard_svinga_<riktning>_01–03
#  2. uppifrån    = nytt: hjalte_hugg_<riktning>_01–03 (32 x 40) med svard_hugg_<riktning>_01–03 (48 x 48)
#                   bild 1 svärdet högt upp, bild 2 hugget med ett svep uppifrån och ned, bild 3 svärdet nere
#  3. snurrhugget = nytt: hjälten vänder sig ner, vänster, upp, höger (hjalte_svinga_<riktning>_02, finns) med
#                   svard_snurr_01–04 (64 x 64, hjältens bild 16 in och 12 ned) och ett svep runt om.
#                   svard_snurr_03 (uppåt) ritas under hjälten, som när han svingar uppåt.
# Svärdets ruta ligger som förut: 48 x 48 är 8 till vänster och 4 högre än hjältens bild (Rum.js svinga()).
import os
exec(open('/home/claude/kap1/bas.py').read())
_cwd = os.getcwd()
_s = open(ROT + '/svard/svard.py').read().rsplit("\nif __name__ == '__main__':", 1)[0]
exec(_s)                                      # hanim (hjältens kropp och staven), klinga, svep, BLAD
os.chdir(_cwd); UT = ROT + '/kap1/ut/'
HUD = ['#0E2A5A', '#1E5FA8', '#2E8BD8', '#5FB4E8', '#A8DCF8']

# hand och riktning mot stavens kalla ände, i hjältens koordinater (16 x 24), och armens ellips
HUGG = {
    'ner':   [((4, 7), (0.25, -1), (4.0, 10.2)), ((6, 15), (0.45, 1), (5.6, 14.2)), ((7, 17), (0.9, 0.7), (6.6, 16.0))],
    'hoger': [((6, 7), (-0.45, -1), (6.6, 10.6)), ((11, 12), (1, -0.35), (10.0, 13.4)), ((12, 17), (0.55, 1), (10.4, 16.2))],
    'upp':   [((12, 6), (-0.2, -1), (12.2, 9.8)), ((11, 9), (0.05, -1), (11.4, 11.6)), ((11, 12), (0.1, -1), (11.4, 13.4))],
}
SVEP2 = {'ner': (300, 430), 'hoger': (230, 380), 'upp': (200, 340)}

def kropp(rikt, arm):
    if rikt == 'ner': return pa_duk(h_ner(armR=arm, mun='oppen'))
    if rikt == 'upp': return pa_duk(h_upp(armR=arm))
    return pa_duk(h_hoger(arm=arm))

def hugg():
    B = {}
    for rikt, rad in HUGG.items():
        for i, (hand, r, arm) in enumerate(rad):
            B[f'figurer/hjalte/hjalte_hugg_{rikt}_{i+1:02d}'] = kropp(rikt, arm)
            kort = rikt == 'ner' and i > 0          # mot betraktaren: förkortad, så att klingan ryms i rutan
            s = stav_linje(hand, r, efter=8 if kort else 14); hand_pix(s, hand)
            im = Image.new('RGBA', (CW2, CH2), (0, 0, 0, 0)); im.alpha_composite(s, (DX, DY)); p = im.load()
            n = math.hypot(*r); ux, uy = r[0] / n, r[1] / n
            fr = 8.5 if kort else 14.5
            tx, ty = hand[0] + OX + DX + ux * fr, hand[1] + OY + DY + uy * fr
            klinga(p, tx, ty, ux, uy, langd=7 if (rikt == 'upp' and i > 0) or kort else 9)
            if i == 1:
                a0, a1 = SVEP2[rikt]
                svep(p, hand[0] + OX + DX, hand[1] + OY + DY - (4 if rikt != 'upp' else 0), 20, a0, a1)
            B[f'figurer/stav/svard_hugg_{rikt}_{i+1:02d}'] = im
    for i in range(1, 4):
        B[f'figurer/hjalte/hjalte_hugg_vanster_{i:02d}'] = B[f'figurer/hjalte/hjalte_hugg_hoger_{i:02d}'].transpose(Image.FLIP_LEFT_RIGHT)
        B[f'figurer/stav/svard_hugg_vanster_{i:02d}'] = B[f'figurer/stav/svard_hugg_hoger_{i:02d}'].transpose(Image.FLIP_LEFT_RIGHT)
    return B

# snurren: handen i svingbild 2 (som redan finns) för varje håll, svärdet rakt ut och ett svep runt om
SN = 64; SOX, SOY = 16, 12                     # hjältens bild (32 x 40) i snurrens ruta
SNURR = [('ner', (5, 17), 90), ('vanster', (11, 15), 180), ('upp', (11, 12), 270), ('hoger', (11, 15), 0)]
def snurr():
    B = {}
    cx, cy, rx, ry = SN / 2, SOY + OY + 17, 26, 11  # svepet: en ellips runt hjältens midja, snett ovanifrån
    kropp_ruta = (SOX + OX, SOY + OY - 2, SOX + OX + 16, SOY + OY + 24)
    for k, (rikt, hand, vinkel) in enumerate(SNURR):
        if rikt == 'vanster': hand = (15 - hand[0], hand[1])
        hx_, hy_ = hand[0] + OX + SOX, hand[1] + OY + SOY
        im = Image.new('RGBA', (SN, SN), (0, 0, 0, 0)); p = im.load()
        # svepet bakom svärdet: en båge över drygt ett halvt varv som slutar vid svärdets spets
        steg = 40
        for j in range(steg + 1):
            a = math.radians(vinkel - 210 + 210 * j / steg)
            x, y = int(round(cx + math.cos(a) * rx)), int(round(cy + math.sin(a) * ry))
            bak = math.sin(a) < 0
            if bak and kropp_ruta[0] <= x < kropp_ruta[2] and kropp_ruta[1] <= y < kropp_ruta[3]: continue
            if j % 2 and j < steg * 0.4: continue
            p[x, y] = hx2(BLAD[4] if j > steg * 0.7 else (BLAD[3] if j > steg * 0.35 else BLAD[2]))
            if j > steg * 0.55:
                x2, y2 = int(round(cx + math.cos(a) * (rx - 2))), int(round(cy + math.sin(a) * (ry - 1)))
                if p[x2, y2][3] == 0: p[x2, y2] = hx2(BLAD[2])
        # staven från handen och klingan ut mot ellipsen
        a = math.radians(vinkel)
        ex, ey = cx + math.cos(a) * rx, cy + math.sin(a) * ry
        ux, uy = ex - hx_, ey - hy_; n = math.hypot(ux, uy); ux, uy = ux / n, uy / n
        for t in range(0, 12):                   # stavens del: mörk med guldring, varm ände bakom handen
            x, y = int(round(hx_ + ux * t)), int(round(hy_ + uy * t))
            p[x, y] = hx2('#2A2830' if t != 6 else '#FFD95A')
        for t in range(1, 4):
            x, y = int(round(hx_ - ux * t)), int(round(hy_ - uy * t))
            p[x, y] = hx2(['#F2D22E', '#F08A2A', '#D83A2E'][t - 1])
        klinga(p, hx_ + ux * 12, hy_ + uy * 12, ux, uy, langd=max(5, int(n - 12)), w=SN, h=SN)
        for (a_, b_, t) in [(0, 0, 3), (1, 0, 2), (0, 1, 2), (1, 1, 1)]:   # handen över staven
            p[int(hx_) + a_, int(hy_) + b_] = hx2(HUD[t])
        B[f'figurer/stav/svard_snurr_{k+1:02d}'] = im
    return B

for k, im in {**hugg(), **snurr()}.items(): spara(k, im)

if __name__ == '__main__':
    skriv()
    # provbild: varje hugg med kroppen och svärdet ihop, på gräs
    H = Image.open
    rader = []
    for rikt in ('ner', 'hoger', 'upp', 'vanster'):
        for i in range(1, 4):
            c = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
            kr = ALLA[f'figurer/hjalte/hjalte_hugg_{rikt}_{i:02d}']; sv = ALLA[f'figurer/stav/svard_hugg_{rikt}_{i:02d}']
            if rikt == 'upp': c.alpha_composite(sv); c.alpha_composite(kr, (8, 4))
            else: c.alpha_composite(kr, (8, 4)); c.alpha_composite(sv)
            rader.append(c)
    for k, (rikt, _, _) in enumerate(SNURR):
        c = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        kr = Image.open(ROT + f'/inkorg/figurer/hjalte/hjalte_svinga_{rikt}_02.png').convert('RGBA'); sv = ALLA[f'figurer/stav/svard_snurr_{k+1:02d}']
        if rikt == 'upp': c.alpha_composite(sv); c.alpha_composite(kr, (16, 12))
        else: c.alpha_composite(kr, (16, 12)); c.alpha_composite(sv)
        rader.append(c)
    ark('/tmp/k5d_hugg.png', rader, 4)
