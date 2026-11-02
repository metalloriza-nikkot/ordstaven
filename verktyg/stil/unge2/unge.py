exec(open('pix.py').read())
EYE='#101C1C'; W='#FFFFFF'; W2='#9FD3DC'; MUN='#3A2A12'; ROS='#E8909A'; NOS='#3E4E14'
def ogon(d,x,y,spegel=False):
    # 2x3 öga, stort och lodrätt, glimt uppe till vänster och en liten nere till höger
    for dy in range(3):
        for dx in range(2): d.fast(x+dx,y+dy,EYE,'oga')
    d.fast(x,y,W,'oga'); d.fast(x+1,y+2,W2,'oga')
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def borst(d,pts):
    for (x,y) in pts:
        d.satt(x,y,'gra',3,'rygg'); d.satt(x+1,y,'gra',2,'rygg'); d.satt(x,y-1,'gra',4,'rygg')
def ner(f=0):
    d=Duk()
    lyft={1:(0,-1),3:(-1,0)}.get(f,(0,0))  # vilken fot lyfts
    d.ellips(18.5,3.2,2.9,2.3,'klubba','klubba',toner=(1,2,3,4))
    for (x,y) in [(17,5),(17,6),(16,7)]: d.satt(x,y,'oliv',2,'svans'); d.satt(x+1,y,'oliv',1,'svans')
    d.ellips(12,13.5,9.6,5.2,'oliv','kropp')
    d.ellips(12,9.2,8.6,4.6,'gra','rygg',platt=0.5,zbias=-0.25)
    borst(d,[(5,6),(8,5),(11,4),(14,5),(17,6)])
    # framben + fötter
    for i,cx in enumerate((5.5,18.5)):
        up= (f==1 and i==0) or (f==3 and i==1)
        d.ellips(cx,17.6-(1 if up else 0),2.3,2.6,'oliv','ben')
        d.ellips(cx,19.9-(1 if up else 0),2.5,1.4,'bla','fot')
        y=20-(1 if up else 0)
        for tx in (-1,0,1): d.satt(int(cx)+tx,y+1,'bla',1,'fot') if False else None
    d.ellips(12,13.2,7.6,6.0,'huvud','huvud',zbias=0.05)
    d.ellips(12,16.6,3.2,1.8,'huvud','nos',toner=(2,3,3,4),zbias=0.2)
    skilj(d,'huvud','kropp'); skilj(d,'huvud','ben'); skilj(d,'rygg','kropp',ton=1)
    d.kontur()
    # detaljer
    ogon(d,7,12); ogon(d,15,12,True)
    
    for (x,y) in [(11,18),(12,18),(10,17),(13,17)]: d.fast(x,y,MUN)
    for (x,y) in [(6,15),(17,15)]: d.fast(x,y,ROS)
    # ränder på sidorna
    for (x,y) in [(3,11),(2,12),(21,11),(21,12),(3,15),(3,16),(20,15),(20,16)]:
        if d.px.get((x,y),('',0))[0]=='oliv': d.satt(x,y,'oliv',1)
    # tår
    for cx in (5,18):
        up=(f==1 and cx==5) or (f==3 and cx==18)
        y=21-(1 if up else 0)
        for tx in (-1,1): d.satt(cx+tx+ (1 if cx==5 else 0),y,'bla',4)
    return d.bild()
if __name__=='__main__':
    S=12
    im=ner(); sk=skugga(cx=12,cy=21.3,rx=9,ry=1.8)
    bg=Image.new('RGBA',(24,24),(104,160,72,255)); bg.alpha_composite(sk); bg.alpha_composite(im)
    bg.resize((24*S,24*S),Image.NEAREST).save('ner.png')

