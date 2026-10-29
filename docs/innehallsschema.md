# Innehållsschema – kapitel i format 2

Version 2.8 (2026-10-29). Ägs av teknikspåret.
2.8: kapitel 1:s steg och fält (T2). Rummen får `skyltar` (text som står i världen, beslut 15.2), `frivilligt` (föremål som ger något en gång) och `dold` på föremål. Scenerna får `frivillig` och `startar_i_rum`. Nya steg: `las_skylt`, `visa_foremal`, `ge_sak`, `dinobok`, `unge_tillagg`, `fri_vag` på `ga_till` och `paminnelse` på repliker som väntar. Pusslen: `skylt` på läs och välj, titta–täck i formeln, brickor och kasta-läge i räddningen, kodlåsets kontroll, och svingning mot rummets föremål i P26. Allt är tillägg, filer i 2.7 gäller fortfarande.
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
| `content/<äventyr>/aventyr.json` | Titel, talare, platshållare, kapitelordning, `sluta_for_idag`, `sparpunkt_fraga` (frågan vid varje sparpunkt) | `aventyr.schema.json` |
| `content/<äventyr>/kap-00.json` … `kap-07.json` | Ett kapitel: rum, scener, pussel | `kapitel.schema.json` |

Kapitelfilerna börjar med `"format": 2`, äventyret och ordlistorna med `"format": 1`. Ändras formatet höjs numret, och teknik skriver om gamla filer. En kapitelfil i format 1 godtas inte längre: byt `P27_packa` mot `P28_packa` och `format` mot 2.

## 2. Text

- **All speltext lagras i vanlig skrift**, med stor bokstav där svenskan har det: `"Ta den röda lådan."`, `"Farfar"`, `"Baron Gripklo"`, `"Ordträdet"`. Spelet visar versaler tills nivån säger annat. Gemener kostar då ingen omskrivning senare.
- **Enstaka ord** (etiketter på lådor, bildtexter, ord i ordlistorna) skrivs med små bokstäver: `"filt"`, `"bär"`.
- **Formler skrivs alltid i versaler**: `"LJUS"`, `"STOR STEGE"`. Det är stavens skrift. Formler får också stå i versaler mitt i en mening.
- **Platshållare med små bokstäver**: `{unge}` (ungens namn) och `{hjalte}` (hjältens namn). Namnet visas i samma skrift som texten runt omkring.
- **Rader:** en text är en sträng, eller en lista med rader (`["Dinomat.", "Ta den röda lådan."]`). Spelet bryter aldrig inom en rad i listan, men kan bryta en lång sträng mellan ord.
- **`upplast`:** `true` läses alltid upp (instruktioner, berättaren, repliker). `false` läser spelaren själv. Lästexten i pussel läses aldrig upp automatiskt, så den har inget eget `upplast`-fält.
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
- **En frivillig scen** (`"frivillig": true, "startar_i_rum": "buskarna"`) spelas inte i tur och ordning. Den spelas första gången hjälten går in i rummet medan ett `ga_till` med `fri_vag` pågår, högst en gång. Efteråt går han tillbaka själv. Den räknas inte in i passets tid.
- **Scenerna spelas i ordning.** Ett `pussel`-steg väntar tills pusslet är löst. Det behövs alltså ingen `nasta_scen`.
- `meta` och `anteckning` är fria fält för versionsnummer och noter. De påverkar inte spelet.
- **`nivaer`** (frivilligt): golv och tak i kapitlet, `{ "lasning": ["L1", "L3"], "skrivning": ["S1", "S1"] }`. Anpassningen håller sig inom dem.
- **`alias`** (frivilligt): id:n som har bytt namn, så att äldre sparningar hamnar rätt: `{ "scener": { "s10_ladorna": "s11_ladorna" }, "pussel": { … } }`. Bara för id:n som inte finns längre. En sparning i en scen som har tagits bort utan alias börjar i början av samma pass.

### Steg

