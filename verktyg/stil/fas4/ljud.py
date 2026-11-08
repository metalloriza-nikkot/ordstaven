# Fas 4 (beslut 62.7, Stil 11): spelets ljudeffekter efter ljudlistan i 10c. Stil 2026-11-08.
# Alla ljud är syntetiserade här, i samma mjuka klangfamilj som musiken: sinus, triangel, mjuka pulsvågor,
# filtrerat brus och klockor med FM. Inga hämtade ljud, så ingen licens behövs (licensloggen säger "egna").
# Ut: fas4/ut/ljud/effekter/<id>.wav (mono, 44,1 kHz, 16 bitar) och ljud.json med vad varje ljud är till.
# Signaturljuden (dunk, ordkraft, stampel) är alltid samma fil. Inga ljud skrämmer, och fel låter aldrig som fel.
import os, sys, json, math, subprocess
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
UT = '/home/claude/fas4/ut/ljud/effekter/'
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- byggstenar
def tid(s): return np.arange(int(s * SR)) / SR
def hylsa(n, a=0.005, r=None, kurva=4.0):
    """Snabb ansats och exponentiell avklingning (r = tiden till ca -40 dB)."""
    t = np.arange(n) / SR; r = r or n / SR
    e = np.exp(-kurva * t / r)
    if a > 0: e *= np.clip(t / a, 0, 1)
    k = min(n, int(.004 * SR)); e[n - k:] *= np.linspace(1, 0, k)      # inget klick i slutet
    return e
def fas(f, n):
    f = np.broadcast_to(np.asarray(f, float), (n,)); return np.cumsum(f) / SR
def sinus(f, n): return np.sin(2 * np.pi * fas(f, n))
def triangel(f, n): p = fas(f, n) % 1; return 4 * np.abs(p - 0.5) - 1
def puls(f, n, duty=0.25): p = fas(f, n) % 1; return np.where(p < duty, 1.0, -1.0) - (2 * duty - 1)
def brus(n): return rng.uniform(-1, 1, n)
def svep(f0, f1, n, kurva='exp'):
    s = np.linspace(0, 1, n)
    return f0 * (f1 / f0) ** s if kurva == 'exp' else f0 + (f1 - f0) * s
def lp(x, fc, ord=2): b, a = butter(ord, min(fc, SR / 2 - 100) / (SR / 2)); return lfilter(b, a, x)
def hp(x, fc, ord=2): b, a = butter(ord, fc / (SR / 2), 'high'); return lfilter(b, a, x)
def bp(x, f0, f1, ord=2): b, a = butter(ord, [f0 / (SR / 2), min(f1, SR / 2 - 100) / (SR / 2)], 'band'); return lfilter(b, a, x)
def klocka(f, n, index=2.0, ratio=3.5, r=None):
    """En mjuk klocka med FM: ljus i början, ren mot slutet."""
    e = hylsa(n, 0.002, r)
    mod = index * e * sinus(f * ratio, n)
    return np.sin(2 * np.pi * fas(f, n) + mod) * e
def add(*xs):
    n = max(len(x) for x in xs); ut = np.zeros(n)
    for x in xs: ut[:len(x)] += x
    return ut
def mix(langd, *delar):
    """delar = (start_s, ljud, styrka)"""
    ut = np.zeros(int(langd * SR))
    for (s, x, v) in delar:
        i = int(s * SR); j = min(len(ut), i + len(x)); ut[i:j] += v * x[:j - i]
    return ut
def rum(x, mangd=0.18, langd=0.25):
    """Ett litet rum: några tidiga reflexer och en kort svans, så att ljuden inte låter torra."""
    svans = int(langd * SR); x = np.concatenate([x, np.zeros(svans)]); ut = x.copy()
    for (ms, g) in ((23, .5), (37, .4), (53, .32), (71, .25), (97, .18), (131, .12), (173, .08)):
        k = int(ms / 1000 * SR)
        if k < len(x): ut[k:] += mangd * g * x[:len(x) - k]
    return lp(ut, 9000, 1)
def ton(namn):
    """'C5' -> Hz"""
    N = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
    return 440 * 2 ** ((N[namn[:-1]] + 12 * (int(namn[-1]) + 1) - 69) / 12)
def not_(f, langd, form='tri', r=None, a=0.004, duty=0.25):
    n = int(langd * SR)
    x = {'tri': lambda: triangel(f, n), 'sin': lambda: sinus(f, n), 'puls': lambda: puls(f, n, duty)}[form]()
    return x * hylsa(n, a, r or langd)

# ---------------------------------------------------------------- ljuden
L = {}; INFO = {}
def ljud(id, grupp, text, signatur=False, styrka=-6.0):
    def reg(fn):
        INFO[id] = {'grupp': grupp, 'vad': text, 'signatur': signatur, 'styrka_db': styrka}; L[id] = fn; return fn
    return reg

