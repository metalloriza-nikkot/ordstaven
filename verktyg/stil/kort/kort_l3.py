# Baronens lapp i L3 (kapitel 1 v0.7.4, granskningen A 2, Stil 2026-11-03): "SKATA! JAG VÄNTAR BAKOM BUSKEN VID BRON."
# Tre bildkort som bara skiljer i var tropikhjälmen är: bakom busken, på bron och under bron. Bron och busken är
# likadana på alla tre, så att bara lägesordet avgör. 48 x 48, ingen text.
import os
from PIL import Image
LD=lambda p: Image.open(p).convert('RGBA')
BRO=LD('/home/claude/kort/ut/bro.png'); BUSKE=LD('/home/claude/rutor/ut/foremal/buske.png'); HJALM=LD('/home/claude/baron2/ut/baronen_hjalm.png')
def hx2(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,)
def kort(lage):
    im=BRO.copy()
    if lage=='bakom_busken':
        im.alpha_composite(HJALM,(2,23))                     # hjälmen bakom busken: bara kupolen och fjädern syns
        im.alpha_composite(BUSKE,(0,29))
    elif lage=='pa_bron':
        im.alpha_composite(BUSKE,(0,29))
        im.alpha_composite(HJALM,(15,9))                     # mitt uppe på bron, på räcket
    else:
        im.alpha_composite(BUSKE,(0,29))
        h=HJALM.copy(); hp=h.load()
        for y in range(9,12):                                # nedre kanten i vattnet
            for x in range(h.width):
                if hp[x,y][3]: hp[x,y]=hx2('#4F7AE8') if (x+y)%2 else hx2('#3A5AD8')
        p=im.load()
        for y in range(25,31):                               # skuggan under bron, ovanför hjälmen
            for x in range(12,37):
                if p[x,y][3] and p[x,y][2]>p[x,y][0]+40: p[x,y]=hx2('#2A4CA0') if y<28 else hx2('#3A5AD8')
        im.alpha_composite(h,(16,28))                        # under brovalvet, i vattnet
        p=im.load()
        for (x,y) in [(14,39),(15,39),(34,39),(35,39)]: p[x,y]=hx2('#9AB6FF')   # små ringar på vattnet
    return im
UT={f'bildkort/{k}.png':kort(k) for k in ('bakom_busken','pa_bron','under_bron')}
if __name__=='__main__':
    os.makedirs('/home/claude/kort/ut2/bildkort',exist_ok=True)
    for k,v in UT.items(): v.save('/home/claude/kort/ut2/'+k)
    s=Image.new('RGBA',(3*52,52),(245,236,215,255))
    for i,v in enumerate(UT.values()): s.alpha_composite(v,(i*52+2,2))
    s.resize((s.width*5,s.height*5),Image.NEAREST).save('/tmp/l3.png')
