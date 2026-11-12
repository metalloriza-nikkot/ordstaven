# Byborna i kapitel 2, grundställning åt fyra håll (10g, steg 5, beslut 80.5).
# Samma folk som hjälten: runt huvud, samma ögon med glimt och samma breda leende, och de hudfärger
# han själv kan välja. Egna kläder, egen siluett och en huvudbonad som säger vad de gör.
# Ritat enligt *Så ritas allt* (10b): snett uppifrån, ljus uppifrån till vänster, fyra toner per material,
# kontur i materialets egen mörka färg, och en skugga under (egen fil). Vänster är spegelvänd höger.
#   tant_rosa   24 x 24 (stråhatten är bredare än hjälten, som baronens ruta)
#   fiskaren, tvatterskan, barnet, bo   16 x 24
import os, sys
HAR = os.path.dirname(os.path.abspath(__file__))
os.chdir(HAR)
exec(open('pix.py').read())
from PIL import Image

MAT.update({
 'gron':   ['#1c432e', '#3a8354', '#4fae6a', '#75c987', '#b0e7ba'],   # hjältens hudval grön (fargbyte.js)
 'lila':   ['#5e1e86', '#8336cc', '#9a6ad8', '#b79ae9', '#eae1fb'],   # hudval lila
 'ockra':  ['#705d14', '#bb8e27', '#d8a24a', '#e8b77b', '#f9dfc3'],   # hudval ockra
 'blahud': ['#0e2a5a', '#1e5fa8', '#2e8bd8', '#5fb4e8', '#a8dcf8'],   # hudval blå (hjältens egen)
 'rosa':   ['#5a1a34', '#8a2e56', '#b8467a', '#e07aa6', '#f6b4ce'],   # Tant Rosas klänning
 'vit':    ['#6e747f', '#b8bec6', '#dce0e4', '#eeeff4', '#ffffff'],
 'stra':   ['#7a522c', '#9a7a20', '#d8a85a', '#e8d07a', '#fff0b0'],   # stråhatten
 'gul':    ['#4a3a10', '#b8901e', '#f2c94a', '#f4dc64', '#fff0a8'],   # oljerocken och sydvästen
 'kjol':   ['#123a2a', '#1e4a24', '#3e7a52', '#5e9e70', '#84be90'],
 'rod':    ['#4a1010', '#8a2420', '#c23a2e', '#e86a5a', '#f69a84'],
 'gra':    ['#4a525c', '#8e949e', '#b8bec6', '#dce0e4', '#eeeff4'],   # fiskarens skägg
 'stovel': ['#0e0e12', '#2a2830', '#34343c', '#4a4a54', '#6e6e80'],
 'jacka':  ['#0e1a50', '#1a3290', '#2a52c8', '#4f7ae8', '#9ab6ff'],
 'brun':   ['#24160c', '#5a3c26', '#7a5638', '#9c7450', '#c49a72'],
 'blus':   ['#4a5a7a', '#7a8ca8', '#a0b4d0', '#bfe3ef', '#e8f2fa'],
})
OGA = '#101c1c'; GLIMT = '#ffffff'; KIND = '#e8909a'

def skilj(d, fram, bak, ton=1):
    """Där en främre del möter en bakre blir den bakres kant en skuggton (inre linje)."""
    for (x, y), nm in list(d.del_.items()):
        if nm == bak:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if d.del_.get((x + dx, y + dy)) == fram:
                    m, t = d.px[(x, y)]; d.px[(x, y)] = (m, min(t, ton)); break
def kant_ned(d, namn, y, ton=0):
    """Nederkanten på en del (fållen) i mörkaste tonen."""
    for (x, yy), nm in list(d.del_.items()):
        if nm == namn and yy == y: d.px[(x, yy)] = (d.px[(x, yy)][0], ton)

# ---------- ansiktet: samma folk som hjälten ----------
def ogon_fram(d, cx, y, avst=2):
    for x in (cx - avst, cx + avst):
        d.fast(x, y, GLIMT); d.fast(x, y + 1, OGA)
def leende_fram(d, cx, y, brett=2):
    d.fast(cx - brett - 1, y, OGA); d.fast(cx + brett, y, OGA)
    for x in range(cx - brett, cx + brett): d.fast(x, y + 1, OGA)
def ogon_sida(d, x, y):
    d.fast(x, y, GLIMT); d.fast(x, y + 1, OGA)