# Överallt
@ljud('pling', 'Överallt', 'Uppdragslappen eller molnet kommer, ett nytt delsteg: mjukt pling', styrka=-10)
def _(): return rum(mix(0.5, (0, klocka(ton('E6'), int(.45 * SR), 1.2, 3, .4), 1), (0.07, klocka(ton('B6'), int(.4 * SR), 0.8, 3, .35), .5)))
@ljud('penndrag', 'Överallt', 'Bock på lappen: ett kort penndrag', styrka=-12)
def _():
    n = int(.16 * SR); x = bp(brus(n), 2500, 7000) * hylsa(n, .01, .16, 3) * (0.6 + 0.4 * np.sin(np.linspace(0, 9, n)))
    return rum(x, .1)
@ljud('stampel', 'Överallt', 'Stämpeln, uppdraget klart: en dov stämpel och ett litet pling', signatur=True, styrka=-5)
def _():
    n = int(.12 * SR); duns = lp(brus(n), 500) * hylsa(n, .001, .12, 5) + sinus(svep(140, 70, n), n) * hylsa(n, .001, .1, 5)
    return rum(mix(0.7, (0, duns, 1.4), (0.12, klocka(ton('G6'), int(.5 * SR), 1, 3, .45), .35), (0.18, klocka(ton('D7'), int(.4 * SR), .6, 3, .35), .2)))
@ljud('pappersus', 'Överallt', 'Lappen flyger till pausknappen: ett papperssus', styrka=-14)
def _():
    n = int(.4 * SR); s = np.linspace(0, 1, n)
    return rum(bp(brus(n), 1200, 5000) * np.sin(np.pi * s) ** 1.5 * (0.7 + 0.3 * np.sin(s * 40)), .1)
@ljud('papper', 'Överallt', 'Läsplattan, boken eller lappen öppnas och stängs: papper som prasslar', styrka=-14)
def _():
    n = int(.22 * SR); x = np.zeros(n)
    for k in range(5):
        m = int(.03 * SR); i = int(k * .035 * SR); x[i:i + m] += bp(brus(m), 1500 + 400 * k, 6000) * hylsa(m, .002, .03, 3)
    return rum(x, .12)
@ljud('klick', 'Överallt', 'Knapp i menyerna: ett mjukt klick', styrka=-14)
def _(): n = int(.05 * SR); return rum(sinus(svep(1400, 800, n), n) * hylsa(n, .001, .05, 6) + .3 * lp(brus(n), 3000) * hylsa(n, .0005, .01, 6), .08)
for i, nn in enumerate(['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6']):
    def _b(nn=nn): return rum(add(not_(ton(nn), .16, 'tri', .14), .25 * not_(ton(nn) * 2, .08, 'sin', .06)), .12)
    ljud('bricka_%d' % (i + 1), 'Överallt', 'Bokstavsbricka eller tangent nr %d i ordet: tonen stiger för varje bokstav (pentaton)' % (i + 1), styrka=-10)(_b)
@ljud('pff', 'Överallt', 'Brickan studsar tillbaka: ett mjukt pff', styrka=-14)
def _(): n = int(.12 * SR); return rum(lp(brus(n), 900) * hylsa(n, .005, .12, 4) + .4 * sinus(svep(320, 220, n), n) * hylsa(n, .003, .1, 4), .1)
@ljud('ratt', 'Överallt', 'Rätt svar, litet: tre stigande toner', styrka=-7)
def _(): return rum(mix(.6, *[(i * .08, add(not_(ton(nn), .3, 'tri', .25), .3 * klocka(ton(nn) * 2, int(.25 * SR), .6, 2, .2)), 1) for i, nn in enumerate(['C6', 'E6', 'G6'])]))
@ljud('fel', 'Överallt', 'Fel: ett komiskt bloing, aldrig ett felsurr', styrka=-9)
def _():
    n = int(.4 * SR); f = svep(330, 170, n) * (1 + .05 * np.sin(2 * np.pi * 14 * tid(.4)[:n]))
    return rum(sinus(f, n) * hylsa(n, .01, .4, 3) + .3 * triangel(f * 2, n) * hylsa(n, .01, .2, 4), .12)
@ljud('fest_mellan', 'Överallt', 'Fest, mellan (räddning, duell, ny grad): fanfar', styrka=-5)
def _():
    seq = [('C5', 0, .12), ('E5', .12, .12), ('G5', .24, .12), ('C6', .36, .5)]
    d = [(s, not_(ton(nn), l + .1, 'puls', l + .05, duty=.25) * .5 + not_(ton(nn) / 2, l + .1, 'tri', l + .05), 1) for nn, s, l in seq]
    d += [(.36, klocka(ton('E7'), int(.6 * SR), .8, 3, .5), .25)]
    return rum(lp(mix(1.1, *d), 5000), .2)
