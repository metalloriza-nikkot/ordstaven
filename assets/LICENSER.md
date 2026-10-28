# Licenslogg

Varje grafik-, ljud- eller typsnittsfil och varje bibliotek som följer med spelet står här. Bara licenser som tillåter kommersiell användning.

| Vad | Källa | Licens | Kommersiellt | Var i repot |
|---|---|---|---|---|
| Lexend (typsnitt, latin 400 och 700) | The Lexend Project Authors, via npm-paketet `@fontsource/lexend` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Lexend-OFL.txt`) | Ja, även inbäddat | Hämtas via npm, byggs in i `dist/assets/` |
| Andika (typsnitt, latin 400 och 700) | SIL International, via npm-paketet `@fontsource/andika` 5.3.0 | SIL Open Font License 1.1 (`assets/licenser/Andika-OFL.txt`) | Ja, även inbäddat | Paketet finns kvar för ett byte tillbaka, men byggs inte in sedan 0.6.4 |
| Phaser 4.2.1 (spelmotor) | npm-paketet `phaser` | MIT | Ja | `node_modules/`, byggs in |
| Workbox (service worker) | via `vite-plugin-pwa` | MIT | Ja | Byggs in |
| PWA-ikoner (tillfälliga) | Egna, ritade av `verktyg/ikoner.py` | Egna | Ja | `public/icons/` |
