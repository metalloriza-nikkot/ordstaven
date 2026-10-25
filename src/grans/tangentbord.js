// @ts-check
// Skärmtangentbordet: versaler i alfabetisk ordning, tangenter minst 64 punkter.
// Fristående modul utan beroenden till resten av spelet, så att TURBO-RACE kan använda den.

export const RADER = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', 'Å', 'Ä', 'Ö'],
];
/** Höjden tangentbordet tar nertill, i CSS-punkter (tre rader à 64 + mellanrum + marginal). */
export const TANGENTBORD_HOJD = 232;

/**
 * @param {{ rot: HTMLElement, vidBokstav: (b: string) => void, vidSudda: () => void, vidKlar: () => void, ljud?: () => void }} opt
 */
export function skapaTangentbord({ rot, vidBokstav, vidSudda, vidKlar, ljud }) {
  const el = document.createElement('div');
  el.id = 'tangentbord';
  el.setAttribute('role', 'group');
  el.hidden = true;
  RADER.forEach((rad, i) => {
    const r = document.createElement('div');
    r.className = 'tb-rad';
    for (const b of rad) r.appendChild(knapp(b, 'tb-tangent', () => vidBokstav(b)));
    if (i === 2) {
      r.appendChild(knapp('⌫', 'tb-tangent tb-sudda', vidSudda, 'Sudda'));
      r.appendChild(knapp('✓', 'tb-tangent tb-klar', vidKlar, 'Klar'));
    }
    el.appendChild(r);
  });
  rot.appendChild(el);

  /** @param {string} text @param {string} klass @param {() => void} gor @param {string} [namn] */
  function knapp(text, klass, gor, namn) {
    const k = document.createElement('button');
    k.type = 'button'; k.className = klass; k.textContent = text;
    if (namn) k.setAttribute('aria-label', namn);
    k.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      k.classList.add('nere'); setTimeout(() => k.classList.remove('nere'), 120);
      ljud?.(); gor();
    });
    return k;
  }

  return {
    el,
    visa() { el.hidden = false; },
    dolj() { el.hidden = true; },
    get synligt() { return !el.hidden; },
    /** @param {boolean} pa */
    klarAktiv(pa) { const k = el.querySelector('.tb-klar'); if (k) k.classList.toggle('av', !pa); },
    /** Låt översta raden blinka (knuff). */
    blinka() { const r = el.querySelector('.tb-rad'); if (r) { r.classList.add('blinkar'); setTimeout(() => r.classList.remove('blinkar'), 2400); } },
  };
}
