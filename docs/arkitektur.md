# Arkitektur – ORDSTAVEN

Version 0.2 (2026-10-24). Status: **fas 1 byggd (spelversion 0.1.0).**
❓ = öppen fråga. Designen finns i `docs/design.md`. Testmatrisen i `docs/testmatris.md`.

## 1. Översikt

```
┌──────────────────────── webbläsarfönster ────────────────────────┐
│  Ram (CSS, upprepad läderbild)                                   │
│   ┌───────────────── #varld (canvas, Phaser 4) ───────────────┐  │
│   │  Rum 320×192 pixlar, uppskalat i hela pixelsteg           │  │
│   └───────────────────────────────────────────────────────────┘  │
│   #textlager (DOM ovanpå canvasen, full upplösning, Andika)      │
│   #grans (bär, mynt, nosknapp)    #tangentbord (iPad, i ramen)   │
└──────────────────────────────────────────────────────────────────┘
          ▲ händelser                     ▲ händelser
     src/scener (Phaser)  ◄──►  src/kärna (ren JS, inga globaler)
                                   ▲
                    content/*.json + Tiled-kartor (data)
```

Tre lager med en enkel regel: **Phaser ritar världen, DOM ritar all text, kärnmodulerna äger all logik.** Kärnmodulerna känner inte till Phaser och kan testas utan webbläsare.

## 2. Teknikval

| Behov | Val | Skäl |
|---|---|---|
| Motor | Phaser 4 (senaste 4.x, låst version i `package-lock.json`) | Beslutat. WebGL-renderaren är standard, Canvas finns kvar men är föråldrad. |
| Språk | **JavaScript (ES-moduler) med JSDoc och `// @ts-check`** | Typkontroll i editorn utan byggsteg för typer. Billigt att byta till TypeScript senare. |
| Bygge | Vite | Phasers standard. `base: '/ordstaven/'` för GitHub Pages. Mål: `es2020`, `safari15` (Monterey). |
| Kartor | Tiled, sparat som `.tmj` (JSON) | Phaser läser direkt. |
| PWA | `vite-plugin-pwa` (Workbox, generateSW) | Förcachar *allt* som byggs: sidan, skript, sprites, kartor, JSON, typsnitt, ljud. Revision per fil, så bara ändrade filer hämtas om. |
| Enhetstester | Vitest | Kärnmodulerna (anpassning, sparformat, skalning, inmatning). |
| Webbläsartester | **Playwright för Node (`@playwright/test`)** | Samma mönster som TURBO-RACE men i samma verktygskedja som bygget, och med WebKit (Safari-motorn) och iPad-emulering. Ersätter Python-testerna. |
| Innehållskontroll | JSON Schema + Ajv, körs i bygget | Ett felskrivet pussel stoppar bygget i stället för att krascha mitt i ett spelpass. |
| Publicering | GitHub Actions → GitHub Pages | Som TURBO-RACE, men testerna måste gå igenom innan publicering. |

Bortvalt: egen service worker för hand (TURBO-RACE:s cachar en fast fillista, och här blir filerna hundratals), Python-bygget, TypeScript nu.

## 3. Mappstruktur

```
ordstaven/
├─ CLAUDE.md               instruktioner för Claude Code
├─ LICENSE                 alla rättigheter förbehållna
├─ index.html              skalet: canvas + textlager + ram
├─ vite.config.js
├─ docs/                   bara design och teknik (integritetsregeln)
├─ public/
│  └─ icons/               PWA-ikoner (tillfälliga, ritas av verktyg/ikoner.py)
├─ assets/                 sprites, tiles, kartor (från fas 2)
│  └─ LICENSER.md          licenslogg, obligatorisk
├─ content/                spelets innehåll som data
│  ├─ schema/              JSON Schema för varje filtyp
│  └─ den-gomda-dalen/
│     ├─ aventyr.json      kapitel, ordning, version
│     └─ kap-00/           manus.json, pussel.json, rum/*.tmj
├─ src/
│  ├─ main.js              startar allt, kopplar ihop moduler
│  ├─ karna/               ren logik, inga globaler, ingen Phaser
│  │  ├─ skalning.js
│  │  ├─ inmatning.js
│  │  ├─ handelser.js      liten händelsebuss
│  │  ├─ logg.js           felsökningslogg (porterad)
│  │  ├─ sparning.js       sparformat, migreringar, fil-export (porterad)
│  │  ├─ lasmotor.js       (fas 2)  ord, anpassning, distraktorer
│  │  ├─ ljudning.js       (fas 2)
│  │  ├─ rost.js           (fas 2)
│  │  ├─ ljud.js           (fas 2)  syntes + chiptune
│  │  └─ matte.js          (fas 3)
│  ├─ grans/               DOM-delarna: textlager, läsplatta, tangentbord, föräldravy
│  └─ scener/              Phaser-scener: Start, Rum (fas 1: Testrum)
└─ tests/
   ├─ enhet/               Vitest
   ├─ webb/                Playwright
   └─ fixturer/            exempel-sparfiler per format (påhittade namn)
```

