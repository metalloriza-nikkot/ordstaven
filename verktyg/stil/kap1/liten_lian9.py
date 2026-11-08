# Stil 9 (beslut 59.6): den lilla lianen vid stubben i gångens ljusa grön. Stil 2026-11-08.
#
# foremal/skog/liten_lian               28 x 38  fyra strängar som hänger ned ur snåret framför stubben, i gångens grön
# foremal/skog/liten_lian_hugg_01–02    28 x 38  snittet lyser och lianen faller (ca 80 ms var, som gångens)
# foremal/skog/liten_lian_kvar          28 x 38  en låg hög på marken, inget som hänger kvar
# Samma bredd och nederkant som förut, så kartans ruta (344,116 28 x 10) står kvar. Bilden är 10 högre än förut,
# så att överkanten (y 88) når det västra snårets nederkant: lianen hänger ur snåret, inte ur luften. Ny bild: hugg_02.
exec(open('/home/claude/kap1/bas.py').read())
_s = open(ROT + '/kap1/skog5d.py').read()
exec(_s[_s.index('# ----------------------------------------------------------------'):_s.index("for v, n in ((0, 'a')")])
# GRON, SNITT, _rita och hog kommer från lianerna i gången

W, H, KLIPP = 28, 38, 3

def liten_strangar():
    """Fyra strängar som hänger ur snåret, med blad i klungor (gångens mönster, utan tofs)."""
    rnd = random.Random(59)
    pix = {}
    for i, bx in enumerate([5, 11, 17, 23]):
        amp = 1.2 + (i % 2) * 0.6; fas = i * 1.3 + 0.7
        slut = H - 2 - (0, 3, 1, 4)[i]
        for y in range(0, slut):
            x = int(round(bx + amp * math.sin(y / 4.5 + fas)))
            pix[(x, y)] = 3 if math.cos(y / 4.5 + fas) > 0 else 2
            pix.setdefault((x + 1, y), 1)
        y = 3 + rnd.randint(0, 3); sida = (-1, 1)[i % 2]
        while y < slut - 2:
            x = int(round(bx + amp * math.sin(y / 4.5 + fas))) + sida * 2
            for (a, b, t) in [(0, 0, 3), (sida, 0, 4), (0, 1, 2), (sida, 1, 3)]: pix[(x + a, y + b)] = t
            y += rnd.randint(4, 6); sida = -sida
    return pix

def liten_lian(steg=None):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = im.load()
    pix = liten_strangar()
    if steg is None:
        _rita(p, pix, W, H); return im
    over = {k: v for k, v in pix.items() if k[1] <= KLIPP}
    under = {k: v for k, v in pix.items() if k[1] > KLIPP}
    snitt = lambda m: {k: ('snitt' if k[1] == KLIPP else v) for k, v in m.items()}
    if steg == 1:                                # snittet lyser och lianen sjunker en bit
        _rita(p, snitt(over), W, H); _rita(p, under, W, H, 0, 4)
    elif steg == 2:                              # nästan nere: den nedre delen har redan lagt sig
        _rita(p, {k: v for k, v in snitt(over).items() if k[1] >= KLIPP - 1}, W, H)
        halv = {k: v for k, v in under.items() if k[1] < H * 0.55}
        _rita(p, {(x, H - 10 + (y % 6)): t for (x, y), t in halv.items()}, W, H)
        _rita(p, hog({k: v for k, v in under.items() if k[1] >= H * 0.55}, W, H, 1), W, H)
    else:                                        # kvar: bara högen
        _rita(p, hog(under, W, H), W, H)
    return im

spara('foremal/skog/liten_lian', liten_lian())
spara('foremal/skog/liten_lian_hugg_01', liten_lian(1))
spara('foremal/skog/liten_lian_hugg_02', liten_lian(2))
spara('foremal/skog/liten_lian_kvar', liten_lian(3))

if __name__ == '__main__':
    skriv()
    gamla = [Image.open(ROT + '/inkorg/foremal/skog/' + n + '.png').convert('RGBA') for n in ('liten_lian', 'liten_lian_hugg_01')
             if os.path.exists(ROT + '/inkorg/foremal/skog/' + n + '.png')]
    gang = Image.open(UT + 'foremal/skog/lian_gang_a.png').convert('RGBA')
    ark('/tmp/liten_lian9.png', gamla + [ALLA[k] for k in ALLA] + [gang], 6)
