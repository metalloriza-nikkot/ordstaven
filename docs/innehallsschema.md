# Innehållsschema – kapitel i format 2

Version 2.39 (2026-11-11). Ägs av teknikspåret.
2.39: **Hjälpens trappa med brickor** (Teknik 35, beslut 72.2 och 72.6). `forebild.visas: "andra_felet"` och `ledbild` gäller nu också P11 med brickor (SVÄRD i kapitel 1): bilden först, ledbilden efter första felet och förebilden efter två fel. Förebilden täcks vid nästa bricka och tänds igen vid nästa fel. Kontrollen varnar för `visas: "vid_fel"` i en P11, och för en P11 med `andra_felet` utan `ledbild` (72.6). En förebild som syns från början (LJUS i prologen) är som förut. Allt annat är oförändrat.
2.38: **Formlernas effekter spelas som regier, och kapitel 2:s nya mellanscener** (Teknik 34, beslut 71). En formels `effekt` och ett nästan-ords `effekt` som har en regi spelas i rummet, och då visas inte reaktionens text (`syns_redan`). Effekterna med regi är `svard_hugger_genom_vassen`, `litet_svard_kittlar_vassen`, `stocken_flyger_till_stranden`, `rep_till_ungen`, `bro_till_stocken`, `stege_till_stocken`, `ljuset_hoppar_mellan_lyktorna` och `en_liten_ljusprick`. Mellanscenens `bild` får `unge_hoppar_pa_stocken`, `unge_piper_pa_stocken`, `unge_hoppar_i_land`, `tant_rosa_nar_inte`, `byborna_jublar` och `elden_tands`. `unge_tas_av_bubblan` och `bubblan_spricker_unge_plumsar` finns inte längre (71.3), och `bara` med `bubbla_unge` bär inte ungen. Allt annat är tillägg.
2.37: **Slingan `byn`** (Stil 12, beslut 70.7) för byn och bryggan i kapitel 2, och ljudet `surr` (trollsländan) bland Stils 81 ljud. Allt är tillägg.
2.36: **Hjälpens trappa i formeln med tangentbordet och kapitel 2:s mellanscener** (Teknik 32, beslut 69). P11 med `skriv: tangentbord` får `forebild.visas: "andra_felet"`: förebilden syns först efter två fel (vilken sorts fel som helst), och före det tänds ingen bokstav ur svaret, inte heller av `nastan.tand` eller knuffen (knuffen får bilden att glimta). **`ledbild`** är en bild som tänds bredvid bilden efter första felet, till exempel `tankebubbla_bro` (en bro i ett moln). Med tangentbordet täcks förebilden alltid när han skriver första bokstaven och syns igen när fälten är tomma (titta, täck, skriv, kolla). Kontrollen varnar för en P11 med tangentbord utan `andra_felet`. Mellanscenens `bild` får `unge_sjunker` (ungen sjunker i det föremål som `unge_till` pekar på), `unge_dras_upp` och `luftskepp_river_brevet`. `{hjalte}` läses upp som `{unge}`. Allt är tillägg, filer i 2.35 gäller fortfarande.
2.35: **Stils mellanscener som regier och en bild på en reaktion** (Teknik 31, beslut 68.5). En mellanscen får `bild` med regins namn: `farfar_skriver`, `farfar_gaspar`, `unge_biter`, `stav_ristas`, `unge_lyssnar_upp`, `buske_prasslar`, `apa_suckar`, `unge_gaspar`, `unge_fnissar_mun`, `unge_kryper_ihop`, `unge_fnissar`, `unge_lyssnar`, `ekorre_knacker` och `ugglor_vrider` (`unge_lyssnar_<upp|ner|hoger|vanster>` går också). En reaktion får **`bild`**: `ekorre_skakar` visar ekorren som tittar upp vid kortet han valde och skakar på huvudet. Med `bild` visas inte texten. Läs- och skrivuppgifterna per pass räknar nu P11 (formeln) som avgörande (beslut 68.3). Allt är tillägg, filer i 2.34 gäller fortfarande.
2.34: **byborna och rollrösterna** (Teknik 20 del 5, beslut 67.5). Ett rum får **`bubblor`**: `{ "fiskaren": { "rep": "suck", "fri": "fisk" }, "barnet_drake": { "*": "hej" } }`, med figurens id, rummets tillstånd (eller `*` för alla) och ordet i bubblan. Ett tryck på figuren ger en vinkning och ordet i en bubbla i ca 2 s. Det läses inte upp och räknas inte som något. Kontrollen säger fel om figuren inte står i rummet eller rummet saknar tillståndet. `talare.rollrost` får **`tant`** (ljusare än Farfar, lite långsam) och **`barn`** (ljus och snabb). Allt är tillägg, filer i 2.33 gäller fortfarande.
2.33: **navet, `bara` mellan rummen och `lockar` i motorn** (Teknik 20 del 3). Ett pussel får **`tillstand_efter`**: rummets tillstånd när pusslet är löst (repen på torget faller när skyltarnas lögn är avslöjad). Hur motorn spelar navet står i *3e*. Allt är tillägg, filer i 2.32 gäller fortfarande.
2.32: **reaktionernas och knuffarnas text för den vuxne** (Teknik 30, beslut 67.3). En reaktion (`vid_ratt`, `vid_fel`, `vid_valj`, ett rimligt ord, `vid_annan_utgang`) och en knuff får **`syns_redan: true`**, och i ett klart kapitel är en reaktion eller knuff som visar sin text ett fel, som för mellanscenerna. **Farfar i dörren och ungen som springer** (67.2): mellanscenens `bild` får `farfar_i_dorren` och `farfar_gar_ut` (kartans punkt `regi_farfar`), och mellanscenen får **`unge_till`**. Allt är tillägg, filer i 2.31 gäller fortfarande.
2.31: **kapitel 2:s fält** (Teknik 20, rapporten 26 och beslut 64.2). Schemat och kontrollen känner dem, och motorn bygger dem i kapitel 2:s gråbox. Avsnittet *3e* nedan. Allt är tillägg, filer i 2.30 gäller fortfarande.
2.30: **mellanscenernas text för den vuxne** (Teknik 28, beslut 65). Mellanscenen får **`syns_redan: true`**: det som händer syns redan, och beskrivningen visas inte. Kapitlets och äventyrets **`meta.klart: true`** gör en beskrivning som visas till ett fel. Allt är tillägg, filer i 2.29 gäller fortfarande.
2.29: **musiken och ljuden** (27, beslut 64.5–64.6). **`musik`** på kapitlet, ett rum och en scen, och steget **`musik`** (avsnittet *3d* nedan). **`ljud`** på en reaktion (`vid_ratt`, `vid_fel`, `vid_valj`) och på en mellanscen. Allt är tillägg, filer i 2.28 gäller fortfarande.
2.28: **räddningens knuff** (P15, beslut 58.2) följer Innehålls regel i 04 v0.10 (avsnittet om P15 nedan). Inga nya fält.
2.27: **startskärmen och Farfars "Var var vi?"** (F1 och F2, beslut 61). Kapitlet får fältet **`var_var_vi`** (avsnittet *3c* nedan), och `aventyr.json` får orden **`gransnitt.fortsatt`** och **`gransnitt.nytt_aventyr`** under startskärmens knappar. Allt är tillägg, filer i 2.26 gäller fortfarande.
2.26: **rättelserna efter den sista genomspelningen** (Teknik 13). Kartans objekt får **`klattrar_fran`** (figuren klättrar ned för stegen med det id:t när den visas i rummet han redan är i: apan när den är räddad). **Ridåns rutor** (rutlagret `over`) ligger under figurerna och är hinder för fötterna, och kartkontrollen prövar alla kartor (beslut 56.3 och 56.7). Allt är tillägg, filer i 2.25 gäller fortfarande.
2.25: **kapitel 1:s rättelser** (Teknik 8). Kartans objekt får **`delas: djup`** (delarna står efter varandra från norr till söder, liangången), **`dekor`** (står bara i kartan, ritas utan samspel och utan text, behöver inte stå i rummets innehåll, och står inte i vägen om den inte är snår i rutlagret), **`ovanpa`** (ritas ovanpå trädkronorna, ugglorna) och `bild_hugg` och `bild_kvar` på det som svingas (lövhögarna). Prologens animationer (Teknik 9): **`bild_ta_emot`** och **`bild_las`** på en figur (Farfar tar emot det han bär och läser), **`kommer_fran`** och **`bild_vinka`** på en figur (den går själv från utgången när `visa_foremal` visar den, och vinkar när den är framme), och kartans **`vinka_fran`** (kommer han in från det rummet vinkar han mot huset). En säng med `sovplats` som han går till med `ga_till` lägger han sig i. Allt är tillägg, filer i 2.24 gäller fortfarande.
2.24: **`gransnitt.klart`** i `aventyr.json` (ordet under flikens bild och när stämpeln slår ned, beslut 52.1). Innehålls korta pass: `bild` på mellanscenerna är Innehålls fält. Allt är tillägg, filer i 2.23 gäller fortfarande.
2.23: **prologens grafik** (Teknik 4). Kartans objekt får **`bild_sitter`** (bilden när hjälten sitter i föremålet, fåtöljen). Mellanscenens `bild` har äggets lägen `agg_frost`, `agg_filt`, `agg_lyser` och `agg_klackning`. Allt är tillägg, filer i 2.22 gäller fortfarande.
2.22: **lappen görs om** (beslut 47 och 48, Teknik 2g). Inga nya fält. `steg[].ersatter` används inte längre (Innehåll tar bort det), och `steg[].text` och `steg[].upplast` står inte på lappen: delstegen styr bara bockarna, ringarna och stämpeln. Uppdraget börjar vid första stegets eget steg. Filer i 2.21 gäller fortfarande.
2.21: **skogens grafik** (Teknik 3). Kartorna utomhus får rutlager (`golv`, `over` och lager med `visas_med`), objekt av typen `omgivning` (det levande i bakgrunden) och objektens **`bild_sedan`** med **`sedan`**, **`bild_anim`** med **`anim_ms`** och **`rutor`**. Mellanscenens `bild` har sidovyn `vid_bron` och `kartbit_unge`. Allt är tillägg, filer i 2.20 gäller fortfarande.
2.20: **uppdragslappen** (beslut 37.3 och 40.1, Teknik 2d). Kapitlet får fältet **`uppdrag`** (avsnittet *3a. Uppdragen* nedan). Allt är tillägg, filer i 2.19 gäller fortfarande.
2.19: motorreglerna i 2b. **`bild`** på `ga_till`: bilden i molnet i stället för målets egen bild (krönet i k1s08, `uppdrag_kullen`, beslut 42.4). Molnet står också före `bara`. Ljudorden står kvar ca 2 s. Styrbilden visas första gången i varje pass och när han har stått vid en sak i ca 4,5 s. Dialogrutan täcker aldrig det som ska hittas härnäst. **Kontrollen varnar för varje ord i en lästext som saknas i ordlistorna**, också böjda former. Allt är tillägg, filer i 2.18 gäller fortfarande.
2.18: prologen v0.13 och Stils bilder till hugget. Kartans objekt får **`bild_rad`** (bilder i rad över hela föremålet, lianväggen), **`bild_hugg`** (bilderna när en del huggs) och **`bild_kvar`** (bilden som står kvar efter hugget, också efter en omstart). `bara` till en figur: ett tryck på figuren går dit. Allt är tillägg, filer i 2.17 gäller fortfarande.
2.17: kapitel 1 v0.7.7, spelaren hugger själv (beslut 39.3). **`verb: "hugga"`** på P26: staven är ett svärd medan pusslet pågår, och varje hugg fäller en lian, som försvinner. Kartans **`delas: "hela"`**: delarna fyller hela föremålet (lianväggen) i stället för att bli krukor. **`forsvinner_efter`** får också vara ett P26. Knuffen på ett mål kommer efter 15 s i hela spelet (beslut 39.4). Allt är tillägg, filer i 2.16 gäller fortfarande.
2.16: kapitel 1 v0.7.4 och vägen tillbaka (beslut 26.2). Inga nya fält, men tre regler i motorn: **en frivillig scen** spelas första gången hjälten går in i dess rum under vilket `ga_till` som helst i ett kapitel med en sidogren (inte bara med `fri_vag`), och han kan gå mellan kapitlets rum som han redan har varit i (en avstickare). **P15 utan `kasta`** visar stegen som växer ett pinnsteg per fyllt fält (`variant: "apan"`), och en `knuff` med `efter_sek` börjar räkna först efter första felet. **P26** läser upp `instruktion` först, och `knuff` låter ungen nosa mot närmaste föremål som inte är svingat. Filer i 2.15 gäller fortfarande.
2.15: prologen v0.11.3. `vantar_pa: "radion"` (instruktionen väntar tills spelaren har tryckt på radion och hört Farfars senaste replik genom den igen) och `kapitelrubrik: true` på repliken med nästa kapitels rubrik (den visas inte när nästa kapitel är låst). Mellanscenens `bild` har lägena för luftskeppet. Allt är tillägg, filer i 2.14 gäller fortfarande.
2.14: grafiken i Farfars hus. Scenen kan ha `hjalte: "sover"` (hjälten ligger i sängen när scenen börjar och kliver ur när han ska röra sig). Kartorna får `bild` och `mark` (rummets bild eller markens rutset) och objekten `bild`, `bild_natt`, `bild_pa`, `bild_del`, `sovplats` och `skata_fonster`. Allt är tillägg, filer i 2.13 gäller fortfarande.
2.13: låsta kapitel (beslut 24.2). `kapitel_last` i `aventyr.json`: `last` (kapitlen som är låsta från början) och `steg` (slutrutan: mellanscener och repliker). Talaren `klaffen` heter `herr_skata`. Allt är tillägg, filer i 2.12 gäller fortfarande.
2.12: textgrammatiken (T4b, beslut 21). `ljudord` på `ljud`-steget och på reaktioner (`vid_ratt`, `vid_fel`, `vid_valj`): ett ljudord i världen vid det som låter. `gransnitt.sluta_for_idag` har ett ord (sov). Allt är tillägg, filer i 2.11 gäller fortfarande.
2.11: Farfars hus (T6). Kartorna får typen `vagg`: massiv vägg inne i ett rum, så att ett rum kan ha en annan form än en rektangel (hallen med en bred entré och en smal korridor). Rollrösten `fagel` (en levande fågelröst) i `aventyr.json`. Allt är tillägg, filer i 2.10 gäller fortfarande.
2.10: SVÄRD utifrån bilden (beslut 18.5, 20.3): `bild` på P11 och `forebild.visas` (`fran_start` eller `vid_fel`). Allt är tillägg, filer i 2.9 gäller fortfarande.
2.9: kapitel 1:s kartor (T5). Ett område kan vara större än skärmen, högst 2×2 skärmar, och kameran följer hjälten (beslut 14, 18.1). Kartorna får `forsvinner_efter` (lianerna som SVÄRD kapar) och `oppning` (hålet i häcken). `alias.rum` för rum som har gått upp i ett större område. Av ett läsval i världen syns bara den variant han får. Allt är tillägg, filer i 2.8 gäller fortfarande.
2.8: kapitel 1:s steg och fält (T2). Rummen får `skyltar` (text som står i världen, beslut 15.2), `frivilligt` (föremål som ger något en gång) och `dold` på föremål. Scenerna får `frivillig` och `startar_i_rum`. Nya steg: `las_skylt`, `visa_foremal`, `ge_sak`, `dinobok`, `unge_tillagg`, `fri_vag` på `ga_till` och `paminnelse` på repliker som väntar. Pusslen: `skylt` på läs och välj, titta–täck i formeln, brickor och kasta-läge i räddningen, kodlåsets kontroll, och svingning mot rummets föremål i P26. `gransnitt` i `aventyr.json` (orden i pausmenyn). Kartorna får höjdnivåer (`yta`, `trappa`, `stege`), och en stig slutar vid kurvan. Allt är tillägg, filer i 2.7 gäller fortfarande, utom `skapa_hjalte`: `delar` är nu `hudfarg` och `drakt` (hjältens form är fast, prologen är omskriven).
2.7: kartans `last_i` (en utgång är låst i ett tillstånd) och `morker` (hur mörkt rummet är på natten). Räckvidden: saker, figurer och stegar nås från alla håll inom ca 1,5 rutor, och bara den närmaste är aktiv. Kapitelfilerna är oförändrade.
2.6: `vantar_pa: "nosen"` och `vid: "ungen"` på replik-steget (och `vantar_pa`, `via`, `vid` gäller bara repliker som är egna steg), `nos_demo` görs av spelaren, `sparpunkt_fraga` i `aventyr.json`, `kalla` får vara fyra korta ord. Tillägg.
2.5: stegen `bara`, `prata` och `ta_emot`; `vantar_pa` och `via` på repliker; `vid_annan_utgang` på `ga_till`; `fraga` på `sparpunkt`; kartans `vagg_bak`, `vagg_sida`, `vagg_fram` och `talare`. Tillägg.
2.4: `pekar` på knuffar (hjälp som pekar på svaret kommer senare). Tillägg.
2.3: `sida: alla` och lampor i kartorna, `fritt` utan knapp. Allt är tillägg.
2.2: val i världen genom utgångar (`i_rummet` där `objekt` är en dörr eller stig), nya gradnamn, kartegenskaperna `riktning`, `klattra`, `ute`, `lapp`, `inomhus` och punkterna `in_<rum>`. Allt är tillägg, filer i 2.1 gäller fortfarande.
2.1: `nivaer` och `alias` överst i kapitlet, steget `unge_folj`, `foremal` på `ljud`, `visar` i kartorna. Allt är tillägg, filer i 2.0 gäller fortfarande.
2.0: kapitelfilerna har `"format": 2`. Packa heter `P28_packa` (P27 är Formelresan i pusselkatalogen). Nytt: `syns_i` på föremål, `i_rummet` på läs och välj, Tiled-kartor för rummen (avsnitt 3b).
1.1: P27_packa, P15_raddning, P9_kodlas. Så skrivs berättelse, pussel och ordlistor som data.
Schemafilerna finns i `content/schema/`. Kontrollen körs med `npm run kontroll` och i varje publicering.