def leende_sida(d, x, y):
    d.fast(x, y, OGA); d.fast(x + 1, y + 1, OGA) if False else None
    d.fast(x - 1, y + 1, OGA); d.fast(x, y + 1, OGA); d.fast(x + 1, y, OGA)

# =====================================================================================
# TANT ROSA, 24 x 24: stor stråhatt med rosa band och blomma, vita lockar, rosiga kinder,
# rund kropp i lång rosa klänning med puffärmar och vitt förkläde. Inga ben syns.
# =====================================================================================
def rosa_klanning(d, cx, sida=False):
    k = (lambda x, y: y <= 22)
    d.ellips(cx, 19.4, 6.6 if not sida else 5.6, 4.6, 'rosa', 'klanning', klipp=k)
    d.ellips(cx, 15.2, 3.9 if not sida else 3.4, 2.6, 'rosa', 'liv')
def rosa_fram():
    d = Duk(24, 24)
    for cx in (10.4, 13.6): d.ellips(cx, 22.6, 1.5, 0.9, 'brun', 'sko', toner=(0, 1, 1, 2))
    rosa_klanning(d, 12)
    d.ellips(12, 19.0, 2.7, 3.4, 'vit', 'forklade', klipp=lambda x, y: 16 <= y <= 21, zbias=0.1)
    for cx in (7.0, 17.0): d.ellips(cx, 14.8, 2.0, 1.8, 'rosa', 'arm', zbias=0.05)
    for cx in (7.2, 16.8): d.ellips(cx, 17.2, 1.0, 1.0, 'ockra', 'hand')
    d.ellips(12, 10.0, 6.2, 5.4, 'ockra', 'huvud', zbias=0.22)
    for (cx, cy) in ((6.6, 10.4), (6.4, 12.6), (17.4, 10.4), (17.6, 12.6)):
        d.ellips(cx, cy, 1.5, 1.3, 'vit', 'lock', zbias=0.1)
    d.ellips(12, 5.4, 9.4, 1.7, 'stra', 'bratte', zbias=0.15, platt=0.5)
    d.ellips(12, 3.2, 4.2, 2.7, 'stra', 'krona', zbias=-0.05)
    skilj(d, 'liv', 'klanning'); skilj(d, 'arm', 'liv'); skilj(d, 'forklade', 'klanning')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud', ton=1); skilj(d, 'lock', 'huvud')
    kant_ned(d, 'klanning', 22, 1)
    d.kontur()
    for x in range(8, 17):                                   # det rosa bandet runt kronan
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'rosa', 3 if x < 12 else 2)
        if d.del_.get((x, 3)) == 'krona' and x in (9, 15): d.satt(x, 3, 'rosa', 2)
    for (x, y, c) in ((15, 3, '#f6b4ce'), (16, 3, '#e07aa6'), (15, 2, '#e07aa6'), (16, 4, '#b8467a'), (14, 3, '#f6b4ce')):
        d.fast(x, y, c)
    d.fast(15, 3, '#f2d22e')                                 # blomman, med gult hjärta
    for x in (9, 11, 13, 15):                                # vågorna i klänningen
        d.satt(x, 20, 'rosa', 3) if d.del_.get((x, 20)) == 'klanning' else None
    for x in (10, 12, 14): d.satt(x, 16, 'vit', 4) if d.del_.get((x, 16)) == 'forklade' else None   # förklädets krås
    ogon_fram(d, 12, 9)
    d.fast(8, 11, KIND); d.fast(16, 11, KIND)
    leende_fram(d, 12, 11, brett=2)
    return d.bild()
