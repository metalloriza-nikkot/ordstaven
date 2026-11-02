exec(open('pix.py').read())
import random, math
from PIL import Image
random.seed(26)
W,H=640,384
MAT.update({
 'lov':['#14301A','#1E4A24','#2E6A30','#4A8E3A','#78B456'],
 'lovung':['#1A3A18','#2E6228','#4A8E34','#74B44A','#A8D870'],
 'lovgam':['#122A18','#1A3E22','#285A2C','#3E7634','#5E9440'],
 'bark':['#24160C','#4A3018','#6A4626','#8A6038','#A87C50'],
 'barkung':['#3A2A18','#6A5032','#8A6C46','#A8885C','#C8A87A'],
 'sten':['#2E3036','#5A5E66','#7E838C','#A4A9B0','#CACED4'],
 'tra':['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260'],
 'lovhog':['#3A2410','#7A4E1E','#A86E2A','#D09A40','#EEC46A'],
})
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
G=['#3E6E2E','#5A8E3A','#6FA34A','#86B85A','#A2CC70']    # gräs
D=['#7A5A36','#A07A4A','#BE9A62','#D6B67E','#E8CC98']    # stig
V=['#1E3E6A','#2E5E94','#3E7EBA','#6AA6D8','#B8E0F4']    # vatten
img=Image.new('RGBA',(W,H),hx2(G[2]))
px=img.load()
def setp(x,y,c):
    if 0<=x<W and 0<=y<H: px[x,y]=hx2(c) if isinstance(c,str) else c
# --- mark: gräs med tuvor ---
for i in range(2600):
    x=random.randrange(W); y=random.randrange(H)
    t=random.random()
    if t<0.5: setp(x,y,G[1]); setp(x+1,y-1,G[1])
    elif t<0.8: setp(x,y,G[3])
    else: setp(x,y,G[1]); setp(x,y-1,G[3]); setp(x-1,y,G[1]); setp(x+1,y,G[1])
for i in range(26):
    cx=random.randrange(W); cy=random.randrange(H); r=random.randint(8,20)
    for y in range(cy-r,cy+r):
        for x in range(cx-r,cx+r):
            if ((x-cx)/r)**2+((y-cy)/(r*0.6))**2<=1 and (x+y)%2==0 and random.random()<0.5: setp(x,y,G[1])
for i in range(90):
    x=random.randrange(20,W-90); y=random.randrange(20,H-20)
    for k in range(3): setp(x+k*2,y,G[0]); setp(x+k*2,y-1,G[1]); setp(x+k*2,y-2,G[3])
for i in range(70):   # blommor
    x=random.randrange(30,W-80); y=random.randrange(30,H-30); c=random.choice(['#F4F4F0','#F2A0C0','#F4F4F0'])
    setp(x,y,c); setp(x-1,y,G[0]) 
# --- stigar ---
def stig(pts,bredd=11):
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        n=int(max(abs(x1-x0),abs(y1-y0)))
        for s in range(n+1):
            t=s/max(1,n); x=x0+(x1-x0)*t; y=y0+(y1-y0)*t
            r=bredd/2+math.sin(s*0.21)*1.3+math.sin(s*0.05)*1.5
            for dy in range(-int(r)-2,int(r)+3):
                for dx in range(-int(r)-2,int(r)+3):
                    d=math.hypot(dx,dy)
                    X,Y=int(x+dx),int(y+dy)
                    if d<=r-1: stigmask.add((X,Y))
                    elif d<=r: kantmask.add((X,Y))
stigmask=set(); kantmask=set()
stig([(154,392),(154,300),(160,250),(176,200),(186,150),(220,120),(300,92)],12)
stig([(160,250),(120,262),(80,262)],10)
stig([(176,200),(300,205),(450,190),(560,165),(590,158)],11)
for (x,y) in kantmask-stigmask: setp(x,y,G[0])
for (x,y) in stigmask:
    if 0<=x<W and 0<=y<H:
        r=random.random(); setp(x,y,D[2] if r<0.8 else (D[3] if r<0.92 else D[1]))
for (x,y) in list(stigmask):
    if random.random()<0.004: setp(x,y,D[0]); setp(x+1,y,D[1]); setp(x,y-1,D[4])
