exec(open('anims.py').read())
from PIL import ImageDraw, ImageFont
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
GR=(104,160,72,255); sk=skugga(cx=12,cy=21.3,rx=9,ry=1.8)
visa=[k for k in A if not k.endswith('_vanster')]
S=4; cell=24*S+6
rows=[]
out=Image.new('RGBA',(4*(3*cell+20),((len(visa)+3)//4)*(cell+20)+10),(255,255,255,255)); d=ImageDraw.Draw(out)
for i,k in enumerate(visa):
    cx=(i%4)*(3*cell+20)+8; cy=(i//4)*(cell+20)+18
    d.text((cx,cy-15),k,fill=(0,0,0),font=f)
    for j,im in enumerate(A[k]):
        b=Image.new('RGBA',(24,24),GR); b.alpha_composite(sk); b.alpha_composite(im)
        out.paste(b.resize((24*S,24*S),Image.NEAREST),(cx+j*cell,cy))
out.save(__import__('sys').argv[1])
