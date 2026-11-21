# Kapitel 4 (115.8, granskning 9 punkt 5): bokstavsstigens ljud på isen. Bygger på kapitel 3:s skript.
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
r3 = np.random.default_rng(115)
def br(n): return r3.uniform(-1, 1, n)

def massing(f, n, ljus=1.0):
    """En mässingston: övertoner som öppnar sig när tonen tar fart, och lite andning i ansatsen."""
    t = np.arange(n) / SR
    oppna = np.clip(t / 0.12, 0, 1)
    x = sum((1 / k ** (1.6 - 0.6 * ljus * oppna)) * np.sin(2 * np.pi * fas(f * k, n)) for k in range(1, 9))
    return x + 0.08 * lp(br(n), 1500) * np.exp(-t * 12)


def glas(f, n, avkl=6.0):
    """En klar glas- eller iston: ett par oharmoniska delar som klingar ut, som is som sjunger."""
    t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * avkl * (1 + 0.6 * k)) for k, a in ((1, 1.0), (2.76, .35), (5.4, .15)))

@ljud('flak_ratt', 'Kapitel 4', 'Rätt flak i bokstavsstigen: ett glatt, klart TING-TING i is, uppåt, och lite glitter (0,5 s). Knaket hörs bara vid fel', styrka=-9)
def _():
    n = int(.5 * SR); x = np.zeros(n)
    for (s0, f) in ((0.0, 1318), (0.09, 1760)):                                # två toner, en kvart uppåt (E6, A6)
        i = int(s0 * SR); m = n - i
        x[i:] += glas(f, m, 7) * hylsa(m, .002, m / SR, 1.0)
    rr = np.random.default_rng(1151)
    for k in range(6):                                                          # små glittrande pling efteråt
        i = int((0.16 + k * 0.045) * SR); m = int(0.12 * SR)
        if i + m < n: x[i:i + m] += 0.18 * glas(2600 + rr.uniform(0, 1400), m, 22)
    return rum(hp(x, 400), .14, .15)

@ljud('flak_knak', 'Kapitel 4', 'Fel bokstav: flaket knakar och gungar lite, kort och ofarligt (0,35 s)', styrka=-12)
def _():
    n = int(.35 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    rr = np.random.default_rng(1152)
    for k in range(5):                                                          # små knak, tätt
        i = int(k * .025 * SR + rr.uniform(0, .01) * SR); m = int(.03 * SR)
        x[i:i + m] += bp(rr.uniform(-1, 1, m), 900, 4000) * hylsa(m, .001, .03, 8)
    gung = 0.35 * np.sin(2 * np.pi * fas(svep(180, 140, n), n)) * np.exp(-t * 9)   # ett mjukt dunk när det gungar
    return rum(x + gung, .1)

@ljud('flak_sjunker', 'Kapitel 4', 'En återvändsgränd: flaket sjunker långsamt med ett mjukt blubb (0,9 s). Inget som skrämmer', styrka=-12)
def _():
    n = int(.9 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for (s0, f0) in ((0.05, 520), (0.32, 440), (0.58, 380)):                   # tre bubblor som stiger
        i = int(s0 * SR); m = int(.12 * SR); tt = np.arange(m) / SR
        x[i:i + m] += np.sin(2 * np.pi * fas(f0 * (1 + 1.4 * tt / .12), m)) * hylsa(m, .005, .12, 6) * .5
    x += .25 * lp(r3.uniform(-1, 1, n), 500) * np.clip(1 - t / .9, 0, 1)        # vatten som sköljer
    return rum(x, .15)


if __name__ == '__main__':
    from scipy.io import wavfile
    UT = '/home/claude/fas4/ut_k4/ljud/effekter/'; os.makedirs(UT, exist_ok=True)
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
