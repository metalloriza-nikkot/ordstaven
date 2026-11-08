# Fas 4: fler musikslingor i samma familj som menyns och spelets (musik.py). Stil 2026-11-08.
# Samma mjuka klang som spelets slinga: melodin på sinus och triangel, brutna ackord på en knäppt triangel,
# bas på en stegad triangel. Varje slinga börjar med familjens motiv (3-5-1-7 i sin tonart, som menyn).
# Användning: python3 fas4/slingor.py <namn> [prov.mp3]      (ett prov med två varv)
#             python3 fas4/slingor.py <namn> loop <ut utan ändelse>   (loopen till ljud/musik/, som musik.py)
import sys, subprocess, json, numpy as np
SR = 44100
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
N = {n: i for i, n in enumerate(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'])}
def m(s): return 12 * (int(s[-1]) + 1) + N[s[:-1]]

# ---------------------------------------------------------------- slingorna
SLINGOR = {
  # Skogen (kapitel 1): nyfiken och lätt, i 6/8 så att den gungar som en promenad. G-dur.
  'skogen': dict(
    attondel=60 / 66 / 3, takt=6, ton_bas='G',
    melodi=[
      [('B4', 2), ('D5', 1), ('G5', 2), ('F#5', 1)], [('E5', 2), ('D5', 1), ('A4', 3)],
      [('G4', 2), ('B4', 1), ('E5', 2), ('D5', 1)], [('C5', 2), ('B4', 1), ('A4', 2), ('G4', 1)],
      [('B4', 2), ('D5', 1), ('G5', 2), ('A5', 1)], [('B5', 2), ('G5', 1), ('E5', 3)],
      [('C5', 1), ('D5', 1), ('E5', 1), ('A5', 2), ('G5', 1)], [('F#5', 3), (None, 1), ('D5', 1), ('E5', 1)],
      [('B4', 2), ('D5', 1), ('G5', 2), ('F#5', 1)], [('E5', 2), ('F#5', 1), ('D5', 3)],
      [('G5', 2), ('F#5', 1), ('E5', 2), ('B4', 1)], [('C5', 2), ('E5', 1), ('G5', 3)],
      [('A5', 2), ('G5', 1), ('E5', 2), ('C5', 1)], [('D5', 2), ('F#5', 1), ('A5', 2), ('F#5', 1)],
      [('G5', 3), ('D5', 2), ('B4', 1)], [('G4', 3), (None, 3)],
      [('E5', 3), ('G5', 2), ('E5', 1)], [('F#5', 3), ('A5', 2), ('F#5', 1)],
      [('D5', 2), ('F#5', 1), ('B5', 2), ('A5', 1)], [('G5', 3), ('E5', 3)],
      [('C5', 2), ('E5', 1), ('G5', 2), ('E5', 1)], [('D5', 2), ('F#5', 1), ('A5', 2), ('D5', 1)],
      [('C5', 2), ('B4', 1), ('A4', 2), ('G4', 1)], [('F#4', 2), ('A4', 1), ('C5', 2), ('D5', 1)],
    ],
    ackord=['G', 'D/F#', 'Em', 'C', 'G', 'Em', 'Am', 'D', 'G', 'D/F#', 'Em', 'C', 'Am', 'D', 'G', 'G',
            'C', 'D', 'Bm', 'Em', 'C', 'D', 'Am7', 'D7'],
    arp_monster=[0, 1, 2, 3, 2, 1], bas_monster=[(0, 3), (7, 3)], skakare=True, flojt=0.25,
  ),
  # Natten på vinden (prologens början): en vaggvisa i 3/4 på speldosa, sparsam och trygg. D-dur.
  'natten': dict(
    attondel=60 / 63 / 2, takt=6, ton_bas='D', lead='klocka', pad=0.10, arp_styrka=0.10, mel_fc=3200, bas_styrka=0.18,
    melodi=[
      [('F#4', 2), ('A4', 2), ('D5', 2)], [('C#5', 4), (None, 2)],
      [('B4', 2), ('D5', 2), ('F#5', 2)], [('E5', 4), ('D5', 2)],
      [('F#4', 2), ('A4', 2), ('D5', 2)], [('E5', 2), ('G5', 2), ('F#5', 2)],
      [('D5', 2), ('B4', 2), ('G4', 2)], [('A4', 6)],
      [('B4', 2), ('D5', 2), ('G5', 2)], [('F#5', 4), ('A4', 2)],
      [('G4', 2), ('B4', 2), ('E5', 2)], [('C#5', 4), ('E5', 2)],
      [('D5', 2), ('F#5', 2), ('B5', 2)], [('G5', 2), ('E5', 2), ('B4', 2)],
      [('E5', 2), ('C#5', 2), ('A4', 2)], [('D5', 4), (None, 2)],
    ],
    ackord=['D', 'A/C#', 'Bm', 'Em', 'D', 'Em', 'G', 'A', 'G', 'D/F#', 'Em', 'A', 'Bm', 'Em', 'A', 'D'],
    arp_monster=[0, None, 1, None, 2, None], bas_monster=[(0, 6)],
  ),
  # Räddning (apan i nätet, ungen i nöd, senare ordduellen): lite snabbare och modig, aldrig farlig. D-moll.
  'raddning': dict(
    attondel=60 / 112 / 2, takt=8, ton_bas='D', lead='mjuk', trummor=True, mel_fc=3000, ek_attondelar=3,
    melodi=[
      [('F4', 2), ('A4', 2), ('D5', 3), ('C#5', 1)], [('D5', 2), ('E5', 2), ('F5', 4)],
      [('F5', 2), ('D5', 2), ('Bb4', 2), ('D5', 2)], [('E5', 3), ('D5', 1), ('C5', 4)],
      [('F4', 2), ('A4', 2), ('D5', 3), ('C#5', 1)], [('D5', 2), ('F5', 2), ('A5', 4)],
      [('G5', 2), ('F5', 2), ('E5', 2), ('D5', 2)], [('C#5', 4), ('E5', 4)],
      [('F5', 2), ('E5', 1), ('F5', 1), ('A5', 2), ('F5', 2)], [('E5', 2), ('D5', 1), ('E5', 1), ('G5', 2), ('E5', 2)],
      [('D5', 2), ('C5', 1), ('D5', 1), ('F5', 2), ('D5', 2)], [('C#5', 2), ('E5', 2), ('A5', 4)],
      [('D5', 2), ('F5', 2), ('A5', 2), ('F5', 2)], [('G5', 2), ('F5', 2), ('D5', 2), ('Bb4', 2)],
      [('C#5', 2), ('E5', 2), ('G5', 2), ('E5', 2)], [('D5', 4), (None, 4)],
    ],
    ackord=['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A', 'F', 'C', 'Bb', 'A', 'Dm', 'Gm', 'A7', 'Dm'],
    arp_monster=[0, 1, 2, 1, 0, 1, 2, 1], bas_monster=[(0, 1), (12, 1)] * 4,
  ),
  # Lägerelden (kapitlets slut, sagan): lugn och varm, som en gitarr vid elden. C-dur.
  'lagerelden': dict(
    attondel=60 / 72 / 2, takt=8, ton_bas='C', lead='mjuk', flojt=0.18, mel_fc=2300, gitarr=True, mel_styrka=0.38,
    melodi=[
      [('E4', 2), ('G4', 2), ('C5', 3), ('B4', 1)], [('A4', 4), ('E4', 4)],
      [('F4', 2), ('A4', 2), ('C5', 2), ('D5', 2)], [('D5', 4), ('B4', 4)],
      [('E5', 3), ('D5', 1), ('C5', 2), ('G4', 2)], [('B4', 3), ('A4', 1), ('G4', 4)],
      [('A4', 2), ('C5', 2), ('F5', 3), ('E5', 1)], [('D5', 6), (None, 2)],
      [('C5', 2), ('E5', 2), ('A5', 3), ('G5', 1)], [('G5', 4), ('E5', 4)],
      [('F5', 2), ('E5', 2), ('D5', 2), ('C5', 2)], [('E5', 4), ('C5', 4)],
      [('D5', 2), ('F5', 2), ('A5', 2), ('F5', 2)], [('G5', 3), ('F5', 1), ('D5', 4)],
      [('A4', 2), ('C5', 2), ('F5', 2), ('D5', 2)], [('C5', 6), (None, 2)],
    ],
    ackord=['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G', 'Am', 'Em', 'F', 'C/E', 'Dm7', 'G', 'F', 'C'],
    arp_monster=[0, 1, 2, 3, 2, 1, 2, 1], bas_monster=[(0, 4), (7, 4)],
  ),
}
TONER = {'G': ['G3', 'B3', 'D4', 'G4'], 'D/F#': ['F#3', 'A3', 'D4', 'F#4'], 'D': ['D3', 'F#3', 'A3', 'D4'],
         'Em': ['E3', 'G3', 'B3', 'E4'], 'C': ['C3', 'E3', 'G3', 'C4'], 'Am': ['A2', 'C3', 'E3', 'A3'],
         'Am7': ['A2', 'C3', 'E3', 'G3'], 'Bm': ['B2', 'D3', 'F#3', 'B3'], 'D7': ['D3', 'F#3', 'A3', 'C4'],
         'F': ['F3', 'A3', 'C4', 'F4'], 'Dm': ['D3', 'F3', 'A3', 'D4'], 'Bb': ['Bb2', 'D3', 'F3', 'Bb3'],
         'A': ['A2', 'C#3', 'E3', 'A3'], 'A/C#': ['C#3', 'E3', 'A3', 'C#4'], 'A7': ['A2', 'C#3', 'E3', 'G3'],
         'Gm': ['G2', 'Bb2', 'D3', 'G3'], 'C/E': ['E3', 'G3', 'C4', 'E4'], 'Dm7': ['D3', 'F3', 'A3', 'C4']}
BAS = {'G': 'G2', 'D/F#': 'F#2', 'D': 'D2', 'Em': 'E2', 'C': 'C2', 'Am': 'A2', 'Am7': 'A2', 'Bm': 'B2', 'D7': 'D2',
       'F': 'F2', 'Dm': 'D2', 'Bb': 'Bb2', 'A': 'A2', 'A/C#': 'C#2', 'A7': 'A2', 'Gm': 'G2', 'C/E': 'E2', 'Dm7': 'D2'}

# ---------------------------------------------------------------- byggstenarna (som i musik.py)
def hylsa(n, a=0.01, d=0.25, s=0.55, r=0.12, langd=None):
    t = np.arange(n) / SR; h = (langd or n) / SR
    e = np.where(t < a, t / a, np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    return e * np.where(t > h, np.clip(1 - (t - h) / r, 0, 1), 1)
def triangel(f, n):
    fas = (np.arange(n) * f / SR) % 1
    return np.round((4 * np.abs(fas - 0.5) - 1) * 7.5) / 7.5
def lagpass(x, fc):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)

def gor(namn):
    S = SLINGOR[namn]; A = S['attondel']; T = S['takt']; rng = np.random.default_rng(3)
    NS = int(round(len(S['ackord']) * T * A * SR))
    mel, arp, bas, slag = (np.zeros(NS) for _ in range(4))
    def lagg(spar, start_s, ljud):
        i = int(round(start_s * SR)) % NS; j = i + len(ljud)
        if j <= NS: spar[i:j] += ljud
        else: spar[i:] += ljud[:NS - i]; spar[:j - NS] += ljud[NS - i:]
    t = 0.0
    for k, takt in enumerate(S['melodi']):
        assert sum(d for _, d in takt) == T, (namn, k)
        for ton, d in takt:
            if ton:
                h = int(d * A * SR * 0.92); n = h + int(0.16 * SR); tt = np.arange(n) / SR; f = hz(m(ton))
                vib = 1 + 0.004 * np.sin(2 * np.pi * 5 * tt) * np.clip((tt - 0.2) / 0.3, 0, 1)
                fas = np.cumsum(f * vib / SR)
                if S.get('lead') == 'klocka':           # speldosa: en mjuk FM-klocka och en sinus under
                    e = np.exp(-tt * 2.2)
                    ljud = (np.sin(2 * np.pi * fas + 1.2 * np.exp(-tt * 9) * np.sin(2 * np.pi * 3.5 * fas)) * e
                            + 0.35 * np.sin(2 * np.pi * fas) * np.exp(-tt * 1.2))
                    lagg(mel, t, ljud * hylsa(n, 0.002, 0.05, 1.0, 0.25, h)); t += d * A; continue
                ljud = 0.55 * np.sin(2 * np.pi * fas) + 0.45 * (4 * np.abs(fas % 1 - 0.5) - 1)
                if S.get('flojt'):                     # lite andning i ansatsen, som en träflöjt
                    ljud += S['flojt'] * lagpass(rng.uniform(-1, 1, n), 2500) * np.exp(-tt * 18)
                lagg(mel, t, ljud * hylsa(n, 0.03, 0.3, 0.55, 0.25, h))
            t += d * A
    for k, ack in enumerate(S['ackord']):
        toner = [m(x) + 12 for x in TONER[ack]]
        for i, idx in enumerate(S['arp_monster']):
            if idx is None: continue
            styrka = 0.0 if k < 1 else 1.0
            if S.get('gitarr'):                        # knäppt sträng: ljus ansats som mörknar (Karplus-Strong i liten skala)
                n = int(A * SR * 3); tt = np.arange(n) / SR; f = hz(toner[idx])
                ton = sum((0.6 ** (j - 1)) * np.sin(2 * np.pi * f * j * tt) * np.exp(-tt * (2.5 + 3 * j)) for j in range(1, 6))
                lagg(arp, (k * T + i) * A, styrka * 0.9 * ton * hylsa(n, 0.002, 0.05, 1.0, 0.1))
            else:
                n = int(A * SR * 1.8)
                lagg(arp, (k * T + i) * A, styrka * triangel(hz(toner[idx]), n) * hylsa(n, 0.003, 0.12, 0.15, 0.1, int(n * 0.5)))
        if S.get('pad'):                               # en mjuk ton som håller ackordet, nästan ohörbar
            n = int(T * A * SR * 1.1); tt = np.arange(n) / SR
            ton = sum(np.sin(2 * np.pi * hz(x) * tt) for x in toner[:3]) / 3
            lagg(arp, k * T * A, S['pad'] / S.get('arp_styrka', 1) * ton * hylsa(n, 0.4, 0.5, 0.8, 0.3, int(T * A * SR)))
        rot = m(BAS[ack]); pos = 0
        for steg, d in S['bas_monster']:
            h = int(d * A * SR * 0.85); n = h + int(0.05 * SR)
            lagg(bas, (k * T + pos) * A, triangel(hz(rot + steg), n) * hylsa(n, 0.004, 0.1, 0.8, 0.05, h)); pos += d
        if S.get('skakare') and k >= 2:                # en mycket lätt skakare, betoning på 1 och 4
            for i in range(T):
                n = int(0.06 * SR); b = rng.uniform(-1, 1, n)
                v = 0.16 if i % 3 == 0 else 0.07
                lagg(slag, (k * T + i) * A, v * (b - lagpass(b, 5000)) * np.exp(-np.arange(n) / SR * 55))
        if S.get('trummor') and k >= 2:                # mjuk dov kick på 1 och 5, lätt skakare på åttondelarna
            for i in range(T):
                if i in (0, 4):
                    n = int(0.16 * SR); tt = np.arange(n) / SR; f = 110 * np.exp(-tt * 22) + 45
                    lagg(slag, (k * T + i) * A, 0.8 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18))
                n = int(0.05 * SR); b = rng.uniform(-1, 1, n)
                lagg(slag, (k * T + i) * A, (0.14 if i % 2 else 0.07) * (b - lagpass(b, 5000)) * np.exp(-np.arange(n) / SR * 70))
    a_st = S.get('arp_styrka', 0.17); m_st = S.get('mel_styrka', 0.30); b_st = S.get('bas_styrka', 0.30)
    mel = lagpass(mel, S.get('mel_fc', 2600)); arp = lagpass(arp, 1700); bas = lagpass(bas, 1200)
    v = m_st * mel + a_st * arp + b_st * bas + 0.30 * slag
    h = m_st * mel + a_st * np.roll(arp, int(0.012 * SR)) + b_st * bas + 0.30 * np.roll(slag, int(0.007 * SR))
    ek = int(round(A * S.get('ek_attondelar', 3) * SR))   # ekot: en punkterad fjärdedel
    for kanal, sida in ((v, 0.24), (h, 0.19)):
        e = np.roll(m_st * mel + a_st * arp, ek) * sida
        kanal += e + np.roll(e, ek) * 0.4
    st = np.stack([v, h], 1)
    return st * (10 ** (-3 / 20) / np.max(np.abs(st))) * 10 ** (-3.6 / 20)   # samma nivå som spelets slinga

def ffmpeg(pcm_st, ut, kodek):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-'] + kodek + [ut],
                   input=(pcm_st * 32767).astype('<i2').tobytes(), check=True)

if __name__ == '__main__':
    namn = sys.argv[1]; st = gor(namn)
    if len(sys.argv) > 3 and sys.argv[2] == 'loop':
        b = int(0.5 * SR); hel = np.concatenate([st[-b:], st, st[:b]])
        for ext, k in (('m4a', ['-c:a', 'aac', '-b:a', '128k']), ('ogg', ['-c:a', 'libvorbis', '-q:a', '4'])):
            ffmpeg(hel, sys.argv[3] + '.' + ext, k)
        print(json.dumps({'loopStart_s': 0.5, 'loopEnd_s': round(0.5 + len(st) / SR, 6), 'loopens_langd_s': round(len(st) / SR, 6)}))
    else:
        ut = sys.argv[2] if len(sys.argv) > 2 else '/tmp/%s_prov.mp3' % namn
        p = np.concatenate([st, st, st[:int(4 * SR)]]); sv = int(4 * SR); p[-sv:] *= np.linspace(1, 0, sv)[:, None]
        ffmpeg(p, ut, ['-c:a', 'libmp3lame', '-q:a', '3'])
        print(ut, '%.1f s per varv' % (len(st) / SR))
