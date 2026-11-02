exec(open('anim.py').read())
def spegla(lista): return [i.transpose(Image.FLIP_LEFT_RIGHT) for i in lista]
A={}
# Tomgång: andas (in/ut) + blinka
A['tomgang_ner']=[ner(), ner(dk=-1,dh=(0,-1))]
A['tomgang_hoger']=[hoger(), hoger(dk=-1,dh=(0,-1))]
A['tomgang_upp']=[upp(), upp(dk=-1,dh=(0,-1))]
A['blinka_ner']=[ner(oga_t='stangd')]
A['blinka_hoger']=[hoger(oga_t='stangd')]
# Glad hopp: huk, hopp, landa
A['glad_ner']=[ner(dk=1,dh=(0,1),oga_t='glad',mun='oppen'), lyft_bild(ner(oga_t='glad',mun='oppen',lyft_fot=(0,1)),2), ner(oga_t='glad',mun='le')]
A['glad_hoger']=[hoger(dk=1,dh=(0,1),oga_t='glad',mun='oppen'), lyft_bild(hoger(f=1,oga_t='glad',mun='oppen'),2), hoger(oga_t='glad')]
# Lutar huvudet, frågande
A['fragar_ner']=[ner(oga_t='upp',mun='o'), ner(oga_t='upp',mun='o',dh=(1,1))]
A['fragar_hoger']=[hoger(oga_t='upp',mun='o'), hoger(oga_t='upp',mun='o',dh=(0,1))]
# Kryper ihop, rädd (darrar)
A['radd_ner']=[ner(dk=2,dh=(0,2),oga_t='stora',mun='vagig'), darra(ner(dk=2,dh=(0,2),oga_t='stora',mun='vagig'),1)]
# Fnissar
A['fnissar_ner']=[ner(oga_t='glad',mun='oppen'), ner(oga_t='glad',mun='oppen',dk=1,dh=(0,1))]
# Nosar i marken
A['nosar_ner']=[ner(dh=(0,2),oga_t='stangd',mun='le'), ner(dh=(0,3),oga_t='stangd',mun='le')]
A['nosar_hoger']=[hoger(dh=(0,2),oga_t='stangd'), hoger(dh=(0,3),oga_t='stangd')]
A['nosar_upp']=[upp(dh=(0,1)), upp(dh=(0,2))]
# Äter bär: gapar, tuggar, glad
A['ater_ner']=[ner(mun='gap',dh=(0,-1)), ner(mun='tugga',oga_t='glad'), ner(oga_t='glad',mun='le')]
# Gäspar och sover
A['gaspar_ner']=[ner(oga_t='stangd',mun='gap',dh=(0,-1)), ner(oga_t='stangd',mun='o')]
A['sover_ner']=[ner(dk=2,dh=(0,3),oga_t='stangd',mun='le',lyft_fot=()), ner(dk=1,dh=(0,3),oga_t='stangd',mun='le',lyft_fot=())]
# Pekar mot vägen: huvudet upp, en fot lyft
A['pekar_ner']=[ner(dh=(0,-1),lyft_fot=(0,))]
A['pekar_hoger']=[hoger(f=1,dh=(1,-1))]
A['pekar_upp']=[upp(f=1,dh=(0,-1))]
# Med nosmönstret tänt (kapitel 1): grundställning, gång och nosa
A['monster_ner']=[ner(monster=True)]
A['monster_hoger']=[hoger(monster=True)]
A['nosar_monster_ner']=[ner(dh=(0,2),oga_t='stangd',monster=True), ner(dh=(0,3),oga_t='stangd',monster=True)]
A['nosar_monster_hoger']=[hoger(dh=(0,2),oga_t='stangd',monster=True), hoger(dh=(0,3),oga_t='stangd',monster=True)]
# vänster = spegel av höger
for k in list(A):
    if k.endswith('_hoger'): A[k[:-6]+'_vanster']=spegla(A[k])
