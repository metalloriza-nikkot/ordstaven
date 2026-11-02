exec(open('hjalte.py').read().split("if __name__")[0])
def lysa(h,k):
    r,g,b=hx(h); return '#%02X%02X%02X'%tuple(int(v+(255-v)*k) for v in (r,g,b))
KALL=['#F2A0C0','#6EC6E6','#3A7AD8']; VARM=['#F2D22E','#F08A2A','#D83A2E']
BARK=['#7A7888','#2A2830','#121016']  # vänster kant ljus, mitt, höger mörk
GULD='#FFD95A'
def stav(x,y,lucka=set(),spegelkant=False):
    im=Image.new('RGBA',(16,24),(0,0,0,0))
    for r in range(18):
        for c in range(3):
            cc=2-c if spegelkant else c
            if r<3: col=KALL[r]; col=lysa(col,0.35) if cc==0 else (col if cc==1 else lysa(col,-0) )
            elif r>=15: col=VARM[r-15]; col=lysa(col,0.35) if cc==0 else col
            else:
                col=BARK[cc]
                if cc==1 and r in (8,9): col=GULD
                if cc==0 and r==6: col='#4A4856'   # knölen
            if (r in (0,17)) and c!=1: continue
            if r in (0,17) and False: pass
            yy=y+r
            if yy in lucka: continue
            if 0<=x+c<16 and 0<=yy<24: im.putpixel((x+c,yy),hx(col)+(255,))
    # mörk ände-kontur så ändarna inte flyter
    return im
def stav_ner(): return stav(1,3,{16,17})
def stav_upp(): return stav(12,3,{16,17},spegelkant=True)
def stav_hoger():
    im=stav(13,3,set(),spegelkant=True)
    H=MAT['hud']
    for (xx,yy,t) in [(10,16,2),(11,16,3),(12,16,3),(13,16,3),(14,16,2),(10,17,1),(11,17,2),(12,17,2),(13,17,2),(14,17,1),(15,16,0),(15,17,0),(11,18,0),(12,18,0),(13,18,0),(14,18,0),(11,15,0),(12,15,0),(13,15,0),(14,15,0)]:
        im.putpixel((xx,yy),hx(H[t])+(255,))
    return im
STAV={'ner':stav_ner(),'hoger':stav_hoger(),'upp':stav_upp()}
STAV['vanster']=STAV['hoger'].transpose(Image.FLIP_LEFT_RIGHT)
if __name__=='__main__':
    r=rader(); S=10; GR=(104,160,72,255)
    out=Image.new('RGBA',(4*(16*S+10),2*(24*S+10)),(255,255,255,255))
    for row,bgc in enumerate([GR,(38,44,70,255)]):
        for i,n in enumerate(['ner','hoger','upp','vanster']):
            bg=Image.new('RGBA',(16,24),bgc); bg.alpha_composite(skugga(16,24,8,22.6,5.5,1.3)); bg.alpha_composite(r[n][0]); bg.alpha_composite(STAV[n])
            out.paste(bg.resize((16*S,24*S),Image.NEAREST),(i*(16*S+10),row*(24*S+10)))
    out.save('stavprov2.png')
