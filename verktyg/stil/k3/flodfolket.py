# Kapitel 3 (beslut 100.6): flodfolket och skepparen, grundställning åt fyra håll och gången.
# Samma folk som hjälten (runt huvud, ögon med glimt, brett leende, hans hudval), ritade enligt *Så ritas allt* (10b):
# snett uppifrån, ljus uppifrån till vänster, fyra toner per material, kontur i materialets mörka ton.
# Flodfolkets kännetecken (16 §9, 81.3, 81.6): blå och vita tvärränder 2 px, platta hattar med blått band
# (inte alla bär hatt, och aldrig ockra hud med halmhatt), flodsten, drivved och mässing. Inget rosa, inget orange.
#   skepparen      16 x 24  ung, lång och smal: platt hatt, randig tröja, röd halsduk, mörka byxor, inget skägg
#   flodbo_frukost 16 x 24  kvinna med knut, randig blus och lång marinblå kjol (blåser frukosthornet)
#   flodbo_skrattar 16 x 24 rund, blå mössa, randig väst över vit skjorta (skrattar åt skepparen)
#   flodman        16 x 24  bred, platt hatt, randig tröja och brun väst av drivvedsfärg (ropar ahoj!)
import os, sys
HAR = '/home/claude/k3'; os.chdir(HAR)
exec(open('/home/claude/bybor/bybor.py').read().split('# ---------- gången')[0].replace("exec(open('pix.py').read())", "exec(open('/home/claude/k3/pix.py').read())").replace("HAR = os.path.dirname(os.path.abspath(__file__))\nos.chdir(HAR)", ''))
MAT.update({
 'blek':   ['#7a522c', '#d8a85a', '#e8d07a', '#fff0b0', '#ffffff'],   # blekt halm (inte Tant Rosas gula strå)
 'marin':  ['#0e1a50', '#1a3290', '#2a52c8', '#4f7ae8', '#9ab6ff'],
 'byxa':   ['#0e0e12', '#1e1e24', '#2a2e38', '#3a3a48', '#6e6e80'],
 'har':    ['#24160c', '#3a2414', '#5a3c26', '#7a5638', '#9c7450'],
})

def rander(d, delar, y0=0, bredd=2, bort=()):
    """Blå och vita tvärränder (2 px) på de delar som är vita: var annan rad-par blir marinblå."""
    for (x, y), nm in list(d.del_.items()):
        if nm in delar and ((y - y0) // bredd) % 2 == 1 and d.px[(x, y)][0] == 'vit':
            t = d.px[(x, y)][1]
            d.satt(x, y, 'marin', {0: 0, 1: 1, 2: 2, 3: 3, 4: 3}[t])

# =====================================================================================
# SKEPPAREN: ung och lång. Huvudet sitter högt och lite smalare, benen syns långa.
# =====================================================================================
SK = {'hud': 'lila'}
def sk_fram(hatt=True):
    d = Duk(16, 24); hud = SK['hud']
    for cx in (6.2, 9.8): d.ellips(cx, 22.6, 1.6, 0.9, 'brun', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.4, 9.6): d.ellips(cx, 19.4, 1.3, 3.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 14.2, 3.6, 3.4, 'vit', 'kropp')
    for cx in (3.8, 12.2): d.ellips(cx, 14.0, 1.2, 2.8, 'vit', 'arm')
    for cx in (3.8, 12.2): d.ellips(cx, 16.8, 0.9, 0.9, hud, 'hand')
    d.ellips(8, 7.0, 5.2, 4.7, hud, 'huvud', zbias=0.22)
    d.ellips(8, 11.4, 2.6, 1.0, 'rod', 'halsduk', zbias=0.25)
    if hatt:
        d.ellips(8, 3.6, 7.6, 1.4, 'blek', 'bratte', zbias=0.2, platt=0.6)
        d.ellips(8, 1.8, 4.0, 1.9, 'blek', 'krona', zbias=-0.05, klipp=lambda x, y: y >= 0)
    else:
        d.ellips(8, 3.2, 5.0, 2.6, 'har', 'harr', zbias=0.1, klipp=lambda x, y: y <= 4)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'halsduk', 'kropp')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud'); skilj(d, 'harr', 'huvud')
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    if hatt:
        for x in range(4, 13):
            if d.del_.get((x, 2)) == 'krona': d.satt(x, 2, 'marin', 2 if x > 7 else 3)
        for x in (5, 6): d.fast(x, 5, '#3a2414')                          # en lugg under brättet
    d.fast(11, 12, '#8a2420'); d.fast(11, 13, '#c23a2e')                  # halsdukens snibb
    ogon_fram(d, 8, 6 if hatt else 6); leende_fram(d, 8, 9, 1)
    return d.bild()
