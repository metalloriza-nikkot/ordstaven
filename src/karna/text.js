// @ts-check
// Textmotorn. All speltext lagras i vanlig skrift ("Ta den röda lådan."). Spelet visar
// versaler tills nivån säger annat. Formler skrivs alltid i versaler (stavens skrift).

/** @typedef {'versaler' | 'vanlig'} Skrift */

/** Platshållare i texten: {unge}, {hjalte}. */
export const PLATSHALLARE = /\{([a-z]+)\}/g;

/** Text som rader. @param {string | string[]} text @returns {string[]} */
export function rader(text) {
  return Array.isArray(text) ? text : [text];
}

/** @param {string} s */
export function versaler(s) {
  return s.toLocaleUpperCase('sv-SE');
}

/**
 * Ett namn som spelaren har skrivit (lagras som det skrevs, oftast versaler)
 * i den skrift som texten visas i. @param {string} namn @param {Skrift} skrift
 */
export function namnISkrift(namn, skrift) {
  if (!namn) return namn;
  if (skrift === 'versaler') return versaler(namn);
  const sma = namn.toLocaleLowerCase('sv-SE');
  return sma.charAt(0).toLocaleUpperCase('sv-SE') + sma.slice(1);
}

/**
 * Ersätt platshållare. Okända platshållare lämnas kvar (innehållskontrollen fångar dem).
 * @param {string} rad @param {Record<string, string>} varden t.ex. { unge: 'KNOPP' } @param {Skrift} skrift
 */
export function ersattPlatshallare(rad, varden, skrift) {
  return rad.replace(PLATSHALLARE, (hel, namn) => (namn in varden ? namnISkrift(varden[namn], skrift) : hel));
}

/**
 * Gör texten klar för skärmen: platshållare ersatta och rätt skrift.
 * @param {string | string[]} text @param {{ skrift?: Skrift, varden?: Record<string, string> }} [opt]
 * @returns {string[]} rader
 */
export function forSkarm(text, { skrift = 'versaler', varden = {} } = {}) {
  return rader(text).map((r) => {
    const ersatt = ersattPlatshallare(r, varden, skrift);
    return skrift === 'versaler' ? versaler(ersatt) : ersatt;
  });
}

/** Orden i en rad, utan skiljetecken och platshållare. @param {string} rad */
export function ord(rad) {
  return rad.replace(PLATSHALLARE, ' ').split(/[^A-Za-zÅÄÖåäöÉé]+/).filter(Boolean);
}
