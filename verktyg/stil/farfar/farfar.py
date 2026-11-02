exec(open('pix.py').read())
MAT.update({
 'hud':['#16341E','#3E7A52','#5E9E70','#84BE90','#B8DEB8'],
 'hjalm':['#2A2E38','#5E646F','#8E949E','#B4B8C0','#DCDEE2'],
 'skagg':['#6E7680','#B8BEC6','#DCE0E4','#F2F4F6','#FFFFFF'],
 'kofta':['#2A1A10','#5A3C26','#7A5638','#9C7450','#C49A72'],
 'mass':['#4A3410','#8E6A22','#C8963E','#E6BC66','#FBE2A0'],
})
OGA='#10241A'; VIT='#FFFFFF'; MUN='#3A1A14'; GLAS='#C8963E'
def skilj(d,fram,bak,ton=0):
    for (x,y),nm in list(d.del_.items()):
        if nm==bak:
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if d.del_.get((x+dx,y+dy))==fram:
                    m,t=d.px[(x,y)]; d.px[(x,y)]=(m,ton); break
# ---------- Porträtt 48 x 48 ----------
def portratt(var='A',uttryck='glad'):
    d=Duk(48,48)
    # axlar och kofta
    d.ellips(24,47,19,10,'kofta','kofta')
    # kompassen på bröstet
    d.ellips(24,43.5,3.4,3.2,'mass','kompass',zbias=0.1)
    # huvud
    if var=='A':
        d.ellips(24,19,18,16.5,'hjalm','hjalm',zbias=-0.1)
        d.ellips(24,22.5,13.5,12.5,'hud','ansikte',zbias=0.05)
        skilj(d,'ansikte','hjalm',ton=1)
    else:
        d.ellips(24,21,14.5,15,'hud','huvud',zbias=0.05)
        for cx in (10.5,37.5): d.ellips(cx,21,3.6,5.5,'skagg','har',zbias=0.1)
    # skägg: stort, vitt, under kinderna
    d.ellips(24,33.5,11.5,9.5,'skagg','skagg',zbias=0.15)
    # mustasch
    for cx in (19.5,28.5): d.ellips(cx,29.5,5.2,2.3,'skagg','mustasch',zbias=0.2)
    # näsa
    d.ellips(24,26.5,2.6,2.3,'hud','nos',zbias=0.3)
    skilj(d,'skagg','kofta',ton=1); skilj(d,'mustasch','skagg',ton=2); skilj(d,'nos','mustasch',ton=1)
    d.kontur()
    # ögonbryn (vita, buskiga)
    by=17 if uttryck=='glad' else 16
    for (x0,dirn) in ((14,1),(27,1)):
        for i in range(7):
            yy=by+(0 if uttryck=='glad' else (1 if (x0==14 and i>4) or (x0==27 and i<2) else 0))
            d.satt(x0+i,yy,'skagg',3 if i%2 else 2)
            d.satt(x0+i,yy-1,'skagg',4 if i in (2,3,4) else 3)
    # glasögon: runda mässingsringar
    for cx in (18,30):
        for a in range(0,360,15):
            import math
            x=int(round(cx+4.2*math.cos(math.radians(a)))); y=int(round(21.5+3.8*math.sin(math.radians(a))))
            d.fast(x,y,GLAS)
        # öga
        if uttryck=='glad':
            for (x,y) in [(cx-2,22),(cx-1,21),(cx,21),(cx+1,21),(cx+2,22)]: d.fast(x,y,OGA)
        else:
            for (x,y) in [(cx-1,21),(cx,21),(cx-1,22),(cx,22)]: d.fast(x,y,OGA)
            d.fast(cx-1,21,VIT)
    for x in range(22,27): d.fast(x,21,GLAS)
    # rynkor
    for (x,y) in [(12,25),(13,26),(35,25),(34,26),(21,13),(22,13),(26,13),(27,13)]:
        if d.px.get((x,y),('',0))[0] in ('hud',): d.satt(x,y,'hud',1)
    # mun i skägget
    if uttryck=='glad':
        for (x,y) in [(20,33),(21,34),(22,34),(23,34),(24,34),(25,34),(26,34),(27,33)]: d.fast(x,y,MUN)
        for x in range(22,26): d.fast(x,33,'#E8707A')
    else:
        for x in range(22,26): d.fast(x,34,MUN)
    # kompassens ros och nål
    d.fast(24,42,'#C83A3A'); d.fast(24,43,'#C83A3A'); d.fast(24,44,'#2A2E38'); d.fast(24,45,'#2A2E38')
    d.fast(23,40,'#4A3410'); d.fast(24,40,'#4A3410'); d.fast(25,40,'#4A3410')
    # kedja
    for (x,y) in [(18,38),(19,39),(20,40),(21,40),(30,38),(29,39),(28,40),(27,40)]: d.fast(x,y,GLAS)
    if var=='A':
        # buckla och skråma i hjälmen, och en liten lampa
        d.satt(15,8,'hjalm',1); d.satt(16,9,'hjalm',1); d.satt(31,6,'hjalm',1)
        d.ellips(24,3.6,2.4,1.8,'mass','lampa',zbias=0.2)
    return d.bild()
