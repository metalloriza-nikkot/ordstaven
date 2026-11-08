# Arkitektur – ORDSTAVEN

Version 0.3 (2026-10-25). Status: **fas 2, gråbox av prologen (spelversion 0.2.0).**
❓ = öppen fråga. Designen finns i `docs/design.md`. Testmatrisen i `docs/testmatris.md`.

## 1. Översikt

```
┌──────────────────────── webbläsarfönster ────────────────────────┐
│  Ram (CSS, upprepad läderbild)                                   │
│   ┌───────────────── #varld (canvas, Phaser 4) ───────────────┐  │
│   │  Rum 320×192 pixlar, uppskalat i hela pixelsteg           │  │
│   └───────────────────────────────────────────────────────────┘  │
│   #textlager (DOM ovanpå canvasen, full upplösning, Lexend)      │
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
- **Ingen fast plats för tangentbordet** (ändrat i 0.1.2). När spelaren skriver är läsplattan öppen och världen står still och dämpas, så bokstavstangentbordet läggs över rummets nedre del just då. Resten av tiden får rummet hela skärmen. Resultat: iPad 10:e gen och mini får 1120×672 (×3,5), även i en Safari-flik. iPad 4:3 får 960×576. En fast reserv på 216 punkter gav i test ett för litet rum (800×480 i Safari-flik).
- Omräkning vid `resize`, `orientationchange` och ändrad dpr (`matchMedia`). Stående läge på iPad visar en bild (vrid-skärmen), ingen text.
- Ramen är en CSS-bakgrund som upprepas, så den tål vilken storlek som helst.

### Textlagret (beslut: DOM, inte Phaser-text)
All läsbar text ritas som vanlig HTML ovanpå canvasen.
- **Skarp på alla skärmar** utan att räkna upplösning själva. Browsern ritar typsnittet (Lexend) med sin egen textrendering.
- **Storlekar i CSS-punkter** precis som stilguiden anger dem (64 / 48 / 32), oberoende av rummets skala.
- **Testbart:** Playwright kan läsa och klicka på texten, och kontrollera att den aldrig bryts mitt i "UNDER STENEN" (`white-space: nowrap` på fraser).
- Läsplattan, pratbubblor, bokstavstangentbordet, ljudningsremsan och föräldravyn är DOM.
- Pratbubblor som pekar på en figur placeras med en enkel omräkning rumskoordinat → skärmkoordinat (`skalning.rumTillSkarm(x, y)`).
- Typsnittet är Lexend (beslut 13, 2026-10-28; Andika fram till 0.6.3). Det kommer från npm-paketet `@fontsource/lexend` (latin, 400 och 700), byggs in av Vite och förcachas. Textlagret visas först när typsnittet är laddat. Bytet görs i `main.js` (importen) och i `stil.css` (`--typsnitt`), och innehållskontrollen räknar rader med `verktyg/lexend-bredder.json`.

## 5. Inmatning

En modul (`karna/inmatning.js`) översätter tangentbord och pekskärm till **handlingar**. Scenerna lyssnar bara på handlingar, aldrig på råa tangenter eller tryck.

| Handling | Tangentbord | Pekskärm/mus |
|---|---|---|
| `riktning` {x, y} | piltangenter (inte WASD: bokstäverna behövs för att skriva) | – |
| `gaTill` {rumX, rumY} | – | tryck på marken |
| `interagera` {mål} | Mellanslag / Enter | tryck på skylt, figur, buske |
| `bokstav` {tecken} | A–Ö (versaler, bara A–Z, Å, Ä, Ö) | eget skärmtangentbord |
| `sudda` | Backsteg | sudd-tangent |
| `hjalp` | Tab (inte en bokstav, alla bokstäver ska gå att skriva) | nosknappen |
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
- **Formatet är beskrivet i `docs/innehallsschema.md`** (kapitel i format 2, ett kapitel per fil med rum, scener och pussel). Kort sammanfattning nedan.
- **`pussel`** följer fälten i pusselkatalogen (dokument 08, avsnitt 8): `id`, `typ`, `nivå`, `text`, `bild`, `alternativ`, `svar`, `ledtrådar`, `hjälp`, `vid_fel`, `vid_rätt`. Giltiga formelkombinationer ligger i pusslet (`formler: ["STOR STEGE"]`), inget fritt system.
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
  "format": 3,
  "spelversion": "0.5.2",
  "sparad": "2026-10-24T10:00:00Z",
  "spelare": {
    "hjalte": { "format": 1, "id": "…", "namn": "…", "utseende": {}, "grad": "LARLING", "formler": ["LJUS"] },
    "larande": { "lasning": {}, "skrivning": {}, "ord": {}, "matte": {}, "historik": [] },
    "unge": { "format": 1, "namn": "…", "steg": 1, "formagor": [] }
  },
  "aventyr": {
    "den-gomda-dalen": { "kapitel": 0, "scenId": "…", "steg": 0, "flaggor": {}, "bar": 0, "kartbitar": [] }
  },
  "foraldra": { "pin": null, "veckansBokstav": null, "egnaOrd": [] },
  "installningar": {}
}
```
- **`spelare.hjalte` har eget formatfält** och kan exporteras som egen fil till kommande äventyr (briefens krav).
- **Format 3** (0.5.2): gråboxens etiketter för den vuxne heter `installningar.vuxenEtiketter` och är avstängda från början. Den gamla nyckeln `etiketter` hade förvalet på och tas bort i migreringen 2 → 3.
- **`spelare.unge` ligger hos spelaren** (format 2): namn, växtsteg och förmågor följer med till nästa äventyr, eller inte, om äventyret säger så. Eget formatfält som hjälten. Migreringen 1 → 2 flyttar `aventyr.<id>.ungen` hit.
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
| **Ljudning** | `04w_words.js` (`soundOut`) | `ljudning.ljuda(ord)` → händelser `bokstav(i)`, `klar`, `avbruten` | Remsan ritas i textlagret (DOM, i spelets typsnitt). Säkerhetsnätet (maxtid, avbrott från annan röst) behålls oförändrat, det är en buggfix från v16.3. | 2 |
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

Innehållskontrollen (JSON Schema, Ajv) finns sedan 0.1.3, se `docs/innehallsschema.md`. `npm run kontroll` kör den före enhetstesterna.

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

## 13. Fas 2 – gråboxen av prologen (0.2.0)

```
content/*.json ──► karna/berattelse.js ──► spel.js ──► scener/Rum.js (Phaser: rum, hjälte, unge, ljus)
                   (scener och steg i        │      └► grans/ui.js (läsplattan, kort, brickor, bok, HUD, nos)
                    ordning, tillstånd)      │         grans/tangentbord.js, grans/rost.js, grans/ljud.js
                   karna/pussel.js ◄─────────┤
                   karna/lasmotor.js ◄───────┘ (anpassning per pusseltyp, logg per försök)
```

- **`karna/berattelse.js`** spelar scenerna i ordning och äger tillståndet i äventyret: aktuell scen, rummens lägen (natt, natt_upplyst, morgon), bär, kartbitar, synliga delar av gränssnittet och lappar som kan öppnas igen. Scenens nummer sparas vid varje scenstart. Vid omstart spelas scenens `vid_omstart`.
- **`karna/pussel.js`** har en tillståndsmaskin per pusseltyp (P1, P27, P11, P12, P26): förenkling efter 2 fel (lägre variant, annars en distraktor bort), ungen pekar efter 3 fel, aldrig automatisk lösning. Krukorna bestämmer innehållet när de slås, så kartbiten kommer alltid sist.
- **`karna/lasmotor.js`** (porterad från TURBO-RACE): nivå per pusseltyp, läsning och skrivning för sig, gemener för sig. 3 rätt i rad utan hjälp → upp, 2 fel → ned. Varje försök loggas (pussel, nivå, rätt, försök, hjälp, tid), högst 300 i sparningen. Startnivå L2 och S1.
- **`karna/ljudning.js`** (porterad): bokstavsljud och sedan hela ordet. Helord (lista 5–6, flaggan `helord`) läses som helt ord. Maxtid som i TURBO-RACE.
- **Rummens kartor** (0.3.0): `kartor/<äventyr>/<rum>.tmj`, Tiled-format, ett objektlager. Namnet är föremålets id, egenskaperna `till` (vart en utgång leder), `sida` (var hjälten ställer sig) och `golv` (man går på det), och en punkt `start`. `karna/karta.js` läser kartan (ren logik, inga beroenden). `karna/rumslayout.js` ger rummets synliga föremål (`rumsObjekt`): från kartan, filtrerade med `syns_i` för rummets tillstånd, annars automatiskt placerade i ett rutnät (kapitel 1 tills vidare). Hjälten kommer in vid utgången som leder från förra rummet, annars vid `start`. Byts tillståndet så att ett föremål blir synligt byggs rummet om utan att hjälten flyttas.
- **Läs i rummet** (0.3.0, P1 med `i_rummet`): frågan visas uppe i rummet (`#tanke`). När hjälten står vid ett av föremålen visas ordet som en knapp ovanför (`#ordskylt`, under om föremålet står vid översta väggen). Tryck på ordet, på föremålet igen eller Mellanslag öppnar. Logiken är samma tillståndsmaskin som P1 (`skapaValj`).
- **`karna/vag.js`** (0.2.1): kollision och vägsökning. Hjältens fötter (12×6) får inte stå i ett objekt. Grindar och stigar nertill är golv. Tryck: A* på ett rutnät med 4 px, åtta riktningar utan att skära hörn, sedan utjämning med fri sikt. Ett mål inne i ett objekt blir närmaste fria punkt. Piltangenter glider längs kanten. Ett enhetstest kontrollerar att varje objekt i varje rum går att nå. Punkten framför ett objekt ligger 12 px under det.
- **Formeln** (0.2.1): bokstäverna kan dras till valfri plats och flyttas om. En bokstav som dras till en upptagen plats byter plats med den som låg där. Dras en lagd bokstav utanför platserna går den tillbaka till raden. Tryck fungerar som förut (rörelse under 8 px räknas som tryck), och ett tryck på en lagd bokstav skickar tillbaka den. Rätta bokstäver låses efter ett fel försök. Logiken ligger i `karna/pussel.js` (`laggPa`, `taBort`).
- **Närbilden** döljs när steget kräver rummet (gå till, fritt, krukorna). Annars kan den täcka det spelaren ska trycka på. Genomspelningstestet kontrollerar att inget överlägg täcker målet.
- **`spel.js`** har en hanterare per stegtyp. Inga innehålls-id:n i koden. Undantag i gråboxen: krukorna placeras där rummets första objekt med "kruk" i namnet står.
- **Läsplattan** visar text i versaler via `karna/text.js`. En sträng bryts mellan ord vid 16 em (samma som innehållskontrollen), en lista med rader bryts aldrig inom en rad. Världen stannar och dämpas när plattan är öppen.
- **Nosen** (👃, Tab): tryck på nosen och sedan på ett ord. Ordet ljudas med remsan. Kostar ett bär, gratis vid 0 bär. Räknas som hjälp. Bara i pussel med `hjalp: "ett_ord"`, i lappar och på repliker (där gratis, de läses ändå upp). Annars skakar nosen, så att ett tryck alltid ger svar. Ljudningen avbryts med ett tryck på remsan, på nosen eller Escape.
- **Skrivläget**: på pekskärm visas skärmtangentbordet när ett namn skrivs. Layouten håller 232 punkter nertill, rummet krymper ett steg och glider upp. På dator skriver man på det fysiska tangentbordet (⌨ visar skärmtangentbordet ändå).
- **Rösten**: bara datorröst (`grans/rost.js`), med rollröster per talare (`aventyr.json`). Menyn kan låta föräldern läsa Farfars repliker.
- **Använda föremål** (0.3.1): att gå fram räcker inte. Det som går att använda just nu har en glimt (stjärna i hörnet). När hjälten står vid det lyser det, locket lyfts på glänt och en hand (✋) visas ovanför. Spelaren använder det med ett tryck till på föremålet, ett tryck på handen, eller Mellanslag/Enter. Utgångar (dörrar, stegar, grinden) går man igenom bara genom att gå dit. Gäller `ga_till`, krukorna och fri lek (`spel.js`, `anvand`). Läs i rummet (`i_rummet`) använder ordet ovanför lådan som knapp i stället för handen.
- **Bilden stämmer med texten** (0.3.2): färg och storlek som en läsuppgift nämner syns i bilden. Gråboxens färger (`karna/egenskaper.js`) skiljer sig minst 10 L* i ljushet, och ett test kontrollerar att varje rätt alternativ har den färg och storlek texten säger. Ett föremål i kartan med `visar: <pussel>` ritar pusslets alternativ i rummet i samma färg och storlek, i den variant spelaren får.
- **Bärräknaren matar ungen** (0.3.2): ett tryck när världen går får ett bär att flyga till ungen, ungen hoppar och låter glad. Vid 0 bär rycker ungen på axlarna. Ingen tangent (alla bokstäver ska gå att skriva), musen eller ett tryck räcker.
- **Styrhjälpen** (`visa_styrhjalp`): piltangenter på dator, ett finger som trycker på målet på pekskärm. Utan text, försvinner när hjälten börjar gå. Kontrollen varnar för instruktioner som nämner en enhet (piltangent, mus, klicka m.fl.).
- **INSTÄLLNINGAR** (förut menyn för vuxna): håll inne ⚙ (eller Ctrl+Skift+M). En ring fylls medan man håller, ett kort tryck visar "Håll inne". Menyn ligger i ett eget lager och går att öppna även på startskärmen. Läsnivå, föräldern läser Farfar, objektens namn, hoppa till scen, spara loggen, börja om.
- **Testläge**: `?snabb` stänger av rösten, animationerna och kortar pauserna. `?ny` börjar om från början.
- **Kapitel 1** finns som data och går igenom kontrollen, men spelas inte: P15 och P9 byggs i fas 3. Gråboxen slutar efter prologen.

## 14. Lager och tillstånd (0.3.2)

Spelet är byggt i lager. Djupnumren (CSS `z-index`, med luckor för det som kommer) säger vad som ritas ovanpå vad.

| Djup | Lager | Var | Vad det gör |
|---|---|---|---|
| 0 | Världen | Phaser (`scener/Rum.js`) | Rummet, hjälten, ungen, ljuset, glimtar och ram kring det som går att använda. Ingen text. |
| 1 | Etiketter för den vuxne | `#etiketter` | Föremålens id över rummet (gråbox, kan stängas av). Tar aldrig emot tryck. |
| 2 | HUD | `#hud`, `#hud-meny` | Bär, nos, lapp, radio. Knapparna tar emot tryck, resten släpper igenom. |
| 3 | Läsplattan | `#plattan`, `#remsa` | Repliker, pussel, lappar, boken. Världen står still medan den är öppen. Remsan (ljudningen) ligger ovanpå och avbryts med ett tryck. |
| 4 | Mellanscener och styrhjälp | `#regi`, `#styrhjalp`, `#narbild`, `#fest` | Regi för den vuxne, styrhjälpen, närbilder, korta fester. Tar aldrig emot tryck. |
| 5 | Saker i rummet som väntar på spelaren | `#tanke`, `#ordskylt`, `#handknapp` | Frågan när man läser i rummet, ordet ovanför lådan, handen. Döljs när läsplattan är öppen. |
| 4 | Helskärmar | `#skarm` | Startskärmen, passets slut och paus. Kan vara genomskinlig (fri lek) och släpper då bara igenom ▶. |
| 6 | Menyknappen | `#hud-meny` | Ligger över helskärmarna, så att menyn går att öppna överallt. |
| 7 | INSTÄLLNINGAR | `#vuxenmeny` | Pausar spelet (se nedan). Ligger över allt. |
| — | Skärmtangentbordet | `#tangentbord` | Bara när ett namn skrivs på pekskärm. Rummet krymper så att inget täcks. |
| — | Felsökningsloggen | Ctrl+Skift+L | Ritas utanför spelet, rör inte tillståndet. |

**Vem tar emot tryck och tangenter.** Tangenter och tryck på rummet går genom `karna/inmatning.js` som handlingar. Stegen lyssnar med `lyssnaHandling`. Tryck på knappar i DOM går direkt till knappen. Det översta lagret som syns tar trycket; lager som inte ska ta emot tryck har `pointer-events: none`.

**När världen står still.** Läsplattan, helskärmar och pausen fryser världen (`rum.frys`). Hjälten går inte, knuffar väntar, handen och glimtarna visas inte. Röst och ljud fortsätter bara i det lager som syns.

**Paus.** INSTÄLLNINGAR och en dold flik pausar spelet (`pausa` / `fortsatt` i `spel.js`). Då stannar världen, rösten och ljudningen tystnar, knuffarnas klockor väntar, handlingar når inga steg och spelet sparas. Allt annat ligger kvar som det var, så att spelet fortsätter exakt där det stod.

**Från varje tillstånd finns en väg ut.**