def hoger(f=0):
    d=Duk()
    # benens lägen: bortre (mörkare) bak, närmre bak, bortre fram, närmre fram
    ben=[(6.0,'b'),(8.8,'n'),(13.4,'b'),(16.4,'n')]
    lyft={1:(1,2),3:(0,3)}.get(f,())
    # svans och klubba
    d.ellips(2.7,5.4,2.4,2.0,'klubba','klubba')
    # bortre ben bakom kroppen
    for i,(cx,s_) in enumerate(ben):
        if s_!='b': continue
        up=i in lyft
        d.ellips(cx,17.6-up,1.6,2.4,'oliv','benb',toner=(0,1,1,2))
        d.ellips(cx+0.3,19.8-up,1.4,1.0,'bla','fotb',toner=(0,1,2,2))
    d.ellips(11.6,13.6,7.0,4.6,'oliv','kropp')
    for (x,y,t) in [(4,11,2),(3,10,3),(3,9,2),(2,8,3)]: d.satt(x,y,'oliv',t,'svans')
    d.ellips(10.8,10.4,6.8,3.6,'gra','rygg',platt=0.6,zbias=-0.2)
    borst(d,[(6,8),(8,7),(10,7),(12,7),(14,7),(16,8)])
    for i,(cx,s_) in enumerate(ben):
        if s_!='n': continue
        up=i in lyft
        d.ellips(cx,17.8-up,1.8,2.4,'oliv','ben')
        d.ellips(cx+0.4,20.1-up,1.6,1.1,'bla','fot')
    d.ellips(17.6,12.0,5.4,4.9,'huvud','huvud',zbias=0.05)
    d.ellips(21.0,13.8,2.4,1.6,'huvud','nos',toner=(2,3,3,4),zbias=0.2)
    d.satt(23,14,'huvud',2,'nos')
    skilj(d,'huvud','kropp'); skilj(d,'huvud','rygg',ton=1); skilj(d,'rygg','kropp',ton=1); skilj(d,'ben','kropp',ton=1)
    d.kontur()
    ogon(d,18,11)
    d.fast(20,15,MUN); d.fast(21,15,MUN); d.fast(22,15,MUN)
    d.fast(17,14,ROS)
    for (x,y) in [(6,13),(6,14),(9,14),(9,15),(12,14),(12,15)]:
        if d.px.get((x,y),('',0))[0]=='oliv': d.satt(x,y,'oliv',1)
    return d.bild()

def upp(f=0):
    d=Duk()
    lyft={1:0,3:1}.get(f,None)
    d.ellips(12,6.0,5.6,4.2,'huvud','huvud',zbias=0.0)
    d.ellips(12,14.6,9.6,4.6,'oliv','kropp')
    for i,cx in enumerate((5.5,18.5)):
        up=(lyft==i)
        d.ellips(cx,17.8-up,2.3,2.4,'oliv','ben')
        d.ellips(cx,19.9-up,2.4,1.3,'bla','fot')
    d.ellips(12,11.0,8.6,5.2,'gra','rygg',platt=0.5,zbias=-0.3)
    borst(d,[(5,8),(8,7),(11,6),(14,7),(17,8),(9,11),(14,11)])
    for (x,y) in [(12,16),(12,17),(11,17)]: d.satt(x,y,'oliv',2,'svans')
    d.ellips(12,19.6,3.0,2.2,'klubba','klubba')
    skilj(d,'rygg','huvud',ton=1); skilj(d,'rygg','kropp',ton=1); skilj(d,'klubba','rygg',ton=1)
    d.kontur()
    for (x,y) in [(3,14),(3,15),(20,14),(20,15)]:
        if d.px.get((x,y),('',0))[0]=='oliv': d.satt(x,y,'oliv',1)
    return d.bild()

def visa(namn='alla.png'):
    S=10; GR=(104,160,72,255)
    v=[ner(),hoger(),upp(),hoger().transpose(Image.FLIP_LEFT_RIGHT)]
    out=Image.new('RGBA',(4*(24*S+10),24*S),(255,255,255,255))
    for i,im in enumerate(v):
        bg=Image.new('RGBA',(24,24),GR); bg.alpha_composite(skugga(cx=12,cy=21.3,rx=9,ry=1.8)); bg.alpha_composite(im)
        out.paste(bg.resize((24*S,24*S),Image.NEAREST),(i*(24*S+10),0))
    out.save(namn)
visa()
