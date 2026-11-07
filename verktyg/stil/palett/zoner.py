# Trädgården räknar också fasaden (5e, 2026-11-07).
# Trädgården räknar bara trädgårdens föremål ur huset (2026-11-04).
# Räknar färgerna per zon efter låsningen: allt som kan synas samtidigt i spelvärlden. Taket är 256 per zon.
import os, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palett import Palett, hexa
from PIL import Image
rot = sys.argv[1]; P = Palett()
FIG = ['figurer/hjalte/*', 'figurer/stav/*', 'figurer/skugga/*', 'figurer/unge/*', 'ui/*']   # HUD:en och skyltarna syns i varje zon (2026-11-04)
ZONER = {
 'huset (inne)': ['rum/hus/*', 'foremal/hus/*', 'figurer/farfar/*', 'figurer/herr_skata/runt_*'] + FIG,
 'trädgården (s20–s22)': ['rutor/skog/*'] + [f'foremal/hus/{n}*' for n in ('staket', 'berg', 'fasad', 'skylt_liten', 'tva_buskar', 'dorr_fram_ute', 'kruka')] + ['figurer/farfar/*', 'figurer/baronen/luftskepp_*', 'figurer/baronen/baronen_hjalm*'] + FIG,
 'skogen (kapitel 1)': ['rutor/skog/*', 'foremal/skog/*', 'figurer/herr_skata/herr_*', 'figurer/apa/*', 'figurer/djur/*', 'figurer/effekter/*', 'figurer/omgivning/*', 'figurer/baronen/baronen_hjalm*'] + FIG,
 'bildkort': ['bildkort/*'], 'sidovyer': ['sidovyer/*'], 'porträtt': ['figurer/*/*portratt*'],
}
for z, mon in ZONER.items():
    s = set()
    for m in mon:
        for f in glob.glob(os.path.join(rot, m)):
            if f.endswith('.png') and not f.endswith('_ark.png'):
                s |= {hexa(c) for _, c in Image.open(f).convert('RGBA').getcolors(1 << 20) if c[3]}
    print(f'{z:24s}{len(s):4d}', 'ÖVER TAKET' if len(s) > 256 else '')
