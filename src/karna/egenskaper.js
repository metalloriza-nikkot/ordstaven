// @ts-check
// Egenskaper som läses (färg, storlek) och hur de syns. Regel: bilden stämmer med texten.
// Det en läsuppgift nämner syns tydligt, redan i gråboxen. Färgerna skiljer sig också i ljushet,
// så att de går att skilja åt för den som ser färger svagt (stilguiden, avsnitt 4).

/** Gråboxens färger. Ljusheten (L*) skiljer minst 10 mellan alla par. */
export const PALETT = Object.freeze({ rod: '#d9443a', bla: '#1f3c88', gul: '#f4d03f', gron: '#6abf69', vit: '#f7f5ef' });

/** Storlek som syns: stor, liten (annars vanlig). */
export const STORLEK = Object.freeze({ stor: 1.35, liten: 0.7 });

/**
 * Egenskaperna i ett id eller bild-id, t.ex. "stor_rod", "lada_rod_stor", "filt_bla".
 * @param {string} id
 * @returns {{ farg: keyof typeof PALETT | null, storlek: keyof typeof STORLEK | null }}
 */
export function egenskaper(id) {
  const delar = String(id).split('_');
  const farg = /** @type {keyof typeof PALETT | undefined} */ (delar.find((d) => d in PALETT)) ?? null;
  const BOJT = /** @type {Record<string, keyof typeof STORLEK>} */ ({ stort: 'stor', stora: 'stor', litet: 'liten', lilla: 'liten', sma: 'liten' });
  const s = delar.map((d) => BOJT[d] || d).find((d) => d in STORLEK);
  const storlek = /** @type {keyof typeof STORLEK | undefined} */ (s) ?? null;
  return { farg, storlek };
}

/** Ljusheten L* (CIELAB) för en färg, för testet att färgerna går att skilja åt. @param {string} hex */
export function ljushet(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const y = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}
