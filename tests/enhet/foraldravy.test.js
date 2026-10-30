// @ts-check
import { describe, it, expect } from 'vitest';
import { sammanfatta } from '../../src/karna/foraldravy.js';

describe('föräldravyn', () => {
  const pussel = [
    { id: 'a', typ: 'P1_las_och_valj', varianter: { L2: { alternativ: [{}, {}] }, L3: { alternativ: [{}, {}, {}] } } },
    { id: 's', typ: 'P11_formel' },
  ];
  it('räknar rätt på första försöket utan hjälp, hjälp och slumpen per pusseltyp', () => {
    const r = sammanfatta([
      { pussel_id: 'a', typ: 'P1_las_och_valj', niva: 'L2', ratt: true, tid: 4000 },
      { pussel_id: 'a', typ: 'P1_las_och_valj', niva: 'L3', ratt: false, tid: 9000 },
      { pussel_id: 'a', typ: 'P1_las_och_valj', niva: 'L3', ratt: true, hjalp_anvand: true, tid: 6000 },
      { pussel_id: 's', typ: 'P11_formel', niva: 'S1', ratt: true, tid: 12000 },
    ], pussel);
    expect(r[0]).toMatchObject({ typ: 'P1_las_och_valj', slag: 'L', antal: 3, rattForsta: 1, hjalp: 1, sekunder: 6 });
    expect(r[0].slump).toBeCloseTo((1 / 2 + 1 / 3 + 1 / 3) / 3);
    expect(r[1]).toMatchObject({ typ: 'P11_formel', slag: 'S', antal: 1, rattForsta: 1, slump: null });
  });
  it('tom historik ger inga rader', () => { expect(sammanfatta([], pussel)).toEqual([]); });
});
