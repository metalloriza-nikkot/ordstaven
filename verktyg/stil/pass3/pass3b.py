# Pass 3, det sista innan pass 3 spelas (12-uppdrag 2026-11-03, Stil 1, beslut 30.1 och 31.2):
# - luftskepp_laser_skyltarna (+ _talar): baronen utan hjälm lutar sig ut och läser skyltarna med kikaren åt fel håll
# - luftskepp_flyger_fel_01–02: luftskeppet styr iväg mot SKOLAN, baronen pekar stolt framåt, Herr Skata tittar bakåt
# - luftskepp_ser_kartan: kikaren vänd ned mot kartbiten, och ögonen blir stora
# - hjalte_kartbit_upp_01: hjälten håller upp kartbit 1 mot luftskeppet (32 x 40, som svinga och trolla)
# - farfar_portratt_<glad|fundersam>_radio: Farfars ansikte med en liten radio i nedre högra hörnet (i stället för emoji)
import os
exec(open('/home/claude/pass3/pass3.py').read().rsplit("UT={}",1)[0])
exec(open('/home/claude/hjalte2/hjalte.py').read().rsplit("if __name__",1)[0].replace("exec(open('pix.py').read())",""))
MAT.update({'ballong':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],'gondol':['#2E1C0E','#5A3A1E','#7A522C','#9A6E40','#BE9260'],
 'mass':['#4A3A10','#8A6A20','#C8A040','#E8C868','#FFF0B0'],'jacka':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],
 'hud':['#0E2A5A','#1E5FA8','#2E8BD8','#5FB4E8','#A8DCF8'],'bhud':['#6A3A28','#D9967A','#F2C6A2','#F8DCC0','#FFF0E0']})
FI='/home/claude/farfar/ut/'

def kikare_ned(fel=True):
    """Kikaren lodrätt: ögat upptill. Fel: den breda änden mot ögat."""
    return kikare(fel).rotate(-90,expand=True)              # 8 x 14, x 0 hamnar upptill

def hjassa(bo):
    """Baronens överkropp utan tropikhjälm (den ligger i gräset), med kal hjässa."""
    bo=bo.copy(); bp=bo.load()
    for y in range(0,7):
        for x in range(24):
            if bp[x,y][3]: bp[x,y]=(0,0,0,0)
    d=Duk(24,10); d.ellips(12,7.5,6.3,5.0,'bhud','hjassa',zbias=0.1,klipp=lambda x,y: y<8); d.kontur(); bo.alpha_composite(d.bild().crop((0,0,24,8)),(0,0))
    return bo

def skata_pa_kanten(im,x,y,vand=False,titta=True):
    s=SK_TITTA if titta else SK_SITTA
    im.alpha_composite(s.transpose(Image.FLIP_LEFT_RIGHT) if vand else s,(x,y))

def laser_skyltarna(mun=False):
    """Baronen har trasslat sig loss, lutar sig ut över gondolens kant och tittar ned på skyltarna genom kikaren,
    åt fel håll (den breda änden mot ögat). Utan hjälm. Herr Skata sitter på kanten och tittar."""
    im=bild(112,96)
    im.alpha_composite(ballong(0),(4,0))
    p=im.load()
    for (x0,x1) in [(36,40),(76,72)]:
        for y in range(38,62):
            x=int(x0+(x1-x0)*(y-38)/24); p[x,y]=hx2('#5A4A30')
    g=gondol(); im.alpha_composite(g,(34,60))
    st=repstege(False); im.alpha_composite(st,(68,66))
    bx,by=42,50                                              # framför kanten: han lutar sig ut
    bo=hjassa(baron_overkropp(5)); im.alpha_composite(bo,(bx,by))
    k=kikare_ned(True); im.alpha_composite(k,(bx+13,by+8))  # den breda änden mot högra ögat, pekar ned
    p=im.load()
    for (x,y) in [(bx+12,by+14),(bx+12,by+15),(bx+21,by+14),(bx+21,by+15)]: p[x,y]=hx2('#F2C6A2')   # händerna om röret
    if mun:
        for (x,y) in [(bx+8,by+12),(bx+9,by+12),(bx+8,by+13),(bx+9,by+13)]: p[x,y]=hx2('#5A2A1C')
        p[bx+9,by+13]=hx2('#8A3A2E')
    skata_pa_kanten(im,66,49,vand=False,titta=True)          # Herr Skata på kanten, huvudet på sned
    return im

