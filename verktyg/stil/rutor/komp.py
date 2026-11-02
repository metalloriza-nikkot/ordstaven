# Gläntan av rutor + föremål + figurer, för att jämföra med stilprovet.
exec(open('bygg_glanta.py').read())
exec(open('objekt.py').read().split("if __name__=='__main__':")[0])
LD=lambda p: Image.open(p).convert('RGBA')
F=FOREMAL; OBJ=[]
def o(n_or_im,ox,oy,ow,oh,skugg=True):
    im=F[n_or_im] if isinstance(n_or_im,str) else n_or_im
    x=ox+ow/2-im.width/2; y=oy+oh-im.height      # bilden står med foten mitt på objektets nederkant
    OBJ.append((oy+oh,im,int(x),int(y),skugg))
o('trad_stort_ungt',120,30,24,40); o('trad_stort_gammalt',264,48,28,40); o('trad_litet_gammalt',40,120,20,28)
o('apans_trad',100,220,40,40)
o('apans_bo',40,200,56,36,False); o('fossil',52,206,16,12)
for (x,y) in [(352,40),(416,40),(352,96),(416,96)]: o('lovhog',x,y,24,16)
o('last_lada',464,100,20,14); o('rothal',480,40,16,12,False); o('baronens_lapp',440,70,14,10,False)
o('skylt_farfar',176,120,16,14); o('tavla_bron',600,128,16,12); o('buske',612,172,20,16)
o('trappa_vast',298,56,30,26,False)
o('bro',568,150,72,16,False)
for x in (330,380,430,480,520): o('trad_rida',x,-16,40,26)
def skugg(cx,cy,rx,ry):
    p=img.load()
    for y in range(int(cy-ry),int(cy+ry)+1):
        for x in range(int(cx-rx),int(cx+rx)+1):
            if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1 and 0<=x<img.width and 0<=y<img.height:
                r,g,b,a=p[x,y]; p[x,y]=(int(r*0.72),int(g*0.72),int(b*0.72),255)
for yb,im,x,y,sk in sorted(OBJ,key=lambda t:(t[1] is not F['trappa_vast'] and t[1] is not F['bro'],t[0])):
    if sk: skugg(x+im.width/2,y+im.height-2,im.width*0.36,3)
    img.alpha_composite(im,(x,y))
apa=LD('/home/claude/apa/ut/apa_hanga_01.png'); img.alpha_composite(apa,(151,203))
sk16=LD('/home/claude/hjalte2/ut/skugga/skugga_16x24.png'); sk24=LD('/home/claude/hjalte2/ut/skugga/skugga_24x24.png')
h=Image.new('RGBA',(16,24),(0,0,0,0)); h.alpha_composite(LD('/home/claude/hjalte2/ut/hjalte/hjalte_ga_upp_01.png')); h.alpha_composite(LD('/home/claude/hjalte2/ut/stav/stav_hand_upp_01.png'))
img.alpha_composite(sk16,(292,288)); img.alpha_composite(h,(292,288))
img.alpha_composite(sk24,(266,292)); img.alpha_composite(LD('/home/claude/unge2/ut/unge1_ga_hoger_01.png'),(266,292))
img.alpha_composite(LD('/home/claude/skata2/ut/herr_skata_sitta_hoger_01.png'),(268,36))
img.alpha_composite(OMGIVNING['fjaril_01'],(70,190))
img.alpha_composite(OMGIVNING['fagel_sitta_01'],(220,40)); img.alpha_composite(OMGIVNING['fagel_sitta_02'],(232,43))
img.save('ut/glanta_komplett.png')
img.resize((img.width*2,img.height*2),Image.NEAREST).save('ut/glanta_komplett_x2.png')
img.crop((150,170,470,362)).resize((960,576),Image.NEAREST).save('ut/glanta_skarm_x3.png')
