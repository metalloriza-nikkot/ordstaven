exec(open('pix.py').read())
EYE='#101C1C'; W='#FFFFFF'; W2='#9FD3DC'; MUN='#3A2A12'; ROS='#E8909A'; TUNGA='#E8707A'; MONSTER='#A6E3CF'; MONSTER2='#E8FFF6'
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def borst(d,pts):
    for (x,y) in pts:
        d.satt(x,y,'gra',3,'rygg'); d.satt(x+1,y,'gra',2,'rygg'); d.satt(x,y-1,'gra',4,'rygg')
def oga(d,x,y,typ='oppen'):
    if typ=='oppen':
        for dy in range(3):
            for dx in range(2): d.fast(x+dx,y+dy,EYE)
        d.fast(x,y,W); d.fast(x+1,y+2,W2)
    elif typ=='stangd':          # blundar: ett streck
        d.fast(x,y+1,EYE); d.fast(x+1,y+1,EYE); d.fast(x,y+2,EYE) if False else None
    elif typ=='glad':            # glada bågar ^
        d.fast(x,y+2,EYE); d.fast(x,y+1,EYE); d.fast(x+1,y,EYE) if False else None
        d.fast(x,y+1,EYE); d.fast(x+1,y+1,EYE); d.fast(x-1 if False else x,y+2,EYE)
        # ^-form över två pixlar: vänster ned, mitt upp
        for (a,b) in [(x,y+2),(x,y+1),(x+1,y+1),(x+1,y+2)]: pass
    elif typ=='stora':           # rädd: större vitt
        for dy in range(3):
            for dx in range(2): d.fast(x+dx,y+dy,W)
        d.fast(x+1,y+1,EYE); d.fast(x+1,y+2,EYE)
    elif typ=='upp':             # tittar upp, frågande
        for dy in range(3):
            for dx in range(2): d.fast(x+dx,y+dy,EYE)
        d.fast(x,y+2,W2); d.fast(x+1,y,W)
def glad_oga(d,x,y):
    d.fast(x,y+2,EYE); d.fast(x,y+1,EYE); d.fast(x+1,y+1,EYE); d.fast(x+1,y+2,EYE)
    d.fast(x,y+1,EYE)
    # gör en tydlig båge: topp på mitten
    d.fast(x,y+2,EYE); d.fast(x+1,y+2,EYE); d.px.pop((x,y+1),None); d.px.pop((x+1,y+1),None)
    d.fast(x,y+1,EYE) ; d.fast(x+1,y+1,EYE)
def ogon_par(d,typ,x1,x2,y):
    if typ=='glad':
        for x in (x1,x2):
            d.fast(x-1,y+2,EYE); d.fast(x,y+1,EYE); d.fast(x+1,y+1,EYE); d.fast(x+2,y+2,EYE)
    else:
        oga(d,x1,y,typ); oga(d,x2,y,typ)
def mun_fram(d,typ,ox,oy):
    if typ=='le':
        for (x,y) in [(11,18),(12,18),(10,17),(13,17)]: d.fast(x+ox,y+oy,MUN)
    elif typ=='o':
        for (x,y) in [(11,17),(12,17),(11,18),(12,18)]: d.fast(x+ox,y+oy,MUN)
    elif typ=='oppen':
        for (x,y) in [(10,17),(13,17),(10,18),(13,18),(11,19),(12,19)]: d.fast(x+ox,y+oy,MUN)
        d.fast(11+ox,18+oy,TUNGA); d.fast(12+ox,18+oy,TUNGA); d.fast(11+ox,17+oy,MUN); d.fast(12+ox,17+oy,MUN)
    elif typ=='gap':
        for (x,y) in [(10,16),(11,16),(12,16),(13,16),(10,17),(13,17),(10,18),(13,18),(11,19),(12,19)]: d.fast(x+ox,y+oy,MUN)
        for (x,y) in [(11,17),(12,17),(11,18),(12,18)]: d.fast(x+ox,y+oy,TUNGA)
    elif typ=='vagig':
        for (x,y) in [(10,18),(11,17),(12,18),(13,17)]: d.fast(x+ox,y+oy,MUN)
    elif typ=='tugga':
        for (x,y) in [(10,18),(11,18),(12,18),(13,18)]: d.fast(x+ox,y+oy,MUN)
