exec(open('apa.py').read())
import sys
sys.path.insert(0,'/home/claude/unge2')
U={}; exec(open('/home/claude/unge2/anim.py').read().replace("exec(open('pix.py').read())","exec(open('/home/claude/unge2/pix.py').read())"),U)
TAGG=['#123A2A','#1E6A4A','#2E9A6A','#6ACB8E','#B8F0C8']
def taggkam_bild(w=10,h=4):
    im=Image.new('RGBA',(w,h),(0,0,0,0)); hxx=lambda c: tuple(int(c[i:i+2],16) for i in (1,3,5))+(255,)
    # fyra taggar med ljus topp, på en liten bas
    for x in range(1,w-1): im.putpixel((x,h-1),hxx(TAGG[1]))
    for i,x in enumerate(range(1,w-1,2)):
        im.putpixel((x,h-2),hxx(TAGG[2])); im.putpixel((x+1,h-2),hxx(TAGG[1]))
        im.putpixel((x,h-3),hxx(TAGG[3])); im.putpixel((x,h-4) if h>=4 else (x,0),hxx(TAGG[4]))
    return im
A={}
A['hanga']=[nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='ledsen',tarar=True),0), nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='ledsen',tarar=True,oy=1),1)]
A['sprattla']=[nat(apa(armV=(3.0,8.0),armH=(13.0,11.5),benV=(4.6,14.0),benH=(11.4,14.6),mun='oppen',tarar=True),-1),
               nat(apa(armV=(3.0,11.5),armH=(13.0,8.0),benV=(5.0,14.6),benH=(11.0,14.0),mun='oppen',tarar=True),1)]
A['glida']=[nat(apa(armV=(4.5,8.5),armH=(11.5,8.5),mun='grimas',oga_t='knip',oy=2),0),
            nat(apa(armV=(3.5,12.5),armH=(12.5,12.5),mun='grimas',oga_t='knip').transpose(Image.FLIP_TOP_BOTTOM),1)]
A['klattra']=[bak(armV=(3.2,8.5),armH=(12.8,11.5),benV=(5.6,14.4),benH=(10.4,13.4)), bak(armV=(3.2,11.5),armH=(12.8,8.5),benV=(5.6,13.4),benH=(10.4,14.4))]
A['vinka']=[apa(armV=(2.6,8.0),oga_t='glad',mun='oppen'), apa(armV=(1.8,7.2),oga_t='glad',mun='oppen')]
def med_tagg(ap,dy):
    im=Image.new('RGBA',(16,20),(0,0,0,0)); im.alpha_composite(ap,(0,4)); im.alpha_composite(taggkam_bild(),(3,0+dy)); return im
A['taggkam']=[med_tagg(apa(armV=(4.6,9.0),armH=(11.4,9.0),oga_t='glad',mun='le',oy=0),1), med_tagg(apa(armV=(4.2,8.0),armH=(11.8,8.0),oga_t='glad',mun='oppen'),0)]
def kram(dy):
    im=Image.new('RGBA',(32,24),(0,0,0,0))
    un=U['ner'](oga_t='glad',mun='le'); im.alpha_composite(un,(0,0))
    ap=apa(armV=(1.6,10.0),armH=(12.8,11.5),oga_t='glad',mun='le',oy=dy)
    im.alpha_composite(ap,(15,7))
    return im
A['krama']=[kram(0),kram(-1)]
if __name__=='__main__':
    from PIL import ImageDraw, ImageFont
    f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
    GR=(104,160,72,255); S=6
    out=Image.new('RGBA',(3*(32*S+20),((len(A)+2)//3)*(26*S+30)),(255,255,255,255)); d=ImageDraw.Draw(out)
    for i,(k,fr) in enumerate(A.items()):
        cx=(i%3)*(32*S+20)+8; cy=(i//3)*(26*S+30)+20
        d.text((cx,cy-16),k,fill=(0,0,0),font=f)
        x=cx
        for im in fr:
            b=Image.new('RGBA',im.size,GR); b.alpha_composite(im); b=b.resize((im.width*S//2*1,im.height*S//2),Image.NEAREST)
            out.paste(b,(x,cy)); x+=b.width+6
    out.save(sys.argv[1])