@ljud('fest_stor', 'Överallt', 'Fest, stor (kartbit): längre fanfar i samma familj', styrka=-4)
def _():
    seq = [('G4', 0, .1), ('C5', .1, .1), ('E5', .2, .1), ('G5', .3, .25), ('E5', .58, .1), ('G5', .68, .1), ('C6', .78, .8)]
    d = [(s, not_(ton(nn), l + .1, 'puls', l + .05, duty=.25) * .5 + not_(ton(nn) / 2, l + .1, 'tri', l + .05), 1) for nn, s, l in seq]
    d += [(.78 + k * .07, klocka(ton(nn), int(.7 * SR), .8, 3, .6), .2) for k, nn in enumerate(['C7', 'E7', 'G7', 'C8'])]
    return rum(lp(mix(1.9, *d), 5000), .25)
@ljud('ordkraft', 'Överallt', 'Ordkraftens ljus, varje gång ett ord blir något: stavens klang, ett glittrande ackord som stiger', signatur=True, styrka=-6)
def _():
    d = [(k * .05, klocka(ton(nn), int(.9 * SR), 1.4, 3.5, .8), 1 - k * .1) for k, nn in enumerate(['C5', 'G5', 'C6', 'E6', 'G6', 'C7'])]
    n = int(.6 * SR); d += [(.1, hp(brus(n), 6000) * hylsa(n, .05, .6, 3) * (rng.random(n) < .02), 2.5)]
    return rum(mix(1.2, *d), .25, .4)
@ljud('formel_ristas', 'Överallt', 'En ny formel ristas in på staven: stavens klang och ett lågt surr som stiger', styrka=-5)
def _():
    n = int(1.4 * SR); s = np.linspace(0, 1, n); f = svep(80, 240, n)
    surr = lp(puls(f, n, .4) + .5 * triangel(f * 1.01, n), 900) * (s ** 1.5) * hylsa(n, 0, 2.5, 1)
    return rum(mix(2.3, (0, surr, .5), (1.2, L['ordkraft'](), 1)), .2)
@ljud('bar', 'Överallt', 'Ett bär till räknaren: ett plopp', styrka=-9)
def _(): n = int(.12 * SR); return rum(sinus(svep(500, 1100, n), n) * hylsa(n, .002, .12, 5), .1)
@ljud('hmm', 'Överallt', 'Mata ungen vid 0 bär: ett mjukt hmm', styrka=-12)
def _():
    n = int(.5 * SR); f = svep(230, 190, n) * (1 + .01 * np.sin(2 * np.pi * 5 * tid(.5)[:n]))
    x = sum(sinus(f * k, n) / k ** 1.6 for k in range(1, 6)); x = bp(x, 150, 1100)
    s = np.linspace(0, 1, n); return rum(x * np.sin(np.pi * s) ** .7, .12)