def monster_fram(d,ox,oy):
    for (x,y,c) in [(11,15,MONSTER),(12,15,MONSTER),(10,16,MONSTER2),(13,16,MONSTER2)]: d.fast(x+ox,y+oy,c)

def ner(f=0,oga_t='oppen',mun='le',dk=0,dh=(0,0),monster=False,lyft_fot=None,kinder=True):
    d=Duk(); hx,hy=dh
    lyft={1:(0,),3:(1,)}.get(f,()) if lyft_fot is None else lyft_fot
    d.ellips(18.5,3.2+dk,2.9,2.3,'klubba','klubba',toner=(1,2,3,4))
    for (x,y) in [(17,5),(17,6),(16,7)]: d.satt(x,y+dk,'oliv',2,'svans'); d.satt(x+1,y+dk,'oliv',1,'svans')
    d.ellips(12,13.5+dk,9.6,5.2,'oliv','kropp')
    d.ellips(12,9.2+dk,8.6,4.6,'gra','rygg',platt=0.5,zbias=-0.25)
    borst(d,[(5,6+dk),(8,5+dk),(11,4+dk),(14,5+dk),(17,6+dk)])
    for i,cx in enumerate((5.5,18.5)):
        up=1 if i in lyft else 0
        d.ellips(cx,17.6-up,2.3,2.6,'oliv','ben')
        d.ellips(cx,19.9-up,2.5,1.4,'bla','fot')
    d.ellips(12+hx,13.2+hy,7.6,6.0,'huvud','huvud',zbias=0.05)
    d.ellips(12+hx,16.6+hy,3.2,1.8,'huvud','nos',toner=(2,3,3,4),zbias=0.2)
    skilj(d,'huvud','kropp'); skilj(d,'huvud','ben'); skilj(d,'rygg','kropp',ton=1)
    d.kontur()
    ogon_par(d,oga_t,7+hx,15+hx,12+hy)
    mun_fram(d,mun,hx,hy)
    if kinder:
        for (x,y) in [(6,15),(17,15)]: d.fast(x+hx,y+hy,ROS)
    if monster: monster_fram(d,hx,hy)
    for (x,y) in [(3,11),(2,12),(21,11),(21,12),(3,15),(3,16),(20,15),(20,16)]:
        if d.px.get((x,y+dk),('',0))[0]=='oliv': d.satt(x,y+dk,'oliv',1)
    for i,cx in enumerate((5,18)):
        up=1 if i in lyft else 0
        y=21-up
        for tx in (-1,1): d.satt(cx+tx+(1 if cx==5 else 0),y,'bla',4)
    return d.bild()

