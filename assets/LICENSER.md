# Licenslogg

Varje grafik-, ljud- eller typsnittsfil och varje bibliotek som följer med spelet står här. Bara licenser som tillåter kommersiell användning.

| Vad | Källa | Licens | Kommersiellt | Var i repot |
|---|---|---|---|---|
| Lexend (typsnitt, latin 400, 700 och 900; 900 för ljudorden) | The Lexend Project Authors, via npm-paketet `@fontsource/lexend` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Lexend-OFL.txt`) | Ja, även inbäddat | Hämtas via npm, byggs in i `dist/assets/` |
| Andika (typsnitt, latin 400 och 700) | SIL International, via npm-paketet `@fontsource/andika` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Andika-OFL.txt`) | Ja, även inbäddat | Paketet finns kvar för ett byte tillbaka, men byggs inte in sedan 0.6.4 |
| Phaser 4.2.1 (spelmotor) | npm-paketet `phaser` | MIT | Ja | `node_modules/`, byggs in |
| Workbox (service worker) | via `vite-plugin-pwa` | MIT | Ja | Byggs in |
| PWA-ikoner (tillfälliga) | Egna, ritade av `verktyg/ikoner.py` | Egna | Ja | `public/icons/` |
| Figurerna: hjälten (gå, svinga, trolla, fira, klättra, sova, sitta, ryggsäck och taggkam), staven, ungen, Herr Skata, Farfar, baronen med luftskeppet och skuggorna, och effekterna i kapitel 1 (ordkraftens ljus, svärdet, plopp, löv, fjädrar, glimt, pinnen) | Egna, ritade för spelet av stilspåret med egna skript (*Så ritas allt*, 10b) | Egna | Ja | `assets/sprites/` (ett atlas per figur, `.png` och `.json`) |
| Apan, djuren (ekorren) och det levande i skogen (fåglarna, fjärilen, löven) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/sprites/apa/`, `assets/sprites/djur/`, `assets/sprites/omgivning/` |
| Vassbyns bybor i kapitel 2: Tant Rosa, fiskaren, tvätterskan, barnet och Bo (stå, gå, vinka, jubla och sysslorna) | Egna, ritade för spelet av stilspåret med egna skript (`verktyg/stil/bybor/`) | Egna | Ja | `assets/sprites/tant_rosa/`, `assets/sprites/fiskaren/`, `assets/sprites/tvatterskan/`, `assets/sprites/barnet/`, `assets/sprites/bo/` |
| Halmdockan i duellens testrum (grundställning, ropar, förvirrad, backar, närmare, trillar, snurrar och sitter, i fem utrustningar, och sakerna som trillar av) | Egen, ritad för spelet av stilspåret med eget skript (`verktyg/stil/bybor/halmdockan.py`) | Egen | Ja | `assets/sprites/halmdockan/` |
| Kartbit 3 på golvet i Tant Rosas hus (Stils kartbit 3 i en tredjedels storlek, gråbox tills Stil ritar den, 92.7) | Egen: Teknik har förminskat stilspårets bild (`assets/karta/kartbit_3.png`) | Egen | Ja | `assets/foremal/kartbitar/` |
| Porträtten (ansiktena i pratrutan) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/portratt/` |
| Läsplattans bildkort, expeditionsbokens bilder och uppdragslappens bilder | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/bildkort/` |
| Sidovyerna (bakgrunder och det som rör sig i dem: in i skogen, vid bron, ungen på kartbiten och under bryggan) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/sidovyer/` |
| Farfars karta (kartbitarna) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/karta/` |
| HUD:ens knappar, ikonerna, dörrskyltarna, uppdragslappen (papperet, kompassrosen och stämpeln) och tangenterna i styrhjälpen | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/ui/` |
| Introt (utsikten genom Farfars fönster, solarna, kameran som backar och blicken ned mot skrivbordet), startskärmen (Farfars skrivbord, mässingsskylten, Ordstaven, fotoramen, pilarna, böckerna och spelarnas ramar), pausmenyn och INSTÄLLNINGAR (fönstren och knapparna i 9-slice, volymknapparna och markören) | Egna, ritade för spelet av stilspåret med egna skript (`verktyg/stil/fas4/`) | Egna | Ja | `assets/ui/intro/`, `assets/ui/start/`, `assets/ui/meny/` |
| Farfars hus: föremålen | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/foremal/hus/` |
| Skogens föremål (lianerna och liangången, buskarna, träden, stenarna, skyltarna, häcken, stubben, skattlådan, lövhögarna, ugglorna, bron, svamparna och de andra) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/foremal/skog/` |
| Kapitel 2:s rum (en bild per rum, kvällen i byn, den höga vassen och vassfältets mask) och föremålen i träsket och byn, med trollsländan och de små grodorna (`verktyg/stil/bybor/smadjur_k2.py`) | Egna, ritade för spelet av stilspåret med egna skript (`verktyg/stil/rum2/`, `verktyg/stil/bybor/`) | Egna | Ja | `assets/rum/kap-02/`, `assets/foremal/trask/` |
| Farfars hus: rummen (en bild per rum) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/rum/hus/` |
| Skogens rutor (rutset för Tiled) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/tiles/skog/` |
| Herr Skatas skratt | Eget, inspelat för spelet och bearbetat (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/herr_skata_skratt.wav` |
| Ungens tre läten | Egna, inspelade för spelet och bearbetade (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/unge_late_01.wav`, `assets/ljud/unge_late_02.wav`, `assets/ljud/unge_late_03.wav` |
| Ljudeffekterna (81 ljud, till exempel stämpeln, ordkraften, brickorna, festerna, dörrarna, djuren och trollsländans surr) | Egna, gjorda för spelet av stilspåret med egna skript (`fas4/ljud.py`), inga hämtade ljud | Egna | Ja | `assets/ljud/effekter/` |
| Musiken: sju slingor, menyns, spelets, nattens, skogens, räddningens, lägereldens och byns (mjuk chiptune utan sångtext, gjord helt i skript) | Egen, gjord för spelet av stilspåret med `verktyg/stil/fas4/musik.py` och `fas4/slingor.py` (numpy och ffmpeg), ingen förlaga | Egen | Ja | `assets/ljud/musik/` |
| Ordlistan för "är det ett ord?" i skrivpusslen (ca 315 000 böjningsformer, 2–10 bokstäver, i versaler och prefixkodade; beslut 77.2) | SALDO:s morfologi (`saldom.xml`, uppdaterad 2017-09-19): Borin, Lars, Forsberg, Markus och Lönngren, Lennart, Språkbanken Text, Göteborgs universitet, https://doi.org/10.23695/agcm-ny22. Omgjord av `verktyg/ordlista/saldo.py` (namn, förkortningar och sammansättningsled borttagna, och formerna av orden i `verktyg/ordlista/sparrlista.txt` i en egen spärrlista). Källfilen ligger inte i repot | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) | Ja, med kreditering (här och i OM SPELET) | `assets/ordlista/ord.txt`, `assets/ordlista/sparr.txt` |
| Kvällens färger på figurerna (färgtabell, palettfärg → kvällsfärg) | Egen, gjord för spelet av stilspåret med `verktyg/stil/kvall/kvall.py` | Egen | Ja | `assets/kvall.json` |
| Färgerna i grafiken (förteckning) | Samlade av `verktyg/grafik/inkorg.py` | Egna | Ja | `assets/palett.json` |