| `typ` | Fält | Vad som händer |
|---|---|---|
| `replik` | `talare`, `text`, `upplast`, `vantar_pa`, `via`, `vid`, `paminnelse` | Någon säger något. Visas på läsplattan. **`vantar_pa`** (`"mata_ungen"`: ungen har ätit, `"nosen"`: spelaren har tänt nosen): en instruktion som ber om en handling väntar tills den är gjord. Den står uppe i rummet medan världen går, upprepas med en styrbild efter ca 8 s, och nästa steg kommer först efter handlingen. **`via: "radio"`**: repliken hörs genom radion. **`vid: "ungen"`**: texten står i en bubbla ovanför ungen i stället för på läsplattan och läses upp (namnet i s08). **`paminnelse`** (`efter_sek`, `replik`), bara med `vantar_pa`: efter så många sekunder kommer en annan replik i stället för samma instruktion igen ("{unge} är rädd.", sedan "Ge {unge} ett bär."). Fälten finns bara på repliker som är egna steg. |
| `mellanscen` | `beskrivning`, `bild` | Något händer i bild. Gråboxen visar beskrivningen för den vuxne. |
| `ljud` | `id`, `foremal` | Ett ljud spelas. Med `foremal` hoppar föremålet till i bild (ägglådan som dunkar). Samma `id` ger alltid samma ljud. |
| `unge_folj` | `folj` | Ungen börjar (`true`) eller slutar (`false`) följa hjälten. |
| `ga_till` | `mal`, `visa_styrhjalp`, `knuff`, `vid_annan_utgang`, `fri_vag` | Spelaren ska gå till ett objekt i rummet. **`fri_vag: true`** (fritt vägval): de andra utgångarna går också att gå igenom, och rummet bakom visas (med en frivillig scen första gången). Steget är klart när han går genom målet. **`vid_annan_utgang`** (`ljud`, `handling`, `replik`): de andra utgångarna är låsta under steget. Går hjälten till en av dem öppnas den inte, ljudet spelas, hjälten tittar upp och målet lyser (hallen före kläckningen: `{ "ljud": "dunk" }`). |
| `pussel` | `pussel_id` | Ett pussel startar. Scenen fortsätter när det är löst. |
| `oppna_lasplatta` | `pussel_id` | Visar pusslets lästext utan att pusslet startar (farfars lapp). |
| `visa_ui` | `element` | `nosknappen`, `barraknaren`, `radioramen` eller `hjalteboken` visas första gången. |
| `nos_demo` | `ord`, `kostnad` | Spelaren nosar själv: senaste lappen öppnas med nosen tänd, och `ord` glimtar (på datorn redan markerat, Mellanslag läser). Han går vidare när han har hört ordet. `kostnad: 0` = gratis. Föregås av "Tryck på nosen." med `vantar_pa: "nosen"`. |
| `ge_bar` | `antal` | Bär till ungen. |
| `ge_kartbit` | `nummer` | Kartbit 1–7. |
| `ge_grad` | `grad`, `fest` | Ny trollkarlsgrad, i ordning: `Lärling`, `Ordsmed`, `Lögnavslöjare`, `Gåtlösare`, `Berättare` (äventyr 1) och `Mästertrollkarl` (seriens sista, nås inte i äventyr 1). |
| `bok` | `id`, `talare`, `las_upp_efter_tryck`, `uppslag` | Bläddringsbar bok. Varje uppslag: `bild`, `bildtext` (ett ord), `text`. |
| `skapa_hjalte` | `delar`, `bara_bilder` | Spelaren väljer hjältens utseende. |
| `sparpunkt` | `pass_slut`, `valfri`, `fraga` | Spelet sparas. `pass_slut: true` där passet slutar: två bilder, ▶ för att fortsätta och den sovande ungen för att sluta för idag. **`fraga`** (replik) läses upp och står ovanför bilderna. Utan `fraga` används `sparpunkt_fraga.text` i `aventyr.json`. |
| `fritt` | `beskrivning`, `foremal` | Fri lek, t.ex. buskar att svinga staven mot. Ingen knapp: steget tar slut när varje föremål har gett sina två bär, när hjälten går mot en utgång eller genom en öppning (grinden), eller efter 25 sekunder utan att något händer. |
| `bara` | `bild`, `till` | Hjälten bär en sak (filten): den svävar efter honom som ljusbollen och läggs på `till` när han når fram själv. |
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

