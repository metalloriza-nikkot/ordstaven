// Bokstavsstigen (P18, beslut 114.6): ett golv av isflak i ett rutnät, ett flak per bokstav. Han hoppar bara till ett
// flak i raden framför, rakt fram eller snett, och stavar ordet ett flak i taget. Reglerna står här, utan Phaser och
// utan DOM, så att kapitel 4 och testrummet kör samma kod.
//
// Rutnätet skrivs som Innehålls ritning (21b): raderna uppifrån och ned, kolumnerna från vänster till höger. Han kommer
// från vänster, och varje hopp går en kolumn åt höger: rakt, snett upp eller snett ned. Varje ruta är en gemen (ett
// flak), ~ (en vak) eller | (en isvägg). Rutorna skiljs åt med mellanslag.
//
//   "rutnat": ["s a v k e",
//              "t e x l a",     <- utgången till höger om sista kolumnen
//              "o r s u o"]
//
// Ordet har lika många bokstäver som rutnätet har kolumner. Första hoppet går till ett flak i första kolumnen (bara
// raderna runt `start` om den finns), och han är framme när ordet är stavat i sista kolumnen.
//
// I koden är r stegets nummer (kolumnen, 0 = den första) och k raden (0 = den översta).

/** Gemener som inte får vara den enda skillnaden mellan två flak bredvid varandra (08 §3). */
export const FORVAXLINGAR = Object.freeze([['n', 'u'], ['b', 'd'], ['p', 'q'], ['a', 'ä'], ['m', 'w'], ['l', 'i'], ['o', 'ö'], ['h', 'b']]);

/** @typedef {{ r: number, k: number }} Ruta  r = kolumnen (stegets nummer från vänster), k = raden uppifrån */
/** @typedef {{ sort: 'flak' | 'vak' | 'vagg', bokstav: string | null }} Cell */

/** Liten bokstav som den står på flaket (gemener, 114). @param {string} s */
export const gemen = (s) => String(s || '').toLocaleLowerCase('sv-SE');

/**
 * Läser Innehålls rutnät. @param {{ rutnat: string[], ord: string, start?: number }} p
 * @returns {{ rader: number, kolumner: number, celler: Cell[][], ord: string, start: number }}
 */
export function lasRutnat(p) {
  const rader = (p.rutnat || []).map((rad) => String(rad).trim().split(/\s+/));
  const kolumner = Math.max(0, ...rader.map((r) => r.length));
  // celler[steg][rad]: kolumnen i ritningen är stegets nummer
  const celler = Array.from({ length: kolumner }, (_, steg) => rader.map((rad) => {
    const t = rad[steg] ?? '~';
    if (t === '~' || t === '#') return /** @type {Cell} */ ({ sort: 'vak', bokstav: null });
    if (t === '|') return /** @type {Cell} */ ({ sort: 'vagg', bokstav: null });
    return /** @type {Cell} */ ({ sort: 'flak', bokstav: gemen(t) });
  }));
  const start = Number.isInteger(p.start) ? /** @type {number} */ (p.start) : null;
  // steg (kolumner i ritningen) och bredd (rader i ritningen)
  return { rader: kolumner, kolumner: rader.length, celler, ord: gemen(p.ord), start };
}

/** @param {Ruta} a @param {Ruta} b */
const lika = (a, b) => a.r === b.r && a.k === b.k;
/** @param {Ruta} a */
const nyckel = (a) => `${a.r},${a.k}`;

/**
 * Flaken han kan hoppa till: raden framför, rakt fram eller snett (114: bara ett flak bredvid). Från stranden
 * (r = -1) är det den närmaste raden runt startkolumnen. @param {ReturnType<typeof lasRutnat>} g @param {Ruta} fran
 * @returns {Ruta[]}
 */
export function grannar(g, fran) {
  const r = fran.r + 1;
  if (r >= g.rader) return [];
  const ut = [];
  // från stranden utan start: alla flak i första kolumnen (21b: han kliver upp på ett flak i k0)
  const [fr, til] = fran.r < 0 && g.start === null ? [0, g.kolumner - 1] : [fran.k - 1, fran.k + 1];
  for (let k = fr; k <= til; k++) if (k >= 0 && k < g.kolumner && g.celler[r][k].sort === 'flak') ut.push({ r, k });
  return ut;
}

/** Var han står på stranden (raden mitt i, eller start). @param {ReturnType<typeof lasRutnat>} g */
export const strandRad = (g) => g.start ?? Math.floor((g.kolumner - 1) / 2);

/**
 * Går ordet att stava färdigt härifrån, med bokstav nr i som nästa? (Flak som har sjunkit räknas inte.)
 * @param {ReturnType<typeof lasRutnat>} g @param {Ruta} fran @param {number} i @param {Set<string>} [sjunkna]
 */
export function kanNaFram(g, fran, i, sjunkna = new Set()) {
  if (i >= g.ord.length) return fran.r === g.rader - 1;
  return grannar(g, fran).some((n) => !sjunkna.has(nyckel(n)) && g.celler[n.r][n.k].bokstav === g.ord[i] && kanNaFram(g, n, i + 1, sjunkna));
}

/**
 * En ny stig. @param {any} p pusslet (P18_bokstavsstig)
 */
export function skapaStig(p) {
  const g = lasRutnat(p);
  return {
    g,
    /** @type {Ruta} där han står (r = -1 är stranden) */
    nu: { r: -1, k: strandRad(g) },
    /** @type {Ruta[]} flaken han har gått på, i ordning (hans spår, flaken får en spricka) */
    vag: /** @type {Ruta[]} */ ([]),
    /** @type {Set<string>} flak som har sjunkit (en återvändsgränd) */
    sjunkna: new Set(),
    fel: 0,
    felHar: 0,
    atervandor: 0,
    klar: false,
  };
}

