from PIL import Image
import math, random
def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
GULD=['#7A5A10','#C8962E','#FFD95A','#FFF0A8','#FFFFFF']
BLAD=['#1E4A1E','#2E6E2E','#4E9A3E','#7EC25A','#B8E08A']
HOST=['#5A3A10','#A0601E','#D89A2E','#F0C85A','#F8E8A0']   # gulnande löv i lövhögen
BAR=['#141E50','#2E4AB0','#4A72E0','#9AB6FF']
SVART=['#08090C','#23262D','#3A404A']; VITT=['#B4BCC6','#F2F3F0','#FFFFFF']
def ny(w,h): return Image.new('RGBA',(w,h),(0,0,0,0))
def p(im,x,y,c):
    if 0<=x<im.width and 0<=y<im.height: im.putpixel((int(x),int(y)),hx(c))
def gnista(im,x,y,r=1,c=GULD):
    p(im,x,y,c[4])
    for d in range(1,r+1):
        for (a,b) in ((d,0),(-d,0),(0,d),(0,-d)): p(im,x+a,y+b,c[3] if d==1 else c[2])
def blad(im,x,y,col,vriden=False):
    # litet blad, 3 px med ljus och mörk sida
    if vriden: pts=[(0,0,3),(1,1,2),(0,1,1)]
    else: pts=[(0,0,3),(1,0,2),(1,1,1)]
    for a,b,t in pts: p(im,x+a,y+b,col[t])
# ---- SVÄRD: svärdet av guld växer ur stavens ände (32 x 32, staven pekar uppåt från botten mitt) ----
def klinga(im,bx,by,langd,bredd=3):
    # klinga uppåt från (bx,by)
    for i in range(langd):
        y=by-i
        p(im,bx-1,y,GULD[3]); p(im,bx,y,GULD[4] if i%3==0 else GULD[3]); p(im,bx+1,y,GULD[2])
        p(im,bx-2,y,GULD[1]); p(im,bx+2,y,GULD[0])
    # spets
    p(im,bx-1,by-langd,GULD[2]); p(im,bx,by-langd,GULD[4]); p(im,bx+1,by-langd,GULD[1]); p(im,bx,by-langd-1,GULD[3])
    # parerstång
    for x in range(bx-4,bx+5): p(im,x,by+1,GULD[2] if abs(x-bx)<3 else GULD[1])
    for x in range(bx-4,bx+5): p(im,x,by+2,GULD[0])
def svard():
    F=[]
    a=ny(32,32); gnista(a,16,26,2); F.append(a)
    b=ny(32,32); klinga(b,16,26,7); gnista(b,16,18,1); F.append(b)
    c=ny(32,32); klinga(c,16,26,16); gnista(c,13,8,1); gnista(c,19,14,1); F.append(c)
    # svepet: en båge av guld från vänster upp till höger ned
    d=ny(32,32); klinga(d,16,26,16)
    for t in range(0,100,4):
        ang=math.radians(200+t*1.4); r=14
        x=16+r*math.cos(ang); y=18+r*math.sin(ang)
        p(d,x,y,GULD[3] if t%8 else GULD[4]); p(d,x,y+1,GULD[2])
    F.append(d)
    e=ny(32,32)
    random.seed(4)
    for i in range(7): gnista(e,random.randint(6,26),random.randint(4,26),1)
    F.append(e)
    return F
def lilla_svardet():
    F=[]
    for k in range(2):
        im=ny(16,16); bx=8+(1 if k else -1)
        for i in range(4): p(im,bx-1,12-i,GULD[3]); p(im,bx,12-i,GULD[4] if i==0 else GULD[2])
        p(im,bx,7,GULD[3]); p(im,bx-1,8,GULD[2])
        for x in range(bx-2,bx+2): p(im,x,13,GULD[1])
        # små kittelstreck
        for (a,b) in ([(3,5),(12,4),(13,9)] if k else [(2,8),(4,3),(12,6)]): p(im,a,b,GULD[3])
        F.append(im)
    return F
