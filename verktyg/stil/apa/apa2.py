# Apan i nätet, kapitel 1 v0.7.4 (granskningen A 6 och A 8, Stil 2026-11-03):
# - apa_blundar_01: fel bokstav: nätet knakar och apan blundar hårt (Teknik kan rycka nätet en pixel)
# - apa_sucka_01–02: fjärilen fladdrar förbi nätet och apan suckar: ögonen sluter sig, och en liten pust kommer ut
import os
os.chdir('/home/claude/apa')
src=open('apanim.py').read().rsplit("if __name__",1)[0]
exec(src)
def pust(im,x,y):
    p=im.load(); L=hx2('#E8F2FA'); M=hx2('#B8BEC6')
    for (a,b,c) in [(0,1,L),(1,0,L),(1,1,L),(2,1,L),(1,2,M),(2,2,L),(3,2,M),(3,1,L)]:
        if 0<=x+a<im.width and 0<=y+b<im.height: p[x+a,y+b]=c
    return im
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
B={}
B['apa_blundar_01']=nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='grimas',oga_t='knip',tarar=True),1)
B['apa_sucka_01']=nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='ledsen',oga_t='knip'),0)
B['apa_sucka_02']=pust(nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='oppen',oga_t='knip',oy=1),0),14,10)
if __name__=='__main__':
    os.makedirs('ut2',exist_ok=True)
    for k,v in B.items(): v.save(f'ut2/{k}.png')
