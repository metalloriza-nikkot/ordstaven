# Innehållsschema – format 1

Version 1.0 (2026-10-24). Ägs av teknikspåret. Så skrivs berättelse, pussel och ordlistor som data.
Schemafilerna finns i `content/schema/`. Kontrollen körs med `npm run kontroll` och i varje publicering.

## 1. Filerna

| Fil | Innehåll | Schema |
|---|---|---|
| `content/ordlistor.json` | Ordlistor 1–6, flaggor, förbjudna par | `ordlistor.schema.json` |
| `content/<äventyr>/aventyr.json` | Titel, talare, platshållare, kapitelordning | `aventyr.schema.json` |
| `content/<äventyr>/kap-00.json` … `kap-07.json` | Ett kapitel: rum, scener, pussel | `kapitel.schema.json` |

Varje fil börjar med `"format": 1`. Ändras formatet höjs numret, och teknik skriver om gamla filer.

## 2. Text

- **All speltext lagras i vanlig skrift**, med stor bokstav där svenskan har det: `"Ta den röda lådan."`, `"Farfar"`, `"Baron Gripklo"`, `"Ordträdet"`. Spelet visar versaler tills nivån säger annat. Gemener kostar då ingen omskrivning senare.
- **Enstaka ord** (etiketter på lådor, bildtexter, ord i ordlistorna) skrivs med små bokstäver: `"filt"`, `"bär"`.
- **Formler skrivs alltid i versaler**: `"LJUS"`, `"STOR STEGE"`. Det är stavens skrift. Formler får också stå i versaler mitt i en mening.
- **Platshållare med små bokstäver**: `{unge}` (ungens namn) och `{hjalte}` (hjältens namn). Namnet visas i samma skrift som texten runt omkring.
- **Rader:** en text är en sträng, eller en lista med rader (`["Dinomat.", "Ta den röda lådan."]`). Spelet bryter aldrig inom en rad i listan, men kan bryta en lång sträng mellan ord.
- **`upplast`:** `true` läses alltid upp (instruktioner, berättaren, repliker). `false` läser spelaren själv. Lästexten i pussel läses aldrig upp automatiskt, så den har inget eget `upplast`-fält.
- **Id:n** skrivs med små bokstäver a–z, siffror och understreck, utan å, ä, ö: `lada_med_stav`, `p0_filt`. Kapitlens id är `kap-00` osv.

## 3. Ett kapitel

```json
{
  "format": 1,
  "id": "kap-00",
  "kapitel": 0,
  "meta": { "version": "0.4", "agare": "Innehåll" },
  "rum": [ { "id": "vinden", "namn": "Vinden", "tillstand": ["natt", "morgon"], "innehall": ["lada_med_stav", "stege_ner"] } ],
  "scener": [ { "id": "s02_glimten", "pass": 1, "rum": "vinden", "tillstand": "natt", "steg": [ … ] } ],
  "pussel": [ … ]
}
```

- **Rum:** `id`, `namn` (vanlig skrift), `tillstand` (frivilligt), `innehall` = objekten i rummet. Tiled-kartan använder samma objekt-id:n.
- **Scen:** `id`, `pass` (1, 2, 3 …), `rum` (eller `null` för scener utanför rummen), `tillstand`, `vy` (`uppifran`, `sidovy`, `narbild`), `vid_omstart` (en replik när spelet startar om här), `steg`.
- **Scenerna spelas i ordning.** Ett `pussel`-steg väntar tills pusslet är löst. Det behövs alltså ingen `nasta_scen`.
- `meta` och `anteckning` är fria fält för versionsnummer och noter. De påverkar inte spelet.

### Steg

| `typ` | Fält | Vad som händer |
|---|---|---|
| `replik` | `talare`, `text`, `upplast` | Någon säger något. Visas på läsplattan eller i en pratbubbla. |
| `mellanscen` | `beskrivning`, `bild` | Något händer i bild. Gråboxen visar beskrivningen för den vuxne. |
| `ljud` | `id` | Ett ljud spelas. |
| `ga_till` | `mal`, `visa_styrhjalp`, `knuff` | Spelaren ska gå till ett objekt i rummet. |
| `pussel` | `pussel_id` | Ett pussel startar. Scenen fortsätter när det är löst. |
| `oppna_lasplatta` | `pussel_id` | Visar pusslets lästext utan att pusslet startar (farfars lapp). |
| `visa_ui` | `element` | `nosknappen`, `barraknaren`, `radioramen` eller `hjalteboken` visas första gången. |
| `nos_demo` | `ord`, `kostnad` | Ungen visar hur man nosar på ett ord. |
| `ge_bar` | `antal` | Bär till ungen. |
| `ge_kartbit` | `nummer` | Kartbit 1–7. |
| `ge_grad` | `grad`, `fest` | Ny trollkarlsgrad: `Lärling`, `Lögnavslöjare`, `Ordtrollare`, `Stortrollare`, `Mästertrollkarl`. |
| `bok` | `id`, `talare`, `las_upp_efter_tryck`, `uppslag` | Bläddringsbar bok. Varje uppslag: `bild`, `bildtext` (ett ord), `text`. |
| `skapa_hjalte` | `delar`, `bara_bilder` | Spelaren väljer hjältens utseende. |
| `sparpunkt` | `pass_slut`, `valfri` | Spelet sparas. `pass_slut: true` där passet slutar. |
| `fritt` | `beskrivning`, `foremal` | Fri lek, t.ex. buskar att svinga staven mot. |

En **replik inuti något annat** (`knuff`, `vid_fel`, `instruktion`, `vid_omstart`) skrivs utan `typ`: `{ "talare": "berattare", "text": "Där. I lådan.", "upplast": true }`.

