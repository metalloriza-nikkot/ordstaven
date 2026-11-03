# Pass 3 komplett (12-uppdrag, Stil 1): det som saknades för morgonen, köket och trädgården.
# - luftskeppet med baronen och Herr Skata i trädgården (s22), som hela bilder Teknik byter mellan
# - baronens porträtt (han talar i s22)
# - morgonen: ungen slickar hjälten på näsan i sängen (s19)
# - packlistans bildkort (p0_packlista)
# - sidovyn när de springer in i skogen (slutet av s22)
import os, math, random
from PIL import Image
exec(open('/home/claude/rutor/pix.py').read())
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
LD=lambda p: Image.open(p).convert('RGBA')
B2='/home/claude/baron2/ut/'; SKD='/home/claude/skata2/ut/'
MAT.update({
 'ballong':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],    # baronens orange
 'gondol':['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260'],
 'mass':['#4A3A10','#8A6A20','#C8A040','#E8C868','#FFF0B0'],
 'jacka':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],
 'hud':['#6A3A28','#D9967A','#F2C6A2','#F8DCC0','#FFF0E0'],
 'hjalm':['#5A4A30','#B8A57A','#E6D6A8','#F2E8C8','#FFFBEA'],
 'nos':['#5A2A1C','#B8604A','#D9826A','#E8A08A','#F4C4B0'],
 'tyg':['#3A1414','#6A2420','#8E3A30','#B05A48','#D08A70'],
})
def bild(w,h): return Image.new('RGBA',(w,h),(0,0,0,0))

# ---------- luftskeppet ----------
def ballong(prop=0):
    d=Duk(104,44)
    d.ellips(52,20,46,17,'ballong','ballong')
    for (cx,cy) in [(8,20)]: d.ellips(cx,cy,5,9,'ballong','fena',zbias=-0.1)   # stjärtfena
    d.kontur(); im=d.bild(); px=im.load()
    for x in range(14,92,13):                                   # sömmar
        for y in range(4,37):
            if px[x,y][3] and px[x,y]!=hx2('#5A2A0E') and ((x-52)/46)**2+((y-20)/17)**2<0.92: px[x,y]=hx2('#B85E22')
    for x in range(30,74):                                      # mässingsband
        y=31+int(3*math.sin((x-30)/44*math.pi))
        if px[x,y][3]: px[x,y]=hx2('#C8A040'); px[x,y+1]=hx2('#8A6A20')
    # propeller längst fram (höger), två lägen
    for y in range(12,29):
        if (prop==0 and y in range(12,19)) or (prop==1 and y in range(22,29)) or y in (20,21):
            px[100,y]=hx2('#9AA0AA'); px[101,y]=hx2('#5A5E66')
    px[99,20]=hx2('#3A3A44'); px[99,21]=hx2('#3A3A44')
    return im

