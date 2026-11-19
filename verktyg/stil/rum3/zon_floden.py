# Zonen floden (kapitel 3) under 256 färger: allt som kan synas samtidigt i flodens rum, med baronen och Herr Skata
# från duellen, hjälten, ungen, staven, skuggan och HUD:en. De ovanligaste färgerna i rummens bilder och sköldpaddans
# bilder slås ihop med närmaste färg som redan används (bybor/zon.py, taket 252). Kör efter rum3.py och sprites3.py,
# på en kopia av inkorgen där de nya bilderna ligger: python3 rum3/zon_floden.py <inkorg>
import sys, glob, os
sys.path.insert(0, '/home/claude/bybor'); import zon
rot = sys.argv[1]; os.chdir(rot)
nya = sorted(glob.glob('rum/kap-03/*.png')) + sorted(f for f in glob.glob('foremal/flod/*.png')
      if os.path.basename(f).split('_')[0] in ('on', 'skoldpadda', 'vattenhjul', 'hornet', 'plats') and 'hornet_mjol' not in f and 'hornet_rent' not in f)
gm = ['foremal/flod/*', 'figurer/skepparen/*', 'figurer/flodbo*/*', 'figurer/flodman/*', 'figurer/hjalte/*', 'figurer/unge/*',
      'figurer/stav/*', 'figurer/skugga/*', 'ui/*', 'figurer/effekter/effekt_plask*', 'figurer/baronen/baronen_stege*',
      'figurer/baronen/repstege*', 'figurer/baronen/luftskepp_utan*', 'figurer/baronen/luftskepp_baron_landar*',
      'figurer/baronen/luftskepp_glider*', 'figurer/herr_skata/herr_*']
gamla = sorted(set(f for m in gm for f in glob.glob(m) if f.endswith('.png') and not f.endswith('_ark.png') and 'portratt' not in f) - set(nya))
n, byt = zon.krymp(nya, gamla, tak=252)
print('zonen floden', n, 'färger,', len(byt), 'ihopslagna')
