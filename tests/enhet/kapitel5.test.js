// Kapitel 5 i gråbox (beslut 139): kortets eget svar i ordduellen (139.4) och budgeten för kapitlet (139.5).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaOrdduell } from '../../src/karna/ordduell.js';
import { budgetVarningar, talareI } from '../../verktyg/innehall/budget.js';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));

/** En duell med påhittade ord: ett utfall per rond, och ett kort med ett eget svar. */
const duell = () => ({
  ronder: [
    { form: 'mening', niva: 'L3', utfall: [{
      pekar_pa: 'x', ropar: [{ talare: 'baronen', text: 'Min mössa är röd och ny!' }],
      alternativ: [
        { text: 'Blå och gammal', ratt: true },
        { text: 'Röd och gammal', vid_fel: { replik: { talare: 'baronen', text: 'Röd! Precis! … Gammal?' } } },
        { text: 'Blå och ny' },
      ],
      vid_ratt: { handling: 'paraplyet studsar' },
      vid_fel: { handling: 'baronen poserar', replik: { talare: 'baronen', text: 'Ha! Miss!' } },
    }] },
  ],
});

describe('ordduellen: kortets eget svar (139.4)', () => {
  it('ett kort med vid_fel ersätter utfallets svar, och resten tas från utfallet', () => {
    const d = skapaOrdduell(duell(), { slump: () => 0 });
    const i = d.kort.findIndex((a) => a.text === 'Röd och gammal');
    const r = d.valj(i);
    expect(r.resultat).toBe('fel');
    expect(r.reaktion.replik.text).toBe('Röd! Precis! … Gammal?');
    expect(r.reaktion.handling).toBe('baronen poserar');
  });
  it('ett kort utan vid_fel får utfallets svar', () => {
    const d = skapaOrdduell(duell(), { slump: () => 0 });
    const r = d.valj(d.kort.findIndex((a) => a.text === 'Blå och ny'));
    expect(r.reaktion.replik.text).toBe('Ha! Miss!');
  });
});

describe('kapitel 5:s budget (139.5)', () => {
  const kap = (n) => las(`den-gomda-dalen/kap-0${n}.json`);
  const tidigare = new Set([0, 1, 2, 3, 4].flatMap((n) => [...talareI(kap(n))]));
  it('kramen, ROPA, fäktningens ronder och slutbilderna ger inga varningar om passiva steg eller läsval', () => {
    const v = budgetVarningar(kap(5), { tidigareTalare: tidigare });
    expect(v.filter((x) => /passiva|steg i rad|repliker innan|inget läsval|skrivuppgifter/.test(x))).toEqual([]);
  });
});