def rosa_hoger():
    d = Duk(24, 24)
    d.ellips(10.6, 22.6, 1.4, 0.9, 'brun', 'skob', toner=(0, 1, 1, 2))
    d.ellips(13.6, 22.7, 1.7, 0.9, 'brun', 'sko', toner=(0, 1, 1, 2))
    rosa_klanning(d, 11.6, sida=True)
    d.ellips(15.2, 18.6, 1.6, 3.2, 'vit', 'forklade', klipp=lambda x, y: 16 <= y <= 21, zbias=0.1)
    d.ellips(11.8, 10.0, 6.0, 5.4, 'ockra', 'huvud', zbias=0.22)
    d.ellips(16.9, 10.8, 0.9, 0.9, 'ockra', 'nos', zbias=0.3)
    for (cx, cy) in ((7.0, 10.6), (7.2, 12.8), (8.6, 13.4)): d.ellips(cx, cy, 1.6, 1.3, 'vit', 'lock', zbias=0.1)
    d.ellips(12.6, 15.0, 1.9, 1.8, 'rosa', 'arm', zbias=0.05)
    d.ellips(13.4, 17.2, 1.0, 1.0, 'ockra', 'hand')
    d.ellips(11.6, 5.4, 9.2, 1.6, 'stra', 'bratte', zbias=0.15, platt=0.5)
    d.ellips(11.2, 3.2, 4.0, 2.7, 'stra', 'krona', zbias=-0.05)
    skilj(d, 'liv', 'klanning'); skilj(d, 'arm', 'liv'); skilj(d, 'forklade', 'klanning')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud', ton=1); skilj(d, 'lock', 'huvud')
    kant_ned(d, 'klanning', 22, 1)
    d.kontur()
    for x in range(7, 16):
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'rosa', 3 if x < 11 else 2)
    for (x, y, c) in ((8, 3, '#f6b4ce'), (8, 2, '#e07aa6'), (9, 3, '#e07aa6'), (8, 4, '#b8467a')): d.fast(x, y, c)
    d.fast(8, 3, '#f2d22e')                                  # blomman sitter på vänster sida, syns bakom
    for x in (8, 10, 12): d.satt(x, 20, 'rosa', 3) if d.del_.get((x, 20)) == 'klanning' else None
    ogon_sida(d, 15, 9)
    d.fast(14, 11, KIND)
    d.fast(15, 12, OGA); d.fast(16, 12, OGA); d.fast(17, 11, OGA)
    return d.bild()