**Fråga igen** (dialogregeln): en figur med `talare` i kartan upprepar sin senaste upplästa replik i scenen när spelaren trycker på den. Farfar i köket har `talare: farfar`.

**Knuffar som pekar på svaret** får `"pekar": true` (till exempel "ungen lutar sig mot rätt dörr"). De kommer tidigast efter första felet, eller efter 4 sekunder per alternativ och minst 12 sekunder, så att det aldrig lönar sig att vänta i stället för att läsa. Knuffar som upprepar frågan (tankebubblan blinkar, Farfar ropar igen) har inget `pekar` och kommer efter 9 sekunder som förut. Kontrollen varnar när en knuff i ett läsval nämner "rätt" eller "mot" utan `pekar`.
`vid_ratt`, `vid_fel`, `efter_3_fel` och `vid_valj` har `handling` eller `reaktion` (vad som händer i bild, fri text i gråboxen), `replik` och `fest` (`liten`, `mellan`, `mellan_dampad`, `stor`).

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
- **`i_rummet: true`** (läs i världen): alternativen ligger i föremål runt rummet i stället för kort på läsplattan. Varje alternativ har `objekt` (föremålets id i rummet) och `ord` eller `bild`. Frågan (`bild` eller `text`) syns uppe i rummet.
  - **En sak** (låda, kruka): när hjälten står vid den syns ordet vid föremålet, och spelaren trycker på ordet (eller på föremålet igen, eller Mellanslag) för att öppna. Ett alternativ utan `ord` (lådor som skiljs åt på färg och storlek, se `visar`) visar handen i stället. Fel föremål ger sin `vid_valj` och blir tomt.
  - **En utgång** (dörr, stig): ordet syns på skylten när hjälten är inom ungefär en ruta från dörren eller skylten (kartans `lapp`). Att gå igenom utgången är valet. Fel dörr öppnas aldrig: hjälten tar ett steg tillbaka och `vid_valj` spelas vid dörren. Förenklingen spikar igen dörrar och stigar med plankor.
  - Glimten är lika för alla saker som är kvar och avslöjar aldrig svaret. Utgångar glimtar inte. Förenkling och att ungen pekar fungerar som vanligt.
  - **Inget nivåbyte i världen** (granskningen, punkt 18): varianten bestäms när hjälten kommer in i rummet. Förenklingen spärrar prövade dörrar och stigar (med plankor eller en gren) och byter aldrig variant, eftersom föremålen i rummet då skulle bytas framför honom.
- **`skylt`** (frivilligt): lästexten står på ett föremål i rummet, Farfars träskylt. En markering (ett papper) sitter vid skylten, och läsplattan öppnas när hjälten går dit. Han kan gå tillbaka och läsa igen.
- **Knufftiden** på läsplattan följer textmängden: ca 11 sekunder per mening i lästexten och alternativen, minst 9. `efter_sek` på knuffen går före.

```json
{ "id": "p0_filt", "typ": "P1_las_och_valj", "i_rummet": true,
  "varianter": { "L1": { "bild": "tankebubbla_filt", "alternativ": [
    { "id": "filt", "ord": "filt", "objekt": "lada_hornet", "ratt": true },
    { "id": "bil", "ord": "bil", "objekt": "lada_hyllan", "vid_valj": { … } } ] } } }
```

### P11_formel

