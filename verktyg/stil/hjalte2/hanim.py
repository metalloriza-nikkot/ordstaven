exec(open('hjalte.py').read().rsplit("\nRAD=",1)[0])
import math
GULD='#FFD95A'; GULD2='#FFF2B0'
KALL=['#F2A0C0','#6EC6E6','#3A7AD8']; VARM=['#F2D22E','#F08A2A','#D83A2E']
def ansikte_ner(d,oga_t,mun):
    if oga_t=='glad':
        for x in (6,10): d.fast(x-1,8,OGA); d.fast(x,7,OGA); d.fast(x+1,8,OGA)
    else:
        for x in (6,10): d.fast(x,7,VIT); d.fast(x,8,OGA)
    if mun=='oppen':
        for (x,y) in [(5,10),(11,10),(6,11),(10,11),(7,12),(8,12),(9,12)]: d.fast(x,y,MUN)
        for (x,y) in [(6,10),(7,10),(8,10),(9,10),(10,10)]: d.fast(x,y,MUN)
        for (x,y) in [(7,11),(8,11),(9,11)]: d.fast(x,y,'#E8707A')
    elif mun=='o':
        for (x,y) in [(7,10),(8,10),(7,11),(8,11)]: d.fast(x,y,MUN)
    else:
        for (x,y) in [(5,10),(6,11),(7,11),(8,11),(9,11),(10,11),(11,10)]: d.fast(x,y,MUN)