@ljud('sla', 'Överallt', 'Vifta med staven (krukor, buskar, lövhögar): ett kort svisch', styrka=-10)
def _():
    n = int(.18 * SR); s = np.linspace(0, 1, n); x = np.zeros(n)
    for i in range(n // 256):
        a, b = i * 256, (i + 1) * 256; fc = 600 + 3500 * np.sin(np.pi * i / (n // 256))
        x[a:b] = bp(brus(256 + 64), fc * .7, fc * 1.3)[64:]
    return rum(x * np.sin(np.pi * s) ** 2, .08)
@ljud('hugg', 'Kapitel 1', 'SVÄRD: ett svisch per hugg, ljusare än staven', styrka=-9)
def _(): return rum(mix(.3, (0, hp(L['sla'](), 900), 1), (.05, klocka(ton('A6'), int(.2 * SR), .5, 4, .15), .2)), .1)
@ljud('kruka', 'Överallt', 'En kruka går sönder: lera som spricker och skärvor som klirrar', styrka=-7)
def _():
    n = int(.1 * SR); kras = bp(brus(n), 300, 2500) * hylsa(n, .001, .1, 5)
    d = [(0, kras, 1.2)] + [(.06 + k * .045 + rng.uniform(0, .02), klocka(rng.uniform(1800, 3200), int(.12 * SR), 1.5, 2.7, .1), .25) for k in range(6)]
    return rum(mix(.5, *d), .15)
@ljud('prassel', 'Överallt', 'En buske eller lövhög: prassel, sedan plopp', styrka=-9)
def _():
    n = int(.3 * SR); s = np.linspace(0, 1, n); g = (rng.random(n) < .25) * 1.0
    pr = bp(brus(n) * g, 1500, 6500) * np.sin(np.pi * s) ** 1.2
    return rum(mix(.5, (0, pr, 1), (.26, L['bar'](), .6)), .1)
@ljud('dorr', 'Överallt', 'En dörr öppnas (rätt): ett knarr och ett klick', styrka=-9)
def _():
    n = int(.45 * SR); f = svep(180, 260, n) * (1 + .15 * np.sin(2 * np.pi * 9 * tid(.45)[:n]))
    knarr = bp(puls(f, n, .1), 400, 2500) * np.sin(np.pi * np.linspace(0, 1, n)) ** .8
    return rum(mix(.6, (0, L['klick'](), .7), (.06, knarr, .5)), .15)
@ljud('bonk', 'Överallt', 'En fel dörr spikas igen (förenklingen): två komiska bonk', styrka=-8)
def _():
    def b(f): n = int(.16 * SR); return sinus(svep(f, f * .6, n), n) * hylsa(n, .001, .16, 5) + .3 * lp(brus(n), 1200) * hylsa(n, .001, .03, 5)
    return rum(mix(.5, (0, b(420), 1), (.2, b(520), 1)), .12)
@ljud('stege', 'Överallt', 'Klättra på en stege: ett knack i trä per steg', styrka=-10)
def _():
    n = int(.08 * SR); return rum(bp(brus(n), 500, 2200) * hylsa(n, .001, .05, 6) + .5 * sinus(svep(700, 500, n), n) * hylsa(n, .001, .05, 6), .1)
@ljud('lock', 'Överallt', 'Ett lock öppnas (lådor, kistor): ett knarr', styrka=-10)
def _():
    n = int(.35 * SR); f = svep(140, 110, n) * (1 + .2 * np.sin(2 * np.pi * 13 * tid(.35)[:n]))
    return rum(bp(puls(f, n, .08), 300, 2200) * np.sin(np.pi * np.linspace(0, 1, n)), .15)
@ljud('radio', 'Överallt', 'Radion: Farfar talar genom den, ett kort brus', styrka=-14)
def _():
    n = int(.32 * SR); s = np.linspace(0, 1, n)
    return bp(brus(n), 900, 3800) * (np.minimum(1, s * 20) * np.minimum(1, (1 - s) * 8)) * (0.8 + 0.2 * np.sin(2 * np.pi * 50 * s))
@ljud('kapitel', 'Överallt', 'Kapitelrubriken: kort fanfar', styrka=-6)
def _():
    seq = [('G5', 0, .1), ('C6', .12, .35)]
    d = [(s, not_(ton(nn), l + .1, 'puls', l, duty=.25) * .5 + not_(ton(nn) / 2, l + .1, 'tri', l), 1) for nn, s, l in seq]
    return rum(lp(mix(.7, *d, (.12, klocka(ton('G7'), int(.5 * SR), .6, 3, .4), .2)), 5000), .2)

# Introt och startskärmen
@ljud('start', 'Introt', 'Första trycket: ett varmt startackord', styrka=-6)
def _():
    d = [(k * .03, not_(ton(nn), 1.3, 'tri', 1.2, a=.02), .8) for k, nn in enumerate(['F3', 'C4', 'F4', 'A4', 'C5'])]
    return rum(lp(mix(1.5, *d, (.1, klocka(ton('F6'), int(1 * SR), .8, 3, .9), .2)), 4000), .25, .4)
@ljud('titel_bokstav', 'Introt', 'En bokstav i ORDSTAVEN landar: en liten klang (stiger lite för varje bokstav, spela med playbackRate 1,0–1,4)', styrka=-12)
def _(): return rum(add(klocka(ton('C6'), int(.35 * SR), 1, 3.5, .3), .4 * klocka(ton('G6'), int(.3 * SR), .6, 3.5, .25)), .2)

# Prologen
@ljud('dunk', 'Prologen', 'DUNK, ägget på vinden: dovt och mjukt som en boll mot trä. Exakt samma varje gång', signatur=True, styrka=-5)
def _():
    n = int(.35 * SR); kropp = sinus(svep(150, 70, n), n) * hylsa(n, .002, .3, 4)
    tra = bp(brus(int(.04 * SR)), 300, 1500) * hylsa(int(.04 * SR), .001, .04, 5)
    return rum(mix(.5, (0, kropp, 1), (0, tra, .5)), .25)
@ljud('glitter', 'Prologen', 'Staven glimmar i mörkret: ett litet glitter', styrka=-14)
def _(): return rum(mix(.6, *[(k * .06, klocka(f, int(.3 * SR), .8, 3.5, .25), .5) for k, f in enumerate([2093, 2637, 3136, 2637])]), .25)
@ljud('puff', 'Prologen', 'Ordet blir en sak (LJUS och andra): ett mjukt puff', styrka=-10)
def _(): n = int(.3 * SR); s = np.linspace(0, 1, n); return rum(lp(brus(n), 1500) * (s ** .2) * np.exp(-6 * s), .15)
@ljud('fras', 'Prologen', 'Fel formel: staven fräser kort (ofarligt), sedan ett pff', styrka=-13)
def _():
    n = int(.35 * SR); s = np.linspace(0, 1, n)
    return rum(mix(.55, (0, bp(brus(n), 3000, 9000) * (1 - s) ** 2, .6), (.3, L['pff'](), .8)), .1)
@ljud('tut', 'Prologen', 'Fel: en leksaksbil tutar', styrka=-10)
def _(): return rum(mix(.45, (0, lp(puls(ton('A4'), int(.12 * SR), .4), 2500) * hylsa(int(.12 * SR), .005, .12, 1), .6), (.16, lp(puls(ton('A4'), int(.2 * SR), .4), 2500) * hylsa(int(.2 * SR), .005, .2, 2), .6)), .1)
@ljud('plopp', 'Prologen', 'Något ploppar ut (osten, hjälmen som trillar)', styrka=-9)
def _(): n = int(.15 * SR); return rum(sinus(svep(300, 900, n), n) * hylsa(n, .001, .15, 6) + .3 * lp(brus(n), 2000) * hylsa(n, .001, .02, 6), .12)
@ljud('tander', 'Prologen', 'Knuffen: ägget hackar tänder (frusen)', styrka=-13)
def _(): return rum(mix(.45, *[(k * .05, hp(brus(int(.015 * SR)), 2500) * hylsa(int(.015 * SR), .001, .015, 4), .8) for k in range(8)]), .08)
@ljud('sus', 'Prologen', 'Filten svävar och läggs om ägget (och repet som ringlar): ett mjukt sus', styrka=-14)
def _(): n = int(.8 * SR); s = np.linspace(0, 1, n); return rum(bp(brus(n), 400, 1800) * np.sin(np.pi * s) ** 2, .2)
@ljud('knack', 'Prologen', 'KNACK, KNACK: ägget knackar inifrån (spela två gånger)', styrka=-8)
def _(): n = int(.09 * SR); return rum(bp(brus(n), 700, 3500) * hylsa(n, .001, .05, 6) + .6 * sinus(svep(900, 600, n), n) * hylsa(n, .001, .05, 6), .1)
@ljud('kras', 'Prologen', 'KRAS: skal som spricker (och ekorrens nöt i kapitel 1)', styrka=-8)
def _():
    d = [(k * .025, bp(brus(int(.04 * SR)), 1200 + 300 * k, 7000) * hylsa(int(.04 * SR), .001, .04, 5), 1 - k * .15) for k in range(5)]
    return rum(mix(.35, *d), .12)
@ljud('kastrull', 'Prologen', 'Fel dörr: kastruller skramlar', styrka=-11)
def _(): return rum(mix(.7, *[(k * .07 + rng.uniform(0, .02), klocka(rng.uniform(500, 1200), int(.3 * SR), 3, 1.41, .25), .5) for k in range(6)]), .15)
@ljud('badanka', 'Prologen', 'Fel dörr: en badanka piper', styrka=-10)
def _():
    def p(): n = int(.18 * SR); f = svep(900, 1300, n); return bp(puls(f, n, .3), 600, 3000) * np.sin(np.pi * np.linspace(0, 1, n)) ** .5
    return rum(mix(.5, (0, p(), .6), (.25, p(), .6)), .12)
@ljud('spolning', 'Prologen', 'Fel dörr: det spolar bakom toadörren', styrka=-12)
def _(): n = int(1.0 * SR); s = np.linspace(0, 1, n); return rum(lp(brus(n), 1500 + 1500 * np.sin(np.pi * s).mean()) * np.sin(np.pi * s) ** .6 * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * s)), .2)
@ljud('vackarklocka', 'Prologen', 'Fel dörr: en väckarklocka ringer kort', styrka=-13)
def _():
    n = int(.6 * SR); s = np.linspace(0, 1, n); g = (np.sin(2 * np.pi * 22 * s) > 0) * 1.0
    return rum(klocka(2400, n, 2, 1.5, .7) * g * .8, .1)
@ljud('klirr', 'Prologen', 'Kakaokoppen trillar: ett klirr', styrka=-11)
def _(): return rum(mix(.5, *[(k * .06, klocka(f, int(.25 * SR), 2, 2.7, .2), .5) for k, f in enumerate([2600, 3100, 2800])]), .15)
@ljud('mage', 'Prologen', 'BRUM, magen kurrar', styrka=-8)
def _():
    n = int(.6 * SR); f = 80 + 25 * np.sin(2 * np.pi * 7 * tid(.6)[:n]); s = np.linspace(0, 1, n)
    return rum(lp(triangel(f, n) + .5 * brus(n), 400) * np.sin(np.pi * s) ** .8, .15)
@ljud('plums', 'Prologen', 'Ungen dyker ned i dinomaten: plums', styrka=-9)
def _(): n = int(.25 * SR); return rum(sinus(svep(600, 150, n), n) * hylsa(n, .001, .2, 4) + .4 * lp(brus(n), 1800) * hylsa(n, .001, .1, 4), .15)
@ljud('nys', 'Prologen', 'Dammoln och nysningar, ATJO bakom busken (kapitel 1): en liten nysning utan röst', styrka=-11)
def _():
    n1 = int(.25 * SR); dra = bp(brus(n1), 800, 3000) * np.linspace(0, 1, n1) ** 2 * .4
    n2 = int(.18 * SR); tjo = bp(brus(n2), 1500, 6000) * hylsa(n2, .002, .18, 4)
    return rum(mix(.5, (0, dra, 1), (.25, tjo, 1)), .12)
@ljud('kvack', 'Prologen', 'Fel låda: en leksaksgroda, KVACK', styrka=-10)
def _(): n = int(.2 * SR); f = svep(320, 260, n); return rum(bp(puls(f, n, .35), 300, 2000) * np.sin(np.pi * np.linspace(0, 1, n)) ** .4, .1)
@ljud('rull', 'Prologen', 'Bären rullar ut (och SOL rullar ut)', styrka=-12)
def _(): return rum(mix(.6, *[(k * .045, sinus(1300 + 80 * (k % 3), int(.03 * SR)) * hylsa(int(.03 * SR), .001, .03, 4), .5) for k in range(10)]), .1)
@ljud('sida', 'Prologen', 'Sagan: en sida bläddras', styrka=-13)
def _(): n = int(.3 * SR); s = np.linspace(0, 1, n); return rum(bp(brus(n), 1000, 6000) * np.sin(np.pi * s) ** 3 * (0.6 + 0.4 * np.sin(s * 30)), .1)
@ljud('boing', 'Prologen', 'Ungen studsar i sängen, saken studsar ur ryggsäcken: boing', styrka=-10)
def _(): n = int(.3 * SR); f = svep(200, 600, n) * (1 + .08 * np.sin(2 * np.pi * 18 * tid(.3)[:n])); return rum(sinus(f, n) * hylsa(n, .002, .3, 3), .1)
@ljud('kvitter', 'Prologen', 'Morgon: fåglar kvittrar utanför', styrka=-16)
def _():
    d = []
    for k in range(5):
        n = int(rng.uniform(.04, .09) * SR); f0 = rng.uniform(2800, 4200)
        d.append((k * .12 + rng.uniform(0, .05), sinus(svep(f0, f0 * rng.uniform(1.1, 1.4), n), n) * np.sin(np.pi * np.linspace(0, 1, n)), .5))
    return rum(mix(.8, *d), .2)
@ljud('slurp', 'Prologen', 'Ungen slickar hjälten på näsan', styrka=-12)
def _(): n = int(.25 * SR); s = np.linspace(0, 1, n); return rum(bp(brus(n), 400, 2000) * np.sin(np.pi * s) * (0.5 + 0.5 * sinus(svep(8, 30, n), n)), .1)
@ljud('vissling', 'Prologen', 'Farfar visslar i köket (en kort slinga)', styrka=-14)
def _():
    seq = ['A5', 'C6', 'D6', 'C6', 'A5', 'G5']; d = []
    for k, nn in enumerate(seq):
        n = int(.16 * SR); f = ton(nn) * (1 + .01 * np.sin(2 * np.pi * 6 * tid(.16)[:n]))
        d.append((k * .17, sinus(f, n) * np.sin(np.pi * np.linspace(0, 1, n)) ** .4 + .05 * lp(brus(n), 3000), .6))
    return rum(mix(1.2, *d), .25)
@ljud('luftskepp', 'Prologen', 'Luftskeppet: lågt propellersurr som växer när det närmar sig (ca 3 s)', styrka=-10)
def _():
    n = int(3 * SR); s = np.linspace(0, 1, n); f = 55 * (1 + .02 * s)
    surr = lp(puls(f, n, .3) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * s * 3))), 500) + .3 * lp(brus(n), 300)
    return rum(surr * s ** 1.5 * np.minimum(1, (1 - s) * 20), .1)