## 1. Filerna

| Fil | Innehåll | Schema |
|---|---|---|
| `content/ordlistor.json` | Ordlistor 1–6, flaggor, förbjudna par | `ordlistor.schema.json` |
| `content/<äventyr>/aventyr.json` | Titel, talare (med `rollrost`: `berattare`, `gammal`, `fanig`, `fagel`, `metall` eller `unge`; `fagel` är en levande röst vars ton skiftar lite från replik till replik), platshållare, kapitelordning, `sluta_for_idag` (`fore_ungen` och `med_ungen`: mellanscener och repliker när han väljer att sluta för idag, i pausmenyn eller vid passets slut; ordet på pausmenyns knapp är `gransnitt.sluta_for_idag`), `sparpunkt_fraga` (frågan vid varje sparpunkt), `gransnitt` (orden i pausmenyn), `kapitel_last` (låsta kapitel och slutrutan, se nedan) | `aventyr.schema.json` |
| `content/<äventyr>/kap-00.json` … `kap-07.json` | Ett kapitel: rum, scener, pussel | `kapitel.schema.json` |

Kapitelfilerna börjar med `"format": 2`, äventyret och ordlistorna med `"format": 1`. Ändras formatet höjs numret, och teknik skriver om gamla filer. En kapitelfil i format 1 godtas inte längre: byt `P27_packa` mot `P28_packa` och `format` mot 2.

## 2. Text

- **All speltext lagras i vanlig skrift**, med stor bokstav där svenskan har det: `"Ta den röda lådan."`, `"Farfar"`, `"Baron Gripklo"`, `"Ordträdet"`. Spelet visar versaler tills nivån säger annat. Gemener kostar då ingen omskrivning senare.
- **Enstaka ord** (etiketter på lådor, bildtexter, ord i ordlistorna) skrivs med små bokstäver: `"filt"`, `"bär"`.
- **Formler skrivs alltid i versaler**: `"LJUS"`, `"STOR STEGE"`. Det är stavens skrift. Formler får också stå i versaler mitt i en mening.
- **Platshållare med små bokstäver**: `{unge}` (ungens namn) och `{hjalte}` (hjältens namn). Namnet visas i samma skrift som texten runt omkring.
- **Rader:** en text är en sträng, eller en lista med rader (`["Dinomat.", "Ta den röda lådan."]`). Spelet bryter aldrig inom en rad i listan, men kan bryta en lång sträng mellan ord.
- **`upplast`:** `true` läses alltid upp (instruktioner, berättaren, repliker). `false` läser spelaren själv. Lästexten i pussel läses aldrig upp automatiskt, så den har inget eget `upplast`-fält.
- **Textgrammatiken** (beslut 21, stilguiden §3): en replik från `berattare` står i berättarens raka ruta med stjärnan, alla andra talare i en pratruta med ansikte (genom radion: radions högtalare). Repliker rullas fram med ca 40 tecken per sekund och läses i 40 punkter. Det han läser själv (lappar, skyltar, kort, molnet, formler) rullas aldrig och står i 48 punkter (meningar) eller 64 (ord). Lappar är papper med riven kant, Farfars skyltar trä. Datan behöver inget nytt för detta: formen följer av talaren och fältet.
- **Id:n** skrivs med små bokstäver a–z, siffror och understreck, utan å, ä, ö: `lada_med_stav`, `p0_filt`. Kapitlens id är `kap-00` osv.

