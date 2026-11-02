exec(open('glanta.py').read().replace("img.save('mark.png')",""))
LD=lambda p: Image.open(p).convert('RGBA')
# västra klippkanten bredare
for y in range(0,130):
    if 56<=y<=84: continue
    for k in range(0,7):
        c=['#C8D86A','#B89A6A','#9A7A50','#866A44','#725A3A','#5E4A30','#4A3A26'][k]
        if (y*3+k*7)%11==0 and k>1: c='#3A2C1C'
        setp(316+k,y,c)
# gren och rep till nätet
for x in range(126,168): setp(x,203,'#4A3018'); setp(x,204,'#6A4626'); setp(x,202,'#24160C')
# figurer
apa=LD('/home/claude/apa/ut/apa_hanga_01.png'); img.alpha_composite(apa,(151,197))
sk16=LD('/home/claude/hjalte2/ut/skugga/skugga_16x24.png'); sk24=LD('/home/claude/hjalte2/ut/skugga/skugga_24x24.png')
def sätt(im,x,y,sk=None):
    if sk: img.alpha_composite(sk,(x,y))
    img.alpha_composite(im,(x,y))
hj=LD('/home/claude/hjalte2/ut/hjalte/hjalte_ga_upp_01.png'); st=LD('/home/claude/hjalte2/ut/stav/stav_hand_upp_01.png')
h=Image.new('RGBA',(16,24),(0,0,0,0)); h.alpha_composite(hj); h.alpha_composite(st); sätt(h,292,288,sk16)
sätt(LD('/home/claude/unge2/ut/unge1_ga_hoger_01.png'),266,292,sk24)
sätt(LD('/home/claude/skata2/ut/herr_skata_sitta_hoger_01.png'),262,30)
# fjäril och vattenglitter
fj=Image.new('RGBA',(7,6),(0,0,0,0))
for (x,y,c) in [(0,1,'#3A7AD8'),(1,0,'#8FB8F2'),(1,1,'#8FB8F2'),(2,1,'#F2A0C0'),(3,2,'#2A2F14'),(3,3,'#2A2F14'),(4,1,'#F2A0C0'),(5,0,'#8FB8F2'),(5,1,'#8FB8F2'),(6,1,'#3A7AD8'),(1,2,'#8FB8F2'),(5,2,'#8FB8F2')]: fj.putpixel((x,y),hx2(c))
img.alpha_composite(fj,(70,186))
img.save('glantan_stilprov.png')
img.resize((W*2,H*2),Image.NEAREST).save('glantan_stilprov_x2.png')
# en skärm i spelets storlek: 320 x 192 kring hjälten, x3
v=img.crop((150,170,470,362)); v.resize((960,576),Image.NEAREST).save('glantan_en_skarm_x3.png')
