#!/usr/bin/env python3
"""Inkorgen → repot (dokument 02 §7, beslut 25.2, 26.5 och 27).

Läser en kopia av inkorgsmappen och skriver till repot:

- figurer/<mapp>/*.png   → assets/sprites/<mapp>/<mapp>.png och .json: ett atlas per mapp (Phaser, JSON Hash).
  Bildens namn i atlaset är filens namn (stilguiden §8 och 10b, t.ex. hjalte_ga_ner_01, unge1_glad_hoger_02).
- foremal/<zon>/*.png    → assets/foremal/<zon>/<zon>.png och .json: ett atlas per zon (föremålen i kartorna).
- rum/<zon>/<rum>.png    → assets/rum/<zon>/<rum>.png: en bild per inomhusrum (beslut 27.6).
- rutor/<zon>/<zon>.png  → assets/tiles/<zon>/<zon>.png och <zon>.json (Tilleds rutset, .tsj).
- bildkort/*.png         → assets/bildkort/<id>.png: läsplattans bildkort, en bild per id (textlagret visar dem).
- sidovyer/*.png         → assets/sidovyer/<namn>.png: sidovyernas bakgrunder och det som rör sig i dem.
- karta/kartbit_*.png och karta.json → assets/karta/: Farfars karta, en bild per bit och var bitarna ligger.
- ui/*.png               → assets/ui/<namn>.png: HUD:ens knappar, ikonerna och dörrskyltarnas delar (textlagret visar dem).
- ui/intro, ui/start och ui/meny → assets/ui/<mapp>/<namn>.png: introt, startskärmen, pausmenyn och INSTÄLLNINGAR
  (fas 4, 10e), och ui/intro/intro.json med introts tider och lägen.
- figurer/*/*_portratt_*.png → också assets/portratt/<namn>.png (ansiktena i pratrutan, i textlagret).
- ljud/*.wav             → assets/ljud/<namn>.wav, döpta utan mellanslag ("unge_late 2" → unge_late_02).
- ljud/effekter/*.wav och ljud.json → assets/ljud/effekter/<id>.wav (Stils ljudeffekter, F5, 10c v0.5), med samma
  namn som Stils id, omskrivna med bara formatet och ljuddatan, och ljud.json med id, grupp, nivå och längd.
- ljud/musik/*.m4a, *.ogg → assets/ljud/musik/<namn>.m4a och .ogg (Stils slingor, F5), omskrivna med ffmpeg utan
  metadata (ljudet kopieras som det är).

Arken (*_ark.png) hoppas över, de är bara till för att titta på.

Varje bild skrivs om från pixlarna, så att ingen metadata följer med (EXIF, program, tid). Repot är publikt.
Färgerna och genomskinligheten (skuggorna är halvgenomskinliga) står kvar som Stil ritade dem. Paletten är sluten
(beslut 28.4): varje färg ska stå i Stils masterpalett, verktyg/stil/palett/palett.json, annars stoppar skriptet.
assets/palett.json skrivs som samma lista (en ny färg läggs bara in av Stil).

Ljuden skrivs om med bara formatet och ljuddatan (inga INFO-fält). Råinspelningar läggs aldrig i inkorgen
(beslut 25.2): bara ljud som är bearbetade så att rösten inte går att känna igen.

Körning:  python3 -I verktyg/grafik/inkorg.py <inkorgsmappen> [--repo .] [--bara figurer/hjalte rum ...] [--prova]
--bara tar bara med de mappar som börjar så (t.ex. figurer/hjalte, foremal/hus, rum). --prova skriver ingenting.
"""
import argparse
import json
import re
import sys
import wave
from pathlib import Path

from PIL import Image

# Stils masterpalett (beslut 28.4): facit för alla färger i grafiken
PALETT = Path('verktyg') / 'stil' / 'palett' / 'palett.json'
NAMN = re.compile(r'^[a-z0-9]+(?:_[a-z0-9]+)*$')
# Storlekar som koden räknar med (bredd, höjd) för bilder vars namn börjar så
STORLEK = {'hjalte_ga_': (16, 24), 'stav_hand_': (16, 24), 'ryggsack_': (16, 24), 'taggkam_': (16, 24), 'unge1_ga_': (24, 24)}


def hex_av(c):
    return '#%02x%02x%02x' % c[:3]