## 3. Ett kapitel

```json
{
  "format": 2,
  "id": "kap-00",
  "kapitel": 0,
  "meta": { "version": "0.4", "agare": "Innehåll" },
  "rum": [ { "id": "vinden", "namn": "Vinden", "tillstand": ["natt", "morgon"], "innehall": ["lada_med_stav", "stege_ner"] } ],
  "scener": [ { "id": "s02_glimten", "pass": 1, "rum": "vinden", "tillstand": "natt", "steg": [ … ] } ],
  "pussel": [ … ]
}
```

- **Scenens `hjalte`** (2.14): `"sover"` = hjälten ligger i sängen (kartans `sovplats`) när scenen börjar, och kliver ur när han ska röra sig. Repliker och mellanscener hör han i sängen.
- **Rum:** `id`, `namn` (vanlig skrift), `tillstand` (frivilligt), `innehall` = objekten i rummet, `skyltar`, `frivilligt`. Tiled-kartan använder samma objekt-id:n.
  Ett föremål som bara ska synas i vissa lägen skrivs `{ "id": "lada_med_agg", "syns_i": ["natt_upplyst", "morgon"] }`. Det syns inte, och går inte att gå till, i andra tillstånd. Lägena måste finnas i rummets `tillstand`.
  Ett föremål som ska dyka upp mitt i en scen skrivs `{ "id": "last_lada", "dold": true }`. Det syns först efter steget `visa_foremal`, och sedan står det kvar.
- **`skyltar`** (beslut 15.2): text som står i världen hör till rummet, inte till ett steg. Nyckeln är föremålets id:
  ```json
  "skyltar": { "skylt_bar": { "text": "bär" }, "skylt_ingang": { "text": "Följ mina skyltar.", "papper": "traskylt" } }
  ```
  **Ett ord** syns hela tiden på skylten eller tavlan (pilen sätts i kartan). **En mening** har en markering, ett litet papper, vid skylten. Hjälten går dit, och läsplattan visar texten på `papper`. Skyltar läses aldrig upp. Ett steg behövs bara när scenen ska vänta tills han har läst skylten (`las_skylt`).
- **`frivilligt`**: föremål som går att använda när som helst i rummet och ger något en gång. Stegen spelas när hjälten använder föremålet:
  ```json
  "frivilligt": [ { "foremal": "liten_lian", "steg": [ { "typ": "pussel", "pussel_id": "k1_svard_igen" }, { "typ": "ge_bar", "antal": 2 } ] } ]
  ```
  Stegen får inte vara `sparpunkt`, `ga_till`, `las_skylt` eller `prata`.
- **Scen:** `id`, `pass` (1, 2, 3 …), `rum` (eller `null` för scener utanför rummen), `tillstand`, `vy` (`uppifran`, `sidovy`, `narbild`), `vid_omstart` (en replik när spelet startar om här), `steg`, `frivillig`, `startar_i_rum`.
- **En frivillig scen** (`"frivillig": true, "startar_i_rum": "buskarna"`) spelas inte i tur och ordning. Den spelas första gången hjälten går in i rummet medan ett `ga_till` pågår, högst en gång. Efteråt går han tillbaka själv. Den räknas inte in i passets tid.
- **Avstickare** (beslut 26.2): i ett kapitel med en frivillig scen kan hjälten under varje `ga_till` gå genom utgångarna till sidogrenens rum och till kapitlets rum som han redan har varit i. Målet står kvar i molnet, ungen nosar efter ca 15 s mot utgången närmast tillbaka, och radion upprepar Farfars senaste replik i scenen. När han kommer tillbaka till scenens rum fortsätter steget. Spelet sparar i avstickaren och fortsätter där: mitt i den frivilliga scenen börjar den om med sin `vid_omstart`, annars hörs den pågående scenens. Prologen har ingen frivillig scen, så där gäller det inte. `vid_annan_utgang` stänger avstickarna.
- **Scenerna spelas i ordning.** Ett `pussel`-steg väntar tills pusslet är löst. Det behövs alltså ingen `nasta_scen`.
- `meta` och `anteckning` är fria fält för versionsnummer och noter. De påverkar inte spelet.
- **`nivaer`** (frivilligt): golv och tak i kapitlet, `{ "lasning": ["L1", "L3"], "skrivning": ["S1", "S1"] }`. Anpassningen håller sig inom dem.
- **`alias`** (frivilligt): id:n som har bytt namn, så att äldre sparningar hamnar rätt: `{ "scener": { "s10_ladorna": "s11_ladorna" }, "pussel": { … }, "rum": { "lianerna": "skogsbrynet" } }`. Bara för id:n som inte finns längre. För `rum` följer det som har visats (`visa_foremal`), rummets tillstånd och det frivilliga med till det nya rummet. En sparning i en scen som har tagits bort utan alias börjar i början av samma pass.

### Steg

| `typ` | Fält | Vad som händer |
|---|---|---|
| `replik` | `talare`, `text`, `upplast`, `vantar_pa`, `via`, `vid`, `paminnelse` | Någon säger något. Visas på läsplattan. **`vantar_pa`** (`"mata_ungen"`: ungen har ätit, `"nosen"`: spelaren har tänt nosen, `"radion"`: spelaren har tryckt på radion, och radion har sagt Farfars senaste replik genom den igen, 2.15): en instruktion som ber om en handling väntar tills den är gjord. Den står i molnet nere till vänster (med en bild av handlingen och en högtalare) medan världen går, upprepas med en styrbild efter ca 8 s, och nästa steg kommer först efter handlingen. **`via: "radio"`**: repliken hörs genom radion. **`vid: "ungen"`**: texten står i en bubbla ovanför ungen i stället för på läsplattan och läses upp (namnet i s08). **`paminnelse`** (`efter_sek`, `replik`), bara med `vantar_pa`: efter så många sekunder kommer en annan replik i stället för samma instruktion igen ("{unge} är rädd.", sedan "Ge {unge} ett bär."). **`kapitelrubrik: true`** (2.15): repliken är nästa kapitels rubrik i slutet av kapitlet ("Kapitel 1. Skogen."). Den visas inte när nästa kapitel är låst (`kapitel_last`), eftersom slutrutan kommer i stället. Fälten finns bara på repliker som är egna steg. |
| `mellanscen` | `beskrivning`, `bild`, `ljud`, `syns_redan`, `unge_till` | Något händer i bild. **`unge_till`** (2.32, 67.2): ungen springer till föremålet eller utgången (`grind`, `stig_lianerna`) och väntar där, nosande mot det, tills nästa mål är nått eller rummet byts. Beskrivningen visas inte, och berättelsen väntar ca 1 s. Det ska finnas i rummet (kontrollen). **`syns_redan: true`** (2.30, beslut 65): det som händer syns redan (rummet, en animation eller nästa steg visar det), så beskrivningen visas inte, och berättelsen väntar ca 0,8 s. Beskrivningen står kvar som anteckning. Samma fält gäller mellanscenerna i `aventyr.json` (SLUTA FÖR IDAG och slutrutan). **Ett klart kapitel visar ingen beskrivning**, se avsnitt 5. **`ljud`** (2.29): det som låter i mellanscenen spelas när den börjar, och berättelsen väntar inte på det (se *3d*). Gråboxen visar beskrivningen för den vuxne. **`bild`** (förtydligat 2026-11-02, pass 3): det som händer i rummet med Stils bilder, och då visas inte beskrivningen. `hjalte_sang_morgon` (morgonen i sängen, ungen på täcket), `luftskepp_<läge>` (luftskeppet med baronen och Herr Skata: `glider`, `skata_landar`, `ser_hjalten`, `ser_kartan`, `skata_putsar`, `trasslar`) en sidovy (`in_i_skogen` och `vid_bron`, `assets/sidovyer/<bild>_bakgrund.png`: i `vid_bron` läser baronen sin lapp upp och ned, och Herr Skata landar på hjälmen) och `kartbit_unge` (2.21: ungen sätter nosen på mammas skugga i kartbiten i närbilden, i ca 2,6 s). Ägget (2.23, 36.7): `agg_frost` (det frostiga ägget i halmen), `agg_filt` (filten läggs om, frosten smälter), `agg_lyser` (ägget lyser i stavens färger tills kläckningen) och `agg_klackning` (knack, kras, ungen tittar ut, ramlar ut och hoppar). Efter `unge_folj` ligger skalet kvar. **Farfar i dörren** (2.32, 67.2): `farfar_i_dorren` (Farfar kommer in i rummets dörr och står vänd mot hjälten, på natten i morgonrocken) och `farfar_gar_ut` (han vänder sig och går ut genom dörren). Rummets karta har punkten `regi_farfar` där han står (sovrummet). **Kapitel 2** (2.36–2.38): `unge_sjunker`, `unge_dras_upp`, `luftskepp_river_brevet`, `bubblor_fran_blommorna`, `halvan_flyger_till_handen`, `unge_hoppar_pa_stocken` (jättehoppet efter en bubbla, och stocken driver ut), `unge_piper_pa_stocken`, `unge_hoppar_i_land` (ungen hoppar i land och skakar sig), `tant_rosa_nar_inte` (dammvippan räcker inte), `byborna_jublar` och `elden_tands`. Baronen talar från luftskeppet när han har sett hjälten, och porträttets min följer läget. En bild som inte finns ger beskrivningen som förut, och ett test kontrollerar att varje bild finns. |
| `musik` | `slinga` | (2.29) Byt slinga mitt i en scen, från steget till scenens slut. `null` = tyst. Se *3d*. |
| `ljud` | `id`, `foremal`, `ljudord` | Ett ljud spelas. Med `foremal` hoppar föremålet till i bild (ägglådan som dunkar). Samma `id` ger alltid samma ljud. **`ljudord`** (2.12, beslut 21.5): ordet syns i världen vid det som låter (ovanför `foremal`, annars överst mitt på skärmen), i versaler, i Lexends tyngsta vikt med kontur, och står kvar ca 2 s (granskningen A 24). Nästa steg väntar inte på det. Vanlig skrift, ett eller två korta ord (`dunk`, `tok tok`). Kontrollen säger fel om ordet står i versaler eller har ett spärrat ljud, och varnar för dubbelteckning. Samma fält finns på reaktioner (`vid_ratt`, `vid_fel`, `vid_valj`), t.ex. KLONK, PIP och HO-HO: ordet syns då vid föremålet han valde. Ljudord behövs aldrig för att lösa en uppgift. |
| `unge_folj` | `folj` | Ungen börjar (`true`) eller slutar (`false`) följa hjälten. |
| `ga_till` | `mal`, `bild`, `visa_styrhjalp`, `knuff`, `vid_annan_utgang`, `fri_vag` | Spelaren ska gå till ett objekt i rummet. Efter en uppläst replik står målet i molnet med instruktionen och målets bild. **`bild`** (2.19) = ett bildkort som står i molnet i stället för målets egen bild, när målet inte har någon (krönet: `uppdrag_kullen`). Ett test kontrollerar att bildkortet finns. **`visa_styrhjalp`**: styrbilden för att gå. Den visas också vid första målet i varje pass (granskningen A 23). **`fri_vag: true`** (fritt vägval): de andra utgångarna går också att gå igenom, och rummet bakom visas (med en frivillig scen första gången). Steget är klart när han går genom målet. **`vid_annan_utgang`** (`ljud`, `handling`, `replik`): de andra utgångarna är låsta under steget. Går hjälten till en av dem öppnas den inte, ljudet spelas, hjälten tittar upp och målet lyser (hallen före kläckningen: `{ "ljud": "dunk" }`). |
| `pussel` | `pussel_id` | Ett pussel startar. Scenen fortsätter när det är löst. |
| `oppna_lasplatta` | `pussel_id` | Visar pusslets lästext utan att pusslet startar (farfars lapp). |
| `visa_ui` | `element` | `nosknappen`, `barraknaren`, `radioramen` eller `hjalteboken` visas första gången. |
| `nos_demo` | `ord`, `kostnad` | Spelaren nosar själv: senaste lappen öppnas med nosen tänd, och `ord` glimtar (på datorn redan markerat, Mellanslag läser). Han går vidare när han har hört ordet. `kostnad: 0` = gratis. Föregås av "Tryck på nosen." med `vantar_pa: "nosen"`. |
| `ge_bar` | `antal` | Bär till ungen. |
| `ge_kartbit` | `nummer` | Kartbit 1–7. |
| `ge_grad` | `grad`, `fest` | Ny trollkarlsgrad, i ordning: `Lärling`, `Ordsmed`, `Lögnavslöjare`, `Gåtlösare`, `Berättare` (äventyr 1) och `Mästertrollkarl` (seriens sista, nås inte i äventyr 1). |
| `bok` | `id`, `talare`, `las_upp_efter_tryck`, `uppslag` | Bläddringsbar bok. Varje uppslag: `bild`, `bildtext` (ett ord), `text`. |
| `skapa_hjalte` | `delar` (`hudfarg`, `drakt`), `bara_bilder` | Spelaren väljer hjältens palettbyten. Formen är fast, hjälmdekor och ryggsäck kommer som gåvor (`ge_sak`). |
| `sparpunkt` | `pass_slut`, `valfri`, `fraga` | Spelet sparas. `pass_slut: true` där passet slutar: två bilder, ▶ för att fortsätta och den sovande ungen för att sluta för idag. **`fraga`** (replik) läses upp och står ovanför bilderna. Utan `fraga` används `sparpunkt_fraga.text` i `aventyr.json`. |
| `fritt` | `beskrivning`, `foremal` | Fri lek, t.ex. buskar att svinga staven mot. Ingen knapp: steget tar slut när varje föremål har gett sina två bär, när hjälten går mot en utgång eller genom en öppning (grinden), eller efter 25 sekunder utan att något händer. |
| `bara` | `bild`, `till` | Hjälten bär en sak (filten): den svävar efter honom som ljusbollen och läggs på `till` när han når fram själv. Efter en uppläst replik står instruktionen i molnet med bilden av `till` tills han är framme (beslut 41.5), och ett tryck på en figur som är `till` går dit. |
| `prata` | `figur`, `kalla` | Dialogregeln: figuren kallar på avstånd (vinkar, `kalla` är högst fyra korta ord och läses upp), och samtalet börjar när hjälten kommer inom ca 1,5 rutor. Stegen efter `prata` är samtalet. |
| `ta_emot` | `fran`, `bild` | Figuren räcker fram en sak (lappen). Hjälten tar den själv med ett tryck när han står vid figuren. |
| `las_skylt` | `foremal` | Scenen väntar tills spelaren har läst skylten: hjälten går dit, och läsplattan visar meningen i rummets `skyltar`. Inget val, ingen nivå. |
| `visa_foremal` | `foremal` | Ett dolt föremål (`dold` i rummets innehåll) syns från och med nu och står kvar. |
| `ge_sak` | `sort`, `id` | Hjälten får något att ha på sig (`hjalmdekor` eller `ryggsack`). Det tas på direkt, pausknappen glimtar en gång, och garderoben i hjälteboken har det. |
| `dinobok` | `sida` (`bild`, `bildtext`) | En ny sida i Dinoboken, fliken i hjälteboken. Pausknappen glimtar. Bildtexten läses upp efter tryck. |
| `unge_tillagg` | `id` | Ungen får ett tillägg (mönstret på nosen). Stubbe i gråboxen. |