def flyger_fel(prop=0):
    """Han styr mot SKOLAN. Baronen pekar stolt framåt (åt höger, i färdriktningen), utan hjälm.
    Herr Skata sitter på kanten och tittar bakåt, åt andra hållet."""
    im=bild(112,96)
    im.alpha_composite(ballong(prop),(4,0))
    p=im.load()
    for (x0,x1) in [(36,40),(76,72)]:
        for y in range(38,62):
            x=int(x0+(x1-x0)*(y-38)/24); p[x,y]=hx2('#5A4A30')
    bx,by=44,40
    bo=hjassa(baron_overkropp(5)); im.alpha_composite(bo,(bx,by))
    p=im.load()
    # höger arm rakt fram (pekar), i jackans orange med en hand
    for x in range(bx+20,bx+30):
        p[x,by+14]=hx2('#F3A462'); p[x,by+15]=hx2('#E8823A'); p[x,by+16]=hx2('#B85E22')
    for (x,y) in [(bx+30,by+14),(bx+31,by+14),(bx+30,by+15),(bx+31,by+15),(bx+32,by+15),(bx+30,by+16)]: p[x,y]=hx2('#F2C6A2')
    p[bx+32,by+14]=hx2('#D9967A')
    for x in range(bx+9,bx+15): p[x,by+12]=hx2('#5A2A1C')     # stolt leende
    for x in range(bx+10,bx+14): p[x,by+13]=hx2('#FFFFFF')
    g=gondol(); im.alpha_composite(g,(34,60))
    st=repstege(False); im.alpha_composite(st,(68,66))
    skata_pa_kanten(im,34,49,vand=True,titta=True)           # Herr Skata vid bakre kanten, tittar bakåt
    return im

def ser_kartan():
    """Kikaren rätt vänd och riktad ned mot hjälten, och ögat blir stort (han får syn på kartbiten). Herr Skata på hjälmen."""
    im=luftskepp('stolt',0,skata='landar')
    bx,by=44,40
    k=kikare_ned(False); im.alpha_composite(k,(bx+11,by+8))  # den smala änden mot högra ögat, den breda ned mot hjälten
    p=im.load()
    for (a,c) in [(0,0),(1,0),(0,1),(1,1),(-1,0),(-1,1)]: p[bx+9+a,by+8+c]=hx2('#2A1A10')   # vänster öga stort
    p[bx+8,by+8]=hx2('#FFFFFF')
    for (x,y) in [(bx+9,by+12),(bx+10,by+12),(bx+9,by+13),(bx+10,by+13)]: p[x,y]=hx2('#5A2A1C')  # munnen ett O
    p[bx+10,by+13]=hx2('#8A3A2E')
    for (x,y) in [(bx+10,by+14),(bx+19,by+14)]: p[x,y]=hx2('#F2C6A2')
    return im