def ren(im):
    """En ny bild ritad pixel för pixel: inga metadata, färgerna och genomskinligheten som de är."""
    src = im.convert('RGBA')
    ut = Image.new('RGBA', src.size, (0, 0, 0, 0))
    ut.putdata(list(src.getdata()))
    return ut


def farger(im):
    return {p[:3] for _, p in im.getcolors(1 << 20) if p[3]}


def packa(bilder):
    """Bilderna i rader (en rad per namn utan sista delen, högst ca 512 bred). Returnerar (atlas, ramar)."""
    rader, rad, bredd = [], [], 0
    for namn, im in sorted(bilder.items()):
        if rad and (bredd + im.width > 512 or namn.rsplit('_', 1)[0] != rad[-1][0].rsplit('_', 1)[0]):
            rader.append(rad); rad, bredd = [], 0
        rad.append((namn, im)); bredd += im.width + 1
    if rad:
        rader.append(rad)
    B = max(sum(im.width + 1 for _, im in r) for r in rader)
    H = sum(max(im.height for _, im in r) + 1 for r in rader)
    atlas = Image.new('RGBA', (B, H), (0, 0, 0, 0))
    ramar, y = {}, 0
    for r in rader:
        x = 0
        for namn, im in r:
            atlas.paste(im, (x, y))
            ramar[namn] = {'frame': {'x': x, 'y': y, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                           'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
                           'sourceSize': {'w': im.width, 'h': im.height}}
            x += im.width + 1
        y += max(im.height for _, im in r) + 1
    return atlas, ramar


def las_bilder(mapp, fel, alla):
    bilder = {}
    for f in sorted(mapp.glob('*.png')):
        if f.stem.endswith('_ark'):
            continue
        if not NAMN.match(f.stem):
            fel.append(f'{f}: namnet har tecken utanför a–z, 0–9 och _')
            continue
        im = ren(Image.open(f))
        for prefix, (b, h) in STORLEK.items():
            if mapp.parent.name == 'figurer' and f.stem.startswith(prefix) and im.size != (b, h):
                fel.append(f'{f.name}: {im.width} × {im.height}, ska vara {b} × {h}')
        for c in farger(im):
            alla.setdefault(c, f'{mapp.name}/{f.name}')
        bilder[f.stem] = im
    return bilder


def skriv_atlas(bilder, ut, nyckel, prova):
    atlas, ramar = packa(bilder)
    print(f'{ut.as_posix()}/{nyckel}.png: {len(bilder)} bilder ({atlas.width} × {atlas.height})')
    if prova:
        return
    ut.mkdir(parents=True, exist_ok=True)
    atlas.save(ut / f'{nyckel}.png', optimize=True)
    (ut / f'{nyckel}.json').write_text(json.dumps({
        'frames': ramar,
        'meta': {'image': f'{nyckel}.png', 'format': 'RGBA8888', 'size': {'w': atlas.width, 'h': atlas.height}, 'scale': '1',
                 'om': 'Skrivs av verktyg/grafik/inkorg.py. Bildens namn är filens namn i inkorgen.'}},
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
    for f, namn in ljudnamn(sorted((inkorg / 'ljud').glob('*.wav'))).items():
        if not NAMN.match(namn):
            fel.append(f'{f.name}: namnet {namn} har tecken utanför a–z, 0–9 och _')
            continue
        with wave.open(str(f)) as w:
            par, data = w.getparams(), w.readframes(w.getnframes())
        sek = par.nframes / par.framerate
        print(f'{f.name} → assets/ljud/{namn}.wav ({sek:.2f} s)')
        if sek > 3:
            fel.append(f'{f.name}: {sek:.1f} s, ett läte ska vara kort (högst 3 s)')
        if prova:
            continue
        ut = repo / 'assets' / 'ljud'
        ut.mkdir(parents=True, exist_ok=True)
        with wave.open(str(ut / f'{namn}.wav'), 'wb') as w:
            w.setparams(par)
            w.writeframes(data)


def effekter(inkorg, repo, prova, fel):
    """Stils ljudeffekter: namnen är Stils id (10c), och varje fil skrivs om med bara formatet och ljuddatan."""
    mapp = inkorg / 'ljud' / 'effekter'
    ut = repo / 'assets' / 'ljud' / 'effekter'
    for f in sorted(mapp.glob('*.wav')):
        if not NAMN.match(f.stem):
            fel.append(f'{f.name}: namnet har tecken utanför a–z, 0–9 och _')
            continue
        with wave.open(str(f)) as w:
            par, data = w.getparams(), w.readframes(w.getnframes())
        sek = par.nframes / par.framerate
        if sek > 4:
            fel.append(f'{f.name}: {sek:.1f} s, en ljudeffekt ska vara kort (högst 4 s)')
        if prova:
            continue
        ut.mkdir(parents=True, exist_ok=True)
        with wave.open(str(ut / f.name), 'wb') as w:
            w.setparams(par)
            w.writeframes(data)
    if (mapp / 'ljud.json').is_file():
        data = json.loads((mapp / 'ljud.json').read_text())
        rena = {k: {f: v[f] for f in ('grupp', 'vad', 'signatur', 'styrka_db', 'sekunder') if f in v} for k, v in data.items() if NAMN.match(k)}
        saknas = [k for k in rena if not (mapp / f'{k}.wav').is_file()]
        for k in saknas:
            fel.append(f'ljud.json: {k} saknar sin fil')
        print(f'assets/ljud/effekter/: {len(rena)} ljud')
        if not prova:
            ut.mkdir(parents=True, exist_ok=True)
            (ut / 'ljud.json').write_text(json.dumps(rena, indent=1, ensure_ascii=False) + '\n')


def musik(inkorg, repo, prova, fel):
    """Stils musik: samma ljud, bara utan metadata (ffmpeg -c copy)."""
    import subprocess
    for f in sorted(list((inkorg / 'ljud' / 'musik').glob('*.m4a')) + list((inkorg / 'ljud' / 'musik').glob('*.ogg'))):
        if not NAMN.match(f.stem):
            fel.append(f'{f}: namnet har tecken utanför a–z, 0–9 och _')
            continue
        print(f'{f.name} → assets/ljud/musik/{f.name}')
        if prova:
            continue
        ut = repo / 'assets' / 'ljud' / 'musik'
        ut.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-map', '0:a', '-map_metadata', '-1', '-fflags', '+bitexact',
                            '-flags:a', '+bitexact', '-c', 'copy', str(ut / f.name)], capture_output=True, text=True)
        if r.returncode:
            fel.append(f'{f.name}: ffmpeg: {r.stderr.strip()[:200]}')


def licenser(repo, fel):
    """Varje fil i assets/ (utom licenstexterna) ska stå i assets/LICENSER.md. Ett atlas räknas med sin mapp."""
    text = (repo / 'assets' / 'LICENSER.md').read_text()
    for f in sorted((repo / 'assets').rglob('*')):
        if f.is_dir() or f.suffix not in ('.png', '.wav', '.m4a', '.ogg') or 'licenser' in f.parts:
            continue
        rel = f.relative_to(repo).as_posix()
        mappar = [p.relative_to(repo).as_posix() + '/' for p in f.parents if p != repo and repo in p.parents]
        if rel not in text and not any(f'`{m}' in text for m in mappar):
            fel.append(f'{rel} saknar en rad i assets/LICENSER.md')


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('inkorg', type=Path)
    a.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[2])
    a.add_argument('--bara', nargs='*', default=None)
    a.add_argument('--prova', action='store_true')
    arg = a.parse_args()
    ink, repo, fel, alla = arg.inkorg, arg.repo, [], {}
    med = lambda p: arg.bara is None or any(p.startswith(b.rstrip('/')) for b in arg.bara)
    for mapp in sorted((ink / 'figurer').glob('*/')):
        if med(f'figurer/{mapp.name}') and (b := las_bilder(mapp, fel, alla)):
            skriv_atlas(b, repo / 'assets' / 'sprites' / mapp.name, mapp.name, arg.prova)
            # porträtten (läsplattans ansikten) som egna bilder, så att textlagret kan visa dem
            for namn, im in b.items():
                if '_portratt_' in namn and not arg.prova:
                    (repo / 'assets' / 'portratt').mkdir(parents=True, exist_ok=True)
                    im.save(repo / 'assets' / 'portratt' / f'{namn}.png', optimize=True)
    for mapp in sorted((ink / 'foremal').glob('*/')):
        if med(f'foremal/{mapp.name}') and (b := las_bilder(mapp, fel, alla)):
            skriv_atlas(b, repo / 'assets' / 'foremal' / mapp.name, mapp.name, arg.prova)
    # bildkorten och sidovyerna som egna bilder: bildkorten visas i textlagret, sidovyerna är hela skärmar
    for mapp in ('bildkort', 'sidovyer', 'karta', 'ui', 'ui/intro', 'ui/start', 'ui/meny'):
        if not (med(mapp) and (ink / mapp).is_dir()):
            continue
        for namn, im in las_bilder(ink / mapp, fel, alla).items():
            print(f'assets/{mapp}/{namn}.png ({im.width} × {im.height})')
            if not arg.prova:
                (repo / 'assets' / mapp).mkdir(parents=True, exist_ok=True)
                im.save(repo / 'assets' / mapp / f'{namn}.png', optimize=True)
    # kartans läge för bitarna: läses och skrivs om (bara det som tolkas som JSON följer med)
    if med('karta') and (ink / 'karta' / 'karta.json').is_file():
        data = json.loads((ink / 'karta' / 'karta.json').read_text())
        print('assets/karta/karta.json')
        if not arg.prova:
            (repo / 'assets' / 'karta' / 'karta.json').write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    # introts tider och lägen (fas 4): samma sak, bara det som tolkas som JSON följer med
    if med('ui/intro') and (ink / 'ui' / 'intro' / 'intro.json').is_file():
        data = json.loads((ink / 'ui' / 'intro' / 'intro.json').read_text())
        print('assets/ui/intro/intro.json')
        if not arg.prova:
            (repo / 'assets' / 'ui' / 'intro' / 'intro.json').write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    for mapp in sorted((ink / 'rum').glob('*/')):
        if not med(f'rum/{mapp.name}'):
            continue
        for namn, im in las_bilder(mapp, fel, alla).items():
            print(f'assets/rum/{mapp.name}/{namn}.png ({im.width} × {im.height})')
            if not arg.prova:
                (repo / 'assets' / 'rum' / mapp.name).mkdir(parents=True, exist_ok=True)
                im.save(repo / 'assets' / 'rum' / mapp.name / f'{namn}.png', optimize=True)
    for mapp in sorted((ink / 'rutor').glob('*/')):
        if not med(f'rutor/{mapp.name}'):
            continue
        for tsj in mapp.glob('*.tsj'):
            data = json.loads(tsj.read_text())
            im = ren(Image.open(mapp / data['image']))
            for c in farger(im):
                alla.setdefault(c, f'{mapp.name}/{data["image"]}')
            print(f'assets/tiles/{mapp.name}/{tsj.stem}.png och .json ({data.get("tilecount")} rutor)')
            if not arg.prova:
                (repo / 'assets' / 'tiles' / mapp.name).mkdir(parents=True, exist_ok=True)
                im.save(repo / 'assets' / 'tiles' / mapp.name / f'{tsj.stem}.png', optimize=True)
                data['image'] = f'{tsj.stem}.png'
                (repo / 'assets' / 'tiles' / mapp.name / f'{tsj.stem}.json').write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    if med('ljud'):
        ljud(ink, repo, arg.prova, fel)
    if med('ljud/effekter') and (ink / 'ljud' / 'effekter').is_dir():
        effekter(ink, repo, arg.prova, fel)
    if med('ljud/musik') and (ink / 'ljud' / 'musik').is_dir():
        musik(ink, repo, arg.prova, fel)
    # paletten är sluten: en färg som inte står i Stils masterpalett stoppar (Stil ritar om eller lägger in den)
    master = json.loads((repo / PALETT).read_text())
    tillatna = {f['hex'].lower() for f in master['farger'] + [t for t in master.get('tillagg', []) if isinstance(t, dict) and 'hex' in t]}
    nya = sorted({hex_av(c) for c in alla} - tillatna)
    for h in nya:
        fel.append(f'{alla[next(c for c in alla if hex_av(c) == h)]}: färgen {h} står inte i {PALETT.as_posix()}')
    print(f'Färger i grafiken: {len({hex_av(c) for c in alla})} av masterpalettens {len(tillatna)}.')
    if not arg.prova:
        fil = repo / 'assets' / 'palett.json'
        p = sorted(tillatna)
        fil.write_text(json.dumps({'om': f'Masterpaletten (beslut 28.4), samma lista som {PALETT.as_posix()} (Stils). Skriven av verktyg/grafik/inkorg.py.', 'antal': len(p), 'tak_per_zon': master.get('tak_per_zon'), 'farger': p}, indent=1) + '\n')
        licenser(repo, fel)
    for f in fel:
        print('FEL:', f, file=sys.stderr)
    sys.exit(1 if fel else 0)


if __name__ == '__main__':
    main()