En **replik inuti något annat** (`knuff`, `vid_fel`, `instruktion`, `vid_omstart`) skrivs utan `typ`: `{ "talare": "berattare", "text": "Där. I lådan.", "upplast": true }`.

### Fält som alla pussel kan ha

`id`, `typ`, `instruktion` (replik), `knuff` (`handling`, `replik`, `efter_sek`, standard 9 s), `forenkla` (`efter_fel`, `andring`), `efter_3_fel`, `vid_ratt`, `vid_fel`, `anteckning`.

**`tillstand_efter`** (2.33): rummets tillstånd när pusslet är löst, ett av rummets `tillstand`. Med `"tillstand_efter": "fri"` på `k2_skyltarna` faller repen på torget (de har `syns_i: ["rep"]`), och stigarna är öppna när navet börjar. Tillståndet står kvar när han kommer tillbaka till navet och när spelet startas om mitt i scenen: scenens eget `tillstand` sätts bara när scenen börjar från första steget. Kontrollen säger fel om rummet inte har tillståndet.

**Fråga igen** (dialogregeln): en figur med `talare` i kartan upprepar sin senaste upplästa replik i scenen när spelaren trycker på den. Farfar i läsrummet och i köket har `talare: farfar`.

**Knuffar som pekar på svaret** får `"pekar": true` (till exempel "ungen lutar sig mot rätt dörr"). De kommer tidigast efter första felet, eller efter 4 sekunder per alternativ och minst 12 sekunder, så att det aldrig lönar sig att vänta i stället för att läsa. Knuffar som upprepar frågan (tankebubblan blinkar, Farfar ropar igen) har inget `pekar` och kommer efter 9 sekunder som förut. Kontrollen varnar när en knuff i ett läsval nämner "rätt" eller "mot" utan `pekar`.
`vid_ratt`, `vid_fel`, `efter_3_fel` och `vid_valj` har `handling` eller `reaktion` (vad som händer i bild, fri text i gråboxen), `replik`, `fest` (`liten`, `mellan`, `mellan_dampad`, `stor`) och **`ljud`** (2.29, avsnittet *3d*).

**Texten för den vuxne** (2.32, beslut 67.3): en reaktions `handling` eller `reaktion` och en knuffs `handling` visas i samma ruta som mellanscenernas beskrivning. **`syns_redan: true`** på reaktionen eller knuffen betyder att det som händer redan syns (dörren förblir stängd, skylten glimtar, ungen pekar), och då visas inte texten. Den står kvar som anteckning. Det gäller också `vid_annan_utgang`, ett rimligt ord (`rimliga`) och `kasta.vid_ratt`. `efter_3_fel` och `forenkla` visar aldrig sin text, och inte heller knuffen i P26, som pekar i världen. Regeln står på ett ställe (`src/karna/mellanscen.js`, `visarRegi`).

### P1_las_och_valj

**Alltid med `varianter` per läsnivå, även när det bara finns en.** Motorn väljer den variant som passar spelarens nivå.

```json
{
  "id": "p0_dinomat",
  "typ": "P1_las_och_valj",
  "avsandare": "farfar",
  "papper": "anteckningspapper_kompassros",
  "hjalp": "ett_ord",
  "varianter": {
    "L2": {
      "text": ["Dinomat.", "Ta den röda lådan."],
      "alternativ": [
        { "id": "rod", "ratt": true },
        { "id": "bla", "vid_valj": { "reaktion": "dammoln, båda nyser" } }
      ]
    }
  }
}
```

- Variant: `text` (lästexten) och/eller `bild` (det som ställer frågan, t.ex. en tankebubbla), och `alternativ` (2–5).
- Alternativ: `id`, `ord` (etiketten spelaren läser, små bokstäver), `bild`, `ratt: true` på exakt ett, `vid_valj` för den roliga felreaktionen.
- **Bilden stämmer med texten.** Nämner texten en färg eller storlek ska alternativets `bild` (eller `id`) säga den: `lada_rod_stor`, `filt_bla`, `liten_rod`. Färger: `rod`, `bla`, `gul`, `gron`, `vit`. Storlek: `stor`/`stort`, `liten`/`litet`. Ett test kontrollerar att det rätta alternativet har det texten säger.
- `hjalp`: `"ett_ord"` (nosknappen) eller `null`.
- **`i_rummet: true`** (läs i världen): alternativen ligger i föremål runt rummet i stället för kort på läsplattan. Varje alternativ har `objekt` (föremålets id i rummet) och `ord` eller `bild`. Frågan (`bild` eller `text`) står i molnet nere till vänster (0.12.0). Pusslets `instruktion` står i samma moln, läses upp när molnet kommer och en gång till efter 8 s, och visas inte först på läsplattan.
  - **En sak** (låda, kruka): när hjälten står vid den syns ordet vid föremålet, och spelaren trycker på ordet (eller på föremålet igen, eller Mellanslag) för att öppna. Ett alternativ utan `ord` (lådor som skiljs åt på färg och storlek, se `visar`) visar handen i stället. Fel föremål ger sin `vid_valj` och blir tomt.
  - **En utgång** (dörr, stig): ordet syns på skylten när hjälten är inom ungefär en ruta från dörren eller skylten (kartans `lapp`). Att gå igenom utgången är valet. Fel dörr öppnas aldrig: hjälten tar ett steg tillbaka och `vid_valj` spelas vid dörren. Förenklingen spikar igen dörrar och stigar med plankor.
  - Glimten är lika för alla saker som är kvar och avslöjar aldrig svaret. Utgångar glimtar inte. Förenkling och att ungen pekar fungerar som vanligt.
  - **Inget nivåbyte i världen** (granskningen, punkt 18): varianten bestäms när hjälten kommer in i rummet. Förenklingen spärrar prövade dörrar och stigar (med plankor eller en gren) och byter aldrig variant, eftersom föremålen i rummet då skulle bytas framför honom.