def rosa_upp():
    d = Duk(24, 24)
    for cx in (10.4, 13.6): d.ellips(cx, 22.6, 1.5, 0.9, 'brun', 'sko', toner=(0, 1, 1, 2))
    rosa_klanning(d, 12)
    for cx in (7.0, 17.0): d.ellips(cx, 14.8, 2.0, 1.8, 'rosa', 'arm', zbias=0.05)
    for cx in (7.2, 16.8): d.ellips(cx, 17.2, 1.0, 1.0, 'ockra', 'hand')
    d.ellips(12, 10.0, 6.2, 5.4, 'vit', 'har', zbias=0.1)                # bakifrån: bara vita lockar under hatten
    d.ellips(12, 12.2, 2.2, 1.7, 'vit', 'knut', zbias=0.25)              # och en knut i nacken               # och en knut
    d.ellips(12, 5.4, 9.4, 1.7, 'stra', 'bratte', zbias=0.15, platt=0.5)
    d.ellips(12, 3.2, 4.2, 2.7, 'stra', 'krona', zbias=-0.05)
    d.ellips(12, 17.0, 2.0, 1.1, 'vit', 'rosett', zbias=0.2)              # förklädets rosett på ryggen
    skilj(d, 'liv', 'klanning'); skilj(d, 'arm', 'liv'); skilj(d, 'krona', 'bratte')
    skilj(d, 'knut', 'har'); skilj(d, 'rosett', 'liv')
    kant_ned(d, 'klanning', 22, 1)
    d.kontur()
    for x in range(8, 17):
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'rosa', 3 if x < 12 else 2)
    for (x, y) in ((11, 18), (13, 18), (11, 19), (13, 19)): d.satt(x, y, 'vit', 2)   # rosettens band
    for (x, y), nm in list(d.del_.items()):                              # lockarna: små bågar i rader
        if nm == 'har' and (x + 2 * (y // 2)) % 4 == 0 and y % 2 == 0: d.satt(x, y, 'vit', 1)
        elif nm == 'har' and (x + 2 * (y // 2)) % 4 == 1 and y % 2 == 0: d.satt(x, y, 'vit', 4)
    for x in (9, 11, 13, 15): d.satt(x, 20, 'rosa', 3) if d.del_.get((x, 20)) == 'klanning' else None
    return d.bild()

# =====================================================================================
# FISKAREN, 16 x 24: gul sydväst med långt nackskydd, lång gul oljerock, grått skägg, svarta stövlar.
# =====================================================================================
def fisk_fram():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.0, 1.9, 1.2, 'stovel', 'sko', toner=(0, 1, 2, 3))
    d.ellips(8, 16.8, 4.8, 4.8, 'gul', 'rock', klipp=lambda x, y: y <= 21)
    for cx in (3.1, 12.9): d.ellips(cx, 15.8, 1.4, 2.6, 'gul', 'arm')
    for cx in (3.1, 12.9): d.ellips(cx, 18.4, 1.0, 0.9, 'gron', 'hand')
    d.ellips(8, 8.8, 5.8, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(8, 13.4, 3.4, 1.7, 'gra', 'skagg', toner=(1, 1, 2, 3), zbias=0.15)
    d.ellips(8, 5.2, 7.4, 1.6, 'gul', 'bratte', zbias=0.1, platt=0.5)
    d.ellips(8, 3.0, 4.8, 2.8, 'gul', 'hatt', zbias=-0.05)
    skilj(d, 'skagg', 'rock'); skilj(d, 'arm', 'rock'); skilj(d, 'hatt', 'bratte'); skilj(d, 'bratte', 'huvud')
    kant_ned(d, 'rock', 21, 1)
    d.kontur()
    for y in (15, 17, 19): d.satt(8, y, 'gul', 0)                       # knapparna
    for y in range(14, 21): d.satt(9, y, 'gul', 1) if d.del_.get((9, y)) == 'rock' else None   # rockens kant
    ogon_fram(d, 8, 8)
    leende_fram(d, 8, 11, brett=2)
    for (x, y, c) in ((11, 12, '#7a5638'), (12, 12, '#5a3c26'), (12, 11, '#9c7450'), (13, 11, '#5a3c26'), (12, 10, '#b8bec6')):
        d.fast(x, y, c)                                                  # pipan i mungipan, med en rökpuff
    return d.bild()
def fisk_hoger():
    d = Duk(16, 24)
    d.ellips(7.0, 22.0, 1.9, 1.1, 'stovel', 'skob', toner=(0, 1, 2, 3))
    d.ellips(9.0, 22.1, 2.1, 1.2, 'stovel', 'sko', toner=(0, 1, 2, 3))
    d.ellips(7.8, 16.8, 4.0, 4.8, 'gul', 'rock', klipp=lambda x, y: y <= 21)
    d.ellips(8.4, 8.8, 5.6, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(13.6, 9.8, 0.9, 0.9, 'gron', 'nos', zbias=0.3)
    d.ellips(10.4, 13.2, 2.6, 1.6, 'gra', 'skagg', toner=(1, 1, 2, 3), zbias=0.15)
    d.ellips(3.6, 9.0, 2.2, 3.2, 'gul', 'nacke', zbias=0.0)            # sydvästens nackskydd
    d.ellips(9.0, 15.8, 1.4, 2.6, 'gul', 'arm')
    d.ellips(9.4, 18.4, 1.0, 0.9, 'gron', 'hand')
    d.ellips(7.6, 5.2, 7.0, 1.5, 'gul', 'bratte', zbias=0.1, platt=0.5)
    d.ellips(7.6, 3.0, 4.6, 2.8, 'gul', 'hatt', zbias=-0.05)
    skilj(d, 'skagg', 'rock'); skilj(d, 'arm', 'rock'); skilj(d, 'hatt', 'bratte'); skilj(d, 'bratte', 'huvud')
    skilj(d, 'nacke', 'huvud'); skilj(d, 'bratte', 'nacke')
    kant_ned(d, 'rock', 21, 1)
    d.kontur()
    ogon_sida(d, 11, 8)
    leende_sida(d, 12, 11)
    for (x, y, c) in ((13, 12, '#7a5638'), (14, 12, '#5a3c26'), (14, 11, '#9c7450'), (15, 11, '#5a3c26'), (14, 10, '#b8bec6')):
        d.fast(x, y, c)
    return d.bild()
def fisk_upp():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.0, 1.9, 1.2, 'stovel', 'sko', toner=(0, 1, 2, 3))
    d.ellips(8, 16.8, 4.8, 4.8, 'gul', 'rock', klipp=lambda x, y: y <= 21)
    for cx in (3.1, 12.9): d.ellips(cx, 15.8, 1.4, 2.6, 'gul', 'arm')
    for cx in (3.1, 12.9): d.ellips(cx, 18.4, 1.0, 0.9, 'gron', 'hand')
    d.ellips(8, 8.8, 5.8, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(8, 9.6, 5.6, 3.4, 'gul', 'nacke', zbias=0.0)              # nackskyddet täcker nacken
    d.ellips(8, 5.2, 7.4, 1.6, 'gul', 'bratte', zbias=0.1, platt=0.5)
    d.ellips(8, 3.0, 4.8, 2.8, 'gul', 'hatt', zbias=-0.05)
    skilj(d, 'arm', 'rock'); skilj(d, 'hatt', 'bratte'); skilj(d, 'bratte', 'nacke'); skilj(d, 'nacke', 'rock')
    kant_ned(d, 'rock', 21, 1)
    d.kontur()
    for y in range(14, 21): d.satt(8, y, 'gul', 1) if d.del_.get((8, y)) == 'rock' else None   # sömmen
    return d.bild()

# =====================================================================================
# TVÄTTERSKAN, 16 x 24: rosa huvudduk med vita prickar (vassbyns rosa; blått och ränder är flodfolkets, 81.3), ljus blus med uppkavlade ärmar,
# vid grön kjol ända ned. Lila hud.
# =====================================================================================
def tvatt_fram():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.8, 1.5, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.8, 4.0, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 6.9, 7.6, 'kjol', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    for cx in (3.6, 12.4): d.ellips(cx, 14.2, 1.5, 1.3, 'vit', 'arm')
    for cx in (3.3, 12.7): d.ellips(cx, 16.4, 1.0, 1.4, 'lila', 'hand')
    d.ellips(8, 8.8, 5.8, 5.0, 'lila', 'huvud', zbias=0.22)
    d.ellips(8, 7.4, 6.4, 6.6, 'rosa', 'duk', klipp=lambda x, y: y <= 5 or ((x <= 3 or x >= 12) and y <= 11), zbias=-0.05)
    skilj(d, 'kropp', 'kjol', ton=1); skilj(d, 'arm', 'kropp'); skilj(d, 'duk', 'huvud')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    for (x, y) in ((5, 2), (8, 1), (11, 3), (6, 5), (9, 4), (3, 5), (12, 5)):
        if d.del_.get((x, y)) == 'duk': d.satt(x, y, 'vit', 4)
    for (x, y) in ((5, 19), (5, 20), (4, 21), (10, 19), (10, 20), (11, 21)):  # kjolens två veck
        if d.del_.get((x, y)) == 'kjol': d.satt(x, y, 'kjol', 1)
    for x in range(4, 13): d.satt(x, 17, 'kjol', 3) if d.del_.get((x, 17)) == 'kjol' and x < 9 else None
    ogon_fram(d, 8, 8)
    leende_fram(d, 8, 11, brett=2)
    return d.bild()
def tvatt_hoger():
    d = Duk(16, 24)
    d.ellips(7.0, 22.8, 1.5, 0.8, 'brun', 'skob', toner=(0, 1, 1, 2))
    d.ellips(9.6, 22.8, 1.6, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.8, 3.4, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 5.8, 7.6, 'kjol', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    d.ellips(8.4, 8.8, 5.6, 5.0, 'lila', 'huvud', zbias=0.22)
    d.ellips(13.6, 9.8, 0.9, 0.9, 'lila', 'nos', zbias=0.3)
    d.ellips(7.6, 7.4, 6.2, 6.6, 'rosa', 'duk', klipp=lambda x, y: y <= 5 or (x <= 6 and y <= 11), zbias=-0.05)
    d.ellips(3.2, 9.6, 1.5, 1.3, 'rosa', 'knut', zbias=0.2)
    d.ellips(9.0, 14.2, 1.4, 1.3, 'vit', 'arm')
    d.ellips(9.4, 16.4, 1.0, 1.3, 'lila', 'hand')
    skilj(d, 'kropp', 'kjol', ton=1); skilj(d, 'arm', 'kropp'); skilj(d, 'duk', 'huvud'); skilj(d, 'knut', 'duk')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    for (x, y) in ((5, 2), (8, 1), (10, 3), (3, 7), (7, 4), (2, 9)):
        if d.del_.get((x, y)) == 'duk': d.satt(x, y, 'vit', 4)
    for (x, y) in ((6, 19), (6, 20), (5, 21), (10, 19), (10, 20), (11, 21)):
        if d.del_.get((x, y)) == 'kjol': d.satt(x, y, 'kjol', 1)
    ogon_sida(d, 11, 8)
    leende_sida(d, 12, 11)
    return d.bild()
def tvatt_upp():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.8, 1.5, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.8, 4.0, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 6.9, 7.6, 'kjol', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    for cx in (3.6, 12.4): d.ellips(cx, 14.2, 1.5, 1.3, 'vit', 'arm')
    for cx in (3.3, 12.7): d.ellips(cx, 16.4, 1.0, 1.4, 'lila', 'hand')
    d.ellips(8, 8.8, 5.8, 5.0, 'lila', 'huvud', zbias=0.22)
    d.ellips(8, 7.2, 6.0, 4.6, 'rosa', 'duk', klipp=lambda x, y: y <= 11, zbias=-0.05)  # duken täcker bakhuvudet
    d.ellips(8, 11.6, 1.4, 1.0, 'rosa', 'knut', zbias=0.2)
    skilj(d, 'kropp', 'kjol', ton=1); skilj(d, 'arm', 'kropp'); skilj(d, 'duk', 'huvud'); skilj(d, 'knut', 'duk')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    for (x, y) in ((5, 4), (8, 3), (11, 5), (6, 8), (9, 7), (4, 9), (12, 9), (10, 10)):
        if d.del_.get((x, y)) == 'duk': d.satt(x, y, 'vit', 4)
    for (x, y) in ((6, 13), (10, 13)): d.satt(x, y, 'rosa', 1)   # knutens snibbar
    for (x, y) in ((5, 19), (5, 20), (4, 21), (10, 19), (10, 20), (11, 21)):
        if d.del_.get((x, y)) == 'kjol': d.satt(x, y, 'kjol', 1)
    return d.bild()

# =====================================================================================
# BARNET, 16 x 24 (kortare, ca 20 hög): röd keps, gul tröja, bruna byxor. Blå hud.
# =====================================================================================
def barn_fram():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.2, 1.6, 1.0, 'brun', 'sko', toner=(0, 1, 1, 2))
    for cx in (6.2, 9.8): d.ellips(cx, 20.6, 1.0, 1.0, 'blahud', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 19.0, 3.2, 1.3, 'brun', 'byxa')
    d.ellips(8, 16.8, 3.6, 2.5, 'gul', 'kropp')
    for cx in (3.6, 12.4): d.ellips(cx, 16.4, 1.2, 1.8, 'gul', 'arm')
    for cx in (3.6, 12.4): d.ellips(cx, 18.4, 0.9, 0.9, 'blahud', 'hand')
    d.ellips(8, 10.0, 5.8, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(8, 7.4, 5.8, 3.6, 'rod', 'keps', klipp=lambda x, y: y <= 8, zbias=-0.05)
    d.ellips(8, 8.8, 4.0, 1.0, 'rod', 'skarm', toner=(0, 1, 1, 2), zbias=0.3)
    skilj(d, 'kropp', 'byxa', 0); skilj(d, 'arm', 'kropp'); skilj(d, 'skarm', 'keps'); skilj(d, 'skarm', 'huvud', 1)
    d.kontur()
    d.satt(8, 4, 'vit', 4)                                              # knappen på kepsen
    ogon_fram(d, 8, 10)
    leende_fram(d, 8, 12, brett=2)
    return d.bild()
def barn_hoger():
    d = Duk(16, 24)
    d.ellips(7.0, 22.2, 1.5, 0.9, 'brun', 'skob', toner=(0, 1, 1, 2))
    d.ellips(9.4, 22.3, 1.7, 1.0, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(7.2, 20.6, 0.9, 1.0, 'blahud', 'benb', toner=(1, 2, 2, 3))
    d.ellips(8.8, 20.6, 1.0, 1.0, 'blahud', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 19.0, 2.6, 1.3, 'brun', 'byxa')
    d.ellips(8, 16.8, 3.0, 2.5, 'gul', 'kropp')
    d.ellips(8.4, 10.0, 5.6, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(13.6, 11.0, 0.9, 0.9, 'blahud', 'nos', zbias=0.3)
    d.ellips(7.6, 7.4, 5.6, 3.6, 'rod', 'keps', klipp=lambda x, y: y <= 8, zbias=-0.05)
    d.ellips(13.0, 8.4, 2.6, 0.9, 'rod', 'skarm', toner=(0, 1, 1, 2), zbias=0.3)
    d.ellips(8.8, 16.6, 1.2, 1.8, 'gul', 'arm')
    d.ellips(9.0, 18.6, 0.9, 0.9, 'blahud', 'hand')
    skilj(d, 'kropp', 'byxa', 0); skilj(d, 'arm', 'kropp'); skilj(d, 'skarm', 'keps'); skilj(d, 'skarm', 'huvud', 1)
    d.kontur()
    ogon_sida(d, 11, 10)
    leende_sida(d, 12, 12)
    return d.bild()
def barn_upp():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.2, 1.6, 1.0, 'brun', 'sko', toner=(0, 1, 1, 2))
    for cx in (6.2, 9.8): d.ellips(cx, 20.6, 1.0, 1.0, 'blahud', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 19.0, 3.2, 1.3, 'brun', 'byxa')
    d.ellips(8, 16.8, 3.6, 2.5, 'gul', 'kropp')
    for cx in (3.6, 12.4): d.ellips(cx, 16.4, 1.2, 1.8, 'gul', 'arm')
    for cx in (3.6, 12.4): d.ellips(cx, 18.4, 0.9, 0.9, 'blahud', 'hand')
    d.ellips(8, 10.0, 5.8, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(8, 7.6, 5.8, 3.8, 'rod', 'keps', klipp=lambda x, y: y <= 9, zbias=-0.05)
    skilj(d, 'kropp', 'byxa', 0); skilj(d, 'arm', 'kropp'); skilj(d, 'keps', 'huvud')
    d.kontur()
    for x in (6, 7, 8, 9, 10): d.satt(x, 9, 'rod', 1)                    # bandet bak på kepsen
    d.satt(8, 9, 'vit', 2); d.satt(8, 4, 'vit', 4)
    return d.bild()

# =====================================================================================
# BO, 16 x 24 (kortare): röd stickad mössa med vit tofs (inga ränder: de är flodfolkets, 81.3), blå jacka, för stora röda gummistövlar. Grön hud.
# =====================================================================================
def bo_fram():
    d = Duk(16, 24)
    for cx in (5.0, 11.0): d.ellips(cx, 21.0, 2.7, 2.6, 'rod', 'stovel', klipp=lambda x, y: y <= 22)
    d.ellips(8, 16.6, 4.0, 2.8, 'jacka', 'kropp')
    for cx in (3.2, 12.8): d.ellips(cx, 16.2, 1.2, 2.0, 'jacka', 'arm')
    for cx in (3.2, 12.8): d.ellips(cx, 18.4, 0.9, 0.9, 'gron', 'hand')
    d.ellips(8, 10.0, 5.8, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(8, 7.0, 5.6, 3.6, 'rod', 'mossa', klipp=lambda x, y: y <= 7, zbias=-0.05)
    d.ellips(8, 1.8, 1.6, 1.4, 'vit', 'tofs', zbias=0.2)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'stovel', 1); skilj(d, 'mossa', 'huvud'); skilj(d, 'tofs', 'mossa')
    kant_ned(d, 'stovel', 22, 0)
    d.kontur()
    for cx in (5, 11):                                                    # stövlarnas skaft och glans
        for x in range(cx - 2, cx + 3):
            if d.del_.get((x, 19)) == 'stovel': d.satt(x, 19, 'rod', 1)
        d.satt(cx - 1, 20, 'rod', 4)
    d.satt(8, 15, 'jacka', 4); d.satt(8, 17, 'jacka', 4)                  # knapparna
    ogon_fram(d, 8, 10)
    leende_fram(d, 8, 12, brett=1)
    return d.bild()
def bo_hoger():
    d = Duk(16, 24)
    d.ellips(6.4, 21.0, 2.5, 2.5, 'rod', 'stovelb', klipp=lambda x, y: y <= 22)
    d.ellips(9.4, 21.2, 3.0, 2.5, 'rod', 'stovel', klipp=lambda x, y: y <= 22)
    d.ellips(7.8, 16.6, 3.4, 2.8, 'jacka', 'kropp')
    d.ellips(8.4, 10.0, 5.6, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(13.6, 11.0, 0.9, 0.9, 'gron', 'nos', zbias=0.3)
    d.ellips(7.6, 7.0, 5.4, 3.6, 'rod', 'mossa', klipp=lambda x, y: y <= 7, zbias=-0.05)
    d.ellips(5.6, 2.2, 1.6, 1.4, 'vit', 'tofs', zbias=0.2)
    d.ellips(8.8, 16.4, 1.2, 2.0, 'jacka', 'arm')
    d.ellips(9.0, 18.6, 0.9, 0.9, 'gron', 'hand')
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'stovel', 1); skilj(d, 'stovel', 'stovelb', 1)
    skilj(d, 'mossa', 'huvud'); skilj(d, 'tofs', 'mossa')
    kant_ned(d, 'stovel', 22, 0); kant_ned(d, 'stovelb', 22, 0)
    d.kontur()
    d.satt(8, 20, 'rod', 4); d.satt(9, 20, 'rod', 4)
    ogon_sida(d, 11, 10)
    leende_sida(d, 12, 12)
    return d.bild()
def bo_upp():
    d = Duk(16, 24)
    for cx in (5.0, 11.0): d.ellips(cx, 21.0, 2.7, 2.6, 'rod', 'stovel', klipp=lambda x, y: y <= 22)
    d.ellips(8, 16.6, 4.0, 2.8, 'jacka', 'kropp')
    for cx in (3.2, 12.8): d.ellips(cx, 16.2, 1.2, 2.0, 'jacka', 'arm')
    for cx in (3.2, 12.8): d.ellips(cx, 18.4, 0.9, 0.9, 'gron', 'hand')
    d.ellips(8, 10.0, 5.8, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(8, 7.8, 5.6, 4.2, 'rod', 'mossa', klipp=lambda x, y: y <= 10, zbias=-0.05)
    d.ellips(8, 1.8, 1.6, 1.4, 'vit', 'tofs', zbias=0.2)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'stovel', 1); skilj(d, 'mossa', 'huvud'); skilj(d, 'tofs', 'mossa')
    kant_ned(d, 'stovel', 22, 0)
    d.kontur()
    for y in range(15, 19): d.satt(8, y, 'jacka', 1)                       # sömmen i ryggen
    return d.bild()

FIGURER = {
    'tant_rosa': (rosa_fram, rosa_hoger, rosa_upp),
    'fiskaren': (fisk_fram, fisk_hoger, fisk_upp),
    'tvatterskan': (tvatt_fram, tvatt_hoger, tvatt_upp),
    'barnet': (barn_fram, barn_hoger, barn_upp),
    'bo': (bo_fram, bo_hoger, bo_upp),
}
def alla():
    ut = {}
    for namn, (f, h, u) in FIGURER.items():
        hh = h()
        ut[namn] = {'ner': f(), 'hoger': hh, 'vanster': hh.transpose(Image.FLIP_LEFT_RIGHT), 'upp': u()}
    return ut

# ---------- gången: samma överkropp, bara fötterna (och fållen) rör sig, som hjältens (10b) ----------
# Bild 1 och 3 är grundställningen. Bild 2 och 4 är steg. Framifrån och bakifrån lyfts en fot en pixel,
# från sidan går fötterna isär. Kjolar och klänningar svänger en halv pixel åt sidan.
FOTTER = {'sko', 'skob', 'ben', 'benb', 'stovel', 'stovelb'}
FALL = {'klanning', 'kjol'}
ANIM = {'vy': None, 'bild': 1, 'bredd': 16}
_ellips = Duk.ellips
def _ellips_gang(s, cx, cy, rx, ry, mat, namn, *a, **k):
    vy, b = ANIM['vy'], ANIM['bild']
    if vy and b in (2, 4):
        if namn in FOTTER:
            if vy == 'fram':
                vanster = cx < s.w / 2
                if (b == 2 and vanster) or (b == 4 and not vanster): cy -= 1.0
            else:
                fram = not namn.endswith('b')
                cx += (1.4 if fram else -1.4) * (1 if b == 2 else -0.6)
                if b == 4 and fram: cy -= 0.6
        elif namn in FALL:
            cx += 0.6 if b == 2 else -0.6
    return _ellips(s, cx, cy, rx, ry, mat, namn, *a, **k)
Duk.ellips = _ellips_gang
def gang():
    """{namn: {riktning: [bild1..bild4]}}"""
    ut = {}
    for namn, (f, h, u) in FIGURER.items():
        ut[namn] = {}
        for rikt, fn, vy in (('ner', f, 'fram'), ('hoger', h, 'sida'), ('upp', u, 'fram')):
            bilder = []
            for b in (1, 2, 3, 4):
                ANIM['vy'], ANIM['bild'] = vy, b
                bilder.append(fn())
            ut[namn][rikt] = bilder
        ut[namn]['vanster'] = [im.transpose(Image.FLIP_LEFT_RIGHT) for im in ut[namn]['hoger']]
    ANIM['vy'] = None
    return ut
