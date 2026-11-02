exec(open('pix.py').read())
MAT.update({
 'svart':['#08090C','#15171C','#23262D','#3A404A','#62769A'],
 'vit':['#4A525C','#B4BCC6','#DADFE4','#F2F3F0','#FFFFFF'],
 'stjart':['#0C1E24','#1E3F48','#2E5966','#4E8A98','#8CC4D0'],
 'nab':['#08090C','#2A2C30','#3E4148','#5A5E66','#7A7E86'],
})
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def sitta(titta=False):
    d=Duk(16,12)
    hy=0.6 if titta else 0
    d.ellips(12.6,8.6,3.6,1.5,'stjart','stjart')
    d.ellips(8.2,6.4,4.3,3.3,'svart','kropp')
    d.ellips(9.4,6.0,2.0,1.1,'vit','vinge',toner=(1,2,3,4))
    d.ellips(6.4,7.7,2.6,2.1,'vit','mage')
    d.ellips(4.3,3.4+hy,2.8,2.6,'svart','huvud')
    for (x,y,t) in [(1,3+round(hy),2),(0,4+round(hy),1),(1,4+round(hy),3)]: d.satt(x,y,'nab',t,'nab')
    skilj(d,'huvud','kropp',ton=1); skilj(d,'vinge','kropp',ton=1)
    for (x,y) in [(7,10),(9,10),(7,11),(9,11)]: d.satt(x,y,'nab',2,'ben')
    d.kontur()
    d.fast(3,3+round(hy),'#FFFFFF'); d.fast(4,3+round(hy),'#3A404A')
    return d.bild()
def flyga(upp=True):
    d=Duk(18,12)
    if upp:
        d.ellips(10.6,3.5,3.4,3.2,'svart','vinge')
        d.ellips(11.8,2.4,1.7,1.5,'vit','vingspets')
    d.ellips(14.4,7.6,3.3,1.2,'stjart','stjart')
    d.ellips(9.0,7.2,4.6,2.0,'svart','kropp')
    d.ellips(8.2,8.3,2.9,1.1,'vit','mage')
    d.ellips(4.1,6.6,2.4,2.1,'svart','huvud')
    for (x,y,t) in [(1,6,2),(0,7,1),(1,7,3)]: d.satt(x,y,'nab',t,'nab')
    if not upp:
        d.ellips(10.2,9.7,3.4,1.6,'svart','vinge')
        d.ellips(11.6,10.0,1.6,0.9,'vit','vingspets')
    skilj(d,'huvud','kropp',ton=1); skilj(d,'vinge','kropp',ton=1); skilj(d,'kropp','vinge',ton=1) if not upp else None
    d.kontur()
    d.fast(3,6,'#FFFFFF'); d.fast(4,6,'#3A404A')
    return d.bild()
B={'sitta':sitta(),'titta':sitta(True),'flyga1':flyga(True),'flyga2':flyga(False)}
if __name__=='__main__':
    S=10; bgs=[(104,160,72,255),(196,150,98,255),(38,44,70,255)]
    out=Image.new('RGBA',(4*(20*S+8),3*(14*S+8)),(255,255,255,255))
    for j,bgc in enumerate(bgs):
        for i,(n,im) in enumerate(B.items()):
            t=Image.new('RGBA',(20,14),bgc); t.alpha_composite(im,(1,1))
            out.paste(t.resize((20*S,14*S),Image.NEAREST),(i*(20*S+8),j*(14*S+8)))
    out.save('skataprov2.png')
