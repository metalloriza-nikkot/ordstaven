// Stils mellanscener som regier i rummet (Teknik 31, beslut 68.5): varje regi går i sitt rum, med Stils bilder.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const las = (k) => JSON.parse(readFileSync(new URL(`../../content/den-gomda-dalen/${k}.json`, import.meta.url), 'utf8'));

/** En sparning i en scen (namnen finns, kapitlen före spolas fram), och spelet startat där. */
async function sparadI(page, kap, scenId) {
  const k = las(kap);
  await page.goto(`./?snabb&ny&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.evaluate(([kap, scenId, scen]) => {
    const t = window.__ORDSTAVEN.tillstand(); const av = t.aventyr['den-gomda-dalen'];
    Object.assign(av, { kapitelId: kap, scen, scenId, steg: 0, startad: false });
    t.spelare.hjalte.namn = 'TESTA'; t.spelare.unge = { format: 1, steg: 1, formagor: [], ...t.spelare.unge, namn: 'KNOPP', folj: true };
    t.spelare.hjalte.formler = [...new Set([...(t.spelare.hjalte.formler || []), 'LJUS', 'SVÄRD'])];
    localStorage.setItem('ordstaven_spar', JSON.stringify(t));
  }, [kap, scenId, k.scener.findIndex((s) => s.id === scenId)]);
  await page.goto(`./?snabb&kapitel=${kap}`);
  await page.waitForFunction(() => window.__ORDSTAVEN && window.__ORDSTAVEN.spel.isRunning);
  await page.click('.start-knapp');
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.scen()), { timeout: 15000 }).toBe(scenId);
  await page.waitForTimeout(1200);
}
const regi = (page, bild) => page.evaluate((b) => window.__ORDSTAVEN.regi(b), bild);

test('Stils mellanscener (Teknik 31): ungens lägen, ekorren, apan, Farfar och SVÄRD som ristas', async ({ page }) => {
  test.setTimeout(150000);
  // skogsbrynet (k1s02): ungen biter i lianen, lyssnar mot norr, ekorren skakar skal över ungen, och SVÄRD ristas
  await sparadI(page, 'kap-01', 'k1s02_lianerna');
  expect(await regi(page, 'unge_biter')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_biter_(hoger|vanster|upp)_0[12]$/);
  await page.waitForTimeout(1400);
  expect(await regi(page, 'unge_lyssnar_upp')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_lyssnar_upp_0[12]$/);
  await page.waitForTimeout(1600);
  expect(await regi(page, 'ekorre_knacker')).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren'))).toMatch(/^ekorre_skaka_(hoger|vanster)_0[12]$/);
  // som förut, och slingan går igen (spelets klocka går långsammare än väggklockan i canvas-läget, därför poll)
  await expect.poll(() => page.evaluate(() => window.__ORDSTAVEN.bildFor('ekorre_gren')), { timeout: 10000 }).toMatch(/^ekorre_gren_0[12]$/);
  expect(await regi(page, 'stav_ristas')).toBeGreaterThan(2000);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/regi-stav-ristas.png' });
  await page.waitForTimeout(1500);
  for (const l of ['unge_fnissar', 'unge_fnissar_mun', 'unge_kryper_ihop', 'unge_gaspar', 'unge_lyssnar']) { expect(await regi(page, l), l).toBeGreaterThan(0); await page.waitForTimeout(1800); }
  // gläntan (k1s05): apan i nätet suckar
  await sparadI(page, 'kap-01', 'k1s05_glantan');
  expect(await regi(page, 'apa_suckar')).toBeGreaterThan(0);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('apan_i_nat'))).toMatch(/^apa_sucka_0[12]$/);
  // kontoret (s09): Farfar skriver och gäspar
  await sparadI(page, 'kap-00', 's09_lappen');
  expect(await regi(page, 'farfar_skriver')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toMatch(/^farfar_fatolj_skriver_0[12]$/);
  await page.waitForTimeout(2600);
  expect(await regi(page, 'farfar_gaspar')).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ORDSTAVEN.bildFor('farfar_i_fatoljen'))).toBe('farfar_fatolj_gaspar_01');
  await page.screenshot({ path: 'test-results/regi-farfar-gaspar.png' });
  // en regi som inte finns gör ingenting (då visar spelet beskrivningen)
  expect(await regi(page, 'unge_finns_inte')).toBe(0);
});

test('kapitel 2:s mellanscener i gråboxen (Teknik 32, 69.1): ungen sjunker i leran och dras upp, och luftskeppet river brevet', async ({ page }) => {
  test.setTimeout(120000);
  // träskkanten: ungen skuttar ut i leran och sjunker, och sitter fast tills den dras upp
  await sparadI(page, 'kap-02', 'k2s01_kanten');
  const O = (f, a) => page.evaluate(f, a);
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker', 'leran'))).toBeGreaterThan(1000);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeDjup()), { timeout: 8000 }).toBe(12);
  const [u, l] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u.x).toBeGreaterThanOrEqual(l.x); expect(u.x).toBeLessThanOrEqual(l.x + l.b);
  expect(u.y).toBeGreaterThanOrEqual(l.y); expect(u.y).toBeLessThanOrEqual(l.y + l.h);
  expect(await O(() => window.__ORDSTAVEN.ungeRam())).toMatch(/^unge1_radd_ner_0[12]$/);
  await page.screenshot({ path: 'test-results/regi-unge-i-leran.png' });
  // utan unge_till gör regin ingenting (och då visar spelet beskrivningen)
  expect(await O(() => window.__ORDSTAVEN.regi('unge_sjunker'))).toBe(0);
  // hjälten går dit, och ungen står kvar i leran
  await O(() => { const u = window.__ORDSTAVEN.ungePos(); window.__ORDSTAVEN.gaMot(u.x, u.y - 20); });
  await page.waitForTimeout(1500);
  const u2 = await O(() => window.__ORDSTAVEN.ungePos());
  expect(Math.round(u2.x)).toBe(Math.round(u.x)); expect(Math.round(u2.y)).toBe(Math.round(u.y));
  expect(await O(() => window.__ORDSTAVEN.regi('unge_dras_upp'))).toBeGreaterThan(0);
  await expect.poll(() => O(() => window.__ORDSTAVEN.ungeFast()), { timeout: 8000 }).toBe(false);
  expect(await O(() => window.__ORDSTAVEN.ungeDjup())).toBe(0);
  const [u3, l3] = await O(() => [window.__ORDSTAVEN.ungePos(), window.__ORDSTAVEN.ruta('leran')]);
  expect(u3.x >= l3.x && u3.x <= l3.x + l3.b && u3.y >= l3.y && u3.y <= l3.y + l3.h).toBe(false); // ute ur leran
  // byn: luftskeppet glider in, brevet rivs, och luftskeppet far mot bryggan
  await sparadI(page, 'kap-02', 'k2s02_byn');
  expect(await O(() => window.__ORDSTAVEN.regi('luftskepp_river_brevet'))).toBeGreaterThan(4000);
  await page.waitForTimeout(3000);
  expect((await O(() => window.__ORDSTAVEN.grafik())).regi).toContain('luftskeppet river brevet');
  await page.screenshot({ path: 'test-results/regi-luftskeppet-river-brevet.png' });
  expect(await O(() => window.__ORDSTAVEN.grafik().luftskepp)).toMatch(/^luftskepp_/);
});
