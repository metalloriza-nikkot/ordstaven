# ORDSTAVEN – instruktioner för Claude Code

Läs- och skriväventyr för barn 6–8 år, byggt för en spelare först. Webbaserad PWA med Phaser 4 + Vite + Tiled. Läs `docs/design.md` (designen i korthet) och `docs/arkitektur.md` (hur koden är byggd) innan du ändrar något.

## Integritet – repot är publikt
- Inga uppgifter om den verkliga spelaren i repot: inget namn, ingen ålder, ingen skola, inga bedömningar, inga testobservationer, inga foton. I kod, kommentarer, commit-meddelanden och dokument heter han **"spelaren"**.
- Testfixturer och exempel använder påhittade namn.
- `docs/` får bara innehålla design (spelvärld, pussel, stil, teknik). Testloggar och observationer hör inte hemma här.

## Arbetssätt
- All text i spelet på svenska. Den **visas i VERSALER** men lagras i vanlig skrift (se arkitekturreglerna). Kod, kommentarer och commit-meddelanden på svenska.
- **En avgränsad uppgift per session.** En commit per steg. Varje push till `main` publiceras automatiskt om testerna går igenom.
- Kör före varje commit: `npm run kontroll` (innehållskontroll + enhetstester) och `npm run test:webb` (Playwright). Ta skärmdumpar och titta på dem innan du lämnar över.
- Höj `version` i `package.json` vid varje leverans och skriv en rad i `docs/versioner.md`.
- Bygg inget som inte står i nuvarande fas i färdplanen. Nya idéer skrivs ned, de byggs inte.

## Arkitekturregler
- **Phaser ritar världen, DOM ritar all text, `src/karna/` äger all logik.**
- `src/karna/` får inte importera Phaser eller röra DOM. Modulerna tar sina beroenden som argument. Inga globaler.
- All läsbar text ritas i textlagret (DOM, Lexend). Aldrig Phaser-text, aldrig text i pixelgrafiken.
- Scener lyssnar på handlingar från `karna/inmatning.js`, aldrig på råa tangent- eller pekhändelser.
- Innehåll (repliker, pussel, ordlistor) ligger i `content/` som JSON enligt `docs/innehallsschema.md` (kapitel i format 2). Tiled-kartorna (`kartor/<äventyr>/<rum>.tmj`) säger var föremålen står och innehåller bara id:n, aldrig spelartext. Hårdkoda aldrig innehåll i koden.
- Speltext lagras i vanlig skrift och visas genom `src/karna/text.js` (versaler tills nivån säger annat). Formler alltid i versaler. Platshållare `{unge}`, `{hjalte}`.
- `content/` ägs av Innehållsspåret. Teknik ändrar bara formatet (och skriver då om filerna), aldrig texten. Ändras schemat: höj `format`, uppdatera `docs/innehallsschema.md` och kontrollen i `verktyg/innehall/`.
- Skalan räknas i fysiska pixlar och är alltid ett heltal (`karna/skalning.js`).

## Viktigt att inte förstöra
- **localStorage-prefix `ordstaven_`**, cachenamn `ordstaven-`. Spelet delar ursprung (och lagringskvot) med andra spel på `metalloriza-nikkot.github.io`.
- **Sparformatet har `format`-fält.** Ändras formatet: höj numret, skriv en migrering, lägg en fixturfil för det gamla formatet i `tests/fixturer/`. Gamla sparningar ska alltid gå att läsa.
- `spelare.hjalte` är en egen del med eget formatfält och ska kunna exporteras till kommande äventyr.
- Allt som pratar måste kunna avbrytas och ha en maxtid (lärdom från TURBO-RACE).
- Service workern aktiverar nya versioner bara på startskärmen, aldrig mitt i spelet.
- Uppläsningsregeln: instruktioner läses upp (`upplast: true`), ledtrådar aldrig.
- **Inga råinspelningar av röster i repot.** Ungens läten läggs in bara bearbetade (tonhöjd/filter), så att rösten inte går att känna igen. Gråboxen använder bara datorrösten.
- Alla bokstäver ska gå att skriva: inga kortkommandon på bokstavstangenter (nosen ligger på Tab).
- Genomspelningstestet (`tests/webb/genomspelning.spec.js`) spelar hela prologen. Det ska alltid gå igenom.

## Licenser
- Koden: alla rättigheter förbehållna (`LICENSE`).
- Varje grafik-, ljud- eller typsnittsfil som läggs till ska stå i `assets/LICENSER.md` med källa och licens. Bara licenser som tillåter kommersiell användning.
