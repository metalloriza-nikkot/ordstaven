# Liten pixelmotor: delar med 3D-liknande ljussättning (ljus uppe till vänster, lite framifrån),
# skuggning i 4 toner per material, selektiv kontur och handritade detaljer ovanpå.
from PIL import Image
import math
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
MAT={
 'oliv':['#2E3D10','#56661C','#80922A','#A3B53A','#CAD86A'],   # kontur, skugga, mitt, ljus, högdager
 'huvud':['#2E3D10','#6A7C22','#93A632','#B4C64A','#D8E47E'],
 'gra':['#3A3A48','#6E6E80','#9EA0AE','#C8CAD4','#EEEFF4'],
 'klubba':['#0E0E12','#1E1E24','#34343C','#55555F','#9A9AA8'],
 'bla':['#0E1A50','#1A3290','#2A52C8','#4F7AE8','#9AB6FF'],
}
L=(-0.55,-0.75,0.45); n=math.sqrt(sum(v*v for v in L)); L=tuple(v/n for v in L)
class Duk:
    def __init__(s,w=24,h=24):
        s.w,s.h=w,h; s.px={}   # (x,y)->(mat,ton) eller ('fast',hex)
        s.del_={}               # (x,y)->delnamn
    def ellips(s,cx,cy,rx,ry,mat,namn,toner=(1,2,3,4),zbias=0.0,klipp=None,platt=0.0):
        for y in range(s.h):
            for x in range(s.w):
                dx=(x+0.5-cx)/rx; dy=(y+0.5-cy)/ry
                d=dx*dx+dy*dy
                if d<=1.0:
                    if klipp and not klipp(x,y): continue
                    nz=math.sqrt(max(0,1-d)); nx,ny=dx,dy
                    ny=ny*(1-platt)-platt*0.6
                    ll=(nx*L[0]+ny*L[1]+nz*L[2]+zbias)
                    # kvantisera
                    if ll>0.80: t=toner[3]
                    elif ll>0.45: t=toner[2]
                    elif ll>0.05: t=toner[1]
                    else: t=toner[0]
                    s.px[(x,y)]=(mat,t); s.del_[(x,y)]=namn
    def satt(s,x,y,mat,t,namn=None):
        if 0<=x<s.w and 0<=y<s.h:
            s.px[(x,y)]=(mat,t)
            if namn: s.del_[(x,y)]=namn
    def fast(s,x,y,hexf,namn='detalj'):
        if 0<=x<s.w and 0<=y<s.h: s.px[(x,y)]=('fast',hexf); s.del_[(x,y)]=namn
    def kontur(s,undanta=()):
        # yttre kontur: genomskinlig pixel bredvid fylld -> materialets mörkaste.
        ny={}
        for (x,y),(m,t) in s.px.items():
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                q=(x+dx,y+dy)
                if q not in s.px and 0<=q[0]<s.w and 0<=q[1]<s.h and q not in ny:
                    mm=m if m in MAT else 'oliv'
                    ny[q]=(mm,0)
        # selektiv kontur: där ljuset träffar (uppe till vänster) blir konturen ett steg ljusare
        for q,(m,t) in ny.items():
            x,y=q
            lit=((x+1,y) in s.px and s.px[(x+1,y)][1]!=0 if s.px.get((x+1,y)) else False) or \
                ((x,y+1) in s.px and s.px.get((x,y+1),(0,0))[1]!=0)
            s.px[q]=(m,0)
    def inre_linje(s,namn_fram,namn_bak):
        # där en främre del möter en bakre: bakre delens pixel närmast blir skuggton
        for (x,y),nm in list(s.del_.items()):
            if nm==namn_bak:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    if s.del_.get((x+dx,y+dy))==namn_fram:
                        m,t=s.px[(x,y)]; s.px[(x,y)]=(m,max(0,min(t,1)-0) if t>1 else 0)
    def bild(s):
        im=Image.new('RGBA',(s.w,s.h),(0,0,0,0))
        for (x,y),(m,t) in s.px.items():
            c=hx(t) if m=='fast' else hx(MAT[m][t])
            im.putpixel((x,y),c+(255,))
        return im
def skugga(w=24,h=24,cx=12,cy=21,rx=8,ry=2):
    im=Image.new('RGBA',(w,h),(0,0,0,0))
    for y in range(h):
        for x in range(w):
            dx=(x+0.5-cx)/rx; dy=(y+0.5-cy)/ry
            if dx*dx+dy*dy<=1: im.putpixel((x,y),(20,30,10,110))
    return im