def sk_hoger(hatt=True):
    d = Duk(16, 24); hud = SK['hud']
    d.ellips(7.0, 22.6, 1.5, 0.9, 'brun', 'skob', toner=(0, 1, 2, 3))
    d.ellips(9.6, 22.7, 1.8, 0.9, 'brun', 'sko', toner=(0, 1, 2, 3))
    d.ellips(7.2, 19.4, 1.2, 3.0, 'byxa', 'benb', toner=(1, 1, 2, 2))
    d.ellips(8.8, 19.4, 1.3, 3.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 14.2, 3.0, 3.4, 'vit', 'kropp')
    d.ellips(8.4, 7.0, 5.0, 4.7, hud, 'huvud', zbias=0.22)
    d.ellips(13.1, 7.8, 0.9, 0.9, hud, 'nos', zbias=0.3)
    d.ellips(9.4, 11.3, 2.0, 1.0, 'rod', 'halsduk', zbias=0.25)
    d.ellips(8.8, 14.0, 1.2, 2.8, 'vit', 'arm')
    d.ellips(9.0, 16.8, 0.9, 0.9, hud, 'hand')
    if hatt:
        d.ellips(7.8, 3.6, 7.2, 1.3, 'blek', 'bratte', zbias=0.2, platt=0.6)
        d.ellips(7.6, 1.8, 3.8, 1.9, 'blek', 'krona', zbias=-0.05)
    else:
        d.ellips(7.4, 3.4, 4.8, 2.8, 'har', 'harr', zbias=0.1, klipp=lambda x, y: y <= 4 or x <= 5)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'kropp', 'benb', 0); skilj(d, 'halsduk', 'kropp')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud'); skilj(d, 'harr', 'huvud')
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    if hatt:
        for x in range(3, 12):
            if d.del_.get((x, 2)) == 'krona': d.satt(x, 2, 'marin', 2 if x > 6 else 3)
        d.fast(4, 5, '#3a2414'); d.fast(4, 6, '#3a2414')
    d.fast(7, 12, '#8a2420')
    ogon_sida(d, 11, 6); leende_sida(d, 12, 9)
    return d.bild()
def sk_upp(hatt=True):
    d = Duk(16, 24); hud = SK['hud']
    for cx in (6.2, 9.8): d.ellips(cx, 22.6, 1.6, 0.9, 'brun', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.4, 9.6): d.ellips(cx, 19.4, 1.3, 3.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 14.2, 3.6, 3.4, 'vit', 'kropp')
    for cx in (3.8, 12.2): d.ellips(cx, 14.0, 1.2, 2.8, 'vit', 'arm')
    for cx in (3.8, 12.2): d.ellips(cx, 16.8, 0.9, 0.9, hud, 'hand')
    d.ellips(8, 7.0, 5.2, 4.7, 'har', 'harr', zbias=0.12)               # bakhuvudet: mörkt hår
    d.ellips(8, 11.2, 2.4, 0.9, 'rod', 'halsduk', zbias=0.2)
    if hatt:
        d.ellips(8, 3.6, 7.6, 1.4, 'blek', 'bratte', zbias=0.2, platt=0.6)
        d.ellips(8, 1.8, 4.0, 1.9, 'blek', 'krona', zbias=-0.05)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'halsduk', 'harr'); skilj(d, 'halsduk', 'kropp')
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'harr')
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    if hatt:
        for x in range(4, 13):
            if d.del_.get((x, 2)) == 'krona': d.satt(x, 2, 'marin', 2 if x > 7 else 3)
    d.fast(9, 12, '#8a2420'); d.fast(10, 13, '#c23a2e')                  # knuten i nacken
    return d.bild()

