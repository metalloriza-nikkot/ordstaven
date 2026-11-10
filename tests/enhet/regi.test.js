// Reaktioner med bild (2.35, Teknik 31): ingen text för den vuxne, och schemat känner samma bilder som motorn.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { visarRegi, BILD_PA_KORTET, reaktionerSomVisas } from '../../src/karna/mellanscen.js';

describe('reaktioner med bild', () => {
  it('en reaktion med ekorren på kortet visar inte texten', () => {
    expect(visarRegi({ reaktion: 'ekorren tittar ut' })).toBe(true);
    expect(visarRegi({ reaktion: 'ekorren tittar ut', bild: 'ekorre_skakar' })).toBe(false);
    expect(visarRegi({ reaktion: 'ekorren tittar ut', bild: 'finns_inte' })).toBe(true);
  });
  it('schemat och motorn har samma bilder', () => {
    const s = JSON.parse(readFileSync(new URL('../../content/schema/kapitel.schema.json', import.meta.url), 'utf8'));
    expect(new Set(s.$defs.handling.properties.bild.enum)).toEqual(new Set(BILD_PA_KORTET));
  });
  it('kontrollen räknar inte en reaktion med bild', () => {
    const k = { id: 'x', scener: [], rum: [], pussel: [{ id: 'p', typ: 'P1_las_och_valj', varianter: { L1: { alternativ: [{ id: 'a', vid_valj: { reaktion: 'r', bild: 'ekorre_skakar' } }, { id: 'b', vid_valj: { reaktion: 'r' } }] } } }] };
    expect(reaktionerSomVisas(k)).toHaveLength(1);
  });
});
