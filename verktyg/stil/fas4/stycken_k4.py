# Kapitel 4 (beslut 121.2): ett kort stycke för raset, i samma klangfamilj som slingorna och styckena i kapitel 3.
# Baronen och Herr Skata gör något dumt med flit: det ska vara roligt och spännande, aldrig läskigt.
#   stycke_raset  ca 12,5 s  följer regin blocket_lyfts i fem delar:
#     0,0–2,2   skeppet sänker sig över blocket: ett smygande, nedåtgående motiv i d-moll (fagott-aktigt, staccato)
#     2,2–4,6   Herr Skata knyter fel: fumliga snabba toner, en sur ton och en tyst paus (PLONK vid 4,0)
#     4,6–6,6   rätt knut och baronen hejar: en kort, kaxig fanfar i D-dur (DRA! kan stå vid 6,0)
#     6,6–9,4   repet spänns: tremolo som klättrar och en pukvirvel som växer
#     9,4       blocket slits loss: ett stort slag, och sedan muller som rullar nedåt (sprickan till snön)
#     ca 12,5   slutar på en låg, öppen ton: snön hänger i luften tills STOR SKÖLD är skriven
# Användning: python3 fas4/stycken_k4.py <ut-mapp>   (skriver stycke_raset.ogg och .m4a, stereo, 44,1 kHz)
import sys, os, numpy as np
_s = open('/home/claude/fas4/stycken_k3.py').read()
exec(_s[:_s.index('def skuggan():')])
rng = np.random.default_rng(41)

def fagott(f, sek, v=1.0):
    """Ett kort, lite nasalt och komiskt blåsljud (triangel genom lågpass, med en liten tonhöjdsdipp)."""
    n = int(sek * SR); t = np.arange(n) / SR
    fr = f * (1 - 0.015 * np.exp(-t * 30))
    x = 4 * np.abs((np.cumsum(fr) / SR) % 1 - 0.5) - 1
    x = x + 0.35 * np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR))           # lite kant
    return lagpass(x, 1400) * hylsa(n, 0.008, 0.06, 0.6, 0.05, n) * v

def brus(sek, fc=3000):
    n = int(sek * SR); return lagpass(rng.standard_normal(n), fc)

