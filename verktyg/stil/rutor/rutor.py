# Skogens rutset (16 x 16) för Tiled: tre hörnbaserade Wang-set (gräs/stig, gräs/vatten, gräs/skog),
# kullen som rektangel, gräsvarianter och vattnets glitter i tre bilder.
import math, random, json
from PIL import Image
T=16
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
G=['#3E6E2E','#5A8E3A','#6FA34A','#86B85A','#A2CC70']    # gräs: kontur, skugga, mitt, ljus, högdager
D=['#7A5A36','#A07A4A','#BE9A62','#D6B67E','#E8CC98']    # stig
V=['#1E3E6A','#2E5E94','#3E7EBA','#6AA6D8','#B8E0F4']    # vatten
LOV=['#14301A','#1E4A24','#2E6A30','#4A8E3A','#78B456']  # trädridån
PL=['#5A8E3A','#86B85A','#9AC466','#B4D67A','#C8E08A']   # kullens platå (ljusare grön)
KL=['#4A3A26','#5E4A30','#725A3A','#866A44','#9A7A50','#B89A6A','#C8AA7A']  # klippan, mörk -> ljus
LAPP='#C8D86A'

def brus(fr,amp,fas):
    # brus som upprepas var 16:e pixel, så att rutorna passar ihop åt alla håll
    return lambda x,y: sum(a*math.sin(2*math.pi*(kx*x+ky*y)/T+f) for (kx,ky),a,f in zip(fr,amp,fas))

def falt(h,n,union=False,R=16.0):
    # varje hörn med den andra terrängen ger en mjuk kulle av värde; summan (eller största värdet för klungor)
    # ger rundade kanter. Bara rutans egna hörn når in i rutan, så fältet är detsamma på båda sidor om en rutgräns.
    hp=[((0,0),h[0]),((T,0),h[1]),((0,T),h[2]),((T,T),h[3])]
    def f(x,y):
        px,py=x+0.5,y+0.5; vals=[]
        for (cx,cy),c in hp:
            if not c: continue
            d2=((px-cx)**2+(py-cy)**2)/(R*R)
            vals.append(max(0.0,1-d2)**2)
        b=(max(vals) if union else sum(vals)) if vals else 0.0
        return b+n(x,y)
    return f

def grastextur(px,rnd,bas=G):
    for y in range(T):
        for x in range(T): px[x,y]=hx(bas[2])
    for i in range(14):
        x=rnd.randrange(T); y=rnd.randrange(T); t=rnd.random()
        if t<0.5: px[x,y]=hx(bas[1]); px[(x+1)%T,(y-1)%T]=hx(bas[1])
        elif t<0.8: px[x,y]=hx(bas[3])
        else:
            px[x,y]=hx(bas[1]); px[x,(y-1)%T]=hx(bas[3])
    if rnd.random()<0.35:                      # en tuva
        x=rnd.randrange(1,T-6); y=rnd.randrange(3,T)
        for k in range(3): px[x+k*2,y]=hx(bas[0]); px[x+k*2,y-1]=hx(bas[1]); px[x+k*2,y-2]=hx(bas[3])

def gras(variant,blommor=False):
    im=Image.new('RGBA',(T,T)); px=im.load(); rnd=random.Random(100+variant)
    grastextur(px,rnd)
    if blommor:
        for i in range(3):
            x=rnd.randrange(1,T-1); y=rnd.randrange(1,T-1)
            px[x,y]=hx(rnd.choice(['#F4F4F0','#F2A0C0','#F4F4F0'])); px[x-1,y]=hx(G[0])
    return im

HORN=[(a,b,c,d) for a in (0,1) for b in (0,1) for c in (0,1) for d in (0,1)]   # (tl,tr,bl,br), 1 = den andra terrängen

# --- gräs/stig ---
nS=brus([(1,1),(1,-1),(2,1),(1,2),(1,0),(0,1)],[0.05,0.05,0.035,0.035,0.03,0.03],[0.3,1.7,2.2,0.9,4.0,2.6])
def stig_ruta(h):
    im=Image.new('RGBA',(T,T)); px=im.load(); rnd=random.Random(hash(h)%999+7)
    grastextur(px,rnd); f=falt(h,nS)
    for y in range(T):
        for x in range(T):
            v=f(x,y)
            if v>=0.5:
                r=rnd.random(); c=D[2] if r<0.8 else (D[3] if r<0.92 else D[1])
                dy=f(x,y+1)-f(x,y-1)
                if v<0.57: c=D[1] if dy>0 else D[3]     # gräset kastar skugga på stigens norra kant
                px[x,y]=hx(c)
            elif v>=0.43: px[x,y]=hx(G[0])
    if h==(1,1,1,1):
        for i in range(2):
            x=rnd.randrange(1,T-1); y=rnd.randrange(1,T-1); px[x,y]=hx(D[0]); px[x+1,y]=hx(D[1]); px[x,y-1]=hx(D[4])
    return im