# =====================================================================================
# FLODBO_FRUKOST: kvinna med mörk knut, randig blus, lång marinblå kjol och vitt förkläde. Grön hud.
# =====================================================================================
def fru_fram():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.8, 1.5, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.6, 3.8, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 6.6, 7.6, 'marin', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    d.ellips(8, 19.4, 2.4, 3.0, 'vit', 'forklade', klipp=lambda x, y: 17 <= y <= 21, zbias=0.1)
    for cx in (3.6, 12.4): d.ellips(cx, 14.4, 1.4, 1.8, 'vit', 'arm')
    for cx in (3.4, 12.6): d.ellips(cx, 16.6, 1.0, 1.0, 'gron', 'hand')
    d.ellips(8, 8.8, 5.8, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(8, 5.6, 5.6, 2.6, 'har', 'harr', zbias=0.1, klipp=lambda x, y: y <= 6)
    d.ellips(8, 2.0, 2.2, 1.8, 'har', 'knut', zbias=0.15)
    skilj(d, 'kropp', 'kjol', 1); skilj(d, 'arm', 'kropp'); skilj(d, 'forklade', 'kjol')
    skilj(d, 'harr', 'huvud'); skilj(d, 'knut', 'harr')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    ogon_fram(d, 8, 8); leende_fram(d, 8, 11, 2)
    return d.bild()
def fru_hoger():
    d = Duk(16, 24)
    d.ellips(7.0, 22.8, 1.5, 0.8, 'brun', 'skob', toner=(0, 1, 1, 2))
    d.ellips(9.6, 22.8, 1.6, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.6, 3.2, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 5.6, 7.6, 'marin', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    d.ellips(11.2, 19.2, 1.4, 2.8, 'vit', 'forklade', klipp=lambda x, y: 17 <= y <= 21, zbias=0.1)
    d.ellips(8.4, 8.8, 5.6, 5.0, 'gron', 'huvud', zbias=0.22)
    d.ellips(13.6, 9.8, 0.9, 0.9, 'gron', 'nos', zbias=0.3)
    d.ellips(7.4, 5.8, 5.4, 2.8, 'har', 'harr', zbias=0.1, klipp=lambda x, y: y <= 6 or x <= 5)
    d.ellips(2.8, 6.4, 1.9, 1.8, 'har', 'knut', zbias=0.15)
    d.ellips(9.0, 14.4, 1.3, 1.8, 'vit', 'arm')
    d.ellips(9.4, 16.6, 1.0, 1.0, 'gron', 'hand')
    skilj(d, 'kropp', 'kjol', 1); skilj(d, 'arm', 'kropp'); skilj(d, 'forklade', 'kjol')
    skilj(d, 'harr', 'huvud'); skilj(d, 'knut', 'harr')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    ogon_sida(d, 11, 8); leende_sida(d, 12, 11)
    return d.bild()
def fru_upp():
    d = Duk(16, 24)
    for cx in (6.2, 9.8): d.ellips(cx, 22.8, 1.5, 0.8, 'brun', 'sko', toner=(0, 1, 1, 2))
    d.ellips(8, 14.6, 3.8, 2.6, 'vit', 'kropp')
    d.ellips(8, 24.5, 6.6, 7.6, 'marin', 'kjol', klipp=lambda x, y: 16 <= y <= 22)
    for cx in (3.6, 12.4): d.ellips(cx, 14.4, 1.4, 1.8, 'vit', 'arm')
    for cx in (3.4, 12.6): d.ellips(cx, 16.6, 1.0, 1.0, 'gron', 'hand')
    d.ellips(8, 8.6, 5.8, 5.0, 'har', 'harr', zbias=0.12)
    d.ellips(8, 3.0, 2.4, 2.0, 'har', 'knut', zbias=0.2)
    d.ellips(8, 17.0, 1.8, 0.9, 'vit', 'rosett', zbias=0.2)
    skilj(d, 'kropp', 'kjol', 1); skilj(d, 'arm', 'kropp'); skilj(d, 'knut', 'harr'); skilj(d, 'rosett', 'kjol')
    kant_ned(d, 'kjol', 22, 1)
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=12)
    return d.bild()

# =====================================================================================
# FLODBO_SKRATTAR: rund och glad, blå stickad mössa, vit skjorta med randig väst, bruna byxor. Ockra hud (ingen halmhatt).
# =====================================================================================
def skr_fram():
    d = Duk(16, 24)
    for cx in (5.8, 10.2): d.ellips(cx, 22.4, 1.8, 1.0, 'brun', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.0, 10.0): d.ellips(cx, 20.6, 1.5, 1.6, 'brun', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 16.2, 5.0, 3.8, 'vit', 'kropp')
    for cx in (2.6, 13.4): d.ellips(cx, 15.6, 1.3, 2.2, 'vit', 'arm')
    for cx in (2.6, 13.4): d.ellips(cx, 17.8, 1.0, 0.9, 'ockra', 'hand')
    d.ellips(8, 9.0, 5.8, 5.0, 'ockra', 'huvud', zbias=0.22)
    d.ellips(8, 5.4, 5.8, 3.4, 'marin', 'mossa', klipp=lambda x, y: y <= 6, zbias=-0.05)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'mossa', 'huvud')
    d.kontur()
    rander(d, ('kropp',), y0=13)
    for y in range(13, 20):                                              # skjortan syns vit mitt fram
        for x in (7, 8):
            if d.del_.get((x, y)) == 'kropp': d.satt(x, y, 'vit', 4 if x == 7 else 3)
    for x in range(3, 13):
        if d.del_.get((x, 6)) == 'mossa': d.satt(x, 6, 'marin', 1)        # uppvikt kant
    ogon_fram(d, 8, 8); leende_fram(d, 8, 11, 2)
    return d.bild()