def h_ner(f=0,armR=(3.3,15.2),armL=(12.7,15.2),oga_t='oppen',mun='le',benlage=None):
    d=Duk(16,24)
    ben_ner(d,f)
    d.ellips(armL[0],armL[1],1.3,2.2,'hud','arm')
    if armR: d.ellips(armR[0],armR[1],1.3,2.2,'hud','arm')
    d.ellips(8,15.8,4.2,2.9,'drakt','kropp')
    d.ellips(8,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    d.ellips(8,8.7,5.0,3.9,'hud','ansikte',zbias=0.1)
    skilj(d,'ansikte','hjalm',ton=1); skilj(d,'kropp','arm',ton=1); skilj(d,'hjalm','kropp',ton=1)
    for x in range(5,11): d.satt(x,13,'drakt',4)
    for x in range(5,11):
        if d.px.get((x,18),('',0))[0]=='drakt': d.satt(x,18,'drakt',4)
    d.kontur(); ansikte_ner(d,oga_t,mun)
    return d.bild()
def h_upp(f=0,armR=(12.7,15.2),armL=(3.3,15.2)):
    d=Duk(16,24); ben_ner(d,f)
    for c in (armR,armL): d.ellips(c[0],c[1],1.3,2.2,'hud','arm')
    d.ellips(8,15.8,4.2,2.9,'drakt','kropp')
    d.ellips(8,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    skilj(d,'kropp','arm',ton=1); skilj(d,'hjalm','kropp',ton=1)
    for x in range(5,11):
        if d.px.get((x,18),('',0))[0]=='drakt': d.satt(x,18,'drakt',4)
    d.kontur()
    for x in range(4,12):
        if d.px.get((x,12),('',0))[0]=='hjalm': d.satt(x,12,'hjalm',1)
    return d.bild()
def h_hoger(f=0,arm=(8.4,15.4)):
    d=Duk(16,24)
    d.ellips(7.6,19.6,1.5,2.2,'hud','benb',toner=(0,1,1,2)); d.ellips(8.2,21.9,1.9,1.1,'sko','skob',toner=(0,1,1,2))
    d.ellips(7.4,15.8,3.5,2.9,'drakt','kropp')
    d.ellips(8.0,19.7,1.5,2.2,'hud','ben'); d.ellips(8.7,22.0,2.0,1.2,'sko','sko')
    d.ellips(7.6,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    d.ellips(11.0,8.8,3.6,3.8,'hud','ansikte',zbias=0.1)
    d.ellips(arm[0],arm[1],1.3,2.2,'hud','arm')
    skilj(d,'ansikte','hjalm',ton=1); skilj(d,'arm','kropp',ton=1); skilj(d,'hjalm','kropp',ton=1)
    for x in range(5,10): d.satt(x,13,'drakt',4)
    d.kontur()
    d.fast(12,7,VIT); d.fast(12,8,OGA)
    for (x,y) in [(11,10),(12,11),(13,11),(14,11),(15,10)]: d.fast(x,y,MUN)
    return d.bild()
CW,CH,OX,OY=32,40,8,16
def pa_duk(hero,dy=0):
    im=Image.new('RGBA',(CW,CH),(0,0,0,0)); im.alpha_composite(hero,(OX,OY+dy)); return im
def stav_linje(hand,riktning,fore=4,efter=14,glod=0):
    """hand i hjältens koordinater. riktning pekar mot den kalla änden. fore: pixlar bakom handen (varm ände)."""
    im=Image.new('RGBA',(CW,CH),(0,0,0,0))
    dx,dy=riktning; n=math.hypot(dx,dy); dx/=n; dy/=n
    hx,hy=hand[0]+OX,hand[1]+OY
    L_=fore+efter
    px_={}
    # vinkelrät, åt det håll som vänder bort från ljuset (ned-höger)
    px_dx,px_dy=-dy,dx
    if px_dx+px_dy<0: px_dx,px_dy=-px_dx,-px_dy
    steps=int(L_*2)
    for s in range(steps+1):
        t=s/steps; d_=-fore+t*L_
        x=hx+dx*d_; y=hy+dy*d_
        i=int(round(t*17))
        if i>=15: col=KALL[min(2,17-i)]
        elif i<=2: col=VARM[2-i]
        else: col='#2A2830' if i not in (8,) else GULD
        X,Y=int(round(x)),int(round(y))
        px_[(X,Y)]=(col,1)
        X2,Y2=int(round(x+px_dx)),int(round(y+px_dy))
        if (X2,Y2) not in px_ or px_[(X2,Y2)][1]==0:
            c2='#121016' if col in ('#2A2830',GULD) else col
            px_[(X2,Y2)]=(c2,0)
        X3,Y3=int(round(x-px_dx)),int(round(y-px_dy))
        if (X3,Y3) not in px_:
            c3='#7A7888' if col in ('#2A2830',GULD) else None
            if c3: px_[(X3,Y3)]=(c3,0)
    for (X,Y),(c,_) in px_.items():
        if 0<=X<CW and 0<=Y<CH: im.putpixel((X,Y),hx_(c))
    if glod:
        ex,ey=hx+dx*efter,hy+dy*efter
        r=2+glod
        for a in range(0,360,20):
            X=int(round(ex+math.cos(math.radians(a))*r)); Y=int(round(ey+math.sin(math.radians(a))*r))
            if 0<=X<CW and 0<=Y<CH: im.putpixel((X,Y),hx_(GULD if a%40 else GULD2))
        for (a,b) in [(0,-r-2),(r+2,0),(-r-2,0),(0,r+2)]:
            X,Y=int(round(ex+a)),int(round(ey+b))
            if 0<=X<CW and 0<=Y<CH: im.putpixel((X,Y),hx_(GULD2))
    return im
def hx_(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
def hand_pix(im,hand,ton=3):
    H=MAT['hud']; x,y=int(round(hand[0]+OX)),int(round(hand[1]+OY))
    for (a,b,t) in [(0,0,ton),(1,0,ton-1),(0,1,ton-1),(1,1,1)]:
        if 0<=x+a<CW and 0<=y+b<CH: im.putpixel((x+a,y+b),hx_(H[t]))
    return im
F={}
# SVINGA, framifrån: upp bakom, tvärs framför, ned åt andra sidan
def svinga_ner():
    ut=[]
    for armR,hand,rikt in [((2.8,12.8),(2,12),(-0.35,-1)),((5.0,16.6),(5,17),(1,-0.15)),((9.5,17.4),(10,18),(0.9,0.42))]:
        h=pa_duk(h_ner(armR=armR)); s=stav_linje(hand,rikt); hand_pix(s,hand)
        ut.append((h,s))
    return ut
def svinga_hoger():
    ut=[]
    for arm,hand,rikt in [((7.2,13.4),(7,12),(-0.45,-1)),((10.2,15.0),(11,15),(1,-0.25)),((10.0,16.6),(11,17),(0.9,0.42))]:
        h=pa_duk(h_hoger(arm=arm)); s=stav_linje(hand,rikt); hand_pix(s,hand)
        ut.append((h,s))
    return ut
def svinga_upp():
    ut=[]
    for armR,hand,rikt in [((13.4,12.8),(14,12),(0.3,-1)),((11.0,13.0),(11,12),(-0.8,-0.75)),((6.5,14.5),(6,14),(-1,0.1))]:
        h=pa_duk(h_upp(armR=armR)); s=stav_linje(hand,rikt); hand_pix(s,hand)
        ut.append((h,s))
    return ut
def trolla_ner():
    ut=[]
    for armR,hand,rikt,gl in [((3.0,12.6),(3,11),(-0.15,-1),0),((3.4,10.6),(3,8),(0,-1),0),((3.4,10.6),(3,8),(0,-1),1),((3.4,10.6),(3,8),(0,-1),2)]:
        h=pa_duk(h_ner(armR=armR,mun='o' if gl==0 else 'oppen')); s=stav_linje(hand,rikt,glod=gl); hand_pix(s,hand)
        ut.append((h,s))
    return ut
def fira_ner():
    ut=[]
    for dy,armR,armL,hand,oga_t,mun in [(0,(3.3,15.6),(12.7,15.6),(3,16),'glad','le'),(-3,(3.0,10.4),(13.0,10.4),(3,8),'glad','oppen'),(0,(3.3,15.2),(12.7,15.2),(3,16),'glad','oppen')]:
        h=pa_duk(h_ner(armR=armR,armL=armL,oga_t=oga_t,mun=mun),dy); s=stav_linje((hand[0],hand[1]+dy),(0,-1)); hand_pix(s,(hand[0],hand[1]+dy))
        ut.append((h,s))
    return ut
def spegla(par): return [(h.transpose(Image.FLIP_LEFT_RIGHT),s.transpose(Image.FLIP_LEFT_RIGHT)) for h,s in par]
F['svinga_ner']=svinga_ner(); F['svinga_hoger']=svinga_hoger(); F['svinga_upp']=svinga_upp(); F['svinga_vanster']=spegla(F['svinga_hoger'])
F['trolla_ner']=trolla_ner(); F['fira_ner']=fira_ner()
UNDER={'svinga_upp'}   # staven ritas under hjälten (den är på andra sidan)
def komp(k,i,bg=None):
    h,s=F[k][i]; im=Image.new('RGBA',(CW,CH),bg or (0,0,0,0))
    skg=Image.new('RGBA',(CW,CH),(0,0,0,0)); skg.alpha_composite(skugga(16,24,8,22.6,5.5,1.3),(OX,OY)); im.alpha_composite(skg)
    if k in UNDER: im.alpha_composite(s); im.alpha_composite(h)
    else: im.alpha_composite(h); im.alpha_composite(s)
    return im
if __name__=='__main__':
    import sys
    from PIL import ImageDraw, ImageFont
    fnt=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
    S=5; GR=(104,160,72,255)
    out=Image.new('RGBA',(4*(CW*S+8)+10,len(F)*(CH*S+24)),(255,255,255,255)); d=ImageDraw.Draw(out)
    for r,k in enumerate(F):
        d.text((8,r*(CH*S+24)+4),k,fill=(0,0,0),font=fnt)
        for i in range(len(F[k])):
            out.paste(komp(k,i,GR).resize((CW*S,CH*S),Image.NEAREST),(8+i*(CW*S+8),r*(CH*S+24)+20))
    out.save(sys.argv[1])
