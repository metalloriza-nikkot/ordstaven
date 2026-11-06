// @ts-check
// Skogens grafik (Teknik 3): rutlagren och liv i skogen i kartorna.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lasKarta } from '../../src/karna/karta.js';

const las = (/** @type {string} */ f) => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'));
const kap = las('content/den-gomda-dalen/kap-01.json');

describe('skogens kartor (Teknik 3)', () => {
  it('rutlagren läses: golvet, ridån och den hemliga stigen som syns med sitt föremål', () => {
    const k = lasKarta(las('kartor/den-gomda-dalen/glantan.tmj'));
    expect(k.rutlager?.map((l) => l.namn)).toEqual(['golv', 'over', 'stig_backen']);
    expect(k.rutlager?.[2].visasMed).toBe('stig_backen');
    expect(k.rutlager?.[0].data.every((id) => id >= 0)).toBe(true);
    // liv i skogen är inga föremål: de finns inte bland objekten och hindrar ingenting
    expect(k.omgivning?.map((o) => o.vad)).toEqual(['fjaril']);
    expect(k.objekt.some((o) => o.id.startsWith('omgivning'))).toBe(false);
  });

  it('det som byts och det som rör sig i tomgång står i kartan (häcken, stubben, skattlådan, apan och ekorren)', () => {
    const brynet = lasKarta(las('kartor/den-gomda-dalen/skogsbrynet.tmj')).objekt;
    expect(brynet.find((o) => o.id === 'hack')).toMatchObject({ bild: 'hack', bildSedan: 'hack_oppen', sedan: 'stig_genom_hacken' });
    expect(brynet.find((o) => o.id === 'stubbe')).toMatchObject({ bildSedan: 'stubbe_bar', sedan: 'k1_liten_lian' });
    expect(brynet.find((o) => o.id === 'ekorre_gren')?.animMs).toBeGreaterThanOrEqual(250);
    const buskarna = lasKarta(las('kartor/den-gomda-dalen/buskarna.tmj')).objekt;
    expect(buskarna.find((o) => o.id === 'skattlada')).toMatchObject({ bildSedan: 'skattlada_oppen', sedan: 'k1_busken' });
    const glantan = lasKarta(las('kartor/den-gomda-dalen/glantan.tmj')).objekt;
    for (const id of ['kulle', 'kronet', 'backen']) expect(glantan.find((o) => o.id === id)?.rutor, id).toBe(true);
  });

  it('liv i skogen rör sig aldrig inom fyra rutor från ett föremål i ett läsval (10e, regel 5)', () => {
    const lasval = new Set();
    for (const p of kap.pussel) {
      if (p.i_rummet) for (const v of Object.values(p.varianter)) for (const a of /** @type {any} */ (v).alternativ) if (a.objekt) lasval.add(a.objekt);
      if (p.typ === 'P26_krukorna' && p.id === 'k1_loven') for (const f of p.foremal) lasval.add(f);
    }
    lasval.add('last_lada');
    const nara = [];
    for (const rum of ['skogsbrynet', 'buskarna', 'glantan']) {
      const k = lasKarta(las(`kartor/den-gomda-dalen/${rum}.tmj`));
      for (const o of k.omgivning || []) for (const f of k.objekt.filter((x) => lasval.has(x.id))) {
        const dx = Math.max(0, f.x - (o.x + o.b), o.x - (f.x + f.b)), dy = Math.max(0, f.y - (o.y + o.h), o.y - (f.y + f.h));
        if (Math.hypot(dx, dy) < 64) nara.push(`${rum}: ${o.vad} nära ${f.id}`);
      }
    }
    expect(nara).toEqual([]);
  });
});
