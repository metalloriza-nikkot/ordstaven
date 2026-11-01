import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { skapaLjud } from '../../src/grans/ljud.js';

// Stilguiden v0.26 §8 (golvdatorn): animera bara opacitet och läge, aldrig skuggor, oskärpa, filter, bakgrund
// eller CSS-variabler. Undantag: vuxenmenyns ring (fyll), som bara den vuxne ser.
const css = readFileSync(new URL('../../src/stil.css', import.meta.url), 'utf8');
const TILLATET = new Set(['opacity', 'transform', 'scale', 'translate', 'rotate']);
const UNDANTAG = new Set(['fyll']);

/** Alla @keyframes med namn och egenskaperna de ändrar. */
function keyframes(text) {
  const ut = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let djup = 1; let i = re.lastIndex;
    while (djup > 0 && i < text.length) { if (text[i] === '{') djup++; else if (text[i] === '}') djup--; i++; }
    const kropp = text.slice(re.lastIndex, i - 1);
    const egenskaper = [...kropp.matchAll(/([\w-]+)\s*:/g)].map((x) => x[1]);
    ut.push({ namn: m[1], egenskaper: [...new Set(egenskaper)] });
  }
  return ut;
}

describe('stilen och golvdatorn', () => {
  it('animationerna ändrar bara opacitet och läge', () => {
    const fel = keyframes(css).filter((k) => !UNDANTAG.has(k.namn)).flatMap((k) => k.egenskaper.filter((e) => !TILLATET.has(e)).map((e) => `${k.namn}: ${e}`));
    expect(fel).toEqual([]);
  });
  it('inget filter i spelets stil', () => {
    expect(css).not.toMatch(/(^|[;{\s])(backdrop-)?filter\s*:/m);
  });
  it('inget skakar vid fel, utom ungens nos', () => {
    const skak = keyframes(css).filter((k) => /^skaka/.test(k.namn)).map((k) => k.namn);
    expect(skak).toEqual(['skaka-nos']);
  });
});

describe('ljudordens färger (stilguiden v0.26 §3)', () => {
  const ljud = skapaLjud();
  it('färgen hör till ordet, oavsett stavning med versaler', () => {
    expect(ljud.farg('dunk')).toBe('#f5d9a8');
    expect(ljud.farg('KLONK')).toBe('#b9c6d3');
    expect(ljud.farg('tok tok')).toBe('#c8e36a');
    expect(ljud.farg('ho ho')).toBe('#ffd95a');
    expect(ljud.farg('pip')).toBe('#a6e3cf');
    expect(ljud.farg('brum')).toBe('#f4a6b8');
    expect(ljud.farg('buhu')).toBe('#8fcbf2');
  });
  it('ett ord utan färg från Stil får läsplattans papper', () => {
    expect(ljud.farg('kra')).toBe('#f5ecd7');
  });
});
