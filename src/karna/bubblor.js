// @ts-check
// Bybornas bubblor (beslut 67.5, kapitel 2): ett tryck på en bybo ger en vinkning och ett ord i en bubbla i ca 2 s.
// Ordet står i rummet (`bubblor`), per rummets tillstånd, och `*` gäller i alla. Det räknas inte som något.
// Ren logik: inget Phaser, ingen DOM.

/** Hur länge bubblan står kvar (ms). */
export const BUBBLA_MS = 2000;

/**
 * Ordet i figurens bubbla just nu, eller null.
 * @param {any} rum rummet i kapitlet @param {string} figur figurens id @param {string | null} tillstand rummets tillstånd
 * @returns {string | null}
 */
export function bubblaFor(rum, figur, tillstand) {
  const b = rum?.bubblor?.[figur];
  if (!b) return null;
  return (tillstand && b[tillstand]) || b['*'] || null;
}
