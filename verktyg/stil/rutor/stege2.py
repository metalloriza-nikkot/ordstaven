# Stegen till apan med pinnsteg (kapitel 1 v0.7.4, granskningen A 6, Stil 2026-11-03).
# STEGE har fem bokstäver och fem fält, så stegen har fem pinnar. Varje rätt bokstav fäller ut ett pinnsteg
# nerifrån och upp (E fyller två fält och ger två), och det sista når upp till nätet.
# stege_pinnar_0 … _5 (16 x 32): sidostängerna står från början. stege = stege_pinnar_5 (står kvar efter räddningen).
# efx_pinne_01–02 (10 x 4): pinnen som fälls ut glimtar i stavens guld, eftersom det är ett rätt svar.
import os
from PIL import Image
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
G=['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260']
PINNAR=[28,22,16,10,4]                       # pinnarnas övre rad, nerifrån och upp
def stege(n):
    im=Image.new('RGBA',(16,32),(0,0,0,0)); p=im.load()
    for y in range(32):
        for (x,c) in [(2,G[0]),(3,G[3]),(4,G[1]),(5,G[0]),(10,G[0]),(11,G[3]),(12,G[1]),(13,G[0])]:
            p[x,y]=hx2(c)
    for y in PINNAR[:n]:
        for x in range(5,11):
            p[x,y]=hx2(G[4]); p[x,y+1]=hx2(G[2])
        p[5,y+2]=hx2(G[0]); p[10,y+2]=hx2(G[0])
    for x in (3,11): p[x,0]=hx2(G[4])            # stängernas ändar i ljuset
    return im
def efx_pinne(b):
    im=Image.new('RGBA',(10,4),(0,0,0,0)); p=im.load()
    for x in range(1,9): p[x,1]=hx2('#FFD95A'); p[x,2]=hx2('#E8C868')
    if b==0: p[0,1]=hx2('#FFFFFF'); p[9,2]=hx2('#FFFFFF')
    else:
        for (x,y) in [(4,0),(5,0),(2,3),(7,3)]: p[x,y]=hx2('#FFFFFF')
    return im
UT={f'foremal/skog/stege_pinnar_{n}.png':stege(n) for n in range(6)}
UT['foremal/skog/stege.png']=stege(5)
UT['figurer/effekter/efx_pinne_01.png']=efx_pinne(0); UT['figurer/effekter/efx_pinne_02.png']=efx_pinne(1)
if __name__=='__main__':
    for k,v in UT.items():
        os.makedirs('/home/claude/rutor/ut2/'+os.path.dirname(k),exist_ok=True); v.save('/home/claude/rutor/ut2/'+k)
    s=Image.new('RGBA',(6*20+14,36),(111,163,74,255))
    for n in range(6): s.alpha_composite(stege(n),(n*20+2,2))
    s.alpha_composite(efx_pinne(0),(122,10)); s.alpha_composite(efx_pinne(1),(122,20))
    s.resize((s.width*6,s.height*6),Image.NEAREST).save('/tmp/stege.png')