`niva` (S1–S5), `svar` (versaler), `formler` (`ord`, `effekt`, `tillstand_efter`), `nastan` (`ord`, `effekt`), `forebild` (`text`, `placering`, `ligger_kvar`, `tacks`, `brickor_efter_sek`), `brickor` (en versal per bricka), `helord`, `ratt_bokstav_stannar`, `forsta_formel`.

**Brickor ligger alltid i bokstavsordning** (granskningen), i alla pussel med brickor. Ordningen i datan spelar ingen roll.

**Titta–täck** (`"tacks": "forsta_brickan"`): förebilden syns, brickorna glider in efter `brickor_efter_sek` sekunder, och förebilden tonas bort när första brickan läggs (ungen håller för ögonen). Vid fel eller knuff tänds den igen och står kvar resten av försöket, och försöket loggas med förebild. Vid rätt lyser förebilden en sekund ovanför hans ord.

### P12_dop

`sparas_som` (`hjalte.namn` eller `unge.namn`), `min_bokstaver`, `max_bokstaver`, `vuxen_far_hjalpa`. Bedöms aldrig.

### P28_packa

Som P1, men **flera alternativ har `"ratt": true`** och spelaren väljer alla. Upp till 6 alternativ. Fel val studsar tillbaka (`vid_fel` på pusslet eller `vid_valj` på alternativet).

### P15_raddning (fas 3)

Hänga apan-familjen. `kategori` (text spelaren läser själv), `svar` (ett ord, små bokstäver), `brickor`, `kasta`, `reserv_ord`, `tillatna_fel`, `mjukt_misslyckande`, `variant`, `falt` (beskrivning). Ett fält per bokstav; en rätt bokstav fylls i på alla platser där den finns. Ett tryck i taget: reaktionen spelas klart innan nästa tryck tas emot. En fel bricka tonas ut.

**`kasta`** (`erbjudande`, `vid_ratt`): efter första rätta bokstaven lyser staven, och `erbjudande` läses upp (det väntar inte). Ett tryck på staven ger formelvyn: fälten får guldkant, och nästa tomma fält lyser. Han fyller bara de tomma fälten. En fel bricka studsar tillbaka, de rätta ligger kvar, och efter två fel på samma plats blinkar rätt bricka. Inget fel räknas. Ett nytt tryck på staven lämnar läget. Rätt i kasta-läget ger `kasta.vid_ratt`.

### P9_kodlas (fas 3)

`niva`, `svar` (ett ord, små bokstäver), `brickor`, `chiffer` med `tecken` (på låset, i ordning), `nyckel` (`tecken` → `bokstav`) och `nyckeln_finns_i`, `visa_forsta`, `kontroll`, `svar_lyser_sek`. Kontrollen räknar ut ordet ur tecknen och nyckeln och jämför med svaret.

Låset och nyckeln står på samma skärm. **`visa_forsta`**: ungen visar det första tecknet (på låset och på nyckeln, och bokstaven lyser), och det räknas inte som hjälp. **`kontroll: "hela_ordet"`**: låset kontrolleras först när alla fälten är fyllda, och rätta bokstäver stannar. **`svar_lyser_sek`**: ordet lyser så länge innan låset öppnas.

### P26_krukorna

`innehall` (en post per kruka eller buske: `bar`, `tom`, `kartbit_1`, `ekorre`, `skattlada` …), `kartbit_i_sista`, `sak_i_sista` (posten som alltid hittas sist), `foremal` (föremålen i rummet att svinga mot, ett per post; utan `foremal` delas föremålet som visar pusslet upp i krukor). Vila, påverkar inte nivån.

## 3b. Rummens kartor (Tiled)

Innehållet säger **vad** som finns i ett rum, kartan säger **var** det står. Kartorna ägs av teknik (i gråboxen) och stil (när grafiken kommer) och ligger i `kartor/<äventyr>/<rum>.tmj`. Öppna dem i Tiled.