/** @typedef {ReturnType<typeof skapaStig>} Stig */

/** Bokstaven han ska hoppa på nu. @param {Stig} s */
export const nastaBokstav = (s) => s.g.ord[s.vag.length] ?? null;

/**
 * Han väljer ett flak. Resultatet säger vad som händer:
 * - `inte`: det är inget flak han kan hoppa till (för långt bort, en vak, ett flak som har sjunkit);
 * - `fel`: fel bokstav. Flaket knakar och gungar, och han står kvar (114: kort och ofarligt);
 * - `ratt`: han hoppar dit;
 * - `atervand`: rätt bokstav, men därifrån finns ingen väg vidare. Grenen sjunker (`sjunker`), och han står på flaket
 *   där vägen delade sig (`tillbaka`). Han börjar aldrig om från början;
 * - `klar`: ordet är stavat, och han står på den bortersta raden.
 * @param {Stig} s @param {Ruta} till
 * @returns {{ sort: 'inte' | 'fel' | 'ratt' | 'atervand' | 'klar', till?: Ruta, sjunker?: Ruta[], tillbaka?: Ruta }}
 */
export function valj(s, till) {
  if (s.klar) return { sort: 'inte' };
  if (!grannar(s.g, s.nu).some((n) => lika(n, till)) || s.sjunkna.has(nyckel(till))) return { sort: 'inte' };
  const c = s.g.celler[till.r][till.k];
  if (c.bokstav !== nastaBokstav(s)) { s.fel++; s.felHar++; return { sort: 'fel', till }; }
  s.vag.push(till); s.nu = till; s.felHar = 0;
  if (s.vag.length === s.g.ord.length && till.r === s.g.rader - 1) { s.klar = true; return { sort: 'klar', till }; }
  // en återvändsgränd: inget flak framför har nästa bokstav (vakar, isväggar, fel bokstäver eller sjunkna flak)
  const nasta = nastaBokstav(s);
  const vidare = grannar(s.g, till).some((n) => !s.sjunkna.has(nyckel(n)) && s.g.celler[n.r][n.k].bokstav === nasta);
  if (vidare) return { sort: 'ratt', till };
  // grenen sjunker tillbaka till det senaste flaket i hans spår där ordet fortfarande går att stava färdigt
  /** @type {Ruta[]} */ const sjunker = [];
  while (s.vag.length) {
    const sista = /** @type {Ruta} */ (s.vag.pop());
    sjunker.push(sista); s.sjunkna.add(nyckel(sista));
    const fran = s.vag.at(-1) ?? { r: -1, k: strandRad(s.g) };
    if (kanNaFram(s.g, fran, s.vag.length, s.sjunkna)) { s.nu = fran; break; }
    s.nu = fran;
  }
  s.atervandor++;
  return { sort: 'atervand', till, sjunker, tillbaka: s.nu };
}

/**
 * Det flak hjälpen visar (kanten lyser, ungen nosar): ett flak framför med rätt bokstav, som leder fram. Aldrig
 * bokstaven själv. @param {Stig} s @returns {Ruta | null}
 */
export function hjalpFlak(s) {
  const i = s.vag.length;
  return grannar(s.g, s.nu).find((n) => !s.sjunkna.has(nyckel(n)) && s.g.celler[n.r][n.k].bokstav === s.g.ord[i] && kanNaFram(s.g, n, i + 1, s.sjunkna)) ?? null;
}

/**
 * Kontrollen av ett rutnät (verktyg/innehall): fel som gör stigen omöjlig, och varningar för förväxlingsbara
 * gemener bredvid varandra. @param {any} p @returns {{ fel: string[], varningar: string[] }}
 */
export function kontrolleraStig(p) {
  const fel = [], varningar = [];
  if (!p.ord || !/^[a-zåäöé]+$/i.test(String(p.ord))) fel.push(`${p.id}: ordet saknas eller har annat än bokstäver`);
  if (!Array.isArray(p.rutnat) || !p.rutnat.length) { fel.push(`${p.id}: rutnätet saknas`); return { fel, varningar }; }
  const rader = p.rutnat.map((r) => String(r).trim().split(/\s+/));
  if (new Set(rader.map((r) => r.length)).size > 1) fel.push(`${p.id}: raderna i rutnätet är olika långa`);
  for (const r of rader) for (const t of r) if (!/^(~|#|\||[a-zåäöé])$/.test(t)) fel.push(`${p.id}: rutan "${t}" är inte en gemen, ~ eller |`);
  const g = lasRutnat(p);
  if (g.ord.length !== g.rader) fel.push(`${p.id}: ordet har ${g.ord.length} bokstäver men rutnätet ${g.rader} kolumner (en kolumn per bokstav)`);
  if (g.start !== null && (g.start < 0 || g.start >= g.kolumner)) fel.push(`${p.id}: start ligger utanför rutnätet`);
  if (!fel.length && !kanNaFram(g, { r: -1, k: strandRad(g) }, 0)) fel.push(`${p.id}: ordet går inte att stava hela vägen fram`);
  // förväxlingsbara gemener: två flak han kan välja mellan i samma hopp (samma kolumn) får inte skilja sig bara så
  if (!fel.length) for (let r = 0; r < g.rader; r++) for (let k = 0; k < g.kolumner; k++) {
    const a = g.celler[r][k].bokstav;
    for (const kk of [k + 1, k + 2]) {
      const b = g.celler[r][kk]?.bokstav;
      if (a && b && FORVAXLINGAR.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) varningar.push(`${p.id}: ${a} och ${b} står i samma kolumn (kolumn ${r + 1}) och kan förväxlas (08 §3)`);
    }
  }
  return { fel, varningar };
}
