# Gläntans föremål och omgivningens småsaker som egna bilder. Föremålens kod kommer från stilprovet (prov/glanta.py).
import random, math, os
from PIL import Image
exec(open('pix.py').read())
src=open('../prov/glanta.py').read()
exec(src[src.index('MAT.update'):src.index('img=Image.new')])
exec(src[src.index('def trad(typ):'):src.index('OBJ=[]')])
random.seed(26)

def apans_trad():
    # ett eget träd, så att det aldrig förväxlas med det stora gamla trädet vid kullen:
    # mellangrön rund krona, ljusare stam och en lång gren åt höger där nätet hänger
    d=Duk(72,72)
    d.ellips(24,56,6,12,'barkung','stam')
    for (cx,cy,rx,ry) in [(14,62,5,3),(34,62,5,3)]: d.ellips(cx,cy,rx,ry,'barkung','rot')
    for (cx,cy,r) in [(24,24,20),(12,30,11),(36,30,11),(24,12,12),(24,38,13)]: d.ellips(cx,cy,r,r*0.85,'lov','krona')
    d.kontur(); im=d.bild()
    for x in range(34,70):                       # grenen
        y=44-(x-34)//9
        for k,c in enumerate(['#3A2A18','#A8885C','#8A6C46','#6A5032']): im.putpixel((x,y+k-1),hx2(c))
    for (x,y) in [(40,6),(52,4)]: pass
    return im

def trappa_vast():
    # huggen i klippan väster om kullen, stegen stiger österut (30 x 26, som kartans objekt `trappa`)
    im=Image.new('RGBA',(30,26),(0,0,0,0))
    for y in range(26):
        for x in range(30):
            step=x//6
            c=['#6E737C','#7E838C','#8E949E','#A4A9B0','#B8BDC4'][min(4,step)]
            if x%6==0: c='#3E4148'
            if y in (0,25): c='#3E4148'
            im.putpixel((x,y),hx2(c))
    return im

def smafagel(bild):
    # brun och beige, aldrig svart-vit som Herr Skata. 0-1 sitter och pickar, 2-3 flyger
    im=Image.new('RGBA',(8,7),(0,0,0,0)); p=lambda x,y,c: im.putpixel((x,y),hx2(c))
    BR,LJ,MK,NB='#7A5236','#D8BC90','#3E2A1A','#E8A040'
    if bild<2:
        hy=1 if bild==0 else 3
        for (x,y) in [(2,3),(3,3),(4,3),(2,4),(3,4),(4,4),(5,4),(1,4),(3,5),(4,5)]: p(x,y,BR)
        for (x,y) in [(3,4),(4,4),(3,5)]: p(x,y,LJ)
        p(5,hy,BR); p(6,hy,BR); p(5,hy+1,BR); p(6,hy+1,LJ); p(6,hy,MK); p(7,hy+1,NB)
        p(3,6,MK); p(4,6,MK); p(0,3,MK); p(1,3,BR)
    else:
        upp=bild==2
        for (x,y) in [(2,3),(3,3),(4,3),(5,3),(3,4),(4,4)]: p(x,y,BR)
        p(3,4,LJ); p(6,3,BR); p(6,2,MK); p(7,3,NB); p(1,3,MK)
        vy=[0,1,2] if upp else [4,5,6]
        for i,y in enumerate(vy): p(3+(i if upp else 0),y,BR); p(4,y,BR if i<2 else MK)
    return im

def lov(farg,bild):
    pal={'gron':['#1E4A24','#4A8E3A','#78B456'],'gron2':['#2E6228','#74B44A','#A8D870'],'gulgron':['#5A6A1E','#A8B43A','#D8DC6A']}[farg]
    im=Image.new('RGBA',(5,4),(0,0,0,0)); p=lambda x,y,c: im.putpixel((x,y),hx2(c))
    if bild==0:
        for (x,y) in [(1,1),(2,1),(3,1),(2,2),(3,2)]: p(x,y,pal[1])
        p(1,1,pal[2]); p(0,2,pal[0]); p(4,1,pal[0]); p(1,2,pal[0])
    else:
        for (x,y) in [(2,0),(2,1),(2,2),(1,1),(3,2)]: p(x,y,pal[1])
        p(2,0,pal[2]); p(2,3,pal[0])
    return im