## 4. Skärm, skalning och textlager

### Rummet och skalan
- Pixelvärlden är **ett rum på 320×192** (20×12 rutor à 16×16), enligt stilguiden. Briefens "320×200" tolkas som den ursprungliga basen; de 8 raderna går till ramen. ❓ Bekräfta i stilspåret, det påverkar alla kartor.
- Phaser renderar internt i exakt 320×192 (`pixelArt: true`, `roundPixels: true`, `Scale.NONE`). Canvasen skalas upp med CSS och `image-rendering: pixelated`.
- **Skalan räknas i fysiska pixlar, inte CSS-pixlar.** Annars blir pixlarna ojämna på Windows med 125 % skalning (dpr 1,25 × skala 3 = 3,75).
  ```
  fysisk = floor(min(fönsterbredd·dpr / 320, tillgänglig höjd·dpr / 192))   (minst 1)
  canvasens CSS-storlek = 320·fysisk/dpr × 192·fysisk/dpr
  ```
  Exempel: MacBook 1280×800, dpr 2 → fysisk 8, CSS 1280×768 (×4 i stilguidens mening). Windows 1536×864, dpr 1,25 → fysisk 5, CSS 1280×768.
- **Halva steg på retinaskärmar.** Med dpr 2 kan skalan bli t.ex. 7 fysiska pixlar = 3,5 CSS-pixlar. Det är lika skarpt (varje spelpixel är 7×7 skärmpunkter) och ger ett större rum än stilguidens tabell: MacBook med webbläsarlist får 1120×672 i stället för 960×576.
- **Pekskärm reserverar tangentbordets plats från start** (`TANGENTBORD_HOJD` = 216 CSS-punkter nertill) och lägger rummet överst. Rummet byter alltså inte storlek när tangentbordet visas i fas 2. Resultat: iPad 10:e gen och 4:3 får 960×576 (som stilguiden), **iPad mini får 800×480** (stilguiden räknade med 960×576, men då ryms inte tangentbordet).
- Omräkning vid `resize`, `orientationchange` och ändrad dpr (`matchMedia`). Stående läge på iPad visar en bild (vrid-skärmen), ingen text.
- Ramen är en CSS-bakgrund som upprepas, så den tål vilken storlek som helst.

### Textlagret (beslut: DOM, inte Phaser-text)
All läsbar text ritas som vanlig HTML ovanpå canvasen.
- **Skarp på alla skärmar** utan att räkna upplösning själva. Browsern ritar Andika med sin egen textrendering.
- **Storlekar i CSS-punkter** precis som stilguiden anger dem (64 / 48 / 32), oberoende av rummets skala.
- **Testbart:** Playwright kan läsa och klicka på texten, och kontrollera att den aldrig bryts mitt i "UNDER STENEN" (`white-space: nowrap` på fraser).
- Läsplattan, pratbubblor, bokstavstangentbordet, ljudningsremsan och föräldravyn är DOM.
- Pratbubblor som pekar på en figur placeras med en enkel omräkning rumskoordinat → skärmkoordinat (`skalning.rumTillSkarm(x, y)`).
- Andika kommer från npm-paketet `@fontsource/andika` (latin, 400 och 700), byggs in av Vite och förcachas. Textlagret visas först när typsnittet är laddat.

## 5. Inmatning

En modul (`karna/inmatning.js`) översätter tangentbord och pekskärm till **handlingar**. Scenerna lyssnar bara på handlingar, aldrig på råa tangenter eller tryck.

| Handling | Tangentbord | Pekskärm/mus |
|---|---|---|
| `riktning` {x, y} | piltangenter (inte WASD: bokstäverna behövs för att skriva) | – |
| `gaTill` {rumX, rumY} | – | tryck på marken |
| `interagera` {mål} | Mellanslag / Enter | tryck på skylt, figur, buske |
| `bokstav` {tecken} | A–Ö (versaler, bara A–Z, Å, Ä, Ö) | eget skärmtangentbord |
| `sudda` | Backsteg | sudd-tangent |
| `hjalp` | N | nosknappen |
| `stang` | Esc | stäng-knapp |