# ---------- Spelfigur 16 x 24, framifrån ----------
def figur(var='A'):
    d=Duk(16,24)
    for cx in (6.0,10.0): d.ellips(cx,21.8,1.9,1.2,'kofta','sko',toner=(0,1,1,2))
    for cx in (6.0,10.0): d.ellips(cx,19.4,1.5,2.0,'kofta','ben',toner=(0,1,2,2))
    for cx in (3.3,12.7): d.ellips(cx,15.4,1.3,2.2,'kofta','arm')
    for cx in (3.3,12.7): d.ellips(cx,17.4,1.0,0.9,'hud','hand')
    d.ellips(8,15.8,4.4,3.2,'kofta','kropp')
    if var=='A':
        d.ellips(8,7.0,6.6,6.0,'hjalm','hjalm',zbias=-0.12)
        d.ellips(8,8.7,5.0,3.9,'hud','ansikte',zbias=0.1)
        skilj(d,'ansikte','hjalm',ton=1)
    else:
        d.ellips(8,7.6,5.6,5.6,'hud','huvud',zbias=0.05)
        for cx in (2.8,13.2): d.ellips(cx,8,1.4,2.0,'skagg','har')
    d.ellips(8,12.2,3.6,2.6,'skagg','skagg',zbias=0.15)
    skilj(d,'skagg','kropp',ton=1); skilj(d,'kropp','arm',ton=1)
    d.kontur()
    for x in (6,10): d.fast(x,8,OGA)
    for x in range(5,12):
        if x not in (7,8,9): d.fast(x,8,GLAS) if x in (5,11) else None
    d.fast(5,8,GLAS); d.fast(7,8,GLAS); d.fast(9,8,GLAS); d.fast(11,8,GLAS)
    for x in (5,6,7,9,10,11): d.satt(x,7,'skagg',3) if x in (5,6,10,11) else None
    for x in range(6,11): d.satt(x,10,'skagg',3)
    d.fast(8,11,MUN) if False else None
    d.fast(8,15,'#C8963E'); d.fast(8,16,'#C83A3A')
    if var=='A': d.satt(8,0,'mass',3)
    return d.bild()
if __name__=='__main__':
    from PIL import ImageDraw, ImageFont
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
    BG=(232,214,180,255)
    out=Image.new('RGBA',(1060,560),(255,255,255,255)); dr=ImageDraw.Draw(out)
    for r,var in enumerate('AB'):
        y=r*280+30
        dr.text((10,y-24),{'A':'A: hjälmen som hjältens, gammal och bucklig, med en lampa','B':'B: utan hjälm, skallig med vitt hår på sidorna'}[var],fill=(0,0,0),font=f)
        for i,ut in enumerate(('glad','fundersam')):
            p=portratt(var,ut); b=Image.new('RGBA',(48,48),BG); b.alpha_composite(p); out.paste(b.resize((240,240),Image.NEAREST),(10+i*250,y))
        fg=figur(var); b=Image.new('RGBA',(16,24),(196,150,98,255)); b.alpha_composite(fg); out.paste(b.resize((160,240),Image.NEAREST),(520,y))
        out.paste(b.resize((48,72),Image.NEAREST),(700,y)); out.paste(b,(770,y))
        hj=Image.open('/home/claude/hjalte2/ut/hjalte/hjalte_ga_ner_01.png').convert('RGBA'); b2=Image.new('RGBA',(36,26),(196,150,98,255)); b2.alpha_composite(hj,(2,1)); b2.alpha_composite(fg,(18,1))
        out.paste(b2.resize((216,156),Image.NEAREST),(830,y))
    out.save('val.png')

MAT['rock']=['#2A0E16','#5A1E2C','#7A2A3A','#9C4252','#C06A78']
def figur_natt():
    # B i morgonrock med en kopp kakao
    d=Duk(16,24)
    for cx in (6.0,10.0): d.ellips(cx,22.0,1.9,1.1,'kofta','sko',toner=(0,1,1,2))
    d.ellips(8,17.6,4.6,5.0,'rock','rock')
    for cx in (3.3,12.7): d.ellips(cx,15.4,1.4,2.3,'rock','arm')
    d.ellips(12.9,17.6,1.0,0.9,'hud','hand')
    d.ellips(8,7.6,5.6,5.6,'hud','huvud',zbias=0.05)
    for cx in (2.8,13.2): d.ellips(cx,8,1.4,2.0,'skagg','har')
    d.ellips(8,12.2,3.6,2.6,'skagg','skagg',zbias=0.15)
    skilj(d,'skagg','rock',ton=1); skilj(d,'rock','arm',ton=1)
    d.kontur()
    d.fast(5,8,GLAS); d.fast(6,8,OGA); d.fast(7,8,GLAS); d.fast(9,8,GLAS); d.fast(10,8,OGA); d.fast(11,8,GLAS)
    for x in (5,6,10,11): d.satt(x,7,'skagg',3)
    for x in range(6,11): d.satt(x,10,'skagg',3)
    # skärp och kopp
    for x in range(5,12):
        if d.px.get((x,18),('',0))[0]=='rock': d.satt(x,18,'rock',4)
    for (x,y,c) in [(13,15,'#F2F4F6'),(14,15,'#F2F4F6'),(13,16,'#DCE0E4'),(14,16,'#DCE0E4'),(15,15,'#B8BEC6'),(13,14,'#6B4630'),(14,14,'#8A6044')]:
        d.fast(x,y,c)
    return d.bild()
