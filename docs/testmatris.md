# Testmatris

Version 0.2 (2026-10-30). Princip: spelet ska fungera i en modern webbläsare på dator och iPad. **Den svagaste enheten är golvet.**

**Golvet (beslut 19):** MacBook Pro 13" 2015 med **ritning i mjukvara**: canvas, utan grafikkort. Den kör macOS Sequoia via OpenCore, och Chrome har stängt av grafikkortet (`chrome://gpu`). Safari tappar WebGL på samma dator. **Målet** är jämn rörelse, minst ca 30 bildrutor per sekund. Varje fas testas där.

I canvasläget ritar spelet högst 30 bildrutor per sekund, och bara när något ändras: står allt still ritas glimten åtta gånger per sekund. Loggen skriver bildrutor per sekund var 30:e sekund när det går långsamt, och varje hack över 100 ms (`[hack]`).

## Enheter

| Enhet | Webbläsare | Roll | Från fas |
|---|---|---|---|
| MacBook Pro 13" (2015, macOS Sequoia via OpenCore, utan grafikkort i webbläsaren) | Chrome (canvas), Safari | Primär, golvet för prestanda | 1 |
| Windows-dator | Chrome eller Edge | Sekundär | 1 |
| iPad | Safari, installerad på hemskärmen | Sekundär | 1 (grind), fullt från 2 |
| Ny utvecklingsdator | Chrome/Safari | Utveckling. Ändrar inte golvet. | – |

## Automatiska tester (körs vid varje push, stoppar publicering)

| Projekt | Motor | Fönster (CSS) | dpr | Pek |
|---|---|---|---|---|
| mac-helskarm | Chromium | 1280×800 | 2 | nej |
| mac-lister | Chromium | 1280×700 | 2 | nej |
| mac-safari | WebKit | 1280×800 | 2 | nej |
| win-1080 | Chromium | 1920×1080 | 1 | nej |
| win-125 | Chromium | 1536×864 | 1,25 | nej |
| win-liten | Chromium | 1366×768 | 1 | nej |
| smalt-fonster | Chromium | 1000×625 | 1 | nej |
| ipad-10 | WebKit | 1180×820 | 2 | ja |
| ipad-43 | WebKit | 1080×810 | 2 | ja |
| ipad-mini | WebKit | 1133×744 | 2 | ja |
| laptop-720p | Chromium | 1280×720 | 1 | nej |
| win-150 | Chromium | 1280×800 | 1,5 | nej |
| 4k | Chromium | 3840×2160 | 1 | nej |
| ultrabred | Chromium | 3440×1440 | 1 | nej |

Varje projekt kontrollerar:
1. Skalan är ett heltal i **fysiska** pixlar och rummet syns helt.
2. Blocket rör sig med piltangenterna (dator) eller tryck (pek).
3. Text i textlagret är Lexend och minst angiven storlek.
4. Inga fel i konsolen.
5. (Ett projekt räcker) Service workern registreras, och spelet startar igen utan nät.

Dessutom svepet i `tests/enhet/skalning.test.js`: alla fönster från 800×500 till 3840×2160 i dpr 1–3. Varje storlek måste ge hela pixlar, ett helt synligt rum och största möjliga skala. Sämsta fallet (litet fönster, låg pixeltäthet) fyller minst två tredjedelar av skärmen, mitten av spannet 92–98 %.

**Canvasläget** (golvdatorn): `fas1.spec.js` provar rummet, mörkret, skyltarna och rumsbytet med canvas och fyra gånger långsammare processor, och `steg.spec.js` att en bildruta ritas i varje steg när han går men i färre än hälften när inget rör sig, och att spelet byter till canvas om WebGL tappas. Mjukvaruritningen går inte att mäta rättvist på testmaskinen (den ritar över 50 bildrutor per sekund även på en tredjedel av en kärna), så takten mäts på MacBooken.

**Genomspelningen** (`tests/webb/genomspelning.spec.js`) spelar hela prologen i Chromium, WebKit och iPad-läget: rätt svar från innehållet, felsvar på några pussel, en omstart mitt i, och en kontroll att läsplattan aldrig går utanför skärmen.

**Provsidan** (`tests/webb/textprov.spec.js`): alla textformer laddas utan fel, ord för ord visar ett ord i taget, allt på en gång visar allt direkt, ett tryck visar allt, och en ny ▶ avbryter den förra.

WebKit i Playwright är Safari-motorn men inte iPad-Safari. Den fångar det mesta, inte allt (ljudspärr, hemskärmsläge, datarensning). Därför finns de manuella stegen nedan.

## Manuell kontroll vid varje grind

Gör i denna ordning. Skriv resultatet i testloggen (utanför repot).

**MacBook, Safari och Chrome**
- [ ] Öppna adressen. Blocket syns, rummet är helt och skarpt (inga suddiga eller ojämna pixlar).
- [ ] Piltangenterna flyttar blocket. Klick med musen flyttar blocket dit.
- [ ] Helskärm: skalan går upp ett steg.
- [ ] Stäng av wifi, ladda om. Spelet startar.
- [ ] Ctrl+Skift+L sparar en logg. Kolla rad "grafik" och "ritning". På golvdatorn står det "ingen webgl" och "canvas".
- [ ] Spela ett pass och spara loggen. Raderna `[bildrutor]` ska visa minst ca 30 per sekund, och `[hack]` ska vara sällsynta.

**Windows, Chrome/Edge**
- [ ] Samma som ovan. Kolla även med 125 % skärmskalning.

**iPad, Safari**
- [ ] Dela → Lägg till på hemskärmen. Starta därifrån.
- [ ] Liggande: rummet helt, ram runt. Stående: vrid-bilden visas.
- [ ] Tryck flyttar blocket. Inget zoomar vid dubbeltryck, inget markeras vid långt tryck.
- [ ] Flygplansläge, starta appen. Spelet startar.
- [ ] Stäng appen helt, öppna igen. Blockets position är kvar.
