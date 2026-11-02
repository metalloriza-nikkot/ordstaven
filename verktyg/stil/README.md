# Stils skript (beslut 28.6)

Stilspårets egna skript, som ritar all grafik i spelet (*Så ritas allt*, 10b). De läggs in här av teknikspåret ur
inkorgens `skript/stilskript.zip` varje gång zippen uppdateras, efter integritetssökningen. Repot är publikt.

- **Motorn:** `pix.py` (i flera mappar) skuggar delar i fyra toner och ritar konturen i materialets egen färg.
- **Mapparna:** figurerna (`unge2`, `hjalte2`, `skata2`, `baron2`, `apa`, `smat`, `farfar`), effekterna (`efx`),
  stilprovet (`prov`), rutorna och skogens föremål (`rutor`), bildkorten (`kort`), huset (`hus`) och pass 3 (`pass3`).
- **Körning:** bilderna i `ut/`-mapparna görs genom att köra skripten i ordningen figurer → `efx` → `prov` → `rutor`
  → `kort` → `hus` → `pass3`, eftersom de senare läser de tidigares bilder. Skripten räknar med att mapparna ligger
  direkt i `/home/claude/` (kopiera dit), och `hus.py` läser kartorna ur en klon av repot i `/home/claude/ordstaven`.
- **Ut i spelet:** bilderna läggs i Niklas inkorg och förs in i `assets/` med `verktyg/grafik/inkorg.py`.

Skripten ändras bara av Stil. Teknik byter filerna, ändrar dem inte.
