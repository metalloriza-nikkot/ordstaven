// @ts-check
// Provsidan för textgrammatiken (beslut 13.3): alla textformer i prologen och kapitel 1, sida vid sida.
// Texterna hämtas ur innehållet via källor (hamta.js). Bara där datan ännu saknar ett fält för texten står ett
// exempel här, märkt med "exempel", och det sägs på sidan. Etiketterna är för den vuxne och står i vanlig skrift.
// Kulissen är en schematisk gråbox i rummets pixlar (320 × 192): golv, väggar och figurer, inga riktiga kartor.

/** @typedef {import('./hamta.js').Kalla} Kalla */
/**
 * @typedef {{ typ: string, x: number, y: number, b?: number, h?: number, farg?: string, id?: string }} Sak
 * @typedef {{ rum: 'inne' | 'ute', saker: Sak[], hud?: string[] }} Kuliss
 * @typedef {{
 *   id: string, grupp: string, prolog?: number, kap1?: number, ny?: 'ja' | 'delvis', skiss?: boolean,
 *   namn: string, plats: string, upplast: string, visa: string, kalla?: Record<string, Kalla>,
 *   exempel?: Record<string, any>, kuliss: Kuliss, not?: string
 * }} Form
 */

export const GRUPPER = [
  { id: 'pratar', rubrik: 'Någon pratar', text: 'Läses upp. Här prövas framskrivningen: ord för ord eller allt på en gång.' },
  { id: 'laser', rubrik: 'Han läser själv', text: 'Lappar, skyltar och tavlor är saker i världen. De läses aldrig upp och skrivs aldrig fram.' },
  { id: 'valja', rubrik: 'Välja', text: 'Korten han väljer bland. Frågan läses upp, korten aldrig.' },
  { id: 'skriva', rubrik: 'Skriva', text: 'Formler och ord med brickor.' },
  { id: 'bocker', rubrik: 'Böcker och listor', text: 'Läses upp efter ett tryck.' },
  { id: 'vuxen', rubrik: 'För den vuxne', text: 'Syns bara i gråboxen.' },
];

// ---------------------------------------------------------------- kulissens delar
const hjalte = { typ: 'hjalte', x: 146, y: 104 };
const unge = { typ: 'unge', x: 166, y: 122 };
const farfar = { typ: 'figur', x: 214, y: 78, farg: '#8a6a4a', id: 'farfar' };
const bord = { typ: 'sak', x: 196, y: 102, b: 52, h: 22, farg: '#a58a68' };
const dorrar = [
  { typ: 'dorr', x: 72, y: 64, id: 'dorr_mat' }, { typ: 'dorr', x: 146, y: 64, id: 'dorr_bad' }, { typ: 'dorr', x: 220, y: 64, id: 'dorr_sov' },
];
const stigar = [{ typ: 'stig', x: 60, y: 0, b: 40, h: 70, id: 'stig_skogen' }, { typ: 'stig', x: 220, y: 0, b: 40, h: 70, id: 'stig_byn' }];
const trad = (x, y, s = 1) => ({ typ: 'trad', x, y, b: Math.round(34 * s), h: Math.round(44 * s) });
const skog = [trad(8, 6), trad(40, 2, 0.8), trad(270, 4), trad(292, 40, 0.9), trad(4, 120, 0.9), trad(286, 130)];