def skr_hoger():
    d = Duk(16, 24)
    d.ellips(6.8, 22.4, 1.7, 1.0, 'brun', 'skob', toner=(0, 1, 2, 3))
    d.ellips(9.8, 22.5, 2.0, 1.0, 'brun', 'sko', toner=(0, 1, 2, 3))
    d.ellips(7.0, 20.6, 1.4, 1.6, 'brun', 'benb', toner=(1, 1, 2, 2))
    d.ellips(9.2, 20.6, 1.5, 1.6, 'brun', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 16.2, 4.4, 3.8, 'vit', 'kropp')
    d.ellips(8.4, 9.0, 5.6, 5.0, 'ockra', 'huvud', zbias=0.22)
    d.ellips(13.6, 10.0, 0.9, 0.9, 'ockra', 'nos', zbias=0.3)
    d.ellips(7.4, 5.4, 5.6, 3.4, 'marin', 'mossa', klipp=lambda x, y: y <= 6 or x <= 4, zbias=-0.05)
    d.ellips(9.0, 15.6, 1.3, 2.2, 'vit', 'arm')
    d.ellips(9.4, 17.8, 1.0, 0.9, 'ockra', 'hand')
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'kropp', 'benb', 0); skilj(d, 'mossa', 'huvud')
    d.kontur()
    rander(d, ('kropp',), y0=13)
    for y in range(13, 20):
        if d.del_.get((11, y)) == 'kropp': d.satt(11, y, 'vit', 3)
    for x in range(2, 13):
        if d.del_.get((x, 6)) == 'mossa': d.satt(x, 6, 'marin', 1)
    ogon_sida(d, 11, 8); leende_sida(d, 12, 11)
    return d.bild()