@ljud('baron', 'Prologen', 'Baronens motiv: fyra pompösa, lite fåniga toner i fagott och tuba. Spelas varje gång han dyker upp', signatur=True, styrka=-6)
def _():
    def fagott(f, l):
        n = int(l * SR); e = hylsa(n, .03, l + .1, 1.5); mod = (2.2 * e) * sinus(f, n)
        x = np.sin(2 * np.pi * fas(f * (1 + .006 * np.sin(2 * np.pi * 5 * tid(l)[:n])), n) + mod) * e
        return lp(x, 1600)
    seq = [('G3', 0, .22), ('C4', .25, .22), ('E4', .5, .22), ('C4', .75, .6)]
    d = [(s, fagott(ton(nn), l), 1) for nn, s, l in seq] + [(s, fagott(ton(nn) / 2, l), .6) for nn, s, l in seq]
    n = int(.5 * SR); d.append((1.0, fagott(ton('C4'), .5) * 0 + lp(sinus(svep(ton('C3'), ton('G2'), n), n), 900) * hylsa(n, .02, .5, 2), .5))   # en fallande vaaah
    return rum(mix(1.6, *d), .2)
@ljud('rassel', 'Prologen', 'Repstegen trasslar, låsets bygel rasslar (kapitel 1)', styrka=-12)
def _(): return rum(mix(.5, *[(k * .035 + rng.uniform(0, .01), klocka(rng.uniform(900, 1600), int(.06 * SR), 2.5, 1.7, .05), .5) for k in range(10)]), .1)