| Tillstånd | Vägen ut |
|---|---|
| Replik | ▶, tryck på plattan, Mellanslag eller Enter |
| Pussel | Lösa det (förenkling efter 2 fel, ungen pekar efter 3, aldrig fast). Menyn: hoppa till scen eller börja om |
| Lapp, bok | ▶ / ✓, Mellanslag |
| Ljudning | Tryck på remsan, på nosen eller Escape. Maxtid som säkerhetsnät |
| Passets slut, paus | ▶ (💤 visar en pausbild med ▶) |
| Fri lek | Tar slut av sig själv: när föremålen har gett sina bär, när hjälten går mot en utgång eller genom en öppning (grinden), eller efter en stund utan att något händer (0.5.1) |
| Namn med skärmtangentbord | ✓ (minst en bokstav) |
| INSTÄLLNINGAR | Stäng, Escape |
| Dold flik | Visa fliken igen |

Genomspelningstestet öppnar menyn över varje sorts lager (replik, kort, formel, namn, bok, lapp, passets slut, hjälten, rummet), kontrollerar att spelet står still och tar sig ut med Escape. Det stänger också fliken mitt i en scen i varje pass och kontrollerar att spelet fortsätter på samma steg.

**Dolda lager kör inget.** Varje steg stänger sina klockor och lyssnare när det är klart (`anvand`, `valjIRummet`, knuffarna). En dold HUD-knapp gör ingenting när den trycks.

## 15. Fortsätta där man var (0.3.2)

- Spelet sparar efter varje steg, alltså minst vid varje ny scen och varje löst pussel.
- Sparningen har scenens id, numret, passet och steget (`scenId`, `scen`, `pass`, `steg`).
- Vid en omstart spelas scenens `vid_omstart` ("Var var vi?"), och sedan fortsätter spelet på samma steg.
- Ett steg som ger något (bär, kartbit, grad) ger det bara en gång, även om spelet startas om mitt i steget (`effekt` i sparningen).
- **Stabila id:n.** Byter en scen eller ett pussel id står det gamla i kapitelfilens `alias` (`{ "scener": { "gammalt": "nytt" } }`). En sparning med ett id som har tagits bort utan alias börjar i början av samma pass. Lappar med borttagna id:n försvinner ur listan. Testat med en sparning från en äldre version av innehållet (`tests/fixturer/spar-aldre-innehall.json`).

## 16. Ett nytt äventyr (0.3.2)

Motorn vet inget om ett visst äventyr. Allt som är DEN GÖMDA DALEN ligger i data:

| Var | Vad | Ägs av |
|---|---|---|
| `content/<äventyr>/aventyr.json` | `id`, titel, talare, platshållare, kapitelordning | Innehåll (formatet: teknik) |
| `content/<äventyr>/kap-NN.json` | Kapitlen: rum, scener, pussel | Innehåll |
| `kartor/<äventyr>/<rum>.tmj` | Var föremålen står (Tiled) | Teknik i gråboxen, sedan stil |
| `kartor/<äventyr>/platshallare.json` | Gråboxens platshållarbilder för bild-id:n | Teknik |

Ett nytt äventyr är en ny mapp i `content/` och en i `kartor/`. `main.js` hittar dem själv. Med flera äventyr väljs ett med `?aventyr=<id>` tills startskärmen får ett val (fas 3–4).

**Sparfilen** har två delar:
- **Spelarens** (`spelare`): hjälten (namn, utseende, grad, formler, eget formatfält så att den kan exporteras), ungen (namn, växtsteg, förmågor, eget formatfält) och lärandeprofilen (nivåer per pusseltyp, historik). Följer med till nästa äventyr.
- **Äventyrets** (`aventyr.<id>`): var man är (kapitel, scen, steg, pass), rummens tillstånd, bär, kartbitar, lappar, gränssnittet som har visats. Ungen ligger hos spelaren sedan format 2. Skapas första gången äventyret spelas (`aventyrFor`).

Kvar att göra senare (noterat, inte byggt):
- Bärens räknare och nosen hör till serien (ungen), inte till äventyret, och ligger kvar i motorn.
- Namnkonventionen för utgångar (`dorr_`, `stege_`, `grind`, `stig_`) används bara när kartan inte säger något.

## 17. Huset, rumsbyten och val i världen (0.5.0)

**Husets plan.** Rummen inomhus har en väggram (kartans egenskap `inomhus`): bakvägg 3 rutor (48 px), sidoväggar 2 (32 px), främre kant 1 (16 px), i `karna/rumslayout.js` som `VAGG`. Väggarna är hinder. Dörrar sitter i väggarna och möbler står längs dem. Varje utgång har en `riktning` (åt vilket håll den leder), och två dörrar mellan samma rum sitter på motsatta väggar. Utedörren (`ute`) ritas ljusare än dörrarna inomhus. Ett enhetstest (`husets plan`) kontrollerar riktningarna, stegen (upp från hallen, ner från vinden), att alla innerdörrar har samma färg och utedörren minst 20 steg ljusare, att dörrarna sitter i väggarna och att läsplatsen ligger inne i rummet.

**Att gå igenom en utgång.** `framfor(o)` är tröskeln, `lasplats(o)` en bit (18 px) in i rummet framför den, `genom(o, pos)` säger om hjälten står i tröskeln på väg ut. En utgång räknas först när hjälten har varit borta från den sedan steget började. Står han redan i tröskeln (han kom just in där, eller efter FORTSÄTT) händer inget förrän han går därifrån, trycker på utgången eller använder den.

**Rumsbyten.** Två sätt:
- **Glida** (gång genom en utgång med `riktning`): det gamla rummet fotograferas (`renderer.snapshot`), det nya ritas, och båda glider i hela rumspixlar åt utgångens håll (`ui.glid`, 500 ms). Hjälten står sedan 200 ms på tröskeln och tar ett steg in i rummet.
- **Tona** (svart, `ui.tona`): bara mellanscener, sidovy, en ny dag (passets slut) och FORTSÄTT.

**Stegen.** En utgång med `klattra` klättras: hjälten går till stegens fot, vänder ryggen mot kameran och klättrar själv (`Rum.klattra`, ingen styrning) tills huvudet når luckan. Då glider nästa rum in, och han kommer fram på stegen i det rummet (aldrig bredvid) och klättrar de sista pinnarna. Ungen väntar och kommer efter. Testet `stegen` går hallen → vinden → hallen.

**Val i världen** (`i_rummet` med utgångar): ordet står på en skylt när hjälten är inom ungefär en ruta från dörren eller stigens skylt (`lapp`). Ett tryck på dörren går först till läsplatsen, nästa tryck går igenom. Fel dörr öppnas aldrig: hjälten tar ett steg tillbaka till läsplatsen och felreaktionen spelas. Förenklingen spikar igen dörrar med plankor (`Rum.spika`).

**Var skylten och handen står** (`skyltPlats` i `spel.js`): på dörren i bak- och framväggen, ovanför dörren i en sidovägg, bredvid föremål som står mot en sidovägg (ute i väggen, så att grannlådan och hjälten syns), annars ovanför. Den hålls alltid inne i rummet.

**Hjälten i gråboxen** är spelarens egen figur: blått ansikte i en grå hjälm, mörk dräkt och blå skor (standardvalet i skapa hjälten).

**Rättelser efter test av 0.5.0 (0.5.1):**
- **Skylten har en hand.** Ett tryck på en dörr går till skylten. Där visar skylten ordet och en pulserande hand, samma tecken som vid föremålen. Ett tryck på skylten, på dörren igen, Mellanslag eller att gå vidare tar hjälten igenom. Förut fanns inget som sa att ett tryck till behövdes, och dörren såg obrukbar ut.
- **Etiketterna avslöjar inget.** Gråboxens etiketter (föremålens id för den vuxne) visas aldrig på utgångar, och inte på alternativen eller deras skyltar medan ett val pågår.
- **Föremål utan framsida** (`sida: alla`) används från närmaste håll: `framforFran(o, pos, inomhus)` väljer under, ovanför, vänster eller höger (aldrig i väggen), och `vidObjekt` godtar en ring runt föremålet. Krukorna, buskarna och lådan med staven. Krukorna står längre från främre kanten.
- **Lampor** (`lampa` i kartan) lyser när rummet är mörkt. Köket har en vid Farfars plats.
- **Fri lek utan knapp:** se tabellen i avsnitt 14.

**Inget för den vuxne syns under ett pass (0.5.2).** Gråboxens etiketter (föremålens namn) är avstängda från början. Slår den vuxne på dem i menyn syns de bara när spelaren går i rummet, aldrig på utgångar, och aldrig medan ett pussel pågår (`pusselPagar` i `spel.js`). Genomspelningstestet kontrollerar i varje steg att inga etiketter syns, och ett eget test slår på dem och kontrollerar att de är borta under dörrvalet.

## 18. Läsningen ska löna sig (0.5.3)

Efter den externa granskningen: det ska aldrig löna sig att gissa eller vänta på ungen i stället för att läsa.

- **Hjälpens timing** (`karna/hjalp.js`): hjälp som pekar på svaret (en knuff med `pekar: true`) kommer tidigast efter första felet, eller efter 4 sekunder per alternativ och minst 12 sekunder (`PEKNING`). Hjälp som upprepar frågan (tankebubblan blinkar) kommer efter 9 sekunder som förut. `knuffKlocka` i `spel.js` tar en vakt som säger hur länge pekningen ska vänta.
- **Loggen** har en rad `[val]` för varje val: pusslet, alternativet, resultatet, sekunder sedan pusslet började och om en knuff (`knuff_fore`) eller en pekning (`pekning_fore`) kom före valet. Hjälten som stannar på tröskeln loggas som `[tröskel]`.
- **Tröskeln:** en utgång i ett val i världen väljs bara om skylten syntes innan rörelsen som tar hjälten igenom började. En nedhållen piltangent går alltså inte rakt igenom en dörr: han stannar på tröskeln med skylten synlig, och en ny piltangent, Mellanslag, ett tryck på skylten eller på dörren tar honom igenom. Inmatningen skickar handlingen `ga` för varje ny piltangent (inte tangentrepetition). På iPad betyder ett tryck på dörren "gå dit" (till skylten) och ett tryck till "gå igenom".
- **Pekningen syns i gråboxen** (0.5.4): en knuff med `pekar` får ungen att springa till rätt dörr eller låda och nosa mot den (`Rum.ungePekar`), tills spelaren väljer. Knuffens beskrivning, som är skriven för den vuxne, visas då inte. Efter tre fel pekar ungen på samma sätt.
- **Dörrens band** är brett: står han med fötterna strax nedanför eller bredvid dörren och trycker mot den, räknas det som att gå igenom.

## 19. Före grind A: granskningen och den vuxnes speltest (0.6.0)

- **Skyltarna på dörrar och stigar syns hela tiden** i ett val (`#skyltar`, `ui.skyltar`). Han läser från mitten av rummet och går raka vägen, och ett tryck på dörren eller skylten går rakt igenom. Tröskelstoppet är borta: regeln att skylten ska ha synts före rörelsen uppfylls av sig själv. En prövad dörr behåller sin skylt nedtonad. Lådorna behåller närlappen. Genomspelningstestet kontrollerar att skyltarna aldrig överlappar och ryms i rummet.
- **Hallen** är smal, hög och mörk: tjocka sidoväggar (kartans `vagg_sida`), stegen mitt på bakväggen, två dörrar på varje sida, och en nattlampa mitt i hallen, lika långt från alla dörrar. Hallen har tillstånden natt och morgon. Sovrummet har ett nattljus vid sängen.
- **Förenklingen** tar först bort de fel alternativ han redan har prövat (dörrarna spikas igen) och lämnar minst två (`karna/pussel.js`).
- **Lappen i världen:** ett pussel som spelaren har fått som en lapp (dinomaten) visar lappen i tankebubblan, inte texten. Lappen glimtar när han kommer in, ett tryck öppnar den, och knuffen är att lappen lyser.
- **Styrbilder:** första gången han står vid något som går att använda visas Mellanslag (dator) eller ett finger (pekskärm), och likaså vid första krukan (svinga). Den försvinner när han har gjort det en gång (`av.ui.styrAnvand`, `styrSvinga`).
- **Packlistan** får en bock per packad rad. När allt är packat lyser raden som inte är en sak, sakerna tonas ut, och reaktionen spelas medan listan syns.
- **Passets slut:** ▶ och den sovande ungen (aldrig en dörr). `fraga` läses upp.
- **Boken:** uppslag 1 läses av sig själv och sedan glimtar sidhörnet. Från uppslag 2 bläddrar spelaren själv.
- **Regianvisningen** (mellanscener i gråboxen) är liten, i vanlig skrift, uppe till höger, aldrig på läsplattan och inte uppläst.
- **Nya steg:** `bara` (filten följer hjälten, `Rum.bara`, `Rum.lagg`), `prata` (figuren kallar, `#rop`), `ta_emot`, `vantar_pa` på repliker (`handlingGjord('mata_ungen')`), `via: radio`, och `vid_annan_utgang` på `ga_till` (låsta dörrar: ljud, hjälten tittar upp, målet lyser). **Fråga igen:** `rum.fragaIgen` upprepar figurens senaste replik i scenen.
- **Provscener i testerna:** med `?snabb&testscen` läggs en scen ur `localStorage` (`ordstaven_testscen`) till i kapitlet, så att stegen kan provas innan innehållet använder dem (`tests/webb/steg.spec.js`).


## 20. Prologen v0.10 och nosen på tangentbordet (0.6.1)

- **Nosen på datorn** (beslut 10): Tab tänder nosen och markerar första ordet, Tab igen går till nästa ord, Mellanslag eller Enter läser det markerade ordet och Escape släcker. Tab medan ett ord läses avbryter och går vidare från det ordet. På iPad trycker man på ordet. Orden som går att markera står på läsplattan, i tankebubblan, på lappen vid föremålet och på skyltarna.
- **Fångare i inmatningen:** `inmatning.fanga(f)` får handlingen före alla lyssnare, och returnerar `f` true stoppas den där. Nosen fångar Mellanslag, Enter och Escape medan den är tänd, så att de inte går vidare till ▶ eller rummet. Kärnan rör fortfarande inte DOM: fångaren ligger i `grans/ui.js` (`ui.fanga`).
- **Spelaren nosar själv** (`nos_demo`): lappen öppnas med nosen tänd och ordet glimtar (på datorn är det redan markerat). ▶ syns först när han har hört ordet, eller efter 20 s. Gratis. `vantar_pa: "nosen"` väntar tills nosen tänds (`ui.vidNos`).
- **`vid: "ungen"`** på en replik: texten står i en bubbla ovanför ungen (`#rop`) och läses upp, i stället för på läsplattan (namnet i s08).
- **Skyltarna syns utanför valen också** (`visaUtgangsSkyltar`), i `ga_till` och `fritt`. Ordet hämtas från kapitlets läsval i rummet som har utgången som alternativ, eftersom kartan bara har id:n. Ett tryck på en skylt går dit. I hallen före kläckningen är dörrarna låsta.
- **`prata` när hjälten redan står vid figuren:** figuren kallar ändå ("Här!"), och samtalet börjar direkt. Ett tryck på en figur som är stegets mål går dit i stället för att upprepa figurens senaste replik.
- **Sparpunktens fråga** läses från `aventyr.json` (`sparpunkt_fraga`), om sparpunkten inte har en egen `fraga`.
- Ett tryck på ▶ som avslutar ett steg får inte bubbla vidare till nästa replik på samma läsplatta (`vanta(0)` före `doljPlatta`).

## 21. Grind A: rättelser efter första körningen (0.6.2)

- **Nära nog räcker** (`karna/rumslayout.js`): `vidObjekt` för saker, figurer och stegar är avståndet från fötterna till föremålets ruta, högst `RACKVIDD` (1,5 rutor), från alla håll. Dörrar och stigar väljs fortfarande genom att gå igenom dem.
- **En sak i taget:** `aktivSak` väljer den närmaste inom räckvidden. Lika nära (inom 2 px) vinner den hjälten är vänd mot (`Rum.vand`, senaste rörelsen). Bara den får ramen och handen, och Mellanslag och ett tryck går till den. Ett tryck på en annan sak inom räckvidden går närmare den i stället för att öppna den aktiva (`tryckPa` returnerar om trycket användes).
- **Alternativen står minst 3 rutor isär** (`glipa`), testat för varje val i prologen, och ett test ställer hjälten vid varje låda från åtta håll.
- **Stegen:** inom räckvidd ställer sig hjälten själv mitt för stegen och klättrar.
- **Låsta utgångar** (kartans `last_i`): en vakt i `spel.js` ser när hjälten går till en utgång som är låst i rummets tillstånd. Han känner på handtaget (dörren skakar och klickar) och tar ett steg tillbaka. Gäller i alla steg.
- **Hallen:** skyltarna sitter ovanför dörrarna och täcker dem aldrig (testas i genomspelningen). Dörrarna har karm och handtag. Hallen är ljusare på natten (kartans `morker`). Ytterdörren sitter i hallens främre vägg, med dörrmatta.
- **Pilskyltar** vid stigarna: skylten har en pil längs stigen.
- **Nosen läser hela ordet** (`LJUDNING_BOKSTAVSVIS = false` i `grans/ui.js`). Ljudningen med remsan står kvar till fas 4.
- **Rösten** (`grans/rost.js`): yttrandet hålls kvar i `pagaende` tills det är klart. Annars kan Chrome släppa det, och då kommer aldrig `onend`. Som reserv räknas talet som klart när talsyntesen har varit tyst i ca 0,3 s efter att ha börjat. Maxtiden finns kvar för en talsyntes som hänger sig. Loggen säger `slut utan onend` (högst tre gånger) när reserven behövdes.
- **Canvas utan WebGL:** `?canvas` tvingar canvas-ritningen, och loggen säger hur världen ritas (`ritning`). Ett test spelar början med canvas och en fyra gånger långsammare processor (ca 60 bilder per sekund efter uppvärmning), och `PW_CANVAS=1` spelar hela prologen med canvas. Loggens fråga om grafikkortet görs bara en gång per session (ett nytt WebGL-sammanhang kan ta sekunder).