def plopp(lov=BLAD,storlek=16,antal=6,med_bar=True):
    F=[]; c=storlek//2
    random.seed(7)
    rikt=[(math.cos(math.radians(a)),math.sin(math.radians(a))) for a in range(200,341,int(140/max(1,antal-1)))]
    for k,r in enumerate((2,4,6)):
        im=ny(storlek,storlek)
        for i,(dx,dy) in enumerate(rikt):
            x=c+dx*r; y=c+2+dy*r+(k*k*0.6 if k==2 else 0)
            blad(im,x,y,lov,vriden=(i+k)%2==0)
        if k==0:
            for (a,b) in [(c-1,c+3),(c,c+2),(c+1,c+3)]: p(im,a,b,lov[4])
        if med_bar and k>=1:
            by=c-1-(k*2)
            p(im,c,by,BAR[2]); p(im,c+1,by,BAR[1]); p(im,c,by+1,BAR[1]); p(im,c+1,by+1,BAR[0]); p(im,c,by,BAR[3])
            p(im,c,by-1,BLAD[2])
        F.append(im)
    return F
def lov_yr():
    F=[]; random.seed(11)
    bas=[(random.uniform(0,6.28),random.uniform(0.6,1.0),random.choice([BLAD,HOST,HOST])) for _ in range(9)]
    for k,r in enumerate((3,7,10)):
        im=ny(24,24)
        for i,(a,f,col) in enumerate(bas):
            x=12+math.cos(a+k*0.5)*r*f; y=13+math.sin(a+k*0.5)*r*f*0.7-(k*1.5)+ (k==2)*2
            blad(im,x,y,col,vriden=(i+k)%2==0)
        F.append(im)
    return F
def fjadrar_yr():
    F=[]; random.seed(3)
    bas=[(random.uniform(0,6.28),random.choice([SVART,VITT])) for _ in range(5)]
    for k,r in enumerate((2,4,6)):
        im=ny(16,16)
        for i,(a,col) in enumerate(bas):
            x=8+math.cos(a)*r; y=6+math.sin(a)*r*0.6+k*2
            p(im,x,y,col[2]); p(im,x+1,y+(1 if (i+k)%2 else 0),col[1]); p(im,x+2,y+1,col[0])
        F.append(im)
    return F
def glimt():
    F=[]
    a=ny(8,8); p(a,3,3,'#FFFFFF'); p(a,3,2,'#F2F4F6'); p(a,3,4,'#F2F4F6'); p(a,2,3,'#F2F4F6'); p(a,4,3,'#F2F4F6'); F.append(a)
    b=ny(8,8); p(b,3,3,'#FFFFFF')
    for d in (1,2): 
        for (x,y) in ((3+d,3),(3-d,3),(3,3+d),(3,3-d)): p(b,x,y,'#F2F4F6' if d==1 else '#C8D0DA')
    p(b,2,2,'#DCE2E8'); p(b,4,4,'#DCE2E8'); p(b,2,4,'#DCE2E8'); p(b,4,2,'#DCE2E8'); F.append(b)
    return F
def guldhorn():
    F=[]
    for k in (0,1):
        im=ny(20,20); o=k
        for (cx,cy,sx,sy) in [(o,o,1,1),(19-o,o,-1,1),(o,19-o,1,-1),(19-o,19-o,-1,-1)]:
            for i in range(4):
                p(im,cx+sx*i,cy,GULD[2] if i else GULD[3]); p(im,cx,cy+sy*i,GULD[2] if i else GULD[3])
            p(im,cx+sx*1,cy+sy*1,GULD[0])
        F.append(im)
    return F
ALLA={'svard':svard(),'lilla_svardet':lilla_svardet(),'plopp':plopp(),'lov_yr':lov_yr(),'fjadrar_yr':fjadrar_yr(),'glimt':glimt(),'guldhorn':guldhorn()}
if __name__=='__main__':
    from PIL import ImageDraw, ImageFont
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
    GR=(104,160,72,255); S=6
    out=Image.new('RGBA',(1150,1300),(255,255,255,255)); d=ImageDraw.Draw(out); y=8
    for k,fr in ALLA.items():
        d.text((8,y),k,fill=(0,0,0),font=f); y+=20; x=8; h=0
        for im in fr:
            b=Image.new('RGBA',im.size,GR); b.alpha_composite(im); b=b.resize((im.width*S,im.height*S),Image.NEAREST); out.paste(b,(x,y)); x+=b.width+8; h=max(h,b.height)
        y+=h+10
    out.crop((0,0,1150,y)).save('efx1.png')