- **Tryck-för-att-gå:** i fas 1 rak linje till punkten, stopp mot kanter. Vägsökning (A* på rutnätet) kommer i fas 2 när Tiled-kartorna har kollisionslager.
- Om båda används samtidigt vinner den senaste (pil avbryter `gaTill`).
- **iPad:** `touch-action: none`, ingen dubbeltryckszoom, ingen markering eller förstoringsglas vid långt tryck, `user-scalable=no`. Systemtangentbordet öppnas aldrig, eftersom det inte finns några `<input>`-fält i spelet (utom föräldravyns PIN).
- **Skärmtangentbordet** (`grans/tangentbord.js`) är en fristående modul utan beroenden till resten av spelet, så att TURBO-RACE kan få den. Tre rader i alfabetisk ordning, minst 64 punkter höga. Byggs i fas 2.
- Klickytor minst 48 CSS-punkter. Inga hover-effekter som bär information.
- Varje knapp i gränssnittet visar sin tangent.

## 6. Innehåll som data

**Regel:** ett nytt kapitel ska bara kräva nya filer i `content/`, ingen ny kod. Text finns på ett enda ställe.

- **Tiled-kartan** (`rum/*.tmj`) innehåller rutor, kollision, utgångar och objekt med *id:n* (`skylt_01`, `pussel:p1_skylt`). **Ingen spelartext i Tiled**, så att storyspåret aldrig behöver öppna Tiled.
- **`manus.json`** innehåller repliker per id: talare, text (versaler), om den läses upp (`upplast: true` bara för instruktioner, enligt uppläsningsregeln).
- **`pussel.json`** följer fälten i pusselkatalogen (dokument 08, avsnitt 8): `id`, `typ`, `nivå`, `text`, `bild`, `alternativ`, `svar`, `ledtrådar`, `hjälp`, `vid_fel`, `vid_rätt`. Giltiga formelkombinationer ligger i pusslet (`formler: ["STOR STEGE"]`), inget fritt system.
- **Pusseltyperna** är kod (en modul per typ, registreras med `typ`-namnet). Pusslen är data. En ny pusseltyp efter funktionsstoppet (kap 3) ska inte behövas.
- **Schema för varje filtyp** i `content/schema/`. Bygget kontrollerar alla filer och dessutom att varje id som en karta pekar på finns, och att all spelartext är versaler.
- Ordlistor ligger också som data (`content/ordlistor.json`), med ordets svårighet 1–6 åtskild från förståelsenivån L1–L7.

## 7. Sparning

### Nycklar
**Prefix `ordstaven_`** (briefens beslutslogg 2026-10-24 ersätter `dino_`). Spelet delar ursprung med TURBO-RACE på `metalloriza-nikkot.github.io`, så prefixet är nödvändigt. ❓ Uppdraget i chatten sa `dino_` – jag följer dokumenten.

Nycklar: `ordstaven_spar`, `ordstaven_spar_backup` (före laddning från fil, för ångra), `ordstaven_logg`, `ordstaven_installningar`.

OBS: **localStorage-kvoten (ca 5 MB) delas med TURBO-RACE** eftersom ursprunget är detsamma. Sparfilen ska hållas liten (räknare och nivåer, inte rålogg per försök). Felsökningsloggen kapas som i TURBO-RACE. Spelet anropar `navigator.storage.persist()` vid start.

### Format
```json
{
  "app": "ORDSTAVEN",
  "format": 1,
  "spelversion": "0.1.0",
  "sparad": "2026-10-24T10:00:00Z",
  "spelare": {
    "hjalte": { "format": 1, "id": "…", "namn": "…", "utseende": {}, "grad": "LARLING", "formler": ["LJUS"] },
    "larande": { "lasning": {}, "skrivning": {}, "ord": {}, "matte": {}, "historik": [] }
  },
  "aventyr": {
    "den-gomda-dalen": { "kapitel": 0, "rum": "vinden", "flaggor": {}, "bar": 0, "mynt": 0, "kartbitar": [], "ungen": { "namn": "…", "steg": 1 } }
  },
  "foraldra": { "pin": null, "veckansBokstav": null, "egnaOrd": [] },
  "installningar": {}
}
```
- **`spelare.hjalte` har eget formatfält** och kan exporteras som egen fil till kommande äventyr (briefens krav).
- **`spelare.larande` ligger bredvid hjälten, inte i äventyret.** Barnets nivåer är barnets, inte äventyrets, så nästa äventyr kan starta kalibrerat. ❓ Till ledningen, se rapporten.
- **Migreringar:** en funktion per steg (`1→2`, `2→3`…). Gamla sparningar läses alltid. Varje format får en fixturfil i `tests/fixturer/` och ett test som laddar den.
- Sparning sker automatiskt vid varje löst pussel och rumsbyte. Export/import som fil porteras från TURBO-RACE (`showSaveFilePicker` på Chrome, nedladdning annars). Filexporten är räddningen om iPad-Safari rensar data.
- **Integritet:** fixturfiler i repot använder påhittade namn.