def gondol():
    im=bild(44,16); px=im.load(); G=MAT['gondol']
    for y in range(16):
        for x in range(44):
            if y<3: c=G[4] if y==1 else G[0]
            else: c=G[2] if (x//6)%2 else G[3]
            if y>=13: c=G[1]
            if x in (0,43) or y in (0,15): c=G[0]
            px[x,y]=hx2(c)
    for x in range(2,42,8): px[x,6]=hx2(G[1]); px[x,10]=hx2(G[1])
    return im

def baron_overkropp(huvud_upp=0):
    b=LD(B2+'baronen_ga_ner_01.png')
    return b.crop((0,0,24,15+huvud_upp))

def kikare(fel=True):
    # En mässingskikare, 14 x 8, ögat till vänster (x 0). Rätt: den smala änden (okularet) mot ögat och den breda
    # (objektivet) ut. Fel: den breda änden mot ögat, så att allt ser litet ut (baronens skämt).
    # Rättat 2026-11-03: ändarna var omkastade, så att "fel" såg rätt ut. Ritas nu direkt i 14 x 8.
    im=bild(14,8); px=im.load()
    for x in range(14):
        bred=(x<6) if fel else (x>=8)
        y0,y1=(0,7) if bred else (2,5)
        for y in range(y0,y1+1):
            c='#E8C868' if y==y0+1 else ('#C8A040' if y<4 else '#8A6A20')
            if y in (y0,y1): c='#4A3A10'
            px[x,y]=hx2(c)
    for x in range(14):                                         # ringen där delarna möts
        if (fel and x==6) or (not fel and x==7):
            for y in range(1,7):
                if px[x,y][3]: px[x,y]=hx2('#4A3A10')
    ut=13
    for y in range(1,7):                                        # linsen blänker i den yttre änden
        if px[ut,y][3] and px[ut,y]!=hx2('#4A3A10'): px[ut,y]=hx2('#B8DCF4')
    return im

def repstege(trasslad=False):
    im=bild(22,30); px=im.load()
    for y in range(30):
        dx=int(3*math.sin(y/5)) if trasslad else 0
        for x in (6+dx,15+dx):
            if 0<=x<22: px[x,y]=hx2('#9A6E40')
        if y%5==2:
            for x in range(7+dx,15+dx):
                if 0<=x<22: px[x,y]=hx2('#BE9260')
    return im

SK_SITTA=LD(SKD+'herr_skata_sitta_hoger_01.png'); SK_TITTA=LD(SKD+'herr_skata_titta_hoger_01.png')

def luftskepp(baron='kikare_fel',prop=0,skata=None,mun=False,stege='hanger',hjalm=True):
    """Hela luftskeppet, 112 x 96. Baronen står i gondolen mitt under ballongen."""
    im=bild(112,96)
    im.alpha_composite(ballong(prop),(4,0))
    # linor från ballongen till gondolen
    p=im.load()
    for (x0,x1) in [(36,40),(76,72)]:
        for y in range(38,62):
            x=int(x0+(x1-x0)*(y-38)/24); p[x,y]=hx2('#5A4A30')
    # baronen (bakom gondolens kant)
    bo=baron_overkropp(5)
    bx,by=44,40
    if baron=='trasslar': bx,by=58,44
    if not hjalm:
        bo=bo.copy(); bp=bo.load()
        for y in range(0,7):
            for x in range(24):
                if bp[x,y][3]: bp[x,y]=(0,0,0,0)
        d=Duk(24,10); d.ellips(12,7.5,6.3,5.0,'hud','hjassa',zbias=0.1,klipp=lambda x,y: y<8); d.kontur(); bo.alpha_composite(d.bild().crop((0,0,24,8)),(0,0))   # en rund hjässa, ansiktet och ögonen orörda (2026-11-03)
    im.alpha_composite(bo,(bx,by))
    p=im.load()
    if mun:                                                  # öppen mun när han pratar
        p[bx+11,by+12]=hx2('#5A2A1C'); p[bx+12,by+12]=hx2('#5A2A1C'); p[bx+11,by+13]=hx2('#8A3A2E'); p[bx+12,by+13]=hx2('#8A3A2E')
    if baron in ('kikare_fel','kikare_ratt'):
        k=kikare(baron=='kikare_fel'); im.alpha_composite(k,(bx+13,by+5))   # i ögonhöjd (2026-11-03)
    if baron=='stolt':
        for (x,y) in [(bx+3,by+9),(bx+2,by+8),(bx+20,by+9),(bx+21,by+8)]: p[x,y]=hx2('#E8823A')   # händerna i sidorna
    g=gondol(); im.alpha_composite(g,(34,60))
    st=repstege(stege=='trasslad')
    if stege=='trasslad':
        im.alpha_composite(st,(56,62))
        for (x,y) in [(bx+4,by+14),(bx+5,by+15),(bx+18,by+15),(bx+19,by+14)]:
            if 0<=x<112 and 0<=y<96: p[x,y]=hx2('#BE9260')        # repet runt armarna
    else:
        im.alpha_composite(st,(68,66))
    if skata:
        s=SK_TITTA if skata in ('titta','putsa2') else SK_SITTA
        sx,sy=bx+4,by-10
        im.alpha_composite(s,(sx,sy)); p=im.load()
        if skata=='landar':                                  # fjädern på sned
            for (x,y) in [(bx+16,by-1),(bx+17,by-2),(bx+18,by-2),(bx+19,by-3)]: p[x,y]=hx2('#E8823A')
        if skata=='putsa1':
            p[sx+9,sy+6]=hx2('#2A2E38'); p[sx+10,sy+5]=hx2('#2A2E38')   # näbben i vingen
        if skata=='snor':
            for (x,y) in [(sx+1,sy+5),(sx+1,sy+6),(sx,sy+6)]: p[x,y]=hx2('#FFD95A' if False else '#E8C868')   # medaljen i näbben
            p[sx,sy+7]=hx2('#C83A3A')
    return im

LUFT={
 'luftskepp_glider_01':luftskepp('kikare_fel',0),
 'luftskepp_glider_02':luftskepp('kikare_fel',1),
 'luftskepp_skata_landar':luftskepp('kikare_fel',0,skata='landar'),
 'luftskepp_ser_hjalten':luftskepp('kikare_ratt',0,skata='landar'),
 'luftskepp_talar_01':luftskepp('stolt',0,skata='landar',mun=False),
 'luftskepp_talar_02':luftskepp('stolt',1,skata='landar',mun=True),
 'luftskepp_skata_putsar_01':luftskepp('stolt',0,skata='putsa1'),
 'luftskepp_skata_putsar_02':luftskepp('stolt',1,skata='putsa2'),
 'luftskepp_skata_snor':luftskepp('stolt',0,skata='snor'),
 'luftskepp_trasslar_01':luftskepp('trasslar',0,stege='trasslad',hjalm=True),
 'luftskepp_trasslar_02':luftskepp('trasslar',1,stege='trasslad',hjalm=False),
}

# ---------- baronens porträtt ----------
def baron_portratt(uttryck='stolt'):
    d=Duk(48,48)
    d.ellips(24,48,20,11,'jacka','jacka')
    for i,cx in enumerate((15,20,25)): d.ellips(cx,44,2.2,2.2,'mass','medalj',zbias=0.2)
    d.ellips(24,24,15,14,'hud','huvud',zbias=0.05)
    d.ellips(24,13,19,6,'hjalm','brätte',zbias=-0.2)
    d.ellips(24,9,13,9,'hjalm','kupol',zbias=0.1)
    d.ellips(24,28,4.5,4,'nos','nos',zbias=0.3)
    d.kontur(); im=d.bild(); p=im.load()
    for x in range(12,37): p[x,13]=hx2('#7A4A20'); p[x,14]=hx2('#5A3418')       # hattbandet
    for (x,y) in [(34,8),(35,7),(36,6),(37,5),(38,5),(36,7),(37,6)]: p[x,y]=hx2('#E8823A')   # orange fjäder
    for (x,y) in [(14,27),(15,27),(33,27),(34,27),(14,28),(34,28)]: p[x,y]=hx2('#E07060')  # röda kinder
    for (c,col) in [(15,'#C83A3A'),(20,'#3E9A48'),(25,'#E8C838')]:                 # medaljband, aldrig blått
        p[c,40]=hx2(col); p[c,41]=hx2(col)
    if uttryck=='stolt':
        for (x,y) in [(17,21),(18,20),(19,21),(29,21),(30,20),(31,21)]: p[x,y]=hx2('#2A1A10')   # nöjda ögon
        for x in range(19,30): p[x,34]=hx2('#5A2A1C')
        for x in range(21,28): p[x,35]=hx2('#FFFFFF')                                  # tänder, ingen mustasch
        for (x,y) in [(19,33),(29,33)]: p[x,y]=hx2('#5A2A1C')
    elif uttryck=='forvanad':
        for (cx) in (18,30):
            for (a,b) in [(0,0),(1,0),(0,1),(1,1),(0,2),(1,2)]: p[cx+a,19+b]=hx2('#2A1A10')
            p[cx,19]=hx2('#FFFFFF')
        for (x,y) in [(23,34),(24,34),(25,34),(23,35),(25,35),(23,36),(24,36),(25,36)]: p[x,y]=hx2('#5A2A1C')
        p[24,35]=hx2('#8A3A2E')
        for (x,y) in [(16,16),(17,15),(18,15),(30,15),(31,15),(32,16)]: p[x,y]=hx2('#7A5A3A')   # ögonbryn upp
    else:  # sur
        for (cx) in (18,30):
            p[cx,21]=hx2('#2A1A10'); p[cx+1,21]=hx2('#2A1A10')
        for (x,y) in [(16,18),(17,18),(18,19),(32,18),(31,18),(30,19)]: p[x,y]=hx2('#7A5A3A')
        for x in range(20,29): p[x,35]=hx2('#5A2A1C')
        p[20,34]=hx2('#5A2A1C'); p[28,34]=hx2('#5A2A1C')
    return im

# ---------- morgonen i sängen ----------
def morgon(bild):
    s=LD('/home/claude/hus/ut/foremal/sang.png')
    from importlib import util
    d=Duk(14,12); d.ellips(7,6.5,5.6,4.6,'hud2','ansikte',zbias=0.1)
    MAT['hud2']=['#0E2A5A','#1E5FA8','#2E8BD8','#5FB4E8','#A8DCF8']
    d=Duk(14,12); d.ellips(7,6.5,5.6,4.6,'hud2','ansikte',zbias=0.1); d.kontur(); huv=d.bild(); hp=huv.load()
    # vaken och skrattar: öppna glada ögon och stor mun
    for (x,y) in [(4,5),(5,4),(6,5),(8,5),(9,4),(10,5)]: hp[x,y]=hx2('#101C1C')
    for x in range(5,10): hp[x,8]=hx2('#0E2A5A')
    if bild==1:
        for x in range(6,9): hp[x,9]=hx2('#E8707A')
    s.alpha_composite(huv,(13,6))
    d=Duk(64,44); MAT['tacke']=['#1E2E5A','#2A4A8A','#3E66AE','#6A8ED0','#A8C4F0']
    d.ellips(33,31,27,10,'tacke','tacke',platt=0.7); d.kontur(); s.alpha_composite(d.bild())
    u=LD('/home/claude/unge2/ut/unge1_ga_vanster_01.png')
    s.alpha_composite(u,(22 if bild==0 else 20,4))
    p=s.load()
    if bild==1:                                               # tungan på hjältens näsa
        for (x,y) in [(21,13),(20,13),(20,14)]: p[x,y]=hx2('#E8707A')
    hj=LD('/home/claude/hus/ut/f4/hjalte_sang_02.png').crop((48,0,64,12)); s.alpha_composite(hj,(48,0))
    return s

# ---------- packlistans bildkort ----------
def kort_filt(farg):
    im=bild(48,48); p=im.load()
    pal={'rod':['#6A1A14','#A8302A','#D9443A','#F07A6A'],'bla':['#0A1838','#16306E','#2A4CA0','#5A7ACC']}[farg]
    for y in range(12,38):
        for x in range(6,42):
            c=pal[2]
            if (x-6)%9 in (0,1) or (y-12)%9 in (0,1): c=pal[1]
            if y<14: c=pal[3]
            if x in (6,41) or y in (12,37): c=pal[0]
            p[x,y]=hx2(c)
    for x in range(8,40,3):
        for y in (38,39,40): p[x,y]=hx2(pal[1])
    for y in range(26,38):                                    # nervikt hörn
        for x in range(42-(y-26),42): p[x,y]=hx2(pal[3])
    return im
def kort_bar():
    im=bild(48,48); p=im.load()
    for (cx,cy) in [(18,26),(28,24),(24,33),(32,32),(15,35)]:
        for y in range(-5,6):
            for x in range(-5,6):
                r=x*x+y*y
                if r<=25: p[cx+x,cy+y]=hx2('#1E2E8A' if r>16 else ('#3A5AD8' if x+y>-3 else '#7A9AF0'))
        p[cx-2,cy-2]=hx2('#E8F0FF')
    for (x,y) in [(24,12),(25,13),(26,14),(25,15),(24,16),(23,17),(22,18),(27,13),(29,14),(31,15)]: p[x,y]=hx2('#3E7634')
    return im
def kort_rep():
    im=bild(48,48); p=im.load()
    for t in range(0,720,3):
        a=math.radians(t); r=8+t/120
        x=int(24+r*math.cos(a)); y=int(26+r*0.6*math.sin(a))
        for dx in (0,1): p[x+dx,y]=hx2('#BE9260' if (t//9)%2 else '#8A6038')
    for y in range(26,44): p[38,y]=hx2('#9A6E40'); p[39,y]=hx2('#6A4626')
    return im
def kort_bil():
    im=bild(48,48); p=im.load()
    for y in range(22,34):
        for x in range(6,42):
            c='#D9443A' if y>25 else '#E86A5A'
            if y<28 and not (14<=x<=34): continue
            if x in (6,41) or y==33: c='#6A1A14'
            p[x,y]=hx2(c)
    for y in range(16,23):
        for x in range(14+(22-y),34-(22-y)):
            p[x,y]=hx2('#B8DCF4' if 16<y<22 else '#6A1A14')
    for cx in (14,34):
        for y in range(-4,5):
            for x in range(-4,5):
                if x*x+y*y<=16: p[cx+x,34+y]=hx2('#2A2E38' if x*x+y*y>4 else '#9AA0AA')
    return im
def kort_ost():
    im=bild(48,48); p=im.load()
    for y in range(18,38):
        for x in range(8,42):
            if y<26 and x>8+(26-y)*4: continue
            c='#F2C94A' if y>24 else '#F8E07A'
            if x==8 or y==37: c='#9A7A20'
            p[x,y]=hx2(c)
    for (cx,cy,r) in [(16,31,2),(28,30,3),(36,34,2),(22,35,1)]:
        for y in range(-r,r+1):
            for x in range(-r,r+1):
                if x*x+y*y<=r*r: p[cx+x,cy+y]=hx2('#C89A2A')
    return im
def kort_sko():
    im=bild(48,48); p=im.load()
    for y in range(18,36):
        for x in range(8,42):
            if y<26 and x>22: continue
            c='#7A522C' if y<33 else '#2E1C0E'
            if y==25 and x>22: c='#5A3A1E'
            p[x,y]=hx2(c)
    for y in range(26,33):
        for x in range(22,42):
            if (x-42)**2/400+(y-33)**2/49>1: p[x,y]=(0,0,0,0)
    for (x,y) in [(14,20),(17,21),(14,23),(17,24)]: p[x,y]=hx2('#F4F0E4')            # snörning
    return im
KORT={'filt_rod':kort_filt('rod'),'filt_bla':kort_filt('bla'),'filt':kort_filt('rod'),'bar':kort_bar(),
      'rep':kort_rep(),'bil':kort_bil(),'ost':kort_ost(),'sko':kort_sko()}

# ---------- sidovyn: in i skogen ----------
def sidovy():
    W,H=320,192; im=Image.new('RGBA',(W,H)); p=im.load(); rnd=random.Random(4)
    for y in range(H):
        for x in range(W):
            c='#9AD0F0' if y<60 else ('#B8E0F4' if y<96 else '#6FA34A')
            if y>=96 and y<100: c='#5A8E3A'
            if y>=150: c='#BE9A62' if y<170 else '#6FA34A'
            p[x,y]=hx2(c)
    MAT['lov2']=['#14301A','#1E4A24','#2E6A30','#4A8E3A','#78B456']
    d=Duk(W,H)
    for i,x in enumerate(range(150,340,22)):
        r=rnd.randint(18,26); d.ellips(x,100-r*0.5,r,r*0.9,'lov2','krona')
    d.kontur(); im.alpha_composite(d.bild())
    for x in range(150,318,22):
        for y in range(108,150):
            if p[x,y]!=hx2('#2E6A30'): p[x,y]=hx2('#4A3018'); p[x+1,y]=hx2('#6A4626')
    for (cx,cy) in [(40,24),(70,18),(240,30)]:                 # moln
        for y in range(-5,6):
            for x in range(-14,15):
                if (x/14)**2+(y/5)**2<=1: p[cx+x,cy+y]=hx2('#FFFFFF' if y<1 else '#E8F2FA')
    return im
def litet_luftskepp(peka=True):
    stor=luftskepp('stolt',0,skata='landar')
    sm=stor.resize((56,48),Image.NEAREST)
    return sm.transpose(Image.FLIP_LEFT_RIGHT)               # åt fel håll: bort från skogen

UT={}
UT.update({f'figurer/baronen/{k}.png':v for k,v in LUFT.items()})
UT.update({f'figurer/baronen/baronen_portratt_{u}.png':baron_portratt(u) for u in ('stolt','forvanad','sur')})
UT['figurer/hjalte/hjalte_sang_morgon_01.png']=morgon(0)
UT['figurer/hjalte/hjalte_sang_morgon_02.png']=morgon(1)
UT.update({f'bildkort/{k}.png':v for k,v in KORT.items()})
UT['sidovyer/in_i_skogen_bakgrund.png']=sidovy()
UT['sidovyer/in_i_skogen_luftskepp.png']=litet_luftskepp()
if __name__=='__main__':
    for k,v in UT.items():
        os.makedirs('ut/'+os.path.dirname(k),exist_ok=True); v.save('ut/'+k)
    # översikter
    L=list(LUFT.values()); a=Image.new('RGBA',(4*116,3*100),(154,208,240,255))
    for i,v in enumerate(L): a.alpha_composite(v,((i%4)*116,(i//4)*100))
    a.resize((a.width*2,a.height*2),Image.NEAREST).save('luftskepp_x2.png')
    b=Image.new('RGBA',(3*52+2*70+8*52,72),(244,236,215,255)); x=4
    for u in ('stolt','forvanad','sur'): b.alpha_composite(UT[f'figurer/baronen/baronen_portratt_{u}.png'],(x,4)); x+=52
    for k in ('figurer/hjalte/hjalte_sang_morgon_01.png','figurer/hjalte/hjalte_sang_morgon_02.png'): b.alpha_composite(UT[k],(x,4)); x+=70
    for v in KORT.values(): b.alpha_composite(v,(x,4)); x+=52
    b.resize((b.width*3,b.height*3),Image.NEAREST).save('ovrigt_x3.png')
    s=UT['sidovyer/in_i_skogen_bakgrund.png'].copy(); s.alpha_composite(UT['sidovyer/in_i_skogen_luftskepp.png'],(60,20))
    h=LD('/home/claude/hjalte2/ut/hjalte/hjalte_ga_hoger_02.png'); u=LD('/home/claude/unge2/ut/unge1_ga_hoger_02.png')
    s.alpha_composite(u,(96,144)); s.alpha_composite(h,(120,140))
    s.resize((960,576),Image.NEAREST).save('sidovy_x3.png')
