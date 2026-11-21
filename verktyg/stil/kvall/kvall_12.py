# Paletten 1.2 (beslut 114.3): de sex kalla färgerna för kapitel 4 får sina kvällsfärger i kvällstabellen.
# Tabellens 368 tidigare värden står kvar som de är (assets/kvall.json i repot). De nya får kvällsfärger bland sig
# själva och träskets zon, så att isen blir mörkare is och inte grön.  python3 kvall/kvall_12.py <assets/kvall.json> <ut>
import json, sys
sys.argv = [sys.argv[0], '/home/claude/inkorg'] + sys.argv[1:]
src = open('/home/claude/kvall/kvall.py').read(); g = {}; exec(src[:src.index("if __name__")], g)
k = json.load(open(sys.argv[2] if len(sys.argv) > 2 else '/home/claude/ordstaven/assets/kvall.json'))
NYA = ['#4e9ec2', '#2f7498', '#1e4e6c', '#123248', '#8e9fcc', '#b4c4e6']
T = g['T'] + NYA; TR = [g['rgb'](t) for t in T]
def narm(c): return min(zip(T, TR), key=lambda t: sum((a - b) ** 2 * w for a, b, w in zip(c, t[1], (3, 4, 2))))[0]
for h in NYA:
    c = g['rgb'](h); k['tabell'][h] = narm(tuple(int(c[i] * g['STYRKA'] + g['M'][i] * (1 - g['STYRKA'])) for i in range(3)))
json.dump(k, open(sys.argv[3] if len(sys.argv) > 3 else 'ut/kvall.json', 'w'), ensure_ascii=False, indent=0)