## 22. Provsidan för textgrammatiken (0.6.5)

- **`textprov.html`** är en egen sida bredvid spelet (Vite bygger två sidor). Den är för den vuxne och visar alla textformer i prologen och kapitel 1 sida vid sida (beslut 13.3). Service workern ger aldrig spelet i stället för den (`navigateFallbackDenylist`).
- **En ram per form** (`textprov.html?form=<id>`): spelets eget textlager (`grans/ui.js`) och `stil.css` ovanpå en schematisk gråbox i rummets pixlar (`src/textprov/ram.js`). Ramen är 1280 × 768, som MacBooken i helskärm, och skalas ner på översikten. Öppnad ensam får ramen egna knappar.
- **Formerna är data** (`src/textprov/former.js`): namn, plats, uppläsning och en källa i innehållet per text (`hamta.js`: kapitel, scen eller pussel, steg och fält). Texten skrivs aldrig in i koden. Där datan inte har ett fält för texten än (tavlan BRON, Farfars lista, räddningens brickor, namnet) står ett exempel, och sidan säger det. Ett enhetstest kontrollerar att varje källa finns.
- **Framskrivningen** (`src/textprov/upplasning.js`, `karna/framskrivning.js`): ord för ord eller allt på en gång, med eller utan markering av ordet som läses. Takten kommer från röstens ordsignal (`onboundary`, `rost.saga(text, roll, vidOrd)`) när webbläsaren ger den, annars fördelas den uppskattade tiden efter ordens längd. Ord som inte har kommit än tar sin plats, så texten hoppar aldrig. Skiljetecknen kommer med sitt ord. Ett tryck på texten visar allt direkt.
- **Rösten finns där trycket görs.** Chrome låter bara ett dokument som har fått ett tryck tala, så översikten äger rösten och läser upp texten i ramarna. En ny ▶ avbryter den förra.
- Former som inte finns i spelet än (märkta **Skiss**) har en enkel stil i `src/textprov/ram.css`. Den ersätts när Stil har ritat formen.

## 23. Motorn för kapitel 1 (T2, 0.7.0)

- **Pusslen** (`karna/pussel.js`): brickorna står alltid i bokstavsordning (`iBokstavsordning`). Räddningen (`skapaRaddning`, P15) har ett tryck i taget och kasta-läget med staven: han fyller de tomma fälten i ordning, fel bricka studsar och rätta ligger kvar. Kodlåset (`skapaFormel` med `kontroll: hela_ordet`) kontrolleras när hela ordet är lagt. Formeln har titta–täck (`forebild.tacks`). Svingningen (`skapaKrukor`) kan lägga saken i det sista föremålet (`sak_i_sista`) bland rummets egna föremål. Knufftiden på läsplattan räknas efter textmängden (`karna/hjalp.js`, 11 s per mening, minst 9).
- **Varianten bestäms när han kommer in i rummet** (`rumsNiva` i `spel.js`): läsvalen i världen (skyltar, lådor, stigar) byts aldrig medan han är kvar. Förenklingen i världen spärrar prövade alternativ i stället (`skapaValj` med `iRummet`).
- **Text i världen hör till rummet** (beslut 15.2): `rum.skyltar` ritas i ett eget lager i textlagret (`#rumsskyltar`). Ett ord syns hela tiden, en mening är ett papper som öppnar läsplattan när han går dit (efter att ha varit borta). Pusslets `skylt` (frågan på Farfars skylt) visas så bara medan scenen har pusslet. `las_skylt` väntar tills han har läst. Ett steg som sköter en skylt (`skyltStyrs`) hindrar att den öppnas två gånger.
- **Det frivilliga:** `rum.frivilligt` går att göra under `ga_till` och `fritt`, en gång (`av.frivilligt`). En frivillig scen spelas aldrig i tur och ordning (`berattelse.js` hoppar över den). Den startar när han går ut genom en utgång till sitt rum under ett `ga_till` med `fri_vag`, spelas en gång, och sedan går han själv tillbaka. Berättelsen står kvar i steget han lämnade.
- **Effekter utanför ordningen:** `b.effektUtanfor(steg, rum)` gör stegets effekt (bär, gåva, dolt föremål, Dinoboken) för det frivilliga. `visa_foremal` sparas per rum (`av.visade`), och `synligaIds` visar ett dolt föremål först då.
- **Stigarna:** `genom` på en stig kräver att han står på just den stigen, vid kurvan (stigens slut). Felet spelas bakom kurvan (`rum.gom`), och han går tillbaka till `stigStart`. En spärrad stig har en gren och är ett hinder (`rum.sparrade`).
- **Höjdnivåer** (`karna/nivaer.js`): kartans `yta` (med `niva`), `trappa` och `stege`. Rummet har en uppsättning hinder per nivå (`skapaHinder` med en extra regel för var fötterna får stå), och på en förbindelse gäller båda. Han byter nivå när han lämnar förbindelsen. Saker når han bara på sin nivå (`rum.paNivan`). En väg till en annan nivå går över närmaste förbindelse (`rum.vagTill`). På stegen går det bara upp och ned, med ryggen mot kameran.
- **Kameran i textlagret** (beslut 14): `rum.kamera` är världspunkten i skärmens övre vänstra hörn, i hela pixlar. Allt i textlagret som sitter på något i världen placeras med `varldTillSkarm`, och ett tryck blir en världspunkt med `skarmTillVarld`. Kameran står i (0, 0) tills T6 låter den följa hjälten.
- **Hjältens lager** (`karna/hjalte.js`, sparformat 4, hjältens format 2): formen är fast, huden och dräkten är palettbyten, och hjälmdekoren och ryggsäcken tas på direkt när han får dem (`ge_sak`). Garderoben finns för att byta tillbaka.
- **Pausmenyn** (stilguiden §6): pausknappen (spelarens, inte ⚙) öppnar KARTAN och HJÄLTEBOKEN med flikarna staven, garderoben och Dinoboken. Orden står i `aventyr.json` (`gransnitt`). Pausknappen glimtar en gång när något är nytt, och en ny flik har en stjärna tills han har tittat (`spelare.sett`). Världen står still medan menyn är öppen.
- **Stubbar i gråboxen:** Dinobokens sida (en bild och ett ord), ungens tillägg (`unge.tillagg`, ungen hoppar) och nosens pris (ett bär flyger från räknaren till nosen).
- **Tryck medan världen står still** (rummet tonas in, en reaktion, han går tillbaka från kurvan) sparas i högst 1,5 s och görs sedan som ett vanligt tryck (`rum.sparatTryck`), så att han går till föremålet och inte till tryckpunkten.
- **Provscener** kan ha egna rum och kartor (`rum`, `kartor` i `ordstaven_testscen`). `?kapitel=<id>` spelar ett kapitel utan kartor.

## 24. Golvdatorn: ritning utan grafikkort (0.7.1)

- Golvdatorn (MacBook Pro 2015) kör Sequoia via OpenCore, och Chrome har stängt av grafikkortet där (`chrome://gpu`: "GPU access is disabled due to frequent crashes"). Allt ritas i mjukvara, och världen ritas med canvas.
- **WebGL som tappas** (`webglcontextlost`, Safari på samma dator): spelet sparar `ordstaven_ritning` (canvas, en vecka) och laddar om. Sparningen görs efter varje steg, så han fortsätter där han var.
- **Hack i loggen** (`grans/prestanda.js`): en bildruta över 100 ms skrivs som `[hack]` med scen, steg, pussel, läsplattan och ritningen. Hack inom samma sekund blir en rad. `js_ms` är tiden i långa JavaScript-uppgifter under hacket: nära noll betyder att ritningen är det tunga, inte koden. Var 30:e sekund skrivs en sammanfattning om mer än en av tio bildrutor var långsam.
- **Hopp till ett kapitel** (`?kapitel=kap-01`, och en sparning som är längre fram): kapitlen före spolas fram en gång (`spolaFram` i `karna/berattelse.js`, `av.spolat`). Stegens effekter görs utan att spelas: knapparna, ungen som följer, formlerna, kartbitar, lappar och gåvor, men inga bär. Namn som saknas frågas efter med de hoppade kapitlens egna dop-pussel, så att inga namn hittas på i koden.
- **Det frivilliga och formlerna:** ett frivilligt föremål vars steg övar en formel (P11) går inte att använda förrän formeln finns på staven.
- **Knapparna i HUD** täcks aldrig av en skylt, lapp eller hand: en som skulle hamna över en knapp ställs under sitt föremål (`placera` i `grans/ui.js`).

## 25. Golvdatorn: canvas som ritar bara när något ändras (0.7.2)

- **Golvet är ritning i mjukvara** (beslut 19): MacBook Pro 13" 2015, canvas, utan grafikkort. Det står i `docs/testmatris.md`. Målet är minst ca 30 bildrutor per sekund.
- **Världen är redan 320×192** i canvasen, och sidan skalar upp den i ett steg (CSS, `image-rendering: pixelated`). Ingen ritning i full upplösning görs.
- **Canvasläget** (`?canvas`, `ordstaven_ritning`, eller ingen WebGL alls): Phaser ritar högst 30 bildrutor per sekund (`fps.limit`) och tömmer inte canvasen före varje bildruta.
- **Bara när något ändras** (`Rum.valjRitning`, efter varje steg i scenen): rummet ritas om när hjälten, ungen, buren eller kameran har flyttat sig, när en tween rör något, eller när rummet är markerat som ändrat (`smutsig`, sätts där föremål ritas, tänds eller byter utseende). Annars står förra bildrutan kvar. Glimtar och andra tweens som går för alltid (`oandliga`) räknas inte som rörelse. De ritas åtta gånger per sekund.
- Spelet räknar steg och ritade bildrutor (`antalSteg`, `antalRitade`, krokar `steg2` och `ritade`), så att testet ser att stillastående rum inte ritas om.
- WebGL-läget är oförändrat.

## 26. Kameran (beslut 14 och 18.1, 0.7.2)

- **Ett område** är en karta som är minst en skärm (320×192) och högst 2×2 skärmar (640×384). `lasKarta` ger `storlek`, och en karta utanför det godtas inte. Gränserna dras vid tydliga passager (Innehåll och Stil, rumsplanen).
- **Logiken** ligger i `karna/kamera.js` (ren logik): `folj` (mittzon ±32×24 px, kameran flyttar sig bara så mycket som behövs), `inomGranserna` (stannar vid kanterna, hela pixlar), `centrera` (när han kommer in), `visaRuta` och `omradeFor` (valet), `narmare` (glidning, högst 240 px/s). Inställningarna står i `KAMERA`: zonen, `framat` (förskjutning framåt, 0) och farten.
- **Rummet** (`Rum.flyttaKameran`) uppdaterar kameran i varje steg, också när världen står still. Ryms området på en skärm står den i (0, 0), och allt är som förut. När han kommer in i ett område hoppar kameran till honom innan rummet glider eller tonas in.
- **Storleken** går till det som förut räknade med skärmen: hindren och vägsökningen (`skapaHinder(…, S)`), rörelsen (`steg`, `begransa`), väggarna (`vaggar(v, S)`), golvet och mörkret. Föremålen i ett stort område bär `storlek`, så att `framfor`, `framforFran` och `stigStart` räknar mot områdets kanter.
- **När en fråga ställs** (läsval i världen) får kameran en ruta (`rum.visaOmrade`): alternativen, deras lappar och frågans skylt, med plats för skyltarna ovanför och på sidorna. Kameran glider så lite som möjligt för att rutan och hjälten ska synas. Ryms de inte på en skärm följer den hjälten som vanligt. Därför ska ett val och platsen där frågan läses rymmas på en skärm (krav på kartorna i T5).
- **Textlagret:** skyltar, händer, bubblor och etiketter ligger i `#varldslager`. Varje element minns kamerans läge när det placerades, och när kameran rör sig flyttas det med `translate` i stället för att byggas om. 150 ms efter att kameran har stannat placeras skyltarna om på riktigt. I ett område som är större än skärmen klipps lagret vid rummets kanter, så att skyltar för föremål utanför bilden inte syns.
- Testkrokar: `kamera()` (läge och storlek) och `rutaPaSkarm(id)`.

## 27. Kapitel 1 med kartor (T5, 0.8.0)

- **Datan v0.7** från Innehåll (15 v0.9) ligger i `kap-01.json` utan ändrad text. Tre områden: `skogsbrynet` (40×12), `buskarna` (20×12) och `glantan` (40×24). `alias.rum` pekar `lianerna` till `skogsbrynet` och `gamla_tradet` till `glantan`: det som har visats, rummets tillstånd och det frivilliga följer med (`skapaBerattelse`).
- **Kartorna** står i `kartor/den-gomda-dalen/`. Kapitel 1 spelas nu i det vanliga spelet efter prologen, eftersom alla rum har kartor.
  - **Skogsbrynet:** häcken går i nord–sydlig riktning mellan skärmarna och stänger västra skärmen. Den rätta stenen (`hog_sten` i L2 och `hog_rund_sten` i L3, samma plats) står framför hålet. Lianväggen står framför stigarna till gläntan och buskarna och försvinner efter SVÄRD.
  - **Gläntan:** apans bo är en plattform (nivå 1) med stegen, kullen och krönet är nivå 1 med trappan bakom det rätta trädet, och bäcken med bron ligger längs östra kanten.
- **Bara den variant han får syns** (`innehallNu` i `spel.js`): av ett läsval i världen tas de andra varianternas föremål bort ur rummet, så att L2:s stenar inte står bredvid L3:s.
- **`forsvinner_efter`** (karta): föremålet är borta när hjälten har formeln. Rummet ritas om direkt efter formelpusslet.
- **`oppning`** (karta, på en stig): stigen skär igenom hindret den ligger över när den syns (`skarIgenom` i `karna/vag.js`). Hålet i häcken.
- **Tester:** enhetstester att allt går att nå i varje område och tillstånd (också på nivå 1), att häcken och lianerna stänger vägen tills stenen och SVÄRD öppnar den, att varje läsval ryms på en skärm, och att en sparning från de gamla rummen följer med. Ett webbtest spelar k1s01 till östra skärmen.

## 28. Hopp till en scen i menyn (0.8.1)

- INSTÄLLNINGAR listar alla kapitlens scener. Ett hopp sätter `av.kapitelId`, `av.scenId` och `av.spolaTill` och laddar om.
- Kapitlen före spolas fram som vid `?kapitel=` (`av.spolat` töms, spolningen gör inget två gånger). I hoppets kapitel spolas scenerna före hoppet fram (`spolaFram({ tillScen })`): frivilliga scener och bär räknas inte. Namn som saknas frågas efter med dop-pusslen.
- Ett hopp bakåt tar inte bort det som redan har getts (formler, gåvor). För ett rent prov finns Börja om från början.

## 29. SVÄRD utifrån bilden, rösten som inte startar, och lugn ritning bakom läsplattan (0.8.2)

- **P11 med `bild` och `forebild.visas: "vid_fel"`** (`formel` i `spel.js`): bilden står ovanför fälten, brickorna kommer direkt och förebilden finns inte. Vid första felet tänds den bredvid bilden (`.formel-overst`), vid nästa bricka tonas den bort och ungen håller för ögonen, och efter ett andra fel står den kvar. Knuffen får bilden att glimta i stället för att visa ordet, eftersom ordet pekar på svaret. Loggen säger `klar med förebild` eller `klar utan förebild`.
- **Rösten** (`grans/rost.js`): ett yttrande som inte har startat efter 1,2 s (inget `onstart`, talsyntesen pratar inte) läggs en gång till. Startar det inte då heller ges det upp efter 2,5 s och loggas som `startade inte`. Maxtiden finns kvar som sista spärr.
- **Golvdatorn:** med läsplattan öppen ritar canvasläget världen högst åtta gånger per sekund (`plattaOppen`), eftersom den står still bakom texten.
- Regeln `.platta-oppen #varld canvas { filter }` har aldrig gällt (`#varld` ligger inte i `#ui`) och är borttagen. Världen tonas alltså inte ned bakom läsplattan, i enlighet med stilguiden §8.

## 30. T4: dialogregeln, upprepade fel, rätt val, SLUTA FÖR IDAG, föräldravyn och vägvalet (0.8.3)

