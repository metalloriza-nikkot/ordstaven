# Licenslogg

Varje grafik-, ljud- eller typsnittsfil och varje bibliotek som följer med spelet står här. Bara licenser som tillåter kommersiell användning.

| Vad | Källa | Licens | Kommersiellt | Var i repot |
|---|---|---|---|---|
| Lexend (typsnitt, latin 400, 700 och 900; 900 för ljudorden) | The Lexend Project Authors, via npm-paketet `@fontsource/lexend` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Lexend-OFL.txt`) | Ja, även inbäddat | Hämtas via npm, byggs in i `dist/assets/` |
| Andika (typsnitt, latin 400 och 700) | SIL International, via npm-paketet `@fontsource/andika` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Andika-OFL.txt`) | Ja, även inbäddat | Paketet finns kvar för ett byte tillbaka, men byggs inte in sedan 0.6.4 |
| Phaser 4.2.1 (spelmotor) | npm-paketet `phaser` | MIT | Ja | `node_modules/`, byggs in |
| Workbox (service worker) | via `vite-plugin-pwa` | MIT | Ja | Byggs in |
| PWA-ikoner (tillfälliga) | Egna, ritade av `verktyg/ikoner.py` | Egna | Ja | `public/icons/` |
| Hjälten A, gång i fyra riktningar (16 × 24) | Egna, handpixlade för spelet av stilspåret och Niklas Engström | Egna | Ja | `assets/sprites/hjalte/hjalte.png` (och `.json`) |
| Staven i handen, eget lager (16 × 24) | Egna, handpixlade för spelet av stilspåret | Egna | Ja | `assets/sprites/stav/stav.png` (och `.json`) |
| Herr Skata: sitta, titta, flyga (16–18 × 12) | Egna, handpixlade för spelet av stilspåret | Egna | Ja | `assets/sprites/herr_skata/herr_skata.png` (och `.json`) |
| Herr Skatas skratt | Eget, inspelat för spelet och bearbetat (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/herr_skata_skratt.wav` |
| Ungens tre läten | Egna, inspelade för spelet och bearbetade (tonhöjd och filter) så att rösten inte går att känna igen | Egna | Ja | `assets/ljud/unge_late_01.wav`, `assets/ljud/unge_late_02.wav`, `assets/ljud/unge_late_03.wav` |
| Masterpaletten | Färgerna ur figurerna ovan, samlade av `verktyg/grafik/inkorg.py` | Egna | Ja | `assets/palett.json` |
