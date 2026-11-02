# Herr Skata utanför vindens runda fönster (prologen s05): fladdrar fram, tittar in på ljuset med en glimt i ögat,
# skrattar och flyger iväg. Varje bild är hela fönstret (28 x 22) och ersätter runt_fonster medan det händer.
import os
from PIL import Image
exec(open('hus.py').read().rsplit("if __name__=='__main__':",1)[0])
src=open('/home/claude/skata2/skata.py').read()
g={}; exec(src.rsplit("if __name__",1)[0].replace("open('pix.py')","open('/home/claude/skata2/pix.py')"),g)
SK=g['B']
NATT=('#4A5E96','#36487A')
def fonster_natt(stjarna=True):
    im=fonster(28,22,rund=True); px=im.load(); cx,cy=14,11
    for y in range(22):
        for x in range(28):
            dx=(x+0.5-cx)/14; dy=(y+0.5-cy)/11; r=dx*dx+dy*dy
            if r<=0.62: px[x,y]=hx2(TRA[2] if (x==14 or y==11) else (NATT[0] if y<cy else NATT[1]))
    if stjarna: px[9,6]=hx2('#F4F0D0'); px[19,5]=hx2('#BFE3EF')
    return im
def glas(x,y):
    dx=(x+0.5-14)/14; dy=(y+0.5-11)/11; return dx*dx+dy*dy<=0.62
def med_skata(bas,fagel,ox,oy,spegel=False,glimt=None,skratt=False):
    im=bas.copy(); f=fagel.transpose(Image.FLIP_LEFT_RIGHT) if spegel else fagel
    lager=Image.new('RGBA',im.size,(0,0,0,0)); lager.alpha_composite(f,(ox,oy)); lp=lager.load()
    for y in range(22):
        for x in range(28):
            if not glas(x,y): lp[x,y]=(0,0,0,0)        # bara det som syns genom glaset
    im.alpha_composite(lager)
    # spröjsen ligger framför fågeln
    for y in range(22):
        for x in range(28):
            if glas(x,y) and (x==14 or y==11): im.putpixel((x,y),hx2(TRA[2]))
    p=im.load()
    if glimt: p[glimt]=hx2('#FFFFFF')
    if skratt:
        gx,gy=glimt; p[gx+2,gy+2]=hx2('#3A3A44'); p[gx+3,gy+3]=hx2('#3A3A44')   # näbben öppen
    return im
def skrattar(n):
    # huvudet bakåt och upp, näbben öppen
    im=med_skata(n,SK['sitta'],4,0); p=im.load()
    p[4,5]=hx2(NATT[0]); p[3,6]=hx2('#2A2E38'); p[4,6]=hx2('#2A2E38'); p[3,4]=hx2('#2A2E38')
    p[7,2]=hx2('#C4C9D0'); p[8,2]=hx2('#C4C9D0')
    return im
n=fonster_natt()
UT={
 'runt_fonster_natt':n,
 'runt_fonster_skata_01':med_skata(n,SK['flyga1'],14,2),          # fladdrar fram från höger
 'runt_fonster_skata_02':med_skata(n,SK['flyga2'],8,4),
 'runt_fonster_skata_03':med_skata(n,SK['titta'],4,1,glimt=(7,3)),             # tittar in, glimt i ögat
 'runt_fonster_skata_04':skrattar(n), # skrattar
 'runt_fonster_skata_05':med_skata(n,SK['flyga1'],-2,1,spegel=True),            # flyger iväg åt vänster
}
if __name__=='__main__':
    os.makedirs('ut/skata_fonster',exist_ok=True)
    for k,v in UT.items(): v.save(f'ut/skata_fonster/{k}.png')
    a=Image.new('RGBA',(6*34,28),(90,62,36,255)); x=3
    for v in UT.values(): a.alpha_composite(v,(x,3)); x+=34
    a.resize((a.width*6,a.height*6),Image.NEAREST).save('skata_fonster_x6.png')
