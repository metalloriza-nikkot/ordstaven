exec(open('baron.py').read().replace("if __name__=='__main__':","if False:"))
import os
from PIL import ImageDraw, ImageFont
r=rader()
GR=(104,160,72,255); f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
LD=lambda p: Image.open(p).convert('RGBA')
sk24=skugga(24,24,12,22.4,7.5,1.5)
out=Image.new('RGBA',(1010,430),(255,255,255,255)); d=ImageDraw.Draw(out)
d.text((10,6),'Baronen, fyra riktningar (x8)',fill=(0,0,0),font=f)
for i,n in enumerate(['ner','hoger','upp','vanster']):
    b=Image.new('RGBA',(24,24),GR); b.alpha_composite(sk24); b.alpha_composite(r[n][0]); out.paste(b.resize((192,192),Image.NEAREST),(10+i*200,28))
b=Image.new('RGBA',(20,14),GR); b.alpha_composite(hjalm_foremal(),(1,1)); out.paste(b.resize((160,112),Image.NEAREST),(820,28)); d.text((820,146),'Hjälmen som föremål',fill=(0,0,0),font=f)
hjalm_foremal().save('ut/baronen_hjalm.png')
sk16=LD('/home/claude/hjalte2/ut/skugga/skugga_16x24.png')
def hj(n):
    t=Image.new('RGBA',(16,24),(0,0,0,0)); t.alpha_composite(sk16); t.alpha_composite(LD(f'/home/claude/hjalte2/ut/hjalte/hjalte_ga_{n}_01.png')); t.alpha_composite(LD(f'/home/claude/hjalte2/ut/stav/stav_hand_{n}_01.png')); return t
def un(n):
    t=Image.new('RGBA',(24,24),(0,0,0,0)); t.alpha_composite(LD('/home/claude/hjalte2/ut/skugga/skugga_24x24.png')); t.alpha_composite(LD(f'/home/claude/unge2/ut/unge1_ga_{n}_01.png')); return t
sc=Image.new('RGBA',(110,32),GR)
sc.alpha_composite(un('hoger'),(4,6)); sc.alpha_composite(hj('hoger'),(30,4)); b2=Image.new('RGBA',(24,24),(0,0,0,0)); b2.alpha_composite(sk24); b2.alpha_composite(r['vanster'][0]); sc.alpha_composite(b2,(72,4))
d.text((10,232),'Med hjälten och ungen, i spelets storlek (x1 och x3)',fill=(0,0,0),font=f)
out.paste(sc,(10,256)); out.paste(sc.resize((330,96),Image.NEAREST),(140,256))
out=out.crop((0,0,1010,362)); out.save('/mnt/user-data/outputs/baronen_v1.png')
fr=[]
for n in ['ner','hoger','upp','vanster']:
    for k in range(2):
        for i in range(4):
            t=Image.new('RGBA',(24,24),GR); t.alpha_composite(sk24); t.alpha_composite(r[n][i]); fr.append(t.resize((168,168),Image.NEAREST).convert('P'))
fr[0].save('/mnt/user-data/outputs/baronen_gang.gif',save_all=True,append_images=fr[1:],duration=150,loop=0)
print('ok')
