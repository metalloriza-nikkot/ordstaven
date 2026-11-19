# Kapitel 3 (beslut 103.3.4): ljuden vid floden, i samma klangfamilj som ljud.py (byggstenarna läses därifrån).
# Bara de nya ljuden skrivs, och ljud.json får dem tillagda. Inga hämtade ljud, och inget skrämmer.
# Det stora hornets tut är kort nog (0,9 s) och har en tydlig början och ett tydligt slut, så att varje tryck
# går att räkna: fem tryck blir fem tut, aldrig ett utdraget ljud.
# Användning: python3 fas4/ljud_k3.py [ljud.json från inkorgen]
import os, sys, json
import numpy as np
_src = open('/home/claude/fas4/ljud.py').read()
exec(_src[:_src.index('# ---------------------------------------------------------------- ljuden')])
exec(_src[_src.index('def aktiv_rms'):_src.index("if __name__ == '__main__':")])
L = {}; INFO = {}
def ljud(id, grupp, text, signatur=False, styrka=-6.0, slinga=False):
    def reg(fn):
        INFO[id] = {'grupp': grupp, 'vad': text, 'signatur': signatur, 'styrka_db': styrka}
        if slinga: INFO[id]['slinga'] = True
        L[id] = fn; return fn
    return reg
r3 = np.random.default_rng(103)
def br(n): return r3.uniform(-1, 1, n)

def massing(f, n, ljus=1.0):
    """En mässingston: övertoner som öppnar sig när tonen tar fart, och lite andning i ansatsen."""
    t = np.arange(n) / SR
    oppna = np.clip(t / 0.12, 0, 1)
    x = sum((1 / k ** (1.6 - 0.6 * ljus * oppna)) * np.sin(2 * np.pi * fas(f * k, n)) for k in range(1, 9))
    return x + 0.08 * lp(br(n), 1500) * np.exp(-t * 12)

@ljud('horn_tut', 'Kapitel 3', 'Det stora hornet på avsatsen: ett djupt, varmt TUT, ett per tryck (0,9 s, tydlig början och slut)', signatur=True, styrka=-6)
def _():
    n = int(.9 * SR); t = np.arange(n) / SR
    f = 98 * (1 + 0.03 * np.exp(-t * 14)) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))   # lite högre i ansatsen, svag vibrato
    x = massing(f, n) * hylsa(n, .035, .9, 0.5)
    e = np.where(t < .7, 1.0, np.clip(1 - (t - .7) / .2, 0, 1))                  # slutar tydligt, inte i en lång svans
    return rum(lp(x * e, 2600), .22, .2)

@ljud('frukosthorn', 'Kapitel 3', 'Det lilla frukosthornet: ett kort, ljust tut (spelas tre gånger, ett per bild)', styrka=-9)
def _():
    n = int(.24 * SR); t = np.arange(n) / SR
    x = massing(392 * (1 + 0.02 * np.exp(-t * 30)), n, .7) * hylsa(n, .015, .24, 2.5)
    return rum(lp(x, 3500), .12)

@ljud('vattenhjul', 'Kapitel 3', 'Vattenhjulet som snurrar: vatten som öses och träet som knarrar (2,4 s, går i slinga)', styrka=-15, slinga=True)
def _():
    n = int(2.4 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    flode = bp(br(n), 300, 2400) * (0.55 + 0.25 * np.sin(2 * np.pi * t / 2.4))
    for k in range(6):                                                          # sex skovlar per slinga: ett plask var
        i = int(k * .4 * SR); m = int(.22 * SR)
        x[i:i + m] += bp(br(m), 500, 3500) * hylsa(m, .01, .2, 3)
    for k in (0, 3):                                                            # träet knarrar två gånger
        i = int(k * .4 * SR + .15 * SR); m = int(.18 * SR)
        x[i:i + m] += .5 * bp(puls(svep(140, 110, m), m, .3), 300, 1600) * np.sin(np.pi * np.linspace(0, 1, m))
    y = .6 * flode + x
    k = int(.05 * SR); y[:k] = y[:k] * np.linspace(0, 1, k) + y[-k:] * np.linspace(1, 0, k); y = y[:n - k]   # skarven
    return y

@ljud('kvarn_dunk', 'Kapitel 3', 'Inne i kvarnen: stenen som maler och axeln som dunkar dovt (2,4 s, går i slinga)', styrka=-16, slinga=True)
def _():
    n = int(2.4 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    mal = lp(br(n), 400) * (0.7 + 0.3 * np.sin(2 * np.pi * t / 1.2))
    for k in range(4):                                                          # dunk varje 0,6 s
        i = int(k * .6 * SR); m = int(.2 * SR); tt = np.arange(m) / SR
        x[i:i + m] += np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 10) + 45) / SR) * np.exp(-tt * 16)
    y = .5 * mal + x
    k = int(.05 * SR); y[:k] = y[:k] * np.linspace(0, 1, k) + y[-k:] * np.linspace(1, 0, k); y = y[:n - k]
    return y