- **`skylt`** (frivilligt): lästexten står på ett föremål i rummet, Farfars träskylt. En markering (ett papper) sitter vid skylten, och läsplattan öppnas när hjälten går dit. Han kan gå tillbaka och läsa igen.
- **Frågan står kvar ovanför korten** (0.12.0): på läsplattan står pusslets `instruktion`, annars den upplästa repliken strax före pusslet i scenen, överst i sin form (stjärnan eller ansiktet). Ett tryck på stjärnan läser den igen. Datan behöver inget nytt.
- **Luckorna** (0.12.0): är alla alternativ meningar (`ord` med mellanslag) visas de som rader i hela bredden, var och en en lucka, 18 em breda, och bilden står till höger om frågan. Datan behöver inget nytt.
- **Knufftiden** på läsplattan följer textmängden: ca 11 sekunder per mening i lästexten och alternativen, minst 9. `efter_sek` på knuffen går före.

```json
{ "id": "p0_filt", "typ": "P1_las_och_valj", "i_rummet": true,
  "varianter": { "L1": { "bild": "tankebubbla_filt", "alternativ": [
    { "id": "filt", "ord": "filt", "objekt": "lada_hornet", "ratt": true },
    { "id": "bil", "ord": "bil", "objekt": "lada_hyllan", "vid_valj": { … } } ] } } }
```

### P11_formel

`niva` (S1–S5), `svar` (versaler), `formler` (`ord`, `effekt`, `tillstand_efter`), `nastan` (`ord`, `effekt`), `forebild` (`text`, `placering`, `ligger_kvar`, `tacks`, `brickor_efter_sek`, `visas`), `bild`, `brickor` (en versal per bricka), `helord`, `ratt_bokstav_stannar`, `forsta_formel`.

**Brickor ligger alltid i bokstavsordning** (granskningen), i alla pussel med brickor. Ordningen i datan spelar ingen roll.

**Titta–täck** (`"tacks": "forsta_brickan"`): förebilden syns, brickorna glider in efter `brickor_efter_sek` sekunder, och förebilden tonas bort när första brickan läggs (ungen håller för ögonen). Vid fel eller knuff tänds den igen och står kvar resten av försöket, och försöket loggas med förebild. Vid rätt lyser förebilden en sekund ovanför hans ord.

**Utifrån en bild** (`"bild"` och `"forebild": { "visas": "vid_fel" }`, beslut 18.5): ord som går att ljuda fram (SVÄRD, FLYG) skrivs utifrån en bild, till exempel Farfars ristade svärd (`svard_ristat`). Bilden står ovanför fälten, brickorna kommer direkt och förebilden syns inte. Vid första felet tänds förebilden bredvid bilden, vid nästa bricka tonas den bort (täck), och efter ett andra fel står den kvar. Knuffen får bilden att glimta, aldrig ordet. Vid rätt lyser ordet en sekund ovanför bilden. Utan `bild` (den lilla lianen) syns bara fälten tills förebilden tänds. Med `visas: "fran_start"` (förval) gäller titta–täck som ovan, för ord som inte går att ljuda fram (LJUS, SKÖLD, SNABB).

### P12_dop

`sparas_som` (`hjalte.namn` eller `unge.namn`), `min_bokstaver`, `max_bokstaver`, `vuxen_far_hjalpa`. Bedöms aldrig.

### P28_packa

Som P1, men **flera alternativ har `"ratt": true`** och spelaren väljer alla. Upp till 6 alternativ. Fel val studsar tillbaka (`vid_fel` på pusslet eller `vid_valj` på alternativet).

### P15_raddning (fas 3)

Hänga apan-familjen. `kategori` (text spelaren läser själv), `svar` (ett ord, små bokstäver), `brickor`, `kasta`, `reserv_ord`, `tillatna_fel`, `mjukt_misslyckande`, `variant`, `falt` (beskrivning). Ett fält per bokstav; en rätt bokstav fylls i på alla platser där den finns. Ett tryck i taget: reaktionen spelas klart innan nästa tryck tas emot. En fel bricka tonas ut.

**`kasta`** (`erbjudande`, `vid_ratt`): efter första rätta bokstaven lyser staven, och `erbjudande` läses upp (det väntar inte). Ett tryck på staven ger formelvyn: fälten får guldkant, och nästa tomma fält lyser. Han fyller bara de tomma fälten. En fel bricka studsar tillbaka, de rätta ligger kvar, och efter två fel på samma plats blinkar rätt bricka. Inget fel räknas. Ett nytt tryck på staven lämnar läget. Rätt i kasta-läget ger `kasta.vid_ratt`.

**Utan `kasta`** (kapitel 1, beslut 29.2) erbjuds staven aldrig. **`variant: "apan"`**: bredvid fälten står stegen under nätet, med ett pinnsteg per fält. Varje fyllt fält fäller ut ett pinnsteg nerifrån, och apan klättrar ner ett steg (E fyller två och ger två). Vid fel blundar apan. **Knuffen** (2.28, beslut 58.2): före första felet kommer den efter 15 s utan tryck, och en rätt bokstav startar om klockan. Efter första felet kommer den efter **`knuff.efter_sek`** (15 s om det inte står), räknat från när felreaktionen är klar, och bara en gång. En bricka som studsar i kasta-läget räknas som ett fel.

### P9_kodlas (fas 3)

`niva`, `svar` (ett ord, små bokstäver), `brickor`, `chiffer` med `tecken` (på låset, i ordning), `nyckel` (`tecken` → `bokstav`) och `nyckeln_finns_i`, `visa_forsta`, `kontroll`, `svar_lyser_sek`. Kontrollen räknar ut ordet ur tecknen och nyckeln och jämför med svaret.

Låset och nyckeln står på samma skärm. **`visa_forsta`**: ungen visar det första tecknet (på låset och på nyckeln, och bokstaven lyser), och det räknas inte som hjälp. **`kontroll: "hela_ordet"`**: låset kontrolleras först när alla fälten är fyllda, och rätta bokstäver stannar. **`svar_lyser_sek`**: ordet lyser så länge innan låset öppnas.

### P26_krukorna

`innehall` (en post per kruka eller buske: `bar`, `tom`, `kartbit_1`, `ekorre`, `skattlada` …), `kartbit_i_sista`, `sak_i_sista` (posten som alltid hittas sist), `foremal` (föremålen i rummet att svinga mot, ett per post; utan `foremal` delas föremålet som visar pusslet upp i krukor), `verb` (`svinga` eller `hugga`). Vila, påverkar inte nivån. **`instruktion`** läses upp innan han börjar. **`knuff`**: efter en stund utan att något svingas springer ungen till föremålet närmast hjälten som inte är svingat och nosar mot det, och det glimtar. Knuffens `handling` är bara för loggen.

**`verb: "hugga"`** (beslut 39.3, lianerna): formeln ger förmågan, och spelaren använder den själv. Staven är ett svärd medan pusslet pågår, samma knapp som att svinga, och varje hugg fäller en lian, som försvinner. Inga missar och ingen tid. I kartan visar lianväggen pusslet (`visar`), delas i lika många lianer som `innehall` har poster och fyller hela väggen (`delas: "hela"`), och är borta efteråt (`forsvinner_efter`: pusslets id). Den lilla lianen (`foremal: ["liten_lian"]`) huggs med ett hugg.

## 3a. Uppdragen (2.20)
Uppdragslappen (10d, beslut 47 och 48) är hopfälld bakom lappknappen och fälls ut i remsan under spelytan när ett uppdrag börjar, när ett pass börjar och när han trycker på knappen. Den visar rubriken, bilden, en bock per gjort steg och en tom ring per steg som är kvar, aldrig delstegens text. Molnet säger vad han ska göra nu. Kapitlets fält `uppdrag` är en lista i den ordning uppdragen kommer.

```json
{"id": "u0_vinden", "rubrik": "TITTA PÅ VINDEN", "bild": "uppdrag_stegen", "pass": 1,
 "steg": [
  {"text": "GÅ UT I HALLEN", "klart": {"scen": "s01_natten", "ga_till": "dorr_hallen"},
   "ersatter": [{"scen": "s01_natten", "text": "Gå ut i hallen!"}]},
  {"text": "TÄND STAVEN", "klart": {"scen": "s03_staven", "pussel": "p0_ljus"}}],
 "stampel": {"scen": "s03_staven", "efter": {"pussel": "p0_ljus"}}}
```

| Fält | Betydelse |
|---|---|
| `rubrik`, `steg[].text` | Lappens text, **i versaler som på lappen** (Innehålls form). Bara `rubrik` står på lappen och i MIN BOK (högst ca 11 tecken, annars bryts raden). `steg[].text` står i loggen och kontrollen, inte på lappen (2.22). `{UNGE}` är ungens namn. Orden ska stå i ordlistorna, och kontrollen prövar spärrade ljud. |
| `bild` | Bildkortet överst (48 × 48, `assets/bildkort/`). Ett test kontrollerar att det finns. |
| `steg[].klart` | Steget i berättelsen som gör delsteget klart: `scen` och ett av `ga_till`, `pussel`, `bara` (sakens `bild` eller `till`), `las_skylt` eller `vantar_pa`. Högst tre steg. |
| `steg[].upplast: false` | Används inte sedan 2.22: stegen läses inte upp (bara rubriken när lappen fälls ut). |
| `steg[].visas: "med_paminnelse"` | Steget får sin ring först när påminnelsen i steget har kommit (bäret i k1s13, 48.2). Steget måste ha en `paminnelse`. |
| `steg[].ersatter` | **Används inte sedan 2.22** (beslut 47.1): lappen ersätter inga repliker och inte molnet. Kontrollen prövar fortfarande att repliken finns, tills Innehåll har tagit bort fältet. |
| `stampel` | Stämpeln kommer när berättelsen har passerat steget i `efter` (`replik`, `pussel`, `ga_till`, `vantar_pa` eller `bild` på en mellanscen), alltså efter berättelsens stund och före nästa steg. Den slår ned på spelytan bredvid hjälten. |

**Hur lappen följer berättelsen** (`src/karna/uppdrag.js`): allt räknas ur var berättelsen är, så att lappen stämmer också efter en omstart, ett hopp i INSTÄLLNINGAR eller en framspolning.
- Ett uppdrag **börjar** vid den första repliken som lappen ersätter i första steget, annars vid första stegets eget steg, och aldrig före förra uppdragets stämpel.
- Ett steg är **gjort** när berättelsen har passerat steget i `klart`. Gjorda steg är bockar på rubrikens rad, och steget han gör nu står under med pilen (kompakt lapp, 10d).
- Säger lappen vad han ska göra i ett `ga_till` eller `bara`, står inget moln.
- **Klara uppdrag** står i hjältebokens flik KLART. Ordet KLART läses upp om `gransnitt.klart` finns i `aventyr.json`.

