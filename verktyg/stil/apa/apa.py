exec(open('pix.py').read())
MAT.update({
 'pals':['#3A2414','#6E4428','#8E5C38','#AE7A4E','#CC9C6E'],
 'ljus':['#6A4A2E','#C9A27A','#E2C29A','#F0D8B6','#FBEED8'],
 'nat':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],
})
EYE='#1E140C'; W='#FFFFFF'; MUN='#4A2414'; ROS='#E89A8A'; TAR='#8FCBF2'
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def apa(armV=(3.2,11.5),armH=(12.8,11.5),benV=(5.6,14.4),benH=(10.4,14.4),oga_t='oppen',mun='le',svans=True,tarar=False,ox=0,oy=0,W_=16,H_=16):
    d=Duk(W_,H_)
    o=lambda x,y:(x+ox,y+oy)
    if svans:
        for (x,y,t) in [(12,13,2),(13,13,2),(14,12,3),(14,11,2),(13,10,2),(12,10,3)]: d.satt(x+ox,y+oy,'pals',t,'svans')
    for c in (benV,benH): d.ellips(c[0]+ox,c[1]+oy,1.4,1.5,'pals','ben')
    for c in (armV,armH): d.ellips(c[0]+ox,c[1]+oy,1.2,1.9,'pals','arm')
    d.ellips(8+ox,11.6+oy,3.3,2.8,'pals','kropp')
    d.ellips(8+ox,12.0+oy,1.9,1.9,'ljus','mage',toner=(1,2,3,3))
    for cx in (2.6,13.4):
        d.ellips(cx+ox,5.6+oy,1.9,1.9,'pals','ora')
        d.ellips(cx+ox,5.8+oy,1.0,1.0,'ljus','orain',toner=(1,1,2,2))
    d.ellips(8+ox,5.4+oy,4.8,4.3,'pals','huvud')
    d.ellips(8+ox,6.8+oy,3.5,2.7,'ljus','ansikte',zbias=0.1)
    for (x,y,t) in [(7,0,4),(8,0,3),(8,1,4)]: d.satt(x+ox,y+oy,'pals',t,'tofs')
    skilj(d,'ansikte','huvud',ton=1); skilj(d,'huvud','kropp',ton=1); skilj(d,'kropp','arm',ton=1); skilj(d,'huvud','ora',ton=1); skilj(d,'kropp','ben',ton=1)
    d.kontur()
    for x in (6,9):
        X,Y=x+ox,5+oy
        if oga_t=='oppen':
            d.fast(X,Y,EYE); d.fast(X+1,Y,EYE); d.fast(X,Y+1,EYE); d.fast(X+1,Y+1,EYE); d.fast(X,Y,W)
        elif oga_t=='glad':
            d.fast(X,Y+1,EYE); d.fast(X+1,Y,EYE) if False else None; d.fast(X+1,Y+1,EYE); d.fast(X,Y,EYE) if False else None
            d.fast(X,Y+1,EYE); d.fast(X+1,Y,EYE)
        elif oga_t=='knip':   # grimas: hårt slutna
            d.fast(X,Y+1,EYE); d.fast(X+1,Y+1,EYE)
    if tarar:
        d.fast(6+ox,7+oy,TAR); d.fast(6+ox,8+oy,TAR); d.fast(10+ox,7+oy,TAR); d.fast(10+ox,8+oy,TAR)
    if mun=='le':
        for (x,y) in [(7,8),(8,8),(6,7) if False else (9,8)]: pass
        for (x,y) in [(6,8),(7,9),(8,9),(9,8)]: d.fast(x+ox,y+oy,MUN)
    elif mun=='oppen':
        for (x,y) in [(6,8),(9,8),(7,9),(8,9)]: d.fast(x+ox,y+oy,MUN)
        d.fast(7+ox,8+oy,'#E8707A'); d.fast(8+ox,8+oy,'#E8707A')
    elif mun=='ledsen':
        for (x,y) in [(6,9),(7,8),(8,8),(9,9)]: d.fast(x+ox,y+oy,MUN)
    elif mun=='grimas':
        for (x,y) in [(6,8),(7,8),(8,8),(9,8)]: d.fast(x+ox,y+oy,MUN)
        d.fast(7+ox,9+oy,W); d.fast(8+ox,9+oy,W) if False else None
    d.fast(5+ox,7+oy,ROS); d.fast(10+ox,7+oy,ROS)
    return d.bild()
def bak(armV=(3.2,10.5),armH=(12.8,11.5),benV=(5.6,14.4),benH=(10.4,14.4)):
    d=Duk(16,16)
    for (x,y,t) in [(8,14,2),(8,15,2)]: d.satt(x,y,'pals',t,'svans')
    for c in (benV,benH): d.ellips(c[0],c[1],1.4,1.5,'pals','ben')
    d.ellips(8,11.6,3.3,2.8,'pals','kropp')
    for c in (armV,armH): d.ellips(c[0],c[1],1.2,1.9,'pals','arm')
    for cx in (2.6,13.4): d.ellips(cx,5.6,1.9,1.9,'pals','ora')
    d.ellips(8,5.4,4.8,4.3,'pals','huvud')
    for (x,y,t) in [(7,0,4),(8,0,3),(8,1,4)]: d.satt(x,y,'pals',t,'tofs')
    skilj(d,'huvud','kropp',ton=1); skilj(d,'huvud','ora',ton=1); skilj(d,'arm','kropp',ton=1)
    d.kontur()
    return d.bild()
def nat(apbild,skak=0):
    """lägger apan i baronens orange nät: 20 x 26, rep upp till grenen"""
    im=Image.new('RGBA',(20,26),(0,0,0,0)); im.alpha_composite(apbild,(2+skak,8))
    from PIL import ImageDraw
    N=MAT['nat']; hxx=lambda h: tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
    # rep
    for y in range(0,6): im.putpixel((10,y),hxx(N[1])); 
    for y in range(0,6,2): im.putpixel((10,y),hxx(N[3]))
    # knut och nätets mynning
    for x in range(8,13): im.putpixel((x,6),hxx(N[0]))
    for x in range(9,12): im.putpixel((x,7),hxx(N[2]))
    # maskor: bara runt apan och två trådar över kroppen, aldrig över ansiktet
    cx,cy,rx,ry=10+skak,16.5,8.6,9.0
    apa_px=lambda x,y: 0<=x-2-skak<16 and 0<=y-8<16 and apbild.getpixel((x-2-skak,y-8))[3]>0
    for y in range(7,26):
        for x in range(20):
            dx=(x+0.5-cx)/rx; dy=(y+0.5-cy)/ry
            r2=dx*dx+dy*dy
            if r2<=1:
                if r2>0.80: im.putpixel((x,y),hxx(N[1])); continue
                inne=apa_px(x,y)
                if not inne and ((x+y)%5==0 or (x-y)%5==0):
                    im.putpixel((x,y),hxx(N[2] if y>cy else N[3]))
                if inne and y in (20,23) and (x+y)%2==0:
                    im.putpixel((x,y),hxx(N[2]))
    return im