/** @type {Form[]} */
export const FORMER = [
  // ============================================================ någon pratar
  {
    id: 'berattaren', grupp: 'pratar', prolog: 1, kap1: 2,
    namn: 'Berättaren', plats: 'Läsplattan nertill, utan figur', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-01', scen: 'k1s02_lianerna', steg: { typ: 'replik', talare: 'berattare' } } },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge] },
    not: 'Grundregeln: berättaren får en egen ram utan figur. I dag är det samma ruta som Farfars, utan ring.',
  },
  {
    id: 'farfar', grupp: 'pratar', prolog: 2,
    namn: 'Farfar i rummet', plats: 'Läsplattan nertill, med färgring som porträtt', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-00', scen: 's08_farfar', steg: { typ: 'replik', talare: 'farfar' } } },
    kuliss: { rum: 'inne', saker: [bord, farfar, hjalte, unge] },
    not: 'Grundregeln: den som pratar syns som ett ansikte. I gråboxen är ansiktet en färgad ring.',
  },
  {
    id: 'radion', grupp: 'pratar', prolog: 2, kap1: 1,
    namn: 'Farfar genom radion', plats: 'Läsplattan nertill, 📻 före texten', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-01', scen: 'k1s01_brynet', steg: { typ: 'replik', talare: 'farfar', via: 'radio' }, nr: 1 } },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge], hud: ['radio'] },
  },
  {
    id: 'baronen', grupp: 'pratar', prolog: 2,
    namn: 'Baronen', plats: 'Läsplattan nertill, lila ring', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-00', scen: 's22_tradgarden', steg: { typ: 'replik', talare: 'baronen' } } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'figur', x: 230, y: 40, farg: '#6b3a8a' }, hjalte, unge] },
  },
  {
    id: 'omstart', grupp: 'pratar', kap1: 3,
    namn: 'Omstarten "Var var vi?"', plats: 'Läsplattan nertill (Farfars replik)', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-01', scen: 'k1s05_glantan', falt: 'vid_omstart' } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'nat', x: 140, y: 14 }, hjalte, unge] },
    not: 'Kommer först i varje scen när han börjar om. I prologen är det samma form som Farfar.',
  },
  {
    id: 'rop', grupp: 'pratar', prolog: 3,
    namn: 'Kall och rop', plats: 'Pratbubbla vid figuren i rummet', upplast: 'Ja', visa: 'rop',
    kalla: { rop: { kap: 'kap-00', scen: 's08_farfar', steg: { typ: 'prata' }, falt: 'kalla' } },
    kuliss: { rum: 'inne', saker: [bord, farfar, { ...hjalte, x: 60, y: 120 }, { ...unge, x: 80, y: 138 }] },
    not: 'Högst tre ord. Samma bubbla när hjälten säger ungens namn (s08). Ord för ord gör ingen skillnad här.',
  },
  {
    id: 'instruktion', grupp: 'pratar', prolog: 4, kap1: 2,
    namn: 'Instruktion som väntar', plats: 'Tankebubblan uppe i rummet, medan världen går', upplast: 'Ja, igen efter 8 s', visa: 'instruktion',
    kalla: { replik: { kap: 'kap-00', scen: 's12_pasarna', steg: { typ: 'replik', vantar_pa: 'mata_ungen' } } },
    kuliss: { rum: 'inne', saker: [hjalte, unge], hud: ['bar', 'nos'] },
    not: 'Niklas fråga: den står där frågan annars står. Grundregeln: en uppgift visas med en bild av handlingen. I kapitel 1: "{unge} är rädd." (k1s13).',
  },
  {
    id: 'inristning', grupp: 'pratar', kap1: 10, skiss: true,
    namn: 'Inristningen längs staven', plats: 'Staven i luften, och berättaren nertill', upplast: 'Repliken ja, staven nej', visa: 'inristning',
    kalla: { replik: { kap: 'kap-01', scen: 'k1s02_lianerna', steg: { typ: 'replik', talare: 'berattare' }, nr: 2 },
      formel: { kap: 'kap-01', pussel: 'k1_svard', falt: 'svar' }, forra: { kap: 'kap-00', pussel: 'p0_ljus', falt: 'svar' } },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge] },
  },
  {
    id: 'sparpunkt', grupp: 'pratar', prolog: 1, kap1: 17,
    namn: 'Frågan när passet slutar', plats: 'Helskärm, med fortsätt och den sovande ungen', upplast: 'Ja', visa: 'passSlut',
    kalla: { fraga: { aventyr: 'sparpunkt_fraga.text' } },
    kuliss: { rum: 'inne', saker: [] },
  },
  {
    id: 'kapitelrubrik', grupp: 'pratar', prolog: 1,
    namn: 'Kapitelrubriken', plats: 'Läsplattan nertill (berättaren)', upplast: 'Ja', visa: 'replik',
    kalla: { replik: { kap: 'kap-00', scen: 's22_tradgarden', steg: { typ: 'replik', talare: 'berattare' }, nr: -1 } },
    kuliss: { rum: 'ute', saker: [...skog, ...stigar, hjalte, unge] },
  },

  // ============================================================ han läser själv
  {
    id: 'tanke', grupp: 'laser', prolog: 5,
    namn: 'Tankebubblan med frågan', plats: 'Uppe i rummet, med en bild', upplast: '–', visa: 'dorrar',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_dorrar', falt: 'varianter.L1' } },
    kuliss: { rum: 'inne', saker: [...dorrar, { ...hjalte, x: 152, y: 124 }, { ...unge, x: 172, y: 142 }] },
    not: 'Skyltarna på dörrarna syns hela tiden (form 7). Handen sitter på den han står vid.',
  },
  {
    id: 'skyltar', grupp: 'laser', prolog: 7, kap1: 5,
    namn: 'Skylt med ett ord och pil', plats: 'Vid stigen, alltid synlig', upplast: 'Nej', visa: 'stigskyltar',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_skylten', falt: 'varianter.L1' } },
    kuliss: { rum: 'ute', saker: [...skog, ...stigar, { ...hjalte, y: 120 }, { ...unge, y: 138 }] },
    not: '📜 i bubblan öppnar listan igen. I kapitel 1 är BÄR en sådan skylt, men utan val.',
  },
  {
    id: 'tavla', grupp: 'laser', kap1: 6, ny: 'ja', skiss: true,
    namn: 'Tavla med ett ord, utan pil', plats: 'Långt borta i världen, går inte att trycka på', upplast: 'Nej', visa: 'tavla',
    exempel: { ord: 'bron' },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'back', x: 0, y: 30, b: 320, h: 22 }, { typ: 'bro', x: 236, y: 26 }, hjalte, unge] },
    not: 'Datan har ännu inget fält för ordet på tavlan (BRON) eller skylten BÄR. Ordet här är ett exempel.',
  },
  {
    id: 'lapp', grupp: 'laser', prolog: 6,
    namn: 'Farfars lapp', plats: 'Läsplattan, papper med kompassros', upplast: 'Nej', visa: 'lapp',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_dinomat' }, text: { kap: 'kap-00', pussel: 'p0_dinomat', falt: 'varianter.L2.text' } },
    kuliss: { rum: 'inne', saker: [hjalte, unge], hud: ['bar', 'nos', 'lapp'] },
  },
  {
    id: 'skylt-mening', grupp: 'laser', kap1: 4, ny: 'ja', skiss: true,
    namn: 'Skylt med en mening', plats: 'Farfars träskylt i världen, ett papper som markering. Läses på läsplattan.', upplast: 'Nej', visa: 'lapp',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_stenen' }, text: { kap: 'kap-01', pussel: 'k1_stenen', falt: 'varianter.L2.text' } },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge], hud: ['bar', 'nos'] },
    not: 'Stenen och träden. Skylten vid ingången (FÖLJ MINA SKYLTAR.) är samma form utan val.',
  },
  {
    id: 'narlapp', grupp: 'laser', prolog: 8,
    namn: 'Närlappen', plats: 'Ovanför föremålet han står vid, med handen', upplast: 'Nej', visa: 'narlapp',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_filt', falt: 'varianter.L1' } },
    kuliss: { rum: 'inne', saker: [{ typ: 'lada', x: 120, y: 100, id: 'lada' }, { typ: 'lada', x: 230, y: 70 }, { ...hjalte, x: 130, y: 126 }, { ...unge, x: 152, y: 140 }] },
  },
  {
    id: 'baronens-lapp', grupp: 'laser', kap1: 14, ny: 'ja', skiss: true,
    namn: 'Baronens lapp', plats: 'Läsplattan: lila papper, fjäderhatten som underskrift, svar som bildkort', upplast: 'Lappen nej, frågan ja', visa: 'lappFraga',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_lappen' } },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge] },
  },

  // ============================================================ välja
  {
    id: 'valkort', grupp: 'valja', prolog: 9,
    namn: 'Valkort med ett ord', plats: 'Läsplattan, frågan som bild', upplast: 'Nej', visa: 'valj',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_bar' } },
    kuliss: { rum: 'inne', saker: [hjalte, unge], hud: ['nos'] },
    not: 'Packlistan (P28) är samma kort, med lappen ovanför och ryggsäcken under.',
  },
  {
    id: 'luckorna', grupp: 'valja', kap1: 12, ny: 'ja', skiss: true,
    namn: 'Tre kort med en mening var', plats: 'Läsplattan, bilden ovanför, frågan uppläst', upplast: 'Korten nej, frågan ja', visa: 'valj',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_luckorna' } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'lada', x: 150, y: 80 }, hjalte, unge], hud: ['bar', 'nos'] },
  },

  // ============================================================ skriva
  {
    id: 'formel', grupp: 'skriva', prolog: 11, kap1: 9,
    namn: 'Formeln med brickor', plats: 'Läsplattan: förebilden, platserna, brickorna', upplast: 'Nej', visa: 'formel',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_ljus' } },
    kuliss: { rum: 'inne', saker: [hjalte, unge] },
  },
  {
    id: 'titta-tack', grupp: 'skriva', kap1: 8, ny: 'delvis', skiss: true,
    namn: 'Förebilden som tonas bort', plats: 'Inristad i världen, tonas bort när första brickan läggs', upplast: 'Nej', visa: 'tittaTack',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_svard' } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'trad', x: 136, y: 20, b: 48, h: 64, id: 'trad_med_formel' }, { typ: 'lianer', x: 32, y: 4, b: 256, h: 10 }, hjalte, unge] },
    not: '▶ spelar titta, täck, skriv: ordet lyser, brickorna kommer efter 2 s, och ordet tonas bort när första brickan läggs.',
  },
  {
    id: 'raddningen', grupp: 'skriva', kap1: 11, ny: 'ja', skiss: true,
    namn: 'Räddningen', plats: 'Läsplattan: kategorin i en mening, tomma fält, brickor', upplast: 'Nej (instruktionen före ja)', visa: 'raddning',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_apan' }, fraga: { kap: 'kap-01', scen: 'k1s05_glantan', steg: { typ: 'replik', talare: 'berattare' }, nr: -1 } },
    exempel: { brickor: ['A', 'E', 'G', 'O', 'R', 'S', 'T'] },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'nat', x: 140, y: 14 }, hjalte, unge] },
    not: 'Brickorna står bara i pusslets anteckning än (FÖRSLAG), så de är ett exempel här. Staven uppe till höger är kasta-läget.',
  },
  {
    id: 'kodlaset', grupp: 'skriva', kap1: 13, ny: 'ja', skiss: true,
    namn: 'Kodlåset med nyckeln', plats: 'Läsplattan: låset och nyckeln sida vid sida, fält och brickor', upplast: 'Nej (instruktionen ja)', visa: 'kodlas',
    kalla: { pussel: { kap: 'kap-01', pussel: 'k1_kodlas' } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'lada', x: 150, y: 80 }, hjalte, unge] },
  },
  {
    id: 'namn', grupp: 'skriva', prolog: 12,
    namn: 'Skriva ett namn', plats: 'Läsplattan: rutor, sudda och klar', upplast: '–', visa: 'dop',
    kalla: { pussel: { kap: 'kap-00', pussel: 'p0_ungenamn' } },
    exempel: { skrivet: 'KNO' },
    kuliss: { rum: 'inne', saker: [hjalte, unge] },
    not: 'Tangentbordet på skärmen kommer nertill på iPad. Namnet är påhittat.',
  },

  // ============================================================ böcker och listor
  {
    id: 'boken', grupp: 'bocker', prolog: 10, kap1: 15,
    namn: 'Boken', plats: 'Läsplattan: uppslag med bild, bildtext och text', upplast: 'Första uppslaget direkt, sedan efter tryck', visa: 'bok',
    kalla: { bok: { kap: 'kap-00', scen: 's16_godnattsagan', steg: { typ: 'bok' } } },
    kuliss: { rum: 'inne', saker: [bord, farfar, hjalte, unge] },
    not: 'Dinoboken i kapitel 1 (FOSSIL) är samma form, med bara bild och ett ord.',
  },
  {
    id: 'lista', grupp: 'bocker', kap1: 7, ny: 'ja', skiss: true,
    namn: 'Farfars lista', plats: 'Packlistans baksida. Ikonen i högra ramen, ovanför nosen.', upplast: 'Hela listan första gången, sedan en rad per tryck', visa: 'lista',
    exempel: { rubrik: { ord: 'mamma', bild: 'mammas_skugga' }, rader: [{ id: 'kartbit', ord: 'kartbit', bild: 'kartbit' }, { id: 'svard', ord: 'SVÄRD', bild: 'svard_lian', bockad: true }, { id: 'las', ord: 'lås', bild: 'las' }] },
    kuliss: { rum: 'ute', saker: [...skog, hjalte, unge], hud: ['bar', 'nos'] },
    not: 'Listan finns bara som FÖRSLAG i k1s01:s anteckning (T3), så raderna är ett exempel här. Den är en hjälp, inte en lapp: den läses upp vid tryck.',
  },

  // ============================================================ för den vuxne
  {
    id: 'regi', grupp: 'vuxen', prolog: 13, kap1: 16,
    namn: 'Regi', plats: 'Liten text uppe till höger, bara i gråboxen', upplast: 'Nej', visa: 'regi',
    kalla: { regi: { kap: 'kap-01', scen: 'k1s05_glantan', steg: { typ: 'mellanscen' }, falt: 'beskrivning' } },
    kuliss: { rum: 'ute', saker: [...skog, { typ: 'nat', x: 140, y: 14 }, hjalte, unge] },
    not: 'Försvinner när mellanscenerna får bild. Den vuxne kan läsa den högt.',
  },
];

/** Värden för platshållarna på provsidan: påhittade namn, som i testerna. */
export const VARDEN = Object.freeze({ unge: 'KNOPP', hjalte: 'TESTA' });
