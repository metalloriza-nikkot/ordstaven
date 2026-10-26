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
- **Ingen fast plats för tangentbordet** (ändrat i 0.1.2). När spelaren skriver är läsplattan öppen och världen står still och dämpas, så bokstavstangentbordet läggs över rummets nedre del just då. Resten av tiden får rummet hela skärmen. Resultat: iPad 10:e gen och mini får 1120×672 (×3,5), även i en Safari-flik. iPad 4:3 får 960×576. En fast reserv på 216 punkter gav i test ett för litet rum (800×480 i Safari-flik).
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
  "format": 2,
  "spelversion": "0.5.0",
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
- **Meny för vuxna**: håll inne ⚙ (eller Ctrl+Skift+M). En ring fylls medan man håller, ett kort tryck visar "Håll inne". Menyn ligger i ett eget lager och går att öppna även på startskärmen. Läsnivå, föräldern läser Farfar, objektens namn, hoppa till scen, spara loggen, börja om.
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
| 7 | Menyn för vuxna | `#vuxenmeny` | Pausar spelet (se nedan). Ligger över allt. |
| — | Skärmtangentbordet | `#tangentbord` | Bara när ett namn skrivs på pekskärm. Rummet krymper så att inget täcks. |
| — | Felsökningsloggen | Ctrl+Skift+L | Ritas utanför spelet, rör inte tillståndet. |

**Vem tar emot tryck och tangenter.** Tangenter och tryck på rummet går genom `karna/inmatning.js` som handlingar. Stegen lyssnar med `lyssnaHandling`. Tryck på knappar i DOM går direkt till knappen. Det översta lagret som syns tar trycket; lager som inte ska ta emot tryck har `pointer-events: none`.

**När världen står still.** Läsplattan, helskärmar och pausen fryser världen (`rum.frys`). Hjälten går inte, knuffar väntar, handen och glimtarna visas inte. Röst och ljud fortsätter bara i det lager som syns.

**Paus.** Menyn för vuxna och en dold flik pausar spelet (`pausa` / `fortsatt` i `spel.js`). Då stannar världen, rösten och ljudningen tystnar, knuffarnas klockor väntar, handlingar når inga steg och spelet sparas. Allt annat ligger kvar som det var, så att spelet fortsätter exakt där det stod.

**Från varje tillstånd finns en väg ut.**

| Tillstånd | Vägen ut |
|---|---|
| Replik | ▶, tryck på plattan, Mellanslag eller Enter |
| Pussel | Lösa det (förenkling efter 2 fel, ungen pekar efter 3, aldrig fast). Menyn: hoppa till scen eller börja om |
| Lapp, bok | ▶ / ✓, Mellanslag |
| Ljudning | Tryck på remsan, på nosen eller Escape. Maxtid som säkerhetsnät |
| Passets slut, paus | ▶ (💤 visar en pausbild med ▶) |
| Fri lek | ▶ i hörnet |
| Namn med skärmtangentbord | ✓ (minst en bokstav) |
| Menyn för vuxna | Stäng, Escape |
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
