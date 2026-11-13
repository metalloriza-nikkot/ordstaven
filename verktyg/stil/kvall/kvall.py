# Figurerna på kvällen (Tekniks fråga 12/11 22:40, 80.6): en tabell som byter varje palettfärg mot
# sin kvällsfärg. Teknik bygger kvällsbilderna en gång när rummet laddas (inget filter per bild).
# Kvällen är mildare på figurerna än på rummet (0,80 mot 0,52), så att de syns mot den mörka byn.
# Målfärgerna tas bara bland färger som redan finns i träskets zon, så zonen får inga nya färger.
import os, sys, glob, json
sys.path.insert(0, '/home/claude/palett')
from palett import Palett, hexa
from PIL import Image
P = Palett(); IN = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/inkorg'
M = (20, 28, 56); STYRKA = 0.80
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
T = set()
for m in ['rum/kap-02/byn_kvall.png', 'foremal/trask/*kvall*', 'figurer/tant_rosa/*', 'figurer/fiskaren/*', 'figurer/tvatterskan/*',
          'figurer/barnet/*', 'figurer/bo/*', 'figurer/hjalte/*', 'figurer/unge/*', 'figurer/stav/*']:
    for f in glob.glob(os.path.join(IN, m)):
        if f.endswith('.png') and 'portratt' not in f:
            T |= {hexa(c) for _, c in Image.open(f).convert('RGBA').getcolors(1 << 20) if c[3]}
T = sorted(T); TR = [rgb(t) for t in T]
def narmast(c):
    return min(zip(T, TR), key=lambda t: sum((a - b) ** 2 * w for a, b, w in zip(c, t[1], (3, 4, 2))))[0]
def kvallsfarg(h):
    c = rgb(h); m = tuple(int(c[i] * STYRKA + M[i] * (1 - STYRKA)) for i in range(3))
    return narmast(m)
if __name__ == '__main__':
    pj = json.load(open('/home/claude/palett/palett.json'))
    farger = [f if isinstance(f, str) else f.get('hex', f.get('farg')) for f in pj['farger']] if isinstance(pj['farger'], list) else list(pj['farger'])
    tab = {h.lower(): kvallsfarg(h.lower()) for h in farger}
    os.makedirs('ut', exist_ok=True)
    json.dump({'om': 'Figurerna på kvällen: byt varje färg mot sin kvällsfärg. Gäller hjälten (efter hudbytet), ungen, staven och byborna i tillståndet kvall. Målfärgerna finns redan i träskets zon.',
               'styrka': STYRKA, 'tabell': tab}, open('ut/kvall.json', 'w'), ensure_ascii=False, indent=0)
    print(len(T), 'målfärger,', len(tab), 'färger i tabellen,', len(set(tab.values())), 'olika kvällsfärger')