Kontrollen säger fel när ett steg, en stämpel eller en ersatt replik inte finns i kapitlet.

## 3c. Var var vi? (2.27)
Farfars påminnelse när spelet startar igen (F2, brief 9a, Innehålls dokument 18). Den finns bredvid scenernas `vid_omstart`, som står kvar som den är. En post per pass i kapitlet:
```json
"var_var_vi": [
  {
    "pass": 2,
    "ord": { "ord": "mat", "bild": "dinomat" },
    "kort": [ { "talare": "farfar", "text": "Var var vi? {unge} är hungrig." } ],
    "lang": [
      { "talare": "farfar", "text": "Var var vi? Staven vaknade i natt." },
      { "talare": "farfar", "text": "Du kläckte ett ägg. Det blev {unge}!" },
      { "talare": "farfar", "text": "Nu är {unge} hungrig." }
    ]
  }
]
```
- **När passet börjar** (han trycker på FORTSÄTT och står vid passets första scen, från dess första steg): `kort`, eller `lang` om det är mer än 3 dygn sedan han spelade. Påminnelsen kommer **i stället för** scenens `vid_omstart`. Det gäller också i början av ett kapitel.
- **Mitt i ett pass:** efter mer än 3 dygn `lang` och sedan scenens `vid_omstart`. Efter kortare tid bara `vid_omstart`, som förut.
- Bara när spelet startar. Spelar han vidare från ett pass till nästa utan att stänga, kommer ingen påminnelse.
- **Ett pass utan post** (prologens första pass) har bara `vid_omstart`.
- `kort` är en replik och `lang` en till tre. Allt läses upp (`upplast` är `true` om det inte står), och `via: "radio"` går att sätta. Repliken följer reglerna för repliker (talare, högst två rader).
- `ord.ord` är ett enda ord som han läser själv. Det står stort i repliken med bilden `ord.bild` (ett bildkort, eller en bild som redan finns tills Stil har ritat den) under alla replikerna i posten. Det läses inte upp, men nosen kan läsa det.
- Tiden är när sparningen skrevs senast. Gränsen (3 dygn, `LANG_TID_DAGAR` i `src/karna/varvarvi.js`) ändrar Teknik om ledningen vill.
- Kontrollen säger fel om passet inte finns, om ett pass har två poster, om ordet är mer än ett ord och om en replik har `upplast: false`.

## 3d. Musiken och ljuden (2.29)
Musiken följer platsen och stämningen, inte kapitlet (beslut 64.5). Det billigaste: **kapitlet har en slinga, ett rum kan ha en egen, och en scen kan ha ett undantag.** Inget behöver skrivas där det inte ändras.
```json
{ "format": 2, "id": "kap-01", "musik": "skogen",
  "rum": [ { "id": "glantan", "namn": "Gläntan", "musik": "skogen", "innehall": [ … ] } ],
  "scener": [ { "id": "k1s13_slutet", "rum": "glantan", "musik": "lagerelden", "steg": [ … ] } ] }
```
- **Slingorna:** `meny`, `spel`, `natten`, `skogen`, `raddning`, `lagerelden` och `byn` (2.37, Stils filer, `SLINGOR` i `src/karna/musik.js`). `null` = tyst.
- **Vilken som spelar** (`musikFor` i `src/karna/musik.js`), den första som finns:
  1. en räddning (P15) som pågår: alltid **`raddning`**, i hela pusslet. Den tonar tillbaka till platsens slinga när pusslet är klart, och behöver ingen data;
  2. det sista steget **`{ "typ": "musik", "slinga": "spel" }`** i scenen, till och med steget som pågår (bytet mitt i en scen, t.ex. efter kläckningen). Det gäller till scenens slut, också när spelet startas om senare i scenen;
  3. scenens **`musik`**;
  4. rummets **`musik`** (i kapitlets `rum`), också när han går mellan rummen;
  5. kapitlets **`musik`**;
  6. annars **`spel`**.
- Menyerna (introt, startskärmen, pausmenyn och INSTÄLLNINGAR) spelar alltid `meny`, och tillbaka i spelet spelar platsens slinga.
- **Byten tonas på ca 1 s.** Samma slinga i nästa scen eller rum spelar vidare utan avbrott.
- **Pausen** (64.5): efter två varv tonas slingan ut och vilar 20–40 s, sedan börjar den om. Inte för `raddning`.
- **Ljud** (beslut 64.6): **`ljud`** är ett ljud-id, eller upp till tre som spelas efter varandra med ett litet glapp:
  ```json
  "vid_valj": { "reaktion": "dörren förblir stängd, en badanka piper ut genom springan och det spolar", "ljud": ["badanka", "spolning"], "replik": { … } }
  ```
  - **På en reaktion** (`vid_ratt`, `vid_fel`, `vid_valj`): ljudet spelas när reaktionen börjar (`efter_3_fel` spelar ingen reaktion, bara ägget som gungar). **Har en felreaktion ett ljud spelas inte bloinget** (`fel`): det roliga ljudet säger redan att det blev fel. En fel låda knarrar först (`lock`), sedan reaktionens ljud.
  - **På en mellanscen:** ljudet spelas när mellanscenen börjar (luftskeppet, fåglarna på morgonen). Steget `ljud` finns kvar för ett ljud som berättelsen ska vänta på (dunket, ungens läten).
  - **Id:n:** Stils id i `assets/ljud/effekter/ljud.json` (10c v0.5), de inspelade (`unge`, `unge_forsta_late`, `unge_langtan`, `unge_svarar`, `fagel_late`, `skata`, `mammas_rop`) och gråboxens gamla namn (`apa_gnaller`, `mage_kurrar`, `ekorre_not`, `klaffen_tick` …, `src/karna/ljudid.js`).
  - **`mammas_rop`** är ungens längtande läte, spelat med `playbackRate` 0,7 och 6 dB svagare (beslut 64.6).
- **Motorn spelar själv**, utan data: papperet (läsplattan öppnas, en lapp eller boken stängs), papperssuset (uppdragslappen fälls ihop), penndraget (en ny bock på uppdragslappen), en sida i sagan, dörren (en dörr med öppningsbilder öppnas), locket (en låda eller kista väljs), bonket (förenklingen spikar igen en dörr), stegen (ett knack per steg), suset (det han bär läggs på målet), hmm (bärpåsen är tom) och fanfaren med kapitelrubriken. **Baronens motiv** (`baron`) spelas där han dyker upp: skriv det som `ljud` på mellanscenen (luftskeppet, sidovyerna).
- Kontrollen säger fel om en slinga eller ett ljud-id inte finns, och schemat om `ljud` har fler än tre id.

## 3e. Kapitel 2:s fält (2.31)
Formen kommer från rapporten 12:30 (Teknik 26) och Innehålls tillägg i 64.2. **Motorn bygger dem i kapitel 2:s gråbox** (Teknik 20), och kapitlet spelas inte förrän alla rum har en karta.
- **P11 med tangentbordet:** `"skriv": "tangentbord"`. Fälten visar formelns längd och växer när han skriver fler bokstäver.
  - `formler[]` får **`godtas`** (andra former, staven ristar in `ord`) och **`ristas: false`** (ordet räcker en gång och ristas inte in);
  - `nastan[]` får **`tand`** (`forsta` eller `forebild`, och utan `tand` tänds ingenting, 2.36) och **`replik`**;
  - **`rimliga`**: ord som passar men inte hjälper, var och en med `reaktion`, `replik`, `ljud` och `ljudord`. De räknas aldrig som fel;
  - **`vanligt_svar`**: repliken för andra riktiga ord. Bara det som inte är ett ord får "pff".
- **Steget `nav`:** `grenar` (`scen`, `mal`, `bild`), `mellan_grenar` (steg) och `knuff`. Grenarna tas i valfri ordning, och en gren är klar när dess scen är spelad. Grenarnas scener står efter navet i `scener`, och de bryter inte passet: en sparpunkt i `mellan_grenar` slutar det.
- **`{ord:<pussel>}`** i en text: ordet han skrev i det P11 (BRO, STEGE, REP eller FLOTTE). Kontrollen räknar radens längd med det längsta ordet.
- **`kraver`** på en variant i ett läsval: `{ "pussel": "k2_grodan", "variant": "L4" }`. Annars får han närmaste lägre variant.
- **`villkor`** på en replik i `var_var_vi`: `{ "gren_kvar": "k2s04_bryggan" }` (grenens scen är inte spelad). Repliker med villkor räknas som en, och högst tre hörs.
- **`oppna_lasplatta`** med **`skylt`** i stället för `pussel_id` (skyltens text visas igen) och **`lys_ord`** (ordet lyser i guld i texten tills nästa steg).
- **`redan_last`** på ett läsval: så många av lästextens första rader visas grå med en bock.
- **`ga_till` till `unge`:** ungen är målet.
- **`bara` till ett annat rum** i kapitlet: han bär saken dit. Medan den följer honom är rummets utgångar stängda utom vägen mot målet, och målet glimtar.
- **`lockar`** på en frivillig scen: `vid` (en utgång i något rum), `beskrivning`, `bild`, `ljud` och `ljudord`. Det händer när han går förbi, igen varje gång tills han har varit där, aldrig under en replik eller ett läsval.

**Så spelar motorn resten av fälten** (Teknik 20 del 4):
- **`{ord:<pussel>}`** blir ordet han skrev i det P11 (sparat i sparningen), i texten och i rösten. Saknas det (ett hopp i menyn för vuxna) blir det pusslets `svar`.
- **`kraver`:** en variant med `kraver: { pussel, variant }` gäller bara när det pusslet är löst i den varianten (det står i lärandets historik, med hur många försök som helst). Annars får han närmaste lägre variant, också på en högre nivå.
- **`oppna_lasplatta` med `skylt`** visar skyltens text igen på läsplattan, och **`lys_ord`** lyser i guld där tills han stänger den.
- **`redan_last`:** de första raderna står grå med en bock, på läsplattan och när lappen öppnas igen.
- **Ett brev i ett läsval i rummet** (en text med flera rader, som Farfars brev i Tant Rosas hus) ryms inte i bubblan. Han läser det på läsplattan först, och sedan visar bubblan papperet, som ett tryck öppnar igen. Lappknappen öppnar det också.
- **Tant Rosas dörr** går inte att gå in genom förrän berättelsen går dit (k2s07), eftersom han inte har varit i huset. Inget fält behövs.

