// Varje bild som en formel i kapitlen visar (P11: bild och ledbild) har en bild i gråboxen: en platshållare, ett ord i
// ordlistorna eller en ritad bild. Annars står det ❔ på läsplattan (Teknik 34).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { skapaBilder } from '../../src/grans/bilder.js';

const las = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bilder = skapaBilder(las('../../content/ordlistor.json'), las('../../kartor/den-gomda-dalen/platshallare.json').bilder);
const kapitel = readdirSync(new URL('../../content/den-gomda-dalen/', import.meta.url)).filter((f) => /^kap-\d+\.json$/.test(f)).map((f) => las(`../../content/den-gomda-dalen/${f}`));

describe('bilderna i formlerna', () => {
  it('varje bild och ledbild i en P11 har en bild i gråboxen', () => {
    const saknas = [];
    for (const k of kapitel) for (const p of k.pussel || []) if (p.typ === 'P11_formel') for (const id of [p.bild, p.ledbild].filter(Boolean)) if (bilder.html(id).includes('❔')) saknas.push(`${p.id}: ${id}`);
    expect(saknas).toEqual([]);
  });

  it('testrummets bilder och ledbilder har en bild i gråboxen (89.5: handen, tejpen och matskålen)', () => {
    const saknas = [];
    for (const u of las('../../content/testrum-skriv.json').uppgifter) for (const id of [u.bild, u.ledbild].filter(Boolean)) if (bilder.html(id).includes('❔')) saknas.push(`${u.id}: ${id}`);
    expect(saknas).toEqual([]);
  });

  it('Stils färdiga tankebubbla visas som den är, inte i en bubbla till', () => {
    expect(bilder.html('tankebubbla_svard')).toMatch(/<img[^>]*data-bild="tankebubbla_svard"/);
    expect(bilder.html('tankebubbla_svard')).not.toContain('bubbla-ytter');
    // utan Stils bild ritas bubblan runt platshållaren
    expect(bilder.html('tankebubbla_matskal')).toContain('bubbla-ytter');
  });
});