def skr_upp():
    d = Duk(16, 24)
    for cx in (5.8, 10.2): d.ellips(cx, 22.4, 1.8, 1.0, 'brun', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.0, 10.0): d.ellips(cx, 20.6, 1.5, 1.6, 'brun', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 16.2, 5.0, 3.8, 'vit', 'kropp')
    for cx in (2.6, 13.4): d.ellips(cx, 15.6, 1.3, 2.2, 'vit', 'arm')
    for cx in (2.6, 13.4): d.ellips(cx, 17.8, 1.0, 0.9, 'ockra', 'hand')
    d.ellips(8, 9.0, 5.8, 5.0, 'ockra', 'huvud', zbias=0.22)
    d.ellips(8, 6.6, 5.8, 4.6, 'marin', 'mossa', klipp=lambda x, y: y <= 10, zbias=-0.05)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'mossa', 'huvud')
    d.kontur()
    rander(d, ('kropp',), y0=13)
    for x in range(3, 13):
        if d.del_.get((x, 10)) == 'mossa': d.satt(x, 10, 'marin', 1)
    return d.bild()

# =====================================================================================
# FLODMAN: bred och lugn, platt hatt med blått band, randig tröja och en brun väst. Blå hud.
# =====================================================================================
def man_fram():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.2, 1.9, 1.1, 'stovel', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.0, 10.0): d.ellips(cx, 20.0, 1.6, 2.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 15.8, 4.6, 3.6, 'vit', 'kropp')
    for cx in (2.9, 13.1): d.ellips(cx, 15.4, 1.4, 2.6, 'vit', 'arm')
    for cx in (2.9, 13.1): d.ellips(cx, 18.0, 1.0, 0.9, 'blahud', 'hand')
    d.ellips(8, 9.0, 5.8, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(8, 5.4, 7.9, 1.5, 'blek', 'bratte', zbias=0.2, platt=0.6)
    d.ellips(8, 3.4, 4.2, 2.2, 'blek', 'krona', zbias=-0.05, klipp=lambda x, y: y >= 1)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud')
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=13)
    for y in range(13, 20):                                              # västen: två bruna fält fram
        for x in (4, 5, 10, 11):
            if d.del_.get((x, y)) == 'kropp': d.satt(x, y, 'brun', 2 if x < 8 else 1)
    for x in range(4, 13):
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'marin', 2 if x > 7 else 3)
    ogon_fram(d, 8, 8); leende_fram(d, 8, 11, 2)
    return d.bild()
def man_hoger():
    d = Duk(16, 24)
    d.ellips(7.0, 22.2, 1.8, 1.0, 'stovel', 'skob', toner=(0, 1, 2, 3))
    d.ellips(9.6, 22.3, 2.0, 1.1, 'stovel', 'sko', toner=(0, 1, 2, 3))
    d.ellips(7.0, 20.0, 1.5, 2.0, 'byxa', 'benb', toner=(1, 1, 2, 2))
    d.ellips(9.0, 20.0, 1.6, 2.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 15.8, 4.0, 3.6, 'vit', 'kropp')
    d.ellips(8.4, 9.0, 5.6, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(13.6, 10.0, 0.9, 0.9, 'blahud', 'nos', zbias=0.3)
    d.ellips(9.0, 15.4, 1.4, 2.6, 'vit', 'arm')
    d.ellips(9.4, 18.0, 1.0, 0.9, 'blahud', 'hand')
    d.ellips(7.8, 5.4, 7.4, 1.4, 'blek', 'bratte', zbias=0.2, platt=0.6)
    d.ellips(7.6, 3.4, 4.0, 2.2, 'blek', 'krona', zbias=-0.05)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'kropp', 'benb', 0)
    skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud')
    d.kontur()
    rander(d, ('kropp', 'arm'), y0=13)
    for y in range(13, 20):
        for x in (10, 11):
            if d.del_.get((x, y)) == 'kropp': d.satt(x, y, 'brun', 1)
    for x in range(3, 12):
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'marin', 2 if x > 6 else 3)
    ogon_sida(d, 11, 8); leende_sida(d, 12, 11)
    return d.bild()