def raset():
    L = 12.6; mitt = spar(L); sida = spar(L); slag = spar(L)
    # 1. skeppet sänker sig (0–2,2): ett smygande motiv nedåt, pizzicato i basen
    for k, (nn, t0) in enumerate((('A3', 0.0), ('F3', 0.3), ('D3', 0.6), ('C#3', 0.9), ('D3', 1.2), ('A2', 1.6))):
        lagg(mitt, t0, fagott(hz(m(nn)), 0.22), 0.5)
    for t0, nn in ((0.0, 'D2'), (0.6, 'A1'), (1.2, 'D2'), (1.6, 'A1')):
        lagg(mitt, t0, lagpass(triangel(hz(m(nn)), int(0.2 * SR)), 500) * np.exp(-np.arange(int(0.2 * SR)) / SR * 14), 0.6)
    # 2. Skata knyter fel (2,2–4,6): fumliga toner, en sur ton, och en tyst paus
    fum = ['D5', 'E5', 'F5', 'E5', 'D5', 'F5', 'G5', 'F5', 'E5', 'G5', 'A5', 'G5']
    for i, nn in enumerate(fum):
        t0 = 2.2 + i * 0.13 + (0.04 if i % 3 == 1 else 0)
        n = int(0.11 * SR); lagg(sida, t0, triangel(hz(m(nn)), n) * hylsa(n, 0.002, 0.04, 0.3, 0.03, n), 0.5)
    lagg(mitt, 4.0, fagott(hz(m('Ab2')), 0.45), 0.55)                         # PLONK: fel knut
    lagg(sida, 4.0, fagott(hz(m('D3')), 0.45), 0.25)
    # 3. rätt knut och baronen hejar (4,6–6,6): en kaxig liten fanfar
    fan = [('D4', 4.6, 0.12), ('F#4', 4.75, 0.12), ('A4', 4.9, 0.12), ('D5', 5.05, 0.45), ('A4', 5.6, 0.12), ('D5', 5.75, 0.6)]
    for nn, t0, d in fan: lagg(sida, t0, dragspel(hz(m(nn)), d, a=0.01, r=0.08), 0.26)
    for nn, t0, d in (('D3', 4.6, 0.4), ('A2', 5.05, 0.5), ('D3', 5.75, 0.7)):
        lagg(mitt, t0, lagpass(triangel(hz(m(nn)), int(d * SR)), 900) * np.clip((d - np.arange(int(d * SR)) / SR) / 0.1, 0, 1), 0.5)
    lagg(slag, 5.05, puka(0.4), 0.5); lagg(slag, 5.75, puka(0.5), 0.6)
    # 4. repet spänns (6,6–9,4): tremolo som klättrar, och en pukvirvel som växer
    klatt = ['D4', 'Eb4', 'E4', 'F4', 'F#4', 'G4', 'Ab4', 'A4']
    for k, nn in enumerate(klatt):
        t0 = 6.6 + k * 0.35; n = int(0.36 * SR); tt = np.arange(n) / SR
        trem = (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 14 * tt)))
        lagg(sida, t0, dragspel(hz(m(nn)), 0.36, a=0.02, r=0.02) * trem, 0.10 + 0.04 * k)
        lagg(sida, t0, dragspel(hz(m(nn)) / 2, 0.36, a=0.02, r=0.02) * trem, 0.06 + 0.02 * k)
    for k in range(int(2.8 / 0.06)):
        x = 6.6 + k * 0.06; lagg(slag, x, puka(0.18), 0.08 + 0.4 * (x - 6.6) / 2.8)
    n = int(0.9 * SR); tt = np.arange(n) / SR                                 # repet knarrar
    lagg(mitt, 8.3, lagpass(np.sin(2 * np.pi * np.cumsum(180 + 60 * np.sin(2 * np.pi * 7 * tt)) / SR) * np.sin(np.pi * tt / tt[-1]), 1200), 0.18)
    # 5. blocket slits loss (9,4): ett stort slag, grus, och muller som rullar nedåt
    S = 9.4
    lagg(slag, S, puka(1.2), 1.2)
    lagg(mitt, S, brus(0.5, 2500) * np.exp(-np.arange(int(0.5 * SR)) / SR * 9), 0.7)
    lagg(mitt, S, lagpass(triangel(hz(m('D1')) * 2, int(3.2 * SR)), 300) * np.exp(-np.arange(int(3.2 * SR)) / SR * 0.8), 0.9)
    for k, nn in enumerate(('A3', 'F3', 'D3', 'A2', 'F2', 'D2')):            # sprickan rullar ned mot snön
        lagg(mitt, S + 0.25 + k * 0.28, fagott(hz(m(nn)), 0.24), 0.32)
    n = int(2.8 * SR); tt = np.arange(n) / SR
    mull = lagpass(rng.standard_normal(n), 220) * (0.5 + 0.5 * np.sin(2 * np.pi * 3.2 * tt) ** 2) * np.exp(-tt * 0.9)
    lagg(mitt, S + 0.2, mull, 1.6)
    for nn in ('D3', 'A3', 'E4'):                                              # en öppen kvint med nia som hänger kvar (snön i luften)
        lagg(sida, S + 1.4, sin_ton(hz(m(nn)), 1.8, a=0.6, r=0.9), 0.12)
    return stereo(lagpass(mitt + 0.5 * slag, 2000), lagpass(sida, 3400))

if __name__ == '__main__':
    ut = sys.argv[1] if len(sys.argv) > 1 else '/tmp'; os.makedirs(ut, exist_ok=True)
    st = raset()
    for ext, k in (('m4a', ['-c:a', 'aac', '-b:a', '128k']), ('ogg', ['-c:a', 'libvorbis', '-q:a', '4'])):
        ffmpeg(st, f'{ut}/stycke_raset.{ext}', k)
    print('stycke_raset', round(len(st) / SR, 2), 's')
