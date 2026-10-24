# Design i korthet – för koden

Version 0.1 (2026-10-24). Utdrag ur designdokumenten som koden behöver. **Fullständig design finns utanför repot.** Det här repot är publikt: här står bara spelvärld, pussel, stil och teknik, aldrig något om en verklig spelare.

## Spelet
ORDSTAVEN: DEN GÖMDA DALEN är ett läs- och skriväventyr för 6–8 år. Uppdraget i en mening: dinoungen måste hem till sin mamma i den gömda dalen, men kartan dit är riven i sju bitar, och Baron Gripklo jagar dem också. Hjälten är en ung upptäcktsresande och trollkarl vars magi är läsning och skrivande. Ord som skrivs med Ordstaven blir verklighet.

Första äventyret i en tänkt serie. Hjälten (utseende, namn, grad, formler) följer med till nästa äventyr via sparfilen.

## Designprinciper som påverkar koden
1. **Läsningen avgör.** Går en uppgift att lösa utan att läsa är den felbyggd.
2. **Instruktioner läses alltid upp. Ledtrådar läses aldrig upp automatiskt.** Hjälpknappen (ungens nos) läser upp ett ord i taget och kostar ett bär (gratis vid 0 bär).
3. **Fel är roliga, aldrig straff.** Ingen tidspress, inga liv, ingen förlorad progress, inga röda kryss.
4. **Versaler som standard.** Gemener införs senare.
5. **Texten är aldrig pixlig.** All läsbar text i ett typsnitt (Andika), i ett skarpt lager ovanpå pixelvärlden.
6. **Innehåll är data.** Ett nytt kapitel = nya JSON-filer och kartor, ingen ny kod.
7. **Korta pass**, 5–10 minuter. Spelet föreslår att sluta men tvingar inte.
8. **Inga vapen mot figurer.** Staven svingas mot buskar och krukor.
9. **Barnsäkert:** inga annonser, ingen spårning, inga köp. All data stannar på enheten.

## Värld och vy
- Pixelgrafik i SNES-anda, vy snett uppifrån. Världen består av **rum om en skärm**: 320×192 pixlar (20×12 rutor à 16×16). Kameran bläddrar vid kanten, ingen fri scrollning.
- Heltalsskalning, nearest-neighbor. En ram (läderomslag) fyller resten av skärmen i alla format (16:10, 16:9, 4:3).
- Kapitel = nav med grenar. Fordonsmoment och kartbitsscener visas från sidan.
- Figurer har fyra gångriktningar. Hjälten ca 16×24.

## Text
| Text | Storlek (CSS-punkter) |
|---|---|
| Enstaka ord | 64 |
| Meningar på läsplattan | 48 (golv 40) |
| Knappar och etiketter | minst 32 |
- Å, Ä, Ö aldrig under 48 punkter i spelet.
- Läsplattan: mörk text (#2B2420) på ljust papper (#F5ECD7), kontrast minst 7:1, högst 92 % av skärmen. Radavstånd 1,4, högst 6–8 ord per rad, vänsterjusterat, ingen avstavning, inga radbrytningar mitt i ett uttryck.
- Världen stannar och dämpas när läsplattan är öppen.

## Inmatning
- Dator: piltangenter för att gå, fysiskt tangentbord för att skriva.
- iPad: tryck för att gå (ingen styrspak). **Eget versaltangentbord** i alfabetisk ordning, tangenter minst 64 punkter. Systemtangentbordet används aldrig.
- Klickytor minst 48 punkter. Inga finmotoriska dra-och-släpp-moment.
- Bara liggande läge.

## Svårighet (osynlig för spelaren)
- Läsförståelse L1–L7, skrivande S1–S5, ordets svårighet 1–6 (separat).
- Anpassning per pusseltyp: 3 rätt i rad → upp, 2 fel i rad → ned, inom kapitlets golv och tak.
- Loggas per försök: `pussel_id`, `typ`, `nivå`, `rätt`, `antal_försök`, `hjälp_använd`, `tid`.

## Valutor
- **Bär** till ungen: 1 per löst uppgift, betalar hjälpknappen.
- **Mynt** till hjälten: hittas i världen, köper utseende. Storyn kräver aldrig mynt.

## Ljud
Röst > ljudeffekter > musik. Musiken sänks när något läses. Ingen sång eller text i musiken. Mjuka chiptune-klanger.
