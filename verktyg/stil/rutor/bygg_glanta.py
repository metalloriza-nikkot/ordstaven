# Provbygge: gläntan lagd med rutsetet, för att se att rutorna passar ihop.
import math, random
from PIL import Image
exec(open('rutor.py').read().split("if __name__=='__main__':")[0])
BW,BH=40,24
def nara_stig(px,py):
    linjer=[[(154,392),(154,300),(160,250),(176,200),(186,150),(220,120),(300,92)],
            [(160,250),(120,262),(80,262)],
            [(176,200),(300,205),(450,190),(560,165),(590,158)]]
    best=1e9
    for pts in linjer:
        for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
            vx,vy=x1-x0,y1-y0; t=max(0,min(1,((px-x0)*vx+(py-y0)*vy)/(vx*vx+vy*vy)))
            best=min(best,math.hypot(px-x0-t*vx,py-y0-t*vy))
    return best<11
def kulle_tile(tx,ty): return 20<=tx<=34 and 0<=ty<=8
stig=[[1 if nara_stig(x*T,y*T) else 0 for x in range(BW+1)] for y in range(BH+1)]
vatt=[[1 if x>=36 else 0 for x in range(BW+1)] for y in range(BH+1)]
skog=[[0]*(BW+1) for _ in range(BH+1)]
for y in range(BH+1):
    for x in range(BW+1):
        if x>=35: continue
        if y<=1 and x<=20: skog[y][x]=1
        if x<=1: skog[y][x]=1
        if y>=BH-1 and not (9<=x<=11): skog[y][x]=1
        if x==2 and (y+0)%5 in (1,2): skog[y][x]=1          # ojämn kant
        if y==BH-2 and x%6 in (2,3) and not (8<=x<=12): skog[y][x]=1
        if y==2 and x%7 in (3,4) and x<19: skog[y][x]=1
for y in range(BH+1):
    for x in range(BW+1):
        if skog[y][x]: stig[y][x]=0
img=Image.new('RGBA',(BW*T,BH*T))
rnd=random.Random(3)
def horn(g,tx,ty): return (g[ty][tx],g[ty][tx+1],g[ty+1][tx],g[ty+1][tx+1])
for ty in range(BH):
    for tx in range(BW):
        if kulle_tile(tx,ty):
            col='W' if tx==20 else ('E' if tx==34 else '')
            if ty==8: n='F'+col
            else:
                row='N' if ty==0 else ('S' if ty==7 else '')
                n=(row+col) or 'C'
            if n=='C': n=['platå_1','platå_2','platå_1','platå_blommor'][(tx*3+ty*5)%4]; im=rutor[INDEX[n]][1]
            else: im=rutor[INDEX['kulle_'+n]][1]
        else:
            hs=horn(skog,tx,ty); hv=horn(vatt,tx,ty); hst=horn(stig,tx,ty)
            if any(hs): im=rutor[INDEX['skog_'+''.join(map(str,hs))]][1]
            elif any(hv): im=rutor[INDEX['vatten_'+''.join(map(str,hv))]][1]
            elif any(hst): im=rutor[INDEX['stig_'+''.join(map(str,hst))]][1]
            else:
                r=rnd.random(); n='gras_blommor_'+str(rnd.randint(1,2)) if r<0.1 else ('gras_flack_'+str(rnd.randint(1,2)) if r<0.22 else 'gras_'+str(rnd.randint(1,4)))
                im=rutor[INDEX[n]][1]
        img.paste(im,(tx*T,ty*T))
img.save('ut/glanta_rutor.png')
img.resize((img.width*2,img.height*2),Image.NEAREST).save('ut/glanta_rutor_x2.png')
