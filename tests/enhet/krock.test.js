import { describe, it, expect } from 'vitest';
import { hinderFramfor, krockVakt, KROCK_MS } from '../../src/karna/krock.js';

describe('krockarna i loggen (97.6)', () => {
  const rutor = [{ x: 100, y: 50, b: 20, h: 20, id: 'snacka_1' }, { x: 0, y: 150, b: 320, h: 42 }];
  const S = { bredd: 320, hojd: 192 };
  it('hindret framför fötterna, med sitt id, och rummets kant', () => {
    expect(hinderFramfor({ x: 92, y: 60 }, { x: 1, y: 0 }, rutor, S)).toBe('snacka_1');
    expect(hinderFramfor({ x: 92, y: 60 }, { x: -1, y: 0 }, rutor, S)).toBeNull();
    expect(hinderFramfor({ x: 60, y: 149 }, { x: 0, y: 1 }, rutor, S)).toBe('hinder'); // utan id
    expect(hinderFramfor({ x: 9, y: 60 }, { x: -1, y: 0 }, rutor, S)).toBe('kanten');
    expect(hinderFramfor({ x: 9, y: 60 }, { x: 0, y: 0 }, rutor, S)).toBeNull();
  });
  it('loggar en gång efter ca 1 s mot samma hinder, och börjar om när han kommer loss', () => {
    const v = krockVakt();
    const ut = [];
    for (let t = 0; t < KROCK_MS * 3; t += 100) { const id = v.steg(100, true, 0, 'snacka_1'); if (id) ut.push([t, id]); }
    expect(ut).toEqual([[KROCK_MS - 100, 'snacka_1']]);
    // han glider längs hindret: ingen krock
    const g = krockVakt();
    for (let t = 0; t < 3000; t += 100) expect(g.steg(100, true, 0.6, 'snacka_1')).toBeNull();
    // ett nytt försök (han släppte tangenten) loggas igen
    expect(v.steg(100, false, 1, null)).toBeNull();
    let igen = null;
    for (let t = 0; t < KROCK_MS + 100 && !igen; t += 100) igen = v.steg(100, true, 0, 'snacka_1');
    expect(igen).toBe('snacka_1');
    // kortare än en sekund: ingenting
    const k = krockVakt();
    for (let t = 0; t < 800; t += 100) expect(k.steg(100, true, 0, 'x')).toBeNull();
  });
});
