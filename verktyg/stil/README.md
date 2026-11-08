# Stils skript (beslut 28.6)

Stilspårets egna skript, som ritar all grafik i spelet (*Så ritas allt*, 10b). De läggs in i repot under
`verktyg/stil/` av teknikspåret ur inkorgens `skript/stilskript.zip` varje gång zippen uppdateras, efter
namnkontrollen. Repot är publikt, så inga riktiga namn står i skripten eller i den här filen.

- **Motorn:** `pix.py` (i flera mappar) skuggar delar i fyra toner och ritar konturen i materialets egen färg.
- **Paletten:** `palett/` har masterpaletten (`palett.json`), låsningen (`las.py`) och räkningen per zon (`zoner.py`).
  Varje skript sparar sina bilder låsta till paletten.
- **Mapparna:**
  - figurerna: `unge2`, `hjalte2`, `skata2`, `baron2`, `apa`, `smat` och `farfar`;
  - effekterna: `efx`, och staven som svärd med lianerna: `svard`;
  - stilprovet av gläntan: `prov`, rutorna och skogens föremål: `rutor`, skogsbrynets sista föremål: `bryn`;
  - bildkorten: `kort`, krönets bildkort: `kron`, uppdragslappen och uppdragens bilder: `uppdrag`;
  - huset: `hus`, pass 3: `pass3`, ägget, kläckningen och krukorna: `agg`, expeditionsboken: `bok`;
  - Farfars karta: `karta`, HUD:en, ikonerna och dörrskyltarna: `hud`, och sidovyerna: `sidovy`;
  - kapitel 1:s rättelser och prologens nya animationer (beslut 50–51): `kap1`. Där finns också `kartor5d.py`,
    som skriver Stils förslag till kartorna (kopior, aldrig repots kartor) med `skog_forslag.py`, och `rendera.py`,
    som ritar en karta till en provbild. `kap1/liten_lian9.py` (beslut 59.6) ritar den lilla lianen i gångens grön
    och ersätter `svard.py`:s `liten_lian*`, så den körs efter `svard` och `kap1/skog5d.py`.
  - fas 4 (beslut 61.3): `fas4`. `skiss.py` ritar skissbilderna till startskärmen, pausmenyn och menyn för vuxna
    (läser en skärmdump av skogsbrynet, nedskalad till spelets pixlar, i `/tmp/nat_gangen-soder.png`),
    `mock/skiss.html` sätter ihop dem och `mock/shot.js` tar bilderna (Playwright, Lexend-filerna bredvid).
    `skrivbord.py` ritar Farfars skrivbord, staven på bordet, menyfönstren i SNES-stil och introns bilder
    (körs efter `skiss.py`), och `mock/skiss2.html` med `mock/shot2.js` tar den andra skissens bilder.
    `intro.py` ritar introts höga bild (fönstret mot bergen överst, skrivbordet nederst, i soluppgång och gryning),
    och `mock/shot3.js` tar introts och inställningarnas bilder ur `mock/skiss2.html`.
    `tilt.py` räknar ut blicken från fönstret ned mot skrivbordet som en Mode 7-tilt: väggen och bordsskivan är två
    plan, och varje bild (`mock/tilt_00–13.png`, `tilt_gryning.png`) samplas med närmaste pixel (kör efter `intro.py`).
    `intro2.py` gör hela introt: gryningen blir morgon i landskapet (himlen, solarna och landet som lager oändligt
    långt bort), namnet, kameran som backar från fönstret och tilten ned mot bordet (`mock/intro3_*.png`).
    Lexend som TTF (`lexend-700.ttf`) packas upp ur woff2-filen med fontTools och brotli.
    `slutlig.py` gör de färdiga bilderna till inkorgens `ui/intro/`, `ui/start/` och `ui/meny/`, låsta till paletten
    (kör efter de andra i `fas4`). `musik.py loop <fil>` gör en loop till `ljud/musik/` som .m4a och .ogg,
    med en halv sekund av loopen före och efter, och skriver ut looppunkterna (`KLANG=spel` för spelets loop).
    `musik.py` gör musikprovet (numpy och ffmpeg). `KLANG=spel` ger den mjukare klangen för spelet.
    `ljud.py` (beslut 62.7) gör ljudeffekterna efter ljudlistan i 10c: 80 egna ljud ur syntes (numpy och scipy),
    inga hämtade, till `ut/ljud/effekter/<id>.wav` med `ljud.json` (grupp, händelse, signatur, nivå och längd).
    `slingor.py <namn>` gör fler musikslingor i samma familj och klang som spelets (`skogen`, `natten`, `raddning`
    och `lagerelden`), som prov
    eller med `loop <fil>` som loop till `ljud/musik/`, precis som `musik.py`.
- **Körning:** bilderna i `ut/`-mapparna görs genom att köra skripten i ordningen figurer → `efx` → `prov` → `rutor`
  → `kort` → `hus` → `pass3` → resten, eftersom de senare läser de tidigares bilder och inkorgens bilder. Skripten
  räknar med att mapparna ligger direkt i `/home/claude/` (kopiera dit), med inkorgen i `/home/claude/inkorg/`, och
  `hus.py` läser kartorna ur en klon av repot i `/home/claude/ordstaven`.
- **Ut i spelet:** bilderna läggs i inkorgen och förs in i `assets/` med `verktyg/grafik/inkorg.py`.

Skripten ändras bara av Stil. Teknik byter filerna, ändrar dem inte.
