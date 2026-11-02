# Läsplattans bildkort i kapitel 1, 48 x 48, genomskinlig bakgrund (kortets papper ritas av spelet).
# Ingen text i bilderna. Samma regler som allt annat: snett uppifrån, ljus uppifrån till vänster, fyra toner.
import os, sys, math, random
from PIL import Image
sys.path.insert(0,'/home/claude/rutor')
exec(open('/home/claude/rutor/pix.py').read())
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
LD=lambda p: Image.open(p).convert('RGBA')
MAT.update({
 'bark':['#24160C','#4A3018','#6A4626','#8A6038','#A87C50'],
 'tra':['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260'],
 'lov':['#14301A','#1E4A24','#2E6A30','#4A8E3A','#78B456'],
 'sten':['#2A2C34','#565A64','#7E838C','#A4A9B0','#CDD1D6'],
 'vatten':['#1E3E6A','#2E5E94','#3E7EBA','#6AA6D8','#B8E0F4'],
 'gras':['#3E6E2E','#5A8E3A','#6FA34A','#86B85A','#A2CC70'],
 'papper':['#6A5A3A','#C8B48A','#E8D8B0','#F4E8C8','#FFF8E4'],
 'tagg':['#123A2A','#1E6A4A','#2E9A6A','#6ACB8E','#B8F0C8'],
 'lader':['#2A1A0E','#5A3A20','#7A5230','#9A6E44','#C09060'],
})
def tom(): return Image.new('RGBA',(48,48),(0,0,0,0))
def skala(im,f): return im.resize((im.width*f,im.height*f),Image.NEAREST)
def mitt(dst,im,y=None):
    x=(48-im.width)//2; y=(48-im.height)//2 if y is None else y; dst.alpha_composite(im,(x,y)); return dst
def gras_flack(d,cx,cy,rx,ry): d.ellips(cx,cy,rx,ry,'gras','mark',toner=(1,2,2,3),platt=0.9)

def k_bro():
    d=Duk(48,48)
    for (cx,cy,rx,ry) in [(24,34,23,10)]: d.ellips(cx,cy,rx,ry,'vatten','vatten',toner=(1,2,2,3),platt=0.9)
    d.kontur(); im=d.bild(); px=im.load()
    for (x,y) in [(8,32),(14,38),(30,30),(38,36),(20,40),(34,41)]:
        px[x,y]=hx2('#B8E0F4'); px[x+1,y]=hx2('#6AA6D8')
    # en välvd träbro sedd snett ovanifrån, från vänster strand till höger
    for x in range(4,44):
        t=(x-24)/20; top=int(22+10*t*t)
        for y in range(top,top+7):
            c=['#BE9260','#BE9260','#9A6E40','#9A6E40','#7A522C','#7A522C','#5A3A1E'][y-top]
            if (x-4)%5==0 and y<top+5: c='#5A3A1E'
            px[x,y]=hx2(c)
        px[x,top-1]=hx2('#2E1C0E'); px[x,top+7]=hx2('#2E1C0E')
        if x%9==4:                                        # räckets stolpar
            for y in range(top-6,top): px[x,y]=hx2('#7A522C'); px[x+1,y]=hx2('#5A3A1E')
        px[x,top-6]=hx2('#9A6E40'); px[x,top-5]=hx2('#5A3A1E')
    return im

def k_trad():
    d=Duk(48,48)
    d.ellips(24,40,7,3,'gras','mark',toner=(1,2,2,3),platt=0.9)
    d.ellips(24,34,3.4,9,'bark','stam')
    for (cx,cy,r) in [(24,17,15),(13,21,8),(35,21,8),(24,8,8),(24,26,10)]: d.ellips(cx,cy,r,r*0.85,'lov','krona')
    d.kontur(); return d.bild()