## 8. Porteringsplan för TURBO-RACE

Källa: `metalloriza-nikkot/turbo-race` v16.12 (3e9935a). Vi lyfter logik och lärdomar, inte spelinnehåll. Varje modul blir en ES-modul som tar sina beroenden som argument (`skapaLasmotor({ lagring, logg, slump })`) i stället för att läsa globaler (`PROF`, `playerData()`, `saveProf()`, `Snd`, `Voice`, `$`).

| Modul | TURBO-RACE | Gränssnitt i ORDSTAVEN | Ändringar | Fas |
|---|---|---|---|---|
| **Logg** | `00_log.js` | `logg.handelse(typ, text, data)`, `logg.exportera()`, `logg.ogonblick(fn)` | Ögonblicksbilden byggs av registrerade funktioner i stället för att läsa globaler. Ctrl+Skift+L behålls. Prestandamätningen följer med. | 1 |
| **Sparning** | `06s_save.js` | `sparning.las()`, `.spara(tillstand)`, `.exporteraFil()`, `.importeraFil(fil)`, `.angraLaddning()`, `.exporteraHjalte()` | Nytt format med migreringar. Turneringslogiken tas bort. | 1 (grund), 2 (filer) |
| **Läsmotor** | `04w_words.js` | `lasmotor.valjOrd(opt)`, `.distraktorer(ratt, n)`, `.registrera(resultat)`, `.niva(pusseltyp)` | Ordets svårighet och förståelsenivå hålls isär. Anpassningen (3 rätt i rad upp, 2 fel ned) per pusseltyp, inom kapitlets golv och tak. Slumpen injiceras så att testerna blir förutsägbara. Ordbanken blir data. Emojis ersätts med bild-id. | 2 |
| **Ljudning** | `04w_words.js` (`soundOut`) | `ljudning.ljuda(ord)` → händelser `bokstav(i)`, `klar`, `avbruten` | Remsan ritas i textlagret (DOM, Andika). Säkerhetsnätet (maxtid, avbrott från annan röst) behålls oförändrat, det är en buggfix från v16.3. | 2 |
| **Röst** | `04_audio.js` (Voice) | `rost.saga(nyckel eller text, roll)`, `.sekvens(delar)`, `.tyst()` | **Först inspelat klipp för repliknyckeln, annars datorröst, annars pladder.** Det täcker båda svaren på röstfrågan i stilguiden. Rollröster för Professor Kompass, baronen, Klaffen. Varje uppläsning har avbrottstoken och maxtid. | 2 |
| **Ljud och musik** | `04_audio.js` (Snd) | `ljud.spela(namn)`, `.musik(zon)`, `.dampa(på/av)` | Nya klanger enligt stilguiden (triangel och sinus, ingen skarp fyrkant som ledstämma). Musiken sänks ca 12 dB när läsplattan är öppen. Motorljud och tutor tas bort. Ljudet startas av första trycket (iPad). | 2 |
| **Matte** | `04m_math.js` | `matte.fraga(niva)`, `.alternativ(svar)`, `.registrera()` | Som den är, minus globalerna. Används för att räkna mynt. | 3 |
| **Föräldravy** | `06p_parent.js` | DOM-vy i `grans/foraldravy.js` | PIN, nivå **per pusseltyp**, andel rätt på första försöket, hjälpanvändning, svåra och säkra ord, veckans bokstav, egna ord, utskrift, sparfil, logg. | 3 (minimal), senare full |
| PWA, bygge, deploy | `pwa/`, `build.py`, `pages.yml` | Vite + vite-plugin-pwa + ny workflow | Lärdom från v16.12: nya versioner ska nå fram snabbt. Men **uppdateringen aktiveras bara på startskärmen**, aldrig mitt i ett pussel. | 1 |
| Tester | `tests/*.py` | `tests/webb/*.spec.js` | Samma typer: läsmotor, sparning, offline, små fönster (1000×625). | 1– |

