#!/usr/bin/env python3
"""Inkorgen → repot (dokument 02 §7, beslut 25.2 och 26.5).

Läser en kopia av Niklas inkorgsmapp (figurer/<figur>/*.png och ljud/*.wav) och skriver till repot:

- assets/sprites/<figur>/<figur>.png och <figur>.json: figurens bilder packade i ett atlas (Phaser, JSON Hash).
  Bildernas namn följer stilguiden §8: <figur>_<handling>_<riktning>_<bild>. Arken (*_ark.png) hoppas över, de är
  bara till för att titta på.
- assets/ljud/<namn>.wav: ljuden, omdöpta utan mellanslag ("unge_late 2.wav" → unge_late_02.wav, och då blir
  "unge_late.wav" unge_late_01.wav).
- assets/palett.json: masterpaletten (stilguiden §2, högst 48 färger).

Varje bild:
- tvingas in i masterpaletten: en färg nära en färg i paletten (avstånd högst NARA) blir den färgen, en ny färg
  läggs till och skrivs ut, och fler än 48 färger är ett fel;
- halvgenomskinliga pixlar blir hela eller borta (inga grå fläckar runt figuren);
- skrivs om från pixlarna, så att ingen metadata följer med (EXIF, program, tid). Repot är publikt.
- kontrolleras mot figurens storlek (STORLEK).

Ljuden skrivs om med bara formatet och ljuddatan (inga INFO-fält). Råinspelningar läggs aldrig i inkorgen
(beslut 25.2): bara ljud som är bearbetade så att rösten inte går att känna igen.

Körning:  python3 verktyg/grafik/inkorg.py <inkorgsmappen> [--repo .] [--prova]
--prova skriver ingenting, utan visar bara vad som skulle hända.
"""
import argparse
import json
import re
import sys
import wave
from pathlib import Path

from PIL import Image

MAX_FARGER = 48
NARA = 3  # avstånd i RGB (summan av skillnaderna) som räknas som samma färg: bara avrundningsbrus
# Figurernas storlek (bredd, höjd), högst. Herr Skata är 16–17 × 12 när han sitter och 18 × 12 i flykt.
STORLEK = {'hjalte': (16, 24), 'stav': (16, 24), 'herr_skata': (18, 12), 'unge1': (24, 24), 'baronen': (24, 24)}
NAMN = re.compile(r'^(?P<figur>[a-z0-9]+(?:_[a-z0-9]+)*)_(?P<handling>[a-z]+)_(?P<riktning>ner|upp|hoger|vanster|sida)_(?P<bild>\d{2})$')


def hex_av(c):
    return '#%02x%02x%02x' % c[:3]