def hoger(f=0,oga_t='oppen',mun='le',dk=0,dh=(0,0),monster=False):
    d=Duk(); hx,hy=dh
    ben=[(6.0,'b'),(8.8,'n'),(13.4,'b'),(16.4,'n')]
    lyft={1:(1,2),3:(0,3)}.get(f,())
    d.ellips(2.7,5.4+dk,2.4,2.0,'klubba','klubba')
    for i,(cx,s_) in enumerate(ben):
        if s_!='b': continue
        up=i in lyft
        d.ellips(cx,17.6-up,1.6,2.4,'oliv','benb',toner=(0,1,1,2))
        d.ellips(cx+0.3,19.8-up,1.4,1.0,'bla','fotb',toner=(0,1,2,2))
    d.ellips(11.6,13.6+dk,7.0,4.6,'oliv','kropp')
    for (x,y,t) in [(4,11,2),(3,10,3),(3,9,2),(2,8,3)]: d.satt(x,y+dk,'oliv',t,'svans')
    d.ellips(10.8,10.4+dk,6.8,3.6,'gra','rygg',platt=0.6,zbias=-0.2)
    borst(d,[(6,8+dk),(8,7+dk),(10,7+dk),(12,7+dk),(14,7+dk),(16,8+dk)])
    for i,(cx,s_) in enumerate(ben):
        if s_!='n': continue
        up=i in lyft
        d.ellips(cx,17.8-up,1.8,2.4,'oliv','ben')
        d.ellips(cx+0.4,20.1-up,1.6,1.1,'bla','fot')
    d.ellips(17.6+hx,12.0+hy,5.4,4.9,'huvud','huvud',zbias=0.05)
    d.ellips(21.0+hx,13.8+hy,2.4,1.6,'huvud','nos',toner=(2,3,3,4),zbias=0.2)
    d.satt(min(23,23+hx),14+hy,'huvud',2,'nos')
    skilj(d,'huvud','kropp'); skilj(d,'huvud','rygg',ton=1); skilj(d,'rygg','kropp',ton=1); skilj(d,'ben','kropp',ton=1)
    d.kontur()
    x,y=18+hx,11+hy
    if oga_t=='glad': d.fast(x-1,y+2,EYE); d.fast(x,y+1,EYE); d.fast(x+1,y+1,EYE); d.fast(x+2,y+2,EYE)
    else: oga(d,x,y,oga_t)
    mx,my=hx,hy
    if mun=='le': [d.fast(a+mx,b+my,MUN) for (a,b) in [(20,15),(21,15),(22,15)]]
    elif mun=='o': [d.fast(a+mx,b+my,MUN) for (a,b) in [(21,15),(22,15),(21,16)]]
    elif mun in ('oppen','gap'):
        for (a,b) in [(20,15),(21,16),(22,16),(23,15)]: d.fast(min(23,a+mx),b+my,MUN)
        d.fast(21+mx,15+my,TUNGA); d.fast(22+mx,15+my,TUNGA)
    elif mun=='vagig': [d.fast(a+mx,b+my,MUN) for (a,b) in [(20,15),(21,16),(22,15)]]
    elif mun=='tugga': [d.fast(a+mx,b+my,MUN) for (a,b) in [(20,15),(21,15)]]
    d.fast(17+hx,14+hy,ROS)
    if monster:
        for (a,b,c) in [(21,13,MONSTER),(22,13,MONSTER2),(20,13,MONSTER2)]: d.fast(min(23,a+hx),b+hy,c)
    for (a,b) in [(6,13),(6,14),(9,14),(9,15),(12,14),(12,15)]:
        if d.px.get((a,b+dk),('',0))[0]=='oliv': d.satt(a,b+dk,'oliv',1)
    return d.bild()

def upp(f=0,dk=0,dh=(0,0)):
    d=Duk(); hx,hy=dh
    lyft={1:0,3:1}.get(f,None)
    d.ellips(12+hx,6.0+hy,5.6,4.2,'huvud','huvud',zbias=0.0)
    d.ellips(12,14.6+dk,9.6,4.6,'oliv','kropp')
    for i,cx in enumerate((5.5,18.5)):
        up=(lyft==i)
        d.ellips(cx,17.8-up,2.3,2.4,'oliv','ben')
        d.ellips(cx,19.9-up,2.4,1.3,'bla','fot')
    d.ellips(12,11.0+dk,8.6,5.2,'gra','rygg',platt=0.5,zbias=-0.3)
    borst(d,[(5,8+dk),(8,7+dk),(11,6+dk),(14,7+dk),(17,8+dk),(9,11+dk),(14,11+dk)])
    for (x,y) in [(12,16),(12,17),(11,17)]: d.satt(x,y+dk,'oliv',2,'svans')
    d.ellips(12,19.6+dk,3.0,2.2,'klubba','klubba')
    skilj(d,'rygg','huvud',ton=1); skilj(d,'rygg','kropp',ton=1); skilj(d,'klubba','rygg',ton=1)
    d.kontur()
    for (x,y) in [(3,14),(3,15),(20,14),(20,15)]:
        if d.px.get((x,y+dk),('',0))[0]=='oliv': d.satt(x,y+dk,'oliv',1)
    return d.bild()

def lyft_bild(im,dy):
    """flytta hela figuren dy pixlar uppåt (hopp)"""
    ut=Image.new('RGBA',im.size,(0,0,0,0)); ut.alpha_composite(im,(0,-dy)); return ut
def darra(im,dx):
    ut=Image.new('RGBA',im.size,(0,0,0,0)); ut.alpha_composite(im,(dx,0)); return ut
