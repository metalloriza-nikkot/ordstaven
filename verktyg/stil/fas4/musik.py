# Fas 4 (beslut 61.3): ett kort prov på musiken. Stil 2026-11-08.
# Mjuk chiptune utan sångtext, gjord helt i skript (ingen CC0, inget att licensiera): fyra kanaler som en gammal
# spelkonsol, men mjukare. Melodi på en rund pulsvåg, brutna ackord på en tunn pulsvåg, bas på en stegad
# triangelvåg och ett mycket lätt trumspår av brus. Ett eko ger värme. Låten går i loop utan skarv.
# Användning: python3 fas4/musik.py [ut.mp3]
import os, sys, subprocess, numpy as np
SR = 44100
SPEL = os.environ.get('KLANG') == 'spel'      # KLANG=spel: den mjukare klangen för spelet (ingen pulsvåg, inga trummor)
BPM = 80 if SPEL else 92
ATTONDEL = 60 / BPM / 2                       # en åttondel i sekunder
TAKT = 8                                      # åttondelar per takt

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
N = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}
def m(s):
    """'A4' -> midi"""
    return 12 * (int(s[-1]) + 1) + N[s[:-1]]

# ---------------------------------------------------------------- noterna (F-dur, 16 takter)
MELODI = [  # (ton eller None, åttondelar)
    ('A4', 2), ('C5', 2), ('F5', 3), ('E5', 1),            # F
    ('D5', 2), ('C5', 2), ('G4', 4),                        # C/E
    ('F4', 2), ('A4', 2), ('D5', 3), ('C5', 1),             # Dm
    ('Bb4', 2), ('A4', 1), ('G4', 1), ('F4', 4),            # Bb
    ('A4', 2), ('C5', 2), ('F5', 2), ('G5', 2),             # F
    ('G5', 2), ('E5', 2), ('C5', 4),                        # C
    ('D5', 2), ('Bb4', 2), ('D5', 2), ('C5', 1), ('Bb4', 1),# Bb
    ('A4', 2), ('G4', 2), ('C5', 2), (None, 2),             # C
    ('D5', 3), ('E5', 1), ('F5', 2), ('D5', 2),             # Dm
    ('C5', 3), ('D5', 1), ('E5', 2), ('C5', 2),             # Am
    ('Bb4', 2), ('C5', 2), ('D5', 2), ('F5', 2),            # Bb
    ('E5', 2), ('C5', 2), ('A4', 4),                        # F
    ('Bb4', 2), ('D5', 2), ('G5', 3), ('F5', 1),            # Gm
    ('E5', 2), ('G4', 1), ('A4', 1), ('Bb4', 2), ('C5', 2), # C7
    ('A4', 2), ('C5', 2), ('F5', 2), ('E5', 1), ('D5', 1),  # F
    ('C5', 4), (None, 2), ('G4', 1), ('A4', 1),             # F, tillbaka till början
]
ACKORD = ['F', 'C/E', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'C7', 'F', 'F']
TONER = {'F': ['F3', 'A3', 'C4'], 'C/E': ['E3', 'G3', 'C4'], 'Dm': ['D3', 'F3', 'A3'], 'Bb': ['Bb2', 'D3', 'F3'],
         'C': ['C3', 'E3', 'G3'], 'Am': ['A2', 'C3', 'E3'], 'Gm': ['G2', 'Bb2', 'D3'], 'C7': ['C3', 'E3', 'Bb3']}
BAS = {'F': 'F2', 'C/E': 'E2', 'Dm': 'D2', 'Bb': 'Bb2', 'C': 'C2', 'Am': 'A2', 'Gm': 'G2', 'C7': 'C2'}   # så låg att den hörs i en läsplatta

LANGD = len(ACKORD) * TAKT * ATTONDEL
NS = int(round(LANGD * SR))