# --- gräs/vatten ---
nV=brus([(1,1),(1,-1),(0,1),(1,0),(2,1)],[0.045,0.045,0.04,0.04,0.025],[1.1,0.4,2.9,0.2,1.3])
def glitter(px,rnd,mask,n=4):
    for i in range(n):
        x=rnd.randrange(T-1); y=rnd.randrange(T)
        if mask(x,y) and mask(x+1,y): px[x,y]=hx(V[4]); px[x+1,y]=hx(V[3])
def vatten_ruta(h,bild=0):
    im=Image.new('RGBA',(T,T)); px=im.load(); rnd=random.Random(hash(h)%999+31)
    grastextur(px,rnd); f=falt(h,nV)
    for y in range(T):
        for x in range(T):
            v=f(x,y); dy=f(x,y+1)-f(x,y-1)
            if v>=0.6: c=V[2] if (x+y*2+bild*5)%23 else V[3]
            elif v>=0.55: c=V[1]
            elif v>=0.5: c=V[0]
            elif v>=0.42: c=D[1] if dy>0 else D[2]      # strand
            elif v>=0.38: c=G[0]
            else: continue
            px[x,y]=hx(c)
    glitter(px,random.Random(hash(h)%999+bild*13),lambda x,y: f(x,y)>=0.62,4 if h==(1,1,1,1) else 2)
    return im

# --- gräs/skog (trädridån) ---
nK=brus([(2,1),(1,2),(2,-1),(1,-2)],[0.04,0.04,0.035,0.035],[0.7,2.1,1.4,3.3])
KLUMPAR=[(4,4,6),(12,3,5),(8,10,6),(1,12,5),(14,12,5)]
def krontextur(x,y):
    # bladklungor på en torus 16 x 16, ljus uppifrån till vänster, mörk kant mellan klungorna
    best=None
    for i,(cx,cy,r) in enumerate(KLUMPAR):
        dx=((x-cx+8)%16)-8+0.5; dy=((y-cy+8)%16)-8+0.5
        d=math.hypot(dx,dy)
        if d<=r: best=(dx,dy,d,r)
    if best is None: return LOV[1]
    dx,dy,d,r=best
    if d>r-1.0: return LOV[1]
    ll=(-0.6*dx-0.8*dy)/r
    return LOV[4] if ll>0.55 else LOV[3] if ll>0.15 else LOV[2] if ll>-0.4 else LOV[1]
def skog_ruta(h):
    im=Image.new('RGBA',(T,T)); px=im.load(); rnd=random.Random(hash(h)%999+53)
    grastextur(px,rnd); f=falt(h,nK,union=True,R=17.0)
    for y in range(T):
        for x in range(T):
            v=f(x,y); dy=f(x,y+1)-f(x,y-1)
            if v>=0.5:
                c=krontextur(x,y)
                if v<0.55: c=LOV[0]                          # kontur i bladens egen mörka färg
                elif v<0.62 and dy<0: c=LOV[1]               # kronans undersida i skugga
                px[x,y]=hx(c)
            elif dy<0 and v>=0.34:                           # skugga på gräset söder om kronan
                px[x,y]=hx(G[0] if v>=0.42 else G[1])
    return im

# --- kullen: 3 x 4 rutor ---
def platå(px,rnd):
    grastextur(px,rnd,PL)