def fjaril(bild):
    im=Image.new('RGBA',(7,6),(0,0,0,0)); p=lambda x,y,c: im.putpixel((x,y),hx2(c))
    if bild==0:
        for (x,y,c) in [(0,1,'#3A7AD8'),(1,0,'#8FB8F2'),(1,1,'#8FB8F2'),(2,1,'#F2A0C0'),(4,1,'#F2A0C0'),(5,0,'#8FB8F2'),(5,1,'#8FB8F2'),(6,1,'#3A7AD8'),(1,2,'#8FB8F2'),(5,2,'#8FB8F2')]: p(x,y,c)
    else:
        for (x,y,c) in [(1,2,'#3A7AD8'),(2,2,'#8FB8F2'),(2,1,'#F2A0C0'),(4,1,'#F2A0C0'),(4,2,'#8FB8F2'),(5,2,'#3A7AD8')]: p(x,y,c)
    p(3,2,'#2A2F14'); p(3,3,'#2A2F14')
    return im

def bro_bred():
    # 72 bred, så att den når över hela bäcken (568-640) med fäste på stranden
    im=Image.new('RGBA',(72,22),(0,0,0,0))
    for x in range(72):
        for y in range(3,19):
            c=['#BE9260','#9A6E40','#7A522C'][0 if y<8 else (1 if y<15 else 2)]
            if x%7==0: c='#5A3A1E'
            im.putpixel((x,y),hx2(c))
        im.putpixel((x,2),hx2('#2E1C0E')); im.putpixel((x,19),hx2('#2E1C0E'))
        if x%14==3:
            for y in range(0,22): im.putpixel((x,y),hx2('#5A3A1E'))
    for y in range(3,19): im.putpixel((0,y),hx2('#2E1C0E'))
    return im
FOREMAL={
 'trad_stort_ungt':trad('stort_ungt'),
 'trad_stort_gammalt':trad('stort_gammalt'),
 'trad_litet_gammalt':trad('litet_gammalt'),
 'apans_trad':apans_trad(),
 'apans_bo':bo(),
 'fossil':fossil(),
 'lovhog':lovhog(),
 'last_lada':lada(),
 'rothal':rothal(),
 'baronens_lapp':lapp_orange(),
 'skylt_farfar':skylt(True,16,18),
 'tavla_bron':skylt(False,18,16),
 'buske':buske(),
 'stege':stege(),
 'bro':bro_bred(),
 'trad_rida':trad('rida'),
 'trappa_vast':trappa_vast(),
}
OMGIVNING={}
for b,n in enumerate(['fagel_sitta_01','fagel_sitta_02','fagel_flyga_01','fagel_flyga_02']): OMGIVNING[n]=smafagel(b)
for f in ('gron','gron2','gulgron'):
    for b in (0,1): OMGIVNING[f'lov_{f}_{b+1:02d}']=lov(f,b)
for b in (0,1): OMGIVNING[f'fjaril_{b+1:02d}']=fjaril(b)
if __name__=='__main__':
    os.makedirs('ut/foremal',exist_ok=True); os.makedirs('ut/omgivning',exist_ok=True)
    for n,im in FOREMAL.items(): im.save(f'ut/foremal/{n}.png')
    for n,im in OMGIVNING.items(): im.save(f'ut/omgivning/{n}.png')
    # översiktsark
    alla=list(FOREMAL.items())+list(OMGIVNING.items())
    W_=sum(im.width for _,im in alla)+4*len(alla); H_=max(im.height for _,im in alla)
    ark=Image.new('RGBA',(W_,H_),(111,163,74,255)); x=0
    for n,im in alla: ark.alpha_composite(im,(x,H_-im.height)); x+=im.width+4
    ark.resize((W_*3,H_*3),Image.NEAREST).save('ut/foremal_x3.png')
    print(list(OMGIVNING))
