# Fas 4: hjälten sover i sängen, sitter i fåtöljen och på en stol, klättrar på stegen; Farfar i fåtöljen.
import os
from PIL import Image
exec(open('hus.py').read().rsplit("if __name__=='__main__':",1)[0])
LD=lambda p: Image.open(p).convert('RGBA')
H='/home/claude/hjalte2/ut/hjalte/'
hud=['#0E2A5A','#1E5FA8','#2E8BD8','#5FB4E8','#A8DCF8']
MAT['hud']=hud; MAT['hjalm']=['#2A2E38','#6E737C','#9AA0AA','#C4C9D0','#E8ECF0']
EYE='#101C1C'

def sovhuvud(f=0):
    # hjälten sover: blått ansikte på kudden, slutna ögon, nöjd mun. Hjälmen hänger på sängstolpen.
    d=Duk(14,12); d.ellips(7,6.5,5.6,4.6,'hud','ansikte',zbias=0.1); d.kontur(); im=d.bild(); px=im.load()
    for (x,y) in [(4,6),(5,6),(9,6),(10,6)]: px[x,y]=hx2(EYE)
    for (x,y) in [(6,8),(7,9),(8,8)]: px[x,y]=hx2('#0E2A5A')
    if f==1: px[11,2]=hx2('#FFFFFF')        # ett litet "z"-glitter ovanför när han andas ut (ingen bokstav)
    return im

def hjalm_pa_stolpe():
    d=Duk(12,10); d.ellips(6,6,5,4,'hjalm','hjalm',zbias=0.1); d.kontur(); return d.bild()

def i_sangen(bild):
    """0 = sätter sig på sängkanten, 1 = har krupit ned och drar upp täcket, 2-3 = sover och andas"""
    s=FOREMAL['sang'].copy()
    if bild==0:
        hj=LD(H+'hjalte_ga_ner_01.png'); s.alpha_composite(hj,(42,14))
        return s
    huv=sovhuvud(1 if bild==3 else 0)
    s.alpha_composite(huv,(13,6))
    d=Duk(64,44); MAT['tacke']=['#1E2E5A','#2A4A8A','#3E66AE','#6A8ED0','#A8C4F0']
    lyft=1 if bild==3 else 0
    d.ellips(33,31-lyft,27,10+lyft,'tacke','tacke',platt=0.7); d.kontur(); t=d.bild()
    s2=FOREMAL['sang'].copy(); px=s2.load()
    s2.alpha_composite(huv,(13,6)); s2.alpha_composite(t,(0,0))
    if bild==1:
        for y in range(22,32):                                  # täckets kant uppvikt
            for x in range(8,14):
                if s2.getpixel((x,y))[3]: px[x,y]=hx2('#A8C4F0' if x==8 else '#6A8ED0')
    s2.alpha_composite(hjalm_pa_stolpe(),(50,0))
    return s2

def sittande(kalla):
    # överkroppen ur gångbilden framifrån, med benen framåt: huvud och bål (rad 0-16) och två fötter längre ned
    im=Image.new('RGBA',(16,22),(0,0,0,0))
    im.alpha_composite(kalla.crop((0,0,16,17)),(0,0))
    fot=kalla.crop((0,19,16,24)); im.alpha_composite(fot,(0,17))
    return im

def i_fatolj(figur,spegel=False):
    f=FOREMAL['fatolj_hoger' if spegel else 'fatolj_vanster'].copy()
    s=sittande(figur)
    f.alpha_composite(s,(7,3))
    # armstöden framför figuren
    arm=FOREMAL['fatolj_hoger' if spegel else 'fatolj_vanster'].copy(); ap=arm.load()
    for y in range(arm.height):
        for x in range(arm.width):
            if 8<=x<=21: ap[x,y]=(0,0,0,0)
    f.alpha_composite(arm)
    return f

def stol():
    im=bild(16,22); px=im.load()
    for y in range(0,12):
        for x in (2,13): px[x,y]=hx2(TRA[3]);
    for x in range(2,14): px[x,1]=hx2(TRA[4]); px[x,5]=hx2(TRA[2])
    rekt(px,1,11,14,15,TRA[3],TRA[0])
    for x in (2,3,12,13):
        for y in range(16,22): px[x,y]=hx2(TRA[1])
    return im

def pa_stol(figur):
    s=stol(); im=bild(16,26); im.alpha_composite(s,(0,4))
    im.alpha_composite(sittande(figur),(0,0))
    sits=bild(16,26); sp=sits.load()
    for x in range(1,15):
        for y in range(15,20): sp[x,y]=s.getpixel((x,y-4)) if s.getpixel((x,y-4))[3] else (0,0,0,0)
    im.alpha_composite(sits)
    return im

def klattra(f):
    hj=LD(H+f'hjalte_ga_upp_0{1 if f==0 else 3}.png').copy(); px=hj.load()
    # armarna uppåt i växelvis takt: en hand högre än den andra
    for (x,y) in ([(3,9),(3,10),(12,11)] if f==0 else [(12,9),(12,10),(3,11)]):
        px[x,y]=hx2(hud[2]); px[x,y-1]=hx2(hud[3])
    return hj

ff=LD('/home/claude/farfar/ut/farfar_natt_ner_01.png')

UT={f'hjalte_sang_{i+1:02d}':i_sangen(i) for i in range(4)}
UT['hjalte_fatolj_vanster']=i_fatolj(LD(H+'hjalte_ga_ner_01.png'))
UT['hjalte_stol_ner']=pa_stol(LD(H+'hjalte_ga_ner_01.png'))
UT['stol']=stol()
UT['hjalte_klattra_upp_01']=klattra(0); UT['hjalte_klattra_upp_02']=klattra(1)
if ff is not None: UT['farfar_fatolj_hoger']=i_fatolj(ff,spegel=True)
if __name__=='__main__':
    os.makedirs('ut/f4',exist_ok=True)
    for n,im in UT.items(): im.save(f'ut/f4/{n}.png')
    W_=sum(im.width+6 for im in UT.values())+6
    ark=Image.new('RGBA',(W_,50),(138,92,48,255)); x=6
    for n,im in UT.items(): ark.alpha_composite(im,(x,48-im.height)); x+=im.width+6
    ark.resize((W_*4,200),Image.NEAREST).save('f4_x4.png')
