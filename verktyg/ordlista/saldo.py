#!/usr/bin/env python3
"""SALDO:s morfologi → spelets ordlista för "är det ett ord?" (beslut 76.2 och 77.2).

SALDO (Språkbanken Text, Göteborgs universitet) har licensen CC BY 4.0. Källfilen `saldom.xml` (ca 240 MB, LMF)
läggs aldrig i repot. Skriptet läser den och skriver två små filer:

- assets/ordlista/ord.txt: alla böjningsformer som spelaren kan skriva (2–10 bokstäver, bara A–Ö och É), i versaler
  och sorterade, utan namn (pm), förkortningar och sammansättningsled (msd c, ci, cm och sms);
- assets/ordlista/sparr.txt: formerna av de grova orden i verktyg/ordlista/sparrlista.txt (77.2). De får aldrig
  "BRA ORD!": spelet räknar dem som ett vanligt försök med en neutral reaktion och skriver inte ut dem i loggen.

Båda filerna är prefixkodade: varje rad börjar med hur många tecken den delar med raden före (0–9, a–z), och sedan
resten av ordet. Det gör listan ca tre gånger mindre utan att spelet behöver packa upp något.

    python3 -I verktyg/ordlista/saldo.py <saldom.xml> [--repo .]
"""
import argparse
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TILLATET = re.compile(r'^[A-ZÅÄÖÉ]{2,10}$')
UTAN_POS = {'pm', 'pma', 'pmm', 'nlm', 'sxc', 'mxc', 'abm', 'avm', 'nnm', 'vbm', 'ppm', 'inm', 'kn_m'}
UTAN_MSD = {'c', 'ci', 'cm', 'sms'}
SIFFROR = '0123456789abcdefghijklmnopqrstuvwxyz'


def las_sparr(fil):
    """Spärrlistan: hela grundord (ett per rad) och, efter `del:`, delar som spärrar varje ord de står i."""
    hela, delar = set(), set()
    for rad in Path(fil).read_text(encoding='utf-8').splitlines():
        rad = rad.split('#', 1)[0].strip()
        if not rad:
            continue
        if rad.startswith('del:'):
            delar.add(rad[4:].strip().upper())
        else:
            hela.add(rad.upper())
    return hela, delar


def prefixkoda(ord_):
    ut, forra = [], ''
    for o in ord_:
        n = 0
        while n < min(len(o), len(forra), 35) and o[n] == forra[n]:
            n += 1
        ut.append(SIFFROR[n] + o[n:])
        forra = o
    return '\n'.join(ut) + '\n'


def avkoda(text):
    ut, forra = [], ''
    for rad in text.splitlines():
        if not rad:
            continue
        o = forra[:SIFFROR.index(rad[0])] + rad[1:]
        ut.append(o)
        forra = o
    return ut


def feats(el):
    return {f.get('att'): f.get('val') for f in el.iter('feat')}


def las_saldo(fil, hela, delar):
    ord_, sparr = set(), set()
    for _, el in ET.iterparse(fil, events=('end',)):
        if el.tag != 'LexicalEntry':
            continue
        lemma = el.find('Lemma')
        lf = feats(lemma) if lemma is not None else {}
        pos = lf.get('partOfSpeech', '')
        grund = (lf.get('writtenForm') or '').upper()
        if pos in UTAN_POS:
            el.clear()
            continue
        for wf in el.findall('WordForm'):
            f = feats(wf)
            form = (f.get('writtenForm') or '').upper()
            if f.get('msd') in UTAN_MSD or not TILLATET.match(form):
                continue
            if grund in hela or any(d in form for d in delar):
                sparr.add(form)
            else:
                ord_.add(form)
        el.clear()
    # grundorden själva är spärrade också när SALDO inte har dem
    sparr |= {h for h in hela if TILLATET.match(h)}
    # en form kan höra till ett vanligt ord och ett grovt (samma stavning): den räknas som spärrad
    return sorted(ord_ - sparr), sorted(sparr)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('saldom')
    ap.add_argument('--repo', default='.')
    a = ap.parse_args()
    repo = Path(a.repo)
    hela, delar = las_sparr(repo / 'verktyg/ordlista/sparrlista.txt')
    ord_, sparr = las_saldo(a.saldom, hela, delar)
    if len(ord_) < 100000:
        sys.exit(f'Bara {len(ord_)} ord: är filen SALDO:s morfologi (saldom.xml)?')
    ut = repo / 'assets/ordlista'
    ut.mkdir(parents=True, exist_ok=True)
    for namn, lista in (('ord.txt', ord_), ('sparr.txt', sparr)):
        text = prefixkoda(lista)
        assert avkoda(text) == lista
        (ut / namn).write_text(text, encoding='utf-8')
        print(f'{ut / namn}: {len(lista)} ord, {len(text.encode()) // 1024} kB')


if __name__ == '__main__':
    main()