def av_hex(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def avstand(a, b):
    return sum(abs(x - y) for x, y in zip(a[:3], b[:3]))


class Palett:
    def __init__(self, fil):
        self.fil = fil
        self.farger = [av_hex(h) for h in json.loads(fil.read_text())['farger']] if fil.exists() else []
        self.nya = []

    def nara(self, c):
        best = min(self.farger, key=lambda p: avstand(p, c), default=None)
        if best is not None and avstand(best, c) <= NARA:
            return best
        self.farger.append(c[:3])
        self.nya.append(c[:3])
        return c[:3]

    def spara(self):
        self.fil.write_text(json.dumps({
            'om': 'Masterpaletten (stilguiden §2), högst 48 färger. Skrivs av verktyg/grafik/inkorg.py.',
            'farger': [hex_av(c) for c in self.farger]}, indent=1) + '\n')


def palettlas(im, palett):
    """En ny bild, ritad pixel för pixel i masterpaletten: utan metadata och utan halvgenomskinliga pixlar."""
    src = im.convert('RGBA')
    ut = Image.new('RGBA', src.size, (0, 0, 0, 0))
    px, ny = src.load(), ut.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if a < 128:
                continue
            ny[x, y] = (*palett.nara((r, g, b)), 255)
    return ut


def packa(bilder):
    """Bilderna i en rad per handling och riktning (atlas). Returnerar (bild, ramar)."""
    rader = {}
    for namn, im in sorted(bilder.items()):
        nyckel = namn.rsplit('_', 1)[0]
        rader.setdefault(nyckel, []).append((namn, im))
    bredd = max(sum(im.width + 1 for _, im in r) for r in rader.values())
    hojd = sum(max(im.height for _, im in r) + 1 for r in rader.values())
    atlas = Image.new('RGBA', (bredd, hojd), (0, 0, 0, 0))
    ramar, y = {}, 0
    for r in rader.values():
        x = 0
        for namn, im in r:
            atlas.paste(im, (x, y))
            ramar[namn] = {'frame': {'x': x, 'y': y, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                           'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
                           'sourceSize': {'w': im.width, 'h': im.height}}
            x += im.width + 1
        y += max(im.height for _, im in r) + 1
    return atlas, ramar


# Hjältens färger går före i paletten (koden byter hud och dräkt efter dem, src/scener/Rum.js)
FORST = ['hjalte', 'stav']


def figurer(inkorg, repo, palett, prova, fel):
    mappar = sorted((inkorg / 'figurer').glob('*/'), key=lambda m: (m.name not in FORST, FORST.index(m.name) if m.name in FORST else 0, m.name))
    for mapp in mappar:
        bilder = {}
        for f in sorted(mapp.glob('*.png')):
            if f.stem.endswith('_ark'):
                continue
            m = NAMN.match(f.stem)
            if not m:
                fel.append(f'{f.name}: namnet följer inte <figur>_<handling>_<riktning>_<bild>')
                continue
            figur = m['figur']
            im = palettlas(Image.open(f), palett)
            maxb, maxh = STORLEK.get(figur, (32, 32))
            if im.width > maxb or im.height > maxh:
                fel.append(f'{f.name}: {im.width} × {im.height}, högst {maxb} × {maxh}')
            bilder[f.stem] = im
        if not bilder:
            continue
        figur = NAMN.match(next(iter(bilder)))['figur']
        atlas, ramar = packa(bilder)
        print(f'{figur}: {len(bilder)} bilder → assets/sprites/{figur}/{figur}.png ({atlas.width} × {atlas.height})')
        if prova:
            continue
        ut = repo / 'assets' / 'sprites' / figur
        ut.mkdir(parents=True, exist_ok=True)
        atlas.save(ut / f'{figur}.png', optimize=True)
        (ut / f'{figur}.json').write_text(json.dumps({
            'frames': ramar,
            'meta': {'image': f'{figur}.png', 'format': 'RGBA8888', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1',
                     'om': 'Skrivs av verktyg/grafik/inkorg.py. Bildernas namn: <figur>_<handling>_<riktning>_<bild>.'}},
            indent=1, ensure_ascii=False) + '\n')


def ljudnamn(filer):
    """'unge_late.wav', 'unge_late 2.wav' → unge_late_01, unge_late_02. Ett namn utan syskon behåller sitt namn."""
    grupper = {}
    for f in filer:
        m = re.match(r'^(.*?)(?:[ _-](\d+))?$', f.stem)
        grupper.setdefault(m[1].strip().replace(' ', '_'), []).append((int(m[2]) if m[2] else 1, f))
    namn = {}
    for stam, lista in grupper.items():
        for nr, f in lista:
            namn[f] = stam if len(lista) == 1 else f'{stam}_{nr:02d}'
    return namn


def ljud(inkorg, repo, prova, fel):
    filer = sorted((inkorg / 'ljud').glob('*.wav'))
    for f, namn in ljudnamn(filer).items():
        if not re.match(r'^[a-z0-9_]+$', namn):
            fel.append(f'{f.name}: namnet {namn} har tecken utanför a–z, 0–9 och _')
            continue
        with wave.open(str(f)) as w:
            par, data = w.getparams(), w.readframes(w.getnframes())
        sek = par.nframes / par.framerate
        print(f'{f.name} → assets/ljud/{namn}.wav ({sek:.2f} s, {par.nchannels} kanal, {par.framerate} Hz)')
        if sek > 3:
            fel.append(f'{f.name}: {sek:.1f} s, ett läte ska vara kort (högst 3 s)')
        if prova:
            continue
        ut = repo / 'assets' / 'ljud'
        ut.mkdir(parents=True, exist_ok=True)
        with wave.open(str(ut / f'{namn}.wav'), 'wb') as w:
            w.setparams(par)
            w.writeframes(data)


def licenser(repo, fel):
    """Varje fil i assets/sprites och assets/ljud ska stå i assets/LICENSER.md (testet i tests/enhet kontrollerar)."""
    text = (repo / 'assets' / 'LICENSER.md').read_text()
    for f in sorted([*(repo / 'assets' / 'sprites').glob('*/*.png'), *(repo / 'assets' / 'ljud').glob('*.wav')]):
        rel = f.relative_to(repo).as_posix()
        if rel not in text:
            fel.append(f'{rel} saknar en rad i assets/LICENSER.md')


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('inkorg', type=Path)
    a.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[2])
    a.add_argument('--prova', action='store_true')
    arg = a.parse_args()
    fel = []
    palett = Palett(arg.repo / 'assets' / 'palett.json')
    figurer(arg.inkorg, arg.repo, palett, arg.prova, fel)
    ljud(arg.inkorg, arg.repo, arg.prova, fel)
    if palett.nya:
        print(f'Nya färger i masterpaletten ({len(palett.nya)}):', ' '.join(hex_av(c) for c in palett.nya))
    if len(palett.farger) > MAX_FARGER:
        fel.append(f'masterpaletten har {len(palett.farger)} färger, högst {MAX_FARGER} (stilguiden §2)')
    if not arg.prova:
        palett.spara()
        licenser(arg.repo, fel)
    print(f'Masterpaletten: {len(palett.farger)} av {MAX_FARGER} färger.')
    for f in fel:
        print('FEL:', f, file=sys.stderr)
    sys.exit(1 if fel else 0)


if __name__ == '__main__':
    main()
