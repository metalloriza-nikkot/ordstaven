# Farfars hus: rummens bakgrunder (golv och väggram) ur kartorna, och husets föremål.
# Väggarna lutar som i A Link to the Past (stilguiden §8, Inomhus), därför blir varje rum en bild och inte rutor:
# fem fasta rum, en bild per rum ritas en gång, och golvdatorn ritar en bild i stället för hundratals rutor.
import json, math, os, random
from PIL import Image, ImageDraw
exec(open('/home/claude/rutor/pix.py').read())
MAT['tra']=['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260']
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
KART='/home/claude/ordstaven/kartor/den-gomda-dalen/'
TRA=['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260','#D8B080']
GOLV=['#4A2E16','#6E4624','#8A5C30','#A4723E','#BC8A52']
VIND=['#2A1C10','#4E3420','#6A4A2C','#86603A','#A07A4E']
RAM='#E8D4A8'; RAMS='#B89A6A'
TAPET={'hallen':['#3E5A4A','#4E6E5A','#5E806A','#8AA890'],      # mörk grön med ljusa små blad
       'koket':['#7A6A3E','#94824C','#AE9A5C','#D6C48A'],        # varm senap
       'sovrummet':['#4A5A7A','#5A6C8E','#6C80A2','#A0B4D0'],    # blå
       'kontoret':['#6A3A34','#824840','#9A584E','#C8907E']}     # vinröd, läsrum

