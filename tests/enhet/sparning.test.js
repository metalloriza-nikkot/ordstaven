import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { skapaSparning, nyttTillstand, migrera, FORMAT, NYCKEL, NYCKEL_TRASIG, AVENTYR } from '../../src/karna/sparning.js';
import { skapaLogg } from '../../src/karna/logg.js';

const minne = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const fast = () => new Date('2026-10-24T10:00:00Z');

describe('sparning', () => {
  it('ett nytt tillstånd har formatfält och en egen hjältedel', () => {
    const t = nyttTillstand('0.1.0', fast);
    expect(t.app).toBe('ORDSTAVEN');
    expect(t.format).toBe(FORMAT);
    expect(t.spelare.hjalte.format).toBe(1);
    expect(t.aventyr[AVENTYR]).toBeTruthy();
  });

  it('sparar och läser tillbaka', () => {
    const l = minne(); const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    const t = s.las(); t.aventyr[AVENTYR].plats = { rum: 'testrum', x: 42, y: 99 };
    expect(s.spara(t)).toBe(true);
    expect(s.las().aventyr[AVENTYR].plats).toEqual({ rum: 'testrum', x: 42, y: 99 });
  });

  it('en trasig sparning läggs undan och raderas inte', () => {
    const l = minne(); l.setItem(NYCKEL, '{trasig');
    const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    expect(s.las().format).toBe(FORMAT);
    expect(l.getItem(NYCKEL_TRASIG)).toBe('{trasig');
  });

  it('full lagring kraschar inte, utan returnerar false och loggas', () => {
    const l = minne(); l.setItem = () => { throw new Error('QuotaExceededError'); };
    const logg = skapaLogg({ lagring: minne(), version: 't' });
    const s = skapaSparning({ lagring: l, spelversion: '0.1.0', logg });
    expect(s.spara(nyttTillstand('0.1.0'))).toBe(false);
    expect(logg.text()).toContain('kunde inte spara');
  });

  it('vägrar sparningar från andra spel och nyare format', () => {
    expect(() => migrera({ app: 'TURBO-RACE', format: 1 })).toThrow();
    expect(() => migrera({ app: 'ORDSTAVEN', format: FORMAT + 1 })).toThrow();
  });

  it('inläsning från fil kan ångras', () => {
    const l = minne(); const s = skapaSparning({ lagring: l, spelversion: '0.1.0', klocka: fast });
    const gammal = s.las(); gammal.spelare.hjalte.namn = 'GAMMAL'; s.spara(gammal);
    const fil = nyttTillstand('0.1.0', fast); fil.spelare.hjalte.namn = 'NY';
    s.franText(JSON.stringify(fil), gammal);
    expect(s.las().spelare.hjalte.namn).toBe('NY');
    s.angra();
    expect(s.las().spelare.hjalte.namn).toBe('GAMMAL');
  });

  it('hjälten kan exporteras som egen fil', () => {
    const s = skapaSparning({ lagring: minne(), spelversion: '0.1.0', klocka: fast });
    const t = nyttTillstand('0.1.0', fast); t.spelare.hjalte.namn = 'TESTA';
    const h = JSON.parse(s.hjalteTillText(t));
    expect(h).toMatchObject({ app: 'ORDSTAVEN-HJALTE', format: 1, hjalte: { namn: 'TESTA' } });
  });

  // Varje gammalt format har en fixturfil som alltid måste gå att läsa.
  for (const fil of readdirSync(new URL('../fixturer/', import.meta.url)).filter((f) => f.startsWith('spar-format-'))) {
    it(`fixturen ${fil} går att läsa`, () => {
      const d = migrera(JSON.parse(readFileSync(new URL('../fixturer/' + fil, import.meta.url), 'utf8')));
      expect(d.format).toBe(FORMAT);
      expect(d.spelare.hjalte).toBeTruthy();
    });
  }
});

describe('logg', () => {
  it('ringbufferten kapas', () => {
    const logg = skapaLogg({ lagring: minne(), version: 't', max: 10 });
    for (let k = 0; k < 25; k++) logg.handelse('test', 'rad ' + k);
    expect(logg.antal).toBe(10);
    expect(logg.text()).toContain('rad 24');
    expect(logg.text()).not.toContain('rad 14');
  });
  it('förra sessionens logg finns kvar', () => {
    const l = minne();
    const a = skapaLogg({ lagring: l, version: 't' }); a.handelse('test', 'förra'); a.spara();
    const b = skapaLogg({ lagring: l, version: 't' });
    expect(b.text()).toContain('FÖRRA SESSIONEN');
  });
  it('en trasig del av ögonblicksbilden kraschar inte loggen', () => {
    const logg = skapaLogg({ lagring: minne(), version: 't' });
    logg.registrera('dum', () => { throw new Error('pang'); });
    expect(logg.ogonblick().dum).toContain('pang');
  });
});