- **Radion** (`#hud-radio`, nu en knapp): ett tryck upprepar den senaste upplästa repliken genom radion i scenen (`senaste` med nyckeln `#radio`), som ett tryck på en figur med `talare`. Utan replik sprakar det bara. Steget står kvar.
- **Samma fel igen** (`kortReaktion`): bara ljudet och ungens frågande blick, ca 0,6 s. Det gäller samma fel ord i en formel eller i kodlåset (`samma` i `kontrollera`, `karna/pussel.js`) och en prövad stig som han går in på igen. Andra alternativ kan inte väljas två gånger (de tonas ut eller spikas).
- **Rätt val** (`rattHandelse`): föremålet han valde hoppar och lyser, och ungen gör ett glädjehopp, samtidigt som `vid_ratt` spelas (ca 1,1 s). På läsplattan hoppar ungen. Loggen skriver `[rätt]`.
- **SLUTA FÖR IDAG** (`slutaForIdag`): från pausmenyn (bilden med den sovande ungen) och från knappen vid passets slut. Spelet sparar, `sluta_for_idag.med_ungen` eller `fore_ungen` spelas, och sedan den sovande ungen och ▶, som fortsätter där han var. Pausknappen finns först när hjälteboken har något (från LJUS i s03).
- **Föräldravyn** (`karna/foraldravy.js`, INSTÄLLNINGAR): per pusseltyp nivån, antalet uppgifter, rätt på första försöket utan hjälp, vad slumpen hade gett i läsvalen (1 av antalet alternativ i varianten), hur ofta hjälpen användes och mediantiden. Ur `larande.historik`.
- **Vägvalet** (beslut 17.1): ett `ga_till` med `fri_vag` loggar `[vägval]`, till exempel `stig_buskarna först` och sedan `stig_glantan efter stig_buskarna`, eller `stig_glantan först` med sidogrenarna som fanns kvar.

## 31. Startskärmen och rösten efter ett avbrott (0.8.4)

- **Startskärmen:** glöden runt staven ligger i ett eget lager (`.stav-glimt::after`), och bara dess opacitet pulserar. Förut ändrade animationen storleken på en skugga med oskärpa, som golvdatorn ritade om i varje bildruta. Regeln gäller överallt: animera opacitet eller läge, aldrig skuggor, oskärpa eller filter.
- **Rösten:** pratade talsyntesen när ett nytt yttrande kommer, så görs `cancel()`, och det nya läggs efter 80 ms. Chrome på Mac fastnade ibland som om den pratade, utan `onend`, och då gällde maxtiden.

## 32. Farfars hus (T6, 0.9.0)
- **Hallen** (`kartor/den-gomda-dalen/hallen.tmj`, 28 × 12 rutor) är en bred entré österut och en smal korridor västerut. Formen kommer av en ruta med typen `vagg` söder om korridoren: `karta.massiv`. Väggarna inne i rummet är hinder (`Rum.byggHinder`), ritas som massiv vägg med främre kant och sidoväggar (`Rum.ritaGolv`), och en plats i dem väljs aldrig som plats framför en sak (`framforFran(..., massiv)`).
- **Dörrarna:** FARFAR, BOK och MAT i korridorens bakvägg, SOV i korridorens främre vägg (i väggen inne i rummet) och BAD i entréns vänstra vägg. Alla fem står inom x 56–272, alltså på en skärm med hjälten, minst 3 rutor isär (enhetstest). Rummen bakom ligger som på kartan: läsrummet och köket ovanför, gästrummet nedanför, och rumsbytet glider därifrån.
- **Läsrummet** (`kontoret`) är nytt: fåtöljerna, bordet, läslampan och bokhyllan med expeditionsboken. Farfar sitter där på natten (`farfar_i_fatoljen`). Köket har bara morgonens saker.
- **Vinden** är spegelvänd, så att stegen står till höger, rakt ovanför stegen i hallens entré. Avstånden mellan lådorna är desamma. De sex krukorna står i en rad. Krukor som står tätare än en hjältebredd (`Rum.dela`) nås bara framifrån, annars hamnar han mellan två krukor och grannen blir den aktiva (0.10.1).
- **Tankebubblan** (`ui.placeraTanke`) står överst i mitten, men täcker den ett alternativ, en skylt eller en knapp flyttar den till första lediga plats (uppe till vänster eller höger, eller nere). Dörrarna i bakväggen satt annars under den.
- **Fågelns röst:** rollrösten `fagel` (`rost.tonFor`) skiftar tonen lite från replik till replik, räknat ur texten så att samma replik alltid låter likadant, och ett utrop går upp. Lätet `fagel_late` är tre korta kvitter.

## 33. Textgrammatiken (T4b, 0.10.0)
Beslut 21 och stilguiden §3: fyra familjer som i serier.
- **Någon säger något** (`.pratruta`): varm ruta med rundade hörn, en spets ner mot ansiktet, och ansiktet i en rund ram. Genom radion är ansiktet radions högtalare (📻 i ramen, inte på en egen rad). **Berättaren** (`.berattarruta`): rak ruta, svalt blågrått papper och guldstjärnan. Formen väljs av talaren i `spel.replikHtml`.
- **Rullningen** (`grans/rullning.js`): repliker rullas fram med 40 tecken per sekund (`karna/framskrivning.js`: `RULLNING`, `teckenTid`). Varje tecken är ett eget span som är dolt med `visibility`, så orden har sin plats från början och raden hoppar aldrig. Orden (`.ord`) behåller sina spans för nosen och markeringen. Ett tryck (eller Mellanslag) medan texten rullar visar allt, och nästa tryck går vidare (`ui.vantaFortsatt(..., forst)`). I snabbläget syns allt direkt, utom med `?rulla` (testet).
- **Markeringen** följer rösten från första ordet: röstens ordsignal (`onboundary`), och uppskattad takt tills den kommer. Den kan stängas av i INSTÄLLNINGAR (villkoret i 15.1: hamnar den fel på en enhet stängs den av där).
- **Utan röst** (INSTÄLLNINGAR: rösten av, eller ingen svensk röst) piper rullningen lågt i ordtakt, med en ton per rollröst (`ljud.pip`). När föräldern läser Farfar är det tyst.
- **Golvdatorn:** rullningen räknar fram tecknen ur tiden, inte ur antalet bildrutor, så en långsam dator rullar lika fort men i större steg. Loggen skriver varje rullning (`[rullning] N tecken på M ms (tecken), längsta glapp G ms`). Kommer tre glapp över 80 ms i samma replik rullar texten resten av passet ett ord i taget i samma takt, och loggen säger det.
- **Ljudord** (`ui.ljudord`, `spel.visaLjudord`): fältet `ljudord` på `ljud`-steget och på reaktioner. Ordet står i världslagret vid det som låter, i Lexend 900 med kontur och snett, i ljudets färg (`ljud.farg`), och försvinner efter 0,8 s. Läsplattan täcker det.
- **Papper och saker:** lappen har riven kant nertill (`clip-path`) och sitter 2° snett. Farfars skylt med en mening är en träram med ljust papper. Skyltarna vid dörrar och stigar och tavlorna i världen har en träram, eller sten (`papper: "sten"`).
- **Storlek:** uppläst text 40 punkter, lappar och meningar han läser 48, ord 64, ljudord 80 (stilguiden: 64–96). Ropet vid figuren har svart text med full kontrast och en mörk kant.

## 34. Pass 3 och låsta kapitel (beslut 24.2, 0.11.0)
- **Låsta kapitel** (`spel.kapitelLast`): ett kapitel i `aventyr.kapitel_last.last` är låst tills den vuxne öppnar det (`installningar.oppnadeKapitel`, per enhet). `?kapitel=<id>` går förbi låset. I `spela()` hoppar loopen inte in i ett låst kapitel: förra kapitlets sista rum visas, och `visaKapitelLast` spelar slutrutan (`kapitel_last.steg`) och står sedan kvar med den sovande ungen, en stjärna och ▶ (som spelar slutrutan igen). Kapitlets sista sparpunkt hoppar över frågan när nästa kapitel är låst.
- **Ett klart kapitel förblir klart** (`skapaBerattelse`): står sparningen på sista scenens sista steg (`av.steg` ≥ antalet steg) är kapitlet slut, och det börjar inte om på sparpunkten med "Var var vi?".
- **Börja ett pass** (INSTÄLLNINGAR): en knapp per pass och kapitel, till passets första scen. Samma hopp som scenlistan (§28): det som kommer före spolas fram, och namnen och det som har getts finns kvar. Ett hopp in i ett låst kapitel öppnar det på enheten.
- **Herr Skata:** talaren `herr_skata` (rollrösten `fagel`) och lätet `fagel_late` som ett skrockande skratt i tre stötar (`ljud.skata`), tills Stil gör det riktiga ljudet.

## 35. T4c: molnet, frågan ovanför korten och luckorna (0.12.0)
Stilguiden §3 gick igenom mot spelet. Det som saknades är byggt här, resten fanns.
- **Molnet** (`spel.visaMoln`, `#tanke`): nere till vänster i rummet. `ui.placeraTanke` provar nere till vänster, nere i mitten, uppe till vänster, uppe i mitten och uppe till höger, och väljer första platsen där molnet inte täcker ett alternativ, en skylt eller en knapp (nere till höger är spelarens: bären och nosen). Innehållet är en bild (`moln-bild`) och, för en uppgift som läses upp, texten i 40 punkter och en högtalare som läser den igen. Ett mjukt pling (`ljud.pling`) när ett nytt moln kommer. Ingen oskärpa: kanten och puffarna är hela förskjutningar.
- **Instruktionen till ett val i rummet** (`valjIRummet`, t.ex. FILT) visas i molnet och läses upp där, och en gång till efter 8 s om inget val är gjort. Den visas inte längre först på läsplattan.
- **Frågan ovanför korten** (`fragaFor`, `fragaRadHtml`): i läsvalen på läsplattan står pusslets instruktion, annars den upplästa repliken strax före pusslet i scenen, kvar överst i sin form: stjärnan för berättaren, ansiktet för någon annan. Ett tryck på stjärnan eller ansiktet läser den igen. Inte på packlistan, där listan är frågan.
- **Luckorna:** ett läsval där alla alternativ är meningar visas som lådans lock (träram): frågan och bilden överst och en rad per lucka i hela bredden, med en liten lucka med gångjärn före meningen. Radbredden är 18 em, och texten växer med rummet bara så långt att en mening ryms på en rad, aldrig under 48 punkter.