@ljud('sackhiss', 'Kapitel 3', 'Säckhissen: repet knarrar, ett spärrhjul klickar och plattformen stannar med en duns (2 s)', styrka=-12)
def _():
    n = int(1.9 * SR); x = np.zeros(n)
    rep = bp(puls(svep(90, 130, n), n, .25), 250, 1400) * np.sin(np.pi * np.linspace(0, 1, n)) ** .5 * .4
    for k in range(14):                                                         # spärrhjulet
        i = int((.1 + k * .11) * SR); m = int(.025 * SR)
        x[i:i + m] += hp(br(m), 2000) * hylsa(m, .0005, .02, 6) * .7
    m = int(.2 * SR); tt = np.arange(m) / SR; i = n - m
    x[i:] += np.sin(2 * np.pi * np.cumsum(90 * np.exp(-tt * 15) + 50) / SR) * np.exp(-tt * 14)
    return rum(rep + x, .2)

@ljud('skuggan', 'Kapitel 3', 'Något stort rör sig under vattnet: ett mjukt, djupt sug och bubblor (2,5 s), inte läskigt', styrka=-12)
def _():
    n = int(2.5 * SR); s = np.linspace(0, 1, n)
    sug = lp(br(n), 220) * np.sin(np.pi * s) ** 1.5 * 2.5
    ton = .5 * sinus(svep(55, 70, n), n) * np.sin(np.pi * s) ** 2
    bub = np.zeros(n)
    for k in range(9):
        i = int(r3.uniform(.4, 2.1) * SR); m = int(.05 * SR); f0 = r3.uniform(250, 500)
        bub[i:i + m] += sinus(svep(f0, f0 * 1.8, m), m) * np.sin(np.pi * np.linspace(0, 1, m)) * .35
    return rum(sug + ton + bub, .25, .3)

@ljud('on_stiger', 'Kapitel 3', 'Ön stiger: vattnet välver sig, forsar av skalet och rinner ut (3,9 s, följer bilderna 1–4)', styrka=-8)
def _():
    # Egen slump, och samma förbrukning av den gemensamma som den förra versionen, så att ljuden efter inte ändras.
    n0 = int(4.5 * SR); r3.uniform(-1, 1, n0); r3.uniform(-1, 1, n0)
    for k in range(40): r3.uniform(); r3.uniform(); r3.uniform()
    r3.uniform(-1, 1, int(.3 * SR))
    rr = np.random.default_rng(1034)
    def br(n): return rr.uniform(-1, 1, n)
    n = int(3.55 * SR); t = np.arange(n) / SR
    valv = lp(br(n), 160) * np.clip(t / 0.9, 0, 1) * np.clip((1.9 - t) / .5, 0, 1) * 3          # bild 1–2: dovt sug
    fors = bp(br(n), 250, 5000) * np.clip((t - 0.8) / .3, 0, 1) * np.exp(-np.clip(t - 1.4, 0, None) * 1.1)   # bild 3: forsar av
    rinn = np.zeros(n)
    for k in range(34):                                                         # bild 4: strömmar som rinner av
        i = int(rr.uniform(1.7, 3.3) * SR); m = int(rr.uniform(.03, .08) * SR); f0 = rr.uniform(500, 1400)
        rinn[i:i + m] += sinus(svep(f0, f0 * 1.4, m), m) * np.sin(np.pi * np.linspace(0, 1, m)) * .3
    stank = np.zeros(n); m = int(.3 * SR); i = int(0.85 * SR)
    stank[i:i + m] += bp(br(m), 800, 6000) * hylsa(m, .005, .3, 3) * 1.2
    return rum(valv + .9 * fors + rinn + stank, .2, .3)

@ljud('droppar', 'Kapitel 3', 'Det droppar från skalet (2 s, till bild 5–6)', styrka=-15)
def _():
    n = int(2.0 * SR); x = np.zeros(n)
    for k in range(11):
        i = int(r3.uniform(.05, 1.85) * SR); m = int(.06 * SR); f0 = r3.uniform(900, 1700)
        x[i:i + m] += sinus(svep(f0, f0 * 1.6, m), m) * hylsa(m, .001, .05, 5)
    return rum(x, .3, .3)

