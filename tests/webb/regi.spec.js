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