TURBO-RACE ändras inte. Modulerna kopieras och skrivs om här (ett delat paket är inte värt besväret förrän två spel faktiskt underhålls samtidigt). Skärmtangentbordet är undantaget som byggs för att kunna lyftas till TURBO-RACE.

## 9. PWA och offline

- `vite-plugin-pwa` med `registerType: 'prompt'`. När en ny version finns hämtas den i bakgrunden, och den tas i bruk nästa gång startskärmen visas. Ingen omladdning mitt i spelet.
- Förcache: allt i bygget (`**/*.{html,js,css,png,json,tmj,woff2,webmanifest,ogg,mp3}`). Spelet är litet (räknar med några MB), så allt förcachas och spelet fungerar helt offline efter första starten.
- Cachenamn med prefix `ordstaven-`, scope `/ordstaven/`, så att TURBO-RACE:s cache aldrig rörs.
- Manifest: `display: fullscreen` (faller tillbaka till standalone), `orientation: landscape`, ikoner 180/192/512, mörk temafärg som ramen. Installerad app löser också MacBookens webbläsarlist (×3 → ×4, enligt stilguiden).
- iPad: ljud startas av första trycket på startskärmen (bild med stor knapp, ingen text).

## 10. Publicering

`.github/workflows/pages.yml` vid push till `main`:
1. `npm ci`
2. Innehållskontroll (schema)
3. Enhetstester (Vitest)
4. Bygge (`vite build`)
5. Webbläsartester mot det byggda spelet (`vite preview`): Chromium och WebKit
6. Publicering till GitHub Pages, **bara om 1–5 gick igenom**

Adress: `https://metalloriza-nikkot.github.io/ordstaven/`. Kräver att Pages är inställt på "GitHub Actions" i repots inställningar.

## 11. Fas 1 – vad som byggs

Enligt dokument 11. Inget spelinnehåll.

1. Projektskal: `package.json`, Vite, Phaser 4, `index.html`, LICENSE, `assets/LICENSER.md`, Andika med licens.
2. `karna/skalning.js` med enhetstester för hela skärmtabellen i stilguiden (inklusive dpr 1,25).
3. `karna/inmatning.js`: piltangenter och tryck-för-att-gå.
4. Testrummet: ett grått rum 320×192 med rutnät och **ett block** (16×24, hjältens storlek) som går med piltangenterna och till punkten man trycker på. Stannar vid kanterna.
5. Textlagret med en enda rad i Andika (t.ex. versionsnumret) för att visa att texten är skarp på alla skalor.
6. `karna/logg.js` (Ctrl+Skift+L) och `karna/sparning.js` med formatfält: blockets position sparas och återställs.
7. PWA: manifest, ikoner, service worker.
8. Workflow och Playwright-tester: block rör sig med tangent och tryck, skalan är ett heltal i fysiska pixlar för varje storlek i testmatrisen, spelet startar offline.
9. `docs/testmatris.md` och `CLAUDE.md`.

**Grinden:** blocket går att flytta med piltangenter och tryck, publiceras automatiskt och startar offline på MacBook (Safari och Chrome), Windows (Chrome/Edge) och iPad (Safari, hemskärmen). De manuella stegen står i testmatrisen.

Innehållskontrollen (JSON Schema, Ajv) och `content/` kommer i fas 2, när det finns innehåll att kontrollera. I fas 1 kör `npm run kontroll` bara enhetstesterna.

### Köra testerna lokalt
`npm test` kör allt. I en miljö där Playwright inte kan hämta sina egna webbläsare kan en annan Chromium användas: `PW_CHROMIUM=/sökväg/till/chromium npm run test:webb` kör då bara Chromium-projekten. WebKit körs alltid i GitHub Actions.

## 12. Risker och mildring

| Risk | Mildring |
|---|---|
| Phaser 4:s Canvas-läge är föråldrat, WebGL krävs | MacBook Pro 2015 (Intel Iris) klarar WebGL. Kontrolleras vid grind 1. Loggen skriver ut grafikkortet som i TURBO-RACE. |
| iPad-Safari rensar sparning | Installation på hemskärmen, `storage.persist()`, filexport. |
| Svensk röst saknas på Windows | Inspelade klipp först, pladder som sista reserv. |
| Delad localStorage-kvot med TURBO-RACE | Liten sparfil, kapad logg, fel vid full kvot fångas och loggas. |
| Claude Code bryter fungerande delar | Tester som grind i workflowen, en commit per steg, `CLAUDE.md`. |