@ljud('plask', 'Kapitel 3', 'PLASK: ungen hoppar i floden (större än plums)', styrka=-8)
def _():
    n = int(.6 * SR); t = np.arange(n) / SR
    x = bp(br(n), 300, 6000) * hylsa(n, .003, .45, 4) + .6 * sinus(svep(180, 70, n), n) * hylsa(n, .002, .25, 5)
    for k in range(6):
        i = int(r3.uniform(.15, .5) * SR); m = int(.04 * SR); f0 = r3.uniform(800, 1500)
        x[i:i + m] += .3 * sinus(svep(f0, f0 * 1.5, m), m) * np.sin(np.pi * np.linspace(0, 1, m))
    return rum(x, .2)

@ljud('skoldpadda_rop', 'Kapitel 3', 'Sköldpaddans rop: ett djupt, vänligt MMMOOO som stiger och sjunker (2 s)', styrka=-8)
def _():
    n = int(2.0 * SR); t = np.arange(n) / SR; s = t / t[-1]
    f = 62 * (1 + .18 * np.sin(np.pi * s) ** 1.5) * (1 + .006 * np.sin(2 * np.pi * 4.5 * t))
    kalla = sum((1 / k) * np.sin(2 * np.pi * fas(f * k, n)) for k in range(1, 30))
    vokal = bp(kalla, 200, 520) * 1.2 + bp(kalla, 600, 1000) * .5 * np.clip(s * 2, 0, 1)   # mmm som öppnar sig till ooo
    return rum(lp(vokal + .3 * lp(kalla, 300), 1800) * hylsa(n, .15, 2.0, 1.2), .3, .4)

@ljud('duell_start', 'Kapitel 3', 'ORDDUELL!: en kort trumvirvel och två fanfarstötar (1,6 s). Samma i varje duell, också i testrummet och i kapitel 5', styrka=-7)
def _():
    rr = np.random.default_rng(1061)
    n = int(1.6 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(int(0.75 / 0.035)):                                         # virveln, som växer
        i = int(k * 0.035 * SR); m = int(0.05 * SR)
        x[i:i + m] += hp(rr.uniform(-1, 1, m), 1500) * hylsa(m, .001, .045, 6) * (0.25 + 0.75 * k / 21)
    for (s0, f, d) in ((0.78, 262, 0.22), (1.02, 392, 0.5)):                   # två stötar, kvart upp
        i = int(s0 * SR); m = int(d * SR)
        x[i:i + m] += 0.9 * massing(np.full(m, f), m) * hylsa(m, .01, d, 1.2)
        x[i:i + m] += 0.5 * massing(np.full(m, f * 1.26), m) * hylsa(m, .01, d, 1.2)
    i = int(1.02 * SR); m = int(0.3 * SR)
    x[i:i + m] += 0.8 * lp(rr.uniform(-1, 1, m), 300) * np.exp(-np.arange(m) / SR * 14)   # en puka på stöten
    return rum(x, .2, .25)


if __name__ == '__main__':
    from scipy.io import wavfile
    UT = '/home/claude/fas4/ut_k3/ljud/effekter/'; os.makedirs(UT, exist_ok=True)
    lista = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
    for id, fn in L.items():
        x = fn()
        if INFO[id].get('slinga'):                                             # slingor: ingen in- och uttoning, skarven ska vara hel
            x = x - np.mean(x); x = x * 10 ** ((INFO[id]['styrka_db'] - 14 - aktiv_rms(x)) / 20)
            x = x / max(1, np.max(np.abs(x)) / 10 ** (-1 / 20))
        else: x = normalisera(x, INFO[id]['styrka_db'])
        wavfile.write(UT + id + '.wav', SR, (x * 32767).astype(np.int16))
        lista[id] = dict(INFO[id], fil='ljud/effekter/%s.wav' % id, sekunder=round(len(x) / SR, 2))
    with open(UT + 'ljud.json', 'w') as f: json.dump(lista, f, ensure_ascii=False, indent=1)
    for id in L: assert lista[id]['sekunder'] <= 4.0, (id, 'en ljudeffekt är högst 4 s (Tekniks inkorg.py)')
    print(len(L), 'nya ljud,', len(lista), 'i ljud.json')