def hjalte_kartbit_upp():
    """Hjälten bakifrån håller upp kartbit 1 med båda händerna ovanför huvudet, så att baronen ser den. 32 x 40:
    hjälten står som i svinga och trolla (8 åt höger och 16 ned). Vi ser kartans baksida: gammalt papper där
    bläcket lyser igenom. Huden är hjälte A:s och palettbyts som i de andra bilderna."""
    ox,oy=8,16
    im=bild(32,40); p=im.load()
    PAP=['#5A4A30','#B8A57A','#E6D6A8','#F2E8C8']
    for y in range(6,17):
        for x in range(7,25):
            if (x,y) in [(7,6),(24,6),(7,16),(24,16),(8,6),(24,7),(7,15),(23,16)]: continue
            kant=(x in (7,24)) or (y in (6,16))
            p[x,y]=hx2(PAP[0] if kant else (PAP[3] if y<9 else PAP[2]))
    for (x,y) in [(11,10),(12,10),(13,11),(17,9),(18,10),(19,10),(20,12),(14,13),(15,13),(19,14)]: p[x,y]=hx2(PAP[1])   # bläcket lyser igenom
    for (x,y) in [(10,7),(15,6),(21,6),(24,11),(7,12)]: p[x,y]=(0,0,0,0)                                    # rivna kanter
    d=Duk(32,40)
    for i,cx in enumerate((6.0,10.0)):
        d.ellips(ox+cx,oy+19.6,1.5,2.2,'hud','ben'); d.ellips(ox+cx,oy+21.9,1.9,1.2,'sko','sko')
    d.ellips(ox+8,oy+15.8,4.2,2.9,'drakt','kropp')
    for cx in (1.0,15.0): d.ellips(ox+cx,oy+4.5,1.3,6.5,'hud','arm')          # armarna upp längs hjälmen
    d.ellips(ox+8,oy+7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    skilj(d,'hjalm','kropp',ton=1); skilj(d,'hjalm','arm',ton=1)
    for x in range(ox+5,ox+11):
        if d.px.get((x,oy+18),('',0))[0]=='drakt': d.satt(x,oy+18,'drakt',4)
    d.kontur()
    for x in range(ox+4,ox+12):
        if d.px.get((x,oy+12),('',0))[0]=='hjalm': d.satt(x,oy+12,'hjalm',1)
    im.alpha_composite(d.bild()); p=im.load()
    for (x,y) in [(8,13),(9,13),(8,14),(9,14),(22,13),(23,13),(22,14),(23,14)]: p[x,y]=hx2('#5FB4E8')    # händerna om papperets kanter
    for (x,y) in [(8,15),(9,15),(22,15),(23,15)]: p[x,y]=hx2('#2E8BD8')
    return im

def radio_marke():
    """En liten radio, 15 x 13: trälåda, rund högtalare med galler i mässing, två rattar. Samma radio som i köket."""
    d=Duk(15,13)
    im=bild(15,13); p=im.load(); G=MAT['gondol']
    for y in range(1,13):
        for x in range(15):
            c=G[3] if y<3 else G[2]
            if x in (0,14) or y in (1,12): c=G[0]
            if y==2 and 0<x<14: c=G[4]
            p[x,y]=hx2(c)
    for x in range(3,12): p[x,0]=hx2(G[0])                      # rundad ovansida
    for x in range(4,11): p[x,1]=hx2(G[3])
    for y in range(4,11):                                         # högtalaren
        for x in range(2,9):
            r=(x-5)**2+(y-7)**2
            if r<=10: p[x,y]=hx2('#8A6A20' if r>6 else ('#4A3A10' if (x+y)%2 else '#C8A040'))
    for (x,y) in [(11,5),(11,9)]:                                 # rattarna
        p[x,y]=hx2('#E8C868'); p[x+1,y]=hx2('#C8A040'); p[x,y+1]=hx2('#8A6A20'); p[x+1,y+1]=hx2('#4A3A10')
    return im

def portratt_radio(namn):
    im=LD(FI+f'farfar_portratt_{namn}.png').copy()
    r=radio_marke()
    im.alpha_composite(r,(48-15-1,48-13-1))
    return im

UT={
 'figurer/baronen/luftskepp_laser_skyltarna.png':laser_skyltarna(False),
 'figurer/baronen/luftskepp_laser_skyltarna_talar.png':laser_skyltarna(True),
 'figurer/baronen/luftskepp_flyger_fel_01.png':flyger_fel(0),
 'figurer/baronen/luftskepp_flyger_fel_02.png':flyger_fel(1),
 'figurer/baronen/luftskepp_ser_kartan.png':ser_kartan(),
 'figurer/hjalte/hjalte_kartbit_upp_01.png':hjalte_kartbit_upp(),
 'figurer/farfar/farfar_portratt_glad_radio.png':portratt_radio('glad'),
 'figurer/farfar/farfar_portratt_fundersam_radio.png':portratt_radio('fundersam'),
}
if __name__=='__main__':
    for k,v in UT.items():
        os.makedirs('ut/'+os.path.dirname(k),exist_ok=True); v.save('ut/'+k)
    L=[UT[k] for k in UT if 'luftskepp' in k]; a=Image.new('RGBA',(len(L)*116,100),(154,208,240,255))
    for i,v in enumerate(L): a.alpha_composite(v,(i*116,2))
    a.resize((a.width*2,a.height*2),Image.NEAREST).save('pass3b_luftskepp_x2.png')
    b=Image.new('RGBA',(36+2*52,52),(244,236,215,255))
    g=Image.new('RGBA',(32,40),(111,163,74,255)); g.alpha_composite(UT['figurer/hjalte/hjalte_kartbit_upp_01.png']); b.alpha_composite(g,(2,6))
    b.alpha_composite(UT['figurer/farfar/farfar_portratt_glad_radio.png'],(36,2)); b.alpha_composite(UT['figurer/farfar/farfar_portratt_fundersam_radio.png'],(88,2))
    b.resize((b.width*5,b.height*5),Image.NEAREST).save('pass3b_ovrigt_x5.png')
