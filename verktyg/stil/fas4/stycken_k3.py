# Kapitel 3 (beslut 103.3.5): två korta stycken, inga slingor, i samma klangfamilj som slingorna (slingor.py).
# De spelas bara efter rätt svar och aldrig medan han läser eller räknar, så de avslöjar inget.
#   stycke_skuggan  ca 3,5 s  en mystisk ton när skuggan stiger efter det första tutet: d-moll, mjukt och nyfiket, inte läskigt
#   stycke_seger    ca 3,2 s  segern i ordduellen (106.5): en glad stöt, ett löp upp och ett slutackord med klockor
#   stycke_on       ca 8,5 s  en uppbyggnad när ön stiger efter fem tut: basen klättrar, ackorden växer, och ett ljust
#                        F-dur-slag vid 7,0 s, när huvudet bryter ytan. Sedan en kort svans.
# Användning: python3 fas4/stycken_k3.py <ut-mapp>   (skriver <namn>.ogg och <namn>.m4a, stereo, 44,1 kHz)
import sys, os, numpy as np
_s = open('/home/claude/fas4/slingor.py').read()
exec(_s[:_s.index('# ---------------------------------------------------------------- slingorna')])
exec(_s[_s.index('# ---------------------------------------------------------------- byggstenarna'):_s.index("if __name__ == '__main__':")])
rng = np.random.default_rng(11)

def spar(sek): return np.zeros(int(sek * SR))
def lagg(x, start, ljud, v=1.0):
    i = int(start * SR); j = min(len(x), i + len(ljud)); x[i:j] += v * ljud[:j - i]
