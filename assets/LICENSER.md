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
| Porträtten (ansiktena i pratrutan) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/portratt/` |
| Läsplattans bildkort, expeditionsbokens bilder och uppdragslappens bilder | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/bildkort/` |
| Sidovyerna (bakgrunder och det som rör sig i dem: in i skogen, vid bron och ungen på kartbiten) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/sidovyer/` |
| Farfars karta (kartbitarna) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/karta/` |
| HUD:ens knappar, ikonerna, dörrskyltarna, uppdragslappen (papperet, kompassrosen och stämpeln) och tangenterna i styrhjälpen | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/ui/` |
| Farfars hus: föremålen | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/foremal/hus/` |
| Skogens föremål (lianerna och liangången, buskarna, träden, stenarna, skyltarna, häcken, stubben, skattlådan, lövhögarna, ugglorna, bron, svamparna och de andra) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/foremal/skog/` |
| Farfars hus: rummen (en bild per rum) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/rum/hus/` |
| Skogens rutor (rutset för Tiled) | Egna, ritade för spelet av stilspåret | Egna | Ja | `assets/tiles/skog/` |
| Herr Skatas skratt | Eget, inspelat för spelet och bearbetat (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/herr_skata_skratt.wav` |
| Ungens tre läten | Egna, inspelade för spelet och bearbetade (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/unge_late_01.wav`, `assets/ljud/unge_late_02.wav`, `assets/ljud/unge_late_03.wav` |
| Färgerna i grafiken (förteckning) | Samlade av `verktyg/grafik/inkorg.py` | Egna | Ja | `assets/palett.json` |