# ---------------------------------------------------------------- ljuden
def hylsa(n, a=0.01, d=0.25, s=0.55, r=0.12, langd=None):
    """ADSR över n prover, där tonen hålls langd prover och sedan klingar ut på r sekunder."""
    t = np.arange(n) / SR; h = (langd or n) / SR
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    ut = np.clip(1 - (t - h) / r, 0, 1)
    return e * np.where(t > h, ut, 1)

def puls(f, n, duty=0.25, vib=0.0):
    t = np.arange(n) / SR
    fas = np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.18) / 0.2, 0, 1)) / SR)
    return np.where((fas % 1) < duty, 1.0, -1.0) - (2 * duty - 1)

def triangel(f, n):
    fas = (np.arange(n) * f / SR) % 1
    tri = 4 * np.abs(fas - 0.5) - 1
    return np.round(tri * 7.5) / 7.5                     # 16 steg, som de gamla konsolerna

def lagpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); v = 0.0
    for i in range(len(x)): v = (1 - a) * x[i] + a * v; y[i] = v
    return y

def lagg(spar, start_s, ljud):
    i = int(round(start_s * SR)); j = i + len(ljud)
    if j <= NS: spar[i:j] += ljud
    else: spar[i:] += ljud[:NS - i]; spar[:j - NS] += ljud[NS - i:]   # svansen loopar till början

mel = np.zeros(NS); arp = np.zeros(NS); bas = np.zeros(NS); trum = np.zeros(NS)

t = 0.0
for ton, d in MELODI:
    if ton:
        h = int(d * ATTONDEL * SR * 0.92); n = h + int(0.14 * SR)
        if SPEL:                                   # en rund ton: triangel och sinus, mjuk ansats
            tt = np.arange(n) / SR; f = hz(m(ton))
            vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt) * np.clip((tt - 0.2) / 0.3, 0, 1)
            fas = np.cumsum(f * vib / SR)
            ljud = 0.55 * np.sin(2 * np.pi * fas) + 0.45 * (4 * np.abs(fas % 1 - 0.5) - 1)
            lagg(mel, t, ljud * hylsa(n, 0.03, 0.3, 0.55, 0.25, h))
        else:
            lagg(mel, t, puls(hz(m(ton)), n, 0.25, 0.006) * hylsa(n, 0.008, 0.2, 0.6, 0.12, h))
    t += d * ATTONDEL

for k, ack in enumerate(ACKORD):
    toner = [m(x) + 12 for x in TONER[ack]]
    monster = [0, 1, 2, 1, 0, 1, 2, 1] if k % 2 == 0 else [0, 2, 1, 2, 0, 2, 1, 2]
    for i, idx in enumerate(monster):
        n = int(ATTONDEL * SR * 1.6)
        styrka = 0.0 if k < 2 else 1.0                                   # ackorden kommer in i takt 3
        if SPEL:
            lagg(arp, (k * TAKT + i) * ATTONDEL, styrka * triangel(hz(toner[idx]), n) * hylsa(n, 0.02, 0.15, 0.3, 0.1, int(n * 0.6)))
        else:
            lagg(arp, (k * TAKT + i) * ATTONDEL, styrka * puls(hz(toner[idx]), n, 0.125) * hylsa(n, 0.004, 0.12, 0.25, 0.06, int(n * 0.6)))
    rot = m(BAS[ack])
    for i, (steg, d) in enumerate([(0, 2), (7, 2), (12, 2), (7, 1), (0, 1)]):
        start = k * TAKT + sum(x[1] for x in [(0, 2), (7, 2), (12, 2), (7, 1), (0, 1)][:i])
        h = int(d * ATTONDEL * SR * 0.85); n = h + int(0.05 * SR)
        lagg(bas, start * ATTONDEL, triangel(hz(rot + steg), n) * hylsa(n, 0.004, 0.1, 0.8, 0.04, h))
    if k >= 4 and not SPEL:                                              # trummorna från takt 5 (inte i spelet)
        for i in range(TAKT):
            if i in (0, 4):                                              # en mjuk dov kick
                n = int(0.16 * SR); tt = np.arange(n) / SR
                f = 110 * np.exp(-tt * 22) + 45
                lagg(trum, (k * TAKT + i) * ATTONDEL, 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18))
            if i % 2 == 1:                                               # ett lätt tsst på efterslagen
                n = int(0.05 * SR)
                brus = np.random.default_rng(k * 8 + i).uniform(-1, 1, n)
                lagg(trum, (k * TAKT + i) * ATTONDEL, 0.22 * (brus - lagpass(brus, 3000)) * np.exp(-np.arange(n) / SR * 70))

