// @ts-check
// Palettbyten för hjälten (stilguiden §5): formen och skuggningen är ritade en gång, i förvalets färger (hjälte A),
// och spelarens val av hud och dräkt byter färgerna. Ren logik: färg in, färg ut. Ritningen görs i scener/figurbilder.js.

/**
 * Hjälte A:s hud i bilderna (*Så ritas allt*: kontur, skugga, mitt, ljus och högdager). Staven har samma i
 * knytnäven, och sängen i hjälten som sover (assets/sprites/hjalte, stav).
 */
export const HUD_A = Object.freeze({ mitt: 0x2e8bd8, toner: [0x0e2a5a, 0x1e5fa8, 0x2e8bd8, 0x5fb4e8, 0xa8dcf8] });
/** Hjälte A:s dräkt i bilderna (kontur, skugga, mitt och ljus). Den ljusa kanten är fast. */
export const DRAKT_A = Object.freeze({ mitt: 0x3a3e48, toner: [0x15171c, 0x2a2d35, 0x3a3e48, 0x565b68] });

/** @param {number} c @returns {[number, number, number]} h (0–360), s och l (0–1) */
export function tillHsl(c) {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/** @param {number} h @param {number} s @param {number} l @returns {number} */
export function franHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

const klamp = (x) => Math.max(0, Math.min(1, x));

/**
 * En ton i en ny färg: samma steg i nyans, mättnad och ljus från mitten som i förlagan.
 * @param {number} ton förlagans ton (t.ex. hudens skugga) @param {number} mitt förlagans mitt @param {number} ny den nya mitten
 */
export function flyttaTon(ton, mitt, ny) {
  const [h0, s0, l0] = tillHsl(mitt), [h1, s1, l1] = tillHsl(ton), [h, s, l] = tillHsl(ny);
  return franHsl((h + (h1 - h0) + 360) % 360, klamp(s + (s1 - s0)), klamp(l + (l1 - l0)));
}

/**
 * Färgbytena för ett val av hud och dräkt: förlagans färg → den nya. Tomt när valet är förlagan.
 * @param {number} hud vald hudfärg (mitten) @param {number} [drakt] vald dräktfärg
 * @returns {Map<number, number>}
 */
export function hjaltensByten(hud, drakt) {
  const m = new Map();
  if (hud !== HUD_A.mitt) for (const t of HUD_A.toner) m.set(t, t === HUD_A.mitt ? hud : flyttaTon(t, HUD_A.mitt, hud));
  if (drakt !== undefined && drakt !== DRAKT_A.mitt) for (const t of DRAKT_A.toner) m.set(t, t === DRAKT_A.mitt ? drakt : flyttaTon(t, DRAKT_A.mitt, drakt));
  return m;
}