# --- bäcken ---
for y in range(H):
    kant=566+int(math.sin(y*0.07)*3+math.sin(y*0.19)*1.5)
    for x in range(kant,W):
        d=x-kant
        c=V[1] if d<3 else (V[2] if (x+y*2)%23 else V[3])
        if d<2: c=V[0]
        setp(x,y,c)
    setp(kant-1,y,D[1]); setp(kant-2,y,D[2]); setp(kant-3,y,G[1])
for i in range(160):
    x=random.randrange(574,W); y=random.randrange(H); setp(x,y,V[4]); setp(x+1,y,V[3])
# --- kullen (upphöjd platå) ---
def i_kulle(x,y):
    return 322<=x<=560 and y<=128+int(math.sin(x*0.05)*3) and not (x<338 and y>118)
for y in range(0,150):
    for x in range(316,564):
        if i_kulle(x,y):
            r=random.random(); setp(x,y,G[3] if r<0.85 else (G[4] if r<0.93 else G[2]))
# klippkant söderut och västerut
for x in range(322,561):
    top=128+int(math.sin(x*0.05)*3)
    if not i_kulle(x,top): continue
    setp(x,top,'#C8D86A'); 
    for k in range(1,21):
        y=top+k
        band=(k+ (x//9)%2)//4
        c=['#B89A6A','#9A7A50','#866A44','#725A3A','#5E4A30','#4A3A26'][min(5,band)]
        if (x*7+k*5)%13==0: c='#3A2C1C'
        if k%4==0 and (x//5)%3==0: c='#C8AA7A'
        setp(x,y,c)
    for k in (21,22): setp(x,top+k,G[0])
for y in range(0,130):
    for k in range(1,10):
        x=322-k
        if k==1: c='#A4A9B0'
        else: c=['#8A6E4E','#7A5E40','#6A5034'][min(2,k//4)]
        if 56<=y<=84 and k<9: continue     # trappan
        setp(x,y,c)
# trappan (väster, vid 298-328, 56-82)
for y in range(56,84):
    for x in range(298,330):
        step=(x-298)//6
        c=['#A4A9B0','#8E949E','#7E838C','#6E737C','#5E636C','#4E525A'][min(5,step)]
        if (x-298)%6==0: c='#3E4148'
        setp(x,y,c)
    setp(297,y,'#3E4148'); setp(330,y,'#3E4148')
# --- föremål ---
D_=lambda w,h: Duk(w,h)
def lagg(im,x,y):
    img.alpha_composite(im,(int(x),int(y)))
def skugga_oval(cx,cy,rx,ry):
    for y in range(int(cy-ry),int(cy+ry)+1):
        for x in range(int(cx-rx),int(cx+rx)+1):
            if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1:
                if 0<=x<W and 0<=y<H:
                    r,g,b,a=px[x,y]; px[x,y]=(int(r*0.72),int(g*0.72),int(b*0.72),255)
def trad(typ):
    if typ=='stort_gammalt':
        d=Duk(64,72)
        for (cx,cy,rx,ry) in [(14,58,5,3),(50,58,5,3),(22,62,4,2),(42,62,4,2)]: d.ellips(cx,cy,rx,ry,'bark','rot')
        d.ellips(32,54,8,10,'bark','stam')
        for (cx,cy,r) in [(32,24,24),(16,30,12),(48,30,12),(24,14,12),(42,14,12),(32,36,16)]: d.ellips(cx,cy,r,r*0.85,'lovgam','krona')
        d.kontur()
        im=d.bild()
        # knotor i stammen
        for (x,y) in [(29,50),(34,56),(31,60),(36,52)]: im.putpixel((x,y),hx2('#24160C'))
        return im
    if typ=='stort_ungt':
        d=Duk(40,72)
        d.ellips(20,60,3,9,'barkung','stam')
        for (cx,cy,r) in [(20,24,15),(20,12,10),(13,30,8),(27,30,8),(20,38,10)]: d.ellips(cx,cy,r,r*1.05,'lovung','krona')
        d.kontur(); return d.bild()
    if typ=='litet_gammalt':
        d=Duk(28,34)
        for (cx,cy,rx,ry) in [(8,30,4,2),(20,30,4,2)]: d.ellips(cx,cy,rx,ry,'bark','rot')
        d.ellips(14,26,4,6,'bark','stam')
        for (cx,cy,r) in [(14,12,9),(8,15,5),(20,14,5)]: d.ellips(cx,cy,r,r*0.8,'lovgam','krona')
        d.kontur(); im=d.bild()
        for (x,y) in [(9,10),(18,9),(14,6)]: im.putpixel((x,y),hx2('#8A6038'))   # vissna blad
        return im
    if typ=='rida':
        d=Duk(40,40)
        for (cx,cy,r) in [(20,18,15),(10,22,9),(30,22,9),(20,10,9)]: d.ellips(cx,cy,r,r*0.9,'lov','krona')
        d.kontur(); return d.bild()
def lovhog():
    d=Duk(24,16)
    for (cx,cy,rx,ry) in [(12,10,10,5),(7,9,5,4),(17,9,5,4),(12,7,6,4)]: d.ellips(cx,cy,rx,ry,'lovhog','hog')
    d.kontur(); im=d.bild()
    random.seed(5)
    for i in range(22):
        x=random.randint(3,20); y=random.randint(4,13)
        if im.getpixel((x,y))[3]: im.putpixel((x,y),hx2(random.choice(['#6A3A12','#EEC46A','#D09A40','#8A5A1E','#4E8A3A'])))
    return im
def lada():
    im=Image.new('RGBA',(20,16),(0,0,0,0))
    T=['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260']
    for y in range(16):
        for x in range(20):
            if x in (0,19) or y in (0,15): c=T[0]
            elif y<6: c=T[4] if y<3 else T[3]      # locket uppifrån
            elif y==6: c=T[0]
            else: c=T[2] if y<12 else T[1]
            im.putpixel((x,y),hx2(c))
    for xx in (5,10,15):                           # tre luckor i locket
        for (a,b) in [(0,0),(1,0),(0,1),(1,1)]: im.putpixel((xx-1+a,2+b),hx2('#E8D8B0'))
    for (x,y,c) in [(9,8,'#8E949E'),(10,8,'#B4B8C0'),(9,9,'#8E949E'),(10,9,'#6E737C'),(9,10,'#3E4148'),(10,7,'#6E737C'),(9,7,'#6E737C')]: im.putpixel((x,y),hx2(c))
    for y in range(7,15): im.putpixel((3,y),hx2('#8E949E')); im.putpixel((16,y),hx2('#8E949E'))
    return im
def rothal():
    d=Duk(16,12); d.ellips(8,7,7,4,'bark','kant',toner=(0,1,1,2)); d.kontur(); im=d.bild()
    for y in range(5,10):
        for x in range(4,13):
            if ((x-8)/4.2)**2+((y-7)/2.2)**2<=1: im.putpixel((x,y),hx2('#140C06'))
    return im
def skylt(med_ros=True,w=16,h=18):
    im=Image.new('RGBA',(w,h),(0,0,0,0))
    T=['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260']
    # stolpe
    for y in range(9,h-1): im.putpixel((w//2-1,y),hx2(T[2])); im.putpixel((w//2,y),hx2(T[1]))
    im.putpixel((w//2-1,h-1),hx2(T[0])); im.putpixel((w//2,h-1),hx2(T[0]))
    # brädan: ovansida ljus, framsida
    for y in range(1,10):
        for x in range(1,w-1):
            c=T[4] if y<3 else (T[3] if y<8 else T[2])
            if (x+y*3)%9==0 and y>2: c=T[2]
            im.putpixel((x,y),hx2(c))
    for x in range(1,w-1): im.putpixel((x,0),hx2(T[0])); im.putpixel((x,10),hx2(T[0]))
    for y in range(0,11): im.putpixel((0,y),hx2(T[0])); im.putpixel((w-1,y),hx2(T[0]))
    if med_ros:
        cx,cy=w-4,5
        for (a,b,c) in [(0,-2,'#C83A3A'),(0,-1,'#C83A3A'),(0,1,'#2A2E38'),(0,2,'#2A2E38'),(-2,0,'#5A3A1E'),(2,0,'#5A3A1E'),(0,0,'#F2E8C8')]: im.putpixel((cx+a,cy+b),hx2(c))
        for x in range(2,w-7,2): im.putpixel((x,5),hx2('#5A3A1E'))
    return im
def fossil():
    d=Duk(18,14); d.ellips(9,8,8,5,'sten','sten'); d.kontur(); im=d.bild()
    for (x,y) in [(4,8),(5,7),(6,8),(7,7),(8,8),(9,7),(10,8),(11,7),(12,8),(13,7)]: im.putpixel((x,y),hx2('#F2ECD8'))
    for (x,y) in [(5,6),(7,6),(9,6),(11,6),(13,9)]: im.putpixel((x,y),hx2('#D8CCB0'))
    return im
def bo():
    d=Duk(28,14); d.ellips(14,8,12,5,'bark','bo',toner=(0,1,2,3)); d.kontur(); im=d.bild()
    for i in range(11): im.putpixel((3+i*2-(i%2),6+(i%3)),hx2('#A87C50'))
    return im
def lapp_orange():
    im=Image.new('RGBA',(14,10),(0,0,0,0))
    for y in range(1,9):
        for x in range(1,13): im.putpixel((x,y),hx2('#F6DCC3' if (1<x<12 and 1<y<8) else '#E8823A'))
    for x in range(3,11,2): im.putpixel((x,4),hx2('#B85E22')); im.putpixel((x+1,6),hx2('#B85E22'))
    return im
def bro():
    im=Image.new('RGBA',(56,22),(0,0,0,0))
    for x in range(56):
        for y in range(3,19):
            c=['#BE9260','#9A6E40','#7A522C'][0 if y<8 else (1 if y<15 else 2)]
            if x%7==0: c='#5A3A1E'
            im.putpixel((x,y),hx2(c))
        im.putpixel((x,2),hx2('#2E1C0E')); im.putpixel((x,19),hx2('#2E1C0E'))
        if x%14==3:
            for y in range(0,22): im.putpixel((x,y),hx2('#5A3A1E'))
    return im
def buske():
    d=Duk(20,16)
    for (cx,cy,r) in [(10,9,7),(5,10,4),(15,10,4)]: d.ellips(cx,cy,r,r*0.8,'lov','buske')
    d.kontur(); return d.bild()
def stege():
    im=Image.new('RGBA',(16,32),(0,0,0,0))
    for y in range(32):
        for x in (3,12): im.putpixel((x,y),hx2('#7A522C')); im.putpixel((x+1,y),hx2('#5A3A1E'))
        if y%5==2:
            for x in range(4,12): im.putpixel((x,y),hx2('#BE9260'))
    return im
OBJ=[]
def obj(im,x,y,skugg=True):
    OBJ.append((y+im.height,im,x,y,skugg))
# placeringar från glantan.tmj (övre vänstra hörnet i kartan, figurens fot vid objektets botten)
obj(trad('stort_ungt'),120-8,30+40-72)
obj(trad('stort_gammalt'),264-18,48+40-72)
obj(trad('litet_gammalt'),40-4,120+28-34)
obj(trad('stort_gammalt'),100-12,220+40-72)        # apans träd
obj(bo(),40+14,200+10)
obj(fossil(),52-1,206-1)
for (x,y) in [(352,40),(416,40),(352,96),(416,96)]: obj(lovhog(),x,y)
obj(lada(),464,100-2)
obj(rothal(),480,40)
obj(lapp_orange(),440,70,False)
obj(skylt(True,16,18),176,120-4)
obj(skylt(False,18,16),600-1,128-4)
obj(buske(),612,172-2)
obj(stege(),60,228,False)
# trädridå runt kanterna (utom stigen söderut och kullen/bäcken)
for x in range(-20,330,20): obj(trad('rida'),x,-26+(x%3)*2)
for x in range(-10,330,22): obj(trad('rida'),x,-12+(x%4))
for y in range(0,370,20): obj(trad('rida'),-24,y)
for y in range(10,360,24): obj(trad('rida'),-10,y)
for x in range(-16,566,20):
    if 124<x<180: continue
    obj(trad('rida'),x,352+(x%5))
for x in range(-6,566,24):
    if 124<x<180: continue
    obj(trad('rida'),x,340+(x%3))
for x in range(330,560,30): obj(trad('rida'),x,-30)
bro_im=bro(); img.alpha_composite(bro_im,(584,147))
for yb,im,x,y,sk in sorted(OBJ,key=lambda t:t[0]):
    if sk: skugga_oval(x+im.width/2,y+im.height-2,im.width*0.36,3)
    lagg(im,x,y)
img.save('mark.png')