### Fält som alla pussel kan ha

`id`, `typ`, `instruktion` (replik), `knuff` (`handling`, `replik`, `efter_sek`, standard 9 s), `forenkla` (`efter_fel`, `andring`), `efter_3_fel`, `vid_ratt`, `vid_fel`, `anteckning`.
`vid_ratt`, `vid_fel`, `efter_3_fel` och `vid_valj` har `handling` eller `reaktion` (vad som händer i bild, fri text i gråboxen), `replik` och `fest` (`liten`, `mellan`, `mellan_dampad`, `stor`).

### P1_las_och_valj

**Alltid med `varianter` per läsnivå, även när det bara finns en.** Motorn väljer den variant som passar spelarens nivå.

```json
{
  "id": "p0_dinomat",
  "typ": "P1_las_och_valj",
  "avsandare": "farfar",
  "papper": "anteckningspapper_kompassros",
  "hjalp": "ett_ord",
  "varianter": {
    "L2": {
      "text": ["Dinomat.", "Ta den röda lådan."],
      "alternativ": [
        { "id": "rod", "ratt": true },
        { "id": "bla", "vid_valj": { "reaktion": "dammoln, båda nyser" } }
      ]
    }
  }
}
```

- Variant: `text` (lästexten) och/eller `bild` (det som ställer frågan, t.ex. en tankebubbla), och `alternativ` (2–5).
- Alternativ: `id`, `ord` (etiketten spelaren läser, små bokstäver), `bild`, `ratt: true` på exakt ett, `vid_valj` för den roliga felreaktionen.
- `hjalp`: `"ett_ord"` (nosknappen) eller `null`.

### P11_formel

`niva` (S1–S5), `svar` (versaler), `formler` (`ord`, `effekt`, `tillstand_efter`), `nastan` (`ord`, `effekt`), `forebild` (`text`, `placering`, `ligger_kvar`), `brickor` (en versal per bricka), `helord`, `ratt_bokstav_stannar`, `forsta_formel`.

### P12_dop

`sparas_som` (`hjalte.namn` eller `unge.namn`), `min_bokstaver`, `max_bokstaver`, `vuxen_far_hjalpa`. Bedöms aldrig.

### P26_krukorna

`innehall` (en post per kruka: `bar`, `tom`, `kartbit_1` …), `kartbit_i_sista`. Vila, påverkar inte nivån.

## 4. Ordlistor

```json
{ "ord": "filt", "lista": 2, "bild": "🧣", "tema": "hemma", "flaggor": [] }
```

Små bokstäver utom formler (`"LJUS"`). Flaggor: `aao`, `helord`, `sparrad`, `berattelseord`, `formel`, `ordbild`. `forbjudna_par` med små bokstäver.

## 5. Vad kontrollen fångar

**Fel (stoppar publiceringen):**
- Fält som inte finns i schemat (stavfel i fältnamn), fel typ, saknade fält.
- Text i versaler som inte är en formel. Platshållare i versaler (`{UNGE}`) eller okända platshållare.
- Okänd talare, rum, objekt (`ga_till`), pussel eller tillstånd. Dubbla id:n.
- Läs och välj utan exakt ett rätt svar.
- Förbjudna par på samma skärm (lås–läs, hår–här, bår–bär), och rätt svar och distraktor som bara skiljer sig på Å/Ä i L1–L3.
- Spärrade ord (mjukt G/K, NG, SJ …) i text spelaren läser själv, även böjda former (berget, köket).
- Formelbrickor som inte räcker till svaret, extra brickor på S1, förebild som inte är svaret.

**Varningar (stoppar inget):**
- **Repliker som blir mer än två rader** på läsplattan. Radbredden är 16 em (768 punkter vid 48 punkters text, i versaler), räknad med Andikas egna teckenbredder.
- Mer än 8 ord på en rad i text spelaren läser själv.
- **Färre än två läsuppgifter som avgör något per pass** (läs och välj).
- **Pass som uppskattas till mer än 10 minuter.** Uppskattningen: 1,5 s + 0,45 s per ord och replik, 40 s per pussel, 12 s per `ga_till`, 4 s per mellanscen, 6 s + uppläsning per bokuppslag.
- Pass som inte slutar med en sparpunkt, pussel som inte används, ord i alternativ som inte finns i ordlistorna, meningar som börjar med liten bokstav.

Kontrollen skriver också ut varje pass med uppskattad tid och antal läsuppgifter.

## 6. Ändringar mot Innehålls utkast v0.3

| v0.3 | Format 1 |
|---|---|
| Text i versaler | Vanlig skrift. Formler i versaler. |
| `{UNGE}` | `{unge}` |
| `talare` och `platshallare` i kapitelfilen | I `aventyr.json` |
| `kapitel`, `niva: null`, `bedoms`, `vila`, `krukor` på pusslen | Utgår (följer av filen och typen) |
| P1 med `svar`, `alternativ` och `bild` direkt på pusslet | Alltid `varianter` per nivå, `ratt: true` på rätt alternativ |
| P1 `alternativ` som strängar + `fel_reaktioner` | Alternativ som objekt med `vid_valj` |
| `vid_ratt.nasta_scen` | Utgår: scenerna spelas i ordning |
| `upplast: false` och `ledtradar_upplast` på pusslet | Utgår: lästext läses aldrig upp automatiskt |
| `aldrig_automatisk_losning` | Utgår: gäller alltid |
| `krav`, `skrivs_i_scen` | `anteckning` |
| `id`, `version`, `datum`, `agare`, `status` överst | `format`, `id` (`kap-00`), `kapitel`, och resten i `meta` |
