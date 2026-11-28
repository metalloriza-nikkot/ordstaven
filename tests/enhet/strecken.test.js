// Strecken på lappen (141.7, schema 2.64): ett steg med `stryker` stryker en rad på en lapp när det är klart, raden
// står struken efter en omstart och när kapitlet spolas fram, och kontrollen säger till när raden inte finns.
// Ett påhittat kapitel.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaBerattelse, spolaFram, strykRader } from '../../src/karna/berattelse.js';
import { nyttTillstand, aventyrFor } from '../../src/karna/sparning.js';
import { kontrollera } from '../../verktyg/innehall/kontroll.js';

const AV = 'provet';
const R = (text, extra = {}) => ({ typ: 'replik', talare: 'berattare', text, upplast: true, ...extra });
const kapitel = () => ({
  id: 'kap-x',
  rum: [{ id: 'torg', innehall: [] }],
  pussel: [{ id: 'listan', typ: 'P1_las_och_valj', kan_oppnas_igen: true, varianter: { L4: { text: ['Ta mössan.', 'Gå till bron.', 'Ropa högt.'] } } }],
  scener: [
    { id: 'a', pass: 1, rum: 'torg', steg: [{ typ: 'oppna_lasplatta', pussel_id: 'listan' }, R('Mössan!', { stryker: { lapp: 'listan', rad: 0 } }), { typ: 'sparpunkt', pass_slut: true }] },
    { id: 'b', pass: 2, rum: 'torg', steg: [R('Bron och ropet!', { stryker: [{ lapp: 'listan', rad: 1 }, { lapp: 'listan', rad: 2 }] }), R('Slut.')] },
  ],
});

/** Spela stegen fram till ett steg som säger text (klar på varje steg). */
const spelaTill = (b, text) => { for (let i = 0; i < 20; i++) { const st = b.aktuellt(); if (!st || st.text === text) return st; b.klar({}); } return null; };

describe('strecken på lappen (141.7)', () => {
  it('raden stryks när steget är klart, inte när det börjar', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr: {}, kapitel: kapitel(), tillstand: t, aventyrId: AV });
    spelaTill(b, 'Mössan!');
    expect(aventyrFor(t, AV).strukna?.listan ?? []).toEqual([]);
    b.klar({});
    expect(b.senastStrukna).toEqual([{ lapp: 'listan', rad: 0 }]);
    expect(aventyrFor(t, AV).strukna.listan).toEqual([0]);
    b.aktuellt(); b.klar({});
    expect(b.senastStrukna).toEqual([]);
  });
  it('flera rader i ett steg, och en rad stryks bara en gång', () => {
    const av = { strukna: { listan: [1] } };
    expect(strykRader(av, { stryker: [{ lapp: 'listan', rad: 1 }, { lapp: 'listan', rad: 2 }] })).toEqual([{ lapp: 'listan', rad: 2 }]);
    expect(av.strukna.listan).toEqual([1, 2]);
  });
  it('raderna står strukna efter en omstart och när kapitlet spolas fram', () => {
    const t = nyttTillstand('t');
    const b = skapaBerattelse({ aventyr: {}, kapitel: kapitel(), tillstand: t, aventyrId: AV });
    spelaTill(b, 'Slut.');
    const om = skapaBerattelse({ aventyr: {}, kapitel: kapitel(), tillstand: JSON.parse(JSON.stringify(t)), aventyrId: AV });
    expect(aventyrFor(t, AV).strukna.listan.sort()).toEqual([0, 1, 2]);
    expect(om).toBeTruthy();
    const t2 = nyttTillstand('t2');
    spolaFram({ kapitel: kapitel(), tillstand: t2, aventyrId: AV, tillScen: 'b' });
    expect(aventyrFor(t2, AV).strukna.listan).toEqual([0]);
  });
});

describe('kontrollen av strecken (2.64)', () => {
  const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));
  const riktigt = () => ({ aventyr: las('den-gomda-dalen/aventyr.json'), kapitel: [las('den-gomda-dalen/kap-05.json')], ordlistor: las('ordlistor.json') });
  const medStryker = (stryker) => {
    const d = riktigt(); const k = d.kapitel[0];
    const st = k.scener.find((s) => s.id === 'k5s04_glantan').steg.find((s) => s.typ === 'pussel' && s.pussel_id === 'k5_rad1');
    st.stryker = stryker;
    return kontrollera(d).fel.join('\n');
  };
  it('en rad som finns på lappen godtas', () => {
    expect(medStryker({ lapp: 'k5_bit_bak', rad: 0 })).not.toMatch(/stryker|raden/);
  });
  it('en lapp som inte finns, eller en rad utanför lappen, är fel', () => {
    expect(medStryker({ lapp: 'k5_finns_inte', rad: 0 })).toMatch(/inte är en lapp/);
    expect(medStryker({ lapp: 'k5_bit_bak', rad: 3 })).toMatch(/har inte raden 3/);
  });
});
