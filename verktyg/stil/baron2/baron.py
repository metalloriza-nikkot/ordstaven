exec(open('pix.py').read())
MAT.update({
 'jacka':['#5A2A0E','#B85E22','#E8823A','#F3A462','#FBD0A0'],
 'hud':['#6A3A28','#D9967A','#F2C6A2','#F8DCC0','#FFF0E0'],
 'hjalm':['#5A4A30','#B8A57A','#E6D6A8','#F2E8C8','#FFFBEA'],
 'kaki':['#4A3E28','#9C8860','#C9B48A','#DCCCA6','#EEE2C8'],
 'kanga':['#2A1A10','#4E3220','#6B4630','#8A6044','#A87C5C'],
 'nos':['#5A2A1C','#B8604A','#D9826A','#E8A08A','#F4C4B0'],
})
OGA='#2A1A14'; MUN='#5A2A1A'; KIND='#E89A88'; BAND='#6B4630'; MAS='#D6A548'; MAS2='#F2D27A'; KNAPP='#6B4630'; SOM='#A85418'
FJ=['#5A2A0E','#E8823A','#F3A462']
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def fjader(d,pts):
    for i,(x,y) in enumerate(pts): d.satt(x,y,'jacka',3 if i%2 else 2,'fjader')
def ner(f=0):
    d=Duk(24,24); v={0:0,1:-1,2:0,3:1}[f]   # vaggar åt sidan
    for i,cx in enumerate((9.6,14.4)):
        up=(f==1 and i==0) or (f==3 and i==1)
        d.ellips(cx,20.4-up,1.5,1.5,'kaki','ben')
        d.ellips(cx-0.3,22.0-up,2.1,1.1,'kanga','kanga')
    for cx in (4.6+v,19.4+v): d.ellips(cx,15.2,1.7,3.0,'jacka','arm',zbias=-0.1)
    for cx in (4.5+v,19.5+v): d.ellips(cx,18.5,1.3,1.1,'hud','hand')
    d.ellips(12+v,14.8,7.2,5.9,'jacka','kropp')
    d.ellips(12+v,8.8,4.7,4.0,'hud','huvud')
    d.ellips(12+v,4.4,4.3,3.0,'hjalm','kupol')
    d.ellips(12+v,6.4,6.6,1.5,'hjalm','brätte',zbias=0.1)
    d.ellips(12+v,9.6,1.6,1.2,'nos','nos',zbias=0.1)
    skilj(d,'kropp','arm',ton=1); skilj(d,'huvud','kropp',ton=1); skilj(d,'brätte','huvud',ton=1); skilj(d,'brätte','kupol',ton=1)
    fjader(d,[(16+v,4),(17+v,3),(17+v,2),(18+v,1),(18+v,0)])
    d.kontur()
    o=v
    for x in range(9,15):
        if d.px.get((x+o,5),('',0))[0]=='hjalm' and d.del_.get((x+o,5))=='kupol': d.fast(x+o,5,BAND)
    d.fast(10+o,8,OGA); d.fast(14+o,8,OGA)
    d.fast(9+o,10,KIND); d.fast(15+o,10,KIND)
    for (x,y) in [(10,11),(11,12),(13,12),(14,11)]: d.fast(x+o,y,MUN)
    d.fast(12+o,12,'#FFFFFF'); d.fast(12+o,13,MUN) if False else None
    d.fast(7,21,'#2A1A10'); d.fast(6,22,'#2A1A10')
    d.fast(12+o,12,'#FFFFFF') if False else None
    for y in range(13,20): 
        if d.px.get((12+o,y),('',0))[0]=='jacka': d.fast(12+o,y,SOM)
    for y in (14,16,18): d.fast(14+o,y,KNAPP)
    for (x,y,c) in [(8,13,'#C83A3A'),(10,13,'#3A8A3A'),(9,15,'#E0C040')]: d.fast(x+o,y,c); d.fast(x+o,y+1,MAS)
    d.fast(8+o,14,MAS2)
    return d.bild()