# Kapitel 1
@ljud('vingflax', 'Kapitel 1', 'Småfåglar som flyger upp: vingflax och ett litet kvitter', styrka=-14)
def _():
    d = [(k * .05, bp(brus(int(.03 * SR)), 600, 3000) * hylsa(int(.03 * SR), .002, .03, 4), .6) for k in range(6)]
    n = int(.08 * SR); d.append((.32, sinus(svep(3300, 4000, n), n) * np.sin(np.pi * np.linspace(0, 1, n)), .3))
    return rum(mix(.5, *d), .12)
@ljud('klonk', 'Kapitel 1', 'KLONK: nöten och kotten på hjälmen, kodlåset vid fel', styrka=-9)
def _():
    n = int(.25 * SR); x = klocka(330, n, 2.5, 2.76, .2) + .6 * klocka(470, n, 2, 2.4, .15)
    return rum(mix(.35, (0, x, .7)), .12)
@ljud('apa_gnall', 'Kapitel 1', 'Apan gnäller långt borta (före BUHU)', styrka=-16)
def _():
    n = int(.6 * SR); f = 520 + 120 * np.sin(2 * np.pi * 4 * tid(.6)[:n])
    x = bp(sum(sinus(f * k, n) / k for k in range(1, 5)), 400, 2200) * np.sin(np.pi * np.linspace(0, 1, n))
    return rum(lp(x, 1800), .3)