## 36. T4d: ljudordens färger, animationer och fel utan skakning (0.12.1)
- **Ljudordens färger** (`ljud.farg(ord)`, stilguiden v0.26 §3): färgen slås upp på ordet, inte på ljud-id:t, så att en reaktion utan ljud (KLONK, PIP, HO HO) får samma färg som samma ord från ett `ljud`-steg. Okända ord får läsplattans papper (#F5ECD7). Ett nytt ljudord får sin färg av Stil.
- **Animera bara opacitet och läge** (§8, golvdatorn): en glöd är ett eget lager (`::after`) med hel kant eller platt färg, och bara dess opacitet pulserar (`glod`, `glodpuls`). Styrhjälpens tangent är en kant (`.tangent`) och en yta (`.yta`) som flyttas. `tests/enhet/stil.test.js` läser `src/stil.css` och säger fel om en `@keyframes` ändrar något annat än opacitet och läge (undantag: vuxenmenyns `fyll`), om något använder `filter`, och om något skakar utom ungens nos.
- **Fel skakar aldrig** (25.4, §7): `.kort.sjunker` (läsplattans kort), `.platser.gra` (formeln och räddningen) och `.kod-las.rasslar`, där bara bygeln (`.kod-bygel`) rör sig.

## 37. Grafiken ur inkorgen och tillbaka till ett pass (0.13.0)
- **Vägen** (dokument 02 §7, beslut 25.2 och 26.5): inkorgsmappen på den vuxnes dator (`figurer/<figur>/*.png`, `ljud/*.wav`) → teknikchatten hämtar en kopia → `python3 -I verktyg/grafik/inkorg.py <kopian>` → `assets/`. Skriptet tvingar in färgerna i masterpaletten (`assets/palett.json`, högst 48, avstånd högst 3 räknas som samma färg, hjältens färger först), gör halvgenomskinliga pixlar hela eller borta, skriver om bilderna från pixlarna (ingen metadata), packar varje figur till ett atlas (`assets/sprites/<figur>/<figur>.png` och `.json`, Phaser JSON Hash) och döper ljuden utan mellanslag. Arken (`*_ark.png`) hoppas över. `--prova` visar bara vad som skulle hända.
- **Kontrollen** (`tests/enhet/tillgangar.test.js`): varje fil står i `assets/LICENSER.md`, PNG har bara bildbitar, WAV bara `fmt ` och `data`, paletten högst 48 färger, och hjälten och staven är 16 × 24 i fyra riktningar.
- **Figurerna i världen** (`src/scener/figurbilder.js`): scenen laddar atlasen i `preload`. Hjälten är bilderna av hjälte A med hud och dräkt bytta (`karna/fargbyte.js`: hudens tre toner flyttas med samma steg i nyans, mättnad och ljus som förlagan, dräkten har en ton), en textur per val. Staven är ett eget lager ovanpå, med knytnäven i hudens färg, och syns från att hjälten har en formel. Bilden väljs efter riktningen (`vand`), och gången byter bild var femte pixel. Ryggsäcken och hjälmdekoren är gråbox tills Stil ritar lagren.
- **Herr Skata** flyger förbi högt uppe när hans läte spelas (`FLYGER_VID_LJUD` i `spel.js`), utan att berättelsen väntar. Sitta och titta finns i atlasen för mellanscenerna senare.
- **Ljuden** (`grans/ljud.js`): de inspelade lätena avkodas när ljudet startar och ersätter syntesen för `fagel_late`, ungens tre läten och ungens reaktioner (ett av de tre). Ett ljudsteg väntar tills lätet har låtit klart, högst 1,6 s.
- **Tillbaka till ett pass** (beslut 26.6): ett hopp i INSTÄLLNINGAR kör `aterstallFramsteg` (karna/berattelse.js) före spolningen. Det som berättelsen ger töms, och spolningen ger tillbaka det som kapitlen före passet ger. Bären får vara kvar men aldrig fler än `barFore` (ge_bar, krukornas bär, buskarna i fri lek). Kapitel efter passet som står i `kapitel_last` och är öppnade låses igen. Fliktavlorna (stjärnorna i MIN BOK) sätts till det som spolades tillbaka.

## 38. Farfars hus i grafik (0.14.0)
- **Skriptet** (`verktyg/grafik/inkorg.py`) tar hela inkorgen: `figurer/<mapp>` blir ett atlas per mapp i `assets/sprites/`, `foremal/<zon>` ett atlas per zon i `assets/foremal/`, `rum/<zon>/<rum>.png` en bild per rum i `assets/rum/`, `rutor/<zon>` rutsetet i `assets/tiles/`, och porträtten också egna bilder i `assets/portratt/`. `--bara` väljer mappar. Färgerna och genomskinligheten (skuggorna) står kvar som Stil ritade dem. `assets/palett.json` är en förteckning över färgerna, inte längre ett lås (283 färger, stilguiden §2 säger 48: Stils sak).
- **Grafiken laddas** i `Rum.preload` (`scener/figurbilder.js`, `import.meta.glob` över `assets/`). Rummen heter `rum_<rum>`, rutorna `rutor_<zon>`, atlasen sitt mappnamn.
- **Kartorna säger vilken bild** (schema 2.14): kartans `bild` (rummets bild, ersätter gråboxens golv och väggar) eller `mark` (rutset för marken utomhus: gräs i varianter och stigens rutor under stigarna, ritat en gång till en egen bild). Ett objekts `bild`, `bild_natt` (på natten), `bild_pa` (bilden står på ett annat föremåls nederkant: Farfar i fåtöljen), `bild_del` (bilden för delarna när föremålet delas: krukorna), `sovplats` (sängen) och `skata_fonster` (vindsfönstret). Bildens nederkant mitt står på föremålets nederkant mitt. Pusslets delar (dinomatens lådor) och föremål utan bild ritas som i gråboxen. Det man går på utomhus (stigar, grinden) ritas inte som en ruta.
- **Hjälten:** skuggan, ryggsäcken (bakom från sidan, framför framifrån och bakifrån), kroppen, taggkammen och staven som lager. Palettbytet tar hudens fem toner och dräktens fyra (`karna/fargbyte.js`). På stegen klättrar han med `hjalte_klattra_upp_01–02`.
- **Ungen** (`unge1_*`, 24 × 24, fötterna nere): gång efter riktningen, andning när den står still, nosande när den pekar, glad hopp och frågande blick vid reaktionerna (ingen skakning). Skuggan under.
- **Hjälten sover** när en scen har `hjalte: "sover"` (s01 och s19): sängen visar honom (`hjalte_sang_03–04`, andas), och han kliver ur (`02`, `01`) när ett steg som inte är en replik, mellanscen eller ett ljud börjar. Kontrollen säger fel om rummets karta saknar `sovplats`.
- **Herr Skata i vindsfönstret:** när hans läte spelas i ett rum med `skata_fonster` visas `runt_fonster_skata_01–05` i fönstret i stället för att han flyger förbi.
- **Farfars porträtt** i pratrutan är `assets/portratt/farfar_portratt_glad.png` (CSS, utan utjämning).

## 39. Pass 3 komplett (0.15.0)
- **Mellanscener med bild** (`bild` på mellanscenen, Stil 20:35): `Rum.regi(bild)` visar det i rummet och säger hur länge (ms). Då visas inte beskrivningen. En bild som inte finns ger beskrivningen som i gråboxen. Ett enhetstest kontrollerar att varje mellanscens bild har grafik.
  - `hjalte_sang_morgon`: sängen växlar `hjalte_sang_morgon_01–02` (ungen på täcket slickar honom på näsan) tills han kliver ur. Ungens egen figur är dold så länge och hoppar ned bredvid honom när han vaknar.
  - `luftskepp_<läge>`: luftskeppet är hela bilder i baronens atlas (112 × 96) som byts och flyttas, i ett eget lager ovanför figurerna. `glider` glider in från vänster med snurrande propeller och svävar sedan (en pixel upp och ned). `skata_landar`, `ser_hjalten`, `skata_putsar` (putsar sig, sedan `skata_snor`) och `trasslar` (`trasslar_01`, sedan `02` och `baronen_hjalm` som trillar ned i gräset och ligger kvar). Varje läge går att visa direkt. Allt försvinner med rummet.
  - Herr Skatas skratt medan luftskeppet är där: han flyger in från höger och landar på hjälmen (läget `skata_landar`).
  - **Baronen talar** från luftskeppet (`talar_01–02`) medan hans replik läses, när han har sett hjälten. **Porträttets min** följer läget (`Rum.uttryck`): förvånad innan han ser hjälten, stolt sedan och sur när han har trasslat in sig (`u-forvanad`, `u-sur` i CSS).
  - **Sidovyn** (`assets/sidovyer/<bild>_bakgrund.png`) täcker skärmen i ett eget lager överst. In i skogen: det lilla luftskeppet glider åt vänster ovanför träden, och hjälten (i spelarens färger, med staven) och ungen springer åt höger på stigen med sina gångbilder. Sidovyn står kvar tills nästa rum.
- **Herr Skata i vindsfönstret på natten** (beslut 28.3): fönstret med `skata_fonster` ritas i ett lager ovanför rummets mörker, så att han syns där.
- **Bildkorten** (`assets/bildkort/<id>.png`, 48 × 48) visas i textlagret i stället för gråboxens emoji för samma id (`grans/bilder.js`). De skalas i hela steg i fysiska pixlar (`--kort` i `grans/layout.js`, så nära emojins storlek som det går). Skriptet skriver bildkorten och sidovyerna som egna bilder.

## 40. Prologen v0.11.3 (0.16.0)
- **Radion lärs ut** (`vantar_pa: "radion"`, schema 2.15): instruktionen står i molnet med radion som bild och väntar. Ett tryck på radion säger Farfars senaste replik genom den igen, och när den är hörd går scenen vidare. Sprakar radion bara (ingen replik), räknas trycket ändå.
- **Kapitelrubriken** (`kapitelrubrik: true`) hoppas över när nästa kapitel är låst, så att slutrutan inte kommer efter en rubrik för ett kapitel som inte börjar.
- **Luftskeppet** har läget `ser_kartan` när baronen spanar på kartbiten (egen bild från 0.17.0). Porträttet är förvånat i `glider`, `skata_landar` och `ser_kartan` och annars stolt. När han läser skyltarna efter pusslet har Stil ingen bild än, så den mellanscenen visar beskrivningen och luftskeppet står kvar i `trasslar_02`.

## 41. Masterpaletten och nattfönstret (0.16.1)
- **Paletten är sluten** (beslut 28.4): Stils masterpalett ligger i `verktyg/stil/palett/palett.json` (350 färger, taket 256 per zon). `verktyg/grafik/inkorg.py` stoppar vid en färg som inte står där (eller under `tillagg`), och säger vilken bild den kom från. `assets/palett.json` skrivs som samma lista. Hjältens hud- och dräkttoner står i den, så palettbytet hittar dem (test).
- **Kartans `lyser`** (på ett föremål): föremålet ritas i lagret ovanför rummets mörker. Vindsfönstret har det, så att månarna och Herr Skata syns på natten. `skata_fonster` gör samma sak, för äldre kartor.
- Stils skript i `verktyg/stil/` byts mot den nya zippen när den kommer (beslut 28.6), nu med `palett/` (`las.py` låser bilderna till paletten).

## 42. Pass 3 för spelaren (0.17.0)
- **Målet i molnet efter en dialog** (beslut 31.2, granskningen A 22): när `ga_till` kommer efter en uppläst replik står målet i molnet nere till vänster tills han är framme. Instruktionen är den senaste upplästa repliken före målet, förbi mellanscener, ljud, `visa_ui` och en replik som väntar på en handling (s21: "Hitta bitarna. Följ {unge} hem!" före "Tryck på radion …"). Börjar nästa rum med ett mål gäller samma instruktion där (sovrummet → hallen → köket). I molnet: föremålets bild ur grafiken (`Rum.malBild`, en bild-URL ur atlaset, i heltalsskala) och repliken med högtalaren. Efter `MAL_KNUFF_MS` (10 s) nosar ungen mot målet (`Rum.ungePekar`) och molnet pulserar. Molnet göms medan han gör något frivilligt eller går in i en sidogren, och kommer tillbaka efteråt. Loggen skriver `[mål] i molnet` och `[framme] <mål> {sek, efter_dialog}`, så att det syns var han stod still.
- **Skyltarna täcker aldrig varandra eller hjälten** (`ui.ordnaSkyltar`): varje skylt ställs först där den hör hemma (`placera`). En som täcker hjälten flyttas helst rakt under honom (en skylt under dörren) eller över honom, annars åt sidan, och det läge väljs som ryms i rummet, inte står på en dörr (grind A) och krockar minst med de andra. Den står kvar på samma sida tills han har gått förbi. Sedan skjuts skyltar som krockar isär i sidled inom rummets kanter, och räcker inte bredden flyttas en ned en rad. Spelet skickar hjältens ruta på skärmen (med lite luft) var 50:e ms (`ui.skyltHjalte`), och ordningen räknas om bara när den har ändrats. Gäller dörrarnas skyltar och rummets skyltar. Från 0.18.0 gäller det inte dörrskyltarna, som sitter på väggen (§43), utan stigskyltarna och rummets skyltar.
- **Radiomärket:** Farfars porträtt genom radion är `farfar_portratt_glad_radio` (CSS `.p-farfar.radio`). Andra talare får emojin tills de har ett eget.
- **Luftskeppet:** `ser_kartan` har en egen bild och sätter hjältens pose `hjalte_kartbit_upp_01` (32 × 40, fötterna där gångens är, staven gömd) tills ett läge som inte är `talar` kommer (`Rum.sattPose`). `laser_skyltarna` växlar till `_talar` medan baronen talar. Före sidovyn flyger luftskeppet (`flyger_fel_01–02`) ned åt höger mot `stig_byn` och ut ur bild (`Rum.flygFel`, 1,6 s), och sidovyn kommer efter. Regiloggen (testkroken) har lägena och posen.
- **Farfars karta** (`assets/karta/`, `grans/kartbitar.js`): en bild per bit och `karta.json` med bitens läge i hela kartan (224 × 144). `kartbitarHtml(nummer, mal)` lägger bitarna där de hör hemma i största heltalsskalan som ryms. Närbilden visar bitarna han har och den scenen ger (`ge_kartbit`), festen visar biten han får, och KARTAN visar de ritade bitarna ihop (en bit utan bild som emoji med sitt nummer). Skriptet läser `karta/` och skriver om `karta.json`.

## 43. HUD:en, ikonerna, dörrskyltarna och samspelet (0.18.0)
- **Ikonerna** (`assets/ui/`, `grans/ikoner.js`): Stils ikoner (16 × 16) visas som `<img>` i textlagret i hela pixelsteg i fysiska pixlar. `grans/layout.js` räknar tre storlekar: `--ipx-text` (i en rad med text i 40 punkter), `--ipx-stor` (festen och pausmenyn) och `--hudpx` (HUD:en). `ikon(namn, storlek)` ger HTML. `ui.ikonKnappar` byter knappar och tecken vars hela text var en emoji eller ▶ ◀ ✓ mot ikonen, på läsplattan, skärmarna, pausmenyn och skärmtangentbordet. `ui.visaFest` och ordlistans bilder (`grans/bilder.js`) gör samma sak för emoji som har en ikon. CSS-markeringarna (handen på skylten, stjärnan på en ny flik, bocken på listan) är ikonerna som bakgrund.
- **HUD:en** (33.2): knapparna är `hud_knapp` (24 × 24, tryckt och aktiv), ikonen 4 pixlar in och antalet bär på `hud_tal` i Lexend. Är ramen till höger om rummet minst 48 punkter (`--ram-hoger`) har dokumentet klassen `hud-i-ramen`: radio, nos, bär och lappen står i en kolumn nere till höger i ramen, och pausen uppe till höger. Annars står de i rummets hörn som förut. Knappens storlek är minst 48 punkter och ryms i ramen.
- **Dörrskyltarna** (33.3, 10d): en dörr som inte är en stig får sin skylt på väggen (`vaggSkyltPlats`): nederkanten 1 pixel ovanför dörren, eller under hålet i en främre vägg (på hålets nederkant om det inte finns plats). Träet är Stils tre delar ihop som 9-slice (`--skylt9`, sätts av `laddaSkyltTra`), och bredden är ordets bredd plus 12 i hela världspixlar. Ordet står i 32 punkter. Dörren där hjälten står (ca 1,5 rutor från tröskeln) får klassen `stor`: skylten skalas till 64 punkter från överkanten (bakvägg) eller nederkanten (främre vägg), och en granne som den stora skulle täcka får klassen `tonad`. Dörrskyltarna flyttas aldrig (`ordnaSkyltar` hoppar över dem). Kameran tar med skylten när ett val med dörrar visas.
- **Samtalet** (34.2): när en replik läses (inte genom radion) vänder sig hjälten mot figuren med samma `talare` i kartan, figuren byter `_ner_` i sin bild mot hållet till hjälten om bilden finns, och ungen tittar på figuren en stund (`Rum.vandMotTalare`). Baronen i luftskeppet: hjälten och ungen tittar dit.
- **Handen inom räckhåll** (34.3): handen syns när ett föremål går att använda (räckvidden 1,5 rutor, som förut). Målet i molnet visar handen redan på 2 rutors avstånd (`TIDIG_HAND`), också på en dörr, och ett tryck på den gör att hjälten går sista biten själv. När han kommer fram till en figur som ska prata (`prata`) syns handen en stund innan samtalet börjar. Loggen skriver `[hand] <id> {avstand}`.
- **Farfars bilder åt alla håll** (`farfar_morgon_` och `farfar_natt_` med `ner`, `upp`, `vanster`, `hoger`) ligger i Farfars atlas. Skriptet läser `ui/`.

## 44. Kapitel 1 v0.7.4 och vägen tillbaka (0.19.0)
- **Avstickare** (beslut 26.2, `spel.js`): `sidoUtgangar(mal, friVag)` ger utgångarna han får gå igenom under ett `ga_till`. I ett kapitel med en sidogren (en frivillig scen med `startar_i_rum`) är det sidogrenens rum och kapitlets rum han har varit i (`kandaRum`: scenerna fram till den som pågår och sidogrenarna han har tagit). I andra kapitel (prologen) bara en ospelad frivillig scen med `fri_vag`, som förut. Går han ut genom en sådan utgång tar `avstickare()` över: den frivilliga scenen spelas första gången, sedan står han i rummet (`visaScen` med scenens id och rummet), och `vandraI()` väntar på en utgång eller det frivilliga i rummet. Ungen nosar efter `MAL_KNUFF_MS` mot utgången närmast tillbaka (`vagTillbaka`, bredden först genom kartornas utgångar). När han är tillbaka i scenens rum fortsätter `ga_till`. Radions senaste replik sparas och sätts tillbaka.
- **Sparningen**: `av.avstickare = { rum, scen? }` medan han är i en avstickare (ett valfritt fält, gamla sparningar saknar det och formatet är oförändrat). Vid en omstart visas det rummet, och `ga_till` fortsätter därifrån (`aterAvstickare`). Var han mitt i den frivilliga scenen sägs dess `vid_omstart` i stället för den pågående scenens. Fältet tas bort när steget är klart och vid ett hopp i menyn.
- **Radion efter en omstart**: har ingen replik sagts i den här sessionen upprepar radion Farfars senaste replik genom radion i scenen före steget han fortsätter på.
- **Apan** (P15 utan `kasta`, `variant: "apan"`): stegen under nätet är en gråbox i läsplattan (`.stege-raddning`), med ett pinnsteg per fält som fälls ut nerifrån när fältet fylls, apan som klättrar ner ett steg per pinnsteg och blundar vid fel. Loggen skriver `[räddning] pinnsteg n av 5`. En knuff med `efter_sek` startar först efter första felet. Kasta-läget finns kvar i motorn till nästa räddning.
- **P26**: `instruktion` läses upp först. Knuffen markerar föremålet närmast hjälten som inte är svingat och låter ungen springa dit och nosa (`rum.ungePekar`), utan regitext.
- **Ljuden**: `ekorre_not` spelar syntesen `kras`, och `uggla` är en egen syntes (två låga HO). KRAS har Stils färg #D9CCF5.
- **Texten under spelytan** (36.2, `karna/skalning.js` `beraknaSkalaMedRemsa`): har fönstret plats för remsan (`remsansHojd(t)`, två rader uppläst text) under spelytan i full skala, eller ett steg mindre om spelytan då är minst 3×, står spelytan och remsan tillsammans mitt i fönstret. Dokumentet får klassen `text-under` och `--remsa`, och repliken (`#plattan.replik`) och molnet (`#tanke`) står i remsan. Läsplattan med pussel, boken och mellanscenerna ligger över som förut. I skrivläget gäller tangentbordets reserv. Annars står texten över spelytan: repliken får klassen `uppe` om den nere skulle täcka hjälten, ungen eller målet (`viktigaRutor`, målet är det pågående `ga_till` eller nästa i scenen), och molnet flyttas undan dem var 250:e ms medan han går (`placeraTanke` behåller platsen om den är fri).
- **Kedjan i molnet** (36.5): `molnKedja` minns rummet. Instruktionen följer med till nästa scens första mål bara när rummet har bytts, och varje steg som inte är ett mål nollar den.
- **Startvakten** (`main.js`): i WebGL-läget startar spelet om med canvas (samma flagga som när WebGL tappas, en vecka) om rummet inte är igång efter 12 s eller ett fel kommer innan det är igång. `?provstartfel` låtsas att starten hänger, för testet.
- **Hjältens rum** (36.1): `nattduksbord`, `kista`, `klader_krok` och `matta` (med `golv`, man går på den) i sovrummets karta och innehåll. Sängen har `sida: under`.

## 45. Svärdet, knuffen efter 15 s och sparfilen (0.20.0)
- **Hugga** (beslut 39.3, schema 2.17): P26 med `verb: "hugga"`. `rum.svard(true)` gör staven till ett svärd (gråbox: staven i guld) medan pusslet pågår, samma knapp och styrbild som att svinga (`anvand(…, { verb: 'svinga' })`), ljudet `hugg`, och `rum.huggen(id)` tar bort delen ur rummet (den glider ned och tonas bort, bara läge och opacitet) och bygger om hindren. Loggen skriver `[hugga]`.
- **Kartans `delas: "hela"`** (`karta.js` `delasHela`): när ett P26 utan `foremal` delar föremålet som visar pusslet fyller delarna hela föremålet i stället för att bli krukor i rad (`Rum.dela`). Lianväggen står alltså kvar och stänger vägen tills varje del är huggen.
- **`forsvinner_efter`** gäller nu också P26. Ett föremål är borta när pusslet är löst i passet (`losta`), när formeln finns på staven (bara P11), eller när sparningen har gått förbi pusslet (`pusselForbi`: steget i scenen är passerat, eller det frivilliga som kör pusslet är gjort och inte pågår). Därför står huggna lianer inte där igen efter en omstart, och ingen ny del i sparformatet behövs. Kontrollen godtar P11 och P26.
- **Knuffen på mål** (beslut 39.4): `MAL_KNUFF_MS` är 15 s och gäller varje `ga_till` och avstickaren, med eller utan molnet. Ungen nosar mot målet (`rum.ungePekar`), och följer ungen inte med (s01) glimtar målet som förut. Loggen skriver `ungen nosar mot målet` eller `målet glimtar`. Läsplattans knufftid (`karna/hjalp.js`) är oförändrad.
- **Sparfilen** (INSTÄLLNINGAR): Spara sparfilen laddar ned `sparning.tillText` som `ordstaven-sparfil-<datum>-<tid>.json` (`loggDom.laddaNed`). Läs in en sparfil läser filen med `sparning.franText` (migreringarna gäller, och en fil som inte är en ORDSTAVEN-sparning ger ett svar i menyn), lägger den gamla sparningen i backup, stänger av sparandet på sidan och laddar om.

## 46. Prologen v0.13 och bilderna till hugget (0.21.0)
- **Bära till en figur** (s16, `spel.js` `rum.fragaIgen`): ett tryck på en figur upprepar dess senaste replik, utom när figuren är målet i steget som pågår. Målet är nu också `till` i `bara`, så att ett tryck på Farfar går dit och lägger boken hos honom.
- **Farfar vid dörren** (s21b): `farfar_vid_dorren` är en dold figur i hallen (`talare: farfar`) som `visa_foremal` tar fram. `vandMotTalare` vänder honom mot hjälten, eftersom han är den enda figuren med talaren i rummet.
- **Kartans bilder för ett P26 som huggs** (schema 2.18, `karta.js`): `bild_rad` (bilder med komma emellan) ritas i rad över hela föremålet med en bild per bildbredd, nederkanten nere (`Rum.bildrad`). `bild_hugg` är bilderna när en del huggs och `bild_kvar` bilden som står kvar. `Rum.dela` med `delas: "hela"` ger delarna samma egenskaper. `rum.huggen(id)` byter bild var 80:e ms (hugg, hugg, kvar) och tar sedan bort delen ur hindren. Utan `bild_hugg` glider delen ned och tonas bort som förut.
- **Det som står kvar** (`spel.js` `kvarNu`): ett föremål med `forsvinner_efter` och `bild_kvar` som inte längre är med (`innehallNu`) skickas till `rum.visa` som `kvar` och ritas av `ritaKvar` som bild utan ruta, så att stumparna står där efter en omstart och inte stänger vägen.
- **Hugget** (`Rum.svinga`): hjälten svingar med `hjalte_svinga_<riktning>_01–03` och svärdet (`svard_svinga_*`) eller staven (`stav_svinga_*`) i handen, 80 ms per bild, och står sedan som förut. Med svärdet håller han `svard_hand_<riktning>_01`. Saknas svärdets bilder blir staven guld som i gråboxen.

## 47. Startloggen (0.21.1)
- **Ett vanligt skript i `index.html`** före spelets modul (Teknik 1e). Det hör inte till `src/` och beror inte på något i spelet, så det går också när spelets skript aldrig laddas eller kraschar innan något syns. Det lyssnar på `error` (i fångstfasen, så att ett skript eller en bild som inte går att ladda kommer med) och `unhandledrejection`, och sparar de senaste 20 felen i `ordstaven_startfel`.
- **`?logg`** visar rutan `#startlogg` (vanlig skrift, för den vuxne): Spara loggen (`ordstaven-startlogg-<datum>-<tid>.txt`), Kopiera och Stäng, och texten i en ruta som går att markera. Texten är felen under starten, webbläsaren och fönstret, och spelets logg: `__ORDSTAVEN.logg()` om spelet är igång, annars `ordstaven_logg` som spelet sparade senast (var 4:e sekund, så också en start som hänger). Rutan släpper inte igenom tryck och tangenter till spelet.

## 48. Motorreglerna i 2b (0.22.0)
- **Molnet före `bara`** (beslut 41.5, `spel.js` `bara`): samma `instruktionFore` som `ga_till`. Instruktionen står i molnet med bilden av `till` tills saken är lagd, och `malNu` är `till`, så att texten inte täcker målet. Efter en frivillig scen visar `vandraI` och `ga_till` målet igen (`visaMal`), som förut.
- **`bild` på `ga_till`** (schema 2.19): `bilder.html(st.bild)` (ett bildkort) i molnet i stället för `malBild(st.mal)`. Krönet i k1s08 har `uppdrag_kullen` (42.4). Teknik har lagt fältet i kapitel 1, och det står i `meta.teknik`.
- **Styrbilden** (granskningen A 23, `styrAnvand`): `styrIPasset` (kapitel:pass:verb, sparas inte) säger vad han har gjort i passet. Första gången i passet syns styrbilden direkt. Annars kommer den när han har stått vid samma sak i `STYR_STILLA_MS` (4,5 s, verklig tid också i snabbläget) utan att göra något, och loggen skriver `[styrbild] står vid saken`. Styrbilden för att gå syns vid första `ga_till` i varje pass och där datan säger `visa_styrhjalp`. `av.ui.styrAnvand` sparas fortfarande men styr inget.
- **Ljudorden** (A 24): `LJUDORD_MS = 2000` i `ui.js` och samma tid i `.ljudord` i `stil.css`. Poppen och studsen tar ca 0,25 s som förut. Inget steg väntar på ordet.
- **Det som ska hittas** (31.3, `nastaAttHitta`): repliken över spelytan flyttas upp om den skulle täcka hjälten, ungen eller det som ska hittas härnäst i scenen: målet i `ga_till`, `bara.till`, `prata.figur`, `ta_emot.fran`, `las_skylt`, `visa_foremal`, och sakerna i ett pussel i rummet (alternativen i alla varianter, krukorna och lianerna). Sökningen går förbi repliker, mellanscener och ljud och slutar vid allt annat.
- **Kontrollen** (A 25, `verktyg/innehall/kontroll.js`): varje ord i en lästext (`lasesSjalv`) som inte står i ordlistorna eller är en formel samlas per kapitel och blir en varning per ord, med första stället. Den ersätter de två varningarna för enstaka ord på skyltar och i alternativ.

## 49. Namnkontrollen före push (0.22.1)
- **Kroken** `verktyg/git-krokar/pre-push` (Python, beslut 42.3 och 43.3) kopplas in med `git config core.hooksPath verktyg/git-krokar`. Den går igenom varje commit som ska pushas: tillagda rader i diffen med `--text` (så att text i binära filer kommer med), filnamnen, meddelandet och författare och committer.
- **Inga namn i repot.** Namnen läses ur `~/.config/ordstaven/namn` och frivilliga reguljära uttryck ur `~/.config/ordstaven/monster`, på datorn som pushar. Saknas namnfilen eller är den tom stoppas pushen. Ett namn hittas i alla skiftlägen och böjningar men inte mitt i ett annat ord (samma gräns som Innehålls kontrollskript).
- **Varför inte CI:** CI kör efter pushen, och då är historiken publik. En kontrollsumma av ett förnamn går att knäcka med en namnlista.
- **Testet** (`tests/enhet/namnkrok.test.js`) kör kroken i ett provrepo med ett påhittat namn och ett eget `HOME`.

## 50. Golvdatorn (0.23.0, 2c)
- **Var tiden går** (mätt med Chromes spårning i Chromium utan grafikkort, `--disable-gpu --disable-gpu-compositing`): målning och rastrering av textlagret tar 4–10 ms per sekund, också med skuggorna med oskärpa. Det som kostar är att skärmen läggs ihop (`SoftwareRenderer::DoDrawQuad`), ca 4 ms varje gång duken ändras på en snabb dator och flera gånger mer på golvdatorn. **Antalet gånger världen ritas om per sekund är alltså det som avgör.**
- **`Rum.valjRitning`:** det som rör sig ritas direkt (högst 30 per sekund), glimten fyra gånger per sekund när något glimtar, och annars världen var 500:e ms. Med läsplattan öppen ritas världen högst fyra gånger per sekund, också om något rör sig bakom texten (luftskeppet i s22). I mätningen: tomgång med glimt 8 → 4 per sekund, läsplattan öppen med luftskeppet 8 → 2 per sekund (sammanläggningen 37 → 13 ms per sekund), och när han går 20 per sekund som förut.
- **Inga skuggor med oskärpa** i `stil.css` (10c, 27.10): skuggor är förskjutna utan oskärpa, och glöd är en ring (spridning eller fyra hårda textskuggor). `tests/enhet/stil.test.js` säger fel om en oskärpa kommer tillbaka.
- **Loggen** (`prestanda.js`, `golv: true` i canvasläget): var 30:e sekund en rad `[golvet]` med bildrutor per sekund, andel långsamma, hur många gånger och hur länge världen ritades (mätt mellan Phasers `prerender` och `postrender` när rummet ritas), och hur stor del av tiden läsplattan var öppen och hur många bildrutor som var långsamma då.
- **Kvar till golvdatorns logg:** om ritningen själv (ms per gång) är stor på MacBooken, är det bilderna och lagren som kostar, och då säger Teknik till Stil. Är den liten men bildrutorna långsamma, är det sammanläggningen, och då hjälper bara färre omritningar.


## 51. Remsan på MacBooken och appens fönster (0.24.0, 2b2)
- **Ingen 2,5×** (39.5). Remsan ryms vid 3× när fönstret är minst 732 punkter högt inuti (576 för spelytan och 156 för remsan). Spelarens app var 1280 × 762.
- **Appens fönster** (`grans/fonster.js`): i det installerade spelet på en dator (`display-mode: standalone`, ingen pekskärm, inte helskärm) görs fönstret minst 762 punkter högt inuti med `window.resizeTo`, en gång när spelet startar, alltså på startskärmen. Chrome kommer ihåg appfönstrets storlek, så det behövs bara när fönstret är nytt eller har gjorts mindre. Fönstret blir aldrig högre än skärmens lediga yta (`screen.availHeight`) och flyttas upp bara om det annars skulle gå utanför. Räcker skärmen inte (menyraden och Dock syns på en 1280 × 800-skärm) skriver loggen det, och då hjälper helskärm eller att dölja Dock. `planeraFonster` är en ren funktion med enhetstester.
- **Helskärm** (1280 × 800 på MacBooken) gav förut 4× med texten över, eftersom remsan inte ryms vid 4× eller 3,5× och spelytan bara fick bli en fysisk pixel mindre. Nu får den bli **högst ett helt steg mindre i CSS-punkter** (en fysisk pixel vid 1×, två på retina, där halva steget prövas först), om den då är minst 3×. Helskärm på MacBooken ger därför 3× med remsan, som appen. Vid 1× är det som förut.
- **Manifestet** säger `fullscreen`, men Chrome på datorn öppnar installerade appar i ett fönster ändå. Helskärm är den gröna knappen.

## 52. Ordkraftens ljus (0.24.1, 2b3)
- **`Rum.ordkraft()`** visar `efx_ordkraft_01–04` (atlaset `effekter`, Stils `figurer/effekter/`) i ordningen 1, 2, 3, 3, 4 och 100 ms var (`ORDKRAFT_BILDER` och `ORDKRAFT_MS`, händelsetakten i 10e §7, beslut 46.5 och 48.3, från 0.25.2), med mitten på stavens kalla ände: överst på hjälten, och 8 pixlar högre med svärdet. Bilden ligger i `lagerLjust`, ovanför mörkret, och tas bort efter sista bilden. Varje bildbyte sätter `smutsig`, så att golvdatorn ritar dem.
- **`ordkraft(ord)` i `spel.js`** anropas när ordet har stått i luften och läsplattan stängs: efter en formel (P11) och efter räddningen (P15, STEGE blir en stege). Kodlåset (HEM) och namnet (P12) räknas inte, eftersom ordet där inte blir en sak. Loggen skriver `[ordkraft] <ORD>`, och `(utan bild)` när atlaset saknas.
- **Ljudet** är fortfarande `ratt` när ordet kommer (10c: lånat tills stavens klang finns).

## 53. Uppdragslappen (0.25.0, 2d; görs om i §55)
- **Logiken** (`karna/uppdrag.js`, ren): `kompileraUppdrag(kapitel)` läser ut var varje uppdrag börjar, var varje steg blir klart och var stämpeln kommer (lägen som `[scen, steg]`). `lappenNu(lista, läge, påminda)` ger uppdraget som pågår, de gjorda stegen och steget han gör nu. Inget sparas: allt följer berättelsens läge, så omstart, hopp och framspolning ger samma lapp. Uppdrag vars steg inte finns (ett provkapitel) hoppas över och skrivs i loggen.
- **Lappen** (`grans/uppdragslapp.js`) står i remsan under spelytan, till vänster, före läsplattan i dokumentet. Remsan är 156–192 punkter hög på våra enheter (under 280), så lappen är **kompakt** (10d): bild, rubrik och en bock per gjort steg på en rad, steget han gör nu med pilen under. Papperet är `ui/lapp_uppdrag` som 9-slice (`--lapp9`), kompassrosen uppe till höger, lite snett. `--lapp-bredd` flyttar textrutan och molnet till höger om lappen. Ett tryck läser lappen.
- **I spelet** (`spel.js`): före varje steg uppdateras lappen. Ett nytt uppdrag eller steg kommer med ett pling och läses upp (rubriken när uppdraget är nytt), utom `upplast: false`. En replik i `ersatter` hoppas över när lappen syns, och pusslets instruktion likaså. Säger lappen vad han ska göra i `ga_till` eller `bara`, står inget moln, och knuffen guppar lappen. Påminnelsen i ett steg gör steg med `visas: med_paminnelse` synliga. När berättelsen har passerat stämpelns steg slår stämpeln ned (skala 2 → 1 på 0,15 s), lappen flyger till pausknappen (0,6 s), och pausknappen glimtar. Kapitlets sista uppdrag stämplas också när kapitlet tar slut.
- **Utan remsa** (texten över spelytan) finns ingen lapp: replikerna och molnet står som förut.
- **Fliken KLART** i hjälteboken visar de klara uppdragen (bild, namn och stämpelns ikon). Ett tryck läser namnet. Fliken har en stjärna när ett nytt uppdrag är klart.
- **Provscenerna** (`ordstaven_testscen`) kan ha egna `uppdrag`, som då ersätter kapitlets.

## 54. Skogens grafik (0.26.0, Teknik 3)
- **Rutlagren** (`karna/karta.js` läser `rutlager` och `omgivning`): `Rum.ritaRutlager` ritar `golv` och de synliga lagren med `visas_med` till en duk per vattenbild, och `over` (ridån) till en egen bild ovanför figurerna. Vattnet byter duk i `tomgang()` bara när dess ruta syns i kameran. Rutsetet `assets/tiles/skog/skog.json` har vattnets bilder som Tiled-animation (`rutanimation` i `figurbilder.js`).
- **`verktyg/kartor/skog.py`** skriver om skogsbrynet, buskarna och gläntan: bilderna på objekten, marken (gräs, stig och vatten med Wang-kanter, kullen med platån), ridån med öppningar vid utgångar, start och föremål (bildens hela yta), och det levande. Det går att köra igen och ger samma kartor. Innehållets id:n och rutor ändras inte.
- **Y-sortering:** en bild som är högre än sitt föremål (träden) läggs i `lagerFigurer` med sina fötter, och `sorteraFigurer()` sorterar hjälten, ungen och de höga bilderna efter fötterna varje gång något flyttas.
- **`bild_sedan`:** `byttaNu(rum)` i `spel.js` ger föremålen vars `sedan` är uppfyllt (visade, lösta, formler eller frivilliga scener som är gjorda), och rummet ritas om när listan ändras. Efter ett pussel som ett föremål väntar på ritas rummet om direkt.
- **`bild_anim`:** bilderna byts i `tomgang()`, minst 250 ms var, bara när föremålet syns och rummet inte är fryst.
- **Det levande** (`scener/livet.js`, klassen `Livet`): ett steg högst var 250:e ms, och en paus på 8–20 s mellan varje gång. Fåglarna flyger när hjälten är inom 48 pixlar och kommer tillbaka efter 15 s. Allt står still när läsplattan är öppen eller rummet är fryst, så golvdatorn ritar inget extra medan han läser.
- **Sidovyn `vid_bron`** (`visaSidovy`): baronen byter mellan två bilder var 400:e ms, Herr Skata flyger in efter 1,5 s och landar på hjälmen på 0,8 s, och då har baronen hjälmen över ögonen. Hjälten och ungen smyger förbi som i `in_i_skogen`. **`doljSidovy()`** tonar bort sidovyn (300 ms) när nästa steg är något han gör i rummet.
- **`kartbit_unge`:** mellanscenen lägger ungen på kartbiten i närbilden (`laggUngenPaKartan` i `grans/kartbitar.js`, två bilder som viftar med CSS-steg), och spelet väntar 2,6 s.
- Effekterna i atlaset (plopp, löv, fjädrar) används inte än i reaktionerna.

## 55. Lappen görs om (0.27.0, 2g, beslut 47 och 48)
Ersätter det i §53 som gäller hur lappen används. Logiken i `karna/uppdrag.js` är densamma, utom att `ersatter` inte används.
- **Molnet är den enda rösten för "gör nu".** Inga repliker eller pusselinstruktioner hoppas över, och molnet står alltid före `ga_till` och `bara`. `ersatts` och `lappenSagerVad` är borttagna.
- **Uppdraget börjar** vid första stegets eget steg (inte vid repliken i `ersatter`), så lappen kommer aldrig före berättelsen. `lappenNu` ger också `kvar`: en tom ring per steg som är kvar, och ett steg med `visas: med_paminnelse` räknas först när påminnelsen har kommit.
- **Lappen** (`grans/uppdragslapp.js`): `visa(l)` sätter innehållet (bild 96, rubrik 40, bockar, ringar och högtalaren), `fallUt()` och `fallIhop(direkt)`. Ihopfällningen är skala och läge mot lappknappen på 0,3 s. Klassen `lapp-framme` på `<html>` gömmer molnet medan lappen är framme, och en ny replik eller ett nytt moln fäller ihop lappen direkt (`placeraReplik`, `visaMoln`). Remsan visar alltså en sak åt gången.
- **När den fälls ut** (`spel.js`, `uppdateraLapp` före varje steg): när ett nytt uppdrag börjar och första gången i passet (efter en omstart). Då pling, rubriken läses upp, och berättelsen väntar ca 3 s tills lappen är ihopfälld. Ett tryck på lappknappen fäller ut den medan han spelar (ihop efter 4 s eller vid ett nytt tryck).
- **Lappknappen** är `#hud-lapp`, överst i HUD:en. I ett pussel där han har Farfars lapp (dinomaten) öppnar den den lappen som förut, annars uppdragslappen. Den syns när ett uppdrag pågår eller han har en lapp (`ui.sattLappknapp`).
- **Stämpeln** (`visaStampel` och `stampelPlats`, ren): 64 av världens pixlar i `#varldslager`, bredvid hjälten (höger, vänster, över, under, längre bort) och aldrig över honom eller ungen, inne i kameran. CSS-animation på 1,5 s (skala 1,6 → 1 och opacitet), fyra vita glimtar, ungen hoppar till (`ungeReagerar`), KLART läses om `gransnitt.klart` finns, och lappknappen glimtar i vitt. Ett tryck hoppar till slutet. Klassen `stampel-pagar` gömmer molnet. Ingen flygande lapp.
- **MIN BOK, fliken KLART** (`klartUppslag`): ett uppslag med två sidor och fem rader per sida (bild, rubrik och stämpel). Radhöjden räknas ur fönstret (högst 112 × t), och bilden (48-steg) och stämpeln (32-steg) står i hela steg. Boken öppnas på det senaste uppslaget, rader han inte har sett har ljusare papper, pilarna är HUD-knappar på 72 punkter och prickarna visar uppslaget. Flikarna har bilden framför ordet, och stäng står uppe till höger i KLART.
- **47.8:** mellanslagstangenten vid handen har tecknet ⎵ i CSS (den såg ut som en tom ruta), och molnet flyttas inte längre åt höger av lappen (det skars av i högra kanten).
- **HUD:en i det mörka rummet** är dold med flit före LJUS: knapparna kommer när berättelsen visar dem (`visa_ui`), och pausknappen när hjälteboken har något. Lappknappen kommer med det första uppdraget.

## 56. Prologens grafik, del 1 (0.28.0, Teknik 4)
- **Expeditionsbokens bilder** (`assets/bildkort/dal_i_moln`, `ordtradet`, `unge_farfar_med_dino`, `unge_farfar_far_agg`, 110 × 70) visas i `.bok-bild` i hela steg: `--bokbild-b` och `--bokbild-h` (`grans/layout.js`) är `round(220 × t × dpr / 110) × 110 / dpr` och samma för höjden. Med en bild har rutan ingen grå bakgrund.
- **Dinomatens lådor:** `delarAv` ger också alternativets `bild`. Är ett föremål ett enda alternativ med en bild som finns i grafiken (`lada_rod`, `lada_bla_stor` …) ritar `Rum.ritaObjekt` den bilden i stället för kartans (`lada_lang`), i den variant han får. Annars ritas delarna som i gråboxen.
- **Krukorna** (`Rum.slagen`): har bilden `<bild>_spricker_01–03` och `<bild>_skarvor` visas de i tur och ordning, ca 80 ms var, och skärvorna ligger kvar. Annars som förut (den nedre tredjedelen).
- **Molnet:** frågans text i molnet ligger i `.moln-text`, så att raderna står under varandra.
- **Ägget** (36.7): kartans `bild` på `lada_med_agg` är `agg_01`, och `bild_sedan` `agg_skal` efter `p0_ungenamn`. Mellanscenernas `bild` (`agg_frost`, `agg_filt`, `agg_lyser`, `agg_klackning`) styr regin i `Rum` (`AGGET`): en serie bilder (`spelaRamar`), en slinga (`slingaRamar`, ljuset) eller en toning (`tonaRam`, frosten smälter). Bilden står kvar i `ramFor` tills rummet byts. Knuffen i FILT låter ägget hacka tänder (`aggKnuff`), och efter tre fel gungar det mot den rätta lådan (`aggGungar`). Vid `unge_folj` blir det skalet (`ungenUrAgget`), och väntande bildbyten stoppas (`stoppaRamar`). Filten som hjälten bar dit tas bort, eftersom den ligger i bilden.
- **Dörrarna** (31.7): `Rum.oppnaDorr` visar `<bild>_oppnas_01–03` (ca 80 ms var) när han är framme vid dörren i ett `ga_till` som är scenens sista steg och nästa scen spelas i rummet bakom dörren (`gaTill`). Sedan glider det öppna rummet undan. Rummet ritas med den stängda dörren nästa gång. En fel dörr öppnas aldrig. Öppningen ligger inte i `visaScen`, eftersom en väntan där (rummet är bytt i berättelsen men inte på skärmen) gjorde att skyltarna i nästa rum inte kom.
- **Herr Skata i vindsfönstret:** bildbytena slutar om fönstret har ritats om under tiden (rumsbyte eller omstart). Det gav ett fel på sidan i genomspelningen.
- **Fåtöljen** (34.4): kartans `bild_sitter` (`hjalte_fatolj_vanster` på `fatolj_vanster` i kontoret). När ett `ga_till` till föremålet är klart sätter han sig (`Rum.sattSig`), och han döljs. Han reser sig (`stigUpp`) före nästa steg som inte är en replik, en mellanscen, ett ljud, boken eller en sparpunkt. Stolen har ingen plats i berättelsen än.
- **Hjälten i s00** (`skapaHjalte`): `Rum.hjalteBild` ger hjälten i de valda färgerna som en bild (`textures.getBase64` på den palettbytta texturen), 16 × 24 i hela steg (`--ipx-stor`). Gråboxens figur står kvar om bilden saknas.


## 57. Fel i prologen, lappknappen och knuffen (0.28.1, Teknik 6 och 7)
- **Stegen direkt** (50.5): när en mellanscen eller ett ljud spelas och nästa `ga_till` i scenen går till ett föremål med `klattra`, med bara mellanscener, ljud och repliker emellan, lyssnar `tidigStege` (var 100 ms) efter att han når stegen: han går in i den, eller står still vid den i ca 0,3 s. Går han bara förbi (till dörren i s01b) klättrar han inte. Den är skarp först när han har lämnat platsen där han kom in (`rum.inkom`). Når han stegen avbryts regin (`doljRegi`), stegen fram till `ga_till` räknas som klara, och `ga_till` bryter direkt (`redanVid`) så att han klättrar. Loggen: `[stegen] klättrar direkt`.
- **Rätt dörr öppnas** (50.5): ett rätt val på en dörr (en utgång) i ett läsval öppnar dörren (`Rum.oppnaDorr`) i stället för att den hoppar till. Loggen: `[dörr] öppnas`. Öppningen väntar med en vanlig timer och inte med scenens klocka, och reaktionen väntar högst 1 s på den, så att berättelsen aldrig fastnar (det hände på CI-maskinen).
- **Lianen som huggs:** bildbytena efter hugget rör inte delar som har ritats om under tiden (ett fel på sidan under last).
- **Boken** (50.5): `bara` med en `bild` som finns i grafiken bär den bilden (`expeditionsbok`) och döljer föremålet medan han bär det (`Rum.gomForemal`, nollställs vid rumsbyte). `lagg` på en figur låter det burna flyga till figuren och tona bort, så att boken hamnar hos Farfar. Annars läggs det som förut. Filten i gråboxen är kvar när bilden saknas.
- **Fåtöljen** (50.5): `sattSig` sparar fåtöljens egen bild från kartan, inte den som står just då, så att ingen kopia av hjälten blir kvar när han reser sig. `ge_grad` får ske medan han sitter.
- **Lappknappen** (51.2): i ett läsval, när han har en lapp i kapitlet, öppnar knappen den senaste lappen (`[lappen] Farfars lapp`). Utanför pusslen öppnar den uppdragslappen.
- **Knuffen vid `ta_emot`** (51.3): ungen nosar mot målet efter 15 s (`MAL_KNUFF_MS`), som i alla steg där han ska göra något vid ett mål.
- **Testläget** `?test&testscen` får sätta en provscen i vanlig takt (förut bara med `snabb`).

## 58. Innehålls korta pass (0.28.2, Teknik 5)
- Prologen v0.14 är skriven med Innehålls skript (`innehall-skript-prolog-v014.py`, kontrollsumman stämde), och kapitel 1 v0.7.9, äventyret och ordlistorna v0.9 med indrag 1. Ingen text är ändrad av Teknik.
- Schema 2.24: `gransnitt.klart` i `aventyr.json`. Tekniks rader om `bild` på de sju mellanscenerna är borttagna ur `meta.teknik`, eftersom fältet är Innehålls.

## 59. Kapitel 1:s rättelser (0.29.0, Teknik 8)
- **Kartorna** är Stils förslag (`rum/kap1_forslag/`, 52.2) med föremålens lägen, och `verktyg/kartor/skog.py` skriver rutorna med Stils ändringar: snåren kring liangången, bäckarmen och baronens stig, blommorna i sydost och den hemliga stigens nya läge. Skriptet sätter också `bild_hugg` och `bild_kvar` på lövhögarna, `ovanpa` på ugglorna, `sida` på apan i nätet och `oppning` på stegen till apans bo (den skär en öppning i trädets hinder).
- **Två lägen är flyttade** för att han ska nå dem utan att gå ut genom stigen till gläntan, som ligger i gångens övre ände: skylten BÄR (y 8) och den lilla lianen med stubben (söder om snåret, väster om formelträdet).
- **`delas: djup`** (`Rum.dela`): delarna står efter varandra från norr till söder, och den södra står främst. Varje del har sin bild ur `bild_rad` och ritas bland figurerna efter fötterna. I vila ritas gången med en bild per 8 pixlar (`bilddjup`), och efter hugget en låg hög per lian (`kvarNu` räknar lianerna ur pusslet).
- **De tre huggen** (51.5): `krukor` väljer hugget: från sidan och uppifrån växelvis, och snurren på den sista (`Rum.svinga(ms, typ)`, loggen `[hugg]`). Uppifrån är `hjalte_hugg` med `svard_hugg` (samma läge som svinga), och snurren `hjalte_svinga_<håll>_02` åt alla fyra håll med `svard_snurr_01–04` (16 till vänster och 12 högre än hjältens svingbild). `Rum.lovYr` visar `efx_lov_yr_01–03`, tre gånger vid snurren.
- **Lövhögarna** (`Rum.slagen`): `bild_hugg` och sedan `bild_kvar`, med löv som yr. Högen står kvar.
- **`dekor`**: ritas alltid, finns inte i rummets innehåll, går inte att trycka på och står inte i vägen (utom snåren, som är rutor). Innehållskontrollen godtar dekor som inte står i innehållet.
- **Ungen klättrar** (`ungeKlattrar`): när han går av stegen uppåt klättrar ungen från stegens fot till toppen med `unge1_klattra_upp_01–02`, ca 180 ms var, också medan världen står still.
- **Styrhjälpen** (`ui.styrhjalp`): Stils `tangent_<namn>_01–02` i hela pixelsteg (`--ipx-text` är 16 bildpixlar), där bild 02 är nedtryckt. Vid handen bara tangenten, annars `tangent_mellanslag_hand`. På pekskärmen bara handen. CSS-tangenterna står kvar om bilderna saknas.
- **Sidovyn vid bron**: baronen (48 × 40) på x 252, y 86, och Herr Skata landar på hjälmen (x 265, y 93).
- **Mätt:** sex lianer från första hugget till att vägen är fri på ca 2,7 s i spelets takt (webbtestet i `lappen.spec.js`).
- `stilskript.zip` med 79 filer ligger i `verktyg/stil/` (52.6).

## 60. Prologens nya animationer (0.29.0, Teknik 9)
- **Farfar tar emot boken** (`Rum.lagg` till en figur med `bild_ta_emot`): `farfar_fatolj_ta_emot_01` (handen ut) när boken flyger dit, `_02` (boken i handen), och sedan `bild_las` (`farfar_fatolj_las_01–02`) i en slinga var 1,5 s tills rummet byts.
- **Sängdags** (`Rum.laggSig`, när ett `ga_till` till en säng med `sovplats` är klart): `hjalte_sang_01` och `_02`, sedan sover han och andas som i `sov`. Ungen hoppar i en kort båge upp på sängens fotända (`unge1_glad_ner`, `ungeLyft`), trampar tre varv (`unge1_tomgang` ner, höger, upp och vänster, 250 ms var) och sover (`unge1_sover_ner_01–02`), också medan världen står still. Vid passets slut (sparpunkten) sover han kvar.
- **Farfar går till ytterdörren** (`Rum.figurKommer`, i `visa_foremal` när figuren har `kommer_fran`): från utgångens framsida runt hindren till kartans plats, ca 40 pixlar per sekund, med `farfar_morgon_<håll>_01–04`. Framme vinkar han (`bild_vinka`, 300 ms var) tills rummet byts. Steget väntar högst 12 s.
- **Hjälten vinkar** (`Rum.vinkaHjalte`, kartans `vinka_fran` i trädgården): när han kommer ut ur huset vänder han sig mot det och vinkar tre gånger (`hjalte_vinka_upp_01–02`). Vinkbilden är i gångens storlek, så staven ritas som när han går.
- **Husets fasad:** `berg` i trädgården har bilden `fasad` (y 0, h 22), och id:t står kvar.
- **Köket:** Farfar går inte genom köket på skärmen. Han syns gå från köksdörren i hallen till ytterdörren, eftersom köket och hallen är två rum och hjälten går före.

## 61. Innehålls andra korta pass (0.29.1, Teknik 10)
- Prologen v0.15 och kapitel 1 v0.7.10 är skrivna med Innehålls skript (`innehall-skript-v015-v0710.py`), som prövar kontrollsummorna före och efter. Ingen text är ändrad av Teknik.
- `k1_lianerna` har sex delar, så gången blir sex lianer (§59). Ugglorna är dolda tills `k1_tradet` är löst och visas med `visa_foremal` före trappan (52.3).
- **En sparning som redan är förbi k1s07** har inte ugglorna i `visade`, så de syns där först när scenen spelas om. Spelarens sparning har inte kommit till kapitel 1, så ingen migrering behövs.

## 62. Kartkontrollen och rättelserna efter den sista genomspelningen (0.30.0, Teknik 11–13)
- **Ridån ligger under figurerna** (56.3). Rutlagret `over` ritas mellan föremålen och figurerna, och varje ruta i det är ett hinder för fötterna (`karta.overHinder`, en ruta per rad av rutor bredvid varandra). Skogens rutor är hela (gräs där kronan inte når), så en figur som stod med fötterna i ridån försvann under den, och det var snåren i skogsbrynet. Nu står fötterna aldrig i ridån, och en figur framför den ritas framför.
- **Passagen till buskarna:** med ridån som hinder kom han inte längre från gången till stigen mot buskarna, eftersom vägen gick under kantens ridå. `skog.py` har `PASSAGE`, som tar bort ridån där han går (hörnen på y 16 mellan x 480 och 608), och det östra snåret börjar en ruta lägre (`SNAR`, hörnen från y 64). Annars gick vägen genom gångens mynning, och då gick han ut till gläntan. Inga föremål är flyttade.
- **`rumshinder.js`** (`rumsHinder`) räknar rummets hinder per höjdnivå, som `Rum.byggHinder` gjorde: föremålen, öppningarna, grenarna, väggarna och ridån. Rummet och kartkontrollen använder samma funktion.
- **Var han ställer sig** (`Rum.standplats`, `framforFran` med `nar`): den närmaste sidan av föremålet som han kan gå till. En sten vid ridån har ingen plats under sig.
- **Kartkontrollen** (`tests/enhet/kartkontroll.test.js`, 54.5 och 56.7) spelar varje kapitel i berättelsens ordning, med rummets tillstånd, det som har visats och de lösta pusslen, på varje läsnivå. Den prövar att varje mål går att nå från där han är, att vägen slutar vid det och att den inte går genom en annan utgång som spelet tar emot just då (där skulle han gå ut), att det frivilliga och utgångarna går att nå någon gång när han är i rummet, att ingen stig ligger över ett hinder, att varje läsval ryms på en skärm, att fötterna aldrig står i ridån, och att det som ritas ovanpå allt (`ovanpa`, `lyser`) aldrig skymmer en figur som står framför (bakom en trädkrona räknas inte). Ett prov visar att den hittar ett instängt mål och en ridå som inte är hinder. Den körs i CI med enhetstesterna.
- **Aldrig två hjältar** (56.2): sängen och fåtöljen får tillbaka sin egen bild ur kartan (`Rum.egenBild`: nattens bild på natten), inte den som stod när han lade sig eller satte sig. Han ligger i sängen från första bilden när han lägger sig (`sover` sätts direkt) och tills han har klivit ur (`vaknar`), så att han inte syns på golvet om rummet ritas om under tiden. Ritas rummet om medan han sover, visar den nya bilden av sängen honom. `__ORDSTAVEN.hjaltar()` räknar hjältarna som syns, och webbtesterna prövar sängdags, morgonen och fåtöljen.
- **Apan klättrar ned** (56.4, `Rum.figurKlattrar`, kartans `klattrar_fran`): när en figur med `klattrar_fran` visas i rummet han redan är i klättrar den från stegens topp till dess fot, ca 40 pixlar per sekund, med `<namn>_klattra_ned_01–02` (Stils bilder) eller annars `<namn>_klattra_01–02`, ca 180 ms var. Sedan kliver den till sin plats och vinkar som förut. Efter en omstart står den där direkt.

## 63. Startskärmen och spelarna på enheten (0.31.0, F1)
- **Sparplatser** (`skapaPlatser` i `karna/sparning.js`): varje spelare har en egen sparning. Plats `'1'` är den gamla nyckeln `ordstaven_spar`, så en sparning från före platserna ligger kvar där den låg och behöver ingen migrering. Nya platser heter `p2`, `p3` … och sparas i `ordstaven_spar_<plats>` (med egen `_backup` och `_trasig`). Registret `ordstaven_platser` (`{ format: 1, aktiv, platser }`) säger vilken som spelas. Saknas eller är registret trasigt börjar det om från sparningarna.
- `skapaSparning({ …, plats })` läser och skriver platsens nycklar, och `main.js` väljer den aktiva platsen innan spelet startar. `?ny` nollställer bara den aktiva platsen.
- **NYTT ÄVENTYR raderar aldrig något.** Det gör en ny plats med ett nytt tillstånd, och den blir den aktiva. Enhetens inställningar (rösten, de öppna kapitlen) och den vuxnes del följer med. En plats där ingen har börjat används igen, så att platserna inte blir fler. Ett borttaget nummer används inte igen så länge dess backup finns.
- **Startskärmen** (`startskarm` i `spel.js`): första gången bara ▶ (som förut). Har han börjat: ett stort FORTSÄTT med hjälten i hans färger och ungen (Rum `hjalteBild`, `ungeBildUrl`), en rad med spelarkort (hjältens bild, `hjalteBildFor`, och namnet han skrev) och ett mindre kort med + för NYTT ÄVENTYR. Första trycket på + gör kortet redo (det lyser och växer i 4 s), det andra gör den nya platsen och laddar om. Ett annat spelarkort väljer den platsen och laddar om. Orden under kommer från `gransnitt.fortsatt` och `gransnitt.nytt_aventyr` när äventyret har dem, annars syns bara bilderna. Figurerna är 24 bildpixlar höga och skalas i hela steg (`--ipx-figur`, `--ipx-figur-liten` i `layout.js`). Bilden av rummet där han är kommer med Stils skiss (F4).
- **INSTÄLLNINGAR, Spelare:** alla platser, vilken som spelas, Spela för att byta, och Ta bort (två klick) för en som inte spelas. Sparningen läggs i platsens backup.
- Webbtesterna skriver fortfarande `ordstaven_spar` direkt, och det är plats 1.

## 64. Farfars "Var var vi?" (0.32.0, F2)
- **FORTSÄTT tar honom dit han var:** samma kapitel, scen, steg och rum, som förut (sparningen har `scen`, `steg` och avstickaren). Det nya är påminnelsen.
- **`karna/varvarvi.js`** (`varVarVi`): ren logik. Kapitlets `var_var_vi` (schema 2.27, avsnitt 3c) har en post per pass. Står han vid passets första scen från dess första steg, kommer den korta påminnelsen, eller den långa om det är mer än 3 dygn sedan han spelade (`LANG_TID_DAGAR`), och den ersätter scenens `vid_omstart`. Mitt i ett pass kommer den långa före `vid_omstart`, bara efter lång tid. Ett pass utan post har bara `vid_omstart`, som förut.
- **Tiden** är sparningens `sparad`, som `skapaSpel` läser innan något sparas (`senastSpelad`). Varje sparning skriver en ny tid, så det är när han spelade senast.
- **Bara när spelet startar:** det första kapitlet som spelas efter start får påminnelsen (`forstaKapitlet` i `spela`). Spelar han vidare till nästa pass utan att stänga, kommer ingen.
- **Repliken** är en vanlig replik (`replik`), så radion, rösten, föräldern som läser och ett tryck som hoppar över fungerar som överallt. Ordet att läsa står stort i rutan med sin bild (`.vvv-ord`), läses inte upp, och nosen kan läsa det. Loggen skriver `[var var vi] <kapitel> pass <n>, kort|lång`.
- **Testläge:** `?test&sedan=5` (eller `?snabb&sedan=5`) låtsas att han spelade senast för 5 dygn sedan, så att den långa påminnelsen går att se.
- **Platshållare:** innehållet har inga poster ännu. Tills Innehåll lägger in texten (dokument 18, när den är godkänd) hörs scenens `vid_omstart` som förut. Webbtesterna provar påminnelsen med en provscen (`var_var_vi` i `ordstaven_testscen`).
- Kontrollen (`verktyg/innehall/kontroll.js`) prövar posterna (passet finns, en post per pass, ett ord, allt läses upp).

## 65. Menyn för vuxna sätter tillbaka lärandet och låser ett kapitel igen (0.33.0, F3)
- **En bild av lärandet när ett pass börjar** (`karna/larandebild.js`, `sparaPassbild`): när spelet står vid den första scenen i ett pass från dess första steg sparas lärandeprofilens nivåer (`lasning`, `skrivning`, `ord`, `matte`) med tiden, i äventyrets `passbilder` (en per pass, ordnade efter kapitel och pass). Ett pass som spelas igen får en ny bild. Loggen skriver `[lärandet] bild vid <kapitel> pass <n>`.
- **Sätta tillbaka** (`sattTillbaka` i `spel.js`, för knapparna *Börja ett pass* och *Hoppa till scen*): som förut töms det som berättelsen ger, och kapitlen och scenerna före spolas fram (26.6). Nytt är lärandet (`aterstallLarande`, 32.2): nivåerna blir passets bild, historiken efter bildens tid tas bort, och bilderna av passen efter tas bort. Äventyrets första pass utan bild börjar om lärandet helt. Ett annat pass utan bild (en sparning från före 0.33.0) lämnar lärandet som det är, och menyn märker de passen med \*. Ett hopp mitt i ett pass sätter lärandet till passets början. `aterstallFramsteg` behåller `passbilder`.
- **Låsa ett kapitel igen** (krysset i menyn): har han kommit till kapitlet, sätts sparningen tillbaka till slutet av kapitlet före, som när det är spelat till slut (sista scenen, steget efter det sista), och hela det kapitlet spolas fram (`SPOLA_HELA`). Lärandet blir bilden från kapitlets första pass. Sedan kommer slutrutan (`kapitel_last`). Har han inte kommit dit, låses kapitlet bara.
- Namnen, hjältens utseende och inställningarna står kvar. Sparfilen är vägen tillbaka om den vuxne ångrar sig.

## 66. Läsnivån mellan kapitlen och räddningens knuff (0.34.0, 14 och 17)
- **Läsnivån följer med mellan kapitlen** och har gjort det hela tiden: den hålls per pusseltyp i `spelare.larande` (läsmotorn), och kapitlets `nivaer.lasning` säger bara vilken variant han får (golv och tak, `lasniva`). En post skapas bara där den saknas (`post()` i läsmotorn). Ett webbtest prövar det med en påhittad sparning: prologen slutar på L4, kapitel 1 börjar på L4 (varianten L3, kapitlets tak), och ett hopp till kapitlets början flyttar den inte.
- **INSTÄLLNINGAR** visar vad nivån betyder i kapitlet han är i (`nivaIKapitlet`: "I Skogen får han L3, kapitlet har L2–L3"), knapparna går upp till nivån om den är över L4, och **att sätta nivån för hand loggas** (`[inställning] läsnivån satt för hand: L4 → L2`). Utan raden gick det inte att se i loggen när nivån hade satts för hand.
- **Räddningens knuff** (P15, `raddning()`, beslut 58.2): före första felet efter 15 s utan tryck (`RADDNING_KNUFF_MS`), och en rätt bokstav startar om klockan. Efter första felet kommer den efter `knuff.efter_sek` (15 s om det saknas), räknat från när felreaktionen är klar, och bara en gång. Förut startades klockan om vid varje tryck, så knuffen kom efter varje bokstav. En bricka som studsar i kasta-läget räknas som ett fel. Schema 2.28.

## 67. En knuff före valet räknas som hjälp för nivån (0.35.0, beslut 62.2)
- Läsvalen (P1 och P28) skickar med om en knuff kom före valet (`knuffFore` ur hjälpspåret), och läsmotorn får den som `knuff_fore`.
- **Läsmotorn:** ett rätt val efter en knuff räknas som rätt på första försöket (`forstaForsok`, och föräldravyn räknar det som rätt), men inte mot nästa nivå: streaken går ned ett steg, som när han har tagit hjälp av nosen. `hjalp` räknas inte upp, eftersom det är nosen. Historiken har `knuff_fore`.
- Nivån stiger alltså bara på det han läser utan hjälp. Med regeln hade spelarens premiär slutat på L3, utan handgrepp i menyn (14).


## 68. Startskärmen med Stils bilder och fotot av rummet (0.36.0, F4, 10e v0.4)
- **`grans/startskarm.js`** (`visaStartskarm`): Farfars skrivbord (`assets/ui/start/bord`), namnet på mässingsskylten i textlagret (Lexend fet, mörk mässing), fotot i `foto_ram` med den stora pilen (FORTSÄTT, `.start-knapp.fortsatt`), NYTT ÄVENTYR som boken `bok_ny`, spelarna i en kolumn till vänster (`spelare_ram`, hjältens huvud i rundeln genom `spelare_mask`, ritat på en liten duk) och plusset under den sista. Första gången finns bara den stora boken med pilen (`.start-knapp.forsta`). **Inga ord under knapparna** (62.5). Spelarens namn står under hans bild, eftersom det är hans eget ord.
- **Allt står i världens pixlar** över spelytan (`.startbord` har spelytans läge och storlek) och skalas med `--vpx` (en av världens pixlar i CSS-punkter, i hela steg). Bilderna har `image-rendering: pixelated`. Ett tryck flyttar knappen en pixel ned. Inget filter och inga skuggor med oskärpa.
- **NYTT ÄVENTYR, två tryck:** första trycket lyfter fram `bok_ny_stor` med bocken och pilen bakåt, och resten tonas ned till 45 %. Bocken startar ett nytt äventyr, bakåt eller ett tryck någon annanstans lägger tillbaka boken (trycket fångas, så att fotot inte startar spelet då). **Det nya äventyret har samma hjälte** (`platser.ny(mall, version, { sammaHjalte: true })`): hjältens id, namn och färger och lärandet (läsnivån följer barnet) kopieras till en egen plats, och äventyret och ungen börjar från början. Plusset är en ny spelare som förut (F1). Inget raderas.
- **En ram per hjälte** (`spelareAttVisa` i `karna/sparning.js`): har samma hjälte flera platser (ett nytt äventyr), visas platsen som spelas, annars den som sparades senast. De andra nås i INSTÄLLNINGAR (SPELARE). Platser utan hjälte-id räknas var för sig. Ett tryck på en annan hjälte väljer hans plats och laddar om (som F1).
- **Ungen** står bredvid fotot. Står skärmen orörd i 25 s gäspar den och somnar (bildbyten), och ett tryck väcker den.
- **Fotot** (`Rum.foto`): en bild av spelytan (samma som glidningen mellan rummen använder, `Rum.bild`, nu i kö så att två bilder aldrig tas samtidigt), utskuren 160 × 96 runt hjälten, som PNG (ca 5–15 kB). Det tas en stund efter att ett rum syns (högst var 20:e sekund), när pausmenyn öppnas och när han slutar för idag, och sparas per plats i `ordstaven_spar_foto` (plats 1) och `ordstaven_spar_<plats>_foto` (`fotoNyckel`, `platser.foto`, `platser.sparaFoto`). Det hör inte till sparningen eller sparfilen, och det tas bort med platsen. Utan foto (en sidovy, en ny plats, en äldre sparning) står hjälten och ungen i dubbel storlek i ramen.
- **Bilderna** kommer från inkorgens `ui/intro/`, `ui/start/` och `ui/meny/` genom `verktyg/grafik/inkorg.py`, som nu läser de tre mapparna (och `ui/intro/intro.json`) med palettkontrollen. Introt, pausmenyn och INSTÄLLNINGAR med Stils bilder kommer i nästa versioner.
- Menyn för vuxna heter **INSTÄLLNINGAR** (62.4).

## 69. Introt och irisen (0.37.0, F4, 10e v0.4, beslut 62.5)
- **`grans/intro.js`** (`spelaIntro`): Stils tre delar i världens pixlar över spelytan, med tiderna och solarnas vägar ur `assets/ui/intro/intro.json`. **A:** natten (`a_himmel_00`, solarna, `a_land_00`) och den stora pilen som pulserar (opacitet) väntar på första trycket. Trycket startar ljudet (`forstaTrycket`: `ljud.starta`, `rost.lasUpp`, och musiken i F5). Sedan tolv steg på 340 ms med nya bilder, och solarna glider mellan stegens lägen (en `transform`-övergång). ORDSTAVEN kommer fram en bokstav i taget (170 ms, `ljud.klang(i)`, mjuk och stigande) och läses upp om rösten är på, med maxtid. **B:** `b_01–10` på 90 ms. **C:** `c_01–13` på 90 ms, och namnet faller ned mot mässingsskylten och följer den bild för bild (`namnetIC`, med skyltens läge i varje bild mätt ur Stils bilder), så att det står där startskärmens namn står i sista bilden. Stavens ändar lyser upp (`efx_ordkraft_03`, `Rum.figurUrl`). Den sista bilden är startskärmens bord, så startskärmen tar över utan skarv.
- **Ett tryck efter det första hoppar alltid över resten** (rösten tystnar). Ett tryck var som helst räknas, också på ramen, och Enter eller mellanslag på introts knapp. Bilderna förladdas medan natten väntar.
- **När introt visas:** när spelet startar (`d.intro` i `main.js`). Inte i snabbläget (`?intro` visar det ändå, för testerna), och inte efter ett byte av spelare eller ett nytt äventyr på startskärmen (`laddaOm` lägger `ordstaven_utan_intro` i `sessionStorage`, som läses en gång).
- **Irisen** (`ui.iris`, 62.5): en svart yta över spelytan med ett runt hål (`clip-path: path(evenodd, …)`), som stängs över skrivbordet när han trycker på FORTSÄTT och öppnas runt hjälten när rummet syns (`oppnaIris`, och efter 2,5 s om något annat kommer först). Den går i **åtta steg** med `setTimeout`, så att golvdatorn bara ritar om spelytan åtta gånger per halva. Hur lång tid den tog står i loggen (`[iris] stängd på … ms`), så att den kan prövas på golvdatorn. Inte i snabbläget (`?iris` visar den ändå).

## 70. Pausmenyn och INSTÄLLNINGAR med Stils bilder (0.38.0, F4, 10e v0.4)
- **`grans/menybilder.js`:** bilderna i `assets/ui/meny/` (`menyBild`), läget i världens pixlar (`vlage`) och bilderna i 9-slice som CSS-variabler (`satt9slice`: `--fonster9`, `--fonster9-rubrik`, `--knapp9`, `--knapp9-pa`, `--paus-kort`), som stilmallen använder i `border-image` med `image-rendering: pixelated`.
- **Pausmenyn, start** (`ritaPaus('start')`, `.pausmeny.paus-bord`): panelen av läder (`paus_panel`) vid (36, 40), tre papperskort (`paus_kort`) vid x 48, 124 och 200 med kartikonen och läderboken i tre gånger storlek och den sovande ungen (`unge<steg>_sover_ner_01`) i dubbel, ordet under bilden (Lexend fet, 8,5 pixlar), och den stora pilen tillbaka vid (264, 118). Det nya kortet har stjärnan som förut.
- **Pausmenyns andra vyer** (kartan och MIN BOK): flikarna är samma papperskort (9-slice ur `paus_kort`), den valda med en tunn guldkant, och ▶ och ◀ är Stils pilar (`pil`, `bak`). Resten är som förut.
- **INSTÄLLNINGAR** (`oppnaMeny`, `.meny.installningar`): rubriken i ett eget fönster (4, 3, 312 × 22) med versionen och ◀ TILLBAKA (`.stang`), delarna i en kolumn (4, 28, 98 × 160), en rad per 18 pixlar med markören (`markor`) och en ljusare rand på den valda, och den valda delen i fönstret till höger (106, 28, 208 × 160), som skrollar. Delarna: SPELARE, PASS OCH KAPITEL (börja ett pass, låsa kapitel och tills vidare *Hoppa till scen*), LÄSNING, LJUD OCH RÖST, SKÄRM (tills vidare objektens namn), SPARFIL (också loggen och Börja om), FRAMSTEG (föräldravyn) och OM SPELET. Alla delar finns i sidan, och de som inte är valda är dolda (`hidden`), så ett byte ritar inget om. Den valda delen står kvar när menyn ritas om (`menyDel`). Knapparna och kryssrutorna är Stils knappar i 9-slice, och texten står i Lexend, 6 pixlar.
- Innehållet i INSTÄLLNINGAR enligt 62.6 (rösten, helskärm, sparfilens tid, OM SPELET och testläget till `?test`) kommer i nästa version (25).
- Webbtesterna väljer delen först (`#vuxenmeny .del[data-del="pass"]`).
