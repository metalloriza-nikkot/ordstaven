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
    som ritar en karta till en provbild.
- **Körning:** bilderna i `ut/`-mapparna görs genom att köra skripten i ordningen figurer → `efx` → `prov` → `rutor`
  → `kort` → `hus` → `pass3` → resten, eftersom de senare läser de tidigares bilder och inkorgens bilder. Skripten
  räknar med att mapparna ligger direkt i `/home/claude/` (kopiera dit), med inkorgen i `/home/claude/inkorg/`, och
  `hus.py` läser kartorna ur en klon av repot i `/home/claude/ordstaven`.
- **Ut i spelet:** bilderna läggs i inkorgen och förs in i `assets/` med `verktyg/grafik/inkorg.py`.

Skripten ändras bara av Stil. Teknik byter filerna, ändrar dem inte.
