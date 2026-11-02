# Det han läser om i skogsbrynet och buskarna: fem stenar och buskarna i tre färger.
# Egenskapsregeln (stilguiden §4): hög = minst dubbel höjd vid samma bredd, rund mot spetsig syns i silhuetten,
# färgerna skiljer sig i ljushet, och bara en egenskap ändras mellan alternativen.
import math, os, random
from PIL import Image
exec(open('pix.py').read())
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
STEN=['#2A2C34','#565A64','#7E838C','#A4A9B0','#CDD1D6']
MOSSA=['#1E3A18','#3A6224','#5A8A30','#86B248','#B0D470']
def ton(ll): return 4 if ll>0.80 else 3 if ll>0.45 else 2 if ll>0.05 else 1

def sten(w,h,form,seed):
    """form: 'rund' (kupol), 'spetsig' (spets), 'kloss' (flat topp, rundade hörn)"""
    im=Image.new('RGBA',(w,h),(0,0,0,0)); px=im.load(); rnd=random.Random(seed)
    cx=w/2; inne={}
    for y in range(h):
        for x in range(w):
            u=(x+0.5-cx)/(w/2-1)            # -1..1 tvärs
            v=(y+0.5)/(h-1)                 # 0 uppe .. 1 nere
            if form=='rund':
                # ägg/kupol: halvellips upptill, rak nedtill
                top=0.5 if h>w else 0.9
                if v<top: ok=u*u+((top-v)/top)**2<=1
                else: ok=abs(u)<=1-0.15*((v-top)/(1-top))**2
                nx=u; ny=-(top-v)/top if v<top else 0.1
            elif form=='spetsig':
                half=0.18+0.82*min(1,v/0.85)      # smal spets upptill, bred fot
                ok=abs(u)<=half and v>=0.02
                nx=u/half*0.9; ny=-0.35
            else:  # kloss
                r=0.35 if h>w else 0.5
                ok=abs(u)<=1 and v>=0
                if abs(u)>1-r*w/h*0.6 and v<r:      # rundade övre hörn
                    du=(abs(u)-(1-r*w/h*0.6))/(r*w/h*0.6); dv=(r-v)/r
                    ok=du*du+dv*dv<=1
                nx=u; ny=-0.6 if v<0.22 else 0.05
            if not ok: continue
            if v>0.93: ny=0.4                       # foten i skugga
            nz=math.sqrt(max(0.05,1-min(1,nx*nx+ny*ny)))
            n=math.sqrt(nx*nx+ny*ny+nz*nz)
            ll=(nx*L[0]+ny*L[1]+nz*L[2])/n
            inne[(x,y)]=ton(ll)
    for (x,y),t in inne.items(): px[x,y]=hx2(STEN[t])
    # ovansidan (3/4): ett ljusare fält överst som visar att stenen syns snett uppifrån
    for (x,y),t in inne.items():
        if (x,y-1) not in inne or (x,y-2) not in inne:
            if t>=2: px[x,y]=hx2(STEN[min(4,t+1)])
    # sprickor och mossa i klungor
    pts=list(inne)
    for i in range(max(1,len(pts)//90)):
        x,y=rnd.choice(pts)
        for k in range(rnd.randint(2,4)):
            if (x,y) in inne: px[x,y]=hx2(STEN[1])
            x+=rnd.choice((-1,0,1)); y+=1
    toppar=[(x,y) for (x,y) in pts if (x,y-1) not in inne and x<cx+w*0.2]
    for (x,y) in toppar[::2]:
        for k,dy in enumerate((0,1)):
            if (x,y+dy) in inne and rnd.random()<0.8: px[x,y+dy]=hx2(MOSSA[3 if dy==0 else 2])
        if rnd.random()<0.3 and (x,y+2) in inne: px[x,y+2]=hx2(MOSSA[1])
    # kontur i stenens mörka färg
    for (x,y) in pts:
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            q=(x+dx,y+dy)
            if q not in inne and 0<=q[0]<w and 0<=q[1]<h: px[q]=hx2(STEN[0])
    return im

def busk(ramp,seed=4,bar=False):
    d=Duk(30,24)
    MAT['busk']=ramp
    for (cx,cy,r) in [(15,13,10),(7,15,6),(23,15,6),(10,8,6),(20,8,6),(15,6,6)]: d.ellips(cx,cy,r,r*0.85,'busk','busk')
    d.kontur(); im=d.bild(); rnd=random.Random(seed)
    # bladklungor: små ljusa tofsar och skuggstreck
    for i in range(16):
        x=rnd.randint(4,25); y=rnd.randint(4,19)
        if im.getpixel((x,y))[3] and im.getpixel((x,y))!=hx2(ramp[0]):
            im.putpixel((x,y),hx2(ramp[4] if y<11 else ramp[1]))
            if im.getpixel((x+1,y))[3] and im.getpixel((x+1,y))!=hx2(ramp[0]): im.putpixel((x+1,y),hx2(ramp[3] if y<11 else ramp[1]))
    if bar:
        for (x,y) in [(8,12),(14,9),(19,14),(23,11),(12,17),(17,18)]:
            im.putpixel((x,y),hx2('#3A5AD8')); im.putpixel((x+1,y),hx2('#2A3A9A')); im.putpixel((x,y-1),hx2('#B8CCFF')); im.putpixel((x+1,y-1),hx2('#3A5AD8'))
    return im

def kompassros():
    # syns på den rätta stenen vid rätt svar: inristad i stavens guld
    im=Image.new('RGBA',(9,9),(0,0,0,0)); G='#FFD95A'; M='#B8901E'
    for i in range(9): im.putpixel((4,i),hx2(G)); im.putpixel((i,4),hx2(G))
    for (x,y) in [(3,3),(5,3),(3,5),(5,5)]: im.putpixel((x,y),hx2(M))
    im.putpixel((4,0),hx2('#FFF2B8')); im.putpixel((4,4),hx2('#FFF2B8'))
    return im

GRON=['#0E2A14','#163E1E','#22562A','#347238','#4E9044']
GUL=['#6A5410','#B89A20','#E8C838','#F4DC64','#FBF0A8']
ROD=['#4A1010','#8A2420','#D8483A','#EC6A54','#F69A84']
BARB=['#14301A','#1E4A24','#2E6A30','#4A8E3A','#78B456']
STENAR={
 'hog_rund_sten':sten(22,32,'rund',1),
 'hog_spetsig_sten':sten(22,32,'spetsig',2),
 'lag_rund_sten':sten(22,15,'rund',3),
 'hog_sten':sten(22,32,'kloss',4),
 'lag_sten':sten(22,15,'kloss',5),
}
BUSKAR={'buske_gron':busk(GRON,4),'buske_gul':busk(GUL,4),'buske_rod':busk(ROD,4),'barbuske':busk(BARB,7,bar=True)}
if __name__=='__main__':
    os.makedirs('ut/foremal',exist_ok=True)
    for n,im in {**STENAR,**BUSKAR,'kompassros_sten':kompassros()}.items(): im.save(f'ut/foremal/{n}.png')
    # översikt: på gräs, och silhuettestet (svart)
    alla=list(STENAR.items())+list(BUSKAR.items())
    W_=sum(im.width+6 for _,im in alla)+6; H_=40
    ark=Image.new('RGBA',(W_,H_*2),(111,163,74,255)); x=6
    for n,im in alla:
        ark.alpha_composite(im,(x,H_-4-im.height))
        sil=Image.new('RGBA',im.size,(0,0,0,0)); sp=sil.load()
        for yy in range(im.height):
            for xx in range(im.width):
                if im.getpixel((xx,yy))[3]: sp[xx,yy]=(20,20,20,255)
        ark.paste((235,235,235,255),(x-3,H_,x+im.width+3,H_*2))
        ark.alpha_composite(sil,(x,2*H_-4-im.height)); x+=im.width+6
    ros=kompassros(); s=STENAR['hog_rund_sten'].copy(); s.alpha_composite(ros,(7,12))
    ark2=Image.new('RGBA',(W_+40,H_*2),(111,163,74,255)); ark2.alpha_composite(ark,(0,0)); ark2.alpha_composite(s,(W_+8,H_-4-s.height))
    ark2.resize((ark2.width*4,ark2.height*4),Image.NEAREST).save('ut/stenar_x4.png')
