from PIL import Image
import glob
U='/home/claude/bybor/ut/'
g=sorted(glob.glob(U+'foremal/trask/groda_*'))
o=Image.new('RGBA',(8*24+4,2*20+4),(46,110,150,255))
for i,f in enumerate(g): o.alpha_composite(Image.open(f),(2+(i//2)*24,2+(i%2)*20))
o.resize((o.width*6,o.height*6),Image.NEAREST).save('/tmp/grodor.png')
k=sorted(glob.glob(U+'bildkort/*'))
o=Image.new('RGBA',(len(k)*50,50),(250,246,236,255))
for i,f in enumerate(k): o.alpha_composite(Image.open(f),(1+i*50,1))
o.resize((o.width*3,o.height*3),Image.NEAREST).save('/tmp/kort.png')
f=['lykta_slackt','lykta_slackt_kvall','lykta_tand_kvall','lagereld_slackt','lagereld_slackt_kvall','lagereld_tand_kvall_01','lagereld_tand_kvall_02','lagereld_tand_kvall_03','vedpinne','vedpinne_kvall']
o=Image.new('RGBA',(len(f)*28,30),(60,64,90,255))
x=2
for n in f:
    im=Image.open(U+f'foremal/trask/{n}.png'); o.alpha_composite(im,(x,28-im.height)); x+=im.width+4
o.resize((o.width*6,o.height*6),Image.NEAREST).save('/tmp/fore.png')