mel = lagpass(mel, 2400 if SPEL else 3600); arp = lagpass(arp, 1600 if SPEL else 2600); bas = lagpass(bas, 1200 if SPEL else 1800)
mix_v = 0.30 * mel + 0.16 * arp + 0.30 * bas + 0.35 * trum
mix_h = 0.30 * mel + 0.16 * np.roll(arp, int(0.012 * SR)) + 0.30 * bas + 0.35 * trum
# ekot: en punkterad åttondel, i loop (det som ekar ut i slutet kommer tillbaka i början)
ek = int(round(ATTONDEL * 1.5 * SR))
for kanal, sida in ((mix_v, 0.26), (mix_h, 0.20)):
    e = np.roll(0.30 * mel + 0.16 * arp, ek) * sida
    kanal += e + np.roll(e, ek) * 0.45
stereo = np.stack([mix_v, mix_h], 1)

# ---------------------------------------------------------------- looparna till spelet (fas 4, godkända 2026-11-08)
def spara_loop(ut_utan_andelse, buffert=0.5):
    """En loop med en halv sekund av loopens slut före och en halv sekund av dess början efter.
    Spelet sätter loopStart = 0,5 s och loopEnd = 0,5 s + loopens längd. Lägger avkodaren till lite tystnad
    i början, flyttas båda punkterna lika mycket, och skarven hörs ändå inte."""
    b = int(buffert * SR)
    l = stereo * (10 ** (-3 / 20) / np.max(np.abs(stereo)))
    if SPEL: l = l * 10 ** (-3.6 / 20)
    hel = np.concatenate([l[-b:], l, l[:b]])
    pcm = (hel * 32767).astype('<i2').tobytes()
    for ext, kodek in (('m4a', ['-c:a', 'aac', '-b:a', '128k']), ('ogg', ['-c:a', 'libvorbis', '-q:a', '4'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-'] + kodek
                       + [ut_utan_andelse + '.' + ext], input=pcm, check=True)
    return {'loopStart_s': buffert, 'loopEnd_s': round(buffert + len(l) / SR, 6), 'loopens_langd_s': round(len(l) / SR, 6)}

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[1] == 'loop':
    import json
    print(json.dumps(spara_loop(sys.argv[2])))
    sys.exit()
if __name__ == '__main__':
    ut = sys.argv[1] if len(sys.argv) > 1 else '/tmp/musik_prov.mp3'
    varv = 2                                                            # två varv, så att loopen hörs
    spel = np.concatenate([stereo] * varv + [stereo[:int(4 * SR)]])
    sv = int(4 * SR); spel[-sv:] *= np.linspace(1, 0, sv)[:, None]     # tonar ut i slutet av provet
    spel *= 10 ** (-3 / 20) / np.max(np.abs(spel))
    if SPEL: spel *= 10 ** (-3.6 / 20)                                   # samma ljudstyrka som menyns prov (ca −17 LUFS)
    pcm = (spel * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-c:a', 'libmp3lame', '-q:a', '3', ut], input=pcm, check=True)
    loop = '/tmp/musik_loop.wav'
    l2 = stereo * (10 ** (-3 / 20) / np.max(np.abs(stereo)))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', loop],
                   input=(l2 * 32767).astype('<i2').tobytes(), check=True)
    print(ut, f'{LANGD:.1f} s per varv, {len(spel) / SR:.0f} s i provet')

