exec(open('/home/claude/skata2/skata.py').read().rsplit("\nif __name__",1)[0].replace("exec(open('pix.py').read())","exec(open('/home/claude/skata2/pix.py').read())"))
from PIL import Image
LAPP=['#B85E22','#F6DCC3']
def ruta(im,dx=0,dy=0,W_=20,H_=16):
    ut=Image.new('RGBA',(W_,H_),(0,0,0,0)); ut.alpha_composite(im,(dx,dy)); return ut
def fjader(im,pts,col=(0xF2,0xF3,0xF0,255),col2=(0x23,0x26,0x2D,255)):
    for i,(x,y) in enumerate(pts): im.putpixel((x,y),col if i%2 else col2)
    return im
def lapp(im,x,y):
    for (a,b,c) in [(0,0,1),(1,0,1),(2,0,1),(0,1,1),(1,1,0),(2,1,1),(0,2,1),(1,2,1),(2,2,1)]:
        h=LAPP[c]; im.putpixel((x+a,y+b),tuple(int(h[i:i+2],16) for i in (1,3,5))+(255,))
    return im
def yr_oga(im,x,y):
    # snurriga ögon: vit pixel blir ett litet kors i grått
    for (a,b) in [(0,0),(1,0),(0,1),(-1,0),(0,-1)]:
        if 0<=x+a<im.width and 0<=y+b<im.height and im.getpixel((x+a,y+b))[3]: im.putpixel((x+a,y+b),(200,206,214,255))
    im.putpixel((x,y),(255,255,255,255)); return im
K=[]
# 1: flyger in mot stammen (vänster), med lappen i näbben
f1=ruta(flyga(False),2,2); lapp(f1,0,9); K.append(f1)
# 2: plattad mot stammen: hopklämd på bredden, snurriga ögon
pl=sitta().resize((10,12),Image.NEAREST); f2=ruta(pl,0,2); yr_oga(f2,2,5); K.append(f2)
# 3: studsar och trillar, upp och ned, fjädrar yr
f3=ruta(sitta().transpose(Image.FLIP_TOP_BOTTOM),3,3); fjader(f3,[(1,1),(18,2),(10,0),(17,14)]); K.append(f3)
# 4: sitter och ruskar på sig, lappen faller
f4=ruta(sitta(True),2,4); fjader(f4,[(9,2),(14,3),(1,6)]); lapp(f4,4,13); K.append(f4)
if __name__=='__main__':
    GR=(104,160,72,255)
    out=Image.new('RGBA',(4*210,170),(255,255,255,255))
    for i,im in enumerate(K):
        b=Image.new('RGBA',im.size,GR); b.alpha_composite(im); out.paste(b.resize((200,160),Image.NEAREST),(i*210,0))
    out.save('krasch1.png')
