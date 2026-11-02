# Småfigurerna (beslut 26.3, kapitel 1 v0.7.3): ekorren på grenen som knäcker en nöt och ungen som nyser,
# ugglorna som vrider huvudet och ungen som blir yr.
import os
from PIL import Image
src=open('/home/claude/unge2/anim.py').read()
exec(src.replace("exec(open('pix.py').read())","exec(open('/home/claude/unge2/pix.py').read())"))
_oga=oga
def oga(d,x,y,typ='oppen'):
    if typ=='yr':      # snurriga ögon: en ring med ljus mitt
        for (a,b) in [(0,0),(1,0),(-1,1),(1,1),(-1,2),(0,2)]: d.fast(x+a,y+b,EYE)
        d.fast(x,y+1,W)
    elif typ=='knip':  # kniper ihop inför nysningen
        d.fast(x,y+1,EYE); d.fast(x+1,y+2,EYE); d.fast(x-1 if x>8 else x+2,y+2,EYE)
    else: _oga(d,x,y,typ)
s2=open('smat.py').read()
exec(s2[s2.index('MAT.update'):].split("if __name__")[0].replace("exec(open('pix.py').read())",""))

def ekorre_gren(bild):
    """0 = håller nöten vid munnen, 1 = knäcker den (skalbitar), 28 x 18 med grenen"""
    im=Image.new('RGBA',(28,18),(0,0,0,0)); p=lambda x,y,c: im.putpixel((x,y),hx(c)+(255,)) if 0<=x<28 and 0<=y<18 else None
    for x in range(28):                                   # grenen, rak med två kvistknölar
        for k,c in enumerate(['#24160C','#8A6038','#6A4626','#4A3018','#24160C']): p(x,13+k,c)
    for (x,y,c) in [(6,13,'#24160C'),(7,12,'#24160C'),(7,13,'#8A6038'),(20,17,'#3A2414'),(21,17,'#3A2414')]: p(x,y,c)
    for (x,y) in [(4,11),(5,10),(6,9),(22,11),(23,10)]: p(x,y,'#3E7634'); p(x+1,y,'#5E9440')   # två blad
    e=ekorre('sitta',huvud=0)
    im.alpha_composite(e,(9,2))
    if bild==0: im.alpha_composite(not_bild(),(9,7))         # nöten i tassarna under nosen
    if bild==1:
        for (x,y,c) in [(9,6,'#9C6A34'),(8,8,'#E0B07A'),(10,9,'#7A5024'),(7,5,'#E0B07A')]: p(x,y,c)
        p(12,6,EYE); p(13,6,EYE)                          # kniper med ögat när det knastrar
    return im

def skal(bild):
    # nötskalet som regnar ner på ungen, 12 x 12, 3 bilder
    im=Image.new('RGBA',(12,12),(0,0,0,0))
    pos=[[(3,1),(7,2),(5,4)],[(2,4),(8,5),(5,7)],[(3,8),(7,9),(5,11)]][bild]
    for i,(x,y) in enumerate(pos):
        c=['#9C6A34','#E0B07A','#7A5024'][i]; im.putpixel((x,y),hx(c)+(255,))
        if i<2: im.putpixel((x+1,y),hx('#7A5024')+(255,))
    return im

def uggla_vrid(vy):
    """vy: 'sida' (ett öga, näbben åt sidan) eller 'bak' (bakhuvudet), samma figur som ugglan"""
    d=Duk(10,12)
    d.ellips(5,7.6,3.8,3.8,'uggla','kropp')
    if vy=='sida': d.ellips(5,8.4,2.2,2.6,'krem','mage',toner=(1,2,2,3))
    d.ellips(5,4.2,3.8,3.0,'uggla','huvud')
    for (x,y,t) in [(2,1,3),(7,1,3),(2,2,2),(7,2,2)]: d.satt(x,y,'uggla',t,'ora')
    skilj(d,'huvud','kropp',ton=1)
    d.kontur()
    if vy=='sida':
        d.fast(7,3,'#F5E6A0'); d.fast(8,3,'#F5E6A0'); d.fast(7,4,'#F5E6A0'); d.fast(8,4,EYE); d.fast(9,5,'#E0B07A')
    else:
        for (x,y) in [(4,3),(5,4),(6,3),(4,5),(6,5)]: d.satt(x,y,'uggla',1)   # fjädermönster bak
    for (x,y) in [(3,11),(6,11)]: d.fast(x,y,'#C09060')
    return d.bild()

def yr_stjarnor(bild):
    # små stjärnor som snurrar över ungens huvud, vita och ljusblå (inte guld, som betyder rätt svar)
    im=Image.new('RGBA',(16,6),(0,0,0,0))
    pos=[(2,2),(8,0),(13,3)] if bild==0 else [(4,0),(10,3),(14,1)]
    for i,(x,y) in enumerate(pos):
        c='#FFFFFF' if i%2==0 else '#BFE3EF'
        for (a,b) in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
            if 0<=x+a<16 and 0<=y+b<6: im.putpixel((x+a,y+b),hx(c)+(255,))
    return im

def tippa(im,dx):
    ut=Image.new('RGBA',im.size,(0,0,0,0)); ut.alpha_composite(im,(dx,0)); return ut

UT={
 'ekorre_gren_01':ekorre_gren(0),'ekorre_gren_02':ekorre_gren(1),
 'efx_skal_01':skal(0),'efx_skal_02':skal(1),'efx_skal_03':skal(2),
 'unge1_nysa_ner_01':ner(oga_t='knip',mun='o',dh=(0,-1)),
 'unge1_nysa_ner_02':ner(oga_t='stangd',mun='gap',dh=(0,1)),
 'uggla_vrid_01':uggla_vrid('sida'),'uggla_vrid_02':uggla_vrid('bak'),
 'unge1_yr_ner_01':tippa(ner(oga_t='yr',mun='vagig',dh=(-1,0)),-1),
 'unge1_yr_ner_02':tippa(ner(oga_t='yr',mun='vagig',dh=(1,0)),1),
 'efx_yr_stjarnor_01':yr_stjarnor(0),'efx_yr_stjarnor_02':yr_stjarnor(1),
}
if __name__=='__main__':
    os.makedirs('ut_smafig',exist_ok=True)
    for n,im in UT.items(): im.save(f'ut_smafig/{n}.png')
    W_=sum(im.width+6 for im in UT.values())+6
    ark=Image.new('RGBA',(W_,30),(111,163,74,255)); x=6
    for n,im in UT.items(): ark.alpha_composite(im,(x,28-im.height)); x+=im.width+6
    ark.resize((W_*4,120),Image.NEAREST).save('smafig_x4.png')
