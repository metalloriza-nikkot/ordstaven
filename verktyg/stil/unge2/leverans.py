exec(open('unge.py').read().replace("visa()\n",""))
from PIL import ImageDraw, ImageFont
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
GR=(104,160,72,255)
def pa(im):
    bg=Image.new('RGBA',(24,24),GR); bg.alpha_composite(skugga(cx=12,cy=21.3,rx=9,ry=1.8)); bg.alpha_composite(im); return bg
nya=[ner(),hoger(),upp(),hoger().transpose(Image.FLIP_LEFT_RIGHT)]
gamla=[Image.open(f'/home/claude/unge/ut/unge1_ga_{n}_01.png') for n in ('ner','hoger','upp','vanster')]
S=8
BR=4*(24*S+12)+12
out=Image.new('RGBA',(BR,24*S*2+150),(255,255,255,255)); d=ImageDraw.Draw(out)
d.text((12,6),'Nytt: snett uppifrån, fyra toner per färg, kontur i figurens egen mörka färg, skugga under',fill=(0,0,0),font=f)
for i,im in enumerate(nya): out.paste(pa(im).resize((24*S,24*S),Image.NEAREST),(12+i*(24*S+12),28))
y=28+24*S+30
d.text((12,y-22),'Förra försöket',fill=(0,0,0),font=f)
for i,im in enumerate(gamla): out.paste(pa(im).resize((24*4,24*4),Image.NEAREST),(12+i*(24*4+12),y))
d.text((470,y-22),'Spelets storlek (x1 och x2)',fill=(0,0,0),font=f)
for i,im in enumerate(nya):
    out.paste(pa(im),(470+i*30,y)); out.paste(pa(im).resize((48,48),Image.NEAREST),(470+i*56,y+34))
out=out.crop((0,0,BR,y+24*4+12)); out.save('unge_v2.png')
fr=[]
for fn in (ner,hoger,upp):
    for k in range(3):
        for i in range(4): fr.append(pa(fn(i)).resize((192,192),Image.NEAREST).convert('P'))
fr[0].save('unge_v2_gang.gif',save_all=True,append_images=fr[1:],duration=140,loop=0)