def sin_ton(f, sek, a=0.3, r=0.6):
    n = int(sek * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.clip(t / a, 0, 1) * np.clip((sek - t) / r, 0, 1)
def klocka(f, sek=1.2):
    n = int(sek * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t + 1.1 * np.exp(-t * 7) * np.sin(2 * np.pi * 3.5 * f * t)) * np.exp(-t * 2.5)
def dragspel(f, sek, a=0.05, r=0.15):
    n = int(sek * SR); t = np.arange(n) / SR
    x = 0.5 * (4 * np.abs((f * 1.0035 * t) % 1 - 0.5) - 1) + 0.5 * (4 * np.abs((f * 0.9965 * t) % 1 - 0.5) - 1)
    return x * (1 + 0.08 * np.sin(2 * np.pi * 5.5 * t)) * np.clip(t / a, 0, 1) * np.clip((sek - t) / r, 0, 1)
def puka(sek=0.5):
    n = int(sek * SR); t = np.arange(n) / SR; f = 90 * np.exp(-t * 8) + 55
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
def stereo(mitt, sida, fordrojning=0.012):
    v = mitt + sida; h = mitt + np.roll(sida, int(fordrojning * SR))
    st = np.stack([v, h], 1); return st * (10 ** (-3 / 20) / np.max(np.abs(st))) * 10 ** (-3.6 / 20)

def skuggan():
    L = 3.6; mitt = spar(L); sida = spar(L)
    for nm in ('D3', 'F3', 'A3', 'E4'):                                         # ett d-moll med en nia som sväller och lägger sig
        lagg(sida, 0.0, sin_ton(hz(m(nm)), 3.4, a=1.1, r=1.6), 0.16)
    lagg(mitt, 0.0, lagpass(triangel(hz(m('D2')), int(3.4 * SR)), 500) * np.clip(np.arange(int(3.4 * SR)) / SR / 0.8, 0, 1)
         * np.clip((3.4 - np.arange(int(3.4 * SR)) / SR) / 1.4, 0, 1), 0.22)
    lagg(sida, 0.7, klocka(hz(m('A4')), 1.6), 0.22)                             # två frågande klockor
    lagg(sida, 1.5, klocka(hz(m('E5')), 1.8), 0.16)
    n = int(1.6 * SR); t = np.arange(n) / SR                                    # något stort som glider förbi, långt ned
    lagg(mitt, 1.4, np.sin(2 * np.pi * np.cumsum(hz(m('A1')) * (1 + 0.25 * t / t[-1])) / SR) * np.sin(np.pi * t / t[-1]) ** 2, 0.25)
    return stereo(lagpass(mitt, 1500), lagpass(sida, 3000))

def on_stiger():
    L = 8.6; mitt = spar(L); sida = spar(L); slag = spar(L)
    for k, (nm, ack, s, d) in enumerate([('F2', ['F3', 'A3', 'C4'], 0.0, 1.6), ('G2', ['G3', 'Bb3', 'D4'], 1.6, 1.4),
                                          ('A2', ['A3', 'C4', 'F4'], 3.0, 1.2), ('Bb2', ['Bb3', 'D4', 'F4'], 4.2, 1.2),
                                          ('C3', ['C4', 'E4', 'G4', 'Bb4'], 5.4, 1.6)]):
        v = 0.22 + 0.12 * k                                                     # allt växer, men slaget är starkast
        lagg(mitt, s, lagpass(triangel(hz(m(nm)), int(d * SR)), 900) * np.clip((d - np.arange(int(d * SR)) / SR) / 0.1, 0, 1), 0.5 * v)
        for nn in ack: lagg(sida, s, dragspel(hz(m(nn)), d + 0.05, a=0.25), 0.13 * v)
    t = 0.0; steg = 0.30                                                        # ett brutet ackord som går allt fortare
    arp = ['F4', 'A4', 'C5', 'A4', 'G4', 'Bb4', 'D5', 'Bb4', 'A4', 'C5', 'F5', 'C5', 'Bb4', 'D5', 'F5', 'D5', 'C5', 'E5', 'G5', 'Bb5', 'C6', 'Bb5', 'G5', 'E5']
    i = 0
    while t < 6.9:
        nn = arp[i % len(arp)] if t < 5.4 else ['C5', 'E5', 'G5', 'Bb5'][i % 4]
        n = int(steg * SR * 1.5)
        lagg(sida, t, triangel(hz(m(nn)), n) * hylsa(n, 0.003, 0.08, 0.3, 0.06, int(n * 0.6)), 0.10 + 0.08 * t / 7)
        t += steg; steg = max(0.11, steg * 0.955); i += 1
    for k in range(int((6.9 - 4.6) / 0.07)):                                    # en mjuk pukvirvel som växer mot slaget
        x = 4.6 + k * 0.07; lagg(slag, x, puka(0.2), 0.12 + 0.35 * (x - 4.6) / 2.3)
    S = 7.0                                                                     # slaget: huvudet bryter ytan
    lagg(slag, S, puka(0.9), 1.0)
    lagg(mitt, S, lagpass(triangel(hz(m('F2')), int(1.5 * SR)), 900) * np.exp(-np.arange(int(1.5 * SR)) / SR * 2), 0.8)
    for nn in ('F4', 'A4', 'C5', 'F5'): lagg(sida, S, dragspel(hz(m(nn)), 1.5, a=0.01, r=0.9), 0.16)
    for k, nn in enumerate(('C6', 'F6', 'A6', 'C7')): lagg(sida, S + 0.08 * k, klocka(hz(m(nn)), 1.4), 0.12)
    return stereo(lagpass(mitt + 0.5 * slag, 1800), lagpass(sida, 3200))

def seger():
    """Segern i ordduellen (ca 3 s): en glad stöt i dur, ett kort löp upp och ett slutackord med klockor."""
    L = 3.2; mitt = spar(L); sida = spar(L); slag = spar(L)
    melodi = [('C5', 0.0, 0.14), ('E5', 0.15, 0.14), ('G5', 0.30, 0.14), ('C6', 0.45, 0.5),
              ('A5', 1.0, 0.14), ('C6', 1.15, 0.14), ('D6', 1.3, 0.14), ('E6', 1.45, 1.4)]
    for nn, s0, d in melodi: lagg(sida, s0, dragspel(hz(m(nn)), d, a=0.01, r=0.08 if d < 0.3 else 0.6), 0.32)
    for nn, s0, d in (('C3', 0.0, 0.9), ('F2', 1.0, 0.45), ('G2', 1.15, 0.3), ('C3', 1.45, 1.6)):
        lagg(mitt, s0, lagpass(triangel(hz(m(nn)), int(d * SR)), 900) * np.clip((d - np.arange(int(d * SR)) / SR) / 0.2, 0, 1), 0.6)
    for nn in ('C4', 'E4', 'G4'): lagg(sida, 1.45, dragspel(hz(m(nn)), 1.6, a=0.01, r=0.9), 0.14)
    for k, nn in enumerate(('G6', 'C7', 'E7')): lagg(sida, 1.45 + 0.07 * k, klocka(hz(m(nn)), 1.4), 0.10)
    lagg(slag, 0.0, puka(0.5), 0.8); lagg(slag, 1.45, puka(0.9), 1.0)
    return stereo(lagpass(mitt + 0.5 * slag, 1800), lagpass(sida, 3400))


if __name__ == '__main__':
    ut = sys.argv[1] if len(sys.argv) > 1 else '/tmp'; os.makedirs(ut, exist_ok=True)
    import sys as _s
    val = _s.argv[2:] or ['stycke_skuggan', 'stycke_on', 'stycke_seger']
    for namn, fn in [(n, f) for (n, f) in (('stycke_skuggan', skuggan), ('stycke_on', on_stiger), ('stycke_seger', seger)) if n in val]:
        st = fn()
        for ext, k in (('m4a', ['-c:a', 'aac', '-b:a', '128k']), ('ogg', ['-c:a', 'libvorbis', '-q:a', '4'])):
            ffmpeg(st, f'{ut}/{namn}.{ext}', k)
        print(namn, round(len(st) / SR, 2), 's')
