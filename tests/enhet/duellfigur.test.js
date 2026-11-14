// Motståndaren i ordduellen som figur (91.5): vilken sak som trillar av, utrustningen och vinsten.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sakI, utrustningEfter, vinstLage, figurensBilder } from '../../src/karna/duellfigur.js';

const UTR = ['hel', 'utan_halsduk', 'utan_halsduk_knapp', 'utan_hatt', 'utan_hatt_knapp'];
const SAKER = ['halmstra', 'halsduk', 'hatt', 'knapp'];

describe('duellens figur (91.5)', () => {
  it('saken som texten nämner, också med å', () => {
    expect(sakI('halmdockan blir förvirrad, och ett halmstrå trillar av den, och den backar själv ett steg', SAKER)).toBe('halmstra');
    expect(sakI('halmdockan blir förvirrad, och dess hatt trillar av, och den backar', SAKER)).toBe('hatt');
    expect(sakI('och dess halsduk trillar av', SAKER)).toBe('halsduk');
    expect(sakI('och en knapp trillar av den', SAKER)).toBe('knapp');
    expect(sakI('baronen klättrar ett steg upp', SAKER)).toBeNull();
  });

  it('utrustningen följer det som syns och har trillat av, och halmstrået ändrar inget', () => {
    expect(utrustningEfter([], UTR)).toBe('hel');
    expect(utrustningEfter(['halmstra'], UTR)).toBe('hel');
    expect(utrustningEfter(['halmstra', 'hatt'], UTR)).toBe('utan_hatt');
    expect(utrustningEfter(['halmstra', 'hatt', 'knapp'], UTR)).toBe('utan_hatt_knapp');
    expect(utrustningEfter(['halmstra', 'halsduk', 'knapp'], UTR)).toBe('utan_halsduk_knapp');
    // knappen först finns inte som egen utrustning: den står hel tills det finns en bild
    expect(utrustningEfter(['knapp'], UTR)).toBe('hel');
  });

  it('vinsten efter texten', () => {
    const lagen = ['backar', 'forvirrad', 'grund', 'narmare', 'ropar', 'sitter', 'snurrar', 'trillar'];
    expect(vinstLage('halmdockan trillar baklänges i en hög med hö, och halmstråna yr', lagen)).toBe('trillar');
    expect(vinstLage('halmdockan snurrar runt tre varv och sätter sig på rumpan i höet', lagen)).toBe('snurrar');
    expect(vinstLage('snurrar', ['grund'])).toBeNull();
  });

  it('Stils halmdocka i atlaset har alla lägen och utrustningar, och duellfilens saker har bilder', () => {
    const atlas = JSON.parse(readFileSync(new URL('../../assets/sprites/halmdockan/halmdockan.json', import.meta.url), 'utf8'));
    const ramar = Object.keys(atlas.frames);
    const info = figurensBilder('halmdockan', ramar);
    expect(info).not.toBeNull();
    expect(info.lagen).toEqual(['backar', 'forvirrad', 'grund', 'narmare', 'ropar', 'sitter', 'snurrar', 'trillar']);
    expect(info.utrustningar).toEqual(UTR);
    expect(info.saker).toEqual(SAKER);
    expect(info.sakPrefix).toBe('halmdocka');
    // varje läge finns i varje utrustning
    for (const l of info.lagen) for (const u of UTR) expect(ramar).toContain(`halmdockan_${l}_01_${u}`);
    // sakerna som duellfilen säger trillar av har en bild, och duell 1 slutar utan hatt och knapp, duell 2 utan halsduk och knapp
    const fil = JSON.parse(readFileSync(new URL('../../content/testrum-duell.json', import.meta.url), 'utf8'));
    const slut = fil.dueller.map((d) => {
      const tappade = d.ronder.map((r) => sakI(r.utfall[0].vid_ratt.handling, info.saker));
      expect(tappade.every(Boolean)).toBe(true);
      return utrustningEfter(tappade, info.utrustningar);
    });
    expect(slut).toEqual(['utan_hatt_knapp', 'utan_halsduk_knapp']);
    expect(fil.dueller.map((d) => vinstLage(d.vid_vinst.handling, info.lagen))).toEqual(['trillar', 'snurrar']);
  });

  it('en figur utan grundställningen (baronen i kapitel 3:s gråbox) blir ingen duellfigur', () => {
    expect(figurensBilder('baronen', ['baronen_ga_ner_01', 'baronen_ga_ner_02'])).toBeNull();
  });
});