def man_upp():
    d = Duk(16, 24)
    for cx in (6.0, 10.0): d.ellips(cx, 22.2, 1.9, 1.1, 'stovel', 'sko', toner=(0, 1, 2, 3))
    for cx in (6.0, 10.0): d.ellips(cx, 20.0, 1.6, 2.0, 'byxa', 'ben', toner=(1, 2, 2, 3))
    d.ellips(8, 15.8, 4.6, 3.6, 'brun', 'kropp')                       # västens rygg
    for cx in (2.9, 13.1): d.ellips(cx, 15.4, 1.4, 2.6, 'vit', 'arm')
    for cx in (2.9, 13.1): d.ellips(cx, 18.0, 1.0, 0.9, 'blahud', 'hand')
    d.ellips(8, 9.0, 5.8, 5.0, 'blahud', 'huvud', zbias=0.22)
    d.ellips(8, 5.4, 7.9, 1.5, 'blek', 'bratte', zbias=0.2, platt=0.6)
    d.ellips(8, 3.4, 4.2, 2.2, 'blek', 'krona', zbias=-0.05)
    skilj(d, 'arm', 'kropp'); skilj(d, 'kropp', 'ben', 0); skilj(d, 'krona', 'bratte'); skilj(d, 'bratte', 'huvud')
    d.kontur()
    rander(d, ('arm',), y0=13)
    for x in range(4, 13):
        if d.del_.get((x, 4)) == 'krona': d.satt(x, 4, 'marin', 2 if x > 7 else 3)
    return d.bild()

FIGURER = {
    'skepparen': (sk_fram, sk_hoger, sk_upp),
    'flodbo_frukost': (fru_fram, fru_hoger, fru_upp),
    'flodbo_skrattar': (skr_fram, skr_hoger, skr_upp),
    'flodman': (man_fram, man_hoger, man_upp),
}
# gången: samma mekanik som byborna (bybor.py), med de här figurerna
exec('# '+open('/home/claude/bybor/bybor.py').read().split('# ---------- gången')[1])

if __name__ == '__main__':
    from PIL import ImageDraw, ImageFont
    sys.path.insert(0, '/home/claude/palett'); from palett import Palett; P = Palett()
    g = gang()
    rad = []
    for n in FIGURER:
        for r in ('ner', 'hoger', 'vanster', 'upp'):
            rad.append((n, r, P.las_bild(g[n][r][0], n)))
    ref = [Image.open(f'/home/claude/bybor/ut/figurer/{n}/{n}_ner_01.png').convert('RGBA') for n in ('tant_rosa', 'fiskaren')]
    hj = Image.open('/home/claude/inkorg/figurer/hjalte/hjalte_ga_ner_01.png').convert('RGBA') if os.path.exists('/home/claude/inkorg/figurer/hjalte/hjalte_ga_ner_01.png') else None
    W = 4 + 4 * 20 * 4 + 3 * 8 + 70
    o = Image.new('RGBA', (W, 32), (214, 196, 150, 255))
    x = 4
    for i, (n, r, im) in enumerate(rad):
        o.alpha_composite(im, (x, 4)); x += 20 if i % 4 != 3 else 28
    for im in ([hj] if hj else []) + ref:
        o.alpha_composite(im, (x - (im.width - 16) // 2, 4)); x += 24
    o.resize((o.width * 6, o.height * 6), Image.NEAREST).save('/tmp/flodfolket_x6.png')
    print('klart')