@ljud('apa_grat', 'Kapitel 1', 'BUHU: apan gråter (ofarligt och lite lustigt)', styrka=-10)
def _():
    def bu(f0, l):
        n = int(l * SR); f = svep(f0, f0 * .75, n) * (1 + .03 * np.sin(2 * np.pi * 7 * tid(l)[:n]))
        return bp(sum(sinus(f * k, n) / k ** 1.3 for k in range(1, 6)), 250, 2500) * np.sin(np.pi * np.linspace(0, 1, n)) ** .6
    return rum(mix(1.0, (0, bu(420, .3), 1), (.35, bu(380, .55), 1)), .2)
@ljud('apa_suck', 'Kapitel 1', 'Apan suckar', styrka=-14)
def _(): n = int(.6 * SR); s = np.linspace(0, 1, n); return rum(bp(brus(n), 500, 2500) * np.sin(np.pi * s) ** 1.5 * (1 - s * .5), .2)
@ljud('knarr', 'Kapitel 1', 'Nätet gungar och knakar (vid fel): ett trä- och repknarr', styrka=-12)
def _():
    n = int(.4 * SR); f = svep(110, 160, n) * (1 + .25 * np.sin(2 * np.pi * 17 * tid(.4)[:n]))
    return rum(bp(puls(f, n, .07), 250, 1800) * np.sin(np.pi * np.linspace(0, 1, n)), .12)
@ljud('pinne', 'Kapitel 1', 'Pinnstegen: ett pinnsteg fälls ut (per rätt bokstav), stiger lite för varje', styrka=-10)
def _(): n = int(.07 * SR); return rum(sinus(svep(900, 1200, n), n) * hylsa(n, .001, .07, 5) + .4 * bp(brus(n), 1000, 4000) * hylsa(n, .001, .02, 6), .1)
@ljud('duns', 'Kapitel 1', 'En lian faller, Herr Skata landar: ett mjukt duns', styrka=-9)
def _(): n = int(.25 * SR); return rum(lp(brus(n), 400) * hylsa(n, .002, .2, 5) + .6 * sinus(svep(110, 60, n), n) * hylsa(n, .001, .2, 5), .15)
@ljud('kittla', 'Kapitel 1', 'Fel SVÄRD: det lilla svärdet kittlar, ett kittlande pling', styrka=-12)
def _(): return rum(mix(.5, *[(k * .05, klocka(f, int(.12 * SR), .8, 3, .1), .6) for k, f in enumerate([2349, 2637, 2349, 2637])]), .12)
@ljud('klapp', 'Kapitel 1', 'Taggkammen klappas fast på hjälmen', styrka=-10)
def _(): n = int(.06 * SR); return rum(bp(brus(n), 800, 4000) * hylsa(n, .0005, .05, 6), .15)
@ljud('uggla', 'Kapitel 1', 'HO HO: ugglorna vid rätt träd. Två mjuka ho', styrka=-8)
def _():
    def ho(f): n = int(.32 * SR); return lp(sinus(svep(f, f * .9, n), n) + .2 * brus(n), 900) * np.sin(np.pi * np.linspace(0, 1, n)) ** .5
    return rum(mix(.85, (0, ho(ton('G4')), 1), (.42, ho(ton('E4')), 1)), .25)
@ljud('lucka_pip', 'Kapitel 1', 'Fel lucka: luckan piper (PIP) och slår igen', styrka=-10)
def _():
    n = int(.12 * SR); pip = sinus(1800, n) * np.sin(np.pi * np.linspace(0, 1, n))
    m = int(.08 * SR); small = lp(brus(m), 1200) * hylsa(m, .0005, .06, 6)
    return rum(mix(.4, (0, pip, .6), (.18, small, .9)), .1)