def golv(im,px,B,H,pal,seed):
    # breda plankor (8 px), långa (48 px) och förskjutna, ljus överkant på varje planka
    rnd=random.Random(seed)
    for y in range(H):
        rad=y//8; i=y%8; off=(rad*29)%48
        for x in range(B):
            nr=(x+off)//48
            bas=pal[2] if (rad+nr)%3 else pal[3]
            c=bas
            if i==7: c=pal[0]
            elif i==0: c=pal[4] if bas==pal[3] else pal[3]
            if (x+off)%48==0 and i<7: c=pal[0]
            px[x,y]=hx2(c)
    for k in range(B*H//90):                     # ådring i korta streck
        x=rnd.randrange(B-3); y=rnd.randrange(H)
        if 1<=y%8<=5:
            for t in range(rnd.randint(2,4)):
                if px[x+t,y]!=hx2(pal[0]): px[x+t,y]=hx2(pal[1])

def poly(d,pts,c): d.polygon(pts,fill=hx2(c))

def rum_bild(namn):
    m=json.load(open(KART+namn+'.tmj')); B=m['width']*16; H=m['height']*16
    eg={p['name']:p['value'] for p in m.get('properties',[])}
    bak=eg.get('vagg_bak',48); sida=eg.get('vagg_sida',32); fram=eg.get('vagg_fram',16)
    vind=namn=='vinden'
    im=Image.new('RGBA',(B,H)); px=im.load(); d=ImageDraw.Draw(im)
    golv(im,px,B,H,VIND if vind else GOLV,len(namn))
    # bakväggen
    T=TAPET.get(namn)
    for y in range(bak):
        for x in range(sida,B-sida):
            if vind:
                c=VIND[2] if (x//10)%2 else VIND[3]
                if x%10==0: c=VIND[0]
            else:
                c=T[1]
                if (x//8+y//8)%2==0 and x%8==3 and y%8==3: c=T[3]
                if (x//8+y//8)%2==1 and x%8==6 and y%8==6: c=T[2]
            px[x,y]=hx2(c)
        if y>=bak-4:
            for x in range(sida,B-sida): px[x,y]=hx2([TRA[3],TRA[2],TRA[2],TRA[0]][y-(bak-4)])   # golvlist
    for x in range(sida,B-sida):                 # skuggan under bakväggens överkant
        px[x,4]=hx2(VIND[0] if vind else T[0]); px[x,5]=hx2(VIND[1] if vind else T[0])
    if vind:                                      # sneda takbjälkar
        for k in range(sida+20,B-sida-10,56):
            for y in range(6,bak-4):
                for t in range(4):
                    xx=k+t+(y-6)//3
                    if xx<B-sida: px[xx,y]=hx2([VIND[4],VIND[3],VIND[2],VIND[0]][t])
    # sidoväggarna (lutar utåt), vänster i skugga och höger i ljus
    VS=(VIND[1],VIND[2]) if vind else (T[0],T[1])
    VL=(VIND[2],VIND[3]) if vind else (T[1],T[2])
    poly(d,[(0,0),(sida,bak),(sida,H-fram),(0,H)],VS[0])
    poly(d,[(B,0),(B-sida,bak),(B-sida,H-fram),(B,H)],VL[1])
    for y in range(H):                            # lister längs sidoväggarnas fot
        for x in range(0,sida):
            if px[x,y]==hx2(VS[0]) and (x+y)%9==0: px[x,y]=hx2(VS[1])
    poly(d,[(0,0),(sida,0),(sida,bak)],VS[0]); poly(d,[(B,0),(B-sida,0),(B-sida,bak)],VL[1])
    d.line([(sida,bak),(sida,H-fram)],fill=hx2(TRA[0]),width=1); d.line([(B-sida-1,bak),(B-sida-1,H-fram)],fill=hx2(TRA[0]),width=1)
    d.line([(0,0),(sida,bak)],fill=hx2(TRA[0])); d.line([(B-1,0),(B-sida-1,bak)],fill=hx2(TRA[0]))
    d.line([(0,H-1),(sida,H-fram)],fill=hx2(TRA[0])); d.line([(B-1,H-1),(B-sida-1,H-fram)],fill=hx2(TRA[0]))
    # främre väggen: en tunn kant med ovansida
    poly(d,[(0,H),(sida,H-fram),(B-sida,H-fram),(B,H)],TRA[2])
    for x in range(sida,B-sida): px[x,H-fram]=hx2(RAM); px[x,H-fram+1]=hx2(RAMS)
    # massiva väggar inne i rummet (hallen)
    for o in m['layers'][0]['objects']:
        if (o.get('type') or o.get('class'))=='vagg':
            x0,y0,w,h=int(o['x']),int(o['y']),int(o['width']),int(o['height'])
            d.rectangle([x0,y0,x0+w-1,y0+h-1],fill=hx2(T[0] if T else VIND[1]))
            if y0>bak:
                d.rectangle([x0,y0+h-fram,x0+w-1,y0+h-1],fill=hx2(TRA[2]))
            d.rectangle([x0,y0,x0+w-1,y0+2],fill=hx2(RAM))
            if x0>sida: d.rectangle([x0,y0,x0+2,y0+h-1],fill=hx2(RAM))
    # den yttre ramen: väggarnas ovansida som en ljus list runt rummet
    for i in range(3):
        c=RAM if i<2 else RAMS
        d.rectangle([i,i,B-1-i,H-1-i],outline=hx2(c))
    d.rectangle([0,0,B-1,H-1],outline=hx2(TRA[0]))
    # fasta saker som inte används (stilguidens rumsbeskrivning)
    if namn=='koket': kok_inredning(im,B,bak)
    for (x0,y0,w,h) in NORRFONSTER.get(namn,[]): vaggfonster(px,x0,y0,w,h)
    return im

NORRFONSTER={'koket':[(106,8,24,13)],'kontoret':[(190,8,28,24)],'hallen':[(352,8,28,24),(92,8,24,22)]}
def vaggfonster(px,x0,y0,w,h):
    # fönster i norra väggen: karm, spröjs, himmel ljusare upptill, fönsterbräda med ljus ovansida
    for y in range(y0,y0+h):
        for x in range(x0,x0+w):
            inne=x0+2<=x<x0+w-2 and y0+2<=y<y0+h-3
            c=TRA[1]
            if inne:
                c='#B8DCF4' if y<y0+h//2 else '#8AC0E8'
                if x==x0+w//2 or y==y0+(h-3)//2+1: c=TRA[2]
            if y>=y0+h-3: c=TRA[4] if y==y0+h-3 else TRA[2]
            px[x,y]=hx2(c)
    px[x0+3,y0+3]=hx2('#FFFFFF'); px[x0+4,y0+3]=hx2('#E8F6FF'); px[x0+3,y0+4]=hx2('#E8F6FF')

def kok_inredning(im,B,bak):
    px=im.load()
    # spis (vänster) och diskbänk (mitten) mot bakväggen, fönster mot öster ritas på högra väggen
    for x in range(44,72):
        for y in range(20,50):
            c='#3A3A44' if y<24 else ('#5A5A66' if y<26 else '#4A4A54')
            if y>=26 and (x-44)%9==0: c='#2A2A30'
            px[x,y]=hx2(c)
    for (cx,cy) in [(50,22),(64,22)]:
        for a in range(-2,3): px[cx+a,cy]=hx2('#202024')
    for x in range(96,140):
        for y in range(22,50):
            c=TRA[3] if y<26 else (TRA[2] if y<44 else TRA[1])
            if y==26 or x in (96,139): c=TRA[0]
            if 26<y<44 and (x-96)%22==0: c=TRA[0]
            px[x,y]=hx2(c)
    for x in range(104,122):
        for y in range(22,25): px[x,y]=hx2('#9AA6B4' if y==22 else '#6E7A88')

# ---------------- föremål ----------------
def bild(w,h): return Image.new('RGBA',(w,h),(0,0,0,0))
def rekt(px,x0,y0,x1,y1,fyll,kant=None,topp=None,tjock=1):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=fyll
            if topp and y<y0+tjock: c=topp
            if kant and (x in (x0,x1) or y in (y0,y1)): c=kant
            px[x,y]=hx2(c)

def dorr(ute=False):
    im=bild(26,36); px=im.load()
    rekt(px,0,0,25,35,TRA[1],TRA[0])                    # karm
    rekt(px,3,3,22,35,TRA[3] if not ute else '#C89A5E',TRA[0])
    for y in range(4,35):                               # brädor
        for x in (9,15): px[x,y]=hx2(TRA[2])
    rekt(px,6,6,19,15,TRA[2],TRA[1]); rekt(px,6,19,19,31,TRA[2],TRA[1])
    for x in range(4,22): px[x,4]=hx2(TRA[4])
    px[19,20]=hx2('#E8D07A'); px[19,21]=hx2('#B89A3A'); px[20,20]=hx2('#B89A3A')   # handtag i mässing
    return im

def dorr_fram(ute=False):
    # en dörr i främre väggen: ett hål ned genom kanten, med dörrmatta
    im=bild(28,16); px=im.load()
    rekt(px,0,0,27,15,TRA[1])
    rekt(px,2,0,25,15,'#C8E0A0' if ute else GOLV[1])
    for x in range(2,26): px[x,0]=hx2(TRA[0]); px[x,1]=hx2(GOLV[0] if not ute else '#8AB860')
    for y in range(5,13):
        for x in range(6,22): px[x,y]=hx2('#8A3A2E' if (x+y)%4 else '#B85A3E')
    for x in range(6,22): px[x,5]=hx2('#5A2018')
    return im

def stege(w,h,hal=False):
    im=bild(w,h); px=im.load()
    if hal:
        rekt(px,0,0,w-1,h-1,'#140C06',TRA[0])
        for y in range(1,4):
            for x in range(1,w-1): px[x,y]=hx2(TRA[1])
    for y in range(h):
        for x in (4,w-6):
            px[x,y]=hx2(TRA[3]); px[x+1,y]=hx2(TRA[1])
        if y%6==3:
            for x in range(6,w-6): px[x,y]=hx2(TRA[4]);
            for x in range(6,w-6):
                if y+1<h: px[x,y+1]=hx2(TRA[1])
    return im

def fonster(w,h,rund=False):
    im=bild(w,h); px=im.load()
    cx,cy=w/2,h/2
    for y in range(h):
        for x in range(w):
            if rund:
                dx=(x+0.5-cx)/(w/2); dy=(y+0.5-cy)/(h/2); r=dx*dx+dy*dy
                if r>1: continue
                c=TRA[1] if r>0.62 else ('#9AC8E8' if y<cy else '#6AA6D8')
                if r<=0.62 and (abs(x+0.5-cx)<1 or abs(y+0.5-cy)<1): c=TRA[2]
            else:
                c=TRA[2] if (x<3 or x>=w-3 or y<3 or y>=h-4) else ('#9AC8E8' if y<h/2 else '#6AA6D8')
                if 3<=x<w-3 and 3<=y<h-4 and (abs(x+0.5-cx)<1 or abs(y+0.5-cy+1)<1): c=TRA[2]
                if y>=h-4: c=TRA[3] if y==h-4 else TRA[1]
            px[x,y]=hx2(c)
    for (x,y) in [(int(cx)-4,int(cy)-4),(int(cx)-3,int(cy)-5)]:
        if 0<=x<w and 0<=y<h and px[x,y][3]: px[x,y]=hx2('#E8F6FF')
    return im

def lada(w,h,farg=None):
    pal={'rod':['#4A1010','#8A2420','#C23A2E','#E2604A'],'bla':['#0A1838','#16306E','#2A4CA0','#5A7ACC'],
         'gul':['#6A5410','#B89A20','#E8C838','#F6E07A'],None:[TRA[0],TRA[1],TRA[2],TRA[4]]}[farg]
    im=bild(w,h); px=im.load(); lock=max(4,h//3)
    for y in range(h):
        for x in range(w):
            c=pal[3] if y<lock else pal[2]
            if y==lock: c=pal[0]
            if y>=h-3: c=pal[1]
            if x in (0,w-1) or y in (0,h-1): c=pal[0]
            px[x,y]=hx2(c)
    for x in range(2,w-2): px[x,1]=hx2(pal[3])
    for y in range(lock+1,h-1):
        px[3,y]=hx2(pal[1]); px[w-4,y]=hx2(pal[1])
    return im

def kruka():
    d=Duk(16,18); MAT['lera']=['#3A1A0E','#7A3A20','#A8522E','#C8704A','#E09A6E']
    d.ellips(8,11,6.5,6.5,'lera','kropp'); d.ellips(8,4.2,5.2,2.2,'lera','kant',zbias=0.3)
    d.kontur(); im=d.bild(); px=im.load()
    for x in range(5,12): px[x,4]=hx2('#2A1208')
    return im

def radio():
    im=bild(22,18); px=im.load()
    rekt(px,0,3,21,17,TRA[2],TRA[0]);
    for x in range(1,21): px[x,4]=hx2(TRA[4])
    for y in range(6,15):
        for x in range(3,13): px[x,y]=hx2('#3A2A1A' if (x+y)%2 else '#C8B48A')    # högtalarduk
    for (x,y) in [(16,8),(16,12)]:
        for (a,b) in [(0,0),(1,0),(0,1),(1,1)]: px[x+a,y+b]=hx2('#E8D07A')
    for y in range(0,4): px[18,y]=hx2('#9AA6B4')                                   # antenn
    return im

def bord(w,h,saker=False):
    im=bild(w,h); px=im.load(); topp=h-8
    for x in (3,4,w-5,w-4):
        for y in range(topp,h): px[x,y]=hx2(TRA[1])
    rekt(px,0,0,w-1,topp,TRA[3],TRA[0])
    for x in range(1,w-1): px[x,1]=hx2(TRA[4])
    for x in range(1,w-1): px[x,topp-1]=hx2(TRA[2])
    if saker:
        for (cx,cy) in [(16,8),(w-16,8)]:                  # två tallrikar
            for y in range(-3,4):
                for x in range(-5,6):
                    if (x/5.5)**2+(y/3.5)**2<=1: px[cx+x,cy+y]=hx2('#F4F0E4' if (x/3.5)**2+(y/2.2)**2>1 else '#DCD6C4')
        for (x,y) in [(w//2-2,6),(w//2-1,6),(w//2,6),(w//2-2,7),(w//2,7),(w//2-1,8)]: px[x,y]=hx2('#C83A3A')   # kopp
        for x in range(w//2+6,w//2+14):
            for y in range(10,14): px[x,y]=hx2('#D8A85A' if y>10 else '#B8823A')              # bröd
    return im

def kopp():
    im=bild(10,10); px=im.load()
    for y in range(2,9):
        for x in range(1,8): px[x,y]=hx2('#E8E0D0' if y>3 else '#5A3A1E')
    for x in range(1,8): px[x,2]=hx2('#F4F0E4'); px[x,8]=hx2('#A8A090')
    px[8,4]=hx2('#E8E0D0'); px[9,5]=hx2('#E8E0D0'); px[8,6]=hx2('#E8E0D0')
    px[3,0]=hx2('#FFFFFF'); px[4,1]=hx2('#FFFFFF'); px[5,0]=hx2('#FFFFFF')            # ånga
    return im

def bokhylla(w,h):
    im=bild(w,h); px=im.load(); rnd=random.Random(9)
    rekt(px,0,0,w-1,h-1,TRA[1],TRA[0])
    for x in range(1,w-1): px[x,1]=hx2(TRA[4])
    for hy in (3,16):
        x=3
        while x<w-4:
            bw=rnd.randint(2,4); c=rnd.choice(['#8A2420','#2A4CA0','#3E7634','#B89A20','#6A3A6A','#C8B48A'])
            hh=rnd.randint(9,12)
            for xx in range(x,min(w-3,x+bw)):
                for yy in range(hy+12-hh,hy+12): px[xx,yy]=hx2(c)
                px[xx,hy+12-hh]=hx2('#E8E0D0') if xx==x else px[xx,hy+12-hh]
            x+=bw+(1 if rnd.random()<0.3 else 0)
        for x in range(1,w-1): px[x,hy+12]=hx2(TRA[3])
    return im

def expbok():
    im=bild(20,16); px=im.load()
    rekt(px,1,2,18,14,'#3E7634','#1E3A18')
    for x in range(2,18): px[x,3]=hx2('#5A9A48')
    for y in range(3,14): px[3,y]=hx2('#1E3A18')
    for (x,y) in [(11,6),(11,10),(9,8),(13,8),(11,8)]: px[x,y]=hx2('#E8D07A')          # kompassros i mässing
    return im

def fatolj(spegel=False):
    d=Duk(30,28); MAT['tyg']=['#3A1414','#6A2420','#8E3A30','#B05A48','#D08A70']
    d.ellips(15,8,13,7,'tyg','rygg')
    d.ellips(4,16,4,8,'tyg','arm'); d.ellips(26,16,4,8,'tyg','arm')
    d.ellips(15,18,10,6,'tyg','sits',zbias=0.2)
    for x in (5,25): d.satt(x,26,'tra',1); d.satt(x,27,'tra',0)
    d.kontur(); im=d.bild()
    return im.transpose(Image.FLIP_LEFT_RIGHT) if spegel else im

def laslampa():
    im=bild(12,24); px=im.load()
    for y in range(8,22): px[6,y]=hx2('#5A5A66')
    for x in range(3,10): px[x,22]=hx2('#3A3A44'); px[x,23]=hx2('#2A2A30')
    for y in range(0,8):
        for x in range(6-(y//2)-1,7+(y//2)+1):
            if 0<=x<12: px[x,y]=hx2('#F2D88A' if y<6 else '#C8A040')
    for x in range(2,11): px[x,8]=hx2('#FFF2B8')
    return im

def sang():
    d=Duk(64,44); MAT['tacke']=['#1E2E5A','#2A4A8A','#3E66AE','#6A8ED0','#A8C4F0']
    MAT['kudde']=['#8A8070','#C8C0B0','#E8E2D6','#F6F2EA','#FFFFFF']
    im=bild(64,44); px=im.load()
    rekt(px,0,0,63,10,TRA[2],TRA[0])                        # huvudgavel
    for x in range(1,63): px[x,1]=hx2(TRA[4])
    rekt(px,2,10,61,43,TRA[1],TRA[0])                       # ramen
    d.ellips(32,26,28,15,'tacke','tacke',platt=0.7)
    d.ellips(20,13,10,4,'kudde','kudde',platt=0.4)
    d.kontur(); im.alpha_composite(d.bild())
    for y in range(22,40,5):                                # mönster i täcket
        for x in range(10,56,8):
            if im.getpixel((x,y))[3]: px[x,y]=hx2('#A8C4F0')
    return im

def staket(h):
    im=bild(8,h); px=im.load()
    for y in range(h):
        for x in range(8):
            c=None
            if x in (2,3,4,5) and y%12<10: c=TRA[4] if x==2 else (TRA[3] if x<5 else TRA[1])
            if y%12 in (3,8) : c=TRA[2]
            if c: px[x,y]=hx2(c)
    return im

def berg(w,h):
    im=bild(w,h); px=im.load()
    for x in range(w):
        top=int(6+5*math.sin(x/17)+3*math.sin(x/7+1))
        for y in range(max(0,top),h):
            c='#7A8CA8' if y<top+3 else '#5E6E8A'
            if y<top+2 and top<6: c='#F4F6FA'
            px[x,y]=hx2(c)
    return im

FOREMAL={
 'dorr':dorr(),'dorr_fram':dorr_fram(),'dorr_fram_ute':dorr_fram(True),
 'stege_upp':stege(24,54),'stege_ner':stege(24,20,hal=True),
 'runt_fonster':fonster(28,22,rund=True),'fonster':fonster(40,24),'fonster_fram':None,
 'hylla':bord(72,20),'lada_liten':lada(20,20),'lada_lag':lada(24,16),'lada_stor':lada(32,22),'lada_hornet':lada(30,26),
 'lada_rod':lada(30,18,'rod'),'lada_bla':lada(30,18,'bla'),'lada_gul':lada(30,18,'gul'),
 'lada_rod_stor':lada(30,18,'rod'),'lada_rod_liten':lada(22,13,'rod'),'lada_bla_stor':lada(30,18,'bla'),
 'lada_lang':lada(30,18),'skylt_liten':None,'tva_buskar':None,
 'kruka':kruka(),'radio':radio(),'bord_med_saker':bord(70,30,True),'bord':bord(34,22),'kakaokopp':kopp(),
 'bokhylla':bokhylla(84,30),'expeditionsbok':expbok(),'fatolj_vanster':fatolj(),'fatolj_hoger':fatolj(True),
 'laslampa':laslampa(),'sang':sang(),'staket':staket(72),'berg':berg(160,20),
}
import importlib.util
src=open('/home/claude/rutor/objekt.py').read()
_g={}
exec(src.split("if __name__=='__main__':")[0].replace("open('pix.py')","open('/home/claude/rutor/pix.py')").replace("open('../prov/glanta.py')","open('/home/claude/prov/glanta.py')"),_g)
bu=_g['FOREMAL']['buske']; tb=bild(40,22); tb.alpha_composite(bu,(0,4)); tb.alpha_composite(bu,(20,6)); FOREMAL['tva_buskar']=tb
sl=_g['skylt'](True,14,14); FOREMAL['skylt_liten']=sl
def fonster_fram():
    # fönster i södra väggen: den tunna främre kanten med en glasruta som syns snett ovanifrån och en fönsterbräda inåt
    im=bild(40,16); px=im.load()
    rekt(px,0,0,39,15,TRA[2],TRA[0])
    for x in range(1,39): px[x,1]=hx2(RAM); px[x,2]=hx2(RAMS)
    rekt(px,3,4,36,13,'#8AC0E8',TRA[1])
    for y in range(5,13): px[20,y]=hx2(TRA[2])
    for x in range(4,36): px[x,5]=hx2('#B8DCF4')
    px[6,6]=hx2('#FFFFFF'); px[7,6]=hx2('#E8F6FF')
    for x in range(1,39): px[x,14]=hx2(TRA[4])
    return im
FOREMAL['fonster_fram']=fonster_fram()
sk=bild(144,18)
for i in range(6): sk.alpha_composite(FOREMAL['kruka'],(i*25+2,0))
FOREMAL['sex_krukor']=sk
RUM=['vinden','hallen','koket','sovrummet','kontoret']
if __name__=='__main__':
    os.makedirs('ut/rum',exist_ok=True); os.makedirs('ut/foremal',exist_ok=True)
    for r in RUM: rum_bild(r).save(f'ut/rum/{r}.png')
    for n,im in FOREMAL.items(): im.save(f'ut/foremal/{n}.png')
    print('ok')