**Så spelar motorn navet** (2.33, Teknik 20 del 3):
- **I navet** går han fritt i rummet. Varje gren som inte är klar har sin utgång (`mal`) som mål, och molnet visar grenarnas bilder (`bild`) med instruktionen före navet, efter en gren den sista upplästa repliken i `mellan_grenar`. Han kan också gå till rum han har varit i och till en frivillig scen, som under ett `ga_till` med fri väg. Knuffen efter ca 15 s: ungen springer mot närmaste gren som inte är klar och väntar där. Den visar aldrig sin text, eftersom ungen gör det den säger.
- **En gren** spelas när han går ut genom dess utgång. När grenens scen är slut kommer `mellan_grenar` (om grenar är kvar) och sedan navet igen. När alla grenar är klara fortsätter berättelsen med scenen efter navet och grenarna.
- **Passet:** efter en `sparpunkt` med `pass_slut` i `mellan_grenar` räknas allt till passet för scenen efter navet (pass 3 i kapitel 2), också den andra grenen. Börjar han spela igen i navet, kommer det passets "Var var vi?" i stället för scenens `vid_omstart`, och repliker med `villkor: { "gren_kvar": … }` hörs bara medan den grenen inte är klar. Mitt i en gren hörs grenens `vid_omstart`.
- **Uppdragslappen:** ett steg i en gren är gjort när grenen är klar, i vilken ordning han än tar dem.
- **Menyn för vuxna:** ett hopp till en gren spelar den grenen som om han valt den i navet, och de andra grenarna är inte spelade. Passen i menyn börjar vid passets första scen, så pass 3 i kapitel 2 börjar vid `k2s07` (efter båda halvorna).
- **`bara` till ett annat rum:** saken följer honom, och i varje rum är utgångarna stängda utom vägen mot målet, som glimtar. Resten av scenen spelas i rummet där han lade saken, också efter en omstart.
- **`lockar`:** när han kommer nära utgången (ca 3 rutor) medan han går fritt (ett mål, navet eller fri lek), och bara om han kan gå dit (inget rep i vägen). Ljudet och ljudordet kommer vid utgången, och ungen springer dit och väntar. Med `bild` spelas regin, annars visas beskrivningen en stund i gråboxen utan att världen stannar. Beskrivningen räknas som en mellanscen i kontrollen (`syns_redan` döljer den).

## 3b. Rummens kartor (Tiled)

Innehållet säger **vad** som finns i ett rum, kartan säger **var** det står. Kartorna ägs av teknik (i gråboxen) och stil (när grafiken kommer) och ligger i `kartor/<äventyr>/<rum>.tmj`. Öppna dem i Tiled.

- Kartan är 20×12 rutor à 16 pixlar (320×192, en skärm), eller större: **ett område** är högst 40×24 rutor (2×2 skärmar, beslut 14 och 18.1). Då följer kameran hjälten med en mittzon och stannar vid kanterna. Gränserna dras vid tydliga passager. **Ett läsval ryms alltid på en skärm:** alternativen och skylten med frågan, med plats för skyltarna ovanför (testas). När frågan ställs glider kameran så att hela valet syns.
- Ett objektlager. Varje föremål är en rektangel där **namnet är föremålets id** i rummets `innehall`. Ingen text som spelaren ser.
- **Typ** (klass): `utgang`, `sak` eller `figur`. Saknas den gissas den av id:t (`dorr_`, `stege_`, `grind`, `stig_` är utgångar).
- **`visar`** = pusslet vars alternativ föremålet visar i rummet: lådorna i `p0_dinomat` ritas i den variant spelaren får, i rätt färg och storlek, och krukorna (P26) delas ut där `sex_krukor` står.
- **Egenskaper:**
  - `till` = rummet en utgång leder till (hjälten kommer in där när han kommer från det rummet).
  - `riktning` = åt vilket håll utgången leder (`vanster`, `hoger`, `upp`, `ned`). Krävs på varje utgång med `till`. Nästa rum glider in från det hållet, och två dörrar mellan samma rum har motsatt riktning (testas).
  - `sida` = var hjälten ställer sig när han går dit med ett tryck (`under`, `over`, `vanster`, `hoger`, annars under). `alla` = föremålet har ingen framsida (krukor, buskar, en låda mitt på golvet) och han går till närmaste håll. **Nära nog räcker:** saker, figurer och stegar går att använda från alla håll inom ca 1,5 rutor (24 pixlar) från kanten, och bara den närmaste är aktiv (lika nära: den han är vänd mot). Vid stegen ställer han sig själv mitt för den.
  - `golv` = man går på föremålet (stigar, grinden).
  - `klattra` = stegen klättras (`upp` eller `ned`). Hjälten klättrar själv och kommer fram på stegen i nästa rum.
  - `ute` = utedörren, som ritas ljusare än dörrarna inomhus och har en dörrmatta på insidan.
  - `last_i` = tillstånd då utgången är låst, med komma emellan (ytterdörren: `natt`). Hjälten känner på handtaget och tar ett steg tillbaka, ingen text.
  - `lapp` = föremålet där ordet visas när utgången är ett val, t.ex. skylten vid en stig. Skyltarna på dörrar och stigar i ett val syns hela tiden.
  - `talare` (på en figur) = figurens talare: ett tryck på figuren upprepar dess senaste instruktion.
  - `forsvinner_efter` = ett pussels id, en formel eller ett P26: föremålet är borta när hjälten har formeln, eller när pusslet är gjort (lianerna i skogsbrynet efter `k1_lianerna`, den lilla lianen efter `k1_liten_lian`). Det gäller också efter en omstart.
  - `delas: "hela"` = när ett P26 delar föremålet fyller delarna hela föremålet (lianväggen), i stället för att bli krukor i rad.
  - `bild_rad` (2.18) = bilder med komma emellan som ritas i rad över hela föremålet, en per bildbredd (lianväggen: `lian_a,lian_b`). `bild_hugg` = bilderna när en del huggs, i ordning (`lian_hugg_01,lian_hugg_02`). `bild_kvar` = bilden som står kvar när delen är huggen (`lian_kvar`). Det som står kvar är inget hinder och ritas också efter en omstart. Ett test kontrollerar att bilderna finns.
  - `oppning` (på en stig med `golv`) = när stigen syns skär den igenom hindret den ligger över. Hålet i häcken (`stig_genom_hacken`, `dold`) ligger över häcken, och häcken är hel tills stenen har visat hålet.
- **Varianterna i ett läsval i världen:** alla varianters föremål står i kartan, men bara den variant han får syns. Den rätta saken kan stå på samma plats i flera varianter (`hog_sten` och `hog_rund_sten`), så att bara en dold väg behövs.
- **Alternativen i ett val** (lådorna i FILT och dinomaten) står minst 3 rutor isär, så att ingen plats når två av dem (testas).
- **Hus och vatten ute** (kapitel 2:s gråbox): rutor med typen `vagg` står i vägen och ritas, vatten med egenskapen `vatten`. De är inga föremål och står inte i rummets innehåll.
- **Regins punkter** (2.32): en punkt som heter `regi_<namn>` är en plats för regin, inget föremål. `regi_farfar` är där Farfar står i dörren (`farfar_i_dorren`).
- **Kartans egenskap `morker`** (0–1) säger hur mörkt rummet är på natten (annars 0,72). Hallen har 0,55.
- **Kartans egenskap `inomhus`** ger rummet en väggram: bakvägg 3 rutor, sidoväggar 2, främre kant 1. Dörrar sitter i väggarna och möbler står längs dem. Egenskaperna `vagg_bak`, `vagg_sida` och `vagg_fram` (pixlar) ger andra mått.
- **Typen `vagg`** (2.11) = massiv vägg inne i rummet. Den ger rummet dess form och hör inte till innehållet, så namnet används inte. Hallen är en bred entré och en smal korridor västerut: en `vagg` söder om korridoren gör korridoren smal. Dörrar kan sitta i en sådan vägg (SOV i korridorens främre vägg, BAD i entréns vänstra vägg). Väggens kant mot golvet ovanför ritas som en främre kant, och kanterna mot golvet bredvid som sidoväggar.
- En **punkt** som heter `lampa` (eller `lampa_…`) lyser varmt när rummet är mörkt, t.ex. läslampan vid Farfars fåtölj i läsrummet.
- En **punkt** med namnet `start` är där hjälten står när han inte kommer genom en utgång (första gången, eller efter en omstart). En punkt `in_<rum>` är där han kommer in från ett rum som inte har någon utgång hit (t.ex. trädgården från hallen).
- **Stigar** (granskningen, punkt 16): en stig är en utgång med `golv` och `riktning`, och rutan går från vägskälet till **kurvan**, där stigen försvinner bakom buskarna, inte ända till kanten. Valet räknas när han når kurvan. En fel stig leder aldrig vidare: bakom kurvan händer felet (han syns inte), och sedan kommer han tillbaka till vägskälet. Går han samma prövade stig igen händer samma sak, utan att räknas. Förenklingen spärrar prövade stigar med en gren tvärs över stigens början.
- **Höjdnivåer** (A Link to the Past): en ruta med typen `yta` och egenskapen `niva` (1, 2 …) är upphöjd, t.ex. kullen med krönet. Kanterna går inte att gå över. En ruta med typen `trappa` eller `stege` förbinder nivåerna och ska ligga över kanten, med en bit på varje nivå. På trappan går han som vanligt, på stegen klättrar han upp och ned med ryggen mot kameran (ungen väntar och skuttar efter). Saker på ytan (lövhögarna) når han bara uppifrån. Ett tryck på något på en annan nivå går över närmaste trappa eller stege. Ett `ga_till` till en yta (`kronet`) är klart när han står på den.
- **Grafiken (2.14):** kartans egenskap `bild` är rummets bild (`assets/rum/<zon>/<bild>.png`, i kartans storlek) och `mark` är rutsetet för marken utomhus (`assets/tiles/<mark>/`). Ett objekts `bild` är föremålets bild (namnet i föremålens eller figurernas atlas), `bild_natt` bilden på natten, `bild_pa` ett annat föremål vars nederkant bilden står på (Farfar i fåtöljen), och `bild_del` bilden för delarna när föremålet delas (krukorna). Bildens nederkant mitt står på föremålets nederkant mitt. `sovplats` = sängen där hjälten sover i en scen med `hjalte: "sover"`. `skata_fonster` = fönstret där Herr Skata syns när han skrattar. `lyser` = föremålet ligger ovanför rummets mörker på natten (vindsfönstret med månarna, Stil 2026-11-03). Ett test kontrollerar att varje bild finns.
- **Skogens grafik (2.21):** en karta med `mark` kan ha **rutlager** före objektlagret, i rutsetet `assets/tiles/<mark>/<mark>.json`. `golv` är marken (gräs, stig, vatten, kullen), och vattnet växlar bild bara när det syns. `over` är skogens ridå runt kanterna och ritas ovanför figurerna. Ett lager med egenskapen `visas_med` (ett föremåls id) ritas bara när det föremålet syns (`stig_backen`). Rutlagren skrivs av `verktyg/kartor/skog.py`, som går att köra igen. Objektens nya egenskaper:
  - `bild_sedan` med `sedan` = bilden när steget i `sedan` är gjort (ett pussel, en formel, ett föremål som har visats eller en frivillig scen som är gjord): hacket i häcken är öppet, stubben bar och skattlådan öppen. Det gäller också efter en omstart.
  - `bild_anim` = bilder med komma emellan som byts i tur och ordning, och `anim_ms` = hur länge varje bild står (minst 250 ms, golvdatorn). Bara när rummet syns och spelet inte står stilla.
  - `rutor` = föremålet ritas av rutlagren (kullen, krönet, bäcken) och har ingen egen bild.
  - `bild_sitter` (2.23) = bilden när hjälten sitter i föremålet (`hjalte_fatolj_vanster`). Han sätter sig när ett `ga_till` till föremålet är klart, och reser sig när han ska röra sig igen.
  - En bild som är högre än föremålet (träden) står bland figurerna och sorteras efter fötterna, så att hjälten står bakom trädet när han är ovanför dess fot och framför det när han är nedanför.
  - Typen **`omgivning`** (`fagel`, `fjaril`, `lov`, `ekorre`) = en ruta där något levande händer ibland, var 8:e–20:e sekund: fåglar som flyger när han kommer nära, en fjäril, löv som faller, ekorren som tittar fram. Den hör inte till innehållet, så namnet behöver inte stå i rummet, och den är inget hinder.