def kulle_ruta(namn):
    im=Image.new('RGBA',(T,T)); px=im.load(); rnd=random.Random(sum(map(ord,namn))+71)
    if namn.startswith('F'):          # klippans framsida
        for y in range(T):
            for x in range(T):
                if y>=14: c=G[0] if y==14 else G[1]; px[x,y]=hx(c); continue
                band=(y+(x//9)%2)//3
                c=[KL[5],KL[4],KL[3],KL[2],KL[1],KL[0]][min(5,band)]
                if (x*7+y*5)%13==0: c='#3A2C1C'
                if y%4==1 and (x//5)%3==0: c=KL[6]
                px[x,y]=hx(c)
        if namn=='FW':
            for y in range(14):
                for x in range(4): px[x,y]=hx([KL[6],KL[5],KL[4],KL[3]][x] if y>0 else LAPP)
        if namn=='FE':
            for y in range(14):
                for x in range(12,T): px[x,y]=hx(KL[1] if x<15 else KL[0])
        return im
    platå(px,rnd)
    if 'N' in namn:
        for x in range(T): px[x,0]=hx(LAPP)
    if namn in ('SW','S','SE'):
        for x in range(T): px[x,15]=hx(LAPP)
    if 'W' in namn:                    # västra sidan: smal klippa i ljus (ljuset kommer från väster)
        for y in range(T):
            for x in range(5): px[x,y]=hx([KL[2],KL[4],KL[5],KL[6],LAPP][x])
            if (y*3)%11==0: px[1,y]=hx(KL[1])
    if namn in ('NE','E','SE'):        # östra sidan i skugga
        for y in range(T):
            for x in range(12,T): px[x,y]=hx([LAPP,KL[2],KL[1],KL[0]][x-12])
    return im
KULLE=[['NW','N','NE'],['W','C','E'],['SW','S','SE'],['FW','F','FE']]

# ---------- bygg rutsetet ----------
KOL=8
rutor=[]   # (namn, bild)
for i in range(4): rutor.append((f'gras_{i+1}',gras(i)))
for i in range(2): rutor.append((f'gras_blommor_{i+1}',gras(10+i,True)))
def flack(v):
    im=gras(20+v); px=im.load(); rnd=random.Random(40+v)
    cx,cy,r=rnd.randint(6,9),rnd.randint(6,9),rnd.randint(4,6)
    for y in range(T):
        for x in range(T):
            if ((x-cx)/r)**2+((y-cy)/(r*0.7))**2<=1 and (x+y)%2==0: px[x,y]=hx(G[1])
    return im
for i in range(2): rutor.append((f'gras_flack_{i+1}',flack(i)))
p1=Image.new('RGBA',(T,T)); platå(p1.load(),random.Random(5)); rutor.append(('platå_1',p1))
p2=Image.new('RGBA',(T,T)); platå(p2.load(),random.Random(6)); rutor.append(('platå_2',p2))
p3=Image.new('RGBA',(T,T)); q=p3.load(); platå(q,random.Random(8))
for (x,y,c) in [(4,5,'#F4F4F0'),(11,9,'#F2A0C0'),(7,12,'#F4F4F0')]: q[x,y]=hx(c); q[x-1,y]=hx(PL[0])
rutor.append(('platå_blommor',p3))
STIG0=len(rutor)
for h in HORN: rutor.append(('stig_'+''.join(map(str,h)),stig_ruta(h)))
VATT0=len(rutor)
for h in HORN: rutor.append(('vatten_'+''.join(map(str,h)),vatten_ruta(h)))
SKOG0=len(rutor)
for h in HORN: rutor.append(('skog_'+''.join(map(str,h)),skog_ruta(h)))
KUL0=len(rutor)
for rad in KULLE:
    for n in rad: rutor.append(('kulle_'+n,kulle_ruta(n)))
GLIT0=len(rutor)
for b in (1,2): rutor.append((f'vatten_glitter_{b+1}',vatten_ruta((1,1,1,1),b)))
rader=(len(rutor)+KOL-1)//KOL
ark=Image.new('RGBA',(KOL*T,rader*T),(0,0,0,0))
for i,(n,im) in enumerate(rutor): ark.paste(im,((i%KOL)*T,(i//KOL)*T))

def wangset(namn,farger,start):
    tiles=[]
    for i,(tl,tr,bl,br) in enumerate(HORN):
        c=lambda b: 2 if b else 1
        tiles.append({'tileid':start+i,'wangid':[0,c(tr),0,c(br),0,c(bl),0,c(tl)]})
    return {'name':namn,'type':'corner','tile':-1,
            'colors':[{'name':farger[0],'color':'#6fa34a','tile':0,'probability':1},
                      {'name':farger[1],'color':farger[2],'tile':start+15,'probability':1}],
            'wangtiles':tiles}
tsj={'type':'tileset','version':'1.10','tiledversion':'1.11.0','name':'skog','image':'skog.png',
     'imagewidth':ark.width,'imageheight':ark.height,'tilewidth':T,'tileheight':T,'margin':0,'spacing':0,
     'columns':KOL,'tilecount':KOL*rader,
     'tiles':[{'id':VATT0+15,'animation':[{'tileid':VATT0+15,'duration':250},{'tileid':GLIT0,'duration':250},{'tileid':GLIT0+1,'duration':250}]}],
     'wangsets':[wangset('gräs/stig',('gräs','stig','#be9a62'),STIG0),
                 wangset('gräs/vatten',('gräs','vatten','#3e7eba'),VATT0),
                 wangset('gräs/skog',('gräs','skog','#2e6a30'),SKOG0)],
     'properties':[{'name':'beskrivning','type':'string','value':'Skogens rutor (Stil). Kullen: kulle_* i 3 x 4, sista raden är klippans framsida. Vattnets helruta är animerad.'}]}
anim={t['id']:t['animation'] for t in tsj['tiles']}
tsj['tiles']=[dict({'id':i,'properties':[{'name':'namn','type':'string','value':n}]},**({'animation':anim[i]} if i in anim else {})) for i,(n,_) in enumerate(rutor)]
INDEX={n:i for i,(n,_) in enumerate(rutor)}
if __name__=='__main__':
    import os; os.makedirs('ut/rutor',exist_ok=True)
    ark.save('ut/rutor/skog.png')
    json.dump(tsj,open('ut/rutor/skog.tsj','w'),ensure_ascii=False,indent=1)
    ark.resize((ark.width*4,ark.height*4),Image.NEAREST).save('ut/skog_x4.png')
    print(len(rutor),'rutor',ark.size)