def upp(f=0):
    d=Duk(24,24); v={0:0,1:-1,2:0,3:1}[f]
    for i,cx in enumerate((9.6,14.4)):
        up=(f==1 and i==0) or (f==3 and i==1)
        d.ellips(cx,20.4-up,1.5,1.5,'kaki','ben')
        d.ellips(cx-0.3,22.0-up,2.1,1.1,'kanga','kanga')
    for cx in (4.6+v,19.4+v): d.ellips(cx,15.2,1.7,3.0,'jacka','arm',zbias=-0.1)
    for cx in (4.5+v,19.5+v): d.ellips(cx,18.5,1.3,1.1,'hud','hand')
    d.ellips(12+v,14.8,7.2,5.9,'jacka','kropp')
    d.ellips(12+v,8.4,3.8,2.8,'hud','huvud',zbias=-0.2)
    d.ellips(12+v,4.6,4.4,3.2,'hjalm','kupol')
    d.ellips(12+v,6.6,6.6,1.6,'hjalm','brätte')
    skilj(d,'kropp','arm',ton=1); skilj(d,'huvud','kropp',ton=1); skilj(d,'brätte','huvud',ton=1); skilj(d,'brätte','kupol',ton=1)
    fjader(d,[(7+v,4),(6+v,3),(6+v,2),(5+v,1),(5+v,0)])
    d.kontur()
    for x in range(8,16):
        if d.del_.get((x+v,5))=='kupol': d.fast(x+v,5,BAND)
    for y in range(13,20):
        if d.px.get((12+v,y),('',0))[0]=='jacka': d.satt(12+v,y,'jacka',1)
    return d.bild()
def hoger(f=0):
    d=Duk(24,24)
    steg={0:(0,0),1:(-1.8,1.8),2:(0,0),3:(1.8,-1.8)}[f]; bob=1 if f in (1,3) else 0
    d.ellips(11.6+steg[0],20.4,1.5,1.5,'kaki','benb',toner=(0,1,1,2))
    d.ellips(12.2+steg[0],22.0,2.1,1.0,'kanga','kangab',toner=(0,1,1,2))
    d.ellips(11.0,14.8-bob,6.6,5.9,'jacka','kropp')
    d.ellips(11.8+steg[1],20.5,1.5,1.5,'kaki','ben')
    d.ellips(12.6+steg[1],22.1,2.2,1.1,'kanga','kanga')
    d.ellips(13.2,8.4-bob,4.4,4.0,'hud','huvud')
    d.ellips(12.6,4.4-bob,4.2,3.0,'hjalm','kupol')
    d.ellips(12.8,6.4-bob,6.8,1.5,'hjalm','brätte',zbias=0.1)
    d.ellips(17.2,9.6-bob,1.5,1.2,'nos','nos',zbias=0.2)
    d.ellips(11.2-steg[1]*0.4,15.4-bob,1.7,3.0,'jacka','arm',zbias=0.05)
    d.ellips(11.0-steg[1]*0.5,18.6-bob,1.3,1.1,'hud','hand')
    skilj(d,'arm','kropp',ton=1); skilj(d,'huvud','kropp',ton=1); skilj(d,'brätte','huvud',ton=1); skilj(d,'brätte','kupol',ton=1)
    fjader(d,[(8,4-bob),(7,3-bob),(7,2-bob),(6,1-bob),(6,0)])
    d.kontur()
    for x in range(9,17):
        if d.del_.get((x,5-bob))=='kupol': d.fast(x,5-bob,BAND)
    d.fast(15,8-bob,OGA); d.fast(14,10-bob,KIND)
    for (x,y) in [(15,12),(16,12)]: d.fast(x,y-bob,MUN)
    d.fast(17,11-bob,MUN)
    for (x,y,c) in [(14,13,'#C83A3A'),(15,14,'#3A8A3A')]: d.fast(x,y-bob,c); d.fast(x,y+1-bob,MAS)
    for y in (15,17): d.fast(16,y-bob,KNAPP)
    return d.bild()
RAD={'ner':ner,'hoger':hoger,'upp':upp}
def rader():
    r={n:[fn(i) for i in range(4)] for n,fn in RAD.items()}
    r['vanster']=[i.transpose(Image.FLIP_LEFT_RIGHT) for i in r['hoger']]
    return r
if __name__=='__main__':
    import sys
    r=rader(); S=10; GR=(104,160,72,255)
    out=Image.new('RGBA',(4*(24*S+10),24*S),(255,255,255,255))
    for i,n in enumerate(['ner','hoger','upp','vanster']):
        bg=Image.new('RGBA',(24,24),GR); bg.alpha_composite(skugga(24,24,12,22.4,7.5,1.5)); bg.alpha_composite(r[n][0])
        out.paste(bg.resize((24*S,24*S),Image.NEAREST),(i*(24*S+10),0))
    out.save(sys.argv[1] if len(sys.argv)>1 else 'prov.png')

def hjalm_foremal():
    d=Duk(18,12)
    d.ellips(9,5.2,4.6,3.4,'hjalm','kupol')
    d.ellips(9,7.8,7.6,2.0,'hjalm','brätte',zbias=0.1)
    skilj(d,'brätte','kupol',ton=1)
    fjader(d,[(13,4),(14,3),(14,2),(15,1),(15,0)])
    d.kontur()
    for x in range(18):
        ys=[y for y in range(12) if d.del_.get((x,y))=='kupol' and d.px[(x,y)][1]!=0]
        if ys and len(ys)>1: d.fast(x,max(ys),BAND)
    return d.bild()