def k_sten():
    im=tom(); s=LD('/home/claude/rutor/ut/foremal/hog_rund_sten.png'); s=skala(s,1)
    d=Duk(48,48); d.ellips(24,42,14,4,'gras','mark',toner=(1,2,2,3),platt=0.9); d.kontur(); im.alpha_composite(d.bild())
    big=s.resize((s.width*13//10,s.height*13//10),Image.NEAREST)
    im.alpha_composite(big,((48-big.width)//2,44-big.height)); return im

def k_fotter():
    # ungens blå fötter på nära håll: olivgrön mage upptill, korta ben, stora blå fötter med ljusa tår
    d=Duk(48,48)
    d.ellips(24,8,20,11,'oliv','mage')
    for cx in (13,35):
        d.ellips(cx,22,6,7,'oliv','ben')
        d.ellips(cx,33,10,6.5,'bla','fot')
    d.kontur(); im=d.bild(); px=im.load()
    for cx in (13,35):
        for tx in (-6,0,6):
            for (a,b) in [(0,0),(1,0),(0,1),(1,1)]: px[cx+tx+a-1,36+b]=hx2('#9AB6FF')
            px[cx+tx-1,35]=hx2('#0E1A50')
    return im

def k_chiffer():
    # gammalt kort som glänser: sex tecken och Farfars kompassros, inga bokstäver
    im=tom(); px=im.load()
    for y in range(6,42):
        for x in range(6,42):
            c='#F4E8C8' if y<12 else ('#E8D8B0' if y<36 else '#C8B48A')
            if x in (6,41) or y in (6,41): c='#6A5A3A'
            if (x*3+y*7)%29==0 and 7<x<40 and 7<y<40: c='#C8B48A'
            px[x,y]=hx2(c)
    for (x,y) in [(39,8),(40,9),(38,9),(39,10)]: px[x,y]=hx2('#FFFFFF')   # glans
    INK='#3A2A12'
    tecken={
     'stjarna':[(2,0),(2,1),(0,2),(1,2),(2,2),(3,2),(4,2),(1,3),(3,3),(0,4),(4,4)],
     'blad':[(2,0),(1,1),(3,1),(1,2),(2,2),(3,2),(2,3),(2,4)],
     'mane':[(2,0),(3,0),(1,1),(1,2),(1,3),(2,4),(3,4)],
     'sol':[(2,0),(0,2),(4,2),(2,4),(1,1),(2,1),(3,1),(1,2),(2,2),(3,2),(1,3),(2,3),(3,3)],
     'sten':[(1,1),(2,1),(3,1),(0,2),(1,2),(2,2),(3,2),(4,2),(0,3),(1,3),(2,3),(3,3),(4,3)],
     'fjader':[(4,0),(3,1),(4,1),(2,2),(3,2),(1,3),(2,3),(0,4)],
    }
    for i,(n,pts) in enumerate(tecken.items()):
        ox=10+(i%3)*10; oy=10+(i//3)*13
        for (a,b) in pts: px[ox+a,oy+b]=hx2(INK)
        for k in range(4): px[ox+k,oy+8]=hx2('#9A8A6A')     # streck där bokstaven står (ingen text)
    for i in range(9): px[34,30+i-4]=hx2('#C83A3A' if i<4 else '#2A2E38'); px[30+i,30]=hx2('#5A3A1E')
    px[34,30]=hx2('#F2E8C8')
    return im

def k_fossil():
    im=tom(); d=Duk(48,48)
    d.ellips(16,30,15,10,'sten','sten',platt=0.4); d.kontur(); im.alpha_composite(d.bild()); px=im.load()
    # avtrycket av en svans med klubba, som ungens: ljus ben-färg med mörk kant
    BEN,KANT='#F2ECD8','#565A64'
    pts=[(4+i,33-int(3*math.sin(i/12*math.pi))) for i in range(13)]
    for (x,y) in pts:
        for dy in (-1,0): px[x,y+dy]=hx2(BEN)
        px[x,y+1]=hx2(KANT); px[x,y-2]=hx2(KANT)
    for y in range(-3,4):
        for x in range(-3,4):
            if x*x+y*y<=10: px[19+x,31+y]=hx2(BEN)
            elif x*x+y*y<=15: px[19+x,31+y]=hx2(KANT)
    u=LD('/home/claude/unge2/ut/unge1_ga_vanster_01.png')
    im.alpha_composite(u,(25,18)); return im

def k_svard():
    # svärdet inristat i barken: ljust trä i skårorna, mörk kant
    im=tom(); px=im.load(); rnd=random.Random(3)
    for y in range(2,46):
        for x in range(8,40):
            c=['#4A3018','#6A4626','#8A6038'][(x*5+y*2+(y//7))%3]
            if x in (8,39): c='#24160C'
            px[x,y]=hx2(c)
    for y in range(4,44,6):
        for x in range(9,39):
            if rnd.random()<0.25: px[x,y]=hx2('#24160C')
    def skara(x,y):
        px[x,y]=hx2('#E8C890'); px[x+1,y]=hx2('#24160C') if px[x+1,y]!=hx2('#E8C890') else px[x+1,y]
    for y in range(8,30): skara(23,y); skara(24,y)            # klingan
    for (x,y) in [(23,6),(24,7),(22,7)]: skara(x,y)          # spetsen
    for x in range(17,31): skara(x,31)                        # parerstången
    for y in range(32,38): skara(23,y)                        # greppet
    skara(22,38); skara(24,38); skara(23,39)                  # knappen
    return im

def k_taggkam():
    im=tom(); d=Duk(48,48)
    d.ellips(24,34,16,5,'tagg','bas',toner=(1,2,3,3))
    for i,cx in enumerate((12,18,24,30,36)):
        h=8+(4 if i==2 else 2 if i in (1,3) else 0)
        for y in range(h):
            w=max(0.6,(h-y)/h*3.2)
            d.ellips(cx,32-y,w,1.0,'tagg','tagg')
    d.kontur(); im.alpha_composite(d.bild()); px=im.load()
    for i,cx in enumerate((12,18,24,30,36)):
        h=8+(4 if i==2 else 2 if i in (1,3) else 0)
        px[cx,32-h+1]=hx2('#B8F0C8')
    return im

def k_ryggsack():
    im=tom(); px=im.load(); L=['#2A1A0E','#5A3A20','#7A5230','#9A6E44','#C09060']
    def r(x0,y0,x1,y1,fyll,ljus=True):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1):
                c=fyll
                if ljus and (x==x0+1 or y==y0+1): c=L[3]
                if x in (x0,x1) or y in (y0,y1): c=L[0]
                px[x,y]=hx2(c)
    for y in range(12,42): px[9,y]=hx2(L[1]); px[10,y]=hx2(L[0]); px[38,y]=hx2(L[1]); px[37,y]=hx2(L[0])   # remmarna
    r(11,14,36,42,L[2])                                   # säcken
    for y in range(36,42):
        for x in range(12,36): px[x,y]=hx2(L[1])          # undersidan i skugga
    r(11,9,36,22,L[3])                                    # locket, ovansidan syns
    for x in range(12,36): px[x,10]=hx2(L[4])
    r(16,28,31,38,L[2])                                   # fickan
    for (x,y) in [(23,21),(24,21),(23,22),(24,22),(23,23),(24,23)]: px[x,y]=hx2('#A4A9B0')     # spänne
    px[23,21]=hx2('#E0E4EA')
    for (x,y) in [(15,8),(16,7),(17,7),(30,7),(31,8),(32,7)]: px[x,y]=hx2('#3E7634')        # löv från skogen
    for (x,y) in [(16,8),(31,7)]: px[x,y]=hx2('#78B456')
    return im

KORT={'bro':k_bro(),'trad':k_trad(),'sten':k_sten(),'ungens_bla_fotter':k_fotter(),'chiffernyckel':k_chiffer(),
      'fossil_och_ungen':k_fossil(),'svard_ristat':k_svard(),'taggkam':k_taggkam(),'ryggsack_skog':k_ryggsack()}
if __name__=='__main__':
    os.makedirs('ut',exist_ok=True)
    for n,im in KORT.items(): im.save(f'ut/{n}.png')
    ark=Image.new('RGBA',(len(KORT)*56+8,64),(244,236,215,255)); x=8
    for n,im in KORT.items(): ark.alpha_composite(im,(x,8)); x+=56
    ark.resize((ark.width*3,ark.height*3),Image.NEAREST).save('kort_x3.png')
