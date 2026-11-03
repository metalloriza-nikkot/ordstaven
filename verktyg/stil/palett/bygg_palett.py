# Bygger palett.json en gång ur grafiken som är levererad (2026-11-03): färger som inte går att skilja åt (deltaE < 3)
# slås ihop till den som används mest. Skyddade färger rörs aldrig. Körs inte igen: därefter ändras palett.json för hand.
import os, sys, json, math, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palett import lab, hexa, SKYDDADE, GRANS
from PIL import Image
rot = sys.argv[1]
skydd = {h for v in SKYDDADE.values() for h in v}
n = collections.Counter(); grupp = {}
ZON = lambda rel: rel.split('/')[0] if rel.split('/')[0] in ('bildkort', 'sidovyer') else '/'.join(rel.split('/')[:2])
for r, ds, fs in sorted(os.walk(rot)):
    for f in sorted(fs):
        if not f.endswith('.png') or f.endswith('_ark.png'): continue
        rel = os.path.relpath(os.path.join(r, f), rot)
        for k, c in Image.open(os.path.join(r, f)).convert('RGBA').getcolors(1 << 20):
            if c[3]: h = hexa(c); n[h] += k; grupp.setdefault(h, ZON(rel))
for h in skydd: n.setdefault(h, 0)
ordning = sorted(n, key=lambda h: (h not in skydd, -n[h]))
rep, till = [], {}
L = {h: lab(h) for h in n}
for h in ordning:
    if h in skydd: rep.append(h); continue
    kand = [(math.dist(L[h], L[r]), r) for r in rep if r not in skydd]   # en skyddad färg tar aldrig upp andra (palettbytet)
    kand = [k for k in kand if k[0] < GRANS]
    if kand: till[h] = min(kand)[1]
    else: rep.append(h)
def nyckel(h):
    l, a, b = L[h]; return (grupp[h] if h in grupp else '~', round(math.degrees(math.atan2(b, a)) / 30), l)
farger = []
for h in sorted(rep, key=nyckel):
    skg = next((k for k, v in SKYDDADE.items() if h in v), None)
    farger.append({'hex': h, 'forst_i': grupp.get(h, 'skyddad'), **({'skyddad': skg} if skg else {})})
json.dump({'om': 'Masterpaletten (stilguiden §2, beslut 28.4). Sluten: Stils skript ritar bara ur den här listan, och en ny färg läggs till här av Stil, med ett skäl. Teknik: assets/palett.json ska vara samma lista.',
           'version': '1.0 (2026-11-03)', 'antal': len(farger), 'tak_per_zon': 256,
           'farger': farger, 'tillagg': []}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'palett.json'), 'w'), ensure_ascii=False, indent=1)
json.dump(till, open('/tmp/sammanslagna.json', 'w'), indent=0)
print('färger före', len(n), 'efter', len(rep), 'sammanslagna', len(till))
