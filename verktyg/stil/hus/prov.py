exec(open('hus.py').read().rsplit("if __name__=='__main__':",1)[0])
def komp(rum,plac):
    im=rum_bild(rum); m=json.load(open(KART+rum+'.tmj'))
    obj={o['name']:o for o in m['layers'][0]['objects']}
    for namn,bildnamn in plac:
        o=obj[namn]; b=FOREMAL[bildnamn]
        x=int(o['x']+o['width']/2-b.width/2); y=int(o['y']+o['height']-b.height)
        im.alpha_composite(b,(x,y))
    return im
k=komp('kontoret',[('bokhylla','bokhylla'),('expeditionsbok','expeditionsbok'),('fatolj_vanster','fatolj_vanster'),('fatolj_hoger','fatolj_hoger'),('bord','bord'),('kakaokopp','kakaokopp'),('laslampa','laslampa'),('dorr_hallen','dorr_fram')])
v=komp('vinden',[('hylla','hylla'),('lada_hyllan','lada_liten'),('lada_fonstret','lada_lag'),('lada_med_agg','lada_stor'),('lada_med_stav','lada_rod'),('lada_lang_overst','lada_gul'),('lada_lang_mitten','lada_rod'),('lada_lang_nederst','lada_bla'),('sex_krukor','sex_krukor'),('lada_hornet','lada_hornet'),('stege_ner','stege_ner')])
h=komp('hallen',[('dorr_farfar','dorr'),('dorr_bok','dorr'),('dorr_mat','dorr'),('dorr_bad','dorr'),('dorr_sov','dorr_fram'),('dorr_ut','dorr_fram_ute'),('stege_upp','stege_upp')])
s=komp('sovrummet',[('sang','sang'),('dorr_hallen','dorr')]); s.alpha_composite(FOREMAL['fonster_fram'],(60,176))
kk=komp('koket',[('radio','radio'),('bord_med_saker','bord_med_saker'),('dorr_hallen','dorr_fram')])
ark=Image.new('RGBA',(320*2+8,192*2+8+192+8),(20,16,12,255))
ark.alpha_composite(k,(0,0)); ark.alpha_composite(v,(328,0)); ark.alpha_composite(s,(0,200)); ark.alpha_composite(kk,(328,200)); ark.alpha_composite(h.crop((0,0,448,192)),(0,400))
v.alpha_composite(Image.open('ut/skata_fonster/runt_fonster_skata_03.png'),(96,6)); ark.alpha_composite(v,(328,0))
ark.resize((ark.width*2,ark.height*2),Image.NEAREST).save('rum_prov_x2.png')