- Saknas kartan placeras föremålen automatiskt i ett rutnät (provrummen i testerna). En utgång leder då till rummet i sitt id (`stig_buskarna` → `buskarna`) om det rummet finns.

Kontrollen säger fel om ett föremål saknas i kartan, om kartan har föremål som inte finns i rummet, om något går utanför rummet, om en utgång leder till ett rum som inte finns eller saknar `riktning`, om `klattra` står på något som inte är en utgång, om `lapp` pekar på ett föremål som inte finns i rummet och om `in_<rum>` inte är ett rum. Kontrollen säger också fel om `forsvinner_efter` inte är ett formelpussel eller ett P26 och om `alias.rum` pekar på ett rum som inte finns. Ett enhetstest kontrollerar att varje föremål går att nå från varje ingång i varje tillstånd, i kapitel 1 också uppe på kullen och i apans bo, och att häcken och lianerna stänger vägen tills stenen och SVÄRD öppnar den.

### Låsta kapitel: `kapitel_last` i aventyr.json (2.13)
Ett kapitel kan vara låst tills den vuxne öppnar det på enheten (beslut 24.2: spelaren spelar varje kapitel en gång, som en premiär). `last` listar kapitlen som är låsta från början, och `steg` är slutrutan (`mellanscen` och `replik`, som `sluta_for_idag`).
- När nästa kapitel är låst spelas slutrutan i stället för frågan vid kapitlets sista sparpunkt (`pass_slut`). Sedan står den sovande ungen och en stjärna kvar, och ▶ spelar slutrutan igen.
- FORTSÄTT kommer till slutrutan igen så länge kapitlet är låst. Inget raderas och inget börjar om.
- Den vuxne öppnar kapitlet i INSTÄLLNINGAR (en kryssruta per kapitel i `last`), eller genom att hoppa till en scen i det. Inställningen gäller bara den enheten. `?kapitel=<id>` går alltid förbi låset.

### Pausmenyn: `gransnitt` i aventyr.json
Pausmenyn har två bildknappar, KARTAN och MIN BOK (hjälteboken), och hjälteboken har flikarna STAVEN, KLÄDER (garderoben) och DINOBOKEN (stilguiden §6, beslut 22.2). Varje knapp och flik är en bild och ett ord, och ordet läses upp vid tryck. Orden står i `aventyr.json` (nycklarna har dokumentens namn):
```json
"gransnitt": { "kartan": "kartan", "hjalteboken": "min bok", "staven": "staven", "garderoben": "kläder", "dinoboken": "Dinoboken" }
```
`sluta_for_idag` har ett eget ord (`sov`, Innehåll F11). Saknas det visar knappen bara den sovande ungen.
`klart` (2.24) är ordet för fliken KLART och för stämpeln (`klart`). Saknas det visas bara bilden, och stämpeln läses inte upp.
`fortsatt` och `nytt_aventyr` (2.27) **används inte** sedan startskärmen fick Stils bilder (0.36.0, F4): inga ord under knapparna (beslut 62.5), och Innehåll lägger inte in dem. Fälten får stå kvar i schemat, men spelet visar dem inte.
Saknas ett ord visas bara bilden. Det som står på sidorna kommer från sparningen: formlerna (staven), sakerna hjälten har hittat (`ge_sak`, garderoben), Dinobokens sidor (`dinobok`) och kartbitarna.

## 4. Ordlistor

```json
{ "ord": "filt", "lista": 2, "bild": "🧣", "tema": "hemma", "flaggor": [] }
```

Små bokstäver utom formler (`"LJUS"`). Flaggor: `aao`, `helord`, `sparrad`, `berattelseord`, `formel`, `ordbild`. `forbjudna_par` med små bokstäver.

## 5. Vad kontrollen fångar

**Fel (stoppar publiceringen):**
- Fält som inte finns i schemat (stavfel i fältnamn), fel typ, saknade fält.
- Text i versaler som inte är en formel. Platshållare i versaler (`{UNGE}`) eller okända platshållare.
- Okänd talare, rum, objekt (`ga_till`), pussel eller tillstånd. Dubbla id:n, samma föremål två gånger i ett rum.
- `syns_i` med ett tillstånd som rummet inte har. `i_rummet` där ett alternativ saknar `objekt` eller både `ord` och `bild`, eller där föremålet inte finns i rummet där pusslet spelas.
- Kartor som inte stämmer med rummen (avsnitt 3b), och `visar` som pekar på ett pussel som inte finns.
- Skyltar, frivilliga föremål, `las_skylt`, `visa_foremal`, `skylt` och `foremal` som pekar på föremål som inte finns i rummet. En frivillig scen utan `startar_i_rum`, och `paminnelse` utan `vantar_pa`.
- Räddningens brickor som inte räcker till ordet, och `sak_i_sista` som inte finns i `innehall`.
- `alias` som pekar på ett id som inte finns, eller ett gammalt id som finns kvar. `nivaer` där golvet ligger över taket. `ljud` med ett `foremal` som inte finns i rummet.
- Fälten i 2.31 som pekar fel: en gren, ett mål eller ett `{ord:…}` som inte finns, ett `lys_ord` som inte står i skylten, och fler än tre repliker som hörs i `var_var_vi`.
- **En reaktion eller knuff som visar sin text i ett klart kapitel** (2.32, beslut 67.3): samma regel som för mellanscenerna nedan. Kontrollen skriver ut hur många som är kvar.
- **Ungen springer till något som inte finns i rummet** (`unge_till`, 2.32).
- **En mellanscen som visar sin beskrivning i ett klart kapitel** (2.30, beslut 65): kapitlet har `"meta": { "klart": true }`, och mellanscenen har varken `bild` eller `syns_redan`. Mellanscenerna i `aventyr.json` prövas när `aventyr.json` har `meta.klart`. Kontrollen skriver alltid ut hur många som är kvar i varje kapitel.
- Läs och välj utan exakt ett rätt svar.
- Förbjudna par på samma skärm (lås–läs, hår–här, bår–bär), och rätt svar och distraktor som bara skiljer sig på Å/Ä i L1–L3.
- Spärrade ord (mjukt G/K, NG, SJ …) i text spelaren läser själv, även böjda former (berget, köket).
- Formelbrickor som inte räcker till svaret, extra brickor på S1, förebild som inte är svaret.
- Kodlås där tecknen och nyckeln inte ger svaret. Räddningsord som är spärrade.
- P28 där alla eller inga alternativ är rätt.

**Varningar (stoppar inget):**
- En slinga (`musik`) eller ett ljud-id (`ljud`, steget `ljud`) som inte finns än (2.29, varning från 2.31): det hörs inget, eller syntesen, tills Stil har gjort det.
- **Repliker som blir mer än två rader** på läsplattan. Radbredden är 16 em (768 punkter vid 48 punkters text, i versaler), räknad med Lexends egna teckenbredder (`verktyg/lexend-bredder.json`, utan extra bokstavsavstånd).
- Mer än 8 ord på en rad i text spelaren läser själv.
- **Färre än två läsuppgifter som avgör något per pass.** Räknas: P1, P28, P15 (kategorin läses). Inte P9: kodlåset är avkodning med nyckel.
- **Pass som uppskattas till mer än 10 minuter.** Uppskattningen: 1,5 s + 0,45 s per ord och replik, 40 s per pussel, 12 s per `ga_till`, 4 s per mellanscen, 6 s + uppläsning per bokuppslag.
- **Instruktioner som nämner en enhet** (piltangent, tangentbord, mellanslag, mus, klicka, svep). Skriv "Gå till lådan" och "Tryck på …", som gäller både dator och iPad.
- **Ord i en lästext som saknas i ordlistorna** (granskningen A 25): varje ord i text spelaren läser själv (lappar, skyltar, alternativ, kategorier, bildtexter), också böjda former (SKYLTAR, STENEN). En varning per ord och kapitel, med första stället.
- Pass som inte slutar med en sparpunkt, pussel som inte används, meningar som börjar med liten bokstav.

Kontrollen skriver också ut varje pass med uppskattad tid och antal läsuppgifter.

## 6. Ändringar mot Innehålls utkast v0.3

| v0.3 | Format 1 |
|---|---|
| Text i versaler | Vanlig skrift. Formler i versaler. |
| `{UNGE}` | `{unge}` |
| `talare` och `platshallare` i kapitelfilen | I `aventyr.json` |
| `kapitel`, `niva: null`, `bedoms`, `vila`, `krukor` på pusslen | Utgår (följer av filen och typen) |
| P1 med `svar`, `alternativ` och `bild` direkt på pusslet | Alltid `varianter` per nivå, `ratt: true` på rätt alternativ |
| P1 `alternativ` som strängar + `fel_reaktioner` | Alternativ som objekt med `vid_valj` |
| `vid_ratt.nasta_scen` | Utgår: scenerna spelas i ordning |
| `upplast: false` och `ledtradar_upplast` på pusslet | Utgår: lästext läses aldrig upp automatiskt |
| `aldrig_automatisk_losning` | Utgår: gäller alltid |
| `krav`, `skrivs_i_scen` | `anteckning` |
| `id`, `version`, `datum`, `agare`, `status` överst | `format`, `id` (`kap-00`), `kapitel`, och resten i `meta` |
