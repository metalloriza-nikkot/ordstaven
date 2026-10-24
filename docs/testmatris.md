# Testmatris

Version 0.1 (2026-10-24). Princip: spelet ska fungera i en modern webbläsare på dator och iPad. **Den svagaste enheten är golvet.**

## Enheter

| Enhet | Webbläsare | Roll | Från fas |
|---|---|---|---|
| MacBook Pro 13" (2015, macOS Monterey) | Safari och Chrome | Primär, golvet för prestanda | 1 |
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

Varje projekt kontrollerar:
1. Skalan är ett heltal i **fysiska** pixlar och rummet syns helt.
2. Blocket rör sig med piltangenterna (dator) eller tryck (pek).
3. Text i textlagret är Andika och minst angiven storlek.
4. Inga fel i konsolen.
5. (Ett projekt räcker) Service workern registreras, och spelet startar igen utan nät.

WebKit i Playwright är Safari-motorn men inte iPad-Safari. Den fångar det mesta, inte allt (ljudspärr, hemskärmsläge, datarensning). Därför finns de manuella stegen nedan.

## Manuell kontroll vid varje grind

Gör i denna ordning. Skriv resultatet i testloggen (utanför repot).

**MacBook, Safari och Chrome**
- [ ] Öppna adressen. Blocket syns, rummet är helt och skarpt (inga suddiga eller ojämna pixlar).
- [ ] Piltangenterna flyttar blocket. Klick med musen flyttar blocket dit.
- [ ] Helskärm: skalan går upp ett steg.
- [ ] Stäng av wifi, ladda om. Spelet startar.
- [ ] Ctrl+Skift+L sparar en logg. Kolla rad "grafik" (ska inte vara SwiftShader).

**Windows, Chrome/Edge**
- [ ] Samma som ovan. Kolla även med 125 % skärmskalning.

**iPad, Safari**
- [ ] Dela → Lägg till på hemskärmen. Starta därifrån.
- [ ] Liggande: rummet helt, ram runt. Stående: vrid-bilden visas.
- [ ] Tryck flyttar blocket. Inget zoomar vid dubbeltryck, inget markeras vid långt tryck.
- [ ] Flygplansläge, starta appen. Spelet startar.
- [ ] Stäng appen helt, öppna igen. Blockets position är kvar.