@ljud('klick_las', 'Kapitel 1', 'Kodlåset: HEM lyser och låset klickar upp', styrka=-9)
def _():
    def k(f): n = int(.04 * SR); return bp(brus(n), f, f * 3) * hylsa(n, .0005, .03, 6) + .5 * sinus(f, n) * hylsa(n, .0005, .03, 6)
    return rum(mix(.3, (0, k(1500), .8), (.08, k(1000), 1)), .1)
@ljud('krasch', 'Kapitel 1', 'Herr Skata kraschar i trädet: prassel, duns och fjädrar', styrka=-8)
def _(): return rum(mix(.8, (0, L['prassel'](), .8), (.12, L['duns'](), 1), (.3, L['sus'](), .4)), .15)
@ljud('hackspett', 'Kapitel 1', 'TOK TOK: hackspetten trummar, ett snabbt knattrande i trä (två trummor)', styrka=-8)
def _():
    # Som en riktig hackspett: ca 16 slag i sekunden, lite snabbare mot slutet och svagare, två trummor med paus
    r = np.random.default_rng(31)          # egen slump, så att ljuden efter inte ändras
    brus(int(.06 * SR)); brus(int(.06 * SR))   # samma förbrukning av den gemensamma slumpen som förra versionen
    def t(f, v):
        n = int(.035 * SR)
        return v * (bp(r.uniform(-1, 1, n), 900, 3800) * hylsa(n, .0004, .025, 6) + .55 * sinus(svep(f, f * .75, n), n) * hylsa(n, .0004, .025, 6))
    delar = []
    for start, antal in ((0.0, 13), (0.95, 9)):
        tid_ = start
        for k in range(antal):
            v = 1.0 - .45 * k / antal; f = 1150 - 8 * k + r.uniform(-25, 25)
            delar.append((tid_, t(f, v), 1)); tid_ += .066 - .012 * k / antal
    return rum(mix(1.65, *delar), .2)
@ljud('porl', 'Kapitel 1', 'Bäcken porlar (kort, kan spelas vid bron, inte som bakgrund)', styrka=-16)
def _():
    n = int(1.5 * SR); s = np.linspace(0, 1, n); x = np.zeros(n)
    for k in range(40):
        i = rng.integers(0, n - 4000); m = int(rng.uniform(.02, .05) * SR); f0 = rng.uniform(600, 1600)
        x[i:i + m] += sinus(svep(f0, f0 * 1.5, m), m) * np.sin(np.pi * np.linspace(0, 1, m)) * .4
    return rum(lp(x, 3000) * np.sin(np.pi * s) ** .3, .3)
@ljud('snurr', 'Kapitel 1', 'Ugglorna vrider huvudet, ungen blir yr: ett snurr', styrka=-12)
def _(): n = int(.6 * SR); f = 600 + 300 * np.sin(2 * np.pi * 5 * tid(.6)[:n]); return rum(sinus(f, n) * np.sin(np.pi * np.linspace(0, 1, n)) * .7, .15)

def aktiv_rms(x):
    """Ljudstyrkan där ljudet hörs: medel av de starkaste 30 % av 20 ms-fönstren (dB)."""
    w = int(.02 * SR); f = [np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w // 2)] or [np.sqrt(np.mean(x ** 2))]
    f = sorted(f)[-max(1, int(len(f) * .3)):]; return 20 * np.log10(np.mean(f) + 1e-12)
def normalisera(x, styrka_db):
    """styrka_db -6 är starkast (signaturer och fester), -16 svagast. Målet är ljudstyrkan där ljudet hörs
    (styrka - 14 dB), så att korta knack och långa toner låter lika starka. Toppen hålls under -1 dBFS."""
    x = x - np.mean(x); x[:64] *= np.linspace(0, 1, 64); x[-256:] *= np.linspace(1, 0, 256)
    x = x * 10 ** ((styrka_db - 14 - aktiv_rms(x)) / 20)
    m = np.max(np.abs(x))
    if m > 10 ** (-1 / 20): x = x / m * 10 ** (-1 / 20)
    return x

if __name__ == '__main__':
    os.makedirs(UT, exist_ok=True)
    from scipy.io import wavfile
    lista = {}
    for id, fn in L.items():
        x = normalisera(fn(), INFO[id]['styrka_db'])
        wavfile.write(UT + id + '.wav', SR, (x * 32767).astype(np.int16))
        lista[id] = dict(INFO[id], fil='ljud/effekter/%s.wav' % id, sekunder=round(len(x) / SR, 2))
    with open(UT + 'ljud.json', 'w') as f: json.dump(lista, f, ensure_ascii=False, indent=1)
    print(len(lista), 'ljud,', round(sum(os.path.getsize(UT + i + '.wav') for i in lista) / 1e6, 2), 'MB')
