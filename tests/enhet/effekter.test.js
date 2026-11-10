import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { EFFEKT_FOR, effektFinns } from '../../src/grans/ljud.js';

const LJUD = JSON.parse(readFileSync(new URL('../../assets/ljud/effekter/ljud.json', import.meta.url), 'utf8'));
const FILER = readdirSync(new URL('../../assets/ljud/effekter/', import.meta.url)).filter((f) => f.endsWith('.wav')).map((f) => f.replace(/\.wav$/, ''));

describe('ljudeffekterna (F5, 10c v0.5)', () => {
  it('Stils 81 ljud (surr i 70.7): ett id per fil, och ljud.json säger nivå och längd', () => {
    expect(FILER).toHaveLength(81);
    expect(Object.keys(LJUD).sort()).toEqual([...FILER].sort());
    for (const v of Object.values(LJUD)) { expect(v.styrka_db).toBeLessThan(0); expect(v.sekunder).toBeGreaterThan(0); }
  });
  it('gråboxens namn och innehållets ljud-id pekar på en fil', () => {
    for (const id of Object.values(EFFEKT_FOR)) expect(FILER).toContain(id);
    for (const id of ['stampel', 'ordkraft', 'dunk', 'baron', 'formel_ristas', 'radio', 'fest_mellan', 'fest_stor', 'pinne', 'start', 'titel_bokstav',
      'kruka', 'apa_gnaller', 'hackspett', 'uggla', 'ekorre_not', 'mage_kurrar', 'klonk', 'klick_las', 'hugg', 'prassel', 'sla', 'pff', 'bar', 'pling', 'klick', 'ratt', 'fel',
      ...Array.from({ length: 8 }, (_, i) => `bricka_${i + 1}`)]) expect(effektFinns(id), id).toBe(true);
  });
});
