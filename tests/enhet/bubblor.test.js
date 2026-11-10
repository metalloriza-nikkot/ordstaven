// Bybornas bubblor och rollrösterna (kapitel 2 del 5, beslut 67.5).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bubblaFor } from '../../src/karna/bubblor.js';
import { tonFor } from '../../src/grans/rost.js';

const las = (p) => JSON.parse(readFileSync(new URL('../../content/' + p, import.meta.url), 'utf8'));

describe('bybornas bubblor', () => {
  it('ordet följer rummets tillstånd, och * gäller i alla', () => {
    const rum = { bubblor: { fiskaren: { rep: 'suck', fri: 'fisk' }, barnet_drake: { '*': 'hej' } } };
    expect(bubblaFor(rum, 'fiskaren', 'rep')).toBe('suck');
    expect(bubblaFor(rum, 'fiskaren', 'fri')).toBe('fisk');
    expect(bubblaFor(rum, 'fiskaren', 'kvall')).toBeNull();
    expect(bubblaFor(rum, 'barnet_drake', 'kvall')).toBe('hej');
    expect(bubblaFor(rum, 'tant_rosa', 'rep')).toBeNull();
    expect(bubblaFor({}, 'fiskaren', 'rep')).toBeNull();
  });
  it('byn i kapitel 2 har bubblor för de tre byborna', () => {
    const byn = las('den-gomda-dalen/kap-02.json').rum.find((r) => r.id === 'byn');
    for (const f of ['fiskaren', 'tvatterskan', 'barnet_drake']) expect(bubblaFor(byn, f, 'fri'), f).toBeTruthy();
  });
});

describe('rollrösterna tant och barn', () => {
  it('Tant Rosa är ljusare än Farfar och lite långsam, och Bo är ljus och snabb', () => {
    const t = las('den-gomda-dalen/aventyr.json').talare;
    expect(t.tant_rosa.rollrost).toBe('tant');
    expect(t.bo.rollrost).toBe('barn');
    const farfar = tonFor('gammal', 'Hej'), tant = tonFor('tant', 'Hej'), barn = tonFor('barn', 'Hej'), ber = tonFor('berattare', 'Hej');
    expect(tant.pitch).toBeGreaterThan(farfar.pitch);
    expect(tant.rate).toBeLessThan(ber.rate);
    expect(barn.pitch).toBeGreaterThan(tant.pitch);
    expect(barn.rate).toBeGreaterThan(ber.rate);
  });
});
