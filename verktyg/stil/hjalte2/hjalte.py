exec(open('pix.py').read())
MAT.update({
 'hud':['#0E2A5A','#1E5FA8','#2E8BD8','#5FB4E8','#A8DCF8'],
 'hjalm':['#2A2E38','#6E747F','#A4A9B3','#C9CCD2','#EEF0F2'],
 'drakt':['#15171C','#2A2D35','#3A3E48','#565B68','#8A90A0'],
 'sko':['#0A1A48','#163A88','#1E4FA0','#3F6FCC','#7FA0E8'],
})
OGA='#0B1838'; VIT='#FFFFFF'; MUN='#0B1838'; TAND='#EEF0F2'
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
def ben_ner(d,f):
    for i,cx in enumerate((6.0,10.0)):
        up=(f==1 and i==0) or (f==3 and i==1)
        d.ellips(cx,19.6-up,1.5,2.2,'hud','ben')
        d.ellips(cx,21.9-up,1.9,1.2,'sko','sko')
def ner(f=0):
    d=Duk(16,24)
    ben_ner(d,f)
    for cx in (3.3,12.7): d.ellips(cx,15.2,1.3,2.2,'hud','arm')
    d.ellips(8,15.8,4.2,2.9,'drakt','kropp')
    d.ellips(8,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    d.ellips(8,8.7,5.0,3.9,'hud','ansikte',zbias=0.1)
    skilj(d,'ansikte','hjalm',ton=1); skilj(d,'kropp','arm',ton=1); skilj(d,'hjalm','kropp',ton=1)
    # dräktens ljusa kant i halsen och nertill
    for x in range(5,11): d.satt(x,13,'drakt',4)
    for x in range(5,11): 
        if d.px.get((x,18),('',0))[0]=='drakt': d.satt(x,18,'drakt',4)
    d.kontur()
    for x in (6,10): d.fast(x,7,VIT); d.fast(x,8,OGA)
    d.fast(5,8,OGA) if False else None
    for (x,y) in [(5,10),(6,11),(7,11),(8,11),(9,11),(10,11),(11,10)]: d.fast(x,y,MUN)
    for x in (7,8,9): d.fast(x,12,'#1E5FA8') if False else None
    d.fast(8,10,'#7FC0F0') if False else None
    return d.bild()
def upp(f=0):
    d=Duk(16,24)
    ben_ner(d,f)
    for cx in (3.3,12.7): d.ellips(cx,15.2,1.3,2.2,'hud','arm')
    d.ellips(8,15.8,4.2,2.9,'drakt','kropp')
    d.ellips(8,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    skilj(d,'kropp','arm',ton=1); skilj(d,'hjalm','kropp',ton=1)
    for x in range(5,11):
        if d.px.get((x,18),('',0))[0]=='drakt': d.satt(x,18,'drakt',4)
    d.kontur()
    # hjälmens nackkant
    for x in range(4,12):
        if d.px.get((x,12),('',0))[0]=='hjalm': d.satt(x,12,'hjalm',1)
    return d.bild()
def hoger(f=0):
    d=Duk(16,24)
    # bortre ben bakom, närmre fram. Steg: benen isär.
    steg={0:(0,0),1:(-1.6,1.6),2:(0,0),3:(1.6,-1.6)}[f]
    d.ellips(7.6+steg[0],19.6,1.5,2.2,'hud','benb',toner=(0,1,1,2))
    d.ellips(8.2+steg[0],21.9,1.9,1.1,'sko','skob',toner=(0,1,1,2))
    d.ellips(7.4,15.8,3.5,2.9,'drakt','kropp')
    d.ellips(8.0+steg[1],19.7,1.5,2.2,'hud','ben')
    d.ellips(8.7+steg[1],22.0,2.0,1.2,'sko','sko')
    d.ellips(7.6,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
    d.ellips(11.0,8.8,3.6,3.8,'hud','ansikte',zbias=0.1)
    d.ellips(8.4,15.4,1.3,2.2,'hud','arm')
    skilj(d,'ansikte','hjalm',ton=1); skilj(d,'arm','kropp',ton=1); skilj(d,'hjalm','kropp',ton=1)
    for x in range(5,10): d.satt(x,13,'drakt',4)
    d.kontur()
    d.fast(12,7,VIT); d.fast(12,8,OGA)
    for (x,y) in [(11,10),(12,11),(13,11),(14,11),(15,10)]: d.fast(x,y,MUN)
    return d.bild()
RAD={'ner':ner,'hoger':hoger,'upp':upp}
def rader():
    r={n:[fn(i) for i in range(4)] for n,fn in RAD.items()}
    r['vanster']=[i.transpose(Image.FLIP_LEFT_RIGHT) for i in r['hoger']]
    return r
if __name__=='__main__':
    r=rader(); S=10; GR=(104,160,72,255)
    out=Image.new('RGBA',(4*(16*S+10),24*S),(255,255,255,255))
    for i,n in enumerate(['ner','hoger','upp','vanster']):
        bg=Image.new('RGBA',(16,24),GR); bg.alpha_composite(skugga(16,24,8,22.6,5.5,1.3)); bg.alpha_composite(r[n][0])
        out.paste(bg.resize((16*S,24*S),Image.NEAREST),(i*(16*S+10),0))
    out.save(__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'prov.png')