- Kartan är 20×12 rutor à 16 pixlar (320×192, ett rum).
- Ett objektlager. Varje föremål är en rektangel där **namnet är föremålets id** i rummets `innehall`. Ingen text som spelaren ser.
- **Typ** (klass): `utgang`, `sak` eller `figur`. Saknas den gissas den av id:t (`dorr_`, `stege_`, `grind`, `stig_` är utgångar).
- **`visar`** = pusslet vars alternativ föremålet visar i rummet: lådorna i `p0_dinomat` ritas i den variant spelaren får, i rätt färg och storlek, och krukorna (P26) delas ut där `fem_krukor` står.
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
- **Alternativen i ett val** (lådorna i FILT och dinomaten) står minst 3 rutor isär, så att ingen plats når två av dem (testas).
- **Kartans egenskap `morker`** (0–1) säger hur mörkt rummet är på natten (annars 0,72). Hallen har 0,55.
- **Kartans egenskap `inomhus`** ger rummet en väggram: bakvägg 3 rutor, sidoväggar 2, främre kant 1. Dörrar sitter i väggarna och möbler står längs dem. Egenskaperna `vagg_bak`, `vagg_sida` och `vagg_fram` (pixlar) ger andra mått, t.ex. den smala hallen med tjocka sidoväggar.
- En **punkt** som heter `lampa` (eller `lampa_…`) lyser varmt när rummet är mörkt, t.ex. läslampan vid Farfars plats i köket.
- En **punkt** med namnet `start` är där hjälten står när han inte kommer genom en utgång (första gången, eller efter en omstart). En punkt `in_<rum>` är där han kommer in från ett rum som inte har någon utgång hit (t.ex. trädgården från hallen).
- Saknas kartan placeras föremålen automatiskt i ett rutnät (kapitel 1 tills vidare).

Kontrollen säger fel om ett föremål saknas i kartan, om kartan har föremål som inte finns i rummet, om något går utanför rummet, om en utgång leder till ett rum som inte finns eller saknar `riktning`, om `klattra` står på något som inte är en utgång, om `lapp` pekar på ett föremål som inte finns i rummet och om `in_<rum>` inte är ett rum. Ett enhetstest kontrollerar att varje föremål går att nå från varje ingång i varje tillstånd.

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
- Läs och välj utan exakt ett rätt svar.
- Förbjudna par på samma skärm (lås–läs, hår–här, bår–bär), och rätt svar och distraktor som bara skiljer sig på Å/Ä i L1–L3.
- Spärrade ord (mjukt G/K, NG, SJ …) i text spelaren läser själv, även böjda former (berget, köket).
- Formelbrickor som inte räcker till svaret, extra brickor på S1, förebild som inte är svaret.
- Kodlås där tecknen och nyckeln inte ger svaret. Räddningsord som är spärrade.
- P28 där alla eller inga alternativ är rätt.

**Varningar (stoppar inget):**
- **Repliker som blir mer än två rader** på läsplattan. Radbredden är 16 em (768 punkter vid 48 punkters text, i versaler), räknad med Lexends egna teckenbredder (`verktyg/lexend-bredder.json`, utan extra bokstavsavstånd).
- Mer än 8 ord på en rad i text spelaren läser själv.
- **Färre än två läsuppgifter som avgör något per pass.** Räknas: P1, P28, P15 (kategorin läses). Inte P9: kodlåset är avkodning med nyckel.
- **Pass som uppskattas till mer än 10 minuter.** Uppskattningen: 1,5 s + 0,45 s per ord och replik, 40 s per pussel, 12 s per `ga_till`, 4 s per mellanscen, 6 s + uppläsning per bokuppslag.
- **Instruktioner som nämner en enhet** (piltangent, tangentbord, mellanslag, mus, klicka, svep). Skriv "Gå till lådan" och "Tryck på …", som gäller både dator och iPad.
- Pass som inte slutar med en sparpunkt, pussel som inte används, ord i alternativ som inte finns i ordlistorna, meningar som börjar med liten bokstav.

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
