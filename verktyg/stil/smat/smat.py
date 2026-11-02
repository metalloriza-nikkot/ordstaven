exec(open('pix.py').read())
MAT.update({
 'tagg':['#123A2A','#1E6A4A','#2E9A6A','#6ACB8E','#B8F0C8'],
 'lader':['#2A1A0E','#5A3A20','#7A5230','#9A6E44','#C09060'],
 'ekorre':['#2E160A','#6A3418','#8E4A26','#AE6638','#CC8A58'],
 'krem':['#6A4A2E','#D8C0A0','#EEDCC0','#F8EEDA','#FFFAF0'],
 'uggla':['#2A2018','#5E4A36','#7E6A52','#A08A6E','#C8B494'],
 'kotte':['#2A1A0C','#5A3818','#7A5228','#9C7040','#C09060'],
 'not':['#3A2410','#7A5024','#9C6A34','#BE8A4E','#E0B07A'],
})
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
EYE='#140C08'; W='#FFFFFF'
# ---- Taggkam på hjälmen (16 x 24, hjältens rutnät) ----
def taggkam(rikt):
    d=Duk(16,24)
    x0={'ner':5,'upp':5,'hoger':4}[rikt]
    for i in range(4):
        x=x0+i*2
        d.satt(x,2,'tagg',2,'tagg'); d.satt(x+1,2,'tagg',1,'tagg')
        d.satt(x,1,'tagg',3,'tagg'); d.satt(x,0,'tagg',4,'tagg')
    d.kontur()
    return d.bild()
# ---- Ryggsäck (16 x 24) ----
def ryggsack(rikt):
    d=Duk(16,24)
    if rikt=='upp':
        d.ellips(8,16.0,3.6,3.4,'lader','sack')
        d.ellips(8,14.0,3.4,1.4,'lader','lock',toner=(2,3,3,4))
        skilj(d,'lock','sack',ton=1)
        d.kontur(); d.fast(8,15,'#D6A548'); 
    elif rikt=='hoger':
        d.ellips(3.2,15.6,1.8,3.0,'lader','sack')
        d.kontur()
    else:  # ner: bara remmarna syns
        for (x,y) in [(5,13),(5,14),(5,15),(10,13),(10,14),(10,15)]: d.satt(x,y,'lader',3 if y==13 else 2,'rem')
    return d.bild()
# ---- Ekorren (12 x 12, sida, vänd åt vänster) ----
def ekorre(pose='sitta',huvud=0,not_i_hand=False):
    d=Duk(12,12)
    if pose=='sitta':
        d.ellips(8.6,5.0,2.8,4.4,'ekorre','svans',zbias=0.1)      # yvig svans bakom
        d.ellips(5.6,8.0,2.6,3.0,'ekorre','kropp')
        d.ellips(4.8,8.6,1.4,2.0,'krem','mage',toner=(1,2,3,3))
        d.ellips(4.4+huvud*0.6,4.4,2.4,2.2,'ekorre','huvud')
        for (x,y,t) in [(3+huvud,1,3),(5+huvud,1,3),(3+huvud,2,2),(5+huvud,2,2)]: d.satt(x,y,'ekorre',t,'ora')
        for (x,y) in [(4,11),(6,11)]: d.satt(x,y,'ekorre',1,'fot')
    elif pose=='skutta':
        d.ellips(9.4,4.0,2.4,3.0,'ekorre','svans',zbias=0.1)
        d.ellips(5.8,6.4,3.2,2.2,'ekorre','kropp')
        d.ellips(5.0,7.4,1.8,1.0,'krem','mage',toner=(1,2,3,3))
        d.ellips(2.8,5.0,2.2,2.0,'ekorre','huvud')
        for (x,y,t) in [(2,2,3),(3,2,2)]: d.satt(x,y,'ekorre',t,'ora')
        for (x,y) in [(3,8),(8,8),(9,9)]: d.satt(x,y,'ekorre',1,'fot')
    elif pose=='springa':
        d.ellips(9.6,6.0,2.2,2.4,'ekorre','svans',zbias=0.1)
        d.ellips(6.0,8.0,3.2,1.9,'ekorre','kropp')
        d.ellips(5.2,8.8,1.8,0.9,'krem','mage',toner=(1,2,3,3))
        d.ellips(2.8,6.8,2.1,1.9,'ekorre','huvud')
        for (x,y,t) in [(2,4,3),(3,4,2)]: d.satt(x,y,'ekorre',t,'ora')
        for (x,y) in [(3,10),(4,10),(8,10),(9,10)]: d.satt(x,y,'ekorre',1,'fot')
    skilj(d,'kropp','svans',ton=1); skilj(d,'huvud','kropp',ton=1)
    d.kontur()
    # öga och nos
    if pose=='sitta':
        ex=3+huvud; d.fast(ex,4,EYE); d.fast(ex,3,'#EEDCC0'); d.fast(ex+1,4,'#EEDCC0'); d.fast(2+huvud,5,'#2E160A')
    elif pose=='skutta': d.fast(2,4,EYE); d.fast(2,3,'#EEDCC0'); d.fast(1,5,'#2E160A')
    else: d.fast(2,6,EYE); d.fast(2,5,'#EEDCC0'); d.fast(1,7,'#2E160A')
    im=d.bild()
    if not_i_hand:
        n=not_bild(); im.alpha_composite(n,(2,4))
    return im
def not_bild():
    d=Duk(6,6); d.ellips(3,3.4,2.2,2.2,'not','not'); d.ellips(3,1.6,1.8,0.9,'kotte','hatt',toner=(1,2,3,3)); d.kontur(); return d.bild()
def kotte(vriden=False):
    d=Duk(8,8)
    d.ellips(4,4.2,2.6,3.4,'kotte','kotte')
    d.kontur()
    im=d.bild()
    # fjäll: korta streck
    for (x,y) in [(3,2),(5,3),(3,4),(5,5),(4,6)]:
        if im.getpixel((x,y))[3]: im.putpixel((x,y),(0x5A,0x38,0x18,255))
    return im.rotate(90) if vriden else im
# ---- Ugglan (10 x 12, framifrån) ----
def uggla(oppen=True):
    d=Duk(10,12)
    d.ellips(5,7.6,3.8,3.8,'uggla','kropp')
    d.ellips(5,8.4,2.2,2.6,'krem','mage',toner=(1,2,2,3))
    d.ellips(5,4.2,3.8,3.0,'uggla','huvud')
    for (x,y,t) in [(2,1,3),(7,1,3),(2,2,2),(7,2,2)]: d.satt(x,y,'uggla',t,'ora')
    skilj(d,'huvud','kropp',ton=1)
    d.kontur()
    for cx in (3,6):
        if oppen:
            d.fast(cx,3,'#F5E6A0'); d.fast(cx+1,3,'#F5E6A0'); d.fast(cx,4,'#F5E6A0'); d.fast(cx+1,4,EYE)
        else:
            d.fast(cx,4,EYE); d.fast(cx+1,4,EYE)
    d.fast(4,5,'#E0B07A'); d.fast(5,5,'#C09060')
    for (x,y) in [(3,11),(6,11)]: d.fast(x,y,'#C09060')
    return d.bild()
